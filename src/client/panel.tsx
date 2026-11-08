/**
 * SoftwareToolsPanel — the `main`-slot occupant (the centre panel the layout
 * renders while this panel is selected) plus SoftwareToolsGlyph, the
 * `sidebar.panellist` rail entry that selects it.
 *
 * Lists the curated catalog grouped by category, each row a compact
 * "name + one-line description + checkbox". Toggling writes the whole
 * selection through the loopback RPC channel; the host re-injects the selected
 * tools into the model's system prompt on the next request.
 *
 * The same panel is the inventory's editor: a user entry can be deleted
 * (inline confirmation; built-in rows are read-only), and the footer's
 * 「新增条目」 form adds one through the host's validated `add` endpoint
 * (catalog.json + backup + atomic rename on the host side).
 */
import { useEffect, useState } from 'react'
import type {
  AddPayload,
  AddValue,
  CallFn,
  ListPayload,
  RemoveValue,
  RpcEnvelope,
  SetPayload,
  SoftwareTool,
} from './context-types.ts'
import { css } from './styles.ts'

export interface PanelProps {
  call: CallFn
  t: (key: string) => string
  close: () => void
}

interface Loaded {
  catalog: SoftwareTool[]
  categoryLabels: Record<string, string>
  selected: string[]
  section: string
  catalogError?: string
  catalogWarnings?: string[]
}

const EMPTY_DRAFT: AddPayload = { name: '', desc: '', usage: '', category: 'misc' }

/** Host error codes → panel dictionary keys. */
const ERROR_KEYS: Record<string, string> = {
  'id-conflict': 'errIdConflict',
  'builtin-readonly': 'errBuiltinReadonly',
  'unknown-id': 'errUnknownId',
  'catalog-unreadable': 'errCatalogUnreadable',
  'catalog-invalid': 'errCatalogInvalid',
  'bad-request': 'errBadRequest',
  'gateway/bad-request': 'errBadRequest',
}

function envelope<T>(raw: unknown): RpcEnvelope<T> {
  return (raw ?? {}) as RpcEnvelope<T>
}

/** Localized text for a failed envelope (falls back to the host message). */
function errorText(res: RpcEnvelope<unknown>, t: (key: string) => string): string {
  const key = res.error?.code !== undefined ? ERROR_KEYS[res.error.code] : undefined
  if (key !== undefined) return t(key)
  return res.error?.message ?? t('loadFailed')
}

function loadData(call: CallFn): Promise<Loaded> {
  return call('list', {}).then((raw) => {
    const r = envelope<ListPayload>(raw)
    if (!r.ok || r.value === undefined || !Array.isArray(r.value.catalog)) {
      throw new Error(r.error?.message ?? 'load failed')
    }
    return {
      catalog: r.value.catalog,
      categoryLabels: r.value.categoryLabels ?? {},
      selected: Array.isArray(r.value.selected) ? r.value.selected : [],
      section: typeof r.value.section === 'string' ? r.value.section : '',
      ...(typeof r.value.catalogError === 'string' ? { catalogError: r.value.catalogError } : {}),
      ...(Array.isArray(r.value.catalogWarnings) && r.value.catalogWarnings.length > 0
        ? { catalogWarnings: r.value.catalogWarnings.filter((w): w is string => typeof w === 'string') }
        : {}),
    }
  })
}

/**
 * Rail glyph. The sidebar supplies the pixel size it wants for the current
 * column state (18 expanded, 16 collapsed) and owns the button, the label and
 * the tooltip around this node.
 */
export function SoftwareToolsGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.5h2.1M7.4 4.5h6.1M2.5 11.5h6.1M11.4 11.5h2.1" />
      <circle cx="6" cy="4.5" r="1.7" />
      <circle cx="10" cy="11.5" r="1.7" />
    </svg>
  )
}

