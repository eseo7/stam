/* ============================================================================
 * STAM WBS 게시판 — Local Core DB v2 목록 렌더러 (기본 목록 표시)
 * ----------------------------------------------------------------------------
 * wbsItems store(v2) 를 기준으로 WBS 작업 목록(#wbs-v2-tbody)을 그린다.
 * Excel/import 로 생성된 WBS 와 직접 등록(sourceType=manual) WBS 가 같은 목록에
 * 함께 보인다. 기본 조회는 status !== deleted.
 *
 *  - 데이터가 없으면 정적 샘플을 쓰지 않고 empty state 표시(자동 seed/insert 금지).
 *  - 각 행에 data-wbs-id 부여 → 상세/수정/삭제(crud)가 record 식별.
 *  - 기존 간트/그룹 테이블(.wbs-wrap)은 건드리지 않는다(회귀 방지). 그룹/간트
 *    고급 연동은 후속. 이 모듈은 v2 "기본 목록 표시"만 담당.
 *  - CRUD 는 stam.wbs-crud.js 가 담당, 변경 후 window.STAM.wbsBoard.render().
 *
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001';
  var STORE = 'wbsItems';

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

  // v2 status/reviewStatus → WBS 진행상태(한글) + 색
  function statusInfo(rec) {
    var s = rec.status;
    if (s === 'deleted') return { label: '삭제됨', bg: 'rgba(100,116,139,.15)', fg: '#64748B' };
    if (s === 'confirmed') return { label: '완료', bg: 'rgba(4,120,87,.12)', fg: '#047857' };
    if (s === 'rejected') return { label: '보류', bg: 'rgba(153,27,27,.12)', fg: '#991B1B' };
    if (s === 'reviewing') return { label: '진행중', bg: 'rgba(59,130,246,.12)', fg: '#2563EB' };
    return { label: '대기', bg: 'rgba(100,116,139,.12)', fg: '#64748B' }; // draft
  }

  function taskTypeOf(rec) { return rec.taskType || rec.requirementType || '작업'; }
  function assigneeOf(rec) { return rec.assignee || rec.owner || '미지정'; }
  function periodOf(rec) {
    var s = rec.startDate || '', e = rec.endDate || '';
    if (!s && !e) return '—';
    return (s || '?') + ' ~ ' + (e || '?');
  }

  function rowHtml(rec) {
    var st = statusInfo(rec);
    var prog = (rec.progress != null && rec.progress !== '') ? rec.progress : 0;
    var cellS = 'padding:9px 10px;border-bottom:1px solid var(--bd);vertical-align:middle';
    return '<tr class="wbs-v2-row" data-wbs-id="' + esc(rec.id) + '" style="cursor:pointer">' +
      '<td style="' + cellS + ';font-family:var(--font);font-weight:700;color:var(--stam);white-space:nowrap">' + esc(rec.id) + '</td>' +
      '<td style="' + cellS + ';color:var(--t1)">' + esc(rec.title || rec.taskName || '(작업명 없음)') + '</td>' +
      '<td style="' + cellS + '"><span class="wbs-type-chip">' + esc(taskTypeOf(rec)) + '</span></td>' +
      '<td style="' + cellS + ';color:var(--t2)">' + esc(assigneeOf(rec)) + '</td>' +
      '<td style="' + cellS + '"><span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:' + st.bg + ';color:' + st.fg + '">' + esc(st.label) + '</span></td>' +
      '<td style="' + cellS + ';color:var(--t2);white-space:nowrap">' + esc(prog) + '%</td>' +
      '<td style="' + cellS + ';font-size:11px;color:var(--t3);white-space:nowrap">' + (esc(dpart(rec.updatedAt)) || '—') + '</td>' +
      '</tr>';
  }

  function emptyHtml() {
    return '<tr class="wbs-v2-empty-row"><td colspan="7" style="padding:0;border:0">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:44px 16px;text-align:center">' +
      '<div style="font-size:13px;font-weight:700;color:var(--t1)">아직 등록된 WBS 작업이 없습니다.</div>' +
      '<div style="font-size:12px;color:var(--t3);line-height:1.6">등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.</div>' +
      '</div></td></tr>';
  }

  var tbody;
  function render() {
    var db = window.STAM_CORE && window.STAM_CORE.db;
    if (!db || !tbody) return Promise.resolve();
    return db.listRecords(STORE, PID).then(function (list) {
      list = (list || []); // deleted 제외
      if (!list.length) { tbody.innerHTML = emptyHtml(); return; }
      list.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
      tbody.innerHTML = list.map(rowHtml).join('');
    }).catch(function () { /* DB 오류 시 조용히 */ });
  }

  window.STAM = window.STAM || {};
  window.STAM.wbsBoard = {
    PID: PID, STORE: STORE, render: render,
    statusInfo: statusInfo, taskTypeOf: taskTypeOf, assigneeOf: assigneeOf, periodOf: periodOf,
    esc: esc, dpart: dpart
  };

  ready(function () {
    tbody = document.getElementById('wbs-v2-tbody');
    if (!tbody) return;
    render();
  });
}());
