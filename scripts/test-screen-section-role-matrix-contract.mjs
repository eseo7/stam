#!/usr/bin/env node
/**
 * STAM PR D1 — screenSections role matrix contract.
 *
 * Usage:
 *   node scripts/test-screen-section-role-matrix-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WRITE_ROLES = ['owner', 'admin', 'editor'];
const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

const ROLE_MATRIX = [
  { role: 'owner', read: true, create: true, update: true, deleteRules: true },
  { role: 'admin', read: true, create: true, update: true, deleteRules: true },
  { role: 'editor', read: true, create: true, update: true, deleteRules: true },
  { role: 'viewer', read: true, create: false, update: false, deleteRules: false },
  { role: 'guest', read: false, create: false, update: false, deleteRules: false },
  { role: '', read: false, create: false, update: false, deleteRules: false },
];

const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const conditionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-condition-contract.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-section-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-section-firestore-adapter.js'), 'utf8');

assert.match(rulesSource, /function isScreenSectionWriter\(projectId\)/);
assert.match(adapterSource, /function deleteSection/);
assert.match(serviceSource, /DELETE: 'screenSection\.delete'/);

function loadContract() {
  const window = {};
  const context = vm.createContext({
    window, console, Date, Promise, Number, String, JSON, Array, Object, Error, Math, RegExp,
  });
  window.window = window;
  vm.runInContext(conditionSource, context, { filename: 'stam.screen-condition-contract.js' });
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-section-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-section-service.js' });
  return window.STAM.screenSectionServiceContract;
}

const contract = loadContract();
const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);

let testCount = 0;
for (const row of ROLE_MATRIX) {
  testCount += 1;
  assert.equal(authorize(contract.ACTIONS.READ, { context: { memberRole: row.role } }), row.read, `read:${row.role}`);
  assert.equal(authorize(contract.ACTIONS.CREATE, { context: { memberRole: row.role } }), row.create, `create:${row.role}`);
  assert.equal(authorize(contract.ACTIONS.UPDATE, { context: { memberRole: row.role } }), row.update, `update:${row.role}`);
  assert.equal(authorize(contract.ACTIONS.DELETE, { context: { memberRole: row.role } }), row.deleteRules, `delete:${row.role}`);
}

testCount += 1;
assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(WRITE_ROLES));

testCount += 1;
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(READ_ROLES));

const block = rulesSource.match(/match \/screenSections\/\{sectionId\} \{[\s\S]*?\n      \}/);
assert.ok(block);
testCount += 1;
assert.match(block[0], /isValidScreenSectionDelete\(projectId, sectionId\)/);

testCount += 1;
assert.match(rulesSource, /function isScreenSectionWriter\(projectId\)[\s\S]*?return isScreenSpecWriter\(projectId\)/);

console.log(`screen section role matrix contract (${testCount} cases): PASS`);
