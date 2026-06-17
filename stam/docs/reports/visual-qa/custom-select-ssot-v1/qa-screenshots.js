const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = 'http://localhost:8787';
const OUT  = '/home/user/stam/stam/docs/reports/visual-qa/custom-select-ssot-v1/screenshots';

const BOARDS = [
  { id: 'rq',  url: '/pages/boards/requirements.html',             reg: 'rq-dw-register',  edt: 'rq-dw-edit',  csClass: 'rq-cs',  triggerSel: '.rq-cs-trigger', optSel: '.rq-cs-opt', openClass: 'open' },
  { id: 'msl', url: '/pages/boards/menu-screen-list.html',         reg: 'msl-dw-register', edt: 'msl-dw-edit', csClass: 'msl-cs', triggerSel: '.msl-cs-trigger', optSel: '.msl-cs-opt', openClass: 'open' },
  { id: 'fn',  url: '/pages/boards/functional-specification.html', reg: 'fn-dw-register',  edt: 'fn-dw-edit',  csClass: 'fn-cs',  triggerSel: '.fn-cs-trigger', optSel: '.fn-cs-opt', openClass: 'open' },
];

const VIEWPORTS = [
  { name: '1366', width: 1366, height: 800 },
  { name: '1920', width: 1920, height: 1080 },
];

async function forceOpenDrawer(page, drawerId) {
  await page.evaluate((id) => {
    document.querySelectorAll('.rq-drawer, .msl-drawer, .fn-drawer').forEach(d => d.classList.remove('open'));
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      // mimic openDrawer post-step: enhance selects
      const evt = new Event('DOMContentLoaded');
    }
  }, drawerId);
  await page.waitForTimeout(300);
}

async function enhance(page, drawerId, csCfgName) {
  // Reuse the page's STAM.customSelect.init with the right config via the helper closures from board JS.
  await page.evaluate(({drawerId}) => {
    // Use board JS's own helper by simulating its openDrawer flow via clicking the register button isn't reliable for edit/detail; instead directly call STAM.customSelect.init with prefix-matched cfg derived from the drawer's prefix.
    const el = document.getElementById(drawerId);
    if (!el || !window.STAM || !window.STAM.customSelect) return;
    // Identify prefix
    const prefix = drawerId.startsWith('rq') ? 'rq' :
                   drawerId.startsWith('msl') ? 'msl' : 'fn';
    const CFGS = {
      rq:  { selectSelector:'select.rq-inp',  nativeMarkerAttr:'data-rq-cs',  uidPrefix:'rqcs',  wrapClass:'rq-cs',  triggerClass:'rq-cs-trigger',  valClass:'rq-cs-val',  caretClass:'rq-cs-caret',  panelClass:'rq-cs-panel',  optClass:'rq-cs-opt',  checkClass:'rq-cs-check',  otextClass:'rq-cs-otext',  nativeClass:'rq-cs-native',  flipContainer:'.rq-dw-body',  openClass:'open',         upClass:'cs-up',        openSelector:'.rq-cs.open'  },
      msl: { selectSelector:'select.msl-inp', nativeMarkerAttr:'data-msl-cs', uidPrefix:'mslcs', wrapClass:'msl-cs', triggerClass:'msl-cs-trigger', valClass:'msl-cs-val', caretClass:'msl-cs-caret', panelClass:'msl-cs-panel', optClass:'msl-cs-opt', checkClass:'msl-cs-check', otextClass:'msl-cs-otext', nativeClass:'msl-cs-native', flipContainer:'.msl-dw-body', openClass:'open',         upClass:'cs-up',        openSelector:'.msl-cs.open' },
      fn:  { selectSelector:'select.fn-sel',  nativeMarkerAttr:'data-fn-cs',  uidPrefix:'fncs',  wrapClass:'fn-cs stam-cs', triggerClass:'fn-cs-trigger stam-cs-trigger', valClass:'fn-cs-val stam-cs-value', caretClass:'fn-cs-caret stam-cs-icon', panelClass:'fn-cs-panel stam-cs-menu', optClass:'fn-cs-opt stam-cs-opt', checkClass:'fn-cs-check stam-cs-check', otextClass:'fn-cs-otext stam-cs-otext', nativeClass:'fn-cs-native', flipContainer:'.fn-dw-body', openClass:'open is-open', upClass:'cs-up is-up',  openSelector:'.fn-cs.open' },
    };
    window.STAM.customSelect.init(el, CFGS[prefix]);
  }, {drawerId});
  await page.waitForTimeout(200);
}

