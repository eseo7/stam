/* ============================================================================
 * STAM 기능정의 게시판 — Local Core DB v2 CRUD 연결
 * ----------------------------------------------------------------------------
 * 기존 기능정의 화면(목록 + 등록/상세/수정 Drawer)을 Local Core DB v2
 * (stam-core-local-db-v1 · functionalDefinitions store)에 연결한다.
 *   - 등록: 직접 입력 → functionalDefinitions insert (sourceType=manual)
 *   - 상세: 행 클릭 → record 내용/추적ID(importBatchId/requirementId/상태) 표시
 *   - 수정: 필드 저장 → updateRecord + artifactChanges append (updatedAt 갱신)
 *   - 삭제: soft delete (status=deleted) — 물리 삭제 금지, 변경이력 남김
 *   - 상태: draft/reviewing/confirmed/rejected + reviewStatus 매핑
 * 목록 렌더는 stam.functional-definition-cycle.js(window.STAM.fnBoard) 재사용.
 * 자동 seed/clear/deleteDatabase 없음. Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var core = window.STAM_CORE || {};
  var db = core.db;
  var schema = core.schema;
  var board = window.STAM && window.STAM.fnBoard;
  if (!db || !schema || !board) return;

  var PID = board.PID;
  var STORE = 'functionalDefinitions';
  var BY = 'prototype-user';
  var currentId = null; // 상세/수정 대상 record id

  function nowIso() { return new Date().toISOString(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function genFuncId() {
    var d = new Date();
    var ymd = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var hms = '' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    return 'FUN-MANUAL-' + ymd + '-' + hms;
  }
  function changeId(id, kind) { return 'CHG-' + id + '-' + kind + '-' + Date.now(); }

  // 한글 상태 라벨 → v2 (status, reviewStatus)
  var KO_TO_V2 = {
    '작성중': { status: 'draft', reviewStatus: 'Review Needed' },
    '검토요청': { status: 'reviewing', reviewStatus: 'In Review' },
    '검토완료': { status: 'reviewing', reviewStatus: 'Approved' },
    '승인완료': { status: 'confirmed', reviewStatus: 'Approved' },
    '보류': { status: 'rejected', reviewStatus: 'Rejected' }
  };
  function statusFromKo(ko) { return KO_TO_V2[ko] || KO_TO_V2['작성중']; }

  // ── 폼 필드 접근 (label 기준 — 정적 마크업에 id 추가 없이 동작) ──────
  function fieldByLabel(scope, label) {
    var fields = scope.querySelectorAll('.fn-ffield');
    for (var i = 0; i < fields.length; i++) {
      var lbl = fields[i].querySelector('.fn-flbl');
      if (lbl && lbl.textContent.trim().indexOf(label) === 0) {
        return fields[i].querySelector('input, select, textarea');
      }
    }
    return null;
  }
  function getVal(scope, label) { var el = fieldByLabel(scope, label); return el ? String(el.value || '').trim() : ''; }
  function setVal(scope, label, val) {
    var el = fieldByLabel(scope, label);
    if (!el) return;
    if (el.tagName === 'SELECT') { setSelect(el, val); }
    else { el.value = val == null ? '' : val; }
  }
  function setSelect(sel, val) {
    var found = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === val || sel.options[i].textContent.trim() === val) { sel.selectedIndex = i; found = true; break; }
    }
    if (!found) sel.selectedIndex = 0;
    syncCs(sel);
  }
  // custom-select(stam.custom-select.js) 라벨/선택표시 동기화 (rebuild 없이)
  function syncCs(sel) {
    var wrap = sel.closest('.fn-cs');
    if (!wrap) return;
    var opt = sel.options[sel.selectedIndex];
    var valEl = wrap.querySelector('.fn-cs-val');
    if (valEl) {
      valEl.textContent = opt ? opt.textContent : '';
      valEl.classList.toggle('is-placeholder', !!(opt && opt.value === ''));
    }
    wrap.querySelectorAll('.fn-cs-opt').forEach(function (o, i) { o.classList.toggle('is-selected', i === sel.selectedIndex); });
  }

  // ── 상세 표시 접근 (info-cell / 내용 box) ───────────────────────────
  function icSet(scope, label, html) {
    var ics = scope.querySelectorAll('.fn-ic');
    for (var i = 0; i < ics.length; i++) {
      var k = ics[i].querySelector('.fn-ik');
      if (k && k.textContent.trim().indexOf(label) === 0) {
        var v = ics[i].querySelector('.fn-iv');
        if (v) v.innerHTML = html;
        return;
      }
    }
  }
  function purpSet(scope, label, text) {
    var blocks = scope.querySelectorAll('.fn-tab-panel');
    var ik = scope.querySelectorAll('.fn-ik');
    for (var i = 0; i < ik.length; i++) {
      if (ik[i].textContent.trim().indexOf(label) === 0) {
        var box = ik[i].parentNode.querySelector('.fn-purp-box');
        if (box) box.textContent = text || '—';
        return;
      }
    }
  }
  function esc(s) { return board.esc(s); }

  // ── 등록 ────────────────────────────────────────────────────────────
  var regDrawer = document.getElementById('fn-dw-register');
  function resetRegister() {
    if (!regDrawer) return;
    // 기능 ID (자동 부여) readonly 표시
    var idInput = fieldByLabel(regDrawer, '기능 ID');
    if (idInput) idInput.value = '(저장 시 자동 부여)';
    ['기능유형', '우선순위', '상태', '연결 화면'].forEach(function (l) { var s = fieldByLabel(regDrawer, l); if (s && s.tagName === 'SELECT') { s.selectedIndex = 0; syncCs(s); } });
    ['기능명', '담당자', '연결 요구사항', '기능 설명', '입력 조건', '처리 규칙', '예외/오류 처리', '관련 API/연동', '비고'].forEach(function (l) { setVal(regDrawer, l, ''); });
  }

  function submitRegister() {
    if (!regDrawer) return;
    var title = getVal(regDrawer, '기능명');
    var ftype = getVal(regDrawer, '기능유형');
    if (!title) { alert('기능명을 입력하세요.'); return; }
    if (!ftype) { alert('기능유형을 선택하세요.'); return; }
    var ko = getVal(regDrawer, '상태') || '작성중';
    var v2 = statusFromKo(ko);
    var id = genFuncId();
    var rec = {
      id: id,
      projectId: PID,
      boardType: 'functionalDefinition',
      sourceType: 'manual',
      requirementId: getVal(regDrawer, '연결 요구사항'),
      title: title,
      description: getVal(regDrawer, '기능 설명'),
      functionType: ftype,
      priority: getVal(regDrawer, '우선순위') || '중간',
      owner: getVal(regDrawer, '담당자') || '미지정',
      linkedScreen: getVal(regDrawer, '연결 화면'),
      inputSpec: getVal(regDrawer, '입력 조건'),
      businessRule: getVal(regDrawer, '처리 규칙'),
      exceptionRule: getVal(regDrawer, '예외/오류 처리'),
      apiRef: getVal(regDrawer, '관련 API/연동'),
      note: getVal(regDrawer, '비고'),
      status: v2.status,
      reviewStatus: v2.reviewStatus
    };
    db.createRecord(STORE, rec)
      .then(function () {
        return db.appendChange({
          changeId: changeId(id, 'create'), projectId: PID, artifactId: id,
          changeType: 'create', field: 'functionalDefinition', before: null, after: title,
          at: nowIso(), by: BY
        });
      })
      .then(function () { closeDrawers(); return board.render(); })
      .catch(function (e) { alert('등록 오류: ' + e.message); });
  }

  // ── 상세 ────────────────────────────────────────────────────────────
  var detDrawer = document.getElementById('fn-dw-detail');
  function openDetail(id) {
    if (!detDrawer) return Promise.resolve();
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      var st = board.statusInfo(rec), pr = board.priInfo(rec.priority), ft = board.ftypeOf(rec);
      var owner = rec.owner || '미지정';
      // 헤더
      var badge = detDrawer.querySelector('.fn-fn-badge'); if (badge) badge.textContent = rec.id;
      var hChip = detDrawer.querySelector('.fn-dw-hrow1 .fn-chip'); if (hChip) { hChip.className = 'fn-chip ' + st.cls; hChip.style.marginLeft = '4px'; hChip.textContent = st.label; }
      var title = detDrawer.querySelector('.fn-dw-htitle'); if (title) title.textContent = rec.title || '(제목 없음)';
      var hmeta = detDrawer.querySelectorAll('.fn-dw-hmeta .fn-chip');
      if (hmeta[0]) { hmeta[0].className = 'fn-chip fn-chip-type'; hmeta[0].textContent = ft; }
      if (hmeta[1]) { hmeta[1].className = 'fn-chip ' + pr.cls; hmeta[1].textContent = pr.label; }
      // 기본 정보
      icSet(detDrawer, '기능 ID', '<span style="font-weight:700;color:var(--stam)">' + esc(rec.id) + '</span>');
      icSet(detDrawer, '기능유형', '<span class="fn-chip fn-chip-type">' + esc(ft) + '</span>');
      icSet(detDrawer, '우선순위', '<span class="fn-chip ' + pr.cls + '">' + esc(pr.label) + '</span>');
      icSet(detDrawer, '상태', '<span class="fn-chip ' + st.cls + '">' + esc(st.label) + '</span>');
      icSet(detDrawer, '담당자', '<span class="fn-ava" style="background:#5451E8">' + esc(String(owner).charAt(0)) + '</span>' + esc(owner));
      icSet(detDrawer, '최종 수정일', esc(board.dpart(rec.updatedAt)) || '—');
      // 추적 정보(추가 셀)
      icSet(detDrawer, '연결 요구사항', rec.requirementId ? '<span class="fn-link-chip">' + esc(rec.requirementId) + '</span>' : '<span style="color:var(--t3)">미연결</span>');
      icSet(detDrawer, '검토 상태', '<span style="font-size:11.5px">' + esc(rec.reviewStatus || '—') + '</span>');
      icSet(detDrawer, 'Import 배치', '<span style="font-size:11px;color:var(--t3)">' + esc(rec.importBatchId || (rec.sourceType === 'manual' ? '직접 등록(manual)' : '—')) + '</span>');
      // 기능 내용
      purpSet(detDrawer, '기능 설명', rec.description);
      purpSet(detDrawer, '입력 조건', rec.inputSpec);
      purpSet(detDrawer, '처리 규칙', rec.businessRule);
      purpSet(detDrawer, '예외/오류 처리', rec.exceptionRule);
      purpSet(detDrawer, '관련 API/연동', rec.apiRef);
      // footer meta
      var meta = detDrawer.querySelector('.stam-dw-foot-meta'); if (meta) meta.textContent = '최종 변경 ' + (board.dpart(rec.updatedAt) || '—');
      // 변경 이력
      return renderChanges(id);
    });
  }

  function renderChanges(id) {
    var list = detDrawer.querySelector('.fn-chg-list');
    var badge = detDrawer.querySelector('.fn-tab-panel:last-child .fn-dw-sec-badge');
    if (!list) return;
    return db.listRecords('artifactChanges', PID, { includeDeleted: true }).then(function (all) {
      var mine = (all || []).filter(function (c) { return c.artifactId === id; })
        .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
      if (badge) badge.textContent = mine.length + '건';
      if (!mine.length) { list.innerHTML = '<div style="font-size:12px;color:var(--t3);padding:6px 0">변경 이력이 없습니다.</div>'; return; }
      list.innerHTML = mine.map(function (c) {
        var what = c.changeType === 'create' ? '기능 최초 등록'
          : c.changeType === 'delete' ? '기능 삭제(soft delete)'
            : (c.field === 'status' ? '상태 변경 → ' + esc(c.after) : '기능 정보 수정');
        return '<div class="fn-chg-item"><span class="fn-chg-dot"></span>' +
          '<span><span class="fn-chg-who">' + esc(c.by || 'user') + '</span>가 ' + what + '</span>' +
          '<span class="fn-chg-sp"></span><span class="fn-chg-date">' + esc(board.dpart(c.at)) + '</span></div>';
      }).join('');
    });
  }

  // ── 수정 ────────────────────────────────────────────────────────────
  var editDrawer = document.getElementById('fn-dw-edit');
  function prefillEdit(id) {
    if (!editDrawer) return;
    db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      var st = board.statusInfo(rec);
      var sumId = editDrawer.querySelector('.fn-edit-sum-id'); if (sumId) sumId.textContent = rec.id;
      var badge = editDrawer.querySelector('.fn-fn-badge'); if (badge) badge.textContent = rec.id;
      var title = editDrawer.querySelector('.fn-dw-htitle'); if (title) title.textContent = rec.title || '';
      var idInput = fieldByLabel(editDrawer, '기능 ID'); if (idInput) idInput.value = rec.id;
      setVal(editDrawer, '기능유형', board.ftypeOf(rec));
      setVal(editDrawer, '기능명', rec.title || '');
      setVal(editDrawer, '우선순위', board.priInfo(rec.priority).label);
      setVal(editDrawer, '상태', st.label);
      setVal(editDrawer, '담당자', rec.owner || '');
      setVal(editDrawer, '연결 요구사항', rec.requirementId || '');
      if (rec.linkedScreen) setVal(editDrawer, '연결 화면', rec.linkedScreen);
      setVal(editDrawer, '기능 설명', rec.description || '');
      setVal(editDrawer, '입력 조건', rec.inputSpec || '');
      setVal(editDrawer, '처리 규칙', rec.businessRule || '');
      setVal(editDrawer, '예외/오류 처리', rec.exceptionRule || '');
      setVal(editDrawer, '관련 API/연동', rec.apiRef || '');
      setVal(editDrawer, '비고', rec.note || '');
    });
  }

  function submitEdit() {
    if (!editDrawer || !currentId) return;
    var id = currentId;
    db.getRecord(STORE, id).then(function (prev) {
      if (!prev) return;
      var ko = getVal(editDrawer, '상태') || '작성중';
      var v2 = statusFromKo(ko);
      var title = getVal(editDrawer, '기능명') || prev.title;
      var patch = {
        title: title,
        functionType: getVal(editDrawer, '기능유형') || prev.functionType,
        priority: getVal(editDrawer, '우선순위') || prev.priority,
        owner: getVal(editDrawer, '담당자') || prev.owner,
        requirementId: getVal(editDrawer, '연결 요구사항'),
        linkedScreen: getVal(editDrawer, '연결 화면'),
        description: getVal(editDrawer, '기능 설명'),
        inputSpec: getVal(editDrawer, '입력 조건'),
        businessRule: getVal(editDrawer, '처리 규칙'),
        exceptionRule: getVal(editDrawer, '예외/오류 처리'),
        apiRef: getVal(editDrawer, '관련 API/연동'),
        note: getVal(editDrawer, '비고'),
        status: v2.status,
        reviewStatus: v2.reviewStatus,
        updatedBy: BY
      };
      var statusChanged = (prev.status !== v2.status) || (prev.reviewStatus !== v2.reviewStatus);
      return db.updateRecord(STORE, id, patch).then(function () {
        return db.appendChange({
          changeId: changeId(id, statusChanged ? 'status' : 'update'), projectId: PID, artifactId: id,
          changeType: 'update', field: statusChanged ? 'status' : 'summary',
          before: statusChanged ? (board.statusInfo(prev).label) : null,
          after: statusChanged ? (board.statusInfo({ status: v2.status, reviewStatus: v2.reviewStatus }).label) : '기능 정보 수정',
          at: nowIso(), by: BY
        });
      });
    }).then(function () { closeDrawers(); return board.render(); })
      .catch(function (e) { alert('저장 오류: ' + e.message); });
  }

  // ── 삭제 (soft delete) ──────────────────────────────────────────────
  var CONFIRM_MSG = '이 기능정의를 삭제하시겠습니까? 삭제된 항목은 목록에서 숨겨지지만 변경이력에는 남습니다.';
  function softDelete(ids) {
    if (!ids.length) return Promise.resolve();
    return ids.reduce(function (p, id) {
      return p.then(function () {
        return db.softDeleteRecord(STORE, id, { by: BY, reason: '사용자 삭제' }).then(function () {
          return db.appendChange({
            changeId: changeId(id, 'delete'), projectId: PID, artifactId: id,
            changeType: 'delete', field: 'status', before: 'active', after: 'deleted', at: nowIso(), by: BY
          });
        });
      });
    }, Promise.resolve());
  }

  function selectedIds() {
    var rows = (window.STAMBoardList && listRoot) ? window.STAMBoardList.getSelectedRows(listRoot) : [];
    return rows.map(function (r) { return r.getAttribute('data-fn-id'); }).filter(Boolean);
  }

  // ── 닫기 / 공통 ─────────────────────────────────────────────────────
  function closeDrawers() {
    var scrim = document.getElementById('fn-scrim');
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.fn-drawer').forEach(function (d) { d.classList.remove('open'); });
    if (window.STAMBoardList && listRoot) window.STAMBoardList.clearActive(listRoot);
  }

  // ── 바인딩 ──────────────────────────────────────────────────────────
  var listRoot = document.querySelector('[data-stam-board-list]');
  var tbody = document.getElementById('fn-tbody');

  // 등록 버튼: functional-specification.js 가 drawer 를 열고, 그 다음 폼 초기화
  var regBtn = document.getElementById('fn-reg-btn');
  if (regBtn) regBtn.addEventListener('click', function () { setTimeout(resetRegister, 0); });
  if (regDrawer) {
    var regSubmit = regDrawer.querySelector('.stam-dw-foot-right .fn-btn-pri');
    if (regSubmit) regSubmit.addEventListener('click', submitRegister);
  }

  // 행 클릭 → 상세 채우기 (drawer open 은 STAMBoardList onRowActivate 가 담당)
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      if (e.target.closest('.fn-ch')) return; // 체크박스 영역 제외
      var row = e.target.closest('.fn-data-row');
      if (!row) return;
      var id = row.getAttribute('data-fn-id');
      if (id) openDetail(id);
    });
  }

  // 상세 → 수정 버튼: drawer 열린 뒤 prefill
  if (detDrawer) {
    var editBtn = detDrawer.querySelector('[data-fn-open="edit"]');
    if (editBtn) editBtn.addEventListener('click', function () { if (currentId) setTimeout(function () { prefillEdit(currentId); }, 0); });
    var detDel = document.getElementById('det-del-btn');
    if (detDel) detDel.addEventListener('click', function () {
      if (!currentId) return;
      if (!window.confirm(CONFIRM_MSG)) return;
      softDelete([currentId]).then(function () { closeDrawers(); return board.render(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
    });
  }

  // 수정 저장
  if (editDrawer) {
    var editSubmit = editDrawer.querySelector('.stam-dw-foot-right .fn-btn-pri');
    if (editSubmit) editSubmit.addEventListener('click', submitEdit);
  }

  // 툴바 삭제 (선택 행 soft delete)
  var delBtn = document.getElementById('fn-del-btn');
  if (delBtn) delBtn.addEventListener('click', function () {
    var ids = selectedIds();
    if (!ids.length) return;
    if (!window.confirm(CONFIRM_MSG)) return;
    softDelete(ids).then(function () { return board.render(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
  });

}());
