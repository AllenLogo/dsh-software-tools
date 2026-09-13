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
import type { IncomingMessage, ServerResponse } from 'node:http'

/** One endpoint failure, mirroring the Connection RPC failure shape. */
export interface RpcFailure {
  code: string
  message: string
  details: Record<string, unknown>
}

/** The `{ ok, value }` / `{ ok: false, error }` pair the browser validates. */
export type RpcResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: RpcFailure }

/** Endpoint handler contract shared by every transport arrangement. */
export type EndpointHandler = (endpoint: string, payload: unknown) => Promise<RpcResult>

/** One named Web route, as `webServer.register` accepts it. */
export interface WebRouteLike {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}

/** Structural surface of the web server this module consumes. */
export interface WebServerLike {
  register(route: WebRouteLike): () => void
}

/** Structural surface of the Connection fence this module consumes. */
export interface ConnectionLike {
  requestRejection(request: { headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** Request bodies here are small commands; anything larger is rejected. */
const MAX_BODY_BYTES = 64 * 1024
const JSON_CONTENT_TYPE = 'application/json'

/** Write one JSON envelope response. */
function respond(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': JSON_CONTENT_TYPE, 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** Read a bounded JSON request body. */
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** Channel-relative endpoint, mirroring the Connection route grammar. */
function endpointOf(channel: string, pathname: string): string | undefined {
  if (!pathname.startsWith(`${channel}/`)) return undefined
  const endpoint = pathname.slice(channel.length + 1)
  const segments = endpoint.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return undefined
  if (segments.some((segment) => !/^[A-Za-z0-9_$.-]+$/.test(segment))) return undefined
  return endpoint
}

/**
 * Mount `channel` on the web server and return its disposer.
 * @param options - channel path, the two services, and the endpoint handler.
 * @returns disposer removing the route.
 */
export function mountChannel(options: {
  channel: string
  connection: ConnectionLike
  webServer: WebServerLike
  handler: EndpointHandler
}): () => void {
  const { channel, connection, webServer, handler } = options
  const route: WebRouteLike = {
    kind: 'prefix',
    path: channel,
    handler: async (req, res) => {
      const rejection = connection.requestRejection(req)
      if (rejection !== undefined) {
        res.writeHead(rejection)
        res.end(rejection === 401 ? 'unauthorized' : 'forbidden')
        return
      }
      const endpoint = endpointOf(channel, new URL(req.url ?? '/', 'http://dsh.invalid').pathname)
      if (req.method !== 'POST' || endpoint === undefined) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      if ((req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase() !== JSON_CONTENT_TYPE) {
        res.writeHead(415)
        res.end('content type must be application/json')
        return
      }
      let body: unknown
      try {
        body = await readJson(req)
      } catch {
        res.writeHead(400)
        res.end('body is not JSON')
        return
      }
      const envelope = body as { type?: unknown; rpcId?: unknown; method?: unknown; payload?: unknown }
      if (
        typeof envelope !== 'object' ||
        envelope === null ||
        envelope.type !== 'client-request' ||
        typeof envelope.rpcId !== 'string' ||
        typeof envelope.method !== 'string'
      ) {
        respond(res, 200, {
          type: 'server-response',
          rpcId: 'invalid-request',
          result: {
            ok: false,
            error: { code: 'gateway/bad-request', message: 'invalid client-request message', details: {} },
          },
        })
        return
      }
      if (envelope.method !== endpoint) {
        respond(res, 200, {
          type: 'server-response',
          rpcId: envelope.rpcId,
          result: {
            ok: false,
            error: {
              code: 'gateway/bad-request',
              message: `method ${JSON.stringify(envelope.method)} does not match endpoint ${JSON.stringify(endpoint)}`,
              details: {},
            },
          },
        })
        return
      }
      try {
        const result = await handler(endpoint, envelope.payload)
        respond(res, 200, { type: 'server-response', rpcId: envelope.rpcId, result })
      } catch (error) {
        res.writeHead(500)
        res.end(`handler failure: ${String(error)}`)
      }
    },
  }
  return webServer.register(route)
}
