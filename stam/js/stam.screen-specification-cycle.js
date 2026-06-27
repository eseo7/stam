/* ============================================================================
 * STAM 화면설계서 게시판 — Local Core DB v2 목록 렌더러 (기본 목록 표시)
 * ----------------------------------------------------------------------------
 * screenSpecifications store(v2) 를 기준으로 v2 화면설계서 목록(#ss-v2-tbody)을
 * 그린다. Excel/import 생성 + 직접 등록(sourceType=manual)이 같은 목록에 보인다.
 * 기본 조회는 status !== deleted.
 *
 *  - 데이터가 없으면 정적 샘플을 쓰지 않고 empty state 표시(자동 seed/insert 금지).
 *  - 각 행에 data-ssv2-id 부여 → 상세/수정/삭제(crud)가 record 식별.
 *  - 기존 화면설계서 목록/템플릿/에디터(.ss-table, ss-template-view, ss-editor-view)는
 *    건드리지 않는다(회귀 방지). 템플릿/에디터 고급 연동은 후속.
 *  - CRUD 는 stam.screen-specification-crud.js 가 담당, 변경 후 render().
 *
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001';
  var STORE = 'screenSpecifications';

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

  // v2 status/reviewStatus → 상태 칩(한글) + 색
  function statusInfo(rec) {
    var s = rec.status, r = rec.reviewStatus;
    if (s === 'deleted') return { label: '삭제됨', bg: 'rgba(100,116,139,.15)', fg: '#64748B' };
    if (s === 'confirmed') return { label: '승인완료', bg: 'rgba(4,120,87,.12)', fg: '#047857' };
    if (s === 'rejected') return { label: '보류', bg: 'rgba(153,27,27,.12)', fg: '#991B1B' };
    if (s === 'reviewing') return (r === 'Approved')
      ? { label: '검토완료', bg: 'rgba(4,120,87,.12)', fg: '#047857' }
      : { label: '검토요청', bg: 'rgba(180,83,9,.12)', fg: '#B45309' };
    return { label: '작성중', bg: 'rgba(100,116,139,.12)', fg: '#64748B' }; // draft
  }
  function nameOf(rec) { return rec.screenName || rec.title || '(화면명 없음)'; }
  function typeOf(rec) { return rec.screenType || '—'; }
  function ownerOf(rec) { return rec.owner || '미지정'; }

  function rowHtml(rec) {
    var st = statusInfo(rec);
    var cellS = 'padding:9px 10px;border-bottom:1px solid var(--bd);vertical-align:middle';
    return '<tr class="ssv2-row" data-ssv2-id="' + esc(rec.id) + '">' +
      '<td style="' + cellS + ';font-family:var(--font);font-weight:700;color:var(--stam);white-space:nowrap">' + esc(rec.id) + '</td>' +
      '<td style="' + cellS + ';color:var(--t1)">' + esc(nameOf(rec)) + '</td>' +
      '<td style="' + cellS + ';color:var(--t2)">' + esc(typeOf(rec)) + '</td>' +
      '<td style="' + cellS + ';color:var(--t2)">' + esc(ownerOf(rec)) + '</td>' +
      '<td style="' + cellS + '"><span class="ssv2-stchip" style="background:' + st.bg + ';color:' + st.fg + '">' + esc(st.label) + '</span></td>' +
      '<td style="' + cellS + ';color:var(--t2);font-size:11px">' + esc(rec.reviewStatus || '—') + '</td>' +
      '<td style="' + cellS + ';font-size:11px;color:var(--t3);white-space:nowrap">' + (esc(dpart(rec.updatedAt)) || '—') + '</td>' +
      '</tr>';
  }
  function emptyHtml() {
    return '<tr class="ssv2-empty-row"><td colspan="7" style="padding:0;border:0">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:44px 16px;text-align:center">' +
      '<div style="font-size:13px;font-weight:700;color:var(--t1)">아직 등록된 화면설계서가 없습니다.</div>' +
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
  window.STAM.ssBoard = {
    PID: PID, STORE: STORE, render: render,
    statusInfo: statusInfo, nameOf: nameOf, typeOf: typeOf, ownerOf: ownerOf, esc: esc, dpart: dpart
  };

  ready(function () {
    tbody = document.getElementById('ss-v2-tbody');
    if (!tbody) return;
    render();
  });
}());
