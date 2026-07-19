#!/usr/bin/env node
/**
 * STAM WBS update preflight contract
 *
 * Usage:
 *   node scripts/test-wbs-update-preflight-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-adapter.js'), 'utf8');
const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-crud.js'), 'utf8');
const uiMessagesSource = await readFile(path.join(ROOT, 'stam/js/stam.ui-messages.js'), 'utf8');

assert.match(adapterSource, /runUpdatePreflight/);
assert.match(adapterSource, /WBS_UPDATE_DOC_MISSING/);
assert.match(adapterSource, /WBS_UPDATE_CURRENT_VERSION_INVALID/);
assert.match(adapterSource, /WBS_UPDATE_VERSION_MISMATCH/);
assert.match(adapterSource, /WBS_UPDATE_IMMUTABLE_FIELD/);
assert.match(adapterSource, /WBS_UPDATE_REVIEWER_PARTIAL/);
assert.match(adapterSource, /wbsUpdateStage/);
assert.match(adapterSource, /updatePreflightPassed/);
assert.match(adapterSource, /updateCommitted/);
assert.match(crudSource, /formatUpdateError/);
assert.match(crudSource, /updateRulesRejectedAfterPreflight/);
assert.match(crudSource, /updateCommittedReadFailed/);
assert.match(uiMessagesSource, /updateVersionMismatch/);
assert.match(uiMessagesSource, /updatePreflightReadPermissionDenied/);
assert.match(uiMessagesSource, /updateCommittedReadFailed/);

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

function currentDoc(overrides = {}) {
  return {
    id: 'wbs-1',
    projectId: 'P1',
    code: 'WBS-001',
    title: 'Existing task',
    phase: '분석',
    functionGroup: '상품',
    status: 'wait',
    priority: 'mid',
    ownerId: 'owner-1',
    ownerName: '이서',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    progress: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    createdBy: 'writer-1',
    updatedAt: '2026-07-01T00:00:00.000Z',
    updatedBy: 'writer-1',
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
    version: 1,
    ...overrides,
  };
}

function validPatch(overrides = {}) {
  return {
    title: 'Updated title',
    version: 2,
    updatedBy: 'writer-1',
    ...overrides,
  };
}

function createFakeFirestore(options = {}) {
  const store = new Map();
  const paths = [];
  const getCounts = new Map();
  const rejectGet = options.rejectGet;
  const rejectGetOnAttempt = options.rejectGetOnAttempt;
  const rejectUpdate = options.rejectUpdate;

  function docRef(pathParts) {
    const key = pathParts.join('/');
    return {
      __key: key,
      collection(name) {
        return collectionRef([...pathParts, name]);
      },
      get() {
        paths.push(['get', key]);
        const attempt = (getCounts.get(key) || 0) + 1;
        getCounts.set(key, attempt);
        if (typeof rejectGetOnAttempt === 'function' && rejectGetOnAttempt(key, attempt)) {
          const err = new Error(options.rejectGetMessage || 'Missing or insufficient permissions.');
          return Promise.reject(err);
        }
        if (typeof rejectGet === 'function' && rejectGet(key)) {
          const err = new Error(options.rejectGetMessage || 'Missing or insufficient permissions.');
          return Promise.reject(err);
        }
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
      update(payload) {
        paths.push(['update', key, payload]);
        if (typeof rejectUpdate === 'function' && rejectUpdate(key)) {
          const err = new Error(options.rejectUpdateMessage || 'Missing or insufficient permissions.');
          return Promise.reject(err);
        }
        const prev = store.get(key) || {};
        store.set(key, Object.assign({}, prev, payload));
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
    updateCount() {
      return paths.filter((entry) => entry[0] === 'update').length;
    },
    collection(name) {
      return collectionRef([name]);
    },
    seedMember(projectId, memberUid, member) {
      store.set(`projects/${projectId}/members/${memberUid}`, member);
    },
    seedWbs(projectId, wbsItemId, data) {
      store.set(`projects/${projectId}/wbsItems/${wbsItemId}`, data);
    },
  };
}

function seedHappyPath(fakeFs, doc, patch, writerRole = 'owner') {
  fakeFs.seedWbs('P1', 'wbs-1', doc);
  fakeFs.seedMember('P1', patch.updatedBy, {
    userId: patch.updatedBy,
    projectId: 'P1',
    status: 'active',
    role: writerRole,
    displayName: 'Writer',
  });
  fakeFs.seedMember('P1', doc.ownerId, {
    userId: doc.ownerId,
    projectId: 'P1',
    status: 'active',
    role: 'editor',
    displayName: doc.ownerName,
  });
  if (doc.reviewerId && doc.reviewerName) {
    fakeFs.seedMember('P1', doc.reviewerId, {
      userId: doc.reviewerId,
      projectId: 'P1',
      status: 'active',
      role: 'editor',
      displayName: doc.reviewerName,
    });
  }
}

const { context, window } = createContext();
vm.runInContext(adapterSource, context, { filename: 'stam.wbs-firestore-adapter.js' });

const adapterApi = window.STAM.wbsFirestoreAdapter;
const CODES = adapterApi.PREFLIGHT_CODES;

const doc = currentDoc();
const patch = validPatch();
const fakeFs = createFakeFirestore();
seedHappyPath(fakeFs, doc, patch, 'owner');
const adapter = adapterApi.create({ firestore: fakeFs });

await adapterApi.runUpdatePreflight(fakeFs, 'P1', 'wbs-1', patch);
const updated = await adapter.update('P1', 'wbs-1', patch);
assert.equal(updated.title, 'Updated title');
assert.equal(fakeFs.updateCount(), 1);

const missingFs = createFakeFirestore();
seedHappyPath(missingFs, doc, patch);
missingFs.store.delete('projects/P1/wbsItems/wbs-1');
await assert.rejects(
  () => adapterApi.create({ firestore: missingFs }).update('P1', 'wbs-1', patch),
  (err) => err.code === CODES.UPDATE_DOC_MISSING && err.preflight === true,
);
assert.equal(missingFs.updateCount(), 0);

const writerMissingFs = createFakeFirestore();
seedHappyPath(writerMissingFs, doc, patch);
writerMissingFs.store.delete(`projects/P1/members/${patch.updatedBy}`);
await assert.rejects(
  () => adapterApi.create({ firestore: writerMissingFs }).update('P1', 'wbs-1', patch),
  (err) => err.code === CODES.MEMBER_DOC_MISSING,
);
assert.equal(writerMissingFs.updateCount(), 0);

const userMismatchFs = createFakeFirestore();
seedHappyPath(userMismatchFs, doc, patch);
userMismatchFs.seedMember('P1', patch.updatedBy, {
  userId: 'other-user',
  projectId: 'P1',
  status: 'active',
  role: 'owner',
  displayName: 'Writer',
});
await assert.rejects(
  () => adapterApi.create({ firestore: userMismatchFs }).update('P1', 'wbs-1', patch),
  (err) => err.code === CODES.MEMBER_USER_ID_MISMATCH,
);
assert.equal(userMismatchFs.updateCount(), 0);

const projectMismatchFs = createFakeFirestore();
seedHappyPath(projectMismatchFs, doc, patch);
projectMismatchFs.seedMember('P1', patch.updatedBy, {
  userId: patch.updatedBy,
  projectId: 'OTHER',
  status: 'active',
  role: 'owner',
  displayName: 'Writer',
});
await assert.rejects(
  () => adapterApi.create({ firestore: projectMismatchFs }).update('P1', 'wbs-1', patch),
  (err) => err.code === CODES.MEMBER_PROJECT_ID_MISMATCH,
);
assert.equal(projectMismatchFs.updateCount(), 0);

const inactiveFs = createFakeFirestore();
seedHappyPath(inactiveFs, doc, patch);
inactiveFs.seedMember('P1', patch.updatedBy, {
  userId: patch.updatedBy,
  projectId: 'P1',
  status: 'inactive',
  role: 'owner',
  displayName: 'Writer',
});
await assert.rejects(
  () => adapterApi.create({ firestore: inactiveFs }).update('P1', 'wbs-1', patch),
  (err) => err.code === CODES.MEMBER_INACTIVE,
);
assert.equal(inactiveFs.updateCount(), 0);

const ownerRoleFs = createFakeFirestore();
seedHappyPath(ownerRoleFs, doc, patch, 'Owner');
await assert.rejects(
  () => adapterApi.create({ firestore: ownerRoleFs }).update('P1', 'wbs-1', patch),
  (err) => err.code === CODES.MEMBER_ROLE_INVALID,
);
assert.equal(ownerRoleFs.updateCount(), 0);

const ownerMismatchFs = createFakeFirestore();
seedHappyPath(ownerMismatchFs, doc, validPatch({ ownerName: '다른이름' }));
await assert.rejects(
  () => adapterApi.create({ firestore: ownerMismatchFs }).update('P1', 'wbs-1', validPatch({ ownerName: '다른이름' })),
  (err) => err.code === CODES.OWNER_SNAPSHOT_MISMATCH,
);
assert.equal(ownerMismatchFs.updateCount(), 0);

const reviewerDoc = currentDoc({ reviewerId: 'rev-1', reviewerName: '검토자' });
const reviewerMismatchFs = createFakeFirestore();
seedHappyPath(reviewerMismatchFs, reviewerDoc, validPatch({
  reviewerId: 'rev-1',
  reviewerName: '다른이름',
}));
await assert.rejects(
  () => adapterApi.create({ firestore: reviewerMismatchFs }).update('P1', 'wbs-1', validPatch({
    reviewerId: 'rev-1',
    reviewerName: '다른이름',
  })),
  (err) => err.code === CODES.REVIEWER_SNAPSHOT_MISMATCH,
);
assert.equal(reviewerMismatchFs.updateCount(), 0);

const reviewerUnlinkFs = createFakeFirestore();
seedHappyPath(reviewerUnlinkFs, reviewerDoc, validPatch({
  reviewerId: '',
  reviewerName: '',
}));
const reviewerUnlinked = await adapterApi.create({ firestore: reviewerUnlinkFs }).update('P1', 'wbs-1', validPatch({
  reviewerId: '',
  reviewerName: '',
}));
assert.equal(reviewerUnlinked.title, 'Updated title');
assert.equal(reviewerUnlinkFs.updateCount(), 1);

const currentReviewerFs = createFakeFirestore();
seedHappyPath(currentReviewerFs, reviewerDoc, validPatch());
const currentReviewerUpdated = await adapterApi.create({ firestore: currentReviewerFs }).update('P1', 'wbs-1', validPatch());
assert.equal(currentReviewerUpdated.title, 'Updated title');

for (const badVersion of [undefined, 0, '1', 1.5]) {
  const badFs = createFakeFirestore();
  seedHappyPath(badFs, currentDoc({ version: badVersion }), patch);
  await assert.rejects(
    () => adapterApi.create({ firestore: badFs }).update('P1', 'wbs-1', patch),
    (err) => err.code === CODES.UPDATE_CURRENT_VERSION_INVALID,
  );
  assert.equal(badFs.updateCount(), 0, `current version ${String(badVersion)} must fail`);
}

const versionPassFs = createFakeFirestore();
seedHappyPath(versionPassFs, currentDoc({ version: 2 }), validPatch({ version: 3 }));
await adapterApi.runUpdatePreflight(versionPassFs, 'P1', 'wbs-1', validPatch({ version: 3 }));

for (const badPatchVersion of [1, undefined, 2.5, 4]) {
  const mismatchFs = createFakeFirestore();
  seedHappyPath(mismatchFs, doc, validPatch({ version: badPatchVersion }));
  await assert.rejects(
    () => adapterApi.create({ firestore: mismatchFs }).update('P1', 'wbs-1', validPatch({ version: badPatchVersion })),
    (err) => err.code === CODES.UPDATE_VERSION_MISMATCH,
  );
  assert.equal(mismatchFs.updateCount(), 0, `patch version ${String(badPatchVersion)} must fail`);
}

for (const field of ['id', 'projectId', 'code', 'createdAt', 'createdBy', 'isDeleted', 'deletedAt', 'deletedBy']) {
  const immutableFs = createFakeFirestore();
  seedHappyPath(immutableFs, doc, patch);
  const immutablePatch = validPatch({ [field]: 'blocked' });
  await assert.rejects(
    () => adapterApi.create({ firestore: immutableFs }).update('P1', 'wbs-1', immutablePatch),
    (err) => err.code === CODES.UPDATE_IMMUTABLE_FIELD,
  );
  assert.equal(immutableFs.updateCount(), 0, `immutable field ${field} must block update`);
}

const preflightFailFs = createFakeFirestore();
seedHappyPath(preflightFailFs, doc, validPatch({ version: 1 }));
await assert.rejects(
  () => adapterApi.create({ firestore: preflightFailFs }).update('P1', 'wbs-1', validPatch({ version: 1 })),
  (err) => err.code === CODES.UPDATE_VERSION_MISMATCH,
);
assert.equal(preflightFailFs.updateCount(), 0);

const rulesRejectFs = createFakeFirestore({
  rejectUpdate(key) {
    return key === 'projects/P1/wbsItems/wbs-1';
  },
});
seedHappyPath(rulesRejectFs, doc, patch);
await assert.rejects(
  () => adapterApi.create({ firestore: rulesRejectFs }).update('P1', 'wbs-1', patch),
  (err) => err.updatePreflightPassed === true
    && err.wbsUpdateStage === 'document-write'
    && err.updateCommitted !== true
    && /Missing or insufficient permissions/i.test(err.message),
);

const postReadFs = createFakeFirestore({
  rejectGetOnAttempt(key, attempt) {
    return key === 'projects/P1/wbsItems/wbs-1' && attempt >= 2;
  },
});
seedHappyPath(postReadFs, doc, patch);
await assert.rejects(
  () => adapterApi.create({ firestore: postReadFs }).update('P1', 'wbs-1', patch),
  (err) => err.wbsUpdateStage === 'post-update-read'
    && err.updatePreflightPassed === true
    && err.updateCommitted === true
    && /Missing or insufficient permissions/i.test(err.message),
);
assert.equal(postReadFs.updateCount(), 1);

const partialReviewerFs = createFakeFirestore();
seedHappyPath(partialReviewerFs, doc, validPatch({ reviewerId: 'rev-1' }));
await assert.rejects(
  () => adapterApi.create({ firestore: partialReviewerFs }).update('P1', 'wbs-1', validPatch({ reviewerId: 'rev-1' })),
  (err) => err.code === CODES.UPDATE_REVIEWER_PARTIAL,
);
assert.equal(partialReviewerFs.updateCount(), 0);

const preflightPermFs = createFakeFirestore({
  rejectGet(key) {
    return key === 'projects/P1/wbsItems/wbs-1';
  },
});
seedHappyPath(preflightPermFs, doc, patch);
await assert.rejects(
  () => adapterApi.create({ firestore: preflightPermFs }).update('P1', 'wbs-1', patch),
  (err) => err.wbsUpdateStage === 'preflight-read'
    && err.updatePreflightPassed !== true
    && /Missing or insufficient permissions/i.test(err.message),
);
assert.equal(preflightPermFs.updateCount(), 0);

const formatCrudSource = crudSource.replace(
  'window.STAM.wbsFirestoreCrud = {',
  'window.__formatUpdateError = formatUpdateError;\n  window.STAM.wbsFirestoreCrud = {',
);
const formatContext = vm.createContext({
  window: { STAM: {} },
  document: {
    readyState: 'complete',
    querySelector() { return null; },
    addEventListener() {},
  },
  console,
});
formatContext.window.window = formatContext.window;
vm.runInContext(uiMessagesSource, formatContext, { filename: 'stam.ui-messages.js' });
vm.runInContext(formatCrudSource, formatContext, { filename: 'stam.wbs-firestore-crud.js' });
const formatUpdateError = formatContext.window.__formatUpdateError;
const wbsMsg = formatContext.window.STAM.uiMessages.wbs;

assert.equal(
  formatUpdateError({ preflight: true, code: 'WBS_UPDATE_CURRENT_VERSION_INVALID' }),
  wbsMsg.updateVersionInvalid,
);
assert.equal(
  formatUpdateError({ preflight: true, code: 'WBS_UPDATE_VERSION_MISMATCH' }),
  wbsMsg.updateVersionMismatch,
);
assert.notEqual(wbsMsg.updateVersionInvalid, wbsMsg.updateVersionMismatch);
assert.equal(
  formatUpdateError({ wbsUpdateStage: 'preflight-read', message: 'Missing or insufficient permissions.' }),
  wbsMsg.updatePreflightReadPermissionDenied,
);
assert.equal(
  formatUpdateError({ updatePreflightPassed: true, message: 'Missing or insufficient permissions.' }),
  wbsMsg.updateRulesRejectedAfterPreflight,
);
assert.equal(
  formatUpdateError({ updateCommitted: true, message: 'Missing or insufficient permissions.' }),
  wbsMsg.updateCommittedReadFailed,
);
assert.doesNotMatch(
  formatUpdateError({ updateCommitted: true, message: 'projects/P1/wbsItems/wbs-1 uid writer-1' }),
  /projects\/|writer-1/,
);

console.log('wbs update preflight contract: PASS');
