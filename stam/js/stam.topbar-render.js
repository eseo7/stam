/* ============================================================
 * STAM Topbar Render — 공통 Topbar 렌더러
 * 의존: stam.theme.js (window.STAM.toggleTheme, localStorage stam.theme)
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
    ' width="16" height="16" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"' +
    ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var SUN_SVG =
    '<svg class="stam-theme-icon stam-theme-sun" viewBox="0 0 24 24" fill="none"' +
    ' width="16" height="16" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41' +
    'M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"' +
    ' stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

  var REFRESH_SVG =
    '<svg class="stam-topbar-action-icon" viewBox="0 0 16 16" fill="none"' +
    ' width="16" height="16" aria-hidden="true">' +
    '<path d="M14 2v4.5h-4.5" stroke="currentColor" stroke-width="1.8"' +
    ' stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M14 6.5A6 6 0 1 1 10 2.5" stroke="currentColor" stroke-width="1.8"' +
    ' stroke-linecap="round"/>' +
    '</svg>';

  var CHEVRON_DOWN_SVG =
    '<svg class="stam-topbar-user-chev-icon" viewBox="0 0 16 16" fill="none"' +
    ' width="12" height="12" aria-hidden="true">' +
    '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8"' +
    ' stroke-linecap="round" stroke-linejoin="round"/>' +
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

  function blockRefreshEvent(event) {
    if (!event) return;
    if (event.preventDefault)           event.preventDefault();
    if (event.stopPropagation)          event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }

  function showHardRefreshOverlay() {
    if (document.querySelector('[data-stam-overlay="hard-refresh"]')) return;
    var overlay = document.createElement('div');
    overlay.setAttribute('data-stam-overlay', 'hard-refresh');
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', '새로고침 중');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:var(--bg-base,#F8FAFC)', 'color:var(--t1,#0F172A)',
      'opacity:0', 'pointer-events:all', 'transition:opacity 120ms ease-out'
    ].join(';');
    overlay.innerHTML =
      '<div style="width:min(360px,calc(100vw - 48px));padding:28px 24px;' +
      'border:1px solid var(--bd,#E2E8F0);border-radius:18px;' +
      'background:var(--bg-sur,#FFFFFF);box-shadow:0 18px 48px rgba(15,23,42,.18);text-align:center;">' +
        '<div style="width:44px;height:44px;margin:0 auto 14px;border-radius:999px;' +
        'display:grid;place-items:center;color:var(--stam,#5451E8);' +
        'background:rgba(84,81,232,.12);font-size:24px;">↻</div>' +
        '<div style="font-size:15px;font-weight:800;color:var(--t1,#0F172A);">새로고침 중입니다</div>' +
        '<div style="margin-top:6px;font-size:13px;color:var(--t2,#475569);">최신 화면을 불러오고 있습니다.</div>' +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.style.opacity = '1'; });
  }

  function hardRefreshCurrentPage(event) {
    blockRefreshEvent(event);
    var ts = String(Date.now());
    try {
      sessionStorage.setItem('stam:hardRefreshTs', ts);
      sessionStorage.setItem('stam:skipSplashOnce', ts);
    } catch (e) {}
    showHardRefreshOverlay();
    window.setTimeout(function () { window.location.reload(); }, 80);
  }

  /* 페이지 로드 시 sessionStorage의 hardRefreshTs를 사용해 STAM CSS asset 강제 재요청.
   * skipSplash 플래그가 있으면 CSS 교체 전 inline style을 주입해 FOUC를 차단한다. */
  function applyAssetCacheBusting() {
    var ts = null;
    try { ts = sessionStorage.getItem('stam:hardRefreshTs'); } catch (e) {}
    if (!ts) return;
    try { sessionStorage.removeItem('stam:hardRefreshTs'); } catch (e) {}

    /* stam.shell.js의 applySkipSplashOnce()가 먼저 실행되어 이 attribute를 붙인다 */
    if (document.documentElement.getAttribute('data-stam-skip-splash') === 'true') {
      var shield = document.createElement('style');
      shield.setAttribute('data-stam-fouc-shield', '1');
      shield.textContent =
        '.po-topbar-logo img{max-width:28px!important;max-height:28px!important;object-fit:contain!important}' +
        '.wbs-drawer-panel{transform:translateX(100%)!important;transition:none!important}' +
        '.wbs-drawer-overlay{opacity:0!important;pointer-events:none!important}';
      document.head.appendChild(shield);
      window.setTimeout(function () {
        if (shield.parentNode) shield.parentNode.removeChild(shield);
        document.documentElement.removeAttribute('data-stam-skip-splash');
      }, 800);
    }

    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (!href || !/css\/stam\./.test(href)) return;
      var resolved = new URL(href, document.baseURI);
      resolved.searchParams.delete('_r');
      resolved.searchParams.set('_r', ts);
      var fresh = link.cloneNode(false);
      fresh.href = resolved.href;
      link.parentNode.replaceChild(fresh, link);
    });
  }

  function isDarkTheme() {
    if (window.STAM && typeof window.STAM.getTheme === 'function') {
      return window.STAM.getTheme() === 'dark';
    }
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function themeActionLabel(isDark) {
    return isDark ? '라이트모드로 전환' : '다크모드로 전환';
  }

  function themeIconSvg(isDark) {
    return isDark ? SUN_SVG : MOON_SVG;
  }

  /* ─── 테마 토글 — icon 1개 + 접근성 텍스트만 갱신 (title 미사용) ─── */
  function updateThemeButton(btn) {
    if (!btn) return;
    var isDark = isDarkTheme();
    var label  = themeActionLabel(isDark);
    btn.setAttribute('aria-label', label);
    btn.removeAttribute('title');

    var slot = btn.querySelector('.stam-theme-icon-slot');
    if (slot) {
      slot.innerHTML = themeIconSvg(isDark);
    }

    var hidden = btn.querySelector('.stam-visually-hidden');
    if (hidden) {
      hidden.textContent = label;
    }
  }

  /* wbs.js 등 후행 스크립트가 title을 재설정하는 경우 방어 */
  function bindThemeTitleGuard(btn) {
    if (!btn || btn.getAttribute('data-stam-title-guard') === '1') return;
    btn.setAttribute('data-stam-title-guard', '1');
    new MutationObserver(function () {
      btn.removeAttribute('title');
    }).observe(btn, { attributes: true, attributeFilter: ['title'] });
    requestAnimationFrame(function () {
      btn.removeAttribute('title');
    });
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
          '<button class="stam-btn stam-btn--sm stam-btn--ghost stam-topbar-action stam-topbar-refresh-btn" type="button"' +
            ' aria-label="강력 새로고침" title="최신 화면 다시 불러오기">' +
            REFRESH_SVG + '새로고침' +
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
            '<span class="stam-theme-icon-slot" aria-hidden="true">' +
              themeIconSvg(isDarkTheme()) +
            '</span>' +
            '<span class="stam-visually-hidden">' + themeActionLabel(isDarkTheme()) + '</span>' +
          '</button>' +
          '<button class="stam-btn stam-btn--sm stam-btn--ghost stam-topbar-user-btn"' +
            ' type="button" aria-label="사용자 메뉴 열기">PM 김이름 <span class="stam-topbar-user-chev">' + CHEVRON_DOWN_SVG + '</span></button>' +
        '</div>' +
      '</div>';

    /* 새로고침 버튼 — capture 페이즈로 등록해 drawer/document 핸들러보다 먼저 처리 */
    var refreshBtn = el.querySelector('.stam-topbar-refresh-btn');
    if (refreshBtn) {
      ['pointerdown', 'mousedown', 'mouseup'].forEach(function (type) {
        refreshBtn.addEventListener(type, blockRefreshEvent, true);
      });
      refreshBtn.addEventListener('click', hardRefreshCurrentPage);
    }

    var themeBtn = el.querySelector('.stam-theme-toggle');
    if (themeBtn) {
      updateThemeButton(themeBtn);
      bindThemeTitleGuard(themeBtn);
      themeBtn.addEventListener('click', function () {
        if (window.STAM && window.STAM.toggleTheme) {
          window.STAM.toggleTheme();
        }
        updateThemeButton(themeBtn);
      });
      var themeObs = new MutationObserver(function () {
        updateThemeButton(themeBtn);
      });
      themeObs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }
  }

  /* ─── init: DOMContentLoaded 또는 즉시 ─── */
  function init() {
    applyAssetCacheBusting();
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
