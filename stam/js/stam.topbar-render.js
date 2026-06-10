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
    '<svg class="stam-theme-icon stam-theme-moon" viewBox="0 0 16 16" fill="none"' +
    ' width="16" height="16" aria-hidden="true">' +
    '<path d="M13.2 9.4a5.4 5.4 0 1 1-3.9-9.1 5.4 5.4 0 0 1 3.9 9.1z"' +
    ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var SUN_SVG =
    '<svg class="stam-theme-icon stam-theme-sun" viewBox="0 0 16 16" fill="none"' +
    ' width="16" height="16" aria-hidden="true">' +
    '<circle cx="8" cy="8" r="3.2" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M3.8 3.8l1 1M11.2 11.2l1 1' +
    'M3.8 12.2l1-1M11.2 4.8l1-1"' +
    ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '</svg>';

  var DOWNLOAD_SVG =
    '<svg class="stam-topbar-action-icon" viewBox="0 0 16 16" fill="none"' +
    ' width="16" height="16" aria-hidden="true">' +
    '<path d="M8 2.5v6.8M8 9.3L5.6 6.9M8 9.3l2.4-2.4M3.5 11.5h9"' +
    ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var SEARCH_SVG =
    '<svg viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>' +
    '<path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var BELL_SVG =
    '<svg class="stam-topbar-icon" viewBox="0 0 16 16" fill="none" width="16" height="16"' +
    ' aria-hidden="true">' +
    '<path d="M4 6.2a4 4 0 0 1 8 0c0 4.6 2 6 2 6H2s2-1.4 2-6"' +
    ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M6.5 12.8a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.8"' +
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
    var hasNotif = el.getAttribute('data-tb-notif') !== 'false';

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
        '<button class="stam-topbar-search stam-btn stam-btn--sm" type="button"' +
          ' data-tb-search-trigger aria-label="검색 열기">' +
          SEARCH_SVG +
          '<span class="stam-topbar-search-label">' + searchPh + '</span>' +
        '</button>' +
      '</div>' +
      /* RIGHT — work actions · utilities */
      '<div class="stam-topbar-right">' +
        '<div class="stam-topbar-actions-work">' +
          '<button class="stam-btn stam-btn--sm stam-btn--ghost stam-topbar-action" type="button"' +
            ' aria-label="내보내기">' +
            DOWNLOAD_SVG + '내보내기' +
          '</button>' +
        '</div>' +
        '<div class="stam-topbar-actions-sep" aria-hidden="true"></div>' +
        '<div class="stam-topbar-actions-util">' +
          '<button class="stam-btn stam-btn--sm stam-btn--icon-only stam-btn--ghost stam-topbar-notif-btn stam-topbar-notification"' +
            ' type="button" aria-label="' + (hasNotif ? '알림 있음' : '알림') + '">' +
            BELL_SVG +
            (hasNotif
              ? '<span class="stam-notification-dot stam-topbar-notif-dot" aria-hidden="true"></span>' +
                '<span class="stam-visually-hidden">읽지 않은 알림 있음</span>'
              : '') +
          '</button>' +
          '<button class="stam-theme-toggle stam-topbar-theme stam-btn stam-btn--sm stam-btn--icon-only" type="button">' +
            MOON_SVG + SUN_SVG +
          '</button>' +
          '<button class="stam-btn stam-btn--sm stam-btn--ghost stam-topbar-user-btn"' +
            ' type="button" aria-label="사용자 메뉴 열기">PM 김이름 <span class="stam-topbar-user-chev">∨</span></button>' +
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
