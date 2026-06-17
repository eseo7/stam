/*
 * QA — Custom Select SSOT (real user-flow)
 *
 * 등록/수정 drawer 를 실제 사용자 흐름으로 열고 (board JS 의 click handler 가
 * STAM.customSelect.init 을 호출하도록 한다) custom select trigger 를 클릭하여
 * openCount=1 / 선택 후 닫힘 / 외부 클릭 닫힘 / ESC 닫힘 / 재오픈 시 중복 init 보호
 * 를 모두 검증한다.
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');

const BASE = 'http://localhost:8787';
const OUT  = '/home/user/stam/stam/docs/reports/visual-qa/custom-select-ssot-v1/screenshots';

const BOARDS = [
  {
    id: 'rq',
    url: '/pages/boards/requirements.html',
    csClass: 'rq-cs',
    triggerSel: '.rq-cs-trigger',
    optSel: '.rq-cs-opt',
    regBtnSel: '#rq-reg-btn',
    editBtnSel: '[data-rq-open="edit"]',
    regDrawerId: 'rq-dw-register',
    editDrawerId: 'rq-dw-edit',
    closeBtnSel: '.rq-dw-close, [data-rq-close]',
  },
  {
    id: 'msl',
    url: '/pages/boards/menu-screen-list.html',
    csClass: 'msl-cs',
    triggerSel: '.msl-cs-trigger',
    optSel: '.msl-cs-opt',
    regBtnSel: '#msl-reg-btn',
    editBtnSel: '[data-msl-open="edit"]',
    regDrawerId: 'msl-dw-register',
    editDrawerId: 'msl-dw-edit',
    closeBtnSel: '.msl-dw-close, [data-msl-close]',
  },
  {
    id: 'fn',
    url: '/pages/boards/functional-specification.html',
    csClass: 'fn-cs',
    triggerSel: '.fn-cs-trigger',
    optSel: '.fn-cs-opt',
    regBtnSel: '#fn-reg-btn',
    editBtnSel: '[data-fn-open="edit"]',
    regDrawerId: 'fn-dw-register',
    editDrawerId: 'fn-dw-edit',
    closeBtnSel: '.fn-dw-close, [data-fn-close]',
  },
];

const VIEWPORTS = [
  { name: '1366', width: 1366, height: 800 },
  { name: '1920', width: 1920, height: 1080 },
];

// ── Real user-flow helpers ───────────────────────────────────────
// Use the page's actual click handlers (board JS) — invoke via DOM .click()
// to avoid offscreen / overlay issues but still go through the real handler.

async function clickReal(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
}

async function clickFirstTriggerInDrawer(page, drawerId, triggerSel) {
  return page.evaluate(({id, sel}) => {
    const t = document.querySelector(`#${id} ${sel}`);
    if (!t) return false;
    t.click();
    return true;
  }, {id: drawerId, sel: triggerSel});
}

async function selectFirstRealOption(page, drawerId, optSel) {
  return page.evaluate(({id, sel}) => {
    const opts = Array.from(document.querySelectorAll(`#${id} ${sel}`));
    // first non-placeholder, fall back to last (avoid placeholder)
    const o = opts.find(o => !o.classList.contains('is-placeholder')) || opts[opts.length - 1];
    if (!o) return false;
    o.click();
    return true;
  }, {id: drawerId, sel: optSel});
}

async function getOpenCount(page, csClass) {
  return page.evaluate((c) => document.querySelectorAll(`.${c}.open`).length, csClass);
}

async function getSelectedLabel(page, drawerId, csClass) {
  return page.evaluate(({id, c}) => {
    const v = document.querySelector(`#${id} .${c} .${c.split(' ')[0]}-val, #${id} .${c.split(' ')[0]}-val`);
    return v ? v.textContent : null;
  }, {id: drawerId, c: csClass});
}

async function shotDrawer(page, drawerId, fname) {
  // Force-paint (drawers are CSS transformed off-screen otherwise); pin to viewport
  await page.evaluate((id) => {
    const d = document.getElementById(id);
    if (!d) return;
    d.style.transform = 'none';
    d.style.visibility = 'visible';
    d.style.opacity = '1';
  }, drawerId);
  await page.waitForTimeout(120);
  const el = page.locator(`#${drawerId}`);
  await el.waitFor({ state: 'attached', timeout: 3000 });
  await el.screenshot({ path: fname, timeout: 5000 });
}

async function closeAllDrawers(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.rq-drawer, .msl-drawer, .fn-drawer').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('[id$="-scrim"]').forEach(s => s.classList.remove('show'));
  });
  await page.waitForTimeout(120);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });

  const results = { mode: 'real-user-flow', perBoard: {}, errors: [] };

  for (const vp of VIEWPORTS) {
    console.log(`\n═══ viewport ${vp.name}px ═══`);
    for (const b of BOARDS) {
      results.perBoard[b.id] = results.perBoard[b.id] || { cases: {}, errors: [] };
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const consoleErrs = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
      page.on('pageerror', e => consoleErrs.push(e.message));
      await page.goto(BASE + b.url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(500);

      // ── 1. REGISTER drawer via real button click ───────────────
      const regBtnOk = await clickReal(page, b.regBtnSel);
      await page.waitForTimeout(220);
      const regOpenedOk = await page.evaluate((id) => document.getElementById(id).classList.contains('open'), b.regDrawerId);

      // open custom select via real trigger click
      const trigOk = await clickFirstTriggerInDrawer(page, b.regDrawerId, b.triggerSel);
      await page.waitForTimeout(180);
      const regOpenCount = await getOpenCount(page, b.csClass);
      await shotDrawer(page, b.regDrawerId, `${OUT}/${b.id}-register-select-open-${vp.name}.png`);
      results.perBoard[b.id].cases[`register-open-${vp.name}`] = { regBtnOk, regOpenedOk, trigOk, openCount: regOpenCount };
      console.log(`  ${b.id} register OPEN  drawerOpen=${regOpenedOk} trig=${trigOk} openCount=${regOpenCount}`);

      // select an option
      const selOk = await selectFirstRealOption(page, b.regDrawerId, b.optSel);
      await page.waitForTimeout(180);
      const afterSelOpenCount = await getOpenCount(page, b.csClass);
      const afterSelLabel = await getSelectedLabel(page, b.regDrawerId, b.csClass);
      await shotDrawer(page, b.regDrawerId, `${OUT}/${b.id}-register-select-selected-${vp.name}.png`);
      results.perBoard[b.id].cases[`register-selected-${vp.name}`] = { selOk, openCountAfter: afterSelOpenCount, label: afterSelLabel };
      console.log(`  ${b.id} register SELECTED ok=${selOk} closedAfter=${afterSelOpenCount===0} label='${afterSelLabel}'`);

      // outside click (dispatch click on body)
      await clickFirstTriggerInDrawer(page, b.regDrawerId, b.triggerSel);
      await page.waitForTimeout(150);
      const beforeOutside = await getOpenCount(page, b.csClass);
      await page.evaluate(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
      await page.waitForTimeout(150);
      const afterOutside = await getOpenCount(page, b.csClass);
      results.perBoard[b.id].cases[`register-outside-${vp.name}`] = { before: beforeOutside, after: afterOutside, closed: afterOutside === 0 };
      console.log(`  ${b.id} register OUTSIDE_CLICK before=${beforeOutside} after=${afterOutside}`);

      // ESC close
      await clickFirstTriggerInDrawer(page, b.regDrawerId, b.triggerSel);
      await page.waitForTimeout(150);
      const beforeEsc = await getOpenCount(page, b.csClass);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const afterEsc = await getOpenCount(page, b.csClass);
      results.perBoard[b.id].cases[`register-esc-${vp.name}`] = { before: beforeEsc, after: afterEsc, closed: afterEsc === 0 };
      console.log(`  ${b.id} register ESC before=${beforeEsc} after=${afterEsc}`);

      // close register drawer fully (close button)
      await closeAllDrawers(page);

      // ── 2. EDIT drawer via real flow ───────────────────────────
      // edit button lives inside detail drawer; we open detail by forcing it open
      // is acceptable for QA, BUT the more "real" path is to click [data-rq-open="edit"]
      // — that handler is bound globally on the element regardless of visibility.
      // Use evaluate-click so visibility doesn't matter; this still goes through the
      // real openDrawer() in board JS.
      const editBtnOk = await clickReal(page, b.editBtnSel);
      await page.waitForTimeout(220);
      const editOpenedOk = await page.evaluate((id) => document.getElementById(id).classList.contains('open'), b.editDrawerId);

      const editTrigOk = await clickFirstTriggerInDrawer(page, b.editDrawerId, b.triggerSel);
      await page.waitForTimeout(180);
      const editOpenCount = await getOpenCount(page, b.csClass);
      await shotDrawer(page, b.editDrawerId, `${OUT}/${b.id}-edit-select-open-${vp.name}.png`);
      results.perBoard[b.id].cases[`edit-open-${vp.name}`] = { editBtnOk, editOpenedOk, trigOk: editTrigOk, openCount: editOpenCount };
      console.log(`  ${b.id} edit     OPEN  drawerOpen=${editOpenedOk} trig=${editTrigOk} openCount=${editOpenCount}`);

      // ── 3. Duplicate init / reopen check ───────────────────────
      // Close drawer (real close button), then re-open via real button,
      // click trigger again — openCount must be exactly 1.
      await clickReal(page, b.closeBtnSel);
      await page.waitForTimeout(220);
      const reEditBtnOk = await clickReal(page, b.editBtnSel);
      await page.waitForTimeout(220);
      const reEditOpenedOk = await page.evaluate((id) => document.getElementById(id).classList.contains('open'), b.editDrawerId);
      const reEditTrigOk = await clickFirstTriggerInDrawer(page, b.editDrawerId, b.triggerSel);
      await page.waitForTimeout(180);
      const reopenOpenCount = await getOpenCount(page, b.csClass);
      // count triggers inside drawer — must not have duplicated due to init re-call
      const triggerCount = await page.evaluate(({id, sel}) => document.querySelectorAll(`#${id} ${sel}`).length, {id: b.editDrawerId, sel: b.triggerSel});
      const csWrapCount  = await page.evaluate(({id, c}) => document.querySelectorAll(`#${id} .${c.split(' ')[0]}`).length, {id: b.editDrawerId, c: b.csClass});
      results.perBoard[b.id].cases[`edit-reopen-dup-${vp.name}`] = {
        reEditBtnOk, reEditOpenedOk, reEditTrigOk,
        openCount: reopenOpenCount,
        triggerCountInDrawer: triggerCount,
        csWrapCountInDrawer: csWrapCount
      };
      console.log(`  ${b.id} edit     REOPEN openCount=${reopenOpenCount} (expect 1) triggers=${triggerCount} csWraps=${csWrapCount}`);

      if (consoleErrs.length) {
        consoleErrs.forEach(e => results.perBoard[b.id].errors.push(`[${vp.name}] ${e}`));
        console.error(`  ${b.id} console errors (${vp.name}): ${consoleErrs.join('; ')}`);
      } else {
        console.log(`  ${b.id} console errors (${vp.name}): 0 ✓`);
      }

      await ctx.close();
    }

    // dark mode
    {
      const target = vp.name === '1366' ? BOARDS[0] : BOARDS[2];
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(BASE + target.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.waitForTimeout(300);
      await clickReal(page, target.regBtnSel);
      await page.waitForTimeout(220);
      await clickFirstTriggerInDrawer(page, target.regDrawerId, target.triggerSel);
      await page.waitForTimeout(180);
      await shotDrawer(page, target.regDrawerId, `${OUT}/dark-${target.id}-register-${vp.name}.png`);
      console.log(`  ✓ dark-${target.id}-register-${vp.name}.png`);
      await ctx.close();
    }
  }

  await browser.close();

  fs.writeFileSync(`${OUT}/../qa-results.json`, JSON.stringify(results, null, 2));
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\nScreenshots: ${files.length}`);
  const totalErrs = Object.values(results.perBoard).reduce((s, b) => s + b.errors.length, 0);
  console.log(`Console errors total: ${totalErrs}`);

  // assert reopen openCount=1 for all 3 boards × 2 viewports
  let dupFail = 0;
  for (const b of BOARDS) {
    for (const vp of VIEWPORTS) {
      const c = results.perBoard[b.id].cases[`edit-reopen-dup-${vp.name}`];
      if (!c || c.openCount !== 1) { dupFail++; console.error(`  REOPEN FAIL ${b.id}/${vp.name}: openCount=${c && c.openCount}`); }
    }
  }
  console.log(`Reopen openCount=1 violations: ${dupFail}`);
  if (totalErrs || dupFail) process.exitCode = 1;
})();
