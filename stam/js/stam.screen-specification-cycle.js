/* ============================================================================
 * STAM 화면설계서 게시판 — Local Core DB v2 목록 통합 렌더러
 * ----------------------------------------------------------------------------
 * screenSpecifications store(v2) 데이터를 기존 화면설계서 단일 목록(#ss-tbody)에
 * "하나의 목록"으로 통합 주입한다. 하단 별도 목록/개발자 라벨 없음.
 *   - 기존 renderTable() 끝에서 window.STAM.ssv2.afterRender(tbody) 훅 호출 →
 *     이 모듈이 v2 그룹(헤더 + 행)을 같은 테이블 상단에 append.
 *   - 데이터는 메모리 캐시. 변경 시 refresh() → 캐시 재로드 + STAM.ssRerender().
 *   - 행/버튼은 v2 전용 Drawer(stam.screen-specification-crud.js)로 연결.
 *   - 기본 조회는 status !== deleted. 자동 seed/insert 없음.
 *
 * 기존 정적 목록(MENUS)·템플릿·에디터는 건드리지 않는다(회귀 방지).
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001';
  var STORE = 'screenSpecifications';
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

  function statusInfo(rec) {
    var s = rec.status, r = rec.reviewStatus;
    if (s === 'deleted') return { label: '삭제됨', bg: 'rgba(100,116,139,.15)', fg: '#64748B' };
    if (s === 'confirmed') return { label: '승인완료', bg: 'rgba(4,120,87,.12)', fg: '#047857' };
    if (s === 'rejected') return { label: '보류', bg: 'rgba(153,27,27,.12)', fg: '#991B1B' };
    if (s === 'reviewing') return (r === 'Approved')
      ? { label: '검토완료', bg: 'rgba(4,120,87,.12)', fg: '#047857' }
      : { label: '검토요청', bg: 'rgba(180,83,9,.12)', fg: '#B45309' };
    return { label: '작성중', bg: 'rgba(100,116,139,.12)', fg: '#64748B' };
  }
  function nameOf(rec) { return rec.screenName || rec.title || '(화면명 없음)'; }
  function typeOf(rec) { return rec.screenType || '화면'; }
  function ownerOf(rec) { return rec.owner || '미지정'; }

  function chip(label, bg, fg) {
    return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:' + bg + ';color:' + fg + '">' + esc(label) + '</span>';
  }

  function rowHtml(rec) {
    var st = statusInfo(rec);
    return '<tr class="ssv2-int-row stam-table-row" data-ssv2-id="' + esc(rec.id) + '">' +
      '<td class="ss-ch stam-check-cell"></td>' +
      '<td class="ss-name-col"><div class="ss-sc-cell">' +
        '<span class="ss-sc-ind">└</span>' +
        '<span class="ss-sc-id">' + esc(rec.id) + '</span>' +
        '<span class="ss-sc-name">' + esc(nameOf(rec)) + '</span>' +
        '<span class="ss-type-chip ss-type-chip-sm">' + esc(typeOf(rec)) + '</span>' +
      '</div></td>' +
      '<td><span class="ss-vp">v0.1</span></td>' +
      '<td>' + chip(st.label, st.bg, st.fg) + '</td>' +
      '<td style="color:var(--t3);font-size:11px">' + esc(rec.reviewStatus || '—') + '</td>' +
      '<td style="color:var(--t3)">—</td>' +
      '<td style="color:var(--t3);font-size:11px">' + esc(ownerOf(rec)) + '</td>' +
      '<td style="color:var(--t3);font-size:12px">' + (esc(dpart(rec.updatedAt)) || '—') + '</td>' +
      '<td><div class="ss-rec-actions">' +
        '<button type="button" class="ss-rec-act-btn" data-ssv2-detail="' + esc(rec.id) + '">상세</button>' +
        '<button type="button" class="ss-rec-act-btn ss-rec-act-edit" data-ssv2-edit="' + esc(rec.id) + '">수정</button>' +
      '</div></td>' +
    '</tr>';
  }

  // 기존 목록(#ss-tbody) 상단에 v2 그룹을 통합 주입한다.
  function afterRender(tbody) {
    if (!tbody || !cache.length) return;
    var head = '<tr class="ss-gr-row ssv2-grp">' +
      '<td class="ss-ch stam-check-cell"></td>' +
      '<td colspan="8"><div class="ss-gr-cell">' +
      '<svg class="ss-gr-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
      '<span class="ss-gr-name">요구사항 연계 화면설계서</span>' +
      '<span class="ss-gr-sep"></span>' +
      '<span class="ss-gr-count">' + cache.length + '개 화면</span>' +
      '<span class="ss-gr-notice">요구사항 가져오기로 생성된 화면설계서 초안입니다. 상세 확인 후 수정하거나 승인하세요.</span>' +
      '</div></td></tr>';
    var rows = cache.slice().sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }).map(rowHtml).join('');
    tbody.insertAdjacentHTML('afterbegin', head + rows);
  }

  function loadCache() {
    var db = window.STAM_CORE && window.STAM_CORE.db;
    if (!db) return Promise.resolve();
    return db.listRecords(STORE, PID).then(function (list) { cache = list || []; }).catch(function () { cache = []; });
  }
  function refresh() {
    return loadCache().then(function () { if (window.STAM && window.STAM.ssRerender) window.STAM.ssRerender(); });
  }

  window.STAM = window.STAM || {};
  var api = {
    PID: PID, STORE: STORE,
    afterRender: afterRender, refresh: refresh,
    statusInfo: statusInfo, nameOf: nameOf, typeOf: typeOf, ownerOf: ownerOf, esc: esc, dpart: dpart
  };
  window.STAM.ssBoard = api;
  window.STAM.ssv2 = api; // renderTable() 훅이 찾는 이름

  ready(function () {
    // 초기 1회: 캐시 로드 후 기존 목록 재렌더(→ afterRender 훅이 v2 그룹 주입)
    loadCache().then(function () { if (window.STAM.ssRerender) window.STAM.ssRerender(); });
  });
}());
