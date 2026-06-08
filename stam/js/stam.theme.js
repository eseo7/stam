/* ============================================================
 * STAM Theme — 다크모드 토글
 * data-theme 속성만 토글. localStorage 미사용.
 * ============================================================ */
(function () {
  'use strict';

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '☀ 라이트모드' : '☾ 다크모드';
    });
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  /* 초기화: 현재 테마에 맞게 버튼 텍스트 동기화 */
  document.addEventListener('DOMContentLoaded', function () {
    setTheme(getTheme());
  });

  window.STAM = window.STAM || {};
  window.STAM.toggleTheme = toggleTheme;
  window.STAM.setTheme = setTheme;
  window.STAM.getTheme = getTheme;
}());
