/* ============================================================
 * STAM Project Context Render — Top2 Project Context Bar 공통 렌더러
 *
 * 사용법 (각 페이지):
 *   <div class="po-ctx" data-stam-project-context
 *     data-pc-title="파르나스 리뉴얼 구축"
 *     data-pc-client="파르나스호텔"
 *     data-pc-stage="설계 단계"
 *     data-pc-status="진행중"
 *     data-pc-role="Project Admin / PM"
 *     data-pc-date="기준일 2026-06-07"
 *     data-pc-progress="42"
 *     data-pc-risk="주의"
 *     data-pc-risk-level="warn"
 *     data-pc-updated="업데이트 오늘 10:42"></div>
 *
 * IA Baseline v3.3 | 2026-06-11
 * ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    title: '파르나스 리뉴얼 구축',
    client: '파르나스호텔',
    stage: '설계 단계',
    status: '진행중',
    role: 'Project Admin / PM',
    date: '기준일 2026-06-07',
    progress: '42',
    risk: '주의',
    riskLevel: 'warn',
    updated: '업데이트 오늘 10:42'
  };

  function attr(el, name, fallback) {
    var val = el.getAttribute(name);
    return val !== null && val !== '' ? val : fallback;
  }

  function renderProjectContext(el) {
    var title = attr(el, 'data-pc-title', DEFAULTS.title);
    var client = attr(el, 'data-pc-client', DEFAULTS.client);
    var stage = attr(el, 'data-pc-stage', DEFAULTS.stage);
    var status = attr(el, 'data-pc-status', DEFAULTS.status);
    var role = attr(el, 'data-pc-role', DEFAULTS.role);
    var date = attr(el, 'data-pc-date', DEFAULTS.date);
    var progress = attr(el, 'data-pc-progress', DEFAULTS.progress);
    var risk = attr(el, 'data-pc-risk', DEFAULTS.risk);
    var riskLevel = attr(el, 'data-pc-risk-level', DEFAULTS.riskLevel);
    var updated = attr(el, 'data-pc-updated', DEFAULTS.updated);

    el.innerHTML =
      '<div class="po-ctx-left">' +
        '<div class="po-ctx-title">' + title + '</div>' +
        '<div class="po-ctx-meta">' +
          '<span class="po-ctx-chip">' + client + '</span>' +
          '<span class="po-ctx-chip po-chip-stage">' + stage + '</span>' +
          '<span class="po-ctx-chip po-chip-active">' + status + '</span>' +
          '<span class="po-ctx-chip">' + role + '</span>' +
          '<span class="po-ctx-date">' + date + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="po-ctx-right">' +
        '<div class="po-ctx-prog-wrap">' +
          '<div class="po-ctx-prog-top">' +
            '<span class="po-ctx-prog-label">전체 진행률</span>' +
            '<span class="po-ctx-prog-val">' + progress + '%</span>' +
          '</div>' +
          '<div class="po-ctx-prog-bar">' +
            '<div class="po-ctx-prog-fill" style="width:' + progress + '%"></div>' +
          '</div>' +
        '</div>' +
        '<div class="po-ctx-risk">' +
          '<span class="po-ctx-risk-dot ' + riskLevel + '-dot"></span>' +
          '위험도 <strong>' + risk + '</strong>' +
        '</div>' +
        '<div class="po-ctx-updated">' + updated + '</div>' +
      '</div>';
  }

  function init() {
    document.querySelectorAll('[data-stam-project-context]').forEach(renderProjectContext);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.STAM = window.STAM || {};
  window.STAM.projectContextRender = { init: init };
}());
