#!/usr/bin/env node
/**
 * STAM UI PR Screenshot Capture Script (v0.1)
 *
 * Playwright로 UI PR screenshot을 캡쳐한다.
 * package.json 수정 없이 동작 — Playwright는 dynamic import로 로드.
 *
 * 사용법:
 *   node scripts/qa/capture-ui-pr-screenshots.mjs --pr 254 --dry-run
 *   node scripts/qa/capture-ui-pr-screenshots.mjs --pr 254 --base-url http://127.0.0.1:5500/stam
 *
 * 주의:
 *   - save/delete/submit 클릭 금지 (read-only 시나리오)
 *   - 생성 screenshot은 PR에 커밋하지 않음 — tmp/qa-screenshots/ 또는 --out 경로
 *   - Playwright 미설치 시 친절한 안내 후 종료 (자동 npm install 하지 않음)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_CONFIG = path.join(__dirname, 'ui-screenshot-targets.json');

const HELP = `
STAM UI PR Screenshot Capture (v0.1)

Usage:
  node scripts/qa/capture-ui-pr-screenshots.mjs [options]

Options:
  --pr <number>       PR number (default output: tmp/qa-screenshots/pr-<n>/)
  --base-url <url>    Base URL for board pages (overrides config defaultBaseUrl)
  --out <dir>         Output directory for screenshots and report
  --config <path>     Path to ui-screenshot-targets.json
  --dry-run           Print planned captures without launching browser
  --help              Show this help

Examples:
  node scripts/qa/capture-ui-pr-screenshots.mjs --help
  node scripts/qa/capture-ui-pr-screenshots.mjs --dry-run --pr 254
  node scripts/qa/capture-ui-pr-screenshots.mjs --pr 254 --base-url http://127.0.0.1:5500/stam

Requirements:
  Playwright must be available in the QA runtime. Do not add it to this repo's package.json.
  Use Playwright already installed in Cursor/CI/local QA, or prepare it in a temporary
  environment only. Do not modify package.json or package-lock.json from this script.
  If browser binaries are missing, run in the QA environment only:
    npx playwright install chromium
  Do not commit dependency changes or browser cache artifacts to this repo.
  Do not run npm install -D playwright in this repo unless a separate dependency PR
  explicitly allows package.json changes.

Safety:
  - Read-only scenarios only (no save/delete/submit)
  - Screenshots are NOT committed to the repo by default
`.trim();

function parseArgs(argv) {
  const opts = {
    pr: null,
    baseUrl: null,
    out: null,
    config: DEFAULT_CONFIG,
    dryRun: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--pr') {
      opts.pr = argv[++i];
    } else if (arg === '--base-url') {
      opts.baseUrl = argv[++i];
    } else if (arg === '--out') {
      opts.out = argv[++i];
    } else if (arg === '--config') {
      opts.config = path.resolve(argv[++i]);
    } else {
      console.error(`Unknown option: ${arg}`);
      console.error('Run with --help for usage.');
      process.exit(1);
    }
  }

  return opts;
}

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse config JSON: ${configPath}`);
    console.error(err.message);
    process.exit(1);
  }
}

function resolveOutDir(opts) {
  if (opts.out) return path.resolve(opts.out);
  if (opts.pr) return path.join(ROOT, 'tmp', 'qa-screenshots', `pr-${opts.pr}`);
  return path.join(ROOT, 'tmp', 'qa-screenshots', 'adhoc');
}

function screenshotFileName(pr, target) {
  const base = target.screenshotName || target.name;
  if (pr) return `pr${pr}-${base}.png`;
  return `${base}.png`;
}

function buildCapturePlan(config, opts) {
  const baseUrl = (opts.baseUrl || config.defaultBaseUrl || '').replace(/\/$/, '');
  const outDir = resolveOutDir(opts);
  const viewports = config.viewports || {};

  const captures = (config.targets || []).map((target) => {
    const vpKey = target.viewport || 'desktop';
    const vp = viewports[vpKey] || { width: 1440, height: 900 };
    const url = target.path ? `${baseUrl}${target.path}` : null;
    const fileName = screenshotFileName(opts.pr, target);

    return {
      name: target.name,
      label: target.label,
      role: target.role,
      url,
      path: target.path,
      viewport: vpKey,
      viewportSize: vp,
      theme: target.theme || 'light',
      screenshotName: target.screenshotName,
      fileName,
      outputPath: path.join(outDir, fileName),
      actions: target.actions || [],
      waitFor: target.waitFor || null,
      automatable: !hasManualOnly(target),
    };
  });

  return {
    pr: opts.pr,
    baseUrl,
    outDir,
    configPath: opts.config,
    dryRun: opts.dryRun,
    captures,
    futureTargets: config.futureTargets || [],
  };
}

function hasManualOnly(target) {
  const actions = target.actions || [];
  const waitFor = target.waitFor;
  if (!actions.length) return true;
  if (actions.every((a) => a.type === 'manual')) return true;
  if (waitFor && (waitFor.type === 'manual' || waitFor.type === 'todoSelector')) return true;
  return false;
}

function printDryRun(plan) {
  console.log('=== STAM Screenshot QA — Dry Run ===');
  console.log(`PR:          ${plan.pr ?? '(not set)'}`);
  console.log(`Base URL:    ${plan.baseUrl}`);
  console.log(`Output dir:  ${plan.outDir}`);
  console.log(`Config:      ${plan.configPath}`);
  console.log('');
  console.log(`Captures (${plan.captures.length}):`);
  plan.captures.forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.role}] ${c.name}`);
    console.log(`     file:     ${c.fileName}`);
    console.log(`     url:      ${c.url ?? '(manual — no path)'}`);
    console.log(`     viewport: ${c.viewport} (${c.viewportSize.width}x${c.viewportSize.height})`);
    console.log(`     theme:    ${c.theme}`);
    console.log(`     auto:     ${c.automatable ? 'yes (partial)' : 'no — manual/todoSelector'}`);
    if (c.actions.length) {
      c.actions.forEach((a) => {
        console.log(`     action:   [${a.type}] ${a.description || a.note || ''}`);
      });
    }
    if (c.waitFor) {
      console.log(`     waitFor:  [${c.waitFor.type}] ${c.waitFor.note || c.waitFor.selector || ''}`);
    }
    console.log('');
  });

  if (plan.futureTargets.length) {
    console.log(`Future targets (${plan.futureTargets.length}):`);
    plan.futureTargets.forEach((t) => {
      console.log(`  - ${t.name} (${t.status}) — ${t.note || t.path}`);
    });
    console.log('');
  }

  const manualCount = plan.captures.filter((c) => !c.automatable).length;
  if (manualCount > 0) {
    console.log(`Note: ${manualCount} capture(s) require manual steps or todoSelector resolution.`);
    console.log('      Run browser manually or extend config with confirmed selectors.');
  }

  console.log('Dry run complete — no browser launched, no files written.');
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch (err) {
    console.error('');
    console.error('Playwright is not installed or could not be loaded.');
    console.error('');
    console.error('Playwright must be available in the QA runtime. Do not add it to this repo\'s package.json.');
    console.error('Use Playwright already installed in Cursor/CI/local QA, or prepare it in a temporary');
    console.error('environment only. Do not modify package.json or package-lock.json.');
    console.error('');
    console.error('If browser binaries are missing, prepare Chromium in the QA environment only:');
    console.error('  npx playwright install chromium');
    console.error('Do not commit dependency changes or browser cache artifacts to this repo.');
    console.error('Do not run npm install -D playwright in this repo unless a separate dependency PR');
    console.error('explicitly allows package.json changes.');
    console.error('');
    console.error('Then re-run this script.');
    console.error('');
    if (err && err.message) console.error(`Detail: ${err.message}`);
    process.exit(1);
  }
}

async function applyTheme(page, theme) {
  if (theme === 'dark') {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('stam-theme', 'dark'); } catch (_) { /* ignore */ }
    });
  } else {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      try { localStorage.setItem('stam-theme', 'light'); } catch (_) { /* ignore */ }
    });
  }
}

