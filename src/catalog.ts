/**
 * State layer for dsh-software-tools: the catalog (built-in + user entries) and
 * the checked selection, plus the validated mutations behind the panel's
 * add / remove endpoints.
 *
 * Files, matching the established layout of an existing state directory:
 *   <stateDir>/catalog.json    { "tools": [entry…] }  user entries; same id overrides a built-in
 *   <stateDir>/selection.json  { "ids": ["aria2", …] }  checked tools
 *
 * Every write is (1) preceded by a sibling `<file>.bak.<YYYYMMDD-HHMMSS>` copy
 * (the convention the state directory already carries; the newest backups are
 * kept) and (2) atomic: the new bytes go to a temporary file in the same
 * directory and are renamed over the target, so a crash mid-write can never
 * leave a half-written catalog behind.
 *
 * Mutations are synchronous read-modify-write functions: Node runs one at a
 * time on its single thread, so two panel tabs cannot interleave inside a
 * mutation. Two *processes* sharing one settingsDir are out of scope (README).
 */
import { randomBytes } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'

/** Config accepted on the cordis entry (all optional). */
export interface SoftwareToolsConfig {
  /**
   * Directory holding `selection.json` + `catalog.json`.
   * Defaults to `$DSH_HOME/software-tools` (i.e. `~/.dsh/software-tools`).
   */
  settingsDir?: string
}

export type Category = 'download' | 'proxy' | 'media' | 'browser' | 'knowledge' | 'runtime' | 'model' | 'misc'

/** One entry in the curated inventory. */
export interface SoftwareTool {
  id: string
  name: string
  category: Category
  desc: string
  usage: string
}

/**
 * A merged catalog row as the panel receives it. `origin` tells the browser
 * where the row comes from, `readonly` whether it may be deleted:
 *   - builtin  → shipped with the plugin, not deletable
 *   - override → user entry carrying a built-in id: deletable, after which the
 *                built-in version appears again (fallback)
 *   - user     → user-only entry: deletable
 */
export interface CatalogEntry extends SoftwareTool {
  origin: 'builtin' | 'user' | 'override'
  readonly: boolean
}

/**
 * The curated catalog shipped with the plugin. Kept deliberately
 * machine-independent: entries here must hold for any WSL/Windows host.
 * Machine-specific tools (IDM's install path, an Obsidian vault location,
 * a local ComfyUI...) belong in the *user* catalog —
 * `~/.dsh/software-tools/catalog.json` — which the panel or the
 * `add-software-tool` skill writes; a user entry with the same id overrides a
 * built-in.
 *
 * `usage` is injected verbatim into every request, so it carries USAGE ONLY:
 * how to reach the tool + the prerequisites a caller must know (≤5 lines).
 * Tuning/ops/benchmark/history detail belongs in that tool's own docs, never
 * here -- see the add-software-tool skill, which enforces this when entries
 * are written or revised.
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
    usage: '用完整路径调用,如 cmd.exe /c "命令"(Windows 盘符路径形如 C:\\Windows\\System32\\cmd.exe)或直接运行 Windows exe。',
  },
  {
    id: 'zstd',
    name: 'zstd / fzstd (压缩)',
    category: 'misc',
    desc: '会话文件是 zstd 多帧 JSONL,解压/压缩工具。',
    usage: 'node 用 fzstd(node_modules/fzstd)decompress;或命令行 zstd -d。',
  },
]

export const CATEGORY_LABELS: Record<Category, string> = {
  download: '下载',
  proxy: '代理与网络',
  media: '媒体生成',
  browser: '浏览器',
  knowledge: '知识库',
  runtime: '运行时',
  model: '模型',
  misc: '其他',
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]

/** Resolve the dsh home: $DSH_HOME env, else ~/.dsh (mirrors dsh-home-paths). */
function resolveDshHome(): string {
  const env = process.env.DSH_HOME
  if (env && env.trim().length > 0) return env.trim()
  return join(homedir(), '.dsh')
}

/** State directory (selection + user catalog). Config may override. */
export function stateDir(config: Partial<SoftwareToolsConfig>): string {
  const override = config.settingsDir
  if (override && override.trim().length > 0) return override.trim()
  return join(resolveDshHome(), 'software-tools')
}

export function catalogFile(config: Partial<SoftwareToolsConfig>): string {
  return join(stateDir(config), 'catalog.json')
}

