import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * STAM FS-1 — functionalSpecifications Firestore rules structure contract.
 *
 * Collection: projects/{projectId}/functionalSpecifications/{functionalSpecId}
 * Writer roles: owner / admin / editor (viewer read-only, delete closed)
 *
 * Usage:
 *   node scripts/test-functional-spec-rules-contract.mjs
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

// ── FS-1 helper block ────────────────────────────────────────────
assert.match(rulesSource, /Functional specifications write helpers \(FS-1\)/);
assert.match(rulesSource, /function isFunctionalSpecWriter\(projectId\)/);
assert.match(rulesSource, /function isValidFunctionalSpecCreate\(projectId, functionalSpecId\)/);
assert.match(rulesSource, /function isValidFunctionalSpecUpdate\(projectId, functionalSpecId\)/);
assert.match(rulesSource, /function functionalSpecWriteKeys\(\)/);
assert.match(rulesSource, /function isValidFunctionalSpecTitle\(title\)/);
assert.match(rulesSource, /function isValidFunctionalSpecStatus\(status\)/);
assert.match(rulesSource, /function isValidFunctionalSpecPriority\(priority\)/);
assert.match(rulesSource, /function isValidFunctionalSpecFunctionType\(functionType\)/);

const helperBlock = rulesSource.match(
  /\/\/ ── Functional specifications write helpers \(FS-1\)[\s\S]*?\/\/ ── users\/\{uid\} bootstrap helpers/,
);
assert.ok(helperBlock, 'functionalSpecifications helper block must exist');
const helpers = helperBlock[0];

assert.match(helpers, /status == 'draft'/);
assert.match(helpers, /status == 'hold'/);
assert.match(helpers, /priority == 'high'/);
assert.match(helpers, /priority == 'mid'/);
assert.match(helpers, /priority == 'low'/);
assert.match(helpers, /functionType == 'view'/);
assert.match(helpers, /functionType == 'integrate'/);
assert.match(helpers, /'requirementId',/);
assert.match(helpers, /'requirementCode',/);
assert.match(helpers, /'requirementTitle',/);
assert.match(helpers, /data\.id == functionalSpecId/);
assert.match(helpers, /data\.keys\(\)\.hasOnly\(functionalSpecWriteKeys\(\)\)/);
assert.match(helpers, /data\.version == 1/);
assert.match(helpers, /data\.version == prev\.version \+ 1/);
assert.match(helpers, /data\.isDeleted == false/);
assert.match(helpers, /data\.isDeleted == prev\.isDeleted/);
assert.match(helpers, /title\.size\(\) >= 2/);
assert.match(helpers, /title\.size\(\) <= 120/);

// Writer reuses requirement writer roles (viewer not included)
assert.match(rulesSource, /function isFunctionalSpecWriter\(projectId\)/);
assert.match(rulesSource, /return isRequirementWriter\(projectId\)/);

// ── Match block ────────────────────────────────────────────────
assert.match(
  rulesSource,
  /match \/functionalSpecifications\/\{functionalSpecId\}[\s\S]*allow get, list: if canReadProject\(projectId\);/,
);
assert.match(
  rulesSource,
  /match \/functionalSpecifications\/\{functionalSpecId\}[\s\S]*allow create: if isValidFunctionalSpecCreate\(projectId, functionalSpecId\);/,
);
assert.match(
  rulesSource,
  /match \/functionalSpecifications\/\{functionalSpecId\}[\s\S]*allow update: if isValidFunctionalSpecUpdate\(projectId, functionalSpecId\);/,
);
assert.match(
  rulesSource,
  /match \/functionalSpecifications\/\{functionalSpecId\}[\s\S]*allow delete: if false;/,
);

const functionalSpecBlock = rulesSource.match(
  /match \/functionalSpecifications\/\{functionalSpecId\} \{[\s\S]*?\n      \}/,
);
assert.ok(functionalSpecBlock, 'functionalSpecifications match block must exist');
assert.equal(
  /allow create, update, delete: if false;/.test(functionalSpecBlock[0]),
  false,
  'functionalSpecifications must not use combined create/update/delete deny',
);

// ── Other artifact collections remain write-closed ─────────────
for (const collection of ['screenFields', 'screenActions', 'artifactLinks']) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

// ── FS-6A functionalSpecifications counter ───────────────────────
assert.match(rulesSource, /function isValidFunctionalSpecificationsCounterWrite\(\)/);
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*counterId == 'functionalSpecifications'/,
);
assert.match(
  rulesSource,
  /match \/counters\/\{counterId\}[\s\S]*isValidFunctionalSpecificationsCounterWrite\(\)/,
);

// functionalDefinitions is local/prototype only — must not appear as Firestore path
assert.doesNotMatch(
  rulesSource,
  /match \/functionalDefinitions\//,
  'local store name functionalDefinitions must not be used in Firestore rules',
);

const countersBlock = rulesSource.match(
  /match \/counters\/\{counterId\} \{[\s\S]*?\n      \}/,
);
assert.ok(countersBlock, 'counters match block must exist');
assert.match(countersBlock[0], /allow get, list: if canReadProject\(projectId\);/);
assert.match(countersBlock[0], /allow delete: if false;/);
assert.doesNotMatch(
  countersBlock[0],
  /memberRole\(projectId\) == "viewer"/,
  'viewer must not be a counter writer',
);

console.log('functional spec rules contract: PASS');
