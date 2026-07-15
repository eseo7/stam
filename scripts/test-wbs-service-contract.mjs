#!/usr/bin/env node
/**
 * STAM WBS-2 — WBS service + adapter contract
 *
 * Usage:
 *   node scripts/test-wbs-service-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-adapter.js'), 'utf8');
const wbsHtmlSource = await readFile(path.join(ROOT, 'stam/pages/boards/wbs.html'), 'utf8');
const wbsCycleSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-cycle.js'), 'utf8');
const wbsCrudSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-crud.js'), 'utf8');

assert.ok(serviceSource, 'stam.wbs-service.js must exist');
assert.ok(adapterSource, 'stam.wbs-firestore-adapter.js must exist');

assert.equal(/softDelete\s*:/.test(adapterSource), false);
assert.equal(/function\s+softDelete/.test(adapterSource), false);
assert.equal(/function\s+delete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+remove\s*\(/.test(adapterSource), false);
assert.equal(/softDelete\s*:/.test(serviceSource), false);
assert.equal(/function\s+softDelete/.test(serviceSource), false);
assert.equal(/function\s+delete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+remove\s*\(/.test(serviceSource), false);
assert.doesNotMatch(serviceSource, /DELETE:\s*'wbs\.delete'/);
assert.doesNotMatch(serviceSource, /IndexedDB/);
assert.doesNotMatch(serviceSource, /local-core-db/);
assert.doesNotMatch(serviceSource, /WBS-MANUAL/);

assert.doesNotMatch(wbsHtmlSource, /wbsService/);
assert.doesNotMatch(wbsHtmlSource, /wbsFirestoreAdapter/);

assert.match(wbsHtmlSource, /stam\.wbs-service\.js/);
assert.match(wbsHtmlSource, /stam\.wbs-firestore-adapter\.js/);
assert.match(wbsHtmlSource, /stam\.wbs-firestore-list\.js/);
assert.match(wbsHtmlSource, /stam\.wbs-firestore-crud\.js/);
assert.doesNotMatch(wbsHtmlSource, /stam\.wbs-cycle\.js/);
assert.doesNotMatch(wbsHtmlSource, /stam\.wbs-crud\.js/);
assert.doesNotMatch(wbsHtmlSource, /stam\.local-core-db\.js/);
assert.match(wbsHtmlSource, /data-stam-wbs-live="true"/);

assert.doesNotMatch(wbsCycleSource, /stam\.wbs-service\.js/);
assert.doesNotMatch(wbsCrudSource, /stam\.wbs-service\.js/);

assert.match(adapterSource, /COLLECTION = 'wbsItems'/);
assert.match(adapterSource, /COUNTER_DOC_ID = 'wbsItems'/);
assert.match(adapterSource, /CODE_PREFIX = 'WBS-'/);
assert.match(adapterSource, /formatWbsCodeNumber/);
assert.match(adapterSource, /createWithAllocatedCode/);
assert.match(adapterSource, /transaction\.set\(cref/);
assert.match(adapterSource, /transaction\.set\(ref, payload\)/);
assert.match(adapterSource, /explicit code is not allowed/);

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
  });
  window.window = window;
  return { context, window };
}

function loadBrowserScript(context, filePath) {
  return readFile(path.join(ROOT, filePath), 'utf8').then((code) => {
    vm.runInContext(code, context, { filename: filePath });
  });
}

function validWbsInput(overrides = {}) {
  return {
    title: '로그인 기능 구현',
    phase: '구현',
    functionGroup: '인증',
    status: 'in_progress',
    priority: 'high',
    ownerId: 'owner-uid',
    ownerName: 'Owner',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    progress: 30,
    ...overrides,
  };
}

function createFakeAdapter() {
  const store = new Map([
    ['wbs-1', {
      id: 'wbs-1',
      projectId: 'P1',
      code: 'WBS-001',
      title: 'Existing WBS',
      phase: '구현',
      functionGroup: '인증',
      status: 'in_progress',
      priority: 'high',
      ownerId: 'owner-uid',
      ownerName: 'Owner',
      reviewerId: 'rev-1',
      reviewerName: 'Reviewer',
      requirementId: 'req-1',
      requirementCode: 'REQ_001',
      requirementTitle: 'Req title',
      functionalSpecId: 'fn-1',
      functionalSpecCode: 'FN_001',
      functionalSpecTitle: 'FN title',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      progress: 20,
      businessArea: '회원',
      plannedEffort: 3,
      actualEffort: 1.5,
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'u1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: 'u1',
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 2,
    }],
  ]);

  return {
    calls: [],
    listByProject(projectId, query) {
      this.calls.push(['listByProject', projectId, query]);
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId));
    },
    getById(projectId, wbsItemId) {
      this.calls.push(['getById', projectId, wbsItemId]);
      const item = store.get(wbsItemId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, wbsItem) {
      this.calls.push(['create', projectId, wbsItem]);
      const next = { ...wbsItem, id: wbsItem.id || 'wbs-new', code: wbsItem.code || 'WBS-999' };
      store.set(next.id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, wbsItemId, patch) {
      this.calls.push(['update', projectId, wbsItemId, patch]);
      const current = store.get(wbsItemId);
      const next = { ...current, ...patch };
      Object.keys(patch || {}).forEach((key) => {
        if (patch[key] === '') delete next[key];
      });
      store.set(wbsItemId, next);
      return Promise.resolve({ ...next });
    },
  };
}

function createFakeFirestore() {
  const paths = [];
  const store = new Map();
  const docs = [
    {
      id: 'wbs-a',
      exists: true,
      data: () => ({
        title: 'A',
        projectId: 'P1',
        code: 'WBS-002',
        phase: '구현',
        functionGroup: '인증',
        status: 'wait',
        priority: 'mid',
        ownerId: 'o1',
        ownerName: 'O1',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        progress: 0,
        isDeleted: false,
        createdAt: '2026-07-02T00:00:00.000Z',
      }),
    },
    {
      id: 'wbs-b',
      exists: true,
      data: () => ({
        title: 'B',
        projectId: 'P1',
        code: 'WBS-001',
        phase: '분석',
        functionGroup: '인증',
        status: 'wait',
        priority: 'mid',
        ownerId: 'o1',
        ownerName: 'O1',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        progress: 0,
        isDeleted: true,
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    },
    {
      id: 'wbs-c',
      exists: true,
      data: () => ({
        title: 'C',
        projectId: 'P1',
        code: 'WBS-003',
        phase: '설계',
        functionGroup: '인증',
        status: 'wait',
        priority: 'mid',
        ownerId: 'o1',
        ownerName: 'O1',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        progress: 0,
        isDeleted: false,
        createdAt: '2026-07-02T00:00:00.000Z',
      }),
    },
  ];

  function docRef(pathParts) {
    const key = pathParts.join('/');
    return {
      __key: key,
      collection(name) {
        return collectionRef([...pathParts, name]);
      },
      get() {
        paths.push(['get', key]);
        const stored = store.get(key);
        if (stored) {
          return Promise.resolve({
            id: pathParts[pathParts.length - 1],
            exists: true,
            data: () => stored,
          });
        }
        if (pathParts[pathParts.length - 2] === 'wbsItems') {
          const found = docs.find((doc) => doc.id === pathParts[pathParts.length - 1]);
          if (found) return Promise.resolve(found);
        }
        return Promise.resolve({
          id: pathParts[pathParts.length - 1],
          exists: false,
          data: () => ({}),
        });
      },
      set(payload, options) {
        paths.push(['set', key, payload, options || null]);
        const prev = store.get(key) || {};
        store.set(key, options && options.merge ? Object.assign({}, prev, payload) : Object.assign({}, payload));
        return Promise.resolve();
      },
      update(payload) {
        paths.push(['update', key, payload]);
        return Promise.resolve();
      },
    };
  }

  function collectionRef(pathParts) {
    return {
      doc(id) {
        return docRef([...pathParts, id || 'AUTO-ID']);
      },
      get() {
        paths.push(['getCollection', pathParts.join('/')]);
        return Promise.resolve({
          forEach(callback) {
            docs.forEach(callback);
          },
        });
      },
    };
  }

  return {
    paths,
    store,
    collection(name) {
      return collectionRef([name]);
    },
    runTransaction(fn) {
      const pending = [];
      const tx = {
        get(ref) {
          return ref.get();
        },
        set(ref, data, options) {
          pending.push({ ref, data, options });
        },
      };
      return Promise.resolve(fn(tx)).then((result) => {
        return Promise.all(pending.map((op) => op.ref.set(op.data, op.options))).then(() => result);
      });
    },
  };
}

const { context, window } = createContext();
await loadBrowserScript(context, 'stam/js/stam.wbs-firestore-adapter.js');
await loadBrowserScript(context, 'stam/js/stam.wbs-service.js');

const contract = window.STAM.wbsServiceContract;
const runtimeService = window.STAM.wbsService;
const adapterApi = window.STAM.wbsFirestoreAdapter;

assert.ok(adapterApi);
assert.equal(adapterApi.COLLECTION, 'wbsItems');
assert.equal(adapterApi.COUNTER_DOC_ID, 'wbsItems');
assert.equal(adapterApi.CODE_PREFIX, 'WBS-');
assert.equal(adapterApi.formatWbsCodeNumber(1), 'WBS-001');
assert.equal(adapterApi.formatWbsCodeNumber(9), 'WBS-009');
assert.equal(adapterApi.formatWbsCodeNumber(42), 'WBS-042');
assert.equal(adapterApi.formatWbsCodeNumber(999), 'WBS-999');
assert.equal(adapterApi.formatWbsCodeNumber(1000), 'WBS-1000');

assert.ok(runtimeService);
assert.deepEqual(Object.keys(runtimeService.ACTIONS).sort(), ['CREATE', 'READ', 'UPDATE']);
assert.equal(runtimeService.ACTIONS.READ, 'wbs.read');
assert.equal(runtimeService.ACTIONS.CREATE, 'wbs.create');
assert.equal(runtimeService.ACTIONS.UPDATE, 'wbs.update');
assert.equal('DELETE' in runtimeService.ACTIONS, false);

[
  'normalizeWbsItem',
  'validateWbsInput',
  'validateWbsRecord',
  'buildCreatePayload',
  'buildUpdatePatch',
  'buildPayload',
].forEach((name) => {
  assert.equal(typeof runtimeService[name], 'function', `service.${name}`);
  assert.equal(typeof contract[name], 'function', `contract.${name}`);
});

assert.equal(JSON.stringify(contract.PHASE_VALUES), JSON.stringify(['착수', '분석', '설계', '구현', '검수', '오픈', '완료']));
assert.equal(JSON.stringify(contract.STATUS_VALUES), JSON.stringify(['wait', 'in_progress', 'delayed', 'done', 'hold']));
assert.equal(JSON.stringify(contract.PRIORITY_VALUES), JSON.stringify(['high', 'mid', 'low']));

const invalidEnum = contract.validateWbsInput(validWbsInput({ status: 'reviewing', priority: 'urgent' }), 'create');
assert.equal(invalidEnum.valid, false);

const invalidLocalStatus = contract.validateWbsInput(validWbsInput({ status: 'draft' }), 'create');
assert.equal(invalidLocalStatus.valid, false);

const invalidCreate = contract.validateWbsInput({}, 'create');
assert.equal(invalidCreate.valid, false);

const forbidden = contract.validateWbsInput(validWbsInput({ approvalStatus: 'none' }), 'create');
assert.equal(forbidden.valid, false);

const codeReject = contract.validateWbsInput(validWbsInput({ code: 'WBS-999' }), 'create');
assert.equal(codeReject.valid, false);

assert.throws(() => contract.buildCreatePayload(validWbsInput({ code: 'WBS-999' }), { actorUid: 'u1' }), /code cannot be specified/);

const authCalls = [];
const adapter = createFakeAdapter();
const service = contract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize(action, request) {
    authCalls.push([action, request.projectId]);
    return true;
  },
});

const helperCreateWithPid = service.buildCreatePayload(
  validWbsInput({
    projectId: 'P1',
    requirementId: 'req-abc',
    requirementCode: 'REQ_002',
    requirementTitle: ' Requirement title ',
    reviewerId: 'rev-1',
    reviewerName: 'Reviewer',
    businessArea: '회원',
    description: '설명',
    plannedEffort: '2.5',
  }),
  { actorUid: 'helper-user', actorName: 'Helper User' },
);
assert.equal(helperCreateWithPid.projectId, 'P1');
assert.equal('code' in helperCreateWithPid, false);
assert.equal(helperCreateWithPid.status, 'in_progress');
assert.equal(helperCreateWithPid.priority, 'high');
assert.equal(helperCreateWithPid.requirementTitle, 'Requirement title');
assert.equal(helperCreateWithPid.plannedEffort, 2.5);
assert.equal(helperCreateWithPid.createdAt, '2026-07-09T00:00:00.000Z');
assert.equal(helperCreateWithPid.createdBy, 'helper-user');
assert.equal(helperCreateWithPid.updatedBy, 'helper-user');
assert.equal(helperCreateWithPid.deletedAt, null);
assert.equal(helperCreateWithPid.deletedBy, null);
assert.equal(helperCreateWithPid.isDeleted, false);
assert.equal(helperCreateWithPid.version, 1);

const helperCreateDefaults = service.buildCreatePayload(
  validWbsInput({ projectId: 'P1', status: undefined, priority: undefined, progress: undefined }),
  { actorUid: 'helper-user' },
);
assert.equal(helperCreateDefaults.status, 'wait');
assert.equal(helperCreateDefaults.priority, 'mid');
assert.equal(helperCreateDefaults.progress, 0);

const createCtx = { actorUid: 'helper-user' };
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', status: null }), createCtx), /status cannot be null/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', status: '' }), createCtx), /status cannot be empty/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', status: '   ' }), createCtx), /status cannot be empty/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', priority: null }), createCtx), /priority cannot be null/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', priority: '' }), createCtx), /priority cannot be empty/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', priority: '   ' }), createCtx), /priority cannot be empty/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', progress: null }), createCtx), /progress cannot be null/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', progress: '' }), createCtx), /progress cannot be empty/);
assert.throws(() => service.buildCreatePayload(validWbsInput({ projectId: 'P1', progress: '   ' }), createCtx), /progress cannot be empty/);

assert.throws(() => adapterApi.formatWbsCodeNumber(1.5));
assert.throws(() => adapterApi.formatWbsCodeNumber('2'));
assert.throws(() => adapterApi.formatWbsCodeNumber(0));
assert.throws(() => adapterApi.formatWbsCodeNumber(-1));

assert.throws(
  () => service.buildCreatePayload(validWbsInput({ projectId: 'P1', status: 'done', progress: 0 }), { actorUid: 'u1' }),
  /done status requires progress 100/,
);
assert.throws(
  () => service.buildCreatePayload(validWbsInput({ projectId: 'P1', status: 'done', progress: 99 }), { actorUid: 'u1' }),
  /done status requires progress 100/,
);
assert.throws(
  () => service.buildCreatePayload(validWbsInput({ projectId: 'P1', status: 'in_progress', progress: 100 }), { actorUid: 'u1' }),
  /non-done status requires progress below 100/,
);

assert.throws(
  () => service.buildCreatePayload(validWbsInput({ projectId: 'P1', startDate: '2026-02-30' }), { actorUid: 'u1' }),
  /startDate/,
);
assert.throws(
  () => service.buildCreatePayload(validWbsInput({ projectId: 'P1', endDate: '2026-04-31' }), { actorUid: 'u1' }),
  /endDate/,
);
assert.throws(
  () => service.buildCreatePayload(validWbsInput({ projectId: 'P1', startDate: '2026-13-01' }), { actorUid: 'u1' }),
  /startDate/,
);
assert.equal(contract.isValidCalendarDate('2028-02-29'), true);
assert.equal(contract.isValidCalendarDate('2026-02-28'), true);
assert.equal(contract.isValidCalendarDate('2026-2-01'), false);

const partialOwnerInput = validWbsInput({ projectId: 'P1', ownerId: 'o1' });
delete partialOwnerInput.ownerName;
assert.throws(
  () => service.buildCreatePayload(partialOwnerInput, { actorUid: 'u1' }),
  /ownerId and ownerName are required/,
);

const helperPatch = service.buildUpdatePatch({
  id: 'MUST-NOT-LEAK',
  projectId: 'MUST-NOT-LEAK',
  title: 'Helper patch',
  status: 'delayed',
}, { actorUid: 'patch-user' });
assert.equal(helperPatch.id, undefined);
assert.equal(helperPatch.projectId, undefined);
assert.equal(helperPatch.updatedAt, '2026-07-09T00:00:00.000Z');
assert.equal(helperPatch.updatedBy, 'patch-user');

const list = await service.listByProject('P1', {}, { actorUid: 'u2' });
assert.equal(list.length, 1);
assert.deepEqual(authCalls.at(-1), ['wbs.read', 'P1']);
assert.equal(adapter.calls[0][2].includeDeleted, false);

const created = await service.create('P1', validWbsInput({
  deletedAt: '2026-07-09T00:00:00.000Z',
  deletedBy: 'attacker',
  isDeleted: true,
  version: 9,
  createdBy: 'attacker',
}), { actorUid: 'u2', actorName: 'Writer' });
assert.equal(created.projectId, 'P1');
assert.equal(created.isDeleted, false);
assert.equal(created.deletedAt, null);
assert.equal(created.deletedBy, null);
assert.equal(created.version, 1);
assert.equal(created.createdBy, 'u2');
assert.deepEqual(authCalls.at(-1), ['wbs.create', 'P1']);

await assert.rejects(
  () => service.update('P1', 'wbs-1', { progress: 100 }, { actorUid: 'u3' }),
  /non-done status requires progress below 100/,
);
assert.throws(
  () => service.buildPayload({ progress: 100 }, 'update', { actorUid: 'u3' }, {
    ...validWbsInput({ projectId: 'P1', status: 'in_progress', progress: 20 }),
    id: 'wbs-1',
    code: 'WBS-001',
    version: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'u1',
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
  }),
  /non-done status requires progress below 100/,
);

const updatedDone = await service.update('P1', 'wbs-1', {
  status: 'done',
  progress: 100,
}, { actorUid: 'u3' });
assert.equal(updatedDone.status, 'done');
assert.equal(updatedDone.progress, 100);
assert.equal(updatedDone.version, 3);
assert.equal(updatedDone.updatedBy, 'u3');

const reviewerUnlink = await service.update('P1', 'wbs-1', {
  reviewerId: '',
  reviewerName: '',
}, { actorUid: 'u3' });
assert.equal(reviewerUnlink.reviewerId, undefined);
assert.equal(reviewerUnlink.reviewerName, undefined);

assert.throws(
  () => service.update('P1', 'wbs-1', { reviewerId: '', reviewerName: 'x' }, { actorUid: 'u3' }),
  /partial reviewer/,
);

const reqUnlink = await service.update('P1', 'wbs-1', {
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
}, { actorUid: 'u3' });
assert.equal(reqUnlink.requirementId, undefined);

const fnUnlink = await service.update('P1', 'wbs-1', {
  functionalSpecId: '',
  functionalSpecCode: '',
  functionalSpecTitle: '',
}, { actorUid: 'u3' });
assert.equal(fnUnlink.functionalSpecId, undefined);

const businessAreaClear = await service.update('P1', 'wbs-1', {
  businessArea: '',
}, { actorUid: 'u3' });
assert.equal(businessAreaClear.businessArea, undefined);
const businessAreaClearCall = adapter.calls.find((entry) => entry[0] === 'update' && entry[3] && entry[3].businessArea === '');
assert.ok(businessAreaClearCall, 'businessArea clear sentinel must reach adapter');

const effortClear = await service.update('P1', 'wbs-1', {
  plannedEffort: '',
  actualEffort: '',
}, { actorUid: 'u3' });
assert.equal(effortClear.plannedEffort, undefined);
assert.equal(effortClear.actualEffort, undefined);

assert.throws(
  () => service.update('P1', 'wbs-1', { plannedEffort: null }, { actorUid: 'u3' }),
  /plannedEffort cannot be null/,
);
assert.throws(
  () => service.update('P1', 'wbs-1', { actualEffort: null }, { actorUid: 'u3' }),
  /actualEffort cannot be null/,
);

assert.equal(typeof service.delete, 'undefined');
assert.equal(typeof service.softDelete, 'undefined');
assert.equal(typeof service.remove, 'undefined');
assert.equal(typeof runtimeService.delete, 'undefined');

await assert.rejects(
  () => runtimeService.listByProject('P1', {}, { actorUid: 'u0' }),
  /permission denied/,
);
await assert.rejects(
  () => runtimeService.create('P1', validWbsInput(), { actorUid: 'u0' }),
  /permission denied/,
);

const looseAuthorizeService = contract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize() {
    return undefined;
  },
});
await assert.rejects(
  () => looseAuthorizeService.listByProject('P1', {}, { actorUid: 'u1' }),
  /permission denied/,
);
await assert.rejects(
  () => looseAuthorizeService.create('P1', validWbsInput(), { actorUid: 'u1' }),
  /permission denied/,
);
await assert.rejects(
  () => looseAuthorizeService.update('P1', 'wbs-1', { title: 'x' }, { actorUid: 'u1' }),
  /permission denied/,
);

const nullAuthorizeService = contract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize() {
    return null;
  },
});
await assert.rejects(
  () => nullAuthorizeService.listByProject('P1', {}, { actorUid: 'u1' }),
  /permission denied/,
);

const zeroAuthorizeService = contract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize() {
    return 0;
  },
});
await assert.rejects(
  () => zeroAuthorizeService.create('P1', validWbsInput(), { actorUid: 'u1' }),
  /permission denied/,
);

const trueAuthorizeService = contract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize() {
    return true;
  },
});
const trueAllowed = await trueAuthorizeService.listByProject('P1', {}, { actorUid: 'u1' });
assert.ok(trueAllowed.length >= 1);

const roleAuthorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
assert.equal(roleAuthorize(contract.ACTIONS.CREATE, { context: { memberRole: 'admin' } }), true);
assert.equal(roleAuthorize(contract.ACTIONS.UPDATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(roleAuthorize(contract.ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(roleAuthorize('wbs.delete', { context: { memberRole: 'owner' } }), false);

const fakeFirestore = createFakeFirestore();
const firestoreAdapter = adapterApi.create({ firestore: fakeFirestore });
assert.equal(typeof firestoreAdapter.delete, 'undefined');
assert.equal(typeof firestoreAdapter.softDelete, 'undefined');

const adapterList = await firestoreAdapter.listByProject('P1', {});
assert.equal(adapterList.length, 2);
assert.equal(adapterList[0].id, 'wbs-c');
assert.equal(adapterList[1].id, 'wbs-a');

const adapterCreated = await firestoreAdapter.create('P1', {
  id: 'wbs-new',
  title: 'Created',
  phase: '구현',
  functionGroup: '인증',
  status: 'wait',
  priority: 'mid',
  ownerId: 'o1',
  ownerName: 'Owner',
  startDate: '2026-07-01',
  endDate: '2026-07-02',
  progress: 0,
  createdBy: 'u1',
  updatedBy: 'u1',
  deletedAt: null,
  deletedBy: null,
  isDeleted: false,
  version: 1,
  projectId: 'P1',
});
assert.equal(adapterCreated.code, 'WBS-001');
const counterSet = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === 'projects/P1/counters/wbsItems');
assert.ok(counterSet);
assert.equal(counterSet[2].lastNumber, 1);

assert.throws(
  () => firestoreAdapter.create('P1', { code: 'WBS-999', title: 'Blocked' }),
  /explicit code is not allowed/,
);
assert.throws(
  () => firestoreAdapter.create('P1', validWbsInput({ projectId: 'P1', code: '' })),
  /explicit code is not allowed/,
);
assert.throws(
  () => firestoreAdapter.create('P1', { ...validWbsInput({ projectId: 'P1' }), code: '   ' }),
  /explicit code is not allowed/,
);
assert.throws(
  () => firestoreAdapter.create('P1', { ...validWbsInput({ projectId: 'P1' }), code: null }),
  /explicit code is not allowed/,
);

console.log('wbs service contract: PASS');
