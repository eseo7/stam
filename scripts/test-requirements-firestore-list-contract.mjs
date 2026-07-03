import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const listSource = await readFile(new URL('stam/js/stam.requirements-firestore-list.js', ROOT), 'utf8');

assert.equal(/requirementsService\.(create|update|softDelete)/.test(listSource), false);
assert.equal(/collection\(['"]requirements['"]\)/.test(listSource), false);
assert.equal(/\.set\(|\.update\(|\.add\(|\.delete\(/.test(listSource), false);
assert.ok(listSource.includes('listByProject(projectId, DEFAULT_QUERY, context)'));

function fakeElement() {
  return {
    innerHTML: '',
    textContent: '',
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    getAttribute(name) {
      return this.attrs[name] || '';
    },
  };
}

const tbody = fakeElement();
const count = fakeElement();
const summaryNums = Array.from({ length: 7 }, fakeElement);
const metaVals = Array.from({ length: 3 }, fakeElement);
const tableRoot = fakeElement();
const projectContext = fakeElement();
const topbar = fakeElement();
const leftNav = fakeElement();
const detailBadge = fakeElement();
const detailTitle = fakeElement();
const detailMeta = fakeElement();
const editBadge = fakeElement();
const editTitle = fakeElement();
const editMeta = fakeElement();
const tabInfo = fakeElement();
const tabLink = fakeElement();
const tabReview = fakeElement();
const tabHistory = fakeElement();

const calls = [];
const redirects = [];
const context = vm.createContext({
  window: {
    location: {
      search: '?projectId=P314',
      replace(path) {
        redirects.push(path);
      },
    },
    sessionStorage: {
      getItem() { return ''; },
      setItem(key, value) {
        calls.push({ method: 'sessionStorage.setItem', key, value });
      },
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
      firestore() {
        return {
          collection(name) {
            calls.push({ method: 'collection', name });
            assert.equal(name, 'projects');
            return {
              doc(projectId) {
                calls.push({ method: 'projectDoc', projectId });
                return {
                  collection(subName) {
                    calls.push({ method: 'projectSubcollection', subName });
                    assert.equal(subName, 'members');
                    return {
                      doc(uid) {
                        calls.push({ method: 'memberDoc', uid });
                        return {
                          get() {
                            calls.push({ method: 'memberGet' });
                            return Promise.resolve({
                              exists: true,
                              data: () => ({ status: 'active', role: 'admin' }),
                            });
                          },
                        };
                      },
                    };
                  },
                  get() {
                    calls.push({ method: 'projectGet' });
                    return Promise.resolve({
                      exists: true,
                      data: () => ({
                        name: 'QA Project',
                        client: 'QA Client',
                        stage: 'QA Stage',
                        status: 'active',
                        updatedAt: '2026-07-03',
                      }),
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
        getById(projectId, requirementId, callContext) {
          calls.push({ method: 'getById', projectId, requirementId, context: callContext });
          return Promise.resolve({
            id: requirementId,
            projectId,
            code: requirementId,
            title: 'Firestore detail contract',
            description: 'Read-only detail body',
            status: 'approved',
            priority: 'high',
            ownerName: 'Detail Owner',
            updatedAt: '2026-07-03T00:00:00.000Z',
            linkedScreenSpec: 'SCR-002',
            linkedWbs: 'WBS-002',
            reviewStatus: 'Approved',
            isDeleted: false,
          });
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
    projectContextRender: {
      init() {
        calls.push({ method: 'projectContextRender.init' });
      },
    },
    topbarRender: {
      init() {
        calls.push({ method: 'topbarRender.init' });
      },
    },
    navRender: {
      init(activeId) {
        calls.push({ method: 'navRender.init', activeId });
      },
    },
    detailDrawer: {
      mount(el, config) {
        calls.push({ method: 'detailDrawer.mount', el, config });
        el.innerHTML = JSON.stringify(config);
      },
    },
  },
  document: {
    title: '',
    readyState: 'complete',
    addEventListener() {},
    getElementById(id) {
      if (id === 'rq-tbody') return tbody;
      if (id === 'rq-tab-info') return tabInfo;
      if (id === 'rq-tab-link') return tabLink;
      if (id === 'rq-tab-review') return tabReview;
      if (id === 'rq-tab-history') return tabHistory;
      return null;
    },
    querySelector(selector) {
      if (selector === '[data-stam-board-list]') return tableRoot;
      if (selector === '.stam-board-count') return count;
      if (selector === '[data-stam-project-context]') return projectContext;
      if (selector === '[data-stam-topbar]') return topbar;
      if (selector === '[data-stam-left-nav]') return leftNav;
      if (selector === '#rq-dw-detail .rq-req-badge') return detailBadge;
      if (selector === '#rq-dw-detail .rq-dw-htitle') return detailTitle;
      if (selector === '#rq-dw-detail .rq-dw-hmeta') return detailMeta;
      if (selector === '#rq-dw-edit .rq-req-badge') return editBadge;
      if (selector === '#rq-dw-edit .rq-dw-htitle') return editTitle;
      if (selector === '#rq-dw-edit .rq-dw-hmeta') return editMeta;
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
for (let i = 0; i < 20; i += 1) {
  await Promise.resolve();
}

const listCall = calls.find((call) => call.method === 'listByProject');
assert.equal(listCall.projectId, 'P314');
assert.equal(listCall.query.includeDeleted, false);
assert.equal(listCall.context.actorUid, 'qa-user');
assert.equal(listCall.context.source, 'requirements-firestore-list');
assert.match(tbody.innerHTML, /REQ-001/);
assert.doesNotMatch(tbody.innerHTML, /REQ-002/);
assert.equal(summaryNums[0].textContent, 1);
assert.equal(summaryNums[2].textContent, 1);
assert.equal(summaryNums[6].textContent, 0);
assert.match(count.innerHTML, /총 <b>1<\/b>건/);
assert.equal(projectContext.attrs['data-pc-title'], 'QA Project');
assert.equal(projectContext.attrs['data-pc-client'], 'QA Client');
assert.equal(projectContext.attrs['data-pc-role'], 'Admin');
assert.equal(topbar.attrs['data-tb-crumbs'], '내 프로젝트|QA Project|요구사항정의서');
assert.equal(redirects.length, 0);

await context.window.STAM.requirementsFirestoreList.openDetailFromRow({
  getAttribute(name) {
    return name === 'data-rq-id' ? 'REQ-001' : '';
  },
});
const detailCall = calls.find((call) => call.method === 'getById');
assert.equal(detailCall.projectId, 'P314');
assert.equal(detailCall.requirementId, 'REQ-001');
assert.equal(detailCall.context.source, 'requirements-firestore-detail');
assert.equal(detailBadge.textContent, 'REQ-001');
assert.equal(detailTitle.textContent, 'Firestore detail contract');
assert.match(detailMeta.innerHTML, /승인완료/);
assert.match(tabInfo.innerHTML, /Firestore detail contract/);

console.log('requirements firestore list contract: PASS');
