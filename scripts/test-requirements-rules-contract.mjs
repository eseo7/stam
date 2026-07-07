import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-service.js'), 'utf8');

// ── Firestore rules: PR #358 helpers ─────────────────────────────
assert.match(rulesSource, /PR #358/);
assert.match(rulesSource, /function memberRole\(projectId\)/);
assert.match(rulesSource, /function isRequirementWriter\(projectId\)/);
assert.match(rulesSource, /function isValidRequirementCreate\(projectId\)/);
assert.match(rulesSource, /function isValidRequirementUpdate\(projectId\)/);
assert.match(rulesSource, /function isValidRequirementTitle\(title\)/);

// ── Requirements match block ─────────────────────────────────────
assert.match(
  rulesSource,
  /match \/requirements\/\{requirementId\}[\s\S]*allow get, list: if canReadProject\(projectId\);/,
);
assert.match(
  rulesSource,
  /match \/requirements\/\{requirementId\}[\s\S]*allow create: if isValidRequirementCreate\(projectId\);/,
);
assert.match(
  rulesSource,
  /match \/requirements\/\{requirementId\}[\s\S]*allow update: if isValidRequirementUpdate\(projectId\);/,
);
assert.match(
  rulesSource,
  /match \/requirements\/\{requirementId\}[\s\S]*allow delete: if false;/,
);
const requirementsBlock = rulesSource.match(
  /match \/requirements\/\{requirementId\} \{[\s\S]*?\n      \}/,
);
assert.ok(requirementsBlock, 'requirements match block must exist');
assert.equal(
  /allow create, update, delete: if false;/.test(requirementsBlock[0]),
  false,
  'requirements must not use combined create/update/delete deny',
);

// ── Other artifact collections remain write-closed ───────────────
for (const collection of ['wbsItems', 'screenSpecs', 'screenFields', 'screenActions', 'artifactLinks']) {
  assert.match(
    rulesSource,
    new RegExp(`match /${collection}/\\{[^}]+\\}[\\s\\S]*allow create, update, delete: if false;`),
    `${collection} writes must stay closed`,
  );
}

// ── Service skeleton: role helpers ─────────────────────────────
assert.match(serviceSource, /WRITE_ROLES = \['owner', 'admin', 'editor'\]/);
assert.match(serviceSource, /READ_ROLES = \['owner', 'admin', 'editor', 'viewer'\]/);
assert.match(serviceSource, /function canWriteRequirements\(role\)/);
assert.match(serviceSource, /function canReadRequirements\(role\)/);
assert.match(serviceSource, /function createMemberRoleAuthorize\(getMemberRole\)/);
assert.match(serviceSource, /createMemberRoleAuthorize: createMemberRoleAuthorize/);

function loadServiceContract() {
  const window = {};
  const context = vm.createContext({
    window,
    console,
    Date,
    Promise,
    Number,
    String,
    JSON,
    Array,
    Object,
    Error,
  });
  window.window = window;
  vm.runInContext(serviceSource, context, { filename: 'stam.requirements-service.js' });
  return window.STAM.requirementsServiceContract;
}

const contract = loadServiceContract();

assert.equal(JSON.stringify(contract.WRITE_ROLES), JSON.stringify(['owner', 'admin', 'editor']));
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(['owner', 'admin', 'editor', 'viewer']));

for (const role of ['owner', 'admin', 'editor']) {
  assert.equal(contract.canWriteRequirements(role), true, `${role} can write`);
  assert.equal(contract.canReadRequirements(role), true, `${role} can read`);
}

assert.equal(contract.canWriteRequirements('viewer'), false, 'viewer cannot write');
assert.equal(contract.canReadRequirements('viewer'), true, 'viewer can read');
assert.equal(contract.canWriteRequirements('guest'), false);
assert.equal(contract.canReadRequirements('guest'), false);

const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
const ACTIONS = contract.ACTIONS;

for (const role of ['owner', 'admin', 'editor']) {
  assert.equal(
    authorize(ACTIONS.CREATE, { context: { memberRole: role } }),
    true,
    `${role} authorize create`,
  );
  assert.equal(
    authorize(ACTIONS.UPDATE, { context: { memberRole: role } }),
    true,
    `${role} authorize update`,
  );
  assert.equal(
    authorize(ACTIONS.READ, { context: { memberRole: role } }),
    true,
    `${role} authorize read`,
  );
}

assert.equal(authorize(ACTIONS.CREATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize(ACTIONS.UPDATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize(ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(authorize(ACTIONS.DELETE, { context: { memberRole: 'owner' } }), false);
assert.equal(authorize(ACTIONS.DELETE, { context: { memberRole: 'admin' } }), false);
assert.equal(authorize(ACTIONS.DELETE, { context: { memberRole: 'editor' } }), false);

// Default authorize path on window.STAM.requirementsService remains allow-all (no runtime wiring).
assert.equal(typeof contract.createService, 'function');

console.log('requirements rules contract: PASS');
