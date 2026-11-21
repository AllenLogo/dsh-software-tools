/**
 * State layer for dsh-software-tools: the catalog (built-in + user entries) and
 * the checked selection, plus the validated mutations behind the panel's
 * add / remove endpoints.
 *
 * Files, matching the established layout of an existing state directory:
 *   <stateDir>/catalog.json    { "tools": [entry…] }  user entries; same id overrides a built-in
 *   <stateDir>/selection.json  { "ids": ["aria2", …], "mode": "full" | "compact" }  checked tools + injection mode
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
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
export const RENDER_MODES = ['full', 'compact'];
export function isRenderMode(value) {
    return value === 'full' || value === 'compact';
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
 *
 * `compact` is the smaller sibling injected when the panel's 精简模式 is on: the
 * one line that decides *whether and how* to call the tool. Every built-in and
 * every user entry is expected to carry one; a missing `compact` falls back to
 * `usage` (never a blank line).
 */
export const CATALOG = [
    {
        id: 'aria2',
        name: 'aria2 (命令行多线程下载)',
        category: 'download',
        desc: 'WSL 内多线程下载器,已安装。',
        usage: 'aria2c -x 16 -s 16 -k 1M <URL> ;慢时加 --all-proxy=<本机代理地址> (代理端口各机不同,先确认再填)。',
        compact: 'aria2c -x 16 -s 16 -k 1M <URL> ;慢时加 --all-proxy=<本机代理地址> 。',
    },
    {
        id: 'hf-mirror',
        name: 'HF 模型镜像 (hf-mirror)',
        category: 'download',
        desc: 'HuggingFace 国内镜像,下载大模型免代理。',
        usage: '设环境变量 HF_ENDPOINT=https://hf-mirror.com 后用 huggingface-cli / aria2 下载模型。',
        compact: '设 HF_ENDPOINT=https://hf-mirror.com 后用 huggingface-cli / aria2 下载。',
    },
    {
        id: 'playwright',
        name: 'Playwright / Chromium (浏览器自动化)',
        category: 'browser',
        desc: 'WSL 内无头 Chromium,可驱动真实浏览器。',
        usage: '经 MCP 工具 mcp__browser__* (navigate/click/type/screenshot);或 npx playwright 脚本;Chromium 在 ~/.cache/ms-playwright。',
        compact: '走 MCP mcp__browser__* (navigate/click/type/screenshot);或 npx playwright 脚本。',
    },
    {
        id: 'uvx',
        name: 'uv / uvx (Python 运行器)',
        category: 'runtime',
        desc: 'Python 包/工具即用即走运行器。',
        usage: 'uvx <package> 直接跑 PyPI 工具(如 uvx mcp-server-sqlite)。',
        compact: 'uvx <package> 直接跑 PyPI 工具(如 uvx mcp-server-sqlite)。',
    },
    {
        id: 'interop',
        name: 'WSL interop (调 Windows 程序)',
        category: 'runtime',
        desc: 'WSL 可执行 Windows exe(cmd.exe/powershell/任意 .exe)。',
        usage: '用完整路径调用,如 cmd.exe /c "命令"(Windows 盘符路径形如 C:\\Windows\\System32\\cmd.exe)或直接运行 Windows exe。',
        compact: 'cmd.exe /c "命令" 调 Windows 程序;盘符路径形如 C:\\Windows\\System32\\cmd.exe 。',
    },
    {
        id: 'zstd',
        name: 'zstd (压缩)',
        category: 'misc',
        desc: '会话文件是 zstd 多帧 JSONL;没有 zstd CLI 时用 Python 的 zstandard 包读写。',
        usage: '解压:python3 -c "import zstandard as z,sys;sys.stdout.buffer.write(z.ZstdDecompressor().stream_reader(sys.stdin.buffer).read())" < 文件.jsonl.zstd > 输出.jsonl ;压缩:python3 -c "import zstandard as z,sys;sys.stdout.buffer.write(z.ZstdCompressor().compress(sys.stdin.buffer.read()))" < 输入.jsonl > 输出.jsonl.zstd 。多帧文件必须用 stream_reader,不能一次性 decompress;装了 zstd CLI 时也可 zstd -d 。',
        compact: '无 zstd CLI 时解压:python3 -c "import zstandard as z,sys;sys.stdout.buffer.write(z.ZstdDecompressor().stream_reader(sys.stdin.buffer).read())" < 文件.zst 。',
    },
];
export const CATEGORY_LABELS = {
    download: '下载',
    proxy: '代理与网络',
    media: '媒体生成',
    browser: '浏览器',
    knowledge: '知识库',
    runtime: '运行时',
    model: '模型',
    misc: '其他',
};
export const CATEGORIES = Object.keys(CATEGORY_LABELS);
/** Resolve the dsh home: $DSH_HOME env, else ~/.dsh (mirrors dsh-home-paths). */
function resolveDshHome() {
    const env = process.env.DSH_HOME;
    if (env && env.trim().length > 0)
        return env.trim();
    return join(homedir(), '.dsh');
}
/** State directory (selection + user catalog). Config may override. */
export function stateDir(config) {
    const override = config.settingsDir;
    if (override && override.trim().length > 0)
        return override.trim();
    return join(resolveDshHome(), 'software-tools');
}
export function catalogFile(config) {
    return join(stateDir(config), 'catalog.json');
}
export function selectionFile(config) {
    return join(stateDir(config), 'selection.json');
}
/* ------------------------------------------------------------------ writes */
/** Backups kept per state file; older ones are pruned after each write. */
const BACKUP_KEEP = 20;
/** Local-time stamp used by the existing `<file>.bak.<stamp>` convention. */
function stamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return (`${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
        `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`);
}
/** Keep the newest {@link BACKUP_KEEP} backups of one state file. */
function pruneBackups(file) {
    const dir = dirname(file);
    const prefix = `${basename(file)}.bak.`;
    let names;
    try {
        names = readdirSync(dir).filter((entry) => entry.startsWith(prefix)).sort();
    }
    catch {
        return;
    }
    for (const name of names.slice(0, Math.max(0, names.length - BACKUP_KEEP))) {
        try {
            rmSync(join(dir, name));
        }
        catch {
            /* best effort: a leftover backup must never fail a write */
        }
    }
}
/**
 * Copy a state file to its timestamped sibling before it is rewritten.
 * @returns the backup path, or undefined when the file does not exist yet.
 */
export function backupFile(file) {
    if (!existsSync(file))
        return undefined;
    const base = `${file}.bak.${stamp()}`;
    // Several writes can land inside one second (a bulk edit, two clicks); keep
    // each backup instead of letting later ones overwrite earlier ones.
    let target = base;
    for (let n = 2; existsSync(target); n += 1)
        target = `${base}-${n}`;
    copyFileSync(file, target);
    pruneBackups(file);
    return target;
}
/** Atomic JSON write: temp file in the same directory, then rename. */
function writeJson(file, value) {
    mkdirSync(dirname(file), { recursive: true });
    const temp = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    try {
        renameSync(temp, file);
    }
    catch (error) {
        try {
            rmSync(temp);
        }
        catch {
            /* the rename error is the one worth reporting */
        }
        throw error;
    }
}
/**
 * Structurally validate one hand-written row. Unknown extra fields are dropped
 * (they carry no meaning for the panel or the prompt), but a *missing* required
 * field is reported instead of silently swallowed — see `UserCatalog.dropped`.
 */
export function normalizeEntry(value) {
    if (typeof value !== 'object' || value === null)
        return { ok: false, reason: 'row is not an object' };
    const entry = value;
    const idHint = typeof entry.id === 'string' && entry.id.trim().length > 0 ? ` (id ${JSON.stringify(entry.id.trim())})` : '';
    if (typeof entry.id !== 'string' || entry.id.trim().length === 0)
        return { ok: false, reason: 'missing "id"' };
    if (typeof entry.name !== 'string' || entry.name.trim().length === 0) {
        return { ok: false, reason: `missing "name"${idHint}` };
    }
    if (typeof entry.desc !== 'string')
        return { ok: false, reason: `missing "desc"${idHint}` };
    if (typeof entry.usage !== 'string' || entry.usage.trim().length === 0) {
        return { ok: false, reason: `missing "usage"${idHint}` };
    }
    if (typeof entry.category !== 'string' || entry.category.trim().length === 0) {
        return { ok: false, reason: `missing "category"${idHint}` };
    }
    // `compact` is optional: a non-string or blank value means "not provided", so
    // the row still loads and the renderer falls back to `usage`.
    const compact = typeof entry.compact === 'string' && entry.compact.trim().length > 0 ? entry.compact.trim() : undefined;
    return {
        ok: true,
        tool: {
            id: entry.id.trim(),
            name: entry.name.trim(),
            // A hand-written file may carry an old/foreign category; keep it verbatim
            // (the panel still renders a badge) instead of dropping the user's entry.
            category: entry.category.trim(),
            desc: entry.desc.trim(),
            usage: entry.usage.trim(),
            ...(compact !== undefined ? { compact } : {}),
        },
    };
}
/**
 * Read the user catalog. A missing file is "no user entries"; an unreadable
 * one is reported through `error`, so `list` can warn and mutations can refuse
 * to overwrite data they could not parse.
 */
export function readUserCatalog(config) {
    const file = catalogFile(config);
    if (!existsSync(file))
        return { tools: [], dropped: [] };
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'));
    }
    catch (error) {
        return { tools: [], dropped: [], error: `catalog.json is not valid JSON (${String(error)})` };
    }
    const raw = parsed;
    if (raw === null || typeof raw !== 'object' || !Array.isArray(raw.tools)) {
        return { tools: [], dropped: [], error: 'catalog.json must be an object with a "tools" array' };
    }
    const tools = [];
    const dropped = [];
    raw.tools.forEach((value, index) => {
        const entry = normalizeEntry(value);
        if (entry.ok)
            tools.push(entry.tool);
        else
            dropped.push({ index, reason: entry.reason });
    });
    return { tools, dropped };
}
/**
 * Merge one already-read user catalog over the built-in rows.
 *
 * User ids are de-duplicated: the **last** row with an id wins (file order, the
 * same rule a hand edit implies) and the earlier one is reported as a warning.
 * Without that, a duplicate id produced duplicate panel rows and duplicate React
 * keys (F5).
 */
export function mergeCatalog(user) {
    const warnings = [];
    for (const drop of user.dropped) {
        warnings.push(`catalog.json row ${drop.index + 1}: ${drop.reason} — kept in the file, but not usable until fixed`);
    }
    const userById = new Map();
    const order = [];
    user.tools.forEach((tool, index) => {
        if (userById.has(tool.id)) {
            warnings.push(`catalog.json row ${index + 1}: duplicate id ${JSON.stringify(tool.id)} — the last row wins`);
        }
        else {
            order.push(tool.id);
        }
        userById.set(tool.id, tool);
    });
    const entries = [];
    const builtinIds = new Set();
    for (const tool of CATALOG) {
        builtinIds.add(tool.id);
        const override = userById.get(tool.id);
        if (override === undefined) {
            entries.push({ ...tool, origin: 'builtin', readonly: true });
        }
        else {
            entries.push({ ...override, origin: 'override', readonly: false });
        }
    }
    for (const id of order) {
        if (builtinIds.has(id))
            continue;
        const tool = userById.get(id);
        if (tool === undefined)
            continue;
        entries.push({ ...tool, origin: 'user', readonly: false });
    }
    const result = { entries, warnings, dropped: user.dropped };
    if (user.error !== undefined)
        result.error = user.error;
    return result;
}
/**
 * Merge built-in and user entries: user entries override built-ins with the
 * same id (keeping the built-in position), user-only entries follow in file
 * order.
 */
export function mergedCatalog(config) {
    return mergeCatalog(readUserCatalog(config));
}
/** Merged rows without the panel-only fields (prompt rendering, set checks). */
export function mergedTools(config) {
    return mergedCatalog(config).entries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        desc: entry.desc,
        usage: entry.usage,
        ...(entry.compact !== undefined ? { compact: entry.compact } : {}),
    }));
}
/**
 * Injection mode persisted in `selection.json`. Missing/invalid → `full`, so an
 * existing state file (which has no `mode` key) keeps injecting `usage`.
 */
export function readRenderMode(config) {
    try {
        const raw = JSON.parse(readFileSync(selectionFile(config), 'utf8'));
        if (isRenderMode(raw.mode))
            return raw.mode;
    }
    catch {
        /* missing or unreadable — the default mode */
    }
    return 'full';
}
/**
 * The one place `selection.json` is written.
 *
 * `selection.json` carries two independent fields — `ids` (the checked set) and
 * `mode` (the injection mode) — and every writer owns only one of them. Routing
 * all writes through here is what keeps that true: each caller passes just the
 * field it changes, and the other is read back and carried over. Writing
 * `{ ids }` directly from a caller is how the mode got silently dropped by
 * `removeTool` (a delete turned compact mode off, doubling the injected
 * section), so callers must not build the object themselves.
 *
 * A `mode: 'full'` is normalised to "no `mode` key", keeping the file identical
 * to what v0.4 wrote when the mode is the default.
 */
function writeSelection(config, patch) {
    const ids = patch.ids ?? readSelected(config);
    const mode = patch.mode ?? readRenderMode(config);
    const file = selectionFile(config);
    backupFile(file);
    writeJson(file, mode === 'full' ? { ids } : { ids, mode });
    return true;
}
/**
 * Persist the injection mode next to the checked ids. The ids are preserved
 * verbatim (this endpoint never touches the selection) and an unchanged mode
 * does not rewrite the file, so repeated clicks spawn no backup files.
 * @returns true when the file was written.
 */
export function writeRenderMode(config, mode) {
    if (readRenderMode(config) === mode)
        return false;
    return writeSelection(config, { mode });
}
/** Checked ids, in the persisted order. Missing/unreadable → empty. */
export function readSelected(config) {
    try {
        const raw = JSON.parse(readFileSync(selectionFile(config), 'utf8'));
        if (Array.isArray(raw.ids))
            return raw.ids.filter((x) => typeof x === 'string');
    }
    catch {
        /* missing or unreadable — treat as empty */
    }
    return [];
}
/**
 * Persist the checked ids (backup + atomic write). An unchanged selection is
 * not rewritten, so repeated toggles do not spawn backup files. The persisted
 * injection mode is carried over verbatim: this endpoint only owns `ids`.
 * @returns true when the file was written.
 */
export function writeSelected(config, ids) {
    const current = readSelected(config);
    if (current.length === ids.length && current.every((id, index) => id === ids[index]))
        return false;
    return writeSelection(config, { ids });
}
/** The text injected for one tool: `compact` in compact mode (when present), else `usage`. */
export function injectedText(tool, mode) {
    if (mode === 'compact' && tool.compact !== undefined && tool.compact.trim().length > 0)
        return tool.compact;
    return tool.usage;
}
/**
 * The injected section: one line per checked tool.
 *
 * `mode` selects the per-entry field — `usage` for `full`, `compact` for
 * `compact` — and an entry without `compact` falls back to `usage` in either
 * mode, so partial adoption is safe. `config.compact === undefined` is not the
 * only way to shrink it: the caller decides the mode.
 */
export function renderSection(config, ids, mode = 'full') {
    const catalog = mergedTools(config);
    const chosen = ids
        .map((id) => catalog.find((t) => t.id === id))
        .filter((t) => t !== undefined);
    if (chosen.length === 0)
        return '';
    const lines = chosen.map((t) => `- ${t.name}: ${injectedText(t, mode)}`);
    return `# 本机可用软件工具(用户已勾选,按需用 bash/shell 调用)\n${lines.join('\n')}`;
}
/**
 * Field caps. `usage` and `compact` are both re-injected on every request, so
 * both stay bounded; `compact` is the small one by definition.
 */
