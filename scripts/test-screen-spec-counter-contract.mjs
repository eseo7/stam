#!/usr/bin/env node
/**
 * STAM ScreenSpec-2 — screenSpecs SCR-### counter contract
 *
 * Usage:
 *   node scripts/test-screen-spec-counter-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-firestore-adapter.js'), 'utf8');

assert.match(rulesSource, /function isValidScreenSpecsCounterWrite\(\)/);
assert.match(rulesSource, /counterId == 'screenSpecs'/);
assert.match(rulesSource, /isScreenSpecWriter\(projectId\)/);
assert.match(adapterSource, /COUNTER_DOC_ID = 'screenSpecs'/);
assert.match(adapterSource, /CODE_PREFIX = 'SCR-'/);
assert.match(adapterSource, /createWithAllocatedCode/);
assert.match(adapterSource, /transaction\.set\(cref/);
assert.match(adapterSource, /transaction\.set\(ref, payload\)/);

const countersBlock = rulesSource.match(
  /match \/counters\/\{counterId\} \{[\s\S]*?\n      \}/,
);
assert.ok(countersBlock, 'counters match block must exist');
assert.match(countersBlock[0], /counterId == 'screenSpecs'/);
assert.match(countersBlock[0], /isValidScreenSpecsCounterWrite\(\)/);
assert.match(countersBlock[0], /allow delete: if false;/);

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

function validScreenSpecPayload(overrides = {}) {
  return {
    title: '로그인 화면',
    screenType: 'form',
    writeStatus: 'writing',
    reviewStatus: 'none',
    approvalStatus: 'none',
    ownerId: 'owner-uid',
    ownerName: 'Owner',
    imageCount: 0,
    annotationCount: 0,
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
    version: 1,
    projectId: 'P1',
    ...overrides,
  };
}

function createFakeFirestore(options) {
  const opts = options || {};
  const paths = [];
  const store = new Map();
  let transactionCount = 0;
  let autoId = 0;

  const docs = [
    {
      id: 'scr-a',
      exists: true,
      data: () => ({
        title: 'A',
        projectId: 'P1',
        code: 'SCR-002',
        screenType: 'form',
        writeStatus: 'writing',
        reviewStatus: 'none',
        approvalStatus: 'none',
        ownerId: 'o1',
        ownerName: 'O1',
        imageCount: 0,
        annotationCount: 0,
        isDeleted: false,
        createdAt: { toDate() { return new Date('2026-07-02T00:00:00.000Z'); } },
      }),
    },
    {
      id: 'scr-b',
      exists: true,
      data: () => ({
        title: 'B',
        projectId: 'P1',
        code: 'SCR-001',
        screenType: 'list',
        writeStatus: 'complete',
        reviewStatus: 'done',
        approvalStatus: 'approved',
        ownerId: 'o1',
        ownerName: 'O1',
        imageCount: 0,
        annotationCount: 0,
        isDeleted: true,
        createdAt: { toDate() { return new Date('2026-07-01T00:00:00.000Z'); } },
      }),
    },
  ];

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
        if (pathParts[pathParts.length - 2] === 'screenSpecs') {
          const found = docs.find((doc) => doc.id === pathParts[pathParts.length - 1]);
          if (found) return Promise.resolve(found);
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
      update(patch) {
        paths.push(['update', key, patch]);
        const prev = store.get(key) || {};
        const next = Object.assign({}, prev);
        Object.keys(patch || {}).forEach((field) => {
          if (patch[field] && patch[field].__fieldDelete) {
            delete next[field];
          } else {
            next[field] = patch[field];
          }
        });
        store.set(key, next);
        return Promise.resolve();
      },
    };
  }

  function collectionRef(pathParts) {
    return {
      doc(id) {
        const docId = id || `auto-${autoId += 1}`;
        return docRef([...pathParts, docId]);
      },
      get() {
        paths.push(['getCollection', pathParts.join('/')]);
        return Promise.resolve({
          forEach(callback) {
            docs.forEach(callback);
          },
        });
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
      let txSetCount = 0;
      const tx = {
        get(ref) {
          return ref.get();
        },
        set(ref, data, setOptions) {
          txSetCount += 1;
          if (opts.failOnSecondTxSet && txSetCount === 2) {
            throw new Error('simulated screen spec create failure');
          }
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
    seedCounter(projectId, lastNumber) {
      store.set(`projects/${projectId}/counters/screenSpecs`, { lastNumber });
    },
  };
}

const { context, window } = createContext();
vm.runInContext(adapterSource, context, { filename: 'stam.screen-spec-firestore-adapter.js' });

const adapterApi = window.STAM.screenSpecFirestoreAdapter;
assert.equal(adapterApi.COLLECTION, 'screenSpecs');
assert.equal(adapterApi.COUNTER_DOC_ID, 'screenSpecs');
assert.equal(adapterApi.CODE_PREFIX, 'SCR-');
assert.equal(adapterApi.formatScreenSpecCodeNumber(1), 'SCR-001');
assert.equal(adapterApi.formatScreenSpecCodeNumber(2), 'SCR-002');
assert.equal(adapterApi.formatScreenSpecCodeNumber(42), 'SCR-042');
assert.equal(adapterApi.formatScreenSpecCodeNumber(1000), 'SCR-1000');
assert.throws(() => adapterApi.formatScreenSpecCodeNumber(1.5));
assert.throws(() => adapterApi.formatScreenSpecCodeNumber('2'));
assert.throws(() => adapterApi.formatScreenSpecCodeNumber(0));
assert.throws(() => adapterApi.formatScreenSpecCodeNumber(-1));

const fakeFirestore = createFakeFirestore();
const adapter = adapterApi.create({ firestore: fakeFirestore });

const first = await adapter.create('P1', validScreenSpecPayload({ id: 'scr-1' }));
assert.equal(first.code, 'SCR-001');
assert.equal(first.id, 'scr-1');
assert.equal(first.projectId, 'P1');

const second = await adapter.create('P1', validScreenSpecPayload({ id: 'scr-2', title: 'Second' }));
assert.equal(second.code, 'SCR-002');

const counterPath = 'projects/P1/counters/screenSpecs';
const counterWrites = fakeFirestore.paths.filter((entry) => entry[0] === 'set' && entry[1] === counterPath);
assert.equal(counterWrites.length, 2);
assert.equal(counterWrites[0][2].lastNumber, 1);
assert.equal(counterWrites[1][2].lastNumber, 2);
assert.equal(fakeFirestore.transactionCount(), 2);

const specPath = 'projects/P1/screenSpecs/scr-1';
const specWrite = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === specPath);
assert.ok(specWrite);
assert.equal(specWrite[2].code, 'SCR-001');
assert.equal(specWrite[2].projectId, 'P1');
assert.equal(specWrite[2].createdAt.__serverTimestamp, true);
assert.equal(specWrite[2].updatedAt.__serverTimestamp, true);

assert.throws(
  () => adapter.create('P1', validScreenSpecPayload({ id: 'scr-3', code: 'SCR-999' })),
  /explicit code is not allowed/,
);
assert.throws(
  () => adapter.create('P1', validScreenSpecPayload({ id: 'scr-4', code: '' })),
  /explicit code is not allowed/,
);
assert.throws(
  () => adapter.create('P1', validScreenSpecPayload({ id: 'scr-5', code: '   ' })),
  /explicit code is not allowed/,
);
assert.throws(
  () => adapter.create('P1', validScreenSpecPayload({ id: 'scr-6', code: null })),
  /explicit code is not allowed/,
);

const rollbackFirestore = createFakeFirestore({ failOnSecondTxSet: true });
const rollbackAdapter = adapterApi.create({ firestore: rollbackFirestore });
await assert.rejects(
  () => rollbackAdapter.create('P2', validScreenSpecPayload({ id: 'scr-fail', projectId: 'P2' })),
  /simulated screen spec create failure/,
);
assert.equal(rollbackFirestore.store.has('projects/P2/counters/screenSpecs'), false);
assert.equal(rollbackFirestore.store.has('projects/P2/screenSpecs/scr-fail'), false);

for (const badCounter of [0, -1, 1.5, '2', null]) {
  const invalidFs = createFakeFirestore();
  invalidFs.seedCounter('P3', badCounter);
  const invalidAdapter = adapterApi.create({ firestore: invalidFs });
  await assert.rejects(
    () => invalidAdapter.create('P3', validScreenSpecPayload({ id: 'scr-bad', projectId: 'P3' })),
    /invalid existing counter lastNumber/,
  );
}

const listDefault = await adapter.listByProject('P1', {});
assert.equal(listDefault.length, 1);
assert.equal(listDefault[0].id, 'scr-a');
assert.equal(typeof listDefault[0].createdAt, 'string');

const listIncludeDeleted = await adapter.listByProject('P1', { includeDeleted: true });
assert.equal(listIncludeDeleted.length, 2);

const listFiltered = await adapter.listByProject('P1', { writeStatus: 'complete', includeDeleted: true });
assert.equal(listFiltered.length, 1);
assert.equal(listFiltered[0].id, 'scr-b');

const linkedPath = 'projects/P1/screenSpecs/scr-linked';
fakeFirestore.store.set(linkedPath, {
  id: 'scr-linked',
  projectId: 'P1',
  code: 'SCR-010',
  title: 'Linked',
  screenType: 'form',
  writeStatus: 'writing',
  reviewStatus: 'none',
  approvalStatus: 'none',
  ownerId: 'o1',
  ownerName: 'Owner',
  templateId: 'tpl-1',
  routePath: '/x',
  menuPath: 'x',
  description: 'desc',
  imageCount: 2,
  annotationCount: 1,
  requirementId: 'req-abc',
  requirementCode: 'REQ_010',
  requirementTitle: 'Linked requirement',
  functionalSpecId: 'fn-abc',
  functionalSpecCode: 'FN_010',
  functionalSpecTitle: 'Linked FN',
  wbsItemId: 'wbs-abc',
  wbsItemCode: 'WBS-010',
  wbsItemTitle: 'Linked WBS',
  menuScreenId: 'menu-abc',
  menuScreenCode: 'MENU-010',
  menuScreenTitle: 'Linked menu',
  version: 1,
});

const unlinked = await adapter.update('P1', 'scr-linked', {
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
  functionalSpecId: '',
  functionalSpecCode: '',
  functionalSpecTitle: '',
  wbsItemId: '',
  wbsItemCode: '',
  wbsItemTitle: '',
  menuScreenId: '',
  menuScreenCode: '',
  menuScreenTitle: '',
});
const unlinkPatch = fakeFirestore.paths.find((entry) => entry[0] === 'update' && entry[1] === linkedPath);
assert.ok(unlinkPatch);
assert.equal(unlinkPatch[2].requirementId.__fieldDelete, true);
assert.equal(unlinkPatch[2].functionalSpecId.__fieldDelete, true);
assert.equal(unlinkPatch[2].wbsItemId.__fieldDelete, true);
assert.equal(unlinkPatch[2].menuScreenId.__fieldDelete, true);
assert.equal(unlinked.requirementId, undefined);
assert.equal(unlinked.functionalSpecId, undefined);
assert.equal(unlinked.wbsItemId, undefined);
assert.equal(unlinked.menuScreenId, undefined);

const optionalClear = await adapter.update('P1', 'scr-linked', {
  templateId: '',
  routePath: '',
  menuPath: '',
  description: '',
  imageCount: '',
  annotationCount: '',
});
const optionalClearPatch = fakeFirestore.paths.filter((entry) => entry[0] === 'update' && entry[1] === linkedPath).at(-1);
assert.ok(optionalClearPatch);
assert.equal(optionalClearPatch[2].templateId.__fieldDelete, true);
assert.equal(optionalClearPatch[2].routePath.__fieldDelete, true);
assert.equal(optionalClearPatch[2].menuPath.__fieldDelete, true);
assert.equal(optionalClearPatch[2].description.__fieldDelete, true);
assert.equal(optionalClearPatch[2].imageCount.__fieldDelete, true);
assert.equal(optionalClearPatch[2].annotationCount.__fieldDelete, true);
assert.equal(optionalClearPatch[2].updatedAt.__serverTimestamp, true);
assert.equal(optionalClear.id, 'scr-linked');
assert.equal(optionalClear.templateId, undefined);

assert.equal(typeof adapter.delete, 'undefined');
assert.equal(typeof adapter.softDelete, 'undefined');
assert.equal(typeof adapter.remove, 'undefined');

console.log('screen spec counter contract: PASS');