export function selectionFile(config: Partial<SoftwareToolsConfig>): string {
  return join(stateDir(config), 'selection.json')
}

/* ------------------------------------------------------------------ writes */

/** Backups kept per state file; older ones are pruned after each write. */
const BACKUP_KEEP = 20

/** Local-time stamp used by the existing `<file>.bak.<stamp>` convention. */
function stamp(date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

/** Keep the newest {@link BACKUP_KEEP} backups of one state file. */
function pruneBackups(file: string): void {
  const dir = dirname(file)
  const prefix = `${basename(file)}.bak.`
  let names: string[]
  try {
    names = readdirSync(dir).filter((entry) => entry.startsWith(prefix)).sort()
  } catch {
    return
  }
  for (const name of names.slice(0, Math.max(0, names.length - BACKUP_KEEP))) {
    try {
      rmSync(join(dir, name))
    } catch {
      /* best effort: a leftover backup must never fail a write */
    }
  }
}

/**
 * Copy a state file to its timestamped sibling before it is rewritten.
 * @returns the backup path, or undefined when the file does not exist yet.
 */
export function backupFile(file: string): string | undefined {
  if (!existsSync(file)) return undefined
  const base = `${file}.bak.${stamp()}`
  // Several writes can land inside one second (a bulk edit, two clicks); keep
  // each backup instead of letting later ones overwrite earlier ones.
  let target = base
  for (let n = 2; existsSync(target); n += 1) target = `${base}-${n}`
  copyFileSync(file, target)
  pruneBackups(file)
  return target
}

/** Atomic JSON write: temp file in the same directory, then rename. */
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  const temp = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  try {
    renameSync(temp, file)
  } catch (error) {
    try {
      rmSync(temp)
    } catch {
      /* the rename error is the one worth reporting */
    }
    throw error
  }
}

/* ------------------------------------------------------------------- reads */

/** One row from catalog.json, or the reason it cannot be used. */
type NormalizedRow = { ok: true; tool: SoftwareTool } | { ok: false; reason: string }

/**
 * Structurally validate one hand-written row. Unknown extra fields are dropped
 * (they carry no meaning for the panel or the prompt), but a *missing* required
 * field is reported instead of silently swallowed — see `UserCatalog.dropped`.
 */
function normalizeEntry(value: unknown): NormalizedRow {
  if (typeof value !== 'object' || value === null) return { ok: false, reason: 'row is not an object' }
  const entry = value as Partial<SoftwareTool>
  const idHint =
    typeof entry.id === 'string' && entry.id.trim().length > 0 ? ` (id ${JSON.stringify(entry.id.trim())})` : ''
  if (typeof entry.id !== 'string' || entry.id.trim().length === 0) return { ok: false, reason: 'missing "id"' }
  if (typeof entry.name !== 'string' || entry.name.trim().length === 0) {
    return { ok: false, reason: `missing "name"${idHint}` }
  }
  if (typeof entry.desc !== 'string') return { ok: false, reason: `missing "desc"${idHint}` }
  if (typeof entry.usage !== 'string' || entry.usage.trim().length === 0) {
    return { ok: false, reason: `missing "usage"${idHint}` }
  }
  if (typeof entry.category !== 'string' || entry.category.trim().length === 0) {
    return { ok: false, reason: `missing "category"${idHint}` }
  }
  return {
    ok: true,
    tool: {
      id: entry.id.trim(),
      name: entry.name.trim(),
      // A hand-written file may carry an old/foreign category; keep it verbatim
      // (the panel still renders a badge) instead of dropping the user's entry.
      category: entry.category.trim() as Category,
      desc: entry.desc.trim(),
      usage: entry.usage.trim(),
    },
  }
}

/** One row of catalog.json that could not be used (0-based index in `tools`). */
export interface CatalogDrop {
  index: number
  reason: string
}

export interface UserCatalog {
  tools: SoftwareTool[]
  /** Parse/read failure: the user file exists but cannot be trusted. */
  error?: string
  /**
   * Usable rows are in `tools`; rows that failed validation are listed here so
   * `list` can warn and mutations can refuse to rewrite a partially unreadable
   * file (F1: a dropped row must never be deleted by a later add/remove).
   */
  dropped: CatalogDrop[]
}

