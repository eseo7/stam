#!/usr/bin/env node
/**
 * STAM common board list registration sort contract
 *
 * Default list order for general CRUD boards:
 *   1. createdAt desc
 *   2. business code number desc
 *   3. document id desc
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const boardListSource = await readFile(new URL('stam/js/stam.board-list.js', ROOT), 'utf8');
const requirementsListSource = await readFile(new URL('stam/js/stam.requirements-firestore-list.js', ROOT), 'utf8');
const functionalSpecListSource = await readFile(new URL('stam/js/stam.functional-spec-firestore-list.js', ROOT), 'utf8');

assert.match(boardListSource, /function sortByBoardRegistration\(list\)/);
assert.match(boardListSource, /getTimestampMs\(a && a\.createdAt\)/);
assert.doesNotMatch(boardListSource, /updatedAt/);
assert.match(requirementsListSource, /sortByBoardRegistration\(list\)/);
assert.match(functionalSpecListSource, /sortByBoardRegistration\(list\)/);
assert.doesNotMatch(requirementsListSource, /latestSortTime/);
assert.doesNotMatch(functionalSpecListSource, /latestSortTime/);

const context = vm.createContext({
  window: {},
  document: { addEventListener() {} },
});

vm.runInContext(boardListSource, context, { filename: 'stam.board-list.js' });

const sort = context.window.STAMBoardList.sortByBoardRegistration;

assert.deepEqual(
  sort([
    { id: 'REQ-001', code: 'REQ_001', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z' },
    { id: 'REQ-002', code: 'REQ_002', createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  ]).map((item) => item.id),
  ['REQ-002', 'REQ-001'],
  'newer createdAt wins even when older row has newer updatedAt',
);

assert.deepEqual(
  sort([
    { id: 'FN-001', code: 'FN_001', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z' },
    { id: 'FN-002', code: 'FN_002', createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  ]).map((item) => item.id),
  ['FN-002', 'FN-001'],
  'functional spec rows follow the same registration sort contract',
);

assert.deepEqual(
  sort([
    { id: 'doc-b', code: 'REQ_002', createdAt: '2026-07-09T00:00:00.000Z' },
    { id: 'doc-a', code: 'REQ_003', createdAt: '2026-07-09T00:00:00.000Z' },
  ]).map((item) => item.id),
  ['doc-a', 'doc-b'],
  'equal createdAt falls back to business code number desc',
);

assert.deepEqual(
  sort([
    { id: 'doc-z', code: 'REQ_001', createdAt: '2026-07-09T00:00:00.000Z' },
    { id: 'doc-a', code: 'REQ_001', createdAt: '2026-07-09T00:00:00.000Z' },
  ]).map((item) => item.id),
  ['doc-z', 'doc-a'],
  'equal createdAt and code number falls back to document id desc',
);

console.log('board list sort contract: PASS');
