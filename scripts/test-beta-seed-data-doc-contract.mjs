import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const betaDocPath = path.join(ROOT, 'docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md');
const reportPath = path.join(ROOT, 'docs/reports/STAM_PR323_Beta_Seed_Data_Access_Matrix.md');
const betaDoc = await readFile(betaDocPath, 'utf8');
const report = await readFile(reportPath, 'utf8');

const requiredSections = [
  '## 1. 문서 목적',
  '## 2. 현재 코드 기준 요약',
  '## 3. Firestore 기준 구조',
  '## 4. 1차 베타 Seed Data 기준',
  '## 5. Google 로그인 계정 준비 절차',
  '## 6. 베타 QA 체크리스트',
  '## 7. 후속 작업 입력 기준',
];

for (const section of requiredSections) {
  assert.match(betaDoc, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(betaDoc, /운영·QA 기준/);
assert.match(betaDoc, /Firestore write 작업/);
assert.match(betaDoc, /Google 로그인만/);
assert.match(betaDoc, /이메일·비밀번호 가입.*없음/);
assert.match(betaDoc, /active 멤버십만/);
assert.match(betaDoc, /users\/\{uid\}/);
assert.match(betaDoc, /projects\/\{projectId\}/);
assert.match(betaDoc, /members\/\{uid\}/);
assert.match(betaDoc, /status: active \| disabled/);
assert.match(betaDoc, /status: active \| pending \| denied \| removed/);
assert.match(betaDoc, /role: owner \| admin \| editor \| viewer/);
assert.match(betaDoc, /access-pending\.html/);
assert.match(betaDoc, /access-denied\.html/);
assert.match(betaDoc, /no-project\.html/);
assert.match(betaDoc, /projects\.html/);
assert.match(betaDoc, /login\.html/);
assert.match(betaDoc, /stam-demo/);
assert.match(betaDoc, /document\.body\.hidden = false/);

const matrixIds = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'];
for (const id of matrixIds) {
  assert.match(betaDoc, new RegExp(`\\| ${id} \\|`));
}

assert.match(betaDoc, /seed script를 추가하지 않음|seed script를 만들지 않는다/);
assert.doesNotMatch(betaDoc, /node scripts\/seed-.*\.mjs.*생성/);

assert.match(report, /PR #323/);
assert.match(report, /STAM_Beta_Seed_Data_Access_Matrix_v1\.md/);

const forbiddenDiff = execSync('git diff --name-only HEAD', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();

const forbiddenPrefixes = [
  'stam/js/',
  'stam/css/',
  'stam/pages/',
  'stam/assets/',
  'firebase.json',
  '.firebaserc',
  'firestore.rules',
  '.github/workflows/',
];

if (forbiddenDiff) {
  const touched = forbiddenDiff.split('\n').filter(Boolean);
  for (const file of touched) {
    const hit = forbiddenPrefixes.find((prefix) => file.startsWith(prefix) || file === prefix);
    assert.equal(hit, undefined, `forbidden path modified: ${file}`);
  }
}

const newSeedScripts = execSync('git diff --name-only HEAD --diff-filter=A -- scripts/', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean);

for (const script of newSeedScripts) {
  assert.equal(
    script.endsWith('test-beta-seed-data-doc-contract.mjs'),
    true,
    `unexpected new script: ${script}`
  );
}

console.log('beta seed data doc contract: PASS');
