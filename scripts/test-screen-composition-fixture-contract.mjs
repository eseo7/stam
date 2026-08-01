#!/usr/bin/env node
/**
 * STAM PR D1 — representative screen composition fixture contract
 *
 * Usage:
 *   node scripts/test-screen-composition-fixture-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const conditionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-condition-contract.js'), 'utf8');
const sectionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-section-service.js'), 'utf8');
const fieldSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-service.js'), 'utf8');
const actionSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-service.js'), 'utf8');

assert.ok(conditionSource);
assert.ok(sectionSource);
assert.ok(fieldSource);
assert.ok(actionSource);

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
  const sectionAdapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-section-firestore-adapter.js'), 'utf8');
  const fieldAdapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-firestore-adapter.js'), 'utf8');
  const actionAdapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-firestore-adapter.js'), 'utf8');

  vm.runInContext(conditionSource, context, { filename: 'stam.screen-condition-contract.js' });
  vm.runInContext(sectionAdapterSource, context, { filename: 'stam.screen-section-firestore-adapter.js' });
  vm.runInContext(sectionSource, context, { filename: 'stam.screen-section-service.js' });
  vm.runInContext(fieldAdapterSource, context, { filename: 'stam.screen-field-firestore-adapter.js' });
  vm.runInContext(fieldSource, context, { filename: 'stam.screen-field-service.js' });
  vm.runInContext(actionAdapterSource, context, { filename: 'stam.screen-action-firestore-adapter.js' });
  vm.runInContext(actionSource, context, { filename: 'stam.screen-action-service.js' });
  return {
    conditionContract: window.STAM.screenConditionContract,
    sectionContract: window.STAM.screenSectionServiceContract,
    fieldContract: window.STAM.screenFieldServiceContract,
    actionContract: window.STAM.screenActionServiceContract,
  };
}

function fieldCondition(sourceId, operator = 'eq', value = 'yes') {
  return {
    logic: 'all',
    conditions: [{
      source: 'field',
      sourceId,
      operator,
      value,
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

function screenModeCondition(mode = 'edit') {
  return {
    logic: 'all',
    conditions: [{
      source: 'screenMode',
      sourceId: null,
      operator: 'eq',
      value: mode,
    }],
  };
}

function sectionDoc(overrides) {
  return {
    projectId: 'P1',
    order: 0,
    parentSectionId: null,
    layout: { columns: 1, gap: 'md', collapsible: false, defaultCollapsed: false },
    visibilityCondition: null,
    description: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function fieldDoc(overrides) {
  return {
    projectId: 'P1',
    order: 0,
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
    sectionId: null,
    fieldRole: 'input',
    layout: { row: null, column: null, span: 12 },
    visibilityCondition: null,
    enabledCondition: null,
    requiredCondition: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function actionDoc(overrides) {
  return {
    projectId: 'P1',
    order: 0,
    actionType: 'custom',
    controlType: 'button',
    placement: 'toolbar',
    variant: 'secondary',
    targetScreenSpecId: null,
    disabled: false,
    confirmRequired: false,
    confirmTitle: null,
    confirmMessage: null,
    successMessage: null,
    sectionId: null,
    layout: { row: null, column: null, span: 12 },
    visibilityCondition: null,
    enabledCondition: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function buildFixtures() {
  const listSpecId = 'scr-list';
  const createSpecId = 'scr-create';
  const detailSpecId = 'scr-detail';
  const editSpecId = 'scr-edit';
  const popupSpecId = 'scr-popup';

  return [
    {
      name: 'list',
      screenSpecId: listSpecId,
      sections: [
        sectionDoc({
          id: 'sec-list-search',
          screenSpecId: listSpecId,
          name: 'listSearch',
          label: '검색',
          sectionType: 'search',
        }),
        sectionDoc({
          id: 'sec-list-table',
          screenSpecId: listSpecId,
          name: 'listTable',
          label: '목록',
          sectionType: 'table',
          order: 1,
        }),
      ],
      fields: [
        fieldDoc({
          id: 'fld-list-keyword',
          screenSpecId: listSpecId,
          name: 'keyword',
          label: '검색어',
          sectionId: 'sec-list-search',
          fieldRole: 'filter',
        }),
        fieldDoc({
          id: 'fld-list-status',
          screenSpecId: listSpecId,
          name: 'statusFilter',
          label: '상태',
          type: 'select',
          options: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }],
          sectionId: 'sec-list-search',
          fieldRole: 'filter',
        }),
        fieldDoc({
          id: 'fld-list-title',
          screenSpecId: listSpecId,
          name: 'titleColumn',
          label: '제목',
          sectionId: 'sec-list-table',
          fieldRole: 'tableColumn',
          layout: { row: null, column: null, span: 6 },
        }),
        fieldDoc({
          id: 'fld-list-createdAt',
          screenSpecId: listSpecId,
          name: 'createdAtColumn',
          label: '등록일',
          type: 'date',
          sectionId: 'sec-list-table',
          fieldRole: 'tableColumn',
        }),
      ],
      actions: [
        actionDoc({
          id: 'act-list-search',
          screenSpecId: listSpecId,
          name: 'runSearch',
          label: '조회',
          actionType: 'custom',
          placement: 'toolbar',
          sectionId: 'sec-list-search',
        }),
        actionDoc({
          id: 'act-list-create',
          screenSpecId: listSpecId,
          name: 'goCreate',
          label: '등록',
          actionType: 'navigate',
          targetScreenSpecId: createSpecId,
          placement: 'toolbar',
          visibilityCondition: roleCondition('editor'),
        }),
      ],
    },
    {
      name: 'create',
      screenSpecId: createSpecId,
      sections: [
        sectionDoc({
          id: 'sec-create-form',
          screenSpecId: createSpecId,
          name: 'createForm',
          label: '등록 폼',
          sectionType: 'form',
          layout: { columns: 2, gap: 'md', collapsible: false, defaultCollapsed: false },
        }),
      ],
      fields: [
        fieldDoc({
          id: 'fld-create-name',
          screenSpecId: createSpecId,
          name: 'itemName',
          label: '이름',
          sectionId: 'sec-create-form',
          fieldRole: 'input',
          layout: { row: 0, column: 0, span: 6 },
          required: true,
        }),
        fieldDoc({
          id: 'fld-create-note',
          screenSpecId: createSpecId,
          name: 'itemNote',
          label: '메모',
          type: 'textarea',
          sectionId: 'sec-create-form',
          fieldRole: 'input',
          layout: { row: 1, column: 0, span: 12 },
          requiredCondition: fieldCondition('fld-create-name', 'exists', null),
        }),
      ],
      actions: [
        actionDoc({
          id: 'act-create-submit',
          screenSpecId: createSpecId,
          name: 'submitCreate',
          label: '저장',
          actionType: 'submit',
          placement: 'footer',
          variant: 'primary',
          sectionId: 'sec-create-form',
        }),
        actionDoc({
          id: 'act-create-cancel',
          screenSpecId: createSpecId,
          name: 'cancelCreate',
          label: '취소',
          actionType: 'cancel',
          placement: 'footer',
        }),
      ],
    },
    {
      name: 'detail',
      screenSpecId: detailSpecId,
      sections: [
        sectionDoc({
          id: 'sec-detail-main',
          screenSpecId: detailSpecId,
          name: 'detailMain',
          label: '상세',
          sectionType: 'detail',
        }),
      ],
      fields: [
        fieldDoc({
          id: 'fld-detail-name',
          screenSpecId: detailSpecId,
          name: 'displayName',
          label: '이름',
          sectionId: 'sec-detail-main',
          fieldRole: 'display',
          readonly: true,
        }),
        fieldDoc({
          id: 'fld-detail-status',
          screenSpecId: detailSpecId,
          name: 'displayStatus',
          label: '상태',
          sectionId: 'sec-detail-main',
          fieldRole: 'display',
          visibilityCondition: roleCondition('viewer'),
        }),
      ],
      actions: [
        actionDoc({
          id: 'act-detail-edit',
          screenSpecId: detailSpecId,
          name: 'goEdit',
          label: '수정',
          actionType: 'navigate',
          targetScreenSpecId: editSpecId,
          placement: 'toolbar',
          visibilityCondition: roleCondition('editor'),
        }),
      ],
    },
    {
      name: 'edit',
      screenSpecId: editSpecId,
      sections: [
        sectionDoc({
          id: 'sec-edit-form',
          screenSpecId: editSpecId,
          name: 'editForm',
          label: '수정 폼',
          sectionType: 'form',
        }),
      ],
      fields: [
        fieldDoc({
          id: 'fld-edit-status',
          screenSpecId: editSpecId,
          name: 'editStatus',
          label: '상태',
          type: 'select',
          options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }],
          sectionId: 'sec-edit-form',
          fieldRole: 'input',
        }),
        fieldDoc({
          id: 'fld-edit-name',
          screenSpecId: editSpecId,
          name: 'editName',
          label: '이름',
          sectionId: 'sec-edit-form',
          fieldRole: 'input',
          enabledCondition: fieldCondition('fld-edit-status', 'eq', 'draft'),
        }),
      ],
      actions: [
        actionDoc({
          id: 'act-edit-save',
          screenSpecId: editSpecId,
          name: 'saveEdit',
          label: '저장',
          actionType: 'save',
          placement: 'footer',
          variant: 'primary',
          enabledCondition: fieldCondition('fld-edit-status', 'neq', 'published'),
        }),
      ],
    },
    {
      name: 'popup/tabs',
      screenSpecId: popupSpecId,
      sections: [
        sectionDoc({
          id: 'sec-popup-tabs',
          screenSpecId: popupSpecId,
          name: 'popupTabs',
          label: '탭',
          sectionType: 'tabs',
        }),
        sectionDoc({
          id: 'sec-popup-tab-info',
          screenSpecId: popupSpecId,
          name: 'tabInfo',
          label: '기본 정보',
          sectionType: 'tab',
          parentSectionId: 'sec-popup-tabs',
          order: 0,
        }),
        sectionDoc({
          id: 'sec-popup-tab-history',
          screenSpecId: popupSpecId,
          name: 'tabHistory',
          label: '이력',
          sectionType: 'tab',
          parentSectionId: 'sec-popup-tabs',
          order: 1,
          visibilityCondition: roleCondition('admin'),
        }),
        sectionDoc({
          id: 'sec-popup-repeater',
          screenSpecId: popupSpecId,
          name: 'lineRepeater',
          label: '항목',
          sectionType: 'repeater',
          order: 2,
        }),
      ],
      fields: [
        fieldDoc({
          id: 'fld-popup-note',
          screenSpecId: popupSpecId,
          name: 'tabNote',
          label: '메모',
          sectionId: 'sec-popup-tab-info',
          fieldRole: 'input',
        }),
        fieldDoc({
          id: 'fld-popup-line',
          screenSpecId: popupSpecId,
          name: 'lineItemName',
          label: '항목명',
          sectionId: 'sec-popup-repeater',
          fieldRole: 'repeaterItem',
        }),
      ],
      actions: [
        actionDoc({
          id: 'act-popup-close',
          screenSpecId: popupSpecId,
          name: 'closePopup',
          label: '닫기',
          actionType: 'closeDrawer',
          placement: 'footer',
          visibilityCondition: screenModeCondition('popup'),
        }),
      ],
    },
  ];
}

function buildValidationContext(fixture) {
  const sectionsById = Object.fromEntries(fixture.sections.map((section) => [section.id, section]));
  const fieldIds = fixture.fields.map((field) => field.id);
  return { sectionsById, fieldIds };
}

function validateFieldDoc(fieldContract, doc, context) {
  fieldContract.buildCreatePayload({
    screenSpecId: doc.screenSpecId,
    name: doc.name,
    label: doc.label,
    type: doc.type,
    order: doc.order,
    required: doc.required,
    readonly: doc.readonly,
    disabled: doc.disabled,
    defaultValue: doc.defaultValue,
    placeholder: doc.placeholder,
    helpText: doc.helpText,
    minLength: doc.minLength,
    maxLength: doc.maxLength,
    options: doc.options,
    validationRules: doc.validationRules,
    sectionId: doc.sectionId,
    fieldRole: doc.fieldRole,
    layout: doc.layout,
    visibilityCondition: doc.visibilityCondition,
    enabledCondition: doc.enabledCondition,
    requiredCondition: doc.requiredCondition,
  }, { actorUid: 'u1', projectId: doc.projectId, ...context });
}

const {
  conditionContract,
  sectionContract,
  fieldContract,
  actionContract,
} = await loadModules();

const fixtures = buildFixtures();

let testCount = 0;
function test(name, fn) {
  testCount += 1;
  fn();
}

for (const fixture of fixtures) {
  const context = buildValidationContext(fixture);

  test(`${fixture.name}: sections validateCompleteDocument`, () => {
    for (const section of fixture.sections) {
      const sectionContext = {
        fieldIds: context.fieldIds,
        parentSectionType: section.parentSectionId
          ? fixture.sections.find((entry) => entry.id === section.parentSectionId)?.sectionType
          : undefined,
      };
      const result = sectionContract.validateCompleteDocument(section, sectionContext);
      assert.equal(result.valid, true, `${section.name} should validate: ${JSON.stringify(result.errors)}`);
    }
  });

  test(`${fixture.name}: fields validate via buildCreatePayload`, () => {
    for (const field of fixture.fields) {
      assert.doesNotThrow(
        () => validateFieldDoc(fieldContract, field, context),
        `${field.name} should validate`,
      );
    }
  });

  test(`${fixture.name}: actions validateCompleteDocument`, () => {
    for (const action of fixture.actions) {
      const result = actionContract.validateCompleteDocument(action, context);
      assert.equal(result.valid, true, `${action.name} should validate: ${JSON.stringify(result.errors)}`);
    }
  });

  test(`${fixture.name}: condition groups validateConditionGroup`, () => {
    for (const entity of [...fixture.sections, ...fixture.fields, ...fixture.actions]) {
      for (const key of ['visibilityCondition', 'enabledCondition', 'requiredCondition']) {
        const group = entity[key];
        if (!group) continue;
        const errors = [];
        const ok = conditionContract.validateConditionGroup(group, {
          screenSpecId: fixture.screenSpecId,
          fieldIds: context.fieldIds,
        }, errors, key);
        assert.equal(ok, true, `${entity.name}.${key} should validate: ${JSON.stringify(errors)}`);
      }
    }
  });
}

test('list: filter fields belong to search sections', () => {
  const fixture = fixtures.find((entry) => entry.name === 'list');
  const sectionsById = Object.fromEntries(fixture.sections.map((section) => [section.id, section]));
  for (const field of fixture.fields.filter((entry) => entry.fieldRole === 'filter')) {
    const section = sectionsById[field.sectionId];
    assert.equal(section.sectionType, 'search', `${field.name} must map filter→search`);
  }
});

test('list: tableColumn fields belong to table sections', () => {
  const fixture = fixtures.find((entry) => entry.name === 'list');
  const sectionsById = Object.fromEntries(fixture.sections.map((section) => [section.id, section]));
  for (const field of fixture.fields.filter((entry) => entry.fieldRole === 'tableColumn')) {
    const section = sectionsById[field.sectionId];
    assert.equal(section.sectionType, 'table', `${field.name} must map tableColumn→table`);
  }
});

test('popup/tabs: tab sections hang under tabs parent', () => {
  const fixture = fixtures.find((entry) => entry.name === 'popup/tabs');
  const tabsSection = fixture.sections.find((section) => section.sectionType === 'tabs');
  const tabSections = fixture.sections.filter((section) => section.sectionType === 'tab');
  assert.ok(tabsSection, 'tabs container required');
  assert.ok(tabSections.length >= 2, 'at least two tab children expected');
  for (const tab of tabSections) {
    assert.equal(tab.parentSectionId, tabsSection.id, `${tab.name} must reference tabs parent`);
  }
});

test('popup/tabs: repeaterItem maps to repeater section', () => {
  const fixture = fixtures.find((entry) => entry.name === 'popup/tabs');
  const sectionsById = Object.fromEntries(fixture.sections.map((section) => [section.id, section]));
  for (const field of fixture.fields.filter((entry) => entry.fieldRole === 'repeaterItem')) {
    assert.equal(sectionsById[field.sectionId].sectionType, 'repeater');
  }
});

test('detail/popup: role conditions use role source', () => {
  for (const fixtureName of ['detail', 'popup/tabs']) {
    const fixture = fixtures.find((entry) => entry.name === fixtureName);
    const roleGroups = [];
    for (const entity of [...fixture.sections, ...fixture.fields, ...fixture.actions]) {
      for (const key of ['visibilityCondition', 'enabledCondition', 'requiredCondition']) {
        const group = entity[key];
        if (!group) continue;
        roleGroups.push(...group.conditions.filter((item) => item.source === 'role'));
      }
    }
    assert.ok(roleGroups.length > 0, `${fixtureName} should include role conditions`);
  }
});

test('edit: enabledCondition references existing field ids', () => {
  const fixture = fixtures.find((entry) => entry.name === 'edit');
  const fieldIds = new Set(fixture.fields.map((field) => field.id));
  for (const field of fixture.fields) {
    if (!field.enabledCondition) continue;
    for (const condition of field.enabledCondition.conditions) {
      if (condition.source !== 'field') continue;
      assert.ok(fieldIds.has(condition.sourceId), `enabledCondition must reference ${condition.sourceId}`);
    }
  }
  for (const action of fixture.actions) {
    if (!action.enabledCondition) continue;
    for (const condition of action.enabledCondition.conditions) {
      if (condition.source !== 'field') continue;
      assert.ok(fieldIds.has(condition.sourceId), `action enabledCondition must reference ${condition.sourceId}`);
    }
  }
});

console.log(`screen composition fixture contract (${testCount} cases): PASS`);
