#!/usr/bin/env node
/**
 * STAM WBS-3 — Functional spec picker contract
 *
 * Usage:
 *   node scripts/test-functional-spec-picker-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const referenceSource = await readFile(path.join(ROOT, 'stam/js/stam.reference-picker.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-service.js'), 'utf8');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.functional-spec-picker.js'), 'utf8');
const requirementPickerSource = await readFile(path.join(ROOT, 'stam/js/stam.requirement-picker.js'), 'utf8');

assert.match(pickerSource, /STAM\.referencePicker\.create/);
assert.doesNotMatch(pickerSource, /setTimeout/);

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
window.__fsCalls = [];
vm.runInContext(`
  window.STAM = window.STAM || {};
  window.STAM.functionalSpecFirestoreAdapter = {
    create: function () {
      return {
        listByProject: function (projectId, query) {
          window.__fsCalls.push(['listByProject', projectId, query]);
          return Promise.resolve([
            { id: 'fn-2', projectId: projectId, code: 'FN_010', title: 'Search', isDeleted: false },
            { id: 'fn-1', projectId: projectId, code: 'FN_001', title: 'Login', isDeleted: false },
            { id: 'fn-bad', projectId: projectId, code: 'BAD', title: 'Invalid', isDeleted: false },
            { id: 'fn-del', projectId: projectId, code: 'FN_020', title: 'Deleted', isDeleted: true },
            { id: 'fn-empty', projectId: projectId, code: 'FN_030', title: '', isDeleted: false },
          ]);
        },
        create: function () { return Promise.reject(new Error('write denied')); },
        update: function () { return Promise.reject(new Error('write denied')); },
      };
    },
  };
`, context, { filename: 'adapter-shim.js' });

vm.runInContext(referenceSource, context, { filename: 'stam.reference-picker.js' });
vm.runInContext(serviceSource, context, { filename: 'stam.functional-spec-service.js' });
vm.runInContext(pickerSource, context, { filename: 'stam.functional-spec-picker.js' });

const picker = window.STAM.functionalSpecPicker;
const container = dom.makeEl('div');
dom.document.body.appendChild(container);
picker.mount(container, { projectId: 'P1', memberRole: 'owner' });
await picker.load(container);
container.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));

const html = container.querySelector('[data-stam-reference-picker-options]').innerHTML;
const opts = container.querySelectorAll('[data-stam-reference-picker-opt="1"]');
assert.equal(opts.length, 2, 'FN_001 and FN_010 only');
assert.match(html, /FN_001/);
assert.match(html, /FN_010/);
assert.doesNotMatch(html, /BAD/);
assert.doesNotMatch(html, /FN_020/);
assert.doesNotMatch(html, /FN_030/);

const codes = opts.map((el) => el.getAttribute('data-opt-code'));
assert.equal(codes.join(','), 'FN_001,FN_010', 'code ASC sort');

const fnOpt = opts.find((el) => el.getAttribute('data-opt-id') === 'fn-1');
container.querySelector('[data-stam-reference-picker-options]').dispatchEvent({
  type: 'click',
  target: fnOpt,
  preventDefault() {},
  stopPropagation() {},
});
const linked = picker.getValue(container);
assert.equal(linked.functionalSpecId, 'fn-1');
assert.equal(linked.functionalSpecCode, 'FN_001');
assert.equal(linked.functionalSpecTitle, 'Login');

picker.clear(container);
const cleared = picker.getValue(container);
assert.equal(cleared.functionalSpecId, '');
assert.equal(cleared.functionalSpecCode, '');
assert.equal(cleared.functionalSpecTitle, '');

assert.throws(() => picker.setValue(container, { functionalSpecId: 'fn-1' }), /partial/);

const prefillContainer = dom.makeEl('div');
dom.document.body.appendChild(prefillContainer);
picker.mount(prefillContainer, { projectId: 'P1', memberRole: 'owner' });
await picker.load(prefillContainer);
picker.setValue(prefillContainer, {
  functionalSpecId: 'fn-2',
  functionalSpecCode: 'FN_010',
  functionalSpecTitle: 'Search',
});
const prefilled = picker.getValue(prefillContainer);
assert.equal(prefilled.functionalSpecCode, 'FN_010');
assert.equal(prefilled.functionalSpecTitle, 'Search');

console.log('functional spec picker contract: PASS');
