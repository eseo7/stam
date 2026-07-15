#!/usr/bin/env node
/**
 * STAM WBS-4 — WBS picker hooks contract (Live wiring)
 */

import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const wbsHtml = await readFile(path.join(ROOT, 'stam/pages/boards/wbs.html'), 'utf8');

const LIVE_JS = [
  'stam/js/stam.reference-picker.js',
  'stam/js/stam.functional-spec-picker.js',
  'stam/js/stam.project-member-read-service.js',
  'stam/js/stam.project-member-picker.js',
  'stam/js/stam.requirement-picker.js',
  'stam/js/stam.wbs-service.js',
  'stam/js/stam.wbs-firestore-adapter.js',
  'stam/js/stam.wbs-firestore-list.js',
  'stam/js/stam.wbs-firestore-crud.js',
];

for (const rel of LIVE_JS) {
  await access(path.join(ROOT, rel));
}

const HOOKS = [
  'data-stam-wbs-live="true"',
  'data-stam-wbs-root',
  'data-stam-wbs-kpi-strip',
  'data-wbs-kpi="total"',
  'data-wbs-kpi="in_progress"',
  'data-wbs-kpi="done"',
  'data-wbs-kpi="delayed"',
  'data-wbs-kpi="due_week"',
  'id="wbs-live-feedback-host"',
  'data-stam-wbs-runtime',
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
  'data-wbs-field="businessArea"',
  'data-wbs-field="functionGroup"',
  'data-wbs-field="screenPath"',
  'data-wbs-field="owner"',
  'data-wbs-field="reviewer"',
  'data-wbs-field="status"',
  'data-wbs-field="priority"',
  'data-wbs-field="progress"',
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
  'data-stam-requirement-picker',
  'data-stam-functional-spec-picker',
  'id="wbs-edit-save-btn"',
  'id="wbs-edit-temp-save-btn"',
  'id="wbs-create-save-btn"',
  'id="wbs-create-temp-save-btn"',
  'data-stam-wbs-excluded-section="comments"',
  'data-stam-wbs-excluded-section="history"',
  'data-stam-wbs-excluded-control="meeting"',
  'data-wbs-detail="owner"',
  'data-wbs-detail="functionalSpec"',
];

for (const hook of HOOKS) {
  assert.match(wbsHtml, new RegExp(hook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), hook);
}

function count(pattern) {
  return (wbsHtml.match(pattern) || []).length;
}

assert.equal(count(/data-stam-wbs-member-picker="owner"/g), 2);
assert.equal(count(/data-stam-wbs-member-picker="reviewer"/g), 2);
assert.equal(count(/data-stam-requirement-picker/g), 2);
assert.equal(count(/data-stam-functional-spec-picker/g), 2);
assert.equal(count(/data-wbs-field="businessArea"/g), 2);
assert.equal(count(/<tr class="wbs-data-row/g), 0);
assert.doesNotMatch(wbsHtml, /stam\.wbs-cycle\.js/);
assert.doesNotMatch(wbsHtml, /stam\.wbs-crud\.js/);
assert.doesNotMatch(wbsHtml, /stam\.local-core-db\.js/);
assert.doesNotMatch(wbsHtml, /검토중/);
assert.match(wbsHtml, /관련 기능정의/);
assert.doesNotMatch(wbsHtml, /관련 화면설계/);
assert.match(wbsHtml, /stam\.wbs-firestore-list\.js/);
assert.match(wbsHtml, /stam\.wbs-firestore-crud\.js/);
assert.match(wbsHtml, /firebase-app\.js/);
assert.doesNotMatch(wbsHtml, /onclick=/);

console.log('wbs picker hooks contract: PASS');
