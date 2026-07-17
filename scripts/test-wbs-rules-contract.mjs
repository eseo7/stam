import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * STAM WBS-1 — wbsItems Firestore rules structure contract.
 *
 * Collection: projects/{projectId}/wbsItems/{wbsItemId}
 * Counter: projects/{projectId}/counters/wbsItems
 * Writer roles: owner / admin / editor (viewer read-only, delete closed)
 *
 * Usage:
 *   node scripts/test-wbs-rules-contract.mjs
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

// ── WBS-1 helper block ───────────────────────────────────────────
assert.match(rulesSource, /WBS write helpers \(WBS-1\)/);
assert.match(rulesSource, /function isWbsWriter\(projectId\)/);
assert.match(rulesSource, /function isValidWbsCreate\(projectId, wbsItemId\)/);
assert.match(rulesSource, /function isValidWbsUpdate\(projectId, wbsItemId\)/);
assert.match(rulesSource, /function wbsWriteKeys\(\)/);
assert.match(rulesSource, /function wbsRequiredKeys\(\)/);
assert.match(rulesSource, /function isValidWbsTitle\(title\)/);
assert.match(rulesSource, /function isValidWbsPhase\(phase\)/);
assert.match(rulesSource, /function isValidWbsStatus\(status\)/);
assert.match(rulesSource, /function isValidWbsPriority\(priority\)/);
assert.match(rulesSource, /function isValidWbsCode\(code\)/);
assert.match(rulesSource, /function isValidWbsDate\(date\)/);
assert.match(rulesSource, /function isValidWbsProgress\(status, progress\)/);
assert.match(rulesSource, /function projectMemberPath\(projectId, memberUid\)/);
assert.match(rulesSource, /function isValidProjectMemberSnapshot\(projectId, memberUid, memberName\)/);
assert.match(rulesSource, /function isValidWbsReviewer\(projectId, data\)/);
assert.match(rulesSource, /function isValidWbsRequirementLink\(data\)/);
assert.match(rulesSource, /function isValidWbsFunctionalSpecLink\(data\)/);
assert.match(rulesSource, /function isValidWbsItemsCounterWrite\(\)/);

const helperBlock = rulesSource.match(
  /\/\/ ── WBS write helpers \(WBS-1\)[\s\S]*?\/\/ ── ScreenSpec write helpers/,
);
assert.ok(helperBlock, 'WBS helper block must exist');
const helpers = helperBlock[0];

// Writer reuses requirement writer roles
assert.match(helpers, /function isWbsWriter\(projectId\)/);
assert.match(helpers, /return isRequirementWriter\(projectId\)/);

// Phase enum (7 values)
for (const phase of ['착수', '분석', '설계', '구현', '검수', '오픈', '완료']) {
  assert.match(helpers, new RegExp(`phase == '${phase}'`));
}

// Status enum (5 values)
for (const status of ['wait', 'in_progress', 'delayed', 'done', 'hold']) {
  assert.match(helpers, new RegExp(`status == '${status}'`));
}

// Priority enum (3 values)
for (const priority of ['high', 'mid', 'low']) {
  assert.match(helpers, new RegExp(`priority == '${priority}'`));
}

// Forbidden status values must not appear in WBS helper block
assert.doesNotMatch(helpers, /reviewing/);
assert.doesNotMatch(helpers, /검토중/);

// Code regex
assert.match(helpers, /\^WBS-\[0-9\]\{3,\}\$/);
assert.match(helpers, /data\.code == prev\.code/);

// Date regex and ordering
assert.match(helpers, /\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$/);
assert.match(helpers, /data\.endDate >= data\.startDate/);

// Progress contract
assert.match(helpers, /status == 'done' && progress == 100/);
assert.match(helpers, /status != 'done' && progress < 100/);

// Member snapshot
assert.match(helpers, /displayName == memberName/);
assert.match(helpers, /status == "active"/);

// Requirement 3-key triplet
assert.match(helpers, /\^REQ_\[0-9\]\{3,\}\$/);
assert.match(helpers, /hasId && hasCode && hasTitle/);

// Functional spec 3-key triplet
assert.match(helpers, /\^FN_\[0-9\]\{3,\}\$/);

