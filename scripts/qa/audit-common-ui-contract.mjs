#!/usr/bin/env node
/**
 * STAM Common UI Contract Audit (v0.1)
 *
 * Read-only inspection of board pages against common UI contracts.
 * Uses Node built-in modules only — no package.json changes required.
 *
 * Usage:
 *   node scripts/qa/audit-common-ui-contract.mjs --help
 *   node scripts/qa/audit-common-ui-contract.mjs --dry-run
 *   node scripts/qa/audit-common-ui-contract.mjs --format text --fail-on none
 *   node scripts/qa/audit-common-ui-contract.mjs --format json --out tmp/common-ui-audit.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_CONFIG = path.join(__dirname, 'common-ui-contracts.json');

const HELP = `
STAM Common UI Contract Audit (v0.1)

Usage:
  node scripts/qa/audit-common-ui-contract.mjs [options]

Options:
  --config <path>       Path to common-ui-contracts.json (default: scripts/qa/common-ui-contracts.json)
  --format text|json      Output format (default: text)
  --out <path>            Write JSON report to path (tmp/** only; not committed)
  --fail-on warn|fail|none  Exit code policy (default: none — baseline WARN exits 0)
  --dry-run               Print targets and rules without scanning files
  --help                  Show this help

Examples:
  node scripts/qa/audit-common-ui-contract.mjs --help
  node scripts/qa/audit-common-ui-contract.mjs --dry-run
  node scripts/qa/audit-common-ui-contract.mjs --format text --fail-on none
  node scripts/qa/audit-common-ui-contract.mjs --format json --fail-on none

Notes:
  - Read-only: never modifies product UI files.
  - v0.1 baseline: existing legacy classes are WARN, not automatic FAIL.
  - Does not declare "공통화 완료" — human review + PR Audit Log required.
  - Tracked report files under stam/docs/reports/** are not created.
`.trim();

function parseArgs(argv) {
  const opts = {
    config: DEFAULT_CONFIG,
    format: 'text',
    out: null,
    failOn: 'none',
    dryRun: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--config') {
      opts.config = path.resolve(argv[++i]);
    } else if (arg === '--format') {
      opts.format = argv[++i];
    } else if (arg === '--out') {
      opts.out = argv[++i];
    } else if (arg === '--fail-on') {
      opts.failOn = argv[++i];
    } else {
      console.error(`Unknown option: ${arg}`);
      console.error('Run with --help for usage.');
      process.exit(1);
    }
  }

  if (!['text', 'json'].includes(opts.format)) {
    console.error('--format must be text or json');
    process.exit(1);
  }
  if (!['warn', 'fail', 'none'].includes(opts.failOn)) {
    console.error('--fail-on must be warn, fail, or none');
    process.exit(1);
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
    console.error(`Failed to parse config: ${err.message}`);
    process.exit(1);
  }
}

function readRootFile(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return { exists: false, content: null, abs };
  return { exists: true, content: fs.readFileSync(abs, 'utf8'), abs };
}

function countMatches(content, pattern) {
  if (!content) return 0;
  const re = typeof pattern === 'string'
    ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    : pattern;
  const m = content.match(re);
  return m ? m.length : 0;
}

function findLegacyPrefixes(content, prefixes) {
  const hits = [];
  for (const prefix of prefixes) {
    const re = new RegExp(`class=["'][^"']*\\b${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    const classRe = new RegExp(`\\.${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\w-]*`, 'g');
    const jsRe = new RegExp(`['"\`]${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    const total = countMatches(content, re) + countMatches(content, classRe) + countMatches(content, jsRe);
    if (total > 0) hits.push({ prefix, count: total });
  }
  return hits;
}

function findInContent(content, items) {
  return items.filter((item) => content && content.includes(item));
}

function findDetailLayoutSignals(jsContents, patterns) {
  const signals = [];
  for (const pattern of patterns) {
    let total = 0;
    for (const c of jsContents) {
      total += countMatches(c, pattern);
    }
    if (total > 0) signals.push({ pattern, count: total });
  }
  return signals;
}

function assessTarget(target, config) {
  const files = [];
  const missingFiles = [];
  const checks = [];

  const allPaths = [
    { kind: 'html', rel: target.htmlPath },
    ...(target.jsPaths || []).map((rel) => ({ kind: 'js', rel })),
    ...(target.cssPaths || []).map((rel) => ({ kind: 'css', rel })),
  ];

  for (const entry of allPaths) {
    if (!entry.rel) continue;
    const file = readRootFile(entry.rel);
    files.push({ ...entry, ...file });
    if (!file.exists) missingFiles.push(entry.rel);
  }

  if (missingFiles.length) {
    checks.push({
      id: 'file-exists',
      status: target.failOnMissingFile ? 'FAIL' : 'WARN',
      message: `Missing file(s): ${missingFiles.join(', ')}`,
    });
  } else {
    checks.push({ id: 'file-exists', status: 'PASS', message: 'All target files present' });
  }

  const html = files.find((f) => f.kind === 'html');
  const jsContents = files.filter((f) => f.kind === 'js' && f.content).map((f) => f.content);
  const allContent = files.filter((f) => f.content).map((f) => f.content).join('\n');

  const commonClassesFound = findInContent(allContent, target.expectedCommonClasses || []);
  const commonClassesMissing = (target.expectedCommonClasses || []).filter(
    (c) => !commonClassesFound.includes(c),
  );

  if (commonClassesMissing.length === 0 && commonClassesFound.length > 0) {
    checks.push({
      id: 'common-classes',
      status: 'PASS',
      message: `Common classes found: ${commonClassesFound.join(', ')}`,
      found: commonClassesFound,
    });
  } else if (commonClassesFound.length > 0) {
    checks.push({
      id: 'common-classes',
      status: 'WARN',
      message: `Partial common classes — found: ${commonClassesFound.join(', ')}; missing: ${commonClassesMissing.join(', ')}`,
      found: commonClassesFound,
      missing: commonClassesMissing,
    });
  } else {
    checks.push({
      id: 'common-classes',
      status: 'WARN',
      message: `No expected common classes found (missing: ${commonClassesMissing.join(', ')})`,
      missing: commonClassesMissing,
    });
  }

  const renderersFound = findInContent(allContent, target.expectedCommonRenderers || []);
  const renderersMissing = (target.expectedCommonRenderers || []).filter(
    (r) => !renderersFound.includes(r),
  );
  if ((target.expectedCommonRenderers || []).length === 0) {
    checks.push({
      id: 'common-renderers',
      status: 'WARN',
      message: 'No common renderers expected for this target (legacy)',
    });
  } else if (renderersMissing.length === 0) {
    checks.push({
      id: 'common-renderers',
      status: 'PASS',
      message: `Common renderers found: ${renderersFound.join(', ')}`,
      found: renderersFound,
    });
  } else {
    checks.push({
      id: 'common-renderers',
      status: 'WARN',
      message: `Renderer gap — found: ${renderersFound.join(', ') || '(none)'}; missing: ${renderersMissing.join(', ')}`,
      found: renderersFound,
      missing: renderersMissing,
    });
  }

  const htmlContent = html?.content || '';
  const assetsFound = findInContent(htmlContent, target.expectedCommonAssets || []);
  const assetsMissing = (target.expectedCommonAssets || []).filter((a) => !assetsFound.includes(a));
  if (assetsMissing.length === 0 && assetsFound.length > 0) {
    checks.push({
      id: 'common-css-assets',
      status: 'PASS',
      message: `Common CSS assets linked: ${assetsFound.join(', ')}`,
      found: assetsFound,
    });
  } else if (assetsFound.length > 0) {
    checks.push({
      id: 'common-css-assets',
      status: 'WARN',
      message: `Partial CSS assets — found: ${assetsFound.join(', ')}; missing: ${assetsMissing.join(', ')}`,
      found: assetsFound,
      missing: assetsMissing,
    });
  } else {
    checks.push({
      id: 'common-css-assets',
      status: 'WARN',
      message: `Common CSS assets not linked in HTML (expected: ${(target.expectedCommonAssets || []).join(', ')})`,
      missing: assetsMissing,
    });
  }

  const legacyHits = findLegacyPrefixes(allContent, target.knownLegacyPrefixes || []);
  if (legacyHits.length > 0) {
    checks.push({
      id: 'legacy-prefixes',
      status: 'WARN',
      message: `Known legacy prefix usage (baseline): ${legacyHits.map((h) => `${h.prefix}(${h.count})`).join(', ')}`,
      hits: legacyHits,
      notes: target.knownLegacyNotes || null,
    });
  } else {
    checks.push({
      id: 'legacy-prefixes',
      status: 'PASS',
      message: 'No known legacy prefixes detected',
    });
  }

  const layoutPatterns = config.detailLayoutSignals?.patterns || ['innerHTML', 'insertAdjacentHTML'];
  const layoutSignals = findDetailLayoutSignals(jsContents, layoutPatterns);
  if (layoutSignals.length > 0) {
    checks.push({
      id: 'detail-layout-direct',
      status: 'WARN',
      message: `Detail/layout direct generation signals: ${layoutSignals.map((s) => `${s.pattern}(${s.count})`).join(', ')}`,
      signals: layoutSignals,
    });
  } else {
    checks.push({
      id: 'detail-layout-direct',
      status: 'PASS',
      message: 'No direct layout generation signals in JS',
    });
  }

  const future = config.globalContracts?.detailDrawer || config.globalContracts?.detailDrawerFuture;
  if (future?.status === 'active') {
    const adopted = findInContent(allContent, future.classes || []);
    const rendererOnBoard = findInContent(allContent, future.renderers || []);
    checks.push({
      id: 'detail-drawer-adoption',
      status: 'WARN',
      message: adopted.length || rendererOnBoard.length
        ? 'Detail drawer common artifacts referenced on board (verify migration scope)'
        : 'Common detail drawer not adopted on this board yet (repo assets exist; migration pending)',
      planned: false,
    });
  } else if (future?.status === 'planned') {
    const futureClasses = future.classes || [];
    const futureRenderers = future.renderers || [];
    const futureFound = [
      ...findInContent(allContent, futureClasses),
      ...findInContent(allContent, futureRenderers),
    ];
    checks.push({
      id: 'future-detail-drawer',
      status: 'WARN',
      message: futureFound.length
        ? `Planned detail drawer artifacts detected (todo verify): ${futureFound.join(', ')}`
        : 'Planned STAM.detailDrawer / stam-detail not present (expected at baseline)',
      planned: true,
    });
  }

  let status = 'WARN';
  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasWarn = checks.some((c) => c.status === 'WARN');
  const allPass = checks.every((c) => c.status === 'PASS');

  if (hasFail) {
    status = 'FAIL';
  } else if (target.status === 'knownLegacy' || target.status === 'baseline-warn') {
    status = 'WARN';
  } else if (allPass && !hasWarn) {
    status = 'PASS';
  } else if (hasWarn) {
    status = 'WARN';
  }

  return {
    id: target.id,
    label: target.label,
    status,
    baselineStatus: target.status,
    knownLegacyNotes: target.knownLegacyNotes || null,
    missingFiles,
    checks,
  };
}

function validateOutPath(outPath) {
  const normalized = path.normalize(outPath);
  if (normalized.includes('stam/docs/reports')) {
    console.error('--out must not write to stam/docs/reports/** (tracked reports forbidden)');
    process.exit(1);
  }
  if (!normalized.startsWith('tmp' + path.sep) && !normalized.startsWith('tmp/')) {
    const abs = path.resolve(ROOT, normalized);
    const rel = path.relative(ROOT, abs);
    if (!rel.startsWith(`tmp${path.sep}`) && rel !== 'tmp') {
      console.error('--out must be under tmp/** only');
      process.exit(1);
    }
  }
}

function printDryRun(config) {
  console.log('STAM Common UI Contract Audit — dry-run');
  console.log(`Config version: ${config.version || 'unknown'}`);
  console.log('');
  console.log('Global contracts:');
  for (const [key, val] of Object.entries(config.globalContracts || {})) {
    console.log(`  - ${key} [${val.status || 'active'}]`);
    if (val.classes?.length) console.log(`      classes: ${val.classes.join(', ')}`);
    if (val.renderers?.length) console.log(`      renderers: ${val.renderers.join(', ')}`);
    if (val.cssAssets?.length) console.log(`      cssAssets: ${val.cssAssets.join(', ')}`);
  }
  console.log('');
  console.log('Detail layout signals:', (config.detailLayoutSignals?.patterns || []).join(', '));
  console.log('');
  console.log(`Targets (${config.targets?.length || 0}):`);
  for (const t of config.targets || []) {
    console.log(`  [${t.id}] ${t.label} — status: ${t.status}`);
    console.log(`      html: ${t.htmlPath}`);
    console.log(`      js: ${(t.jsPaths || []).join(', ')}`);
    console.log(`      legacy: ${(t.knownLegacyPrefixes || []).join(', ')}`);
    console.log(`      common classes: ${(t.expectedCommonClasses || []).join(', ')}`);
    console.log(`      renderers: ${(t.expectedCommonRenderers || []).join(', ') || '(none)'}`);
  }
  console.log('');
  console.log('v0.1 policy: baseline legacy → WARN (not FAIL). Use --fail-on fail|warn for CI gates.');
}

function formatTextReport(report) {
  const lines = [];
  lines.push('STAM Common UI Contract Audit v0.1');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Config: ${report.configPath}`);
  lines.push('');
  if (report.globalChecks?.length) {
    lines.push('── Global ──');
    for (const c of report.globalChecks) {
      lines.push(`  (${c.status}) ${c.id}: ${c.message}`);
    }
    lines.push('');
  }
  lines.push('── Targets ──');
  for (const t of report.targets) {
    lines.push('');
    lines.push(`[${t.status}] ${t.id} — ${t.label}`);
    if (t.knownLegacyNotes) lines.push(`  baseline: ${t.knownLegacyNotes}`);
    for (const c of t.checks) {
      lines.push(`  (${c.status}) ${c.id}: ${c.message}`);
    }
  }
  lines.push('');
  lines.push('── Summary ──');
  lines.push(`PASS: ${report.summary.pass}  WARN: ${report.summary.warn}  FAIL: ${report.summary.fail}`);
  lines.push(`Overall: ${report.summary.overall}`);
  lines.push('');
  lines.push('Note: v0.1 records baseline legacy as WARN. This script does not declare 공통화 완료.');
  return lines.join('\n');
}

function assessGlobalAssets(config) {
  const checks = [];
  const detail = config.globalContracts?.detailDrawer;
  if (detail?.status === 'active') {
    const cssPath = detail.cssPath || 'stam/css/stam.detail-drawer.css';
    const jsPath = detail.jsPath || 'stam/js/stam.detail-drawer.js';
    const cssOk = readRootFile(cssPath).exists;
    const jsOk = readRootFile(jsPath).exists;
    const jsContent = readRootFile(jsPath).content || '';
    const hasRenderer = jsContent.includes('STAM.detailDrawer');
    if (cssOk && jsOk && hasRenderer) {
      checks.push({
        id: 'detail-drawer-assets',
        status: 'PASS',
        message: `Common detail drawer assets present: ${cssPath}, ${jsPath}`,
      });
    } else {
      checks.push({
        id: 'detail-drawer-assets',
        status: 'FAIL',
        message: `Missing detail drawer assets — css:${cssOk} js:${jsOk} renderer:${hasRenderer}`,
      });
    }
  }
  return checks;
}

function buildReport(config, configPath) {
  const globalChecks = assessGlobalAssets(config);
  const targetResults = (config.targets || []).map((t) => assessTarget(t, config));
  const pass = targetResults.filter((t) => t.status === 'PASS').length;
  const warn = targetResults.filter((t) => t.status === 'WARN').length;
  const fail = targetResults.filter((t) => t.status === 'FAIL').length;
  const globalFail = globalChecks.some((c) => c.status === 'FAIL');
  let overall = 'WARN';
  if (fail > 0 || globalFail) overall = 'FAIL';
  else if (warn > 0) overall = 'WARN';
  else if (pass > 0 && warn === 0 && fail === 0) overall = 'PASS';

  return {
    version: '0.1',
    generatedAt: new Date().toISOString(),
    configPath,
    policy: 'baseline-warn-v0.1',
    globalChecks,
    targets: targetResults,
    summary: { pass, warn, fail, overall, total: targetResults.length },
  };
}

function resolveExitCode(report, failOn) {
  const globalFail = (report.globalChecks || []).some((c) => c.status === 'FAIL');
  if (failOn === 'fail') return report.summary.fail > 0 || globalFail ? 1 : 0;
  if (failOn === 'warn') return report.summary.fail > 0 || report.summary.warn > 0 || globalFail ? 1 : 0;
  return 0;
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(HELP);
    process.exit(0);
  }

  const config = loadConfig(opts.config);

  if (opts.dryRun) {
    printDryRun(config);
    process.exit(0);
  }

  const report = buildReport(config, opts.config);

  if (opts.out) {
    validateOutPath(opts.out);
    const outAbs = path.isAbsolute(opts.out) ? opts.out : path.join(ROOT, opts.out);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify(report, null, 2) + '\n');
  }

  if (opts.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatTextReport(report));
  }

  process.exit(resolveExitCode(report, opts.failOn));
}

main();
