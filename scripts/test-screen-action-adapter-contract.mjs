#!/usr/bin/env node
/**
 * STAM PR C — screenAction Firestore Adapter contract
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-firestore-adapter.js'), 'utf8');

assert.doesNotMatch(adapterSource, /transaction\.get\(query\)/i);
assert.match(adapterSource, /validateTargetSnapshot/);
assert.match(adapterSource, /Transaction\.get\(\) accepts DocumentReference only/i);

function isDocumentReference(ref) {
  return ref && ref.__kind === 'doc';
}
function isQuery(ref) {
  return ref && ref.__kind === 'query';
}

function createCompatFirestoreMock(initial) {
  const store = structuredClone(initial || {});
  const txGets = [];

  function getSnapshot(path) {
    const data = store[path];
    return { exists: data != null, id: path.split('/').pop(), data: () => (data ? Object.assign({}, data) : undefined) };
  }

  const db = {
    txGets,
    collection(name) {
      if (name !== 'projects') throw new Error('unexpected root');
      return {
        doc(projectId) {
          return {
            collection(sub) {
              if (sub === 'screenSpecs') {
                return {
                  doc(screenSpecId) {
                    const path = `projects/${projectId}/screenSpecs/${screenSpecId}`;
                    return { __kind: 'doc', path, get: () => Promise.resolve(getSnapshot(path)) };
                  },
                };
              }
              if (sub === 'screenActions') {
                return {
                  doc(actionId) {
                    const autoId = actionId || `act-auto-${Object.keys(store).length + 1}`;
                    const path = `projects/${projectId}/screenActions/${autoId}`;
                    return {
                      __kind: 'doc', id: autoId, path,
                      get: () => Promise.resolve(getSnapshot(path)),
                      set(data) { store[path] = Object.assign({}, data, { id: autoId }); return Promise.resolve(); },
                      update(data) { store[path] = Object.assign({}, store[path] || {}, data); return Promise.resolve(); },
                      delete() { delete store[path]; return Promise.resolve(); },
                    };
                  },
                  where(field, op, value) {
                    return {
                      __kind: 'query',
                      get() {
                        const docs = [];
                        Object.keys(store).forEach((p) => {
                          if (!p.startsWith(`projects/${projectId}/screenActions/`)) return;
                          const data = store[p];
                          if (data && data.screenSpecId === value) docs.push({ id: p.split('/').pop(), data: () => Object.assign({}, data) });
                        });
                        return Promise.resolve({ forEach(fn) { docs.forEach(fn); } });
                      },
                    };
                  },
                };
              }
              throw new Error('unexpected sub ' + sub);
            },
          };
        },
      };
    },
    runTransaction(fn) {
      const transaction = {
        get(ref) {
          txGets.push(ref);
          if (isQuery(ref)) return Promise.reject(new Error('Transaction.get() does not accept Query reads in compat SDK'));
          if (!isDocumentReference(ref)) return Promise.reject(new Error('Transaction.get() requires DocumentReference'));
          return Promise.resolve(getSnapshot(ref.path));
        },
        set(ref, data) { store[ref.path] = Object.assign({}, data); },
        update(ref, data) { store[ref.path] = Object.assign({}, store[ref.path] || {}, data); },
      };
      return fn(transaction);
    },
    _store: store,
  };
  return db;
}

function loadAdapter(firestoreImpl) {
  const window = {};
  window.firebase = {
    firestore() { return firestoreImpl; },
    firestore: Object.assign(() => firestoreImpl, {
      FieldValue: { serverTimestamp() { return { __serverTimestamp: true }; } },
    }),
  };
  window.firebase.firestore.FieldValue = { serverTimestamp() { return { __serverTimestamp: true }; } };
  const context = vm.createContext({ window, console, Date, Promise, Number, String, JSON, Array, Object, Error, Math });
  window.window = window;
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-action-firestore-adapter.js' });
  return {
    contract: window.STAM.screenActionFirestoreAdapter,
    adapter: window.STAM.screenActionFirestoreAdapter.create({ firestore: firestoreImpl }),
  };
}

const seedStore = {
  'projects/P1/screenSpecs/scr-1': { id: 'scr-1', projectId: 'P1', isDeleted: false },
  'projects/P1/screenSpecs/scr-target': { id: 'scr-target', projectId: 'P1', isDeleted: false },
  'projects/P1/screenSpecs/scr-bad-target': { id: 'scr-bad-target', isDeleted: false },
  'projects/P1/screenSpecs/scr-deleted': { id: 'scr-deleted', projectId: 'P1', isDeleted: true },
  'projects/P1/screenActions/act-existing': {
    id: 'act-existing', projectId: 'P1', screenSpecId: 'scr-1', name: 'goBack', label: 'Back',
    actionType: 'cancel', controlType: 'button', placement: 'toolbar', variant: 'secondary',
    targetScreenSpecId: null, disabled: false, confirmRequired: false, confirmTitle: null,
    confirmMessage: null, successMessage: null, schemaVersion: 1, order: 0, createdBy: 'u1', updatedBy: 'u1',
  },
};

const db = createCompatFirestoreMock(seedStore);
const { contract, adapter } = loadAdapter(db);

const payload = {
  screenSpecId: 'scr-1', name: 'openList', label: '목록', actionType: 'navigate', targetScreenSpecId: 'scr-target',
  controlType: 'button', placement: 'toolbar', variant: 'primary', disabled: false, confirmRequired: false,
  confirmTitle: null, confirmMessage: null, successMessage: null, order: 0, schemaVersion: 1, createdBy: 'u1', updatedBy: 'u1',
};

const created = await adapter.create('P1', payload);
assert.ok(created.id);
assert.equal(db.txGets.every(isDocumentReference), true);
assert.equal(db.txGets.some(isQuery), false);

await assert.rejects(
  () => adapter.create('P1', Object.assign({}, payload, { name: 'OpenList' })),
  (err) => err.code === contract.PREFLIGHT_CODES.DUPLICATE_NAME,
);

await assert.rejects(
  () => adapter.create('P1', Object.assign({}, payload, { name: 'badTarget', targetScreenSpecId: 'scr-bad-target' })),
  (err) => err.code === contract.PREFLIGHT_CODES.TARGET_PROJECT_MISMATCH,
);

await assert.rejects(
  () => adapter.create('P1', Object.assign({}, payload, { name: 'deletedTarget', targetScreenSpecId: 'scr-deleted' })),
  (err) => err.code === contract.PREFLIGHT_CODES.TARGET_NOT_FOUND,
);

const renameOk = await adapter.update('P1', 'act-existing', { name: 'goHome', updatedBy: 'u1' });
assert.equal(renameOk.name, 'goHome');

await assert.rejects(
  () => adapter.update('P1', 'act-existing', { name: 'openList', updatedBy: 'u1' }),
  (err) => err.code === contract.PREFLIGHT_CODES.DUPLICATE_NAME,
);

await adapter.update('P1', 'act-existing', { actionType: 'navigate', targetScreenSpecId: 'scr-target', updatedBy: 'u1' });
await adapter.delete('P1', 'act-existing');
assert.equal(await adapter.getById('P1', 'act-existing'), null);

console.log('screen action adapter contract: PASS');
