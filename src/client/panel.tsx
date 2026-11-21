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
 *
 * v0.5 adds the cost controls: a persistent injection budget in the header
 * (chars + estimated tokens), a 精简模式 switch that swaps `usage` for the
 * shorter `compact` field, per-row yellow flags for entries over the row
 * budget, and category-wide check all / clear all as ONE `set` call.
 */
import { useEffect, useMemo, useState } from 'react'
import type {
  AddPayload,
  AddValue,
  CallFn,
  ListPayload,
  RemoveValue,
  RenderMode,
  RpcEnvelope,
  SetPayload,
  SoftwareTool,
} from './context-types.ts'
import { estimateTokens } from './context-types.ts'
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
  mode: RenderMode
  section: string
  sectionFull: string
  sectionCompact: string
  catalogError?: string
  catalogWarnings?: string[]
}

const EMPTY_DRAFT: AddPayload = { name: '', desc: '', usage: '', category: 'misc' }

/**
 * Two budget tiers, both shown in the header (1.2):
 *   - `TARGET` is the v0.5 design target for a full selection. Crossing it means
 *     the section is no longer "cheap", so it is flagged early — without it the
 *     ≤2000 goal was a one-off measurement that any extra entry could break.
 *   - `INJECTION_BUDGET_CHARS` is the hard warning threshold from the task list.
 * The header colour follows the hard tier; the target tier is an amber notice.
 */
const TARGET_CHARS = 2000
const INJECTION_BUDGET_CHARS = 8000
/** Per-row flag (1.2): a single injected line longer than this is marked. */
const ROW_BUDGET_CHARS = 300

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

/** The text a row contributes to the section, matching the host's `injectedText`. */
function rowText(tool: SoftwareTool, mode: RenderMode): string {
  if (mode === 'compact' && typeof tool.compact === 'string' && tool.compact.trim().length > 0) {
    return tool.compact
  }
  return tool.usage
}

/** `- <name>: <text>` — the exact line the host renders, so counts match. */
function rowLine(tool: SoftwareTool, mode: RenderMode): string {
  return `- ${tool.name}: ${rowText(tool, mode)}`
}

/**
 * Format the two-mode cost line: chars AND estimated tokens for each mode, so
 * the switch shows the real saving rather than just a character count.
 */
function costText(
  t: (key: string) => string,
  full: number,
  compact: number,
): string {
  return t('compactCost')
    .replace('{fullChars}', String(full))
    .replace('{fullTokens}', String(estimateTokens(full)))
    .replace('{compactChars}', String(compact))
    .replace('{compactTokens}', String(estimateTokens(compact)))
}

