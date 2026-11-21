/**
 * Unit tests for the pure functions in src/catalog.ts.
 *
 * Zero dependencies: `node:test` + `node:assert/strict`, run against the
 * TypeScript source directly (Node ≥22 strips types on import, so `pnpm test`
 * needs no build step and no test framework).
 *
 * HERMETIC: every function that takes a config is called with
 * `{ settingsDir: <fresh mkdtemp dir> }` — never a bare string. A bare string
 * type-checks as `any`-ish under Node's type stripping, and `stateDir()` would
 * then read `config.settingsDir === undefined` and silently fall back to the
 * REAL `~/.dsh/software-tools/`, mutating the user's live state. `cfg()` below
 * is the only way tests address the filesystem, and `withDir` asserts the
 * mapping is what it claims. `tsc -p tsconfig.test.json` (part of `typecheck`)
 * catches a regression to a bare string.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CATALOG,
  CATEGORIES,
  addTool,
  dedupeId,
  injectedText,
  isRenderMode,
  mergeCatalog,
  mergedCatalog,
  normalizeEntry,
  readRenderMode,
  readSelected,
  removeTool,
  renderSection,
  slugify,
  stateDir,
  writeRenderMode,
  writeSelected,
} from '../src/catalog.ts'
import type { SoftwareTool, SoftwareToolsConfig, UserCatalog } from '../src/catalog.ts'

/* ------------------------------------------------------------------ helpers */

/** The only way a test may address a state directory. */
function cfg(dir: string): Partial<SoftwareToolsConfig> {
  return { settingsDir: dir }
}

/**
 * Run `fn` against a throwaway settings dir, removed afterwards.
 *
 * Asserts that `cfg(dir)` really resolves to `dir` before running the body: if
 * that mapping ever breaks, the test aborts instead of writing to the real
 * `~/.dsh/software-tools/`.
 */
async function withDir(fn: (dir: string) => void | Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'dst-test-'))
  try {
    assert.equal(stateDir(cfg(dir)), dir, 'settingsDir must resolve to the temp dir')
    await fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Write a user catalog.json into `dir`. */
function writeCatalog(dir: string, tools: unknown[]): void {
  writeFileSync(join(dir, 'catalog.json'), JSON.stringify({ tools }, null, 2), 'utf8')
}

function readCatalog(dir: string): { tools: SoftwareTool[] } {
  return JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8')) as { tools: SoftwareTool[] }
}

/**
 * One valid user row, with overrides applied. No `id` by default: most tests
 * want the auto-slug path, and an explicit id in every row would silently turn
 * `addTool` into an `id-conflict` test.
 */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { name: 'My Tool', category: 'misc', desc: 'what it is', usage: 'run it', ...overrides }
}

function userCatalog(tools: SoftwareTool[], extra: Partial<UserCatalog> = {}): UserCatalog {
  return { tools, dropped: [], ...extra }
}

/* ------------------------------------------------------------- mergeCatalog */

test('mergeCatalog: built-ins alone are all origin=builtin and readonly', () => {
  const merged = mergeCatalog(userCatalog([]))
  assert.equal(merged.entries.length, CATALOG.length)
  assert.equal(merged.warnings.length, 0)
  assert.equal(merged.dropped.length, 0)
  for (const entry of merged.entries) {
    assert.equal(entry.origin, 'builtin')
    assert.equal(entry.readonly, true)
  }
  assert.deepEqual(
    merged.entries.map((entry) => entry.id),
    CATALOG.map((tool) => tool.id),
  )
})

test('mergeCatalog: a user row with a built-in id becomes an override at the built-in position', () => {
  const override = row({ id: 'aria2', name: 'aria2 (mine)', usage: 'my usage' })
  const merged = mergeCatalog(userCatalog([override as unknown as SoftwareTool]))
  const entry = merged.entries.find((candidate) => candidate.id === 'aria2')
  assert.ok(entry !== undefined)
  assert.equal(entry.origin, 'override')
  assert.equal(entry.readonly, false)
  assert.equal(entry.name, 'aria2 (mine)')
  assert.equal(merged.entries[0]?.id, 'aria2')
  assert.equal(merged.entries.length, CATALOG.length)
})

