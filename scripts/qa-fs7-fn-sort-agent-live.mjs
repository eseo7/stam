#!/usr/bin/env node
/**
 * FS-7 PR #381 — Agent live FN sort verification (L-01 reproduction)
 *
 * Simulates:
 * 1. FN_001 register (T1)
 * 2. FN_002 register (T2 > T1)
 * 3. FN_001 update (updatedAt T3 > T2, createdAt unchanged)
 * 4. load x3 + search clear — order FN_002, FN_001 stable
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STAM_ROOT = path.join(ROOT, 'stam');
const PORT = 9881;
const require = createRequire('/tmp/qa-deps/package.json');
const { chromium } = require('playwright');

const T1 = '2026-07-01T10:00:00.000Z';
const T2 = '2026-07-02T10:00:00.000Z';
const T3 = '2026-07-03T15:00:00.000Z';

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      let rel = decodeURIComponent(url.pathname);
      if (rel.startsWith('/__/firebase/')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('// firebase shim\n');
        return;
      }
      const filePath = path.join(STAM_ROOT, rel.replace(/^\//, ''));
      if (!filePath.startsWith(STAM_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200);
      res.end(fs.readFileSync(filePath));
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function rowIds(page) {
  return page.$$eval('#fn-tbody .fn-data-row', (rows) =>
    rows.map((row) => row.getAttribute('data-fn-id')),
  );
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

await page.addInitScript(({ T1, T2, T3 }) => {
  const store = new Map();
  let auto = 0;

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  window.__FN_SORT_LIVE = {
    store,
    events: [],
    record(event, payload) {
      this.events.push({ event, payload: clone(payload || {}) });
    },
  };

  window.firebase = {
    auth() {
      const user = { uid: 'agent-live', displayName: 'Agent Live', email: 'agent@example.com' };
      return { currentUser: user, onAuthStateChanged(cb) { cb(user); return () => {}; } };
    },
    firestore: Object.assign(function firestore() {
      return {
        collection(name) {
          return {
            doc(projectId) {
              return {
                collection(sub) {
                  if (sub === 'members') {
                    return {
                      doc(uid) {
                        return {
                          get: async () => ({
                            exists: true,
                            data: () => ({ status: 'active', role: 'editor' }),
                          }),
                        };
                      },
                    };
                  }
                  if (sub === 'functionalSpecifications') {
                    return {
                      doc(id) {
                        const docId = id || 'fn-auto-' + (++auto);
                        return {
                          id: docId,
                          get: async () => {
                            const data = store.get(docId);
                            return {
                              exists: !!data,
                              id: docId,
                              data: () => clone(data),
                            };
                          },
                          set: async (payload) => {
                            store.set(docId, Object.assign({ id: docId, projectId }, clone(payload)));
                            window.__FN_SORT_LIVE.record('set', store.get(docId));
                          },
                          update: async (patch) => {
                            const cur = store.get(docId) || { id: docId };
                            const next = Object.assign({}, cur, clone(patch));
                            if (patch && patch.createdAt === undefined) delete next.createdAt;
                            store.set(docId, next);
                            window.__FN_SORT_LIVE.record('update', { id: docId, patch: clone(patch), after: clone(next) });
                          },
                        };
                      },
                      get: async () => ({
                        forEach(cb) {
                          store.forEach((data, id) => {
                            cb({
                              id,
                              exists: true,
                              data: () => clone(data),
                            });
                          });
                        },
                      }),
                    };
                  }
                  return { doc() { return { get: async () => ({ exists: false }) }; }, get: async () => ({ forEach() {} }) };
                },
                get: async () => ({
                  exists: true,
                  data: () => ({
                    name: 'Agent Live Project',
                    client: 'QA',
                    stage: 'QA',
                    status: 'active',
                  }),
                }),
              };
            },
          };
        },
        runTransaction(fn) {
          return fn({
            get: async () => ({ exists: false }),
            set(ref, payload) {
              return ref.set(payload);
            },
          });
        },
      };
    }, {
      FieldValue: {
        serverTimestamp() {
          return { __serverTimestamp: true, toDate() { return new Date(); }, toMillis() { return Date.now(); } };
        },
        delete() { return { __fieldDelete: true }; },
      },
    }),
  };

  window.__FN_SORT_SEED = { T1, T2, T3 };
}, { T1, T2, T3 });

await page.goto(`http://127.0.0.1:${PORT}/pages/boards/functional-specification.html?projectId=stam-demo`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForTimeout(2000);

await page.evaluate(async ({ T1, T2, T3 }) => {
  const store = window.__FN_SORT_LIVE.store;
  store.set('fn-001', {
    id: 'fn-001',
    projectId: 'stam-demo',
    code: 'FN_001',
    title: 'First registration',
    createdAt: T1,
    updatedAt: T1,
    status: 'draft',
    priority: 'mid',
    functionType: 'view',
    isDeleted: false,
  });
  window.__FN_SORT_LIVE.record('seed-fn-001', store.get('fn-001'));
  await window.STAM.functionalSpecFirestoreList.load();
  store.set('fn-002', {
    id: 'fn-002',
    projectId: 'stam-demo',
    code: 'FN_002',
    title: 'Second registration',
    createdAt: T2,
    updatedAt: T2,
    status: 'draft',
    priority: 'mid',
    functionType: 'view',
    isDeleted: false,
  });
  window.__FN_SORT_LIVE.record('seed-fn-002', store.get('fn-002'));
  await window.STAM.functionalSpecFirestoreList.load();
  const fn001 = store.get('fn-001');
  fn001.title = 'First registration edited';
  fn001.updatedAt = T3;
  store.set('fn-001', fn001);
  window.__FN_SORT_LIVE.record('edit-fn-001', JSON.parse(JSON.stringify(fn001)));
  await window.STAM.functionalSpecFirestoreList.load();
}, { T1, T2, T3 });

const afterEdit = await rowIds(page);
assert.deepEqual(afterEdit, ['fn-002', 'fn-001'], 'after FN_001 edit load');

for (let i = 0; i < 3; i += 1) {
  await page.evaluate(() => window.STAM.functionalSpecFirestoreList.load());
  await page.waitForTimeout(200);
  const ids = await rowIds(page);
  assert.deepEqual(ids, ['fn-002', 'fn-001'], 'refresh repeat ' + i);
}

const search = await page.$('#fn-search-input');
if (search) {
  await search.fill('FN_001');
  await page.waitForTimeout(100);
  await search.fill('');
  await page.waitForTimeout(100);
  assert.deepEqual(await rowIds(page), ['fn-002', 'fn-001'], 'after search clear');
}

const evidence = await page.evaluate(() => {
  const events = window.__FN_SORT_LIVE.events;
  const fn001 = window.__FN_SORT_LIVE.store.get('fn-001');
  const fn002 = window.__FN_SORT_LIVE.store.get('fn-002');
  const updates = events.filter((e) => e.event === 'update');
  return {
    fn001CreatedAt: fn001 && fn001.createdAt,
    fn001UpdatedAt: fn001 && fn001.updatedAt,
    fn002CreatedAt: fn002 && fn002.createdAt,
    updatePatches: updates.map((e) => e.payload.patch),
    renderOrder: events.filter((e) => e.event === 'render-order').map((e) => e.payload),
  };
});

assert.equal(evidence.fn001CreatedAt, T1, 'FN_001 createdAt unchanged after edit');
assert.equal(evidence.fn001UpdatedAt, T3);
assert.equal(evidence.fn002CreatedAt, T2);
evidence.updatePatches.forEach((patch) => {
  assert.equal('createdAt' in (patch || {}), false);
});

const fatalErrors = pageErrors.filter((msg) => !/permission denied/i.test(msg));
assert.equal(fatalErrors.length, 0, fatalErrors.join(' | '));

await browser.close();
server.close();

console.log('qa-fs7-fn-sort-agent-live: PASS');
console.log(JSON.stringify({
  previewUrl: `http://127.0.0.1:${PORT}/pages/boards/functional-specification.html?projectId=stam-demo`,
  createdAt: {
    fn001Before: T1,
    fn001After: evidence.fn001CreatedAt,
    fn002: evidence.fn002CreatedAt,
  },
  updatedAtAfterEdit: evidence.fn001UpdatedAt,
  finalRowOrder: ['fn-002', 'fn-001'],
}, null, 2));
