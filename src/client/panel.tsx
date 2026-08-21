/**
 * SoftwareToolsPanel — the sidebar 【软件工具】overlay.
 *
 * Lists the curated catalog grouped by category, each row a compact
 * "name + one-line description + checkbox". Toggling writes the whole
 * selection through the loopback RPC channel; the host re-injects the
 * selected tools into the model's system prompt on the next request.
 */
import { useEffect, useState } from 'react'
import type { ListPayload, RpcEnvelope, SoftwareTool } from './context-types.ts'
import { css } from './styles.ts'

export interface PanelProps {
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  t: (k: string) => string
  onClose: () => void
}

interface Loaded {
  catalog: SoftwareTool[]
  categoryLabels: Record<string, string>
  selected: string[]
  section: string
}

function loadData(call: PanelProps['call']): Promise<Loaded> {
  return call('list', {}).then((raw) => {
    const r = (raw ?? {}) as RpcEnvelope<ListPayload>
    if (!r.ok || r.value === undefined || !Array.isArray(r.value.catalog)) {
      throw new Error(r.error?.message ?? 'load failed')
    }
    return {
      catalog: r.value.catalog,
      categoryLabels: r.value.categoryLabels ?? {},
      selected: Array.isArray(r.value.selected) ? r.value.selected : [],
      section: typeof r.value.section === 'string' ? r.value.section : '',
    }
  })
}

export function SoftwareToolsPanel({ call, t, onClose }: PanelProps) {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const refresh = () => {
    setError(null)
    loadData(call).then(setData).catch(() => setError(t('loadFailed')))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = async (id: string) => {
    if (data === null || busy) return
    const next = data.selected.includes(id)
      ? data.selected.filter((x) => x !== id)
      : [...data.selected, id]
    setBusy(true)
    try {
      await call('set', { ids: next })
      await refresh()
    } catch {
      setError(t('loadFailed'))
    } finally {
      setBusy(false)
    }
  }

  const categories = ['all', ...new Set((data?.catalog ?? []).map((t) => t.category))]
  const visible =
    data === null ? [] : filter === 'all' ? data.catalog : data.catalog.filter((t) => t.category === filter)

  return (
    <div
      className="dst_overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dst_card">
        <div className="dst_head">
          <h2 className="dst_headTitle">{t('panelTitle')}</h2>
          <span className="dst_headHint">{t('panelHint')}</span>
          <span className="dst_count">
            {data !== null ? t('selectHint').replace('{n}', String(data.selected.length)) : ''}
          </span>
          <button type="button" className="dst_footBtn" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <div className="dst_tabs">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`dst_tab${filter === c ? ' dst_tabActive' : ''}`}
              onClick={() => setFilter(c)}
            >
              {c === 'all' ? t('category_all') : (data?.categoryLabels[c] ?? c)}
            </button>
          ))}
        </div>

        <div className="dst_body">
          {error !== null ? <div className="dst_error">{error}</div> : null}
          {data !== null && visible.length === 0 ? <div className="dst_empty">{t('empty')}</div> : null}
          {data !== null
            ? visible.map((tool) => {
                const on = data.selected.includes(tool.id)
                return (
                  <div key={tool.id} className="dst_tool">
                    <div className="dst_toolText">
                      <div className="dst_toolHeader">
                        <span className="dst_toolName">{tool.name}</span>
                        <span className="dst_badge">{data.categoryLabels[tool.category] ?? tool.category}</span>
                      </div>
                      <div className="dst_toolDesc">{tool.desc}</div>
                      <details className="dst_usage">
                        <summary>用法</summary>
                        {tool.usage}
                      </details>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      className="dst_switch"
                      disabled={busy}
                      aria-label={tool.name}
                      onClick={() => {
                        void toggle(tool.id)
                      }}
                    >
                      <span className="dst_switchTrack">
                        <span className="dst_switchThumb" />
                      </span>
                    </button>
                  </div>
                )
              })
            : null}
        </div>

        {data !== null && data.section !== '' ? (
          <details className="dst_section">
            <summary>{t('sectionLabel')}</summary>
            <pre className="dst_sectionPre">{data.section}</pre>
          </details>
        ) : null}

        <div className="dst_foot">
          <button type="button" className="dst_footBtn" onClick={refresh}>
            {t('refresh')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ensure the stylesheets are installed once
let styleInstalled = false
export function ensureStyles() {
  if (styleInstalled) return
  styleInstalled = true
  const el = document.createElement('style')
  el.setAttribute('data-plugin', 'dsh-software-tools')
  el.textContent = css
  document.head.appendChild(el)
}
