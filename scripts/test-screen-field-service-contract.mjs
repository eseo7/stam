#!/usr/bin/env node
/**
 * STAM PR B — screenFields service + adapter contract
 *
 * Usage:
 *   node scripts/test-screen-field-service-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-field-firestore-adapter.js'), 'utf8');

assert.ok(serviceSource, 'stam.screen-field-service.js must exist');
assert.ok(adapterSource, 'stam.screen-field-firestore-adapter.js must exist');

assert.match(adapterSource, /COLLECTION = 'screenFields'/);
assert.match(adapterSource, /runCreatePreflight/);
assert.match(adapterSource, /runCreateTransaction/);
assert.doesNotMatch(adapterSource, /transaction\.get\(query\)/i);
assert.doesNotMatch(adapterSource, /transaction\.get\(\s*collectionRef\([^\)]*\)\.where/i);
assert.match(adapterSource, /function deleteField/);
assert.match(serviceSource, /DELETE: 'screenField\.delete'/);
assert.match(serviceSource, /SCREEN_FIELD_DUPLICATE_NAME/);
assert.doesNotMatch(serviceSource, /collection\('projects'\)/);
assert.doesNotMatch(serviceSource, /firebase\.firestore/);

function createContext() {
  const window = {};
  window.firebase = {
    firestore: Object.assign(function firestore() {
      return null;
    }, {
      FieldValue: {
        serverTimestamp() {
          return { __serverTimestamp: true };
        },
        delete() {
          return { __fieldDelete: true };
        },
      },
    }),
  };
  const context = vm.createContext({
    window,
    console,
    Date,
    Promise,
    Number,
    String,
    JSON,
    Array,
    Object,
    Error,
    Math,
    RegExp,
  });
  window.window = window;
  return { context, window };
}

async function loadModules() {
  const { context, window } = createContext();
  await readFile(path.join(ROOT, 'stam/js/stam.screen-field-firestore-adapter.js'), 'utf8').then((code) => {
    vm.runInContext(code, context, { filename: 'stam.screen-field-firestore-adapter.js' });
  });
  await readFile(path.join(ROOT, 'stam/js/stam.screen-field-service.js'), 'utf8').then((code) => {
    vm.runInContext(code, context, { filename: 'stam.screen-field-service.js' });
  });
  return {
    contract: window.STAM.screenFieldServiceContract,
    adapterContract: window.STAM.screenFieldFirestoreAdapter,
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

function createFakeAdapter(initial = []) {
  const store = new Map(initial.map((item) => [item.id, Object.assign({}, item)]));
  const parentExists = new Set(['scr-1']);
  const deletedParents = new Set();

  return {
    calls: [],
    findDuplicateNormalizedName(projectId, screenSpecId, normalizedName, excludeFieldId) {
      for (const item of store.values()) {
        if (item.projectId !== projectId || item.screenSpecId !== screenSpecId) continue;
        if (excludeFieldId && item.id === excludeFieldId) continue;
        if (adapterContract.normalizeName(item.name) === normalizedName) {
          return Promise.resolve(item.id);
        }
      }
      return Promise.resolve(null);
    },
    listByScreenSpec(projectId, screenSpecId) {
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId && item.screenSpecId === screenSpecId));
    },
    listByProject(projectId) {
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId));
    },
    getById(projectId, fieldId) {
      const item = store.get(fieldId);
      if (!item || item.projectId !== projectId) return Promise.resolve(null);
      return Promise.resolve(Object.assign({}, item));
    },
    create(projectId, field) {
      const id = field.id || `fld-${store.size + 1}`;
      const next = Object.assign({}, field, { id, projectId });
      if (!parentExists.has(next.screenSpecId) || deletedParents.has(next.screenSpecId)) {
        const err = new Error('parent missing');
        err.code = 'SCREEN_FIELD_PARENT_NOT_FOUND';
        err.preflight = true;
        return Promise.reject(err);
      }
      return this.findDuplicateNormalizedName(projectId, next.screenSpecId, adapterContract.normalizeName(next.name)).then((dup) => {
        if (dup) {
          const err = new Error('duplicate');
          err.code = 'SCREEN_FIELD_DUPLICATE_NAME';
          err.preflight = true;
          return Promise.reject(err);
        }
        store.set(id, next);
        return Promise.resolve(Object.assign({}, next));
      });
    },
    update(projectId, fieldId, patch) {
      const current = store.get(fieldId);
      if (!current) {
        const err = new Error('missing');
        err.code = 'SCREEN_FIELD_NOT_FOUND';
        err.preflight = true;
        return Promise.reject(err);
      }
      const next = Object.assign({}, current, patch);
      if (patch.name && adapterContract.normalizeName(patch.name) !== adapterContract.normalizeName(current.name)) {
        return this.findDuplicateNormalizedName(projectId, current.screenSpecId, adapterContract.normalizeName(patch.name), fieldId).then((dup) => {
          if (dup) {
            const err = new Error('duplicate');
            err.code = 'SCREEN_FIELD_DUPLICATE_NAME';
            err.preflight = true;
            return Promise.reject(err);
          }
          store.set(fieldId, next);
          return Promise.resolve(Object.assign({}, next));
        });
      }
      store.set(fieldId, next);
      return Promise.resolve(Object.assign({}, next));
    },
    delete(projectId, fieldId) {
      const current = store.get(fieldId);
      if (!current || current.projectId !== projectId) {
        const err = new Error('missing');
        err.code = 'SCREEN_FIELD_NOT_FOUND';
        err.preflight = true;
        return Promise.reject(err);
      }
      store.delete(fieldId);
      return Promise.resolve();
    },
  };
}

const { contract, adapterContract } = await loadModules();

assert.deepEqual(Object.keys(contract.ACTIONS).sort(), ['CREATE', 'DELETE', 'LIST', 'READ', 'UPDATE']);
assert.equal(contract.SCHEMA_VERSION, 1);
assert.equal(contract.TYPE_VALUES.length, 12);
assert.equal(contract.normalizeName(' TitleText '), 'titletext');

const invalidName = contract.validateScreenFieldInput({ screenSpecId: 'scr-1', name: '1bad', label: 'X', type: 'text' }, 'create');
assert.equal(invalidName.valid, false);

const trimName = contract.buildCreatePayload(validCreateInput({ name: '  titleText  ' }), { actorUid: 'u1', projectId: 'P1' });
assert.equal(trimName.name, 'titleText');

const dupCase = contract.validateScreenFieldInput(validCreateInput({ name: 'TitleText' }), 'create');
assert.equal(dupCase.valid, true);

const selectNeedsOptions = contract.validateScreenFieldInput(validCreateInput({ type: 'select', options: [] }), 'create');
assert.equal(selectNeedsOptions.valid, false);

const selectOk = contract.validateScreenFieldInput(validCreateInput({
  type: 'select',
  options: [{ value: 'a', label: 'A' }],
  defaultValue: 'a',
}), 'create');
assert.equal(selectOk.valid, true);

const optionDup = contract.validateScreenFieldInput(validCreateInput({
  type: 'select',
  options: [{ value: 'a', label: 'A' }, { value: 'a', label: 'B' }],
}), 'create');
assert.equal(optionDup.valid, false);

const optionCaseSensitive = contract.validateScreenFieldInput(validCreateInput({
  type: 'select',
  options: [{ value: 'a', label: 'A' }, { value: 'A', label: 'Upper' }],
}), 'create');
assert.equal(optionCaseSensitive.valid, true);

const tooManyOptions = contract.validateScreenFieldInput(validCreateInput({
  type: 'select',
  options: Array.from({ length: 101 }, (_, i) => ({ value: `v${i}`, label: `L${i}` })),
}), 'create');
assert.equal(tooManyOptions.valid, false);

const badOrder = contract.validateScreenFieldInput(validCreateInput({ order: -1 }), 'create');
assert.equal(badOrder.valid, false);

const tieOrder = contract.validateScreenFieldInput(validCreateInput({ order: 5 }), 'create');
assert.equal(tieOrder.valid, true);

const regexOnly = contract.validateScreenFieldInput(validCreateInput({
  validationRules: [{ kind: 'regex', pattern: '^x+$' }],
  maxLength: 10,
}), 'create');
assert.equal(regexOnly.valid, true);

const badRuleKind = contract.validateScreenFieldInput(validCreateInput({
  validationRules: [{ kind: 'maxLength', value: 10 }],
}), 'create');
assert.equal(badRuleKind.valid, false);

const fileDefault = contract.validateScreenFieldInput(validCreateInput({ type: 'file', defaultValue: 'x' }), 'create');
assert.equal(fileDefault.valid, false);

const imageNull = contract.validateScreenFieldInput(validCreateInput({ type: 'image', defaultValue: null }), 'create');
assert.equal(imageNull.valid, true);

const forbiddenCreate = contract.validateScreenFieldInput(validCreateInput({ id: 'x' }), 'create');
assert.equal(forbiddenCreate.valid, false);

const forbiddenUpdate = contract.validateScreenFieldInput({ screenSpecId: 'other' }, 'update');
assert.equal(forbiddenUpdate.valid, false);

const sorted = adapterContract.compareScreenFields(
  seedField({ id: 'b', order: 1, createdAt: '2026-01-02T00:00:00.000Z' }),
  seedField({ id: 'a', order: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
);
assert.ok(sorted > 0, 'stable sort uses createdAt then id');

const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
assert.equal(authorize(contract.ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(authorize(contract.ACTIONS.CREATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize(contract.ACTIONS.DELETE, { context: { memberRole: 'editor' } }), true);

const adapter = createFakeAdapter([seedField()]);
const service = contract.createService({
  adapter,
  authorize: (action) => authorize(action, { context: { memberRole: 'editor' } }),
  clock: () => '2026-02-01T00:00:00.000Z',
});

await service.create('P1', validCreateInput({ name: 'secondField' }), { actorUid: 'u1' });
await assert.rejects(
  () => service.create('P1', validCreateInput({ name: 'SecondField' }), { actorUid: 'u1' }),
  (err) => err.code === contract.ERROR_CODES.DUPLICATE_NAME,
);

const created = await service.create('P1', validCreateInput({ name: 'noteBody', type: 'textarea' }), { actorUid: 'u1' });
await service.update('P1', created.id, { label: '본문' }, { actorUid: 'u1' });
await service.delete('P1', created.id, { actorUid: 'u1' });
const missing = await service.getById('P1', created.id, { actorUid: 'u1', memberRole: 'editor' });
assert.equal(missing, null);

const reRegistered = await service.create('P1', validCreateInput({ name: 'noteBody' }), { actorUid: 'u1' });
assert.equal(reRegistered.name, 'noteBody');

console.log('screen field service contract: PASS');
