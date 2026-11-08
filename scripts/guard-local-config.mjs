#!/usr/bin/env node
/**
 * check:local-config — 本地配置 / 本机路径护栏（CI + 本地提交前）
 *
 * 本插件把运行时状态写在 `$DSH_HOME/software-tools/`（默认 `~/.dsh/software-tools/`），
 * 而本仓库是公开仓库。这个脚本守住两条底线：
 *
 *  1. git 索引里不能出现本地状态 / 凭据文件。按**前缀与模式**判定，不是精确
 *     basename（F3）：`catalog.json*`、`selection.json*`、`.env*`（`.env.example`
 *     除外）、文件名含 credential/secret、`*.pem` / `*.key`，以及路径里出现
 *     `.dsh/` 或 `config/` 目录。即使 `.gitignore` 已覆盖，`git add -f` 也必须被拦。
 *  2. 索引里登记的文本文件（读取工作树内容；文件被暂存后又改回干净版本时，
 *     暂存区 diff 分支会把暂存内容再查一遍）以及暂存区新增行，不能出现本机绝
 *     对路径：
 *       - Linux 家目录：/home/<用户>/…
 *       - WSL 挂载点：/mnt/<盘符>/…
 *       - Windows 盘符路径：<盘符>:\…
 *
 * Windows 路径的放行规则（F4）：只允许与具体机器无关的通用根 ——
 * `Windows\`、`Program Files\`、`Program Files (x86)\`、`Tools\`、`Path\`。
 * 路径段内允许空格（`Program Files` 不再被截断成 `Program` 而误报）。
 *
 * 二进制文件（截图等）不做 OCR，脚本只跳过并点名，由人确认已脱敏。
 *
 * 用法：node scripts/guard-local-config.mjs   （= pnpm run check:local-config）
 * 退出码：0 通过；1 发现违规；2 环境问题（不在 git 仓库 / git 不可用）。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/** 不做文本扫描的二进制扩展名；命中只提示、不判定违规。 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico', '.pdf',
  '.zip', '.gz', '.tgz', '.7z', '.xz', '.mp4', '.mov', '.webm', '.mp3', '.wav',
  '.woff', '.woff2', '.ttf', '.otf', '.wasm', '.node',
])

/**
 * 本地状态 / 凭据文件规则：按文件名前缀与模式匹配（F3）。
 * `match(base, path)` 返回 true 即为违规。
 */
const LOCAL_FILE_RULES = [
  {
    label: '本地状态文件被 git 跟踪 (catalog.json*)',
    match: (base) => base === 'catalog.json' || base.startsWith('catalog.json.'),
  },
  {
    label: '本地状态文件被 git 跟踪 (selection.json*)',
    match: (base) => base === 'selection.json' || base.startsWith('selection.json.'),
  },
  {
    label: '本地环境/密钥文件被 git 跟踪 (.env*，.env.example 除外)',
    match: (base) => base.startsWith('.env') && base !== '.env.example',
  },
  {
    label: '疑似凭据文件被 git 跟踪 (credential/secret)',
    match: (base) => /credential|secret/i.test(base),
  },
  {
    label: '密钥/证书文件被 git 跟踪 (*.pem / *.key)',
    match: (base) => /\.(pem|key)$/i.test(base),
  },
  {
    label: '本地配置目录被 git 跟踪 (.dsh/ 或 config/)',
    match: (_base, path) => path.split('/').some((segment) => segment === '.dsh' || segment === 'config'),
  },
]

