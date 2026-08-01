#!/usr/bin/env node
/**
 * STAM PR B — screenField Adapter + Firestore compat emulator integration
 *
 * Runs the browser compat adapter against Firestore emulator with auth.
 * Verifies query preflight paths (no Transaction.get(Query)).
 *
 * Usage:
 *   node scripts/test-screen-field-adapter-firestore-emulator.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1]
  && path.resolve(SCRIPT_PATH) === path.resolve(process.argv[1]);

function runWithSpawnedEmulators() {
  let tempDir;
  try {
    tempDir = mkdtempSync(path.join(tmpdir(), 'stam-screen-field-adapter-emulator-'));
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
    const result = spawnSync(
      'npx',
      ['-y', 'firebase-tools', 'emulators:exec', '-c', cfgPath, '--only', 'auth,firestore', '--project', 'stam-preview-hosting', `"${process.execPath}" "${SCRIPT_PATH}"`],
      { cwd: ROOT, stdio: 'inherit', env: process.env, shell: true },
    );
    process.exit(result.status ?? 1);
  } finally {
    if (tempDir) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* noop */ }
    }
  }
}

function bootstrapEmulatorsIfNeeded() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST) return false;
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIRESTORE_EMULATOR_HOST) {
    runWithSpawnedEmulators();
    return true;
  }
  process.exit(1);
}

async function runAdapterFirestoreEmulatorTests() {
  const require = createRequire(import.meta.url);
  const CLIENT_ROOT = process.env.STAM_FIREBASE_CLIENT_ROOT || 'D:/vibe_coding/STAM/.tmp-firebase-client';
  const ADMIN_ROOT = process.env.STAM_FIREBASE_ADMIN_ROOT || 'D:/vibe_coding/STAM/.tmp-firebase-admin';
  process.env.NODE_PATH = [path.join(CLIENT_ROOT, 'node_modules'), path.join(ADMIN_ROOT, 'node_modules'), process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
  require('node:module').Module._initPaths();

  const firebase = require('firebase/compat/app');
  require('firebase/compat/firestore');
  require('firebase/compat/auth');

  const { initializeApp: initAdminApp, getApps: getAdminApps } = require('firebase-admin/app');
  const { getFirestore: getAdminFirestore, FieldValue } = require('firebase-admin/firestore');

  const APP_PROJECT = 'P1';
  const PASSWORD = 'adapter-test-password';
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  const [fsHost, fsPort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');

  if (getAdminApps().length === 0) initAdminApp({ projectId: 'stam-preview-hosting' });
  const adminDb = getAdminFirestore();
  await adminDb.doc(`projects/${APP_PROJECT}`).set({
    projectId: APP_PROJECT,
    projectName: 'Adapter E2E',
    name: 'Adapter E2E',
    status: 'active',
    ownerUid: 'seed-owner',
    ownerEmail: 'editor@test.local',
    tenantId: 'tenant-e2e',
    createdBy: 'seed-owner',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastOpenedAt: FieldValue.serverTimestamp(),
  });
  await adminDb.doc(`projects/${APP_PROJECT}/screenSpecs/scr-adapter-parent`).set({
    id: 'scr-adapter-parent',
    projectId: APP_PROJECT,
    code: 'SCR-901',
    title: 'Adapter parent',
    screenType: 'form',
    writeStatus: 'writing',
    reviewStatus: 'none',
    approvalStatus: 'none',
    ownerId: 'seed-owner',
    ownerName: 'Owner',
    createdBy: 'seed-owner',
    updatedBy: 'seed-owner',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
    version: 1,
  });

  const app = firebase.initializeApp({
    apiKey: 'fake',
    projectId: 'stam-preview-hosting',
  });
  firebase.auth().useEmulator(`http://${authHost}`);
  firebase.firestore().useEmulator(fsHost, Number(fsPort));

  const editorEmail = 'sf-adapter-editor@test.local';
  try {
    await firebase.auth().createUserWithEmailAndPassword(editorEmail, PASSWORD);
  } catch {
    // user may already exist on retry
  }
  await firebase.auth().signInWithEmailAndPassword(editorEmail, PASSWORD);
  const editorUid = firebase.auth().currentUser.uid;

  await adminDb.doc(`projects/${APP_PROJECT}/members/${editorUid}`).set({
    userId: editorUid,
    projectId: APP_PROJECT,
    role: 'editor',
    status: 'active',
    createdBy: editorUid,
    email: editorEmail,
    emailNormalized: editorEmail.toLowerCase(),
    displayName: 'Adapter Editor',
    tenantId: 'tenant-e2e',
    projectName: 'Adapter E2E',
    joinedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const adapterSource = readFileSync(path.join(ROOT, 'stam/js/stam.screen-field-firestore-adapter.js'), 'utf8');
  const window = { firebase };
  window.window = window;
  vm.runInContext(adapterSource, vm.createContext({
    window,
    console,
    Date,
    Promise,
    Number,
    String,
    JSON,
    Array,
    Object,
    Error,
    Math,
  }), { filename: 'stam.screen-field-firestore-adapter.js' });

  const adapter = window.STAM.screenFieldFirestoreAdapter.create();
  const txGets = [];
  const originalRunTransaction = firebase.firestore().runTransaction.bind(firebase.firestore());
  firebase.firestore().runTransaction = function (fn) {
    return originalRunTransaction(function (transaction) {
      const wrapped = Object.create(transaction);
      wrapped.get = function (ref) {
        txGets.push(ref);
        if (ref && typeof ref.where === 'function') {
          throw new Error('Transaction.get(Query) must not be called');
        }
        return transaction.get(ref);
      };
      return fn(wrapped);
    });
  };

  const baseInput = {
    screenSpecId: 'scr-adapter-parent',
    name: 'adapterField',
    label: 'Adapter',
    type: 'text',
    order: 0,
    required: false,
    readonly: false,
    disabled: false,
    defaultValue: null,
    options: [],
    validationRules: [],
    schemaVersion: 1,
    createdBy: editorUid,
    updatedBy: editorUid,
  };

  const created = await adapter.create(APP_PROJECT, baseInput);
  assert.ok(created.id);
  assert.equal(txGets.length >= 1, true);
  assert.equal(txGets.some((ref) => ref && typeof ref.where === 'function'), false);

  await assert.rejects(
    () => adapter.create(APP_PROJECT, Object.assign({}, baseInput, { name: 'AdapterField' })),
    (err) => err.code === 'SCREEN_FIELD_DUPLICATE_NAME',
  );

  await adapter.update(APP_PROJECT, created.id, { label: 'Adapter Updated', updatedBy: editorUid });
  const renamed = await adapter.update(APP_PROJECT, created.id, { name: 'adapterFieldRenamed', updatedBy: editorUid });
  assert.equal(renamed.name, 'adapterFieldRenamed');

  const second = await adapter.create(APP_PROJECT, Object.assign({}, baseInput, {
    name: 'secondField',
    label: 'Second',
  }));

  await assert.rejects(
    () => adapter.update(APP_PROJECT, second.id, { name: 'adapterFieldRenamed', updatedBy: editorUid }),
    (err) => err.code === 'SCREEN_FIELD_DUPLICATE_NAME',
  );

  await adapter.delete(APP_PROJECT, created.id);
  await adapter.delete(APP_PROJECT, second.id);
  assert.equal(await adapter.getById(APP_PROJECT, created.id), null);

  await firebase.app().delete();
  console.log('screen field adapter firestore emulator: PASS');
}

if (isDirectRun) {
  if (!bootstrapEmulatorsIfNeeded()) {
    runAdapterFirestoreEmulatorTests().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  }
}
