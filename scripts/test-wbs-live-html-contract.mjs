#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = await readFile(path.join(ROOT, 'stam/pages/boards/wbs.html'), 'utf8');
const wbsJs = await readFile(path.join(ROOT, 'stam/js/stam.wbs.js'), 'utf8');
const wbsListJs = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-list.js'), 'utf8');
const messagesSource = await readFile(path.join(ROOT, 'stam/js/stam.ui-messages.js'), 'utf8');
const wbsCss = await readFile(path.join(ROOT, 'stam/css/stam.wbs.css'), 'utf8');
const customSelectCss = await readFile(path.join(ROOT, 'stam/css/stam.custom-select.css'), 'utf8');
const tableSelectionCss = await readFile(path.join(ROOT, 'stam/css/stam.table-selection.css'), 'utf8');

function ruleBlock(css, selector) {
  const parts = selector.split(',').map((part) => part.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const selectorRe = parts.join('\\s*,\\s*');
  const match = css.match(new RegExp(selectorRe + '\\s*\\{([^}]*)\\}', 'm'));
  assert.ok(match, `missing CSS rule block: ${selector}`);
  return match[1];
}

function mediaBlock(css, maxWidth) {
  const match = css.match(
    new RegExp('@media\\s*\\(max-width:\\s*' + maxWidth + 'px\\)\\s*\\{([\\s\\S]*?)\\n\\}', 'm')
  );
  assert.ok(match, `missing @media (max-width: ${maxWidth}px) block`);
  return match[1];
}

function assertDecl(block, pattern, label) {
  assert.match(block, pattern, label || `expected declaration in block: ${pattern}`);
}

function count(re) {
  return (html.match(re) || []).length;
}

const scriptOrder = [
  'stam.icons.js',
  'stam.ui-messages.js',
  'stam.ui-feedback.js',
  'stam.theme.js',
  'stam.nav-data.js',
  'stam.shell.js',
  'stam.nav-render.js',
  'stam.topbar-render.js',
  'stam.project-context-guard.js',
  'stam.project-context-render.js',
  'stam.board-filter.js',
  'stam.wbs.js',
  '/__/firebase/8.10.1/firebase-app.js',
  '/__/firebase/8.10.1/firebase-auth.js',
  '/__/firebase/8.10.1/firebase-firestore.js',
  '/__/firebase/init.js',
  'stam.wbs-firestore-adapter.js',
  'stam.wbs-service.js',
  'stam.requirements-firestore-adapter.js',
  'stam.requirements-service.js',
  'stam.functional-spec-firestore-adapter.js',
  'stam.functional-spec-service.js',
  'stam.reference-picker.js',
  'stam.requirement-picker.js',
  'stam.functional-spec-picker.js',
  'stam.project-member-read-service.js',
  'stam.project-member-picker.js',
  'stam.wbs-firestore-list.js',
  'stam.wbs-firestore-crud.js',
];

const scriptTags = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
let last = -1;
for (const src of scriptOrder) {
  const idx = scriptTags.findIndex((tag, i) => i > last && tag.includes(src));
  assert.ok(idx >= 0, `missing script ${src}`);
  last = idx;
}

assert.match(html, /data-stam-wbs-live="true"/);
assert.doesNotMatch(html, /stam\.core-db-schema\.js/);
assert.doesNotMatch(html, /stam\.local-core-db\.js/);
assert.doesNotMatch(html, /stam\.wbs-cycle\.js/);
assert.doesNotMatch(html, /stam\.wbs-crud\.js/);
assert.doesNotMatch(html, /wbs-v2-section/);
assert.doesNotMatch(html, /wbs-v2-tbody/);
assert.doesNotMatch(html, /Local Core DB v2/);
assert.equal(count(/data-wbs-id="WBS-/g), 0);
assert.equal(count(/<tr class="wbs-data-row/g), 0);
assert.match(html, /id="wbs-live-feedback-host"/);
assert.equal(count(/<th[\s>]/g), 22);
assert.equal(count(/data-wbs-field="businessArea"/g), 2);
assert.equal(count(/data-wbs-field="progress"/g), 4);
assert.equal(count(/data-stam-requirement-picker/g), 2);
assert.equal(count(/data-stam-functional-spec-picker/g), 2);
assert.equal(count(/data-stam-wbs-member-picker="owner"/g), 2);
assert.equal(count(/data-stam-wbs-member-picker="reviewer"/g), 2);
assert.doesNotMatch(html, /검토중/);
assert.match(html, /관련 기능정의/);
assert.doesNotMatch(html, /관련 화면설계/);
assert.doesNotMatch(html, /클로드|이서연|김기획|박PM|최개발|정디자인/);
assert.doesNotMatch(html, /WBS-007|WBS-017/);
assert.match(html, /id="wbs-import-btn"[^>]*disabled/);
assert.match(html, /id="wbs-export-btn"[^>]*disabled/);
assert.match(html, /id="wbs-delete-btn"[^>]*disabled/);
assert.match(html, /id="wbs-gantt-fullview-btn"[^>]*disabled/);
assert.match(html, /댓글 기능은 1차 범위에서 제공하지 않습니다/);
assert.match(html, /변경이력 기능은 아직 제공되지 않습니다/);
assert.doesNotMatch(html, /firebaseConfig/);
assert.doesNotMatch(html, /initializeApp\(/);
assert.doesNotMatch(html, /onclick=/);
assert.doesNotMatch(html, /<style[\s>]/);
assert.doesNotMatch(html, /<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/);

assert.doesNotMatch(html, /2026-06-07 10:42/);
assert.doesNotMatch(html, /2026-05-01 ~ 2026-07-31/);
assert.doesNotMatch(html, /91일 · 17건/);
assert.doesNotMatch(html, /wbs-pct-35/);
assert.match(html, /data-stam-wbs-overall-progress/);
assert.match(html, /data-wbs-detail="updatedAtFooter"/);
const deleteBtnTag = html.match(/id="wbs-delete-btn"[^>]*>/)?.[0] || '';
assert.equal((deleteBtnTag.match(/\sdisabled(?:\s|>|=)/g) || []).length, 1);
assert.equal(count(/\sstyle="/g), 0);

assert.doesNotMatch(wbsJs, /최종 변경 2026-06-07/);
assert.doesNotMatch(wbsJs, /<span style=/);
assert.doesNotMatch(wbsJs, /\.style\.width\s*=/);
assert.doesNotMatch(wbsJs, /wbs-pct-\s*['"]?\s*\+/);
assert.match(wbsJs, /handleLiveFvEdit/);
assert.match(wbsJs, /var effectiveMode = live \? 'detail' : mode/);
assert.doesNotMatch(html, /data-stam-wbs-link-trigger>\s*disabled/);
assert.doesNotMatch(html, /title="1차 범위 외"\+/);

const detailFvBtn = html.match(/<div class="wbs-detail-footer-slot">[\s\S]*?(<button[^>]*wbs-fv-trigger-btn[^>]*>)/)?.[1] || '';
const editFvBtn = html.match(/<div class="wbs-edit-footer-slot">[\s\S]*?(<button[^>]*wbs-fv-trigger-btn[^>]*>)/)?.[1] || '';
const createFvBtn = html.match(/<div class="wbs-create-footer-slot">[\s\S]*?(<button[^>]*wbs-fv-trigger-btn[^>]*>)/)?.[1] || '';
assert.equal((detailFvBtn.match(/\sdisabled(?:\s|>|=)/g) || []).length, 0, 'detail Full View must stay enabled');
assert.equal((editFvBtn.match(/\sdisabled(?:\s|>|=)/g) || []).length, 1, 'edit Full View must be disabled');
assert.equal((createFvBtn.match(/\sdisabled(?:\s|>|=)/g) || []).length, 1, 'create Full View must be disabled');
assert.match(editFvBtn, /title="전체 보기는 상세 화면에서 확인할 수 있습니다\."/);
assert.match(createFvBtn, /title="전체 보기는 상세 화면에서 확인할 수 있습니다\."/);

const fixtureItem = {
  code: 'WBS-099',
  title: 'Mirror task',
  phase: '구현',
  businessArea: 'Auth',
  functionGroup: 'Login',
  screenPath: '/login',
  status: 'in_progress',
  priority: 'high',
  ownerName: 'Owner One',
  reviewerName: 'Reviewer Two',
  startDate: '2026-07-01',
  endDate: '2026-07-10',
  plannedEffort: 5,
  actualEffort: 3,
  progress: 37,
  requirementCode: 'REQ-001',
  requirementTitle: 'Login requirement',
  functionalSpecCode: 'FN-001',
  functionalSpecTitle: 'Login spec',
  description: 'Work desc',
  updatedAt: '2026-07-14',
};
const xssItem = Object.assign({}, fixtureItem, {
  title: '<script>alert(1)</script>',
  ownerName: '<img onerror=1>',
  description: '"><svg onload=1>',
});

function makeDomEl() {
  return {
    setAttribute() {},
    getAttribute() { return ''; },
    removeAttribute() {},
    textContent: '',
    innerHTML: '',
    disabled: false,
    hidden: false,
    addEventListener() {},
    appendChild() {},
    contains() { return false; },
    matches() { return false; },
    closest() { return null; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { bottom: 0, left: 0, width: 100 }; },
    style: {},
  };
}
const wbsDomReady = [];
const wbsContext = vm.createContext({
  console,
  window: {
    STAM: {
      wbsFirestoreList: {
        statusInfo() { return { label: '진행중', cls: 'wc-prog' }; },
        priorityInfo() { return { label: '높음', cls: 'wp-high' }; },
        deriveScheduleState() { return { verdict: '진행중', verdictCls: 'wc-prog' }; },
      },
      boardFilter: { init() { return {}; } },
      navRender: { init() {} },
    },
    scrollTo() {},
  },
  document: {
    querySelector(sel) {
      if (sel === '[data-stam-wbs-live="true"]') return { getAttribute: () => 'true' };
      return null;
    },
    querySelectorAll() { return []; },
    getElementById() { return makeDomEl(); },
    createElement() { return makeDomEl(); },
    addEventListener(evt, fn) {
      if (evt === 'DOMContentLoaded') wbsDomReady.push(fn);
    },
    readyState: 'loading',
    body: { style: {} },
    documentElement: { getAttribute() { return ''; } },
  },
  Date, String, Number, Math, Array, Object,
});
wbsContext.window.window = wbsContext.window;
wbsContext.window.document = wbsContext.document;
vm.runInContext(wbsJs, wbsContext, { filename: 'stam.wbs.js' });
wbsContext.document.readyState = 'complete';
wbsDomReady.forEach((fn) => fn());
const buildFv = wbsContext.window.STAM.wbsUi.buildFullViewDetail;
const fixtureHtml = buildFv(fixtureItem);
for (const token of [
  'Owner One', 'Reviewer Two', '구현', 'Auth', 'Login', '/login',
  '2026-07-01', '2026-07-10', '5일', '3일', 'REQ-001', 'Login requirement',
  'FN-001', 'Login spec', 'Work desc', '2026-07-14', '37%',
]) {
  assert.match(fixtureHtml, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
const xssHtml = buildFv(xssItem);
assert.doesNotMatch(xssHtml, /<script>/);
assert.doesNotMatch(xssHtml, /<img onerror/);
assert.match(xssHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

/* ── WBS Live visual baseline (stam.wbs.css) ── */
assert.doesNotMatch(wbsCss, /clamp\(520px,\s*calc\(\(100vw\s*-\s*var\(--sw/);
assert.doesNotMatch(wbsCss, /clamp\(560px,\s*50vw,\s*940px\)/);
assert.doesNotMatch(wbsCss, /\.wbs-create-body,\s*\n\.wbs-edit-body\s*\{[^}]*padding:\s*12px\s*!important/);

const drawerPanelBlock = ruleBlock(wbsCss, '.wbs-drawer-panel');
assertDecl(drawerPanelBlock, /width:\s*min\(840px,\s*calc\(100%\s*-\s*32px\)\)/, 'desktop drawer width baseline');
assertDecl(drawerPanelBlock, /max-width:\s*840px/, 'desktop drawer max-width');

const drawerHeadBlock = ruleBlock(wbsCss, '.wbs-drawer-head');
assertDecl(drawerHeadBlock, /padding:\s*16px\s+24px\s+14px/, 'drawer head desktop padding');

const drawerBodyBlock = ruleBlock(wbsCss, '.wbs-drawer-body');
assertDecl(drawerBodyBlock, /padding:\s*20px\s+24px/, 'drawer body desktop padding');
assertDecl(drawerBodyBlock, /gap:\s*12px/, 'drawer body section gap');

const drawerFooterBlock = ruleBlock(wbsCss, '.wbs-drawer-footer');
assertDecl(drawerFooterBlock, /padding:\s*12px\s+24px/, 'drawer footer desktop padding');
assertDecl(drawerFooterBlock, /gap:\s*8px/, 'drawer footer button gap');

const formInputBlock = ruleBlock(wbsCss, '.wbs-drawer-form-input, .wbs-drawer-form-select');
assertDecl(formInputBlock, /height:\s*38px/, 'drawer form input height');
assertDecl(formInputBlock, /box-sizing:\s*border-box/, 'drawer form input box-sizing');

const dpTriggerBlock = ruleBlock(wbsCss, '.wbs-dp-trigger');
assertDecl(dpTriggerBlock, /height:\s*38px/, 'date picker trigger height');

const formRowInputBlock = ruleBlock(wbsCss, '.wbs-form-row .wbs-drawer-form-input, .wbs-form-row .wbs-drawer-form-select');
assertDecl(formRowInputBlock, /height:\s*38px/, 'form-row input height cascade');

const pickerTriggerBlock = ruleBlock(customSelectCss, '.stam-cs-trigger');
assertDecl(pickerTriggerBlock, /height:\s*38px/, 'reference picker trigger height from common custom-select CSS');

assert.doesNotMatch(
  wbsCss,
  /\.wbs-form-row\s+\.stam-cs-trigger[\s\S]*?height:\s*38px/,
  'wbs.css must not duplicate reference picker trigger height',
);
assert.doesNotMatch(
  wbsCss,
  /\[data-stam-reference-picker-toggle\][\s\S]*?height:\s*38px/,
  'wbs.css must not duplicate reference picker toggle height',
);

const wbsSelMenuBlock = ruleBlock(wbsCss, '.wbs-sel-menu');
assertDecl(wbsSelMenuBlock, /z-index:\s*200/, 'phase portal menu z-index');
assert.doesNotMatch(wbsSelMenuBlock, /padding:/, 'wbs-sel-menu must not duplicate menu padding');
assert.doesNotMatch(wbsSelMenuBlock, /max-height:/, 'wbs-sel-menu must not duplicate menu max-height');

const mobile640 = mediaBlock(wbsCss, 640);
assertDecl(mobile640, /\.wbs-drawer-panel\s*\{[^}]*width:\s*100%/, 'mobile drawer full width');
assertDecl(mobile640, /\.wbs-form-body\s*\{[^}]*grid-template-columns:\s*1fr/, 'mobile form single column');
assertDecl(mobile640, /\.wbs-drawer-head\s*\{[^}]*padding-left:\s*16px/, 'mobile drawer head padding');
assertDecl(mobile640, /\.wbs-drawer-body\s*\{[^}]*padding-left:\s*16px/, 'mobile drawer body padding');

assert.equal(count(/\sstyle="/g), 0, 'html inline style must stay 0');

/* ── WBS list checkbox common contract (.stam-check / .stam-check-cell) ── */
assert.match(html, /<th class="wbs-th-chk stam-check-cell">/);
const headerChkTag = html.match(/<th class="wbs-th-chk stam-check-cell">[\s\S]*?<\/th>/)?.[0] || '';
assert.match(headerChkTag, /class="wbs-chk-all stam-check"/);
assert.match(headerChkTag, /id="wbs-chk-all"/);
assert.doesNotMatch(html, /class="wbs-chk(?:\s|")/);
assert.doesNotMatch(html, /\swbs-chk(?:\s|")/);

assert.match(wbsListJs, /class="wbs-row-chk stam-check"/);
assert.match(wbsListJs, /stam-check-cell/);
assert.doesNotMatch(wbsListJs, /class="wbs-chk(?:\s|")/);
assert.doesNotMatch(wbsListJs, /\swbs-chk(?:\s|")/);

assert.match(messagesSource, /filterEmptyTitle: '조건에 맞는 WBS 작업이 없습니다'/);
assert.match(wbsListJs, /isItemDelayed/);
assert.match(wbsListJs, /dominantStatus/);

assert.doesNotMatch(wbsCss, /\.wbs-chk\b/);
assert.match(tableSelectionCss, /\.stam-check\b/);
assert.match(tableSelectionCss, /\.stam-check-cell\b/);

console.log('wbs live html contract: PASS');
