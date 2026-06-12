/**
 * STAM Common UI Audit Script
 * STAM 주요 보드의 공통 UI 적용 현황을 자동으로 검사합니다.
 * Node.js 기본 모듈만 사용. 외부 라이브러리 없음.
 *
 * 사용법: node scripts/audit-common-ui.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── 유틸 ─────────────────────────────────────────────────────────────────

function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function hasAny(content, patterns) {
  return patterns.some(p => typeof p === 'string' ? content.includes(p) : p.test(content));
}

function collectEvidence(content, patterns) {
  const found = [];
  for (const p of patterns) {
    if (typeof p === 'string') { if (content.includes(p)) found.push(p); }
    else { const m = content.match(p); if (m) found.push(m[0]); }
  }
  return found;
}

// ─── CSS 순서 파싱 ────────────────────────────────────────────────────────

const CSS_ORDER_STANDARD = [
  'stam.tokens.css',
  'stam.shell.css',
  'stam.components.css',
  'stam.project-overview.css',
  'stam.form-controls.css',
  'stam.drawer.css',
  'stam.table-selection.css',
  'stam.buttons.css',
  'stam.board-toolbar.css',
  'stam.board-filter.css',
];

const CSS_APPSHELL = ['stam.tokens.css', 'stam.shell.css', 'stam.components.css', 'stam.project-overview.css'];
const CSS_COMMON_UI = ['stam.form-controls.css', 'stam.drawer.css', 'stam.table-selection.css', 'stam.buttons.css', 'stam.board-toolbar.css', 'stam.board-filter.css'];

function parseCssLinks(html) {
  const re = /<link[^>]+href="([^"]+\.css)"[^>]*>/g;
  const links = [];
  let m;
  while ((m = re.exec(html)) !== null) links.push(m[1]);
  return links;
}

function checkCssOrder(html, profile, pageCss) {
  const links = parseCssLinks(html);
  const warnings = [];
  const evidence = links.filter(l => CSS_ORDER_STANDARD.some(s => l.includes(s)));
  const missing = [];

  const pageIdx = links.findIndex(l => l.includes(pageCss));

  if (profile === 'standard-board') {
    // 모든 공통 CSS가 있는지
    const presentCommon = CSS_COMMON_UI.filter(s => links.some(l => l.includes(s)));
    const missingCommon = CSS_COMMON_UI.filter(s => !links.some(l => l.includes(s)));

    // 순서 검사: page css가 공통 CSS 뒤에 오는지
    let orderOk = true;
    for (const s of presentCommon) {
      const idx = links.findIndex(l => l.includes(s));
      if (pageIdx !== -1 && idx > pageIdx) {
        warnings.push(`CSS 순서 위험: ${s} 가 ${pageCss} 보다 뒤에 있음`);
        orderOk = false;
      }
    }

    if (missingCommon.length === 0 && orderOk) return { status: 'PASS', evidence, missing, warnings };
    if (presentCommon.length > 0) {
      if (!orderOk) warnings.push('CSS 로드 순서 확인 필요');
      return { status: missingCommon.length > 0 ? 'PARTIAL' : (orderOk ? 'PASS' : 'CAUTION'), evidence, missing: missingCommon, warnings };
    }
    missing.push(...missingCommon);
    return { status: 'TODO', evidence, missing, warnings };
  }

  // legacy-special-board: app shell CSS 검사 + 공통 CSS 선택적 검사
  const missingShell = CSS_APPSHELL.filter(s => !links.some(l => l.includes(s)));
  const presentCommon = CSS_COMMON_UI.filter(s => links.some(l => l.includes(s)));

  if (missingShell.length > 0) {
    warnings.push(`App Shell CSS 누락: ${missingShell.join(', ')}`);
    return { status: 'CAUTION', evidence, missing: missingShell, warnings };
  }
  if (presentCommon.length > 0) return { status: 'PARTIAL', evidence, missing: CSS_COMMON_UI.filter(s => !links.some(l => l.includes(s))), warnings };
  return { status: 'LEGACY', evidence, missing: [], warnings };
}

// ─── JS 순서 파싱 ─────────────────────────────────────────────────────────

const JS_APPSHELL = ['stam.theme.js', 'stam.nav-data.js', 'stam.shell.js', 'stam.nav-render.js', 'stam.topbar-render.js', 'stam.project-context-render.js'];
const JS_COMMON = ['stam.board-filter.js'];

function parseScripts(html) {
  const re = /<script[^>]+src="([^"]+\.js)"[^>]*>/g;
  const scripts = [];
  let m;
  while ((m = re.exec(html)) !== null) scripts.push(m[1]);
  return scripts;
}

function checkJsOrder(html, profile, pageJs) {
  const scripts = parseScripts(html);
  const warnings = [];
  const evidence = scripts.filter(s => JS_APPSHELL.some(k => s.includes(k)) || JS_COMMON.some(k => s.includes(k)));

  const missingShell = JS_APPSHELL.filter(k => !scripts.some(s => s.includes(k)));
  const pageIdx = scripts.findIndex(s => s.includes(pageJs));

  // P0 후보: nav-data, shell, nav-render 누락
  const p0missing = ['stam.nav-data.js', 'stam.shell.js', 'stam.nav-render.js'].filter(k => !scripts.some(s => s.includes(k)));

  if (p0missing.length > 0) {
    return { status: 'TODO', evidence, missing: p0missing, warnings: [`P0: App Shell 필수 JS 누락 — ${p0missing.join(', ')}`], p0: p0missing };
  }

  if (missingShell.length > 0) warnings.push(`App Shell JS 일부 누락: ${missingShell.join(', ')}`);

  // 순서 검사
  let orderOk = true;
  for (const k of JS_APPSHELL.filter(k => scripts.some(s => s.includes(k)))) {
    const idx = scripts.findIndex(s => s.includes(k));
    if (pageIdx !== -1 && idx > pageIdx) {
      warnings.push(`JS 순서 위험: ${k} 가 ${pageJs} 보다 뒤에 있음`);
      orderOk = false;
    }
  }

  const hasFilter = scripts.some(s => s.includes('stam.board-filter.js'));
  const filterIdx = scripts.findIndex(s => s.includes('stam.board-filter.js'));
  if (hasFilter && pageIdx !== -1 && filterIdx > pageIdx) {
    warnings.push('stam.board-filter.js 가 page JS 보다 뒤에 있음');
    orderOk = false;
  }

  if (!orderOk) return { status: 'CAUTION', evidence, missing: missingShell, warnings };
  if (missingShell.length === 0 && hasFilter) return { status: 'PASS', evidence, missing: [], warnings };
  if (missingShell.length === 0) return { status: 'PARTIAL', evidence, missing: ['stam.board-filter.js'], warnings };
  return { status: 'PARTIAL', evidence, missing: missingShell, warnings };
}

// ─── App Shell 검사 ───────────────────────────────────────────────────────

function checkAppShell(html, js, boardId) {
  const warnings = [];
  const missing = [];
  const evidence = [];

  const checks = [
    { pat: 'data-stam-left-nav', src: 'html', label: 'data-stam-left-nav' },
    { pat: 'data-stam-topbar', src: 'html', label: 'data-stam-topbar' },
    { pat: 'data-stam-project-context', src: 'html', label: 'data-stam-project-context' },
    { pat: `navRender.init('${boardId}')`, src: 'both', label: `navRender.init('${boardId}')` },
  ];

  for (const c of checks) {
    const content = c.src === 'html' ? html : c.src === 'both' ? (html || '') + '\n' + (js || '') : js;
    if (!content) { missing.push(c.label); warnings.push(`${c.label} — 파일 없음`); continue; }
    if (content.includes(c.pat)) { evidence.push(c.pat); }
    else {
      missing.push(c.label);
      if (c.pat.includes('navRender') || c.pat.includes('data-stam-left-nav')) {
        warnings.push(`P0 후보: ${c.label} 누락`);
      }
    }
  }

  const p0 = missing.filter(m => m.includes('navRender') || m.includes('data-stam-left-nav'));
  if (p0.length > 0) return { status: 'CAUTION', evidence, missing, warnings, p0 };
  if (missing.length === 0) return { status: 'PASS', evidence, missing, warnings };
  return { status: 'PARTIAL', evidence, missing, warnings };
}

// ─── Form Controls 검사 ───────────────────────────────────────────────────

function checkFormControls(html, js, css, profile) {
  const combined = [html, js, css].filter(Boolean).join('\n');
  const patterns = ['stam-label', 'stam-input', 'stam-select', 'stam-textarea'];
  const found = collectEvidence(combined, patterns);
  const missing = patterns.filter(p => !combined.includes(p));

  if (profile === 'legacy-special-board') {
    const legacyClass = ['wbs-input', 'wbs-label', 'ss-input', 'ss-label', 'ss-form-control', 'wbs-form'];
    const hasLegacy = legacyClass.some(c => combined.includes(c));
    if (found.length > 0) return { status: 'PARTIAL', evidence: found, missing, warnings: [] };
    if (hasLegacy) return { status: 'LEGACY', evidence: legacyClass.filter(c => combined.includes(c)), missing: [], warnings: [] };
    return { status: 'LEGACY', evidence: [], missing: [], warnings: ['자체 form class 미확인 — legacy 추정'] };
  }

  if (found.length >= 3) return { status: 'PASS', evidence: found, missing, warnings: [] };
  if (found.length > 0) return { status: 'PARTIAL', evidence: found, missing, warnings: [] };
  return { status: 'TODO', evidence: [], missing: patterns, warnings: ['공통 form class 없음'] };
}

// ─── Drawer 검사 ──────────────────────────────────────────────────────────

function checkDrawer(html, js, css, profile) {
  const combined = [html, js, css].filter(Boolean).join('\n');
  const commonPatterns = ['stam-drawer', 'stam-drawer-scrim'];
  const legacyPatterns = ['wbs-drawer', 'wbs-drawer-overlay', 'ss-drawer', 'ss-dw-scrim', 'ss-detail-panel'];

  const foundCommon = collectEvidence(combined, commonPatterns);
  const foundLegacy = collectEvidence(combined, legacyPatterns);
  const warnings = [];
  const missing = commonPatterns.filter(p => !combined.includes(p));

  if (foundCommon.length >= 2) return { status: 'PASS', evidence: foundCommon, missing: [], warnings };
  if (foundCommon.length > 0) return { status: 'PARTIAL', evidence: foundCommon, missing, warnings };
  if (foundLegacy.length > 0) return { status: 'LEGACY', evidence: foundLegacy, missing: [], warnings };
  return { status: 'TODO', evidence: [], missing: commonPatterns, warnings: ['drawer 구현 미확인'] };
}

// ─── Table Row Selection 검사 ─────────────────────────────────────────────

function checkTableRowSelection(html, js, css) {
  const combined = [html, js, css].filter(Boolean).join('\n');
  const warnings = [];

  const hasStamRow = combined.includes('stam-table-row');
  const hasIsSelected = combined.includes('is-selected');
  const hasSel = /\bsel\b|\bselected\b/.test(combined);
  const hasCheckboxStop = combined.includes('stopPropagation') || combined.includes('e.stopPropagation') || combined.includes('event.stopPropagation');

  const evidence = [];
  if (hasStamRow) evidence.push('stam-table-row');
  if (hasIsSelected) evidence.push('is-selected');
  if (hasSel) evidence.push('sel/selected (legacy)');
  if (hasCheckboxStop) evidence.push('stopPropagation');

  // checkbox/row 충돌 가능성
  if (hasStamRow && hasSel && !hasIsSelected) {
    warnings.push('stam-table-row와 sel/selected 혼용 — 충돌 가능성');
  }
  if (combined.includes('checkbox') && !hasCheckboxStop) {
    warnings.push('checkbox 클릭에 stopPropagation 미확인 — row click 충돌 가능성');
  }

  if (hasStamRow && hasIsSelected) return { status: 'PASS', evidence, missing: [], warnings };
  if (hasStamRow && !hasIsSelected) return { status: 'PARTIAL', evidence, missing: ['is-selected'], warnings };
  if (hasSel) return { status: 'LEGACY', evidence, missing: ['stam-table-row', 'is-selected'], warnings };
  return { status: 'TODO', evidence, missing: ['stam-table-row', 'is-selected'], warnings: ['table row selection 미확인'] };
}

// ─── Buttons 검사 ─────────────────────────────────────────────────────────

function checkButtons(html, js, css) {
  const combined = [html, js, css].filter(Boolean).join('\n');
  const patterns = ['stam-btn-primary', 'stam-btn-secondary', 'stam-btn-ghost', 'stam-btn-outline', 'stam-btn-danger', 'stam-btn-warning'];
  const hasBase = combined.includes('stam-btn');
  const found = collectEvidence(combined, patterns);
  const missing = patterns.filter(p => !combined.includes(p));

  if (!hasBase) return { status: 'TODO', evidence: [], missing: ['stam-btn', ...patterns], warnings: ['stam-btn 없음'] };
  if (found.length >= 2) return { status: 'PASS', evidence: ['stam-btn', ...found], missing, warnings: [] };
  if (found.length > 0) return { status: 'PARTIAL', evidence: ['stam-btn', ...found], missing, warnings: [] };
  return { status: 'PARTIAL', evidence: ['stam-btn'], missing, warnings: ['stam-btn variant 제한적'] };
}

// ─── Board Toolbar 검사 ───────────────────────────────────────────────────

function checkBoardToolbar(html, js, css, profile) {
  const combined = [html, js, css].filter(Boolean).join('\n');
  const commonPatterns = ['stam-board-toolbar', 'stam-board-toolbar-left', 'stam-board-toolbar-base', 'stam-board-toolbar-right'];
  const legacyPatterns = ['wbs-filter-bar', 'wbs-toolbar', 'ss-toolbar', 'ss-top-bar', 'ss-filter-bar'];

  const foundCommon = collectEvidence(combined, commonPatterns);
  const foundLegacy = collectEvidence(combined, legacyPatterns);

  if (foundCommon.length >= 3) return { status: 'PASS', evidence: foundCommon, missing: commonPatterns.filter(p => !combined.includes(p)), warnings: [] };
  if (foundCommon.length > 0) return { status: 'PARTIAL', evidence: foundCommon, missing: commonPatterns.filter(p => !combined.includes(p)), warnings: [] };
  if (foundLegacy.length > 0) return { status: 'LEGACY', evidence: foundLegacy, missing: [], warnings: [] };
  return { status: 'TODO', evidence: [], missing: commonPatterns, warnings: ['toolbar 구현 미확인'] };
}

// ─── Board Filter 검사 ────────────────────────────────────────────────────

function checkBoardFilter(html, js, css, profile) {
  const combined = [html, js, css].filter(Boolean).join('\n');
  const commonPatterns = ['stam-board-filter-trigger', 'stam-board-filter-panel', 'STAM.boardFilter.init', 'stam.board-filter.js', 'stam.board-filter.css'];
  const legacyPatterns = ['wbs-filter-open-btn', 'wbs-filter-panel', 'wbs-fp-', 'ss-filter-', 'ss-fopt', 'initFilterPanel', 'toggleFilter'];

  const foundCommon = collectEvidence(combined, commonPatterns);
  const foundLegacy = collectEvidence(combined, legacyPatterns);
  const warnings = [];

  if (foundCommon.length >= 3) return { status: 'PASS', evidence: foundCommon, missing: [], warnings };
  if (foundCommon.length > 0) return { status: 'PARTIAL', evidence: foundCommon, missing: commonPatterns.filter(p => !combined.includes(p)), warnings };
  if (foundLegacy.length > 0) return { status: 'LEGACY', evidence: [...new Set(foundLegacy)], missing: [], warnings };
  return { status: 'TODO', evidence: [], missing: commonPatterns, warnings: ['filter 구현 미확인'] };
}

// ─── Inline Style / Dead Code 참고 검사 ──────────────────────────────────

function checkRefItems(html, js) {
  const notes = [];
  if (html && /<style[\s>]/.test(html)) notes.push('HTML 내 <style> 존재');
  if (js) {
    if (/_UNUSED/.test(js)) notes.push('_UNUSED 함수 존재');
    const todos = js.match(/\/\/\s*(TODO|FIXME|CAUTION)[^\n]*/g) || [];
    if (todos.length > 0) notes.push(`TODO/FIXME 주석 ${todos.length}건: ${todos.slice(0, 2).join(' | ')}`);
  }
  if (html) {
    const todos = html.match(/<!--\s*(TODO|FIXME|CAUTION)[^-]*/g) || [];
    if (todos.length > 0) notes.push(`HTML TODO/FIXME ${todos.length}건`);
  }
  return notes;
}

