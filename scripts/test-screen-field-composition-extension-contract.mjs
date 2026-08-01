#!/usr/bin/env node
/**
 * STAM PR D1 — screenFields composition extension contract
 *
 * Usage:
 *   node scripts/test-screen-field-composition-extension-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const conditionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-condition-contract.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-firestore-adapter.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-service.js'), 'utf8');

assert.ok(conditionSource);
assert.ok(adapterSource);
assert.ok(serviceSource);

function createContext() {
  const window = {};
  window.firebase = {
    firestore: Object.assign(() => null, {
      FieldValue: {
        serverTimestamp() { return { __serverTimestamp: true }; },
        delete() { return { __fieldDelete: true }; },
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
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-field-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-field-service.js' });
  return {
    contract: window.STAM.screenFieldServiceContract,
    conditionContract: window.STAM.screenConditionContract,
  };
}

function validCreateInput(overrides = {}) {
  return {
    screenSpecId: 'scr-1',
    name: 'titleText',
    label: '제목',
    type: 'text',
    ...overrides,
  };
}

function seedField(overrides = {}) {
  return {
    id: 'fld-1',
    projectId: 'P1',
    screenSpecId: 'scr-1',
    order: 0,
    name: 'titleText',
    label: '제목',
    type: 'text',
    required: false,
    readonly: false,
    disabled: false,
    defaultValue: null,
    placeholder: null,
    helpText: null,
    minLength: null,
    maxLength: null,
    options: [],
    validationRules: [],
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'u1',
    ...overrides,
  };
}

function sectionsContext(sections = []) {
  const sectionsById = Object.fromEntries(sections.map((section) => [section.id, section]));
  return {
    sectionsById,
    fieldIds: ['fld-peer'],
  };
}

function fieldCondition(sourceId = 'fld-peer', overrides = {}) {
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

function roleCondition(value = 'editor') {
  return {
    logic: 'all',
    conditions: [{
      source: 'role',
      sourceId: null,
      operator: 'eq',
      value,
    }],
  };
}

function assertCreatePayload(input, context = {}) {
  return contract.buildCreatePayload(input, {
    actorUid: 'u1',
    projectId: 'P1',
    ...context,
  });
}

function assertCompositionErrors(doc, context) {
  const errors = [];
  contract.validateCompositionFields(doc, context, errors);
  return errors;
}

const { contract, conditionContract } = await loadModules();

let testCount = 0;
function test(name, fn) {
  testCount += 1;
  fn();
}
function asyncTest(name) {
  testCount += 1;
}

// ── spec 12.E: legacy normalize defaults ─────────────────────────────
test('legacy doc without composition fields applies defaults', () => {
  const normalized = contract.normalizeScreenField(seedField({
    sectionId: undefined,
    fieldRole: undefined,
    layout: undefined,
    visibilityCondition: undefined,
    enabledCondition: undefined,
    requiredCondition: undefined,
  }));
  assert.equal(normalized.sectionId, null);
  assert.equal(normalized.fieldRole, 'input');
  assert.deepEqual(normalized.layout, contract.DEFAULT_LAYOUT);
  assert.equal(normalized.visibilityCondition, null);
  assert.equal(normalized.enabledCondition, null);
  assert.equal(normalized.requiredCondition, null);
});

// ── sectionId validation ────────────────────────────────────────────
test('sectionId null ok', () => {
  const payload = assertCreatePayload(validCreateInput({ sectionId: null }));
  assert.equal(payload.sectionId, null);
});

test('valid section in context ok', () => {
  const ctx = sectionsContext([{
    id: 'sec-form',
    screenSpecId: 'scr-1',
    sectionType: 'form',
  }]);
  const payload = assertCreatePayload(validCreateInput({
    sectionId: 'sec-form',
    fieldRole: 'input',
  }), ctx);
  assert.equal(payload.sectionId, 'sec-form');
});

test('wrong spec section reject', () => {
  const ctx = sectionsContext([{
    id: 'sec-other',
    screenSpecId: 'scr-2',
    sectionType: 'form',
  }]);
  const errors = assertCompositionErrors(validCreateInput({
    sectionId: 'sec-other',
    fieldRole: 'input',
  }), ctx);
  assert.ok(errors.some((entry) => entry.field === 'sectionId'));
});

test('missing section reject', () => {
  const errors = assertCompositionErrors(validCreateInput({
    sectionId: 'sec-missing',
    fieldRole: 'input',
  }), sectionsContext([]));
  assert.ok(errors.some((entry) => entry.field === 'sectionId'));
});

// ── fieldRole enum validation ───────────────────────────────────────
test('fieldRole enum accepts all supported values', () => {
  for (const fieldRole of contract.FIELD_ROLE_VALUES) {
    const sectionType = fieldRole === 'tableColumn'
      ? 'table'
      : fieldRole === 'repeaterItem'
        ? 'repeater'
        : fieldRole === 'filter'
          ? 'search'
          : 'form';
    const sectionId = `sec-${fieldRole}`;
    const ctx = sectionsContext([{
      id: sectionId,
      screenSpecId: 'scr-1',
      sectionType,
    }]);
    const payload = assertCreatePayload(validCreateInput({
      name: `field_${fieldRole}`,
      sectionId,
      fieldRole,
    }), ctx);
    assert.equal(payload.fieldRole, fieldRole);
  }
});

test('fieldRole invalid value rejects on create', () => {
  assert.throws(
    () => assertCreatePayload(validCreateInput({ fieldRole: 'sortKey' })),
    (err) => err.code === contract.ERROR_CODES.VALIDATION_FAILED,
  );
});

test('fieldRole blank string rejects on create', () => {
  assert.throws(
    () => assertCreatePayload(validCreateInput({ fieldRole: '   ' })),
    (err) => err.code === contract.ERROR_CODES.VALIDATION_FAILED,
  );
});

test('fieldRole missing defaults to input on create', () => {
  const payload = assertCreatePayload(validCreateInput());
  assert.equal(payload.fieldRole, 'input');
});

test('legacy stored invalid fieldRole is preserved on read', () => {
  const normalized = contract.normalizeScreenField(seedField({ fieldRole: 'sortKey' }));
  assert.equal(normalized.fieldRole, 'sortKey');
});

test('fieldRole enum rejects unsupported values via condition contract', () => {
  const errors = [];
  const ok = conditionContract.validateFieldRole('sortKey', errors);
  assert.equal(ok, false);
  assert.ok(errors.some((entry) => entry.field === 'fieldRole'));
});

// ── fieldRole / sectionType pairing ─────────────────────────────────
test('tableColumn + table section ok', () => {
  const ctx = sectionsContext([{
    id: 'sec-table',
    screenSpecId: 'scr-1',
    sectionType: 'table',
  }]);
  const payload = assertCreatePayload(validCreateInput({
    name: 'colTitle',
    sectionId: 'sec-table',
    fieldRole: 'tableColumn',
  }), ctx);
  assert.equal(payload.fieldRole, 'tableColumn');
});

test('tableColumn + form section reject', () => {
  const ctx = sectionsContext([{
    id: 'sec-form',
    screenSpecId: 'scr-1',
    sectionType: 'form',
  }]);
  const errors = assertCompositionErrors(validCreateInput({
    sectionId: 'sec-form',
    fieldRole: 'tableColumn',
  }), ctx);
  assert.ok(errors.some((entry) => entry.field === 'fieldRole'));
});

test('repeaterItem + repeater ok', () => {
  const ctx = sectionsContext([{
    id: 'sec-repeater',
    screenSpecId: 'scr-1',
    sectionType: 'repeater',
  }]);
  const payload = assertCreatePayload(validCreateInput({
    name: 'lineItem',
    sectionId: 'sec-repeater',
    fieldRole: 'repeaterItem',
  }), ctx);
  assert.equal(payload.fieldRole, 'repeaterItem');
});

// ── layout span validation ──────────────────────────────────────────
test('layout span valid values persist', () => {
  for (const span of [1, 6, 12]) {
    const payload = assertCreatePayload(validCreateInput({
      name: `spanField${span}`,
      layout: { row: null, column: null, span },
    }));
    assert.equal(payload.layout.span, span);
  }
});

test('layout invalid span is preserved on read', () => {
  const normalized = contract.normalizeScreenField(seedField({
    layout: { row: null, column: null, span: 99 },
  }));
  assert.equal(normalized.layout.span, 99);
});

test('layout invalid span rejects on create', () => {
  assert.throws(
    () => assertCreatePayload(validCreateInput({
      name: 'badSpanField',
      layout: { row: null, column: null, span: 99 },
    })),
    (err) => err.code === contract.ERROR_CODES.VALIDATION_FAILED,
  );
});

test('layout unknown key rejects on create', () => {
  assert.throws(
    () => assertCreatePayload(validCreateInput({
      name: 'badLayoutKey',
      layout: { row: null, column: null, span: 12, extra: 1 },
    })),
    (err) => err.code === contract.ERROR_CODES.VALIDATION_FAILED,
  );
});

test('layout invalid span reject via condition contract', () => {
  const errors = [];
  const ok = conditionContract.validateLayoutGrid({ row: null, column: null, span: 0 }, errors, 'layout');
  assert.equal(ok, false);
  assert.ok(errors.some((entry) => entry.field === 'layout.span'));
});

// ── conditions via buildCreatePayload / buildUpdatePatch ────────────
test('visibility/enabled/required conditions save on create', () => {
  const ctx = sectionsContext([{
    id: 'sec-form',
    screenSpecId: 'scr-1',
    sectionType: 'form',
  }]);
  const payload = assertCreatePayload(validCreateInput({
    sectionId: 'sec-form',
    visibilityCondition: roleCondition('editor'),
    enabledCondition: fieldCondition('fld-peer'),
    requiredCondition: fieldCondition('fld-peer', { operator: 'exists', value: null }),
  }), ctx);
  assert.equal(payload.visibilityCondition.conditions[0].source, 'role');
  assert.equal(payload.enabledCondition.conditions[0].sourceId, 'fld-peer');
  assert.equal(payload.requiredCondition.conditions[0].operator, 'exists');
});

test('visibility/enabled/required conditions save on update patch', () => {
  const ctx = sectionsContext([{
    id: 'sec-form',
    screenSpecId: 'scr-1',
    sectionType: 'form',
  }]);
  const patch = contract.buildUpdatePatch(
    seedField({ sectionId: null, fieldRole: 'input' }),
    {
      sectionId: 'sec-form',
      visibilityCondition: roleCondition('admin'),
      enabledCondition: fieldCondition('fld-peer'),
      requiredCondition: null,
    },
    { actorUid: 'u1', ...ctx },
  );
  assert.equal(patch.sectionId, 'sec-form');
  assert.equal(patch.visibilityCondition.conditions[0].value, 'admin');
  assert.equal(patch.enabledCondition.conditions[0].sourceId, 'fld-peer');
  assert.equal(patch.requiredCondition, null);
});

// ── update trim/null for composition fields ─────────────────────────
test('update sectionId blank trims to null', () => {
  const patch = contract.buildUpdatePatch(
    seedField({ sectionId: 'sec-form' }),
    { sectionId: '   ' },
    { actorUid: 'u1', ...sectionsContext([{
      id: 'sec-form',
      screenSpecId: 'scr-1',
      sectionType: 'form',
    }]) },
  );
  assert.equal(patch.sectionId, null);
});

test('update layout span change persists', () => {
  const patch = contract.buildUpdatePatch(
    seedField({ layout: { row: null, column: null, span: 12 } }),
    { layout: { span: 6 } },
    { actorUid: 'u1' },
  );
  assert.equal(patch.layout.span, 6);
});

test('update condition null clears stored condition', () => {
  const patch = contract.buildUpdatePatch(
    seedField({
      visibilityCondition: roleCondition('editor'),
      enabledCondition: fieldCondition('fld-peer'),
    }),
    {
      visibilityCondition: null,
      enabledCondition: null,
    },
    { actorUid: 'u1' },
  );
  assert.equal(patch.visibilityCondition, null);
  assert.equal(patch.enabledCondition, null);
});

// ── regression: existing field service contract basics ──────────────
test('normalizeName trim + lowercase', () => {
  assert.equal(contract.normalizeName(' TitleText '), 'titletext');
});

test('buildCreatePayload trims name', () => {
  const payload = assertCreatePayload(validCreateInput({ name: '  titleText  ' }));
  assert.equal(payload.name, 'titleText');
});

test('buildCreatePayload sets schemaVersion and audit fields', () => {
  const payload = assertCreatePayload(validCreateInput({ name: 'auditField' }));
  assert.equal(payload.schemaVersion, contract.SCHEMA_VERSION);
  assert.equal(payload.createdBy, 'u1');
  assert.equal(payload.updatedBy, 'u1');
  assert.ok(payload.createdAt);
  assert.ok(payload.updatedAt);
});

test('invalid schemaVersion is preserved on read', () => {
  const normalized = contract.normalizeScreenField(seedField({ schemaVersion: 2 }));
  assert.equal(normalized.schemaVersion, 2);
});

function createFakeFieldAdapter(initial = []) {
  const store = new Map(initial.map((item) => [item.id, { ...item }]));
  let deleteCalls = 0;
  const adapter = {
    listByScreenSpec(projectId, screenSpecId) {
      return Promise.resolve(Array.from(store.values()).filter((item) => (
        item.projectId === projectId && item.screenSpecId === screenSpecId
      )));
    },
    findDuplicateNormalizedName() { return Promise.resolve(null); },
    getById(projectId, fieldId) {
      const item = store.get(fieldId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, field) {
      const id = field.id || `fld-${store.size + 1}`;
      const next = { ...field, id, projectId };
      store.set(id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, fieldId, patch) {
      const current = store.get(fieldId);
      const next = { ...current, ...patch };
      store.set(fieldId, next);
      return Promise.resolve({ ...next });
    },
    delete(projectId, fieldId) {
      deleteCalls += 1;
      store.delete(fieldId);
      return Promise.resolve();
    },
    deleteCallCount() {
      return deleteCalls;
    },
  };
  return adapter;
}

function createFakeSectionAdapter(sections = []) {
  const store = new Map(sections.map((item) => [item.id, { ...item }]));
  return {
    listByScreenSpec(projectId, screenSpecId) {
      return Promise.resolve(Array.from(store.values()).filter((item) => (
        item.projectId === projectId && item.screenSpecId === screenSpecId
      )));
    },
  };
}

function createFakeActionAdapter(actions = []) {
  const store = new Map(actions.map((item) => [item.id, { ...item }]));
  return {
    listByScreenSpec(projectId, screenSpecId) {
      return Promise.resolve(Array.from(store.values()).filter((item) => (
        item.projectId === projectId && item.screenSpecId === screenSpecId
      )));
    },
  };
}

test('invalid field name reject', () => {
  const result = contract.validateScreenFieldInput(validCreateInput({ name: '1bad' }), 'create');
  assert.equal(result.valid, false);
});

async function runAsyncTests() {
  asyncTest('createService ignores spoofed sectionsById and loads adapter sections');
  {
    const fieldAdapter = createFakeFieldAdapter([seedField({ id: 'fld-peer' })]);
    const sectionAdapter = createFakeSectionAdapter([]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter,
      authorize: () => true,
    });

    await assert.rejects(
      () => service.create('P1', validCreateInput({
        name: 'spoofSectionField',
        sectionId: 'sec-fake',
      }), {
        actorUid: 'u1',
        sectionsById: {
          'sec-fake': { id: 'sec-fake', screenSpecId: 'scr-1', sectionType: 'form' },
        },
      }),
      (err) => err.code === contract.ERROR_CODES.VALIDATION_FAILED,
    );
  }

  asyncTest('create rejects when sectionId set but section adapter missing');
  {
    const fieldAdapter = createFakeFieldAdapter([seedField({ id: 'fld-peer' })]);
    const service = contract.createService({
      adapter: fieldAdapter,
      authorize: () => true,
    });

    await assert.rejects(
      () => service.create('P1', validCreateInput({
        name: 'needsSectionAdapter',
        sectionId: 'sec-form',
      }), { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
    );
  }

  asyncTest('create rejects when field condition present but field list adapter missing');
  {
    const brokenAdapter = {
      findDuplicateNormalizedName() { return Promise.resolve(null); },
      getById() { return Promise.resolve(null); },
      create() { return Promise.resolve(null); },
      update() { return Promise.resolve(null); },
      delete() { return Promise.resolve(); },
    };
    const service = contract.createService({
      adapter: brokenAdapter,
      authorize: () => true,
    });

    await assert.rejects(
      () => service.create('P1', validCreateInput({
        name: 'needsFieldAdapter',
        enabledCondition: fieldCondition('fld-missing'),
      }), {
        actorUid: 'u1',
        fieldIds: ['fld-missing'],
      }),
      (err) => err.code === contract.ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
    );
  }

  asyncTest('create succeeds when section adapter provides section lookup');
  {
    const fieldAdapter = createFakeFieldAdapter([seedField({ id: 'fld-peer' })]);
    const sectionAdapter = createFakeSectionAdapter([{
      id: 'sec-form',
      projectId: 'P1',
      screenSpecId: 'scr-1',
      sectionType: 'form',
    }]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter,
      authorize: () => true,
    });

    const created = await service.create('P1', validCreateInput({
      name: 'adapterBackedSection',
      sectionId: 'sec-form',
    }), { actorUid: 'u1' });
    assert.equal(created.sectionId, 'sec-form');
  }

  asyncTest('deleteField rejects when peer field conditions reference target');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const peer = seedField({
      id: 'fld-peer',
      name: 'peerField',
      enabledCondition: fieldCondition('fld-target'),
    });
    const fieldAdapter = createFakeFieldAdapter([target, peer]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.CONDITIONS_REFERENCE_FIELD,
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField succeeds when all adapters present and no references');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const fieldAdapter = createFakeFieldAdapter([target]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await service.delete('P1', 'fld-target', { actorUid: 'u1' });
    const remaining = await fieldAdapter.getById('P1', 'fld-target');
    assert.equal(remaining, null);
    assert.equal(fieldAdapter.deleteCallCount(), 1);
  }

  asyncTest('deleteField rejects when action adapter missing');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const fieldAdapter = createFakeFieldAdapter([target]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField rejects when section adapter missing');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const fieldAdapter = createFakeFieldAdapter([target]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: null,
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField rejects when action adapter is null');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const fieldAdapter = createFakeFieldAdapter([target]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter: null,
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField rejects when section listByScreenSpec returns non-array');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const fieldAdapter = createFakeFieldAdapter([target]);
    const sectionAdapter = {
      listByScreenSpec() { return Promise.resolve(undefined); },
    };
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter,
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField rejects when action listByScreenSpec returns non-array');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const fieldAdapter = createFakeFieldAdapter([target]);
    const actionAdapter = {
      listByScreenSpec() { return Promise.resolve(null); },
    };
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter,
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField rejects when target field not found');
  {
    const fieldAdapter = createFakeFieldAdapter([]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-missing', { actorUid: 'u1' }),
      (err) => err.code === contract.ERROR_CODES.NOT_FOUND,
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField rejects when section visibilityCondition references target');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const sectionRef = {
      id: 'sec-form',
      projectId: 'P1',
      screenSpecId: 'scr-1',
      sectionType: 'form',
      visibilityCondition: fieldCondition('fld-target'),
    };
    const fieldAdapter = createFakeFieldAdapter([target]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([sectionRef]),
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => {
        assert.equal(err.code, contract.ERROR_CODES.CONDITIONS_REFERENCE_FIELD);
        assert.equal(err.references[0].entity, 'section');
        return true;
      },
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField rejects when action enabledCondition references target');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField' });
    const actionRef = {
      id: 'act-1',
      projectId: 'P1',
      screenSpecId: 'scr-1',
      name: 'save',
      label: '저장',
      actionType: 'save',
      enabledCondition: fieldCondition('fld-target'),
    };
    const fieldAdapter = createFakeFieldAdapter([target]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter: createFakeActionAdapter([actionRef]),
      authorize: () => true,
    });

    await assert.rejects(
      () => service.delete('P1', 'fld-target', { actorUid: 'u1' }),
      (err) => {
        assert.equal(err.code, contract.ERROR_CODES.CONDITIONS_REFERENCE_FIELD);
        assert.equal(err.references[0].entity, 'action');
        return true;
      },
    );
    assert.equal(fieldAdapter.deleteCallCount(), 0);
  }

  asyncTest('deleteField ignores references from other screenSpec');
  {
    const target = seedField({ id: 'fld-target', name: 'targetField', screenSpecId: 'scr-1' });
    const otherSpecPeer = seedField({
      id: 'fld-other-spec',
      screenSpecId: 'scr-2',
      name: 'otherSpecPeer',
      enabledCondition: fieldCondition('fld-target'),
    });
    const fieldAdapter = createFakeFieldAdapter([target, otherSpecPeer]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await service.delete('P1', 'fld-target', { actorUid: 'u1' });
    assert.equal(fieldAdapter.deleteCallCount(), 1);
  }

  asyncTest('deleteField allows self-reference on target field document');
  {
    const target = seedField({
      id: 'fld-target',
      name: 'targetField',
      requiredCondition: fieldCondition('fld-target'),
    });
    const fieldAdapter = createFakeFieldAdapter([target]);
    const service = contract.createService({
      adapter: fieldAdapter,
      sectionAdapter: createFakeSectionAdapter([]),
      actionAdapter: createFakeActionAdapter([]),
      authorize: () => true,
    });

    await service.delete('P1', 'fld-target', { actorUid: 'u1' });
    assert.equal(fieldAdapter.deleteCallCount(), 1);
  }
}

runAsyncTests().then(() => {
  console.log(`screen field composition extension contract (${testCount} cases): PASS`);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
