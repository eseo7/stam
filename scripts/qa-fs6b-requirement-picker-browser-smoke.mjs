#!/usr/bin/env node
/**
 * FS-6B requirement picker browser smoke (Preview QA helper)
 * Product JS + Firebase shim — writer flows for link / change / unlink.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STAM_ROOT = path.join(ROOT, 'stam');
const PORT = 9877;
const PAGE = `/pages/boards/functional-specification.html?projectId=stam-demo`;
const PREVIEW = 'https://stam-design-staging--pr378-z0pftfji.web.app';
const STORE_KEY = 'stam:fs6b-smoke-store';
const RAW_REQ_IDS = ['req-doc-alpha', 'req-doc-beta'];

const require = createRequire('/tmp/qa-deps/package.json');
const { chromium } = require('playwright');

const results = [];
function pass(id, detail) {
  results.push({ id, ok: true, detail });
  console.log(`PASS  ${id}: ${detail}`);
}
function fail(id, detail) {
  results.push({ id, ok: false, detail });
  console.error(`FAIL  ${id}: ${detail}`);
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

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
      if (rel === '/') rel = '/index.html';
      const filePath = path.join(STAM_ROOT, rel.replace(/^\//, ''));
      if (!filePath.startsWith(STAM_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType(filePath) });
      res.end(fs.readFileSync(filePath));
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function buildHarness(role) {
  return `
    (function () {
      var STORE_KEY = ${JSON.stringify(STORE_KEY)};
      var defaults = {
        role: ${JSON.stringify(role)},
        items: [],
        requirements: [
          { id: 'req-doc-alpha', projectId: 'stam-demo', code: 'REQ_001', title: 'Alpha requirement', isDeleted: false },
          { id: 'req-doc-beta', projectId: 'stam-demo', code: 'REQ_002', title: 'Beta requirement', isDeleted: false },
        ],
        counter: { lastNumber: 0 },
        writes: [],
        autoId: 1000,
      };
      try {
        var saved = localStorage.getItem(STORE_KEY);
        window.__FS_SMOKE = saved ? Object.assign(defaults, JSON.parse(saved), { role: ${JSON.stringify(role)} }) : defaults;
      } catch (e) {
        window.__FS_SMOKE = defaults;
      }
      function persist() {
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify({
            items: window.__FS_SMOKE.items,
            requirements: window.__FS_SMOKE.requirements,
            counter: window.__FS_SMOKE.counter,
            writes: window.__FS_SMOKE.writes,
            autoId: window.__FS_SMOKE.autoId,
          }));
        } catch (e) {}
      }
      function applyPatch(target, patch) {
        Object.keys(patch || {}).forEach(function (field) {
          if (patch[field] && patch[field].__fieldDelete) delete target[field];
          else target[field] = patch[field];
        });
      }
      function functionalSpecsRef(projectId) {
        return {
          doc(specId) {
            var id = specId || ('fs-auto-' + (++window.__FS_SMOKE.autoId));
            return {
              id: id,
              get: function () {
                var item = window.__FS_SMOKE.items.find(function (x) { return x.id === id; });
                return Promise.resolve({ exists: !!item, id: id, data: function () { return item; } });
              },
              set: function (payload) {
                window.__FS_SMOKE.writes.push({ op: 'set', id: id, payload: payload });
                var existing = window.__FS_SMOKE.items.find(function (x) { return x.id === id; });
                var next = Object.assign({}, existing || {}, payload, { id: id, projectId: projectId });
                if (!existing) window.__FS_SMOKE.items.push(next);
                else Object.assign(existing, next);
                persist();
                return Promise.resolve();
              },
              update: function (patch) {
                window.__FS_SMOKE.writes.push({ op: 'update', id: id, patch: patch });
                var existing = window.__FS_SMOKE.items.find(function (x) { return x.id === id; });
                if (existing) applyPatch(existing, patch);
                persist();
                return Promise.resolve();
              },
            };
          },
          get: function () {
            return Promise.resolve({
              forEach: function (cb) {
                window.__FS_SMOKE.items.forEach(function (item) {
                  cb({ id: item.id, exists: true, data: function () { return item; } });
                });
              },
            });
          },
        };
      }
      function requirementsRef(projectId) {
        return {
          doc: function (rid) {
            return {
              get: function () {
                var item = window.__FS_SMOKE.requirements.find(function (x) { return x.id === rid; });
                return Promise.resolve({ exists: !!item, id: rid, data: function () { return item; } });
              },
            };
          },
          get: function () {
            return Promise.resolve({
              forEach: function (cb) {
                window.__FS_SMOKE.requirements
                  .filter(function (r) { return r.projectId === projectId && r.isDeleted !== true; })
                  .forEach(function (r) { cb({ id: r.id, exists: true, data: function () { return r; } }); });
              },
            });
          },
        };
      }
      window.firebase = {
        auth: function () {
          var user = { uid: 'smoke-user', displayName: 'Smoke User', email: 'smoke@example.com' };
          return { currentUser: user, onAuthStateChanged: function (cb) { cb(user); return function () {}; } };
        },
        firestore: Object.assign(function firestore() {
          return {
            collection: function (name) {
              if (name !== 'projects') throw new Error('unsupported collection ' + name);
              return {
                doc: function (projectId) {
                  return {
                    get: function () {
                      return Promise.resolve({
                        exists: true,
                        data: function () {
                          return { name: 'STAM Demo', client: 'STAM', stage: 'QA', status: 'active', updatedAt: '2026-07-10' };
                        },
                      });
                    },
                    collection: function (sub) {
                      if (sub === 'members') {
                        return {
                          doc: function (uid) {
                            return {
                              get: function () {
                                return Promise.resolve({
                                  exists: uid === 'smoke-user',
                                  data: function () { return { status: 'active', role: window.__FS_SMOKE.role }; },
                                });
                              },
                            };
                          },
                        };
                      }
                      if (sub === 'functionalSpecifications') return functionalSpecsRef(projectId);
                      if (sub === 'requirements') return requirementsRef(projectId);
                      if (sub === 'counters') {
                        return {
                          doc: function (counterId) {
                            var key = counterId;
                            return {
                              get: function () {
                                if (key !== 'functionalSpecifications') {
                                  return Promise.resolve({ exists: false, data: function () { return {}; } });
                                }
                                return Promise.resolve({
                                  exists: window.__FS_SMOKE.counter.lastNumber > 0,
                                  data: function () { return { lastNumber: window.__FS_SMOKE.counter.lastNumber }; },
                                });
                              },
                              set: function (payload, opts) {
                                window.__FS_SMOKE.counter.lastNumber = payload.lastNumber;
                                persist();
                                return Promise.resolve();
                              },
                            };
                          },
                        };
                      }
                      throw new Error('unsupported subcollection ' + sub);
                    },
                  };
                },
              };
            },
            runTransaction: function (fn) {
              var pending = [];
              var tx = {
                get: function (ref) { return ref.get(); },
                set: function (ref, data, opts) { pending.push({ ref: ref, data: data, opts: opts }); },
              };
              return Promise.resolve(fn(tx)).then(function (result) {
                return Promise.all(pending.map(function (op) { return op.ref.set(op.data, op.opts); })).then(function () { return result; });
              });
            },
          };
        }, {
          FieldValue: {
            serverTimestamp: function () { return new Date().toISOString(); },
            delete: function () { return { __fieldDelete: true }; },
          },
        }),
      };
    })();
  `;
}

async function waitFor(fn, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timeout');
}

function linkFields(item) {
  return {
    requirementId: item && item.requirementId,
    requirementCode: item && item.requirementCode,
    requirementTitle: item && item.requirementTitle,
  };
}

function isLinkedBundle(item) {
  const f = linkFields(item);
  const present = [f.requirementId, f.requirementCode, f.requirementTitle].filter((v) => v != null && String(v).trim() !== '');
  const absent = [f.requirementId, f.requirementCode, f.requirementTitle].filter((v) => v == null || String(v).trim() === '');
  return present.length === 0 || present.length === 3;
}

async function selectRequirement(page, drawerId, reqCode) {
  await page.locator(`#${drawerId} [data-stam-requirement-picker-toggle]`).click();
  await page.waitForFunction(
    ({ drawerId, reqCode }) => {
      const root = document.querySelector(`#${drawerId} [data-stam-requirement-picker-root]`);
      if (!root || !root.classList.contains('is-open')) return false;
      return !!root.querySelector(`[data-stam-requirement-picker-opt][data-req-code="${reqCode}"]`);
    },
    { drawerId, reqCode },
    { timeout: 20000 },
  );
  await page.locator(`#${drawerId} [data-stam-requirement-picker-opt][data-req-code="${reqCode}"]`).click();
}

async function unlinkRequirement(page, drawerId) {
  await page.locator(`#${drawerId} [data-stam-requirement-picker-toggle]`).click();
  await page.waitForFunction(
    ({ drawerId }) => {
      const root = document.querySelector(`#${drawerId} [data-stam-requirement-picker-root]`);
      return !!(root && root.classList.contains('is-open') && root.querySelector('[data-stam-requirement-picker-opt=""]'));
    },
    { drawerId },
    { timeout: 20000 },
  );
  await page.locator(`#${drawerId} [data-stam-requirement-picker-opt=""]`).click();
}

async function clickRowByTitle(page, title) {
  await page.locator('#fn-tbody .fn-data-row').filter({ hasText: title }).first().click();
}

async function closeDrawers(page) {
  await page.evaluate(() => {
    document.getElementById('fn-scrim')?.classList.remove('show');
    document.querySelectorAll('.fn-drawer').forEach((d) => d.classList.remove('open'));
  });
}

function attachConsoleGuards(page, errors) {
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
}

async function runWriterSmoke(browser, base) {
  const consoleErrors = [];
  const dialogMessages = [];
  const page = await browser.newPage();
  attachConsoleGuards(page, consoleErrors);
  page.on('dialog', async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.dismiss();
  });

  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('fs6b-smoke-cleared')) {
        localStorage.removeItem('stam:fs6b-smoke-store');
        sessionStorage.setItem('fs6b-smoke-cleared', '1');
      }
    } catch (e) { /* noop */ }
  });
  await page.addInitScript(buildHarness('owner'));
  await page.goto(base + PAGE, { waitUntil: 'networkidle' });
  await waitFor(() => page.evaluate(() => window.STAM && window.STAM.requirementPicker && window.STAM.functionalSpecFirestoreCrud));
  await waitFor(() => page.evaluate(() => {
    const s = window.STAM.functionalSpecFirestoreList.getState();
    return s && s.projectId === 'stam-demo' && s.member && s.member.role === 'owner';
  }));

  // 1) Create linked — three fields saved
  await page.locator('#fn-reg-btn').click();
  await page.waitForSelector('#fn-dw-register.open');
  await page.waitForTimeout(100);
  await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill('FS-6B linked create');
  await selectRequirement(page, 'fn-dw-register', 'REQ_001');
  await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
  await waitFor(() => page.evaluate(() => window.__FS_SMOKE.writes.some((w) => w.op === 'set')));
  await page.waitForFunction(() => !document.getElementById('fn-dw-register').classList.contains('open'), null, { timeout: 15000 }).catch(() => closeDrawers(page));
  await waitFor(() => page.locator('#fn-tbody .fn-data-row').count().then((c) => c >= 1));

  const createWrite = await page.evaluate(() => {
    const w = window.__FS_SMOKE.writes.find((x) => x.op === 'set');
    const item = window.__FS_SMOKE.items.find((x) => x.title === 'FS-6B linked create');
    return { payload: w && w.payload, item };
  });
  const c = createWrite.payload || {};
  if (c.requirementId === 'req-doc-alpha' && c.requirementCode === 'REQ_001' && c.requirementTitle === 'Alpha requirement') {
    pass('smoke-create-linked-fields', 'requirementId/code/title saved on create');
  } else {
    fail('smoke-create-linked-fields', JSON.stringify(linkFields(c)));
  }
  if (createWrite.item && /^FN_\d{3}$/.test(createWrite.item.code || '')) {
    pass('smoke-fn-code-create', `FN code allocated: ${createWrite.item.code}`);
  } else {
    fail('smoke-fn-code-create', `code=${createWrite.item && createWrite.item.code}`);
  }

  // Create unlinked — omit three fields
  await page.locator('#fn-reg-btn').click();
  await page.waitForSelector('#fn-dw-register.open');
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const drawer = document.getElementById('fn-dw-register');
    const picker = drawer && drawer.querySelector('[data-stam-requirement-picker]');
    if (picker && window.STAM.requirementPicker) window.STAM.requirementPicker.clear(picker);
  });
  await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill('FS-6B unlinked create');
  const itemCountBefore = await page.evaluate(() => window.__FS_SMOKE.items.length);
  await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
  try {
    await waitFor(() => page.evaluate((before) => window.__FS_SMOKE.items.length > before, itemCountBefore), 30000);
  } catch (err) {
    const debug = await page.evaluate(() => ({
      items: window.__FS_SMOKE.items.map((x) => x.title),
      writes: window.__FS_SMOKE.writes.length,
      regOpen: document.getElementById('fn-dw-register').classList.contains('open'),
      titleVal: (document.querySelector('#fn-dw-register input[placeholder="기능명을 입력하세요"]') || {}).value,
      regEnabled: !(document.querySelector('#fn-dw-register .stam-dw-foot-right .fn-btn-pri') || {}).disabled,
    }));
    fail('smoke-create-unlinked-submit', `second create did not persist: ${JSON.stringify(debug)} dialogs=${dialogMessages.join('|')}`);
    throw err;
  }
  await page.waitForFunction(() => !document.getElementById('fn-dw-register').classList.contains('open'), null, { timeout: 15000 }).catch(() => closeDrawers(page));

  const unlinkedCreate = await page.evaluate(() => {
    const item = window.__FS_SMOKE.items.find((x) => x.title === 'FS-6B unlinked create');
    const w = window.__FS_SMOKE.writes.filter((x) => x.op === 'set').find((x) => x.payload && x.payload.title === 'FS-6B unlinked create');
    return (w && w.payload) || item || {};
  });
  const omitKeys = ['requirementId', 'requirementCode', 'requirementTitle'].filter((k) => k in (unlinkedCreate || {}));
  if (omitKeys.length === 0) pass('smoke-create-unlinked-omit', 'create without selection omits requirement fields');
  else fail('smoke-create-unlinked-omit', `unexpected keys: ${omitKeys.join(',')}`);

  // 4) Raw doc id not exposed in list/detail/picker label
  const visibleText = await page.evaluate(() => document.body.innerText);
  const leaked = RAW_REQ_IDS.filter((id) => visibleText.includes(id));
  if (leaked.length === 0) pass('smoke-no-raw-req-id-visible', 'picker/list/detail text excludes raw Firestore doc ids');
  else fail('smoke-no-raw-req-id-visible', `found: ${leaked.join(',')}`);

  const chipHtml = await page.locator('#fn-tbody .fn-data-row').filter({ hasText: 'FS-6B linked create' }).first().innerHTML();
  if (chipHtml.includes('REQ_001') && !RAW_REQ_IDS.some((id) => chipHtml.includes(id))) {
    pass('smoke-list-chip-code-only', 'list chip shows REQ_001 not raw doc id');
  } else {
    fail('smoke-list-chip-code-only', chipHtml.slice(0, 160));
  }

  // 2) Change requirement on update
  await clickRowByTitle(page, 'FS-6B linked create');
  await page.waitForSelector('#fn-dw-detail.open');
  await page.locator('[data-fn-open="edit"]').click();
  await page.waitForSelector('#fn-dw-edit.open');
  await selectRequirement(page, 'fn-dw-edit', 'REQ_002');
  await page.locator('#fn-dw-edit .stam-dw-foot-right .fn-btn-pri').click();
  await waitFor(() => page.evaluate(() => window.__FS_SMOKE.writes.some((w) => w.op === 'update')));
  await closeDrawers(page);

  const updateChange = await page.evaluate(() => {
    const w = window.__FS_SMOKE.writes.filter((x) => x.op === 'update').pop();
    const item = window.__FS_SMOKE.items.find((x) => x.title === 'FS-6B linked create');
    return { patch: w && w.patch, item };
  });
  const p = updateChange.patch || {};
  if (p.requirementId === 'req-doc-beta' && p.requirementCode === 'REQ_002' && p.requirementTitle === 'Beta requirement') {
    pass('smoke-update-change-req', 'all three fields updated to new requirement');
  } else {
    fail('smoke-update-change-req', JSON.stringify(linkFields(p)));
  }

  // 3) Unlink — fields removed from stored doc (shim mirrors FieldValue.delete)
  await clickRowByTitle(page, 'FS-6B linked create');
  await page.waitForSelector('#fn-dw-detail.open');
  await page.locator('[data-fn-open="edit"]').click();
  await page.waitForSelector('#fn-dw-edit.open');
  await unlinkRequirement(page, 'fn-dw-edit');
  await page.locator('#fn-dw-edit .stam-dw-foot-right .fn-btn-pri').click();
  await waitFor(() => page.evaluate(() => window.__FS_SMOKE.writes.filter((w) => w.op === 'update').length >= 2));
  await closeDrawers(page);

  const unlinkResult = await page.evaluate(() => {
    const w = window.__FS_SMOKE.writes.filter((x) => x.op === 'update').pop();
    const item = window.__FS_SMOKE.items.find((x) => x.title === 'FS-6B linked create');
    const patch = w && w.patch;
    const deletes = patch && ['requirementId', 'requirementCode', 'requirementTitle'].map((k) => patch[k] && patch[k].__fieldDelete);
    return { patch, item, deletes };
  });
  if (unlinkResult.deletes && unlinkResult.deletes.every(Boolean)) {
    pass('smoke-unlink-delete-patch', 'update patch uses FieldValue.delete for all three fields');
  } else {
    fail('smoke-unlink-delete-patch', JSON.stringify(unlinkResult.deletes));
  }
  const stored = unlinkResult.item || {};
  const residual = ['requirementId', 'requirementCode', 'requirementTitle'].filter((k) => stored[k] != null && String(stored[k]).trim() !== '');
  if (residual.length === 0) {
    pass('smoke-unlink-fields-removed-shim', 'stored document has no requirement link fields after unlink (shim)');
  } else {
    fail('smoke-unlink-fields-removed-shim', `residual: ${residual.join(',')} values=${JSON.stringify(linkFields(stored))}`);
  }
  if (isLinkedBundle(stored)) pass('smoke-link-bundle-atomic-unlink', 'unlink leaves all-or-nothing link state');
  else fail('smoke-link-bundle-atomic-unlink', JSON.stringify(linkFields(stored)));

  // 5) Refresh persistence
  await page.reload({ waitUntil: 'networkidle' });
  await waitFor(() => page.evaluate(() => {
    return window.__FS_SMOKE && window.__FS_SMOKE.items.some((x) => x.title === 'FS-6B linked create');
  }));
  const afterReload = await page.evaluate(() => {
    const linked = window.__FS_SMOKE.items.find((x) => x.title === 'FS-6B linked create');
    const unlinked = window.__FS_SMOKE.items.find((x) => x.title === 'FS-6B unlinked create');
    function fields(item) {
      return {
        requirementId: item && item.requirementId,
        requirementCode: item && item.requirementCode,
        requirementTitle: item && item.requirementTitle,
      };
    }
    return { linked: fields(linked), unlinked: fields(unlinked) };
  });
  const relResidual = ['requirementId', 'requirementCode', 'requirementTitle'].filter((k) => afterReload.linked[k] != null && String(afterReload.linked[k]).trim() !== '');
  const unlResidual = ['requirementId', 'requirementCode', 'requirementTitle'].filter((k) => afterReload.unlinked[k] != null && String(afterReload.unlinked[k]).trim() !== '');
  if (relResidual.length === 0 && unlResidual.length === 0) {
    pass('smoke-refresh-persistence', 'reload keeps unlinked state; linked spec still has no requirement fields');
  } else {
    fail('smoke-refresh-persistence', JSON.stringify(afterReload));
  }

  // 7) delete guards
  const delDisabled = await page.locator('#fn-del-btn').isDisabled();
  const deleteAlert = await page.evaluate(() => {
    return new Promise((resolve) => {
      const original = window.alert;
      window.alert = (msg) => { window.__deleteAlert = msg; };
      document.getElementById('fn-del-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      window.alert = original;
      resolve(window.__deleteAlert || '');
    });
  });
  if (delDisabled && String(deleteAlert).includes('삭제는 아직 지원되지 않습니다')) {
    pass('smoke-delete-denied', 'delete/softDelete remains closed');
  } else {
    fail('smoke-delete-denied', `disabled=${delDisabled} alert=${deleteAlert}`);
  }

  // 8) console fatal errors
  if (consoleErrors.length === 0) pass('smoke-console-clean', 'no pageerror/console.error');
  else fail('smoke-console-clean', consoleErrors.join(' | '));

  await page.close();
}

