#!/usr/bin/env node
/**
 * STAM WBS-3 — Project member read service + picker contract
 *
 * Usage:
 *   node scripts/test-project-member-picker-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const referenceSource = await readFile(path.join(ROOT, 'stam/js/stam.reference-picker.js'), 'utf8');
const readServiceSource = await readFile(path.join(ROOT, 'stam/js/stam.project-member-read-service.js'), 'utf8');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.project-member-picker.js'), 'utf8');

assert.match(readServiceSource, /collection\('members'\)/);
assert.match(readServiceSource, /where\('status', '==', 'active'\)/);
assert.doesNotMatch(readServiceSource, /collectionGroup/);
assert.doesNotMatch(readServiceSource, /authUser\.uid \|\| authUser\.userId/);
assert.match(readServiceSource, /authUser && authUser\.uid/);

assert.match(pickerSource, /STAM\.referencePicker/);
assert.match(pickerSource, /data-stam-wbs-member-picker/);

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
      const attrs = m[2] || '';
      const selfClose = m[3] === '/' || tag === 'input';
      if (m[0].startsWith('</')) continue;
      const node = makeEl(tag);
      parseAttrs(attrs, node);
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

function createFakeFirestore(membersByProject) {
  const paths = [];
  return {
    paths,
    collection(name) {
      paths.push(name);
      return {
        doc(id) {
          paths.push(id);
          return {
            collection(sub) {
              paths.push(sub);
              return {
                where(field, op, value) {
                  paths.push(`${field}${op}${value}`);
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
              };
            },
          };
        },
      };
    },
  };
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

function memberOptions(container) {
  return container.querySelectorAll('[data-stam-reference-picker-opt="1"]');
}

function clickMemberOption(container, memberUid) {
  const opt = memberOptions(container).find((el) => el.getAttribute('data-opt-id') === memberUid);
  assert.ok(opt, `option ${memberUid}`);
  const host = container.querySelector('[data-stam-reference-picker-options]');
  host.dispatchEvent({
    type: 'click',
    target: opt,
    preventDefault() {},
    stopPropagation() {},
  });
}

const dom = createDom();
const { context, window } = createContext(dom);
const firestore = createFakeFirestore({
  P1: [
    { id: 'uid-a', data: { userId: 'uid-a', projectId: 'P1', status: 'active', displayName: 'Alice', role: 'editor', email: 'a@x.com' } },
    { id: 'uid-b', data: { userId: 'uid-b', projectId: 'P1', status: 'active', displayName: 'Bob', role: 'viewer', email: 'b@x.com' } },
    { id: 'uid-bad', data: { userId: 'other', projectId: 'P1', status: 'active', displayName: 'Bad', role: 'viewer' } },
    { id: 'uid-pend', data: { userId: 'uid-pend', projectId: 'P1', status: 'pending', displayName: 'Pending', role: 'viewer' } },
    { id: 'uid-dup', data: { userId: 'uid-dup', projectId: 'P1', status: 'active', displayName: 'Alice', role: 'admin', email: 'dup@x.com' } },
  ],
});
window.firebase = { firestore: () => firestore };

vm.runInContext(referenceSource, context, { filename: 'stam.reference-picker.js' });
vm.runInContext(readServiceSource, context, { filename: 'stam.project-member-read-service.js' });
vm.runInContext(pickerSource, context, { filename: 'stam.project-member-picker.js' });

const contract = window.STAM.projectMemberReadServiceContract;
const service = contract.createService({
  adapter: contract.createFirestoreAdapter({ firestore }),
  authorize: contract.createMemberRoleAuthorize(() => 'editor'),
});
const members = await service.listActiveByProject('P1', { memberRole: 'editor' });
assert.equal(members.length, 3);

assert.equal(contract.resolveDefaultOwner(members, { uid: 'uid-a' }).memberUid, 'uid-a');
assert.equal(contract.resolveDefaultOwner(members, { userId: 'uid-a' }), null);
assert.equal(contract.resolveDefaultOwner(members, { email: 'a@x.com' }), null);
assert.equal(contract.resolveDefaultOwner(members, { displayName: 'Alice' }), null);
assert.equal(contract.resolveDefaultOwner(members, { uid: 'missing' }), null);

const picker = window.STAM.projectMemberPicker;

const ownerContainer = dom.makeEl('div');
dom.document.body.appendChild(ownerContainer);
picker.mountOwner(ownerContainer, { projectId: 'P1', memberRole: 'editor' });
await picker.load(ownerContainer);
ownerContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));

const ownerOpts = memberOptions(ownerContainer);
assert.equal(ownerOpts.length, 3, 'rendered member options must match active normalized members');
assert.ok(members.length > 0 && ownerOpts.length > 0, 'service members > 0 but rendered options == 0 would FAIL');

const ownerHtml = ownerContainer.querySelector('[data-stam-reference-picker-options]').innerHTML;
assert.match(ownerHtml, /Alice/);
assert.match(ownerHtml, /Bob/);
assert.doesNotMatch(ownerHtml, /Pending/);
assert.doesNotMatch(ownerHtml, /Bad/);
assert.doesNotMatch(ownerHtml, /연결 없음/);
assert.match(ownerHtml, /admin · dup@x.com/);

clickMemberOption(ownerContainer, 'uid-b');
const ownerValue = picker.getValue(ownerContainer);
assert.equal(ownerValue.ownerId, 'uid-b');
assert.equal(ownerValue.ownerName, 'Bob');
assert.equal(ownerValue.reviewerId, undefined);
assert.equal(ownerValue.memberRole, undefined);
assert.equal(ownerValue.memberEmail, undefined);

const reviewerContainer = dom.makeEl('div');
dom.document.body.appendChild(reviewerContainer);
picker.mountReviewer(reviewerContainer, { projectId: 'P1', memberRole: 'editor' });
await picker.load(reviewerContainer);
reviewerContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));

const reviewerHtml = reviewerContainer.querySelector('[data-stam-reference-picker-options]').innerHTML;
assert.match(reviewerHtml, /연결 없음/);
assert.equal(memberOptions(reviewerContainer).length, 3);

clickMemberOption(reviewerContainer, 'uid-a');
const reviewerValue = picker.getValue(reviewerContainer);
assert.equal(reviewerValue.reviewerId, 'uid-a');
assert.equal(reviewerValue.reviewerName, 'Alice');

picker.clear(reviewerContainer);
const cleared = picker.getValue(reviewerContainer);
assert.equal(cleared.reviewerId, '');
assert.equal(cleared.reviewerName, '');

const wbsReviewerContainer = dom.makeEl('div');
wbsReviewerContainer.setAttribute('data-stam-wbs-member-picker', 'reviewer');
wbsReviewerContainer.setAttribute('data-stam-wbs-member-mode', 'create');
dom.document.body.appendChild(wbsReviewerContainer);
picker.mount(wbsReviewerContainer, { projectId: 'P1', memberRole: 'editor' });
await picker.load(wbsReviewerContainer);
wbsReviewerContainer.querySelector('[data-stam-reference-picker-toggle]').click();
await new Promise((r) => setTimeout(r, 0));
assert.match(
  wbsReviewerContainer.querySelector('[data-stam-reference-picker-options]').innerHTML,
  /연결 없음/,
  'WBS reviewer hook generic mount',
);

console.log('project member picker contract: PASS');
