import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const guardPath = path.join(ROOT, 'stam/js/stam.project-context-guard.js');
const navRenderPath = path.join(ROOT, 'stam/js/stam.nav-render.js');
const guardSource = await readFile(guardPath, 'utf8');
const navRenderSource = await readFile(navRenderPath, 'utf8');

assert.match(guardSource, /getSelectedProjectId/);
assert.match(guardSource, /getSelectedProjectName/);
assert.match(guardSource, /requireProjectContext/);
assert.match(guardSource, /withProjectId/);
assert.match(guardSource, /stam:selectedProjectId/);
assert.match(guardSource, /stam:selectedProjectName/);
assert.match(guardSource, /\/pages\/auth\/projects\.html/);
assert.match(guardSource, /isAuthPath/);
assert.match(guardSource, /getQueryProjectId\(\)/);
assert.match(guardSource, /history\.replaceState/);
assert.equal(/db\.collection|firebase\.firestore|requirementsService/.test(guardSource), false);

assert.match(navRenderSource, /withProjectId/);
assert.match(navRenderSource, /planned.*admin.*hidden|status === 'planned'/);

const livePages = [
  'stam/pages/dashboard/project-overview.html',
  'stam/pages/boards/requirements.html',
  'stam/pages/boards/menu-screen-list.html',
  'stam/pages/boards/wbs.html',
  'stam/pages/boards/screen-specification.html',
];
for (const rel of livePages) {
  const html = await readFile(path.join(ROOT, rel), 'utf8');
  assert.match(html, /stam\.project-context-guard\.js/, `${rel} must include guard script`);
}

const navDataDiff = execSync('git diff --name-only HEAD -- stam/js/stam.nav-data.js', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
assert.equal(navDataDiff, '', 'stam/js/stam.nav-data.js must not be modified');

const gateDiff = execSync('git diff --name-only HEAD -- stam/js/stam.auth-membership-gate.js', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
assert.equal(gateDiff, '', 'stam/js/stam.auth-membership-gate.js must not be modified');

function createGuardContext(options) {
  options = options || {};
  const storage = Object.assign({}, options.storage || {});
  const redirects = [];
  const replaceStates = [];
  let href = options.href || 'https://example.test/pages/boards/requirements.html';
  const location = {
    pathname: options.pathname || '/pages/boards/requirements.html',
    search: options.search || '',
    hash: options.hash || '',
    get href() { return href; },
    set href(value) { href = value; },
    replace(path) { redirects.push(path); },
  };

  const context = vm.createContext({
    window: {
      location: location,
      history: {
        replaceState(_state, _title, url) {
          replaceStates.push(url);
          if (typeof url === 'string' && url.indexOf('?') >= 0) {
            location.search = url.slice(url.indexOf('?'));
          } else if (typeof url === 'string') {
            location.search = '';
          }
        },
      },
      sessionStorage: {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
        },
        setItem(key, value) {
          storage[key] = String(value);
        },
      },
      STAM: {},
    },
    document: {
      readyState: 'complete',
      addEventListener() {},
    },
    URLSearchParams,
    String,
    Object,
    encodeURIComponent,
  });

  context.window.window = context.window;
  context.window.document = context.document;
  context.window.URLSearchParams = URLSearchParams;
  context.window.encodeURIComponent = encodeURIComponent;

  vm.runInContext(guardSource, context, { filename: 'stam.project-context-guard.js' });
  return { context, storage, redirects, replaceStates, location };
}

const urlPriority = createGuardContext({
  search: '?projectId=from-url',
  storage: { 'stam:selectedProjectId': 'from-storage', 'stam:selectedProjectName': 'Stored Name' },
});
assert.equal(urlPriority.context.window.STAM.projectContextGuard.getSelectedProjectId(), 'from-url');
assert.equal(urlPriority.storage['stam:selectedProjectId'], 'from-url');

const syncStorage = createGuardContext({
  search: '',
  storage: { 'stam:selectedProjectId': 'stored-only', 'stam:selectedProjectName': 'Stored Only' },
});
assert.equal(syncStorage.context.window.STAM.projectContextGuard.requireProjectContext(), 'stored-only');
assert.equal(syncStorage.redirects.length, 0);
assert.ok(syncStorage.replaceStates.some((url) => String(url).indexOf('projectId=stored-only') >= 0));

const missing = createGuardContext({ search: '', storage: {} });
missing.context.window.STAM.projectContextGuard.requireProjectContext();
assert.equal(missing.redirects[0], '/pages/auth/projects.html');

const authPage = createGuardContext({
  pathname: '/pages/auth/projects.html',
  search: '',
  storage: {},
});
authPage.context.window.STAM.projectContextGuard.requireProjectContext();
assert.equal(authPage.redirects.length, 0);

const withId = createGuardContext({
  search: '?projectId=p321',
  storage: { 'stam:selectedProjectId': 'p321', 'stam:selectedProjectName': 'Demo' },
});
const href = withId.context.window.STAM.projectContextGuard.withProjectId('../../pages/boards/wbs.html');
assert.match(href, /projectId=p321/);

console.log('project context guard contract: PASS');
