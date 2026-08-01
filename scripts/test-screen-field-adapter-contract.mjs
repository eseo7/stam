#!/usr/bin/env node
/**
 * STAM PR B — screenField Firestore Adapter contract
 *
 * Verifies query preflight (outside transaction) and compat Transaction.get(DocumentReference) only.
 * Firebase Web compat Transaction.get() does not accept Query reads.
 *
 * Usage:
 *   node scripts/test-screen-field-adapter-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-firestore-adapter.js'), 'utf8');

assert.doesNotMatch(adapterSource, /transaction\.get\(query\)/i);
assert.doesNotMatch(adapterSource, /transaction\.get\(\s*collectionRef\([^\)]*\)\.where/i);
assert.match(adapterSource, /runCreatePreflight/);
assert.match(adapterSource, /runUpdatePreflight/);
assert.match(adapterSource, /Transaction\.get\(\) accepts DocumentReference only/i);
assert.match(adapterSource, /validateParentSnapshot/);
assert.match(adapterSource, /clean\(parent\.projectId\) !== requireProjectId\(projectId\)/);

function isDocumentReference(ref) {
  return ref && ref.__kind === 'doc';
}

function isQuery(ref) {
  return ref && ref.__kind === 'query';
}

function createCompatFirestoreMock(initial) {
  const store = structuredClone(initial || {});
  const txGets = [];

  function docPath(ref) {
    return ref.path;
  }

  function getSnapshot(path) {
    const data = store[path];
    return {
      exists: data != null,
      id: path.split('/').pop(),
      data: () => (data ? Object.assign({}, data) : undefined),
    };
  }

  function querySnapshot(screenSpecId) {
    const docs = [];
    Object.keys(store).forEach(function (path) {
      if (!path.includes('/screenFields/')) return;
      const data = store[path];
      if (data && data.screenSpecId === screenSpecId) {
        docs.push({
          id: path.split('/').pop(),
          data: () => Object.assign({}, data),
        });
      }
    });
    return {
      forEach(fn) {
        docs.forEach(fn);
      },
    };
  }

  const db = {
    txGets: txGets,
    collection(name) {
      return {
        doc(id) {
          const base = name;
          return {
            __kind: 'doc',
            path: id ? `${base}/${id}` : `${base}/auto`,
            collection(sub) {
              const prefix = id ? `${base}/${id}/${sub}` : `${base}/auto/${sub}`;
              return {
                doc(fieldId) {
                  const path = fieldId ? `${prefix}/${fieldId}` : `${prefix}/auto-field`;
                  return {
                    __kind: 'doc',
                    path,
                    get() {
                      return Promise.resolve(getSnapshot(path));
                    },
                    set(data) {
                      store[path] = Object.assign({}, data, { id: fieldId || 'auto-field' });
                      return Promise.resolve();
                    },
                    update(data) {
                      store[path] = Object.assign({}, store[path] || {}, data);
                      return Promise.resolve();
                    },
                    delete() {
                      delete store[path];
                      return Promise.resolve();
                    },
                  };
                },
                where(field, op, value) {
                  return {
                    __kind: 'query',
                    screenSpecId: value,
                    get() {
                      return Promise.resolve(querySnapshot(value));
                    },
                  };
                },
                doc() {
                  return this.doc('auto-field');
                },
              };
            },
          };
        },
      };
    },
    runTransaction(fn) {
      const transaction = {
        get(ref) {
          txGets.push(ref);
          if (isQuery(ref)) {
            return Promise.reject(new Error('Transaction.get() does not accept Query reads in compat SDK'));
          }
          if (!isDocumentReference(ref)) {
            return Promise.reject(new Error('Transaction.get() requires DocumentReference'));
          }
          return Promise.resolve(getSnapshot(ref.path));
        },
        set(ref, data) {
          store[ref.path] = Object.assign({}, data);
        },
        update(ref, data) {
          store[ref.path] = Object.assign({}, store[ref.path] || {}, data);
        },
      };
      return fn(transaction);
    },
    _store: store,
  };

  // Normalize nested paths for projects/P1/screenSpecs/scr-1 style
  const wrapped = {
    collection(name) {
      if (name !== 'projects') throw new Error('unexpected root collection');
      return {
        doc(projectId) {
          return {
            collection(sub) {
              if (sub === 'screenSpecs') {
                return {
                  doc(screenSpecId) {
                    const path = `projects/${projectId}/screenSpecs/${screenSpecId}`;
                    return {
                      __kind: 'doc',
                      path,
                      get() {
                        return Promise.resolve(getSnapshot(path));
                      },
                    };
                  },
                };
              }
              if (sub === 'screenFields') {
                return {
                  doc(fieldId) {
                    const autoId = fieldId || `fld-auto-${Object.keys(store).length + 1}`;
                    const path = `projects/${projectId}/screenFields/${autoId}`;
                    return {
                      __kind: 'doc',
                      id: autoId,
                      path,
                      get() {
                        return Promise.resolve(getSnapshot(path));
                      },
                      set(data) {
                        store[path] = Object.assign({}, data, { id: autoId });
                        return Promise.resolve();
                      },
                      update(data) {
                        store[path] = Object.assign({}, store[path] || {}, data);
                        return Promise.resolve();
                      },
                      delete() {
                        delete store[path];
                        return Promise.resolve();
                      },
                    };
                  },
                  where(field, op, value) {
                    return {
                      __kind: 'query',
                      get() {
                        const docs = [];
                        Object.keys(store).forEach(function (p) {
                          if (!p.startsWith(`projects/${projectId}/screenFields/`)) return;
                          const data = store[p];
                          if (data && data.screenSpecId === value) {
                            docs.push({ id: p.split('/').pop(), data: () => Object.assign({}, data) });
                          }
                        });
                        return Promise.resolve({ forEach(fn) { docs.forEach(fn); } });
                      },
                    };
                  },
                };
              }
              throw new Error('unexpected subcollection ' + sub);
            },
          };
        },
      };
    },
    runTransaction: db.runTransaction,
    txGets: txGets,
    _store: store,
  };

  return wrapped;
}

function loadAdapter(firestoreImpl) {
  const window = {};
  window.firebase = {
    firestore() {
      return firestoreImpl;
    },
  };
  window.firebase.firestore.FieldValue = {
    serverTimestamp() {
      return { __serverTimestamp: true };
    },
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
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-field-firestore-adapter.js' });
  return {
    contract: window.STAM.screenFieldFirestoreAdapter,
    adapter: window.STAM.screenFieldFirestoreAdapter.create({ firestore: firestoreImpl }),
  };
}

const seedStore = {
  'projects/P1/screenSpecs/scr-1': {
    id: 'scr-1',
    projectId: 'P1',
    isDeleted: false,
  },
  'projects/P1/screenSpecs/scr-bad-parent': {
    id: 'scr-bad-parent',
    isDeleted: false,
  },
  'projects/P1/screenFields/fld-existing': {
    id: 'fld-existing',
    projectId: 'P1',
    screenSpecId: 'scr-1',
    name: 'titleText',
    order: 0,
    label: 'Title',
    type: 'text',
    required: false,
    readonly: false,
    disabled: false,
    defaultValue: null,
    options: [],
    validationRules: [],
    schemaVersion: 1,
    createdBy: 'u1',
    updatedBy: 'u1',
  },
};

const db = createCompatFirestoreMock(seedStore);
const { contract, adapter } = loadAdapter(db);

const payload = {
  screenSpecId: 'scr-1',
  name: 'noteBody',
  label: 'Body',
  type: 'text',
  order: 0,
  required: false,
  readonly: false,
  disabled: false,
  defaultValue: null,
  options: [],
  validationRules: [],
  schemaVersion: 1,
  createdBy: 'u1',
  updatedBy: 'u1',
};

const created = await adapter.create('P1', payload);
assert.ok(created.id);
assert.equal(created.name, 'noteBody');
assert.equal(db.txGets.every(isDocumentReference), true, 'transaction.get must receive DocumentReference only');
assert.equal(db.txGets.some(isQuery), false, 'transaction.get must never receive Query');

await assert.rejects(
  () => adapter.create('P1', Object.assign({}, payload, { name: 'TitleText' })),
  (err) => err.code === contract.PREFLIGHT_CODES.DUPLICATE_NAME,
);

await assert.rejects(
  () => contract.assertScreenSpecParentExists(db, 'P1', 'scr-bad-parent'),
  (err) => err.code === contract.PREFLIGHT_CODES.PARENT_PROJECT_MISMATCH,
);

const renameOk = await adapter.update('P1', 'fld-existing', { name: 'headingText', updatedBy: 'u1' });
assert.equal(renameOk.name, 'headingText');

await assert.rejects(
  () => adapter.update('P1', 'fld-existing', { name: 'noteBody', updatedBy: 'u1' }),
  (err) => err.code === contract.PREFLIGHT_CODES.DUPLICATE_NAME,
);

await adapter.update('P1', 'fld-existing', { label: 'Updated', updatedBy: 'u1' });
await adapter.delete('P1', 'fld-existing');
const gone = await adapter.getById('P1', 'fld-existing');
assert.equal(gone, null);

console.log('screen field adapter contract: PASS');
