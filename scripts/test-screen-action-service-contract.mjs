#!/usr/bin/env node
/**
 * STAM PR C — screenActions service + adapter contract
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-action-firestore-adapter.js'), 'utf8');

assert.ok(serviceSource);
assert.ok(adapterSource);
assert.match(adapterSource, /COLLECTION = 'screenActions'/);
assert.match(adapterSource, /validateTargetSnapshot/);
assert.doesNotMatch(adapterSource, /transaction\.get\(query\)/i);
assert.match(serviceSource, /DELETE: 'screenAction\.delete'/);
assert.match(serviceSource, /SCREEN_ACTION_DUPLICATE_NAME/);

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
  vm.runInContext(adapterSource, context, { filename: 'stam.screen-action-firestore-adapter.js' });
  vm.runInContext(serviceSource, context, { filename: 'stam.screen-action-service.js' });
  return {
    contract: window.STAM.screenActionServiceContract,
    adapterContract: window.STAM.screenActionFirestoreAdapter,
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

function createFakeAdapter(initial = []) {
  const store = new Map(initial.map((item) => [item.id, Object.assign({}, item)]));

  return {
    findDuplicateNormalizedName(projectId, screenSpecId, normalizedName, excludeActionId) {
      for (const item of store.values()) {
        if (item.projectId !== projectId || item.screenSpecId !== screenSpecId) continue;
        if (excludeActionId && item.id === excludeActionId) continue;
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
    getById(projectId, actionId) {
      const item = store.get(actionId);
      if (!item || item.projectId !== projectId) return Promise.resolve(null);
      return Promise.resolve(Object.assign({}, item));
    },
    create(projectId, action) {
      const id = action.id || `act-${store.size + 1}`;
      const next = Object.assign({}, action, { id, projectId });
      return this.findDuplicateNormalizedName(projectId, next.screenSpecId, adapterContract.normalizeName(next.name)).then((dup) => {
        if (dup) {
          const err = new Error('duplicate');
          err.code = 'SCREEN_ACTION_DUPLICATE_NAME';
          err.preflight = true;
          return Promise.reject(err);
        }
        store.set(id, next);
        return Promise.resolve(Object.assign({}, next));
      });
    },
    update(projectId, actionId, patch) {
      const current = store.get(actionId);
      if (!current) {
        const err = new Error('missing');
        err.code = 'SCREEN_ACTION_NOT_FOUND';
        err.preflight = true;
        return Promise.reject(err);
      }
      const next = Object.assign({}, current, patch);
      if (patch.name && adapterContract.normalizeName(patch.name) !== adapterContract.normalizeName(current.name)) {
        return this.findDuplicateNormalizedName(projectId, current.screenSpecId, adapterContract.normalizeName(patch.name), actionId).then((dup) => {
          if (dup) {
            const err = new Error('duplicate');
            err.code = 'SCREEN_ACTION_DUPLICATE_NAME';
            err.preflight = true;
            return Promise.reject(err);
          }
          store.set(actionId, next);
          return Promise.resolve(Object.assign({}, next));
        });
      }
      store.set(actionId, next);
      return Promise.resolve(Object.assign({}, next));
    },
    delete(projectId, actionId) {
      const current = store.get(actionId);
      if (!current || current.projectId !== projectId) {
        const err = new Error('missing');
        err.code = 'SCREEN_ACTION_NOT_FOUND';
        err.preflight = true;
        return Promise.reject(err);
      }
      store.delete(actionId);
      return Promise.resolve();
    },
    compareScreenActions(a, b) {
      return adapterContract.compareScreenActions(a, b);
    },
  };
}

const { contract, adapterContract } = await loadModules();

assert.deepEqual(Object.keys(contract.ACTIONS).sort(), ['CREATE', 'DELETE', 'LIST', 'READ', 'UPDATE']);
assert.equal(contract.SCHEMA_VERSION, 1);
assert.equal(contract.ACTION_TYPE_VALUES.length, 9);
assert.equal(contract.CONTROL_TYPE_VALUES.length, 4);
assert.equal(contract.normalizeName(' GoBack '), 'goback');

for (const actionType of contract.ACTION_TYPE_VALUES) {
  const input = validCreateInput({ actionType, name: `act_${actionType}`, targetScreenSpecId: actionType === 'navigate' ? 'scr-target' : null });
  const result = contract.validateScreenActionInput(input, 'create');
  assert.equal(result.valid, true, `enum actionType ${actionType}`);
}

const badEnum = contract.validateScreenActionInput(validCreateInput({ actionType: 'flyAway' }), 'create');
assert.equal(badEnum.valid, false);

const invalidName = contract.validateScreenActionInput(validCreateInput({ name: '1bad' }), 'create');
assert.equal(invalidName.valid, false);

const navigateNeedsTarget = contract.validateScreenActionInput(validCreateInput({ actionType: 'navigate', targetScreenSpecId: null }), 'create');
assert.equal(navigateNeedsTarget.valid, false);

const navigateOk = contract.validateScreenActionInput(validCreateInput({ actionType: 'navigate', targetScreenSpecId: 'scr-target' }), 'create');
assert.equal(navigateOk.valid, true);

const cancelWithTarget = contract.validateScreenActionInput(validCreateInput({ actionType: 'cancel', targetScreenSpecId: 'scr-target' }), 'create');
assert.equal(cancelWithTarget.valid, false);

const confirmRequired = contract.validateScreenActionInput(validCreateInput({ confirmRequired: true, confirmMessage: '정말 삭제?' }), 'create');
assert.equal(confirmRequired.valid, true);

const confirmMissingMessage = contract.validateScreenActionInput(validCreateInput({ confirmRequired: true }), 'create');
assert.equal(confirmMissingMessage.valid, false);

const confirmFalseWithTitle = contract.validateScreenActionInput(validCreateInput({ confirmRequired: false, confirmTitle: 'Title' }), 'create');
assert.equal(confirmFalseWithTitle.valid, false);

const badOrder = contract.validateScreenActionInput(validCreateInput({ order: -1 }), 'create');
assert.equal(badOrder.valid, false);

const forbiddenCreate = contract.validateScreenActionInput(validCreateInput({ id: 'x' }), 'create');
assert.equal(forbiddenCreate.valid, false);

const forbiddenUpdate = contract.validateScreenActionInput({ screenSpecId: 'other' }, 'update');
assert.equal(forbiddenUpdate.valid, false);

const payload = contract.buildCreatePayload(validCreateInput(), { actorUid: 'u1', projectId: 'P1' });
assert.equal(payload.controlType, 'button');
assert.equal(payload.placement, 'toolbar');
assert.equal(payload.variant, 'secondary');
assert.equal(payload.confirmRequired, false);

await assert.rejects(
  () => Promise.resolve().then(() => contract.buildUpdatePatch(
    seedAction({ actionType: 'cancel', targetScreenSpecId: null }),
    { actionType: 'navigate' },
    { actorUid: 'u1' },
  )),
  (err) => err.code === contract.ERROR_CODES.VALIDATION_FAILED,
);

const navigateToCancelPatch = contract.buildUpdatePatch(
  seedAction({
    actionType: 'navigate',
    targetScreenSpecId: 'scr-target',
  }),
  { actionType: 'cancel' },
  { actorUid: 'u1' },
);
assert.equal(navigateToCancelPatch.actionType, 'cancel');
assert.equal(navigateToCancelPatch.targetScreenSpecId, null);

const drawerToSubmitPatch = contract.buildUpdatePatch(
  seedAction({
    actionType: 'openDrawer',
    targetScreenSpecId: 'scr-target',
  }),
  { actionType: 'submit' },
  { actorUid: 'u1' },
);
assert.equal(drawerToSubmitPatch.actionType, 'submit');
assert.equal(drawerToSubmitPatch.targetScreenSpecId, null);

const confirmOffPatch = contract.buildUpdatePatch(
  seedAction({
    confirmRequired: true,
    confirmTitle: '삭제 확인',
    confirmMessage: '정말 삭제하시겠습니까?',
  }),
  { confirmRequired: false },
  { actorUid: 'u1' },
);
assert.equal(confirmOffPatch.confirmRequired, false);
assert.equal(confirmOffPatch.confirmTitle, null);
assert.equal(confirmOffPatch.confirmMessage, null);

const trimNamePatch = contract.buildUpdatePatch(
  seedAction(),
  { name: '  saveDraft  ' },
  { actorUid: 'u1' },
);
assert.equal(trimNamePatch.name, 'saveDraft');

const trimLabelPatch = contract.buildUpdatePatch(
  seedAction(),
  { label: '  제출  ' },
  { actorUid: 'u1' },
);
assert.equal(trimLabelPatch.label, '제출');

const trimSuccessPatch = contract.buildUpdatePatch(
  seedAction(),
  { successMessage: '  저장되었습니다  ' },
  { actorUid: 'u1' },
);
assert.equal(trimSuccessPatch.successMessage, '저장되었습니다');

const blankSuccessPatch = contract.buildUpdatePatch(
  seedAction({ successMessage: '기존' }),
  { successMessage: '   ' },
  { actorUid: 'u1' },
);
assert.equal(blankSuccessPatch.successMessage, null);

const authorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
assert.equal(authorize(contract.ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(authorize(contract.ACTIONS.CREATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(authorize(contract.ACTIONS.DELETE, { context: { memberRole: 'editor' } }), true);

const adapter = createFakeAdapter([seedAction()]);
const service = contract.createService({
  adapter,
  authorize: (action) => authorize(action, { context: { memberRole: 'editor' } }),
  clock: () => '2026-02-01T00:00:00.000Z',
});

await service.create('P1', validCreateInput({ name: 'saveDraft' }), { actorUid: 'u1' });
await assert.rejects(
  () => service.create('P1', validCreateInput({ name: 'SaveDraft' }), { actorUid: 'u1' }),
  (err) => err.code === contract.ERROR_CODES.DUPLICATE_NAME,
);

const created = await service.create('P1', validCreateInput({ name: 'submitForm', actionType: 'submit' }), { actorUid: 'u1' });
await service.update('P1', created.id, { label: '제출' }, { actorUid: 'u1' });

const navigateAction = await service.create('P1', validCreateInput({
  name: 'goList',
  actionType: 'navigate',
  targetScreenSpecId: 'scr-target',
}), { actorUid: 'u1' });
const cancelled = await service.update('P1', navigateAction.id, { actionType: 'cancel' }, { actorUid: 'u1' });
assert.equal(cancelled.actionType, 'cancel');
assert.equal(cancelled.targetScreenSpecId, null);

const confirmAction = await service.create('P1', validCreateInput({
  name: 'deleteRow',
  actionType: 'delete',
  confirmRequired: true,
  confirmTitle: '삭제',
  confirmMessage: '정말 삭제?',
}), { actorUid: 'u1' });
const confirmOff = await service.update('P1', confirmAction.id, { confirmRequired: false }, { actorUid: 'u1' });
assert.equal(confirmOff.confirmRequired, false);
assert.equal(confirmOff.confirmTitle, null);
assert.equal(confirmOff.confirmMessage, null);

await service.update('P1', created.id, { name: 'submitForm' }, { actorUid: 'u1' });
await service.delete('P1', created.id, { actorUid: 'u1' });
assert.equal(await service.getById('P1', created.id, { actorUid: 'u1', memberRole: 'editor' }), null);

console.log('screen action service contract: PASS');