/**
 * Read the user catalog. A missing file is "no user entries"; an unreadable
 * one is reported through `error`, so `list` can warn and mutations can refuse
 * to overwrite data they could not parse.
 */
export function readUserCatalog(config: Partial<SoftwareToolsConfig>): UserCatalog {
  const file = catalogFile(config)
  if (!existsSync(file)) return { tools: [], dropped: [] }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    return { tools: [], dropped: [], error: `catalog.json is not valid JSON (${String(error)})` }
  }
  const raw = parsed as { tools?: unknown } | null
  if (raw === null || typeof raw !== 'object' || !Array.isArray(raw.tools)) {
    return { tools: [], dropped: [], error: 'catalog.json must be an object with a "tools" array' }
  }
  const tools: SoftwareTool[] = []
  const dropped: CatalogDrop[] = []
  raw.tools.forEach((value, index) => {
    const entry = normalizeEntry(value)
    if (entry.ok) tools.push(entry.tool)
    else dropped.push({ index, reason: entry.reason })
  })
  return { tools, dropped }
}

export interface MergedCatalog {
  entries: CatalogEntry[]
  /** Set when the user catalog exists but could not be parsed at all. */
  error?: string
  /** Non-fatal problems (unusable rows, duplicate ids) shown by the panel. */
  warnings: string[]
  /** Rows that could not be parsed; mutations refuse while this is non-empty. */
  dropped: CatalogDrop[]
}

/**
 * Merge one already-read user catalog over the built-in rows.
 *
 * User ids are de-duplicated: the **last** row with an id wins (file order, the
 * same rule a hand edit implies) and the earlier one is reported as a warning.
 * Without that, a duplicate id produced duplicate panel rows and duplicate React
 * keys (F5).
 */
export function mergeCatalog(user: UserCatalog): MergedCatalog {
  const warnings: string[] = []
  for (const drop of user.dropped) {
    warnings.push(
      `catalog.json row ${drop.index + 1}: ${drop.reason} — kept in the file, but not usable until fixed`,
    )
  }

  const userById = new Map<string, SoftwareTool>()
  const order: string[] = []
  user.tools.forEach((tool, index) => {
    if (userById.has(tool.id)) {
      warnings.push(
        `catalog.json row ${index + 1}: duplicate id ${JSON.stringify(tool.id)} — the last row wins`,
      )
    } else {
      order.push(tool.id)
    }
    userById.set(tool.id, tool)
  })

  const entries: CatalogEntry[] = []
  const builtinIds = new Set<string>()
  for (const tool of CATALOG) {
    builtinIds.add(tool.id)
    const override = userById.get(tool.id)
    if (override === undefined) {
      entries.push({ ...tool, origin: 'builtin', readonly: true })
    } else {
      entries.push({ ...override, origin: 'override', readonly: false })
    }
  }
  for (const id of order) {
    if (builtinIds.has(id)) continue
    const tool = userById.get(id)
    if (tool === undefined) continue
    entries.push({ ...tool, origin: 'user', readonly: false })
  }

  const result: MergedCatalog = { entries, warnings, dropped: user.dropped }
  if (user.error !== undefined) result.error = user.error
  return result
}

/**
 * Merge built-in and user entries: user entries override built-ins with the
 * same id (keeping the built-in position), user-only entries follow in file
 * order.
 */
export function mergedCatalog(config: Partial<SoftwareToolsConfig>): MergedCatalog {
  return mergeCatalog(readUserCatalog(config))
}

/** Merged rows without the panel-only fields (prompt rendering, set checks). */
export function mergedTools(config: Partial<SoftwareToolsConfig>): SoftwareTool[] {
  return mergedCatalog(config).entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    desc: entry.desc,
    usage: entry.usage,
  }))
}

/** Checked ids, in the persisted order. Missing/unreadable → empty. */
export function readSelected(config: Partial<SoftwareToolsConfig>): string[] {
  try {
    const raw = JSON.parse(readFileSync(selectionFile(config), 'utf8')) as { ids?: unknown }
    if (Array.isArray(raw.ids)) return raw.ids.filter((x): x is string => typeof x === 'string')
  } catch {
    /* missing or unreadable — treat as empty */
  }
  return []
}

/**
 * Persist the checked ids (backup + atomic write). An unchanged selection is
 * not rewritten, so repeated toggles do not spawn backup files.
 * @returns true when the file was written.
 */
