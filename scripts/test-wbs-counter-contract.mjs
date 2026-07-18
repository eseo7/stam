#!/usr/bin/env node
/**
 * STAM WBS-2 — WBS WBS-### counter contract
 *
 * Usage:
 *   node scripts/test-wbs-counter-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-adapter.js'), 'utf8');

assert.match(rulesSource, /function isValidWbsItemsCounterWrite\(\)/);
assert.match(rulesSource, /counterId == 'wbsItems'/);
assert.match(rulesSource, /isWbsWriter\(projectId\)/);
assert.match(adapterSource, /COUNTER_DOC_ID = 'wbsItems'/);
assert.match(adapterSource, /CODE_PREFIX = 'WBS-'/);
assert.match(adapterSource, /createWithAllocatedCode/);
assert.match(adapterSource, /transaction\.set\(cref/);
assert.match(adapterSource, /transaction\.set\(ref, payload\)/);

const countersBlock = rulesSource.match(
  /match \/counters\/\{counterId\} \{[\s\S]*?\n      \}/,
);
assert.ok(countersBlock, 'counters match block must exist');
assert.match(countersBlock[0], /counterId == 'wbsItems'/);
assert.match(countersBlock[0], /isValidWbsItemsCounterWrite\(\)/);
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

function validWbsPayload(overrides = {}) {
  return {
    title: '로그인 기능 구현',
    phase: '구현',
    functionGroup: '인증',
    status: 'wait',
    priority: 'mid',
    ownerId: 'owner-uid',
    ownerName: 'Owner',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    progress: 0,
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
      let txSetCount = 0;
      const tx = {
        get(ref) {
          return ref.get();
        },
        set(ref, data, setOptions) {
          txSetCount += 1;
          if (opts.failOnSecondTxSet && txSetCount === 2) {
            throw new Error('simulated wbs create failure');
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
      store.set(`projects/${projectId}/counters/wbsItems`, { lastNumber });
    },
    seedMember(projectId, memberUid, member) {
      store.set(`projects/${projectId}/members/${memberUid}`, member);
    },
  };
}

const { context, window } = createContext();
vm.runInContext(adapterSource, context, { filename: 'stam.wbs-firestore-adapter.js' });

const adapterApi = window.STAM.wbsFirestoreAdapter;
assert.equal(adapterApi.COLLECTION, 'wbsItems');
assert.equal(adapterApi.COUNTER_DOC_ID, 'wbsItems');
assert.equal(adapterApi.CODE_PREFIX, 'WBS-');
assert.equal(adapterApi.formatWbsCodeNumber(1), 'WBS-001');
assert.equal(adapterApi.formatWbsCodeNumber(2), 'WBS-002');
assert.equal(adapterApi.formatWbsCodeNumber(42), 'WBS-042');
assert.equal(adapterApi.formatWbsCodeNumber(1000), 'WBS-1000');
assert.throws(() => adapterApi.formatWbsCodeNumber(1.5));
assert.throws(() => adapterApi.formatWbsCodeNumber('2'));
assert.throws(() => adapterApi.formatWbsCodeNumber(0));
assert.throws(() => adapterApi.formatWbsCodeNumber(-1));

function seedPreflightMembers(fakeFs, projectId, payload) {
  const createdBy = payload.createdBy || 'u1';
  const ownerId = payload.ownerId || 'owner-uid';
  const ownerName = payload.ownerName || 'Owner';
  fakeFs.seedMember(projectId, createdBy, {
    userId: createdBy,
    projectId,
    status: 'active',
    role: 'owner',
    displayName: 'Writer',
  });
  fakeFs.seedMember(projectId, ownerId, {
    userId: ownerId,
    projectId,
    status: 'active',
    role: 'editor',
    displayName: ownerName,
  });
  const reviewerId = payload.reviewerId;
  const reviewerName = payload.reviewerName;
  if (reviewerId && reviewerName) {
    fakeFs.seedMember(projectId, reviewerId, {
      userId: reviewerId,
      projectId,
      status: 'active',
      role: 'editor',
      displayName: reviewerName,
    });
  }
}

const fakeFirestore = createFakeFirestore();
seedPreflightMembers(fakeFirestore, 'P1', validWbsPayload());
const adapter = adapterApi.create({ firestore: fakeFirestore });

const first = await adapter.create('P1', validWbsPayload({ id: 'wbs-1' }));
assert.equal(first.code, 'WBS-001');
assert.equal(first.id, 'wbs-1');

const second = await adapter.create('P1', validWbsPayload({ id: 'wbs-2', title: 'Second' }));
assert.equal(second.code, 'WBS-002');

const counterPath = 'projects/P1/counters/wbsItems';
const counterWrites = fakeFirestore.paths.filter((entry) => entry[0] === 'set' && entry[1] === counterPath);
assert.equal(counterWrites.length, 2);
assert.equal(counterWrites[0][2].lastNumber, 1);
assert.equal(counterWrites[1][2].lastNumber, 2);
assert.equal(fakeFirestore.transactionCount(), 2);

const specPath = 'projects/P1/wbsItems/wbs-1';
const specWrite = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === specPath);
assert.ok(specWrite);
assert.equal(specWrite[2].code, 'WBS-001');

assert.throws(
  () => adapter.create('P1', validWbsPayload({ id: 'wbs-3', code: 'WBS-999' })),
  /explicit code is not allowed/,
);
assert.throws(
  () => adapter.create('P1', validWbsPayload({ id: 'wbs-4', code: '' })),
  /explicit code is not allowed/,
);
assert.throws(
  () => adapter.create('P1', validWbsPayload({ id: 'wbs-5', code: '   ' })),
  /explicit code is not allowed/,
);
assert.throws(
  () => adapter.create('P1', validWbsPayload({ id: 'wbs-6', code: null })),
  /explicit code is not allowed/,
);
assert.equal(
  fakeFirestore.paths.filter((entry) => entry[0] === 'set' && entry[1] === counterPath).length,
  2,
  'explicit code must not increment counter',
);
assert.equal(fakeFirestore.store.has('projects/P1/wbsItems/wbs-3'), false);

const rollbackFirestore = createFakeFirestore({ failOnSecondTxSet: true });
seedPreflightMembers(rollbackFirestore, 'P2', validWbsPayload({ projectId: 'P2' }));
const rollbackAdapter = adapterApi.create({ firestore: rollbackFirestore });
await assert.rejects(
  () => rollbackAdapter.create('P2', validWbsPayload({ id: 'wbs-fail', projectId: 'P2' })),
  /simulated wbs create failure/,
);
assert.equal(rollbackFirestore.store.has('projects/P2/counters/wbsItems'), false);
assert.equal(rollbackFirestore.store.has('projects/P2/wbsItems/wbs-fail'), false);

for (const badCounter of [0, -1, 1.5, '2', null]) {
  const invalidFs = createFakeFirestore();
  invalidFs.seedCounter('P3', badCounter);
  seedPreflightMembers(invalidFs, 'P3', validWbsPayload({ projectId: 'P3' }));
  const invalidAdapter = adapterApi.create({ firestore: invalidFs });
  await assert.rejects(
    () => invalidAdapter.create('P3', validWbsPayload({ id: 'wbs-bad', projectId: 'P3' })),
    /WBS_COUNTER_INVALID/,
  );
}

const linkedPath = 'projects/P1/wbsItems/wbs-linked';
fakeFirestore.store.set(linkedPath, {
  id: 'wbs-linked',
  projectId: 'P1',
  code: 'WBS-010',
  title: 'Linked',
  phase: '구현',
  functionGroup: '인증',
  status: 'wait',
  priority: 'mid',
  ownerId: 'o1',
  ownerName: 'Owner',
  startDate: '2026-07-01',
  endDate: '2026-07-02',
  progress: 0,
  businessArea: '회원',
  plannedEffort: 4,
  actualEffort: 2,
  reviewerId: 'r1',
  reviewerName: 'R1',
  requirementId: 'req-abc',
  requirementCode: 'REQ_010',
  requirementTitle: 'Linked requirement',
  functionalSpecId: 'fn-abc',
  functionalSpecCode: 'FN_010',
  functionalSpecTitle: 'Linked FN',
  version: 1,
});

const unlinked = await adapter.update('P1', 'wbs-linked', {
  reviewerId: '',
  reviewerName: '',
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
  functionalSpecId: '',
  functionalSpecCode: '',
  functionalSpecTitle: '',
});
const unlinkPatch = fakeFirestore.paths.find((entry) => entry[0] === 'update' && entry[1] === linkedPath);
assert.ok(unlinkPatch);
assert.equal(unlinkPatch[2].reviewerId.__fieldDelete, true);
assert.equal(unlinkPatch[2].reviewerName.__fieldDelete, true);
assert.equal(unlinkPatch[2].requirementId.__fieldDelete, true);
assert.equal(unlinkPatch[2].requirementCode.__fieldDelete, true);
assert.equal(unlinkPatch[2].requirementTitle.__fieldDelete, true);
assert.equal(unlinkPatch[2].functionalSpecId.__fieldDelete, true);
assert.equal(unlinkPatch[2].functionalSpecCode.__fieldDelete, true);
assert.equal(unlinkPatch[2].functionalSpecTitle.__fieldDelete, true);
assert.equal(unlinked.reviewerId, undefined);
assert.equal(unlinked.requirementId, undefined);
assert.equal(unlinked.functionalSpecId, undefined);

const optionalClear = await adapter.update('P1', 'wbs-linked', {
  businessArea: '',
  plannedEffort: '',
  actualEffort: '',
});
const optionalClearPatch = fakeFirestore.paths.filter((entry) => entry[0] === 'update' && entry[1] === linkedPath).at(-1);
assert.ok(optionalClearPatch);
assert.equal(optionalClearPatch[2].businessArea.__fieldDelete, true);
assert.equal(optionalClearPatch[2].plannedEffort.__fieldDelete, true);
assert.equal(optionalClearPatch[2].actualEffort.__fieldDelete, true);
assert.equal(optionalClear.businessArea, undefined);
assert.equal(optionalClear.plannedEffort, undefined);
assert.equal(optionalClear.actualEffort, undefined);

console.log('wbs counter contract: PASS');
