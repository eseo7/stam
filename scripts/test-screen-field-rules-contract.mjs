#!/usr/bin/env node
/**
 * STAM PR B — screenFields Firestore rules structure contract.
 *
 * Usage:
 *   node scripts/test-screen-field-rules-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

assert.match(rulesSource, /ScreenField write helpers \(ScreenField-1\)/);
assert.match(rulesSource, /function isScreenFieldWriter\(projectId\)/);
assert.match(rulesSource, /function isValidScreenFieldCreate\(projectId, fieldId\)/);
assert.match(rulesSource, /function isValidScreenFieldUpdate\(projectId, fieldId\)/);
assert.match(rulesSource, /function isValidScreenFieldDelete\(projectId, fieldId\)/);
assert.match(rulesSource, /function screenFieldWriteKeys\(\)/);
assert.match(rulesSource, /function screenFieldRequiredKeys\(\)/);
assert.match(rulesSource, /function screenSpecDocPath\(projectId, screenSpecId\)/);
assert.match(rulesSource, /function isValidScreenFieldParentOnCreate\(projectId, data\)/);

const helperBlock = rulesSource.match(
  /\/\/ ── ScreenField write helpers \(ScreenField-1\)[\s\S]*?\/\/ ── users\/\{uid\} bootstrap helpers/,
);
assert.ok(helperBlock, 'ScreenField helper block must exist');
const helpers = helperBlock[0];

assert.match(helpers, /return isScreenSpecWriter\(projectId\)/);
assert.match(helpers, /data\.schemaVersion == 1/);
assert.match(helpers, /data\.options is list/);
assert.match(helpers, /data\.options\.size\(\) <= 100/);
assert.match(helpers, /data\.validationRules is list/);
assert.match(helpers, /data\.validationRules\.size\(\) <= 10/);
assert.match(helpers, /get\(screenSpecDocPath\(projectId, specId\)\)\.data\.isDeleted == false/);

assert.doesNotMatch(helpers, /function isValidScreenFieldOptionItem\(/);
assert.doesNotMatch(helpers, /function isValidScreenFieldValidationRuleItem\(/);
assert.doesNotMatch(helpers, /unique name/i);
assert.doesNotMatch(helpers, /normalized name/i);
assert.doesNotMatch(helpers, /duplicate name/i);

for (const type of ['text', 'textarea', 'number', 'boolean', 'switch', 'select', 'multiselect', 'date', 'datetime', 'file', 'image', 'editor']) {
  assert.match(helpers, new RegExp(`type == '${type}'`));
}

const screenFieldBlock = rulesSource.match(
  /match \/screenFields\/\{fieldId\} \{[\s\S]*?\n      \}/,
);
assert.ok(screenFieldBlock, 'screenFields match block must exist');
assert.match(screenFieldBlock[0], /allow get, list: if canReadProject\(projectId\);/);
assert.match(screenFieldBlock[0], /allow create: if isValidScreenFieldCreate\(projectId, fieldId\);/);
assert.match(screenFieldBlock[0], /allow update: if isValidScreenFieldUpdate\(projectId, fieldId\);/);
assert.match(screenFieldBlock[0], /allow delete: if isValidScreenFieldDelete\(projectId, fieldId\);/);
assert.doesNotMatch(screenFieldBlock[0], /allow delete: if false;/);

assert.match(
  rulesSource,
  /match \/screenSpecs\/\{screenSpecId\}[\s\S]*allow delete: if false;/,
  'screenSpecs delete regression must stay closed',
);

console.log('screen field rules contract: PASS');