// ─── 보드 검사 메인 ───────────────────────────────────────────────────────

function auditBoard(board) {
  const { id, profile, navId, htmlPath, jsPath, cssPath, pageCss, pageJs } = board;

  const html = readFile(htmlPath);
  const js = readFile(jsPath);
  const css = readFile(cssPath);

  const missing = [];
  if (!html) missing.push(`HTML 없음: ${htmlPath}`);
  if (!js) missing.push(`JS 없음: ${jsPath}`);
  if (!css) missing.push(`CSS 없음: ${cssPath}`);

  const htmlContent = html || '';
  const jsContent = js || '';
  const cssContent = css || '';

  const cssOrder = checkCssOrder(htmlContent, profile, pageCss);
  const jsOrder = checkJsOrder(htmlContent, profile, pageJs);
  const appShell = checkAppShell(htmlContent, jsContent, navId);
  const formControls = checkFormControls(htmlContent, jsContent, cssContent, profile);
  const drawer = checkDrawer(htmlContent, jsContent, cssContent, profile);
  const tableRowSelection = checkTableRowSelection(htmlContent, jsContent, cssContent);
  const buttons = checkButtons(htmlContent, jsContent, cssContent);
  const boardToolbar = checkBoardToolbar(htmlContent, jsContent, cssContent, profile);
  const boardFilter = checkBoardFilter(htmlContent, jsContent, cssContent, profile);
  const refNotes = checkRefItems(htmlContent, jsContent);

  // P0: HTML/JS 파일 없음, App Shell P0
  const p0 = [
    ...missing.filter(m => m.includes('HTML 없음') || m.includes('JS 없음')),
    ...(appShell.p0 || []).map(p => `${id} App Shell P0: ${p}`),
    ...(jsOrder.p0 || []).map(p => `${id} JS P0: ${p}`),
  ];

  // P1: standard-board의 공통화 누락
  const p1 = [];
  if (profile === 'standard-board') {
    if (['PARTIAL', 'TODO', 'CAUTION'].includes(cssOrder.status)) p1.push(`${id} CSS 순서/공통화 개선 필요`);
    if (['PARTIAL', 'TODO', 'CAUTION'].includes(jsOrder.status)) p1.push(`${id} JS 순서/공통화 개선 필요`);
    if (['PARTIAL', 'TODO'].includes(formControls.status)) p1.push(`${id} Form Controls 공통화 미흡`);
    if (['PARTIAL', 'TODO'].includes(boardFilter.status)) p1.push(`${id} Board Filter 공통화 미흡`);
    if (['PARTIAL', 'TODO'].includes(boardToolbar.status)) p1.push(`${id} Board Toolbar 공통화 미흡`);
    if (['CAUTION'].includes(tableRowSelection.status) || tableRowSelection.warnings.length > 0) {
      p1.push(`${id} Table Row Selection 충돌 가능성`);
    }
  }
  if (profile === 'legacy-special-board') {
    if (cssOrder.warnings.some(w => w.includes('P0') || w.includes('CAUTION'))) p1.push(`${id} CSS 순서 주의`);
  }

  // P2: 참고 항목
  const p2 = refNotes.map(n => `${id}: ${n}`);
  if (profile === 'legacy-special-board' && ['PARTIAL', 'TODO'].includes(boardFilter.status) && !boardFilter.evidence.length) {
    p2.push(`${id} Board Filter 공통화 후보 (다음 단계)`);
  }

  return {
    id, profile, navId,
    files: { html: htmlPath, js: jsPath, css: cssPath },
    fileMissing: missing,
    checks: { cssOrder, jsOrder, appShell, formControls, drawer, tableRowSelection, buttons, boardToolbar, boardFilter },
    refNotes,
    p0, p1, p2,
  };
}

