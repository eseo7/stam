/* ============================================================
 * STAM Theme — 다크모드 토글 + 전역 유지
 * document.documentElement[data-theme] + localStorage(stam.theme)
 * ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'stam.theme';
  var DEFAULT_THEME = 'light';

  function normalizeTheme(theme) {
    return theme === 'dark' ? 'dark' : 'light';
  }

  function getStoredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (e) { /* private browsing */ }
    return null;
  }

  function syncToggleButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '☀ 라이트모드' : '☾ 다크모드';
    });
  }

  function applyThemeToDom(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    syncToggleButtons(theme);
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) { /* private browsing */ }
  }

  function getTheme() {
    var stored = getStoredTheme();
    if (stored) return stored;
    return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
  }

  function setTheme(theme, options) {
    var opts = options || {};
    var next = normalizeTheme(theme);
    applyThemeToDom(next);
    if (opts.persist !== false) {
      persistTheme(next);
    }
    return next;
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || getTheme();
    return setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    var stored = getStoredTheme();
    if (stored) {
      applyThemeToDom(stored);
      return stored;
    }
    var fallback = normalizeTheme(
      document.documentElement.getAttribute('data-theme') || DEFAULT_THEME
    );
    applyThemeToDom(fallback);
    return fallback;
  }

  /* 스크립트 로드 즉시 복원 — 하드코딩된 html data-theme 덮어쓰기 */
  initTheme();

  document.addEventListener('DOMContentLoaded', function () {
    syncToggleButtons(getTheme());
  });

  window.STAM = window.STAM || {};
  window.STAM.toggleTheme = toggleTheme;
  window.STAM.setTheme = setTheme;
  window.STAM.getTheme = getTheme;
  window.STAM.initTheme = initTheme;
  window.STAM.theme = {
    STORAGE_KEY: STORAGE_KEY,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    initTheme: initTheme,
  };
}());
