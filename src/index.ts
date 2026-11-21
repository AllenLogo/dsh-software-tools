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
 *   - `list`   → { catalog, categoryLabels, selected, section, mode,
 *                sectionFull, sectionCompact, catalogError?, catalogWarnings? }
 *                catalog rows carry `origin` (builtin | user | override) and
 *                `readonly` (built-in rows cannot be deleted); `catalogError`
 *                means the file cannot be parsed at all, `catalogWarnings`
 *                lists unusable/duplicate rows that block add/remove.
 *                `section` is the text injected right now (per `mode`);
 *                `sectionFull` / `sectionCompact` are both renderings, so the
 *                panel can show the cost of each without a round trip
 *   - `set`    → { selected }                    persist the checked ids {ids}
 *                or the injection mode {mode}; the other field is preserved
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
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection' // loads ctx.connection augmentation
import type {} from '@deepseek-ai/dsh-system-prompt' // loads ctx.systemPrompt augmentation
import { mountChannel } from './channel-route.js'
import type { ConnectionLike, EndpointHandler, WebServerLike } from './channel-route.js'
import {
  CATALOG,
  CATEGORY_LABELS,
  addTool,
  isRenderMode,
  mergedCatalog,
  readRenderMode,
  readSelected,
  removeTool,
  renderSection,
  writeRenderMode,
  writeSelected,
} from './catalog.js'
import type { RenderMode, SoftwareToolsConfig } from './catalog.js'

export { CATALOG, CATEGORY_LABELS } from './catalog.js'
export type { CatalogEntry, Category, RenderMode, SoftwareTool, SoftwareToolsConfig } from './catalog.js'

export const name = 'dsh-software-tools'
export const inject = ['systemPrompt']

export const CHANNEL = '/_dsh-software-tools'
export const SECTION_NAME = 'software-tools'
/** Tool guidance sections conventionally live at 100–199; 200 lands after them. */
export const SECTION_ORDER = 200

/** Failure in the `{ ok:false, error }` shape the browser validates. */
function failure(code: string, message: string): { ok: false; error: { code: string; message: string; details: Record<string, unknown> } } {
  return { ok: false, error: { code, message, details: {} } }
}

export function apply(ctx: Context, config: SoftwareToolsConfig = {}): void {
  // 1) Prompt section: evaluated at every assembly, so a selection change (or a
  //    mode switch) is visible on the model's very next request without any
  //    restart. The mode is read from selection.json on each assembly.
  ctx.effect(() =>
    ctx.systemPrompt.section({
      name: SECTION_NAME,
      order: SECTION_ORDER,
      text: () => renderSection(config, readSelected(config), readRenderMode(config)),
    }),
    'dsh-software-tools: system prompt section',
  )

  // 2) Fenced RPC channel for the browser panel (list / set / add / remove).
  //    The browser half speaks the Connection envelope, so handlers return the
  //    `{ok:true, value}` / `{ok:false, error}` pair it validates.
  ctx.inject(['connection', 'webServer'], (hostCtx) => {
    const host = hostCtx as unknown as { connection: ConnectionLike; webServer: WebServerLike }
    hostCtx.effect(() => {
      const handler: EndpointHandler = async (endpoint, payload) => {
        if (endpoint === 'list') {
          const merged = mergedCatalog(config)
          const selected = readSelected(config)
          const mode = readRenderMode(config)
          return {
            ok: true,
            value: {
              catalog: merged.entries,
              categoryLabels: CATEGORY_LABELS,
              selected,
              mode,
              section: renderSection(config, selected, mode),
              sectionFull: renderSection(config, selected, 'full'),
              sectionCompact: renderSection(config, selected, 'compact'),
              ...(merged.error !== undefined ? { catalogError: merged.error } : {}),
              ...(merged.warnings.length > 0 ? { catalogWarnings: merged.warnings } : {}),
            },
          }
        }
        if (endpoint === 'set') {
          const body = payload as { ids?: unknown; mode?: unknown } | undefined
          // `set` owns two independent fields: the checked ids and the injection
          // mode. Each is written only when present, so a batch toggle (1.3) and
          // a mode switch never clobber each other.
          const hasIds = body?.ids !== undefined
          const hasMode = body?.mode !== undefined
          if (!hasIds && !hasMode) return failure('bad-request', 'set needs ids or mode')
          if (hasIds) {
            const ids = body?.ids
            if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
              return failure('bad-request', 'ids must be an array of strings')
            }
            const known = new Set(mergedCatalog(config).entries.map((entry) => entry.id))
            const unknown = (ids as string[]).filter((id) => !known.has(id))
            if (unknown.length > 0) {
              return failure('bad-request', `unknown tool ids: ${unknown.join(', ')}`)
            }
          }
          if (hasMode && !isRenderMode(body?.mode)) {
            return failure('bad-request', 'mode must be "full" or "compact"')
          }
          if (hasIds) writeSelected(config, body?.ids as string[])
          if (hasMode) writeRenderMode(config, body?.mode as RenderMode)
          return {
            ok: true,
            value: { selected: readSelected(config), mode: readRenderMode(config) },
          }
        }
        if (endpoint === 'add') {
          const result = addTool(config, payload)
          if (!result.ok) return failure(result.error.code, result.error.message)
          return {
            ok: true,
            value: {
              id: result.tool.id,
              origin: result.tool.origin,
              overwritten: result.overwritten,
            },
          }
        }
        if (endpoint === 'remove') {
          const result = removeTool(config, payload)
          if (!result.ok) return failure(result.error.code, result.error.message)
          return {
            ok: true,
            value: {
              id: result.id,
              selectionUpdated: result.selectionUpdated,
              fallbackToBuiltin: result.fallbackToBuiltin,
            },
          }
        }
        return failure('bad-request', `unknown endpoint: ${endpoint}`)
      }
      const unregister = mountChannel({
        channel: CHANNEL,
        connection: host.connection,
        webServer: host.webServer,
        handler,
      })
      return () => {
        unregister()
      }
    }, 'dsh-software-tools: rpc channel')
  })
}
