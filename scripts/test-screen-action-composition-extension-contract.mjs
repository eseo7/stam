#!/usr/bin/env node
/**
 * STAM PR D1 — screenActions composition extension contract
 *
 * Usage:
 *   node scripts/test-screen-action-composition-extension-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const conditionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-condition-contract.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-firestore-adapter.js'), 'utf8');
const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-service.js'), 'utf8');

assert.ok(conditionSource);
assert.ok(adapterSource);
assert.ok(serviceSource);

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
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-action-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-action-service.js' });
  return {
    contract: window.STAM.screenActionServiceContract,
    conditionContract: window.STAM.screenConditionContract,
  };
}

function validCreateInput(overrides = {}) {
  return {
    screenSpecId: 'scr-1',
    name: 'goBack',
    label: '뒤로',
    actionType: 'cancel',
    ...overrides,
  };
}

function seedAction(overrides = {}) {
  return {
    id: 'act-1',
    projectId: 'P1',
    screenSpecId: 'scr-1',
    order: 0,
    name: 'goBack',
    label: '뒤로',
    actionType: 'cancel',
    controlType: 'button',
    placement: 'toolbar',
    variant: 'secondary',
    targetScreenSpecId: null,
    disabled: false,
    confirmRequired: false,
    confirmTitle: null,
    confirmMessage: null,
    successMessage: null,
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

function fieldCondition(sourceId = 'fld-peer') {
  return {
    logic: 'all',
    conditions: [{
      source: 'field',
      sourceId,
      operator: 'eq',
      value: 'ready',
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

// ── spec 12.F: legacy normalize defaults ─────────────────────────────
test('legacy action without composition fields normalizes with defaults', () => {
  const normalized = contract.normalizeScreenAction(seedAction({
    sectionId: undefined,
    layout: undefined,
    visibilityCondition: undefined,
    enabledCondition: undefined,
  }));
  assert.equal(normalized.sectionId, null);
  assert.deepEqual(normalized.layout, contract.DEFAULT_LAYOUT);
  assert.ok(normalized.visibilityCondition == null);
  assert.ok(normalized.enabledCondition == null);
});

// ── sectionId validation (same as fields) ───────────────────────────
test('sectionId null ok', () => {
  const payload = assertCreatePayload(validCreateInput({ sectionId: null }));
  assert.equal(payload.sectionId, null);
});

test('valid section in context ok', () => {
  const ctx = sectionsContext([{
    id: 'sec-toolbar',
    screenSpecId: 'scr-1',
    sectionType: 'custom',
  }]);
  const payload = assertCreatePayload(validCreateInput({
    name: 'toolbarAction',
    sectionId: 'sec-toolbar',
  }), ctx);
  assert.equal(payload.sectionId, 'sec-toolbar');
});

test('wrong spec section reject', () => {
  const ctx = sectionsContext([{
    id: 'sec-other',
    screenSpecId: 'scr-2',
    sectionType: 'form',
  }]);
  const errors = assertCompositionErrors(validCreateInput({
    sectionId: 'sec-other',
  }), ctx);
  assert.ok(errors.some((entry) => entry.field === 'sectionId'));
});

test('missing section reject', () => {
  const errors = assertCompositionErrors(validCreateInput({
    sectionId: 'sec-missing',
  }), sectionsContext([]));
  assert.ok(errors.some((entry) => entry.field === 'sectionId'));
});

// ── layout storage ──────────────────────────────────────────────────
test('layout storage on create', () => {
  const payload = assertCreatePayload(validCreateInput({
    name: 'layoutAction',
    layout: { row: 1, column: 2, span: 6 },
  }));
  assert.equal(payload.layout.row, 1);
  assert.equal(payload.layout.column, 2);
  assert.equal(payload.layout.span, 6);
});

test('layout invalid span rejects on create', () => {
  assert.throws(
    () => assertCreatePayload(validCreateInput({
      name: 'badLayoutAction',
      layout: { row: null, column: null, span: 99 },
    })),
    (err) => err.code === contract.ERROR_CODES.VALIDATION_FAILED,
  );
});

test('layout invalid span preserved on read', () => {
  const normalized = contract.normalizeScreenAction(seedAction({
    layout: { row: null, column: null, span: 99 },
  }));
  assert.equal(normalized.layout.span, 99);
});

test('invalid schemaVersion preserved on read', () => {
  const normalized = contract.normalizeScreenAction(seedAction({ schemaVersion: 9 }));
  assert.equal(normalized.schemaVersion, 9);
});

test('layout invalid span reject via condition contract', () => {
  const errors = [];
  const ok = conditionContract.validateLayoutGrid({ row: null, column: null, span: 13 }, errors, 'layout');
  assert.equal(ok, false);
  assert.ok(errors.some((entry) => entry.field === 'layout.span'));
});

test('layout update patch persists span', () => {
  const patch = contract.buildUpdatePatch(
    seedAction({ layout: { row: null, column: null, span: 12 } }),
    { layout: { span: 4 } },
    { actorUid: 'u1' },
  );
  assert.equal(patch.layout.span, 4);
});

// ── visibility/enabled conditions ───────────────────────────────────
test('visibility/enabled conditions save on create', () => {
  const ctx = sectionsContext([{
    id: 'sec-form',
    screenSpecId: 'scr-1',
    sectionType: 'form',
  }]);
  const payload = assertCreatePayload(validCreateInput({
    name: 'conditionalAction',
    sectionId: 'sec-form',
    visibilityCondition: roleCondition('admin'),
    enabledCondition: fieldCondition('fld-peer'),
  }), ctx);
  assert.equal(payload.visibilityCondition.conditions[0].value, 'admin');
  assert.equal(payload.enabledCondition.conditions[0].sourceId, 'fld-peer');
});

test('visibility/enabled conditions save on update patch', () => {
  const patch = contract.buildUpdatePatch(
    seedAction(),
    {
      visibilityCondition: roleCondition('viewer'),
      enabledCondition: fieldCondition('fld-peer'),
    },
    { actorUid: 'u1', fieldIds: ['fld-peer'] },
  );
  assert.equal(patch.visibilityCondition.conditions[0].value, 'viewer');
  assert.equal(patch.enabledCondition.conditions[0].sourceId, 'fld-peer');
});

// ── placement preserved on update ───────────────────────────────────
test('placement preserved when updating composition fields only', () => {
  const patch = contract.buildUpdatePatch(
    seedAction({ placement: 'footer', sectionId: null }),
    {
      sectionId: 'sec-form',
      layout: { span: 6 },
      visibilityCondition: roleCondition('editor'),
    },
    {
      actorUid: 'u1',
      ...sectionsContext([{
        id: 'sec-form',
        screenSpecId: 'scr-1',
        sectionType: 'form',
      }]),
    },
  );
  assert.equal(patch.placement, undefined);
  assert.equal(patch.sectionId, 'sec-form');
  assert.equal(patch.layout.span, 6);
});

test('placement changes only when explicitly patched', () => {
  const patch = contract.buildUpdatePatch(
    seedAction({ placement: 'toolbar' }),
    { placement: 'footer' },
    { actorUid: 'u1' },
  );
  assert.equal(patch.placement, 'footer');
});

// ── PR C regression: navigate/cancel target auto-null ───────────────
test('navigate to cancel update auto-nulls targetScreenSpecId', () => {
  const patch = contract.buildUpdatePatch(
    seedAction({
      actionType: 'navigate',
      targetScreenSpecId: 'scr-target',
    }),
    { actionType: 'cancel' },
    { actorUid: 'u1' },
  );
  assert.equal(patch.actionType, 'cancel');
  assert.equal(patch.targetScreenSpecId, null);
});

test('cancel create rejects targetScreenSpecId', () => {
  const result = contract.validateScreenActionInput(validCreateInput({
    actionType: 'cancel',
    targetScreenSpecId: 'scr-target',
  }), 'create');
  assert.equal(result.valid, false);
});

// ── PR C regression: confirmRequired auto-null ──────────────────────
test('confirmRequired false auto-nulls confirm fields on update', () => {
  const patch = contract.buildUpdatePatch(
    seedAction({
      confirmRequired: true,
      confirmTitle: '삭제 확인',
      confirmMessage: '정말 삭제하시겠습니까?',
    }),
    { confirmRequired: false },
    { actorUid: 'u1' },
  );
  assert.equal(patch.confirmRequired, false);
  assert.equal(patch.confirmTitle, null);
  assert.equal(patch.confirmMessage, null);
});

// ── update trim still works ─────────────────────────────────────────
test('update name trim', () => {
  const patch = contract.buildUpdatePatch(
    seedAction(),
    { name: '  saveDraft  ' },
    { actorUid: 'u1' },
  );
  assert.equal(patch.name, 'saveDraft');
});

test('update label trim', () => {
  const patch = contract.buildUpdatePatch(
    seedAction(),
    { label: '  제출  ' },
    { actorUid: 'u1' },
  );
  assert.equal(patch.label, '제출');
});

test('update sectionId blank trims to null', () => {
  const patch = contract.buildUpdatePatch(
    seedAction({ sectionId: 'sec-form' }),
    { sectionId: '   ' },
    { actorUid: 'u1' },
  );
  assert.equal(patch.sectionId, null);
});

test('update successMessage blank to null', () => {
  const patch = contract.buildUpdatePatch(
    seedAction({ successMessage: '기존' }),
    { successMessage: '   ' },
    { actorUid: 'u1' },
  );
  assert.equal(patch.successMessage, null);
});

console.log(`screen action composition extension contract (${testCount} cases): PASS`);
