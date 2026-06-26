/* ============================================================================
 * STAM 기능정의 게시판 — Cycle DB(Local IndexedDB) 연동 패널
 * ----------------------------------------------------------------------------
 * 기존 기능정의서 제품 화면(functional-specification.html)에 prototype 의
 * Local IndexedDB(stam-prototype-cycle-db) 의 functionalDefinition 데이터를
 * 연결한다. PR #232 Requirement Import Trigger 로 생성된 기능정의 초안이 이
 * 화면 목록에 보이고, 없으면 샘플을 생성할 수 있다. 저장/수정은 IndexedDB 기준.
 *
 * CycleRepo 인터페이스만 사용한다(저장소 비종속). 기존 정적 표/Drawer/Controller
 * 는 건드리지 않는다 — data-stam-board-list 가 아닌 별도 패널로 추가한다.
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID = 'proto-proj-001'; // seed/import 와 동일 projectId
  var BY = 'product-user';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var repo = window.STAM_CYCLE && window.STAM_CYCLE.LocalRepo;
    var host = document.querySelector('.fn-page-hdr');
    if (!host) return;

    // 헤더 상태 배지(Board / Draft / Requirement Linked) — additive
    var titleWrap = document.querySelector('.fn-page-hdr-title');
    if (titleWrap && !document.getElementById('fdc-badges')) {
      titleWrap.insertAdjacentHTML('beforeend',
        '<span id="fdc-badges" style="margin-left:8px;display:inline-flex;gap:5px;vertical-align:middle">' +
        '<span class="fn-chip fn-chip-type">Board</span>' +
        '<span class="fn-chip fn-chip-draft">Draft</span>' +
        '<span class="fn-chip fn-chip-review">Requirement Linked</span></span>');
    }

    if (!repo) {
      host.insertAdjacentHTML('afterend',
        '<div class="fn-sstrip" style="display:block;padding:12px 14px;color:var(--t3);font-size:12px">' +
        'Cycle DB 연동 모듈을 불러오지 못했습니다 (cycle-db.repo.local.js).</div>');
      return;
    }

    // ── 패널 삽입 ────────────────────────────────────────────────
    var panel =
      '<div class="fn-toolbar stam-board-toolbar" style="margin-top:14px">' +
        '<div class="stam-board-toolbar-left" style="display:flex;align-items:center;gap:8px">' +
          '<strong style="font-size:13px;color:var(--t1)">기능정의 · Cycle DB 연동</strong>' +
          '<span style="font-size:11px;color:var(--t3)">Local IndexedDB 실데이터 · 요구사항에서 파생된 기능정의 초안</span>' +
        '</div>' +
        '<div class="stam-board-toolbar-right" style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button id="fdc-sample" class="fn-btn fn-btn-out stam-btn stam-btn-outline" type="button">샘플 기능정의 생성</button>' +
          '<button id="fdc-add" class="fn-btn fn-btn-out stam-btn stam-btn-outline" type="button">기능정의 추가</button>' +
          '<button id="fdc-reload" class="fn-btn fn-btn-ghost stam-btn stam-btn-ghost" type="button">새로고침</button>' +
          '<button id="fdc-reset" class="fn-btn fn-btn-ghost stam-btn stam-btn-ghost" type="button">초기화</button>' +
        '</div>' +
      '</div>' +
      '<div class="fn-sstrip" id="fdc-summary"></div>' +
      '<div id="fdc-addform" style="display:none;padding:12px 14px;border:1px solid var(--bd);border-radius:8px;margin:10px 0;background:var(--bg-sur)">' +
        '<div class="stam-form-grid fn-fgrid">' +
          '<div class="stam-form-field fn-ffield"><label class="stam-label fn-flbl">기능명 <span class="req">*</span></label><input id="fdc-f-title" class="stam-input fn-inp" placeholder="기능명"></div>' +
          '<div class="stam-form-field fn-ffield"><label class="stam-label fn-flbl">연결 요구사항</label><input id="fdc-f-req" class="stam-input fn-inp" placeholder="REQ-001"></div>' +
          '<div class="stam-form-field fn-ffield"><label class="stam-label fn-flbl">담당자</label><input id="fdc-f-owner" class="stam-input fn-inp" placeholder="담당자"></div>' +
          '<div class="stam-form-field fn-ffield"><label class="stam-label fn-flbl">우선순위</label><input id="fdc-f-pri" class="stam-input fn-inp" placeholder="상/중/하"></div>' +
        '</div>' +
        '<div style="margin-top:8px;display:flex;gap:6px">' +
          '<button id="fdc-f-save" class="fn-btn fn-btn-pri stam-btn stam-btn-primary" type="button">초안 생성 (검토 필요)</button>' +
          '<button id="fdc-f-cancel" class="fn-btn fn-btn-ghost stam-btn stam-btn-ghost" type="button">취소</button>' +
        '</div>' +
      '</div>' +
      '<div class="fn-tbl-outer"><div class="fn-tbl-scroll">' +
        '<table class="fn-table"><colgroup>' +
          '<col style="min-width:200px"><col style="width:110px"><col style="width:90px">' +
          '<col style="width:96px"><col style="width:96px"><col style="width:90px"><col style="width:96px"><col style="min-width:160px">' +
        '</colgroup><thead><tr>' +
          '<th>기능 ID / 기능명</th><th>연결 요구사항</th><th>기능 유형</th>' +
          '<th>우선순위</th><th>상태</th><th>검토 상태</th><th>담당자</th><th>액션</th>' +
        '</tr></thead><tbody id="fdc-tbody"></tbody></table>' +
      '</div></div>' +
      '<div id="fdc-status" style="font-size:11.5px;color:var(--t3);padding:6px 2px"></div>';

    host.insertAdjacentHTML('afterend', panel);

    function $(id) { return document.getElementById(id); }
    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }
    function dpart(iso) { return String(iso || '').replace('T', ' ').slice(0, 10); }

    // status / reviewStatus → 기존 fn-chip 클래스
    function statusChip(st) {
      var map = {
        '초안': 'fn-chip-draft', 'draft': 'fn-chip-draft',
        '검토중': 'fn-chip-review', '검토 필요': 'fn-chip-review',
        '확정': 'fn-chip-done', '반려': 'fn-chip-hold', '변경 영향': 'fn-chip-hold'
      };
      return '<span class="fn-chip ' + (map[st] || 'fn-chip-draft') + '">' + esc(st || '초안') + '</span>';
    }
    function reviewChip(rv) {
      var map = { 'Review Needed': 'fn-chip-review', '검토 필요': 'fn-chip-review', '검토중': 'fn-chip-review', '확정': 'fn-chip-done', 'Confirmed': 'fn-chip-done', '반려': 'fn-chip-hold' };
      var label = (rv === 'Review Needed') ? '검토 필요' : (rv || '검토 필요');
      return '<span class="fn-chip ' + (map[rv] || 'fn-chip-review') + '">' + esc(label) + '</span>';
    }
    function priChip(p) {
      var m = { '상': 'fn-chip-high', '높음': 'fn-chip-high', '중': 'fn-chip-mid', '중간': 'fn-chip-mid', '하': 'fn-chip-low', '낮음': 'fn-chip-low' };
      return p ? '<span class="fn-chip ' + (m[p] || 'fn-chip-mid') + '">' + esc(p) + '</span>' : '<span style="color:var(--t3)">미지정</span>';
    }

    var cache = []; // 마지막 렌더된 functionalDefinition 목록

    function reqOf(a, links) {
      if (a.customFields && a.customFields.requirementId) return a.customFields.requirementId;
      var l = links.filter(function (x) { return x.linkType === 'requirementToFunction' && x.toArtifactId === a.artifactId; })[0];
      return l ? l.fromArtifactId : '';
    }

    function render() {
      return Promise.all([repo.listArtifacts(PID), repo.listLinks(PID)]).then(function (res) {
        var artifacts = res[0], links = res[1];
        var funs = artifacts.filter(function (a) { return a.artifactType === 'functionalDefinition'; });
        cache = funs;

        var linkedCnt = 0, missingCnt = 0, reviewCnt = 0, draftCnt = 0;
        var rowsHtml = funs.map(function (a) {
          var req = reqOf(a, links);
          var linked = !!req;
          if (linked) linkedCnt++; else missingCnt++;
          if (a.reviewStatus === 'Review Needed' || a.reviewStatus === '검토 필요' || a.reviewStatus === '검토중') reviewCnt++;
          if (a.status === 'draft' || a.status === '초안') draftCnt++;
          var ftype = (a.customFields && a.customFields.requirementType) || '기능';
          var pri = (a.customFields && a.customFields.priority) || '';
          var reqCell = linked
            ? '<span class="fn-link-chip">' + esc(req) + '</span>'
            : '<span class="fn-chip fn-chip-hold">연결 필요</span>';
          return '<tr>' +
            '<td><div class="fn-id-cell"><span class="fn-fn-id">' + esc(a.artifactId) + '</span>' +
              '<span class="fn-fn-name">' + esc(a.title) + '</span></div></td>' +
            '<td>' + reqCell + '</td>' +
            '<td><span class="fn-chip fn-chip-type">' + esc(ftype) + '</span></td>' +
            '<td>' + priChip(pri) + '</td>' +
            '<td>' + statusChip(a.status === 'draft' ? '초안' : a.status) + '</td>' +
            '<td>' + reviewChip(a.reviewStatus) + '</td>' +
            '<td style="font-size:12px;color:var(--t2)">' + esc(a.owner || '미지정') + '</td>' +
            '<td><div style="display:flex;gap:4px;flex-wrap:wrap">' +
              '<button class="fn-btn stam-btn stam-btn-ghost fdc-act" data-id="' + esc(a.artifactId) + '" data-act="review" type="button" style="height:26px;padding:0 8px;font-size:11px">검토요청</button>' +
              '<button class="fn-btn stam-btn stam-btn-ghost fdc-act" data-id="' + esc(a.artifactId) + '" data-act="confirm" type="button" style="height:26px;padding:0 8px;font-size:11px">확정</button>' +
              '<button class="fn-btn stam-btn stam-btn-ghost fdc-act" data-id="' + esc(a.artifactId) + '" data-act="reject" type="button" style="height:26px;padding:0 8px;font-size:11px">반려</button>' +
            '</div></td>' +
            '</tr>';
        }).join('');

        $('fdc-tbody').innerHTML = funs.length ? rowsHtml :
          '<tr><td colspan="8" style="padding:18px;text-align:center;color:var(--t3)">' +
          '저장된 기능정의가 없습니다. <strong>샘플 기능정의 생성</strong> 또는 <strong>기능정의 추가</strong>를 누르거나, ' +
          '요구사항 가져오기(import)로 생성하세요.</td></tr>';

        $('fdc-summary').innerHTML =
          ssCell('var(--stam)', '전체 기능정의', funs.length) +
          ssCell('#B45309', '검토 필요', reviewCnt) +
          ssCell('#64748B', '초안', draftCnt) +
          ssCell('#3B82F6', '요구사항 연결됨', linkedCnt) +
          ssCell('#991B1B', '연결 누락', missingCnt, true);

        $('fdc-status').innerHTML = 'projectId <code>' + esc(PID) + '</code> · 기능정의 ' + funs.length +
          '건 (검토 필요 ' + reviewCnt + ' · 연결 누락 ' + missingCnt + ') · 데이터는 현재 브라우저 IndexedDB 에 저장됩니다.';

        bindRowActions();
      });
    }

    function ssCell(color, label, num, last) {
      return '<div class="fn-ss-cell"' + (last ? ' style="border-right:0"' : '') + '>' +
        '<div class="fn-ss-lbl"><span class="fn-ss-dot" style="background:' + color + '"></span>' + esc(label) + '</div>' +
        '<div class="fn-ss-num">' + num + '</div></div>';
    }

    function nowIso() { return new Date().toISOString(); }

    function saveFun(a, changeType, field, after) {
      return repo.saveArtifact(a).then(function () {
        return repo.appendChange({
          changeId: 'CHG-fdc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          projectId: PID, artifactId: a.artifactId, changeType: changeType || 'update',
          field: field || '', before: null, after: after == null ? a.title : after, at: nowIso(), by: BY
        });
      });
    }

    function bindRowActions() {
      Array.prototype.forEach.call(document.querySelectorAll('.fdc-act'), function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id'), act = btn.getAttribute('data-act');
          var a = cache.filter(function (x) { return x.artifactId === id; })[0];
          if (!a) return;
          if (act === 'review') { a.status = '검토중'; a.reviewStatus = '검토중'; }
          else if (act === 'confirm') { a.status = '확정'; a.reviewStatus = '확정'; }
          else if (act === 'reject') { a.status = '반려'; a.reviewStatus = '반려'; }
          a.updatedAt = nowIso(); a.updatedBy = BY;
          saveFun(a, 'update', 'reviewStatus', a.reviewStatus).then(render);
        });
      });
    }

    // ── 샘플 기능정의 생성 (요구사항 + 기능정의 + 링크) ──────────
    function sample() {
      var defs = [
        { req: 'REQ-101', rtitle: '로그인 2차 인증', ftitle: '로그인 2차 인증 기능', type: '보안', pri: '상', owner: '김철수' },
        { req: 'REQ-102', rtitle: '권한 관리', ftitle: '권한별 메뉴 접근 제어', type: '권한', pri: '상', owner: '이영희' },
        { req: 'REQ-103', rtitle: '게시판 목록 검색', ftitle: '게시판 목록 검색 및 필터', type: '조회', pri: '중', owner: '박지수' }
      ];
      var t = nowIso();
      var ops = [];
      if (repo.saveProject) ops.push(repo.saveProject({ projectId: PID, name: 'Prototype Cycle Project', createdAt: t, createdBy: BY }));
      defs.forEach(function (d, i) {
        var reqA = { artifactId: d.req, projectId: PID, artifactType: 'requirement', title: d.rtitle, description: '', status: 'draft', reviewStatus: 'Review Needed', owner: d.owner, sourceType: 'Manual', sourceRef: '', customFields: {}, createdAt: t, updatedAt: t, createdBy: BY, updatedBy: BY };
        var funA = { artifactId: d.req + '-FUN', projectId: PID, artifactType: 'functionalDefinition', title: d.ftitle, description: '요구사항 "' + d.rtitle + '" 기준 기능정의 초안.', status: 'draft', reviewStatus: 'Review Needed', owner: d.owner, sourceType: 'Manual', sourceRef: '', customFields: { requirementId: d.req, requirementType: d.type, priority: d.pri }, createdAt: t, updatedAt: t, createdBy: BY, updatedBy: BY };
        var lnk = { linkId: 'LNK-fdc-' + i, projectId: PID, fromArtifactId: d.req, toArtifactId: d.req + '-FUN', fromType: 'requirement', toType: 'functionalDefinition', linkType: 'requirementToFunction', linkStatus: 'reviewNeeded', requirementId: d.req, createdAt: t, createdBy: BY };
        ops.push(repo.saveArtifact(reqA), repo.saveArtifact(funA), repo.saveLink(lnk),
          repo.appendChange({ changeId: 'CHG-fdc-s' + i, projectId: PID, artifactId: funA.artifactId, changeType: 'create', field: 'functionalDefinition', after: funA.title, at: t, by: BY }));
      });
      return Promise.all(ops).then(render).then(function () {
        $('fdc-status').textContent = '샘플 기능정의 3건을 생성했습니다 (모두 초안 / 검토 필요).';
      });
    }

    // ── 기능정의 추가 (인라인) ───────────────────────────────────
    function addNew() {
      var title = ($('fdc-f-title').value || '').trim();
      if (!title) { $('fdc-f-title').focus(); return; }
      var req = ($('fdc-f-req').value || '').trim();
      var t = nowIso();
      var a = {
        artifactId: 'FUN-' + Date.now(), projectId: PID, artifactType: 'functionalDefinition',
        title: title, description: '', status: 'draft', reviewStatus: 'Review Needed',
        owner: ($('fdc-f-owner').value || '미지정').trim() || '미지정', sourceType: 'Manual', sourceRef: '',
        customFields: { requirementId: req, priority: ($('fdc-f-pri').value || '').trim() },
        createdAt: t, updatedAt: t, createdBy: BY, updatedBy: BY
      };
      var ops = [];
      if (repo.saveProject) ops.push(repo.saveProject({ projectId: PID, name: 'Prototype Cycle Project', createdAt: t, createdBy: BY }));
      ops.push(saveFun(a, 'create', 'functionalDefinition', a.title));
      if (req) ops.push(repo.saveLink({ linkId: 'LNK-fdc-' + Date.now(), projectId: PID, fromArtifactId: req, toArtifactId: a.artifactId, fromType: 'requirement', toType: 'functionalDefinition', linkType: 'requirementToFunction', linkStatus: 'reviewNeeded', requirementId: req, createdAt: t, createdBy: BY }));
      Promise.all(ops).then(function () {
        $('fdc-f-title').value = ''; $('fdc-f-req').value = ''; $('fdc-f-owner').value = ''; $('fdc-f-pri').value = '';
        $('fdc-addform').style.display = 'none';
        return render();
      }).then(function () { $('fdc-status').textContent = '기능정의 초안을 추가했습니다 (검토 필요).'; });
    }

    // ── 버튼 바인딩 ──────────────────────────────────────────────
    $('fdc-sample').addEventListener('click', function () { sample().catch(err); });
    $('fdc-reload').addEventListener('click', function () { render().catch(err); });
    $('fdc-reset').addEventListener('click', function () { repo.reset().then(render).then(function () { $('fdc-status').textContent = '로컬 DB 데이터를 초기화했습니다.'; }).catch(err); });
    $('fdc-add').addEventListener('click', function () { var f = $('fdc-addform'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; });
    $('fdc-f-cancel').addEventListener('click', function () { $('fdc-addform').style.display = 'none'; });
    $('fdc-f-save').addEventListener('click', addNew);

    function err(e) { $('fdc-status').textContent = '오류: ' + (e && e.message || e); }

    render().catch(err);
  });
}());
