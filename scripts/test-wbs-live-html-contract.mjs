#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = await readFile(path.join(ROOT, 'stam/pages/boards/wbs.html'), 'utf8');
const wbsJs = await readFile(path.join(ROOT, 'stam/js/stam.wbs.js'), 'utf8');

function count(re) {
  return (html.match(re) || []).length;
}

const scriptOrder = [
  'stam.icons.js',
  'stam.ui-messages.js',
  'stam.ui-feedback.js',
  'stam.theme.js',
  'stam.nav-data.js',
  'stam.shell.js',
  'stam.nav-render.js',
  'stam.topbar-render.js',
  'stam.project-context-guard.js',
  'stam.project-context-render.js',
  'stam.board-filter.js',
  'stam.wbs.js',
  '/__/firebase/8.10.1/firebase-app.js',
  '/__/firebase/8.10.1/firebase-auth.js',
  '/__/firebase/8.10.1/firebase-firestore.js',
  '/__/firebase/init.js',
  'stam.wbs-firestore-adapter.js',
  'stam.wbs-service.js',
  'stam.requirements-firestore-adapter.js',
  'stam.requirements-service.js',
  'stam.functional-spec-firestore-adapter.js',
  'stam.functional-spec-service.js',
  'stam.reference-picker.js',
  'stam.requirement-picker.js',
  'stam.functional-spec-picker.js',
  'stam.project-member-read-service.js',
  'stam.project-member-picker.js',
  'stam.wbs-firestore-list.js',
  'stam.wbs-firestore-crud.js',
];

const scriptTags = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
let last = -1;
for (const src of scriptOrder) {
  const idx = scriptTags.findIndex((tag, i) => i > last && tag.includes(src));
  assert.ok(idx >= 0, `missing script ${src}`);
  last = idx;
}

assert.match(html, /data-stam-wbs-live="true"/);
assert.doesNotMatch(html, /stam\.core-db-schema\.js/);
assert.doesNotMatch(html, /stam\.local-core-db\.js/);
assert.doesNotMatch(html, /stam\.wbs-cycle\.js/);
assert.doesNotMatch(html, /stam\.wbs-crud\.js/);
assert.doesNotMatch(html, /wbs-v2-section/);
assert.doesNotMatch(html, /wbs-v2-tbody/);
assert.doesNotMatch(html, /Local Core DB v2/);
assert.equal(count(/data-wbs-id="WBS-/g), 0);
assert.equal(count(/<tr class="wbs-data-row/g), 0);
assert.match(html, /id="wbs-live-feedback-host"/);
assert.equal(count(/<th[\s>]/g), 22);
assert.equal(count(/data-wbs-field="businessArea"/g), 2);
assert.equal(count(/data-wbs-field="progress"/g), 4);
assert.equal(count(/data-stam-requirement-picker/g), 2);
assert.equal(count(/data-stam-functional-spec-picker/g), 2);
assert.equal(count(/data-stam-wbs-member-picker="owner"/g), 2);
assert.equal(count(/data-stam-wbs-member-picker="reviewer"/g), 2);
assert.doesNotMatch(html, /검토중/);
assert.match(html, /관련 기능정의/);
assert.doesNotMatch(html, /관련 화면설계/);
assert.doesNotMatch(html, /클로드|이서연|김기획|박PM|최개발|정디자인/);
assert.doesNotMatch(html, /WBS-007|WBS-017/);
assert.match(html, /id="wbs-import-btn"[^>]*disabled/);
assert.match(html, /id="wbs-export-btn"[^>]*disabled/);
assert.match(html, /id="wbs-delete-btn"[^>]*disabled/);
assert.match(html, /id="wbs-gantt-fullview-btn"[^>]*disabled/);
assert.match(html, /댓글 기능은 1차 범위에서 제공하지 않습니다/);
assert.match(html, /변경이력 기능은 아직 제공되지 않습니다/);
assert.doesNotMatch(html, /firebaseConfig/);
assert.doesNotMatch(html, /initializeApp\(/);
assert.doesNotMatch(html, /onclick=/);
assert.doesNotMatch(html, /<style[\s>]/);
assert.doesNotMatch(html, /<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/);

assert.doesNotMatch(html, /2026-06-07 10:42/);
assert.doesNotMatch(html, /2026-05-01 ~ 2026-07-31/);
assert.doesNotMatch(html, /91일 · 17건/);
assert.doesNotMatch(html, /wbs-pct-35/);
assert.match(html, /data-stam-wbs-overall-progress/);
assert.match(html, /data-wbs-detail="updatedAtFooter"/);
const deleteBtnTag = html.match(/id="wbs-delete-btn"[^>]*>/)?.[0] || '';
assert.equal((deleteBtnTag.match(/\sdisabled(?:\s|>|=)/g) || []).length, 1);
assert.equal(count(/\sstyle="/g), 0);

assert.doesNotMatch(wbsJs, /최종 변경 2026-06-07/);
assert.doesNotMatch(wbsJs, /<span style=/);

console.log('wbs live html contract: PASS');
