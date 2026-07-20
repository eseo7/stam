#!/usr/bin/env node
/**
 * STAM FS-6B — Requirement picker contract
 *
 * Usage:
 *   node scripts/test-requirement-picker-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const referenceSource = await readFile(path.join(ROOT, 'stam/js/stam.reference-picker.js'), 'utf8');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.requirement-picker.js'), 'utf8');
const requirementsServiceSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-service.js'), 'utf8');
const requirementsAdapterSource = await readFile(path.join(ROOT, 'stam/js/stam.requirements-firestore-adapter.js'), 'utf8');
const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-firestore-crud.js'), 'utf8');
const pageSource = await readFile(path.join(ROOT, 'stam/pages/boards/functional-specification.html'), 'utf8');

assert.match(pickerSource, /window\.STAM\.requirementPicker/);
assert.match(pickerSource, /READ_SOURCE = 'requirementsService\.listByProject'/);
assert.match(pickerSource, /STAM\.referencePicker\.create/);
assert.match(pickerSource, /formatOptionLabel/);
assert.match(pickerSource, /createReadService/);
assert.match(pickerSource, /listRequirements/);
assert.match(pickerSource, /requirementsServiceContract/);
assert.doesNotMatch(pickerSource, /requirementsFirestoreList/);
assert.doesNotMatch(pickerSource, /collection\(['"]requirements['"]\)/);
assert.doesNotMatch(pickerSource, /firestore\(\)/);
assert.doesNotMatch(pickerSource, /buildPickerMarkup/);
assert.doesNotMatch(pickerSource, /caretSvg/);
assert.doesNotMatch(pickerSource, /checkSvg/);
assert.doesNotMatch(pickerSource, /document\.addEventListener\('click'/);
assert.doesNotMatch(pickerSource, /document\.addEventListener\('keydown'/);

assert.match(requirementsServiceSource, /function listByProject\(projectId, query, context\)/);
assert.match(requirementsAdapterSource, /function listByProject\(projectId, query\)/);

assert.match(crudSource, /requirementPickerApi/);
assert.match(crudSource, /getRequirementSelection/);
assert.match(crudSource, /setRequirementSelection/);
assert.match(crudSource, /applyRequirementLinkFields/);
assert.match(crudSource, /var rcode = clean\(req\.requirementCode\)/);
assert.match(crudSource, /var rtitle = clean\(req\.requirementTitle\)/);
assert.match(crudSource, /payload\.requirementCode = rcode/);
assert.match(crudSource, /payload\.requirementTitle = rtitle/);
assert.doesNotMatch(crudSource, /getVal\(regDrawer, '연결 요구사항'\)/);
assert.doesNotMatch(crudSource, /getVal\(editDrawer, '연결 요구사항'\)/);
assert.equal(/collection\(['"]requirements['"]\)/.test(crudSource), false);

assert.match(pageSource, /stam\.reference-picker\.js/);
assert.match(pageSource, /stam\.requirement-picker\.js/);
assert.match(pageSource, /stam\.requirements-service\.js/);
assert.match(pageSource, /stam\.requirements-firestore-adapter\.js/);
assert.doesNotMatch(pageSource, /stam\.requirements-firestore-list\.js/);
assert.match(pageSource, /data-stam-requirement-picker/);
assert.doesNotMatch(pageSource, /placeholder="요구사항 ID 입력/);

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
      hidden: false,
      value: '',
      innerHTML: '',
      parentNode: null,
      listeners: {},
      _id: `n${++idSeq}`,
    };
    el.appendChild = (child) => {
      child.parentNode = el;
      el.children.push(child);
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
    setTimeout,
  });
  window.window = window;
  return { context, window };
}

const dom = createDom();
const { context, window } = createContext(dom);
window.__adapterCalls = [];
vm.runInContext(`
  window.STAM = window.STAM || {};
  window.STAM.requirementsFirestoreAdapter = {
    create: function createFakeRequirementsAdapter() {
      return {
        listByProject: function (projectId) {
          window.__adapterCalls.push(['listByProject', projectId]);
          return Promise.resolve([
            { id: 'req-1', projectId: projectId, code: 'REQ_001', title: 'Alpha requirement', isDeleted: false },
            { id: 'req-2', projectId: projectId, code: 'REQ_002', title: 'Beta requirement', isDeleted: false },
            { id: 'req-xss', projectId: projectId, code: 'REQ_099', title: '<script>alert(1)</script>', isDeleted: false },
            { id: 'req-bad', projectId: projectId, code: 'BAD', title: 'Invalid', isDeleted: false },
            { id: 'req-del', projectId: projectId, code: 'REQ_020', title: 'Deleted', isDeleted: true },
          ]);
        },
        getById: function (projectId, requirementId) {
          window.__adapterCalls.push(['getById', projectId, requirementId]);
          return Promise.resolve({ id: requirementId, projectId: projectId, code: 'REQ_001', title: 'Alpha requirement' });
        },
        create: function () { return Promise.reject(new Error('write denied')); },
        update: function () { return Promise.reject(new Error('write denied')); },
      };
    },
  };
`, context, { filename: 'adapter-shim.js' });
vm.runInContext(referenceSource, context, { filename: 'stam.reference-picker.js' });
vm.runInContext(requirementsServiceSource, context, { filename: 'stam.requirements-service.js' });
vm.runInContext(pickerSource, context, { filename: 'stam.requirement-picker.js' });

const picker = window.STAM.requirementPicker;
assert.equal(picker.READ_SOURCE, 'requirementsService.listByProject');
assert.equal(picker.formatOptionLabel({ code: 'REQ_001', title: 'Alpha' }), 'REQ_001 · Alpha');
assert.equal(picker.formatRequirementCode({ id: 'raw-doc-id', title: 'Alpha' }), '');
assert.equal(picker.formatRequirementCode({ code: 'REQ_001', id: 'raw-doc-id' }), 'REQ_001');

const items = await picker.listRequirements('P1', { source: 'contract' }, 'owner');
assert.equal(items.length, 5);
assert.equal(window.__adapterCalls[0][0], 'listByProject');
assert.equal(window.__adapterCalls[0][1], 'P1');

const container = dom.makeEl('div');
dom.document.body.appendChild(container);
picker.mount(container, { projectId: 'P1', memberRole: 'owner' });
await picker.load(container);
container.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));

const opts = container.querySelectorAll('[data-stam-reference-picker-opt="1"]');
assert.equal(opts.length, 3, 'valid requirements only');
const reqOpt = opts.find((el) => el.getAttribute('data-opt-id') === 'req-1');
container.querySelector('[data-stam-reference-picker-options]').dispatchEvent({
  type: 'click',
  target: reqOpt,
  preventDefault() {},
  stopPropagation() {},
});
const linked = picker.getValue(container);
assert.equal(linked.requirementId, 'req-1');
assert.equal(linked.requirementCode, 'REQ_001');
assert.equal(linked.requirementTitle, 'Alpha requirement');

picker.clear(container);
const cleared = picker.getValue(container);
assert.equal(cleared.requirementId, '');
assert.equal(cleared.requirementCode, '');
assert.equal(cleared.requirementTitle, '');

assert.throws(() => picker.setValue(container, { requirementId: 'req-1' }), /partial/);
assert.throws(() => picker.setValue(container, {
  requirementId: 'req-1',
  requirementCode: 'BAD',
  requirementTitle: 'x',
}), /invalid requirementCode/);

assert.throws(() => picker.mount(container, { projectId: 'P1', memberRole: 'owner' }), /duplicate mount/);

const searchContainer = dom.makeEl('div');
dom.document.body.appendChild(searchContainer);
picker.mount(searchContainer, { projectId: 'P1', memberRole: 'owner' });
await picker.load(searchContainer);
searchContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
const searchInput = searchContainer.querySelector('[data-stam-reference-picker-search]');
searchInput.value = 'beta';
searchInput.dispatchEvent({ type: 'input', target: searchInput, preventDefault() {}, stopPropagation() {} });
const searchOpts = searchContainer.querySelectorAll('[data-stam-reference-picker-opt="1"]');
assert.equal(searchOpts.length, 1);
assert.equal(searchOpts[0].getAttribute('data-opt-code'), 'REQ_002');

picker.refreshContext(searchContainer, { projectId: 'P2', memberRole: 'editor', context: { source: 'refresh' } });
await picker.load(searchContainer);
assert.equal(window.__adapterCalls.some((call) => call[1] === 'P2'), true);

const xssContainer = dom.makeEl('div');
dom.document.body.appendChild(xssContainer);
picker.mount(xssContainer, { projectId: 'P1', memberRole: 'owner' });
await picker.load(xssContainer);
xssContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
const xssHtml = xssContainer.querySelector('[data-stam-reference-picker-options]').innerHTML;
assert.equal(xssHtml.includes('<script>'), false);
assert.match(xssHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

console.log('requirement picker contract: PASS');
