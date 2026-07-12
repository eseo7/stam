#!/usr/bin/env node
/**
 * FS-7 — Functional spec update link/unlink contract (run 29188331795 regression)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const crudPath = path.join(ROOT, 'stam/js/stam.functional-spec-firestore-crud.js');
const listPath = path.join(ROOT, 'stam/js/stam.functional-spec-firestore-list.js');
const adapterPath = path.join(ROOT, 'stam/js/stam.functional-spec-firestore-adapter.js');

const crudSource = fs.readFileSync(crudPath, 'utf8');
const listSource = fs.readFileSync(listPath, 'utf8');
const adapterSource = fs.readFileSync(adapterPath, 'utf8');

// Run 29188331795: W-05~W-08 failed because deferred prefill could overwrite picker selection.
assert.doesNotMatch(crudSource, /setTimeout\(function \(\) \{ prefillEdit\(item\); \}, 0\)/);
assert.match(crudSource, /if \(item\) prefillEdit\(item\);/);
assert.match(listSource, /crud\.prefillEdit\(item\)/);

// Shared create/update requirement mapping
assert.match(crudSource, /function applyRequirementLinkFields/);
assert.match(crudSource, /applyRequirementLinkFields\(input, getRequirementSelection\(regDrawer\), \{ omitWhenUnlinked: true \}\)/);
assert.match(crudSource, /applyRequirementLinkFields\(patch, getRequirementSelection\(editDrawer\), \{ omitWhenUnlinked: false \}\)/);

// Unlink uses explicit empty strings → adapter FieldValue.delete()
assert.match(adapterSource, /if \(next\[field\] === ''\)/);

function loadApplyRequirementLinkFields() {
  const sandbox = {
    window: { STAM: {} },
    document: {
      querySelectorAll() { return []; },
      getElementById() { return null; },
      querySelector() { return null; },
      readyState: 'complete',
      addEventListener() {},
    },
  };
  vm.runInNewContext(crudSource, sandbox);
  return sandbox.window.STAM.functionalSpecFirestoreCrud.applyRequirementLinkFields;
}

const applyRequirementLinkFields = loadApplyRequirementLinkFields();

const linkedPatch = {};
applyRequirementLinkFields(linkedPatch, {
  requirementId: 'req-b',
  requirementCode: 'REQ_002',
  requirementTitle: 'Beta',
}, { omitWhenUnlinked: false });
assert.deepEqual(linkedPatch, {
  requirementId: 'req-b',
  requirementCode: 'REQ_002',
  requirementTitle: 'Beta',
});

const unlinkPatch = { title: 'FN spec' };
applyRequirementLinkFields(unlinkPatch, {
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
}, { omitWhenUnlinked: false });
assert.deepEqual(unlinkPatch, {
  title: 'FN spec',
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
});

const createPayload = { title: 'New' };
applyRequirementLinkFields(createPayload, {
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
}, { omitWhenUnlinked: true });
assert.deepEqual(createPayload, { title: 'New' });

console.log('functional spec update link contract: PASS');
