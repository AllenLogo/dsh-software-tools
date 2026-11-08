import { mountChannel } from './channel-route.js';
import { CATEGORY_LABELS, addTool, mergedCatalog, readSelected, removeTool, renderSection, writeSelected, } from './catalog.js';
export { CATALOG, CATEGORY_LABELS } from './catalog.js';
export const name = 'dsh-software-tools';
export const inject = ['systemPrompt'];
export const CHANNEL = '/_dsh-software-tools';
export const SECTION_NAME = 'software-tools';
/** Tool guidance sections conventionally live at 100–199; 200 lands after them. */
export const SECTION_ORDER = 200;
/** Failure in the `{ ok:false, error }` shape the browser validates. */
function failure(code, message) {
    return { ok: false, error: { code, message, details: {} } };
}
export function apply(ctx, config = {}) {
    // 1) Prompt section: evaluated at every assembly, so a selection change is
    //    visible on the model's very next request without any restart.
    ctx.effect(() => ctx.systemPrompt.section({
        name: SECTION_NAME,
        order: SECTION_ORDER,
        text: () => renderSection(config, readSelected(config)),
    }), 'dsh-software-tools: system prompt section');
    // 2) Fenced RPC channel for the browser panel (list / set / add / remove).
    //    The browser half speaks the Connection envelope, so handlers return the
    //    `{ok:true, value}` / `{ok:false, error}` pair it validates.
    ctx.inject(['connection', 'webServer'], (hostCtx) => {
        const host = hostCtx;
        hostCtx.effect(() => {
            const handler = async (endpoint, payload) => {
                if (endpoint === 'list') {
                    const merged = mergedCatalog(config);
                    const selected = readSelected(config);
                    return {
                        ok: true,
                        value: {
                            catalog: merged.entries,
                            categoryLabels: CATEGORY_LABELS,
                            selected,
                            section: renderSection(config, selected),
                            ...(merged.error !== undefined ? { catalogError: merged.error } : {}),
                            ...(merged.warnings.length > 0 ? { catalogWarnings: merged.warnings } : {}),
                        },
                    };
                }
                if (endpoint === 'set') {
                    const ids = payload?.ids;
                    if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
                        return failure('bad-request', 'ids must be an array of strings');
                    }
                    const known = new Set(mergedCatalog(config).entries.map((entry) => entry.id));
                    const unknown = ids.filter((id) => !known.has(id));
                    if (unknown.length > 0) {
                        return failure('bad-request', `unknown tool ids: ${unknown.join(', ')}`);
                    }
                    writeSelected(config, ids);
                    return { ok: true, value: { selected: ids } };
                }
                if (endpoint === 'add') {
                    const result = addTool(config, payload);
                    if (!result.ok)
                        return failure(result.error.code, result.error.message);
                    return {
                        ok: true,
                        value: {
                            id: result.tool.id,
                            origin: result.tool.origin,
                            overwritten: result.overwritten,
                        },
                    };
                }
                if (endpoint === 'remove') {
                    const result = removeTool(config, payload);
                    if (!result.ok)
                        return failure(result.error.code, result.error.message);
                    return {
                        ok: true,
                        value: {
                            id: result.id,
                            selectionUpdated: result.selectionUpdated,
                            fallbackToBuiltin: result.fallbackToBuiltin,
                        },
                    };
                }
                return failure('bad-request', `unknown endpoint: ${endpoint}`);
            };
            const unregister = mountChannel({
                channel: CHANNEL,
                connection: host.connection,
                webServer: host.webServer,
                handler,
            });
            return () => {
                unregister();
            };
        }, 'dsh-software-tools: rpc channel');
    });
}
//# sourceMappingURL=index.js.map