export function writeSelected(config: Partial<SoftwareToolsConfig>, ids: string[]): boolean {
  const current = readSelected(config)
  if (current.length === ids.length && current.every((id, index) => id === ids[index])) return false
  const file = selectionFile(config)
  backupFile(file)
  writeJson(file, { ids })
  return true
}

/** The compact injected section: one line per checked tool. */
export function renderSection(config: Partial<SoftwareToolsConfig>, ids: string[]): string {
  const catalog = mergedTools(config)
  const chosen = ids
    .map((id) => catalog.find((t) => t.id === id))
    .filter((t): t is SoftwareTool => t !== undefined)
  if (chosen.length === 0) return ''
  const lines = chosen.map((t) => `- ${t.name}: ${t.usage}`)
  return `# 本机可用软件工具(用户已勾选,按需用 bash/shell 调用)\n${lines.join('\n')}`
}

/* --------------------------------------------------------------- mutations */

/** Endpoint failure in the shape the browser validates. */
export interface MutationFailure {
  ok: false
  error: { code: string; message: string }
}

export interface AddToolResult {
  ok: true
  /** The written row, in merged-catalog form. */
  tool: CatalogEntry
  /** True when an existing user entry (or a built-in) with this id was replaced. */
  overwritten: boolean
}

export interface RemoveToolResult {
  ok: true
  id: string
  /** True when the removed id was also unchecked in selection.json. */
  selectionUpdated: boolean
  /** True when a built-in with this id becomes visible again. */
  fallbackToBuiltin: boolean
}

export type AddResult = AddToolResult | MutationFailure
export type RemoveResult = RemoveToolResult | MutationFailure

/** Field caps: `usage` is re-injected on every request, so it stays bounded. */
const MAX_LENGTH = { id: 64, name: 200, desc: 1000, usage: 2000 } as const
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/
const MAX_DEDUPE = 200

function fail(code: string, message: string): MutationFailure {
  return { ok: false, error: { code, message } }
}

/**
 * F1: a row that cannot be parsed is still *user data*. Rewriting the file from
 * `tools` would silently delete it (only a `.bak` would remain), so add/remove
 * refuse while any row is unusable and `list` reports the rows as
 * `catalogWarnings`. Preserving raw rows verbatim was the alternative, but it
 * would also have to round-trip unknown fields and formatting and would still
 * leave a broken catalog — refusing is the safer, more explicit contract.
 */
function droppedRefusal(user: UserCatalog): MutationFailure | undefined {
  if (user.dropped.length === 0) return undefined
  const details = user.dropped.map((drop) => `row ${drop.index + 1}: ${drop.reason}`).join('; ')
  return fail(
    'catalog-invalid',
    `catalog.json has ${user.dropped.length} row(s) that cannot be parsed (${details}); refusing to rewrite it — fix or remove those rows first`,
  )
}

type Valid<T> = { ok: true; value: T } | MutationFailure

/** Validate one bounded free-text field; returns the trimmed value. */
function validateText(value: unknown, field: keyof typeof MAX_LENGTH): Valid<string> {
  if (typeof value !== 'string') return fail('bad-request', `${field} must be a string`)
  const trimmed = value.trim()
  if (trimmed.length === 0) return fail('bad-request', `${field} must not be empty`)
  if (trimmed.length > MAX_LENGTH[field]) {
    return fail('bad-request', `${field} is too long (max ${MAX_LENGTH[field]} characters)`)
  }
  return { ok: true, value: trimmed }
}

/** Derive a JSON/selection-safe id from a display name (ascii-only; may be "tool"). */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug.length > 0 ? slug : 'tool'
}

/** `base`, else `base-2`, `base-3`, … — the first id not in `taken`. */
function dedupeId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; n <= MAX_DEDUPE; n += 1) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

type BuiltEntry = { ok: true; tool: SoftwareTool; explicit: boolean } | MutationFailure

