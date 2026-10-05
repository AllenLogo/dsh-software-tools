/** DSH client contracts consumed by the browser half. */
// Client plugins type their context as cordis' Context, augmented by the client
// packages they inject (official pattern, cf. dsh-client-ui-settings-general);
// `@deepseek-ai/dsh-client-runtime` no longer ships a client line at all.
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Declares the `main` (keyed) and `sidebar.panellist` (list) seats this plugin
// registers into; the renderer's client half declares `ctx.slots` itself.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { zh } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'software-tools': keyof typeof zh
  }
}

export interface SoftwareTool {
  id: string
  name: string
  category: string
  desc: string
  usage: string
}

/** RPC result envelope-inner shape the client validates against. */
export interface RpcEnvelope<T> {
  ok: boolean
  value?: T
  error?: { code?: string; message?: string }
}

export interface ListPayload {
  catalog: SoftwareTool[]
  categoryLabels: Record<string, string>
  selected: string[]
  section: string
}

export interface SetPayload {
  selected: string[]
}

/** One channel call: the transport face of the Connection client service. */
export type CallFn = (endpoint: string, payload?: unknown) => Promise<unknown>

/** The Connection client service, narrowed to the one member this half uses. */
export interface ConnectionLike {
  rpc: {
    call: (channel: string, endpoint: string, payload?: unknown) => Promise<unknown>
  }
}

export type Context = ClientContext
