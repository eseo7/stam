#!/usr/bin/env node
/**
 * STAM seed-stam-demo-membership helper contract
 *
 * Usage:
 *   node scripts/test-seed-stam-demo-membership-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const seedPath = path.join(ROOT, 'scripts/seed-stam-demo-membership.mjs');
const seedSource = await readFile(seedPath, 'utf8');

assert.match(seedSource, /displayName: opts\.displayName/);
assert.doesNotMatch(seedSource, /from ['"].*stam\/js/);
assert.match(seedSource, /userId: opts\.uid/);
assert.match(seedSource, /projectId: opts\.projectId/);
assert.match(seedSource, /status: opts\.status/);
assert.match(seedSource, /role: opts\.role/);
assert.match(seedSource, /firebase-admin/);
assert.match(seedSource, /QA \/ staging only/);

const memberDocBlock = seedSource.match(/const memberDoc = \{[\s\S]*?\};/);
assert.ok(memberDocBlock, 'memberDoc block must exist');
assert.match(memberDocBlock[0], /displayName: opts\.displayName/);

const displayName = '테스트 표시명';
const uid = 'uid-test-123';
const projectId = 'stam-demo';
const status = 'pending';
const role = 'editor';

const dryRun = spawnSync(process.execPath, [
  seedPath,
  '--uid', uid,
  '--displayName', displayName,
  '--projectId', projectId,
  '--status', status,
  '--role', role,
  '--dry-run',
], { encoding: 'utf8' });

assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
const jsonStart = dryRun.stdout.indexOf('{');
assert.ok(jsonStart >= 0, 'dry-run must print JSON payload');
const payload = JSON.parse(dryRun.stdout.slice(jsonStart));
const memberPath = `projects/${projectId}/members/${uid}`;
assert.ok(payload[memberPath], 'member document must be present in dry-run output');
assert.equal(payload[memberPath].displayName, displayName);
assert.equal(payload[memberPath].userId, uid);
assert.equal(payload[memberPath].projectId, projectId);
assert.equal(payload[memberPath].status, status);
assert.equal(payload[memberPath].role, role);
assert.equal('joinedAt' in payload[memberPath], false, 'pending status must not set joinedAt');

console.log('seed stam demo membership contract: PASS');
