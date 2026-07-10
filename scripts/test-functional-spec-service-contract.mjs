import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const serviceSource = await readFile(new URL('stam/js/stam.functional-spec-service.js', ROOT), 'utf8');
const adapterSource = await readFile(new URL('stam/js/stam.functional-spec-firestore-adapter.js', ROOT), 'utf8');
const rulesSource = await readFile(new URL('firestore.rules', ROOT), 'utf8');

assert.equal(/softDelete\s*:/.test(adapterSource), false);
assert.equal(/function\s+softDelete/.test(adapterSource), false);
assert.equal(/function\s+delete\s*\(/.test(adapterSource), false);
assert.equal(/function\s+remove\s*\(/.test(adapterSource), false);
assert.equal(/softDelete\s*:/.test(serviceSource), false);
assert.equal(/function\s+softDelete/.test(serviceSource), false);
assert.equal(/function\s+delete\s*\(/.test(serviceSource), false);
assert.equal(/function\s+remove\s*\(/.test(serviceSource), false);
assert.doesNotMatch(serviceSource, /DELETE:\s*'functionalSpec\.delete'/);
assert.match(adapterSource, /COLLECTION = 'functionalSpecifications'/);
assert.match(adapterSource, /COUNTER_DOC_ID = 'functionalSpecifications'/);
assert.match(adapterSource, /CODE_PREFIX = 'FN_'/);
assert.match(adapterSource, /formatFunctionalSpecCodeNumber/);
assert.match(adapterSource, /allocateFunctionalSpecCode/);
assert.match(adapterSource, /collection\('counters'\)\.doc\(COUNTER_DOC_ID\)/);
assert.match(rulesSource, /function functionalSpecWriteKeys\(\)/);
assert.match(rulesSource, /function isValidFunctionalSpecificationsCounterWrite\(\)/);

async function loadBrowserScript(context, path) {
  const code = await readFile(new URL(path, ROOT), 'utf8');
  vm.runInContext(code, context, { filename: path });
}

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
  });
  window.window = window;
  return { context, window };
}

function createFakeAdapter() {
  const store = new Map([
    ['FN-1', {
      id: 'FN-1',
      projectId: 'P1',
      title: 'Existing spec',
      description: 'Before',
      status: 'draft',
      priority: 'mid',
      functionType: 'view',
      ownerUid: 'u1',
      ownerName: 'Owner',
      requirementId: 'req-1',
      requirementCode: 'REQ_001',
      requirementTitle: 'Linked requirement',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'u1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: 'u1',
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 2,
      reviewStatus: 'Review Needed',
    }],
  ]);

  return {
    calls: [],
    listByProject(projectId, query) {
      this.calls.push(['listByProject', projectId, query]);
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId));
    },
    getById(projectId, functionalSpecId) {
      this.calls.push(['getById', projectId, functionalSpecId]);
      const item = store.get(functionalSpecId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, functionalSpec) {
      this.calls.push(['create', projectId, functionalSpec]);
      const next = { ...functionalSpec, id: functionalSpec.id || 'FN-NEW' };
      store.set(next.id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, functionalSpecId, patch) {
      this.calls.push(['update', projectId, functionalSpecId, patch]);
      const current = store.get(functionalSpecId);
      const next = { ...current, ...patch };
      store.set(functionalSpecId, next);
      return Promise.resolve({ ...next });
    },
  };
}

function createFakeFirestore() {
  const paths = [];
  const store = new Map();
  const docs = [
    {
      id: 'FN-A',
      exists: true,
      data: () => ({
        title: 'A',
        projectId: 'P1',
        priority: 'high',
        status: 'draft',
        isDeleted: false,
        updatedAt: '2026-07-01T00:00:00.000Z',
      }),
    },
    {
      id: 'FN-B',
      exists: true,
      data: () => ({
        title: 'B',
        projectId: 'P1',
        isDeleted: true,
        updatedAt: '2026-07-02T00:00:00.000Z',
      }),
    },
  ];

  function docRef(path) {
    const key = path.join('/');
    return {
      collection(name) {
        return collectionRef([...path, name]);
      },
      get() {
        paths.push(['get', key]);
        const stored = store.get(key);
        if (stored) {
          return Promise.resolve({
            id: path[path.length - 1],
            exists: true,
            data: () => stored,
          });
        }
        if (path[path.length - 2] === 'functionalSpecifications' && path[path.length - 1] !== 'functionalSpecifications') {
          return Promise.resolve({
            id: path[path.length - 1],
            exists: true,
            data: () => ({
              id: path[path.length - 1],
              projectId: path[1],
              title: 'One',
              status: 'draft',
              priority: 'mid',
              isDeleted: false,
            }),
          });
        }
        return Promise.resolve({
          id: path[path.length - 1],
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

  function collectionRef(path) {
    return {
      doc(id) {
        return docRef([...path, id || 'AUTO-ID']);
      },
      get() {
        paths.push(['getCollection', path.join('/')]);
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
      const tx = {
        get(ref) {
          return ref.get();
        },
        set(ref, data, options) {
          return ref.set(data, options);
        },
      };
      return Promise.resolve(fn(tx));
    },
  };
}

const { context, window } = createContext();
await loadBrowserScript(context, 'stam/js/stam.functional-spec-firestore-adapter.js');
await loadBrowserScript(context, 'stam/js/stam.functional-spec-service.js');

assert.ok(window.STAM.functionalSpecFirestoreAdapter);
assert.equal(window.STAM.functionalSpecFirestoreAdapter.COLLECTION, 'functionalSpecifications');
assert.equal(window.STAM.functionalSpecFirestoreAdapter.COUNTER_DOC_ID, 'functionalSpecifications');
assert.equal(window.STAM.functionalSpecFirestoreAdapter.CODE_PREFIX, 'FN_');
assert.equal(window.STAM.functionalSpecFirestoreAdapter.formatFunctionalSpecCodeNumber(1), 'FN_001');
assert.equal(window.STAM.functionalSpecFirestoreAdapter.formatFunctionalSpecCodeNumber(12), 'FN_012');
assert.ok(window.STAM.functionalSpecService);
assert.deepEqual(
  Object.keys(window.STAM.functionalSpecService.ACTIONS).sort(),
  ['CREATE', 'READ', 'UPDATE'],
);
assert.equal(window.STAM.functionalSpecService.ACTIONS.READ, 'functionalSpec.read');
assert.equal(window.STAM.functionalSpecService.ACTIONS.CREATE, 'functionalSpec.create');
assert.equal(window.STAM.functionalSpecService.ACTIONS.UPDATE, 'functionalSpec.update');
assert.equal('DELETE' in window.STAM.functionalSpecService.ACTIONS, false);
[
  'normalizeFunctionalSpec',
  'validateFunctionalSpecInput',
  'buildCreatePayload',
  'buildUpdatePatch',
].forEach((name) => {
  assert.equal(typeof window.STAM.functionalSpecService[name], 'function');
  assert.equal(typeof window.STAM.functionalSpecServiceContract[name], 'function');
});

const invalidCreate = window.STAM.functionalSpecServiceContract.validateFunctionalSpecInput({}, 'create');
assert.equal(invalidCreate.valid, false);
assert.equal(invalidCreate.errors[0].field, 'title');

const authCalls = [];
const adapter = createFakeAdapter();
const service = window.STAM.functionalSpecServiceContract.createService({
  adapter,
  clock: () => '2026-07-09T00:00:00.000Z',
  authorize(action, request) {
    authCalls.push([action, request.projectId]);
    return true;
  },
});

const helperCreate = service.buildCreatePayload({
  projectId: 'P1',
  title: 'Helper create',
  status: 'review',
  priority: 'high',
  functionType: 'view',
  requirementId: 'req-abc',
  requirementCode: 'REQ_002',
  requirementTitle: ' Requirement title ',
  linkedScreen: '요구사항정의서',
  inputSpec: 'Input',
  businessRule: 'Rule',
  exceptionRule: 'Exception',
  apiRef: 'GET /api/specs',
  note: 'Note',
  reviewStatus: 'In Review',
}, {
  actorUid: 'helper-user',
  actorName: 'Helper User',
});
assert.equal(helperCreate.projectId, 'P1');
assert.equal(helperCreate.title, 'Helper create');
assert.equal('code' in helperCreate, false, 'create payload must omit empty code (FS-6 counter deferred)');
assert.equal(helperCreate.status, 'review');
assert.equal(helperCreate.priority, 'high');
assert.equal(helperCreate.functionType, 'view');
assert.equal(helperCreate.requirementId, 'req-abc');
assert.equal(helperCreate.requirementCode, 'REQ_002');
assert.equal(helperCreate.requirementTitle, 'Requirement title');
assert.equal(helperCreate.linkedScreen, '요구사항정의서');
assert.equal(helperCreate.createdAt, '2026-07-09T00:00:00.000Z');
assert.equal(helperCreate.createdBy, 'helper-user');
assert.equal(helperCreate.updatedBy, 'helper-user');
assert.equal(helperCreate.deletedAt, null);
assert.equal(helperCreate.deletedBy, null);
assert.equal(helperCreate.isDeleted, false);
assert.equal(helperCreate.version, 1);

const helperCreateDeleteInjection = service.buildCreatePayload({
  projectId: 'P1',
  title: 'Injected delete fields',
  deletedAt: '2026-07-09T00:00:00.000Z',
  deletedBy: 'attacker',
  isDeleted: true,
}, {
  actorUid: 'helper-user',
});
assert.equal(helperCreateDeleteInjection.deletedAt, null);
assert.equal(helperCreateDeleteInjection.deletedBy, null);
assert.equal(helperCreateDeleteInjection.isDeleted, false);

const helperCreateDefaults = service.buildCreatePayload({
  projectId: 'P1',
  title: 'Helper create defaults',
  status: 'invalid',
  priority: 'urgent',
  functionType: 'invalid-type',
}, {
  actorUid: 'helper-user',
});
assert.equal(helperCreateDefaults.status, 'draft');
assert.equal(helperCreateDefaults.priority, 'mid');
assert.equal('functionType' in helperCreateDefaults, false);
assert.equal(helperCreateDefaults.reviewStatus, 'Review Needed');

const helperPatch = service.buildUpdatePatch({
  id: 'MUST-NOT-LEAK',
  projectId: 'MUST-NOT-LEAK',
  title: 'Helper patch',
  status: 'approved',
  priority: 'low',
  functionType: 'integrate',
  requirementId: 'req-new',
  requirementCode: 'REQ_010',
  requirementTitle: 'Updated title',
}, {
  actorUid: 'patch-user',
});
assert.equal(helperPatch.id, undefined);
assert.equal(helperPatch.projectId, undefined);
assert.equal(helperPatch.title, 'Helper patch');
assert.equal(helperPatch.status, 'approved');
assert.equal(helperPatch.priority, 'low');
assert.equal(helperPatch.functionType, 'integrate');
assert.equal(helperPatch.requirementId, 'req-new');
assert.equal(helperPatch.updatedAt, '2026-07-09T00:00:00.000Z');
assert.equal(helperPatch.updatedBy, 'patch-user');

const normalized = window.STAM.functionalSpecService.normalizeFunctionalSpec({
  id: 'FN-N',
  projectId: 'P1',
  title: ' Normalized ',
  status: 'done',
  priority: 'high',
  functionType: 'export',
  requirementCode: 'REQ_003',
  isDeleted: false,
});
assert.equal(normalized.title, 'Normalized');
assert.equal(normalized.status, 'done');
assert.equal(normalized.priority, 'high');
assert.equal(normalized.functionType, 'export');
assert.equal(normalized.requirementCode, 'REQ_003');

const list = await service.listByProject('P1', {}, { actorUid: 'u2' });
assert.equal(list.length, 1);
assert.deepEqual(authCalls.at(-1), ['functionalSpec.read', 'P1']);
assert.equal(adapter.calls[0][2].includeDeleted, false);

const created = await service.create('P1', {
  title: 'New functional spec',
  requirementId: 'req-1',
  requirementCode: 'REQ_001',
  requirementTitle: 'Req title',
  deletedAt: '2026-07-09T00:00:00.000Z',
  deletedBy: 'attacker',
  isDeleted: true,
}, {
  actorUid: 'u2',
  actorName: 'Writer',
  requestId: 'fs-1',
});
assert.equal(created.projectId, 'P1');
assert.equal(created.status, 'draft');
assert.equal(created.priority, 'mid');
assert.equal(created.isDeleted, false);
assert.equal(created.deletedAt, null);
assert.equal(created.deletedBy, null);
assert.equal(created.version, 1);
assert.equal(created.requirementId, 'req-1');
assert.equal(created.requirementCode, 'REQ_001');
assert.deepEqual(authCalls.at(-1), ['functionalSpec.create', 'P1']);

const updated = await service.update('P1', 'FN-1', {
  title: 'Updated spec',
  id: 'MUST-NOT-CHANGE',
  projectId: 'OTHER',
}, {
  actorUid: 'u3',
});
assert.equal(updated.id, 'FN-1');
assert.equal(updated.projectId, 'P1');
assert.equal(updated.title, 'Updated spec');
assert.equal(updated.version, 3);
assert.equal(updated.updatedBy, 'u3');
assert.deepEqual(authCalls.at(-1), ['functionalSpec.update', 'P1']);

assert.equal(typeof service.delete, 'undefined');
assert.equal(typeof service.softDelete, 'undefined');
assert.equal(typeof service.remove, 'undefined');
assert.equal(typeof window.STAM.functionalSpecService.delete, 'undefined');
assert.equal(typeof window.STAM.functionalSpecService.softDelete, 'undefined');
assert.equal(typeof window.STAM.functionalSpecService.remove, 'undefined');

const defaultRuntimeService = window.STAM.functionalSpecService;
await assert.rejects(
  () => defaultRuntimeService.listByProject('P1', {}, { actorUid: 'u0' }),
  /permission denied/,
);
await assert.rejects(
  () => defaultRuntimeService.create('P1', { title: 'Blocked default' }, { actorUid: 'u0' }),
  /permission denied/,
);

const roleContract = window.STAM.functionalSpecServiceContract;
assert.equal(JSON.stringify(roleContract.WRITE_ROLES), JSON.stringify(['owner', 'admin', 'editor']));
assert.equal(JSON.stringify(roleContract.READ_ROLES), JSON.stringify(['owner', 'admin', 'editor', 'viewer']));
assert.equal(roleContract.canWriteFunctionalSpecs('editor'), true);
assert.equal(roleContract.canWriteFunctionalSpecs('viewer'), false);
assert.equal(roleContract.canReadFunctionalSpecs('viewer'), true);

const roleAuthorize = roleContract.createMemberRoleAuthorize((request) => request.context.memberRole);
assert.deepEqual(
  Object.keys(roleContract.ACTIONS).sort(),
  ['CREATE', 'READ', 'UPDATE'],
);
assert.equal('DELETE' in roleContract.ACTIONS, false);
assert.equal(roleAuthorize(roleContract.ACTIONS.CREATE, { context: { memberRole: 'admin' } }), true);
assert.equal(roleAuthorize(roleContract.ACTIONS.UPDATE, { context: { memberRole: 'viewer' } }), false);
assert.equal(roleAuthorize(roleContract.ACTIONS.READ, { context: { memberRole: 'viewer' } }), true);

const deniedService = window.STAM.functionalSpecServiceContract.createService({
  adapter,
  authorize: roleAuthorize,
});
await assert.rejects(
  () => deniedService.create('P1', { title: 'Blocked' }, { memberRole: 'viewer' }),
  /permission denied/,
);

const fakeFirestore = createFakeFirestore();
const firestoreAdapter = window.STAM.functionalSpecFirestoreAdapter.create({ firestore: fakeFirestore });
assert.equal(typeof firestoreAdapter.delete, 'undefined');
assert.equal(typeof firestoreAdapter.softDelete, 'undefined');
assert.equal(typeof firestoreAdapter.remove, 'undefined');
const adapterList = await firestoreAdapter.listByProject('P1', {});
assert.equal(adapterList.length, 1);
assert.equal(adapterList[0].id, 'FN-A');
assert.deepEqual(fakeFirestore.paths.at(-1), ['getCollection', 'projects/P1/functionalSpecifications']);

const adapterCreated = await firestoreAdapter.create('P1', {
  id: 'FN-C',
  title: 'Created',
  status: 'draft',
  priority: 'mid',
});
assert.equal(adapterCreated.projectId, 'P1');
assert.equal(adapterCreated.code, 'FN_001');
const setCall = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === 'projects/P1/functionalSpecifications/FN-C');
assert.ok(setCall, 'expected Firestore set on create');
assert.equal(setCall[2].code, 'FN_001', 'adapter must allocate FN_### on create when code omitted');
assert.ok(setCall[2].createdAt && setCall[2].updatedAt, 'expected server timestamps on create payload');
const counterSet = fakeFirestore.paths.find((entry) => entry[0] === 'set' && entry[1] === 'projects/P1/counters/functionalSpecifications');
assert.ok(counterSet, 'expected functionalSpecifications counter increment on create');
assert.equal(counterSet[2].lastNumber, 1);

const adapterCreatedWithCode = await firestoreAdapter.create('P1', {
  id: 'FN-D',
  code: 'FN_CUSTOM',
  title: 'Manual code',
  status: 'draft',
  priority: 'mid',
});
assert.equal(adapterCreatedWithCode.code, 'FN_CUSTOM');
assert.equal(
  fakeFirestore.paths.filter((entry) => entry[0] === 'set' && entry[1] === 'projects/P1/counters/functionalSpecifications').length,
  1,
  'counter must not increment when explicit code is provided',
);

console.log('functional spec service contract: PASS');