// ─── 보드 목록 정의 ───────────────────────────────────────────────────────

const BOARDS = [
  {
    id: 'requirements', profile: 'standard-board', navId: 'B1',
    htmlPath: 'stam/pages/boards/requirements.html',
    jsPath: 'stam/js/stam.requirements.js',
    cssPath: 'stam/css/stam.requirements.css',
    pageCss: 'stam.requirements.css',
    pageJs: 'stam.requirements.js',
  },
  {
    id: 'menu-screen-list', profile: 'standard-board', navId: 'B2',
    htmlPath: 'stam/pages/boards/menu-screen-list.html',
    jsPath: 'stam/js/stam.menu-screen-list.js',
    cssPath: 'stam/css/stam.menu-screen-list.css',
    pageCss: 'stam.menu-screen-list.css',
    pageJs: 'stam.menu-screen-list.js',
  },
  {
    id: 'wbs', profile: 'legacy-special-board', navId: 'B3',
    htmlPath: 'stam/pages/boards/wbs.html',
    jsPath: 'stam/js/stam.wbs.js',
    cssPath: 'stam/css/stam.wbs.css',
    pageCss: 'stam.wbs.css',
    pageJs: 'stam.wbs.js',
  },
  {
    id: 'screen-specification', profile: 'legacy-special-board', navId: 'B4',
    htmlPath: 'stam/pages/boards/screen-specification.html',
    jsPath: 'stam/js/stam.screen-specification.js',
    cssPath: 'stam/css/stam.screen-specification.css',
    pageCss: 'stam.screen-specification.css',
    pageJs: 'stam.screen-specification.js',
  },
  {
    id: 'functional-specification', profile: 'standard-board', navId: 'B5',
    htmlPath: 'stam/pages/boards/functional-specification.html',
    jsPath: 'stam/js/stam.functional-specification.js',
    cssPath: 'stam/css/stam.functional-specification.css',
    pageCss: 'stam.functional-specification.css',
    pageJs: 'stam.functional-specification.js',
  },
];

