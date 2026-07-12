#!/usr/bin/env node
/**
 * STAM FS-6B — Requirement picker contract
 *
 * Usage:
 *   node scripts/test-requirement-picker-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.requirement-picker.js'), 'utf8');
const requirementsServiceSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-service.js'), 'utf8');
const requirementsAdapterSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-firestore-adapter.js'), 'utf8');
const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-crud.js'), 'utf8');
const pageSource = await readFile(path.join(ROOT, 'stam/pages/boards/functional-specification.html'), 'utf8');

assert.match(pickerSource, /window\.STAM\.requirementPicker/);
assert.match(pickerSource, /READ_SOURCE = 'requirementsService\.listByProject'/);
assert.match(pickerSource, /formatOptionLabel/);
assert.match(pickerSource, /createReadService/);
assert.match(pickerSource, /listRequirements/);
assert.match(pickerSource, /requirementsServiceContract/);
assert.doesNotMatch(pickerSource, /requirementsFirestoreList/);
assert.doesNotMatch(pickerSource, /collection\(['"]requirements['"]\)/);
assert.doesNotMatch(pickerSource, /firestore\(\)/);

assert.match(requirementsServiceSource, /function listByProject\(projectId, query, context\)/);
assert.match(requirementsAdapterSource, /function listByProject\(projectId, query\)/);

assert.match(crudSource, /requirementPickerApi/);
assert.match(crudSource, /getRequirementSelection/);
assert.match(crudSource, /setRequirementSelection/);
assert.match(crudSource, /applyRequirementLinkFields/);
assert.match(crudSource, /var rcode = clean\(req\.requirementCode\)/);
assert.match(crudSource, /var rtitle = clean\(req\.requirementTitle\)/);
assert.match(crudSource, /payload\.requirementCode = rcode/);
assert.match(crudSource, /payload\.requirementTitle = rtitle/);
assert.doesNotMatch(crudSource, /getVal\(regDrawer, '연결 요구사항'\)/);
assert.doesNotMatch(crudSource, /getVal\(editDrawer, '연결 요구사항'\)/);
assert.equal(/collection\(['"]requirements['"]\)/.test(crudSource), false);

assert.match(pageSource, /stam\.requirement-picker\.js/);
assert.match(pageSource, /stam\.requirements-service\.js/);
assert.match(pageSource, /stam\.requirements-firestore-adapter\.js/);
assert.doesNotMatch(pageSource, /stam\.requirements-firestore-list\.js/);
assert.match(pageSource, /data-stam-requirement-picker/);
assert.doesNotMatch(pageSource, /placeholder="요구사항 ID 입력/);

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
  });
  window.window = window;
  return { context, window };
}

const { context, window } = createContext();
window.__adapterCalls = [];
vm.runInContext(`
  window.STAM = window.STAM || {};
  window.STAM.requirementsFirestoreAdapter = {
    create: function createFakeRequirementsAdapter() {
      return {
        listByProject: function (projectId) {
          window.__adapterCalls.push(['listByProject', projectId]);
          return Promise.resolve([
            { id: 'req-1', projectId: projectId, code: 'REQ_001', title: 'Alpha requirement', isDeleted: false },
            { id: 'req-2', projectId: projectId, code: 'REQ_002', title: 'Beta requirement', isDeleted: false },
          ]);
        },
        getById: function (projectId, requirementId) {
          window.__adapterCalls.push(['getById', projectId, requirementId]);
          return Promise.resolve({ id: requirementId, projectId: projectId, code: 'REQ_001', title: 'Alpha requirement' });
        },
        create: function () { return Promise.reject(new Error('write denied')); },
        update: function () { return Promise.reject(new Error('write denied')); },
      };
    },
  };
`, context, { filename: 'adapter-shim.js' });
vm.runInContext(requirementsServiceSource, context, { filename: 'stam.requirements-service.js' });
vm.runInContext(pickerSource, context, { filename: 'stam.requirement-picker.js' });

const picker = window.STAM.requirementPicker;
assert.equal(picker.READ_SOURCE, 'requirementsService.listByProject');
assert.equal(picker.formatOptionLabel({ code: 'REQ_001', title: 'Alpha' }), 'REQ_001 · Alpha');
assert.equal(picker.formatRequirementCode({ id: 'raw-doc-id', title: 'Alpha' }), '');
assert.equal(picker.formatRequirementCode({ code: 'REQ_001', id: 'raw-doc-id' }), 'REQ_001');
assert.match(pickerSource, /liveContextProviders/);
assert.match(pickerSource, /function applyLiveContext\(container\)/);
assert.match(pickerSource, /function formatLoadError\(err\)/);
assert.match(pickerSource, /state\.loadError/);
assert.doesNotMatch(pickerSource, /item\.requirementId \|\| item\.id/);
assert.match(pickerSource, /event\.stopPropagation\(\)/);

const items = await picker.listRequirements('P1', { source: 'contract' }, 'owner');
assert.equal(items.length, 2);
assert.equal(window.__adapterCalls[0][0], 'listByProject');
assert.equal(window.__adapterCalls[0][1], 'P1');

console.log('requirement picker contract: PASS');
