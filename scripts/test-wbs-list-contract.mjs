#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const listSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-list.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-service.js'), 'utf8');
const messagesSource = await readFile(path.join(ROOT, 'stam/js/stam.ui-messages.js'), 'utf8');
const feedbackSource = await readFile(path.join(ROOT, 'stam/js/stam.ui-feedback.js'), 'utf8');
const boardListSource = await readFile(path.join(ROOT, 'stam/js/stam.board-list.js'), 'utf8');

assert.equal(/collection\(['"]wbsItems['"]\)/.test(listSource), false);
assert.match(listSource, /svc\.listByProject\(projectId, DEFAULT_QUERY, serviceContext\('wbs-firestore-list'\)\)/);
assert.equal(/\.set\(|\.add\(|\.update\(/.test(listSource.replace(/setAttribute/g, '').replace(/setItem/g, '').replace(/classList\.add/g, '')), false);

const calls = [];
const redirects = [];
let boundListCalls = 0;

const fakeAdapter = {
  listByProject(projectId, query) {
    boundListCalls += 1;
    calls.push({ method: 'adapter.listByProject', projectId, query });
    return Promise.resolve([
      {
        id: 'doc-b',
        projectId,
        code: 'WBS-002',
        title: '<img onerror=alert(1)>',
        phase: '구현',
        functionGroup: '인증',
        status: 'in_progress',
        priority: 'high',
        ownerId: 'qa-user',
        ownerName: 'QA & Owner',
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        progress: 20,
        createdAt: '2026-07-01T00:00:00.000Z',
        isDeleted: false,
      },
      {
        id: 'doc-a',
        projectId,
        code: 'WBS-003',
        title: 'Newer row',
        phase: '설계',
        functionGroup: '인증',
        status: 'wait',
        priority: 'mid',
        ownerId: 'other',
        ownerName: 'Other',
        startDate: '2026-07-05',
        endDate: '2026-07-12',
        progress: 0,
        createdAt: '2026-07-09T00:00:00.000Z',
        isDeleted: false,
      },
      { id: 'doc-x', title: 'deleted', isDeleted: true, createdAt: '2026-07-10T00:00:00.000Z' },
    ]);
  },
  getById(projectId, id) {
    calls.push({ method: 'adapter.getById', projectId, id });
    return Promise.resolve({
      id,
      projectId,
      code: 'WBS-003',
      title: 'Detail item',
      phase: '설계',
      functionGroup: '인증',
      status: 'wait',
      priority: 'mid',
      ownerId: 'qa-user',
      ownerName: 'QA',
      startDate: '2026-07-05',
      endDate: '2026-07-12',
      progress: 0,
      createdAt: '2026-07-09T00:00:00.000Z',
      isDeleted: false,
    });
  },
};

const table = { innerHTML: '', querySelectorAll() { return []; }, appendChild() {}, insertAdjacentHTML(_, html) { this.innerHTML += html; } };
const liveRoot = { getAttribute: () => 'true' };

const context = vm.createContext({
  window: {
    location: { search: '?projectId=P-WBS4', replace(path) { redirects.push(path); } },
    sessionStorage: { getItem() { return ''; }, setItem(k, v) { calls.push({ method: 'sessionStorage.setItem', k, v }); } },
    firebase: {
      auth() {
        return {
          currentUser: { uid: 'qa-user', displayName: 'QA', email: 'qa@example.com' },
          onAuthStateChanged(cb) { cb(this.currentUser); return () => {}; },
        };
      },
      firestore() {
        return {
          collection(name) {
            assert.equal(name, 'projects');
            return {
              doc(projectId) {
                return {
                  collection(sub) {
                    assert.equal(sub, 'members');
                    return {
                      doc(uid) {
                        return {
                          get() {
                            return Promise.resolve({ exists: true, data: () => ({ status: 'active', role: 'viewer' }) });
                          },
                        };
                      },
                    };
                  },
                  get() {
                    return Promise.resolve({
                      exists: true,
                      data: () => ({ name: 'QA WBS Project', client: 'QA', stage: 'Stage', status: 'active' }),
                    });
                  },
                };
              },
            };
          },
        };
      },
    },
    STAM: {
      wbsUi: { filterApi: { getValues() { return {}; } } },
      projectContextRender: { init() { calls.push({ method: 'projectContextRender.init' }); } },
      topbarRender: { init() { calls.push({ method: 'topbarRender.init' }); } },
      navRender: { init(id) { calls.push({ method: 'navRender.init', id }); } },
      wbsFirestoreCrud: { applyWriteAccessUI() {} },
      icons: { hydrate() {} },
    },
  },
  document: {
    title: '',
    readyState: 'complete',
    addEventListener() {},
    querySelector(sel) {
      if (sel === '[data-stam-wbs-live="true"]') return liveRoot;
      if (sel === '[data-stam-wbs-static-list]') return table;
      if (sel === '[data-stam-project-context]') return { setAttribute() {}, attrs: {} };
      if (sel === '[data-stam-topbar]') return { setAttribute(n, v) { this.attrs = this.attrs || {}; this.attrs[n] = v; }, attrs: {} };
      if (sel === '[data-stam-left-nav]') return { setAttribute() {} };
      return null;
    },
    querySelectorAll() { return []; },
    createElement() { return { innerHTML: '', setAttribute() {}, appendChild() {} }; },
  },
  Promise, String, Array, Object, Error, Number, Math, Date, URLSearchParams,
});
context.window.window = context.window;
context.window.document = context.document;

vm.runInContext(serviceSource, context, { filename: 'stam.wbs-service.js' });
vm.runInContext(messagesSource, context, { filename: 'stam.ui-messages.js' });
vm.runInContext(feedbackSource, context, { filename: 'stam.ui-feedback.js' });
vm.runInContext(boardListSource, context, { filename: 'stam.board-list.js' });
context.window.STAM.wbsFirestoreAdapter = { create() { return fakeAdapter; } };
context.window.STAM.wbsService = context.window.STAM.wbsServiceContract.createService({
  adapter: fakeAdapter,
  authorize() { return false; },
});
vm.runInContext(listSource, context, { filename: 'stam.wbs-firestore-list.js' });
for (let i = 0; i < 20; i += 1) {
  await Promise.resolve();
}

assert.equal(boundListCalls, 1);
assert.equal(redirects.length, 0);
assert.match(table.innerHTML, /WBS-003/);
assert.match(table.innerHTML, /&lt;img onerror=alert\(1\)&gt;/);
assert.doesNotMatch(table.innerHTML, /doc-x/);
const rowOrder = [...table.innerHTML.matchAll(/data-wbs-item-id="([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(rowOrder, ['doc-a', 'doc-b']);
assert.equal(calls.find((c) => c.method === 'navRender.init').id, 'B3');

await context.window.STAM.wbsFirestoreList.openDetailById('doc-a');
assert.ok(calls.find((c) => c.method === 'adapter.getById'));
assert.equal(context.window.STAM.wbsFirestoreList.getState().currentItem.id, 'doc-a');

console.log('wbs list contract: PASS');
