/* ============================================================================
 * STAM 메뉴구조/화면목록 — Local Core DB v2 목록 통합 렌더러
 * ----------------------------------------------------------------------------
 * menuScreens store(v2) 데이터를 기존 메뉴/화면 단일 목록(#msl-tbody)에
 * "하나의 목록"으로 통합 주입한다. 하단 별도 목록/개발자 라벨 없음.
 *   - DOM ready 시 캐시 로드 후 injectGroup()으로 tbody 상단에 v2 그룹 주입.
 *   - refresh() 호출 시 캐시 재로드 + 재주입.
 *   - 자동 생성 그룹에는 + 등록 버튼 없음. 안내 문구만 표시.
 *
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001';
  var STORE = 'menuScreens';
  var cache = [];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function dpart(iso) { return String(iso || '').replace('T', ' ').slice(0, 10); }

  function statusTone(rec) {
    var s = rec.status;
    if (s === 'confirmed') return 'is-pass';
    if (s === 'hold')      return 'is-fail';
    if (s === 'reviewing') return 'is-warn';
    if (s === 'deleted')   return '';
    return '';
  }

  function statusLabel(rec) {
    var s = rec.status;
    if (s === 'deleted')   return '삭제됨';
    if (s === 'confirmed') return '확정';
    if (s === 'hold')      return '보류';
    if (s === 'reviewing') return '검토중';
    return '작성중';
  }

  function statusChip(rec) {
    var tone = statusTone(rec);
    var cls = 'stam-detail-chip' + (tone ? ' ' + tone : '');
    return '<span class="' + cls + '">' + esc(statusLabel(rec)) + '</span>';
  }

  // 10개 컬럼 구조에 맞춤: 체크/ID·이름/LV1/LV2/화면유형/FO-BO/연결요구사항/연결화면설계서/상태/수정일
  function rowHtml(rec) {
    return '<tr class="stam-board-data-row stam-table-row msl-data-row" data-msv2-id="' + esc(rec.id) + '">' +
      '<td class="msl-ch stam-check-cell"></td>' +
      '<td><div class="msl-id-cell">' +
        '<span class="msl-scr-id">' + esc(rec.id) + '</span>' +
        '<span class="msl-scr-name">' + esc(rec.screenName || rec.menuName || '(이름 없음)') + '</span>' +
      '</div></td>' +
      '<td><span class="msl-lv-text">' + esc(rec.lv1 || '—') + '</span></td>' +
      '<td><span class="msl-lv-text">' + esc(rec.lv2 || '—') + '</span></td>' +
      '<td><span class="msl-lv-text">' + esc(rec.screenType || '—') + '</span></td>' +
      '<td><span class="msl-lv-text">' + esc(rec.channel || '—') + '</span></td>' +
      '<td>' + (rec.requirementId
        ? '<span class="stam-link-chip">' + esc(rec.requirementId) + '</span>'
        : '<span class="stam-link-chip is-muted">미연결</span>') + '</td>' +
      '<td>' + (rec.screenSpecificationId
        ? '<span class="stam-link-chip is-spec">' + esc(rec.screenSpecificationId) + '</span>'
        : '<span class="stam-link-chip is-muted">미작성</span>') + '</td>' +
      '<td>' + statusChip(rec) + '</td>' +
      '<td class="msl-date">' + esc(dpart(rec.updatedAt)) + '</td>' +
    '</tr>';
  }

  function injectGroup() {
    var tbody = document.getElementById('msl-tbody');
    if (!tbody) return;
    // 이전 주입 행 제거
    tbody.querySelectorAll('.stam-board-group-row, .stam-board-data-row').forEach(function (r) { r.remove(); });
    if (!cache.length) return;
    var head = '<tr class="stam-board-group-row">' +
      '<td class="msl-ch stam-check-cell"></td>' +
      '<td colspan="9"><div class="stam-board-group-cell">' +
        '<svg class="stam-board-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
        '<span class="stam-board-group-name">요구사항 연계 메뉴/화면</span>' +
        '<span class="stam-board-group-separator"></span>' +
        '<span class="stam-board-group-count">' + cache.length + '개 화면</span>' +
        '<span class="stam-board-group-notice">요구사항 가져오기로 생성된 메뉴/화면 초안입니다. 상세 확인 후 수정하거나 확정하세요.</span>' +
      '</div></td>' +
    '</tr>';
    var rows = cache.slice().sort(function (a, b) {
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    }).map(rowHtml).join('');
    tbody.insertAdjacentHTML('afterbegin', head + rows);
  }

  function loadCache() {
    var d = window.STAM_CORE && window.STAM_CORE.db;
    if (!d) return Promise.resolve();
    return d.listRecords(STORE, PID).then(function (list) { cache = list || []; }).catch(function () { cache = []; });
  }

  function refresh() {
    return loadCache().then(function () { injectGroup(); });
  }

  window.STAM = window.STAM || {};
  window.STAM.mslv2 = { refresh: refresh, injectGroup: injectGroup };

  ready(function () {
    loadCache().then(function () { injectGroup(); });
  });
}());
