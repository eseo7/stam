import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const listSource = await readFile(new URL('stam/js/stam.requirements-firestore-list.js', ROOT), 'utf8');

assert.equal(/requirementsService\.(create|update|softDelete)/.test(listSource), false);
assert.equal(/firebase\.firestore\(\)/.test(listSource), false);
assert.equal(/collection\(['"]projects['"]\)/.test(listSource), false);
assert.equal(/\.set\(|\.update\(|\.add\(|\.delete\(/.test(listSource), false);
assert.ok(listSource.includes('listByProject(projectId, DEFAULT_QUERY, context)'));

function fakeElement() {
  return {
    innerHTML: '',
    textContent: '',
  };
}

const tbody = fakeElement();
const count = fakeElement();
const summaryNums = Array.from({ length: 7 }, fakeElement);
const metaVals = Array.from({ length: 3 }, fakeElement);
const tableRoot = fakeElement();

const calls = [];
const context = vm.createContext({
  window: {
    location: { search: '?projectId=P314' },
    sessionStorage: {
      getItem() { return ''; },
    },
    firebase: {
      auth() {
        return {
          currentUser: {
            uid: 'qa-user',
            displayName: 'QA User',
            email: 'qa@example.com',
          },
          onAuthStateChanged(callback) {
            callback(this.currentUser);
            return function unsubscribe() {};
          },
        };
      },
    },
    STAM: {
      requirementsService: {
        listByProject(projectId, query, callContext) {
          calls.push({ method: 'listByProject', projectId, query, context: callContext });
          return Promise.resolve([
            {
              id: 'REQ-001',
              projectId,
              code: 'REQ-001',
              title: 'Firestore read contract',
              status: 'review',
              priority: 'critical',
              ownerName: 'QA User',
              updatedAt: '2026-07-03T00:00:00.000Z',
              linkedScreenSpec: 'SCR-001',
              isDeleted: false,
            },
            {
              id: 'REQ-002',
              projectId,
              code: 'REQ-002',
              title: 'Deleted should be filtered',
              status: 'draft',
              priority: 'normal',
              isDeleted: true,
            },
          ]);
        },
        create() {
          throw new Error('create must not be called');
        },
        update() {
          throw new Error('update must not be called');
        },
        softDelete() {
          throw new Error('softDelete must not be called');
        },
      },
    },
    STAMBoardList: {
      refresh(root) {
        calls.push({ method: 'refresh', root });
      },
    },
  },
  document: {
    readyState: 'complete',
    addEventListener() {},
    getElementById(id) {
      return id === 'rq-tbody' ? tbody : null;
    },
    querySelector(selector) {
      if (selector === '[data-stam-board-list]') return tableRoot;
      if (selector === '.stam-board-count') return count;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.rq-ss-num') return summaryNums;
      if (selector === '.rq-ss-meta-val') return metaVals;
      return [];
    },
  },
  URLSearchParams,
  Promise,
  String,
  Array,
  Object,
  Error,
});

context.window.window = context.window;
context.window.document = context.document;
context.window.URLSearchParams = URLSearchParams;
context.window.Promise = Promise;

vm.runInContext(listSource, context, { filename: 'stam.requirements-firestore-list.js' });
for (let i = 0; i < 8; i += 1) {
  await Promise.resolve();
}

assert.equal(calls[0].method, 'listByProject');
assert.equal(calls[0].projectId, 'P314');
assert.equal(calls[0].query.includeDeleted, false);
assert.equal(calls[0].context.actorUid, 'qa-user');
assert.equal(calls[0].context.source, 'requirements-firestore-list');
assert.match(tbody.innerHTML, /REQ-001/);
assert.doesNotMatch(tbody.innerHTML, /REQ-002/);
assert.equal(summaryNums[0].textContent, 1);
assert.equal(summaryNums[2].textContent, 1);
assert.equal(summaryNums[6].textContent, 0);
assert.match(count.innerHTML, /총 <b>1<\/b>건/);

console.log('requirements firestore list contract: PASS');
