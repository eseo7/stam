#!/usr/bin/env node
/**
 * STAM PR B — screenFields Firestore Rules emulator E2E
 *
 * Usage:
 *   node scripts/test-screen-field-firestore-rules-emulator.mjs
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

function runWithSpawnedEmulators() {
  let tempDir;
  let exitCode = 1;
  try {
    tempDir = mkdtempSync(path.join(tmpdir(), 'stam-screen-field-rules-emulator-'));
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
      { cwd: ROOT, stdio: 'inherit', env: process.env },
    );
    exitCode = result.status ?? 1;
  } finally {
    if (tempDir) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* noop */ }
    }
  }
  process.exit(exitCode);
}

function bootstrapEmulatorsIfNeeded() {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (authHost && firestoreHost) return false;
  if (!authHost && !firestoreHost) {
    runWithSpawnedEmulators();
    return true;
  }
  console.error('Both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST are required.');
  process.exit(1);
}

export async function runScreenFieldFirestoreRulesEmulatorTests() {
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
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
  } = require('firebase/firestore');

  const USERS = {
    owner: { email: 'sf-rules-owner@test.local', role: 'owner', displayName: 'Owner Member' },
    editor: { email: 'sf-rules-editor@test.local', role: 'editor', displayName: 'Editor Member' },
    viewer: { email: 'sf-rules-viewer@test.local', role: 'viewer', displayName: 'Viewer Member' },
    outsider: { email: 'sf-rules-outsider@test.local', role: null, displayName: 'Outsider' },
  };

  function initClient() {
    const app = initClientApp({
      apiKey: 'fake-api-key',
      authDomain: 'localhost',
      projectId: FIRESTORE_PROJECT,
    });
    const auth = getAuth(app);
    const db = getFirestore(app);
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`, { disableWarnings: true });
    const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
    connectFirestoreEmulator(db, host, Number(port), { mockUserToken: undefined });
    return { app, auth, db };
  }

  async function signInAs(auth, email) {
    await signInWithEmailAndPassword(auth, email, PASSWORD);
  }

  function baseFieldPayload(writerUid, overrides = {}) {
    const fieldId = overrides.id || `fld-${writerUid.slice(0, 8)}`;
    const payload = {
      id: fieldId,
      projectId: APP_PROJECT,
      screenSpecId: 'scr-seed-parent',
      order: 0,
      name: overrides.name || 'titleText',
      label: '제목',
      type: 'text',
      required: false,
      readonly: false,
      disabled: false,
      defaultValue: null,
      placeholder: null,
      helpText: null,
      minLength: null,
      maxLength: null,
      options: [],
      validationRules: [],
      schemaVersion: 1,
      createdBy: writerUid,
      updatedBy: writerUid,
      ...overrides,
    };
    delete payload.createdAt;
    delete payload.updatedAt;
    return payload;
  }

  async function seedWithAdmin(userIds) {
    if (getAdminApps().length === 0) initAdminApp({ projectId: FIRESTORE_PROJECT });
    const db = getAdminFirestore();
    const batch = db.batch();

    function seedProject(projectId) {
      batch.set(db.doc(`projects/${projectId}`), {
        projectId,
        projectName: `Rules E2E ${projectId}`,
        name: `Rules E2E ${projectId}`,
        status: 'active',
        ownerUid: userIds.owner,
        ownerEmail: USERS.owner.email,
        tenantId: 'tenant-e2e',
        createdBy: userIds.owner,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastOpenedAt: FieldValue.serverTimestamp(),
      });
      batch.set(db.doc(`projects/${projectId}/members/${userIds.owner}`), {
        userId: userIds.owner,
        projectId,
        role: 'owner',
        status: 'active',
        createdBy: userIds.owner,
        email: USERS.owner.email,
        emailNormalized: USERS.owner.email.toLowerCase(),
        displayName: USERS.owner.displayName,
        tenantId: 'tenant-e2e',
        projectName: `Rules E2E ${projectId}`,
        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    seedProject(APP_PROJECT);
    seedProject(OTHER_PROJECT);

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

    batch.set(db.doc(`projects/${APP_PROJECT}/screenSpecs/scr-seed-parent`), {
      id: 'scr-seed-parent',
      projectId: APP_PROJECT,
      code: 'SCR-001',
      title: 'Parent Screen Spec',
      screenType: 'form',
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

    batch.set(db.doc(`projects/${APP_PROJECT}/screenSpecs/scr-deleted-parent`), {
      id: 'scr-deleted-parent',
      projectId: APP_PROJECT,
      code: 'SCR-002',
      title: 'Deleted Parent',
      screenType: 'form',
      writeStatus: 'writing',
      reviewStatus: 'none',
      approvalStatus: 'none',
      ownerId: userIds.owner,
      ownerName: USERS.owner.displayName,
      createdBy: userIds.owner,
      updatedBy: userIds.owner,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: userIds.owner,
      isDeleted: true,
      version: 1,
    });

    batch.set(db.doc(`projects/${OTHER_PROJECT}/screenSpecs/scr-other-parent`), {
      id: 'scr-other-parent',
      projectId: OTHER_PROJECT,
      code: 'SCR-001',
      title: 'Other Parent',
      screenType: 'form',
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
    const ref = doc(db, `projects/${APP_PROJECT}/screenFields/${payload.id}`);
    await setDoc(ref, Object.assign({}, payload, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    return payload.id;
  }

  async function expectDenied(fn) {
    let denied = false;
    try {
      await fn();
    } catch (err) {
      denied = err && err.code === 'permission-denied'
        || /permission|insufficient|denied/i.test(String(err && err.message));
    }
    assert.equal(denied, true);
  }

  const { app, auth, db } = initClient();
  const userIds = {};
  for (const [key, profile] of Object.entries(USERS)) {
    const cred = await createUserWithEmailAndPassword(auth, profile.email, PASSWORD);
    userIds[key] = cred.user.uid;
  }
  await seedWithAdmin(userIds);

  await signInAs(auth, USERS.viewer.email);
  const readSnap = await getDocs(collection(db, `projects/${APP_PROJECT}/screenFields`));
  assert.ok(readSnap.size >= 0);
  console.log('viewer read list: ALLOW');

  await expectDenied(() => commitCreate(db, baseFieldPayload(userIds.viewer, { id: 'fld-viewer-deny' })));
  console.log('viewer create: DENY');

  await signInAs(auth, USERS.editor.email);
  const editorFieldId = await commitCreate(db, baseFieldPayload(userIds.editor, { id: 'fld-editor-create' }));
  console.log('editor create: ALLOW');

  await updateDoc(doc(db, `projects/${APP_PROJECT}/screenFields/${editorFieldId}`), {
    label: 'Updated Label',
    updatedBy: userIds.editor,
    updatedAt: serverTimestamp(),
  });
  console.log('editor update: ALLOW');

  await deleteDoc(doc(db, `projects/${APP_PROJECT}/screenFields/${editorFieldId}`));
  const deletedSnap = await getDoc(doc(db, `projects/${APP_PROJECT}/screenFields/${editorFieldId}`));
  assert.equal(deletedSnap.exists(), false);
  console.log('editor hard delete + get NOT_FOUND: ALLOW');

  const reRegisterId = await commitCreate(db, baseFieldPayload(userIds.editor, {
    id: 'fld-reregister-name',
    name: 'titleText',
  }));
  assert.equal(reRegisterId, 'fld-reregister-name');
  console.log('delete then same name re-register (rules layer): ALLOW');

  await expectDenied(() => commitCreate(db, baseFieldPayload(userIds.editor, {
    id: 'fld-no-parent',
    screenSpecId: 'scr-missing',
  })));
  console.log('parent missing create: DENY');

  await expectDenied(() => commitCreate(db, baseFieldPayload(userIds.editor, {
    id: 'fld-deleted-parent',
    screenSpecId: 'scr-deleted-parent',
  })));
  console.log('deleted parent create: DENY');

  await expectDenied(() => commitCreate(db, baseFieldPayload(userIds.editor, {
    id: 'fld-other-project-parent',
    screenSpecId: 'scr-other-parent',
  })));
  console.log('other project parent reference create: DENY');

  const immutableId = await commitCreate(db, baseFieldPayload(userIds.editor, { id: 'fld-immutable' }));
  const immutableSnap = await getDoc(doc(db, `projects/${APP_PROJECT}/screenFields/${immutableId}`));
  const immutableData = immutableSnap.data();
  await expectDenied(() => updateDoc(doc(db, `projects/${APP_PROJECT}/screenFields/${immutableId}`), {
    ...immutableData,
    screenSpecId: 'scr-deleted-parent',
    updatedBy: userIds.editor,
    updatedAt: serverTimestamp(),
  }));
  console.log('immutable screenSpecId change: DENY');

  await expectDenied(() => commitCreate(db, Object.assign(baseFieldPayload(userIds.editor, { id: 'fld-bad-time' }), {
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  })));
  console.log('audit timestamp forgery: DENY');

  await expectDenied(() => commitCreate(db, Object.assign(baseFieldPayload(userIds.editor, { id: 'fld-extra-key' }), {
    channelScope: 'pc',
  })));
  console.log('forbidden extra field: DENY');

  await signInAs(auth, USERS.outsider.email);
  await expectDenied(() => getDocs(collection(db, `projects/${APP_PROJECT}/screenFields`)));
  console.log('non-member read: DENY');

  await signInAs(auth, USERS.editor.email);
  await expectDenied(() => getDocs(collection(db, `projects/${OTHER_PROJECT}/screenFields`)));
  console.log('other project access: DENY');

  await signInAs(auth, USERS.viewer.email);
  await expectDenied(() => deleteDoc(doc(db, `projects/${APP_PROJECT}/screenFields/${reRegisterId}`)));
  console.log('viewer delete: DENY');

  await deleteApp(app);
  console.log('screen field firestore rules emulator: PASS');
}

if (isDirectRun) {
  if (!bootstrapEmulatorsIfNeeded()) {
    runScreenFieldFirestoreRulesEmulatorTests()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
