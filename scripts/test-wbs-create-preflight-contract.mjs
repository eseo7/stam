#!/usr/bin/env node
/**
 * STAM WBS create preflight contract
 *
 * Usage:
 *   node scripts/test-wbs-create-preflight-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-adapter.js'), 'utf8');
const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-crud.js'), 'utf8');
const uiMessagesSource = await readFile(path.join(ROOT, 'stam/js/stam.ui-messages.js'), 'utf8');

assert.match(adapterSource, /runCreatePreflight/);
assert.match(adapterSource, /PREFLIGHT_CODES/);
assert.match(adapterSource, /WBS_MEMBER_ROLE_INVALID/);
assert.match(adapterSource, /WBS_OWNER_SNAPSHOT_MISMATCH/);
assert.match(adapterSource, /WBS_REVIEWER_SNAPSHOT_MISMATCH/);
assert.match(adapterSource, /WBS_COUNTER_INVALID/);
assert.match(crudSource, /formatCreateError/);
assert.match(crudSource, /rulesRejectedAfterPreflight/);
assert.match(uiMessagesSource, /memberSnapshotMismatch/);
assert.match(uiMessagesSource, /ownerSnapshotMismatch/);
assert.match(uiMessagesSource, /counterInvalid/);

function createContext() {
  const window = {};
  window.firebase = {
    firestore: Object.assign(function firestore() {
      return null;
    }, {
      FieldValue: {
        serverTimestamp() {
          return { __serverTimestamp: true };
        },
        delete() {
          return { __fieldDelete: true };
        },
      },
    }),
  };
  const context = vm.createContext({
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
  });
  window.window = window;
  return { context, window };
}

function validPayload(overrides = {}) {
  return {
    id: 'wbs-new',
    projectId: 'P1',
    title: 'Preflight task',
    phase: '분석',
    functionGroup: '상품',
    status: 'wait',
    priority: 'mid',
    ownerId: 'owner-1',
    ownerName: '이서',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    progress: 0,
    createdBy: 'writer-1',
    updatedBy: 'writer-1',
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
    version: 1,
    ...overrides,
  };
}

function createFakeFirestore() {
  const store = new Map();
  let transactionCount = 0;
  const paths = [];

  function docRef(pathParts) {
    const key = pathParts.join('/');
    return {
      __key: key,
      collection(name) {
        return collectionRef([...pathParts, name]);
      },
      get() {
        paths.push(['get', key]);
        const stored = store.get(key);
        if (stored) {
          return Promise.resolve({
            id: pathParts[pathParts.length - 1],
            exists: true,
            data: () => stored,
          });
        }
        return Promise.resolve({
          id: pathParts[pathParts.length - 1],
          exists: false,
          data: () => ({}),
        });
      },
      set(payload, setOptions) {
        paths.push(['set', key, payload, setOptions || null]);
        const prev = store.get(key) || {};
        store.set(key, setOptions && setOptions.merge ? Object.assign({}, prev, payload) : Object.assign({}, payload));
        return Promise.resolve();
      },
    };
  }

  function collectionRef(pathParts) {
    return {
      doc(id) {
        return docRef([...pathParts, id]);
      },
      get() {
        paths.push(['getCollection', pathParts.join('/')]);
        return Promise.resolve({ forEach() {} });
      },
    };
  }

  return {
    paths,
    store,
    transactionCount: () => transactionCount,
    collection(name) {
      return collectionRef([name]);
    },
    runTransaction(fn) {
      transactionCount += 1;
      const pending = [];
      const tx = {
        get(ref) {
          return ref.get();
        },
        set(ref, data, setOptions) {
          pending.push({ ref, data, setOptions });
        },
      };
      return Promise.resolve(fn(tx))
        .then((result) => Promise.all(pending.map((op) => op.ref.set(op.data, op.setOptions))).then(() => result))
        .catch((err) => {
          pending.length = 0;
          throw err;
        });
    },
    seedMember(projectId, memberUid, member) {
      store.set(`projects/${projectId}/members/${memberUid}`, member);
    },
    seedCounter(projectId, data) {
      store.set(`projects/${projectId}/counters/wbsItems`, data);
    },
  };
}

function seedHappyPath(fakeFs, payload, writerRole = 'owner') {
  fakeFs.seedMember('P1', payload.createdBy, {
    userId: payload.createdBy,
    projectId: 'P1',
    status: 'active',
    role: writerRole,
    displayName: 'Writer',
  });
  fakeFs.seedMember('P1', payload.ownerId, {
    userId: payload.ownerId,
    projectId: 'P1',
    status: 'active',
    role: 'editor',
    displayName: payload.ownerName,
  });
  if (payload.reviewerId && payload.reviewerName) {
    fakeFs.seedMember('P1', payload.reviewerId, {
      userId: payload.reviewerId,
      projectId: 'P1',
      status: 'active',
      role: 'editor',
      displayName: payload.reviewerName,
    });
  }
}

const { context, window } = createContext();
vm.runInContext(adapterSource, context, { filename: 'stam.wbs-firestore-adapter.js' });

const adapterApi = window.STAM.wbsFirestoreAdapter;
const CODES = adapterApi.PREFLIGHT_CODES;

assert.equal(CODES.MEMBER_ROLE_INVALID, 'WBS_MEMBER_ROLE_INVALID');
assert.equal(JSON.stringify(adapterApi.WRITE_ROLES), JSON.stringify(['owner', 'admin', 'editor']));

const payload = validPayload();
const fakeFs = createFakeFirestore();
seedHappyPath(fakeFs, payload, 'owner');
const adapter = adapterApi.create({ firestore: fakeFs });

const created = await adapter.create('P1', payload);
assert.equal(created.code, 'WBS-001');
assert.equal(fakeFs.transactionCount(), 1);

const ownerRolePayload = validPayload({ id: 'wbs-owner-role' });
const ownerRoleFs = createFakeFirestore();
seedHappyPath(ownerRoleFs, ownerRolePayload, 'Owner');
await assert.rejects(
  () => adapterApi.create({ firestore: ownerRoleFs }).create('P1', ownerRolePayload),
  (err) => err.code === CODES.MEMBER_ROLE_INVALID,
);

const userMismatchPayload = validPayload({ id: 'wbs-user-mismatch' });
const userMismatchFs = createFakeFirestore();
seedHappyPath(userMismatchFs, userMismatchPayload);
userMismatchFs.seedMember('P1', userMismatchPayload.createdBy, {
  userId: 'other-user',
  projectId: 'P1',
  status: 'active',
  role: 'owner',
  displayName: 'Writer',
});
await assert.rejects(
  () => adapterApi.create({ firestore: userMismatchFs }).create('P1', userMismatchPayload),
  (err) => err.code === CODES.MEMBER_USER_ID_MISMATCH,
);
assert.equal(userMismatchFs.transactionCount(), 0);

const projectMismatchPayload = validPayload({ id: 'wbs-project-mismatch' });
const projectMismatchFs = createFakeFirestore();
seedHappyPath(projectMismatchFs, projectMismatchPayload);
projectMismatchFs.seedMember('P1', projectMismatchPayload.createdBy, {
  userId: projectMismatchPayload.createdBy,
  projectId: 'OTHER',
  status: 'active',
  role: 'owner',
  displayName: 'Writer',
});
await assert.rejects(
  () => adapterApi.create({ firestore: projectMismatchFs }).create('P1', projectMismatchPayload),
  (err) => err.code === CODES.MEMBER_PROJECT_ID_MISMATCH,
);
assert.equal(projectMismatchFs.transactionCount(), 0);

const ownerNamePayload = validPayload({ id: 'wbs-owner-name', ownerName: '이서7' });
const ownerNameFs = createFakeFirestore();
seedHappyPath(ownerNameFs, validPayload({ ownerName: '이서' }));
await assert.rejects(
  () => adapterApi.create({ firestore: ownerNameFs }).create('P1', ownerNamePayload),
  (err) => err.code === CODES.OWNER_SNAPSHOT_MISMATCH,
);
assert.equal(ownerNameFs.transactionCount(), 0);

const reviewerPayload = validPayload({
  id: 'wbs-reviewer',
  reviewerId: 'rev-1',
  reviewerName: '검토자',
});
const reviewerFs = createFakeFirestore();
seedHappyPath(reviewerFs, reviewerPayload);
const reviewerCreated = await adapterApi.create({ firestore: reviewerFs }).create('P1', reviewerPayload);
assert.equal(reviewerCreated.id, 'wbs-reviewer');

const reviewerOmitPayload = validPayload({ id: 'wbs-no-reviewer' });
const reviewerOmitFs = createFakeFirestore();
seedHappyPath(reviewerOmitFs, reviewerOmitPayload);
const reviewerOmitCreated = await adapterApi.create({ firestore: reviewerOmitFs }).create('P1', reviewerOmitPayload);
assert.equal(reviewerOmitCreated.id, 'wbs-no-reviewer');

const reviewerMismatchPayload = validPayload({
  id: 'wbs-reviewer-mismatch',
  reviewerId: 'rev-1',
  reviewerName: '다른이름',
});
const reviewerMismatchFs = createFakeFirestore();
seedHappyPath(reviewerMismatchFs, validPayload({
  reviewerId: 'rev-1',
  reviewerName: '검토자',
}));
await assert.rejects(
  () => adapterApi.create({ firestore: reviewerMismatchFs }).create('P1', reviewerMismatchPayload),
  (err) => err.code === CODES.REVIEWER_SNAPSHOT_MISMATCH,
);
assert.equal(reviewerMismatchFs.transactionCount(), 0);

const noCounterPayload = validPayload({ id: 'wbs-no-counter' });
const noCounterFs = createFakeFirestore();
seedHappyPath(noCounterFs, noCounterPayload);
const noCounterCreated = await adapterApi.create({ firestore: noCounterFs }).create('P1', noCounterPayload);
assert.equal(noCounterCreated.code, 'WBS-001');

const counterOnePayload = validPayload({ id: 'wbs-counter-one' });
const counterOneFs = createFakeFirestore();
seedHappyPath(counterOneFs, counterOnePayload);
counterOneFs.seedCounter('P1', { lastNumber: 1 });
const counterOneCreated = await adapterApi.create({ firestore: counterOneFs }).create('P1', counterOnePayload);
assert.equal(counterOneCreated.code, 'WBS-002');

for (const badCounter of [
  { lastNumber: 0 },
  { lastNumber: -1 },
  { lastNumber: 1.5 },
  { lastNumber: '2' },
  { lastNumber: 1, extra: true },
]) {
  const badFs = createFakeFirestore();
  seedHappyPath(badFs, validPayload({ id: 'wbs-bad-counter' }));
  badFs.seedCounter('P1', badCounter);
  await assert.rejects(
    () => adapterApi.create({ firestore: badFs }).create('P1', validPayload({ id: 'wbs-bad-counter' })),
    (err) => err.code === CODES.COUNTER_INVALID,
  );
  assert.equal(badFs.transactionCount(), 0, `counter ${JSON.stringify(badCounter)} must block transaction`);
}

const preflightOnlyFs = createFakeFirestore();
seedHappyPath(preflightOnlyFs, payload);
await adapterApi.runCreatePreflight(preflightOnlyFs, 'P1', payload);
assert.equal(preflightOnlyFs.transactionCount(), 0);

let rulesRejectFs = createFakeFirestore();
seedHappyPath(rulesRejectFs, validPayload({ id: 'wbs-rules-reject' }));
rulesRejectFs = Object.assign(rulesRejectFs, {
  runTransaction() {
    return Promise.reject(new Error('Missing or insufficient permissions.'));
  },
});
await assert.rejects(
  () => adapterApi.create({ firestore: rulesRejectFs }).create('P1', validPayload({ id: 'wbs-rules-reject' })),
  (err) => err.preflightPassed === true && /Missing or insufficient permissions/i.test(err.message),
);

let emulatorStatus = '미실행';
try {
  await import('@firebase/rules-unit-testing');
  emulatorStatus = '패키지 존재 — 본 계약 테스트에서는 Rules emulator 미실행';
} catch {
  emulatorStatus = '미실행 — @firebase/rules-unit-testing 패키지 없음';
}

console.log('wbs create preflight contract: PASS');
console.log('firestore rules emulator:', emulatorStatus);