/** Validate the add payload and resolve the id (auto slug + dedupe, or explicit). */
function buildEntry(input: Record<string, unknown>, taken: Set<string>): BuiltEntry {
  const name = validateText(input.name, 'name')
  if (!name.ok) return name
  const desc = validateText(input.desc, 'desc')
  if (!desc.ok) return desc
  const usage = validateText(input.usage, 'usage')
  if (!usage.ok) return usage

  const category = input.category
  if (typeof category !== 'string' || !CATEGORIES.includes(category as Category)) {
    return fail('bad-request', `category must be one of: ${CATEGORIES.join(', ')}`)
  }

  let explicit = false
  let id: string
  const given = input.id
  if (given === undefined || given === null || (typeof given === 'string' && given.trim() === '')) {
    id = dedupeId(slugify(name.value), taken)
  } else {
    const validated = validateText(given, 'id')
    if (!validated.ok) return validated
    if (!ID_PATTERN.test(validated.value)) {
      return fail('bad-request', 'id must match ^[a-z0-9][a-z0-9._-]*$ (max 64 characters)')
    }
    explicit = true
    id = validated.value
  }

  return {
    ok: true,
    explicit,
    tool: { id, name: name.value, category: category as Category, desc: desc.value, usage: usage.value },
  }
}

/**
 * Add (or, with `overwrite: true`, replace) one user entry.
 *
 * - no `id` → slugified from `name` and de-duplicated (`tool`, `tool-2`, …);
 * - explicit `id` already in the merged catalog → refused unless
 *   `overwrite: true` (a built-in id turns the entry into an override);
 * - writes `catalog.json` after a backup, through an atomic rename.
 */
export function addTool(config: Partial<SoftwareToolsConfig>, input: unknown): AddResult {
  if (typeof input !== 'object' || input === null) return fail('bad-request', 'payload must be an object')
  const payload = input as Record<string, unknown>

  const user = readUserCatalog(config)
  if (user.error !== undefined) return fail('catalog-unreadable', user.error)
  const dropped = droppedRefusal(user)
  if (dropped !== undefined) return dropped

  const merged = mergeCatalog(user)
  const taken = new Set(merged.entries.map((entry) => entry.id))
  const built = buildEntry(payload, taken)
  if (!built.ok) return built
  const entry = built.tool

  const exists = taken.has(entry.id)
  if (exists && (!built.explicit || payload.overwrite !== true)) {
    const origin = merged.entries.find((row) => row.id === entry.id)?.origin ?? 'user'
    return fail(
      'id-conflict',
      `id ${JSON.stringify(entry.id)} already exists (${origin}); pass overwrite:true to replace it`,
    )
  }

  const tools = user.tools.filter((tool) => tool.id !== entry.id)
  tools.push(entry)
  backupFile(catalogFile(config))
  writeJson(catalogFile(config), { tools })

  const origin: CatalogEntry['origin'] = CATALOG.some((tool) => tool.id === entry.id) ? 'override' : 'user'
  return { ok: true, tool: { ...entry, origin, readonly: false }, overwritten: exists }
}

/**
 * Remove one user entry and drop its id from the selection.
 *
 * Built-in-only ids are refused (`builtin-readonly`): only `catalog.json` rows
 * are deletable. Removing an override reveals the built-in version again.
 */
export function removeTool(config: Partial<SoftwareToolsConfig>, input: unknown): RemoveResult {
  if (typeof input !== 'object' || input === null) return fail('bad-request', 'payload must be an object')
  const raw = (input as Record<string, unknown>).id
  if (typeof raw !== 'string' || raw.trim().length === 0) return fail('bad-request', 'id must be a non-empty string')
  const id = raw.trim()

  const user = readUserCatalog(config)
  if (user.error !== undefined) return fail('catalog-unreadable', user.error)
  const dropped = droppedRefusal(user)
  if (dropped !== undefined) return dropped

  const index = user.tools.findIndex((tool) => tool.id === id)
  if (index < 0) {
    if (CATALOG.some((tool) => tool.id === id)) {
      return fail('builtin-readonly', `built-in entry ${JSON.stringify(id)} cannot be deleted`)
    }
    return fail('unknown-id', `no user entry with id ${JSON.stringify(id)}`)
  }

  const tools = user.tools.filter((tool) => tool.id !== id)
  backupFile(catalogFile(config))
  writeJson(catalogFile(config), { tools })

  const selected = readSelected(config)
  const kept = selected.filter((x) => x !== id)
  const selectionUpdated = kept.length !== selected.length
  if (selectionUpdated) {
    backupFile(selectionFile(config))
    writeJson(selectionFile(config), { ids: kept })
  }

  return {
    ok: true,
    id,
    selectionUpdated,
    fallbackToBuiltin: CATALOG.some((tool) => tool.id === id),
  }
}