export function SoftwareToolsPanel({ call, t, close }: PanelProps) {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<AddPayload>(EMPTY_DRAFT)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

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
    setNotice(null)
    try {
      const res = envelope<SetPayload>(await call('set', { ids: next }))
      if (!res.ok) {
        setError(errorText(res, t))
        return
      }
      await refresh()
    } catch {
      setError(t('loadFailed'))
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (busy) return
    const payload: AddPayload = {
      name: draft.name.trim(),
      desc: draft.desc.trim(),
      usage: draft.usage.trim(),
      category: draft.category,
    }
    if (payload.name === '' || payload.desc === '' || payload.usage === '') {
      setError(t('requiredHint'))
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = envelope<AddValue>(await call('add', payload))
      if (!res.ok || res.value === undefined) {
        setError(errorText(res, t))
        return
      }
      setDraft(EMPTY_DRAFT)
      setFormOpen(false)
      setNotice(t('addedWithId').replace('{name}', payload.name).replace('{id}', res.value.id))
      await refresh()
    } catch {
      setError(t('addFailed'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = envelope<RemoveValue>(await call('remove', { id }))
      if (!res.ok) {
        setError(errorText(res, t))
        return
      }
      setPendingDelete(null)
      const extra = res.value?.selectionUpdated === true ? ` · ${t('selectionCleaned')}` : ''
      setNotice(`${t('removed')}${extra}`)
      await refresh()
    } catch {
      setError(t('deleteFailed'))
    } finally {
      setBusy(false)
    }
  }

  const categories = ['all', ...new Set((data?.catalog ?? []).map((entry) => entry.category))]
  const visible =
    data === null ? [] : filter === 'all' ? data.catalog : data.catalog.filter((entry) => entry.category === filter)
  const categoryOptions = Object.keys(data?.categoryLabels ?? {})
  const catalogWarnings = data?.catalogWarnings ?? []
  const readOnlyCatalog = data?.catalogError !== undefined || catalogWarnings.length > 0
  const canSubmit =
    !busy && !readOnlyCatalog && draft.name.trim() !== '' && draft.desc.trim() !== '' && draft.usage.trim() !== ''

  return (
    <div className="dst_panel">
      <div className="dst_head">
        <h2 className="dst_headTitle">{t('panelTitle')}</h2>
        <span className="dst_headHint">{t('panelHint')}</span>
        <span className="dst_count">
          {data !== null ? t('selectHint').replace('{n}', String(data.selected.length)) : ''}
        </span>
        <button type="button" className="dst_close" onClick={close}>
          {t('backToChat')}
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
        {data?.catalogError !== undefined ? <div className="dst_warn">{t('catalogError')}</div> : null}
        {catalogWarnings.length > 0 ? (
          <div className="dst_warn">
            <div>{t('catalogWarnings').replace('{n}', String(catalogWarnings.length))}</div>
            <ul className="dst_warnList">
              {catalogWarnings.map((warning, index) => (
                <li key={`${index}-${warning}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {error !== null ? <div className="dst_error">{error}</div> : null}
        {notice !== null ? <div className="dst_notice">{notice}</div> : null}
        {data !== null && visible.length === 0 ? <div className="dst_empty">{t('empty')}</div> : null}
        {data !== null
          ? visible.map((tool, rowIndex) => {
              const on = data.selected.includes(tool.id)
              const readonly = tool.readonly === true
              const originBadge =
                tool.origin === 'user'
                  ? { cls: 'dst_badgeUser', label: t('userBadge') }
                  : tool.origin === 'override'
                    ? { cls: 'dst_badgeOverride', label: t('overrideBadge') }
                    : tool.origin === 'builtin'
                      ? { cls: 'dst_badge', label: t('builtinBadge') }
                      : null
              return (
                <div key={`${tool.id}-${rowIndex}`} className="dst_tool">
                  <div className="dst_toolText">
                    <div className="dst_toolHeader">
                      <span className="dst_toolName">{tool.name}</span>
                      <span className="dst_toolId" title={`${t('idLabel')}: ${tool.id}`}>
                        {tool.id}
                      </span>
                      {originBadge !== null ? (
                        <span className={originBadge.cls}>{originBadge.label}</span>
                      ) : null}
                      <span className="dst_badge">{data.categoryLabels[tool.category] ?? tool.category}</span>
                    </div>
                    <div className="dst_toolDesc">{tool.desc}</div>
                    <details className="dst_usage">
                      <summary>{t('usageLabel')}</summary>
                      {tool.usage}
                    </details>
                  </div>
                  <div className="dst_toolActions">
                    {readonly || readOnlyCatalog ? (
                      <button type="button" className="dst_del" disabled title={t('readonlyHint')}>
                        {t('delete')}
                      </button>
                    ) : pendingDelete === tool.id ? (
                      <>
                        <button
                          type="button"
                          className="dst_del dst_delConfirm"
                          disabled={busy}
                          onClick={() => {
                            void remove(tool.id)
                          }}
                        >
                          {t('confirmDelete')}
                        </button>
                        <button
                          type="button"
                          className="dst_del"
                          disabled={busy}
                          onClick={() => setPendingDelete(null)}
                        >
                          {t('cancel')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="dst_del"
                        disabled={busy}
                        onClick={() => {
                          setNotice(null)
                          setError(null)
                          setPendingDelete(tool.id)
                        }}
                      >
                        {t('delete')}
                      </button>
                    )}
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

      {formOpen ? (
        <div className="dst_form">
          <div className="dst_formTitle">{t('addTitle')}</div>
          <div className="dst_formHint">{t('addHint')}</div>
          <div className="dst_formGrid">
            <label className="dst_field">
              <span>{t('fieldName')}</span>
              <input
                className="dst_input"
                value={draft.name}
                maxLength={200}
                placeholder={t('fieldNamePh')}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label className="dst_field">
              <span>{t('fieldCategory')}</span>
              <select
                className="dst_input"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              >
                {(categoryOptions.length > 0 ? categoryOptions : ['misc']).map((c) => (
                  <option key={c} value={c}>
                    {data?.categoryLabels[c] ?? c}
                  </option>
                ))}
              </select>
            </label>
            <label className="dst_field dst_fieldWide">
              <span>{t('fieldDesc')}</span>
              <input
                className="dst_input"
                value={draft.desc}
                maxLength={1000}
                placeholder={t('fieldDescPh')}
                onChange={(event) => setDraft({ ...draft, desc: event.target.value })}
              />
            </label>
            <label className="dst_field dst_fieldWide">
              <span>{t('fieldUsage')}</span>
              <textarea
                className="dst_input"
                value={draft.usage}
                maxLength={2000}
                rows={4}
                placeholder={t('fieldUsagePh')}
                onChange={(event) => setDraft({ ...draft, usage: event.target.value })}
              />
            </label>
          </div>
          <div className="dst_formActions">
            <button
              type="button"
              className="dst_footBtn"
              disabled={busy}
              onClick={() => {
                setFormOpen(false)
                setDraft(EMPTY_DRAFT)
                setError(null)
              }}
            >
              {t('cancel')}
            </button>
            <button type="button" className="dst_footBtn dst_footBtnPrimary" disabled={!canSubmit} onClick={() => void submit()}>
              {t('save')}
            </button>
          </div>
        </div>
      ) : null}

      {data !== null && data.section !== '' ? (
        <details className="dst_section">
          <summary>{t('sectionLabel')}</summary>
          <pre className="dst_sectionPre">{data.section}</pre>
        </details>
      ) : null}

      <div className="dst_foot">
        <button
          type="button"
          className="dst_footBtn dst_footBtnPrimary"
          disabled={readOnlyCatalog}
          onClick={() => {
            setError(null)
            setNotice(null)
            setFormOpen((open) => !open)
          }}
        >
          {t('addEntry')}
        </button>
        <button type="button" className="dst_footBtn" onClick={refresh}>
          {t('refresh')}
        </button>
      </div>
    </div>
  )
}

// ensure the stylesheet is installed once
let styleInstalled = false
export function ensureStyles() {
  if (styleInstalled) return
  styleInstalled = true
  const el = document.createElement('style')
  el.setAttribute('data-plugin', 'dsh-software-tools')
  el.textContent = css
  document.head.appendChild(el)
}
