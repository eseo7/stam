#!/usr/bin/env node
/**
 * STAM FS-6A — Functional Specification FN_### counter contract
 *
 * Verifies:
 * - projects/{projectId}/counters/functionalSpecifications rules gate
 * - adapter transaction allocation for empty code on create
 * - explicit code bypasses counter increment
 *
 * Usage:
 *   node scripts/test-functional-spec-counter-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-adapter.js'), 'utf8');

assert.match(rulesSource, /function isValidFunctionalSpecificationsCounterWrite\(\)/);
assert.match(rulesSource, /counterId == 'functionalSpecifications'/);
assert.match(rulesSource, /isRequirementWriter\(projectId\)/);
assert.match(adapterSource, /COUNTER_DOC_ID = 'functionalSpecifications'/);
assert.match(adapterSource, /CODE_PREFIX = 'FN_'/);
assert.match(adapterSource, /createWithAllocatedCode/);
assert.doesNotMatch(adapterSource, /allocateFunctionalSpecCode/);
assert.match(adapterSource, /transaction\.set\(cref/);
assert.match(adapterSource, /transaction\.set\(ref, payload\)/);

const countersBlock = rulesSource.match(
  /match \/counters\/\{counterId\} \{[\s\S]*?\n      \}/,
);
assert.ok(countersBlock, 'counters match block must exist');
assert.match(countersBlock[0], /counterId == 'functionalSpecifications'/);
assert.match(countersBlock[0], /isValidFunctionalSpecificationsCounterWrite\(\)/);
assert.match(countersBlock[0], /allow delete: if false;/);
assert.doesNotMatch(
  countersBlock[0],
  /memberRole\(projectId\) == "viewer"/,
  'viewer must not write functionalSpecifications counter',
);

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
  });
  window.window = window;
  return { context, window };
}

function createFakeFirestore(options) {
  const opts = options || {};
  const paths = [];
  const store = new Map();
  let transactionCount = 0;

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
        return docRef([...pathParts, id || 'AUTO-ID']);
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
            throw new Error('simulated functional spec create failure');
          }
          pending.push({ ref, data, setOptions });
        },
      };
      return Promise.resolve(fn(tx))
        .then((result) => {
          return Promise.all(pending.map((op) => op.ref.set(op.data, op.setOptions))).then(() => result);
        })
        .catch((err) => {
          pending.length = 0;
          throw err;
        });
    },
  };
}

const { context, window } = createContext();
vm.runInContext(adapterSource, context, { filename: 'stam.functional-spec-firestore-adapter.js' });

const adapterApi = window.STAM.functionalSpecFirestoreAdapter;
assert.equal(adapterApi.COUNTER_DOC_ID, 'functionalSpecifications');
assert.equal(adapterApi.CODE_PREFIX, 'FN_');
assert.equal(adapterApi.formatFunctionalSpecCodeNumber(1), 'FN_001');
assert.equal(adapterApi.formatFunctionalSpecCodeNumber(42), 'FN_042');

const fakeFirestore = createFakeFirestore();
const adapter = adapterApi.create({ firestore: fakeFirestore });

const first = await adapter.create('P1', {
  id: 'fs-1',
  title: 'First spec',
  status: 'draft',
  priority: 'mid',
});
assert.equal(first.code, 'FN_001');
assert.equal(first.id, 'fs-1', 'internal id must remain Firestore doc id');

const second = await adapter.create('P1', {
  id: 'fs-2',
  title: 'Second spec',
  status: 'draft',
  priority: 'mid',
});
assert.equal(second.code, 'FN_002');

const counterPath = 'projects/P1/counters/functionalSpecifications';
const counterWrites = fakeFirestore.paths.filter((entry) => entry[0] === 'set' && entry[1] === counterPath);
assert.equal(counterWrites.length, 2);
assert.equal(counterWrites[0][2].lastNumber, 1);
assert.equal(counterWrites[1][2].lastNumber, 2);
assert.equal(fakeFirestore.transactionCount(), 2, 'allocated-code creates must use one transaction each');

const specPath = 'projects/P1/functionalSpecifications/fs-1';
const specWrite = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === specPath);
assert.ok(specWrite, 'functional spec doc must be created in allocated-code flow');
assert.equal(specWrite[2].code, 'FN_001');

const manual = await adapter.create('P1', {
  id: 'fs-3',
  code: 'FN_MANUAL',
  title: 'Manual code',
  status: 'draft',
  priority: 'mid',
});
assert.equal(manual.code, 'FN_MANUAL');
assert.equal(
  fakeFirestore.paths.filter((entry) => entry[0] === 'set' && entry[1] === counterPath).length,
  2,
  'explicit code must not increment counter',
);

const rollbackFirestore = createFakeFirestore({ failOnSecondTxSet: true });
const rollbackAdapter = adapterApi.create({ firestore: rollbackFirestore });
await assert.rejects(
  () => rollbackAdapter.create('P2', {
    id: 'fs-fail',
    title: 'Rollback test',
    status: 'draft',
    priority: 'mid',
  }),
  /simulated functional spec create failure/,
);
assert.equal(
  rollbackFirestore.store.has('projects/P2/counters/functionalSpecifications'),
  false,
  'counter must rollback when functional spec create fails in same transaction',
);
assert.equal(
  rollbackFirestore.store.has('projects/P2/functionalSpecifications/fs-fail'),
  false,
  'functional spec doc must not persist when transaction fails',
);

const linkedPath = 'projects/P1/functionalSpecifications/fs-linked';
fakeFirestore.store.set(linkedPath, {
  id: 'fs-linked',
  projectId: 'P1',
  code: 'FN_010',
  title: 'Linked spec',
  status: 'draft',
  priority: 'mid',
  requirementId: 'req-abc',
  requirementCode: 'REQ_010',
  requirementTitle: 'Linked requirement',
  version: 1,
});

const unlinked = await adapter.update('P1', 'fs-linked', {
  title: 'Linked spec',
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
});
const unlinkPatch = fakeFirestore.paths.find((entry) => entry[0] === 'update' && entry[1] === linkedPath);
assert.ok(unlinkPatch, 'update must be called for unlink patch');
assert.equal(unlinkPatch[2].requirementId.__fieldDelete, true);
assert.equal(unlinkPatch[2].requirementCode.__fieldDelete, true);
assert.equal(unlinkPatch[2].requirementTitle.__fieldDelete, true);
assert.equal(unlinked.requirementId, undefined);
assert.equal(unlinked.requirementCode, undefined);
assert.equal(unlinked.requirementTitle, undefined);

console.log('functional spec counter contract: PASS');
