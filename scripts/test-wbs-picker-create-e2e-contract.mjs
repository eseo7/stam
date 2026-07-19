#!/usr/bin/env node
/**
 * STAM WBS Picker → WBS create E2E contract
 *
 * Usage:
 *   node scripts/test-wbs-picker-create-e2e-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJECT_ID = 'P1';
const MEMBER_UID = 'writer-member-uid';
const MEMBER_NAME = 'Active Member';
const WRITER_UID = 'writer-member-uid';

const REQ_FIXTURE = {
  id: 'req-fixture-001',
  code: 'REQ_001',
  title: 'QA PR367 REQ sequence test',
  isDeleted: false,
};

const FN_FIXTURE = {
  id: 'fn-fixture-001',
  code: 'FN_001',
  title: '요구사항 연결해보자',
  isDeleted: false,
};

const WBS_FORM_DEFAULTS = {
  title: 'QA WBS picker E2E',
  phase: '분석',
  functionGroup: '회원관리',
  status: 'wait',
  priority: 'mid',
  progress: 0,
  startDate: '2026-07-20',
  endDate: '2026-07-24',
};

const PRODUCT_FILES = [
  'stam/js/stam.reference-picker.js',
  'stam/js/stam.requirements-firestore-adapter.js',
  'stam/js/stam.requirements-service.js',
  'stam/js/stam.requirement-picker.js',
  'stam/js/stam.functional-spec-firestore-adapter.js',
  'stam/js/stam.functional-spec-service.js',
  'stam/js/stam.functional-spec-picker.js',
  'stam/js/stam.project-member-read-service.js',
  'stam/js/stam.project-member-picker.js',
  'stam/js/stam.wbs-service.js',
  'stam/js/stam.wbs-firestore-adapter.js',
  'stam/js/stam.ui-messages.js',
  'stam/js/stam.wbs-firestore-crud.js',
];

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
    getElementById() { return null; },
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
    alert() {},
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

function createSharedFirestore(seedDocs = {}) {
  const store = new Map(Object.entries(seedDocs));

  function docRef(pathParts) {
    const key = pathParts.join('/');
    return {
      __key: key,
      collection(name) { return collectionRef([...pathParts, name]); },
      get() {
        const stored = store.get(key);
        if (stored) {
          return Promise.resolve({ id: pathParts[pathParts.length - 1], exists: true, data: () => stored });
        }
        return Promise.resolve({ id: pathParts[pathParts.length - 1], exists: false, data: () => ({}) });
      },
      set(payload, setOptions) {
        const prev = store.get(key) || {};
        store.set(key, setOptions && setOptions.merge ? Object.assign({}, prev, payload) : Object.assign({}, payload));
        return Promise.resolve();
      },
    };
  }

  function collectionRef(pathParts) {
    const prefix = pathParts.join('/');
    return {
      doc(id) { return docRef([...pathParts, id]); },
      get() {
        const docs = [];
        for (const [key, data] of store.entries()) {
          if (!key.startsWith(`${prefix}/`)) continue;
          const rest = key.slice(prefix.length + 1);
          if (rest.includes('/')) continue;
          docs.push({ id: rest, exists: true, data: () => data });
        }
        return Promise.resolve({ forEach(fn) { docs.forEach(fn); } });
      },
      where(field, op, value) {
        const self = this;
        return {
          where(field2, op2, value2) {
            return {
              get() {
                return self.get().then((snapshot) => {
                  const filtered = [];
                  snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data[field] === value && data[field2] === value2) filtered.push(doc);
                  });
                  return { forEach(fn) { filtered.forEach(fn); } };
                });
              },
            };
          },
          get() {
            return self.get().then((snapshot) => {
              const filtered = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                if (data[field] === value) filtered.push(doc);
              });
              return { forEach(fn) { filtered.forEach(fn); } };
            });
          },
        };
      },
    };
  }

  return {
    store,
    firestore() {
      return { collection(name) { return collectionRef([name]); } };
    },
    seed(key, value) { store.set(key, value); },
  };
}

function createFakeFirestore(capture) {
  const store = new Map();
  let transactionCount = 0;
  let autoId = 0;

  function docRef(pathParts) {
    const key = pathParts.join('/');
    return {
      __key: key,
      id: pathParts[pathParts.length - 1],
      collection(name) { return collectionRef([...pathParts, name]); },
      get() {
        const stored = store.get(key);
        if (stored) {
          return Promise.resolve({ id: pathParts[pathParts.length - 1], exists: true, data: () => stored });
        }
        return Promise.resolve({ id: pathParts[pathParts.length - 1], exists: false, data: () => ({}) });
      },
      set(payload, setOptions) {
        const prev = store.get(key) || {};
        store.set(key, setOptions && setOptions.merge ? Object.assign({}, prev, payload) : Object.assign({}, payload));
        return Promise.resolve();
      },
    };
  }

  function collectionRef(pathParts) {
    return {
      doc(id) {
        const docId = id || `auto-${++autoId}`;
        return docRef([...pathParts, docId]);
      },
      get() { return Promise.resolve({ forEach() {} }); },
    };
  }

  return {
    store,
    transactionCount: () => transactionCount,
    seedMember(uid, member) {
      store.set(`projects/${PROJECT_ID}/members/${uid}`, member);
    },
    seedCounter(data) {
      store.set(`projects/${PROJECT_ID}/counters/wbsItems`, data);
    },
    collection(name) { return collectionRef([name]); },
    runTransaction(fn) {
      transactionCount += 1;
      const pending = [];
      const tx = {
        get(ref) { return ref.get(); },
        set(ref, data, setOptions) { pending.push({ ref, data, setOptions }); },
      };
      return Promise.resolve(fn(tx)).then((result) => {
        capture.transaction = pending.map((op) => ({
          path: op.ref.__key,
          data: JSON.parse(JSON.stringify(op.data, replacer)),
          merge: !!(op.setOptions && op.setOptions.merge),
        }));
        return Promise.all(pending.map((op) => op.ref.set(op.data, op.setOptions))).then(() => result);
      });
    },
  };
}

function replacer(_key, value) {
  if (value && typeof value === 'object' && value.__serverTimestamp) return { __serverTimestamp: true };
  return value;
}

function parseRulesArray(rulesSource, fnName) {
  const re = new RegExp(`function ${fnName}\\(\\)\\s*\\{[\\s\\S]*?return\\s*\\[([\\s\\S]*?)\\];`);
  const m = rulesSource.match(re);
  assert.ok(m, `${fnName} must exist in firestore.rules`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function parseRulesRegex(rulesSource, field) {
  const re = new RegExp(`data\\.${field}\\.matches\\('(\\^[^']+\\$)'\\)`);
  const m = rulesSource.match(re);
  assert.ok(m, `${field} regex must exist in firestore.rules`);
  return new RegExp(m[1]);
}

function fieldTypes(payload) {
  const out = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === 'object' && value.__serverTimestamp) out[key] = 'serverTimestamp';
    else out[key] = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  }
  return out;
}

function summarizeLink(rulesSource, prefix, payload) {
  const idKey = `${prefix}Id`;
  const codeKey = `${prefix}Code`;
  const titleKey = `${prefix}Title`;
  const codeRe = prefix === 'requirement'
    ? parseRulesRegex(rulesSource, 'requirementCode')
    : parseRulesRegex(rulesSource, 'functionalSpecCode');
  const idVal = payload[idKey];
  const codeVal = payload[codeKey];
  const titleVal = payload[titleKey];
  return {
    idType: typeof idVal,
    idLength: typeof idVal === 'string' ? idVal.length : 0,
    code: codeVal,
    codeValid: typeof codeVal === 'string' ? codeRe.test(codeVal) : false,
    titleType: typeof titleVal,
    titleLength: typeof titleVal === 'string' ? titleVal.length : 0,
  };
}

function validateDocumentPayload(scenario, payload, wbsWriteKeys, wbsRequiredKeys) {
  const keys = Object.keys(payload).sort();
  const extra = keys.filter((k) => !wbsWriteKeys.includes(k));
  const missingRequired = wbsRequiredKeys.filter((k) => !keys.includes(k));
  assert.equal(extra.length, 0, `${scenario}: extra keys ${extra.join(',')}`);
  assert.equal(missingRequired.length, 0, `${scenario}: missing required ${missingRequired.join(',')}`);

  const reqPresent = ['requirementId', 'requirementCode', 'requirementTitle'].filter((k) => keys.includes(k));
  const fnPresent = ['functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle'].filter((k) => keys.includes(k));
  if (reqPresent.length > 0) assert.equal(reqPresent.length, 3, `${scenario}: partial requirement triplet`);
  if (fnPresent.length > 0) assert.equal(fnPresent.length, 3, `${scenario}: partial functionalSpec triplet`);
  if (scenario === 'none') {
    assert.equal(reqPresent.length, 0, `${scenario}: requirement keys must be omitted`);
    assert.equal(fnPresent.length, 0, `${scenario}: functionalSpec keys must be omitted`);
  }

  assert.equal(typeof payload.progress, 'number', `${scenario}: progress must be number`);
  assert.equal(Number.isInteger(payload.version), true, `${scenario}: version must be int`);
  assert.match(String(payload.code || ''), /^WBS-[0-9]{3,}$/);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'code'), true);
  assert.doesNotMatch(JSON.stringify(payload), /"raw"|"meta"|"item"/);

  return keys;
}

async function loadProductRuntime() {
  const dom = createDom();
  const { context, window } = createContext(dom);
  const shared = createSharedFirestore({
    [`projects/${PROJECT_ID}/requirements/${REQ_FIXTURE.id}`]: Object.assign({ projectId: PROJECT_ID }, REQ_FIXTURE),
    [`projects/${PROJECT_ID}/functionalSpecifications/${FN_FIXTURE.id}`]: Object.assign({ projectId: PROJECT_ID }, FN_FIXTURE),
    [`projects/${PROJECT_ID}/members/${MEMBER_UID}`]: {
      userId: MEMBER_UID,
      projectId: PROJECT_ID,
      status: 'active',
      displayName: MEMBER_NAME,
      role: 'editor',
      email: 'writer@example.com',
    },
  });

  vm.runInContext(`
    window.STAM = window.STAM || {};
    window.STAM.wbsFirestoreList = {
      getState: function () {
        return {
          projectId: '${PROJECT_ID}',
          member: { role: 'editor' },
          user: { uid: '${WRITER_UID}', displayName: '${MEMBER_NAME}', email: 'writer@example.com' },
        };
      },
    };
  `, context, { filename: 'e2e-shim.js' });

  for (const rel of PRODUCT_FILES) {
    const code = await readFile(path.join(ROOT, rel), 'utf8');
    vm.runInContext(code, context, { filename: rel });
  }

  window.firebase = {
    firestore: shared.firestore,
    FieldValue: {
      serverTimestamp() { return { __serverTimestamp: true }; },
    },
  };
  window.firebase.firestore.FieldValue = window.firebase.FieldValue;
  return { dom, window, shared };
}

function buildCreateForm(dom) {
  const scope = dom.makeEl('div');
  scope.setAttribute('data-stam-wbs-form', 'create');
  const fields = ['title', 'phase', 'functionGroup', 'status', 'priority', 'progress', 'startDate', 'endDate'];
  for (const name of fields) {
    const input = dom.makeEl('input');
    input.setAttribute('data-wbs-field', name);
    input.value = String(WBS_FORM_DEFAULTS[name] ?? '');
    input.matches = (sel) => sel === 'input, textarea, select';
    scope.appendChild(input);
  }
  const reqSlot = dom.makeEl('div');
  reqSlot.setAttribute('data-stam-wbs-link-slot', 'requirement');
  const reqPicker = dom.makeEl('div');
  reqPicker.setAttribute('data-stam-requirement-picker', '');
  reqSlot.appendChild(reqPicker);
  scope.appendChild(reqSlot);
  const fnSlot = dom.makeEl('div');
  fnSlot.setAttribute('data-stam-wbs-link-slot', 'functionalSpec');
  const fnPicker = dom.makeEl('div');
  fnPicker.setAttribute('data-stam-functional-spec-picker', '');
  fnSlot.appendChild(fnPicker);
  scope.appendChild(fnSlot);
  const ownerSlot = dom.makeEl('div');
  ownerSlot.setAttribute('data-stam-wbs-member-picker', 'owner');
  scope.appendChild(ownerSlot);
  const reviewerSlot = dom.makeEl('div');
  reviewerSlot.setAttribute('data-stam-wbs-member-picker', 'reviewer');
  scope.appendChild(reviewerSlot);
  dom.document.body.appendChild(scope);
  return { scope, reqPicker, fnPicker, ownerSlot, reviewerSlot };
}

async function runScenario(window, dom, scenario) {
  const { scope, reqPicker, fnPicker, ownerSlot, reviewerSlot } = buildCreateForm(dom);
  const reqApi = window.STAM.requirementPicker;
  const fnApi = window.STAM.functionalSpecPicker;
  const memApi = window.STAM.projectMemberPicker;
  const crud = window.STAM.wbsFirestoreCrud;
  const contract = window.STAM.wbsServiceContract;

  reqApi.mount(reqPicker, { projectId: PROJECT_ID, memberRole: 'editor' });
  fnApi.mount(fnPicker, { projectId: PROJECT_ID, memberRole: 'editor' });
  memApi.mountOwner(ownerSlot, { projectId: PROJECT_ID, memberRole: 'editor' });
  memApi.mountReviewer(reviewerSlot, { projectId: PROJECT_ID, memberRole: 'editor' });

  await reqApi.load(reqPicker);
  await fnApi.load(fnPicker);
  await memApi.load(ownerSlot);
  await memApi.load(reviewerSlot);

  if (scenario === 'requirement' || scenario === 'requirement+functionalSpec') {
    const reqItems = await reqApi.load(reqPicker);
    assert.ok(reqItems.length > 0, `${scenario}: requirement items load empty`);
    reqPicker.querySelector('[data-stam-reference-picker-toggle]').click();
    await new Promise((r) => setTimeout(r, 0));
    const reqOpts = reqPicker.querySelectorAll('[data-stam-reference-picker-opt="1"]');
    assert.ok(reqOpts.length > 0, `${scenario}: requirement options missing`);
    clickOption(reqPicker, REQ_FIXTURE.id);
  } else {
    reqApi.clear(reqPicker);
  }

  if (scenario === 'functionalSpec' || scenario === 'requirement+functionalSpec') {
    const fnItems = await fnApi.load(fnPicker);
    assert.ok(fnItems.length > 0, `${scenario}: functional spec items load empty`);
    fnPicker.querySelector('[data-stam-reference-picker-toggle]').click();
    await new Promise((r) => setTimeout(r, 0));
    const fnOpts = fnPicker.querySelectorAll('[data-stam-reference-picker-opt="1"]');
    assert.ok(fnOpts.length > 0, `${scenario}: functional spec options missing`);
    clickOption(fnPicker, FN_FIXTURE.id);
  } else {
    fnApi.clear(fnPicker);
  }

  memApi.setValue(ownerSlot, { ownerId: MEMBER_UID, ownerName: MEMBER_NAME });
  memApi.setValue(reviewerSlot, { reviewerId: MEMBER_UID, reviewerName: MEMBER_NAME });

  const reqValue = reqApi.getValue(reqPicker);
  const fnValue = fnApi.getValue(fnPicker);
  const createInput = crud.buildCreateInput(scope);
  const servicePayload = contract.buildCreatePayload(createInput, {
    projectId: PROJECT_ID,
    uid: WRITER_UID,
    actorUid: WRITER_UID,
    memberRole: 'editor',
  });

  const capture = {};
  const fakeFs = createFakeFirestore(capture);
  fakeFs.seedMember(WRITER_UID, {
    userId: WRITER_UID,
    projectId: PROJECT_ID,
    status: 'active',
    role: 'editor',
    displayName: MEMBER_NAME,
  });
  fakeFs.seedMember(MEMBER_UID, {
    userId: MEMBER_UID,
    projectId: PROJECT_ID,
    status: 'active',
    role: 'editor',
    displayName: MEMBER_NAME,
  });
  fakeFs.seedCounter({ lastNumber: 1 });

  const adapter = window.STAM.wbsFirestoreAdapter.create({ firestore: fakeFs });
  const service = contract.createService({
    adapter,
    authorize: () => Promise.resolve(true),
    clock: () => '2026-07-19T12:00:00.000Z',
  });

  const item = Object.assign({}, servicePayload, { id: `wbs-${scenario}` });
  await service.create(PROJECT_ID, createInput, {
    projectId: PROJECT_ID,
    uid: WRITER_UID,
    actorUid: WRITER_UID,
    memberRole: 'editor',
  });

  const docWrite = capture.transaction.find((op) => op.path.includes('/wbsItems/'));
  const counterWrite = capture.transaction.find((op) => op.path.includes('/counters/wbsItems'));
  assert.ok(docWrite, `${scenario}: document write missing`);
  assert.ok(counterWrite, `${scenario}: counter write missing`);
  assert.equal(capture.transaction.length, 2, `${scenario}: transaction must have counter + document`);

  const documentPayload = Object.assign({}, docWrite.data);
  delete documentPayload.createdAt;
  delete documentPayload.updatedAt;

  return {
    scenario,
    requirementPicker: reqValue,
    functionalSpecPicker: fnValue,
    createInput,
    servicePayload,
    transaction: {
      counter: counterWrite.data,
      document: docWrite.data,
    },
    documentKeys: Object.keys(documentPayload).sort(),
    fieldTypes: fieldTypes(documentPayload),
    item,
  };
}

export async function buildWbsPickerCreateScenarios() {
  const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
  const wbsWriteKeys = parseRulesArray(rulesSource, 'wbsWriteKeys');
  const wbsRequiredKeys = parseRulesArray(rulesSource, 'wbsRequiredKeys');

  const runtime = await loadProductRuntime();
  const scenarioNames = ['none', 'requirement', 'functionalSpec', 'requirement+functionalSpec'];
  const scenarios = [];

  for (const scenario of scenarioNames) {
    while (runtime.dom.document.body.children.length > 0) {
      runtime.dom.document.body.children.pop();
    }
    const result = await runScenario(runtime.window, runtime.dom, scenario);
    const documentPayload = Object.assign({}, result.transaction.document);
    delete documentPayload.createdAt;
    delete documentPayload.updatedAt;

    if (scenario !== 'none') {
      if (result.requirementPicker.requirementId) {
        result.requirement = summarizeLink(rulesSource, 'requirement', result.transaction.document);
      }
      if (result.functionalSpecPicker.functionalSpecId) {
        result.functionalSpec = summarizeLink(rulesSource, 'functionalSpec', result.transaction.document);
      }
    }

    scenarios.push(result);
  }

  return {
    rulesSource,
    wbsWriteKeys,
    wbsRequiredKeys,
    scenarios,
  };
}

async function runContractAssertions() {
  const { rulesSource, wbsWriteKeys, wbsRequiredKeys, scenarios } = await buildWbsPickerCreateScenarios();

  for (const result of scenarios) {
    const keys = validateDocumentPayload(
      result.scenario,
      result.transaction.document,
      wbsWriteKeys,
      wbsRequiredKeys,
    );
    result.documentKeys = keys;
    console.log(`scenario: ${result.scenario}`);
    console.log('document keys:', JSON.stringify(keys));
    if (result.requirement) console.log('requirement:', JSON.stringify(result.requirement));
    if (result.functionalSpec) console.log('functionalSpec:', JSON.stringify(result.functionalSpec));
  }

  void rulesSource;
  console.log('wbs picker create e2e contract: PASS');
}

const isDirectRun = process.argv[1]
  && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isDirectRun) {
  runContractAssertions().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
