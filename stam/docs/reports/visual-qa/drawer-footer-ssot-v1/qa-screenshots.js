const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = 'http://localhost:8787';
const OUT  = '/home/user/stam/stam/docs/reports/visual-qa/drawer-footer-ssot-v1/screenshots';

// Each board: page URL, drawer IDs, scrim class
const BOARDS = [
  {
    id: 'rq',
    url: '/pages/boards/requirements.html',
    drawers: {
      register: { id: 'rq-dw-register',  openBtn: '#rq-reg-btn',             closeAttr: '[data-rq-close]' },
      detail:   { id: 'rq-dw-detail',    openViaRow: '.rq-data-row:first-child', closeAttr: '[data-rq-close]' },
      edit:     { id: 'rq-dw-edit',      openViaDetail: true, openBtn: '[data-rq-open="edit"]', closeAttr: '[data-rq-close]' },
    },
  },
  {
    id: 'msl',
    url: '/pages/boards/menu-screen-list.html',
    drawers: {
      register: { id: 'msl-dw-register', openBtn: '#msl-reg-btn',             closeAttr: '[data-msl-close]' },
      detail:   { id: 'msl-dw-detail',   openViaRow: '.msl-data-row:first-child', closeAttr: '[data-msl-close]' },
      edit:     { id: 'msl-dw-edit',     openViaDetail: true, openBtn: '[data-msl-open="edit"]', closeAttr: '[data-msl-close]' },
    },
  },
  {
    id: 'fn',
    url: '/pages/boards/functional-specification.html',
    drawers: {
      register: { id: 'fn-dw-register',  openBtn: '#fn-reg-btn',              closeAttr: '[data-fn-close]' },
      detail:   { id: 'fn-dw-detail',    openViaRow: '.fn-data-row:first-child', closeAttr: '[data-fn-close]' },
      edit:     { id: 'fn-dw-edit',      openViaDetail: true, openBtn: '[data-fn-open="edit"]', closeAttr: '[data-fn-close]' },
    },
  },
];

const VIEWPORTS = [
  { name: '1366', width: 1366, height: 768 },
  { name: '1920', width: 1920, height: 1080 },
];

async function forceOpen(page, drawerId) {
  await page.evaluate((id) => {
    // Close all drawers first
    document.querySelectorAll('.stam-drawer').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.stam-drawer-scrim, [class*="scrim"]').forEach(s => s.classList.remove('show'));
    // Open target
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }, drawerId);
  await page.waitForTimeout(350);
}

async function screenshotFooter(page, drawerId, filename) {
  const footerSel = `#${drawerId} .stam-drawer-foot`;
  try {
    const footer = page.locator(footerSel).first();
    await footer.waitFor({ state: 'visible', timeout: 4000 });
    // Scroll footer into view
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await footer.screenshot({ path: filename });
    return { ok: true };
  } catch (e) {
    // Fallback: clip bottom of drawer
    const drawerEl = page.locator(`#${drawerId}`).first();
    try {
      const box = await drawerEl.boundingBox();
      if (box) {
        await page.screenshot({
          path: filename,
          clip: { x: box.x, y: box.y + box.height - 60, width: box.width, height: 60 }
        });
        return { ok: true, fallback: true };
      }
    } catch {}
    return { ok: false, error: e.message };
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });

  const allErrors = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n═══ Viewport ${vp.name}px (${vp.width}×${vp.height}) ═══`);

    for (const board of BOARDS) {
      console.log(`\n  Board: ${board.id}`);

      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') pageErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(BASE + board.url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);

      for (const [drawerType, cfg] of Object.entries(board.drawers)) {
        const fname = `${OUT}/${board.id}-${drawerType}-${vp.name}.png`;
        await forceOpen(page, cfg.id);
        const result = await screenshotFooter(page, cfg.id, fname);

        if (result.ok) {
          console.log(`    ✓ ${board.id}-${drawerType}-${vp.name}.png${result.fallback ? ' (fallback)' : ''}`);
        } else {
          console.error(`    ✗ ${board.id}-${drawerType}-${vp.name}: ${result.error}`);
          allErrors.push(`${board.id}-${drawerType}-${vp.name}: ${result.error}`);
        }
      }

      if (pageErrors.length) {
        console.error(`    Console errors (${board.id}): ${pageErrors.join('; ')}`);
        pageErrors.forEach(e => allErrors.push(`[console][${board.id}] ${e}`));
      } else {
        console.log(`    Console errors: 0 ✓`);
      }

      await ctx.close();
    }

    // Dark mode representative — rq register
    console.log(`\n  Dark mode (rq-register representative)`);
    {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(BASE + '/pages/boards/requirements.html', { waitUntil: 'networkidle', timeout: 20000 });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.waitForTimeout(400);
      await forceOpen(page, 'rq-dw-register');
      const result = await screenshotFooter(page, 'rq-dw-register', `${OUT}/dark-mode-${vp.name}.png`);
      console.log(result.ok
        ? `    ✓ dark-mode-${vp.name}.png`
        : `    ✗ dark-mode-${vp.name}: ${result.error}`);
      await ctx.close();
    }
  }

  await browser.close();

  console.log('\n═══ Summary ═══');
  const files = require('fs').readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`  Screenshots captured: ${files.length}`);
  files.sort().forEach(f => console.log(`    ${f}`));
  console.log(`\n  Console errors total: ${allErrors.filter(e => e.includes('[console]')).length}`);
  if (allErrors.length) {
    console.error('\n  Errors:');
    allErrors.forEach(e => console.error('    ' + e));
    process.exitCode = 1;
  } else {
    console.log('  All OK ✓');
  }
})();
