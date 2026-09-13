/** Request bodies here are small commands; anything larger is rejected. */
const MAX_BODY_BYTES = 64 * 1024;
const JSON_CONTENT_TYPE = 'application/json';
/** Write one JSON envelope response. */
function respond(res, status, body) {
    res.writeHead(status, { 'content-type': JSON_CONTENT_TYPE, 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
}
/** Read a bounded JSON request body. */
async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = chunk;
        size += buffer.length;
        if (size > MAX_BODY_BYTES)
            throw new Error('request body too large');
        chunks.push(buffer);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
/** Channel-relative endpoint, mirroring the Connection route grammar. */
function endpointOf(channel, pathname) {
    if (!pathname.startsWith(`${channel}/`))
        return undefined;
    const endpoint = pathname.slice(channel.length + 1);
    const segments = endpoint.split('/');
    if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'))
        return undefined;
    if (segments.some((segment) => !/^[A-Za-z0-9_$.-]+$/.test(segment)))
        return undefined;
    return endpoint;
}
/**
 * Mount `channel` on the web server and return its disposer.
 * @param options - channel path, the two services, and the endpoint handler.
 * @returns disposer removing the route.
 */
export function mountChannel(options) {
    const { channel, connection, webServer, handler } = options;
    const route = {
        kind: 'prefix',
        path: channel,
        handler: async (req, res) => {
            const rejection = connection.requestRejection(req);
            if (rejection !== undefined) {
                res.writeHead(rejection);
                res.end(rejection === 401 ? 'unauthorized' : 'forbidden');
                return;
            }
            const endpoint = endpointOf(channel, new URL(req.url ?? '/', 'http://dsh.invalid').pathname);
            if (req.method !== 'POST' || endpoint === undefined) {
                res.writeHead(404);
                res.end('not found');
                return;
            }
            if ((req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase() !== JSON_CONTENT_TYPE) {
                res.writeHead(415);
                res.end('content type must be application/json');
                return;
            }
            let body;
            try {
                body = await readJson(req);
            }
            catch {
                res.writeHead(400);
                res.end('body is not JSON');
                return;
            }
            const envelope = body;
            if (typeof envelope !== 'object' ||
                envelope === null ||
                envelope.type !== 'client-request' ||
                typeof envelope.rpcId !== 'string' ||
                typeof envelope.method !== 'string') {
                respond(res, 200, {
                    type: 'server-response',
                    rpcId: 'invalid-request',
                    result: {
                        ok: false,
                        error: { code: 'gateway/bad-request', message: 'invalid client-request message', details: {} },
                    },
                });
                return;
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
                });
                return;
            }
            try {
                const result = await handler(endpoint, envelope.payload);
                respond(res, 200, { type: 'server-response', rpcId: envelope.rpcId, result });
            }
            catch (error) {
                res.writeHead(500);
                res.end(`handler failure: ${String(error)}`);
            }
        },
    };
    return webServer.register(route);
}
//# sourceMappingURL=channel-route.js.map