test('mergeCatalog: user-only rows append in file order with origin=user', () => {
  const merged = mergeCatalog(userCatalog([row({ id: 'a' }), row({ id: 'b' })] as unknown as SoftwareTool[]))
  assert.equal(merged.entries.length, CATALOG.length + 2)
  const tail = merged.entries.slice(CATALOG.length)
  assert.deepEqual(
    tail.map((entry) => entry.id),
    ['a', 'b'],
  )
  for (const entry of tail) {
    assert.equal(entry.origin, 'user')
    assert.equal(entry.readonly, false)
  }
})

test('mergeCatalog: duplicate user ids — the last row wins and the earlier one warns', () => {
  const merged = mergeCatalog(
    userCatalog([row({ id: 'dup', name: 'first' }), row({ id: 'dup', name: 'second' })] as unknown as SoftwareTool[]),
  )
  const entries = merged.entries.filter((entry) => entry.id === 'dup')
  assert.equal(entries.length, 1)
  assert.equal(entries[0]?.name, 'second')
  assert.equal(merged.warnings.length, 1)
  assert.match(merged.warnings[0] ?? '', /duplicate id "dup"/)
})

test('mergeCatalog: dropped rows surface as warnings and are passed through', () => {
  const merged = mergeCatalog({ tools: [], dropped: [{ index: 2, reason: 'missing "usage"' }] })
  assert.equal(merged.warnings.length, 1)
  assert.match(merged.warnings[0] ?? '', /row 3: missing "usage"/)
  assert.deepEqual(merged.dropped, [{ index: 2, reason: 'missing "usage"' }])
})

test('mergeCatalog: a parse error is carried on the result', () => {
  const merged = mergeCatalog({ tools: [], dropped: [], error: 'not valid JSON' })
  assert.equal(merged.error, 'not valid JSON')
})

test('mergeCatalog: compact survives the merge, and stays absent when unset', () => {
  const merged = mergeCatalog(
    userCatalog([
      row({ id: 'with-compact', compact: 'short form' }),
      row({ id: 'without-compact' }),
    ] as unknown as SoftwareTool[]),
  )
  assert.equal(merged.entries.find((entry) => entry.id === 'with-compact')?.compact, 'short form')
  assert.equal(merged.entries.find((entry) => entry.id === 'without-compact')?.compact, undefined)
})

/* ----------------------------------------------------------- normalizeEntry */

test('normalizeEntry: accepts a complete row and trims it', () => {
  const result = normalizeEntry({ id: '  spaced  ', name: ' N ', category: ' custom ', desc: ' d ', usage: ' u ' })
  assert.ok(result.ok)
  assert.deepEqual(result.ok ? result.tool : undefined, {
    id: 'spaced',
    name: 'N',
    category: 'custom',
    desc: 'd',
    usage: 'u',
  })
})

test('normalizeEntry: each missing required field is reported by name', () => {
  const cases: Array<[Record<string, unknown>, RegExp]> = [
    [{ name: 'n', category: 'misc', desc: 'd', usage: 'u' }, /missing "id"/],
    [{ id: 'x', category: 'misc', desc: 'd', usage: 'u' }, /missing "name"/],
    [{ id: 'x', name: 'n', category: 'misc', usage: 'u' }, /missing "desc"/],
    [{ id: 'x', name: 'n', category: 'misc', desc: 'd' }, /missing "usage"/],
    [{ id: 'x', name: 'n', category: 'misc', desc: 'd', usage: '   ' }, /missing "usage"/],
    [{ id: 'x', name: 'n', desc: 'd', usage: 'u' }, /missing "category"/],
    [{ id: 'x', name: '   ', category: 'misc', desc: 'd', usage: 'u' }, /missing "name"/],
  ]
  for (const [value, expected] of cases) {
    const result = normalizeEntry(value)
    assert.equal(result.ok, false, JSON.stringify(value))
    assert.match(result.ok ? '' : result.reason, expected)
  }
})

test('normalizeEntry: a non-object row is rejected', () => {
  for (const value of [null, 42, 'row', undefined]) {
    const result = normalizeEntry(value)
    assert.equal(result.ok, false)
    assert.equal(result.ok ? '' : result.reason, 'row is not an object')
  }
})

test('normalizeEntry: the id is echoed in the reason once it is known', () => {
  const result = normalizeEntry({ id: 'known-id', category: 'misc', desc: 'd', usage: 'u' })
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /\(id "known-id"\)/)
})

