/**
 * dsh-software-tools — host half.
 *
 * A curated inventory of WSL/Windows software tools available on this
 * machine. The browser half renders a sidebar 【软件工具】panel where the user
 * checks tools; the checked set is persisted to a small state file and
 * injected into the model's system prompt as a compact section on every
 * request (via the dsh-system-prompt section registry, the same seam the
 * persona and plan-mode use). That is how the model "knows" the tools exist
 * and how to call them — they are not tools in the catalog, they are
 * instructions for the bash / shell tools it already has.
 *
 * State and catalog are served over a loopback-pinned generic RPC channel:
 *   - `list` → { catalog, selected, section }  (catalog + current selection)
 *   - `set`  → { ok }                          (persist new selection {ids})
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection' // loads ctx.connection augmentation
import type {} from '@deepseek-ai/dsh-system-prompt' // loads ctx.systemPrompt augmentation
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'dsh-software-tools'
export const inject = ['systemPrompt']

/** Config accepted on the cordis entry (all optional). */
export interface SoftwareToolsConfig {
  /**
   * Directory holding `selection.json` + `catalog.json`.
   * Defaults to `$DSH_HOME/software-tools` (i.e. `~/.dsh/software-tools`).
   */
  settingsDir?: string
}

export const CHANNEL = '/_dsh-software-tools'
export const SECTION_NAME = 'software-tools'
/** Tool guidance sections conventionally live at 100–199; 200 lands after them. */
export const SECTION_ORDER = 200

/** One entry in the curated inventory. */
export interface SoftwareTool {
  id: string
  name: string
  category: 'download' | 'proxy' | 'media' | 'browser' | 'knowledge' | 'runtime' | 'model' | 'misc'
  desc: string
  usage: string
}

/**
 * The curated catalog shipped with the plugin. Kept deliberately
 * machine-independent: entries here must hold for any WSL/Windows host.
 * Machine-specific tools (IDM's install path, an Obsidian vault location,
 * a local ComfyUI...) belong in the *user* catalog —
 * `~/.dsh/software-tools/catalog.json` — where the `add-software-tool`
 * skill writes them; a user entry with the same id overrides a built-in.
 * Keep each `usage` to 1–2 actionable lines.
 */
export const CATALOG: SoftwareTool[] = [
  {
    id: 'aria2',
    name: 'aria2 (命令行多线程下载)',
    category: 'download',
    desc: 'WSL 内多线程下载器,已安装。',
    usage: 'aria2c -x 16 -s 16 -k 1M <URL> ;慢时加 --all-proxy=http://127.0.0.1:7890 。',
  },
  {
    id: 'hf-mirror',
    name: 'HF 模型镜像 (hf-mirror)',
    category: 'download',
    desc: 'HuggingFace 国内镜像,下载大模型免代理。',
    usage: '设环境变量 HF_ENDPOINT=https://hf-mirror.com 后用 huggingface-cli / aria2 下载模型。',
  },
  {
    id: 'proxy',
    name: '本机代理 (常见 Clash 127.0.0.1:7890)',
    category: 'proxy',
    desc: '本机 HTTP/SOCKS 代理;WSL mirrored 网络下可用 127.0.0.1 直连 Windows 侧端口。',
    usage: 'curl/aria2/git 等加 --all-proxy=http://127.0.0.1:7890 或 export https_proxy=http://127.0.0.1:7890 ;具体端口以本机实际代理配置为准。',
  },
  {
    id: 'playwright',
    name: 'Playwright / Chromium (浏览器自动化)',
    category: 'browser',
    desc: 'WSL 内无头 Chromium,可驱动真实浏览器。',
    usage: '经 MCP 工具 mcp__browser__* (navigate/click/type/screenshot);或 npx playwright 脚本;Chromium 在 ~/.cache/ms-playwright。',
  },
  {
    id: 'uvx',
    name: 'uv / uvx (Python 运行器)',
    category: 'runtime',
    desc: 'Python 包/工具即用即走运行器。',
    usage: 'uvx <package> 直接跑 PyPI 工具(如 uvx mcp-server-sqlite)。',
  },
  {
    id: 'interop',
    name: 'WSL interop (调 Windows 程序)',
    category: 'runtime',
    desc: 'WSL 可执行 Windows exe(cmd.exe/powershell/任意 .exe)。',
    usage: '用完整路径调用,如 /mnt/c/Windows/System32/cmd.exe /c "命令" 或直接运行 Windows exe。',
  },
  {
    id: 'zstd',
    name: 'zstd / fzstd (压缩)',
    category: 'misc',
    desc: '会话文件是 zstd 多帧 JSONL,解压/压缩工具。',
    usage: 'node 用 fzstd(node_modules/fzstd)decompress;或命令行 zstd -d。',
  },
]

export const CATEGORY_LABELS: Record<SoftwareTool['category'], string> = {
  download: '下载',
  proxy: '代理与网络',
  media: '媒体生成',
  browser: '浏览器',
  knowledge: '知识库',
  runtime: '运行时',
  model: '模型',
  misc: '其他',
}

/** Resolve the dsh home: $DSH_HOME env, else ~/.dsh (mirrors dsh-home-paths). */
function resolveDshHome(): string {
  const env = process.env.DSH_HOME
  if (env && env.trim().length > 0) return env.trim()
  return join(homedir(), '.dsh')
}