const MAX_LENGTH = { id: 64, name: 200, desc: 1000, usage: 2000, compact: 200 };
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const MAX_DEDUPE = 200;
function fail(code, message) {
    return { ok: false, error: { code, message } };
}
/**
 * F1: a row that cannot be parsed is still *user data*. Rewriting the file from
 * `tools` would silently delete it (only a `.bak` would remain), so add/remove
 * refuse while any row is unusable and `list` reports the rows as
 * `catalogWarnings`. Preserving raw rows verbatim was the alternative, but it
 * would also have to round-trip unknown fields and formatting and would still
 * leave a broken catalog — refusing is the safer, more explicit contract.
 */
function droppedRefusal(user) {
    if (user.dropped.length === 0)
        return undefined;
    const details = user.dropped.map((drop) => `row ${drop.index + 1}: ${drop.reason}`).join('; ');
    return fail('catalog-invalid', `catalog.json has ${user.dropped.length} row(s) that cannot be parsed (${details}); refusing to rewrite it — fix or remove those rows first`);
}
/** Validate one bounded free-text field; returns the trimmed value. */
function validateText(value, field) {
    if (typeof value !== 'string')
        return fail('bad-request', `${field} must be a string`);
    const trimmed = value.trim();
    if (trimmed.length === 0)
        return fail('bad-request', `${field} must not be empty`);
    if (trimmed.length > MAX_LENGTH[field]) {
        return fail('bad-request', `${field} is too long (max ${MAX_LENGTH[field]} characters)`);
    }
    return { ok: true, value: trimmed };
}
/**
 * Validate the optional `compact` field: absent / null / blank means "not
 * provided" (the entry falls back to `usage`), anything else must be a bounded
 * non-empty string.
 */
