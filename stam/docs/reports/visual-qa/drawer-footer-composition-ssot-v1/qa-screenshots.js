const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = 'http://localhost:8787';
const OUT  = '/home/user/stam/stam/docs/reports/visual-qa/drawer-footer-composition-ssot-v1/screenshots';

// Each board: page URL + 3 drawer ids (register / detail / edit)
const BOARDS = [
  { id: 'rq',  url: '/pages/boards/requirements.html',            ids: { register: 'rq-dw-register',  detail: 'rq-dw-detail',  edit: 'rq-dw-edit'  } },
  { id: 'msl', url: '/pages/boards/menu-screen-list.html',        ids: { register: 'msl-dw-register', detail: 'msl-dw-detail', edit: 'msl-dw-edit' } },
  { id: 'fn',  url: '/pages/boards/functional-specification.html', ids: { register: 'fn-dw-register',  detail: 'fn-dw-detail',  edit: 'fn-dw-edit'  } },
];

const VIEWPORTS = [
  { name: '1366', width: 1366, height: 768 },
  { name: '1920', width: 1920, height: 1080 },
];

async function forceOpen(page, drawerId) {
  await page.evaluate((id) => {
    document.querySelectorAll('.stam-drawer').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.stam-drawer-scrim, [class*="scrim"]').forEach(s => s.classList.remove('show'));
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }, drawerId);
  await page.waitForTimeout(350);
}

// Returns measured footer height (px) or null
async function shootFooter(page, drawerId, filename) {
  const sel = `#${drawerId} .stam-drawer-foot`;
  const footer = page.locator(sel).first();
  await footer.waitFor({ state: 'visible', timeout: 4000 });
  await footer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const box = await footer.boundingBox();
  await footer.screenshot({ path: filename });
  return box ? Math.round(box.height) : null;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });

  const allErrors = [];
  const heights = {};

  for (const vp of VIEWPORTS) {
    console.log(`\n═══ Viewport ${vp.name}px (${vp.width}×${vp.height}) ═══`);

    for (const board of BOARDS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
      page.on('pageerror', e => pageErrors.push(e.message));

      await page.goto(BASE + board.url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);

      for (const [mode, id] of Object.entries(board.ids)) {
        const fname = `${OUT}/${board.id}-${mode}-${vp.name}.png`;
        await forceOpen(page, id);
        try {
          const h = await shootFooter(page, id, fname);
          heights[`${board.id}-${mode}-${vp.name}`] = h;
          console.log(`    ✓ ${board.id}-${mode}-${vp.name}.png  (footer h=${h}px)`);
        } catch (e) {
          console.error(`    ✗ ${board.id}-${mode}-${vp.name}: ${e.message}`);
          allErrors.push(`${board.id}-${mode}-${vp.name}: ${e.message}`);
        }
      }

      if (pageErrors.length) {
        pageErrors.forEach(e => allErrors.push(`[console][${board.id}] ${e}`));
        console.error(`    Console errors (${board.id}): ${pageErrors.join('; ')}`);
      } else {
        console.log(`    Console errors (${board.id}): 0 ✓`);
      }
      await ctx.close();
    }

    // Dark mode representative — rq register
    {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
      page.on('pageerror', e => pageErrors.push(e.message));
      await page.goto(BASE + '/pages/boards/requirements.html', { waitUntil: 'networkidle', timeout: 20000 });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.waitForTimeout(400);
      await forceOpen(page, 'rq-dw-register');
      try {
        await shootFooter(page, 'rq-dw-register', `${OUT}/dark-mode-${vp.name}.png`);
        console.log(`    ✓ dark-mode-${vp.name}.png`);
      } catch (e) {
        console.error(`    ✗ dark-mode-${vp.name}: ${e.message}`);
        allErrors.push(`dark-mode-${vp.name}: ${e.message}`);
      }
      if (pageErrors.length) pageErrors.forEach(e => allErrors.push(`[console][dark] ${e}`));
      await ctx.close();
    }
  }

  await browser.close();

  console.log('\n═══ Footer height parity ═══');
  for (const vp of VIEWPORTS) {
    const mh = Object.entries(heights).filter(([k]) => k.endsWith(vp.name)).map(([k, v]) => `${k}=${v}`);
    console.log(`  ${vp.name}: ${mh.join('  ')}`);
  }

  const files = require('fs').readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\n═══ Summary ═══\n  Screenshots: ${files.length}`);
  console.log(`  Console errors: ${allErrors.filter(e => e.includes('[console]')).length}`);
  if (allErrors.length) {
    console.error('  Errors:');
    allErrors.forEach(e => console.error('    ' + e));
    process.exitCode = 1;
  } else {
    console.log('  All OK ✓');
  }
})();
