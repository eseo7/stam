#!/usr/bin/env node
/**
 * STAM WBS-3 — WBS picker hooks contract (HTML-only boundary)
 *
 * Usage:
 *   node scripts/test-wbs-picker-hooks-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const wbsHtml = await readFile(path.join(ROOT, 'stam/pages/boards/wbs.html'), 'utf8');
const requirementPicker = await readFile(path.join(ROOT, 'stam/js/stam.requirement-picker.js'), 'utf8');

const NEW_JS = [
  'stam/js/stam.reference-picker.js',
  'stam/js/stam.functional-spec-picker.js',
  'stam/js/stam.project-member-read-service.js',
  'stam/js/stam.project-member-picker.js',
];

for (const rel of NEW_JS) {
  await access(path.join(ROOT, rel));
}

assert.doesNotMatch(requirementPicker, /WBS-3 hook mutation marker/);

const HOOKS = [
  'data-stam-wbs-root',
  'data-stam-wbs-kpi-strip',
  'data-wbs-kpi="total"',
  'data-wbs-kpi="in_progress"',
  'data-wbs-kpi="done"',
  'data-wbs-kpi="delayed"',
  'data-wbs-kpi="due_week"',
  'data-stam-wbs-static-derived="gantt"',
  'id="wbs-tbl-inner"',
  'data-stam-wbs-list-host',
  'id="wbs-static-table"',
  'data-stam-wbs-static-list',
  'id="wbs-import-btn"',
  'id="wbs-export-btn"',
  'id="wbs-reg-btn"',
  'data-stam-wbs-detail-host',
  'data-stam-wbs-form="edit"',
  'data-stam-wbs-form="create"',
  'data-stam-wbs-basic-fields-host',
  'data-stam-wbs-progress-field-host',
  'data-wbs-field="title"',
  'data-wbs-field="phase"',
  'data-wbs-field="functionGroup"',
  'data-wbs-field="screenPath"',
  'data-wbs-field="owner"',
  'data-wbs-field="reviewer"',
  'data-wbs-field="status"',
  'data-wbs-field="priority"',
  'data-wbs-field="startDate"',
  'data-wbs-field="endDate"',
  'data-wbs-field="plannedEffort"',
  'data-wbs-field="actualEffort"',
  'data-wbs-field="description"',
  'data-stam-wbs-member-picker="owner"',
  'data-stam-wbs-member-picker="reviewer"',
  'data-stam-wbs-member-mode="create"',
  'data-stam-wbs-member-mode="edit"',
  'data-stam-wbs-link-slot="requirement"',
  'data-stam-wbs-link-slot="functionalSpec"',
  'data-stam-wbs-link-slot="meeting"',
  'data-stam-wbs-link-trigger',
  'id="wbs-edit-save-btn"',
  'id="wbs-edit-temp-save-btn"',
  'id="wbs-create-save-btn"',
  'id="wbs-create-temp-save-btn"',
  'data-stam-wbs-excluded-section="comments"',
  'data-stam-wbs-excluded-section="history"',
  'data-stam-wbs-excluded-control="meeting"',
];

for (const hook of HOOKS) {
  assert.match(wbsHtml, new RegExp(hook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), hook);
}

function count(pattern) {
  return (wbsHtml.match(pattern) || []).length;
}

assert.equal(count(/data-stam-wbs-member-picker="owner"/g), 2);
assert.equal(count(/data-stam-wbs-member-picker="reviewer"/g), 2);
assert.equal(count(/data-stam-wbs-member-mode="create"/g), 2);
assert.equal(count(/data-stam-wbs-member-mode="edit"/g), 2);
assert.equal(count(/data-stam-wbs-link-slot="requirement"/g), 2);
assert.equal(count(/data-stam-wbs-link-slot="functionalSpec"/g), 2);
assert.equal(count(/data-stam-wbs-link-slot="meeting"/g), 2);
assert.equal(count(/id="wbs-edit-save-btn"/g), 1);
assert.equal(count(/id="wbs-create-save-btn"/g), 1);

const idMatches = [...wbsHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const dupes = idMatches.filter((id, idx) => idMatches.indexOf(id) !== idx);
assert.deepEqual([...new Set(dupes)], [], `duplicate ids: ${[...new Set(dupes)].join(', ')}`);

const forbiddenScripts = [
  'stam.reference-picker.js',
  'stam.functional-spec-picker.js',
  'stam.project-member-read-service.js',
  'stam.project-member-picker.js',
  'stam.requirement-picker.js',
  'stam.wbs-service.js',
  'stam.wbs-firestore-adapter.js',
  'firebase-app.js',
  'firebase-auth.js',
  'firebase-firestore.js',
  '/__/firebase/init.js',
];
for (const src of forbiddenScripts) {
  assert.doesNotMatch(wbsHtml, new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(wbsHtml, /stam\.core-db-schema\.js/);
assert.match(wbsHtml, /stam\.local-core-db\.js/);
assert.match(wbsHtml, /stam\.wbs-cycle\.js/);
assert.match(wbsHtml, /stam\.wbs-crud\.js/);

assert.equal(count(/<tr class="wbs-data-row[^"]*"[^>]*data-wbs-id="/g), 17);

assert.match(wbsHtml, /검토중/);
assert.match(wbsHtml, /관련 화면설계/);
assert.match(wbsHtml, /\+ 화면설계 연결/);

assert.doesNotMatch(wbsHtml, /onclick=/);
assert.doesNotMatch(wbsHtml, /onchange=/);
assert.doesNotMatch(wbsHtml, /onsubmit=/);
assert.doesNotMatch(wbsHtml, /<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/);

console.log('wbs picker hooks contract: PASS');
