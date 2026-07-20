#!/usr/bin/env node
/**
 * STAM ScreenSpec-3 — Screen spec picker compatibility contract
 *
 * Usage:
 *   node scripts/test-screen-spec-picker-compat-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const sources = {
  reference: 'stam/js/stam.reference-picker.js',
  requirementsService: 'stam/js/stam.requirements-service.js',
  requirementPicker: 'stam/js/stam.requirement-picker.js',
  functionalSpecService: 'stam/js/stam.functional-spec-service.js',
  functionalSpecPicker: 'stam/js/stam.functional-spec-picker.js',
  wbsService: 'stam/js/stam.wbs-service.js',
  wbsPicker: 'stam/js/stam.wbs-picker.js',
  projectMemberReadService: 'stam/js/stam.project-member-read-service.js',
  projectMemberPicker: 'stam/js/stam.project-member-picker.js',
  screenSpecService: 'stam/js/stam.screen-spec-service.js',
};

for (const [key, filePath] of Object.entries(sources)) {
  const content = await readFile(path.join(ROOT, filePath), 'utf8');
  assert.ok(content, `${filePath} must exist`);
  sources[key] = content;
}

assert.doesNotMatch(sources.requirementPicker, /wbs-picker\.js|screen-spec-picker\.js/);

function createDom() {
  let idSeq = 0;

  function makeEl(tag) {
    const el = {
      tagName: String(tag || 'div').toUpperCase(),
      attributes: {},
      classList: {
        _set: new Set(),
        add(...names) { names.forEach((n) => this._set.add(n)); },
        remove(...names) { names.forEach((n) => this._set.delete(n)); },
        toggle(name, force) {
          if (force === true) this._set.add(name);
          else if (force === false) this._set.delete(name);
          else if (this._set.has(name)) this._set.delete(name);
          else this._set.add(name);
        },
        contains(name) { return this._set.has(name); },
      },
      children: [],
      childNodes: [],
      hidden: false,
      disabled: false,
      value: '',
      textContent: '',
      innerHTML: '',
      parentNode: null,
      listeners: {},
      _id: `n${++idSeq}`,
    };
    el.appendChild = (child) => {
      child.parentNode = el;
      el.children.push(child);
      el.childNodes.push(child);
      return child;
    };
    el.setAttribute = (name, value) => { el.attributes[name] = String(value); };
    el.getAttribute = (name) => (name in el.attributes ? el.attributes[name] : null);
    el.removeAttribute = (name) => { delete el.attributes[name]; };
    el.querySelector = (sel) => querySelector(el, sel);
    el.querySelectorAll = (sel) => querySelectorAll(el, sel);
    el.closest = function closest(sel) {
      let node = this;
      while (node) {
        if (matches(node, sel)) return node;
        node = node.parentNode;
      }
      return null;
    };
    el.addEventListener = (type, fn) => {
      el.listeners[type] = el.listeners[type] || [];
      el.listeners[type].push(fn);
    };
    el.dispatchEvent = (event) => {
      const target = event.target || el;
      const list = (target.listeners && target.listeners[event.type]) || el.listeners[event.type] || [];
      list.forEach((fn) => fn(Object.assign(event, { target })));
      return true;
    };
    el.click = () => el.dispatchEvent({ type: 'click', target: el, preventDefault() {}, stopPropagation() {} });
    el.focus = () => {};
    Object.defineProperty(el, 'innerHTML', {
      get() { return el._innerHTML || ''; },
      set(html) {
        el._innerHTML = String(html);
        el.children = [];
        el.childNodes = [];
        parseHtmlInto(el, el._innerHTML);
      },
    });
    return el;
  }

  function parseAttrs(attrStr, el) {
    const re = /([\w:-]+)(?:="([^"]*)")?/g;
    let m;
    while ((m = re.exec(attrStr))) {
      el.setAttribute(m[1], m[2] == null ? '' : m[2]);
      if (m[1] === 'class' && m[2]) {
        m[2].split(/\s+/).filter(Boolean).forEach((name) => el.classList.add(name));
      }
    }
  }

  function parseHtmlInto(parent, html) {
    const src = String(html).replace(/<svg[\s\S]*?<\/svg>/gi, '');
    const tagRe = /<([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
    const stack = [parent];
    let last = 0;
    let m;
    while ((m = tagRe.exec(src))) {
      last = m.index + m[0].length;
      const tag = m[1];
      const selfClose = m[3] === '/' || tag === 'input';
      if (m[0].startsWith('</')) continue;
      const node = makeEl(tag);
      parseAttrs(m[2] || '', node);
      stack[stack.length - 1].appendChild(node);
      if (!selfClose && !m[0].endsWith('/>')) {
        const closeToken = `</${tag}>`;
        const closeIdx = src.indexOf(closeToken, last);
        if (closeIdx >= 0) {
          const inner = src.slice(last, closeIdx);
          if (inner.trim() && !inner.includes('<')) node.textContent = inner.trim();
          else if (inner.trim()) parseHtmlInto(node, inner);
          last = closeIdx + closeToken.length;
          tagRe.lastIndex = last;
        }
        stack.pop();
        stack.push(node);
      }
    }
  }

  function matches(el, sel) {
    if (!el || !sel) return false;
    if (sel.startsWith('[')) {
      const m = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
      if (!m) return false;
      const val = el.getAttribute(m[1]);
      return m[2] == null ? val != null : val === m[2];
    }
    if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
    return el.tagName === sel.toUpperCase();
  }

  function querySelector(root, sel) {
    if (matches(root, sel)) return root;
    for (const child of root.children || []) {
      const hit = querySelector(child, sel);
      if (hit) return hit;
    }
    return null;
  }

  function querySelectorAll(root, sel) {
    const out = [];
    function walk(node) {
      if (matches(node, sel)) out.push(node);
      (node.children || []).forEach(walk);
    }
    walk(root);
    return out;
  }

  const document = {
    documentElement: makeEl('html'),
    body: makeEl('body'),
    addEventListener() {},
    querySelectorAll(sel) { return querySelectorAll(document.body, sel); },
    createElement(tag) { return makeEl(tag); },
  };

  return { document, makeEl };
}

function createContext(dom) {
  const window = {};
  const context = vm.createContext({
    window,
    document: dom.document,
    console,
    Date,
    Promise,
    Number,
    String,
    JSON,
    Array,
    Object,
    Error,
    WeakMap,
    Set,
    Math,
    setTimeout,
  });
  window.window = window;
  return { context, window };
}

function clickOption(container, optId) {
  const opt = container.querySelectorAll('[data-stam-reference-picker-opt="1"]')
    .find((el) => el.getAttribute('data-opt-id') === optId);
  assert.ok(opt, `option ${optId}`);
  container.querySelector('[data-stam-reference-picker-options]').dispatchEvent({
    type: 'click',
    target: opt,
    preventDefault() {},
    stopPropagation() {},
  });
}

function createFakeFirestore(membersByProject) {
  return () => ({
    collection(name) {
      return {
        doc(id) {
          return {
            collection(sub) {
              return {
                where(field, op, value) {
                  const paths = [`${name}/${id}/${sub}`];
                  return {
                    where(field2, op2, value2) {
                      paths.push(`${field2}${op2}${value2}`);
                      return {
                        get() {
                          const docs = (membersByProject[id] || []).map((entry) => ({
                            id: entry.id,
                            data: () => entry.data,
                          }));
                          return Promise.resolve({ forEach(fn) { docs.forEach(fn); } });
                        },
                      };
                    },
                    get() {
                      const docs = (membersByProject[id] || []).map((entry) => ({
                        id: entry.id,
                        data: () => entry.data,
                      }));
                      return Promise.resolve({ forEach(fn) { docs.forEach(fn); } });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  });
}

const dom = createDom();
const { context, window } = createContext(dom);

vm.runInContext(`
  window.STAM = window.STAM || {};
  window.__reqCalls = [];
  window.__fnCalls = [];
  window.__wbsCalls = [];
  window.STAM.requirementsFirestoreAdapter = {
    create: function () {
      return {
        listByProject: function (projectId) {
          window.__reqCalls.push(['listByProject', projectId]);
          return Promise.resolve([
            { id: 'req-1', projectId: projectId, code: 'REQ_001', title: '로그인 요구사항', isDeleted: false },
            { id: 'req-bad', projectId: projectId, code: 'BAD', title: 'Invalid', isDeleted: false },
            { id: 'req-del', projectId: projectId, code: 'REQ_020', title: 'Deleted', isDeleted: true },
          ]);
        },
        getById: function () { return Promise.resolve(null); },
        create: function () { return Promise.reject(new Error('write denied')); },
        update: function () { return Promise.reject(new Error('write denied')); },
      };
    },
  };
  window.STAM.functionalSpecFirestoreAdapter = {
    create: function () {
      return {
        listByProject: function (projectId) {
          window.__fnCalls.push(['listByProject', projectId]);
          return Promise.resolve([
            { id: 'fn-1', projectId: projectId, code: 'FN_001', title: '로그인 처리', isDeleted: false },
            { id: 'fn-bad', projectId: projectId, code: 'BAD', title: 'Invalid', isDeleted: false },
            { id: 'fn-del', projectId: projectId, code: 'FN_020', title: 'Deleted', isDeleted: true },
          ]);
        },
        create: function () { return Promise.reject(new Error('write denied')); },
        update: function () { return Promise.reject(new Error('write denied')); },
      };
    },
  };
  window.STAM.wbsFirestoreAdapter = {
    create: function () {
      return {
        listByProject: function (projectId) {
          window.__wbsCalls.push(['listByProject', projectId]);
          return Promise.resolve([
            {
              id: 'wbs-1',
              projectId: projectId,
              code: 'WBS-001',
              title: '로그인 화면 구현',
              phase: '구현',
              functionGroup: '인증',
              ownerName: '김담당',
              status: 'in_progress',
              priority: 'high',
              isDeleted: false,
            },
            { id: 'wbs-bad', projectId: projectId, code: 'BAD', title: 'Invalid', status: 'in_progress', priority: 'high', isDeleted: false },
            { id: 'wbs-del', projectId: projectId, code: 'WBS-020', title: 'Deleted', status: 'in_progress', priority: 'high', isDeleted: true },
          ]);
        },
        getById: function () { return Promise.resolve(null); },
        create: function () { return Promise.reject(new Error('write denied')); },
        update: function () { return Promise.reject(new Error('write denied')); },
      };
    },
  };
`, context, { filename: 'adapter-shim.js' });

for (const [filePath, code] of Object.entries(sources)) {
  vm.runInContext(code, context, { filename: filePath });
}

window.firebase = {
  firestore: createFakeFirestore({
    P1: [
      { id: 'owner-1', data: { userId: 'owner-1', projectId: 'P1', status: 'active', displayName: '김담당', role: 'editor', email: 'owner@x.com' } },
      { id: 'owner-inactive', data: { userId: 'owner-inactive', projectId: 'P1', status: 'pending', displayName: 'Inactive', role: 'viewer' } },
    ],
  }),
};

const requirementPicker = window.STAM.requirementPicker;
const functionalSpecPicker = window.STAM.functionalSpecPicker;
const wbsPicker = window.STAM.wbsPicker;
const projectMemberPicker = window.STAM.projectMemberPicker;
const screenSpecContract = window.STAM.screenSpecServiceContract;
const referencePicker = window.STAM.referencePicker;

assert.equal(typeof wbsPicker, 'object', 'reuse product wbsPicker');
assert.equal(wbsPicker.READ_SOURCE, 'wbsService.listByProject');
assert.equal(typeof functionalSpecPicker, 'object', 'reuse existing functionalSpecPicker');
assert.equal(typeof projectMemberPicker, 'object', 'reuse existing projectMemberPicker');
assert.doesNotMatch(sources.requirementPicker, /screen-spec-picker/);

// Requirement picker compatibility
const reqContainer = dom.makeEl('div');
dom.document.body.appendChild(reqContainer);
requirementPicker.mount(reqContainer, { projectId: 'P1', memberRole: 'owner' });
await requirementPicker.load(reqContainer);
reqContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
assert.equal(reqContainer.querySelectorAll('[data-stam-reference-picker-opt="1"]').length, 1);
clickOption(reqContainer, 'req-1');
const reqValue = requirementPicker.getValue(reqContainer);
assert.equal(reqValue.requirementId, 'req-1');
assert.equal(reqValue.requirementCode, 'REQ_001');
assert.equal(reqValue.requirementTitle, '로그인 요구사항');
requirementPicker.clear(reqContainer);
const clearedReq = requirementPicker.getValue(reqContainer);
assert.equal(clearedReq.requirementId, '');
assert.equal(clearedReq.requirementCode, '');
assert.equal(clearedReq.requirementTitle, '');
assert.throws(() => requirementPicker.setValue(reqContainer, { requirementId: 'req-1' }), /partial/);
assert.throws(() => requirementPicker.setValue(reqContainer, {
  requirementId: 'req-1',
  requirementCode: 'BAD',
  requirementTitle: 'x',
}), /invalid requirementCode/);

// Functional spec picker compatibility
const fnContainer = dom.makeEl('div');
dom.document.body.appendChild(fnContainer);
functionalSpecPicker.mount(fnContainer, { projectId: 'P1', memberRole: 'owner' });
await functionalSpecPicker.load(fnContainer);
fnContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
assert.equal(fnContainer.querySelectorAll('[data-stam-reference-picker-opt="1"]').length, 1);
clickOption(fnContainer, 'fn-1');
const fnValue = functionalSpecPicker.getValue(fnContainer);
assert.equal(fnValue.functionalSpecId, 'fn-1');
assert.equal(fnValue.functionalSpecCode, 'FN_001');
assert.equal(fnValue.functionalSpecTitle, '로그인 처리');
assert.throws(() => functionalSpecPicker.setValue(fnContainer, { functionalSpecId: 'fn-1' }), /partial/);
assert.throws(() => functionalSpecPicker.setValue(fnContainer, {
  functionalSpecId: 'fn-1',
  functionalSpecCode: 'BAD',
  functionalSpecTitle: 'x',
}), /invalid functionalSpecCode/);

// WBS product picker compatibility
const wbsContainer = dom.makeEl('div');
dom.document.body.appendChild(wbsContainer);
wbsPicker.mount(wbsContainer, { projectId: 'P1', memberRole: 'editor', context: { memberRole: 'editor' } });
await wbsPicker.load(wbsContainer);
assert.equal(window.__wbsCalls.length > 0, true, 'wbsService listByProject used');
wbsContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
assert.equal(wbsContainer.querySelectorAll('[data-stam-reference-picker-opt="1"]').length, 1);
const wbsOptionsHtml = wbsContainer.querySelector('[data-stam-reference-picker-options]').innerHTML;
assert.match(wbsOptionsHtml, /구현/);
assert.match(wbsOptionsHtml, /인증/);
assert.match(wbsOptionsHtml, /김담당/);
assert.doesNotMatch(wbsOptionsHtml, /BAD/);
assert.doesNotMatch(wbsOptionsHtml, /WBS-020/);
clickOption(wbsContainer, 'wbs-1');
const wbsValue = wbsPicker.getValue(wbsContainer);
assert.equal(wbsValue.wbsItemId, 'wbs-1');
assert.equal(wbsValue.wbsItemCode, 'WBS-001');
assert.equal(wbsValue.wbsItemTitle, '로그인 화면 구현');
wbsPicker.clear(wbsContainer);
const clearedWbs = wbsPicker.getValue(wbsContainer);
assert.equal(clearedWbs.wbsItemId, '');
assert.equal(clearedWbs.wbsItemCode, '');
assert.equal(clearedWbs.wbsItemTitle, '');
assert.throws(() => wbsPicker.setValue(wbsContainer, { wbsItemId: 'wbs-1' }), /partial/);
assert.throws(() => wbsPicker.setValue(wbsContainer, {
  wbsItemId: 'wbs-1',
  wbsItemCode: 'BAD',
  wbsItemTitle: 'x',
}), /invalid wbsItemCode/);

assert.throws(() => wbsPicker.mount(wbsContainer, { projectId: 'P1' }), /duplicate mount/);
wbsPicker.refreshContext(wbsContainer, { projectId: 'P2', memberRole: 'editor', context: { memberRole: 'editor' } });
const prevCalls = window.__wbsCalls.length;
await wbsPicker.load(wbsContainer);
assert.equal(window.__wbsCalls.length > prevCalls, true, 'refreshContext reloads with new projectId');
assert.equal(window.__wbsCalls[window.__wbsCalls.length - 1][1], 'P2');
wbsPicker.destroy(wbsContainer);
assert.equal(wbsContainer.innerHTML, '');
assert.equal(wbsContainer.getAttribute('data-stam-reference-picker-mounted'), null);

// Owner picker compatibility
const ownerContainer = dom.makeEl('div');
dom.document.body.appendChild(ownerContainer);
projectMemberPicker.mountOwner(ownerContainer, { projectId: 'P1', memberRole: 'editor' });
await projectMemberPicker.load(ownerContainer);
ownerContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
const ownerHtml = ownerContainer.querySelector('[data-stam-reference-picker-options]').innerHTML;
assert.doesNotMatch(ownerHtml, /Inactive/);
assert.doesNotMatch(ownerHtml, /연결 없음/);
clickOption(ownerContainer, 'owner-1');
const ownerValue = projectMemberPicker.getValue(ownerContainer);
assert.equal(ownerValue.ownerId, 'owner-1');
assert.equal(ownerValue.ownerName, '김담당');
assert.throws(() => projectMemberPicker.setValue(ownerContainer, { ownerId: 'owner-1' }), /partial/);
assert.doesNotMatch(ownerHtml, /연결 없음/, 'owner mode must not allow clear via UI');

// ScreenSpec create direct compatibility
const createInput = {
  title: '로그인 화면',
  ownerId: ownerValue.ownerId,
  ownerName: ownerValue.ownerName,
  requirementId: reqValue.requirementId,
  requirementCode: reqValue.requirementCode,
  requirementTitle: reqValue.requirementTitle,
  functionalSpecId: fnValue.functionalSpecId,
  functionalSpecCode: fnValue.functionalSpecCode,
  functionalSpecTitle: fnValue.functionalSpecTitle,
  wbsItemId: wbsValue.wbsItemId,
  wbsItemCode: wbsValue.wbsItemCode,
  wbsItemTitle: wbsValue.wbsItemTitle,
};
const createPayload = screenSpecContract.buildCreatePayload(createInput, {
  projectId: 'P1',
  actorUid: 'writer-1',
});
assert.equal(createPayload.title, '로그인 화면');
assert.equal(createPayload.requirementId, 'req-1');
assert.equal(createPayload.requirementCode, 'REQ_001');
assert.equal(createPayload.requirementTitle, '로그인 요구사항');
assert.equal(createPayload.functionalSpecId, 'fn-1');
assert.equal(createPayload.functionalSpecCode, 'FN_001');
assert.equal(createPayload.functionalSpecTitle, '로그인 처리');
assert.equal(createPayload.wbsItemId, 'wbs-1');
assert.equal(createPayload.wbsItemCode, 'WBS-001');
assert.equal(createPayload.wbsItemTitle, '로그인 화면 구현');
assert.equal(createPayload.ownerId, 'owner-1');
assert.equal(createPayload.ownerName, '김담당');
assert.equal(createPayload.screenType, 'other');
assert.equal(createPayload.writeStatus, 'writing');
assert.equal('menuScreenId' in createPayload, false);
assert.equal('menuScreenCode' in createPayload, false);
assert.equal('menuScreenTitle' in createPayload, false);

// ScreenSpec update unlink compatibility
const current = {
  id: 'scr-1',
  projectId: 'P1',
  code: 'SCR-001',
  title: 'Existing',
  screenType: 'form',
  writeStatus: 'writing',
  reviewStatus: 'none',
  approvalStatus: 'none',
  ownerId: 'owner-1',
  ownerName: '김담당',
  requirementId: 'req-1',
  requirementCode: 'REQ_001',
  requirementTitle: '로그인 요구사항',
  functionalSpecId: 'fn-1',
  functionalSpecCode: 'FN_001',
  functionalSpecTitle: '로그인 처리',
  wbsItemId: 'wbs-1',
  wbsItemCode: 'WBS-001',
  wbsItemTitle: '로그인 화면 구현',
  version: 2,
};

const reqUnlinkPatch = screenSpecContract.buildUpdatePatch(current, {
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
}, { actorUid: 'writer-1' });
assert.equal(reqUnlinkPatch.requirementId, '');
assert.equal(reqUnlinkPatch.requirementCode, '');
assert.equal(reqUnlinkPatch.requirementTitle, '');
assert.equal(reqUnlinkPatch.version, 3);

const fnUnlinkPatch = screenSpecContract.buildUpdatePatch(current, {
  functionalSpecId: '',
  functionalSpecCode: '',
  functionalSpecTitle: '',
}, { actorUid: 'writer-1' });
assert.equal(fnUnlinkPatch.functionalSpecId, '');
assert.equal(fnUnlinkPatch.functionalSpecCode, '');
assert.equal(fnUnlinkPatch.functionalSpecTitle, '');

const wbsUnlinkPatch = screenSpecContract.buildUpdatePatch(current, {
  wbsItemId: '',
  wbsItemCode: '',
  wbsItemTitle: '',
}, { actorUid: 'writer-1' });
assert.equal(wbsUnlinkPatch.wbsItemId, '');
assert.equal(wbsUnlinkPatch.wbsItemCode, '');
assert.equal(wbsUnlinkPatch.wbsItemTitle, '');

assert.throws(
  () => screenSpecContract.buildUpdatePatch(current, {
    requirementId: '',
    requirementCode: 'REQ_001',
    requirementTitle: 'x',
  }, { actorUid: 'writer-1' }),
  /partial requirement/,
);

assert.throws(
  () => screenSpecContract.buildUpdatePatch(current, { ownerId: '', ownerName: '' }, { actorUid: 'writer-1' }),
  /owner/,
);

const menuOmittedPatch = screenSpecContract.buildUpdatePatch(current, { title: 'Renamed' }, { actorUid: 'writer-1' });
assert.equal('menuScreenId' in menuOmittedPatch, false);
assert.equal('menuScreenCode' in menuOmittedPatch, false);
assert.equal('menuScreenTitle' in menuOmittedPatch, false);

console.log('screen spec picker compat contract: PASS');
