#!/usr/bin/env node
/**
 * STAM WBS Picker → Firestore Rules emulator E2E
 *
 * Usage:
 *   npx firebase-tools emulators:exec \
 *     --only auth,firestore \
 *     "node scripts/test-wbs-picker-firestore-rules-emulator.mjs"
 *
 * Seed uses firebase-admin (emulator bypass). Rules evaluation uses Firebase
 * client SDK + Auth emulator transactions, which match production timestamp
 * semantics (`request.time`) better than Firestore REST commit transforms.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const PAYLOAD_CACHE = path.join(ROOT, 'scripts/.cache/wbs-picker-e2e-payloads.json');
const FIRESTORE_PROJECT = 'stam-preview-hosting';
const APP_PROJECT = 'P1';
const OWNER_EMAIL = 'wbs-rules-owner@test.local';
const OWNER_PASSWORD = 'rules-test-password';
const ADMIN_ROOT = process.env.STAM_FIREBASE_ADMIN_ROOT || '/tmp/stam-firebase-admin';
const CLIENT_ROOT = process.env.STAM_FIREBASE_CLIENT_ROOT || '/tmp/stam-firebase-client';

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
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`, { disableWarnings: true });
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  connectFirestoreEmulator(db, host, Number(port), { mockUserToken: undefined });
  return { auth, db };
}

async function createWriter(auth) {
  const cred = await createUserWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
  return { uid: cred.user.uid, user: cred.user };
}

async function commitCreate(db, payload, counterExists = true) {
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

const cache = JSON.parse(await readFile(PAYLOAD_CACHE, 'utf8'));
assert.ok(Array.isArray(cache.scenarios), 'payload cache scenarios required');

const { auth, db } = initClient();
const writer = await createWriter(auth);
await seedWithAdmin(writer.uid, OWNER_EMAIL);

let counter = 1;
for (const entry of cache.scenarios) {
  const wbsId = `wbs-rules-${entry.scenario.replace(/\+/g, '-')}`;
  const payload = prepareDocumentPayload(entry.servicePayload, wbsId, 'WBS-PENDING', writer.uid);
  await commitCreate(db, payload, counter > 1);
  counter += 1;
  console.log(`scenario ${entry.scenario}: ALLOW`);
}

const linked = cache.scenarios.find((s) => s.scenario === 'requirement+functionalSpec');
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
process.exit(0);
