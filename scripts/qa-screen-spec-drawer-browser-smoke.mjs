#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const STAM = path.join(ROOT, 'stam');
const PORT = 9884;
const require = createRequire('/tmp/qa-deps/package.json');
const { chromium } = require('playwright');
const results = [];
const check = (ok, id, detail) => {
  results.push({ ok, id, detail });
  console[ok ? 'log' : 'error'](`${ok ? 'PASS' : 'FAIL'}  ${id}: ${detail}`);
};

function server() {
  return new Promise((resolve) => {
    const instance = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${PORT}`).pathname);
      if (pathname.startsWith('/__/firebase/')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end('// Firebase supplied by init harness'); return;
      }
      const file = path.join(STAM, pathname.replace(/^\//, ''));
      if (!file.startsWith(STAM) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }); res.end(fs.readFileSync(file));
    });
    instance.listen(PORT, '127.0.0.1', () => resolve(instance));
  });
}

const harness = `(() => {
  const rows = {
    screenSpecs: [{ id:'scr-1', code:'SCR-001', title:'Existing screen', screenType:'list', writeStatus:'writing', reviewStatus:'none', approvalStatus:'none', ownerName:'Smoke Owner', version:1, isDeleted:false, updatedAt:'2026-08-01' }],
    requirements: [{ id:'req-1', code:'REQ_001', title:'Smoke requirement', isDeleted:false }],
    functionalSpecifications: [{ id:'fn-1', code:'FN_001', title:'Smoke function', isDeleted:false }],
    wbsItems: [{ id:'wbs-1', code:'WBS-001', title:'Smoke WBS', isDeleted:false }],
  };
  const snapshot = (items) => ({ forEach(cb) { items.forEach(item => cb({ id:item.id, exists:true, data:() => item })); } });
  function refs(name) {
    return {
      doc(id) { return { id:id || name+'-auto', get() { const item=(rows[name]||[]).find(x=>x.id===id); return Promise.resolve({ id, exists:!!item, data:()=>item }); } }; },
      get() { return Promise.resolve(snapshot(rows[name] || [])); },
    };
  }
  const user = { uid:'smoke-user', displayName:'Smoke Owner', email:'smoke@example.com' };
  window.firebase = {
    apps:[{}], auth() { return { currentUser:user, onAuthStateChanged(cb) { cb(user); return () => {}; } }; },
    firestore:Object.assign(() => ({
      collection(name) {
        if (name !== 'projects') throw new Error('unsupported root '+name);
        return { doc(projectId) { return {
          get() { return Promise.resolve({ exists:true, data:()=>({ name:'Smoke Project', status:'active' }) }); },
          collection(sub) {
            if (sub === 'members') return { doc() { return { get() { return Promise.resolve({ exists:true, data:()=>({ status:'active', role:'owner', displayName:'Smoke Owner' }) }); } }; } };
            return refs(sub);
          },
        }; } };
      },
    }), { FieldValue:{ serverTimestamp:()=>new Date().toISOString(), delete:()=>({__delete:true}) } }),
  };
})();`;

async function waitFor(page, fn, arg = null) { await page.waitForFunction(fn, arg, { timeout: 20000 }); }
async function run() {
  const staticServer = await server();
  const systemChrome = process.env.STAM_PLAYWRIGHT_CHROME || '/usr/local/bin/google-chrome';
  const launchOptions = { headless: true };
  if (fs.existsSync(systemChrome)) {
    launchOptions.executablePath = systemChrome;
    launchOptions.args = ['--no-sandbox'];
  }
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror:${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console:${m.text()}`); });
  await page.addInitScript(harness);
  try {
    await page.goto(`http://127.0.0.1:${PORT}/pages/boards/screen-specification.html?projectId=smoke`, { waitUntil:'networkidle' });
    await waitFor(page, () => window.STAM?.screenSpecFirestoreList?.getState()?.member?.role === 'owner');
    check(await page.locator('#ss-tbody [data-ss-firestore-id]').count() === 1, 'list-render', 'Firestore shim row rendered');

    const open = async () => {
      await page.locator('[data-ssv2-reg]').click();
      await waitFor(page, () => document.getElementById('ssv2-drawer')?.dataset.open === 'true');
      check(await page.locator('#ssv2-scrim.show').count() === 1, 'scrim-open', 'common scrim visible');
      check(await page.locator('#ssv2-form [data-stam-reference-picker-root]').count() === 3, 'picker-mount', 'three picker roots mounted once');
    };
    const closed = () => page.evaluate(() => document.getElementById('ssv2-drawer')?.dataset.open === 'false' && !document.getElementById('ssv2-scrim')?.classList.contains('show'));

    await open(); await page.locator('#ssv2-close').click(); check(await closed(), 'close-button', 'drawer closed');
    await open(); await page.locator('#ssv2-cancel-btn').click(); check(await closed(), 'cancel-button', 'drawer closed');
    await open(); await page.locator('#ssv2-scrim').click({ position:{x:100,y:200} }); check(await closed(), 'scrim-close', 'drawer closed');
    await open();

    for (const [name, selector] of [
      ['requirement','[data-stam-requirement-picker]'],
      ['functionalSpec','[data-stam-functional-spec-picker]'],
      ['wbs','[data-stam-wbs-picker]'],
    ]) {
      const host = page.locator(selector);
      await host.locator('[data-stam-reference-picker-toggle]').click();
      await waitFor(page, (sel) => document.querySelector(sel)?.querySelector('[data-stam-reference-picker-root]')?.classList.contains('is-open'), selector);
      await host.locator('[data-stam-reference-picker-opt="1"]').first().click();
      check(await host.locator('[data-stam-reference-picker-root].is-open').count() === 0, `picker-${name}`, 'selection applied and picker closed');
    }
    await page.locator('#ssv2-close').click();
    await open();
    check(await page.locator('#ssv2-form [data-stam-reference-picker-root]').count() === 3, 'reopen-no-duplicate', 'destroy/reopen keeps one root per picker');
    check(errors.length === 0, 'console-clean', errors.join(' | ') || 'no console/page errors');
  } finally {
    await browser.close(); staticServer.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`summary: total=${results.length} pass=${results.length-failed.length} fail=${failed.length}`);
  if (failed.length) process.exit(1);
}
run().catch((err) => { console.error(err); process.exit(1); });
