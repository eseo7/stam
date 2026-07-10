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
assert.match(adapterSource, /allocateFunctionalSpecCode/);

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

function createFakeFirestore() {
  const paths = [];
  const store = new Map();

  function docRef(pathParts) {
    const key = pathParts.join('/');
    return {
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
      set(payload, options) {
        paths.push(['set', key, payload, options || null]);
        const prev = store.get(key) || {};
        store.set(key, options && options.merge ? Object.assign({}, prev, payload) : Object.assign({}, payload));
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
    collection(name) {
      return collectionRef([name]);
    },
    runTransaction(fn) {
      const tx = {
        get(ref) {
          return ref.get();
        },
        set(ref, data, options) {
          return ref.set(data, options);
        },
      };
      return Promise.resolve(fn(tx));
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

console.log('functional spec counter contract: PASS');
