import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const userBootstrapSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-user-bootstrap.js'), 'utf8');
const projectCreateSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-project-create.js'), 'utf8');
const bootstrapSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-bootstrap.js'), 'utf8');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const projectsHtml = await readFile(path.join(ROOT, 'stam/pages/auth/projects.html'), 'utf8');
const noProjectHtml = await readFile(path.join(ROOT, 'stam/pages/auth/no-project.html'), 'utf8');

assert.match(userBootstrapSource, /bootstrapUser/);
assert.match(userBootstrapSource, /collection\('users'\)/);
assert.match(userBootstrapSource, /provider:\s*PROVIDER|provider:\s*'google'/);
assert.match(userBootstrapSource, /lastLoginAt/);
assert.doesNotMatch(userBootstrapSource, /\.delete\(/);

assert.match(projectCreateSource, /createProject/);
assert.match(projectCreateSource, /role:\s*'owner'/);
assert.match(projectCreateSource, /ownerUserId/);
assert.match(projectCreateSource, /batch\.set/);
assert.match(projectCreateSource, /data-stam-auth-action="create-project"/);

assert.match(bootstrapSource, /authUserBootstrap/);
assert.match(bootstrapSource, /bootstrapUser/);
assert.match(bootstrapSource, /updateUserAccountDisplay/);
assert.match(bootstrapSource, /data-stam-user-email/);

assert.match(rulesSource, /allow create: if isSelfUserDoc\(userId\)/);
assert.match(rulesSource, /allow create: if validProjectCreate\(\)/);
assert.match(rulesSource, /allow create: if validOwnerMemberCreate/);

assert.match(projectsHtml, /stam\.auth-user-bootstrap\.js/);
assert.match(projectsHtml, /stam\.auth-project-create\.js/);
assert.match(projectsHtml, /data-stam-user-email/);
assert.match(projectsHtml, /data-stam-project-create-name/);
assert.match(projectsHtml, /data-stam-auth-action="create-project"/);

assert.match(noProjectHtml, /stam\.auth-project-create\.js/);
assert.match(noProjectHtml, /data-stam-auth-action="create-project"/);
assert.match(noProjectHtml, /stam-btn--primary/);

for (const html of [projectsHtml, noProjectHtml]) {
  assert.equal(/<style[\s>]/i.test(html), false);
  assert.equal(/\sstyle="/i.test(html), false);
  const inlineScripts = html.match(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi) || [];
  assert.equal(inlineScripts.length, 0);
}

console.log('auth bootstrap contract: PASS');