// ─── 실행 ─────────────────────────────────────────────────────────────────

const results = BOARDS.map(auditBoard);

const allP0 = results.flatMap(r => r.p0);
const allP1 = results.flatMap(r => r.p1);
const allP2 = results.flatMap(r => r.p2);

const overallStatus = allP0.length > 0 ? 'FAIL' : allP1.length > 0 ? 'CAUTION' : 'PASS';

// ─── JSON 리포트 ──────────────────────────────────────────────────────────

const jsonReport = {
  generatedAt: new Date().toISOString(),
  overallStatus,
  profiles: Object.fromEntries(BOARDS.map(b => [b.id, b.profile])),
  boards: {},
  findings: { P0: allP0, P1: allP1, P2: allP2 },
  recommendedNextActions: [
    'Table Row Selection 상태 class 정렬 (requirements, menu-screen-list is-selected 일관 적용)',
    '화면설계서 Board Toolbar / Board Filter 공통화 (다음 단계)',
    'Board Page Template HTML 파일 생성',
    'Form Controls alias 확대 (stam-input 통합)',
    'Drawer Policy 확장 문서화',
  ],
};

for (const r of results) {
  const statusSummary = Object.fromEntries(
    Object.entries(r.checks).map(([k, v]) => [k, v.status])
  );
  jsonReport.boards[r.id] = {
    profile: r.profile,
    navId: r.navId,
    status: statusSummary,
    files: r.files,
    fileMissing: r.fileMissing,
    details: Object.fromEntries(
      Object.entries(r.checks).map(([k, v]) => [k, {
        status: v.status,
        warnings: v.warnings || [],
        notes: v.notes || [],
        evidence: { combined: v.evidence || [] },
        missing: v.missing || [],
      }])
    ),
    refNotes: r.refNotes,
    p0: r.p0,
    p1: r.p1,
    p2: r.p2,
  };
}

