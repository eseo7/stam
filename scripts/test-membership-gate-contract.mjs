import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUTH_PAGES_DIR = path.join(ROOT, 'stam/pages/auth');

const authSource = await readFile(path.join(ROOT, 'stam/js/stam.auth.js'), 'utf8');
const gateSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-membership-gate.js'), 'utf8');
const projectListSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-project-list.js'), 'utf8');

assert.match(authSource, /authMembershipGate/);
assert.match(authSource, /resolveTargetScreen/);
assert.match(authSource, /applyMembershipRouteGuard/);
assert.match(authSource, /bootstrapUserDoc/);
assert.equal(/renderProjectSelectSkeleton/.test(authSource), false);
assert.equal(/projects\.html'\)/.test(authSource) && /redirectTo\('project-select'\)/.test(authSource), false);

assert.match(gateSource, /collectionGroup\('members'\)/);
assert.match(gateSource, /resolveTargetFromMembership/);
assert.equal(/\.set\(|\.update\(|\.add\(|\.delete\(/.test(gateSource), false);

assert.match(projectListSource, /collectionGroup\('members'\)/);
assert.match(projectListSource, /sessionStorage\.setItem\('stam:selectedProjectId'/);
assert.match(projectListSource, /project-overview\.html\?projectId=/);
assert.equal(/\.set\(|\.update\(|\.add\(|\.delete\(/.test(projectListSource), false);

const authPages = [
  'login.html',
  'projects.html',
  'access-pending.html',
  'access-denied.html',
  'no-project.html',
];

for (const page of authPages) {
  const html = await readFile(path.join(AUTH_PAGES_DIR, page), 'utf8');
  assert.match(html, /stam\.auth-membership-gate\.js/, `${page} must load membership gate`);
  assert.match(html, /stam\.auth\.js/, `${page} must load stam.auth.js`);
}

const projectsHtml = await readFile(path.join(AUTH_PAGES_DIR, 'projects.html'), 'utf8');
assert.match(projectsHtml, /stam\.auth-project-list\.js/);

for (const page of ['login.html', 'access-pending.html', 'access-denied.html', 'no-project.html']) {
  const html = await readFile(path.join(AUTH_PAGES_DIR, page), 'utf8');
  assert.equal(/stam\.auth-project-list\.js/.test(html), false, `${page} must not load project list`);
}

function createGateContext() {
  const context = vm.createContext({
    window: { STAM: {} },
    firebase: undefined,
  });
  vm.runInContext(gateSource, context, { filename: 'stam.auth-membership-gate.js' });
  return context.window.STAM.authMembershipGate;
}

const gate = createGateContext();
assert.ok(gate.TARGET_SCREENS);

function snap(exists, data) {
  return {
    exists: !!exists,
    data: function () { return data || {}; },
  };
}

function memberDoc(status) {
  return {
    exists: true,
    data: function () { return { status: status }; },
  };
}

const resolve = gate.TARGET_SCREENS;
assert.equal(
  gate.resolveTargetFromMembership(snap(true, { status: 'disabled' }), []),
  resolve['access-denied']
);
assert.equal(
  gate.resolveTargetFromMembership(snap(true, { status: 'active' }), [memberDoc('active')]),
  resolve['project-select']
);
assert.equal(
  gate.resolveTargetFromMembership(snap(true, { status: 'active' }), [memberDoc('pending')]),
  resolve['access-pending']
);
assert.equal(
  gate.resolveTargetFromMembership(snap(true, { status: 'active' }), [memberDoc('denied')]),
  resolve['access-denied']
);
assert.equal(
  gate.resolveTargetFromMembership(snap(true, { status: 'active' }), [memberDoc('removed')]),
  resolve['access-denied']
);
assert.equal(
  gate.resolveTargetFromMembership(snap(true, { status: 'active' }), []),
  resolve['no-project']
);
assert.equal(
  gate.resolveTargetFromMembership(snap(true, { status: 'active' }), [memberDoc('pending'), memberDoc('active')]),
  resolve['project-select']
);

console.log('membership gate contract: PASS');
