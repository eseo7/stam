#!/usr/bin/env node
/**
 * STAM WBS Picker → Firestore Rules emulator E2E
 *
 * Usage:
 *   node scripts/test-wbs-picker-firestore-rules-emulator.mjs
 *
 * When FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST are both set,
 * runs Rules evaluation in the current process (e.g. inside emulators:exec).
 *
 * When neither is set, creates a unique temp firebase config and runs:
 *   firebase-tools emulators:exec --only auth,firestore
 *
 * Seed uses firebase-admin (emulator bypass). Rules evaluation uses Firebase
 * client SDK + Auth emulator transactions, which match production timestamp
 * semantics (`request.time`) better than Firestore REST commit transforms.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1]
  && path.resolve(SCRIPT_PATH) === path.resolve(process.argv[1]);

function missingAuthEmulatorMessage() {
  return [
    'FIREBASE_AUTH_EMULATOR_HOST is not set but FIRESTORE_EMULATOR_HOST is.',
    'Firestore Rules evaluation requires the Auth emulator (firebase-tools emulators:exec --only auth,firestore).',
    'This script does not start a detached Auth emulator sidecar.',
    'Run: node scripts/test-wbs-picker-firestore-rules-emulator.mjs',
  ].join('\n');
}

function runWithSpawnedEmulators() {
  let tempDir;
  let exitCode = 1;
  try {
    tempDir = mkdtempSync(path.join(tmpdir(), 'stam-wbs-rules-emulator-'));
    const cfgPath = path.join(tempDir, 'firebase.json');
    writeFileSync(cfgPath, `${JSON.stringify({
      firestore: {
        rules: path.join(ROOT, 'firestore.rules'),
        indexes: path.join(ROOT, 'firestore.indexes.json'),
      },
      emulators: {
        auth: { port: 9099 },
        firestore: { port: 8080 },
        ui: { enabled: false },
      },
    }, null, 2)}\n`);

    const childCmd = `"${process.execPath}" "${SCRIPT_PATH}"`;
    const result = spawnSync(
      'npx',
      [
        '-y', 'firebase-tools', 'emulators:exec',
        '-c', cfgPath,
        '--only', 'auth,firestore',
        '--project', 'stam-preview-hosting',
        childCmd,
      ],
      {
        cwd: ROOT,
        stdio: 'inherit',
        env: process.env,
      },
    );
    exitCode = result.status ?? 1;
  } finally {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
  process.exit(exitCode);
}

function bootstrapEmulatorsIfNeeded() {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;

  if (authHost && firestoreHost) {
    return false;
  }

  if (process.env.IS_FIREBASE_CLI === 'true' && firestoreHost && !authHost) {
    console.error(missingAuthEmulatorMessage());
    process.exit(1);
  }

  if (!authHost && !firestoreHost) {
    runWithSpawnedEmulators();
    return true;
  }

  console.error([
    'Both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST are required.',
    'Run: node scripts/test-wbs-picker-firestore-rules-emulator.mjs',
  ].join('\n'));
  process.exit(1);
}

export async function runFirestoreRulesEmulatorTests() {
  const { buildWbsPickerCreateScenarios } = await import('./test-wbs-picker-create-e2e-contract.mjs');

  const require = createRequire(import.meta.url);
  const ADMIN_ROOT = process.env.STAM_FIREBASE_ADMIN_ROOT || '/tmp/stam-firebase-admin';
  const CLIENT_ROOT = process.env.STAM_FIREBASE_CLIENT_ROOT || '/tmp/stam-firebase-client';
  const FIRESTORE_PROJECT = 'stam-preview-hosting';
  const APP_PROJECT = 'P1';
  const OWNER_EMAIL = 'wbs-rules-owner@test.local';
  const OWNER_PASSWORD = 'rules-test-password';

  process.env.NODE_PATH = [path.join(ADMIN_ROOT, 'node_modules'), path.join(CLIENT_ROOT, 'node_modules'), process.env.NODE_PATH || '']
    .filter(Boolean)
    .join(path.delimiter);
  require('node:module').Module._initPaths();

  const { initializeApp: initAdminApp, getApps: getAdminApps } = require('firebase-admin/app');
  const { getFirestore: getAdminFirestore, FieldValue } = require('firebase-admin/firestore');
  const { initializeApp: initClientApp } = require('firebase/app');
  const {
    getAuth,
    connectAuthEmulator,
    createUserWithEmailAndPassword,
  } = require('firebase/auth');
  const {
    getFirestore,
    connectFirestoreEmulator,
    doc,
    runTransaction,
    serverTimestamp,
  } = require('firebase/firestore');

  function resolveEmulatorHost(envVar, defaultHost) {
    return process.env[envVar] || defaultHost;
  }

  function prepareDocumentPayload(servicePayload, wbsId, code, writerUid) {
    const payload = Object.assign({}, servicePayload, {
      id: wbsId,
      projectId: APP_PROJECT,
      code,
      createdBy: writerUid,
      updatedBy: writerUid,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 1,
      ownerId: writerUid,
      ownerName: 'Active Member',
      reviewerId: writerUid,
      reviewerName: 'Active Member',
    });
    delete payload.createdAt;
    delete payload.updatedAt;
    return payload;
  }

  async function seedWithAdmin(ownerUid, ownerEmail) {
    if (getAdminApps().length === 0) {
      initAdminApp({ projectId: FIRESTORE_PROJECT });
    }
    const db = getAdminFirestore();
    const batch = db.batch();
    batch.set(db.doc(`projects/${APP_PROJECT}`), {
      projectId: APP_PROJECT,
      projectName: 'Rules E2E Project',
      name: 'Rules E2E Project',
      status: 'active',
      ownerUid,
      ownerEmail,
      tenantId: 'tenant-e2e',
      createdBy: ownerUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastOpenedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.doc(`projects/${APP_PROJECT}/members/${ownerUid}`), {
      userId: ownerUid,
      projectId: APP_PROJECT,
      role: 'owner',
      status: 'active',
      createdBy: ownerUid,
      email: ownerEmail,
      emailNormalized: ownerEmail.toLowerCase(),
      displayName: 'Active Member',
      tenantId: 'tenant-e2e',
      projectName: 'Rules E2E Project',
      joinedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.doc(`projects/${APP_PROJECT}/counters/wbsItems`), { lastNumber: 1 });
    await batch.commit();
  }

  function initClient() {
    const app = initClientApp({
      apiKey: 'fake-api-key',
      authDomain: 'localhost',
      projectId: FIRESTORE_PROJECT,
    });
    const auth = getAuth(app);
    const db = getFirestore(app);
    const authHost = resolveEmulatorHost('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    const firestoreHost = resolveEmulatorHost('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080');
    const [host, port] = firestoreHost.split(':');
    connectFirestoreEmulator(db, host, Number(port), { mockUserToken: undefined });
    return { auth, db };
  }

  async function createWriter(auth) {
    const cred = await createUserWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
    return { uid: cred.user.uid, user: cred.user };
  }

  async function commitCreate(db, payload) {
    const wbsRef = doc(db, `projects/${APP_PROJECT}/wbsItems/${payload.id}`);
    const counterRef = doc(db, `projects/${APP_PROJECT}/counters/wbsItems`);
    await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const nextNumber = counterSnap.exists() ? (counterSnap.data().lastNumber + 1) : 1;
      const nextCode = `WBS-${String(nextNumber).padStart(3, '0')}`;
      const writePayload = Object.assign({}, payload, {
        code: nextCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
      tx.set(wbsRef, writePayload);
    });
    return payload.id;
  }

  async function expectDenied(db, payload) {
    let denied = false;
    try {
      await commitCreate(db, payload);
    } catch (err) {
      denied = /permission|insufficient|denied/i.test(String(err && err.message));
    }
    assert.equal(denied, true);
  }

  const { scenarios } = await buildWbsPickerCreateScenarios();
  assert.ok(Array.isArray(scenarios), 'scenarios required from buildWbsPickerCreateScenarios');

  const { auth, db } = initClient();
  const writer = await createWriter(auth);
  await seedWithAdmin(writer.uid, OWNER_EMAIL);

  for (const entry of scenarios) {
    const wbsId = `wbs-rules-${entry.scenario.replace(/\+/g, '-')}`;
    const payload = prepareDocumentPayload(entry.servicePayload, wbsId, 'WBS-PENDING', writer.uid);
    await commitCreate(db, payload);
    console.log(`scenario ${entry.scenario}: ALLOW`);
  }

  const linked = scenarios.find((s) => s.scenario === 'requirement+functionalSpec');
  assert.ok(linked, 'linked scenario payload required');
  const linkedBase = prepareDocumentPayload(linked.servicePayload, 'wbs-deny-base', 'WBS-099', writer.uid);

  const partialReq = Object.assign({}, linkedBase, { id: 'wbs-deny-partial-req' });
  delete partialReq.requirementCode;
  delete partialReq.requirementTitle;
  await expectDenied(db, partialReq);
  console.log('partial REQ: DENY');

  const invalidReqCode = Object.assign({}, linkedBase, { id: 'wbs-deny-bad-req-code', requirementCode: 'BAD' });
  await expectDenied(db, invalidReqCode);
  console.log('invalid REQ code: DENY');

  const partialFn = Object.assign({}, linkedBase, { id: 'wbs-deny-partial-fn' });
  delete partialFn.functionalSpecTitle;
  await expectDenied(db, partialFn);
  console.log('partial FN: DENY');

  const invalidFnCode = Object.assign({}, linkedBase, { id: 'wbs-deny-bad-fn-code', functionalSpecCode: 'BAD' });
  await expectDenied(db, invalidFnCode);
  console.log('invalid FN code: DENY');

  const extraKey = Object.assign({}, linkedBase, { id: 'wbs-deny-extra-key', screenSpecId: 'extra' });
  await expectDenied(db, extraKey);
  console.log('extra key: DENY');

  console.log('wbs picker firestore rules emulator: PASS');
}

if (isDirectRun) {
  if (!bootstrapEmulatorsIfNeeded()) {
    runFirestoreRulesEmulatorTests()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
