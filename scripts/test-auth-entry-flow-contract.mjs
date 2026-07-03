import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUTH_PAGES_DIR = path.join(ROOT, 'stam/pages/auth');
const AUTH_PAGES = [
  'login.html',
  'projects.html',
  'access-pending.html',
  'access-denied.html',
  'no-project.html',
];

const FORBIDDEN_USER_PHRASES = [
  'Firebase Auth',
  'Firebase SDK',
  'Firestore',
  'active 프로젝트',
];

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function stripScriptBlocks(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function extractUserFacingJsStrings(source) {
  const strings = [];
  const patterns = [
    /showAuthMessage\(\s*'([^']+)'/g,
    /showAuthMessage\(\s*"([^"]+)"/g,
    /setLoading\([^,]+,\s*'([^']+)'/g,
    /renderProjectListError\([^,]+,\s*'([^']+)'/g,
    /label\.textContent = busy \? '([^']+)' : '([^']+)'/g,
    /textContent = \(err && err\.message\) \? err\.message : '([^']+)'/g,
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      match.slice(1).filter(Boolean).forEach((value) => strings.push(value));
    }
  });
  return strings;
}

for (const page of AUTH_PAGES) {
  const html = await readFile(path.join(AUTH_PAGES_DIR, page), 'utf8');
  const visible = stripScriptBlocks(stripHtmlComments(html));
  for (const phrase of FORBIDDEN_USER_PHRASES) {
    assert.equal(visible.includes(phrase), false, `${page} contains forbidden phrase: ${phrase}`);
  }
}

const bootstrapSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-bootstrap.js'), 'utf8');
const projectListSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-project-list.js'), 'utf8');

const userJsCopy = [
  ...extractUserFacingJsStrings(bootstrapSource),
  ...extractUserFacingJsStrings(projectListSource),
  ...(bootstrapSource.match(/'[^']{8,}'/g) || []).filter((s) =>
    s.includes('로그인') || s.includes('접근') || s.includes('프로젝트') || s.includes('Google')
  ).map((s) => s.slice(1, -1)),
];

for (const phrase of FORBIDDEN_USER_PHRASES) {
  const hit = userJsCopy.find((text) => text.includes(phrase));
  assert.equal(hit, undefined, `auth JS user copy contains forbidden phrase: ${phrase}`);
}

const loginHtml = await readFile(path.join(AUTH_PAGES_DIR, 'login.html'), 'utf8');
assert.match(loginHtml, /data-stam-auth-action="google-sign-in"/);
assert.match(loginHtml, /Google로 계속하기/);
assert.match(loginHtml, /이메일·비밀번호 가입은 지원하지 않습니다/);

const projectsHtml = await readFile(path.join(AUTH_PAGES_DIR, 'projects.html'), 'utf8');
assert.match(projectsHtml, /data-stam-project-list-root/);
assert.match(projectsHtml, /접근 권한이 활성화된 프로젝트만 표시됩니다/);

assert.match(bootstrapSource, /contact-admin/);
assert.match(bootstrapSource, /showAuthMessage\('프로젝트 관리자에게 사용 중인 Google 계정으로 접근 권한을 요청해 주세요\.'\)/);
assert.match(bootstrapSource, /new firebase\.auth\.GoogleAuthProvider\(\)/);
assert.match(bootstrapSource, /signInWithPopup\(provider\)/);

assert.equal(/\.set\(|\.update\(|\.add\(|\.delete\(/.test(projectListSource), false);
assert.equal(/requirementsService\.(create|update|softDelete)/.test(projectListSource), false);

const gateDiff = execSync('git diff --name-only HEAD -- stam/js/stam.auth-membership-gate.js', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
assert.equal(gateDiff, '', 'stam/js/stam.auth-membership-gate.js must not be modified');

for (const page of AUTH_PAGES) {
  const html = await readFile(path.join(AUTH_PAGES_DIR, page), 'utf8');
  assert.match(html, /\/__\/firebase\/8\.10\.1\/firebase-app\.js/);
  assert.match(html, /\/__\/firebase\/8\.10\.1\/firebase-auth\.js/);
  assert.match(html, /\/__\/firebase\/8\.10\.1\/firebase-firestore\.js/);
  assert.match(html, /\/__\/firebase\/init\.js/);
  assert.equal(/<style[\s>]/i.test(html), false, `${page} must not add inline style blocks`);
  assert.equal(/\sstyle="/i.test(html), false, `${page} must not add inline style attributes`);
  const inlineScripts = html.match(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi) || [];
  assert.equal(inlineScripts.length, 0, `${page} must not add inline script bodies`);
}

const authDirFiles = await readdir(AUTH_PAGES_DIR);
assert.deepEqual(authDirFiles.sort(), AUTH_PAGES.sort());

console.log('auth entry flow contract: PASS');
