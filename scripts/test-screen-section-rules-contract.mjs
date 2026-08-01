#!/usr/bin/env node
/**
 * STAM PR D1 — screenSections Firestore rules structure contract.
 *
 * Usage:
 *   node scripts/test-screen-section-rules-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

let testCount = 0;
function test(name, fn) {
  testCount += 1;
  fn();
}

test('ScreenSection-1 helper block exists', () => {
  assert.match(rulesSource, /ScreenSection write helpers \(ScreenSection-1\)/);
  assert.match(rulesSource, /function isScreenSectionWriter\(projectId\)/);
  assert.match(rulesSource, /function isValidScreenSectionCreate\(projectId, sectionId\)/);
  assert.match(rulesSource, /function isValidScreenSectionUpdate\(projectId, sectionId\)/);
  assert.match(rulesSource, /function isValidScreenSectionDelete\(projectId, sectionId\)/);
  assert.match(rulesSource, /function screenSectionWriteKeys\(\)/);
  assert.match(rulesSource, /function screenSectionRequiredKeys\(\)/);
  assert.match(rulesSource, /function screenSpecDocPath\(projectId, screenSpecId\)/);
  assert.match(rulesSource, /function isValidScreenSectionParentOnCreate\(projectId, data\)/);
});

const helperBlock = rulesSource.match(
  /\/\/ ── ScreenSection write helpers \(ScreenSection-1\)[\s\S]*?\/\/ ── users\/\{uid\} bootstrap helpers/,
);
assert.ok(helperBlock, 'ScreenSection helper block must exist');
const helpers = helperBlock[0];

test('writer aligns with screenSpec writer', () => {
  assert.match(helpers, /return isScreenSpecWriter\(projectId\)/);
});

test('screenSpecId path check on create', () => {
  assert.match(helpers, /exists\(screenSpecDocPath\(projectId, specId\)\)/);
  assert.match(helpers, /get\(screenSpecDocPath\(projectId, specId\)\)\.data\.projectId == projectId/);
  assert.match(helpers, /get\(screenSpecDocPath\(projectId, specId\)\)\.data\.isDeleted == false/);
});

test('sectionType enum validation', () => {
  for (const type of ['search', 'form', 'detail', 'table', 'card', 'tabs', 'tab', 'repeater', 'history', 'custom']) {
    assert.match(helpers, new RegExp(`sectionType == '${type}'`));
  }
});

test('layout validation', () => {
  assert.match(helpers, /function isValidScreenSectionLayout\(layout\)/);
  assert.match(helpers, /layout\.keys\(\)\.hasAll\(\['columns', 'gap', 'collapsible', 'defaultCollapsed'\]\)/);
  for (const col of [1, 2, 3, 4, 6, 12]) {
    assert.match(helpers, new RegExp(`layout\\.columns == ${col}`));
  }
  for (const gap of ['none', 'sm', 'md', 'lg']) {
    assert.match(helpers, new RegExp(`layout\\.gap == '${gap}'`));
  }
  assert.match(helpers, /layout\.collapsible is bool/);
  assert.match(helpers, /layout\.defaultCollapsed is bool/);
});

test('visibilityCondition shape validation', () => {
  assert.match(helpers, /isValidConditionGroupShape\(data\.visibilityCondition\)/);
});

const compositionHelpers = rulesSource.match(
  /\/\/ ── Shared composition shape helpers \(PR D1\)[\s\S]*?\/\/ ── ScreenSection write helpers \(ScreenSection-1\)/,
);
assert.ok(compositionHelpers, 'composition helper block must exist');

test('condition item shape validation helpers exist', () => {
  assert.match(compositionHelpers[0], /function isValidConditionItem\(/);
  assert.match(compositionHelpers[0], /function isValidConditionItems\(/);
  assert.match(compositionHelpers[0], /function isValidConditionGroupShape\(group\)/);
});

test('immutable fields on update', () => {
  assert.match(helpers, /data\.id == prev\.id/);
  assert.match(helpers, /data\.projectId == prev\.projectId/);
  assert.match(helpers, /data\.screenSpecId == prev\.screenSpecId/);
  assert.match(helpers, /data\.createdAt == prev\.createdAt/);
  assert.match(helpers, /data\.createdBy == prev\.createdBy/);
  assert.match(helpers, /data\.schemaVersion == prev\.schemaVersion/);
});

test('schema version required', () => {
  assert.match(helpers, /data\.schemaVersion == 1/);
});

const screenSectionBlock = rulesSource.match(
  /match \/screenSections\/\{sectionId\} \{[\s\S]*?\n      \}/,
);
assert.ok(screenSectionBlock, 'screenSections match block must exist');

test('screenSections match block permissions', () => {
  assert.match(screenSectionBlock[0], /allow get, list: if canReadProject\(projectId\);/);
  assert.match(screenSectionBlock[0], /allow create: if isValidScreenSectionCreate\(projectId, sectionId\);/);
  assert.match(screenSectionBlock[0], /allow update: if isValidScreenSectionUpdate\(projectId, sectionId\);/);
  assert.match(screenSectionBlock[0], /allow delete: if isValidScreenSectionDelete\(projectId, sectionId\);/);
  assert.doesNotMatch(screenSectionBlock[0], /allow delete: if false;/);
});

test('screenSpecs delete regression stays closed', () => {
  assert.match(
    rulesSource,
    /match \/screenSpecs\/\{screenSpecId\}[\s\S]*allow delete: if false;/,
    'screenSpecs delete regression must stay closed',
  );
});

console.log(`screen section rules contract (${testCount} cases): PASS`);
