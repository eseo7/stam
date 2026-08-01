#!/usr/bin/env node
/**
 * STAM PR C — screenActions Firestore rules structure contract.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

assert.match(rulesSource, /ScreenAction write helpers \(ScreenAction-1\)/);
assert.match(rulesSource, /function isScreenActionWriter\(projectId\)/);
assert.match(rulesSource, /function isValidScreenActionCreate\(projectId, actionId\)/);
assert.match(rulesSource, /function isValidScreenActionUpdate\(projectId, actionId\)/);
assert.match(rulesSource, /function isValidScreenActionDelete\(projectId, actionId\)/);
assert.match(rulesSource, /function screenActionWriteKeys\(\)/);
assert.match(rulesSource, /function screenActionRequiredKeys\(\)/);
assert.match(rulesSource, /function isValidScreenActionParentOnCreate\(projectId, data\)/);
assert.match(rulesSource, /function isValidScreenActionTargetOnWrite\(projectId, data\)/);
assert.match(rulesSource, /function isValidScreenActionTargetRef\(data\)/);
assert.match(rulesSource, /function isValidScreenActionConfirm\(data\)/);

const helperBlock = rulesSource.match(
  /\/\/ ── ScreenAction write helpers \(ScreenAction-1\)[\s\S]*?\/\/ ── users\/\{uid\} bootstrap helpers/,
);
assert.ok(helperBlock, 'ScreenAction helper block must exist');
const helpers = helperBlock[0];

assert.match(helpers, /return isScreenSpecWriter\(projectId\)/);
assert.match(helpers, /data\.schemaVersion == 1/);
assert.match(helpers, /actionType == 'navigate'/);
assert.match(helpers, /actionType == 'openDrawer'/);
assert.match(helpers, /data\.confirmRequired is bool/);
assert.match(helpers, /get\(screenSpecDocPath\(projectId, specId\)\)\.data\.isDeleted == false/);
assert.match(helpers, /get\(screenSpecDocPath\(projectId, target\)\)\.data\.projectId == projectId/);

assert.doesNotMatch(helpers, /unique name/i);
assert.doesNotMatch(helpers, /normalized name/i);
assert.doesNotMatch(helpers, /duplicate name/i);

for (const actionType of ['navigate', 'submit', 'save', 'cancel', 'delete', 'openDrawer', 'closeDrawer', 'download', 'custom']) {
  assert.match(helpers, new RegExp(`actionType == '${actionType}'`));
}
for (const controlType of ['button', 'link', 'icon', 'menuItem']) {
  assert.match(helpers, new RegExp(`controlType == '${controlType}'`));
}

const screenActionBlock = rulesSource.match(
  /match \/screenActions\/\{actionId\} \{[\s\S]*?\n      \}/,
);
assert.ok(screenActionBlock, 'screenActions match block must exist');
assert.match(screenActionBlock[0], /allow get, list: if canReadProject\(projectId\);/);
assert.match(screenActionBlock[0], /allow create: if isValidScreenActionCreate\(projectId, actionId\);/);
assert.match(screenActionBlock[0], /allow update: if isValidScreenActionUpdate\(projectId, actionId\);/);
assert.match(screenActionBlock[0], /allow delete: if isValidScreenActionDelete\(projectId, actionId\);/);
assert.doesNotMatch(screenActionBlock[0], /allow delete: if false;/);

console.log('screen action rules contract: PASS');
