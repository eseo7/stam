#!/usr/bin/env node
/**
 * Contract: FS-7 live Firestore QA workflow — syntax + secret non-exposure.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = path.join(ROOT, '.github/workflows/fs7-live-firestore-qa.yml');
const scriptPath = path.join(ROOT, 'scripts/qa-fs7-live-persistence-agent.mjs');

const workflow = fs.readFileSync(workflowPath, 'utf8');
const script = fs.readFileSync(scriptPath, 'utf8');

assert.match(workflow, /name:\s*FS-7 Live Firestore QA/);
assert.match(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /pull_request:/);
assert.doesNotMatch(workflow, /push:/);
assert.match(workflow, /github\.repository == 'eseo7\/stam'/);
assert.match(workflow, /FIREBASE_PROJECT_ID:\s*stam-preview-hosting/);
assert.match(workflow, /STAM_PROJECT_ID:\s*stam-demo/);
assert.match(workflow, /secrets\.FS7_QA_SERVICE_ACCOUNT_JSON/);
assert.match(workflow, /secrets\.FIREBASE_SERVICE_ACCOUNT_STAM_PREVIEW_HOSTING/);
assert.match(workflow, /secret_configured=true/);
assert.match(workflow, /node scripts\/qa-fs7-live-persistence-agent\.mjs/);
assert.match(workflow, /npm install --no-save firebase-admin/);
assert.doesNotMatch(workflow, /\/tmp\/qa-deps/);
assert.match(workflow, /rm -f "\$creds"/);

// Secret non-exposure guards
const forbiddenPatterns = [
  /\becho\s+["']?\$FS7_QA_JSON/,
  /\becho\s+["']?\$FIREBASE_SA/,
  /\bprintenv\b/,
  /\bset\s+-x\b/,
  /secrets\.[A-Z_]+\s*>>/,
  /\bcat\s+["']?\$creds/,
];
forbiddenPatterns.forEach((re) => {
  assert.doesNotMatch(workflow, re, `workflow must not match ${re}`);
});

assert.match(script, /BLOCKED-PERMISSION/);
assert.match(script, /--artifact-out/);
assert.match(script, /Object\.prototype\.hasOwnProperty\.call/);
assert.match(script, /requirementIdAbsent/);
assert.match(script, /createQaRequire/);
assert.match(script, /firebase-admin', 'package\.json'/);
assert.doesNotMatch(script, /resolveQaDepsPackageJson/);
assert.match(script, /require\('firebase-admin'\)/);
assert.doesNotMatch(script, /import\('firebase-admin'\)/);
assert.doesNotMatch(script, /console\.log\(.*token/i);

console.log('fs7 live qa workflow contract: PASS');
