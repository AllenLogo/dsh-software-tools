/**
 * Serve one Connection RPC channel from a Web route owned by this plugin.
 *
 * Why this exists instead of `ctx.connection.rpc.handle(channel, handler)`:
 * on DSH 0.1.5 that registry mounts through
 * `owner.webServer.register(...)` where `owner` is the Connection *service's
 * own* context — the one whose inject map holds only `credentials`. Service
 * property access is inject-gated in cordis 4, so the call throws
 * `cannot get property "webServer" without inject`; raised inside the
 * `ctx.inject()` child fiber this plugin needs, that error only fails the child
 * fiber: the plugin entry still reports `active` and the channel is silently
 * absent (the browser panel then shows 加载失败 with nothing in the journal).
 * Passing `webServer` in the caller's inject list does not help — the gated
 * context is the service's, not the caller's.
 *
 * So this module mounts the route itself and reuses the two public pieces the
 * framework provides for exactly that:
 *   - `webServer.register({ kind: 'prefix', path, handler })` — a
 *     feature-owned Web route;
 *   - `connection.requestRejection(req)` — "Apply Connection's Host/Origin
 *     checks and browser authentication to another Web route": the same fence
 *     `/api` uses (trusted Host/Origin authority plus the browser session
 *     cookie), applied before a single request byte is decoded.
 *
 * The wire format is the one the browser half already speaks, so nothing on
 * the client side changes:
 *   request  `{ type: 'client-request', rpcId, method, payload }`
 *   response `{ type: 'server-response', rpcId, result }`
 * with `result` the `{ ok: true, value }` / `{ ok: false, error }` pair the
 * client validates. Status codes mirror the framework's own channel route:
 * non-POST or unknown endpoint 404, non-JSON content type 415, unparseable
 * body 400, a throwing handler 500.
 *
 * (Sibling copy of the helper inlined in dsh-restart-button's src/index.ts —
 * both plugins are local, standalone packages with no shared build.)
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** One endpoint failure, mirroring the Connection RPC failure shape. */
export interface RpcFailure {
    code: string;
    message: string;
    details: Record<string, unknown>;
}
/** The `{ ok, value }` / `{ ok: false, error }` pair the browser validates. */
export type RpcResult = {
    ok: true;
    value: Record<string, unknown>;
} | {
    ok: false;
    error: RpcFailure;
};
/** Endpoint handler contract shared by every transport arrangement. */
export type EndpointHandler = (endpoint: string, payload: unknown) => Promise<RpcResult>;
/** One named Web route, as `webServer.register` accepts it. */
export interface WebRouteLike {
    kind: 'exact' | 'prefix';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
}
/** Structural surface of the web server this module consumes. */
export interface WebServerLike {
    register(route: WebRouteLike): () => void;
}
/** Structural surface of the Connection fence this module consumes. */
export interface ConnectionLike {
    requestRejection(request: {
        headers: IncomingMessage['headers'];
    }): 401 | 403 | undefined;
}
/**
 * Mount `channel` on the web server and return its disposer.
 * @param options - channel path, the two services, and the endpoint handler.
 * @returns disposer removing the route.
 */
export declare function mountChannel(options: {
    channel: string;
    connection: ConnectionLike;
    webServer: WebServerLike;
    handler: EndpointHandler;
}): () => void;
