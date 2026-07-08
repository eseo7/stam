#!/usr/bin/env node
/**
 * STAM PR #359 — Requirements role matrix smoke QA helper (contract only)
 *
 * Verifies PR #358 role-scoped requirements write rules align with the
 * service authorize skeleton across owner / admin / editor / viewer.
 *
 * NOT product runtime. No Firestore emulator or Admin SDK required.
 * Complements scripts/test-requirements-rules-contract.mjs (rules structure)
 * and scripts/test-requirements-service-contract.mjs (service behavior).
 *
 * Usage:
 *   node scripts/test-requirements-role-matrix-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const ACTIONS = {
  READ: 'requirement.read',
  CREATE: 'requirement.create',
  UPDATE: 'requirement.update',
  DELETE: 'requirement.delete',
};

const WRITE_ROLES = ['owner', 'admin', 'editor'];
const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

const ROLE_MATRIX = [
  { role: 'owner', read: true, create: true, update: true, delete: false },
  { role: 'admin', read: true, create: true, update: true, delete: false },
  { role: 'editor', read: true, create: true, update: true, delete: false },
  { role: 'viewer', read: true, create: false, update: false, delete: false },
  { role: 'guest', read: false, create: false, update: false, delete: false },
  { role: '', read: false, create: false, update: false, delete: false },
];

const OTHER_ARTIFACT_COLLECTIONS = [
  'wbsItems',
  'screenSpecs',
  'screenFields',
  'screenActions',
  'artifactLinks',
];

const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-service.js'), 'utf8');

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
  vm.runInContext(serviceSource, context, { filename: 'stam.requirements-service.js' });
  return {
    contract: window.STAM.requirementsServiceContract,
    runtimeService: window.STAM.requirementsService,
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
    getById(projectId, requirementId) {
      this.calls.push(['getById', projectId, requirementId]);
      const item = store.get(requirementId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, requirement) {
      this.calls.push(['create', projectId, requirement]);
      const next = { ...requirement, id: requirement.id || 'REQ-NEW' };
      store.set(next.id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, requirementId, patch) {
      this.calls.push(['update', projectId, requirementId, patch]);
      const current = store.get(requirementId) || {
        id: requirementId,
        projectId,
        title: 'Seed',
        status: 'draft',
        priority: 'normal',
        version: 1,
        isDeleted: false,
      };
      const next = { ...current, ...patch };
      store.set(requirementId, next);
      return Promise.resolve({ ...next });
    },
    softDelete(projectId, requirementId, patch) {
      this.calls.push(['softDelete', projectId, requirementId, patch]);
      return this.update(projectId, requirementId, patch);
    },
  };
}

function expectedAuthorize(role, action) {
  const row = ROLE_MATRIX.find((entry) => entry.role === role);
  assert.ok(row, `missing matrix row for role=${role}`);
  switch (action) {
    case ACTIONS.READ:
      return row.read;
    case ACTIONS.CREATE:
      return row.create;
    case ACTIONS.UPDATE:
      return row.update;
    case ACTIONS.DELETE:
      return row.delete;
    default:
      return false;
  }
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
    pad('delete', 8),
    'rules+service',
  ].join(' | ');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const row of rows) {
    console.log([
      pad(row.role || '(empty)', 8),
      pad(row.read ? 'allow' : 'deny', 6),
      pad(row.create ? 'allow' : 'deny', 8),
      pad(row.update ? 'allow' : 'deny', 8),
      pad(row.delete ? 'allow' : 'deny', 8),
      row.status,
    ].join(' | '));
  }
}

// ── Firestore rules: writer roles and delete deny ─────────────────
assert.match(rulesSource, /function isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /memberRole\(projectId\) == "owner"/);
assert.match(rulesSource, /memberRole\(projectId\) == "admin"/);
assert.match(rulesSource, /memberRole\(projectId\) == "editor"/);
assert.doesNotMatch(
  rulesSource,
  /memberRole\(projectId\) == "viewer"/,
  'viewer must not be treated as a requirement writer in rules',
);

const requirementsBlock = rulesSource.match(
  /match \/requirements\/\{requirementId\} \{[\s\S]*?\n      \}/,
);
assert.ok(requirementsBlock, 'requirements match block must exist');
assert.match(requirementsBlock[0], /allow get, list: if canReadProject\(projectId\);/);
assert.match(requirementsBlock[0], /allow create: if isValidRequirementCreate\(projectId, requirementId\);/);
assert.match(requirementsBlock[0], /allow update: if isValidRequirementUpdate\(projectId, requirementId\);/);
assert.match(requirementsBlock[0], /allow delete: if false;/);

for (const collection of OTHER_ARTIFACT_COLLECTIONS) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

// ── Service contract: matrix rows ────────────────────────────────
const { contract, runtimeService } = loadServiceContract();
assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(WRITE_ROLES));
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(READ_ROLES));

const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
const evidenceRows = [];

for (const row of ROLE_MATRIX) {
  const read = authorize(ACTIONS.READ, { context: { memberRole: row.role } });
  const create = authorize(ACTIONS.CREATE, { context: { memberRole: row.role } });
  const update = authorize(ACTIONS.UPDATE, { context: { memberRole: row.role } });
  const del = authorize(ACTIONS.DELETE, { context: { memberRole: row.role } });

  assert.equal(read, row.read, `${row.role || '(empty)'} read`);
  assert.equal(create, row.create, `${row.role || '(empty)'} create`);
  assert.equal(update, row.update, `${row.update ? 'allow' : 'deny'} ${row.role || '(empty)'} update`);
  assert.equal(del, row.delete, `${row.role || '(empty)'} delete`);

  assert.equal(contract.canReadRequirements(row.role), row.read);
  assert.equal(contract.canWriteRequirements(row.role), row.create && row.update);

  evidenceRows.push({
    role: row.role,
    read: row.read,
    create: row.create,
    update: row.update,
    delete: row.delete,
    status: 'PASS',
  });
}

for (const role of WRITE_ROLES) {
  assert.equal(expectedAuthorize(role, ACTIONS.CREATE), true);
  assert.equal(expectedAuthorize(role, ACTIONS.UPDATE), true);
  assert.equal(expectedAuthorize(role, ACTIONS.DELETE), false);
}

assert.equal(expectedAuthorize('viewer', ACTIONS.READ), true);
assert.equal(expectedAuthorize('viewer', ACTIONS.CREATE), false);
assert.equal(expectedAuthorize('viewer', ACTIONS.UPDATE), false);
assert.equal(expectedAuthorize('viewer', ACTIONS.DELETE), false);

// ── Service runtime: viewer write deny, writer create/update allow ─
const adapter = createFakeAdapter();
const roleBoundService = contract.createService({
  adapter,
  clock: () => '2026-07-08T00:00:00.000Z',
  authorize,
});

for (const role of WRITE_ROLES) {
  const created = await roleBoundService.create('P359', { title: `Create as ${role}` }, {
    memberRole: role,
    actorUid: `${role}-uid`,
    actorName: role,
  });
  assert.equal(created.title, `Create as ${role}`);
  assert.equal(created.version, 1);

  const updated = await roleBoundService.update('P359', created.id, {
    title: `Update as ${role}`,
  }, {
    memberRole: role,
    actorUid: `${role}-uid`,
  });
  assert.equal(updated.title, `Update as ${role}`);
  assert.equal(updated.version, 2);
}

await assert.rejects(
  () => roleBoundService.create('P359', { title: 'Viewer blocked' }, { memberRole: 'viewer' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.update('P359', 'REQ-VIEWER', { title: 'Viewer blocked' }, { memberRole: 'viewer' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.softDelete('P359', 'REQ-DELETE', 'blocked', { memberRole: 'owner' }),
  /permission denied/,
);

// Default runtime service remains allow-all until UI wiring lands.
assert.equal(typeof contract.createService, 'function');
assert.equal(typeof runtimeService.create, 'function');

console.log('\nrequirements role matrix (PR #358 contract evidence):');
printMatrixEvidence(evidenceRows);
console.log('\nother artifact collections write-closed:', OTHER_ARTIFACT_COLLECTIONS.join(', '));
console.log('requirements role matrix contract: PASS');
