/* ============================================================
 * STAM Topbar Render — 공통 Topbar 렌더러
 * 의존: stam.theme.js (window.STAM.toggleTheme)
 *
 * 사용법 (각 페이지):
 *   <header class="po-topbar" data-stam-topbar
 *     data-tb-crumbs="내 프로젝트|파르나스 리뉴얼 구축|현재 메뉴"
 *     data-tb-client="파르나스호텔"></header>
 *
 * breadcrumb 규칙:
 *   - 첫 번째 항목 → ../../index.html 링크
 *   - 중간 항목    → 텍스트
 *   - 마지막 항목  → 현재 페이지 (dimmed)
 *
 * IA Baseline v3.3 | 2026-06-07
 * ============================================================ */
(function () {
  'use strict';

  var MOON_SVG =
    '<svg class="stam-theme-icon stam-theme-moon" viewBox="0 0 24 24" fill="none"' +
    ' width="14" height="14" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"' +
    ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var SUN_SVG =
    '<svg class="stam-theme-icon stam-theme-sun" viewBox="0 0 24 24" fill="none"' +
    ' width="14" height="14" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42' +
    'M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"' +
    ' stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

  /* ─── 테마 토글 aria-label 갱신 ─── */
  function updateThemeLabel(btn) {
    if (!btn) return;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var label  = isDark ? '라이트모드로 전환' : '다크모드로 전환';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  /* ─── Topbar 전체 렌더링 ─── */
  function renderTopbar(el) {
    var crumbs = (el.getAttribute('data-tb-crumbs') || '').split('|').filter(Boolean);
    var client = el.getAttribute('data-tb-client') || '';

    /* breadcrumb HTML */
    var bcHtml = '';
    crumbs.forEach(function (crumb, i) {
      if (i > 0) bcHtml += '<span class="po-topbar-sep">›</span>';
      if (i === 0) {
        /* 첫 항목: 홈 링크 */
        bcHtml += '<a href="../../index.html" class="po-topbar-home">' + crumb + '</a>';
      } else if (i === crumbs.length - 1) {
        /* 마지막 항목: 현재 페이지 (dimmed) */
        bcHtml += '<span class="po-topbar-proj" style="color:rgba(255,255,255,.60)">' + crumb + '</span>';
      } else {
        /* 중간 항목: 프로젝트명 등 */
        bcHtml += '<span class="po-topbar-proj">' + crumb + '</span>';
      }
    });

    el.innerHTML =
      /* 로고 */
      '<a class="po-topbar-logo" href="../../index.html" title="STAM 홈으로">' +
        '<img src="../../assets/brand/stam/stam_icon_primary_transparent.png" alt="STAM 아이콘">' +
        '<span class="po-topbar-logo-txt">STAM</span>' +
      '</a>' +
      /* breadcrumb */
      '<div class="po-topbar-breadcrumb">' + bcHtml + '</div>' +
      /* 고객사 */
      (client ? '<div class="po-topbar-client">' + client + '</div>' : '') +
      /* spacer */
      '<div class="po-topbar-sp"></div>' +
      /* 액션 영역 */
      '<div class="po-topbar-actions">' +
        '<button class="tbtn" type="button">검색</button>' +
        '<button class="tbtn" type="button">알림 <span class="po-notif-badge">3</span></button>' +
        '<button class="tbtn" type="button">내보내기</button>' +
        '<button class="tbtn" type="button">PM 김이름 ∨</button>' +
        '<button class="stam-theme-toggle" type="button">' +
          MOON_SVG + SUN_SVG +
        '</button>' +
      '</div>';

    /* 테마 토글 클릭 바인딩 */
    var themeBtn = el.querySelector('.stam-theme-toggle');
    if (themeBtn) {
      updateThemeLabel(themeBtn);
      themeBtn.addEventListener('click', function () {
        if (window.STAM && window.STAM.toggleTheme) {
          window.STAM.toggleTheme();
        }
        updateThemeLabel(themeBtn);
      });
    }
  }

  /* ─── init: DOMContentLoaded 또는 즉시 ─── */
  function init() {
    var el = document.querySelector('[data-stam-topbar]');
    if (!el) return;
    renderTopbar(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.STAM = window.STAM || {};
  window.STAM.topbarRender = { init: init };
}());
