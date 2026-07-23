#!/usr/bin/env node
/**
 * STAM ScreenSpec update preflight contract
 *
 * Usage:
 *   node scripts/test-screen-spec-update-preflight-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-firestore-adapter.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-service.js'), 'utf8');

assert.match(adapterSource, /runUpdatePreflight/);
assert.match(adapterSource, /SCREEN_SPEC_UPDATE_DOC_MISSING/);
assert.match(adapterSource, /SCREEN_SPEC_UPDATE_CURRENT_VERSION_INVALID/);
assert.match(adapterSource, /SCREEN_SPEC_UPDATE_VERSION_MISMATCH/);
assert.match(adapterSource, /SCREEN_SPEC_UPDATE_IMMUTABLE_FIELD/);
assert.match(adapterSource, /screenSpecUpdateStage/);
assert.match(adapterSource, /updatePreflightPassed/);
assert.match(adapterSource, /updateCommitted/);
assert.match(adapterSource, /conflictPossible/);
assert.match(adapterSource, /not an atomic transaction/);
assert.match(adapterSource, /Firestore Rules on document write/);
assert.match(serviceSource, /SCREEN_SPEC_UPDATE_VERSION_MISMATCH/);
assert.match(serviceSource, /expectedVersion/);

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
    id: 'scr-1',
    projectId: 'P1',
    code: 'SCR-001',
    title: 'Existing screen',
    screenType: 'form',
    writeStatus: 'writing',
    reviewStatus: 'none',
    approvalStatus: 'none',
    ownerId: 'owner-1',
    ownerName: 'Owner',
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
    updatedAt: '2026-07-02T00:00:00.000Z',
    ...overrides,
  };
}

function createFakeFirestore(options = {}) {
  const docs = new Map();
  const paths = [];
  const getCounts = new Map();
  let successfulUpdateCount = 0;
  const screenSpecId = options.screenSpecId || 'scr-1';
  const projectId = options.projectId || 'P1';
  const key = `projects/${projectId}/screenSpecs/${screenSpecId}`;
  const rejectGet = options.rejectGet;
  const rejectGetOnAttempt = options.rejectGetOnAttempt;
  const rejectUpdate = options.rejectUpdate;
  const enforceVersionRules = options.enforceVersionRules === true;
  const freezeVersionOnGet = options.freezeVersionOnGet;
  let frozenPreflightReads = 0;

  docs.set(key, currentDoc({ id: screenSpecId, projectId, ...(options.current || {}) }));

  function docRef(pathParts) {
    const docKey = pathParts.join('/');
    return {
      get() {
        paths.push(['get', docKey]);
        const attempt = (getCounts.get(docKey) || 0) + 1;
        getCounts.set(docKey, attempt);
        if (typeof rejectGetOnAttempt === 'function' && rejectGetOnAttempt(docKey, attempt)) {
          const err = new Error(options.rejectGetMessage || 'Missing or insufficient permissions.');
          return Promise.reject(err);
        }
        if (typeof rejectGet === 'function' && rejectGet(docKey)) {
          const err = new Error(options.rejectGetMessage || 'Missing or insufficient permissions.');
          return Promise.reject(err);
        }
        const stored = docs.get(docKey);
        if (!stored) {
          return Promise.resolve({
            id: pathParts[pathParts.length - 1],
            exists: false,
            data: () => ({}),
          });
        }
        let snapshot = stored;
        if (
          typeof freezeVersionOnGet === 'number'
          && docKey === key
          && frozenPreflightReads < freezeVersionOnGet
        ) {
          frozenPreflightReads += 1;
          snapshot = Object.assign({}, stored, { version: 1 });
        }
        return Promise.resolve({
          id: pathParts[pathParts.length - 1],
          exists: true,
          data: () => Object.assign({}, snapshot),
        });
      },
      update(payload) {
        paths.push(['update', docKey, payload]);
        if (typeof rejectUpdate === 'function' && rejectUpdate(docKey, payload, docs.get(docKey))) {
          const err = new Error(options.rejectUpdateMessage || 'Missing or insufficient permissions.');
          return Promise.reject(err);
        }
        const prev = docs.get(docKey) || {};
        if (enforceVersionRules) {
          const patchVersion = payload.version;
          if (!Number.isInteger(patchVersion) || patchVersion !== prev.version + 1) {
            const err = new Error(options.rejectUpdateMessage || 'Missing or insufficient permissions.');
            return Promise.reject(err);
          }
        }
        const next = Object.assign({}, prev, payload);
        Object.keys(payload || {}).forEach((field) => {
          if (payload[field] && payload[field].__fieldDelete) {
            delete next[field];
          }
        });
        docs.set(docKey, next);
        successfulUpdateCount += 1;
        return Promise.resolve();
      },
      set(payload, setOptions) {
        paths.push(['set', docKey, payload, setOptions || null]);
        docs.set(docKey, Object.assign({}, payload));
        return Promise.resolve();
      },
      collection(name) {
        return collectionRef([...pathParts, name]);
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
        return Promise.resolve({
          forEach(callback) {
            docs.forEach((value, docKey) => {
              if (docKey.startsWith(pathParts.join('/'))) {
                const id = docKey.split('/').pop();
                callback({
                  id,
                  exists: true,
                  data: () => value,
                });
              }
            });
          },
        });
      },
    };
  }

  return {
    paths,
    docs,
    key,
    updateCount() {
      return successfulUpdateCount;
    },
    collection(name) {
      return collectionRef([name]);
    },
    setDoc(pathKey, data) {
      docs.set(pathKey, data);
    },
    deleteDoc(pathKey) {
      docs.delete(pathKey);
    },
  };
}

const { context, window } = createContext();
vm.runInContext(adapterSource, context, { filename: 'stam.screen-spec-firestore-adapter.js' });
vm.runInContext(serviceSource, context, { filename: 'stam.screen-spec-service.js' });

const adapterApi = window.STAM.screenSpecFirestoreAdapter;
const contract = window.STAM.screenSpecServiceContract;
const CODES = adapterApi.PREFLIGHT_CODES;

assert.equal(CODES.UPDATE_VERSION_MISMATCH, 'SCREEN_SPEC_UPDATE_VERSION_MISMATCH');
assert.equal(contract.ERROR_CODES.UPDATE_VERSION_MISMATCH, 'SCREEN_SPEC_UPDATE_VERSION_MISMATCH');

const fakeFirestore = createFakeFirestore();
const adapter = adapterApi.create({ firestore: fakeFirestore });

await assert.rejects(
  () => adapterApi.runUpdatePreflight(fakeFirestore, 'P1', 'missing', validPatch()),
  (err) => err.code === CODES.UPDATE_DOC_MISSING,
);

await assert.rejects(
  () => adapterApi.runUpdatePreflight(fakeFirestore, 'P1', 'scr-1', validPatch({ version: 3 })),
  (err) => err.code === CODES.UPDATE_VERSION_MISMATCH && err.conflict === true,
);

fakeFirestore.setDoc('projects/P1/screenSpecs/scr-1', currentDoc({ version: 0 }));
await assert.rejects(
  () => adapterApi.runUpdatePreflight(fakeFirestore, 'P1', 'scr-1', validPatch({ version: 1 })),
  (err) => err.code === CODES.UPDATE_CURRENT_VERSION_INVALID,
);

fakeFirestore.setDoc('projects/P1/screenSpecs/scr-1', currentDoc());
await assert.rejects(
  () => adapterApi.runUpdatePreflight(fakeFirestore, 'P1', 'scr-1', validPatch({ code: 'SCR-999' })),
  (err) => err.code === CODES.UPDATE_IMMUTABLE_FIELD,
);

fakeFirestore.setDoc('projects/P1/screenSpecs/scr-1', currentDoc());
await adapterApi.runUpdatePreflight(fakeFirestore, 'P1', 'scr-1', validPatch());

const updated = await adapter.update('P1', 'scr-1', validPatch());
assert.equal(updated.title, 'Updated title');
assert.equal(updated.version, 2);
assert.equal(fakeFirestore.paths.some((entry) => entry[0] === 'update'), true);

await assert.rejects(
  () => adapter.update('P1', 'scr-1', validPatch({ version: 2 })),
  (err) => err.code === CODES.UPDATE_VERSION_MISMATCH,
);

const rulesRejectFs = createFakeFirestore({
  rejectUpdate(key) {
    return key === 'projects/P1/screenSpecs/scr-1';
  },
});
rulesRejectFs.setDoc('projects/P1/screenSpecs/scr-1', currentDoc({ version: 1 }));
await assert.rejects(
  () => adapterApi.create({ firestore: rulesRejectFs }).update('P1', 'scr-1', validPatch()),
  (err) => err.updatePreflightPassed === true
    && err.screenSpecUpdateStage === 'document-write'
    && err.conflictPossible === true
    && err.updateCommitted !== true
    && err.code !== CODES.UPDATE_VERSION_MISMATCH
    && err.conflict !== true
    && /Missing or insufficient permissions/i.test(err.message),
);
assert.equal(rulesRejectFs.updateCount(), 0);

const preflightPermFs = createFakeFirestore({
  rejectGet(key) {
    return key === 'projects/P1/screenSpecs/scr-1';
  },
});
preflightPermFs.setDoc('projects/P1/screenSpecs/scr-1', currentDoc());
await assert.rejects(
  () => adapterApi.create({ firestore: preflightPermFs }).update('P1', 'scr-1', validPatch()),
  (err) => err.screenSpecUpdateStage === 'preflight-read'
    && err.updatePreflightPassed !== true
    && err.conflictPossible !== true
    && /Missing or insufficient permissions/i.test(err.message),
);
assert.equal(preflightPermFs.updateCount(), 0);

const postReadFs = createFakeFirestore({
  rejectGetOnAttempt(key, attempt) {
    return key === 'projects/P1/screenSpecs/scr-1' && attempt >= 2;
  },
});
postReadFs.setDoc('projects/P1/screenSpecs/scr-1', currentDoc());
await assert.rejects(
  () => adapterApi.create({ firestore: postReadFs }).update('P1', 'scr-1', validPatch()),
  (err) => err.screenSpecUpdateStage === 'post-update-read'
    && err.updatePreflightPassed === true
    && err.updateCommitted === true
    && err.conflictPossible !== true
    && /Missing or insufficient permissions/i.test(err.message),
);
assert.equal(postReadFs.updateCount(), 1);

// Post-preflight race: two writers read the same version, first commits, second
// must not succeed. Fake enforces data.version == prev.version + 1 on write —
// a partial stand-in for Firestore Rules; it does not emulate full rule evaluation.
const raceFs = createFakeFirestore({
  enforceVersionRules: true,
  freezeVersionOnGet: 4,
});
raceFs.setDoc('projects/P1/screenSpecs/scr-1', currentDoc({ version: 1, title: 'Original' }));
const raceAdapter = adapterApi.create({ firestore: raceFs });
const racePatchA = validPatch({ title: 'Writer A', version: 2 });
const racePatchB = validPatch({ title: 'Writer B', version: 2 });
const [raceA, raceB] = await Promise.allSettled([
  raceAdapter.update('P1', 'scr-1', racePatchA),
  raceAdapter.update('P1', 'scr-1', racePatchB),
]);
const raceFulfilled = [raceA, raceB].filter((result) => result.status === 'fulfilled');
const raceRejected = [raceA, raceB].filter((result) => result.status === 'rejected');
assert.equal(raceFulfilled.length, 1, 'exactly one concurrent update must succeed');
assert.equal(raceRejected.length, 1, 'exactly one concurrent update must fail');
const raceFail = raceRejected[0].reason;
assert.equal(raceFail.updatePreflightPassed, true);
assert.equal(raceFail.screenSpecUpdateStage, 'document-write');
assert.equal(raceFail.conflictPossible, true);
assert.notEqual(raceFail.code, CODES.UPDATE_VERSION_MISMATCH);
assert.equal(raceFail.conflict, undefined);
assert.equal(raceFs.docs.get(raceFs.key).version, 2);
assert.equal(raceFs.updateCount(), 1);
assert.equal(['Writer A', 'Writer B'].includes(raceFs.docs.get(raceFs.key).title), true);

// Sequential stale write after first writer commits: preflight catches it.
const staleFs = createFakeFirestore({ enforceVersionRules: true });
staleFs.setDoc('projects/P1/screenSpecs/scr-1', currentDoc({ version: 1 }));
const staleAdapter = adapterApi.create({ firestore: staleFs });
await staleAdapter.update('P1', 'scr-1', validPatch({ title: 'First', version: 2 }));
await assert.rejects(
  () => staleAdapter.update('P1', 'scr-1', validPatch({ title: 'Second', version: 2 })),
  (err) => err.code === CODES.UPDATE_VERSION_MISMATCH
    && err.conflict === true
    && err.preflight === true
    && err.conflictPossible !== true,
);
assert.equal(staleFs.docs.get(staleFs.key).title, 'First');
assert.equal(staleFs.updateCount(), 1);

console.log('screen spec update preflight contract: PASS');
