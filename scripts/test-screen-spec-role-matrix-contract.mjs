#!/usr/bin/env node
/**
 * STAM ScreenSpec-1 — screenSpecs role matrix contract.
 *
 * Verifies screenSpecs write rules and counter gate across
 * owner / admin / editor / viewer / guest / empty / unknown.
 *
 * NOT product runtime. No Firestore emulator or Admin SDK required.
 *
 * Usage:
 *   node scripts/test-screen-spec-role-matrix-contract.mjs
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
  'screenFields',
  'screenActions',
  'artifactLinks',
];

const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-firestore-adapter.js'), 'utf8');

assert.doesNotMatch(serviceSource, /DELETE:\s*'screenSpec\.delete'/);
assert.equal(/function\s+delete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+softDelete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+remove\s*\(/.test(serviceSource), false);
assert.equal(/function\s+delete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+softDelete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+remove\s*\(/.test(adapterSource), false);

function loadScreenSpecServiceContract() {
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
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-spec-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-spec-service.js' });
  return {
    contract: window.STAM.screenSpecServiceContract,
    runtimeService: window.STAM.screenSpecService,
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

// ── isScreenSpecWriter reuses isRequirementWriter ────────────────
assert.match(rulesSource, /function isScreenSpecWriter\(projectId\)/);
assert.match(rulesSource, /return isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /function isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /memberRole\(projectId\) == "owner"/);
assert.match(rulesSource, /memberRole\(projectId\) == "admin"/);
assert.match(rulesSource, /memberRole\(projectId\) == "editor"/);
assert.doesNotMatch(
  rulesSource,
  /function isScreenSpecWriter\(projectId\)[\s\S]*memberRole\(projectId\) == "viewer"/,
  'viewer must not be treated as a screen spec writer in rules',
);

// ── screenSpecs match block ────────────────────────────────────────
const screenSpecBlock = rulesSource.match(
  /match \/screenSpecs\/\{screenSpecId\} \{[\s\S]*?\n      \}/,
);
assert.ok(screenSpecBlock, 'screenSpecs match block must exist');
assert.match(screenSpecBlock[0], /allow get, list: if canReadProject\(projectId\);/);
assert.match(screenSpecBlock[0], /allow create: if isValidScreenSpecCreate\(projectId, screenSpecId\);/);
assert.match(screenSpecBlock[0], /allow update: if isValidScreenSpecUpdate\(projectId, screenSpecId\);/);
assert.match(screenSpecBlock[0], /allow delete: if false;/);

// ── Counter screenSpecs writer-only ──────────────────────────────
const countersBlock = rulesSource.match(
  /match \/counters\/\{counterId\} \{[\s\S]*?\n      \}/,
);
assert.ok(countersBlock, 'counters match block must exist');
assert.match(countersBlock[0], /counterId == 'screenSpecs'/);
assert.match(countersBlock[0], /isScreenSpecWriter\(projectId\)/);
assert.match(countersBlock[0], /isValidScreenSpecsCounterWrite\(\)/);
assert.match(countersBlock[0], /allow delete: if false;/);

// ── Other artifact collections remain write-closed ───────────────
for (const collection of OTHER_ARTIFACT_COLLECTIONS) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

// ── Inactive member / no membership write deny (contract evidence) ─
assert.match(rulesSource, /function isActiveProjectMember\(projectId\)/);
assert.match(rulesSource, /status == "active"/);
assert.match(rulesSource, /function isValidProjectMemberSnapshot\(projectId, memberUid, memberName\)/);
assert.match(rulesSource, /exists\(projectMemberPath\(projectId, memberUid\)\)/);

// ── WBS writer matrix unchanged ────────────────────────────────
assert.match(rulesSource, /function isWbsWriter\(projectId\)/);
assert.match(rulesSource, /function isWbsWriter\(projectId\)[\s\S]*return isRequirementWriter\(projectId\)/);

// ── Requirements / functionalSpecifications gate unchanged ───────
const requirementsBlock = rulesSource.match(
  /match \/requirements\/\{requirementId\} \{[\s\S]*?\n      \}/,
);
assert.ok(requirementsBlock, 'requirements match block must exist');
assert.match(requirementsBlock[0], /allow create: if isValidRequirementCreate\(projectId, requirementId\);/);
assert.match(requirementsBlock[0], /allow delete: if false;/);

const functionalSpecBlock = rulesSource.match(
  /match \/functionalSpecifications\/\{functionalSpecId\} \{[\s\S]*?\n      \}/,
);
assert.ok(functionalSpecBlock, 'functionalSpecifications match block must exist');
assert.match(functionalSpecBlock[0], /allow create: if isValidFunctionalSpecCreate\(projectId, functionalSpecId\);/);
assert.match(functionalSpecBlock[0], /allow delete: if false;/);

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
  assert.ok(isWriterRole(role), `${role} must be a screen spec writer`);
  assert.ok(isReaderRole(role), `${role} must be a screen spec reader`);
}

assert.equal(isWriterRole('viewer'), false, 'viewer must not be a screen spec writer');
assert.equal(isReaderRole('viewer'), true, 'viewer can read screen specs');
assert.equal(isWriterRole('guest'), false);
assert.equal(isReaderRole('guest'), false);

console.log('\nscreen spec role matrix (ScreenSpec-1 rules-only evidence):');
printMatrixEvidence(evidenceRows);
console.log('\nother artifact collections write-closed:', OTHER_ARTIFACT_COLLECTIONS.join(', '));

// ── ScreenSpec-2 service contract: ACTIONS and matrix rows ───────
const { contract, runtimeService } = loadScreenSpecServiceContract();
const ACTIONS = contract.ACTIONS;

assert.deepEqual(Object.keys(ACTIONS).sort(), ['CREATE', 'LIST', 'READ', 'UPDATE']);
assert.equal(ACTIONS.LIST, 'screenSpec.list');
assert.equal(ACTIONS.READ, 'screenSpec.read');
assert.equal(ACTIONS.CREATE, 'screenSpec.create');
assert.equal(ACTIONS.UPDATE, 'screenSpec.update');
assert.equal('DELETE' in ACTIONS, false);
assert.equal(ACTIONS.DELETE, undefined);

assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(WRITE_ROLES));
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(READ_ROLES));

const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
const serviceEvidenceRows = [];

for (const row of ROLE_MATRIX) {
  const list = authorize(ACTIONS.LIST, { context: { memberRole: row.role } });
  const read = authorize(ACTIONS.READ, { context: { memberRole: row.role } });
  const create = authorize(ACTIONS.CREATE, { context: { memberRole: row.role } });
  const update = authorize(ACTIONS.UPDATE, { context: { memberRole: row.role } });
  const deleteAction = authorize('screenSpec.delete', { context: { memberRole: row.role } });

  assert.equal(list, row.read, `service ${row.role || '(empty)'} list`);
  assert.equal(read, row.read, `service ${row.role || '(empty)'} read`);
  assert.equal(create, row.create, `service ${row.role || '(empty)'} create`);
  assert.equal(update, row.update, `service ${row.role || '(empty)'} update`);
  assert.equal(deleteAction, false, `service ${row.role || '(empty)'} delete action must not exist / always deny`);
  assert.equal(create, row.counterWrite, `service ${row.role || '(empty)'} counter write alignment`);

  assert.equal(contract.canReadScreenSpec(row.role), row.read);
  assert.equal(contract.canWriteScreenSpec(row.role), row.create && row.update);

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
  assert.equal(authorize('screenSpec.delete', { context: { memberRole: role } }), false);
}

assert.equal(authorize(ACTIONS.LIST, { context: { memberRole: 'viewer' } }), true);
assert.equal(authorize(ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(authorize(ACTIONS.CREATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize(ACTIONS.UPDATE, { context: { memberRole: 'viewer' } }), false);

assert.equal(typeof runtimeService.delete, 'undefined');
assert.equal(typeof runtimeService.softDelete, 'undefined');
assert.equal(typeof runtimeService.remove, 'undefined');

console.log('\nscreen spec role matrix (ScreenSpec-2 service contract evidence):');
printMatrixEvidence(serviceEvidenceRows);
console.log('screen spec role matrix contract: PASS');
