#!/usr/bin/env node
/**
 * FS-7 PR #381 — functional spec registration sort regression
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const boardListSource = await readFile(path.join(ROOT, 'stam/js/stam.board-list.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-adapter.js'), 'utf8');
const listSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-list.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-service.js'), 'utf8');

assert.doesNotMatch(adapterSource, /updatedAt.*localeCompare/);
assert.match(listSource, /function sortItemsForDisplay\(list\)/);
assert.match(listSource, /var sorted = sortItemsForDisplay/);
assert.match(listSource, /if \(seq !== loadSeq\)/);

const context = vm.createContext({
  window: {},
  document: { addEventListener() {} },
});

vm.runInContext(boardListSource, context, { filename: 'stam.board-list.js' });
vm.runInContext(serviceSource, context, { filename: 'stam.functional-spec-service.js' });

const sort = context.window.STAMBoardList.sortByBoardRegistration;
const buildUpdatePatch = context.window.STAM.functionalSpecServiceContract.buildUpdatePatch;

const T1 = '2026-07-01T10:00:00.000Z';
const T2 = '2026-07-02T10:00:00.000Z';
const T3 = '2026-07-03T15:00:00.000Z';

const fn001 = {
  id: 'fn-doc-001',
  code: 'FN_001',
  title: 'First registration',
  createdAt: T1,
  updatedAt: T3,
  status: 'draft',
  priority: 'mid',
  functionType: 'view',
};
const fn002 = {
  id: 'fn-doc-002',
  code: 'FN_002',
  title: 'Second registration',
  createdAt: T2,
  updatedAt: T2,
  status: 'draft',
  priority: 'mid',
  functionType: 'view',
};

assert.deepEqual(
  sort([fn001, fn002]).map((item) => item.code),
  ['FN_002', 'FN_001'],
);

assert.deepEqual(
  sort([
    { id: 'fn-doc-001', code: 'FN_001', createdAt: T1, updatedAt: T3 },
    { id: 'fn-doc-002', code: 'FN_002', createdAt: null, updatedAt: T2 },
  ]).map((item) => item.code),
  ['FN_002', 'FN_001'],
);

const updatePatch = buildUpdatePatch(
  { title: 'Edited FN_001', createdAt: T3, status: 'draft', priority: 'mid' },
  { actorUid: 'qa-user', actorName: 'QA User' },
);
assert.equal('createdAt' in updatePatch, false);
assert.ok(updatePatch.updatedAt);

const tbody = { innerHTML: '', attrs: {}, setAttribute(n, v) { this.attrs[n] = v; }, getAttribute(n) { return this.attrs[n] || ''; } };
const renderCalls = [];

const listContext = vm.createContext({
  window: {
    location: { search: '?projectId=P-FS7', replace() {} },
    sessionStorage: { getItem() { return ''; }, setItem() {} },
    STAMBoardList: context.window.STAMBoardList,
    STAM: {
      uiMessages: { common: {}, functionalSpec: {} },
      uiFeedback: { hydrateIcons() {} },
    },
    renderStamIcon() { return ''; },
    hydrateStamIcons() {},
  },
  document: {
    readyState: 'complete',
    addEventListener() {},
    getElementById(id) { return id === 'fn-tbody' ? tbody : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  },
  URLSearchParams,
  Promise,
  String,
  Array,
  Object,
  Error,
  Number,
  Math,
});

listContext.window.window = listContext.window;
listContext.window.document = listContext.document;
listContext.window.__renderCalls = renderCalls;

const patchedListSource = listSource
  .replace('ready(load);', '')
  .replace(
    'function renderRows(items) {',
    'function renderRows(items) { window.__renderCalls.push(sortItemsForDisplay(items||[]).map(function(i){return i.code;}));',
  );

vm.runInContext(patchedListSource, listContext, { filename: 'stam.functional-spec-firestore-list.js' });
const api = listContext.window.STAM.functionalSpecFirestoreList;

tbody.innerHTML = '';
api.renderRows([fn001, fn002]);
assert.deepEqual(
  [...tbody.innerHTML.matchAll(/FN_00[12]/g)].map((m) => m[0]),
  ['FN_002', 'FN_001'],
);

for (let i = 0; i < 3; i += 1) {
  tbody.innerHTML = '';
  api.renderRows([Object.assign({}, fn001), Object.assign({}, fn002)]);
  assert.deepEqual(
    [...tbody.innerHTML.matchAll(/FN_00[12]/g)].map((m) => m[0]),
    ['FN_002', 'FN_001'],
    'repeat render ' + i,
  );
}

assert.deepEqual(renderCalls, [
  ['FN_002', 'FN_001'],
  ['FN_002', 'FN_001'],
  ['FN_002', 'FN_001'],
  ['FN_002', 'FN_001'],
]);

console.log('functional spec registration sort regression: PASS');
