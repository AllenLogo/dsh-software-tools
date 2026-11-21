/** Config accepted on the cordis entry (all optional). */
export interface SoftwareToolsConfig {
    /**
     * Directory holding `selection.json` + `catalog.json`.
     * Defaults to `$DSH_HOME/software-tools` (i.e. `~/.dsh/software-tools`).
     */
    settingsDir?: string;
}
export type Category = 'download' | 'proxy' | 'media' | 'browser' | 'knowledge' | 'runtime' | 'model' | 'misc';
/** One entry in the curated inventory. */
export interface SoftwareTool {
    id: string;
    name: string;
    category: Category;
    desc: string;
    usage: string;
    /**
     * Short form injected instead of `usage` when the selection is in `compact`
     * mode: what the tool is + the one command that decides how to call it.
     * Optional — a missing `compact` falls back to `usage` (see
     * {@link renderSection}), so existing catalogs keep working unchanged.
     */
    compact?: string;
}
/**
 * Which field is injected into the system prompt.
 *   - `full`    → `usage` (the complete invocation recipe)
 *   - `compact` → `compact`, falling back to `usage` per entry when absent
 */
export type RenderMode = 'full' | 'compact';
export declare const RENDER_MODES: readonly RenderMode[];
export declare function isRenderMode(value: unknown): value is RenderMode;
/**
 * A merged catalog row as the panel receives it. `origin` tells the browser
 * where the row comes from, `readonly` whether it may be deleted:
 *   - builtin  → shipped with the plugin, not deletable
 *   - override → user entry carrying a built-in id: deletable, after which the
 *                built-in version appears again (fallback)
 *   - user     → user-only entry: deletable
 */
