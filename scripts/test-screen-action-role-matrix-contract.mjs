#!/usr/bin/env node
/**
 * STAM PR C — screenActions role matrix contract.
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
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-firestore-adapter.js'), 'utf8');

assert.match(rulesSource, /function isScreenActionWriter\(projectId\)/);
assert.match(adapterSource, /function deleteAction/);
assert.match(serviceSource, /DELETE: 'screenAction\.delete'/);

function loadContract() {
  const window = {};
  const context = vm.createContext({
    window, console, Date, Promise, Number, String, JSON, Array, Object, Error, Math, RegExp,
  });
  window.window = window;
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-action-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-action-service.js' });
  return window.STAM.screenActionServiceContract;
}

const contract = loadContract();
const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);

for (const row of ROLE_MATRIX) {
  assert.equal(authorize(contract.ACTIONS.READ, { context: { memberRole: row.role } }), row.read);
  assert.equal(authorize(contract.ACTIONS.CREATE, { context: { memberRole: row.role } }), row.create);
  assert.equal(authorize(contract.ACTIONS.UPDATE, { context: { memberRole: row.role } }), row.update);
  assert.equal(authorize(contract.ACTIONS.DELETE, { context: { memberRole: row.role } }), row.deleteRules);
}

assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(WRITE_ROLES));
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(READ_ROLES));

const block = rulesSource.match(/match \/screenActions\/\{actionId\} \{[\s\S]*?\n      \}/);
assert.ok(block);
assert.match(block[0], /isValidScreenActionDelete\(projectId, actionId\)/);

console.log('screen action role matrix contract: PASS');
