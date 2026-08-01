#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'stam');
const PORT = 9886;
const { chromium } = createRequire('/tmp/qa-deps/package.json')('playwright');
const viewports = [
  [1440, 900], [1200, 900], [1024, 768], [900, 768], [768, 900],
];

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${PORT}`).pathname);
      if (pathname.startsWith('/__/firebase/')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('// Firebase is supplied by the browser harness.');
        return;
      }
      const file = path.join(PUBLIC, pathname.replace(/^\//, ''));
      if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(fs.readFileSync(file));
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

const firebaseHarness = `(() => {
  const data = {
    screenSpecs:[{id:'scr-1',code:'SCR-001',title:'Existing screen',screenType:'list',writeStatus:'writing',reviewStatus:'none',approvalStatus:'none',ownerName:'QA Owner',version:1,isDeleted:false,updatedAt:'2026-08-01'}],
    requirements:[{id:'req-1',code:'REQ_001',title:'Requirement',isDeleted:false}],
    functionalSpecifications:[{id:'fn-1',code:'FN_001',title:'Function',isDeleted:false}],
    wbsItems:[{id:'wbs-1',code:'WBS-001',title:'WBS',isDeleted:false}],
  };
  const snap = items => ({forEach(cb){items.forEach(item=>cb({id:item.id,exists:true,data:()=>item}));}});
  const refs = name => ({doc(id){return{id,get(){const item=(data[name]||[]).find(x=>x.id===id);return Promise.resolve({id,exists:!!item,data:()=>item});}};},get(){return Promise.resolve(snap(data[name]||[]));}});
  const user={uid:'qa-user',displayName:'QA Owner',email:'qa@example.com'};
  window.firebase={
    apps:[{}],
    auth(){return{currentUser:user,onAuthStateChanged(cb){cb(user);return()=>{};}};},
    firestore:Object.assign(()=>({collection(name){if(name!=='projects')throw new Error('unsupported '+name);return{doc(){return{
      get(){return Promise.resolve({exists:true,data:()=>({name:'QA Project',status:'active'})});},
      collection(sub){if(sub==='members')return{doc(){return{get(){return Promise.resolve({exists:true,data:()=>({status:'active',role:'owner',displayName:'QA Owner'})});}};}};return refs(sub);}
    };}};}}),{FieldValue:{serverTimestamp:()=>new Date().toISOString(),delete:()=>({__delete:true})}})
  };
})();`;

function intersects(a, b) {
  return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
}

async function footerState(page) {
  return page.evaluate(() => {
    const detail = document.getElementById('ssv2-foot-detail');
    const form = document.getElementById('ssv2-foot-form');
    const rect = (id) => {
      const el = document.getElementById(id);
      const box = el.getBoundingClientRect();
      return { display:getComputedStyle(el).display, x:box.x, y:box.y, width:box.width, height:box.height, right:box.right, bottom:box.bottom };
    };
    const drawer = document.getElementById('ssv2-drawer').getBoundingClientRect();
    return {
      mode: document.getElementById('ssv2-drawer').dataset.mode,
      rootCount: document.querySelectorAll('#ssv2-drawer').length,
      detailHidden: detail.hidden,
      detailDisplay: getComputedStyle(detail).display,
      formHidden: form.hidden,
      formDisplay: getComputedStyle(form).display,
      edit: rect('ssv2-edit-btn'),
      cancel: rect('ssv2-cancel-btn'),
      save: rect('ssv2-save-btn'),
      drawer: { x:drawer.x, right:drawer.right },
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

function assertRegister(state, label) {
  if (!state.detailHidden || state.detailDisplay !== 'none') throw new Error(`${label}: detail footer visible`);
  if (state.formHidden || state.formDisplay === 'none') throw new Error(`${label}: form footer hidden`);
  if (state.edit.width !== 0 || state.edit.height !== 0) throw new Error(`${label}: edit button occupies layout`);
  if (state.cancel.width <= 0 || state.cancel.height <= 0 || state.save.width <= 0 || state.save.height <= 0) throw new Error(`${label}: form actions missing`);
  if (intersects(state.edit, state.cancel)) throw new Error(`${label}: edit/cancel rectangles intersect`);
  if (state.cancel.x < state.drawer.x || state.save.right > state.drawer.right) throw new Error(`${label}: footer actions overflow drawer`);
  if (state.rootCount !== 1) throw new Error(`${label}: duplicate drawer roots`);
}

async function run() {
  const server = await startServer();
  const chrome = process.env.STAM_PLAYWRIGHT_CHROME || '/usr/local/bin/google-chrome';
  const options = { headless:true };
  if (fs.existsSync(chrome)) Object.assign(options, { executablePath:chrome, args:['--no-sandbox'] });
  const browser = await chromium.launch(options);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror:${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console:${msg.text()}`); });
  await page.addInitScript(firebaseHarness);
  try {
    await page.goto(`http://127.0.0.1:${PORT}/pages/boards/screen-specification.html?projectId=qa`, { waitUntil:'networkidle' });
    await page.waitForFunction(() => window.STAM?.screenSpecFirestoreList?.getState()?.member?.role === 'owner');
    for (const theme of ['light','dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      for (const [width,height] of viewports) {
        await page.setViewportSize({ width, height });
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          await page.locator('[data-ssv2-reg]').click();
          await page.waitForFunction(() => document.getElementById('ssv2-drawer')?.dataset.open === 'true');
          assertRegister(await footerState(page), `${theme}-${width}-open-${attempt}`);
          if (attempt === 1) {
            for (const selector of ['[data-stam-requirement-picker]','[data-stam-functional-spec-picker]','[data-stam-wbs-picker]']) {
              const picker = page.locator(selector);
              await picker.locator('[data-stam-reference-picker-toggle]').click();
              await picker.locator('[data-stam-reference-picker-opt="1"]').first().click();
              assertRegister(await footerState(page), `${theme}-${width}-picker`);
            }
          }
          await page.locator(attempt === 2 ? '#ssv2-cancel-btn' : '#ssv2-close').click();
        }
      }
    }
    if (errors.length) throw new Error(errors.join(' | '));
    console.log(`screen spec drawer footer browser smoke: PASS (${viewports.length} viewports, light/dark, 3 reopen cycles)`);
    console.log('detail/edit mode: KNOWN GAP — no current Live entry path; no new feature exercised');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
