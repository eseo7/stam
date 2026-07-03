import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const shellSource = await readFile(new URL('stam/js/stam.shell.js', ROOT), 'utf8');
const navRenderSource = await readFile(new URL('stam/js/stam.nav-render.js', ROOT), 'utf8');
const shellCss = await readFile(new URL('stam/css/stam.shell.css', ROOT), 'utf8');

const LIVE_IDS = ['A1', 'B1', 'B2', 'B3', 'B4'];
const PREVIEW_IDS = ['B5', 'B8', 'B9', 'B10', 'C8', 'E7'];
const ADMIN_IDS = ['F3', 'F4', 'F11'];
const HIDDEN_IDS = ['B6', 'B7'];

assert.match(shellSource, /LIVE_MENU_IDS/);
for (const id of LIVE_IDS) {
  assert.match(shellSource, new RegExp(id + ': 1'));
}

assert.match(shellSource, /menuStatusFor\(/);
assert.match(shellSource, /data-status/);
assert.match(shellSource, /is-live/);
assert.match(shellSource, /is-preview/);
assert.match(shellSource, /is-planned/);
assert.match(shellSource, /is-admin-only/);
assert.match(shellSource, /is-hidden/);

for (const id of PREVIEW_IDS) {
  assert.match(shellSource, new RegExp('PREVIEW_MENU_IDS[\\s\\S]*' + id + ': 1'));
}
for (const id of ADMIN_IDS) {
  assert.match(shellSource, new RegExp('ADMIN_MENU_IDS[\\s\\S]*' + id + ': 1'));
}

assert.match(navRenderSource, /data-status/);
assert.match(navRenderSource, /planned.*admin.*hidden|status === 'planned'/);
assert.match(navRenderSource, /if \(status === 'planned' \|\| status === 'admin' \|\| status === 'hidden'\) return;/);

assert.match(shellCss, /\.gitem\.is-live\s*\{/);
assert.match(shellCss, /\.gitem\.is-preview\s*\{/);
assert.match(shellCss, /\.gitem\.is-planned\s*\{/);
assert.match(shellCss, /\.gitem\.is-admin-only/);
assert.match(shellCss, /\.gitem\.is-hidden/);

const navDataDiff = execSync('git diff --name-only HEAD -- stam/js/stam.nav-data.js', {
  cwd: new URL('../', import.meta.url),
  encoding: 'utf8',
}).trim();
assert.equal(navDataDiff, '', 'stam/js/stam.nav-data.js must not be modified');

const navEl = {
  listeners: {},
  innerHTML: '',
  querySelector(sel) {
    if (sel === '#po-sidebar-nav') return this;
    if (sel === '#po-nav-search') return { value: '' };
    return null;
  },
};
navEl.addEventListener = function (type, fn) {
  this.listeners[type] = fn;
};

const container = {
  innerHTML: '',
  getAttribute() { return ''; },
  querySelector(sel) {
    if (sel === '#po-sidebar-nav') return navEl;
    if (sel === '#po-nav-search') return { value: '' };
    return null;
  },
};

const menus = [
  { id: 'B1', g: 'B', n: '요구사항정의서', s: '', href: 'pages/boards/requirements.html' },
  { id: 'B5', g: 'B', n: '기능정의서', s: '', href: 'pages/boards/functional-specification.html' },
  { id: 'A2', g: 'A', n: 'My Work', s: '' },
  { id: 'F3', g: 'F', n: '산출물 접근권한', s: '' },
  { id: 'B6', g: 'B', n: '프로그램 목록정의서', s: '' },
];

const context = vm.createContext({
  window: {
    location: { href: '' },
    STAM: {
      data: { menus },
      shell: {
        renderSidebar(el) {
          el.innerHTML =
            '<div class="gitem is-live" data-id="B1" data-status="live"></div>' +
            '<div class="gitem is-preview" data-id="B5" data-status="preview"></div>' +
            '<div class="gitem is-planned" data-id="A2" data-status="planned"></div>' +
            '<div class="gitem is-admin-only" data-id="F3" data-status="admin"></div>' +
            '<div class="gitem is-hidden" data-id="B6" data-status="hidden"></div>';
        },
        initSearch() {},
      },
    },
  },
  document: {
    querySelector(sel) {
      if (sel === '[data-stam-left-nav]') return container;
      return null;
    },
  },
  console,
});

context.window.window = context.window;
context.window.document = context.document;

vm.runInContext(navRenderSource, context, { filename: 'stam.nav-render.js' });
context.window.STAM.navRender.init('B1');

const hrefMap = { B1: '../../pages/boards/requirements.html', B5: '../../pages/boards/functional-specification.html' };
let navigated = '';

function clickItem(status, id) {
  navigated = '';
  context.window.location.href = '';
  const handler = navEl.listeners.click;
  assert.ok(handler, 'nav click handler missing');
  handler({
    target: {
      closest(sel) {
        if (sel === '.gitem[data-id]') {
          return {
            getAttribute(name) {
              if (name === 'data-status') return status;
              if (name === 'data-id') return id;
              return '';
            },
          };
        }
        return null;
      },
    },
    stopPropagation() {},
  });
  navigated = context.window.location.href;
}

clickItem('planned', 'A2');
assert.equal(navigated, '');
clickItem('admin', 'F3');
assert.equal(navigated, '');
clickItem('hidden', 'B6');
assert.equal(navigated, '');

clickItem('live', 'B1');
assert.equal(navigated, hrefMap.B1);
clickItem('preview', 'B5');
assert.equal(navigated, hrefMap.B5);

console.log('nav live dimmed contract: PASS');
