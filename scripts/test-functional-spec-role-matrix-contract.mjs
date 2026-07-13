#!/usr/bin/env node
/**
 * STAM FS-3 — Functional Specification role matrix smoke QA helper (contract only)
 *
 * Verifies FS-1 functionalSpecifications write rules align with FS-2 service
 * authorize skeleton across owner / admin / editor / viewer / guest / empty / unknown.
 *
 * NOT product runtime. No Firestore emulator or Admin SDK required.
 * Complements scripts/test-functional-spec-rules-contract.mjs (rules structure)
 * and scripts/test-functional-spec-service-contract.mjs (service behavior).
 *
 * Usage:
 *   node scripts/test-functional-spec-role-matrix-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const WRITE_ROLES = ['owner', 'admin', 'editor'];
const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

const ROLE_MATRIX = [
  { role: 'owner', read: true, create: true, update: true, deleteRules: false },
  { role: 'admin', read: true, create: true, update: true, deleteRules: false },
  { role: 'editor', read: true, create: true, update: true, deleteRules: false },
  { role: 'viewer', read: true, create: false, update: false, deleteRules: false },
  { role: 'guest', read: false, create: false, update: false, deleteRules: false },
  { role: '', read: false, create: false, update: false, deleteRules: false },
  { role: 'unknown', read: false, create: false, update: false, deleteRules: false },
];

const OTHER_ARTIFACT_COLLECTIONS = [
  'screenSpecs',
  'screenFields',
  'screenActions',
  'artifactLinks',
];

const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-adapter.js'), 'utf8');

assert.doesNotMatch(serviceSource, /DELETE:\s*'functionalSpec\.delete'/);
assert.equal(/function\s+delete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+softDelete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+remove\s*\(/.test(serviceSource), false);
assert.equal(/function\s+delete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+softDelete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+remove\s*\(/.test(adapterSource), false);

function loadServiceContract() {
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
  });
  window.window = window;
  vm.runInContext(serviceSource, context, { filename: 'stam.functional-spec-service.js' });
  return {
    contract: window.STAM.functionalSpecServiceContract,
    runtimeService: window.STAM.functionalSpecService,
  };
}

function createFakeAdapter() {
  const store = new Map();

  return {
    calls: [],
    listByProject(projectId) {
      this.calls.push(['listByProject', projectId]);
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId));
    },
    getById(projectId, functionalSpecId) {
      this.calls.push(['getById', projectId, functionalSpecId]);
      const item = store.get(functionalSpecId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, functionalSpec) {
      this.calls.push(['create', projectId, functionalSpec]);
      const next = { ...functionalSpec, id: functionalSpec.id || 'FN-NEW' };
      store.set(next.id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, functionalSpecId, patch) {
      this.calls.push(['update', projectId, functionalSpecId, patch]);
      const current = store.get(functionalSpecId) || {
        id: functionalSpecId,
        projectId,
        title: 'Seed',
        status: 'draft',
        priority: 'mid',
        version: 1,
        isDeleted: false,
      };
      const next = { ...current, ...patch };
      store.set(functionalSpecId, next);
      return Promise.resolve({ ...next });
    },
  };
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function printMatrixEvidence(rows) {
  const header = [
    pad('role', 8),
    pad('read', 6),
    pad('create', 8),
    pad('update', 8),
    pad('delete rules', 12),
    pad('delete action', 13),
    'status',
  ].join(' | ');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const row of rows) {
    console.log([
      pad(row.role || '(empty)', 8),
      pad(row.read ? 'allow' : 'deny', 6),
      pad(row.create ? 'allow' : 'deny', 8),
      pad(row.update ? 'allow' : 'deny', 8),
      pad(row.deleteRules ? 'allow' : 'deny', 12),
      pad(row.deleteAction, 13),
      row.status,
    ].join(' | '));
  }
}

// ── Firestore rules: writer roles and delete deny ─────────────────
assert.match(rulesSource, /function isFunctionalSpecWriter\(projectId\)/);
assert.match(rulesSource, /return isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /function isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /memberRole\(projectId\) == "owner"/);
assert.match(rulesSource, /memberRole\(projectId\) == "admin"/);
assert.match(rulesSource, /memberRole\(projectId\) == "editor"/);
assert.doesNotMatch(
  rulesSource,
  /function isFunctionalSpecWriter\(projectId\)[\s\S]*memberRole\(projectId\) == "viewer"/,
  'viewer must not be treated as a functional spec writer in rules',
);

const functionalSpecBlock = rulesSource.match(
  /match \/functionalSpecifications\/\{functionalSpecId\} \{[\s\S]*?\n      \}/,
);
assert.ok(functionalSpecBlock, 'functionalSpecifications match block must exist');
assert.match(functionalSpecBlock[0], /allow get, list: if canReadProject\(projectId\);/);
assert.match(functionalSpecBlock[0], /allow create: if isValidFunctionalSpecCreate\(projectId, functionalSpecId\);/);
assert.match(functionalSpecBlock[0], /allow update: if isValidFunctionalSpecUpdate\(projectId, functionalSpecId\);/);
assert.match(functionalSpecBlock[0], /allow delete: if false;/);

for (const collection of OTHER_ARTIFACT_COLLECTIONS) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

// ── Service contract: ACTIONS and matrix rows ────────────────────
const { contract, runtimeService } = loadServiceContract();
const ACTIONS = contract.ACTIONS;

assert.deepEqual(Object.keys(ACTIONS).sort(), ['CREATE', 'READ', 'UPDATE']);
assert.equal(ACTIONS.READ, 'functionalSpec.read');
assert.equal(ACTIONS.CREATE, 'functionalSpec.create');
assert.equal(ACTIONS.UPDATE, 'functionalSpec.update');
assert.equal('DELETE' in ACTIONS, false);
assert.equal(ACTIONS.DELETE, undefined);

assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(WRITE_ROLES));
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(READ_ROLES));

const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
const evidenceRows = [];

for (const row of ROLE_MATRIX) {
  const read = authorize(ACTIONS.READ, { context: { memberRole: row.role } });
  const create = authorize(ACTIONS.CREATE, { context: { memberRole: row.role } });
  const update = authorize(ACTIONS.UPDATE, { context: { memberRole: row.role } });
  const deleteAction = authorize('functionalSpec.delete', { context: { memberRole: row.role } });

  assert.equal(read, row.read, `${row.role || '(empty)'} read`);
  assert.equal(create, row.create, `${row.role || '(empty)'} create`);
  assert.equal(update, row.update, `${row.role || '(empty)'} update`);
  assert.equal(deleteAction, false, `${row.role || '(empty)'} delete action must not exist / always deny`);

  assert.equal(contract.canReadFunctionalSpecs(row.role), row.read);
  assert.equal(contract.canWriteFunctionalSpecs(row.role), row.create && row.update);

  evidenceRows.push({
    role: row.role,
    read: row.read,
    create: row.create,
    update: row.update,
    deleteRules: row.deleteRules,
    deleteAction: '없음',
    status: 'PASS',
  });
}

for (const role of WRITE_ROLES) {
  assert.equal(authorize(ACTIONS.CREATE, { context: { memberRole: role } }), true);
  assert.equal(authorize(ACTIONS.UPDATE, { context: { memberRole: role } }), true);
  assert.equal(authorize('functionalSpec.delete', { context: { memberRole: role } }), false);
}

assert.equal(authorize(ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(authorize(ACTIONS.CREATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize(ACTIONS.UPDATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize('functionalSpec.delete', { context: { memberRole: 'viewer' } }), false);

// ── Service runtime: viewer write deny, writer create/update allow ─
const adapter = createFakeAdapter();
const roleBoundService = contract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize,
});

for (const method of ['delete', 'softDelete', 'remove']) {
  assert.equal(typeof roleBoundService[method], 'undefined', `role-bound service must not expose ${method}`);
  assert.equal(typeof runtimeService[method], 'undefined', `runtime service must not expose ${method}`);
}

for (const role of WRITE_ROLES) {
  const created = await roleBoundService.create('P-FS3', { title: `Create as ${role}` }, {
    memberRole: role,
    actorUid: `${role}-uid`,
    actorName: role,
  });
  assert.equal(created.title, `Create as ${role}`);
  assert.equal(created.version, 1);

  const updated = await roleBoundService.update('P-FS3', created.id, {
    title: `Update as ${role}`,
  }, {
    memberRole: role,
    actorUid: `${role}-uid`,
  });
  assert.equal(updated.title, `Update as ${role}`);
  assert.equal(updated.version, 2);
}

await assert.rejects(
  () => roleBoundService.create('P-FS3', { title: 'Viewer blocked' }, { memberRole: 'viewer' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.update('P-FS3', 'FN-VIEWER', { title: 'Viewer blocked' }, { memberRole: 'viewer' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.listByProject('P-FS3', {}, { memberRole: 'guest' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.create('P-FS3', { title: 'Unknown blocked' }, { memberRole: 'unknown' }),
  /permission denied/,
);

// Default runtime service is deny-by-default until UI wiring rebinds with role authorize.
assert.equal(typeof contract.createService, 'function');
assert.equal(typeof runtimeService.create, 'function');
await assert.rejects(
  () => runtimeService.listByProject('P-FS3', {}, { memberRole: 'owner' }),
  /permission denied/,
);
await assert.rejects(
  () => runtimeService.create('P-FS3', { title: 'Blocked default runtime' }, { memberRole: 'owner' }),
  /permission denied/,
);

console.log('\nfunctional spec role matrix (FS-1 rules + FS-2 service contract evidence):');
printMatrixEvidence(evidenceRows);
console.log('\nother artifact collections write-closed:', OTHER_ARTIFACT_COLLECTIONS.join(', '));
console.log('functional spec role matrix contract: PASS');