async function shootDrawer(page, drawerId, fname) {
  const el = page.locator(`#${drawerId}`);
  await el.waitFor({ state:'attached', timeout: 3000 });
  // ensure drawer is open and visible by forcing scrim + transform
  await page.evaluate((id) => {
    const d = document.getElementById(id);
    if (!d) return;
    d.classList.add('open');
    d.style.transform = 'none';
    d.style.visibility = 'visible';
    d.style.opacity = '1';
    const scrims = document.querySelectorAll('.rq-scrim, .msl-scrim, .fn-scrim, .stam-scrim, [id$="-scrim"]');
    scrims.forEach(s => { s.classList.add('show'); s.style.opacity = '0'; });
  }, drawerId);
  await page.waitForTimeout(120);
  await el.screenshot({ path: fname, timeout: 5000 });
}

async function clickFirstTrigger(page, drawerId, triggerSel) {
  return page.evaluate(({id, sel}) => {
    const t = document.querySelector(`#${id} ${sel}`);
    if (!t) return false;
    t.click();
    return true;
  }, {id: drawerId, sel: triggerSel});
}

async function selectFirstNonPlaceholder(page, drawerId, optSel) {
  return page.evaluate(({id, sel}) => {
    const opts = Array.from(document.querySelectorAll(`#${id} ${sel}`));
    const o = opts.find(o => !o.classList.contains('is-placeholder')) || opts[0];
    if (!o) return false;
    o.click();
    return true;
  }, {id: drawerId, sel: optSel});
}

