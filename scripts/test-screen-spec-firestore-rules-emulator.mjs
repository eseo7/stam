#!/usr/bin/env node
/**
 * STAM ScreenSpec → Firestore Rules emulator E2E
 *
 * Usage:
 *   node scripts/test-screen-spec-firestore-rules-emulator.mjs
 *
 * When FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST are both set,
 * runs Rules evaluation in the current process (e.g. inside emulators:exec).
 *
 * When neither is set, creates a unique temp firebase config and runs:
 *   firebase-tools emulators:exec --only auth,firestore
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
    'Run: node scripts/test-screen-spec-firestore-rules-emulator.mjs',
  ].join('\n');
}

function runWithSpawnedEmulators() {
  let tempDir;
  let exitCode = 1;
  try {
    tempDir = mkdtempSync(path.join(tmpdir(), 'stam-screen-spec-rules-emulator-'));
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
    'Run: node scripts/test-screen-spec-firestore-rules-emulator.mjs',
  ].join('\n'));
  process.exit(1);
}

export async function runScreenSpecFirestoreRulesEmulatorTests() {
  const require = createRequire(import.meta.url);
  const ADMIN_ROOT = process.env.STAM_FIREBASE_ADMIN_ROOT || '/tmp/stam-firebase-admin';
  const CLIENT_ROOT = process.env.STAM_FIREBASE_CLIENT_ROOT || '/tmp/stam-firebase-client';
  const FIRESTORE_PROJECT = 'stam-preview-hosting';
  const APP_PROJECT = 'P1';
  const OTHER_PROJECT = 'P2';
  const PASSWORD = 'rules-test-password';

  process.env.NODE_PATH = [path.join(ADMIN_ROOT, 'node_modules'), path.join(CLIENT_ROOT, 'node_modules'), process.env.NODE_PATH || '']
    .filter(Boolean)
    .join(path.delimiter);
  require('node:module').Module._initPaths();

  const { initializeApp: initAdminApp, getApps: getAdminApps } = require('firebase-admin/app');
  const { getFirestore: getAdminFirestore, FieldValue } = require('firebase-admin/firestore');
  const { initializeApp: initClientApp, deleteApp } = require('firebase/app');
  const {
    getAuth,
    connectAuthEmulator,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
  } = require('firebase/auth');
  const {
    getFirestore,
    connectFirestoreEmulator,
    doc,
    getDoc,
    getDocs,
    collection,
    runTransaction,
    serverTimestamp,
  } = require('firebase/firestore');

  const USERS = {
    owner: { email: 'ss-rules-owner@test.local', role: 'owner', displayName: 'Owner Member' },
    editor: { email: 'ss-rules-editor@test.local', role: 'editor', displayName: 'Editor Member' },
    viewer: { email: 'ss-rules-viewer@test.local', role: 'viewer', displayName: 'Viewer Member' },
    outsider: { email: 'ss-rules-outsider@test.local', role: null, displayName: 'Outsider' },
  };

  function resolveEmulatorHost(envVar, defaultHost) {
    return process.env[envVar] || defaultHost;
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
    return { app, auth, db };
  }

  async function signInAs(auth, email) {
    await signInWithEmailAndPassword(auth, email, PASSWORD);
  }

  function baseCreatePayload(writerUid, ownerName, overrides = {}) {
    const screenSpecId = overrides.id || `scr-rules-${writerUid.slice(0, 8)}`;
    const payload = {
      id: screenSpecId,
      projectId: APP_PROJECT,
      title: 'Rules E2E Screen',
      screenType: 'form',
      writeStatus: 'writing',
      reviewStatus: 'none',
      approvalStatus: 'none',
      ownerId: writerUid,
      ownerName,
      createdBy: writerUid,
      updatedBy: writerUid,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 1,
      ...overrides,
    };
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.code;
    return payload;
  }

  async function seedWithAdmin(userIds) {
    if (getAdminApps().length === 0) {
      initAdminApp({ projectId: FIRESTORE_PROJECT });
    }
    const db = getAdminFirestore();
    const batch = db.batch();

    function seedProject(projectId, ownerUid, ownerEmail, ownerName) {
      batch.set(db.doc(`projects/${projectId}`), {
        projectId,
        projectName: `Rules E2E ${projectId}`,
        name: `Rules E2E ${projectId}`,
        status: 'active',
        ownerUid,
        ownerEmail,
        tenantId: 'tenant-e2e',
        createdBy: ownerUid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastOpenedAt: FieldValue.serverTimestamp(),
      });
      batch.set(db.doc(`projects/${projectId}/members/${ownerUid}`), {
        userId: ownerUid,
        projectId,
        role: 'owner',
        status: 'active',
        createdBy: ownerUid,
        email: ownerEmail,
        emailNormalized: ownerEmail.toLowerCase(),
        displayName: ownerName,
        tenantId: 'tenant-e2e',
        projectName: `Rules E2E ${projectId}`,
        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(db.doc(`projects/${projectId}/counters/screenSpecs`), { lastNumber: 1 });
    }

    seedProject(APP_PROJECT, userIds.owner, USERS.owner.email, USERS.owner.displayName);
    seedProject(OTHER_PROJECT, userIds.owner, USERS.owner.email, USERS.owner.displayName);

    for (const key of ['editor', 'viewer']) {
      const uid = userIds[key];
      const profile = USERS[key];
      batch.set(db.doc(`projects/${APP_PROJECT}/members/${uid}`), {
        userId: uid,
        projectId: APP_PROJECT,
        role: profile.role,
        status: 'active',
        createdBy: userIds.owner,
        email: profile.email,
        emailNormalized: profile.email.toLowerCase(),
        displayName: profile.displayName,
        tenantId: 'tenant-e2e',
        projectName: 'Rules E2E P1',
        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    batch.set(db.doc(`projects/${APP_PROJECT}/screenSpecs/scr-seed-read`), {
      id: 'scr-seed-read',
      projectId: APP_PROJECT,
      code: 'SCR-001',
      title: 'Seeded Screen Spec',
      screenType: 'list',
      writeStatus: 'writing',
      reviewStatus: 'none',
      approvalStatus: 'none',
      ownerId: userIds.owner,
      ownerName: USERS.owner.displayName,
      createdBy: userIds.owner,
      updatedBy: userIds.owner,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 1,
    });

    batch.set(db.doc(`projects/${OTHER_PROJECT}/screenSpecs/scr-other-read`), {
      id: 'scr-other-read',
      projectId: OTHER_PROJECT,
      code: 'SCR-001',
      title: 'Other Project Screen Spec',
      screenType: 'list',
      writeStatus: 'writing',
      reviewStatus: 'none',
      approvalStatus: 'none',
      ownerId: userIds.owner,
      ownerName: USERS.owner.displayName,
      createdBy: userIds.owner,
      updatedBy: userIds.owner,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 1,
    });

    await batch.commit();
  }

  async function commitCreate(db, payload) {
    const specRef = doc(db, `projects/${APP_PROJECT}/screenSpecs/${payload.id}`);
    const counterRef = doc(db, `projects/${APP_PROJECT}/counters/screenSpecs`);
    await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const nextNumber = counterSnap.exists() ? (counterSnap.data().lastNumber + 1) : 1;
      const nextCode = `SCR-${String(nextNumber).padStart(3, '0')}`;
      const writePayload = Object.assign({}, payload, {
        code: nextCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
      tx.set(specRef, writePayload);
    });
    return payload.id;
  }

  async function expectDenied(db, payload) {
    let denied = false;
    try {
      await commitCreate(db, payload);
    } catch (err) {
      denied = err && err.code === 'permission-denied'
        || /permission|insufficient|denied/i.test(String(err && err.message));
    }
    assert.equal(denied, true);
  }

  async function expectReadAllowed(db, projectId, screenSpecId) {
    const snap = await getDoc(doc(db, `projects/${projectId}/screenSpecs/${screenSpecId}`));
    assert.equal(snap.exists(), true);
    const listSnap = await getDocs(collection(db, `projects/${projectId}/screenSpecs`));
    assert.ok(listSnap.size >= 1);
    return listSnap.size;
  }

  async function expectReadDenied(db, projectId, memberListSize) {
    let denied = false;
    try {
      const listSnap = await getDocs(collection(db, `projects/${projectId}/screenSpecs`));
      const projectSnap = await getDoc(doc(db, `projects/${projectId}`));
      denied = listSnap.size === 0 && projectSnap.exists() === false;
    } catch (err) {
      denied = err && err.code === 'permission-denied'
        || /permission|insufficient|denied/i.test(String(err && err.message));
    }
    assert.equal(denied, true);
    assert.ok(memberListSize >= 1, 'member must see seeded screenSpecs for isolation check');
  }

  const { app, auth, db } = initClient();
  const userIds = {};
  for (const [key, profile] of Object.entries(USERS)) {
    const cred = await createUserWithEmailAndPassword(auth, profile.email, PASSWORD);
    userIds[key] = cred.user.uid;
  }
  await seedWithAdmin(userIds);

  await signInAs(auth, USERS.owner.email);
  const memberListSize = await expectReadAllowed(db, APP_PROJECT, 'scr-seed-read');
  console.log('active member read get/list: ALLOW');

  await commitCreate(db, baseCreatePayload(userIds.owner, USERS.owner.displayName, { id: 'scr-create-minimal' }));
  console.log('owner create minimal: ALLOW');

  await commitCreate(db, baseCreatePayload(userIds.owner, USERS.owner.displayName, {
    id: 'scr-create-req-triplet',
    requirementId: 'req-001',
    requirementCode: 'REQ_001',
    requirementTitle: 'Requirement title',
  }));
  console.log('owner create requirement triplet: ALLOW');

  await signInAs(auth, USERS.editor.email);
  await commitCreate(db, baseCreatePayload(userIds.editor, USERS.editor.displayName, { id: 'scr-create-editor' }));
  console.log('editor create: ALLOW');

  await signInAs(auth, USERS.viewer.email);
  await expectDenied(db, baseCreatePayload(userIds.viewer, USERS.viewer.displayName, { id: 'scr-deny-viewer' }));
  console.log('viewer create: DENY');

  await signInAs(auth, USERS.outsider.email);
  await expectReadDenied(db, APP_PROJECT, memberListSize);
  console.log('non-member read: DENY');

  await signInAs(auth, USERS.editor.email);
  await expectReadDenied(db, OTHER_PROJECT, memberListSize);
  console.log('other project read: DENY');

  await signInAs(auth, USERS.owner.email);

  const linkedBase = baseCreatePayload(userIds.owner, USERS.owner.displayName, {
    id: 'scr-deny-partial-base',
    requirementId: 'req-002',
    requirementCode: 'REQ_002',
    requirementTitle: 'Requirement two',
  });

  const partialReq = Object.assign({}, linkedBase, { id: 'scr-deny-partial-req' });
  delete partialReq.requirementCode;
  await expectDenied(db, partialReq);
  console.log('partial requirement triplet: DENY');

  const badOwnerName = Object.assign({}, linkedBase, {
    id: 'scr-deny-bad-owner',
    ownerName: 'Wrong Display Name',
  });
  await expectDenied(db, badOwnerName);
  console.log('invalid ownerName snapshot: DENY');

  const extraKey = Object.assign({}, linkedBase, { id: 'scr-deny-extra-key', screenName: 'legacy' });
  await expectDenied(db, extraKey);
  console.log('extra forbidden key: DENY');

  await deleteApp(app);
  console.log('screen spec firestore rules emulator: PASS');
}

if (isDirectRun) {
  if (!bootstrapEmulatorsIfNeeded()) {
    runScreenSpecFirestoreRulesEmulatorTests()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