test('normalizeEntry: a blank or non-string compact is treated as absent', () => {
  const blank = normalizeEntry(row({ id: 'x', compact: '   ' }))
  const number = normalizeEntry(row({ id: 'x', compact: 7 }))
  const real = normalizeEntry(row({ id: 'x', compact: ' short ' }))
  assert.equal(blank.ok ? blank.tool.compact : 'x', undefined)
  assert.equal(number.ok ? number.tool.compact : 'x', undefined)
  assert.equal(real.ok ? real.tool.compact : undefined, 'short')
})

test('normalizeEntry: a bad row in a real file is dropped, good rows still load', async () => {
  await withDir((dir) => {
    writeCatalog(dir, [row({ id: 'good' }), { id: 'bad', name: 'x' }, 42])
    const merged = mergedCatalog(cfg(dir))
    assert.ok(merged.entries.some((entry) => entry.id === 'good'))
    assert.deepEqual(
      merged.dropped.map((drop) => drop.index),
      [1, 2],
    )
    assert.match(merged.dropped[0]?.reason ?? '', /missing "desc"/)
    assert.equal(merged.dropped[1]?.reason, 'row is not an object')
    assert.equal(merged.warnings.length, 2)
  })
})

test('normalizeEntry: invalid JSON reports an error and yields no tools', async () => {
  await withDir((dir) => {
    writeFileSync(join(dir, 'catalog.json'), '{ not json', 'utf8')
    const merged = mergedCatalog(cfg(dir))
    assert.match(merged.error ?? '', /not valid JSON/)
    assert.equal(merged.entries.length, CATALOG.length)
  })
})

test('normalizeEntry: a non-array "tools" reports an error', async () => {
  await withDir((dir) => {
    writeFileSync(join(dir, 'catalog.json'), JSON.stringify({ tools: {} }), 'utf8')
    const merged = mergedCatalog(cfg(dir))
    assert.match(merged.error ?? '', /must be an object with a "tools" array/)
  })
})

/* ----------------------------------------------------------------- slugify */

test('slugify: lowercases, dashes, and strips edges', () => {
  assert.equal(slugify('My Tool'), 'my-tool')
  assert.equal(slugify('  Hello, World!  '), 'hello-world')
  assert.equal(slugify('A--B'), 'a-b')
  assert.equal(slugify('--leading-and-trailing--'), 'leading-and-trailing')
})

test('slugify: falls back to "tool" when nothing ascii survives', () => {
  assert.equal(slugify('中文名字'), 'tool')
  assert.equal(slugify(''), 'tool')
  assert.equal(slugify('!!!'), 'tool')
})

test('slugify: caps at 48 characters', () => {
  assert.equal(slugify('a'.repeat(100)).length, 48)
})

/* ---------------------------------------------------------------- dedupeId */

test('dedupeId: returns the base when it is free', () => {
  assert.equal(dedupeId('base', new Set()), 'base')
})

test('dedupeId: appends -2, -3, … for taken ids', () => {
  assert.equal(dedupeId('base', new Set(['base'])), 'base-2')
  assert.equal(dedupeId('base', new Set(['base', 'base-2'])), 'base-3')
  assert.equal(dedupeId('base', new Set(['base', 'base-2', 'base-3'])), 'base-4')
})

test('dedupeId: falls back to a time suffix when the numeric space is exhausted', () => {
  const taken = new Set(['base'])
  for (let n = 2; n <= 200; n += 1) taken.add(`base-${n}`)
  const result = dedupeId('base', taken)
  assert.match(result, /^base-[0-9a-z]+$/)
  assert.equal(taken.has(result), false)
})

test('dedupeId: an auto id never collides with a built-in id', async () => {
  await withDir((dir) => {
    const result = addTool(cfg(dir), row({ name: 'Aria2' }))
    assert.ok(result.ok)
    assert.equal(result.tool.id, 'aria2-2')
  })
})

/* ------------------------------------------------------------------ addTool */

test('addTool: writes a new user row and reports origin=user', async () => {
  await withDir((dir) => {
    const result = addTool(cfg(dir), row({ name: 'Brand New' }))
    assert.ok(result.ok)
    assert.equal(result.tool.origin, 'user')
    assert.equal(result.tool.readonly, false)
    assert.equal(result.overwritten, false)
    assert.deepEqual(
      readCatalog(dir).tools.map((tool) => tool.id),
      ['brand-new'],
    )
  })
})

