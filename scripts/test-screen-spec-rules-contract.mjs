#!/usr/bin/env node
/**
 * STAM ScreenSpec-1 — screenSpecs Firestore rules structure contract.
 *
 * Collection: projects/{projectId}/screenSpecs/{screenSpecId}
 * Counter: projects/{projectId}/counters/screenSpecs
 * Writer roles: owner / admin / editor (viewer read-only, delete closed)
 *
 * Usage:
 *   node scripts/test-screen-spec-rules-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

// ── ScreenSpec-1 helper block ────────────────────────────────────
assert.match(rulesSource, /ScreenSpec write helpers \(ScreenSpec-1\)/);
assert.match(rulesSource, /function isScreenSpecWriter\(projectId\)/);
assert.match(rulesSource, /function isValidScreenSpecCreate\(projectId, screenSpecId\)/);
assert.match(rulesSource, /function isValidScreenSpecUpdate\(projectId, screenSpecId\)/);
assert.match(rulesSource, /function screenSpecWriteKeys\(\)/);
assert.match(rulesSource, /function screenSpecRequiredKeys\(\)/);
assert.match(rulesSource, /function isValidScreenSpecTitle\(title\)/);
assert.match(rulesSource, /function isValidScreenSpecCode\(code\)/);
assert.match(rulesSource, /function isValidScreenSpecType\(screenType\)/);
assert.match(rulesSource, /function isValidScreenSpecWriteStatus\(writeStatus\)/);
assert.match(rulesSource, /function isValidScreenSpecReviewStatus\(reviewStatus\)/);
assert.match(rulesSource, /function isValidScreenSpecApprovalStatus\(approvalStatus\)/);
assert.match(rulesSource, /function isValidScreenSpecOwner\(projectId, data\)/);
assert.match(rulesSource, /function isValidScreenSpecRequirementLink\(data\)/);
assert.match(rulesSource, /function isValidScreenSpecFunctionalSpecLink\(data\)/);
assert.match(rulesSource, /function isValidScreenSpecWbsItemLink\(data\)/);
assert.match(rulesSource, /function isValidScreenSpecMenuScreenLink\(data\)/);
assert.match(rulesSource, /function isValidScreenSpecsCounterWrite\(\)/);
assert.match(rulesSource, /function isValidProjectMemberSnapshot\(projectId, memberUid, memberName\)/);

const helperBlock = rulesSource.match(
  /\/\/ ── ScreenSpec write helpers \(ScreenSpec-1\)[\s\S]*?\/\/ ── users\/\{uid\} bootstrap helpers/,
);
assert.ok(helperBlock, 'ScreenSpec helper block must exist');
const helpers = helperBlock[0];

// Writer reuses requirement writer roles
assert.match(helpers, /function isScreenSpecWriter\(projectId\)/);
assert.match(helpers, /return isRequirementWriter\(projectId\)/);

// SCR-### code regex and immutability
assert.match(helpers, /\^SCR-\[0-9\]\{3,\}\$/);
assert.match(helpers, /data\.code == prev\.code/);

// Title length
assert.match(helpers, /title\.size\(\) >= 2/);
assert.match(helpers, /title\.size\(\) <= 120/);

// screenType enum (8 values)
for (const screenType of ['list', 'detail', 'form', 'popup', 'admin', 'main', 'result', 'other']) {
  assert.match(helpers, new RegExp(`screenType == '${screenType}'`));
}

// writeStatus enum
for (const writeStatus of ['writing', 'complete']) {
  assert.match(helpers, new RegExp(`writeStatus == '${writeStatus}'`));
}

// reviewStatus enum
for (const reviewStatus of ['none', 'pending', 'done']) {
  assert.match(helpers, new RegExp(`reviewStatus == '${reviewStatus}'`));
}

// approvalStatus enum
for (const approvalStatus of ['none', 'approved', 'rejected']) {
  assert.match(helpers, new RegExp(`approvalStatus == '${approvalStatus}'`));
}

// Active owner snapshot (delegates to shared project member snapshot helper)
assert.match(helpers, /isValidProjectMemberSnapshot\(projectId, data\.ownerId, data\.ownerName\)/);
assert.match(rulesSource, /function isValidProjectMemberSnapshot\(projectId, memberUid, memberName\)[\s\S]*displayName == memberName/);
assert.match(rulesSource, /function isValidProjectMemberSnapshot\(projectId, memberUid, memberName\)[\s\S]*status == "active"/);

// Required keys / whitelist
const requiredWhitelistKeys = [
  'id', 'projectId', 'code', 'title', 'screenType', 'writeStatus', 'reviewStatus',
  'approvalStatus', 'ownerId', 'ownerName', 'templateId', 'routePath', 'menuPath',
  'description', 'imageCount', 'annotationCount', 'requirementId', 'requirementCode',
  'requirementTitle', 'functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle',
  'wbsItemId', 'wbsItemCode', 'wbsItemTitle', 'menuScreenId', 'menuScreenCode',
  'menuScreenTitle', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt',
  'deletedBy', 'isDeleted', 'version',
];
for (const key of requiredWhitelistKeys) {
  assert.match(helpers, new RegExp(`'${key}',`));
}

const forbiddenKeys = [
  'screenName', 'functionId', 'wbsId', 'menuId', 'importBatchId', 'importRowId',
  'sourceType', 'artifactLinks', 'screenFields', 'screenActions',
];
for (const key of forbiddenKeys) {
  assert.doesNotMatch(
    helpers,
    new RegExp(`function screenSpecWriteKeys\\(\\)[\\s\\S]*'${key}',`),
    `${key} must not be in screenSpecWriteKeys whitelist`,
  );
}

// Create timestamp/actor/version
assert.match(helpers, /data\.id == screenSpecId/);
assert.match(helpers, /data\.projectId == projectId/);
assert.match(helpers, /data\.keys\(\)\.hasAll\(screenSpecRequiredKeys\(\)\)/);
assert.match(helpers, /data\.keys\(\)\.hasOnly\(screenSpecWriteKeys\(\)\)/);
assert.match(helpers, /data\.version == 1/);
assert.match(helpers, /data\.createdBy == uid\(\)/);
assert.match(helpers, /data\.updatedBy == uid\(\)/);
assert.match(helpers, /data\.createdAt == request\.time/);
assert.match(helpers, /data\.updatedAt == request\.time/);
assert.match(helpers, /data\.isDeleted == false/);
assert.match(helpers, /data\.deletedAt == null/);
assert.match(helpers, /data\.deletedBy == null/);

// Update immutable/version increment
assert.match(helpers, /data\.version == prev\.version \+ 1/);
assert.match(helpers, /data\.isDeleted == prev\.isDeleted/);
assert.match(helpers, /data\.deletedAt == prev\.deletedAt/);
assert.match(helpers, /data\.deletedBy == prev\.deletedBy/);
assert.match(helpers, /data\.createdAt == prev\.createdAt/);
assert.match(helpers, /data\.createdBy == prev\.createdBy/);

// 4 connection triplet completeness
assert.match(helpers, /hasId && hasCode && hasTitle/);
assert.match(helpers, /\^REQ_\[0-9\]\{3,\}\$/);
assert.match(helpers, /\^FN_\[0-9\]\{3,\}\$/);
assert.match(helpers, /\^WBS-\[0-9\]\{3,\}\$/);
assert.match(helpers, /data\.menuScreenCode\.size\(\) > 0/);

// imageCount/annotationCount non-negative
assert.match(helpers, /data\.imageCount is int/);
assert.match(helpers, /data\.imageCount >= 0/);
assert.match(helpers, /data\.annotationCount is int/);
assert.match(helpers, /data\.annotationCount >= 0/);

// Counter reuses requirements counter contract
assert.match(helpers, /function isValidScreenSpecsCounterWrite\(\)/);
assert.match(helpers, /return isValidRequirementsCounterWrite\(\)/);

// ── screenSpecs match block ──────────────────────────────────────
assert.match(
  rulesSource,
  /match \/screenSpecs\/\{screenSpecId\}[\s\S]*allow get, list: if canReadProject\(projectId\);/,
);
assert.match(
  rulesSource,
  /match \/screenSpecs\/\{screenSpecId\}[\s\S]*allow create: if isValidScreenSpecCreate\(projectId, screenSpecId\);/,
);
assert.match(
  rulesSource,
  /match \/screenSpecs\/\{screenSpecId\}[\s\S]*allow update: if isValidScreenSpecUpdate\(projectId, screenSpecId\);/,
);
assert.match(
  rulesSource,
  /match \/screenSpecs\/\{screenSpecId\}[\s\S]*allow delete: if false;/,
);

const screenSpecBlock = rulesSource.match(
  /match \/screenSpecs\/\{screenSpecId\} \{[\s\S]*?\n      \}/,
);
assert.ok(screenSpecBlock, 'screenSpecs match block must exist');
assert.equal(
  /allow create, update, delete: if false;/.test(screenSpecBlock[0]),
  false,
  'screenSpecs must not use combined create/update/delete deny',
);

// ── Counter screenSpecs ──────────────────────────────────────────
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*counterId == 'screenSpecs'/,
);
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*isScreenSpecWriter\(projectId\)/,
);
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*isValidScreenSpecsCounterWrite\(\)/,
);

const countersBlock = rulesSource.match(
  /match \/counters\/\{counterId\} \{[\s\S]*?\n      \}/,
);
assert.ok(countersBlock, 'counters match block must exist');
assert.match(countersBlock[0], /allow delete: if false;/);
assert.doesNotMatch(
  countersBlock[0],
  /memberRole\(projectId\) == "viewer"/,
  'viewer must not be a counter writer',
);

// Requirements / functionalSpecifications / wbsItems counter regression
assert.match(countersBlock[0], /counterId == 'requirements'/);
assert.match(countersBlock[0], /isRequirementWriter\(projectId\)/);
assert.match(countersBlock[0], /isValidRequirementsCounterWrite\(\)/);
assert.match(countersBlock[0], /counterId == 'functionalSpecifications'/);
assert.match(countersBlock[0], /counterId == 'wbsItems'/);

// ── Unopened artifact collections remain write-closed ────────────
for (const collection of ['screenFields', 'screenActions', 'artifactLinks']) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

// ── Catch-all deny ───────────────────────────────────────────────
assert.match(
  rulesSource,
  /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/,
);

console.log('screen spec rules contract: PASS');