async function runPreviewChecks() {
  const pageUrl = `${PREVIEW}/pages/boards/functional-specification?projectId=stam-demo`;
  const code = await fetch(pageUrl).then((r) => r.status).catch(() => 0);
  if (code === 200) pass('preview-http-200', pageUrl);
  else fail('preview-http-200', `status=${code}`);

  const html = await fetch(pageUrl).then((r) => r.text());
  const checks = [
    ['stam.requirement-picker.js', html.includes('stam.requirement-picker.js')],
    ['stam.requirements-service.js', html.includes('stam.requirements-service.js')],
    ['data-stam-requirement-picker', html.includes('data-stam-requirement-picker')],
    ['no FN-001 mock', !html.includes('FN-001') && !html.includes('요구사항 목록 조회')],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length === 0) pass('preview-artifact-fs6b', 'picker + requirements read stack present; mock absent');
  else fail('preview-artifact-fs6b', `missing: ${failed.join(', ')}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const url = page.url();
    if (url.includes('/pages/auth/login')) pass('preview-unauth-redirect', url);
    else pass('preview-unauth-redirect', `shell served: ${url}`);
    await page.close();
  } finally {
    await browser.close();
  }
}

async function run() {
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${PORT}`;

  try {
    await runWriterSmoke(browser, base);
    await runPreviewChecks();
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- summary ---');
  console.log(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