// ─── Markdown 리포트 ──────────────────────────────────────────────────────

const BADGE = { PASS: '✅', PARTIAL: '⚠️', LEGACY: '🔵', CAUTION: '🔶', TODO: '❌', FAIL: '🚨' };

function badge(s) { return `${BADGE[s] || '❓'} ${s}`; }

const CHECK_LABELS = {
  cssOrder: 'CSS Order', jsOrder: 'JS Order', appShell: 'App Shell',
  formControls: 'Form Controls', drawer: 'Drawer', tableRowSelection: 'Table Row Sel',
  buttons: 'Buttons', boardToolbar: 'Board Toolbar', boardFilter: 'Board Filter',
};

const mdRows = results.map(r => {
  const cols = Object.entries(CHECK_LABELS).map(([k]) => badge(r.checks[k].status));
  return `| **${r.id}** | ${cols.join(' | ')} |`;
});

const header = `| Board | ${Object.values(CHECK_LABELS).join(' | ')} |`;
const divider = `|---|${Object.keys(CHECK_LABELS).map(() => '---').join('|')}|`;

let md = `# STAM Common UI Audit Result

> 자동 생성 — \`node scripts/audit-common-ui.mjs\`
> Generated: ${new Date().toISOString()}

---

## 1. Audit Summary

| 항목 | 값 |
|---|---|
| 생성 시각 | ${new Date().toISOString()} |
| 검사 보드 수 | ${results.length} |
| 전체 판단 | **${overallStatus}** |
| P0 | ${allP0.length}건 |
| P1 | ${allP1.length}건 |
| P2 | ${allP2.length}건 |

${overallStatus === 'FAIL' ? '> 🚨 **P0 발견 — 즉시 확인 필요**' : overallStatus === 'CAUTION' ? '> ⚠️ P0 없음. P1 개선 권장.' : '> ✅ P0/P1 없음. 전체 PASS.'}

---

## 2. Board Matrix

${header}
${divider}
${mdRows.join('\n')}

**범례**: ✅ PASS | ⚠️ PARTIAL | 🔵 LEGACY | 🔶 CAUTION | ❌ TODO

---

## 3. Board Detail

`;