async function runCapture(plan) {
  const chromium = await loadPlaywright();
  fs.mkdirSync(plan.outDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    pr: plan.pr,
    baseUrl: plan.baseUrl,
    outDir: plan.outDir,
    captures: [],
    summary: {
      total: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      consoleErrors: 0,
      pageErrors: 0,
    },
  };

  const browser = await chromium.launch({ headless: true });

  try {
    for (const capture of plan.captures) {
      report.summary.total++;

      const entry = {
        name: capture.name,
        fileName: capture.fileName,
        outputPath: capture.outputPath,
        url: capture.url,
        viewport: capture.viewport,
        theme: capture.theme,
        status: 'pending',
        consoleErrors: [],
        pageErrors: [],
        skippedReason: null,
        error: null,
      };

      if (!capture.url || !capture.automatable) {
        entry.status = 'skipped';
        entry.skippedReason = capture.url
          ? 'manual/todoSelector — automation not configured'
          : 'no path — manual compare capture';
        report.summary.skipped++;
        report.captures.push(entry);
        console.log(`SKIP  ${capture.fileName} — ${entry.skippedReason}`);
        continue;
      }

      const consoleErrors = [];
      const pageErrors = [];

      const context = await browser.newContext({
        viewport: capture.viewportSize,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push({ message: err.message, stack: err.stack });
      });

      try {
        await page.goto(capture.url, { waitUntil: 'networkidle', timeout: 30000 });
        await applyTheme(page, capture.theme);

        // Automated actions: only safe, confirmed selectors (none in v0.1 config)
        for (const action of capture.actions) {
          if (action.type === 'click' && action.selector) {
            await page.click(action.selector, { timeout: 5000 });
          } else if (action.type === 'wait' && action.ms) {
            await page.waitForTimeout(action.ms);
          }
        }

        if (capture.waitFor && capture.waitFor.selector) {
          await page.waitForSelector(capture.waitFor.selector, { timeout: 10000 });
        } else {
          await page.waitForTimeout(800);
        }

        await page.screenshot({ path: capture.outputPath, fullPage: false });
        entry.status = 'success';
        report.summary.success++;
        console.log(`OK    ${capture.fileName}`);
      } catch (err) {
        entry.status = 'failed';
        entry.error = err.message;
        report.summary.failed++;
        console.error(`FAIL  ${capture.fileName} — ${err.message}`);
      } finally {
        entry.consoleErrors = consoleErrors;
        entry.pageErrors = pageErrors;
        report.summary.consoleErrors += consoleErrors.length;
        report.summary.pageErrors += pageErrors.length;
        report.captures.push(entry);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(plan.outDir, 'capture-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('');
  console.log(`Report: ${reportPath}`);
  console.log(`Summary: ${report.summary.success} ok, ${report.summary.skipped} skipped, ${report.summary.failed} failed`);
  console.log(`Errors:  ${report.summary.consoleErrors} console, ${report.summary.pageErrors} page`);

  if (report.summary.failed > 0) process.exit(1);
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    console.log(HELP);
    process.exit(0);
  }

  const config = loadConfig(opts.config);
  const plan = buildCapturePlan(config, opts);

  if (opts.dryRun) {
    printDryRun(plan);
    process.exit(0);
  }

  await runCapture(plan);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
