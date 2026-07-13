#!/usr/bin/env node
/**
 * STAM WBS-3 — Functional spec picker contract
 *
 * Usage:
 *   node scripts/test-functional-spec-picker-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const referenceSource = await readFile(path.join(ROOT, 'stam/js/stam.reference-picker.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-service.js'), 'utf8');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-picker.js'), 'utf8');
const requirementPickerSource = await readFile(path.join(ROOT, 'stam/js/stam.requirement-picker.js'), 'utf8');

assert.match(pickerSource, /STAM\.referencePicker\.create/);
assert.match(pickerSource, /functionalSpecServiceContract/);
assert.match(pickerSource, /READ_SOURCE = 'functionalSpecService\.listByProject'/);
assert.doesNotMatch(pickerSource, /firebase\.firestore/);
assert.doesNotMatch(pickerSource, /collection\(['"]functionalSpecifications['"]\)/);
assert.doesNotMatch(pickerSource, /setTimeout/);
assert.doesNotMatch(pickerSource, /DOMContentLoaded/);

const reqCopyRatio = pickerSource.length / Math.max(requirementPickerSource.length, 1);
assert.ok(reqCopyRatio < 0.85 || pickerSource.split('\n').length < requirementPickerSource.split('\n').length * 0.85,
  'functional spec picker must not be a requirement picker copy');

function createContext() {
  const window = {};
  const context = vm.createContext({
    window,
    document: {
      documentElement: { getAttribute() { return null; }, setAttribute() {} },
      addEventListener() {},
      querySelectorAll() { return []; },
    },
    console,
    Date,
    Promise,
    Number,
    String,
    JSON,
    Array,
    Object,
    Error,
    WeakMap,
    Set,
  });
  window.window = window;
  return { context, window };
}

const { context, window } = createContext();
window.__fsCalls = [];
vm.runInContext(`
  window.STAM = window.STAM || {};
  window.STAM.functionalSpecFirestoreAdapter = {
    create: function () {
      return {
        listByProject: function (projectId, query) {
          window.__fsCalls.push(['listByProject', projectId, query]);
          return Promise.resolve([
            { id: 'fn-1', projectId: projectId, code: 'FN_001', title: 'Login', isDeleted: false },
            { id: 'fn-2', projectId: projectId, code: 'FN_010', title: 'Search', isDeleted: false },
            { id: 'fn-bad', projectId: projectId, code: 'BAD', title: 'Invalid', isDeleted: false },
            { id: 'fn-del', projectId: projectId, code: 'FN_020', title: 'Deleted', isDeleted: true },
            { id: 'fn-empty', projectId: projectId, code: 'FN_030', title: '', isDeleted: false },
          ]);
        },
        create: function () { return Promise.reject(new Error('write denied')); },
        update: function () { return Promise.reject(new Error('write denied')); },
      };
    },
  };
`, context, { filename: 'adapter-shim.js' });

vm.runInContext(referenceSource, context, { filename: 'stam.reference-picker.js' });
vm.runInContext(serviceSource, context, { filename: 'stam.functional-spec-service.js' });
vm.runInContext(pickerSource, context, { filename: 'stam.functional-spec-picker.js' });

const picker = window.STAM.functionalSpecPicker;
assert.equal(picker.READ_SOURCE, 'functionalSpecService.listByProject');
['createReadService', 'listFunctionalSpecs', 'mount', 'load', 'getValue', 'setValue', 'clear', 'setDisabled', 'refreshContext', 'destroy'].forEach((name) => {
  assert.equal(typeof picker[name], 'function', name);
});

for (const role of ['owner', 'admin', 'editor', 'viewer']) {
  const items = await picker.listFunctionalSpecs('P1', { memberRole: role }, role);
  assert.ok(items.length >= 2, `${role} read allowed`);
}
for (const role of ['guest', '', 'unknown']) {
  await assert.rejects(() => picker.listFunctionalSpecs('P1', { memberRole: role }, role), /permission denied/);
}

assert.equal(window.__fsCalls[0][2].includeDeleted, false);

const listed = await picker.listFunctionalSpecs('P1', {}, 'owner');
assert.ok(listed.some((item) => item.code === 'FN_001'));
assert.ok(listed.some((item) => item.code === 'BAD'), 'service returns raw rows; picker filters on normalize');

assert.match(pickerSource, /FN_CODE_RE\.test\(code\)/);
assert.match(pickerSource, /isDeleted === true/);

assert.throws(() => picker.setValue({ getAttribute() { return null; } }, { functionalSpecId: 'x' }), /partial/);
assert.throws(() => picker.setValue({ getAttribute() { return null; } }, {
  functionalSpecId: 'fn-1',
  functionalSpecCode: 'BAD',
  functionalSpecTitle: 'T',
}), /invalid functionalSpecCode/);

const empty = picker.getValue({ getAttribute() { return '1'; }, querySelector() { return null; } });
assert.equal(empty.functionalSpecId, '');
assert.equal(empty.functionalSpecCode, '');
assert.equal(empty.functionalSpecTitle, '');

const loadPromise = picker.load;
assert.equal(typeof loadPromise, 'function');

console.log('functional spec picker contract: PASS');
