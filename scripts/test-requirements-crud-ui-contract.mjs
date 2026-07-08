#!/usr/bin/env node
/**
 * STAM PR #360 — Requirements CRUD UI wiring contract
 *
 * Verifies Firestore-backed create/update UI wiring boundaries:
 *   - service.create / service.update only (no direct Firestore writes in CRUD module)
 *   - memberRole passed in service context
 *   - delete / softDelete not wired
 *   - viewer write UI guards present
 *   - related artifact persistence not wired
 *
 * Usage:
 *   node scripts/test-requirements-crud-ui-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-firestore-crud.js'), 'utf8');
const listSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-firestore-list.js'), 'utf8');
const pageSource = await readFile(path.join(ROOT, 'stam/pages/boards/requirements.html'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-firestore-adapter.js'), 'utf8');

assert.match(crudSource, /svc\.create\(projectId, input, context\)/);
assert.match(crudSource, /svc\.update\(projectId, item\.id, patch, context\)/);
assert.equal(/\.softDelete\(/.test(crudSource), false);
assert.equal(/collection\(['"]requirements['"]\)/.test(crudSource), false);
assert.equal(/\.set\(|\.add\(|\.delete\(/.test(crudSource), false);
assert.equal(/firestore\(\)/.test(crudSource), false);
assert.match(crudSource, /requirements-firestore-create/);
assert.match(crudSource, /requirements-firestore-update/);
assert.match(crudSource, /canWriteRequirements/);
assert.match(crudSource, /DELETE_DENIED_MSG/);
assert.match(crudSource, /WRITE_DENIED_MSG/);
assert.equal(/persistRelatedArtifactsFromRequirement/.test(crudSource), false);
assert.equal(/requirementArtifacts/.test(crudSource), false);

assert.match(listSource, /bindAuthorizedService/);
assert.match(listSource, /memberRole: state\.member && state\.member\.role/);
assert.match(listSource, /createMemberRoleAuthorize/);

assert.match(pageSource, /stam\.requirements-firestore-crud\.js/);
assert.match(pageSource, /stam\.requirements-firestore-list\.js/);
assert.doesNotMatch(pageSource, /stam\.requirements-crud\.js/);

assert.match(adapterSource, /serverTimestamp/);
assert.match(adapterSource, /applyWriteTimestamps/);
assert.equal(/softDelete\s*:/.test(adapterSource), false);
assert.equal(/function\s+softDelete/.test(adapterSource), false);

assert.match(crudSource, /bindDeleteGuards/);
assert.match(crudSource, /setButtonDisabled\(document\.getElementById\('rq-del-btn'\), true/);
assert.match(crudSource, /setButtonDisabled\(document\.getElementById\('rq-det-del-btn'\), true/);
assert.match(pageSource, /id="rq-del-btn"[^>]*disabled/);
assert.match(pageSource, /id="rq-det-del-btn"/);

console.log('requirements crud ui contract: PASS');