/** State directory (selection + user catalog). Config may override. */
function stateDir(config: Partial<SoftwareToolsConfig>): string {
  const override = config.settingsDir
  if (override && override.trim().length > 0) return override.trim()
  return join(resolveDshHome(), 'software-tools')
}

function stateFile(config: Partial<SoftwareToolsConfig>): string {
  return join(stateDir(config), 'selection.json')
}

function catalogFile(config: Partial<SoftwareToolsConfig>): string {
  return join(stateDir(config), 'catalog.json')
}

/**
 * Merged catalog: built-in CATALOG plus user entries from the state
 * directory's catalog.json (the `add-software-tool` skill writes here, no
 * rebuild needed). User entries override built-ins with the same id.
 */
function readCatalog(config: Partial<SoftwareToolsConfig>): SoftwareTool[] {
  try {
    const raw = JSON.parse(readFileSync(catalogFile(config), 'utf8')) as { tools?: unknown }
    if (!Array.isArray(raw.tools)) return CATALOG
    const userTools = raw.tools.filter(
      (t): t is SoftwareTool =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as SoftwareTool).id === 'string' &&
        typeof (t as SoftwareTool).name === 'string' &&
        typeof (t as SoftwareTool).desc === 'string' &&
        typeof (t as SoftwareTool).usage === 'string' &&
        typeof (t as SoftwareTool).category === 'string',
    )
    const byId = new Map<string, SoftwareTool>()
    for (const t of CATALOG) byId.set(t.id, t)
    for (const t of userTools) byId.set(t.id, t)
    return [...byId.values()]
  } catch {
    return CATALOG
  }
}

function readSelected(config: Partial<SoftwareToolsConfig>): string[] {
  try {
    const raw = JSON.parse(readFileSync(stateFile(config), 'utf8')) as { ids?: unknown }
    if (Array.isArray(raw.ids)) return raw.ids.filter((x): x is string => typeof x === 'string')
  } catch {
    /* missing or unreadable — treat as empty */
  }
  return []
}

function writeSelected(config: Partial<SoftwareToolsConfig>, ids: string[]): void {
  mkdirSync(stateDir(config), { recursive: true })
  writeFileSync(stateFile(config), JSON.stringify({ ids }, null, 2), 'utf8')
}

/** The compact injected section: one line per checked tool. */
function renderSection(config: Partial<SoftwareToolsConfig>, ids: string[]): string {
  const catalog = readCatalog(config)
  const chosen = ids
    .map((id) => catalog.find((t) => t.id === id))
    .filter((t): t is SoftwareTool => t !== undefined)
  if (chosen.length === 0) return ''
  const lines = chosen.map((t) => `- ${t.name}: ${t.usage}`)
  return `# 本机可用软件工具(用户已勾选,按需用 bash/shell 调用)\n${lines.join('\n')}`
}

export function apply(ctx: Context, config: SoftwareToolsConfig = {}): void {
  // 1) Prompt section: evaluated at every assembly, so a selection change is
  //    visible on the model's very next request without any restart.
  ctx.effect(() =>
    ctx.systemPrompt.section({
      name: SECTION_NAME,
      order: SECTION_ORDER,
      text: () => renderSection(config, readSelected(config)),
    }),
    'dsh-software-tools: system prompt section',
  )

  // 2) Loopback RPC channel for the browser panel (list / set).
  // NOTE: the browser client validates `result` against rpcResultSchema, so
  // handlers must return the envelope-inner shape {ok:true, value} /
  // {ok:false, error:{code,message}} — flat objects fail client-side parse.
  ctx.inject(['connection'], (connCtx) => {
    connCtx.effect(() => {
      const handler = (endpoint: string, payload: unknown): Promise<Record<string, unknown>> => {
        if (endpoint === 'list') {
          const selected = readSelected(config)
          return Promise.resolve({
            ok: true,
            value: {
              catalog: readCatalog(config),
              categoryLabels: CATEGORY_LABELS,
              selected,
              section: renderSection(config, selected),
            },
          })
        }
        if (endpoint === 'set') {
          const ids = (payload as { ids?: unknown } | undefined)?.ids
          if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
            return Promise.resolve({
              ok: false,
              error: { code: 'bad-request', message: 'ids must be an array of strings' },
            })
          }
          const known = new Set(readCatalog(config).map((t) => t.id))
          const unknown = (ids as string[]).filter((id) => !known.has(id))
          if (unknown.length > 0) {
            return Promise.resolve({
              ok: false,
              error: { code: 'bad-request', message: `unknown tool ids: ${unknown.join(', ')}` },
            })
          }
          writeSelected(config, ids as string[])
          return Promise.resolve({ ok: true, value: { selected: ids as string[] } })
        }
        return Promise.resolve({
          ok: false,
          error: { code: 'bad-request', message: `unknown endpoint: ${endpoint}` },
        })
      }
      const stop = connCtx.connection.rpc.handle(
        CHANNEL,
        handler as unknown as Parameters<typeof connCtx.connection.rpc.handle>[1],
        { authority: 'loopback' },
      )
      return () => {
        stop()
      }
    }, 'dsh-software-tools: rpc channel')
  })
}
