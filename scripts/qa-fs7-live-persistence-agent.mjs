#!/usr/bin/env node
/**
 * FS-7 — Live Firestore persistence QA (staging UI + Firestore Admin verification)
 *
 * Checklist: W-01~W-12, W-10b, V-01~V-03
 *
 * Credentials (one of):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 *
 * Environment overrides:
 *   FIREBASE_PROJECT_ID (default stam-preview-hosting)
 *   STAM_PROJECT_ID (default stam-demo)
 *   STAGING_URL
 *   GITHUB_RUN_ID / GITHUB_SHA (artifact metadata)
 *
 * Options:
 *   --artifact-out <path>   JSON report (no secrets)
 *   --artifact-md <path>    Markdown summary
 *   --staging-url <url>
 *   --project-id <id>
 *   --agent-uid <uid>
 *   --firebase-project <id>
 *   --no-cleanup
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function createQaRequire() {
  const moduleRoots = [
    path.join(ROOT, 'node_modules'),
    path.join('/tmp/qa-deps', 'node_modules'),
  ];
  for (const modulesDir of moduleRoots) {
    const firebaseAdminPkg = path.join(modulesDir, 'firebase-admin', 'package.json');
    if (fs.existsSync(firebaseAdminPkg)) {
      return createRequire(firebaseAdminPkg);
    }
  }
  throw new Error(
    'QA runtime deps missing: npm install --no-save firebase-admin playwright',
  );
}

const require = createQaRequire();

const LINK_FIELDS = ['requirementId', 'requirementCode', 'requirementTitle'];
const ALLOWED_FIREBASE_PROJECTS = new Set(['stam-preview-hosting']);

function parseArgs(argv) {
  const opts = {
    stagingUrl: process.env.STAGING_URL || 'https://stam-design-staging.web.app',
    projectId: process.env.STAM_PROJECT_ID || 'stam-demo',
    agentUid: 'fs7-agent-qa-b31c',
    firebaseProject: process.env.FIREBASE_PROJECT_ID || 'stam-preview-hosting',
    cleanup: true,
    artifactOut: '',
    artifactMd: '',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--staging-url') opts.stagingUrl = argv[++i];
    else if (arg === '--project-id') opts.projectId = argv[++i];
    else if (arg === '--agent-uid') opts.agentUid = argv[++i];
    else if (arg === '--firebase-project') opts.firebaseProject = argv[++i];
    else if (arg === '--artifact-out') opts.artifactOut = argv[++i];
    else if (arg === '--artifact-md') opts.artifactMd = argv[++i];
    else if (arg === '--no-cleanup') opts.cleanup = false;
    else if (arg === '--help' || arg === '-h') {
      console.log('See script header for usage.');
      process.exit(0);
    }
  }
  return opts;
}

function clean(v) {
  return String(v == null ? '' : v).trim();
}

function linkSnapshot(data) {
  const src = data || {};
  const out = {
    requirementId: Object.prototype.hasOwnProperty.call(src, 'requirementId') ? src.requirementId : undefined,
    requirementCode: Object.prototype.hasOwnProperty.call(src, 'requirementCode') ? src.requirementCode : undefined,
    requirementTitle: Object.prototype.hasOwnProperty.call(src, 'requirementTitle') ? src.requirementTitle : undefined,
    requirementIdAbsent: !Object.prototype.hasOwnProperty.call(src, 'requirementId'),
    requirementCodeAbsent: !Object.prototype.hasOwnProperty.call(src, 'requirementCode'),
    requirementTitleAbsent: !Object.prototype.hasOwnProperty.call(src, 'requirementTitle'),
    keysPresent: LINK_FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(src, k)),
    keysAbsent: LINK_FIELDS.filter((k) => !Object.prototype.hasOwnProperty.call(src, k)),
  };
  return out;
}

function unlinkAbsentReport(data) {
  const report = {
    requirementIdAbsent: Object.prototype.hasOwnProperty.call(data || {}, 'requirementId') === false,
    requirementCodeAbsent: Object.prototype.hasOwnProperty.call(data || {}, 'requirementCode') === false,
    requirementTitleAbsent: Object.prototype.hasOwnProperty.call(data || {}, 'requirementTitle') === false,
  };
  report.pass = report.requirementIdAbsent && report.requirementCodeAbsent && report.requirementTitleAbsent;
  LINK_FIELDS.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(data || {}, k)) {
      const v = data[k];
      if (v === '' || v === null) report.pass = false;
    }
  });
  return report;
}

function assertKeysAbsent(data, label) {
  const report = unlinkAbsentReport(data);
  if (!report.pass) {
    const present = LINK_FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(data || {}, k));
    throw new Error(`${label}: link keys not absent — present=${present.join(',')}`);
  }
}

function assertKeysPresent(data, label) {
  const missing = LINK_FIELDS.filter((k) => !Object.prototype.hasOwnProperty.call(data || {}, k));
  if (missing.length) throw new Error(`${label}: missing keys ${missing.join(', ')}`);
  LINK_FIELDS.forEach((k) => {
    if (!clean(data[k])) throw new Error(`${label}: ${k} empty`);
  });
}

function classifyError(err) {
  const code = err && (err.code || err.errorInfo?.code || '');
  const msg = String(err && err.message ? err.message : err);
  if (/permission|insufficient|denied|403|7 PERMISSION_DENIED/i.test(`${code} ${msg}`)) {
    return 'BLOCKED-PERMISSION';
  }
  return 'FAIL';
}

function permissionCategory(err) {
  const text = `${err && err.code} ${err && err.message}`.toLowerCase();
  if (text.includes('auth') || text.includes('custom token') || text.includes('identitytoolkit')) {
    return 'firebase-auth-admin (custom token / user management)';
  }
  if (text.includes('firestore') || text.includes('datastore')) {
    return 'cloud-datastore-user (Firestore read/write/delete on stam-demo)';
  }
  return 'firebase-admin staging QA scope';
}

async function loadAdmin(opts) {
  if (!ALLOWED_FIREBASE_PROJECTS.has(opts.firebaseProject)) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: `Firebase project must be stam-preview-hosting (got ${opts.firebaseProject})`,
    };
  }

  let credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!credPath && inline) {
    credPath = path.join(os.tmpdir(), `fs7-agent-sa-${process.pid}.json`);
    fs.writeFileSync(credPath, inline, { mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  }
  if (!credPath || !fs.existsSync(credPath)) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: 'Missing GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON',
    };
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: opts.firebaseProject });
  }
  return { ok: true, admin, credPath, status: 'PASS' };
}

async function runPermissionPrecheck(admin, opts) {
  const checks = [];
  const categories = new Set();

  const db = admin.firestore();
  const auth = admin.auth();

  // Firestore read — stam-demo project doc
  try {
    const snap = await db.collection('projects').doc(opts.projectId).get();
    checks.push({ id: 'firestore-read-project', ok: true, exists: snap.exists });
  } catch (err) {
    checks.push({ id: 'firestore-read-project', ok: false, category: permissionCategory(err) });
    categories.add(permissionCategory(err));
  }

  // Firestore list — functionalSpecifications
  try {
    await db.collection('projects').doc(opts.projectId).collection('functionalSpecifications').limit(1).get();
    checks.push({ id: 'firestore-read-functional-specs', ok: true });
  } catch (err) {
    checks.push({ id: 'firestore-read-functional-specs', ok: false, category: permissionCategory(err) });
    categories.add(permissionCategory(err));
  }

  // Custom token
  try {
    await auth.createCustomToken(opts.agentUid);
    checks.push({ id: 'auth-custom-token', ok: true });
  } catch (err) {
    checks.push({ id: 'auth-custom-token', ok: false, category: permissionCategory(err) });
    categories.add(permissionCategory(err));
  }

  // Cleanup probe — write + delete ephemeral doc
  const probeId = `fs7-probe-${Date.now()}`;
  const probeRef = db.collection('projects').doc(opts.projectId)
    .collection('functionalSpecifications').doc(probeId);
  try {
    await probeRef.set({ title: 'probe', projectId: opts.projectId, isDeleted: false, createdAt: new Date().toISOString() });
    await probeRef.delete();
    checks.push({ id: 'firestore-write-delete-probe', ok: true });
  } catch (err) {
    checks.push({ id: 'firestore-write-delete-probe', ok: false, category: permissionCategory(err) });
    categories.add(permissionCategory(err));
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    return {
      ok: false,
      status: 'BLOCKED-PERMISSION',
      checks,
      requiredPermissionCategories: [...categories],
    };
  }
  return { ok: true, status: 'PASS', checks };
}

async function ensureAgentAccess(admin, opts) {
  const db = admin.firestore();
  const auth = admin.auth();

  try {
    await auth.getUser(opts.agentUid);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      await auth.createUser({ uid: opts.agentUid, displayName: 'FS7 Agent QA' });
    } else {
      throw err;
    }
  }

  const memberRef = db.collection('projects').doc(opts.projectId).collection('members').doc(opts.agentUid);
  await memberRef.set({
    userId: opts.agentUid,
    projectId: opts.projectId,
    status: 'active',
    role: 'owner',
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  const token = await auth.createCustomToken(opts.agentUid);
  return { db, token };
}

async function readFnDoc(db, projectId, docId) {
  const snap = await db.collection('projects').doc(projectId)
    .collection('functionalSpecifications').doc(docId).get();
  return { exists: snap.exists, id: docId, data: snap.exists ? snap.data() : null };
}

async function readCounter(db, projectId) {
  const snap = await db.collection('projects').doc(projectId)
    .collection('counters').doc('functionalSpecifications').get();
  return snap.exists ? snap.data() : { lastNumber: 0 };
}

async function seedLegacyRequirement(db, projectId) {
  const id = 'fs7-legacy-req-no-code';
  const ref = db.collection('projects').doc(projectId).collection('requirements').doc(id);
  const payload = {
    id,
    projectId,
    title: 'FS7 Legacy No Code Requirement',
    isDeleted: false,
    status: 'draft',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await ref.set(payload, { merge: true });
  return { id, title: payload.title };
}

async function findRequirementWithCode(db, projectId) {
  const snap = await db.collection('projects').doc(projectId).collection('requirements')
    .where('isDeleted', '==', false).limit(20).get();
  let first = null;
  let second = null;
  snap.forEach((doc) => {
    const d = doc.data() || {};
    if (!clean(d.code)) return;
    if (!first) first = { id: doc.id, code: d.code, title: d.title || '' };
    else if (!second && d.code !== first.code) second = { id: doc.id, code: d.code, title: d.title || '' };
  });
  return { first, second };
}

async function waitFor(fn, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('timeout');
}

async function signInStaging(page, stagingUrl, token) {
  const loginUrl = `${stagingUrl}/pages/auth/login`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.firebase && firebase.auth, { timeout: 30000 });
  await page.evaluate(async (customToken) => {
    await firebase.auth().signInWithCustomToken(customToken);
  }, token);
  await page.waitForFunction(() => firebase.auth().currentUser, { timeout: 15000 });
}

async function openFunctionalSpec(page, stagingUrl, projectId) {
  const url = `${stagingUrl}/pages/boards/functional-specification?projectId=${encodeURIComponent(projectId)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFor(() => page.evaluate(() => window.STAM
    && window.STAM.functionalSpecFirestoreList
    && window.STAM.functionalSpecFirestoreCrud
    && window.STAM.requirementPicker));
  await waitFor(() => page.evaluate((pid) => {
    const s = window.STAM.functionalSpecFirestoreList.getState();
    return s && s.projectId === pid && s.member && s.member.role;
  }, projectId));
}

async function selectRequirement(page, drawerId, reqCode) {
  await page.locator(`#${drawerId} [data-stam-requirement-picker-toggle]`).click();
  await page.waitForFunction(
    ({ drawerId, reqCode }) => {
      const root = document.querySelector(`#${drawerId} [data-stam-requirement-picker-root]`);
      return root && root.classList.contains('is-open')
        && root.querySelector(`[data-stam-requirement-picker-opt][data-req-code="${reqCode}"]`);
    },
    { drawerId, reqCode },
    { timeout: 30000 },
  );
  await page.locator(`#${drawerId} [data-stam-requirement-picker-opt][data-req-code="${reqCode}"]`).click();
}

async function selectLegacyByTitle(page, drawerId, title) {
  await page.locator(`#${drawerId} [data-stam-requirement-picker-toggle]`).click();
  await page.waitForFunction(
    ({ drawerId, title }) => {
      const root = document.querySelector(`#${drawerId} [data-stam-requirement-picker-root]`);
      return root && root.classList.contains('is-open')
        && Array.from(root.querySelectorAll('[data-stam-requirement-picker-opt]'))
          .some((opt) => (opt.getAttribute('data-req-title') || opt.textContent || '').includes(title));
    },
    { drawerId, title },
    { timeout: 30000 },
  );
  await page.locator(`#${drawerId} [data-stam-requirement-picker-opt]`).filter({ hasText: title }).first().click();
}

async function unlinkRequirement(page, drawerId) {
  await page.locator(`#${drawerId} [data-stam-requirement-picker-toggle]`).click();
  await page.waitForFunction(
    ({ drawerId }) => {
      const root = document.querySelector(`#${drawerId} [data-stam-requirement-picker-root]`);
      return root && root.classList.contains('is-open') && root.querySelector('[data-stam-requirement-picker-opt=""]');
    },
    { drawerId },
    { timeout: 30000 },
  );
  await page.locator(`#${drawerId} [data-stam-requirement-picker-opt=""]`).click();
}

async function clickRowByTitle(page, title) {
  await page.locator('#fn-tbody .fn-data-row').filter({ hasText: title }).first().click();
}

async function closeDrawers(page) {
  await page.evaluate(() => {
    document.getElementById('fn-scrim')?.classList.remove('show');
    document.querySelectorAll('.fn-drawer').forEach((d) => d.classList.remove('open'));
  });
}

function resultStatus(ok, detail) {
  if (ok) return 'PASS';
  if (String(detail).startsWith('BLOCKED-PERMISSION')) return 'BLOCKED-PERMISSION';
  if (String(detail).startsWith('BLOCKED')) return 'BLOCKED';
  return 'FAIL';
}

function record(results, id, ok, detail, evidence = {}) {
  const status = resultStatus(ok, detail);
  const row = { id, status, ok, detail, evidence, at: new Date().toISOString() };
  results.push(row);
  console.log(`${status}  ${id}: ${detail}`);
}

function buildArtifact(results, meta) {
  return {
    runId: meta.runId,
    githubRunId: meta.githubRunId || null,
    gitSha: meta.gitSha || null,
    firebaseProjectId: meta.firebaseProject,
    stamProjectId: meta.projectId,
    stagingUrl: meta.stagingUrl,
    executedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      pass: results.filter((r) => r.status === 'PASS').length,
      fail: results.filter((r) => r.status === 'FAIL').length,
      blocked: results.filter((r) => r.status === 'BLOCKED').length,
      blockedPermission: results.filter((r) => r.status === 'BLOCKED-PERMISSION').length,
    },
    cleanup: meta.cleanup || null,
    items: results.map((r) => ({
      id: r.id,
      status: r.status,
      detail: r.detail,
      evidence: r.evidence,
    })),
  };
}

function buildMarkdown(artifact) {
  const lines = [
    '# FS-7 Live Firestore QA Report',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| runId | ${artifact.runId} |`,
    `| githubRunId | ${artifact.githubRunId || '—'} |`,
    `| gitSha | ${artifact.gitSha || '—'} |`,
    `| firebaseProjectId | ${artifact.firebaseProjectId} |`,
    `| stamProjectId | ${artifact.stamProjectId} |`,
    `| executedAt | ${artifact.executedAt} |`,
    '',
    '## Summary',
    '',
    `- pass: ${artifact.summary.pass}`,
    `- fail: ${artifact.summary.fail}`,
    `- blocked: ${artifact.summary.blocked}`,
    `- blocked-permission: ${artifact.summary.blockedPermission}`,
    '',
    '## Checklist',
    '',
    '| ID | Status | Detail |',
    '|----|--------|--------|',
  ];
  artifact.items.forEach((item) => {
    lines.push(`| ${item.id} | ${item.status} | ${item.detail.replace(/\|/g, '\\|')} |`);
  });
  if (artifact.cleanup) {
    lines.push('', '## Cleanup', '', '```json', JSON.stringify(artifact.cleanup, null, 2), '```');
  }
  return `${lines.join('\n')}\n`;
}

function writeArtifacts(opts, artifact) {
  if (opts.artifactOut) {
    fs.mkdirSync(path.dirname(opts.artifactOut), { recursive: true });
    fs.writeFileSync(opts.artifactOut, `${JSON.stringify(artifact, null, 2)}\n`);
  }
  if (opts.artifactMd) {
    fs.mkdirSync(path.dirname(opts.artifactMd), { recursive: true });
    fs.writeFileSync(opts.artifactMd, buildMarkdown(artifact));
  }
}

function finish(results, opts, meta, exitCode) {
  const artifact = buildArtifact(results, meta);
  writeArtifacts(opts, artifact);
  const failed = results.filter((r) => r.status !== 'PASS');
  console.log('\n--- FS-7 live QA summary ---');
  console.log(`runId=${meta.runId} pass=${artifact.summary.pass} fail=${artifact.summary.fail} blocked=${artifact.summary.blocked + artifact.summary.blockedPermission}`);
  process.exit(exitCode);
}

async function run() {
  const opts = parseArgs(process.argv);
  const results = [];
  const createdDocIds = [];
  const runId = process.env.GITHUB_RUN_ID ? `FS7-GHA-${process.env.GITHUB_RUN_ID}` : `FS7-AGENT-${Date.now()}`;
  const linkedTitle = `${runId} linked`;
  const unlinkedTitle = `${runId} unlinked`;
  const legacyTitle = `${runId} legacy`;
  const meta = {
    runId,
    githubRunId: process.env.GITHUB_RUN_ID || null,
    gitSha: process.env.GITHUB_SHA || null,
    stagingUrl: opts.stagingUrl,
    projectId: opts.projectId,
    firebaseProject: opts.firebaseProject,
    cleanup: null,
  };

  const adminLoad = await loadAdmin(opts);
  if (!adminLoad.ok) {
    record(results, 'PRECHECK-credentials', false, `BLOCKED — ${adminLoad.reason}`, {
      firebaseProjectId: opts.firebaseProject,
      stamProjectId: opts.projectId,
    });
    finish(results, opts, meta, 2);
    return;
  }

  const { admin, credPath } = adminLoad;
  let db;
  let token;

  try {
    const precheck = await runPermissionPrecheck(admin, opts);
    if (!precheck.ok) {
      record(results, 'PRECHECK-permission', false, 'BLOCKED-PERMISSION — service account lacks staging QA scope', {
        checks: precheck.checks,
        requiredPermissionCategories: precheck.requiredPermissionCategories,
      });
      finish(results, opts, meta, 3);
      return;
    }
    record(results, 'PRECHECK-permission', true, 'Firestore read/write/delete + custom token OK', {
      checks: precheck.checks.map((c) => ({ id: c.id, ok: c.ok })),
    });

    ({ db, token } = await ensureAgentAccess(admin, opts));
  } catch (err) {
    const status = classifyError(err);
    record(results, 'PRECHECK-access', false, `${status} — ${err.message}`, {
      category: permissionCategory(err),
    });
    finish(results, opts, meta, status === 'BLOCKED-PERMISSION' ? 3 : 1);
    return;
  } finally {
    if (credPath && credPath.includes('fs7-agent-sa-')) {
      try { fs.unlinkSync(credPath); } catch (e) { /* noop */ }
    }
  }

  const reqs = await findRequirementWithCode(db, opts.projectId);
  if (!reqs.first || !reqs.second) {
    record(results, 'PRECHECK-requirements', false, 'BLOCKED — stam-demo needs ≥2 coded requirements', {
      found: { first: !!reqs.first, second: !!reqs.second },
    });
    finish(results, opts, meta, 2);
    return;
  }

  const legacyReq = await seedLegacyRequirement(db, opts.projectId);
  const counterBefore = await readCounter(db, opts.projectId);

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(`console.error: ${msg.text()}`);
  });

  let linkedDocId = '';
  let legacyDocId = '';
  let unlinkedDocId = '';
  let cleanupResult = { attempted: false, deleted: [], failed: [] };

  try {
    await signInStaging(page, opts.stagingUrl, token);
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    record(results, 'W-01', true, 'staging auth + functional-spec list load', {
      role: await page.evaluate(() => window.STAM.functionalSpecFirestoreList.getState().member.role),
    });

    await page.locator('#fn-reg-btn').click();
    await page.waitForSelector('#fn-dw-register.open');
    await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill(linkedTitle);
    await selectRequirement(page, 'fn-dw-register', reqs.first.code);
    await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
    await waitFor(() => page.evaluate((title) => Array.from(document.querySelectorAll('#fn-tbody .fn-data-row'))
      .some((r) => r.textContent.includes(title)), linkedTitle));

    linkedDocId = await page.evaluate((title) => {
      const item = (window.STAM.functionalSpecFirestoreList.getState().items || []).find((x) => x.title === title);
      return item && item.id;
    }, linkedTitle);
    createdDocIds.push(linkedDocId);

    const afterCreate = await readFnDoc(db, opts.projectId, linkedDocId);
    try {
      assertKeysPresent(afterCreate.data, 'W-02');
      record(results, 'W-02', true, 'linked create — 3 link fields in Firestore', {
        docId: linkedDocId,
        before: null,
        after: linkSnapshot(afterCreate.data),
      });
    } catch (err) {
      record(results, 'W-02', false, err.message, { docId: linkedDocId, after: linkSnapshot(afterCreate.data) });
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const afterRefreshCreate = await readFnDoc(db, opts.projectId, linkedDocId);
    const w03ok = afterRefreshCreate.exists && LINK_FIELDS.every((k) => clean(afterRefreshCreate.data[k]));
    record(results, 'W-03', w03ok, w03ok ? 'refresh keeps linked Firestore + UI' : 'refresh mismatch', {
      after: linkSnapshot(afterRefreshCreate.data),
      refreshPass: w03ok,
    });

    const counterAfter = await readCounter(db, opts.projectId);
    const code = afterRefreshCreate.data && afterRefreshCreate.data.code;
    const w04ok = /^FN_\d{3}$/.test(code || '') && Number(counterAfter.lastNumber) > Number(counterBefore.lastNumber || 0);
    record(results, 'W-04', w04ok, w04ok ? `FN code ${code}` : 'FN/counter mismatch', {
      code,
      counterBefore: counterBefore.lastNumber,
      counterAfter: counterAfter.lastNumber,
    });

    await clickRowByTitle(page, linkedTitle);
    await page.waitForSelector('#fn-dw-detail.open');
    await page.locator('[data-fn-open="edit"]').click();
    await page.waitForSelector('#fn-dw-edit.open');
    const beforeChange = await readFnDoc(db, opts.projectId, linkedDocId);
    await selectRequirement(page, 'fn-dw-edit', reqs.second.code);
    await page.locator('#fn-dw-edit .stam-dw-foot-right .fn-btn-pri').click();
    await page.waitForTimeout(1500);
    await closeDrawers(page);
    const afterChange = await readFnDoc(db, opts.projectId, linkedDocId);
    let w05ok = false;
    try {
      assertKeysPresent(afterChange.data, 'W-05');
      w05ok = afterChange.data.requirementCode === reqs.second.code && afterChange.data.requirementId === reqs.second.id;
    } catch (e) { /* */ }
    record(results, 'W-05', w05ok, w05ok ? 'requirement changed' : 'change failed', {
      before: linkSnapshot(beforeChange.data),
      after: linkSnapshot(afterChange.data),
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const afterChangeRefresh = await readFnDoc(db, opts.projectId, linkedDocId);
    const w06ok = afterChangeRefresh.data && afterChangeRefresh.data.requirementCode === reqs.second.code;
    record(results, 'W-06', w06ok, w06ok ? 'refresh keeps changed link' : 'refresh change lost', {
      firestore: linkSnapshot(afterChangeRefresh.data),
      refreshPass: w06ok,
    });

    await clickRowByTitle(page, linkedTitle);
    await page.waitForSelector('#fn-dw-detail.open');
    await page.locator('[data-fn-open="edit"]').click();
    await page.waitForSelector('#fn-dw-edit.open');
    const beforeUnlink = await readFnDoc(db, opts.projectId, linkedDocId);
    await unlinkRequirement(page, 'fn-dw-edit');
    await page.locator('#fn-dw-edit .stam-dw-foot-right .fn-btn-pri').click();
    await page.waitForTimeout(1500);
    await closeDrawers(page);
    const afterUnlink = await readFnDoc(db, opts.projectId, linkedDocId);
    const unlinkReport = unlinkAbsentReport(afterUnlink.data);
    let w07ok = false;
    try {
      assertKeysAbsent(afterUnlink.data, 'W-07');
      w07ok = true;
    } catch (e) { /* */ }
    record(results, 'W-07', w07ok, w07ok ? 'unlink — 3 keys absent' : 'unlink residual', {
      before: linkSnapshot(beforeUnlink.data),
      after: linkSnapshot(afterUnlink.data),
      unlink: unlinkReport,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const afterUnlinkRefresh = await readFnDoc(db, opts.projectId, linkedDocId);
    const unlinkRefreshReport = unlinkAbsentReport(afterUnlinkRefresh.data);
    let w08ok = false;
    try {
      assertKeysAbsent(afterUnlinkRefresh.data, 'W-08');
      w08ok = true;
    } catch (e) { /* */ }
    record(results, 'W-08', w08ok, w08ok ? 'refresh keeps unlink' : 'unlink not persisted', {
      firestore: linkSnapshot(afterUnlinkRefresh.data),
      unlink: unlinkRefreshReport,
      refreshPass: w08ok,
    });

    await page.locator('#fn-reg-btn').click();
    await page.waitForSelector('#fn-dw-register.open');
    await page.evaluate(() => {
      const drawer = document.getElementById('fn-dw-register');
      const picker = drawer && drawer.querySelector('[data-stam-requirement-picker]');
      if (picker && window.STAM.requirementPicker) window.STAM.requirementPicker.clear(picker);
    });
    await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill(unlinkedTitle);
    await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
    await waitFor(() => page.evaluate((title) => (window.STAM.functionalSpecFirestoreList.getState().items || [])
      .some((x) => x.title === title), unlinkedTitle));
    unlinkedDocId = await page.evaluate((title) => {
      const item = (window.STAM.functionalSpecFirestoreList.getState().items || []).find((x) => x.title === title);
      return item && item.id;
    }, unlinkedTitle);
    createdDocIds.push(unlinkedDocId);
    const unlinkedDoc = await readFnDoc(db, opts.projectId, unlinkedDocId);
    let w09ok = false;
    try {
      assertKeysAbsent(unlinkedDoc.data, 'W-09');
      w09ok = true;
    } catch (e) { /* */ }
    record(results, 'W-09', w09ok, w09ok ? 'unlinked create omits 3 keys' : 'unlinked create has link keys', {
      docId: unlinkedDocId,
      after: linkSnapshot(unlinkedDoc.data),
    });

    const visible = await page.evaluate(() => document.body.innerText);
    const leaked = [linkedDocId, unlinkedDocId, reqs.first.id, reqs.second.id, legacyReq.id]
      .filter((id) => id && visible.includes(id));
    record(results, 'W-10', leaked.length === 0, leaked.length === 0 ? 'raw doc ids not in UI' : `leaked: ${leaked.join(',')}`);

    await page.locator('#fn-reg-btn').click();
    await page.waitForSelector('#fn-dw-register.open');
    await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill(legacyTitle);
    await selectLegacyByTitle(page, 'fn-dw-register', legacyReq.title);
    await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
    await waitFor(() => page.evaluate((title) => (window.STAM.functionalSpecFirestoreList.getState().items || [])
      .some((x) => x.title === title), legacyTitle));
    legacyDocId = await page.evaluate((title) => {
      const item = (window.STAM.functionalSpecFirestoreList.getState().items || []).find((x) => x.title === title);
      return item && item.id;
    }, legacyTitle);
    createdDocIds.push(legacyDocId);
    const legacyDoc = await readFnDoc(db, opts.projectId, legacyDocId);
    const legacyRow = await page.locator('#fn-tbody .fn-data-row').filter({ hasText: legacyTitle }).first().innerText();
    const w10bFs = legacyDoc.data && clean(legacyDoc.data.requirementTitle)
      && !Object.prototype.hasOwnProperty.call(legacyDoc.data, 'requirementCode');
    const w10bUi = legacyRow.includes(legacyReq.title) && !legacyRow.includes(legacyReq.id);
    record(results, 'W-10b', w10bFs && w10bUi, (w10bFs && w10bUi) ? 'legacy title-only' : 'legacy mismatch', {
      firestore: linkSnapshot(legacyDoc.data),
      uiHasTitle: legacyRow.includes(legacyReq.title),
    });

    const delDisabled = await page.locator('#fn-del-btn').isDisabled();
    const deleteAlert = await page.evaluate(() => new Promise((resolve) => {
      const original = window.alert;
      window.alert = (msg) => { window.__deleteAlert = msg; };
      document.getElementById('fn-del-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      window.alert = original;
      resolve(window.__deleteAlert || '');
    }));
    record(results, 'W-11', delDisabled && String(deleteAlert).includes('삭제는 아직 지원되지 않습니다'), `delete disabled=${delDisabled}`);

    const fatal = pageErrors.filter((m) => !/permission denied|favicon/i.test(m));
    record(results, 'W-12', fatal.length === 0, fatal.length === 0 ? 'no fatal console errors' : fatal.join(' | '));

    const memberRef = db.collection('projects').doc(opts.projectId).collection('members').doc(opts.agentUid);
    await memberRef.set({ role: 'viewer' }, { merge: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const vRole = await page.evaluate(() => window.STAM.functionalSpecFirestoreList.getState().member.role);
    record(results, 'V-01', vRole === 'viewer', vRole === 'viewer' ? 'viewer list read' : `role=${vRole}`);
    record(results, 'V-02', await page.locator('#fn-reg-btn').isDisabled(), 'viewer register disabled check');
    record(results, 'V-03', await page.locator('#fn-del-btn').isDisabled(), 'viewer delete disabled check');
    await memberRef.set({ role: 'owner' }, { merge: true });

  } finally {
    await browser.close();
    if (opts.cleanup && createdDocIds.length) {
      cleanupResult.attempted = true;
      for (const id of createdDocIds) {
        if (!id) continue;
        try {
          await db.collection('projects').doc(opts.projectId)
            .collection('functionalSpecifications').doc(id).delete();
          cleanupResult.deleted.push(id);
        } catch (err) {
          cleanupResult.failed.push({ id, message: err.message });
        }
      }
      record(results, 'CLEANUP', cleanupResult.failed.length === 0, cleanupResult.failed.length === 0
        ? `deleted ${cleanupResult.deleted.length} test docs`
        : `cleanup failed for ${cleanupResult.failed.length}`, cleanupResult);
    }
    meta.cleanup = cleanupResult;
  }

  const failed = results.filter((r) => r.status !== 'PASS');
  finish(results, opts, meta, failed.length ? 1 : 0);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