// Whitelist keys
const requiredWhitelistKeys = [
  'id', 'projectId', 'code', 'title', 'phase', 'businessArea', 'functionGroup',
  'screenPath', 'status', 'priority', 'ownerId', 'ownerName', 'reviewerId',
  'reviewerName', 'startDate', 'endDate', 'plannedEffort', 'actualEffort',
  'progress', 'description', 'requirementId', 'requirementCode', 'requirementTitle',
  'functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle',
  'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy',
  'isDeleted', 'version',
];
for (const key of requiredWhitelistKeys) {
  assert.match(helpers, new RegExp(`'${key}',`));
}

// Forbidden keys must not be in whitelist
const forbiddenKeys = [
  'approvalStatus', 'riskLevel', 'meetingIds', 'parentId', 'sortOrder',
  'reviewStatus', 'importBatchId', 'screenSpecId',
];
for (const key of forbiddenKeys) {
  assert.doesNotMatch(
    helpers,
    new RegExp(`function wbsWriteKeys\\(\\)[\\s\\S]*'${key}',`),
    `${key} must not be in wbsWriteKeys whitelist`,
  );
}

// Create/update contracts
assert.match(helpers, /data\.id == wbsItemId/);
assert.match(helpers, /data\.projectId == projectId/);
assert.match(helpers, /data\.keys\(\)\.hasAll\(wbsRequiredKeys\(\)\)/);
assert.match(helpers, /data\.keys\(\)\.hasOnly\(wbsWriteKeys\(\)\)/);
assert.match(helpers, /data\.version == 1/);
assert.match(helpers, /data\.version == prev\.version \+ 1/);
assert.match(helpers, /data\.createdBy == uid\(\)/);
assert.match(helpers, /data\.updatedBy == uid\(\)/);
assert.match(helpers, /data\.createdAt == request\.time/);
assert.match(helpers, /data\.updatedAt == request\.time/);
assert.match(helpers, /data\.isDeleted == false/);
assert.match(helpers, /data\.isDeleted == prev\.isDeleted/);
assert.match(helpers, /data\.deletedAt == null/);
assert.match(helpers, /data\.deletedAt == prev\.deletedAt/);
assert.match(helpers, /data\.deletedBy == null/);
assert.match(helpers, /data\.deletedBy == prev\.deletedBy/);
assert.match(helpers, /title\.size\(\) >= 2/);
assert.match(helpers, /title\.size\(\) <= 120/);

// ── wbsItems match block ─────────────────────────────────────────
assert.match(
  rulesSource,
  /match \/wbsItems\/\{wbsItemId\}[\s\S]*allow get, list: if canReadProject\(projectId\);/,
);
assert.match(
  rulesSource,
  /match \/wbsItems\/\{wbsItemId\}[\s\S]*allow create: if isValidWbsCreate\(projectId, wbsItemId\);/,
);
assert.match(
  rulesSource,
  /match \/wbsItems\/\{wbsItemId\}[\s\S]*allow update: if isValidWbsUpdate\(projectId, wbsItemId\);/,
);
assert.match(
  rulesSource,
  /match \/wbsItems\/\{wbsItemId\}[\s\S]*allow delete: if false;/,
);

const wbsBlock = rulesSource.match(
  /match \/wbsItems\/\{wbsItemId\} \{[\s\S]*?\n      \}/,
);
assert.ok(wbsBlock, 'wbsItems match block must exist');
assert.equal(
  /allow create, update, delete: if false;/.test(wbsBlock[0]),
  false,
  'wbsItems must not use combined create/update/delete deny',
);

// ── Counter wbsItems ─────────────────────────────────────────────
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*counterId == 'wbsItems'/,
);
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*isWbsWriter\(projectId\)/,
);
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*isValidWbsItemsCounterWrite\(\)/,
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

// Requirements / functionalSpecifications counter regression
assert.match(countersBlock[0], /counterId == 'requirements'/);
assert.match(countersBlock[0], /isRequirementWriter\(projectId\)/);
assert.match(countersBlock[0], /isValidRequirementsCounterWrite\(\)/);
assert.match(countersBlock[0], /counterId == 'functionalSpecifications'/);
assert.match(countersBlock[0], /isFunctionalSpecWriter\(projectId\)/);
assert.match(countersBlock[0], /isValidFunctionalSpecificationsCounterWrite\(\)/);

// ── Unopened artifact collections remain write-closed ────────────
for (const collection of ['screenFields', 'screenActions', 'artifactLinks']) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

console.log('wbs rules contract: PASS');
