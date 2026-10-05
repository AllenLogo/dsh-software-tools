/**
 * dsh-software-tools — client half.
 *
 * Contributes two native slot entries instead of injecting DOM into the shell:
 *
 *  - `sidebar.panellist` (list): the rail row. Its `id` IS the panel id and its
 *    `label` is a thunk, so the sidebar resolves the localized title per read and
 *    owns the button, tooltip and collapsed-state handling.
 *  - `main` (keyed, key = PANEL_ID): the panel body the layout renders in the
 *    centre while this panel is selected. The rail row's click already drives
 *    `ctx.layout.selectPanel(PANEL_ID)`, so the two entries are linked by the
 *    shared id alone — no observer, no host element, no overlay.
 *
 * Both registrations wait on `ctx.slots.inject(key, ...)`: `main` is declared by
 * ui-layout and `sidebar.panellist` by ui-sidebar, and registering into an
 * undeclared slot throws at load time (fail-loud boot-order check).
 *
 * The panel's business face travels through the register `inject` factory, so
 * the component consumes exactly `{ call, t, close }` and nothing else.
 */
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client';
import type { Context } from './context-types.ts';
export declare const name = "dsh-software-tools-client";
export declare const inject: string[];
export declare const NS = "software-tools";
export declare const CHANNEL = "/_dsh-software-tools";
/** Identity shared by the rail row and its main-slot occupant. */
export declare const PANEL_ID: MainPanelId;
/** Rail order: after the shipped panel entries, before the settings foot. */
export declare const PANEL_ORDER = 20;
export declare function apply(ctx: Context): void;
