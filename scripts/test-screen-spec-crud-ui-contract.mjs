#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => readFile(path.join(ROOT, rel), 'utf8');
const [html, list, crud, service, adapter, reference, req, fn, wbs] = await Promise.all([
  read('stam/pages/boards/screen-specification.html'),
  read('stam/js/stam.screen-specification-cycle.js'),
  read('stam/js/stam.screen-specification-crud.js'),
  read('stam/js/stam.screen-spec-service.js'),
  read('stam/js/stam.screen-spec-firestore-adapter.js'),
  read('stam/js/stam.reference-picker.js'),
  read('stam/js/stam.requirement-picker.js'),
  read('stam/js/stam.functional-spec-picker.js'),
  read('stam/js/stam.wbs-picker.js'),
]);

for (const token of [
  'data-stam-screen-spec-link-slot="requirement"',
  'data-stam-screen-spec-link-slot="functionalSpec"',
  'data-stam-screen-spec-link-slot="wbs"',
  'data-stam-requirement-picker',
  'data-stam-functional-spec-picker',
  'data-stam-wbs-picker',
]) assert.match(html, new RegExp(token));

assert.match(list, /svc\.listByProject\(projectId, DEFAULT_QUERY,/);
assert.match(crud, /svc\.create\(guard\.projectId, input, context\)/);
assert.match(crud, /return closeAndRefresh\(\)/);
assert.match(crud, /return api\.load\(\)/);
assert.match(adapter, /function createWithAllocatedCode\([\s\S]*?runTransaction/);
assert.doesNotMatch(crud, /\.collection\(|\.doc\(|firestore\(\)|runTransaction/);

for (const [name, source] of [['requirement', req], ['functionalSpec', fn], ['wbs', wbs]]) {
  assert.match(crud, new RegExp(`${name === 'functionalSpec' ? 'functionalSpec' : name}Picker`));
  assert.match(source, /referencePicker/);
}
assert.match(crud, /typeof reqApi\.mount === 'function'/);
assert.match(crud, /typeof fnApi\.mount === 'function'/);
assert.match(crud, /typeof wbsApi\.mount === 'function'/);
assert.match(crud, /typeof reqApi\.load === 'function'/);
assert.match(crud, /typeof fnApi\.load === 'function'/);
assert.match(crud, /typeof wbsApi\.load === 'function'/);
assert.match(crud, /typeof reqApi\.destroy === 'function'/);
assert.match(crud, /typeof fnApi\.destroy === 'function'/);
assert.match(crud, /typeof wbsApi\.destroy === 'function'/);
assert.match(reference, /function applyInternalValue\(/);
assert.match(reference, /function closePicker\(/);
assert.match(reference, /data-stam-reference-picker-mounted/);

for (const field of [
  'requirementId', 'requirementCode', 'requirementTitle',
  'functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle',
  'wbsItemId', 'wbsItemCode', 'wbsItemTitle',
]) assert.match(crud, new RegExp(`['"]${field}['"]`));

const calls = [];
const context = vm.createContext({
  window: { STAM: { screenSpecFirestoreAdapter: {} } },
  console, Promise, Date, String, Number, Array, Object, Error,
});
context.window.window = context.window;
vm.runInContext(service, context, { filename: 'stam.screen-spec-service.js' });
const fakeAdapter = {
  listByProject(projectId, query) { calls.push(['list', projectId, query]); return Promise.resolve([]); },
  getById() { return Promise.resolve(null); },
  create(projectId, payload) { calls.push(['create', projectId, payload]); return Promise.resolve(payload); },
  update() { throw new Error('KNOWN GAP: UI update is not part of current live contract'); },
};
const svc = context.window.STAM.screenSpecServiceContract.createService({
  adapter: fakeAdapter,
  authorize() { return true; },
  clock() { return new Date('2026-08-01T00:00:00Z'); },
});
await svc.listByProject('P1', { includeDeleted: false }, {});
await svc.create('P1', {
  title: 'Contract screen', ownerId: 'u1', ownerName: 'Owner',
  requirementId: 'r1', requirementCode: 'REQ_001', requirementTitle: 'Requirement',
  functionalSpecId: 'f1', functionalSpecCode: 'FN_001', functionalSpecTitle: 'Function',
  wbsItemId: 'w1', wbsItemCode: 'WBS-001', wbsItemTitle: 'Work',
}, { actorUid: 'u1' });
assert.deepEqual(calls.map((entry) => entry[0]), ['list', 'create']);

const KNOWN_GAPS = {
  detail: /후속 PR 범위/.test(list),
  editDisabled: /ss-rec-act-edit" disabled/.test(list),
  updateUiCaller: /svc\.update\(/.test(crud),
  deleteServiceAction: /screenSpec\.delete|softDelete/.test(service),
};
assert.equal(KNOWN_GAPS.detail, true);
assert.equal(KNOWN_GAPS.editDisabled, true);
console.log('screen spec CRUD UI contract: PASS');
console.log('KNOWN GAP inventory:', JSON.stringify(KNOWN_GAPS));
