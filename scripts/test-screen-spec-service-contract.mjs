#!/usr/bin/env node
/**
 * STAM ScreenSpec-2 — screenSpecs service + adapter contract
 *
 * Usage:
 *   node scripts/test-screen-spec-service-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const serviceSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-service.js'), 'utf8');
const adapterSource = await readFile(path.join(ROOT, 'stam/js/stam.screen-spec-firestore-adapter.js'), 'utf8');

assert.ok(serviceSource, 'stam.screen-spec-service.js must exist');
assert.ok(adapterSource, 'stam.screen-spec-firestore-adapter.js must exist');

assert.equal(/softDelete\s*:/.test(adapterSource), false);
assert.equal(/function\s+softDelete/.test(adapterSource), false);
assert.equal(/function\s+delete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+remove\s*\(/.test(adapterSource), false);
assert.equal(/softDelete\s*:/.test(serviceSource), false);
assert.equal(/function\s+softDelete/.test(serviceSource), false);
assert.equal(/function\s+delete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+remove\s*\(/.test(serviceSource), false);
assert.doesNotMatch(serviceSource, /DELETE:\s*'screenSpec\.delete'/);
assert.doesNotMatch(serviceSource, /IndexedDB/);
assert.doesNotMatch(serviceSource, /local-core-db/);
assert.doesNotMatch(serviceSource, /SCR-MANUAL/);
assert.doesNotMatch(serviceSource, /collection\('projects'\)/);
assert.doesNotMatch(serviceSource, /firebase\.firestore/);
assert.doesNotMatch(serviceSource, /alert\(/);
assert.doesNotMatch(adapterSource, /IndexedDB/);
assert.doesNotMatch(adapterSource, /local-core-db/);

assert.match(adapterSource, /COLLECTION = 'screenSpecs'/);
assert.match(adapterSource, /COUNTER_DOC_ID = 'screenSpecs'/);
assert.match(adapterSource, /CODE_PREFIX = 'SCR-'/);
assert.match(adapterSource, /formatScreenSpecCodeNumber/);
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

function validScreenSpecInput(overrides = {}) {
  return {
    title: '로그인 화면',
    ownerId: 'owner-uid',
    ownerName: 'Owner',
    ...overrides,
  };
}

function seedScreenSpec(overrides = {}) {
  return {
    id: 'scr-1',
    projectId: 'P1',
    code: 'SCR-001',
    title: 'Existing Screen',
    screenType: 'form',
    writeStatus: 'writing',
    reviewStatus: 'none',
    approvalStatus: 'none',
    ownerId: 'owner-uid',
    ownerName: 'Owner',
    requirementId: 'req-1',
    requirementCode: 'REQ_001',
    requirementTitle: 'Req title',
    functionalSpecId: 'fn-1',
    functionalSpecCode: 'FN_001',
    functionalSpecTitle: 'FN title',
    wbsItemId: 'wbs-1',
    wbsItemCode: 'WBS-001',
    wbsItemTitle: 'WBS title',
    menuScreenId: 'menu-1',
    menuScreenCode: 'MENU-001',
    menuScreenTitle: 'Menu title',
    templateId: 'tpl-1',
    routePath: '/login',
    menuPath: 'Auth > Login',
    description: '설명',
    imageCount: 2,
    annotationCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'u1',
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
    version: 2,
    ...overrides,
  };
}

function createFakeAdapter() {
  const store = new Map([
    ['scr-1', seedScreenSpec()],
  ]);

  return {
    calls: [],
    listByProject(projectId, query) {
      this.calls.push(['listByProject', projectId, query]);
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId));
    },
    getById(projectId, screenSpecId) {
      this.calls.push(['getById', projectId, screenSpecId]);
      const item = store.get(screenSpecId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, screenSpec) {
      this.calls.push(['create', projectId, screenSpec]);
      const next = { ...screenSpec, id: screenSpec.id || 'scr-new', code: screenSpec.code || 'SCR-999' };
      store.set(next.id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, screenSpecId, patch) {
      this.calls.push(['update', projectId, screenSpecId, patch]);
      const current = store.get(screenSpecId);
      const next = { ...current, ...patch };
      Object.keys(patch || {}).forEach((key) => {
        if (patch[key] === '') delete next[key];
      });
      store.set(screenSpecId, next);
      return Promise.resolve({ ...next });
    },
  };
}

function createFakeFirestore() {
  const paths = [];
  const store = new Map();
  const docs = [
    {
      id: 'scr-a',
      exists: true,
      data: () => ({
        title: 'A',
        projectId: 'P1',
        code: 'SCR-002',
        screenType: 'form',
        writeStatus: 'writing',
        reviewStatus: 'none',
        approvalStatus: 'none',
        ownerId: 'o1',
        ownerName: 'O1',
        imageCount: 0,
        annotationCount: 0,
        isDeleted: false,
        createdAt: '2026-07-02T00:00:00.000Z',
      }),
    },
    {
      id: 'scr-b',
      exists: true,
      data: () => ({
        title: 'B',
        projectId: 'P1',
        code: 'SCR-001',
        screenType: 'list',
        writeStatus: 'complete',
        reviewStatus: 'done',
        approvalStatus: 'approved',
        ownerId: 'o1',
        ownerName: 'O1',
        imageCount: 0,
        annotationCount: 0,
        isDeleted: true,
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    },
    {
      id: 'scr-c',
      exists: true,
      data: () => ({
        title: 'C',
        projectId: 'P1',
        code: 'SCR-003',
        screenType: 'detail',
        writeStatus: 'writing',
        reviewStatus: 'pending',
        approvalStatus: 'none',
        ownerId: 'o2',
        ownerName: 'O2',
        imageCount: 0,
        annotationCount: 0,
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
        if (pathParts[pathParts.length - 2] === 'screenSpecs') {
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
        const prev = store.get(key) || {};
        const next = Object.assign({}, prev);
        Object.keys(payload || {}).forEach((field) => {
          if (payload[field] && payload[field].__fieldDelete) {
            delete next[field];
          } else {
            next[field] = payload[field];
          }
        });
        store.set(key, next);
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
    seedCounter(projectId, lastNumber) {
      store.set(`projects/${projectId}/counters/screenSpecs`, { lastNumber });
    },
  };
}

const { context, window } = createContext();
await loadBrowserScript(context, 'stam/js/stam.screen-spec-firestore-adapter.js');
await loadBrowserScript(context, 'stam/js/stam.screen-spec-service.js');

const contract = window.STAM.screenSpecServiceContract;
const runtimeService = window.STAM.screenSpecService;
const adapterApi = window.STAM.screenSpecFirestoreAdapter;

assert.ok(adapterApi);
assert.equal(adapterApi.COLLECTION, 'screenSpecs');
assert.equal(adapterApi.COUNTER_DOC_ID, 'screenSpecs');
assert.equal(adapterApi.CODE_PREFIX, 'SCR-');
assert.equal(adapterApi.formatScreenSpecCodeNumber(1), 'SCR-001');
assert.equal(adapterApi.formatScreenSpecCodeNumber(9), 'SCR-009');
assert.equal(adapterApi.formatScreenSpecCodeNumber(42), 'SCR-042');
assert.equal(adapterApi.formatScreenSpecCodeNumber(999), 'SCR-999');
assert.equal(adapterApi.formatScreenSpecCodeNumber(1000), 'SCR-1000');

assert.ok(runtimeService);
assert.deepEqual(Object.keys(runtimeService.ACTIONS).sort(), ['CREATE', 'READ', 'UPDATE']);
assert.equal(runtimeService.ACTIONS.READ, 'screenSpec.read');
assert.equal(runtimeService.ACTIONS.CREATE, 'screenSpec.create');
assert.equal(runtimeService.ACTIONS.UPDATE, 'screenSpec.update');
assert.equal('DELETE' in runtimeService.ACTIONS, false);

[
  'normalizeScreenSpec',
  'validateScreenSpecInput',
  'buildCreatePayload',
  'buildUpdatePatch',
].forEach((name) => {
  assert.equal(typeof runtimeService[name], 'function', `service.${name}`);
  assert.equal(typeof contract[name], 'function', `contract.${name}`);
});

assert.equal(JSON.stringify(contract.SCREEN_TYPE_VALUES), JSON.stringify(['list', 'detail', 'form', 'popup', 'admin', 'main', 'result', 'other']));
assert.equal(JSON.stringify(contract.WRITE_STATUS_VALUES), JSON.stringify(['writing', 'complete']));
assert.equal(JSON.stringify(contract.REVIEW_STATUS_VALUES), JSON.stringify(['none', 'pending', 'done']));
assert.equal(JSON.stringify(contract.APPROVAL_STATUS_VALUES), JSON.stringify(['none', 'approved', 'rejected']));

const invalidEnum = contract.validateScreenSpecInput(validScreenSpecInput({ screenType: 'dashboard' }), 'create');
assert.equal(invalidEnum.valid, false);

const invalidCreate = contract.validateScreenSpecInput({}, 'create');
assert.equal(invalidCreate.valid, false);

const forbidden = contract.validateScreenSpecInput(validScreenSpecInput({ screenName: 'legacy' }), 'create');
assert.equal(forbidden.valid, false);

const codeReject = contract.validateScreenSpecInput(validScreenSpecInput({ code: 'SCR-999' }), 'create');
assert.equal(codeReject.valid, false);

assert.throws(() => contract.buildCreatePayload(validScreenSpecInput({ code: 'SCR-999' }), { actorUid: 'u1' }), /code cannot be specified/);

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

const helperCreate = service.buildCreatePayload(
  validScreenSpecInput({
    projectId: 'P1',
    requirementId: 'req-abc',
    requirementCode: 'REQ_002',
    requirementTitle: ' Requirement title ',
    templateId: 'tpl-1',
    routePath: '/login',
    description: '설명',
    imageCount: 2,
    annotationCount: 1,
  }),
  { actorUid: 'helper-user', actorName: 'Helper User' },
);
assert.equal(helperCreate.projectId, 'P1');
assert.equal('code' in helperCreate, false);
assert.equal(helperCreate.screenType, 'other');
assert.equal(helperCreate.writeStatus, 'writing');
assert.equal(helperCreate.reviewStatus, 'none');
assert.equal(helperCreate.approvalStatus, 'none');
assert.equal(helperCreate.imageCount, 2);
assert.equal(helperCreate.annotationCount, 1);
assert.equal(helperCreate.requirementTitle, 'Requirement title');
assert.equal(helperCreate.createdAt, '2026-07-09T00:00:00.000Z');
assert.equal(helperCreate.createdBy, 'helper-user');
assert.equal(helperCreate.updatedBy, 'helper-user');
assert.equal(helperCreate.deletedAt, null);
assert.equal(helperCreate.deletedBy, null);
assert.equal(helperCreate.isDeleted, false);
assert.equal(helperCreate.version, 1);

const helperDefaults = service.buildCreatePayload(
  validScreenSpecInput({ projectId: 'P1' }),
  { actorUid: 'helper-user' },
);
assert.equal(helperDefaults.screenType, 'other');
assert.equal(helperDefaults.writeStatus, 'writing');
assert.equal(helperDefaults.reviewStatus, 'none');
assert.equal(helperDefaults.approvalStatus, 'none');
assert.equal(helperDefaults.imageCount, 0);
assert.equal(helperDefaults.annotationCount, 0);

const createCtx = { actorUid: 'helper-user' };
assert.throws(() => service.buildCreatePayload(validScreenSpecInput({ projectId: 'P1', screenType: null }), createCtx), /screenType cannot be null/);
assert.throws(() => service.buildCreatePayload(validScreenSpecInput({ projectId: 'P1', screenType: '' }), createCtx), /screenType cannot be empty/);
assert.throws(() => service.buildCreatePayload(validScreenSpecInput({ projectId: 'P1', writeStatus: 'draft' }), createCtx), /invalid writeStatus/);
assert.throws(() => service.buildCreatePayload(validScreenSpecInput({ projectId: 'P1', imageCount: null }), createCtx), /imageCount cannot be null/);
assert.throws(() => service.buildCreatePayload(validScreenSpecInput({ projectId: 'P1', imageCount: -1 }), createCtx), /imageCount must be a non-negative integer/);
assert.throws(() => service.buildCreatePayload(validScreenSpecInput({ projectId: 'P1', annotationCount: 1.5 }), createCtx), /annotationCount must be a non-negative integer/);

assert.throws(() => adapterApi.formatScreenSpecCodeNumber(1.5));
assert.throws(() => adapterApi.formatScreenSpecCodeNumber('2'));
assert.throws(() => adapterApi.formatScreenSpecCodeNumber(0));
assert.throws(() => adapterApi.formatScreenSpecCodeNumber(-1));

const partialOwnerInput = validScreenSpecInput({ projectId: 'P1', ownerId: 'o1' });
delete partialOwnerInput.ownerName;
assert.throws(
  () => service.buildCreatePayload(partialOwnerInput, { actorUid: 'u1' }),
  /ownerId and ownerName are required/,
);

const helperPatch = service.buildUpdatePatch(
  seedScreenSpec(),
  {
    title: 'Helper patch',
    writeStatus: 'complete',
  },
  { actorUid: 'patch-user' },
);
assert.equal(helperPatch.updatedAt, '2026-07-09T00:00:00.000Z');
assert.equal(helperPatch.updatedBy, 'patch-user');
assert.equal(helperPatch.version, 3);

assert.throws(
  () => service.buildUpdatePatch(
    seedScreenSpec(),
    { id: 'MUST-NOT-LEAK', title: 'x' },
    { actorUid: 'patch-user' },
  ),
  /id cannot be specified on update input/,
);

const normalized = contract.normalizeScreenSpec({
  id: 'scr-x',
  projectId: 'P1',
  code: 'SCR-010',
  title: ' Title ',
  screenType: 'form',
  writeStatus: 'writing',
  reviewStatus: 'none',
  approvalStatus: 'none',
  ownerId: 'o1',
  ownerName: 'Owner',
  screenName: 'legacy',
  functionId: 'fn',
  version: 2,
});
assert.equal(normalized.title, 'Title');
assert.equal('screenName' in normalized, false);
assert.equal('functionId' in normalized, false);

const list = await service.listByProject('P1', {}, { actorUid: 'u2' });
assert.equal(list.length, 1);
assert.deepEqual(authCalls.at(-1), ['screenSpec.read', 'P1']);
assert.equal(adapter.calls[0][2].includeDeleted, false);

assert.throws(
  () => service.create('P1', validScreenSpecInput({
    deletedAt: '2026-07-09T00:00:00.000Z',
    deletedBy: 'attacker',
    isDeleted: true,
    version: 9,
    createdBy: 'attacker',
  }), { actorUid: 'u2', actorName: 'Writer' }),
  /cannot be specified on create input/,
);

const created = await service.create('P1', validScreenSpecInput({ title: 'New screen' }), { actorUid: 'u2', actorName: 'Writer' });
assert.equal(created.projectId, 'P1');
assert.equal(created.isDeleted, false);
assert.equal(created.deletedAt, null);
assert.equal(created.deletedBy, null);
assert.equal(created.version, 1);
assert.equal(created.createdBy, 'u2');
assert.deepEqual(authCalls.at(-1), ['screenSpec.create', 'P1']);
assert.equal(adapter.calls.find((entry) => entry[0] === 'create')[2].code, undefined);

const updated = await service.update('P1', 'scr-1', {
  title: 'Updated title',
  writeStatus: 'complete',
}, { actorUid: 'u3' });
assert.equal(updated.title, 'Updated title');
assert.equal(updated.writeStatus, 'complete');
assert.equal(updated.version, 3);
assert.equal(updated.updatedBy, 'u3');

await assert.rejects(
  () => service.update('P1', 'missing', { title: 'x' }, { actorUid: 'u3' }),
  /screen spec not found/,
);

const reqUnlink = await service.update('P1', 'scr-1', {
  requirementId: '',
  requirementCode: '',
  requirementTitle: '',
}, { actorUid: 'u3' });
assert.equal(reqUnlink.requirementId, undefined);

await assert.rejects(
  () => service.update('P1', 'scr-1', { requirementId: '', requirementCode: 'REQ_001', requirementTitle: 'x' }, { actorUid: 'u3' }),
  /partial requirement/,
);

const templateClear = await service.update('P1', 'scr-1', { templateId: '' }, { actorUid: 'u3' });
assert.equal(templateClear.templateId, undefined);
const templateClearCall = adapter.calls.find((entry) => entry[0] === 'update' && entry[3] && entry[3].templateId === '');
assert.ok(templateClearCall, 'templateId clear sentinel must reach adapter');

await assert.rejects(
  () => service.update('P1', 'scr-1', { imageCount: null }, { actorUid: 'u3' }),
  /imageCount cannot be null/,
);

await assert.rejects(
  () => service.update('P1', 'scr-1', {}, { actorUid: 'u3' }),
  /at least one field is required/,
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
  () => runtimeService.create('P1', validScreenSpecInput(), { actorUid: 'u0' }),
  /permission denied/,
);

const roleAuthorize = contract.createMemberRoleAuthorize((request) => request.context.memberRole);
assert.equal(roleAuthorize(contract.ACTIONS.CREATE, { context: { memberRole: 'admin' } }), true);
assert.equal(roleAuthorize(contract.ACTIONS.UPDATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(roleAuthorize(contract.ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);
assert.equal(roleAuthorize('screenSpec.delete', { context: { memberRole: 'owner' } }), false);

const fakeFirestore = createFakeFirestore();
const firestoreAdapter = adapterApi.create({ firestore: fakeFirestore });
assert.equal(typeof firestoreAdapter.delete, 'undefined');
assert.equal(typeof firestoreAdapter.softDelete, 'undefined');

const adapterList = await firestoreAdapter.listByProject('P1', {});
assert.equal(adapterList.length, 2);
assert.equal(adapterList[0].id, 'scr-c');
assert.equal(adapterList[1].id, 'scr-a');

const filtered = await firestoreAdapter.listByProject('P1', { ownerId: 'o2' });
assert.equal(filtered.length, 1);
assert.equal(filtered[0].id, 'scr-c');

const adapterCreated = await firestoreAdapter.create('P1', {
  id: 'scr-new',
  title: 'Created',
  screenType: 'form',
  writeStatus: 'writing',
  reviewStatus: 'none',
  approvalStatus: 'none',
  ownerId: 'o1',
  ownerName: 'Owner',
  imageCount: 0,
  annotationCount: 0,
  createdBy: 'u1',
  updatedBy: 'u1',
  deletedAt: null,
  deletedBy: null,
  isDeleted: false,
  version: 1,
  projectId: 'P1',
});
assert.equal(adapterCreated.code, 'SCR-001');
const counterSet = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === 'projects/P1/counters/screenSpecs');
assert.ok(counterSet);
assert.equal(counterSet[2].lastNumber, 1);
const specWrite = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === 'projects/P1/screenSpecs/scr-new');
assert.ok(specWrite);
assert.equal(specWrite[2].code, 'SCR-001');
assert.equal(specWrite[2].createdAt.__serverTimestamp, true);
assert.equal(specWrite[2].updatedAt.__serverTimestamp, true);

assert.throws(
  () => firestoreAdapter.create('P1', { code: 'SCR-999', title: 'Blocked' }),
  /explicit code is not allowed/,
);

console.log('screen spec service contract: PASS');
