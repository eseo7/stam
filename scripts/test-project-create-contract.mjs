import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUTH_PAGES_DIR = path.join(ROOT, 'stam/pages/auth');

const projectListSource = await readFile(path.join(ROOT, 'stam/js/stam.auth-project-list.js'), 'utf8');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');
const projectsHtml = await readFile(path.join(AUTH_PAGES_DIR, 'projects.html'), 'utf8');
const noProjectHtml = await readFile(path.join(AUTH_PAGES_DIR, 'no-project.html'), 'utf8');

assert.match(projectListSource, /createProjectWithOwner/);
assert.match(projectListSource, /batch\.set\(/);
assert.match(projectListSource, /role: 'owner'/);
assert.match(projectListSource, /status: 'active'/);
assert.match(projectListSource, /ownerUid: user\.uid/);
assert.match(projectListSource, /sessionStorage\.setItem\('stam:selectedProjectId'/);
assert.match(projectListSource, /project-overview\.html\?projectId=/);
assert.equal(/requirementsService\.(create|update|softDelete)/.test(projectListSource), false);
assert.equal(/\.collection\('requirements'\)/.test(projectListSource), false);

assert.match(rulesSource, /isValidProjectCreate\(projectId\)/);
assert.match(rulesSource, /isValidOwnerMemberCreate\(projectId, memberUid\)/);
assert.match(rulesSource, /allow create: if isValidProjectCreate\(projectId\)/);
assert.match(rulesSource, /allow create: if isValidOwnerMemberCreate\(projectId, memberUid\)/);
assert.match(rulesSource, /match \/requirements\/\{requirementId\}[\s\S]*allow create, update, delete: if false;/);

assert.match(projectsHtml, /data-stam-project-create-show/);
assert.match(projectsHtml, /data-stam-project-create-name/);
assert.match(projectsHtml, /data-stam-project-create-submit/);
assert.match(projectsHtml, /새 프로젝트 만들기/);
assert.match(projectsHtml, /stam\.form-controls\.css/);

assert.match(noProjectHtml, /data-stam-project-create-root/);
assert.match(noProjectHtml, /data-stam-project-create-submit/);
assert.match(noProjectHtml, /stam\.auth-project-list\.js/);
assert.match(noProjectHtml, /stam\.form-controls\.css/);

function createProjectListApi() {
  const batchWrites = [];
  const context = vm.createContext({
    window: { STAM: {} },
    document: {
      readyState: 'complete',
      addEventListener() {},
      body: { getAttribute: () => '' },
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    firebase: {
      apps: [{}],
      firestore: null,
    },
    sessionStorage: {
      setItem() {},
    },
  });

  const firestoreApi = {
    collection(name) {
      assert.equal(name, 'projects');
      return {
        doc(id) {
          const docId = id || 'auto-project-id';
          return {
            id: docId,
            collection(sub) {
              assert.equal(sub, 'members');
              return {
                doc(memberId) {
                  return { path: `projects/${docId}/members/${memberId}` };
                },
              };
            },
            path: `projects/${docId}`,
          };
        },
      };
    },
    batch() {
      return {
        set(ref, data) {
          batchWrites.push({ path: ref.path, data: data });
        },
        commit() {
          return Promise.resolve();
        },
      };
    },
  };

  const firestoreFn = () => firestoreApi;
  firestoreFn.FieldValue = {
    serverTimestamp: () => ({ __ts: true }),
  };
  context.firebase.firestore = firestoreFn;
  vm.runInContext(projectListSource, context, { filename: 'stam.auth-project-list.js' });
  return { api: context.window.STAM.authProjectList, batchWrites };
}

const { api, batchWrites } = createProjectListApi();

assert.equal(api.validateProjectName('  ').ok, false);
assert.equal(api.validateProjectName('A').ok, false);
assert.equal(api.validateProjectName('AB').ok, true);
assert.equal(api.validateProjectName('x'.repeat(61)).ok, false);
assert.match(api.buildTenantId('abcdefghijklmnop'), /^personal-abcdefgh$/);

const created = await api.createProjectWithOwner({
  uid: 'user-abc-123',
  email: 'Creator@Example.com',
  displayName: 'Creator',
}, '  My Project  ');

assert.equal(created.projectId, 'auto-project-id');
assert.equal(created.projectName, 'My Project');
assert.equal(batchWrites.length, 2);

const projectWrite = batchWrites.find((row) => row.path === 'projects/auto-project-id');
const memberWrite = batchWrites.find((row) => row.path === 'projects/auto-project-id/members/user-abc-123');
assert.ok(projectWrite);
assert.ok(memberWrite);
assert.equal(projectWrite.data.projectName, 'My Project');
assert.equal(projectWrite.data.ownerUid, 'user-abc-123');
assert.equal(projectWrite.data.ownerEmail, 'Creator@Example.com');
assert.equal(memberWrite.data.role, 'owner');
assert.equal(memberWrite.data.status, 'active');
assert.equal(memberWrite.data.emailNormalized, 'creator@example.com');

console.log('project create contract: PASS');