async function getOpenCount(page, csClass) {
  return page.evaluate((c) => document.querySelectorAll(`.${c}.open`).length, csClass);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });

  const results = { perBoard: {}, errors: [] };

  for (const vp of VIEWPORTS) {
    console.log(`\n═══ viewport ${vp.name}px ═══`);
    for (const b of BOARDS) {
      results.perBoard[b.id] = results.perBoard[b.id] || { errors: [], cases: {} };
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const consoleErrs = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
      page.on('pageerror', e => consoleErrs.push(e.message));
      await page.goto(BASE + b.url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(500);

      // ── REGISTER drawer
      await forceOpenDrawer(page, b.reg);
      await enhance(page, b.reg);

      // open select
      const okOpen = await clickFirstTrigger(page, b.reg, b.triggerSel);
      await page.waitForTimeout(200);
      const openCount = await getOpenCount(page, b.csClass);
      const csOpenScreen = `${OUT}/${b.id}-register-select-open-${vp.name}.png`;
      await shootDrawer(page, b.reg, csOpenScreen);
      console.log(`  ${b.id} register OPEN trigger=${okOpen} openCount=${openCount}`);
      results.perBoard[b.id].cases[`register-open-${vp.name}`] = { trigger:okOpen, openCount };

      // select a value
      const okSel = await selectFirstNonPlaceholder(page, b.reg, b.optSel);
      await page.waitForTimeout(200);
      const afterSelOpenCount = await getOpenCount(page, b.csClass);
      const selectedScreen = `${OUT}/${b.id}-register-select-selected-${vp.name}.png`;
      await shootDrawer(page, b.reg, selectedScreen);
      console.log(`  ${b.id} register SELECTED ok=${okSel} closedAfter(openCount=${afterSelOpenCount})`);
      results.perBoard[b.id].cases[`register-selected-${vp.name}`] = { ok:okSel, openCountAfter:afterSelOpenCount };

      // outside click after re-open: open again then dispatch click on body (avoid topbar nav links)
      await clickFirstTrigger(page, b.reg, b.triggerSel);
      await page.waitForTimeout(150);
      await page.evaluate(() => {
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(150);
      const outsideClickClosed = (await getOpenCount(page, b.csClass)) === 0;
      results.perBoard[b.id].cases[`register-outside-${vp.name}`] = { closed: outsideClickClosed };
      console.log(`  ${b.id} register OUTSIDE_CLICK closed=${outsideClickClosed}`);

      // ESC close
      await clickFirstTrigger(page, b.reg, b.triggerSel);
      await page.waitForTimeout(150);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const escClosed = (await getOpenCount(page, b.csClass)) === 0;
      results.perBoard[b.id].cases[`register-esc-${vp.name}`] = { closed: escClosed };
      console.log(`  ${b.id} register ESC closed=${escClosed}`);

      // ── EDIT drawer
      const editExists = await page.evaluate((id) => !!document.getElementById(id), b.edt);
      console.log(`  [debug] ${b.edt} exists=${editExists}`);
      if (!editExists) {
        console.log(`  [debug] drawer IDs in DOM: ${await page.evaluate(()=>Array.from(document.querySelectorAll('[id*="-dw-"]')).map(e=>e.id).join(','))}`);
      }
      await forceOpenDrawer(page, b.edt);
      await enhance(page, b.edt);
      const okEditOpen = await clickFirstTrigger(page, b.edt, b.triggerSel);
      await page.waitForTimeout(200);
      const editOpenCount = await getOpenCount(page, b.csClass);
      const editScreen = `${OUT}/${b.id}-edit-select-open-${vp.name}.png`;
      await shootDrawer(page, b.edt, editScreen);
      console.log(`  ${b.id} edit OPEN trigger=${okEditOpen} openCount=${editOpenCount}`);
      results.perBoard[b.id].cases[`edit-open-${vp.name}`] = { trigger: okEditOpen, openCount: editOpenCount };

      // duplicate init check: open then close then re-open — only 1 open at a time
      await page.evaluate((id) => document.getElementById(id).classList.remove('open'), b.edt);
      await page.waitForTimeout(100);
      await forceOpenDrawer(page, b.edt);
      await enhance(page, b.edt);
      await clickFirstTrigger(page, b.edt, b.triggerSel);
      await page.waitForTimeout(150);
      const dupCount = await getOpenCount(page, b.csClass);
      results.perBoard[b.id].cases[`edit-reopen-dup-${vp.name}`] = { openCount: dupCount };
      console.log(`  ${b.id} edit REOPEN duplicate-bind-check openCount=${dupCount} (expect 1)`);

      if (consoleErrs.length) {
        consoleErrs.forEach(e => results.perBoard[b.id].errors.push(`[${vp.name}] ${e}`));
        console.error(`  ${b.id} console errors (${vp.name}): ${consoleErrs.join('; ')}`);
      } else {
        console.log(`  ${b.id} console errors (${vp.name}): 0 ✓`);
      }

      await ctx.close();
    }

    // dark mode representative (rq register only on first viewport iter, fn register on second)
    if (vp.name === '1366' || vp.name === '1920') {
      const target = vp.name === '1366' ? BOARDS[0] : BOARDS[2];
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(BASE + target.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.waitForTimeout(300);
      await forceOpenDrawer(page, target.reg);
      await enhance(page, target.reg);
      await clickFirstTrigger(page, target.reg, target.triggerSel);
      await page.waitForTimeout(200);
      await shootDrawer(page, target.reg, `${OUT}/dark-${target.id}-register-${vp.name}.png`);
      console.log(`  ✓ dark-${target.id}-register-${vp.name}.png`);
      await ctx.close();
    }
  }

  await browser.close();

  const fs = require('fs');
  fs.writeFileSync(`${OUT}/../qa-results.json`, JSON.stringify(results, null, 2));
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\nScreenshots: ${files.length}`);
  const totalErrs = Object.values(results.perBoard).reduce((s, b) => s + b.errors.length, 0);
  console.log(`Console errors total: ${totalErrs}`);
  if (totalErrs) process.exitCode = 1;
})();
