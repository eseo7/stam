#!/usr/bin/env node
/**
 * STAM WBS create — picker → CRUD → service → adapter → rules parity
 *
 * Usage:
 *   node scripts/test-wbs-create-rules-parity-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const FILES = {
  reference: 'stam/js/stam.reference-picker.js',
  requirementsService: 'stam/js/stam.requirements-service.js',
  requirementsAdapter: 'stam/js/stam.requirements-firestore-adapter.js',
  requirementPicker: 'stam/js/stam.requirement-picker.js',
  functionalSpecService: 'stam/js/stam.functional-spec-service.js',
  functionalSpecAdapter: 'stam/js/stam.functional-spec-firestore-adapter.js',
  functionalSpecPicker: 'stam/js/stam.functional-spec-picker.js',
  projectMemberReadService: 'stam/js/stam.project-member-read-service.js',
  projectMemberPicker: 'stam/js/stam.project-member-picker.js',
  wbsService: 'stam/js/stam.wbs-service.js',
  wbsAdapter: 'stam/js/stam.wbs-firestore-adapter.js',
  wbsCrud: 'stam/js/stam.wbs-firestore-crud.js',
};

const sources = {};
for (const [key, rel] of Object.entries(FILES)) {
  sources[key] = await readFile(path.join(ROOT, rel), 'utf8');
}

const WBS_WRITE_KEYS = [
  'id', 'projectId', 'code', 'title', 'phase', 'businessArea', 'functionGroup',
  'screenPath', 'status', 'priority', 'ownerId', 'ownerName', 'reviewerId',
  'reviewerName', 'startDate', 'endDate', 'plannedEffort', 'actualEffort',
  'progress', 'description', 'requirementId', 'requirementCode', 'requirementTitle',
  'functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle',
  'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy',
  'isDeleted', 'version',
];

const WBS_REQUIRED_KEYS = [
  'id', 'projectId', 'code', 'title', 'phase', 'functionGroup', 'status', 'priority',
  'ownerId', 'ownerName', 'startDate', 'endDate', 'progress',
  'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy',
  'isDeleted', 'version',
];

const PHASE_VALUES = new Set(['착수', '분석', '설계', '구현', '검수', '오픈', '완료']);
const STATUS_VALUES = new Set(['wait', 'in_progress', 'delayed', 'done', 'hold']);
const PRIORITY_VALUES = new Set(['high', 'mid', 'low']);
const REQ_CODE_RE = /^REQ_[0-9]{3,}$/;
const FN_CODE_RE = /^FN_[0-9]{3,}$/;
const WBS_CODE_RE = /^WBS-[0-9]{3,}$/;
const DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

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
    readyState: 'complete',
    addEventListener() {},
    querySelector(sel) { return querySelector(document.body, sel); },
    querySelectorAll(sel) { return querySelectorAll(document.body, sel); },
    createElement(tag) { return makeEl(tag); },
  };

  return { document, makeEl };
}

function createFakeFirestore() {
  const store = new Map();
  const paths = [];
  function docRef(pathParts) {
    const key = pathParts.join('/');
    return {
      collection(name) { return collectionRef([...pathParts, name]); },
      get() {
        paths.push(['get', key]);
        const stored = store.get(key);
        return Promise.resolve({
          exists: !!stored,
          data: () => stored || {},
        });
      },
      set(payload, options) {
        paths.push(['set', key, payload, options || null]);
        const prev = store.get(key) || {};
        store.set(key, options && options.merge ? { ...prev, ...payload } : { ...payload });
        return Promise.resolve();
      },
    };
  }
  function collectionRef(pathParts) {
    return {
      doc(id) { return docRef([...pathParts, id || 'AUTO']); },
      get() { return Promise.resolve({ forEach() {} }); },
    };
  }
  return {
    paths,
    store,
    collection(name) { return collectionRef([name]); },
    runTransaction(fn) {
      const pending = [];
      const tx = {
        get(ref) { return ref.get(); },
        set(ref, data, options) { pending.push({ ref, data, options }); },
      };
      return Promise.resolve(fn(tx)).then(() => Promise.all(pending.map((op) => op.ref.set(op.data, op.options))));
    },
  };
}

function createMemberFirestore(membersByProject) {
  const paths = [];
  return {
    paths,
    collection(name) {
      return {
        doc(id) {
          return {
            collection(sub) {
              return {
                where(field, op, value) {
                  paths.push(`${name}/${id}/${sub}${field}${op}${value}`);
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

function installShims(window, projectId) {
  window.__adapterCalls = [];
  window.STAM = window.STAM || {};
  window.firebase = {
    firestore: () => createMemberFirestore({
      [projectId]: [
        { id: 'uid-eseo', data: { userId: 'uid-eseo', projectId, status: 'active', displayName: '이서', role: 'editor', email: 'eseo@example.com' } },
        { id: 'uid-other', data: { userId: 'uid-other', projectId, status: 'active', displayName: 'Other User', role: 'viewer', email: 'other@example.com' } },
      ],
    }),
  };
  window.STAM.requirementsFirestoreAdapter = {
    create() {
      return {
        listByProject(projectId) {
          window.__adapterCalls.push(['requirements.list', projectId]);
          return Promise.resolve([
            { id: 'req-1', projectId, code: 'REQ_001', title: 'Alpha requirement', isDeleted: false },
            { id: 'req-2', projectId, code: 'REQ_002', title: 'Beta requirement', isDeleted: false },
          ]);
        },
        getById() { return Promise.reject(new Error('write denied')); },
        create() { return Promise.reject(new Error('write denied')); },
        update() { return Promise.reject(new Error('write denied')); },
      };
    },
  };
  window.STAM.functionalSpecFirestoreAdapter = {
    create() {
      return {
        listByProject(projectId) {
          window.__adapterCalls.push(['functionalSpec.list', projectId]);
          return Promise.resolve([
            { id: 'fn-1', projectId, code: 'FN_001', title: 'Login spec', isDeleted: false },
            { id: 'fn-2', projectId, code: 'FN_002', title: 'Signup spec', isDeleted: false },
          ]);
        },
        getById() { return Promise.reject(new Error('write denied')); },
        create() { return Promise.reject(new Error('write denied')); },
        update() { return Promise.reject(new Error('write denied')); },
      };
    },
  };
  window.STAM.projectMemberFirestoreAdapter = {
    create() {
      return {
        listActiveByProject(pid) {
          window.__adapterCalls.push(['members.list', pid]);
          return Promise.resolve([
            {
              memberUid: 'uid-eseo',
              memberName: '이서',
              memberRole: 'editor',
              memberEmail: 'eseo@example.com',
              projectId: pid,
              status: 'active',
            },
            {
              memberUid: 'uid-other',
              memberName: 'Other User',
              memberRole: 'viewer',
              memberEmail: 'other@example.com',
              projectId: pid,
              status: 'active',
            },
          ]);
        },
      };
    },
  };
}

function loadModules(context, window) {
  const order = [
    'reference',
    'requirementsService',
    'requirementPicker',
    'functionalSpecService',
    'functionalSpecPicker',
    'projectMemberReadService',
    'projectMemberPicker',
    'wbsService',
    'wbsAdapter',
    'wbsCrud',
  ];
  for (const key of order) {
    vm.runInContext(sources[key], context, { filename: FILES[key] });
  }
  const existingFirestore = window.firebase && window.firebase.firestore ? window.firebase.firestore() : null;
  window.firebase = {
    firestore: Object.assign(function firestore() {
      return existingFirestore;
    }, {
      FieldValue: {
        serverTimestamp() { return { __serverTimestamp: true }; },
        delete() { return { __fieldDelete: true }; },
      },
    }),
  };
}

function makeForm(dom) {
  const fields = {};
  const memberPickers = {};
  const reqSlot = dom.makeEl('div');
  const fnSlot = dom.makeEl('div');
  reqSlot.setAttribute('data-stam-wbs-link-slot', 'requirement');
  fnSlot.setAttribute('data-stam-wbs-link-slot', 'functionalSpec');
  const reqPickerHost = dom.makeEl('div');
  const fnPickerHost = dom.makeEl('div');
  reqPickerHost.setAttribute('data-stam-requirement-picker', '');
  fnPickerHost.setAttribute('data-stam-functional-spec-picker', '');
  reqSlot.appendChild(reqPickerHost);
  fnSlot.appendChild(fnPickerHost);

  function makeInput(value) {
    return {
      value,
      disabled: false,
      matches(sel) { return sel === 'input, textarea, select'; },
      setAttribute() {},
      removeAttribute() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return null; },
      addEventListener() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    };
  }

  const form = {
    getAttribute(name) {
      return name === 'data-stam-wbs-form' ? 'create' : null;
    },
    querySelector(sel) {
      if (sel === '[data-wbs-field="status"]') {
        const row = fields.statusRow || (fields.statusRow = dom.makeEl('div'));
        row.setAttribute('data-wbs-field', 'status');
        return row;
      }
      if (sel === '[data-wbs-field="priority"]') {
        const row = fields.priorityRow || (fields.priorityRow = dom.makeEl('div'));
        row.setAttribute('data-wbs-field', 'priority');
        return row;
      }
      if (sel === '[data-wbs-field="phase"]') {
        const row = fields.phaseRow || (fields.phaseRow = dom.makeEl('div'));
        row.setAttribute('data-wbs-field', 'phase');
        return row;
      }
      if (sel === '[data-wbs-field="startDate"]') {
        const row = fields.startDateRow || (fields.startDateRow = dom.makeEl('div'));
        row.setAttribute('data-wbs-field', 'startDate');
        return row;
      }
      if (sel === '[data-wbs-field="endDate"]') {
        const row = fields.endDateRow || (fields.endDateRow = dom.makeEl('div'));
        row.setAttribute('data-wbs-field', 'endDate');
        return row;
      }
      const map = {
        '[data-wbs-field="title"]': 'title',
        '[data-wbs-field="phase"]': 'phase',
        '[data-wbs-field="businessArea"]': 'businessArea',
        '[data-wbs-field="functionGroup"]': 'functionGroup',
        '[data-wbs-field="screenPath"]': 'screenPath',
        '[data-wbs-field="status"]': 'status',
        '[data-wbs-field="priority"]': 'priority',
        '[data-wbs-field="startDate"]': 'startDate',
        '[data-wbs-field="endDate"]': 'endDate',
        '[data-wbs-field="plannedEffort"]': 'plannedEffort',
        '[data-wbs-field="actualEffort"]': 'actualEffort',
        '[data-wbs-field="progress"]': 'progress',
        '[data-wbs-field="description"]': 'description',
      };
      if (map[sel]) return fields[map[sel]] || (fields[map[sel]] = makeInput(''));
      if (sel === '[data-stam-wbs-member-picker="owner"]') return memberPickers.owner || (memberPickers.owner = dom.makeEl('div'));
      if (sel === '[data-stam-wbs-member-picker="reviewer"]') return memberPickers.reviewer || (memberPickers.reviewer = dom.makeEl('div'));
      if (sel === '[data-stam-wbs-link-slot="requirement"]') return reqSlot;
      if (sel === '[data-stam-wbs-link-slot="functionalSpec"]') return fnSlot;
      if (sel === '[data-stam-requirement-picker]') return reqPickerHost;
      if (sel === '[data-stam-functional-spec-picker]') return fnPickerHost;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'input, textarea, select, button.wbs-form-toggle') return Object.values(fields);
      if (sel === '[data-stam-functional-spec-picker]') return [fnPickerHost];
      if (sel === '[data-stam-requirement-picker]') return [reqPickerHost];
      if (sel === '[data-stam-wbs-member-picker]') return Object.values(memberPickers);
      return [];
    },
    reqPickerHost,
    fnPickerHost,
    memberPickers,
    fields,
  };
  return form;
}

function clickOption(container, optId) {
  const opt = container.querySelectorAll('[data-stam-reference-picker-opt="1"]').find((el) => el.getAttribute('data-opt-id') === optId);
  assert.ok(opt, `option ${optId} must exist`);
  container.querySelector('[data-stam-reference-picker-options]').dispatchEvent({
    type: 'click',
    target: opt,
    preventDefault() {},
    stopPropagation() {},
  });
}

function tripletState(obj, prefix) {
  const keys = [`${prefix}Id`, `${prefix}Code`, `${prefix}Title`];
  const present = keys.filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
  if (present.length === 0) return 'omitted';
  const values = keys.map((k) => String(obj[k] ?? ''));
  if (values.every((v) => v === '')) return 'empty-strings';
  if (values.every((v) => v !== '')) return 'linked';
  return 'partial';
}

function validateTripletRules(data, prefix, codeRe) {
  const idKey = `${prefix}Id`;
  const codeKey = `${prefix}Code`;
  const titleKey = `${prefix}Title`;
  const hasId = Object.prototype.hasOwnProperty.call(data, idKey);
  const hasCode = Object.prototype.hasOwnProperty.call(data, codeKey);
  const hasTitle = Object.prototype.hasOwnProperty.call(data, titleKey);
  if (!hasId && !hasCode && !hasTitle) return { ok: true, reason: 'omitted' };
  if (hasId && hasCode && hasTitle
    && typeof data[idKey] === 'string' && data[idKey].length > 0
    && typeof data[codeKey] === 'string' && codeRe.test(data[codeKey])
    && typeof data[titleKey] === 'string' && data[titleKey].length > 0) {
    return { ok: true, reason: 'linked' };
  }
  return { ok: false, reason: `invalid ${prefix} triplet` };
}

function validateMemberSnapshot(members, projectId, memberUid, memberName) {
  const member = members.find((m) => m.memberUid === memberUid);
  if (!member) return { ok: false, reason: `member doc missing: ${memberUid}` };
  if (member.memberName !== memberName) return { ok: false, reason: `displayName mismatch: payload="${memberName}" member="${member.memberName}"` };
  if (member.status !== 'active') return { ok: false, reason: 'member not active' };
  if (member.projectId !== projectId) return { ok: false, reason: 'member projectId mismatch' };
  return { ok: true, reason: 'snapshot ok' };
}

function validateRulesCreate(data, members, projectId, wbsItemId, actorUid) {
  const failures = [];
  const keys = Object.keys(data);

  for (const key of keys) {
    if (!WBS_WRITE_KEYS.includes(key)) failures.push(`forbidden/extra key: ${key}`);
  }
  for (const key of WBS_REQUIRED_KEYS) {
    if (!keys.includes(key)) failures.push(`missing required key: ${key}`);
  }
  if (keys.length !== WBS_WRITE_KEYS.filter((k) => keys.includes(k)).length && keys.some((k) => !WBS_WRITE_KEYS.includes(k))) {
    // already captured
  }
  const unexpected = keys.filter((k) => !WBS_WRITE_KEYS.includes(k));
  if (unexpected.length) failures.push(`hasOnly violation: ${unexpected.join(',')}`);

  if (data.id !== wbsItemId) failures.push('id != wbsItemId');
  if (data.projectId !== projectId) failures.push('projectId mismatch');
  if (!PHASE_VALUES.has(data.phase)) failures.push(`invalid phase: ${data.phase}`);
  if (!STATUS_VALUES.has(data.status)) failures.push(`invalid status: ${data.status}`);
  if (!PRIORITY_VALUES.has(data.priority)) failures.push(`invalid priority: ${data.priority}`);
  if (!WBS_CODE_RE.test(data.code || '')) failures.push(`invalid code: ${data.code}`);
  if (!DATE_RE.test(data.startDate || '') || !DATE_RE.test(data.endDate || '')) failures.push('invalid date');
  if (data.endDate < data.startDate) failures.push('endDate < startDate');
  if (!Number.isInteger(data.progress)) failures.push(`progress not int: ${data.progress}`);
  if (data.status === 'done' ? data.progress !== 100 : data.progress >= 100) failures.push('progress contract');
  if (data.isDeleted !== false) failures.push('isDeleted must be false');
  if (data.deletedAt !== null) failures.push('deletedAt must be null');
  if (data.deletedBy !== null) failures.push('deletedBy must be null');
  if (data.version !== 1) failures.push('version must be 1');
  if (data.createdBy !== actorUid || data.updatedBy !== actorUid) failures.push('actor uid mismatch');

  if (Object.prototype.hasOwnProperty.call(data, 'businessArea')) {
    if (typeof data.businessArea !== 'string' || data.businessArea.length === 0 || data.businessArea.length > 120) {
      failures.push('businessArea optional contract');
    }
  }
  if (Object.prototype.hasOwnProperty.call(data, 'screenPath')) {
    if (typeof data.screenPath !== 'string' || data.screenPath.length > 500) failures.push('screenPath optional contract');
  }

  const owner = validateMemberSnapshot(members, projectId, data.ownerId, data.ownerName);
  if (!owner.ok) failures.push(owner.reason);

  const hasReviewerId = Object.prototype.hasOwnProperty.call(data, 'reviewerId');
  const hasReviewerName = Object.prototype.hasOwnProperty.call(data, 'reviewerName');
  if (hasReviewerId || hasReviewerName) {
    if (!hasReviewerId || !hasReviewerName || !data.reviewerId || !data.reviewerName) {
      failures.push('reviewer pair invalid or empty strings');
    } else {
      const reviewer = validateMemberSnapshot(members, projectId, data.reviewerId, data.reviewerName);
      if (!reviewer.ok) failures.push(`reviewer: ${reviewer.reason}`);
    }
  }

  const req = validateTripletRules(data, 'requirement', REQ_CODE_RE);
  if (!req.ok) failures.push(req.reason);
  const fn = validateTripletRules(data, 'functionalSpec', FN_CODE_RE);
  if (!fn.ok) failures.push(fn.reason);

  return failures;
}

async function buildRuntime() {
  const dom = createDom();
  const window = {};
  const projectId = 'P-WBS-QA';
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
  installShims(window, projectId);
  loadModules(context, window);

  const actorUid = 'uid-eseo';
  const members = [
    { memberUid: 'uid-eseo', memberName: '이서', memberRole: 'editor', projectId, status: 'active' },
    { memberUid: 'uid-other', memberName: 'Other User', memberRole: 'viewer', projectId, status: 'active' },
  ];

  window.STAM = window.STAM || {};
  window.STAM.wbsUi = {
    getToggleValue(row) {
      const host = row && row.getAttribute && row.getAttribute('data-wbs-field');
      if (host === 'status') return '대기';
      if (host === 'priority') return '보통';
      return '';
    },
    getSelectValue() { return '분석'; },
    getDateValue(row) {
      const host = row && row.getAttribute && row.getAttribute('data-wbs-field');
      if (host === 'startDate') return '2026-07-17';
      if (host === 'endDate') return '2026-07-21';
      return '';
    },
  };

  const form = makeForm(dom);
  for (const name of ['title', 'businessArea', 'functionGroup', 'screenPath', 'plannedEffort', 'actualEffort', 'description', 'progress']) {
    form.querySelector(`[data-wbs-field="${name}"]`);
  }
  form.fields.title.value = '그래그래';
  form.fields.businessArea.value = '';
  form.fields.functionGroup.value = '상품';
  form.fields.screenPath.value = '';
  form.fields.plannedEffort.value = '';
  form.fields.actualEffort.value = '';
  form.fields.description.value = '';
  form.fields.progress.value = '3';

  const reqPicker = window.STAM.requirementPicker;
  const fnPicker = window.STAM.functionalSpecPicker;
  const memPicker = window.STAM.projectMemberPicker;

  form.querySelector('[data-stam-wbs-member-picker="owner"]');
  form.querySelector('[data-stam-wbs-member-picker="reviewer"]');
  form.memberPickers.owner.setAttribute('data-stam-wbs-member-picker', 'owner');
  form.memberPickers.reviewer.setAttribute('data-stam-wbs-member-picker', 'reviewer');
  memPicker.mount(form.memberPickers.owner, { projectId, memberRole: 'editor' });
  memPicker.mount(form.memberPickers.reviewer, { projectId, memberRole: 'editor' });
  await memPicker.load(form.memberPickers.owner);
  await memPicker.load(form.memberPickers.reviewer);
  memPicker.setValue(form.memberPickers.owner, { ownerId: 'uid-eseo', ownerName: '이서' });
  memPicker.setValue(form.memberPickers.reviewer, { reviewerId: 'uid-eseo', reviewerName: '이서' });

  reqPicker.mount(form.reqPickerHost, { projectId, memberRole: 'editor' });
  fnPicker.mount(form.fnPickerHost, { projectId, memberRole: 'editor' });
  await reqPicker.load(form.reqPickerHost);
  await fnPicker.load(form.fnPickerHost);

  const wbsContract = window.STAM.wbsServiceContract;
  const service = wbsContract.createService({
    adapter: window.STAM.wbsFirestoreAdapter.create({ firestore: createFakeFirestore() }),
    clock: () => '2026-07-18T00:00:00.000Z',
    authorize: () => true,
  });

  const crud = window.STAM.wbsFirestoreCrud;
  assert.ok(crud && typeof crud.buildCreateInput === 'function');

  async function runScenario(name, setup) {
    await setup();
    const reqValue = reqPicker.getValue(form.reqPickerHost);
    const fnValue = fnPicker.getValue(form.fnPickerHost);
    const createInput = crud.buildCreateInput(form);
    const servicePayload = service.buildCreatePayload(createInput, { actorUid, actorName: '이서', memberRole: 'editor', projectId });

    const fakeFs = createFakeFirestore();
    const adapter = window.STAM.wbsFirestoreAdapter.create({ firestore: fakeFs });
    const adapterInput = { ...servicePayload, id: 'wbs-new-1', projectId };
    await adapter.create(projectId, adapterInput);
    const itemSet = fakeFs.paths.find((p) => p[0] === 'set' && p[1].endsWith('/wbsItems/wbs-new-1'));
    assert.ok(itemSet, 'adapter must write wbs item');
    const adapterPayload = itemSet[2];
    const counterSet = fakeFs.paths.find((p) => p[0] === 'set' && p[1].endsWith('/counters/wbsItems'));
    const failures = validateRulesCreate(adapterPayload, members, projectId, 'wbs-new-1', actorUid);

    return {
      name,
      reqValue,
      fnValue,
      createInput,
      servicePayload,
      adapterPayload,
      counterSet: counterSet ? counterSet[2] : null,
      reqTriplet: tripletState(createInput, 'requirement'),
      fnTriplet: tripletState(createInput, 'functionalSpec'),
      serviceReqTriplet: tripletState(servicePayload, 'requirement'),
      serviceFnTriplet: tripletState(servicePayload, 'functionalSpec'),
      adapterReqTriplet: tripletState(adapterPayload, 'requirement'),
      adapterFnTriplet: tripletState(adapterPayload, 'functionalSpec'),
      failures,
    };
  }

  const scenarios = {
    A: async () => { reqPicker.clear(form.reqPickerHost); fnPicker.clear(form.fnPickerHost); },
    B: async () => {
      reqPicker.clear(form.reqPickerHost);
      fnPicker.clear(form.fnPickerHost);
      form.reqPickerHost.querySelector('[data-stam-reference-picker-toggle]').click();
      await new Promise((r) => setTimeout(r, 0));
      clickOption(form.reqPickerHost, 'req-1');
    },
    C: async () => {
      await scenarios.B();
      form.reqPickerHost.querySelector('[data-stam-reference-picker-toggle]').click();
      await new Promise((r) => setTimeout(r, 0));
      const unlink = form.reqPickerHost.querySelector('[data-stam-reference-picker-opt=""]')
        || form.reqPickerHost.querySelector('[data-stam-reference-picker-opt]:not([data-stam-reference-picker-opt="1"])');
      assert.ok(unlink, 'unlink option must exist');
      form.reqPickerHost.querySelector('[data-stam-reference-picker-options]').dispatchEvent({
        type: 'click',
        target: unlink,
        preventDefault() {},
        stopPropagation() {},
      });
    },
    D: async () => {
      await scenarios.B();
      form.fnPickerHost.querySelector('[data-stam-reference-picker-toggle]').click();
      await new Promise((r) => setTimeout(r, 0));
      clickOption(form.fnPickerHost, 'fn-1');
    },
    E: async () => { memPicker.clear(form.memberPickers.reviewer); reqPicker.clear(form.reqPickerHost); fnPicker.clear(form.fnPickerHost); },
    F: async () => {
      memPicker.setValue(form.memberPickers.reviewer, { reviewerId: 'uid-eseo', reviewerName: '이서' });
      reqPicker.clear(form.reqPickerHost);
      fnPicker.clear(form.fnPickerHost);
    },
    G: async () => {
      memPicker.setValue(form.memberPickers.owner, { ownerId: 'uid-eseo', ownerName: '이서' });
      memPicker.setValue(form.memberPickers.reviewer, { reviewerId: 'uid-eseo', reviewerName: '이서' });
      reqPicker.clear(form.reqPickerHost);
      fnPicker.clear(form.fnPickerHost);
    },
  };

  const browserVariants = [
    { label: 'browser-none', setup: scenarios.A },
    { label: 'browser-req-only', setup: scenarios.B },
    { label: 'browser-req-fn', setup: scenarios.D },
  ];

  const results = [];
  for (const [key, setup] of Object.entries(scenarios)) {
    results.push(await runScenario(key, setup));
  }
  for (const variant of browserVariants) {
    results.push(await runScenario(variant.label, variant.setup));
  }

  return { results, projectId, actorUid, members };
}

const { results, members, projectId, actorUid } = await buildRuntime();

let failed = 0;
for (const result of results) {
  if (result.failures.length) {
    failed += 1;
    console.error(`FAIL ${result.name}: ${result.failures.join('; ')}`);
  }
}

assert.equal(failed, 0, 'all scenarios must pass rules parity');

for (const result of results) {
  assert.equal(result.reqTriplet === 'partial' || result.serviceReqTriplet === 'partial' || result.adapterReqTriplet === 'partial', false, `${result.name} must not have partial requirement triplet`);
  assert.equal(result.fnTriplet === 'partial' || result.serviceFnTriplet === 'partial' || result.adapterFnTriplet === 'partial', false, `${result.name} must not have partial functionalSpec triplet`);
}

const cleared = results.find((r) => r.name === 'C');
assert.equal(cleared.reqValue.requirementId, '');
assert.equal(cleared.createInput.requirementId, undefined);
assert.equal(cleared.serviceReqTriplet, 'omitted');
assert.equal(cleared.adapterReqTriplet, 'omitted');

const linked = results.find((r) => r.name === 'B');
assert.equal(linked.reqValue.requirementId, 'req-1');
assert.equal(linked.serviceReqTriplet, 'linked');
assert.equal(linked.adapterReqTriplet, 'linked');

const browserFixture = results.find((r) => r.name === 'browser-req-fn');
assert.equal(browserFixture.createInput.title, '그래그래');
assert.equal(browserFixture.createInput.phase, '분석');
assert.equal(browserFixture.createInput.ownerId, 'uid-eseo');
assert.equal(browserFixture.createInput.ownerName, '이서');
assert.equal(browserFixture.createInput.reviewerId, 'uid-eseo');
assert.equal(browserFixture.createInput.status, 'wait');
assert.equal(browserFixture.createInput.priority, 'mid');
assert.equal(browserFixture.createInput.progress, 3);
assert.equal(browserFixture.servicePayload.requirementCode, 'REQ_001');
assert.equal(browserFixture.servicePayload.functionalSpecCode, 'FN_001');
assert.equal(browserFixture.adapterPayload.code, 'WBS-001');
assert.equal(browserFixture.counterSet.lastNumber, 1);

const mismatchPayload = { ...browserFixture.adapterPayload, ownerName: '이서7' };
const mismatchFailures = validateRulesCreate(mismatchPayload, members, projectId, 'wbs-new-1', actorUid);
assert.ok(mismatchFailures.some((f) => f.includes('displayName mismatch')), 'member snapshot mismatch must fail rules parity');

console.log('wbs create rules parity contract: PASS');
console.log(JSON.stringify(results.map((r) => ({
  name: r.name,
  reqTriplet: r.reqTriplet,
  fnTriplet: r.fnTriplet,
  serviceReqTriplet: r.serviceReqTriplet,
  adapterReqTriplet: r.adapterReqTriplet,
  failures: r.failures,
})), null, 2));
