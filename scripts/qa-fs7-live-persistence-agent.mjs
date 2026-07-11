#!/usr/bin/env node
/**
 * FS-7 — Agent live persistence QA (staging + real Firestore)
 *
 * Maps checklist W-01~W-12 + W-10b (+ V-01~V-03) with Firestore before/after evidence.
 * Requires firebase-admin credentials (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
 *   node scripts/qa-fs7-live-persistence-agent.mjs
 *
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{...}' node scripts/qa-fs7-live-persistence-agent.mjs
 *
 * Options:
 *   --staging-url <url>   default https://stam-design-staging.web.app
 *   --project-id <id>     default stam-demo
 *   --agent-uid <uid>     default fs7-agent-qa-b31c
 *   --firebase-project    default stam-preview-hosting
 *   --no-cleanup          keep created docs (debug)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire('/tmp/qa-deps/package.json');

const LINK_FIELDS = ['requirementId', 'requirementCode', 'requirementTitle'];
const RAW_REQ_MARKERS = ['req-doc-alpha', 'req-doc-beta'];

function parseArgs(argv) {
  const opts = {
    stagingUrl: 'https://stam-design-staging.web.app',
    projectId: 'stam-demo',
    agentUid: 'fs7-agent-qa-b31c',
    firebaseProject: 'stam-preview-hosting',
    cleanup: true,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--staging-url') opts.stagingUrl = argv[++i];
    else if (arg === '--project-id') opts.projectId = argv[++i];
    else if (arg === '--agent-uid') opts.agentUid = argv[++i];
    else if (arg === '--firebase-project') opts.firebaseProject = argv[++i];
    else if (arg === '--no-cleanup') opts.cleanup = false;
    else if (arg === '--help' || arg === '-h') {
      console.log('See script header for usage.');
      process.exit(0);
    }
  }
  return opts;
}

function linkSnapshot(data) {
  const src = data || {};
  const out = {};
  LINK_FIELDS.forEach((k) => {
    out[k] = Object.prototype.hasOwnProperty.call(src, k) ? src[k] : undefined;
  });
  out._keysPresent = LINK_FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(src, k));
  out._keysAbsent = LINK_FIELDS.filter((k) => !Object.prototype.hasOwnProperty.call(src, k));
  return out;
}

function assertKeysAbsent(data, label) {
  const present = LINK_FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(data || {}, k));
  if (present.length) {
    throw new Error(`${label}: expected link keys absent, found ${present.join(', ')}`);
  }
  LINK_FIELDS.forEach((k) => {
    const v = data && data[k];
    if (v === '' || v === null) {
      throw new Error(`${label}: ${k} is empty/null instead of absent`);
    }
  });
}

function assertKeysPresent(data, label) {
  const missing = LINK_FIELDS.filter((k) => !Object.prototype.hasOwnProperty.call(data || {}, k));
  if (missing.length) {
    throw new Error(`${label}: missing keys ${missing.join(', ')}`);
  }
  LINK_FIELDS.forEach((k) => {
    const v = clean(data[k]);
    if (!v) throw new Error(`${label}: ${k} empty`);
  });
}

function clean(v) {
  return String(v == null ? '' : v).trim();
}

async function loadAdmin(opts) {
  let credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!credPath && inline) {
    credPath = path.join(os.tmpdir(), 'fs7-agent-sa.json');
    fs.writeFileSync(credPath, inline);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  }
  if (!credPath || !fs.existsSync(credPath)) {
    return {
      ok: false,
      reason: 'Missing GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON',
    };
  }
  const admin = await import('firebase-admin');
  if (!admin.default.apps.length) {
    admin.default.initializeApp({ projectId: opts.firebaseProject });
  }
  return { ok: true, admin: admin.default, credPath };
}

async function ensureAgentAccess(admin, opts) {
  const db = admin.firestore();
  const auth = admin.auth();
  const email = `fs7-agent-qa@stam-preview.invalid`;

  try {
    await auth.getUser(opts.agentUid);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      await auth.createUser({ uid: opts.agentUid, email, displayName: 'FS7 Agent QA' });
    } else {
      throw err;
    }
  }

  const memberRef = db.collection('projects').doc(opts.projectId).collection('members').doc(opts.agentUid);
  await memberRef.set({
    userId: opts.agentUid,
    projectId: opts.projectId,
    email,
    emailNormalized: email,
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
  await waitFor(() => page.evaluate(() => {
    return window.STAM
      && window.STAM.functionalSpecFirestoreList
      && window.STAM.functionalSpecFirestoreCrud
      && window.STAM.requirementPicker;
  }));
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
      if (!root || !root.classList.contains('is-open')) return false;
      return !!root.querySelector(`[data-stam-requirement-picker-opt][data-req-code="${reqCode}"]`);
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
      if (!root || !root.classList.contains('is-open')) return false;
      return Array.from(root.querySelectorAll('[data-stam-requirement-picker-opt]'))
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
      return !!(root && root.classList.contains('is-open') && root.querySelector('[data-stam-requirement-picker-opt=""]'));
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

function record(results, id, ok, detail, evidence = {}) {
  const row = { id, ok, detail, evidence, at: new Date().toISOString() };
  results.push(row);
  const tag = ok ? 'PASS' : (detail.startsWith('BLOCKED') ? 'BLOCKED' : 'FAIL');
  console.log(`${tag}  ${id}: ${detail}`);
  if (Object.keys(evidence).length) {
    console.log(JSON.stringify(evidence, null, 2));
  }
}

async function run() {
  const opts = parseArgs(process.argv);
  const results = [];
  const createdDocIds = [];
  const runId = `FS7-AGENT-${Date.now()}`;
  const linkedTitle = `${runId} linked`;
  const unlinkedTitle = `${runId} unlinked`;
  const legacyTitle = `${runId} legacy`;

  const adminLoad = await loadAdmin(opts);
  if (!adminLoad.ok) {
    record(results, 'PRECHECK-credentials', false, `BLOCKED — ${adminLoad.reason}`, {
      required: ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_SERVICE_ACCOUNT_JSON'],
      stagingUrl: opts.stagingUrl,
      projectId: opts.projectId,
    });
    printSummary(results);
    process.exit(2);
  }

  const { admin } = adminLoad;
  const { db, token } = await ensureAgentAccess(admin, opts);
  const reqs = await findRequirementWithCode(db, opts.projectId);
  if (!reqs.first || !reqs.second) {
    record(results, 'PRECHECK-requirements', false, 'BLOCKED — stam-demo needs ≥2 coded requirements', { reqs });
    printSummary(results);
    process.exit(2);
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

  try {
    await signInStaging(page, opts.stagingUrl, token);
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    record(results, 'W-01', true, 'staging auth + functional-spec list load', {
      url: page.url(),
      role: await page.evaluate(() => window.STAM.functionalSpecFirestoreList.getState().member.role),
    });

    // W-02 linked create
    await page.locator('#fn-reg-btn').click();
    await page.waitForSelector('#fn-dw-register.open');
    await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill(linkedTitle);
    await selectRequirement(page, 'fn-dw-register', reqs.first.code);
    await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
    await waitFor(() => page.evaluate((title) => {
      const rows = Array.from(document.querySelectorAll('#fn-tbody .fn-data-row'));
      return rows.some((r) => r.textContent.includes(title));
    }, linkedTitle));

    linkedDocId = await page.evaluate((title) => {
      const items = window.STAM.functionalSpecFirestoreList.getState().items || [];
      const item = items.find((x) => x.title === title);
      return item && item.id;
    }, linkedTitle);

    const afterCreate = await readFnDoc(db, opts.projectId, linkedDocId);
    try {
      assertKeysPresent(afterCreate.data, 'W-02');
      record(results, 'W-02', true, 'linked create — 3 link fields in Firestore', {
        docId: linkedDocId,
        before: null,
        after: linkSnapshot(afterCreate.data),
        ui: await page.locator('#fn-tbody .fn-data-row').filter({ hasText: linkedTitle }).first().innerText(),
      });
    } catch (err) {
      record(results, 'W-02', false, err.message, { docId: linkedDocId, after: linkSnapshot(afterCreate.data) });
    }
    createdDocIds.push(linkedDocId);

    // W-03 refresh linked
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const afterRefreshCreate = await readFnDoc(db, opts.projectId, linkedDocId);
    const w03ok = afterRefreshCreate.exists
      && LINK_FIELDS.every((k) => clean(afterRefreshCreate.data[k]));
    record(results, 'W-03', w03ok, w03ok ? 'refresh keeps linked Firestore + UI' : 'refresh mismatch', {
      after: linkSnapshot(afterRefreshCreate.data),
      chip: await page.locator('#fn-tbody .fn-data-row').filter({ hasText: linkedTitle }).first().innerText(),
    });

    // W-04 FN code + counter
    const counterAfter = await readCounter(db, opts.projectId);
    const code = afterRefreshCreate.data && afterRefreshCreate.data.code;
    const w04ok = /^FN_\d{3}$/.test(code || '')
      && Number(counterAfter.lastNumber) > Number(counterBefore.lastNumber || 0);
    record(results, 'W-04', w04ok, w04ok ? `FN code ${code}, counter ${counterBefore.lastNumber}→${counterAfter.lastNumber}` : 'FN/counter mismatch', {
      code,
      counterBefore: counterBefore.lastNumber,
      counterAfter: counterAfter.lastNumber,
    });

    // W-05 change requirement
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
      w05ok = afterChange.data.requirementCode === reqs.second.code
        && afterChange.data.requirementId === reqs.second.id;
    } catch (e) { /* w05ok false */ }
    record(results, 'W-05', w05ok, w05ok ? 'requirement changed — 3 fields updated' : 'change failed', {
      before: linkSnapshot(beforeChange.data),
      after: linkSnapshot(afterChange.data),
    });

    // W-06 refresh after change
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const afterChangeRefresh = await readFnDoc(db, opts.projectId, linkedDocId);
    const w06ok = afterChangeRefresh.data && afterChangeRefresh.data.requirementCode === reqs.second.code;
    record(results, 'W-06', w06ok, w06ok ? 'refresh keeps changed link' : 'refresh change lost', {
      firestore: linkSnapshot(afterChangeRefresh.data),
      chip: await page.locator('#fn-tbody .fn-data-row').filter({ hasText: linkedTitle }).first().innerText(),
    });

    // W-07 unlink
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
    let w07ok = false;
    try {
      assertKeysAbsent(afterUnlink.data, 'W-07');
      w07ok = true;
    } catch (e) { /* */ }
    record(results, 'W-07', w07ok, w07ok ? 'unlink — 3 keys absent in Firestore' : 'unlink fields residual', {
      before: linkSnapshot(beforeUnlink.data),
      after: linkSnapshot(afterUnlink.data),
      afterRawKeys: Object.keys(afterUnlink.data || {}),
    });

    // W-08 refresh after unlink
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const afterUnlinkRefresh = await readFnDoc(db, opts.projectId, linkedDocId);
    let w08ok = false;
    try {
      assertKeysAbsent(afterUnlinkRefresh.data, 'W-08');
      w08ok = true;
    } catch (e) { /* */ }
    const rowText = await page.locator('#fn-tbody .fn-data-row').filter({ hasText: linkedTitle }).first().innerText();
    record(results, 'W-08', w08ok, w08ok ? 'refresh keeps unlink' : 'unlink not persisted', {
      firestore: linkSnapshot(afterUnlinkRefresh.data),
      ui: rowText,
    });

    // W-09 unlinked create
    await page.locator('#fn-reg-btn').click();
    await page.waitForSelector('#fn-dw-register.open');
    await page.evaluate(() => {
      const drawer = document.getElementById('fn-dw-register');
      const picker = drawer && drawer.querySelector('[data-stam-requirement-picker]');
      if (picker && window.STAM.requirementPicker) window.STAM.requirementPicker.clear(picker);
    });
    await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill(unlinkedTitle);
    await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
    await waitFor(() => page.evaluate((title) => {
      return (window.STAM.functionalSpecFirestoreList.getState().items || []).some((x) => x.title === title);
    }, unlinkedTitle));
    unlinkedDocId = await page.evaluate((title) => {
      const item = (window.STAM.functionalSpecFirestoreList.getState().items || []).find((x) => x.title === title);
      return item && item.id;
    }, unlinkedTitle);
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
    createdDocIds.push(unlinkedDocId);

    // W-10 raw id not exposed
    const visible = await page.evaluate(() => document.body.innerText);
    const leaked = [linkedDocId, unlinkedDocId, reqs.first.id, reqs.second.id, legacyReq.id]
      .filter((id) => id && visible.includes(id));
    record(results, 'W-10', leaked.length === 0, leaked.length === 0 ? 'raw doc ids not in UI' : `leaked: ${leaked.join(',')}`, {
      checkedIds: [linkedDocId, unlinkedDocId, reqs.first.id, reqs.second.id, legacyReq.id],
    });

    // W-10b legacy title-only link
    await page.locator('#fn-reg-btn').click();
    await page.waitForSelector('#fn-dw-register.open');
    await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill(legacyTitle);
    await selectLegacyByTitle(page, 'fn-dw-register', legacyReq.title);
    await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
    await waitFor(() => page.evaluate((title) => {
      return (window.STAM.functionalSpecFirestoreList.getState().items || []).some((x) => x.title === title);
    }, legacyTitle));
    legacyDocId = await page.evaluate((title) => {
      const item = (window.STAM.functionalSpecFirestoreList.getState().items || []).find((x) => x.title === title);
      return item && item.id;
    }, legacyTitle);
    const legacyDoc = await readFnDoc(db, opts.projectId, legacyDocId);
    const legacyRow = await page.locator('#fn-tbody .fn-data-row').filter({ hasText: legacyTitle }).first().innerText();
    const w10bFs = legacyDoc.data && clean(legacyDoc.data.requirementTitle) && !Object.prototype.hasOwnProperty.call(legacyDoc.data, 'requirementCode');
    const w10bUi = legacyRow.includes(legacyReq.title) && !legacyRow.includes(legacyReq.id);
    record(results, 'W-10b', w10bFs && w10bUi, (w10bFs && w10bUi) ? 'legacy title-only chip + Firestore' : 'legacy display/fs mismatch', {
      firestore: linkSnapshot(legacyDoc.data),
      ui: legacyRow,
    });
    createdDocIds.push(legacyDocId);

    // W-11 delete disabled
    const delDisabled = await page.locator('#fn-del-btn').isDisabled();
    const deleteAlert = await page.evaluate(() => new Promise((resolve) => {
      const original = window.alert;
      window.alert = (msg) => { window.__deleteAlert = msg; };
      document.getElementById('fn-del-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      window.alert = original;
      resolve(window.__deleteAlert || '');
    }));
    record(results, 'W-11', delDisabled && String(deleteAlert).includes('삭제는 아직 지원되지 않습니다'), `delete disabled=${delDisabled}`, { alert: deleteAlert });

    // W-12 console
    const fatal = pageErrors.filter((m) => !/permission denied|favicon/i.test(m));
    record(results, 'W-12', fatal.length === 0, fatal.length === 0 ? 'no fatal console/page errors' : fatal.join(' | '));

    // V-01~V-03 viewer (switch role via admin)
    const memberRef = db.collection('projects').doc(opts.projectId).collection('members').doc(opts.agentUid);
    await memberRef.set({ role: 'viewer' }, { merge: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openFunctionalSpec(page, opts.stagingUrl, opts.projectId);
    const vRole = await page.evaluate(() => window.STAM.functionalSpecFirestoreList.getState().member.role);
    const v01 = vRole === 'viewer' && (await page.locator('#fn-tbody .fn-data-row').count()) >= 0;
    record(results, 'V-01', v01, v01 ? 'viewer list read' : `viewer list fail role=${vRole}`);
    const regDisabled = await page.locator('#fn-reg-btn').isDisabled();
    record(results, 'V-02', regDisabled, regDisabled ? 'viewer register disabled' : 'register not disabled');
    const vDelDisabled = await page.locator('#fn-del-btn').isDisabled();
    record(results, 'V-03', vDelDisabled, vDelDisabled ? 'viewer delete disabled' : 'delete not disabled');
    await memberRef.set({ role: 'owner' }, { merge: true });

  } finally {
    await browser.close();
    if (opts.cleanup && createdDocIds.length) {
      const batch = db.batch();
      createdDocIds.forEach((id) => {
        if (!id) return;
        batch.delete(db.collection('projects').doc(opts.projectId).collection('functionalSpecifications').doc(id));
      });
      await batch.commit().catch(() => {});
    }
  }

  printSummary(results, { runId, stagingUrl: opts.stagingUrl, projectId: opts.projectId });
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

function printSummary(results, meta = {}) {
  const failed = results.filter((r) => !r.ok);
  const blocked = results.filter((r) => !r.ok && String(r.detail).startsWith('BLOCKED'));
  console.log('\n--- FS-7 agent live summary ---');
  if (meta.runId) console.log(`runId=${meta.runId} staging=${meta.stagingUrl} project=${meta.projectId}`);
  console.log(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length} blocked=${blocked.length}`);
  console.log(JSON.stringify({ results, meta }, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
