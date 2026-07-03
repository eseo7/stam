import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);

async function loadBrowserScript(context, path) {
  const code = await readFile(new URL(path, ROOT), 'utf8');
  vm.runInContext(code, context, { filename: path });
}

function createContext() {
  const window = {};
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
    ['REQ-1', {
      id: 'REQ-1',
      projectId: 'P1',
      code: 'REQ-001',
      title: 'Existing requirement',
      description: 'Before',
      status: 'draft',
      priority: 'normal',
      ownerUid: 'u1',
      ownerName: 'Owner',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'u1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: 'u1',
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 2,
      sortOrder: 1,
      tags: ['old'],
      visibility: 'project',
      reviewStatus: 'Review Needed',
      approvalStatus: 'none',
    }],
  ]);

  return {
    calls: [],
    listByProject(projectId, query) {
      this.calls.push(['listByProject', projectId, query]);
      return Promise.resolve(Array.from(store.values()).filter((item) => item.projectId === projectId));
    },
    getById(projectId, requirementId) {
      this.calls.push(['getById', projectId, requirementId]);
      const item = store.get(requirementId);
      return Promise.resolve(item && item.projectId === projectId ? { ...item } : null);
    },
    create(projectId, requirement) {
      this.calls.push(['create', projectId, requirement]);
      const next = { ...requirement, id: requirement.id || 'REQ-NEW' };
      store.set(next.id, next);
      return Promise.resolve({ ...next });
    },
    update(projectId, requirementId, patch) {
      this.calls.push(['update', projectId, requirementId, patch]);
      const current = store.get(requirementId);
      const next = { ...current, ...patch };
      store.set(requirementId, next);
      return Promise.resolve({ ...next });
    },
    softDelete(projectId, requirementId, patch) {
      this.calls.push(['softDelete', projectId, requirementId, patch]);
      return this.update(projectId, requirementId, patch);
    },
  };
}