function loadData(call: CallFn): Promise<Loaded> {
  return call('list', {}).then((raw) => {
    const r = envelope<ListPayload>(raw)
    if (!r.ok || r.value === undefined || !Array.isArray(r.value.catalog)) {
      throw new Error(r.error?.message ?? 'load failed')
    }
    const mode: RenderMode = r.value.mode === 'compact' ? 'compact' : 'full'
    const section = typeof r.value.section === 'string' ? r.value.section : ''
    return {
      catalog: r.value.catalog,
      categoryLabels: r.value.categoryLabels ?? {},
      selected: Array.isArray(r.value.selected) ? r.value.selected : [],
      mode,
      section,
      sectionFull: typeof r.value.sectionFull === 'string' ? r.value.sectionFull : section,
      sectionCompact: typeof r.value.sectionCompact === 'string' ? r.value.sectionCompact : section,
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

  /**
   * Persist one `set` call. `ids` and `mode` are independent host fields, so a
   * toggle, a batch selection and a mode switch each send only what they own.
   * The response is applied to local state directly (no extra `list` round
   * trip), which is what keeps the budget counter live on every click.
   */
  const setState = async (patch: { ids?: string[]; mode?: RenderMode }) => {
    if (data === null || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const res = envelope<SetPayload>(await call('set', patch))
      if (!res.ok) {
        setError(errorText(res, t))
        return
      }
      // Re-render the section locally with the same rule the host uses, so the
      // counter and the preview agree immediately even before a refresh.
      const ids = Array.isArray(res.value?.selected) ? res.value.selected : patch.ids ?? data.selected
      const mode: RenderMode = res.value?.mode === 'compact' ? 'compact' : res.value?.mode === 'full' ? 'full' : patch.mode ?? data.mode
      const chosen = ids
        .map((id) => data.catalog.find((entry) => entry.id === id))
        .filter((entry): entry is SoftwareTool => entry !== undefined)
      const sectionFor = (m: RenderMode): string =>
        chosen.length === 0
          ? ''
          : `# 本机可用软件工具(用户已勾选,按需用 bash/shell 调用)\n${chosen.map((entry) => rowLine(entry, m)).join('\n')}`
      setData({
        ...data,
        selected: ids,
        mode,
        section: sectionFor(mode),
        sectionFull: sectionFor('full'),
        sectionCompact: sectionFor('compact'),
      })
    } catch {
      setError(t('loadFailed'))
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string) => {
    if (data === null) return
    const next = data.selected.includes(id) ? data.selected.filter((x) => x !== id) : [...data.selected, id]
    void setState({ ids: next })
  }

  /**
   * Batch toggle for one category (1.3). The whole category is added/removed in
   * ONE `set` call — never one request per row — and the current selection
   * order is preserved for ids that stay checked.
   */
  const setCategory = (category: string, on: boolean) => {
    if (data === null) return
    const inCategory = data.catalog.filter((entry) => entry.category === category).map((entry) => entry.id)
    const inCategorySet = new Set(inCategory)
    const kept = data.selected.filter((id) => !inCategorySet.has(id))
    const next = on ? [...kept, ...inCategory.filter((id) => !data.selected.includes(id))] : kept
    void setState({ ids: next })
  }

  const setMode = (mode: RenderMode) => {
    void setState({ mode })
  }

  const submit = async () => {
    if (busy) return
    const payload: AddPayload = {
      name: draft.name.trim(),
      desc: draft.desc.trim(),
      usage: draft.usage.trim(),
      category: draft.category,
    }
    const compact = (draft.compact ?? '').trim()
    if (compact !== '') payload.compact = compact
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

  // ---- injection budget (1.2) ------------------------------------------------
  const mode: RenderMode = data?.mode ?? 'full'
  // While a row edit is in flight the host's own rendering is authoritative;
  // for the live counter we recompute from the current selection so both modes
  // stay accurate without a round trip.
  const sectionForMode = useMemo(() => {
    if (data === null) return { full: '', compact: '' }
    const chosen = data.selected
      .map((id) => data.catalog.find((entry) => entry.id === id))
      .filter((entry): entry is SoftwareTool => entry !== undefined)
    if (chosen.length === 0) return { full: '', compact: '' }
    const build = (m: RenderMode): string =>
      `# 本机可用软件工具(用户已勾选,按需用 bash/shell 调用)\n${chosen.map((entry) => rowLine(entry, m)).join('\n')}`
    return { full: build('full'), compact: build('compact') }
  }, [data])

  const injectedChars = mode === 'compact' ? sectionForMode.compact.length : sectionForMode.full.length
  const overBudget = injectedChars > INJECTION_BUDGET_CHARS
  const overTarget = injectedChars > TARGET_CHARS
  const longRows = visible.filter((entry) => rowText(entry, mode).length > ROW_BUDGET_CHARS)
  const visibleChecked = visible.filter((entry) => data?.selected.includes(entry.id) === true)
  const categoryCheckedAll = visible.length > 0 && visibleChecked.length === visible.length

  return (
    <div className="dst_panel">
      <div className="dst_head">
        <h2 className="dst_headTitle">{t('panelTitle')}</h2>
        <span className="dst_headHint">{t('panelHint')}</span>
        <span
          className={`dst_budget${overBudget ? ' dst_budgetOver' : overTarget ? ' dst_budgetNear' : ''}`}
          title={
            overBudget
              ? t('budgetOverWarn').replace('{limit}', String(INJECTION_BUDGET_CHARS))
              : overTarget
                ? t('budgetOverTarget').replace('{limit}', String(TARGET_CHARS))
                : undefined
          }
        >
          {t('budgetLabel')
            .replace('{chars}', String(injectedChars))
            .replace('{tokens}', String(estimateTokens(injectedChars)))}
        </span>
        <span className="dst_count">
          {data !== null ? t('selectHint').replace('{n}', String(data.selected.length)) : ''}
        </span>
        <button type="button" className="dst_close" onClick={close}>
          {t('backToChat')}
        </button>
      </div>

      <div className="dst_modeBar">
        <label className="dst_modeToggle" title={t('compactHint')}>
          <input
            type="checkbox"
            checked={mode === 'compact'}
            disabled={busy || data === null}
            onChange={(event) => setMode(event.target.checked ? 'compact' : 'full')}
          />
          <span>{t('compactToggle')}</span>
        </label>
        <span className="dst_modeCost">
          {costText(t, sectionForMode.full.length, sectionForMode.compact.length)}
        </span>
        {overBudget ? (
          <span className="dst_budgetWarn">{t('budgetOverWarn').replace('{limit}', String(INJECTION_BUDGET_CHARS))}</span>
        ) : overTarget ? (
          <span className="dst_budgetWarn">{t('budgetOverTarget').replace('{limit}', String(TARGET_CHARS))}</span>
        ) : null}
        {longRows.length > 0 ? (
          <span className="dst_budgetWarn">
            {t('budgetLongRow').replace('{n}', String(longRows.length)).replace('{limit}', String(ROW_BUDGET_CHARS))}
          </span>
        ) : null}
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
        {filter !== 'all' && data !== null ? (
          <span className="dst_batch">
            <button
              type="button"
              className="dst_batchBtn"
              disabled={busy || categoryCheckedAll || visible.length === 0}
              onClick={() => setCategory(filter, true)}
            >
              {t('selectAll')}
            </button>
            <button
              type="button"
              className="dst_batchBtn"
              disabled={busy || visibleChecked.length === 0}
              onClick={() => setCategory(filter, false)}
            >
              {t('clearAll')}
            </button>
          </span>
        ) : null}
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
              const text = rowText(tool, mode)
              const long = text.length > ROW_BUDGET_CHARS
              return (
                <div key={`${tool.id}-${rowIndex}`} className={`dst_tool${long ? ' dst_toolLong' : ''}`}>
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
                      <span
                        className={`dst_cost${long ? ' dst_costLong' : ''}`}
                        title={`${t('budgetLongRow').replace('{n}', '1').replace('{limit}', String(ROW_BUDGET_CHARS))}`}
                      >
                        {text.length}
                      </span>
                    </div>
                    <div className="dst_toolDesc">{tool.desc}</div>
                    <details className="dst_usage">
                      <summary>{t('usageLabel')}</summary>
                      {tool.usage}
                    </details>
                    {mode === 'compact' ? (
                      <div className="dst_compact">
                        <span className="dst_compactLabel">{t('fieldCompact')}</span>
                        {tool.compact !== undefined && tool.compact.trim().length > 0 ? (
                          tool.compact
                        ) : (
                          <span className="dst_compactMissing">
                            {t('compactMissing')} → {t('usageLabel')}
                          </span>
                        )}
                      </div>
                    ) : null}
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
            <label className="dst_field dst_fieldWide">
              <span>{t('fieldCompact')}</span>
              <textarea
                className="dst_input"
                value={draft.compact ?? ''}
                maxLength={200}
                rows={2}
                placeholder={t('fieldCompactPh')}
                onChange={(event) => setDraft({ ...draft, compact: event.target.value })}
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
          <summary>
            {t('sectionLabel')} · {costText(t, sectionForMode.full.length, sectionForMode.compact.length)}
          </summary>
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
