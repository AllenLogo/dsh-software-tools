/** DSH client contracts consumed by the browser half. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { zh } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'software-tools': keyof typeof zh;
    }
}
/** Where a merged catalog row comes from (host-computed). */
export type ToolOrigin = 'builtin' | 'user' | 'override';
export interface SoftwareTool {
    id: string;
    name: string;
    category: string;
    desc: string;
    usage: string;
    /** Present on `list` rows: builtin | user | override. */
    origin?: ToolOrigin;
    /** Present on `list` rows: true for built-in rows (no delete). */
    readonly?: boolean;
}
/** RPC result envelope-inner shape the client validates against. */
export interface RpcEnvelope<T> {
    ok: boolean;
    value?: T;
    error?: {
        code?: string;
        message?: string;
    };
}
export interface ListPayload {
    catalog: SoftwareTool[];
    categoryLabels: Record<string, string>;
    selected: string[];
    section: string;
    /** Set when the user catalog exists but cannot be parsed at all. */
    catalogError?: string;
    /** Non-fatal catalog problems (unusable rows, duplicate ids); editing is blocked while non-empty. */
    catalogWarnings?: string[];
}
export interface SetPayload {
    selected: string[];
}
/** `add` payload: the panel form fields (id is derived by the host). */
export interface AddPayload {
    name: string;
    desc: string;
    usage: string;
    category: string;
}
export interface AddValue {
    id: string;
    origin: ToolOrigin;
    overwritten: boolean;
}
export interface RemoveValue {
    id: string;
    selectionUpdated: boolean;
    fallbackToBuiltin: boolean;
}
/** One channel call: the transport face of the Connection client service. */
export type CallFn = (endpoint: string, payload?: unknown) => Promise<unknown>;
/** The Connection client service, narrowed to the one member this half uses. */
export interface ConnectionLike {
    rpc: {
        call: (channel: string, endpoint: string, payload?: unknown) => Promise<unknown>;
    };
}
export type Context = ClientContext;