function validateCompact(value) {
    if (value === undefined || value === null)
        return { ok: true, value: undefined };
    if (typeof value !== 'string')
        return fail('bad-request', 'compact must be a string');
    if (value.trim().length === 0)
        return { ok: true, value: undefined };
    return validateText(value, 'compact');
}
/** Derive a JSON/selection-safe id from a display name (ascii-only; may be "tool"). */
export function slugify(name) {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    return slug.length > 0 ? slug : 'tool';
}
/** `base`, else `base-2`, `base-3`, … — the first id not in `taken`. */
export function dedupeId(base, taken) {
    if (!taken.has(base))
        return base;
    for (let n = 2; n <= MAX_DEDUPE; n += 1) {
        const candidate = `${base}-${n}`;
        if (!taken.has(candidate))
            return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
}
/** Validate the add payload and resolve the id (auto slug + dedupe, or explicit). */
function buildEntry(input, taken) {
    const name = validateText(input.name, 'name');
    if (!name.ok)
        return name;
    const desc = validateText(input.desc, 'desc');
    if (!desc.ok)
        return desc;
    const usage = validateText(input.usage, 'usage');
    if (!usage.ok)
        return usage;
    const compact = validateCompact(input.compact);
    if (!compact.ok)
        return compact;
    const category = input.category;
    if (typeof category !== 'string' || !CATEGORIES.includes(category)) {
        return fail('bad-request', `category must be one of: ${CATEGORIES.join(', ')}`);
    }
    let explicit = false;
    let id;
    const given = input.id;
    if (given === undefined || given === null || (typeof given === 'string' && given.trim() === '')) {
        id = dedupeId(slugify(name.value), taken);
    }
    else {
        const validated = validateText(given, 'id');
        if (!validated.ok)
            return validated;
        if (!ID_PATTERN.test(validated.value)) {
            return fail('bad-request', 'id must match ^[a-z0-9][a-z0-9._-]*$ (max 64 characters)');
        }
        explicit = true;
        id = validated.value;
    }
    return {
        ok: true,
        explicit,
        tool: {
            id,
            name: name.value,
            category: category,
            desc: desc.value,
            usage: usage.value,
            ...(compact.value !== undefined ? { compact: compact.value } : {}),
        },
    };
}
/**
 * Add (or, with `overwrite: true`, replace) one user entry.
 *
 * - no `id` → slugified from `name` and de-duplicated (`tool`, `tool-2`, …);
 * - explicit `id` already in the merged catalog → refused unless
 *   `overwrite: true` (a built-in id turns the entry into an override);
 * - writes `catalog.json` after a backup, through an atomic rename.
 */
export function addTool(config, input) {
    if (typeof input !== 'object' || input === null)
        return fail('bad-request', 'payload must be an object');
    const payload = input;
    const user = readUserCatalog(config);
    if (user.error !== undefined)
        return fail('catalog-unreadable', user.error);
    const dropped = droppedRefusal(user);
    if (dropped !== undefined)
        return dropped;
    const merged = mergeCatalog(user);
    const taken = new Set(merged.entries.map((entry) => entry.id));
    const built = buildEntry(payload, taken);
    if (!built.ok)
        return built;
    const entry = built.tool;
    const exists = taken.has(entry.id);
    if (exists && (!built.explicit || payload.overwrite !== true)) {
        const origin = merged.entries.find((row) => row.id === entry.id)?.origin ?? 'user';
        return fail('id-conflict', `id ${JSON.stringify(entry.id)} already exists (${origin}); pass overwrite:true to replace it`);
    }
    const tools = user.tools.filter((tool) => tool.id !== entry.id);
    tools.push(entry);
    backupFile(catalogFile(config));
    writeJson(catalogFile(config), { tools });
    const origin = CATALOG.some((tool) => tool.id === entry.id) ? 'override' : 'user';
    return { ok: true, tool: { ...entry, origin, readonly: false }, overwritten: exists };
}
/**
 * Remove one user entry and drop its id from the selection.
 *
 * Built-in-only ids are refused (`builtin-readonly`): only `catalog.json` rows
 * are deletable. Removing an override reveals the built-in version again.
 */
export function removeTool(config, input) {
    if (typeof input !== 'object' || input === null)
        return fail('bad-request', 'payload must be an object');
    const raw = input.id;
    if (typeof raw !== 'string' || raw.trim().length === 0)
        return fail('bad-request', 'id must be a non-empty string');
    const id = raw.trim();
    const user = readUserCatalog(config);
    if (user.error !== undefined)
        return fail('catalog-unreadable', user.error);
    const dropped = droppedRefusal(user);
    if (dropped !== undefined)
        return dropped;
    const index = user.tools.findIndex((tool) => tool.id === id);
    if (index < 0) {
        if (CATALOG.some((tool) => tool.id === id)) {
            return fail('builtin-readonly', `built-in entry ${JSON.stringify(id)} cannot be deleted`);
        }
        return fail('unknown-id', `no user entry with id ${JSON.stringify(id)}`);
    }
    const tools = user.tools.filter((tool) => tool.id !== id);
    backupFile(catalogFile(config));
    writeJson(catalogFile(config), { tools });
    const selected = readSelected(config);
    const kept = selected.filter((x) => x !== id);
    const selectionUpdated = kept.length !== selected.length;
    // Goes through writeSelection so the persisted `mode` survives: deleting a row
    // must not silently turn compact mode off (that would double the section).
    if (selectionUpdated)
        writeSelection(config, { ids: kept });
    return {
        ok: true,
        id,
        selectionUpdated,
        fallbackToBuiltin: CATALOG.some((tool) => tool.id === id),
    };
}
//# sourceMappingURL=catalog.js.map