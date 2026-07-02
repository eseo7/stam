/* ============================================================
 * STAM Project Context Render — Top2 Project Context Bar 공통 렌더러
 *
 * 사용법 (각 페이지):
 *   <div class="po-ctx" data-stam-project-context
 *     data-pc-title="Project"
 *     data-pc-client="STAM"
 *     data-pc-stage="Overview"
 *     data-pc-status="진행중"
 *     data-pc-role="Member"
 *     data-pc-date=""
 *     data-pc-progress="0"
 *     data-pc-risk="정상"
 *     data-pc-risk-level="ok"
 *     data-pc-updated=""></div>
 *
 * IA Baseline v3.3 | 2026-06-11
 * ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    title: 'Project',
    client: 'STAM',
    stage: 'Overview',
    status: '진행중',
    role: 'Member',
    date: '',
    progress: '0',
    risk: '정상',
    riskLevel: 'ok',
    updated: ''
  };

  function attr(el, name, fallback) {
    var val = el.getAttribute(name);
    return val !== null && val !== '' ? val : fallback;
  }

  function normalizeProgress(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return '0';
    if (n < 0) return '0';
    if (n > 100) return '100';
    return String(n);
  }

  function renderProjectContext(el) {
    var title = attr(el, 'data-pc-title', DEFAULTS.title);
    var client = attr(el, 'data-pc-client', DEFAULTS.client);
    var stage = attr(el, 'data-pc-stage', DEFAULTS.stage);
    var status = attr(el, 'data-pc-status', DEFAULTS.status);
    var role = attr(el, 'data-pc-role', DEFAULTS.role);
    var date = attr(el, 'data-pc-date', DEFAULTS.date);
    var progress = normalizeProgress(attr(el, 'data-pc-progress', DEFAULTS.progress));
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
          '<progress class="po-ctx-prog-bar" value="' + progress + '" max="100">' + progress + '%</progress>' +
        '</div>' +
        '<div class="po-ctx-risk po-ctx-risk-' + riskLevel + '">' +
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
