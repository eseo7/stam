#!/usr/bin/env node
/**
 * STAM ScreenSpec Firestore list/register + picker wiring contract
 *
 * Usage:
 *   node scripts/test-screen-spec-firestore-wiring-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');

const html = await readFile(path.join(ROOT, 'stam/pages/boards/screen-specification.html'), 'utf8');

const LIVE_JS = [
  'stam/js/stam.reference-picker.js',
  'stam/js/stam.requirement-picker.js',
  'stam/js/stam.functional-spec-picker.js',
  'stam/js/stam.wbs-picker.js',
  'stam/js/stam.requirements-service.js',
  'stam/js/stam.functional-spec-service.js',
  'stam/js/stam.wbs-service.js',
  'stam/js/stam.screen-spec-service.js',
  'stam/js/stam.screen-spec-firestore-list.js',
  'stam/js/stam.screen-spec-firestore-crud.js',
];

for (const rel of LIVE_JS) {
  await access(path.join(ROOT, rel));
}

const HOOKS = [
  'data-stam-screen-spec-live="true"',
  'data-stam-screen-spec-link-slot="requirement"',
  'data-stam-screen-spec-link-slot="functionalSpec"',
  'data-stam-screen-spec-link-slot="wbs"',
  'data-stam-requirement-picker',
  'data-stam-functional-spec-picker',
  'data-stam-wbs-picker',
  'stam.screen-spec-firestore-list.js',
  'stam.screen-spec-firestore-crud.js',
];

for (const hook of HOOKS) {
  assert.match(html, new RegExp(hook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${hook} in HTML`);
}

assert.doesNotMatch(html, /stam\.screen-specification-cycle\.js/);
assert.doesNotMatch(html, /stam\.screen-specification-crud\.js/);
assert.doesNotMatch(html, /stam\.local-core-db\.js/);
assert.doesNotMatch(html, /id="ssv2-f-req"/);
assert.doesNotMatch(html, /id="ssv2-f-fun"/);
assert.doesNotMatch(html, /id="ssv2-f-wbs"/);

assert.match(html, /stam\.custom-select\.css/);
assert.match(html, /stam\.screen-spec-firestore-adapter\.js/);

const listSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-firestore-list.js'), 'utf8');
const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-firestore-crud.js'), 'utf8');
const specSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-specification.js'), 'utf8');

assert.doesNotMatch(specSource, /var MENUS\s*=/);
assert.doesNotMatch(specSource, /var ALL_SCREENS\s*=/);
assert.doesNotMatch(specSource, /\bMENUS\b/);
assert.doesNotMatch(specSource, /\bALL_SCREENS\b/);
assert.doesNotMatch(specSource, /ALL_SCREENS\.length/);
assert.match(specSource, /screenSpecFirestoreList/);
assert.doesNotMatch(listSource, /MENUS|ALL_SCREENS/);

assert.doesNotMatch(crudSource, /\.collection\(/);
assert.match(listSource, /countFilteredItems/);
assert.match(listSource, /screenSpecService\.listByProject|svc\.listByProject/);
assert.doesNotMatch(listSource, /screenSpecs/);
assert.match(crudSource, /screenSpecService\.create|svc\.create/);
assert.match(crudSource, /requirementPicker/);
assert.match(crudSource, /functionalSpecPicker/);
assert.match(crudSource, /wbsPicker/);
assert.match(crudSource, /trackPickerLoad|validatePickerLoads/);
assert.match(crudSource, /validateLinkSelections/);
assert.match(crudSource, /ownerDisplayName/);
assert.match(crudSource, /wbsItemId/);
assert.match(crudSource, /functionalSpecId/);
assert.match(crudSource, /requirementId/);
assert.doesNotMatch(crudSource, /functionId/);
assert.doesNotMatch(crudSource, /wbsId[^e]/);

function createDom() {
  const document = {
    querySelector(sel) {
      if (sel === '[data-stam-screen-spec-live="true"]') return { getAttribute: () => 'true' };
      return null;
    },
    readyState: 'complete',
    addEventListener() {},
  };
  return { document };
}

const dom = createDom();
const window = {};
const context = vm.createContext({
  window,
  document: dom.document,
  console,
  Date,
  Promise,
  Number,
  String,
  JSON,
  Array,
  Object,
  Error,
  sessionStorage: { getItem: () => '', setItem() {} },
  localStorage: { getItem: () => '', setItem() {} },
  location: { replace() {}, search: '' },
  URLSearchParams: class {
    constructor() { this._m = new Map(); }
    get(k) { return this._m.get(k); }
  },
});
window.window = window;
window.STAM = window.STAM || {};

const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-service.js'), 'utf8');
vm.runInContext(serviceSource, context, { filename: 'stam.screen-spec-service.js' });

const contract = window.STAM.screenSpecServiceContract;
const payload = contract.buildCreatePayload({
  title: '로그인 화면',
  ownerId: 'user-1',
  ownerName: '김담당',
  requirementId: 'req-1',
  requirementCode: 'REQ_001',
  requirementTitle: '로그인',
  functionalSpecId: 'fn-1',
  functionalSpecCode: 'FN_001',
  functionalSpecTitle: '로그인 처리',
  wbsItemId: 'wbs-1',
  wbsItemCode: 'WBS-001',
  wbsItemTitle: '로그인 구현',
}, {
  projectId: 'P1',
  actorUid: 'user-1',
});

assert.equal(payload.requirementId, 'req-1');
assert.equal(payload.functionalSpecId, 'fn-1');
assert.equal(payload.wbsItemId, 'wbs-1');
assert.equal(payload.projectId, 'P1');

console.log('screen spec firestore wiring contract: PASS');