for (const r of results) {
  md += `### ${r.id} \`${r.profile}\`\n\n`;
  md += `**파일**: \`${r.files.html}\` / \`${r.files.js}\` / \`${r.files.css}\`\n\n`;
  if (r.fileMissing.length > 0) md += `> ⚠️ 파일 누락: ${r.fileMissing.join(', ')}\n\n`;

  for (const [k, label] of Object.entries(CHECK_LABELS)) {
    const c = r.checks[k];
    md += `**${label}**: ${badge(c.status)}\n`;
    if (c.evidence && c.evidence.length > 0) md += `- 발견: \`${c.evidence.slice(0, 5).join('`  `')}\`\n`;
    if (c.missing && c.missing.length > 0) md += `- 누락: \`${c.missing.join('`  `')}\`\n`;
    if (c.warnings && c.warnings.length > 0) md += c.warnings.map(w => `- ⚠️ ${w}`).join('\n') + '\n';
    md += '\n';
  }

  if (r.refNotes.length > 0) {
    md += `**참고 (P2)**: ${r.refNotes.join(' / ')}\n\n`;
  }
  md += '---\n\n';
}

md += `## 4. P0 / P1 / P2 Findings\n\n`;

md += `### P0 — 즉시 확인 (${allP0.length}건)\n`;
if (allP0.length === 0) md += '_없음_\n';
else allP0.forEach(f => { md += `- 🚨 ${f}\n`; });

