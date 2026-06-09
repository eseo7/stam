/* ============================================================
 * STAM Topbar Render — 공통 Topbar 렌더러
 * 의존: stam.theme.js (window.STAM.toggleTheme)
 *
 * 사용법 (각 페이지):
 *   <header class="po-topbar stam-topbar" data-stam-topbar
 *     data-tb-crumbs="내 프로젝트|파르나스 리뉴얼 구축|현재 메뉴"
 *     data-tb-client="파르나스호텔"
 *     data-tb-search-placeholder="작업명·담당자 검색"></header>
 *
 * breadcrumb 규칙:
 *   - 첫 번째 항목 → ../../index.html 링크
 *   - 중간 항목    → 텍스트
 *   - 마지막 항목  → 현재 페이지 (dimmed)
 *
 * IA Baseline v3.3 | Topbar Guide v1 | 2026-06-09
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

  var SEARCH_SVG =
    '<svg viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>' +
    '<path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var BELL_SVG =
    '<svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">' +
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"' +
    ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round"/>' +
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
    el.classList.add('stam-topbar');

    var crumbs = (el.getAttribute('data-tb-crumbs') || '').split('|').filter(Boolean);
    var client = el.getAttribute('data-tb-client') || '';
    var searchPh = el.getAttribute('data-tb-search-placeholder') || '현재 화면 검색';

    /* breadcrumb HTML */
    var bcHtml = '';
    crumbs.forEach(function (crumb, i) {
      if (i > 0) bcHtml += '<span class="po-topbar-sep">›</span>';
      if (i === 0) {
        bcHtml += '<a href="../../index.html" class="po-topbar-home">' + crumb + '</a>';
      } else if (i === crumbs.length - 1) {
        bcHtml += '<span class="po-topbar-proj" style="color:rgba(255,255,255,.60)">' + crumb + '</span>';
      } else {
        bcHtml += '<span class="po-topbar-proj">' + crumb + '</span>';
      }
    });

    el.innerHTML =
      /* LEFT — logo · breadcrumb · client */
      '<div class="stam-topbar-left">' +
        '<a class="po-topbar-logo" href="../../index.html" title="STAM 홈으로">' +
          '<img src="../../assets/brand/stam/stam_icon_primary_transparent.png" alt="STAM 아이콘">' +
          '<span class="po-topbar-logo-txt">STAM</span>' +
        '</a>' +
        '<div class="po-topbar-breadcrumb">' + bcHtml + '</div>' +
        (client ? '<div class="po-topbar-client">' + client + '</div>' : '') +
      '</div>' +
      /* CENTER — screen search entry */
      '<div class="stam-topbar-center">' +
        '<button class="stam-topbar-search stam-btn stam-btn--sm stam-btn--ghost" type="button"' +
          ' data-tb-search-trigger aria-label="검색 열기">' +
          SEARCH_SVG +
          '<span class="stam-topbar-search-label">' + searchPh + '</span>' +
        '</button>' +
      '</div>' +
      /* RIGHT — work actions · utilities */
      '<div class="stam-topbar-right">' +
        '<div class="stam-topbar-actions-work">' +
          '<button class="stam-btn stam-btn--sm stam-btn--ghost stam-topbar-action" type="button">내보내기</button>' +
        '</div>' +
        '<div class="stam-topbar-actions-sep" aria-hidden="true"></div>' +
        '<div class="stam-topbar-actions-util">' +
          '<button class="stam-btn stam-btn--sm stam-btn--icon-only stam-btn--ghost stam-topbar-notif-btn"' +
            ' type="button" aria-label="알림 3건">' +
            BELL_SVG +
            '<span class="po-notif-badge stam-topbar-notif-badge">3</span>' +
          '</button>' +
          '<button class="stam-btn stam-btn--sm stam-btn--ghost stam-topbar-user-btn"' +
            ' type="button" aria-label="사용자 메뉴 열기">PM 김이름 <span class="stam-topbar-user-chev">∨</span></button>' +
          '<button class="stam-theme-toggle stam-btn stam-btn--sm stam-btn--icon-only" type="button">' +
            MOON_SVG + SUN_SVG +
          '</button>' +
        '</div>' +
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
    document.querySelectorAll('[data-stam-topbar]').forEach(renderTopbar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.STAM = window.STAM || {};
  window.STAM.topbarRender = { init: init };
}());