test('addTool: an explicit id that already exists is refused with id-conflict', async () => {
  await withDir((dir) => {
    assert.ok(addTool(cfg(dir), row({ name: 'Mine', id: 'mine' })).ok)
    const again = addTool(cfg(dir), row({ name: 'Mine Again', id: 'mine' }))
    assert.equal(again.ok, false)
    assert.equal(again.ok === false ? again.error.code : '', 'id-conflict')
    assert.match(again.ok === false ? again.error.message : '', /pass overwrite:true/)
  })
})

test('addTool: a built-in id is refused without overwrite and becomes an override with it', async () => {
  await withDir((dir) => {
    const refused = addTool(cfg(dir), row({ id: 'aria2' }))
    assert.equal(refused.ok, false)
    assert.equal(refused.ok === false ? refused.error.code : '', 'id-conflict')

    const accepted = addTool(cfg(dir), row({ id: 'aria2', name: 'aria2 (mine)', overwrite: true }))
    assert.ok(accepted.ok)
    assert.equal(accepted.tool.origin, 'override')
    assert.equal(accepted.overwritten, true)
    const merged = mergedCatalog(cfg(dir))
    assert.equal(merged.entries.find((entry) => entry.id === 'aria2')?.origin, 'override')
  })
})

test('addTool: a malformed payload is rejected', async () => {
  await withDir((dir) => {
    const missingName = addTool(cfg(dir), row({ name: '  ' }))
    assert.equal(missingName.ok === false ? missingName.error.code : '', 'bad-request')

    const badCategory = addTool(cfg(dir), row({ category: 'nope' }))
    assert.equal(badCategory.ok === false ? badCategory.error.code : '', 'bad-request')
    assert.match(badCategory.ok === false ? badCategory.error.message : '', /category must be one of/)

    const badId = addTool(cfg(dir), row({ id: 'Not Valid' }))
    assert.equal(badId.ok, false)
    assert.match(badId.ok === false ? badId.error.message : '', /id must match/)

    const notAnObject = addTool(cfg(dir), 'nope')
    assert.equal(notAnObject.ok === false ? notAnObject.error.code : '', 'bad-request')
  })
})

test('addTool: refuses to rewrite a catalog with unusable rows', async () => {
  await withDir((dir) => {
    writeCatalog(dir, [{ id: 'ok' }, { id: 'broken' }])
    const result = addTool(cfg(dir), row({ name: 'New One' }))
    assert.equal(result.ok === false ? result.error.code : '', 'catalog-invalid')
    assert.equal(readCatalog(dir).tools.length, 2)
  })
})

test('addTool: refuses an unparseable catalog', async () => {
  await withDir((dir) => {
    writeFileSync(join(dir, 'catalog.json'), 'nope', 'utf8')
    const result = addTool(cfg(dir), row())
    assert.equal(result.ok === false ? result.error.code : '', 'catalog-unreadable')
  })
})

