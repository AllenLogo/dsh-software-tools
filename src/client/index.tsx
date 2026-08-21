/**
 * dsh-software-tools — client half.
 *
 * Injects a 【软件工具】entry into the sidebar (DOM-injection pattern shared by
 * the linxin666 family: the official `sidebar` slot replaces the whole
 * column, so external plugins append a nav button after the New Session
 * row). Clicking opens an overlay panel listing the curated tool inventory
 * with checkboxes; toggles persist through the loopback RPC channel and the
 * host injects the checked set into the model's system prompt.
 */
import { createRoot, type Root } from 'react-dom/client'
import type { ConnectionLike, Context } from './context-types.ts'
import { en, zh } from './locales.ts'
import { ensureStyles, SoftwareToolsPanel } from './panel.tsx'
import { entryCss } from './styles.ts'

export const name = 'dsh-software-tools-client'
export const inject = ['slots', 'locale', 'connection']
export const NS = 'software-tools'
export const CHANNEL = '/_dsh-software-tools'

const ENTRY_ID = 'dst-sidebar-entry'
const PANEL_ID = 'dst-panel-root'

/** Find the sidebar shell root (mirrors linxin666's proven selectors). */
function sidebarRoot(): HTMLElement | undefined {
  const column = document.querySelector<HTMLElement>(
    '[data-pane="sidebar"], [class*="sidebarCol"]',
  )
  if (column === null) return undefined
  return column.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement ?? column.firstElementChild as HTMLElement | undefined
}

function newSessionButton(root: HTMLElement): HTMLButtonElement | undefined {
  const nested = root.querySelector<HTMLButtonElement>('button[class*="newSession"]')
  if (nested !== null) return nested
  for (const child of Array.from(root.children)) {
    if (child.tagName === 'BUTTON') return child as HTMLButtonElement
  }
  return undefined
}

function buildEntry(label: string, onToggle: () => void): HTMLButtonElement {
  const entry = document.createElement('button')
  entry.type = 'button'
  entry.id = ENTRY_ID
  entry.setAttribute('data-dsh-plugin', 'dsh-software-tools')
  entry.setAttribute('data-dsh-part', 'sidebar-entry')
  entry.setAttribute('aria-label', label)
  entry.setAttribute('title', label)
  entry.innerHTML =
    '<span style="flex:none;display:inline-flex;justify-content:center;align-items:center">🔧</span>' +
    '<span>' + label + '</span>'
  entry.addEventListener('click', onToggle)
  return entry
}

function insertEntry(root: HTMLElement, entry: HTMLButtonElement): boolean {
  const button = newSessionButton(root)
  if (button === undefined) return false
  if (entry.parentElement === root) return true
  const row = button.closest('[class*="logoRow"]')
  const base: HTMLElement = row instanceof HTMLElement && row.parentElement === root ? row : button
  const family = Array.from(root.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el.matches('[data-dsh-part="sidebar-entry"]'),
  )
  const anchor = family.length > 0 ? family[family.length - 1].nextSibling : base.nextSibling
  root.insertBefore(entry, anchor)
  return true
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-software-tools: dictionaries')
  ensureStyles()
  // sidebar entry stylesheet (separate tag so the entry matches the family)
  const entryStyle = document.createElement('style')
  entryStyle.setAttribute('data-plugin', 'dsh-software-tools')
  entryStyle.setAttribute('data-part', 'sidebar-entry')
  entryStyle.textContent = entryCss
  document.head.appendChild(entryStyle)

  const t = ctx.locale.bind(NS)
  const connection = ctx.get('connection') as ConnectionLike
  const call = (endpoint: string, payload?: unknown): Promise<unknown> =>
    connection.rpc.call(CHANNEL, endpoint, payload)

  let rootRef: Root | null = null
  let panelHost: HTMLDivElement | null = null

  const closePanel = () => {
    rootRef?.unmount()
    rootRef = null
    if (panelHost !== null) {
      panelHost.remove()
      panelHost = null
    }
  }

  const openPanel = () => {
    if (panelHost === null) {
      panelHost = document.createElement('div')
      panelHost.id = PANEL_ID
      document.body.appendChild(panelHost)
    }
    if (rootRef === null) {
      rootRef = createRoot(panelHost)
    }
    rootRef.render(
      <SoftwareToolsPanel
        call={call}
        t={(k) => t(k as keyof typeof zh)}
        onClose={closePanel}
      />,
    )
  }

  const togglePanel = () => {
    if (panelHost !== null && rootRef !== null) {
      closePanel()
    } else {
      openPanel()
    }
  }

  const tryInsert = (): boolean => {
    const root = sidebarRoot()
    if (root === undefined) return false
    let entry = document.getElementById(ENTRY_ID) as HTMLButtonElement | null
    if (entry === null) {
      entry = buildEntry(t('title'), togglePanel)
    }
    if (entry.parentElement === null && !insertEntry(root, entry)) return false
    return true
  }

  // The sidebar mounts asynchronously; watch and (re)insert until it sticks.
  const observer = new MutationObserver(() => {
    tryInsert()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const fallback = window.setInterval(() => {
    if (tryInsert()) window.clearInterval(fallback)
  }, 1500)
  window.setTimeout(() => window.clearInterval(fallback), 60000)
}
