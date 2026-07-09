import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const messagesSource = await readFile(new URL('stam/js/stam.ui-messages.js', ROOT), 'utf8');
const feedbackSource = await readFile(new URL('stam/js/stam.ui-feedback.js', ROOT), 'utf8');
const listSource = await readFile(new URL('stam/js/stam.functional-spec-firestore-list.js', ROOT), 'utf8');
const serviceSource = await readFile(new URL('stam/js/stam.functional-spec-service.js', ROOT), 'utf8');
const pageSource = await readFile(new URL('stam/pages/boards/functional-specification.html', ROOT), 'utf8');

assert.equal(/functionalSpecService\.(create|update|softDelete|delete|remove)/.test(listSource), false);
assert.equal(/collection\(['"]functionalSpecifications['"]\)/.test(listSource), false);
assert.equal(/\.set\(|\.update\(|\.add\(/.test(listSource), false);
assert.ok(listSource.includes('listByProject(projectId, DEFAULT_QUERY, context)'));
assert.doesNotMatch(listSource, /DELETE:\s*'functionalSpec\.delete'/);
assert.equal(/function\s+softDelete/.test(listSource), false);

const loadFn = listSource.match(/function load\(\) \{[\s\S]*?\n  \}/);
assert.ok(loadFn, 'load() function must exist');
assert.doesNotMatch(
  loadFn[0],
  /var svc = service\(\);[\s\S]*?bindAuthorizedService/,
  'load() must bind authorized service before capturing service()',
);
assert.match(loadFn[0], /bindAuthorizedService\([\s\S]*?var svc = service\(\)/);
assert.match(listSource, /function formatFunctionalSpecCode\(item\)/);
assert.match(listSource, /function sortFunctionalSpecsByLatest\(list\)/);
assert.match(loadFn[0], /sortFunctionalSpecsByLatest\(/);
assert.match(loadFn[0], /state\.items = list/);
assert.match(listSource, /\.replace\(\/&\/g, '&amp;'\)/);
assert.match(listSource, /uiFeedback\(\)/);
assert.match(listSource, /uiMessages\(\)/);
assert.match(pageSource, /stam\.ui-messages\.js/);
assert.match(pageSource, /stam\.ui-feedback\.js/);

assert.match(pageSource, /stam\.functional-spec-firestore-adapter\.js/);
assert.match(pageSource, /stam\.functional-spec-service\.js/);
assert.match(pageSource, /stam\.functional-spec-firestore-list\.js/);
assert.doesNotMatch(pageSource, /stam\.functional-definition-cycle\.js/);
assert.doesNotMatch(pageSource, /stam\.functional-definition-crud\.js/);
assert.match(pageSource, /<tbody id="fn-tbody">\s*<\/tbody>/);

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
    insertAdjacentHTML(position, html) {
      this.innerHTML += html;
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
const pageTitle = fakeElement();

const calls = [];
const redirects = [];
let denyListCalls = 0;
let boundListCalls = 0;

const fakeAdapter = {
  listByProject(projectId, query) {
    boundListCalls += 1;
    calls.push({ method: 'adapter.listByProject', projectId, query });
    return Promise.resolve([
      {
        id: 'FN-001',
        projectId,
        code: 'FN_001',
        title: '<script>alert("xss")</script>',
        status: 'review',
        priority: 'high',
        ownerName: 'QA & User',
        updatedAt: '2026-07-01T00:00:00.000Z',
        requirementCode: 'REQ_001',
        linkedScreen: '요구사항정의서',
        functionType: 'view',
        isDeleted: false,
      },
      {
        id: 'FN-003',
        projectId,
        title: 'Latest functional spec row',
        status: 'draft',
        priority: 'mid',
        updatedAt: '2026-07-09T00:00:00.000Z',
        isDeleted: false,
      },
      {
        id: 'FN-002',
        projectId,
        title: 'Deleted should be filtered',
        status: 'draft',
        priority: 'mid',
        isDeleted: true,
      },
    ]);
  },
};

const context = vm.createContext({
  window: {
    location: {
      search: '?projectId=P-FS4',
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
                              data: () => ({ status: 'active', role: 'viewer' }),
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
                        name: 'QA Functional Spec Project',
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
    STAM: {},
    STAMBoardList: {
      refresh(root) {
        calls.push({ method: 'refresh', root });
      },
    },
    renderStamIcon(name, options) {
      return '<svg data-icon="' + name + '" class="' + (options && options.className || '') + '"></svg>';
    },
    hydrateStamIcons() {},
  },
  document: {
    title: '',
    readyState: 'complete',
    addEventListener() {},
    getElementById(id) {
      if (id === 'fn-tbody') return tbody;
      if (id === 'fsl-srcbadge') return null;
      return null;
    },
    querySelector(selector) {
      if (selector === '[data-stam-board-list]') return tableRoot;
      if (selector === '.stam-board-count') return count;
      if (selector === '[data-stam-project-context]') return projectContext;
      if (selector === '[data-stam-topbar]') return topbar;
      if (selector === '[data-stam-left-nav]') return leftNav;
      if (selector === '.fn-page-hdr-title') return pageTitle;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.fn-ss-num') return summaryNums;
      if (selector === '.fn-ss-meta-val') return metaVals;
      return [];
    },
  },
  URLSearchParams,
  Promise,
  String,
  Array,
  Object,
  Error,
  Number,
  Math,
});

context.window.window = context.window;
context.window.document = context.document;
context.window.URLSearchParams = URLSearchParams;
context.window.Promise = Promise;

vm.runInContext(serviceSource, context, { filename: 'stam.functional-spec-service.js' });
vm.runInContext(messagesSource, context, { filename: 'stam.ui-messages.js' });
vm.runInContext(feedbackSource, context, { filename: 'stam.ui-feedback.js' });
Object.assign(context.window.STAM, {
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
});
context.window.STAM.functionalSpecFirestoreAdapter = {
  create() {
    return fakeAdapter;
  },
};
context.window.STAM.functionalSpecService = context.window.STAM.functionalSpecServiceContract.createService({
  adapter: fakeAdapter,
  authorize() {
    return false;
  },
});

vm.runInContext(listSource, context, { filename: 'stam.functional-spec-firestore-list.js' });
for (let i = 0; i < 20; i += 1) {
  await Promise.resolve();
}

const adapterCall = calls.find((call) => call.method === 'adapter.listByProject');
assert.equal(denyListCalls, 0, 'deny-by-default service must not be used after bindAuthorizedService');
assert.equal(boundListCalls, 1, 'role-bound service must call adapter listByProject');
assert.ok(adapterCall, 'expected adapter listByProject call');
assert.equal(adapterCall.projectId, 'P-FS4');
assert.equal(adapterCall.query.includeDeleted, false);
const loadedState = context.window.STAM.functionalSpecFirestoreList.getState();
assert.equal(loadedState.projectId, 'P-FS4');
assert.equal(loadedState.member.role, 'viewer');
assert.equal(loadedState.user.uid, 'qa-user');
assert.match(tbody.innerHTML, /FN_001|REQ_001/);
assert.doesNotMatch(tbody.innerHTML, /FN-002/);
assert.doesNotMatch(tbody.innerHTML, /<script>/);
assert.match(tbody.innerHTML, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
assert.match(tbody.innerHTML, /QA &amp; User/);
assert.doesNotMatch(tbody.innerHTML, /불러오지 못했습니다/);
const rowIds = [...tbody.innerHTML.matchAll(/data-fn-id="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(rowIds, ['FN-003', 'FN-001'], 'list must render newest updatedAt first');
assert.equal(summaryNums[0].textContent, 2);
assert.equal(context.window.STAM.functionalSpecFirestoreList.getState().items.length, 2);
assert.equal(context.window.STAM.functionalSpecFirestoreList.getState().items[0].id, 'FN-003');
assert.equal(context.window.STAM.functionalSpecFirestoreList.getState().items[1].id, 'FN-001');
assert.equal(
  context.window.STAM.functionalSpecFirestoreList.sortFunctionalSpecsByLatest([
    { id: 'A', updatedAt: '2026-07-01T00:00:00.000Z' },
    { id: 'B', createdAt: '2026-07-09T00:00:00.000Z' },
  ])[0].id,
  'B',
);
assert.equal(summaryNums[5].textContent, 1);
assert.equal(summaryNums[6].textContent, 1);
assert.match(count.innerHTML, /총 <b>2<\/b>건/);
assert.equal(projectContext.attrs['data-pc-title'], 'QA Functional Spec Project');
assert.equal(projectContext.attrs['data-pc-client'], 'QA Client');
assert.equal(projectContext.attrs['data-pc-role'], 'Viewer');
assert.equal(topbar.attrs['data-tb-crumbs'], '내 프로젝트|QA Functional Spec Project|기능정의서');
assert.equal(calls.find((call) => call.method === 'navRender.init').activeId, 'B5');
assert.equal(redirects.length, 0);
assert.equal(
  context.window.STAM.functionalSpecFirestoreList.formatFunctionalSpecCode({ id: 'abc123' }),
  '-',
);
tbody.innerHTML = '';
context.window.STAM.functionalSpecFirestoreList.renderRows([
  {
    id: 'abc123',
    code: 'FN_010',
    title: 'Sequenced code row',
    status: 'draft',
    priority: 'mid',
    functionType: 'view',
  },
]);
assert.match(tbody.innerHTML, /FN_010/);
assert.doesNotMatch(tbody.innerHTML, /<span class="fn-fn-id">abc123<\/span>/);
assert.match(tbody.innerHTML, /조회/);

tbody.innerHTML = '';
context.window.STAM.functionalSpecFirestoreList.renderRows([]);
assert.match(tbody.innerHTML, /등록된 기능정의가 없습니다/);
assert.match(tbody.innerHTML, /stam-table-feedback/);

console.log('functional spec list contract: PASS');
