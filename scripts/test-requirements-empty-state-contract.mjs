import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const listSource = await readFile(new URL('stam/js/stam.requirements-firestore-list.js', ROOT), 'utf8');
const cssSource = await readFile(new URL('stam/css/stam.requirements.css', ROOT), 'utf8');

const FORBIDDEN_UI_PHRASES = [
  'Firestore requirements',
  '현재 프로젝트의 Firestore requirements 목록이 비어 있습니다.',
  'Firebase Firestore',
  'Requirement Service',
];

for (const phrase of FORBIDDEN_UI_PHRASES) {
  assert.equal(listSource.includes(phrase), false, `forbidden UI phrase found: ${phrase}`);
}

assert.match(listSource, /emptyStateRow\(/);
assert.match(listSource, /등록된 요구사항이 없습니다/);
assert.match(listSource, /rq-empty-state/);
assert.match(cssSource, /\.rq-empty-state\s*\{/);
assert.match(cssSource, /min-height:\s*240px/);
assert.match(cssSource, /text-align:\s*center/);

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
const tableRoot = fakeElement();

const context = vm.createContext({
  window: {
    location: { search: '', replace() {} },
    sessionStorage: { getItem() { return ''; }, setItem() {} },
    STAM: {
      requirementsFirestoreList: {},
    },
    STAMBoardList: {
      refresh() {},
    },
    renderStamIcon(name, options) {
      return '<svg data-icon="' + name + '" class="' + (options && options.className || '') + '"></svg>';
    },
    hydrateStamIcons() {},
  },
  document: {
    readyState: 'complete',
    addEventListener() {},
    getElementById(id) {
      if (id === 'rq-tbody') return tbody;
      return null;
    },
    querySelector(selector) {
      if (selector === '[data-stam-board-list]') return tableRoot;
      if (selector === '.stam-board-count') return count;
      return null;
    },
    querySelectorAll() {
      return [];
    },
  },
  Promise,
  String,
  Array,
  Object,
});

context.window.window = context.window;
context.window.document = context.document;

vm.runInContext(listSource, context, { filename: 'stam.requirements-firestore-list.js' });

const emptyHtml = context.window.STAM.requirementsFirestoreList.emptyStateRow(
  '등록된 요구사항이 없습니다',
  '등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.'
);
assert.match(emptyHtml, /rq-empty-state/);
assert.match(emptyHtml, /rq-empty-state-title/);
assert.match(emptyHtml, /rq-empty-state-desc/);
assert.match(emptyHtml, /clipboard-check/);

context.window.STAM.requirementsFirestoreList.renderRows([]);
assert.match(tbody.innerHTML, /등록된 요구사항이 없습니다/);
assert.match(tbody.innerHTML, /rq-empty-state/);
assert.doesNotMatch(tbody.innerHTML, /Firestore/i);

console.log('requirements empty state contract: PASS');
