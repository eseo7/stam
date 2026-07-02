/* ============================================================
 * STAM Nav Render — Left Menu 공통 렌더러
 * SSOT: stam.nav-data.js (window.STAM.data.menus[].href)
 * 의존: stam.nav-data.js → stam.shell.js → stam.nav-render.js
 *
 * 사용법 (각 페이지):
 *   <nav class="po-sidebar" data-stam-left-nav aria-label="프로젝트 내비게이션"></nav>
 *   window.STAM.navRender.init('A1');   ← active 메뉴 코드만 선언
 *
 * IA Baseline v3.3 | 2026-06-07
 * ============================================================ */
(function () {
  'use strict';

  var DEFAULT_PROJECT_CONTEXT = {
    title: 'Project',
    meta: 'Overview'
  };

  /* ─── 메뉴 검색 HTML ─── */
  var SEARCH_HTML =
    '<div class="po-sidebar-search">' +
      '<div class="po-search-wrap">' +
        '<svg class="po-search-icon" viewBox="0 0 14 14" fill="none">' +
          '<circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"></circle>' +
          '<path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>' +
        '</svg>' +
        '<input type="text" class="po-search-input" id="po-nav-search"' +
          ' placeholder="메뉴 검색 · ⌘K" autocomplete="off" spellcheck="false">' +
        '<button class="po-search-clear" id="po-search-clear" type="button" aria-label="검색 초기화">' +
          '<svg viewBox="0 0 10 10" fill="none">' +
            '<path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>';

  /* ─── stam/ 루트 기준 경로 → 현재 페이지 기준 상대 경로
   *    모든 페이지 위치: stam/pages/{group}/{page}.html (2단계 깊이)
   *    따라서 ../../ 로 stam/ 루트에 복귀 후 경로 접합 ─── */
  function toRelHref(stamRelPath) {
    if (!stamRelPath || stamRelPath === '#') return '#';
    return '../../' + stamRelPath;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function readProjectContextFromDataset(container) {
    return {
      title: clean(container.getAttribute('data-project-title')),
      stage: clean(container.getAttribute('data-project-stage')),
      status: clean(container.getAttribute('data-project-status')),
      role: clean(container.getAttribute('data-project-role')),
    };
  }

  function readProjectContextFromGlobal() {
    var ctx = (window.STAM && window.STAM.currentProjectContext) || {};
    return {
      title: clean(ctx.title || ctx.name || ctx.projectTitle),
      stage: clean(ctx.stage),
      status: clean(ctx.status),
      role: clean(ctx.role),
    };
  }

  function buildProjectMeta(ctx) {
    var parts = [ctx.stage, ctx.status, ctx.role].filter(Boolean);
    return parts.length ? parts.join(' · ') : '';
  }

  function resolveProjectContext(container) {
    var fromDataset = readProjectContextFromDataset(container);
    var datasetMeta = buildProjectMeta(fromDataset);
    if (fromDataset.title || datasetMeta) {
      return {
        title: fromDataset.title || DEFAULT_PROJECT_CONTEXT.title,
        meta: datasetMeta || DEFAULT_PROJECT_CONTEXT.meta,
      };
    }

    var fromGlobal = readProjectContextFromGlobal();
    var globalMeta = buildProjectMeta(fromGlobal);
    if (fromGlobal.title || globalMeta) {
      return {
        title: fromGlobal.title || DEFAULT_PROJECT_CONTEXT.title,
        meta: globalMeta || DEFAULT_PROJECT_CONTEXT.meta,
      };
    }

    return DEFAULT_PROJECT_CONTEXT;
  }

  function buildProjectBadgeHtml(container) {
    var ctx = resolveProjectContext(container);
    return '<div class="po-proj-badge">' +
      '<div class="po-proj-badge-name">' + esc(ctx.title) + '</div>' +
      '<div class="po-proj-badge-meta">' + esc(ctx.meta) + '</div>' +
    '</div>';
  }

  /* ─── nav-data의 href를 현재 페이지 기준 상대 경로로 변환 ─── */
  function buildHrefMap() {
    var menus = (window.STAM && window.STAM.data && window.STAM.data.menus) || [];
    var map = {};
    menus.forEach(function (m) {
      if (m.href && m.href !== '#') {
        map[m.id] = toRelHref(m.href);
      }
    });
    return map;
  }

  /* ─── nav 아이템 클릭 → 페이지 이동 ─── */
  function bindNavClicks(navEl, hrefMap) {
    navEl.addEventListener('click', function (e) {
      /* .closest 미지원 브라우저 대응 */
      var item = null;
      if (e.target.closest) {
        item = e.target.closest('.gitem[data-id]');
      } else {
        var t = e.target;
        while (t && t !== navEl) {
          if (t.classList && t.classList.contains('gitem') && t.getAttribute('data-id')) {
            item = t;
            break;
          }
          t = t.parentNode;
        }
      }
      if (!item) return;
      var id = item.getAttribute('data-id');
      if (hrefMap[id]) {
        e.stopPropagation();
        window.location.href = hrefMap[id];
      }
    });
  }

  /* ============================================================
   * init(activeId)
   * — [data-stam-left-nav] 컨테이너에 sidebar 전체를 주입하고
   *   renderSidebar / initSearch / nav click routing을 연결
   * ============================================================ */
  function init(activeId) {
    if (!window.STAM || !window.STAM.shell) {
      console.warn('[nav-render] stam.shell.js가 로드되지 않았습니다.');
      return;
    }

    var container = document.querySelector('[data-stam-left-nav]');
    if (!container) {
      console.warn('[nav-render] [data-stam-left-nav] 요소를 찾을 수 없습니다.');
      return;
    }

    /* 1. sidebar 내부 구조 주입 (proj-badge + search + nav target) */
    container.innerHTML =
      buildProjectBadgeHtml(container) +
      SEARCH_HTML +
      '<div id="po-sidebar-nav" class="po-sidebar-nav"></div>';

    var navEl    = container.querySelector('#po-sidebar-nav');
    var searchEl = container.querySelector('#po-nav-search');

    /* 2. 58개 메뉴 렌더 (stam.shell) */
    window.STAM.shell.renderSidebar(navEl, activeId);

    /* 3. 검색 초기화 */
    window.STAM.shell.initSearch(searchEl, navEl);

    /* 4. nav click → 페이지 이동 (nav-data[].href 기준) */
    var hrefMap = buildHrefMap();
    bindNavClicks(navEl, hrefMap);
  }

  /* ─── export ─── */
  window.STAM = window.STAM || {};
  window.STAM.navRender = { init: init };
}());
