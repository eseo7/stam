/* ============================================================================
 * STAM 요구사항 게시판 — Local Core DB v2 목록 렌더러
 * ----------------------------------------------------------------------------
 * requirements store(v2) 를 기준으로 기존 목록 테이블(#rq-tbody)을 그린다.
 * Excel/import 로 생성된 요구사항과 직접 등록(sourceType=manual) 요구사항이
 * 같은 목록에 함께 보인다. 기본 조회는 status !== deleted.
 *
 *  - 데이터가 없으면 정적 샘플을 쓰지 않고 empty state 표시(자동 seed/insert 금지).
 *  - 각 행에 data-rq-id 부여 → 상세/수정/삭제(crud)가 record 식별.
 *  - CRUD 는 stam.requirements-crud.js 가 담당, 변경 후 window.STAM.rqBoard.render().
 *
 * STAMBoardList 는 테이블 root 이벤트 위임 — 행 교체 후 refresh 만 호출.
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001'; // import/seed 와 동일 projectId
  var STORE = 'requirements';

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
    if (s === 'deleted') return { label: '삭제됨', cls: 'rq-chip-hold' };
    if (s === 'confirmed') return { label: '승인완료', cls: 'rq-chip-approved' };
    if (s === 'rejected') return { label: '보류', cls: 'rq-chip-hold' };
    if (s === 'reviewing') return (r === 'Approved')
      ? { label: '검토완료', cls: 'rq-chip-done' }
      : { label: '검토요청', cls: 'rq-chip-review' };
    return { label: '작성중', cls: 'rq-chip-draft' }; // draft (자동 생성 초안 포함)
  }
  function priInfo(p) {
    var m = {
      '상': ['rq-chip-high', '높음'], '높음': ['rq-chip-high', '높음'],
      '중': ['rq-chip-mid', '보통'], '중간': ['rq-chip-mid', '보통'], '보통': ['rq-chip-mid', '보통'],
      '하': ['rq-chip-low', '낮음'], '낮음': ['rq-chip-low', '낮음']
    };
    var v = m[p];
    return v ? { cls: v[0], label: v[1] } : { cls: 'rq-chip-mid', label: p || '보통' };
  }
  function typeOf(rec) { return rec.requirementType || '기능'; }
  function ownerOf(rec) { return rec.owner || rec.actor || '미지정'; }

  function rowHtml(rec) {
    var st = statusInfo(rec);
    var pr = priInfo(rec.priority);
    var owner = ownerOf(rec);
    var ini = esc(String(owner).charAt(0) || '?');
    var scr = rec.linkedScreenSpec
      ? '<span class="rq-link-chip">' + esc(rec.linkedScreenSpec) + '</span>'
      : '<span style="font-size:11.5px;color:var(--t3)">—</span>';
    var wbs = rec.linkedWbs
      ? '<span class="rq-link-chip">' + esc(rec.linkedWbs) + '</span>'
      : '<span style="font-size:11.5px;color:var(--t3)">—</span>';
    return '<tr class="rq-data-row stam-table-row" data-rq-id="' + esc(rec.id) + '">' +
      '<td class="rq-ch stam-check-cell"><input type="checkbox" class="rq-cb stam-check" onclick="event.stopPropagation()"></td>' +
      '<td><div class="rq-req-id-cell"><span class="rq-req-id">' + esc(rec.id) + '</span>' +
        '<span class="rq-req-name">' + esc(rec.title) + '</span></div></td>' +
      '<td><span class="rq-chip rq-chip-type">' + esc(typeOf(rec)) + '</span></td>' +
      '<td><span class="rq-chip ' + pr.cls + '">' + esc(pr.label) + '</span></td>' +
      '<td><span class="rq-chip ' + st.cls + '">' + esc(st.label) + '</span></td>' +
      '<td><div style="display:flex;align-items:center;gap:5px">' +
        '<span class="rq-ava" style="background:' + avaColor(owner) + '">' + ini + '</span>' +
        '<span style="font-size:12px;color:var(--t2)">' + esc(owner) + '</span></div></td>' +
      '<td>' + scr + '</td>' +
      '<td>' + wbs + '</td>' +
      '<td style="font-size:11.5px;color:var(--t3)">' + esc(dpart(rec.updatedAt) || '—') + '</td>' +
      '</tr>';
  }

  function emptyHtml() {
    return '<tr class="rq-empty-row"><td colspan="9" style="padding:0;border:0">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:48px 16px;text-align:center">' +
      '<div style="font-size:13px;font-weight:700;color:var(--t1)">아직 등록된 요구사항이 없습니다.</div>' +
      '<div style="font-size:12px;color:var(--t3);line-height:1.6">등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.</div>' +
      '</div></td></tr>';
  }

  function setCounts(n) {
    var ssNum = document.querySelector('.rq-ss-cell.on .rq-ss-num');
    if (ssNum) ssNum.textContent = n;
    var cnt = document.querySelector('.stam-board-count');
    if (cnt) cnt.innerHTML = '총 <b>' + n + '</b>건 중 <b>' + n + '</b>건 표시';
  }
  function addBadge() {
    var titleEl = document.querySelector('.rq-page-hdr-title');
    if (titleEl && !document.getElementById('rqc-srcbadge')) {
      titleEl.insertAdjacentHTML('beforeend',
        '<span id="rqc-srcbadge" class="rq-chip rq-chip-type" style="margin-left:8px;vertical-align:middle;font-size:10.5px">Local Core DB v2</span>');
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
  window.STAM.rqBoard = {
    PID: PID,
    STORE: STORE,
    render: render,
    statusInfo: statusInfo,
    priInfo: priInfo,
    typeOf: typeOf,
    ownerOf: ownerOf,
    esc: esc,
    dpart: dpart
  };

  ready(function () {
    tbody = document.getElementById('rq-tbody');
    listRoot = document.querySelector('[data-stam-board-list]');
    if (!tbody) return;
    render();
  });
}());
