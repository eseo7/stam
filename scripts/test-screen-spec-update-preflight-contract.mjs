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
  const screenSpecId = options.screenSpecId || 'scr-1';
  const projectId = options.projectId || 'P1';
  const key = `projects/${projectId}/screenSpecs/${screenSpecId}`;
  docs.set(key, currentDoc({ id: screenSpecId, projectId, ...(options.current || {}) }));

  function docRef(pathParts) {
    const docKey = pathParts.join('/');
    return {
      get() {
        paths.push(['get', docKey]);
        const stored = docs.get(docKey);
        return Promise.resolve({
          id: pathParts[pathParts.length - 1],
          exists: !!stored,
          data: () => stored || {},
        });
      },
      update(payload) {
        paths.push(['update', docKey, payload]);
        const prev = docs.get(docKey) || {};
        const next = Object.assign({}, prev, payload);
        Object.keys(payload || {}).forEach((field) => {
          if (payload[field] && payload[field].__fieldDelete) {
            delete next[field];
          }
        });
        docs.set(docKey, next);
        return Promise.resolve();
      },
      set(payload, options) {
        paths.push(['set', docKey, payload, options || null]);
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

console.log('screen spec update preflight contract: PASS');
