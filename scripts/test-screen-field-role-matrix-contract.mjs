#!/usr/bin/env node
/**
 * STAM PR B — screenFields role matrix contract.
 *
 * Usage:
 *   node scripts/test-screen-field-role-matrix-contract.mjs
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
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-firestore-adapter.js'), 'utf8');

assert.match(rulesSource, /function isScreenFieldWriter\(projectId\)/);
assert.match(adapterSource, /function deleteField/);
assert.match(serviceSource, /DELETE: 'screenField\.delete'/);

function loadContract() {
  const window = {};
  const context = vm.createContext({
    window,
    console,
    Date,
    Promise,
    Number,
    String,
    JSON,
    Array,
    Object,
    Error,
    Math,
    RegExp,
  });
  window.window = window;
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-field-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-field-service.js' });
  return window.STAM.screenFieldServiceContract;
}

const contract = loadContract();
const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);

for (const row of ROLE_MATRIX) {
  const read = authorize(contract.ACTIONS.READ, { context: { memberRole: row.role } });
  const create = authorize(contract.ACTIONS.CREATE, { context: { memberRole: row.role } });
  const update = authorize(contract.ACTIONS.UPDATE, { context: { memberRole: row.role } });
  const del = authorize(contract.ACTIONS.DELETE, { context: { memberRole: row.role } });
  assert.equal(read, row.read, `${row.role || '(empty)'} read`);
  assert.equal(create, row.create, `${row.role || '(empty)'} create`);
  assert.equal(update, row.update, `${row.role || '(empty)'} update`);
  assert.equal(del, row.deleteRules, `${row.role || '(empty)'} delete`);
}

assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(WRITE_ROLES));
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(READ_ROLES));

const screenFieldBlock = rulesSource.match(
  /match \/screenFields\/\{fieldId\} \{[\s\S]*?\n      \}/,
);
assert.ok(screenFieldBlock);
assert.match(screenFieldBlock[0], /isValidScreenFieldDelete\(projectId, fieldId\)/);

console.log('screen field role matrix contract: PASS');
