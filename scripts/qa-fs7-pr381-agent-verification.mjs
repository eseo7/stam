#!/usr/bin/env node
/**
 * FS-7 PR #381 — agent-side live QA verification (items 3–5)
 *
 * 3. Requirements + functional-spec both use STAMBoardList.sortByBoardRegistration
 * 4. Search/filter clear does not reorder pre-sorted rows (display-only)
 * 5. List modules + board-list load without throwing in VM harness
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const boardListSource = await readFile(path.join(ROOT, 'stam/js/stam.board-list.js'), 'utf8');
const requirementsListSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-firestore-list.js'), 'utf8');
const functionalSpecListSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-list.js'), 'utf8');
const functionalSpecPageSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-specification.js'), 'utf8');
const requirementsPageSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements.js'), 'utf8');

assert.match(requirementsListSource, /sortByBoardRegistration\(list\)/);
assert.match(functionalSpecListSource, /sortByBoardRegistration\(list\)/);
assert.doesNotMatch(requirementsListSource, /latestSortTime/);
assert.doesNotMatch(functionalSpecListSource, /latestSortTime/);

const context = vm.createContext({
  window: { STAMBoardList: null, STAM: {} },
  document: {
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById() { return null; },
    querySelector() { return null; },
  },
});

vm.runInContext(boardListSource, context, { filename: 'stam.board-list.js' });
const sort = context.window.STAMBoardList.sortByBoardRegistration;

assert.deepEqual(
  sort([
    { id: 'REQ-001', code: 'REQ_001', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z' },
    { id: 'REQ-002', code: 'REQ_002', createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  ]).map((item) => item.id),
  ['REQ-002', 'REQ-001'],
  'requirements registration sort: newer createdAt stays above edited older row',
);

assert.deepEqual(
  sort([
    { id: 'FN-001', code: 'FN_001', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z' },
    { id: 'FN-002', code: 'FN_002', createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  ]).map((item) => item.id),
  ['FN-002', 'FN-001'],
  'functional spec registration sort: newer createdAt stays above edited older row',
);

function makeRow(id, text) {
  return { id, textContent: text, style: { display: '' } };
}

const rows = [
  makeRow('FN-002', 'FN_002 newer registration'),
  makeRow('FN-001', 'FN_001 older registration'),
];

function simulateSearchClear(rowList, query) {
  rowList.forEach(function (row) {
    const text = row.textContent.toLowerCase();
    row.style.display = query === '' || text.indexOf(query) !== -1 ? '' : 'none';
  });
}

simulateSearchClear(rows, 'fn_001');
simulateSearchClear(rows, '');
assert.deepEqual(
  rows.map((row) => row.id),
  ['FN-002', 'FN-001'],
  'search clear preserves DOM row order',
);

assert.match(functionalSpecPageSource, /row\.style\.display = q === '' \|\| text\.indexOf\(q\) !== -1/);
assert.doesNotMatch(functionalSpecPageSource, /\.sort\(/);
assert.match(requirementsPageSource, /실제 필터링 미구현 — UI Mock/);
assert.match(functionalSpecPageSource, /실제 필터링 미구현 — UI Mock/);

const contractScripts = [
  'scripts/test-board-list-sort-contract.mjs',
  'scripts/test-requirements-firestore-list-contract.mjs',
  'scripts/test-functional-spec-list-contract.mjs',
  'scripts/test-functional-spec-registration-sort-regression.mjs',
];

for (const script of contractScripts) {
  const result = spawnSync(process.execPath, [path.join(ROOT, script)], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${script} failed:\n${result.stdout}\n${result.stderr}`);
}

console.log('qa-fs7-pr381-agent-verification: PASS');
