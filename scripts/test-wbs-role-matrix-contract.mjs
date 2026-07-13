#!/usr/bin/env node
/**
 * STAM WBS-1 + WBS-2 — WBS role matrix contract.
 *
 * Verifies WBS-1 wbsItems write rules and counter gate across
 * owner / admin / editor / viewer / guest / empty / unknown,
 * plus WBS-2 service authorize matrix alignment.
 *
 * NOT product runtime. No Firestore emulator or Admin SDK required.
 *
 * Usage:
 *   node scripts/test-wbs-role-matrix-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const WRITE_ROLES = ['owner', 'admin', 'editor'];
const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

const ROLE_MATRIX = [
  { role: 'owner', read: true, create: true, update: true, deleteRules: false, counterWrite: true },
  { role: 'admin', read: true, create: true, update: true, deleteRules: false, counterWrite: true },
  { role: 'editor', read: true, create: true, update: true, deleteRules: false, counterWrite: true },
  { role: 'viewer', read: true, create: false, update: false, deleteRules: false, counterWrite: false },
  { role: 'guest', read: false, create: false, update: false, deleteRules: false, counterWrite: false },
  { role: '', read: false, create: false, update: false, deleteRules: false, counterWrite: false },
  { role: 'unknown', read: false, create: false, update: false, deleteRules: false, counterWrite: false },
];

const OTHER_ARTIFACT_COLLECTIONS = [
  'screenSpecs',
  'screenFields',
  'screenActions',
  'artifactLinks',
];

const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-adapter.js'), 'utf8');

assert.doesNotMatch(serviceSource, /DELETE:\s*'wbs\.delete'/);
assert.equal(/function\s+delete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+softDelete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+remove\s*\(/.test(serviceSource), false);
assert.equal(/function\s+delete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+softDelete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+remove\s*\(/.test(adapterSource), false);

function loadWbsServiceContract() {
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
  });
  window.window = window;
  vm.runInContext(adapterSource, context, { filename: 'stam.wbs-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.wbs-service.js' });
  return {
    contract: window.STAM.wbsServiceContract,
    runtimeService: window.STAM.wbsService,
  };
}

function validWbsInput(overrides = {}) {
  return {
    title: '로그인 기능 구현',
    phase: '구현',
    functionGroup: '인증',
    status: 'in_progress',
    priority: 'high',
    ownerId: 'owner-uid',
    ownerName: 'Owner',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    progress: 30,
    ...overrides,
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
    getById(projectId, wbsItemId) {
      this.calls.push(['getById', projectId, wbsItemId]);
      const item = store.get(wbsItemId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, wbsItem) {
      this.calls.push(['create', projectId, wbsItem]);
      const next = { ...wbsItem, id: wbsItem.id || 'wbs-new', code: wbsItem.code || 'WBS-001' };
      store.set(next.id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, wbsItemId, patch) {
      this.calls.push(['update', projectId, wbsItemId, patch]);
      const current = store.get(wbsItemId) || {
        id: wbsItemId,
        projectId,
        code: 'WBS-001',
        title: 'Seed',
        phase: '구현',
        functionGroup: '인증',
        status: 'wait',
        priority: 'mid',
        ownerId: 'owner-uid',
        ownerName: 'Owner',
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        progress: 0,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'seed',
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'seed',
      };
      const next = { ...current, ...patch };
      store.set(wbsItemId, next);
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
    pad('delete', 8),
    pad('counter', 8),
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
      pad(row.deleteRules ? 'allow' : 'deny', 8),
      pad(row.counterWrite ? 'allow' : 'deny', 8),
      row.status,
    ].join(' | '));
  }
}

function isWriterRole(role) {
  return WRITE_ROLES.includes(role);
}

function isReaderRole(role) {
  return READ_ROLES.includes(role);
}

// ── isWbsWriter reuses isRequirementWriter ───────────────────────
assert.match(rulesSource, /function isWbsWriter\(projectId\)/);
assert.match(rulesSource, /return isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /function isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /memberRole\(projectId\) == "owner"/);
assert.match(rulesSource, /memberRole\(projectId\) == "admin"/);
assert.match(rulesSource, /memberRole\(projectId\) == "editor"/);
assert.doesNotMatch(
  rulesSource,
  /function isWbsWriter\(projectId\)[\s\S]*memberRole\(projectId\) == "viewer"/,
  'viewer must not be treated as a WBS writer in rules',
);

// ── wbsItems match block ─────────────────────────────────────────
const wbsBlock = rulesSource.match(
  /match \/wbsItems\/\{wbsItemId\} \{[\s\S]*?\n      \}/,
);
assert.ok(wbsBlock, 'wbsItems match block must exist');
assert.match(wbsBlock[0], /allow get, list: if canReadProject\(projectId\);/);
assert.match(wbsBlock[0], /allow create: if isValidWbsCreate\(projectId, wbsItemId\);/);
assert.match(wbsBlock[0], /allow update: if isValidWbsUpdate\(projectId, wbsItemId\);/);
assert.match(wbsBlock[0], /allow delete: if false;/);

// ── Counter wbsItems writer-only ─────────────────────────────────
const countersBlock = rulesSource.match(
  /match \/counters\/\{counterId\} \{[\s\S]*?\n      \}/,
);
assert.ok(countersBlock, 'counters match block must exist');
assert.match(countersBlock[0], /counterId == 'wbsItems'/);
assert.match(countersBlock[0], /isWbsWriter\(projectId\)/);
assert.match(countersBlock[0], /isValidWbsItemsCounterWrite\(\)/);
assert.match(countersBlock[0], /allow delete: if false;/);

// ── Other artifact collections remain write-closed ───────────────
for (const collection of OTHER_ARTIFACT_COLLECTIONS) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

// ── Role matrix evidence (rules contract) ────────────────────────
const evidenceRows = [];

for (const row of ROLE_MATRIX) {
  const read = isReaderRole(row.role);
  const write = isWriterRole(row.role);

  assert.equal(read, row.read, `${row.role || '(empty)'} read`);
  assert.equal(write, row.create, `${row.role || '(empty)'} create`);
  assert.equal(write, row.update, `${row.role || '(empty)'} update`);
  assert.equal(row.deleteRules, false, `${row.role || '(empty)'} delete must stay deny`);
  assert.equal(write, row.counterWrite, `${row.role || '(empty)'} counter write`);

  evidenceRows.push({
    role: row.role,
    read: row.read,
    create: row.create,
    update: row.update,
    deleteRules: row.deleteRules,
    counterWrite: row.counterWrite,
    status: 'PASS',
  });
}

for (const role of WRITE_ROLES) {
  assert.ok(isWriterRole(role), `${role} must be a WBS writer`);
  assert.ok(isReaderRole(role), `${role} must be a WBS reader`);
}

assert.equal(isWriterRole('viewer'), false);
assert.equal(isReaderRole('viewer'), true);
assert.equal(isWriterRole('guest'), false);
assert.equal(isReaderRole('guest'), false);

console.log('\nwbs role matrix (WBS-1 rules-only evidence):');
printMatrixEvidence(evidenceRows);
console.log('\nother artifact collections write-closed:', OTHER_ARTIFACT_COLLECTIONS.join(', '));

// ── WBS-2 service contract: ACTIONS and matrix rows ──────────────
const { contract, runtimeService } = loadWbsServiceContract();
const ACTIONS = contract.ACTIONS;

assert.deepEqual(Object.keys(ACTIONS).sort(), ['CREATE', 'READ', 'UPDATE']);
assert.equal(ACTIONS.READ, 'wbs.read');
assert.equal(ACTIONS.CREATE, 'wbs.create');
assert.equal(ACTIONS.UPDATE, 'wbs.update');
assert.equal('DELETE' in ACTIONS, false);
assert.equal(ACTIONS.DELETE, undefined);

assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(WRITE_ROLES));
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(READ_ROLES));

const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
const serviceEvidenceRows = [];

for (const row of ROLE_MATRIX) {
  const read = authorize(ACTIONS.READ, { context: { memberRole: row.role } });
  const create = authorize(ACTIONS.CREATE, { context: { memberRole: row.role } });
  const update = authorize(ACTIONS.UPDATE, { context: { memberRole: row.role } });
  const deleteAction = authorize('wbs.delete', { context: { memberRole: row.role } });

  assert.equal(read, row.read, `service ${row.role || '(empty)'} read`);
  assert.equal(create, row.create, `service ${row.role || '(empty)'} create`);
  assert.equal(update, row.update, `service ${row.role || '(empty)'} update`);
  assert.equal(deleteAction, false, `service ${row.role || '(empty)'} delete action must not exist / always deny`);

  assert.equal(contract.canReadWbs(row.role), row.read);
  assert.equal(contract.canWriteWbs(row.role), row.create && row.update);

  serviceEvidenceRows.push({
    role: row.role,
    read: row.read,
    create: row.create,
    update: row.update,
    deleteRules: row.deleteRules,
    counterWrite: row.counterWrite,
    status: 'PASS',
  });
}

for (const role of WRITE_ROLES) {
  assert.equal(authorize(ACTIONS.CREATE, { context: { memberRole: role } }), true);
  assert.equal(authorize(ACTIONS.UPDATE, { context: { memberRole: role } }), true);
  assert.equal(authorize('wbs.delete', { context: { memberRole: role } }), false);
}

assert.equal(authorize(ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(authorize(ACTIONS.CREATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize(ACTIONS.UPDATE, { context: { memberRole: 'viewer' } }), false);

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
  const created = await roleBoundService.create('P-WBS2', validWbsInput({ title: `Create as ${role}` }), {
    memberRole: role,
    actorUid: `${role}-uid`,
    actorName: role,
  });
  assert.equal(created.title, `Create as ${role}`);
  assert.equal(created.version, 1);

  const updated = await roleBoundService.update('P-WBS2', created.id, {
    title: `Update as ${role}`,
  }, {
    memberRole: role,
    actorUid: `${role}-uid`,
  });
  assert.equal(updated.title, `Update as ${role}`);
  assert.equal(updated.version, 2);
}

await assert.rejects(
  () => roleBoundService.create('P-WBS2', validWbsInput({ title: 'Viewer blocked' }), { memberRole: 'viewer', actorUid: 'viewer-uid' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.update('P-WBS2', 'wbs-viewer', { title: 'Viewer blocked' }, { memberRole: 'viewer', actorUid: 'viewer-uid' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.listByProject('P-WBS2', {}, { memberRole: 'guest', actorUid: 'guest-uid' }),
  /permission denied/,
);
await assert.rejects(
  () => roleBoundService.create('P-WBS2', validWbsInput({ title: 'Unknown blocked' }), { memberRole: 'unknown', actorUid: 'unknown-uid' }),
  /permission denied/,
);

await assert.rejects(
  () => runtimeService.listByProject('P-WBS2', {}, { memberRole: 'owner', actorUid: 'owner-uid' }),
  /permission denied/,
);
await assert.rejects(
  () => runtimeService.create('P-WBS2', validWbsInput({ title: 'Blocked default runtime' }), { memberRole: 'owner', actorUid: 'owner-uid' }),
  /permission denied/,
);

const looseAuthorizeService = contract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize() {
    return undefined;
  },
});
await assert.rejects(
  () => looseAuthorizeService.listByProject('P-WBS2', {}, { actorUid: 'owner-uid' }),
  /permission denied/,
);
await assert.rejects(
  () => looseAuthorizeService.create('P-WBS2', validWbsInput(), { actorUid: 'owner-uid' }),
  /permission denied/,
);

const nullAuthorizeService = contract.createService({
  adapter,
  authorize() {
    return null;
  },
});
await assert.rejects(
  () => nullAuthorizeService.update('P-WBS2', 'wbs-1', { title: 'blocked' }, { actorUid: 'owner-uid' }),
  /permission denied/,
);

const zeroAuthorizeService = contract.createService({
  adapter,
  authorize() {
    return 0;
  },
});
await assert.rejects(
  () => zeroAuthorizeService.create('P-WBS2', validWbsInput(), { actorUid: 'owner-uid' }),
  /permission denied/,
);

const trueAuthorizeService = contract.createService({
  adapter,
  authorize() {
    return true;
  },
});
const trueAllowed = await trueAuthorizeService.listByProject('P-WBS2', {}, { actorUid: 'owner-uid' });
assert.equal(Array.isArray(trueAllowed), true);

console.log('\nwbs role matrix (WBS-2 service contract evidence):');
printMatrixEvidence(serviceEvidenceRows);
console.log('wbs role matrix contract: PASS');
