#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-crud.js'), 'utf8');
const instrumentedCrudSource = crudSource.replace(
  'function openEdit() {',
  'function openEdit() { __wbsCalls.openEdit += 1;',
);
const wbsSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs.js'), 'utf8');
const listSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-list.js'), 'utf8');
const pageSource = await readFile(path.join(ROOT, 'stam/pages/boards/wbs.html'), 'utf8');

assert.match(crudSource, /svc\.create\(projectId, input, context\)/);
assert.match(crudSource, /svc\.update\(projectId, item\.id, patch, context\)/);
assert.equal(/collection\(['"]wbsItems['"]\)/.test(crudSource), false);
assert.equal(/\.softDelete\(/.test(crudSource), false);
assert.match(crudSource, /canWriteWbs/);
assert.match(crudSource, /requirementPicker/);
assert.match(crudSource, /initAll/);
assert.match(crudSource, /fnApi\.load\(fnPicker\)/);
assert.match(crudSource, /applyDefaultOwner/);
assert.match(crudSource, /omitWhenUnlinked: true/);
assert.match(crudSource, /reviewerId: ''/);
assert.match(crudSource, /reviewerId: clean\(snap\.reviewerId/);
assert.doesNotMatch(crudSource, /setTimeout/);
assert.doesNotMatch(crudSource, /projectMemberReadService\.listActiveMembers/);
assert.match(crudSource, /projectMemberPicker/);
assert.match(crudSource, /functionalSpecPicker\.mount|fnApi\.mount/);
assert.match(listSource, /refreshCrudAccessUI/);
assert.match(pageSource, /stam\.wbs-firestore-crud\.js/);
assert.match(pageSource, /stam\.wbs-firestore-list\.js/);
assert.doesNotMatch(pageSource, /stam\.wbs-crud\.js/);

const calls = {
  memberLoads: 0,
  applyDefaultOwner: 0,
  fnMounts: 0,
  fnLoads: 0,
  openEdit: 0,
  openDrawer: [],
  create: 0,
  update: 0,
  firestoreWrites: 0,
};

function makeInput(value) {
  return {
    value,
    disabled: false,
    matches(sel) {
      if (sel === 'input, textarea, select') return true;
      return false;
    },
    setAttribute() {},
    removeAttribute() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  };
}

function makeForm(mode) {
  const fields = {};
  const memberPickers = {};
  const fnPicker = { attrs: { 'data-stam-reference-picker-mounted': null } };
  const reqPicker = {};
  return {
    getAttribute(name) {
      if (name === 'data-stam-wbs-form') return mode;
      return null;
    },
    querySelector(sel) {
      if (sel === '[data-wbs-field="title"]') return fields.title || (fields.title = makeInput(''));
      if (sel === '[data-wbs-field="phase"]') return fields.phase || (fields.phase = makeInput('착수'));
      if (sel === '[data-wbs-field="businessArea"]') return fields.businessArea || (fields.businessArea = makeInput(''));
      if (sel === '[data-wbs-field="functionGroup"]') return fields.functionGroup || (fields.functionGroup = makeInput(''));
      if (sel === '[data-wbs-field="screenPath"]') return fields.screenPath || (fields.screenPath = makeInput(''));
      if (sel === '[data-wbs-field="status"]') return fields.status || (fields.status = makeInput(''));
      if (sel === '[data-wbs-field="priority"]') return fields.priority || (fields.priority = makeInput(''));
      if (sel === '[data-wbs-field="startDate"]') return fields.startDate || (fields.startDate = makeInput('2026-07-01'));
      if (sel === '[data-wbs-field="endDate"]') return fields.endDate || (fields.endDate = makeInput('2026-07-10'));
      if (sel === '[data-wbs-field="plannedEffort"]') return fields.plannedEffort || (fields.plannedEffort = makeInput(''));
      if (sel === '[data-wbs-field="actualEffort"]') return fields.actualEffort || (fields.actualEffort = makeInput(''));
      if (sel === '[data-wbs-field="progress"]') return fields.progress || (fields.progress = makeInput('0'));
      if (sel === '[data-wbs-field="description"]') return fields.description || (fields.description = makeInput(''));
      if (sel === '[data-stam-wbs-member-picker="owner"]') return memberPickers.owner || (memberPickers.owner = { attrs: {} });
      if (sel === '[data-stam-wbs-member-picker="reviewer"]') return memberPickers.reviewer || (memberPickers.reviewer = { attrs: {} });
      if (sel === '[data-stam-wbs-link-slot="functionalSpec"]') {
        return { querySelector() { return fnPicker; } };
      }
      if (sel === '[data-stam-wbs-link-slot="requirement"]') {
        return { querySelector() { return reqPicker; } };
      }
      if (sel === '[data-stam-functional-spec-picker]') return fnPicker;
      if (sel === '[data-stam-requirement-picker]') return reqPicker;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'input, textarea, select, button.wbs-form-toggle') return Object.values(fields);
      if (sel === '[data-stam-functional-spec-picker]') return [fnPicker];
      if (sel === '[data-stam-requirement-picker]') return [reqPicker];
      if (sel === '[data-stam-wbs-member-picker]') return Object.values(memberPickers);
      return [];
    },
    fnPicker,
    memberPickers,
  };
}

const createForm = makeForm('create');
const editForm = makeForm('edit');
const liveRoot = { getAttribute: () => 'true' };
const regBtn = { listeners: {}, attrs: {}, disabled: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute() {}, addEventListener(evt, fn) { this.listeners[evt] = fn; } };
const editBtn = { listeners: {}, attrs: {}, disabled: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute() {}, addEventListener(evt, fn) { this.listeners[evt] = fn; } };
const createSaveBtn = { listeners: {}, attrs: {}, disabled: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute() {}, addEventListener(evt, fn) { this.listeners[evt] = fn; } };
const editSaveBtn = { listeners: {}, attrs: {}, disabled: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute() {}, addEventListener(evt, fn) { this.listeners[evt] = fn; } };

const fnPickerCreate = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };
const fnPickerEdit = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };
const memberOwnerCreate = { attrs: { 'data-stam-wbs-member-picker': 'owner' }, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };
const memberOwnerEdit = { attrs: { 'data-stam-wbs-member-picker': 'owner' }, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };
const memberReviewerCreate = { attrs: { 'data-stam-wbs-member-picker': 'reviewer' }, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };
const memberReviewerEdit = { attrs: { 'data-stam-wbs-member-picker': 'reviewer' }, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };

const listState = {
  projectId: 'P-WBS4',
  member: { role: 'editor' },
  user: { uid: 'qa-user', displayName: 'QA User', email: 'qa@example.com' },
  currentItem: {
    id: 'doc-1',
    code: 'WBS-001',
    title: 'Edit item',
    phase: '구현',
    functionGroup: '인증',
    status: 'in_progress',
    priority: 'mid',
    ownerId: 'qa-user',
    ownerName: 'QA User',
    reviewerId: 'rev-1',
    reviewerName: 'Reviewer',
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    progress: 37,
    functionalSpecId: 'fn-1',
    functionalSpecCode: 'FN_001',
    functionalSpecTitle: 'Spec title',
  },
};

const memberApi = {
  listActiveMembers(projectId, context, role) {
    calls.memberLoads += 1;
    assert.equal(projectId, 'P-WBS4');
    assert.equal(role, 'editor');
    assert.ok(context && context.source);
    return Promise.resolve([
      { memberUid: 'qa-user', memberName: 'QA User', memberRole: 'editor', status: 'active' },
      { memberUid: 'other', memberName: 'Other', memberRole: 'viewer', status: 'active' },
    ]);
  },
  applyDefaultOwner(container, members, authUser) {
    calls.applyDefaultOwner += 1;
    assert.equal(authUser.uid, 'qa-user');
    memberApi.setValue(container, { ownerId: 'qa-user', ownerName: 'QA User' });
    return { ownerId: 'qa-user', ownerName: 'QA User' };
  },
  mount() {},
  getValue(container) {
    return container.__value || { ownerId: '', ownerName: '', reviewerId: '', reviewerName: '' };
  },
  setValue(container, value) {
    container.__value = value;
  },
  clear(container) {
    container.__value = { ownerId: '', ownerName: '', reviewerId: '', reviewerName: '' };
  },
  setDisabled() {},
  refreshContext() {},
};

const fnApi = {
  mount(container, options) {
    calls.fnMounts += 1;
    container.setAttribute('data-stam-reference-picker-mounted', '1');
    assert.equal(options.projectId, 'P-WBS4');
    assert.equal(options.memberRole, 'editor');
    assert.ok(options.context);
  },
  load(container) {
    calls.fnLoads += 1;
    return Promise.resolve();
  },
  setValue() {},
  clear() {},
  getValue() {
    return { functionalSpecId: '', functionalSpecCode: '', functionalSpecTitle: '' };
  },
  setDisabled() {},
  refreshContext() {},
};

const reqApi = {
  initAll() {},
  getValue() { return { requirementId: '', requirementCode: '', requirementTitle: '' }; },
  setValue() {},
  clear() {},
  setDisabled() {},
  refreshContext() {},
};

const wbsService = {
  create(projectId, input, context) {
    calls.create += 1;
    assert.equal(projectId, 'P-WBS4');
    assert.ok(context);
    return Promise.resolve({ id: 'new-doc' });
  },
  update(projectId, id, patch, context) {
    calls.update += 1;
    assert.equal(projectId, 'P-WBS4');
    assert.equal(id, 'doc-1');
    assert.ok(context);
    return Promise.resolve({ id });
  },
};

const domReadyCallbacks = [];
const context = vm.createContext({
  console,
  __wbsCalls: calls,
  window: {
    STAM: {
      wbsFirestoreList: {
        getState() { return listState; },
        serviceContext(source) { return { source, memberRole: 'editor', actorUid: 'qa-user' }; },
        load() { return Promise.resolve([]); },
        statusInfo() { return { label: '진행중', cls: 'wc-prog' }; },
        priorityInfo() { return { label: '보통', cls: 'prio-mid' }; },
        deriveScheduleState() { return { verdict: '진행중' }; },
      },
      wbsServiceContract: {
        canWriteWbs(role) { return ['owner', 'admin', 'editor'].includes(String(role).toLowerCase()); },
      },
      wbsService,
      uiMessages: { wbs: { writeDenied: 'denied', scopeUnsupported: 'scope', deleteUnsupported: 'delete' } },
      wbsUi: {
        openDrawer(mode) { calls.openDrawer.push(mode); },
        closeDrawer() {},
        getToggleValue() { return '대기'; },
        getSelectValue() { return '착수'; },
        getDateValue() { return '2026-07-01'; },
        setToggleValue() {},
        setSelectValue() {},
        setDateValue() {},
      },
      projectMemberPicker: memberApi,
      functionalSpecPicker: fnApi,
      requirementPicker: reqApi,
      boardFilter: { init() { return {}; } },
      navRender: { init() {} },
    },
    firebase: {
      firestore() {
        return {
          collection() {
            return {
              doc() {
                return {
                  set() { calls.firestoreWrites += 1; },
                  update() { calls.firestoreWrites += 1; },
                  collection() { return this; },
                  get() { return Promise.resolve({ exists: false }); },
                };
              },
            };
          },
        };
      },
    },
    scrollTo() {},
  },
  document: {
    readyState: 'loading',
    addEventListener(evt, fn) {
      if (evt === 'DOMContentLoaded') domReadyCallbacks.push(fn);
    },
    getElementById(id) {
      if (id === 'wbs-reg-btn') return regBtn;
      if (id === 'wbs-create-save-btn') return createSaveBtn;
      if (id === 'wbs-edit-save-btn') return editSaveBtn;
      return null;
    },
    querySelector(sel) {
      if (sel === '[data-stam-wbs-live="true"]') return liveRoot;
      if (sel === '[data-stam-wbs-form="create"]') return createForm;
      if (sel === '[data-stam-wbs-form="edit"]') return editForm;
      if (sel === '.wbs-drawer-edit-btn') return editBtn;
      if (sel === '.wbs-wrap') return { classList: { add() {}, remove() {} } };
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[data-stam-wbs-member-picker]') {
        return [memberOwnerCreate, memberReviewerCreate, memberOwnerEdit, memberReviewerEdit];
      }
      if (sel === '[data-stam-functional-spec-picker]') return [fnPickerCreate, fnPickerEdit];
      if (sel === '[data-stam-requirement-picker]') return [{}, {}];
      if (sel === '[data-wbs-field="status"]') return [];
      if (sel === '[data-stam-wbs-excluded-control="meeting"] button') return [];
      return [];
    },
  },
  alert() {},
  Promise, String, Array, Object, Error, Number, Math, Date,
});
context.window.window = context.window;
context.document = context.document;
context.window.document = context.document;

vm.runInContext(instrumentedCrudSource, context, { filename: 'stam.wbs-firestore-crud.js' });

const crud = context.window.STAM.wbsFirestoreCrud;
assert.ok(crud);

context.document.readyState = 'complete';
domReadyCallbacks.forEach((fn) => fn());
for (let i = 0; i < 10; i += 1) await Promise.resolve();

await crud.openRegister();
for (let i = 0; i < 10; i += 1) await Promise.resolve();

assert.equal(calls.openDrawer.filter((m) => m === 'create').length, 1);
assert.equal(calls.memberLoads, 1);
assert.equal(calls.applyDefaultOwner, 1);
assert.equal(calls.fnMounts, 2);

memberReviewerCreate.__value = { reviewerId: 'rev-create', reviewerName: 'Create Reviewer' };
createForm.querySelector('[data-stam-wbs-member-picker="reviewer"]').__value = memberReviewerCreate.__value;
const createInput = crud.buildCreateInput(createForm);
assert.equal(createInput.reviewerId, 'rev-create');
assert.equal(createInput.reviewerName, 'Create Reviewer');

calls.memberLoads = 0;
calls.fnLoads = 0;
calls.openEdit = 0;

editBtn.listeners.click();
for (let i = 0; i < 10; i += 1) await Promise.resolve();

assert.equal(calls.openEdit, 1);
assert.equal(calls.memberLoads, 1);
assert.equal(calls.fnLoads, 1);
assert.equal(calls.openDrawer.filter((m) => m === 'edit').length, 1);

memberReviewerEdit.__value = { reviewerId: 'rev-update', reviewerName: 'Update Reviewer' };
editForm.querySelector('[data-stam-wbs-member-picker="reviewer"]').__value = memberReviewerEdit.__value;
const updatePatch = crud.buildUpdatePatch(editForm);
assert.equal(updatePatch.reviewerId, 'rev-update');
assert.equal(updatePatch.reviewerName, 'Update Reviewer');

memberReviewerEdit.__value = { reviewerId: '', reviewerName: '' };
editForm.querySelector('[data-stam-wbs-member-picker="reviewer"]').__value = memberReviewerEdit.__value;
const clearPatch = crud.buildUpdatePatch(editForm);
assert.equal(clearPatch.reviewerId, '');
assert.equal(clearPatch.reviewerName, '');

listState.member.role = 'viewer';
crud.applyWriteAccessUI();
assert.equal(regBtn.disabled, true);
assert.equal(editBtn.disabled, true);
assert.equal(createSaveBtn.disabled, true);
assert.equal(editSaveBtn.disabled, true);

listState.member.role = 'editor';
crud.applyWriteAccessUI();
await crud.submitCreate();
for (let i = 0; i < 10; i += 1) await Promise.resolve();
assert.equal(calls.create, 0);

createForm.querySelector('[data-wbs-field="title"]').value = 'New task title';
createForm.querySelector('[data-wbs-field="functionGroup"]').value = 'Auth';
memberOwnerCreate.__value = { ownerId: 'qa-user', ownerName: 'QA User' };
memberReviewerCreate.__value = { reviewerId: 'rev-payload', reviewerName: 'Payload Reviewer' };
await crud.submitCreate();
for (let i = 0; i < 10; i += 1) await Promise.resolve();
assert.equal(calls.create, 1);
assert.equal(calls.firestoreWrites, 0);

await crud.submitUpdate();
for (let i = 0; i < 10; i += 1) await Promise.resolve();
assert.equal(calls.update, 1);
assert.equal(calls.firestoreWrites, 0);

// Full View live edit — wbs.js + crud.js shared VM
const fvEditTrig = {
  listeners: {},
  hidden: false,
  disabled: false,
  attrs: {},
  setAttribute(k, v) { this.attrs[k] = v; },
  removeAttribute(k) { delete this.attrs[k]; },
  addEventListener(evt, fn) { this.listeners[evt] = fn; },
};
const fvPanel = { attrs: { 'data-open': 'false' }, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };
const fvModeTag = { textContent: '' };
const fvBody = { innerHTML: '' };
const fvFoot = { innerHTML: '', querySelector() { return null; } };
const wbsWrap = { classList: { add() {}, remove() {} } };

context.document.getElementById = function getElementById(id) {
  if (id === 'wbs-reg-btn') return regBtn;
  if (id === 'wbs-create-save-btn') return createSaveBtn;
  if (id === 'wbs-edit-save-btn') return editSaveBtn;
  if (id === 'wbs-fv-edit-trigger') return fvEditTrig;
  if (id === 'wbs-fv-inline') return fvPanel;
  if (id === 'wbs-fv-mode-tag') return fvModeTag;
  if (id === 'wbs-fv-body') return fvBody;
  if (id === 'wbs-fv-foot') return fvFoot;
  if (id === 'wbs-fv-x-btn') return { addEventListener() {} };
  if (id === 'wbs-fv-back-btn') return { addEventListener() {} };
  if (id === 'wbs-fv-foot-back') return { addEventListener() {} };
  return null;
};
context.document.querySelector = function querySelector(sel) {
  if (sel === '[data-stam-wbs-live="true"]') return liveRoot;
  if (sel === '[data-stam-wbs-form="create"]') return createForm;
  if (sel === '[data-stam-wbs-form="edit"]') return editForm;
  if (sel === '.wbs-drawer-edit-btn') return editBtn;
  if (sel === '.wbs-wrap') return wbsWrap;
  return null;
};

calls.openEdit = 0;
const wbsDomReady = [];
context.document.addEventListener = function addEventListener(evt, fn) {
  if (evt === 'DOMContentLoaded') wbsDomReady.push(fn);
};
context.document.readyState = 'loading';
vm.runInContext(wbsSource, context, { filename: 'stam.wbs.js' });
context.document.readyState = 'complete';
wbsDomReady.forEach((fn) => fn());
for (let i = 0; i < 10; i += 1) await Promise.resolve();

const wbsUi = context.window.STAM.wbsUi;
assert.ok(wbsUi && typeof wbsUi.openFullView === 'function');

wbsUi.openFullView('detail');
assert.match(fvModeTag.textContent, /상세/);
assert.doesNotMatch(fvModeTag.textContent, /수정/);
assert.equal(fvEditTrig.hidden, false);
assert.equal(fvEditTrig.disabled, false);

calls.openEdit = 0;
fvEditTrig.listeners.click();
for (let i = 0; i < 10; i += 1) await Promise.resolve();
assert.equal(calls.openEdit, 1);
assert.equal(fvPanel.attrs['data-open'], 'false');

fvFoot.innerHTML = '<button class="wbs-btn wbs-fv-foot-edit" type="button">수정</button>';
const footEdit = {
  addEventListener(evt, fn) {
    if (evt === 'click') this.listeners = { click: fn };
  },
  listeners: {},
};
fvFoot.querySelector = function querySelector(sel) {
  if (sel === '.wbs-fv-foot-edit') return footEdit;
  if (sel === '.wbs-fv-back-foot') return null;
  return null;
};
wbsUi.openFullView('detail');
footEdit.listeners.click();
for (let i = 0; i < 10; i += 1) await Promise.resolve();
assert.equal(calls.openEdit, 2);

listState.member.role = 'viewer';
crud.applyWriteAccessUI();
wbsUi.openFullView('detail');
assert.equal(fvEditTrig.hidden, true);
assert.equal(fvEditTrig.disabled, true);

calls.openEdit = 0;
fvEditTrig.listeners.click();
for (let i = 0; i < 10; i += 1) await Promise.resolve();
assert.equal(calls.openEdit, 0);

wbsUi.openFullView('edit');
assert.match(fvModeTag.textContent, /상세/);
assert.doesNotMatch(fvModeTag.textContent, /수정/);

console.log('wbs crud ui contract: PASS');
