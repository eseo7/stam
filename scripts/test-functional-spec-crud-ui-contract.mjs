#!/usr/bin/env node
/**
 * STAM FS-5 — Functional Specification CRUD UI wiring contract
 *
 * Verifies Firestore-backed create/update UI wiring boundaries:
 *   - service.create / service.update only (no direct Firestore writes in CRUD module)
 *   - memberRole passed in service context
 *   - delete / softDelete not wired
 *   - viewer write UI guards present
 *
 * Usage:
 *   node scripts/test-functional-spec-crud-ui-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-crud.js'), 'utf8');
const listSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-list.js'), 'utf8');
const pageSource = await readFile(path.join(ROOT, 'stam/pages/boards/functional-specification.html'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-adapter.js'), 'utf8');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.requirement-picker.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-service.js'), 'utf8');

assert.match(crudSource, /svc\.create\(projectId, input, context\)/);
assert.match(crudSource, /svc\.update\(projectId, item\.id, patch, context\)/);
assert.equal(/\.softDelete\(/.test(crudSource), false);
assert.equal(/collection\(['"]functionalSpecifications['"]\)/.test(crudSource), false);
assert.equal(/\.set\(|\.add\(|\.delete\(/.test(crudSource.replace(/classList\.add/g, '')), false);
assert.equal(/firestore\(\)/.test(crudSource), false);
assert.match(crudSource, /functional-spec-firestore-create/);
assert.match(crudSource, /functional-spec-firestore-update/);
assert.match(crudSource, /canWriteFunctionalSpecs/);
assert.match(crudSource, /if \(!roleContract \|\| typeof roleContract\.canWriteFunctionalSpecs !== 'function'\) return false/);
assert.match(crudSource, /function writeGuard\(\)/);
assert.match(crudSource, /var guard = writeGuard\(\)/);
assert.match(crudSource, /DELETE_DENIED_MSG/);
assert.match(crudSource, /WRITE_DENIED_MSG/);

assert.match(listSource, /bindAuthorizedService/);
assert.match(listSource, /memberRole: state\.member && state\.member\.role/);
assert.match(listSource, /createMemberRoleAuthorize/);
const loadFn = listSource.match(/function load\(\) \{[\s\S]*?\n  \}/);
assert.ok(loadFn, 'load() function must exist');
assert.doesNotMatch(loadFn[0], /var svc = service\(\);[\s\S]*?bindAuthorizedService/);
assert.match(loadFn[0], /bindAuthorizedService\([\s\S]*?var svc = service\(\)/);
assert.match(listSource, /function refreshCrudAccessUI\(\)/);
assert.match(listSource, /functionalSpecFirestoreCrud/);
assert.match(loadFn[0], /refreshCrudAccessUI\(\)/);
assert.match(listSource, /function openDetailFromRow\(row\)/);
assert.match(listSource, /currentItem: state\.currentItem/);
assert.match(listSource, /function renderDetail\(item\)/);
assert.match(listSource, /\.replace\(\/&\/g, '&amp;'\)/);

assert.match(pageSource, /stam\.functional-spec-firestore-crud\.js/);
assert.match(pageSource, /stam\.functional-spec-firestore-list\.js/);
assert.doesNotMatch(pageSource, /stam\.functional-definition-cycle\.js/);
assert.doesNotMatch(pageSource, /stam\.functional-definition-crud\.js/);
assert.doesNotMatch(pageSource, /FN-001/);
assert.doesNotMatch(pageSource, /요구사항 목록 조회/);

assert.match(adapterSource, /serverTimestamp/);
assert.match(adapterSource, /applyRequirementUnlinkDeletes/);
assert.match(adapterSource, /FieldValue\.delete\(\)/);
assert.match(adapterSource, /REQUIREMENT_UNLINK_FIELDS = \['requirementId', 'requirementCode', 'requirementTitle'\]/);
assert.match(adapterSource, /if \(next\[field\] === ''\)/);
assert.doesNotMatch(pickerSource, /item\.requirementId \|\| item\.id/);
assert.match(listSource, /function requirementDisplayCode\(item\)/);
assert.match(listSource, /function requirementDisplayTitle\(item\)/);
assert.match(listSource, /function requirementDisplayLabel\(item\)/);
assert.match(listSource, /function hasRequirementLink\(item\)/);
assert.match(listSource, /sortByBoardRegistration\(list\)/);
assert.doesNotMatch(listSource, /\['requirementCode', 'requirementId'\]/);
assert.doesNotMatch(listSource, /if \(reqCode\)/);
assert.match(crudSource, /if \(clean\(req\.requirementId\) \|\| clean\(req\.requirementCode\)\)/);
assert.equal(/softDelete\s*:/.test(adapterSource), false);
assert.equal(/function\s+softDelete/.test(adapterSource), false);
assert.equal(/softDelete\s*:/.test(serviceSource), false);
assert.equal(/function\s+softDelete/.test(serviceSource), false);
assert.doesNotMatch(serviceSource, /DELETE:\s*'functionalSpec\.delete'/);
assert.match(serviceSource, /function defaultAuthorize\(\) \{[\s\S]*?return Promise\.resolve\(false\);/);

assert.match(crudSource, /bindDeleteGuards/);
assert.match(crudSource, /applyWriteAccessUI: applyWriteAccessUI/);
assert.match(crudSource, /setButtonDisabled\(document\.getElementById\('fn-reg-btn'\), !writable/);
assert.match(crudSource, /setButtonDisabled\(toolbarDelete, true, DELETE_DENIED_MSG\)/);
assert.match(crudSource, /setButtonDisabled\(detailDelete, true, DELETE_DENIED_MSG\)/);
assert.match(crudSource, /function functionalSpecDisplayCode\(item\)/);
assert.match(crudSource, /function ensureClosedDeleteButtonVisible\(btn\)/);
assert.match(listSource, /function formatFunctionalSpecCode\(item\)/);
assert.match(pageSource, /id="fn-del-btn"/);
assert.match(pageSource, /id="fn-det-del-btn"[^>]*disabled/);
assert.match(pageSource, /id="fn-del-btn"[^>]*disabled/);
assert.match(pageSource, /id="fn-det-del-btn"/);

assert.match(crudSource, /requirementPickerApi/);
assert.match(crudSource, /pickerApi\.initAll/);
assert.match(crudSource, /getRequirementSelection/);
assert.match(pageSource, /data-stam-requirement-picker/);
assert.doesNotMatch(pageSource, /placeholder="요구사항 ID 입력/);

console.log('functional spec crud ui contract: PASS');
