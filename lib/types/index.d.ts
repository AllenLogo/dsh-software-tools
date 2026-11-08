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
 * State and catalog are served over a fenced RPC channel `/_dsh-software-tools`:
 *   - `list`   → { catalog, categoryLabels, selected, section, catalogError?, catalogWarnings? }
 *                catalog rows carry `origin` (builtin | user | override) and
 *                `readonly` (built-in rows cannot be deleted); `catalogError`
 *                means the file cannot be parsed at all, `catalogWarnings`
 *                lists unusable/duplicate rows that block add/remove
 *   - `set`    → { selected }                    persist the checked ids {ids}
 *   - `add`    → { id, origin, overwritten }     { name, desc, usage, category, id?, overwrite? }
 *   - `remove` → { id, selectionUpdated, fallbackToBuiltin }   { id }
 *
 * `add`/`remove` write the user catalog (`catalog.json`) and, for `remove`, also
 * drop the id from `selection.json`. Both back up the file they rewrite
 * (`.bak.<YYYYMMDD-HHMMSS>`) and write atomically — see src/catalog.ts, which
 * also holds the merge/validation logic so it can be tested without a host.
 *
 * The channel is mounted through src/channel-route.ts rather than
 * `ctx.connection.rpc.handle()`: that registry cannot work from a plugin -- it
 * reads `webServer` off the Connection service's own inject-gated context -- and
 * the throw only fails the `ctx.inject()` child fiber, leaving the channel
 * silently absent (the browser panel then shows 加载失败). Re-verified on DSH
 * 0.2.2-rc.1: with `ctx.inject(['connection'], ...)` the mount produces no route
 * at all (`POST /_dsh-software-tools/list` answered by the static fallback as 405
 * instead of by the Connection fence as 401), exactly as documented in
 * src/channel-route.ts. Adding `webServer` to the caller's inject list does not
 * help either: cordis resolves the service's `ctx` through the *service's* fiber
 * (ReflectService handler -> `ctx[symbols.shadow].fiber`), not the caller's. See
 * that file for the details.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SoftwareToolsConfig } from './catalog.js';
export { CATALOG, CATEGORY_LABELS } from './catalog.js';
export type { CatalogEntry, Category, SoftwareTool, SoftwareToolsConfig } from './catalog.js';
export declare const name = "dsh-software-tools";
export declare const inject: string[];
export declare const CHANNEL = "/_dsh-software-tools";
export declare const SECTION_NAME = "software-tools";
/** Tool guidance sections conventionally live at 100–199; 200 lands after them. */
export declare const SECTION_ORDER = 200;
export declare function apply(ctx: Context, config?: SoftwareToolsConfig): void;
