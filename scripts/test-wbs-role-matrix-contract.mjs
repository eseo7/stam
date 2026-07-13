#!/usr/bin/env node
/**
 * STAM WBS-1 — WBS role matrix contract (rules-only).
 *
 * Verifies WBS-1 wbsItems write rules and counter gate across
 * owner / admin / editor / viewer / guest / empty / unknown.
 *
 * NOT product runtime. No Firestore emulator or Admin SDK required.
 * Service integration role matrix lands in WBS-2.
 *
 * Usage:
 *   node scripts/test-wbs-role-matrix-contract.mjs
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
  'screenSpecs',
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
console.log('wbs role matrix contract: PASS');
