#!/usr/bin/env node
/**
 * STAM PR D1 — screenSection Firestore Adapter contract
 *
 * Usage:
 *   node scripts/test-screen-section-adapter-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const conditionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-condition-contract.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-section-firestore-adapter.js'), 'utf8');

assert.doesNotMatch(adapterSource, /transaction\.get\(query\)/i);
assert.match(adapterSource, /validateParentSnapshot/);
assert.match(adapterSource, /COLLECTION = 'screenSections'/);
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
    return {
      exists: data != null,
      id: path.split('/').pop(),
      data: () => (data ? Object.assign({}, data) : undefined),
    };
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
              if (sub === 'screenSections') {
                return {
                  doc(sectionId) {
                    const autoId = sectionId || `sec-auto-${Object.keys(store).length + 1}`;
                    const path = `projects/${projectId}/screenSections/${autoId}`;
                    return {
                      __kind: 'doc',
                      id: autoId,
                      path,
                      get: () => Promise.resolve(getSnapshot(path)),
                      set(data) {
                        const next = Object.assign({}, data);
                        Object.keys(next).forEach((key) => {
                          if (next[key] === undefined) delete next[key];
                        });
                        store[path] = Object.assign({}, next, { id: autoId });
                        return Promise.resolve();
                      },
                      update(data) {
                        const next = Object.assign({}, store[path] || {});
                        Object.keys(data).forEach((key) => {
                          if (data[key] !== undefined) next[key] = data[key];
                        });
                        store[path] = next;
                        return Promise.resolve();
                      },
                      delete() { delete store[path]; return Promise.resolve(); },
                    };
                  },
                  where(field, op, value) {
                    return {
                      __kind: 'query',
                      get() {
                        const docs = [];
                        Object.keys(store).forEach((p) => {
                          if (!p.startsWith(`projects/${projectId}/screenSections/`)) return;
                          const data = store[p];
                          if (data && data.screenSpecId === value) {
                            docs.push({
                              exists: true,
                              id: p.split('/').pop(),
                              data: () => Object.assign({}, data),
                            });
                          }
                        });
                        return Promise.resolve({ size: docs.length, forEach(fn) { docs.forEach(fn); } });
                      },
                    };
                  },
                };
              }
              if (sub === 'screenFields') {
                return {
                  where() {
                    return {
                      __kind: 'query',
                      get: () => Promise.resolve({ size: 0, forEach() {} }),
                    };
                  },
                };
              }
              if (sub === 'screenActions') {
                return {
                  where() {
                    return {
                      __kind: 'query',
                      get: () => Promise.resolve({ size: 0, forEach() {} }),
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
        set(ref, data) {
          const next = Object.assign({}, data);
          Object.keys(next).forEach((key) => {
            if (next[key] === undefined) delete next[key];
          });
          store[ref.path] = next;
        },
        update(ref, data) {
          const next = Object.assign({}, store[ref.path] || {});
          Object.keys(data).forEach((key) => {
            if (data[key] !== undefined) next[key] = data[key];
          });
          store[ref.path] = next;
        },
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
  vm.runInContext(conditionSource, context, { filename: 'stam.screen-condition-contract.js' });
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-section-firestore-adapter.js' });
  return {
    contract: window.STAM.screenSectionFirestoreAdapter,
    adapter: window.STAM.screenSectionFirestoreAdapter.create({ firestore: firestoreImpl }),
  };
}

const seedStore = {
  'projects/P1/screenSpecs/scr-1': { id: 'scr-1', projectId: 'P1', isDeleted: false },
  'projects/P1/screenSpecs/scr-bad-parent': { id: 'scr-bad-parent', isDeleted: false },
  'projects/P1/screenSpecs/scr-deleted': { id: 'scr-deleted', projectId: 'P1', isDeleted: true },
  'projects/P1/screenSections/sec-existing': {
    id: 'sec-existing',
    projectId: 'P1',
    screenSpecId: 'scr-1',
    name: 'mainForm',
    label: '메인 폼',
    sectionType: 'form',
    parentSectionId: null,
    order: 0,
    layout: { columns: 1, gap: 'md', collapsible: false, defaultCollapsed: false },
    visibilityCondition: null,
    description: null,
    schemaVersion: 1,
    createdBy: 'u1',
    updatedBy: 'u1',
  },
  'projects/P1/screenSections/sec-sort-b': {
    id: 'sec-sort-b',
    projectId: 'P1',
    screenSpecId: 'scr-1',
    name: 'secondSection',
    label: '두번째',
    sectionType: 'form',
    parentSectionId: null,
    order: 1,
    layout: { columns: 1, gap: 'md', collapsible: false, defaultCollapsed: false },
    visibilityCondition: null,
    description: null,
    schemaVersion: 1,
    createdAt: '2026-01-02T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
  },
  'projects/P1/screenSections/sec-sort-a': {
    id: 'sec-sort-a',
    projectId: 'P1',
    screenSpecId: 'scr-1',
    name: 'thirdSection',
    label: '세번째',
    sectionType: 'form',
    parentSectionId: null,
    order: 1,
    layout: { columns: 1, gap: 'md', collapsible: false, defaultCollapsed: false },
    visibilityCondition: null,
    description: null,
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
  },
};

let testCount = 0;
function test(name, fn) {
  testCount += 1;
  return fn();
}

const db = createCompatFirestoreMock(seedStore);
const { contract, adapter } = loadAdapter(db);

const payload = {
  screenSpecId: 'scr-1',
  name: 'searchPanel',
  label: '검색',
  sectionType: 'search',
  parentSectionId: null,
  order: 2,
  layout: { columns: 2, gap: 'sm', collapsible: true, defaultCollapsed: false },
  visibilityCondition: null,
  description: null,
  schemaVersion: 1,
  createdBy: 'u1',
  updatedBy: 'u1',
};

await test('path collection is screenSections', () => {
  assert.equal(contract.COLLECTION, 'screenSections');
});

const created = await test('create CRUD', async () => {
  const item = await adapter.create('P1', payload);
  assert.ok(item.id);
  assert.match(db._store[`projects/P1/screenSections/${item.id}`] ? 'ok' : '', /ok/);
  return item;
});

await test('create id match', () => {
  assert.equal(created.id, Object.keys(db._store).find((p) => p.endsWith(`/${created.id}`)).split('/').pop());
});

await test('transaction uses DocumentReference only', () => {
  assert.equal(db.txGets.every(isDocumentReference), true);
  assert.equal(db.txGets.some(isQuery), false);
});

await test('duplicate name preflight', async () => {
  await assert.rejects(
    () => adapter.create('P1', Object.assign({}, payload, { name: 'SearchPanel' })),
    (err) => err.code === contract.PREFLIGHT_CODES.DUPLICATE_NAME,
  );
});

await test('missing screenSpec parent reject', async () => {
  await assert.rejects(
    () => contract.assertScreenSpecParentExists(db, 'P1', 'scr-deleted'),
    (err) => err.code === contract.PREFLIGHT_CODES.PARENT_NOT_FOUND,
  );
});

await test('screenSpec project mismatch reject', async () => {
  await assert.rejects(
    () => contract.assertScreenSpecParentExists(db, 'P1', 'scr-bad-parent'),
    (err) => err.code === contract.PREFLIGHT_CODES.PARENT_PROJECT_MISMATCH,
  );
});

await test('update rename ok', async () => {
  const renameOk = await adapter.update('P1', 'sec-existing', { name: 'primaryForm', updatedBy: 'u1' });
  assert.equal(renameOk.name, 'primaryForm');
});

await test('update duplicate name reject', async () => {
  await assert.rejects(
    () => adapter.update('P1', 'sec-existing', { name: 'searchPanel', updatedBy: 'u1' }),
    (err) => err.code === contract.PREFLIGHT_CODES.DUPLICATE_NAME,
  );
});

await test('update immutable field reject', async () => {
  await assert.rejects(
    () => adapter.update('P1', 'sec-existing', { screenSpecId: 'scr-other', updatedBy: 'u1' }),
    (err) => err.code === contract.PREFLIGHT_CODES.UPDATE_IMMUTABLE_FIELD,
  );
});

await test('undefined not stored on update', async () => {
  await adapter.update('P1', 'sec-existing', { label: '업데이트', description: undefined, updatedBy: 'u1' });
  const stored = db._store['projects/P1/screenSections/sec-existing'];
  assert.equal(stored.label, '업데이트');
  assert.equal(stored.description, null);
  assert.equal('undefinedKey' in stored, false);
});

await test('null preserved on update', async () => {
  await adapter.update('P1', 'sec-existing', { description: null, updatedBy: 'u1' });
  const stored = db._store['projects/P1/screenSections/sec-existing'];
  assert.equal(stored.description, null);
});

await test('stable sort by order then createdAt then id', async () => {
  const list = await adapter.listByScreenSpec('P1', 'scr-1');
  const ids = list.map((item) => item.id);
  const sortTail = ids.filter((id) => id === 'sec-sort-a' || id === 'sec-sort-b');
  assert.equal(sortTail.length, 2);
  assert.equal(sortTail[0], 'sec-sort-a');
  assert.equal(sortTail[1], 'sec-sort-b');
  const cmp = contract.compareScreenSections(
    { id: 'sec-sort-b', order: 1, createdAt: '2026-01-02T00:00:00.000Z' },
    { id: 'sec-sort-a', order: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  );
  assert.ok(cmp > 0);
});

await test('read update delete lifecycle', async () => {
  const readBack = await adapter.getById('P1', created.id);
  assert.equal(readBack.name, 'searchPanel');
  await adapter.update('P1', created.id, { label: '검색 패널', updatedBy: 'u1' });
  await adapter.delete('P1', created.id);
  assert.equal(await adapter.getById('P1', created.id), null);
});

console.log(`screen section adapter contract (${testCount} cases): PASS`);
