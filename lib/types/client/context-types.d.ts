/** DSH client contracts consumed by the browser half. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { zh } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'software-tools': keyof typeof zh;
    }
}
export interface SoftwareTool {
    id: string;
    name: string;
    category: string;
    desc: string;
    usage: string;
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
}
export interface SetPayload {
    selected: string[];
}
export interface ConnectionLike {
    isLoopback: boolean;
    rpc: {
        call: (channel: string, endpoint: string, payload?: unknown) => Promise<unknown>;
    };
}
export type Context = ClientContext;
