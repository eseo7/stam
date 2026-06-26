/* ============================================================================
 * STAM 기능정의 게시판 — Cycle DB(Local IndexedDB) 목록 통합
 * ----------------------------------------------------------------------------
 * 별도 상단 패널을 만들지 않는다. Local IndexedDB(stam-prototype-cycle-db)의
 * functionalDefinition 데이터를 기존 기능정의 목록 테이블(#fn-tbody)에 그대로
 * 주입한다. 데이터가 없으면 기존 정적 샘플을 fallback 으로 둔다.
 *
 * 기존 구조(제목 · 요약 · 검색/필터 · 목록 · Drawer)를 해치지 않는다.
 * STAMBoardList 는 테이블 root 이벤트 위임이므로 행 교체 후 refresh 만 호출한다.
 * CycleRepo 인터페이스만 사용. Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001'; // seed/import 와 동일 projectId

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var repo = window.STAM_CYCLE && window.STAM_CYCLE.LocalRepo;
    var tbody = document.getElementById('fn-tbody');
    var listRoot = document.querySelector('[data-stam-board-list]');
    if (!repo || !tbody) return;

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

    function statusChip(st) {
      var label = (st === 'draft' || !st) ? '초안' : st;
      var cls = {
        '초안': 'fn-chip-draft', 'draft': 'fn-chip-draft',
        '검토중': 'fn-chip-review', '검토 필요': 'fn-chip-review', 'Review Needed': 'fn-chip-review',
        '확정': 'fn-chip-done', '반려': 'fn-chip-hold', '변경 영향': 'fn-chip-hold'
      }[st] || 'fn-chip-draft';
      return '<span class="fn-chip ' + cls + '">' + esc(label) + '</span>';
    }
    function priChip(p) {
      var m = { '상': ['fn-chip-high', '높음'], '높음': ['fn-chip-high', '높음'], '중': ['fn-chip-mid', '중간'], '중간': ['fn-chip-mid', '중간'], '하': ['fn-chip-low', '낮음'], '낮음': ['fn-chip-low', '낮음'] };
      var v = m[p];
      return v ? '<span class="fn-chip ' + v[0] + '">' + v[1] + '</span>' : '<span class="fn-chip fn-chip-mid">중간</span>';
    }

    function reqOf(a, links) {
      if (a.customFields && a.customFields.requirementId) return a.customFields.requirementId;
      var l = links.filter(function (x) { return x.linkType === 'requirementToFunction' && x.toArtifactId === a.artifactId; })[0];
      return l ? l.fromArtifactId : '';
    }

    function rowHtml(a, links) {
      var req = reqOf(a, links);
      var ftype = (a.customFields && a.customFields.requirementType) || '기능';
      var pri = (a.customFields && a.customFields.priority) || '';
      var owner = a.owner || '미지정';
      var ini = esc(String(owner).charAt(0) || '?');
      var reqCell = req
        ? '<span class="fn-link-chip">' + esc(req) + '</span>'
        : '<span class="fn-chip fn-chip-hold">연결 필요</span>';
      return '<tr class="fn-data-row stam-table-row">' +
        '<td class="fn-ch stam-check-cell"><input type="checkbox" class="fn-cb stam-check" onclick="event.stopPropagation()"></td>' +
        '<td><div class="fn-id-cell"><span class="fn-fn-id">' + esc(a.artifactId) + '</span>' +
          '<span class="fn-fn-name">' + esc(a.title) + '</span></div></td>' +
        '<td>' + reqCell + '</td>' +
        '<td><span style="font-size:11.5px;color:var(--t3)">—</span></td>' +
        '<td><span class="fn-chip fn-chip-type">' + esc(ftype) + '</span></td>' +
        '<td>' + priChip(pri) + '</td>' +
        '<td>' + statusChip(a.status) + '</td>' +
        '<td><div style="display:flex;align-items:center;gap:5px">' +
          '<span class="fn-ava" style="background:' + avaColor(owner) + '">' + ini + '</span>' +
          '<span style="font-size:12px;color:var(--t2)">' + esc(owner) + '</span></div></td>' +
        '<td style="font-size:11.5px;color:var(--t3)">' + esc(dpart(a.updatedAt) || '—') + '</td>' +
        '</tr>';
    }

    function setCounts(n) {
      // 요약 첫 셀(전체) + footer 카운트만 가볍게 동기화
      var ssNum = document.querySelector('.fn-ss-cell.on .fn-ss-num');
      if (ssNum) ssNum.textContent = n;
      var cnt = document.querySelector('.stam-board-count');
      if (cnt) cnt.innerHTML = '총 <b>' + n + '</b>건 중 <b>' + n + '</b>건 표시';
    }

    function addBadge() {
      var titleEl = document.querySelector('.fn-page-hdr-title');
      if (titleEl && !document.getElementById('fdc-srcbadge')) {
        titleEl.insertAdjacentHTML('beforeend',
          '<span id="fdc-srcbadge" class="fn-chip fn-chip-type" style="margin-left:8px;vertical-align:middle;font-size:10.5px">요구사항 가져오기 데이터 반영됨</span>');
      }
    }

    function render() {
      return Promise.all([repo.listArtifacts(PID), repo.listLinks(PID)]).then(function (res) {
        var funs = res[0].filter(function (a) { return a.artifactType === 'functionalDefinition'; });
        if (!funs.length) return; // 데이터 없으면 기존 정적 샘플 유지(fallback)
        // 최신 수정일 내림차순
        funs.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
        tbody.innerHTML = funs.map(function (a) { return rowHtml(a, res[1]); }).join('');
        setCounts(funs.length);
        addBadge();
        if (listRoot && window.STAMBoardList && window.STAMBoardList.refresh) {
          window.STAMBoardList.refresh(listRoot);
        }
      }).catch(function () { /* fallback: 정적 샘플 유지 */ });
    }

    render();
  });
}());