md += `\n### P1 — 다음 PR 권장 (${allP1.length}건)\n`;
if (allP1.length === 0) md += '_없음_\n';
else allP1.forEach(f => { md += `- ⚠️ ${f}\n`; });

md += `\n### P2 — 나중에 정리 (${allP2.length}건)\n`;
if (allP2.length === 0) md += '_없음_\n';
else allP2.forEach(f => { md += `- 🔵 ${f}\n`; });

md += `\n---\n\n## 5. Recommended Next Actions\n\n`;
jsonReport.recommendedNextActions.forEach((a, i) => { md += `${i + 1}. ${a}\n`; });

md += `\n---\n\n## 6. Notes\n\n`;
md += `- **WBS**: Legacy/Special Board. 자체 Gantt/Filter/Drawer/Toolbar 구조 보유. 즉시 공통화 대상 아님.\n`;
md += `- **화면설계서**: Legacy Board. 다음 단계에서 Toolbar/Filter부터 점진 공통화 후보.\n`;
md += `- **requirements / menu-screen-list**: Standard Board 기준 충족에 가까움. PARTIAL 항목 보완 권장.\n`;
md += `\n_이 리포트는 정적 검사 기반이며 런타임 동작을 보장하지 않습니다._\n`;

// ─── 리포트 파일 저장 ─────────────────────────────────────────────────────

