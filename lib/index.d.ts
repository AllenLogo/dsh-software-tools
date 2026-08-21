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
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-software-tools";
export declare const inject: string[];
/** Config accepted on the cordis entry (all optional). */
export interface SoftwareToolsConfig {
    /**
     * Directory holding `selection.json` + `catalog.json`.
     * Defaults to `$DSH_HOME/software-tools` (i.e. `~/.dsh/software-tools`).
     */
    settingsDir?: string;
}
export declare const CHANNEL = "/_dsh-software-tools";
export declare const SECTION_NAME = "software-tools";
/** Tool guidance sections conventionally live at 100–199; 200 lands after them. */
export declare const SECTION_ORDER = 200;
/** One entry in the curated inventory. */
export interface SoftwareTool {
    id: string;
    name: string;
    category: 'download' | 'proxy' | 'media' | 'browser' | 'knowledge' | 'runtime' | 'model' | 'misc';
    desc: string;
    usage: string;
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
export declare const CATALOG: SoftwareTool[];
export declare const CATEGORY_LABELS: Record<SoftwareTool['category'], string>;
export declare function apply(ctx: Context, config?: SoftwareToolsConfig): void;