export interface CatalogEntry extends SoftwareTool {
    origin: 'builtin' | 'user' | 'override';
    readonly: boolean;
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
export declare const CATALOG: SoftwareTool[];
export declare const CATEGORY_LABELS: Record<Category, string>;
export declare const CATEGORIES: Category[];
/** State directory (selection + user catalog). Config may override. */
export declare function stateDir(config: Partial<SoftwareToolsConfig>): string;
export declare function catalogFile(config: Partial<SoftwareToolsConfig>): string;
export declare function selectionFile(config: Partial<SoftwareToolsConfig>): string;
/**
 * Copy a state file to its timestamped sibling before it is rewritten.
 * @returns the backup path, or undefined when the file does not exist yet.
 */
export declare function backupFile(file: string): string | undefined;
/** One row from catalog.json, or the reason it cannot be used. */
export type NormalizedRow = {
    ok: true;
    tool: SoftwareTool;
} | {
    ok: false;
    reason: string;
};
/**
 * Structurally validate one hand-written row. Unknown extra fields are dropped
 * (they carry no meaning for the panel or the prompt), but a *missing* required
 * field is reported instead of silently swallowed — see `UserCatalog.dropped`.
 */
export declare function normalizeEntry(value: unknown): NormalizedRow;
/** One row of catalog.json that could not be used (0-based index in `tools`). */
export interface CatalogDrop {
    index: number;
    reason: string;
}
export interface UserCatalog {
    tools: SoftwareTool[];
    /** Parse/read failure: the user file exists but cannot be trusted. */
    error?: string;
    /**
     * Usable rows are in `tools`; rows that failed validation are listed here so
     * `list` can warn and mutations can refuse to rewrite a partially unreadable
     * file (F1: a dropped row must never be deleted by a later add/remove).
     */
    dropped: CatalogDrop[];
}
/**
 * Read the user catalog. A missing file is "no user entries"; an unreadable
 * one is reported through `error`, so `list` can warn and mutations can refuse
 * to overwrite data they could not parse.
 */
export declare function readUserCatalog(config: Partial<SoftwareToolsConfig>): UserCatalog;
export interface MergedCatalog {
    entries: CatalogEntry[];
    /** Set when the user catalog exists but could not be parsed at all. */
    error?: string;
    /** Non-fatal problems (unusable rows, duplicate ids) shown by the panel. */
    warnings: string[];
    /** Rows that could not be parsed; mutations refuse while this is non-empty. */
    dropped: CatalogDrop[];
}
/**
 * Merge one already-read user catalog over the built-in rows.
 *
 * User ids are de-duplicated: the **last** row with an id wins (file order, the
 * same rule a hand edit implies) and the earlier one is reported as a warning.
 * Without that, a duplicate id produced duplicate panel rows and duplicate React
 * keys (F5).
 */
export declare function mergeCatalog(user: UserCatalog): MergedCatalog;
/**
 * Merge built-in and user entries: user entries override built-ins with the
 * same id (keeping the built-in position), user-only entries follow in file
 * order.
 */
export declare function mergedCatalog(config: Partial<SoftwareToolsConfig>): MergedCatalog;
/** Merged rows without the panel-only fields (prompt rendering, set checks). */
export declare function mergedTools(config: Partial<SoftwareToolsConfig>): SoftwareTool[];
/**
 * Injection mode persisted in `selection.json`. Missing/invalid → `full`, so an
 * existing state file (which has no `mode` key) keeps injecting `usage`.
 */
export declare function readRenderMode(config: Partial<SoftwareToolsConfig>): RenderMode;
/**
 * Persist the injection mode next to the checked ids. The ids are preserved
 * verbatim (this endpoint never touches the selection) and an unchanged mode
 * does not rewrite the file, so repeated clicks spawn no backup files.
 * @returns true when the file was written.
 */
export declare function writeRenderMode(config: Partial<SoftwareToolsConfig>, mode: RenderMode): boolean;
/** Checked ids, in the persisted order. Missing/unreadable → empty. */
export declare function readSelected(config: Partial<SoftwareToolsConfig>): string[];
/**
 * Persist the checked ids (backup + atomic write). An unchanged selection is
 * not rewritten, so repeated toggles do not spawn backup files. The persisted
 * injection mode is carried over verbatim: this endpoint only owns `ids`.
 * @returns true when the file was written.
 */
export declare function writeSelected(config: Partial<SoftwareToolsConfig>, ids: string[]): boolean;
/** The text injected for one tool: `compact` in compact mode (when present), else `usage`. */
export declare function injectedText(tool: SoftwareTool, mode: RenderMode): string;
/**
 * The injected section: one line per checked tool.
 *
 * `mode` selects the per-entry field — `usage` for `full`, `compact` for
 * `compact` — and an entry without `compact` falls back to `usage` in either
 * mode, so partial adoption is safe. `config.compact === undefined` is not the
 * only way to shrink it: the caller decides the mode.
 */
export declare function renderSection(config: Partial<SoftwareToolsConfig>, ids: string[], mode?: RenderMode): string;
/** Endpoint failure in the shape the browser validates. */
export interface MutationFailure {
    ok: false;
    error: {
        code: string;
        message: string;
    };
}
export interface AddToolResult {
    ok: true;
    /** The written row, in merged-catalog form. */
    tool: CatalogEntry;
    /** True when an existing user entry (or a built-in) with this id was replaced. */
    overwritten: boolean;
}
export interface RemoveToolResult {
    ok: true;
    id: string;
    /** True when the removed id was also unchecked in selection.json. */
    selectionUpdated: boolean;
    /** True when a built-in with this id becomes visible again. */
    fallbackToBuiltin: boolean;
}
export type AddResult = AddToolResult | MutationFailure;
export type RemoveResult = RemoveToolResult | MutationFailure;
/** Derive a JSON/selection-safe id from a display name (ascii-only; may be "tool"). */
export declare function slugify(name: string): string;
/** `base`, else `base-2`, `base-3`, … — the first id not in `taken`. */
export declare function dedupeId(base: string, taken: Set<string>): string;
/**
 * Add (or, with `overwrite: true`, replace) one user entry.
 *
 * - no `id` → slugified from `name` and de-duplicated (`tool`, `tool-2`, …);
 * - explicit `id` already in the merged catalog → refused unless
 *   `overwrite: true` (a built-in id turns the entry into an override);
 * - writes `catalog.json` after a backup, through an atomic rename.
 */
export declare function addTool(config: Partial<SoftwareToolsConfig>, input: unknown): AddResult;
/**
 * Remove one user entry and drop its id from the selection.
 *
 * Built-in-only ids are refused (`builtin-readonly`): only `catalog.json` rows
 * are deletable. Removing an override reveals the built-in version again.
 */
export declare function removeTool(config: Partial<SoftwareToolsConfig>, input: unknown): RemoveResult;