const reportDir = path.join(ROOT, 'stam/docs/reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

fs.writeFileSync(path.join(reportDir, 'STAM_Common_UI_Audit_Result.md'), md, 'utf8');
fs.writeFileSync(path.join(reportDir, 'STAM_Common_UI_Audit_Result.json'), JSON.stringify(jsonReport, null, 2), 'utf8');

// ─── 콘솔 요약 ────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════╗');
console.log('║  STAM Common UI Audit — 실행 완료        ║');
console.log('╚══════════════════════════════════════════╝\n');
console.log(`전체 상태: ${overallStatus}  (P0: ${allP0.length}  P1: ${allP1.length}  P2: ${allP2.length})\n`);

for (const r of results) {
  const statuses = Object.entries(r.checks).map(([k, v]) => `${CHECK_LABELS[k]}:${v.status}`).join('  ');
  console.log(`[${r.id}]  ${statuses}`);
}

if (allP0.length > 0) { console.log('\n🚨 P0:'); allP0.forEach(f => console.log(`  - ${f}`)); }
if (allP1.length > 0) { console.log('\n⚠️  P1:'); allP1.forEach(f => console.log(`  - ${f}`)); }

console.log('\n리포트 저장:');
console.log('  stam/docs/reports/STAM_Common_UI_Audit_Result.md');
console.log('  stam/docs/reports/STAM_Common_UI_Audit_Result.json\n');
