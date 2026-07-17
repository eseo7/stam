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
console.log('screen spec role matrix contract: PASS');
