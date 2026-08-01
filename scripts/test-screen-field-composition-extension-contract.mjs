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

test('fieldRole invalid value normalizes to input on create', () => {
  const payload = assertCreatePayload(validCreateInput({ fieldRole: 'sortKey' }));
  assert.equal(payload.fieldRole, 'input');
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

test('layout invalid span falls back to default on normalize', () => {
  const normalized = contract.normalizeScreenField(seedField({
    layout: { row: null, column: null, span: 99 },
  }));
  assert.deepEqual(normalized.layout, contract.DEFAULT_LAYOUT);
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

test('invalid field name reject', () => {
  const result = contract.validateScreenFieldInput(validCreateInput({ name: '1bad' }), 'create');
  assert.equal(result.valid, false);
});

console.log(`screen field composition extension contract (${testCount} cases): PASS`);
