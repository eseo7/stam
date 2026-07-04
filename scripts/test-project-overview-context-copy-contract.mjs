import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(ROOT, 'stam/js/stam.project-overview-context.js');
const source = await readFile(sourcePath, 'utf8');

assert.equal(/\balert\s*\(/.test(source), false, 'alert() must not be used');
assert.equal(/window\.alert/.test(source), false, 'window.alert must not be used');
assert.equal(/confirm\s*\(/.test(source), false, 'confirm() must not be used');

const userPhrases = [
  'Firebase를',
  'Firebase ',
  'Firestore',
  'SDK',
  'Hosting 환경',
  'collection',
  'document',
  'memberRef',
  'projectRef',
];

const userStrings = source.match(/'[^']{6,}'/g) || [];
const userFacing = userStrings.filter((s) =>
  /프로젝트|로그인|불러|시도|준비/.test(s)
).map((s) => s.slice(1, -1));

for (const phrase of userPhrases) {
  const hit = userFacing.find((text) => text.includes(phrase));
  assert.equal(hit, undefined, `user-facing copy contains forbidden phrase: ${phrase}`);
}

assert.match(source, /ROUTES\.login/);
assert.match(source, /ROUTES\.accessDenied/);
assert.match(source, /ROUTES\.projects/);
assert.match(source, /redirect\(ROUTES\.login\)/);
assert.match(source, /redirect\(ROUTES\.accessDenied\)/);
assert.match(source, /redirect\(ROUTES\.projects\)/);
assert.match(source, /function verifyProjectAccess/);
assert.match(source, /\.get\(\)/);
assert.match(source, /document\.body\.hidden = false/);
assert.equal(
  /db\.collection[\s\S]*\.set\(|\.update\(|\.add\(|\.delete\(/.test(source),
  false,
  'Firestore write calls must not be present'
);

const guardDiff = execSync('git diff --name-only HEAD -- stam/js/stam.project-context-guard.js', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
assert.equal(guardDiff, '', 'stam/js/stam.project-context-guard.js must not be modified');

const gateDiff = execSync('git diff --name-only HEAD -- stam/js/stam.auth-membership-gate.js', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
assert.equal(gateDiff, '', 'stam/js/stam.auth-membership-gate.js must not be modified');

const navDataDiff = execSync('git diff --name-only HEAD -- stam/js/stam.nav-data.js', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
assert.equal(navDataDiff, '', 'stam/js/stam.nav-data.js must not be modified');

function createSessionStorage(storage) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
  };
}

function createFirestoreMock(scenario) {
  scenario = scenario || {};
  function docSnap(exists, data) {
    return {
      exists,
      data() {
        return data || {};
      },
    };
  }

  return {
    collection(name) {
      return {
        doc(id) {
          return {
            collection(sub) {
              return {
                doc(uid) {
                  return {
                    get() {
                      if (scenario.memberMissing) {
                        return Promise.resolve(docSnap(false));
                      }
                      if (scenario.inactive) {
                        return Promise.resolve(docSnap(true, { status: 'inactive', role: 'viewer' }));
                      }
                      return Promise.resolve(docSnap(true, { status: 'active', role: 'editor' }));
                    },
                  };
                },
              };
            },
            get() {
              if (scenario.projectMissing) {
                return Promise.resolve(docSnap(false));
              }
              return Promise.resolve(
                docSnap(true, {
                  name: 'Demo Project',
                  status: 'active',
                })
              );
            },
          };
        },
      };
    },
  };
}

function createFirebaseMock(options) {
  options = options || {};
  const user = Object.prototype.hasOwnProperty.call(options, 'user') ? options.user : { uid: 'u322' };
  return {
    apps: [{}],
    auth() {
      return {
        onAuthStateChanged(callback) {
          callback(user);
        },
      };
    },
    firestore() {
      return createFirestoreMock(options.firestore);
    },
  };
}

function bootContext(options) {
  options = options || {};
  const storage = Object.assign({}, options.storage || {});
  const redirects = [];
  const revealLog = [];

  const location = {
    pathname: '/pages/dashboard/project-overview.html',
    search: options.search || '',
    replace(path) {
      redirects.push(path);
    },
  };

  const sessionStorage = createSessionStorage(storage);

  const stamApi = {
    projectContextRender: { init() {} },
    topbarRender: { init() {} },
    navRender: { init() {} },
  };

  const context = vm.createContext({
    sessionStorage,
    STAM: stamApi,
    window: {
      location,
      sessionStorage,
      STAM: stamApi,
    },
    document: {
      title: '',
      hidden: true,
      body: {
        hidden: true,
        set hidden(value) {
          this._hidden = value;
          revealLog.push(value);
        },
        get hidden() {
          return this._hidden;
        },
      },
      querySelector() {
        return { setAttribute() {} };
      },
      addEventListener(event, fn) {
        if (event === 'DOMContentLoaded') fn();
      },
    },
    URLSearchParams,
    Promise,
    String,
    Object,
    Error,
  });

  context.window.document = context.document;
  context.window.window = context.window;

  if (Object.prototype.hasOwnProperty.call(options, 'firebase')) {
    if (options.firebase != null) {
      context.firebase = options.firebase;
      context.window.firebase = options.firebase;
    }
  }

  vm.runInContext(source, context, { filename: 'stam.project-overview-context.js' });
  return { context, redirects, storage, revealLog };
}

async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

const missingProjectId = bootContext({ search: '' });
assert.equal(missingProjectId.redirects[0], '/pages/auth/projects.html');

const noBackend = bootContext({
  search: '?projectId=P322',
  firebase: null,
});
assert.equal(noBackend.redirects[0], '/pages/auth/projects.html');
assert.match(noBackend.storage['stam:entryNotice'] || '', /준비가 되지 않았습니다/);

const notLoggedIn = bootContext({
  search: '?projectId=P322',
  firebase: createFirebaseMock({ user: null }),
});
assert.equal(notLoggedIn.redirects[0], '/pages/auth/login.html');

const noMember = bootContext({
  search: '?projectId=P322',
  firebase: createFirebaseMock({ firestore: { memberMissing: true } }),
});
await flushAsync();
assert.equal(noMember.redirects[0], '/pages/auth/access-denied.html');

const inactiveMember = bootContext({
  search: '?projectId=P322',
  firebase: createFirebaseMock({ firestore: { inactive: true } }),
});
await flushAsync();
assert.equal(inactiveMember.redirects[0], '/pages/auth/access-denied.html');

const missingProjectDoc = bootContext({
  search: '?projectId=P322',
  firebase: createFirebaseMock({ firestore: { projectMissing: true } }),
});
await flushAsync();
assert.equal(missingProjectDoc.redirects[0], '/pages/auth/projects.html');

const success = bootContext({
  search: '?projectId=P322',
  firebase: createFirebaseMock(),
});
await flushAsync();
assert.equal(success.redirects.length, 0);
assert.equal(success.revealLog.includes(false), true);
assert.equal(success.storage['stam:selectedProjectId'], 'P322');

console.log('project overview context copy contract: PASS');
