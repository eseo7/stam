#!/usr/bin/env node
/**
 * STAM PR D1 — screenSections service + adapter contract
 *
 * Usage:
 *   node scripts/test-screen-section-service-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const conditionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-condition-contract.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-section-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-section-firestore-adapter.js'), 'utf8');

assert.ok(conditionSource);
assert.ok(serviceSource);
assert.ok(adapterSource);
assert.match(adapterSource, /COLLECTION = 'screenSections'/);
assert.match(adapterSource, /validateParentSnapshot/);
assert.doesNotMatch(adapterSource, /transaction\.get\(query\)/i);
assert.match(serviceSource, /DELETE: 'screenSection\.delete'/);
assert.match(serviceSource, /SCREEN_SECTION_DUPLICATE_NAME/);

function createContext() {
  const window = {};
  window.firebase = {
    firestore: Object.assign(() => null, {
      FieldValue: {
        serverTimestamp() { return { __serverTimestamp: true }; },
      },
    }),
  };
  const context = vm.createContext({
    window, console, Date, Promise, Number, String, JSON, Array, Object, Error, Math, RegExp,
  });
  window.window = window;
  return { context, window };
}

async function loadModules() {
  const { context, window } = createContext();
  vm.runInContext(conditionSource, context, { filename: 'stam.screen-condition-contract.js' });
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-section-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-section-service.js' });
  return {
    contract: window.STAM.screenSectionServiceContract,
    adapterContract: window.STAM.screenSectionFirestoreAdapter,
    conditionContract: window.STAM.screenConditionContract,
  };
}

function validCreateInput(overrides = {}) {
  return {
    screenSpecId: 'scr-1',
    name: 'mainForm',
    label: '메인 폼',
    sectionType: 'form',
    ...overrides,
  };
}

function seedSection(overrides = {}) {
  return {
    id: 'sec-1',
    projectId: 'P1',
    screenSpecId: 'scr-1',
    order: 0,
    name: 'mainForm',
    label: '메인 폼',
    sectionType: 'form',
    parentSectionId: null,
    layout: { columns: 1, gap: 'md', collapsible: false, defaultCollapsed: false },
    visibilityCondition: null,
    description: null,
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'u1',
    ...overrides,
  };
}

function fieldCondition(sourceId = 'fld-1', overrides = {}) {
  return {
    logic: 'all',
    conditions: [{
      source: 'field',
      sourceId,
      operator: 'eq',
      value: 'yes',
      ...overrides,
    }],
  };
}

function createFakeAdapter(initial = [], options = {}) {
  const store = new Map(initial.map((item) => [item.id, Object.assign({}, item)]));
  const fieldIds = options.fieldIds || ['fld-1'];
  const childCounts = options.childCounts || {};
  const fieldRefCounts = options.fieldRefCounts || {};
  const actionRefCounts = options.actionRefCounts || {};

  return {
    findDuplicateNormalizedName(projectId, screenSpecId, normalizedName, excludeSectionId) {
      for (const item of store.values()) {
        if (item.projectId !== projectId || item.screenSpecId !== screenSpecId) continue;
        if (excludeSectionId && item.id === excludeSectionId) continue;
        if (adapterContract.normalizeName(item.name) === normalizedName) {
          return Promise.resolve(item.id);
        }
      }
      return Promise.resolve(null);
    },
    listFieldIdsByScreenSpec(projectId, screenSpecId) {
      return Promise.resolve(fieldIds);
    },
    listByScreenSpec(projectId, screenSpecId) {
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId && item.screenSpecId === screenSpecId));
    },
    listByProject(projectId) {
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId));
    },
    getById(projectId, sectionId) {
      const item = store.get(sectionId);
      if (!item || item.projectId !== projectId) return Promise.resolve(null);
      return Promise.resolve(Object.assign({}, item));
    },
    create(projectId, section) {
      const id = section.id || `sec-${store.size + 1}`;
      const next = Object.assign({}, section, { id, projectId });
      return this.findDuplicateNormalizedName(projectId, next.screenSpecId, adapterContract.normalizeName(next.name)).then((dup) => {
        if (dup) {
          const err = new Error('duplicate');
          err.code = 'SCREEN_SECTION_DUPLICATE_NAME';
          err.preflight = true;
          return Promise.reject(err);
        }
        store.set(id, next);
        return Promise.resolve(Object.assign({}, next));
      });
    },
    update(projectId, sectionId, patch) {
      const current = store.get(sectionId);
      if (!current) {
        const err = new Error('missing');
        err.code = 'SCREEN_SECTION_NOT_FOUND';
        err.preflight = true;
        return Promise.reject(err);
      }
      const next = Object.assign({}, current, patch);
      if (patch.name && adapterContract.normalizeName(patch.name) !== adapterContract.normalizeName(current.name)) {
        return this.findDuplicateNormalizedName(projectId, current.screenSpecId, adapterContract.normalizeName(patch.name), sectionId).then((dup) => {
          if (dup) {
            const err = new Error('duplicate');
            err.code = 'SCREEN_SECTION_DUPLICATE_NAME';
            err.preflight = true;
            return Promise.reject(err);
          }
          store.set(sectionId, next);
          return Promise.resolve(Object.assign({}, next));
        });
      }
      store.set(sectionId, next);
      return Promise.resolve(Object.assign({}, next));
    },
    delete(projectId, sectionId) {
      const current = store.get(sectionId);
      if (!current || current.projectId !== projectId) {
        const err = new Error('missing');
        err.code = 'SCREEN_SECTION_NOT_FOUND';
        err.preflight = true;
        return Promise.reject(err);
      }
      store.delete(sectionId);
      return Promise.resolve();
    },
    countChildSections(projectId, screenSpecId, sectionId) {
      return Promise.resolve(childCounts[sectionId] || 0);
    },
    countFieldsReferencingSection(projectId, screenSpecId, sectionId) {
      return Promise.resolve(fieldRefCounts[sectionId] || 0);
    },
    countActionsReferencingSection(projectId, screenSpecId, sectionId) {
      return Promise.resolve(actionRefCounts[sectionId] || 0);
    },
    compareScreenSections(a, b) {
      return adapterContract.compareScreenSections(a, b);
    },
  };
}

const { contract, adapterContract } = await loadModules();

let testCount = 0;
function test(name, fn) {
  testCount += 1;
  fn();
}

// ── contract exports ────────────────────────────────────────────────
test('contract exports', () => {
  assert.deepEqual(Object.keys(contract.ACTIONS).sort(), ['CREATE', 'DELETE', 'LIST', 'READ', 'UPDATE']);
  assert.equal(contract.SCHEMA_VERSION, 1);
  assert.equal(contract.SECTION_TYPE_VALUES.length, 10);
  assert.equal(contract.normalizeName(' MainForm '), 'mainform');
});

// ── create: valid section, trim, reject, defaults ───────────────────
test('create valid section', () => {
  const valid = contract.validateScreenSectionInput(validCreateInput(), 'create');
  assert.equal(valid.valid, true);
});

test('create trim name and label', () => {
  const payload = contract.buildCreatePayload(
    validCreateInput({ name: '  mainForm  ', label: '  메인 폼  ' }),
    { actorUid: 'u1', projectId: 'P1', fieldIds: ['fld-1'] },
  );
  assert.equal(payload.name, 'mainForm');
  assert.equal(payload.label, '메인 폼');
});

test('create blank name reject', () => {
  const blankName = contract.validateScreenSectionInput(validCreateInput({ name: '   ' }), 'create');
  assert.equal(blankName.valid, false);
});

test('create bad sectionType reject', () => {
  const badType = contract.validateScreenSectionInput(validCreateInput({ sectionType: 'wizard' }), 'create');
  assert.equal(badType.valid, false);
});

test('create layout defaults', () => {
  const payload = contract.buildCreatePayload(validCreateInput(), { actorUid: 'u1', projectId: 'P1', fieldIds: [] });
  assert.equal(payload.layout.columns, 1);
  assert.equal(payload.layout.gap, 'md');
  assert.equal(payload.layout.collapsible, false);
  assert.equal(payload.layout.defaultCollapsed, false);
});

test('create collapsible=false + defaultCollapsed=true normalization', () => {
  const normalized = contract.normalizeLayoutObject({ collapsible: false, defaultCollapsed: true });
  assert.equal(normalized.collapsible, false);
  assert.equal(normalized.defaultCollapsed, false);
});

test('create missing screenSpecId via validateCompleteDocument', () => {
  const doc = contract.buildCreatePayload(validCreateInput(), { actorUid: 'u1', projectId: 'P1', fieldIds: [] });
  doc.screenSpecId = '';
  const result = contract.validateCompleteDocument(doc, { fieldIds: [] });
  assert.equal(result.valid, false);
});

test('create forbidden id on input', () => {
  const forbidden = contract.validateScreenSectionInput(validCreateInput({ id: 'x' }), 'create');
  assert.equal(forbidden.valid, false);
});

// ── parent rules ────────────────────────────────────────────────────
test('parent same spec ok via validateCompleteDocument', () => {
  const doc = Object.assign({}, seedSection(), {
    parentSectionId: 'sec-tabs',
    sectionType: 'tab',
  });
  const result = contract.validateCompleteDocument(doc, {
    fieldIds: [],
    parentSectionType: 'tabs',
  });
  assert.equal(result.valid, true);
});

test('parent tab to tabs ok via service', async () => {
  const adapter = createFakeAdapter([
    seedSection({ id: 'sec-tabs', sectionType: 'tabs', name: 'tabGroup' }),
  ]);
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  const created = await service.create('P1', validCreateInput({
    name: 'tabOne',
    label: '탭1',
    sectionType: 'tab',
    parentSectionId: 'sec-tabs',
  }), { actorUid: 'u1' });
  assert.equal(created.parentSectionId, 'sec-tabs');
});

test('parent tab missing reject', async () => {
  const adapter = createFakeAdapter([]);
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await assert.rejects(
    () => service.create('P1', validCreateInput({
      name: 'orphanTab',
      label: '고아 탭',
      sectionType: 'tab',
    }), { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.SECTION_PARENT_INVALID,
  );
});

test('parent tab to form reject', async () => {
  const adapter = createFakeAdapter([
    seedSection({ id: 'sec-form', sectionType: 'form', name: 'formParent' }),
  ]);
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await assert.rejects(
    () => service.create('P1', validCreateInput({
      name: 'badTab',
      label: '잘못된 탭',
      sectionType: 'tab',
      parentSectionId: 'sec-form',
    }), { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.SECTION_PARENT_INVALID,
  );
});

test('parent self ref reject', async () => {
  const adapter = createFakeAdapter([
    seedSection({ id: 'sec-self', name: 'selfRef' }),
  ]);
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await assert.rejects(
    () => service.update('P1', 'sec-self', { parentSectionId: 'sec-self' }, { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.SECTION_CYCLE,
  );
});

test('parent cycle reject', async () => {
  const adapter = createFakeAdapter([
    seedSection({ id: 'sec-a', name: 'sectionA', parentSectionId: 'sec-b' }),
    seedSection({ id: 'sec-b', name: 'sectionB', parentSectionId: null }),
  ]);
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await assert.rejects(
    () => service.update('P1', 'sec-b', { parentSectionId: 'sec-a' }, { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.SECTION_CYCLE,
  );
});

// ── conditions ──────────────────────────────────────────────────────
test('conditions field condition ok', () => {
  const doc = Object.assign({}, seedSection(), {
    visibilityCondition: fieldCondition('fld-1'),
  });
  const result = contract.validateCompleteDocument(doc, { fieldIds: ['fld-1'] });
  assert.equal(result.valid, true);
});

test('conditions wrong spec field reject', () => {
  const doc = Object.assign({}, seedSection(), {
    visibilityCondition: fieldCondition('fld-missing'),
  });
  const result = contract.validateCompleteDocument(doc, { fieldIds: ['fld-1'] });
  assert.equal(result.valid, false);
});

test('conditions missing sourceId reject', () => {
  const input = validCreateInput({
    visibilityCondition: {
      logic: 'all',
      conditions: [{ source: 'field', sourceId: '', operator: 'eq', value: 'x' }],
    },
  });
  const result = contract.validateScreenSectionInput(input, 'create');
  assert.equal(result.valid, false);
});

test('conditions operator value mismatch reject', () => {
  const input = validCreateInput({
    visibilityCondition: {
      logic: 'all',
      conditions: [{ source: 'field', sourceId: 'fld-1', operator: 'exists', value: 'not-null' }],
    },
  });
  const result = contract.validateScreenSectionInput(input, 'create');
  assert.equal(result.valid, false);
});

test('conditions empty conditions reject', () => {
  const input = validCreateInput({
    visibilityCondition: { logic: 'all', conditions: [] },
  });
  const result = contract.validateScreenSectionInput(input, 'create');
  assert.equal(result.valid, false);
});

test('conditions more than 20 reject', () => {
  const conditions = Array.from({ length: 21 }, (_, i) => ({
    source: 'role',
    sourceId: null,
    operator: 'eq',
    value: 'editor',
  }));
  const input = validCreateInput({
    visibilityCondition: { logic: 'all', conditions },
  });
  const result = contract.validateScreenSectionInput(input, 'create');
  assert.equal(result.valid, false);
});

test('conditions trim sourceId', () => {
  const payload = contract.buildCreatePayload(validCreateInput({
    visibilityCondition: fieldCondition('  fld-1  '),
  }), { actorUid: 'u1', projectId: 'P1', fieldIds: ['fld-1'] });
  assert.equal(payload.visibilityCondition.conditions[0].sourceId, 'fld-1');
});

// ── update ──────────────────────────────────────────────────────────
test('update label trim', () => {
  const patch = contract.buildUpdatePatch(
    seedSection(),
    { label: '  새 라벨  ' },
    { actorUid: 'u1', fieldIds: [] },
  );
  assert.equal(patch.label, '새 라벨');
});

test('update description blank to null', () => {
  const patch = contract.buildUpdatePatch(
    seedSection({ description: '기존' }),
    { description: '   ' },
    { actorUid: 'u1', fieldIds: [] },
  );
  assert.equal(patch.description, null);
});

test('update parentSectionId blank to null', () => {
  const patch = contract.buildUpdatePatch(
    seedSection({ parentSectionId: 'sec-tabs' }),
    { parentSectionId: '   ' },
    { actorUid: 'u1', fieldIds: [], parentSectionType: null },
  );
  assert.equal(patch.parentSectionId, null);
});

test('update immutable reject', () => {
  const forbidden = contract.validateScreenSectionInput({ screenSpecId: 'other' }, 'update');
  assert.equal(forbidden.valid, false);
});

test('update normalize collapsible before validate', () => {
  const patch = contract.buildUpdatePatch(
    seedSection(),
    { layout: { collapsible: false, defaultCollapsed: true } },
    { actorUid: 'u1', fieldIds: [] },
  );
  assert.equal(patch.layout.collapsible, false);
  assert.equal(patch.layout.defaultCollapsed, false);
});

// ── delete via service + fake adapter ───────────────────────────────
test('delete no refs ok', async () => {
  const adapter = createFakeAdapter([seedSection({ id: 'sec-del', name: 'deletable' })]);
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await service.delete('P1', 'sec-del', { actorUid: 'u1' });
  assert.equal(await service.getById('P1', 'sec-del', { actorUid: 'u1' }), null);
});

test('delete child sections reject', async () => {
  const adapter = createFakeAdapter(
    [seedSection({ id: 'sec-parent', name: 'parentSection' })],
    { childCounts: { 'sec-parent': 2 } },
  );
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await assert.rejects(
    () => service.delete('P1', 'sec-parent', { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.CHILD_SECTIONS_EXIST,
  );
});

test('delete fields reference reject', async () => {
  const adapter = createFakeAdapter(
    [seedSection({ id: 'sec-fields', name: 'fieldHost' })],
    { fieldRefCounts: { 'sec-fields': 1 } },
  );
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await assert.rejects(
    () => service.delete('P1', 'sec-fields', { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.FIELDS_REFERENCE_SECTION,
  );
});

test('delete actions reference reject', async () => {
  const adapter = createFakeAdapter(
    [seedSection({ id: 'sec-actions', name: 'actionHost' })],
    { actionRefCounts: { 'sec-actions': 3 } },
  );
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await assert.rejects(
    () => service.delete('P1', 'sec-actions', { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.ACTIONS_REFERENCE_SECTION,
  );
});

// ── duplicate name via service ──────────────────────────────────────
test('duplicate name via service', async () => {
  const adapter = createFakeAdapter([seedSection()]);
  const service = contract.createService({
    adapter,
    authorize: () => true,
    clock: () => '2026-02-01T00:00:00.000Z',
  });
  await service.create('P1', validCreateInput({ name: 'secondForm' }), { actorUid: 'u1' });
  await assert.rejects(
    () => service.create('P1', validCreateInput({ name: 'SecondForm' }), { actorUid: 'u1' }),
    (err) => err.code === contract.ERROR_CODES.DUPLICATE_NAME,
  );
});

// ── authorize matrix spot check ─────────────────────────────────────
test('authorize roles', () => {
  const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
  assert.equal(authorize(contract.ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
  assert.equal(authorize(contract.ACTIONS.CREATE, { context: { memberRole: 'viewer' } }), false);
  assert.equal(authorize(contract.ACTIONS.DELETE, { context: { memberRole: 'editor' } }), true);
});

console.log(`screen section service contract (${testCount} cases): PASS`);
