import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const messagesSource = await readFile(new URL('stam/js/stam.ui-messages.js', ROOT), 'utf8');
const feedbackSource = await readFile(new URL('stam/js/stam.ui-feedback.js', ROOT), 'utf8');
const listSource = await readFile(new URL('stam/js/stam.requirements-firestore-list.js', ROOT), 'utf8');
const componentsCssSource = await readFile(new URL('stam/css/stam.components.css', ROOT), 'utf8');

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
assert.match(listSource, /uiFeedback\(\)/);
assert.match(listSource, /uiMessages\(\)/);
assert.match(componentsCssSource, /\.stam-table-feedback\s*\{/);
assert.match(componentsCssSource, /text-align:\s*center/);

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
  Number,
  Math,
});

context.window.window = context.window;
context.window.document = context.document;

vm.runInContext(messagesSource, context, { filename: 'stam.ui-messages.js' });
vm.runInContext(feedbackSource, context, { filename: 'stam.ui-feedback.js' });
vm.runInContext(listSource, context, { filename: 'stam.requirements-firestore-list.js' });

const emptyHtml = context.window.STAM.requirementsFirestoreList.emptyStateRow(
  context.window.STAM.uiMessages.requirements.emptyTitle,
  context.window.STAM.uiMessages.requirements.emptyDesc,
);
assert.match(emptyHtml, /stam-table-feedback/);
assert.match(emptyHtml, /stam-table-feedback-title/);
assert.match(emptyHtml, /stam-table-feedback-desc/);
assert.match(emptyHtml, /clipboard-check/);

context.window.STAM.requirementsFirestoreList.renderRows([]);
assert.match(tbody.innerHTML, /등록된 요구사항이 없습니다/);
assert.match(tbody.innerHTML, /stam-table-feedback/);
assert.doesNotMatch(tbody.innerHTML, /Firestore/i);

console.log('requirements empty state contract: PASS');
