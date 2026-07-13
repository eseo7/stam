#!/usr/bin/env node
/**
 * STAM WBS-3 — Reference picker core contract
 *
 * Usage:
 *   node scripts/test-reference-picker-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.reference-picker.js'), 'utf8');

const FORBIDDEN = [
  'requirementsService',
  'functionalSpecService',
  'members',
  'requirementId',
  'functionalSpecId',
  'ownerId',
  'reviewerId',
  'firebase',
  'firestore',
];

for (const token of FORBIDDEN) {
  assert.doesNotMatch(pickerSource, new RegExp(token));
}

assert.match(pickerSource, /window\.STAM\.referencePicker/);
assert.match(pickerSource, /create:\s*create/);
assert.doesNotMatch(pickerSource, /DOMContentLoaded/);
assert.doesNotMatch(pickerSource, /document\.querySelector\(/);
assert.doesNotMatch(pickerSource, /forEach\(function \(raw\)[\s\S]*normalizeItem/);
assert.match(pickerSource, /\(items \|\| \[\]\)\.forEach\(function \(item\)/);

let loadListenerCount = 0;
const loadListeners = [];

function createDom() {
  const nodes = new Map();
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
      style: {},
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
    el.hasAttribute = (name) => name in el.attributes;
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
      const list = el.listeners[event.type] || [];
      list.forEach((fn) => fn(event));
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
    nodes.set(el._id, el);
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
      const text = src.slice(last, m.index);
      if (text.trim()) {
        const top = stack[stack.length - 1];
        top.textContent = (top.textContent || '') + text.trim();
      }
      last = m.index + m[0].length;
      const tag = m[1];
      const attrs = m[2] || '';
      const selfClose = m[3] === '/' || tag === 'input';
      if (m[0].startsWith('</')) continue;
      const el = makeEl(tag);
      parseAttrs(attrs, el);
      stack[stack.length - 1].appendChild(el);
      if (!selfClose && !m[0].endsWith('/>')) stack.push(el);
      else if (!selfClose) {
        const close = new RegExp(`</${tag}>`);
        const closeMatch = close.exec(src.slice(last));
        if (closeMatch && !closeMatch[0]) stack.pop();
      }
      if (selfClose) continue;
      const closeToken = `</${tag}>`;
      const closeIdx = src.indexOf(closeToken, last);
      if (closeIdx >= 0) {
        const inner = src.slice(last, closeIdx);
        if (inner.trim() && !inner.includes('<')) el.textContent = inner.trim();
        else if (inner.trim()) parseHtmlInto(el, inner);
        last = closeIdx + closeToken.length;
        tagRe.lastIndex = last;
        stack.pop();
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
    _clickHandlers: [],
    _keydownHandlers: [],
    addEventListener(type, fn) {
      if (type === 'click') this._clickHandlers.push(fn);
      if (type === 'keydown') this._keydownHandlers.push(fn);
    },
    querySelectorAll(sel) {
      return querySelectorAll(this.body, sel);
    },
    createElement(tag) {
      return makeEl(tag);
    },
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
  });
  window.window = window;
  return { context, window };
}

const dom = createDom();
const { context, window } = createContext(dom);
vm.runInContext(pickerSource, context, { filename: 'stam.reference-picker.js' });

assert.ok(window.STAM.referencePicker);
assert.equal(typeof window.STAM.referencePicker.create, 'function');

const baseConfig = {
  type: 'test',
  placeholder: '선택',
  unlinkLabel: '연결 없음',
  searchPlaceholder: '검색',
  emptyLabel: '없음',
  errorLabel: '오류',
  allowClear: true,
  loadItems: ({ projectId }) => Promise.resolve([
    { id: 'a1', code: 'A1', title: 'Alpha', meta: 'm1', raw: {} },
    { id: 'b2', code: 'B2', title: '<img src=x onerror=alert(1)>', meta: '<script>alert(1)</script>', raw: {} },
  ]),
  normalizeItem: (raw) => raw ? {
    id: String(raw.id || ''),
    code: String(raw.code || ''),
    title: String(raw.title || ''),
    meta: String(raw.meta || ''),
    raw,
  } : null,
  normalizeValue: (value) => {
    if (!value) return { id: '', code: '', title: '', meta: '' };
    return {
      id: String(value.id || ''),
      code: String(value.code || ''),
      title: String(value.title || ''),
      meta: String(value.meta || ''),
    };
  },
  toPublicValue: (internal) => ({ id: internal.id, code: internal.code, title: internal.title }),
  formatLabel: (item) => `${item.code} · ${item.title}`,
  formatMeta: (item) => item.meta || '',
  filterText: (item, query) => !query || (`${item.code} ${item.title}`).toLowerCase().includes(query),
  sortItems: (items) => items.slice().sort((a, b) => a.code.localeCompare(b.code)),
};

const picker = window.STAM.referencePicker.create(baseConfig);
['mount', 'load', 'getValue', 'setValue', 'clear', 'setDisabled', 'refreshContext', 'close', 'destroy'].forEach((name) => {
  assert.equal(typeof picker[name], 'function', `instance.${name}`);
});

const containerA = dom.makeEl('div');
const containerB = dom.makeEl('div');
dom.document.body.appendChild(containerA);
dom.document.body.appendChild(containerB);

picker.mount(containerA, { projectId: 'P1', memberRole: 'owner' });
assert.throws(() => picker.mount(containerA, { projectId: 'P1' }), /duplicate mount/);

picker.mount(containerB, { projectId: 'P1', memberRole: 'viewer' });

const load1 = picker.load(containerA);
const load2 = picker.load(containerA);
assert.equal(load1, load2, 'Promise dedupe');

await load1;
picker.setValue(containerA, { id: 'a1', code: 'A1', title: 'Alpha' });
assert.deepEqual(picker.getValue(containerA), { id: 'a1', code: 'A1', title: 'Alpha' });

picker.clear(containerA);
assert.deepEqual(picker.getValue(containerA), { id: '', code: '', title: '' });

let slowResolve;
const slowPicker = window.STAM.referencePicker.create({
  ...baseConfig,
  loadItems: () => new Promise((resolve) => { slowResolve = resolve; }),
});
const slowContainer = dom.makeEl('div');
dom.document.body.appendChild(slowContainer);
slowPicker.mount(slowContainer, { projectId: 'P1' });
const slowPromise = slowPicker.load(slowContainer);
slowPicker.refreshContext(slowContainer, { projectId: 'P2' });
await new Promise((r) => setTimeout(r, 0));
slowResolve([{ id: 'z9', code: 'Z9', title: 'Late', meta: '' }]);
await slowPromise.catch(() => {});
assert.deepEqual(slowPicker.getValue(slowContainer), { id: '', code: '', title: '' }, 'stale success ignored');

let normalizeCalls = 0;
const oncePicker = window.STAM.referencePicker.create({
  ...baseConfig,
  normalizeItem: (raw) => {
    normalizeCalls += 1;
    return baseConfig.normalizeItem(raw);
  },
});
const onceContainer = dom.makeEl('div');
dom.document.body.appendChild(onceContainer);
oncePicker.mount(onceContainer, { projectId: 'P1' });
await oncePicker.load(onceContainer);
assert.equal(normalizeCalls, 2, 'normalizeItem once per raw item on load');
onceContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
assert.equal(normalizeCalls, 2, 'renderOptions does not re-normalize');

let rejectP1;
const staleRejectPicker = window.STAM.referencePicker.create({
  ...baseConfig,
  loadItems: ({ projectId }) => {
    if (projectId === 'P1') {
      return new Promise((_, reject) => {
        rejectP1 = () => reject(new Error('P1 failed'));
      });
    }
    return Promise.resolve([{ id: 'p2', code: 'P2', title: 'P2 two', meta: '' }]);
  },
});
const staleRejectContainer = dom.makeEl('div');
dom.document.body.appendChild(staleRejectContainer);
staleRejectPicker.mount(staleRejectContainer, { projectId: 'P1' });
const staleRejectPromise = staleRejectPicker.load(staleRejectContainer);
staleRejectPicker.refreshContext(staleRejectContainer, { projectId: 'P2' });
await new Promise((r) => setTimeout(r, 0));
rejectP1();
const staleRejectResult = await staleRejectPromise;
assert.equal(staleRejectResult.length, 0, 'stale rejection resolves empty');
const p2Items = await staleRejectPicker.load(staleRejectContainer);
assert.equal(p2Items.length, 1, 'P2 load still works after stale rejection');
staleRejectContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
assert.doesNotMatch(
  staleRejectContainer.querySelector('[data-stam-reference-picker-options]').innerHTML,
  /P1 failed/,
  'stale rejection does not set loadError on current context',
);

const destroyLateContainer = dom.makeEl('div');
dom.document.body.appendChild(destroyLateContainer);
let rejectLate;
const latePicker = window.STAM.referencePicker.create({
  ...baseConfig,
  loadItems: () => new Promise((_, reject) => { rejectLate = () => reject(new Error('late fail')); }),
});
latePicker.mount(destroyLateContainer, { projectId: 'P1' });
const latePromise = latePicker.load(destroyLateContainer);
await new Promise((r) => setTimeout(r, 0));
latePicker.destroy(destroyLateContainer);
rejectLate();
const lateResult = await latePromise;
assert.ok(Array.isArray(lateResult) && lateResult.length === 0, 'destroyed container ignores late rejection');

const errPicker = window.STAM.referencePicker.create({
  ...baseConfig,
  loadItems: () => Promise.reject(new Error('load failed')),
});
const errContainer = dom.makeEl('div');
dom.document.body.appendChild(errContainer);
errPicker.mount(errContainer, { projectId: 'P1' });
const errToggle = errContainer.querySelector('[data-stam-reference-picker-toggle]');
errToggle.click();
await new Promise((r) => setTimeout(r, 0));
const optionsHost = errContainer.querySelector('[data-stam-reference-picker-options]');
assert.match(optionsHost.innerHTML, /load failed/);
assert.match(pickerSource, /data-stam-reference-picker-retry/);

picker.setDisabled(containerA, true);
assert.ok(containerA.querySelector('.stam-cs').classList.contains('is-disabled'));

const xssContainer = dom.makeEl('div');
dom.document.body.appendChild(xssContainer);
picker.mount(xssContainer, { projectId: 'P1' });
await picker.load(xssContainer);
xssContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
const html = xssContainer.querySelector('[data-stam-reference-picker-options]').innerHTML;
assert.doesNotMatch(html, /<script>/);
assert.doesNotMatch(html, /<img[^>]*onerror=/);
assert.match(html, /&lt;img/);

picker.setValue(containerB, { id: 'b2', code: 'B2', title: 'Beta' });
picker.clear(containerA);
assert.deepEqual(picker.getValue(containerB), { id: 'b2', code: 'B2', title: 'Beta' }, 'independent state');

const openToggle = xssContainer.querySelector('[data-stam-reference-picker-toggle]');
openToggle.click();
dom.document._clickHandlers.forEach((fn) => fn({ key: 'Escape' }));
picker.close(xssContainer);

picker.destroy(xssContainer);
assert.equal(xssContainer.innerHTML, '');

console.log('reference picker contract: PASS');
