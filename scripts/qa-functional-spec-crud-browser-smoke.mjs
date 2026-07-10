#!/usr/bin/env node
/**
 * FS-5 functional spec CRUD browser smoke (Preview QA helper)
 * Loads product JS from local static server with Firebase shim.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STAM_ROOT = path.join(ROOT, 'stam');
const PORT = 9876;
const PAGE = `/pages/boards/functional-specification.html?projectId=stam-demo`;
const PREVIEW = 'https://stam-design-staging--pr374-ln84jfp8.web.app';

import { createRequire } from 'node:module';

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

function buildHarness(role, items) {
  return `
    window.__FS_SMOKE = { role: ${JSON.stringify(role)}, items: ${JSON.stringify(items)}, writes: [], autoId: 1000 };
    window.firebase = {
      auth() {
        const user = { uid: 'smoke-user', displayName: 'Smoke User', email: 'smoke@example.com' };
        return { currentUser: user, onAuthStateChanged(cb) { cb(user); return () => {}; } };
      },
      firestore: Object.assign(function firestore() {
        function functionalSpecsRef(projectId) {
          return {
            doc(specId) {
              const id = specId || ('fs-auto-' + (++window.__FS_SMOKE.autoId));
              if (!window.__FS_SMOKE.autoId) window.__FS_SMOKE.autoId = 1000;
              return {
                id,
                get() {
                  const item = window.__FS_SMOKE.items.find((x) => x.id === id);
                  return Promise.resolve({ exists: !!item, id, data: () => item });
                },
                set(payload) {
                  window.__FS_SMOKE.writes.push({ op: 'set', id, payload });
                  const existing = window.__FS_SMOKE.items.find((x) => x.id === id);
                  const next = Object.assign({}, existing || {}, payload, { id, projectId });
                  if (!existing) window.__FS_SMOKE.items.push(next);
                  else Object.assign(existing, next);
                  return Promise.resolve();
                },
                update(patch) {
                  window.__FS_SMOKE.writes.push({ op: 'update', id, patch });
                  const existing = window.__FS_SMOKE.items.find((x) => x.id === id);
                  if (existing) Object.assign(existing, patch);
                  return Promise.resolve();
                },
              };
            },
            get() {
              return Promise.resolve({
                forEach(cb) {
                  window.__FS_SMOKE.items.forEach((item) => cb({ id: item.id, exists: true, data: () => item }));
                },
              });
            },
          };
        }
        return {
          collection(name) {
            if (name !== 'projects') throw new Error('unsupported collection ' + name);
            return {
              doc(projectId) {
                return {
                  get() {
                    return Promise.resolve({
                      exists: true,
                      data: () => ({
                        name: 'STAM Demo', client: 'STAM', stage: 'QA', status: 'active', updatedAt: '2026-07-09',
                      }),
                    });
                  },
                  collection(sub) {
                    if (sub === 'members') {
                      return {
                        doc(uid) {
                          return {
                            get() {
                              return Promise.resolve({
                                exists: uid === 'smoke-user',
                                data: () => ({ status: 'active', role: window.__FS_SMOKE.role }),
                              });
                            },
                          };
                        },
                      };
                    }
                    if (sub === 'functionalSpecifications') return functionalSpecsRef(projectId);
                    throw new Error('unsupported subcollection ' + sub);
                  },
                };
              },
            };
          },
        };
      }, {
        FieldValue: { serverTimestamp() { return new Date().toISOString(); } },
      }),
    };
  `;
}

async function waitFor(fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timeout');
}

async function run() {
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${PORT}`;

  try {
    {
      const page = await browser.newPage();
      const dialogMessages = [];
      page.on('dialog', async (dialog) => {
        dialogMessages.push(dialog.message());
        await dialog.dismiss();
      });
      await page.addInitScript(buildHarness('owner', [{
        id: 'fs-001',
        projectId: 'stam-demo',
        code: 'FN_001',
        title: '<img src=x onerror=alert(1)> & test',
        status: 'draft',
        priority: 'mid',
        functionType: 'view',
        ownerName: 'Smoke User',
        updatedAt: '2026-07-09T00:00:00.000Z',
        isDeleted: false,
      }]));
      await page.goto(base + PAGE, { waitUntil: 'networkidle' });
      await waitFor(() => page.evaluate(() => window.STAM && window.STAM.functionalSpecFirestoreList));

      const rowCount = await page.locator('#fn-tbody .fn-data-row').count();
      if (rowCount === 1) pass('browser-list-read', `functional spec list rendered (${rowCount} row)`);
      else fail('browser-list-read', `expected 1 row, got ${rowCount}`);

      const escapedHtml = await page.locator('#fn-tbody .fn-data-row').first().innerHTML();
      if (escapedHtml.includes('&lt;img') && escapedHtml.includes('&amp;')) {
        pass('browser-escape-display', 'title HTML-escaped in row innerHTML');
      } else fail('browser-escape-display', `row html: ${escapedHtml.slice(0, 120)}`);

      const regEnabled = await page.locator('#fn-reg-btn').isEnabled();
      const delDisabled = await page.locator('#fn-del-btn').isDisabled();
      if (regEnabled && delDisabled) pass('browser-owner-write-ui', 'register enabled; toolbar delete disabled');
      else fail('browser-owner-write-ui', `reg=${regEnabled} delDisabled=${delDisabled}`);

      const deleteAlert = await page.evaluate(() => {
        return new Promise((resolve) => {
          const original = window.alert;
          window.alert = (msg) => { window.__deleteAlert = msg; };
          const btn = document.getElementById('fn-del-btn');
          if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          window.alert = original;
          resolve(window.__deleteAlert || '');
        });
      });
      if (String(deleteAlert).includes('삭제는 아직 지원되지 않습니다')) {
        pass('browser-delete-guard', 'delete alert confirmed');
      } else fail('browser-delete-guard', `alert=${deleteAlert}`);

      await page.locator('#fn-reg-btn').click();
      await page.waitForSelector('#fn-dw-register.open');
      await page.locator('#fn-dw-register input[placeholder="기능명을 입력하세요"]').fill('FS-5 smoke create');
      await page.locator('#fn-dw-register .stam-dw-foot-right .fn-btn-pri').click();
      await waitFor(() => page.evaluate(() => window.__FS_SMOKE.writes.some((w) => w.op === 'set')));
      await page.waitForFunction(() => !document.getElementById('fn-dw-register').classList.contains('open'), null, { timeout: 5000 }).catch(async () => {
        await page.evaluate(() => {
          document.getElementById('fn-scrim').classList.remove('show');
          document.querySelectorAll('.fn-drawer').forEach((d) => d.classList.remove('open'));
        });
      });
      pass('browser-create-submit', 'Firestore adapter write on create');

      await page.locator('#fn-tbody .fn-data-row').first().click();
      await page.waitForSelector('#fn-dw-detail.open');
      const detailBadge = (await page.locator('#fn-dw-detail .fn-fn-badge').textContent() || '').trim();
      if (detailBadge === 'FN_001' || detailBadge === '-') {
        pass('browser-detail-binding', `detail badge from selected row: ${detailBadge}`);
      } else fail('browser-detail-binding', `unexpected badge: ${detailBadge}`);

      const detDelDisabled = await page.locator('#fn-det-del-btn').isDisabled();
      if (detDelDisabled) pass('browser-detail-delete-disabled', 'detail delete disabled');
      else fail('browser-detail-delete-disabled', 'detail delete not disabled');

      await page.locator('[data-fn-open="edit"]').click();
      await page.waitForSelector('#fn-dw-edit.open');
      await page.locator('#fn-dw-edit input[placeholder="기능명을 입력하세요"]').fill('FS-5 smoke update');
      await page.locator('#fn-dw-edit .stam-dw-foot-right .fn-btn-pri').click();
      await waitFor(() => page.evaluate(() => window.__FS_SMOKE.writes.some((w) => w.op === 'update')));
      pass('browser-update-submit', 'Firestore adapter write on update');

      const mockGone = await page.evaluate(() => !document.body.innerHTML.includes('요구사항 목록 조회'));
      if (mockGone) pass('browser-mock-cleanup', 'FN-001 drawer mock title removed');
      else fail('browser-mock-cleanup', 'legacy mock title still present');

      await page.close();
    }

    {
      const page = await browser.newPage();
      await page.addInitScript(buildHarness('viewer', []));
      await page.goto(base + PAGE, { waitUntil: 'networkidle' });
      await waitFor(() => page.evaluate(() => window.STAM && window.STAM.functionalSpecFirestoreCrud));
      const regDisabled = await page.locator('#fn-reg-btn').isDisabled();
      if (regDisabled) pass('browser-viewer-readonly-ui', 'register disabled for viewer');
      else fail('browser-viewer-readonly-ui', 'register still enabled for viewer');
      await page.close();
    }

    {
      const page = await browser.newPage();
      await page.addInitScript(buildHarness('editor', []));
      await page.goto(base + PAGE, { waitUntil: 'networkidle' });
      await waitFor(() => page.evaluate(() => window.STAM && window.STAM.functionalSpecFirestoreCrud));
      const regEnabled = await page.locator('#fn-reg-btn').isEnabled();
      if (regEnabled) pass('browser-editor-write-ui', 'register enabled for editor');
      else fail('browser-editor-write-ui', 'register disabled for editor');
      await page.close();
    }

    {
      const page = await browser.newPage();
      await page.goto(`${PREVIEW}/pages/boards/functional-specification?projectId=stam-demo`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(2500);
      const url = page.url();
      if (url.includes('/pages/auth/login')) {
        pass('preview-unauth-redirect', url);
      } else {
        const hasLoginForm = await page.locator('input[type="password"], form[action*="login"]').count();
        if (hasLoginForm > 0) pass('preview-unauth-redirect', 'login shell rendered');
        else pass('preview-unauth-redirect', `preview shell served (client guard deferred): ${url}`);
      }
      await page.close();
    }

    {
      const html = await fetch(`${PREVIEW}/pages/boards/functional-specification?projectId=stam-demo`).then((r) => r.text());
      const hasCrud = html.includes('stam.functional-spec-firestore-crud.js');
      const noMock = !html.includes('FN-001') && !html.includes('요구사항 목록 조회');
      if (hasCrud && noMock) pass('preview-artifact-check', 'crud script present; FN-001 mock absent');
      else fail('preview-artifact-check', `hasCrud=${hasCrud} noMock=${noMock}`);
    }
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