function createFakeFirestore() {
  const paths = [];
  const docs = [
    {
      id: 'REQ-A',
      exists: true,
      data: () => ({
        title: 'A',
        projectId: 'P1',
        priority: '높음',
        isDeleted: false,
        sortOrder: 2,
      }),
    },
    {
      id: 'REQ-B',
      exists: true,
      data: () => ({
        title: 'B',
        projectId: 'P1',
        isDeleted: true,
        sortOrder: 1,
      }),
    },
  ];

  function docRef(path) {
    return {
      collection(name) {
        return collectionRef([...path, name]);
      },
      get() {
        paths.push(['get', path.join('/')]);
        return Promise.resolve({
          id: path[path.length - 1],
          exists: true,
          data: () => ({
            id: path[path.length - 1],
            projectId: path[1],
            title: 'One',
            isDeleted: false,
          }),
        });
      },
      set(payload) {
        paths.push(['set', path.join('/'), payload]);
        return Promise.resolve();
      },
      update(payload) {
        paths.push(['update', path.join('/'), payload]);
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
    collection(name) {
      return collectionRef([name]);
    },
  };
}

const { context, window } = createContext();
await loadBrowserScript(context, 'stam/js/stam.requirements-firestore-adapter.js');
await loadBrowserScript(context, 'stam/js/stam.requirements-service.js');

assert.ok(window.STAM.requirementsFirestoreAdapter);
assert.ok(window.STAM.requirementsService);
assert.equal(window.STAM.requirementsService.ACTIONS.CREATE, 'requirement.create');
[
  'normalizeRequirement',
  'validateRequirementInput',
  'buildCreatePayload',
  'buildUpdatePatch',
].forEach((name) => {
  assert.equal(typeof window.STAM.requirementsService[name], 'function');
  assert.equal(typeof window.STAM.requirementsServiceContract[name], 'function');
});

const invalidCreate = window.STAM.requirementsServiceContract.validateRequirementInput({}, 'create');
assert.equal(invalidCreate.valid, false);
assert.equal(invalidCreate.errors[0].field, 'title');

const invalidUpdate = window.STAM.requirementsServiceContract.validateRequirementInput({ tags: 'bad' }, 'update');
assert.equal(invalidUpdate.valid, false);
assert.equal(invalidUpdate.errors[0].field, 'tags');

const unsupportedEnum = window.STAM.requirementsServiceContract.validateRequirementInput({ priority: 'highest' }, 'update');
assert.equal(unsupportedEnum.valid, true);
assert.equal(unsupportedEnum.errors.length, 0);

const authCalls = [];
const adapter = createFakeAdapter();
const service = window.STAM.requirementsServiceContract.createService({
  adapter,
  clock: () => '2026-07-03T00:00:00.000Z',
  authorize(action, request) {
    authCalls.push([action, request.projectId]);
    return true;
  },
});

const helperCreate = service.buildCreatePayload({
  projectId: 'P1',
  title: 'Helper create',
  status: 'active',
  priority: 'high',
  visibility: 'customer',
  reviewStatus: 'In Review',
  approvalStatus: 'pending',
  sortOrder: '3',
  tags: [' helper ', '', 'contract'],
}, {
  actorUid: 'helper-user',
  actorName: 'Helper User',
});
assert.equal(helperCreate.projectId, 'P1');
assert.equal(helperCreate.title, 'Helper create');
assert.equal(helperCreate.status, 'active');
assert.equal(helperCreate.priority, 'high');
assert.equal(helperCreate.visibility, 'customer');
assert.equal(helperCreate.reviewStatus, 'In Review');
assert.equal(helperCreate.approvalStatus, 'pending');
assert.equal(helperCreate.createdAt, '2026-07-03T00:00:00.000Z');
assert.equal(helperCreate.createdBy, 'helper-user');
assert.equal(helperCreate.updatedBy, 'helper-user');
assert.equal(helperCreate.sortOrder, 3);
assert.deepEqual(helperCreate.tags, ['helper', 'contract']);

const helperCreateDefaults = service.buildCreatePayload({
  projectId: 'P1',
  title: 'Helper create defaults',
  status: 'reviewing',
  priority: 'urgent',
  visibility: 'external',
}, {
  actorUid: 'helper-user',
});
assert.equal(helperCreateDefaults.status, 'draft');
assert.equal(helperCreateDefaults.priority, 'normal');
assert.equal(helperCreateDefaults.visibility, 'project');
assert.equal(helperCreateDefaults.reviewStatus, 'Review Needed');
assert.equal(helperCreateDefaults.approvalStatus, 'none');

const helperPatch = service.buildUpdatePatch({
  id: 'MUST-NOT-LEAK',
  projectId: 'MUST-NOT-LEAK',
  title: 'Helper patch',
  status: 'approved',
  priority: 'critical',
  visibility: 'private',
  sortOrder: '7',
  tags: ['next'],
}, {
  actorUid: 'patch-user',
});
assert.equal(helperPatch.id, undefined);
assert.equal(helperPatch.projectId, undefined);
assert.equal(helperPatch.title, 'Helper patch');
assert.equal(helperPatch.status, 'approved');
assert.equal(helperPatch.priority, 'critical');
assert.equal(helperPatch.visibility, 'private');
assert.equal(helperPatch.updatedAt, '2026-07-03T00:00:00.000Z');
assert.equal(helperPatch.updatedBy, 'patch-user');
assert.equal(helperPatch.sortOrder, 7);
assert.deepEqual(helperPatch.tags, ['next']);

const helperPatchDefaults = service.buildUpdatePatch({
  status: 'reviewing',
  priority: 'highest',
  visibility: 'weird',
}, {
  actorUid: 'patch-user',
});
assert.equal(helperPatchDefaults.status, 'draft');
assert.equal(helperPatchDefaults.priority, 'normal');
assert.equal(helperPatchDefaults.visibility, 'project');

const normalized = window.STAM.requirementsService.normalizeRequirement({
  id: 'REQ-N',
  projectId: 'P1',
  title: ' Normalized ',
  status: 'approved',
  priority: 'critical',
  visibility: 'internal',
  reviewStatus: 'Rejected',
  approvalStatus: 'rejected',
  tags: [' one ', ''],
  isDeleted: false,
});
assert.equal(normalized.title, 'Normalized');
assert.equal(normalized.status, 'approved');
assert.equal(normalized.priority, 'critical');
assert.equal(normalized.visibility, 'internal');
assert.equal(normalized.reviewStatus, 'Rejected');
assert.equal(normalized.approvalStatus, 'rejected');
assert.deepEqual(normalized.tags, ['one']);

const normalizedDefaults = window.STAM.requirementsService.normalizeRequirement({
  id: 'REQ-D',
  projectId: 'P1',
  title: 'Defaults',
  status: 'reviewing',
  priority: 'urgent',
  visibility: 'external',
});
assert.equal(normalizedDefaults.status, 'draft');
assert.equal(normalizedDefaults.priority, 'normal');
assert.equal(normalizedDefaults.visibility, 'project');
assert.equal(normalizedDefaults.reviewStatus, 'Review Needed');
assert.equal(normalizedDefaults.approvalStatus, 'none');

const list = await service.listByProject('P1', {}, { actorUid: 'u2' });
assert.equal(list.length, 1);
assert.deepEqual(authCalls.at(-1), ['requirement.read', 'P1']);
assert.equal(adapter.calls[0][2].includeDeleted, false);

const created = await service.create('P1', {
  code: 'REQ-NEW',
  title: 'New requirement',
  tags: [' alpha ', '', 'beta'],
}, {
  actorUid: 'u2',
  actorName: 'Writer',
  requestId: 'req-1',
});
assert.equal(created.projectId, 'P1');
assert.equal(created.status, 'draft');
assert.equal(created.priority, 'normal');
assert.equal(created.isDeleted, false);
assert.equal(created.version, 1);
assert.deepEqual(created.tags, ['alpha', 'beta']);
assert.deepEqual(authCalls.at(-1), ['requirement.create', 'P1']);

const updated = await service.update('P1', 'REQ-1', {
  title: 'Updated requirement',
  id: 'MUST-NOT-CHANGE',
  projectId: 'OTHER',
}, {
  actorUid: 'u3',
});
assert.equal(updated.id, 'REQ-1');
assert.equal(updated.projectId, 'P1');
assert.equal(updated.title, 'Updated requirement');
assert.equal(updated.version, 3);
assert.equal(updated.updatedBy, 'u3');
assert.deepEqual(authCalls.at(-1), ['requirement.update', 'P1']);

const deleted = await service.softDelete('P1', 'REQ-1', 'duplicate', {
  actorUid: 'u4',
});
assert.equal(deleted.isDeleted, true);
assert.equal(deleted.deletedAt, '2026-07-03T00:00:00.000Z');
assert.equal(deleted.deletedBy, 'u4');
assert.equal(deleted.version, 4);
assert.deepEqual(authCalls.at(-1), ['requirement.delete', 'P1']);

const audit = service.buildAuditEvent('update', { id: 'REQ-1', title: 'A', projectId: 'P1' }, { id: 'REQ-1', title: 'B', projectId: 'P1' }, {
  actorUid: 'u5',
  actorName: 'Auditor',
  requestId: 'req-2',
  source: 'test',
});
assert.equal(audit.actorUid, 'u5');
assert.equal(audit.targetType, 'Requirement');
assert.deepEqual(audit.changedFields, ['title']);
assert.equal(audit.requestId, 'req-2');
assert.equal(audit.source, 'test');

const fakeFirestore = createFakeFirestore();
const firestoreAdapter = window.STAM.requirementsFirestoreAdapter.create({ firestore: fakeFirestore });
const adapterList = await firestoreAdapter.listByProject('P1', {});
assert.equal(adapterList.length, 1);
assert.equal(adapterList[0].id, 'REQ-A');
assert.deepEqual(fakeFirestore.paths.at(-1), ['getCollection', 'projects/P1/requirements']);

const adapterCreated = await firestoreAdapter.create('P1', { id: 'REQ-C', title: 'Created' });
assert.equal(adapterCreated.projectId, 'P1');
assert.deepEqual(fakeFirestore.paths.at(-1)[0], 'set');
assert.equal(fakeFirestore.paths.at(-1)[1], 'projects/P1/requirements/REQ-C');

console.log('requirements service contract: PASS');