/** 非 Windows 的路径规则（Windows 盘符另走 scanWindowsPaths，见 F4）。 */
const TEXT_RULES = [
  { label: 'Linux 家目录绝对路径', pattern: /\/home\/[A-Za-z0-9._-]+\// },
  { label: 'WSL /mnt 挂载点绝对路径', pattern: /\/mnt\/[a-z]\// },
]

/**
 * Windows 盘符路径里属于「通用占位/系统目录」的根：与具体机器无关，文档与内置
 * 示例可以出现。匹配前先把连续反斜杠折叠（源码里的 `\\` 转义会变成双反斜杠）。
 */
const GENERIC_WINDOWS_PATH = /^[a-z]:\\(?:windows|program files(?: \(x86\))?|tools|path)(?:\\|$)/i

/** 与具体机器无关的通用根（Windows\、Program Files\、Program Files (x86)\、Tools\、Path\）不判违规。 */
function isGenericWindowsPath(candidate) {
  return GENERIC_WINDOWS_PATH.test(candidate.replace(/\\+/g, '\\'))
}

/**
 * 找出这一行里的盘符路径并逐条判定。路径段内允许空格，因此「带空格的 Program Files 根」
 * 不会被截成 Program；遇到引号/尖括号/括号/逗号/分号/竖线/tab 即截断，且下
 * 一个盘符起点处强制切分（一行里有多个路径时逐个判定，避免漏掉后一个）。
 */
function scanWindowsPaths(line, file, found, lineOffset, lineIndex) {
  const starts = []
  const startPattern = /[A-Za-z]:\\/g
  let match
  while ((match = startPattern.exec(line)) !== null) {
    starts.push(match.index)
    if (match.index === startPattern.lastIndex) startPattern.lastIndex += 1
  }
  for (let index = 0; index < starts.length; index += 1) {
    const from = starts[index]
    const to = index + 1 < starts.length ? starts[index + 1] : line.length
    let candidate = line.slice(from, to)
    const delimiter = candidate.search(/["'`<>()[\]{},;|\t]/)
    if (delimiter >= 0) candidate = candidate.slice(0, delimiter)
    candidate = candidate.trimEnd()
    if (isGenericWindowsPath(candidate)) continue
    found.push({ file, line: lineOffset + lineIndex, label: 'Windows 盘符绝对路径', snippet: line.trim() })
  }
}

/**
 * 扫描一段文本，把命中写进 `found`。
 * @param lineOffset 第一行对应的文件行号（暂存区 diff 单行扫描时传 hunk 行号）。
 */
function scanText(text, file, found, lineOffset = 1) {
  const lines = text.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    for (const rule of TEXT_RULES) {
      const pattern = new RegExp(rule.pattern.source, 'g')
      let match
      while ((match = pattern.exec(line)) !== null) {
        found.push({ file, line: lineOffset + index, label: rule.label, snippet: line.trim() })
        if (match.index === pattern.lastIndex) pattern.lastIndex += 1
      }
    }
    scanWindowsPaths(line, file, found, lineOffset, index)
  }
}

/** 读文件；返回 undefined 表示按二进制跳过。 */
function readTextFile(path) {
  const buffer = readFileSync(path)
  if (buffer.includes(0)) return undefined
  return buffer.toString('utf8')
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function main() {
  try {
    git(['rev-parse', '--is-inside-work-tree'])
  } catch {
    console.error('❌ 环境错误：当前目录不是 git 仓库（或 git 不可用），无法检查索引。')
    process.exitCode = 2
    return
  }

  const violations = []
  const skippedBinaries = []
  const indexNames = []

  // ---- 1) 索引文件：本地状态/凭据文件名模式 + 文本内容扫描 -------------------
  const tracked = git(['ls-files', '-z']).split('\0').filter((entry) => entry.length > 0)
  for (const path of tracked) {
    indexNames.push(path)
    const base = path.split('/').pop()
    const localRule = LOCAL_FILE_RULES.find((rule) => rule.match(base, path))
    if (localRule !== undefined) {
      violations.push({ file: path, line: 0, label: localRule.label, snippet: '<整个文件/路径>' })
      continue
    }
    const extension = base.includes('.') ? `.${base.split('.').pop().toLowerCase()}` : ''
    if (BINARY_EXTENSIONS.has(extension)) {
      skippedBinaries.push(path)
      continue
    }
    let text
    try {
      text = readTextFile(path)
    } catch {
      continue // 索引里的文件可能已被删除但尚未提交；不算本任务的问题
    }
    if (text === undefined) {
      skippedBinaries.push(path)
      continue
    }
    scanText(text, path, violations)
  }

  // ---- 2) 暂存区 diff：只看新增行，避免把已提交的历史重复报一遍 -------------
  let stagedBinary = []
  let stagedFiles = []
  try {
    const diff = git(['diff', '--cached', '--no-color', '--unified=0', '--diff-filter=ACMR'])
    let file
    let lineNumber = 0
    for (const raw of diff.split('\n')) {
      if (raw.startsWith('+++ ')) {
        const target = raw.slice(4).trim()
        file = target === '/dev/null' ? undefined : target.replace(/^b\//, '')
        if (file !== undefined) stagedFiles.push(file)
        continue
      }
      if (raw.startsWith('Binary files ') && raw.endsWith(' differ')) {
        const match = raw.match(/^Binary files (.+) and (.+) differ$/)
        if (match) stagedBinary.push(match[2].replace(/^b\//, ''))
        continue
      }
      const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
      if (hunk !== null) {
        lineNumber = Number(hunk[1])
        continue
      }
      if (file === undefined) continue
      if (raw.startsWith('+')) {
        scanText(raw.slice(1), file, violations, lineNumber)
        lineNumber += 1
      }
    }
    // A staged-but-untracked-before path also has to satisfy the filename rules
    // (e.g. `git add -f .env` while the index scan above already sees it, but a
    //  rename of an ignored file only appears in the staged diff).
    for (const path of stagedFiles) {
      const base = path.split('/').pop()
      const rule = LOCAL_FILE_RULES.find((candidate) => candidate.match(base, path))
      if (rule !== undefined) {
        violations.push({ file: path, line: 0, label: rule.label, snippet: '<暂存的新路径>' })
      }
    }
  } catch {
    /* 没有暂存区内容（例如 CI 干净检出）时 diff 为空或不可用，忽略 */
  }

  // ---- 3) 去重（索引扫描与暂存区扫描会看到同一处；报告只留一条） ------------
  const seen = new Set()
  const unique = []
  for (const item of violations) {
    const key = `${item.file}\0${item.line}\0${item.label}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  violations.length = 0
  violations.push(...unique)

  // ---- 4) 报告 -------------------------------------------------------------
  console.log('🔍 本地配置 / 本机路径护栏 (check:local-config)')
  console.log(
    `   扫描索引文件：${indexNames.length} 个（文本 ${indexNames.length - skippedBinaries.length}，二进制 ${skippedBinaries.length}）`,
  )
  if (skippedBinaries.length > 0) {
    console.log('   ⚠️ 跳过二进制文件（脚本不做 OCR，请人工确认已脱敏）：')
    for (const path of skippedBinaries) console.log(`      - ${path}`)
  }
  stagedBinary = stagedBinary.filter((path) => !skippedBinaries.includes(path))
  if (stagedBinary.length > 0) {
    console.log('   ⚠️ 暂存区的二进制文件（请人工确认已脱敏）：')
    for (const path of stagedBinary) console.log(`      - ${path}`)
  }

  if (violations.length === 0) {
    console.log('✅ 未发现本机路径或本地状态文件，检查通过。')
    return
  }

  console.error(`\n❌ 发现 ${violations.length} 处违规：`)
  for (const item of violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    const location = item.line > 0 ? `${item.file}:${item.line}` : item.file
    console.error(`   ${location}  [${item.label}]  ${item.snippet}`)
  }
  console.error(
    '\n处理建议：\n' +
      '   • 本机路径换成通用占位（/path/to/...、C:\\Tools\\...、<盘符>:\\...）；\n' +
      '   • 运行时状态只写 $DSH_HOME/software-tools/（默认 ~/.dsh/software-tools/），不要放进仓库；\n' +
      '   • 本机状态/凭据文件（catalog.json*、selection.json*、.env*、*.pem、*.key、.dsh/、config/）不要 git add；\n' +
      '   • 确属需要保留的文件，请移出仓库或加进 .gitignore（并确保未被 git add -f）。',
  )
  process.exitCode = 1
}

main()
