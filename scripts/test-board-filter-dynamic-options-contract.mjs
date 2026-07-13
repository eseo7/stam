#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = await readFile(path.join(ROOT, 'stam/js/stam.board-filter.js'), 'utf8');

assert.match(source, /setGroupOptions/);
assert.match(source, /data-sbf-group-section/);
assert.match(source, /data-sbf-group-options/);

const optionHosts = {};
const grid = {
  innerHTML: '',
  children: [],
  appendChild(node) { this.children.push(node); },
};
const actionsEl = { insertBefore() {}, firstChild: null };
let active = [];

const panel = {
  firstChild: null,
  classList: { add() {}, remove() {} },
  contains() { return false; },
  querySelector(sel) {
    if (sel === '.stam-board-filter-grid') return grid;
    if (sel === '.stam-board-filter-actions') return actionsEl;
    const hostMatch = sel.match(/^\[data-sbf-group-options="([^"]+)"\]$/);
    if (hostMatch) return optionHosts[hostMatch[1]] || null;
    return null;
  },
  querySelectorAll(sel) {
    if (sel === '.sbf-chip.active') return active;
    return [];
  },
  insertBefore(node) { this.firstChild = node; },
  appendChild() {},
  setAttribute() {},
  getAttribute() { return null; },
  addEventListener() {},
};

const trigger = {
  setAttribute() {},
  getAttribute() { return null; },
  querySelector() { return null; },
  addEventListener() {},
  classList: { add() {}, remove() {}, toggle() {} },
};

const context = vm.createContext({
  window: { STAM: {} },
  document: {
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        className: '',
        type: '',
        dataset: {},
        attrs: {},
        children: [],
        textContent: '',
        innerHTML: '',
        set innerHTML(v) {
          this._innerHTML = v;
          if (!v) this.children = [];
        },
        get innerHTML() {
          return this._innerHTML || '';
        },
        setAttribute(n, v) {
          this.attrs[n] = v;
          if (n === 'data-sbf-group-options') optionHosts[v] = this;
          if (n.startsWith('data-')) {
            const key = n.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            this.dataset[key] = v;
          }
        },
        getAttribute(n) { return this.attrs[n]; },
        appendChild(c) { this.children.push(c); },
        addEventListener() {},
        classList: { add() {}, remove() {}, toggle() {} },
      };
      return el;
    },
    addEventListener() {},
    querySelector(sel) {
      if (sel === '#wbs-filter-open-btn') return trigger;
      if (sel === '#wbs-filter-panel') return panel;
      if (sel === '#wbs-fp-clear') return { addEventListener() {} };
      if (sel === '#wbs-fp-apply') return { addEventListener() {} };
      return null;
    },
  },
});
context.window.document = context.document;
vm.runInContext(source, context, { filename: 'stam.board-filter.js' });

const api = context.window.STAM.boardFilter.init({
  root: context.document,
  trigger: '#wbs-filter-open-btn',
  panel: '#wbs-filter-panel',
  reset: '#wbs-fp-clear',
  apply: '#wbs-fp-apply',
  groups: [
    { key: 'group', label: '기능그룹', options: [{ value: 'old', label: 'Old' }] },
    { key: 'owner', label: '담당자', options: [{ value: 'u1', label: 'User 1', avatar: 'U' }] },
  ],
});

assert.ok(api && typeof api.setGroupOptions === 'function');
assert.equal(optionHosts.group.children.length, 1);
assert.equal(optionHosts.owner.children.length, 1);

api.setGroupOptions('group', [{ value: 'g1', label: 'Group 1' }, { value: 'g2', label: 'Group 2' }]);
assert.equal(optionHosts.group.children.length, 2);
assert.equal(optionHosts.group.children[0].dataset.sbfVal, 'g1');
assert.equal(optionHosts.owner.children.length, 1);

api.setGroupOptions('owner', [{ value: 'u2', label: 'User 2', avatar: 'V' }]);
assert.equal(optionHosts.owner.children.length, 1);
assert.equal(optionHosts.owner.children[0].dataset.sbfVal, 'u2');
assert.equal(optionHosts.group.children.length, 2);

console.log('board filter dynamic options contract: PASS');