test('addTool: compact is persisted and enforced at 200 chars', async () => {
  await withDir((dir) => {
    const withCompact = addTool(cfg(dir), row({ name: 'Has Compact', compact: 'one line' }))
    assert.ok(withCompact.ok)
    assert.equal(withCompact.tool.compact, 'one line')
    assert.equal(readCatalog(dir).tools[0]?.compact, 'one line')

    const tooLong = addTool(cfg(dir), row({ name: 'Too Long', compact: 'x'.repeat(201) }))
    assert.equal(tooLong.ok, false)
    assert.match(tooLong.ok === false ? tooLong.error.message : '', /compact is too long \(max 200/)

    const exact = addTool(cfg(dir), row({ name: 'Exactly', compact: 'y'.repeat(200) }))
    assert.ok(exact.ok)
  })
})

test('addTool: an absent or blank compact is not written at all', async () => {
  await withDir((dir) => {
    const result = addTool(cfg(dir), row({ name: 'No Compact', compact: '   ' }))
    assert.ok(result.ok)
    assert.equal(result.tool.compact, undefined)
    assert.equal('compact' in (readCatalog(dir).tools[0] ?? {}), false)
  })
})

/* --------------------------------------------------------------- removeTool */

test('removeTool: deletes a user row and unchecks it', async () => {
  await withDir((dir) => {
    assert.ok(addTool(cfg(dir), row({ name: 'Gone Soon', id: 'gone' })).ok)
    writeSelected(cfg(dir), ['gone', 'aria2'])
    const result = removeTool(cfg(dir), { id: 'gone' })
    assert.ok(result.ok)
    assert.equal(result.selectionUpdated, true)
    assert.equal(result.fallbackToBuiltin, false)
    assert.deepEqual(readCatalog(dir).tools, [])
    assert.deepEqual(readSelected(cfg(dir)), ['aria2'])
  })
})

test('removeTool: a built-in-only id is refused with builtin-readonly', async () => {
  await withDir((dir) => {
    const result = removeTool(cfg(dir), { id: 'aria2' })
    assert.equal(result.ok, false)
    assert.equal(result.ok === false ? result.error.code : '', 'builtin-readonly')
  })
})

test('removeTool: removing an override falls back to the built-in', async () => {
  await withDir((dir) => {
    assert.ok(addTool(cfg(dir), row({ id: 'aria2', overwrite: true })).ok)
    const result = removeTool(cfg(dir), { id: 'aria2' })
    assert.ok(result.ok)
    assert.equal(result.fallbackToBuiltin, true)
    const entry = mergedCatalog(cfg(dir)).entries.find((candidate) => candidate.id === 'aria2')
    assert.equal(entry?.origin, 'builtin')
    assert.equal(entry?.readonly, true)
  })
})

test('removeTool: an unknown id is refused', async () => {
  await withDir((dir) => {
    const result = removeTool(cfg(dir), { id: 'nope' })
    assert.equal(result.ok === false ? result.error.code : '', 'unknown-id')
  })
})

test('removeTool: a malformed payload is refused', async () => {
  await withDir((dir) => {
    assert.equal(removeTool(cfg(dir), null).ok, false)
    assert.equal(removeTool(cfg(dir), {}).ok, false)
    assert.equal(removeTool(cfg(dir), { id: '  ' }).ok, false)
  })
})

test('removeTool: a selection not containing the id is left untouched', async () => {
  await withDir((dir) => {
    assert.ok(addTool(cfg(dir), row({ id: 'solo' })).ok)
    writeSelected(cfg(dir), ['aria2'])
    const result = removeTool(cfg(dir), { id: 'solo' })
    assert.ok(result.ok)
    assert.equal(result.selectionUpdated, false)
    assert.deepEqual(readSelected(cfg(dir)), ['aria2'])
  })
})

/* ------------------------------------------------------------ renderSection */

test('renderSection: full mode injects usage, compact mode injects compact', async () => {
  await withDir((dir) => {
    writeCatalog(dir, [
      row({ id: 'both', name: 'Both', usage: 'LONG USAGE', compact: 'SHORT' }),
      row({ id: 'only-usage', name: 'OnlyUsage', usage: 'PLAIN USAGE' }),
    ])
    const ids = ['both', 'only-usage']
    const full = renderSection(cfg(dir), ids, 'full')
    const compact = renderSection(cfg(dir), ids, 'compact')
    assert.match(full, /- Both: LONG USAGE/)
    assert.match(full, /- OnlyUsage: PLAIN USAGE/)
    // The missing compact falls back to usage — never a blank line.
    assert.match(compact, /- Both: SHORT/)
    assert.match(compact, /- OnlyUsage: PLAIN USAGE/)
  })
})

test('renderSection: defaults to full mode when the mode argument is omitted', async () => {
  await withDir((dir) => {
    const ids = ['aria2']
    assert.equal(renderSection(cfg(dir), ids), renderSection(cfg(dir), ids, 'full'))
    assert.match(renderSection(cfg(dir), ids), /aria2c -x 16/)
  })
})

test('renderSection: an empty selection renders nothing at all', async () => {
  await withDir((dir) => {
    assert.equal(renderSection(cfg(dir), []), '')
    assert.equal(renderSection(cfg(dir), [], 'compact'), '')
  })
})

test('renderSection: ids missing from the catalog are skipped', async () => {
  await withDir((dir) => {
    const text = renderSection(cfg(dir), ['aria2', 'does-not-exist'], 'compact')
    assert.match(text, /aria2/)
    assert.doesNotMatch(text, /does-not-exist/)
    assert.equal(renderSection(cfg(dir), ['nope']), '')
  })
})

test('injectedText: compact wins only when present and non-blank', () => {
  const tool: SoftwareTool = { id: 'x', name: 'X', category: 'misc', desc: 'd', usage: 'USAGE' }
  assert.equal(injectedText(tool, 'full'), 'USAGE')
  assert.equal(injectedText(tool, 'compact'), 'USAGE')
  assert.equal(injectedText({ ...tool, compact: 'SHORT' }, 'full'), 'USAGE')
  assert.equal(injectedText({ ...tool, compact: 'SHORT' }, 'compact'), 'SHORT')
  assert.equal(injectedText({ ...tool, compact: '   ' }, 'compact'), 'USAGE')
})

test('every built-in entry ships a compact form within the 200-char cap', () => {
  for (const tool of CATALOG) {
    assert.equal(typeof tool.compact, 'string', `${tool.id} has no compact`)
    assert.ok((tool.compact ?? '').trim().length > 0, `${tool.id} has a blank compact`)
    assert.ok((tool.compact ?? '').length <= 200, `${tool.id} compact exceeds 200 chars`)
  }
})

test('every built-in entry uses a known category', () => {
  for (const tool of CATALOG) assert.ok(CATEGORIES.includes(tool.category), `${tool.id}: ${tool.category}`)
})

/* -------------------------------------------------------------- render mode */

test('readRenderMode: missing file defaults to full', async () => {
  await withDir((dir) => {
    assert.equal(readRenderMode(cfg(dir)), 'full')
  })
})

test('readRenderMode: an invalid value falls back to full', async () => {
  await withDir((dir) => {
    writeFileSync(join(dir, 'selection.json'), JSON.stringify({ ids: [], mode: 'weird' }), 'utf8')
    assert.equal(readRenderMode(cfg(dir)), 'full')
  })
})

test('isRenderMode: accepts exactly the two modes', () => {
  assert.equal(isRenderMode('full'), true)
  assert.equal(isRenderMode('compact'), true)
  assert.equal(isRenderMode('FULL'), false)
  assert.equal(isRenderMode(undefined), false)
  assert.equal(isRenderMode(1), false)
})

test('writeRenderMode and writeSelected preserve each other\u2019s field', async () => {
  await withDir((dir) => {
    assert.equal(writeRenderMode(cfg(dir), 'compact'), true)
    assert.equal(writeRenderMode(cfg(dir), 'compact'), false) // no-op, no rewrite
    assert.equal(readRenderMode(cfg(dir)), 'compact')

    assert.equal(writeSelected(cfg(dir), ['aria2']), true)
    // Writing the ids must not lose the mode…
    assert.equal(readRenderMode(cfg(dir)), 'compact')
    assert.deepEqual(readSelected(cfg(dir)), ['aria2'])

    // …and writing the mode must not lose the ids.
    assert.equal(writeRenderMode(cfg(dir), 'full'), true)
    assert.deepEqual(readSelected(cfg(dir)), ['aria2'])
    assert.equal(readRenderMode(cfg(dir)), 'full')
  })
})

test('writeSelected: an unchanged selection is not rewritten', async () => {
  await withDir((dir) => {
    assert.equal(writeSelected(cfg(dir), ['aria2']), true)
    assert.equal(writeSelected(cfg(dir), ['aria2']), false)
  })
})

test('writeSelected: an empty selection matches a missing file and is not rewritten', async () => {
  await withDir((dir) => {
    // A missing selection.json already reads as `[]`, so persisting `[]` is a
    // no-op by design: the "unchanged selection is not rewritten" rule keeps a
    // cleared selection from spawning an endless chain of backup files.
    assert.equal(writeSelected(cfg(dir), []), false)
    assert.deepEqual(readSelected(cfg(dir)), [])
  })
})

/* ------------------------------------------------------- end-to-end budget */

test('end-to-end: compact mode renders a built-in-only selection smaller than full', async () => {
  await withDir((dir) => {
    const ids = CATALOG.map((tool) => tool.id)
    writeSelected(cfg(dir), ids)
    const full = renderSection(cfg(dir), ids, 'full')
    const compact = renderSection(cfg(dir), ids, 'compact')
    assert.ok(compact.length > 0)
    assert.ok(compact.length < full.length, `compact ${compact.length} should be < full ${full.length}`)
  })
})
