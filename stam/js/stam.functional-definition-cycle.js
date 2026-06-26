/* ============================================================================
 * STAM 기능정의 게시판 — Local Core DB v2 목록 렌더러
 * ----------------------------------------------------------------------------
 * functionalDefinitions store(v2) 를 기준으로 기존 목록 테이블(#fn-tbody)을
 * 그린다. Excel/import 로 생성된 데이터와 사용자가 직접 등록한 데이터(sourceType
 * = manual)가 같은 목록에 함께 보인다. 기본 조회는 status !== deleted.
 *
 *  - 데이터가 없으면 정적 샘플을 쓰지 않고 empty state 를 표시한다(자동 seed/insert 금지).
 *  - 각 행에 data-fn-id 를 부여해 상세/수정/삭제(crud)가 record 를 식별한다.
 *  - CRUD 동작은 stam.functional-definition-crud.js 가 담당하며, 변경 후
 *    window.STAM.fnBoard.render() 로 목록을 다시 그린다.
 *
 * STAMBoardList 는 테이블 root 이벤트 위임이므로 행 교체 후 refresh 만 호출한다.
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001'; // import/seed 와 동일 projectId
  var STORE = 'functionalDefinitions';

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

  var AVA = ['#5451E8', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
  function avaColor(name) {
    var h = 0, s = String(name || '?');
    for (var i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % AVA.length;
    return AVA[h];
  }

  // v2 status/reviewStatus → 화면 상태 칩(한글)
  function statusInfo(rec) {
    var s = rec.status, r = rec.reviewStatus;
    if (s === 'deleted') return { label: '삭제됨', cls: 'fn-chip-hold' };
    if (s === 'confirmed') return { label: '승인완료', cls: 'fn-chip-done' };
    if (s === 'rejected') return { label: '보류', cls: 'fn-chip-hold' };
    if (s === 'reviewing') return (r === 'Approved')
      ? { label: '검토완료', cls: 'fn-chip-done' }
      : { label: '검토요청', cls: 'fn-chip-review' };
    return { label: '작성중', cls: 'fn-chip-draft' }; // draft (자동 생성 초안 포함)
  }
  function priInfo(p) {
    var m = {
      '상': ['fn-chip-high', '높음'], '높음': ['fn-chip-high', '높음'],
      '중': ['fn-chip-mid', '중간'], '중간': ['fn-chip-mid', '중간'],
      '하': ['fn-chip-low', '낮음'], '낮음': ['fn-chip-low', '낮음']
    };
    var v = m[p];
    return v ? { cls: v[0], label: v[1] } : { cls: 'fn-chip-mid', label: p || '중간' };
  }

  function ftypeOf(rec) { return rec.functionType || rec.requirementType || '기능'; }

  function rowHtml(rec) {
    var st = statusInfo(rec);
    var pr = priInfo(rec.priority);
    var owner = rec.owner || '미지정';
    var ini = esc(String(owner).charAt(0) || '?');
    var req = rec.requirementId
      ? '<span class="fn-link-chip">' + esc(rec.requirementId) + '</span>'
      : '<span class="fn-chip fn-chip-hold">연결 필요</span>';
    var scr = rec.linkedScreen
      ? '<span class="fn-link-chip fn-link-chip-scr">' + esc(rec.linkedScreen) + '</span>'
      : '<span style="font-size:11.5px;color:var(--t3)">—</span>';
    return '<tr class="fn-data-row stam-table-row" data-fn-id="' + esc(rec.id) + '">' +
      '<td class="fn-ch stam-check-cell"><input type="checkbox" class="fn-cb stam-check" onclick="event.stopPropagation()"></td>' +
      '<td><div class="fn-id-cell"><span class="fn-fn-id">' + esc(rec.id) + '</span>' +
        '<span class="fn-fn-name">' + esc(rec.title) + '</span></div></td>' +
      '<td>' + req + '</td>' +
      '<td>' + scr + '</td>' +
      '<td><span class="fn-chip fn-chip-type">' + esc(ftypeOf(rec)) + '</span></td>' +
      '<td><span class="fn-chip ' + pr.cls + '">' + esc(pr.label) + '</span></td>' +
      '<td><span class="fn-chip ' + st.cls + '">' + esc(st.label) + '</span></td>' +
      '<td><div style="display:flex;align-items:center;gap:5px">' +
        '<span class="fn-ava" style="background:' + avaColor(owner) + '">' + ini + '</span>' +
        '<span style="font-size:12px;color:var(--t2)">' + esc(owner) + '</span></div></td>' +
      '<td style="font-size:11.5px;color:var(--t3)">' + esc(dpart(rec.updatedAt) || '—') + '</td>' +
      '</tr>';
  }

  function emptyHtml() {
    return '<tr class="fn-empty-row"><td colspan="9" style="padding:0;border:0">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:48px 16px;text-align:center">' +
      '<div style="font-size:13px;font-weight:700;color:var(--t1)">아직 등록된 기능정의가 없습니다.</div>' +
      '<div style="font-size:12px;color:var(--t3);line-height:1.6">등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.</div>' +
      '</div></td></tr>';
  }

  function setCounts(n) {
    var ssNum = document.querySelector('.fn-ss-cell.on .fn-ss-num');
    if (ssNum) ssNum.textContent = n;
    var cnt = document.querySelector('.stam-board-count');
    if (cnt) cnt.innerHTML = '총 <b>' + n + '</b>건 중 <b>' + n + '</b>건 표시';
  }
  function addBadge() {
    var titleEl = document.querySelector('.fn-page-hdr-title');
    if (titleEl && !document.getElementById('fdc-srcbadge')) {
      titleEl.insertAdjacentHTML('beforeend',
        '<span id="fdc-srcbadge" class="fn-chip fn-chip-type" style="margin-left:8px;vertical-align:middle;font-size:10.5px">Local Core DB v2</span>');
    }
  }

  var tbody, listRoot;

  function render() {
    var db = window.STAM_CORE && window.STAM_CORE.db;
    if (!db || !tbody) return Promise.resolve();
    return db.listRecords(STORE, PID).then(function (list) {
      list = (list || []); // listRecords 기본 조회는 deleted 제외
      if (!list.length) {
        tbody.innerHTML = emptyHtml();
        setCounts(0);
        addBadge();
        if (listRoot && window.STAMBoardList && window.STAMBoardList.refresh) window.STAMBoardList.refresh(listRoot);
        return;
      }
      list.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
      tbody.innerHTML = list.map(rowHtml).join('');
      setCounts(list.length);
      addBadge();
      if (listRoot && window.STAMBoardList && window.STAMBoardList.refresh) window.STAMBoardList.refresh(listRoot);
    }).catch(function () { /* DB 오류 시 조용히: 기존 DOM 유지 */ });
  }

  window.STAM = window.STAM || {};
  window.STAM.fnBoard = {
    PID: PID,
    STORE: STORE,
    render: render,
    statusInfo: statusInfo,
    priInfo: priInfo,
    ftypeOf: ftypeOf,
    esc: esc,
    dpart: dpart
  };

  ready(function () {
    tbody = document.getElementById('fn-tbody');
    listRoot = document.querySelector('[data-stam-board-list]');
    if (!tbody) return;
    render();
  });
}());
