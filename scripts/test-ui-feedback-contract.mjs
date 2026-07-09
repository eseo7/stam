import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);

const messagesSource = await readFile(new URL('stam/js/stam.ui-messages.js', ROOT), 'utf8');
const feedbackSource = await readFile(new URL('stam/js/stam.ui-feedback.js', ROOT), 'utf8');
const requirementsListSource = await readFile(new URL('stam/js/stam.requirements-firestore-list.js', ROOT), 'utf8');
const functionalListSource = await readFile(new URL('stam/js/stam.functional-spec-firestore-list.js', ROOT), 'utf8');
const requirementsPageSource = await readFile(new URL('stam/pages/boards/requirements.html', ROOT), 'utf8');
const functionalPageSource = await readFile(new URL('stam/pages/boards/functional-specification.html', ROOT), 'utf8');
const componentsCssSource = await readFile(new URL('stam/css/stam.components.css', ROOT), 'utf8');

const FORBIDDEN_UI_PHRASES = [
  'Firestore requirements',
  '현재 프로젝트의 Firestore requirements 목록이 비어 있습니다.',
  'Firebase Firestore',
  'Requirement Service',
  'Firestore에서 목록을 읽어오고 있습니다.',
];

for (const source of [requirementsListSource, functionalListSource, feedbackSource, messagesSource]) {
  for (const phrase of FORBIDDEN_UI_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden UI phrase found: ${phrase}`);
  }
}

assert.match(messagesSource, /STAM\.uiMessages\s*=\s*\{/);
assert.match(messagesSource, /common:\s*\{/);
assert.match(messagesSource, /requirements:\s*\{/);
assert.match(messagesSource, /functionalSpec:\s*\{/);
assert.match(messagesSource, /emptyTitle:\s*'등록된 요구사항이 없습니다'/);
assert.match(messagesSource, /emptyTitle:\s*'등록된 기능정의가 없습니다'/);

assert.match(feedbackSource, /tableEmptyRow/);
assert.match(feedbackSource, /tableLoadingRow/);
assert.match(feedbackSource, /tableErrorRow/);
assert.match(feedbackSource, /tableMessageRow/);
assert.match(feedbackSource, /\.replace\(\/&\/g, '&amp;'\)/);

assert.match(requirementsListSource, /uiFeedback\(\)/);
assert.match(requirementsListSource, /uiMessages\(\)/);
assert.doesNotMatch(requirementsListSource, /function emptyStateIconHtml/);
assert.doesNotMatch(requirementsListSource, /<tr class="rq-empty-row/);

assert.match(functionalListSource, /uiFeedback\(\)/);
assert.match(functionalListSource, /uiMessages\(\)/);
assert.doesNotMatch(functionalListSource, /<tr class="fn-empty-row/);

assert.match(requirementsPageSource, /stam\.ui-messages\.js/);
assert.match(requirementsPageSource, /stam\.ui-feedback\.js/);
assert.match(functionalPageSource, /stam\.ui-messages\.js/);
assert.match(functionalPageSource, /stam\.ui-feedback\.js/);

assert.match(componentsCssSource, /\.stam-table-feedback\s*\{/);
assert.match(componentsCssSource, /\.stam-table-feedback-row td/);

function bootFeedbackContext(extraWindow) {
  const context = vm.createContext({
    window: Object.assign({
      STAM: {},
      renderStamIcon(name, options) {
        return '<svg data-icon="' + name + '" class="' + (options && options.className || '') + '"></svg>';
      },
      hydrateStamIcons() {},
    }, extraWindow || {}),
    document: {
      readyState: 'complete',
      addEventListener() {},
    },
    Promise,
    String,
    Array,
    Object,
    Number,
    Math,
  });
  context.window.window = context.window;
  vm.runInContext(messagesSource, context, { filename: 'stam.ui-messages.js' });
  vm.runInContext(feedbackSource, context, { filename: 'stam.ui-feedback.js' });
  return context;
}

const feedbackCtx = bootFeedbackContext();
const { uiFeedback, uiMessages } = feedbackCtx.window.STAM;

assert.ok(uiFeedback.tableEmptyRow);
assert.ok(uiFeedback.tableLoadingRow);
assert.ok(uiFeedback.tableErrorRow);
assert.ok(uiFeedback.tableMessageRow);

const xssTitle = '<img src=x onerror=alert(1)>';
const emptyHtml = uiFeedback.tableEmptyRow({
  colspan: 9,
  title: xssTitle,
  description: 'desc & more',
  icon: 'clipboard-check',
});
assert.match(emptyHtml, /stam-table-feedback-row--empty/);
assert.match(emptyHtml, /stam-table-feedback-title/);
assert.match(emptyHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);
assert.match(emptyHtml, /desc &amp; more/);
assert.match(emptyHtml, /clipboard-check/);
assert.doesNotMatch(emptyHtml, /<img src=x/);

const loadingHtml = uiFeedback.tableLoadingRow({
  colspan: 5,
  title: uiMessages.common.loading.title,
  description: uiMessages.common.loading.description,
});
assert.match(loadingHtml, /stam-table-feedback-row--loading/);
assert.match(loadingHtml, /colspan="5"/);
assert.doesNotMatch(loadingHtml, /stam-table-feedback-icon/);

const errorHtml = uiFeedback.tableErrorRow({
  colspan: 9,
  title: uiMessages.common.networkError.title,
  description: uiMessages.common.networkError.description,
});
assert.match(errorHtml, /stam-table-feedback-row--error/);

const invalidVariantHtml = uiFeedback.tableMessageRow({
  colspan: 9,
  title: 'safe',
  description: 'safe',
  variant: '"><script>alert(1)</script>',
});
assert.match(invalidVariantHtml, /stam-table-feedback-row--status/);
assert.doesNotMatch(invalidVariantHtml, /<script>/);

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

const listContext = vm.createContext({
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

listContext.window.window = listContext.window;
listContext.window.document = listContext.document;

vm.runInContext(messagesSource, listContext, { filename: 'stam.ui-messages.js' });
vm.runInContext(feedbackSource, listContext, { filename: 'stam.ui-feedback.js' });
vm.runInContext(requirementsListSource, listContext, { filename: 'stam.requirements-firestore-list.js' });

const listEmptyHtml = listContext.window.STAM.requirementsFirestoreList.emptyStateRow(
  listContext.window.STAM.uiMessages.requirements.emptyTitle,
  listContext.window.STAM.uiMessages.requirements.emptyDesc,
);
assert.match(listEmptyHtml, /stam-table-feedback/);
assert.match(listEmptyHtml, /등록된 요구사항이 없습니다/);

listContext.window.STAM.requirementsFirestoreList.renderRows([]);
assert.match(tbody.innerHTML, /등록된 요구사항이 없습니다/);
assert.match(tbody.innerHTML, /stam-table-feedback/);
assert.doesNotMatch(tbody.innerHTML, /Firestore/i);

console.log('ui feedback contract: PASS');
