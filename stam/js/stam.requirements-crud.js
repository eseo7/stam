/* ============================================================================
 * STAM 요구사항 게시판 — Local Core DB v2 CRUD 연결
 * ----------------------------------------------------------------------------
 * 기존 요구사항 화면(목록 + 등록/상세/수정 Drawer)을 Local Core DB v2
 * (stam-core-local-db-v1 · requirements store)에 연결한다.
 *   - 등록: 직접 입력 → requirements insert (sourceType=manual)
 *   - 상세: 행 클릭 → record 내용/추적ID(importBatchId/requirementId/상태) 표시
 *   - 수정: 필드 저장 → updateRecord + artifactChanges append (updatedAt 갱신)
 *   - 삭제: soft delete (status=deleted) — 물리 삭제 금지, 변경이력 남김
 *   - 상태: draft/reviewing/confirmed/rejected + reviewStatus 매핑
 * 목록 렌더는 stam.requirements-cycle.js(window.STAM.rqBoard) 재사용.
 * 자동 seed/clear/deleteDatabase 없음. Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var core = window.STAM_CORE || {};
  var db = core.db;
  var schema = core.schema;
  var board = window.STAM && window.STAM.rqBoard;
  if (!db || !schema || !board) return;

  var PID = board.PID;
  var STORE = 'requirements';
  var BY = 'prototype-user';
  var currentId = null;

  function nowIso() { return new Date().toISOString(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function genReqId() {
    var d = new Date();
    var ymd = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var hms = '' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    return 'REQ-MANUAL-' + ymd + '-' + hms;
  }
  function changeId(id, kind) { return 'CHG-' + id + '-' + kind + '-' + Date.now(); }

  var KO_TO_V2 = {
    '작성중': { status: 'draft', reviewStatus: 'Review Needed' },
    '검토요청': { status: 'reviewing', reviewStatus: 'In Review' },
    '검토완료': { status: 'reviewing', reviewStatus: 'Approved' },
    '승인완료': { status: 'confirmed', reviewStatus: 'Approved' },
    '보류': { status: 'rejected', reviewStatus: 'Rejected' }
  };
  function statusFromKo(ko) { return KO_TO_V2[ko] || KO_TO_V2['작성중']; }

  // ── 폼 필드 접근 (label 기준) ───────────────────────────────────────
  function fieldByLabel(scope, label) {
    var fields = scope.querySelectorAll('.rq-ffield');
    for (var i = 0; i < fields.length; i++) {
      var lbl = fields[i].querySelector('.rq-flbl');
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
  // custom-select(stam.custom-select.js, rq cfg) 라벨/선택표시 동기화
  function syncCs(sel) {
    var wrap = sel.closest('.rq-cs');
    if (!wrap) return;
    var opt = sel.options[sel.selectedIndex];
    var valEl = wrap.querySelector('.rq-cs-val');
    if (valEl) {
      valEl.textContent = opt ? opt.textContent : '';
      valEl.classList.toggle('is-placeholder', !!(opt && opt.value === ''));
    }
    wrap.querySelectorAll('.rq-cs-opt').forEach(function (o, i) { o.classList.toggle('is-selected', i === sel.selectedIndex); });
  }

  // ── 상세 표시 접근 ──────────────────────────────────────────────────
  function icSet(scope, label, html) {
    var ics = scope.querySelectorAll('.rq-ic');
    for (var i = 0; i < ics.length; i++) {
      var k = ics[i].querySelector('.rq-ik');
      if (k && k.textContent.trim().indexOf(label) === 0) {
        var v = ics[i].querySelector('.rq-iv');
        if (v) v.innerHTML = html;
        return;
      }
    }
  }
  function purpSet(scope, label, text) {
    var ik = scope.querySelectorAll('.rq-ik');
    for (var i = 0; i < ik.length; i++) {
      if (ik[i].textContent.trim().indexOf(label) === 0) {
        var box = ik[i].parentNode.querySelector('.rq-purp-box');
        if (box) box.textContent = text || '—';
        return;
      }
    }
  }
  function esc(s) { return board.esc(s); }

  // ── 등록 ────────────────────────────────────────────────────────────
  var regDrawer = document.getElementById('rq-dw-register');
  function resetRegister() {
    if (!regDrawer) return;
    var idInput = fieldByLabel(regDrawer, '요구사항 ID');
    if (idInput) idInput.value = '(저장 시 자동 부여)';
    ['유형', '우선순위', '상태', '승인 상태'].forEach(function (l) { var s = fieldByLabel(regDrawer, l); if (s && s.tagName === 'SELECT') { s.selectedIndex = 0; syncCs(s); } });
    ['요구사항명', '담당자', '배경', '상세 요구사항', '수용 조건', '관련 메뉴 경로', '검토자', '검토 메모'].forEach(function (l) { setVal(regDrawer, l, ''); });
  }

  function submitRegister() {
    if (!regDrawer) return;
    var title = getVal(regDrawer, '요구사항명');
    var desc = getVal(regDrawer, '상세 요구사항');
    var rtype = getVal(regDrawer, '유형');
    if (!title) { alert('요구사항명을 입력하세요.'); return; }
    if (!desc) { alert('상세 요구사항을 입력하세요.'); return; }
    var ko = getVal(regDrawer, '상태') || '작성중';
    var v2 = statusFromKo(ko);
    var id = genReqId();
    var rec = {
      id: id,
      projectId: PID,
      boardType: 'requirement',
      requirementId: id,
      sourceType: 'manual',
      title: title,
      description: desc,
      requirementType: rtype || '기능',
      priority: getVal(regDrawer, '우선순위') || '보통',
      owner: getVal(regDrawer, '담당자') || '미지정',
      actor: '',
      background: getVal(regDrawer, '배경'),
      acceptanceCriteria: getVal(regDrawer, '수용 조건'),
      menuPath: getVal(regDrawer, '관련 메뉴 경로'),
      reviewer: getVal(regDrawer, '검토자'),
      approvalStatus: getVal(regDrawer, '승인 상태'),
      reviewNote: getVal(regDrawer, '검토 메모'),
      status: v2.status,
      reviewStatus: v2.reviewStatus
    };
    db.createRecord(STORE, rec)
      .then(function () {
        return db.appendChange({
          changeId: changeId(id, 'create'), projectId: PID, artifactId: id,
          changeType: 'create', field: 'requirement', before: null, after: title, at: nowIso(), by: BY
        });
      })
      .then(function () { closeDrawers(); return board.render(); })
      .catch(function (e) { alert('등록 오류: ' + e.message); });
  }

  // ── 상세 ────────────────────────────────────────────────────────────
  var detDrawer = document.getElementById('rq-dw-detail');
  function openDetail(id) {
    if (!detDrawer) return Promise.resolve();
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      var st = board.statusInfo(rec), pr = board.priInfo(rec.priority), ty = board.typeOf(rec);
      var owner = board.ownerOf(rec);
      var badge = detDrawer.querySelector('.rq-req-badge'); if (badge) badge.textContent = rec.id;
      var hChip = detDrawer.querySelector('.rq-dw-hrow1 .rq-chip'); if (hChip) { hChip.className = 'rq-chip ' + st.cls; hChip.style.marginLeft = '4px'; hChip.textContent = st.label; }
      var title = detDrawer.querySelector('.rq-dw-htitle'); if (title) title.textContent = rec.title || '(제목 없음)';
      var hmeta = detDrawer.querySelectorAll('.rq-dw-hmeta .rq-chip');
      if (hmeta[0]) { hmeta[0].className = 'rq-chip rq-chip-type'; hmeta[0].textContent = ty; }
      if (hmeta[1]) { hmeta[1].className = 'rq-chip ' + pr.cls; hmeta[1].textContent = pr.label; }
      // 기본 정보
      icSet(detDrawer, '요구사항 ID', '<span style="font-weight:700;color:var(--stam)">' + esc(rec.id) + '</span>');
      icSet(detDrawer, '유형', '<span class="rq-chip rq-chip-type">' + esc(ty) + '</span>');
      icSet(detDrawer, '우선순위', '<span class="rq-chip ' + pr.cls + '">' + esc(pr.label) + '</span>');
      icSet(detDrawer, '상태', '<span class="rq-chip ' + st.cls + '">' + esc(st.label) + '</span>');
      icSet(detDrawer, '담당자', '<span class="rq-ava" style="background:#5451E8">' + esc(String(owner).charAt(0)) + '</span>' + esc(owner));
      icSet(detDrawer, '관련 메뉴 경로', esc(rec.menuPath || '—'));
      // 추적/추가 정보(추가 셀)
      icSet(detDrawer, '검토 상태', '<span style="font-size:11.5px">' + esc(rec.reviewStatus || '—') + '</span>');
      icSet(detDrawer, '행위자', esc(rec.actor || '—'));
      icSet(detDrawer, '출처', '<span style="font-size:11px;color:var(--t3)">' + esc((rec.sourceType || '—') + (rec.sourceRef ? ' · ' + rec.sourceRef : '')) + '</span>');
      icSet(detDrawer, 'Import 배치', '<span style="font-size:11px;color:var(--t3)">' + esc(rec.importBatchId ? (rec.importBatchId + (rec.importRowId ? ' / ' + rec.importRowId : '')) : (rec.sourceType === 'manual' ? '직접 등록(manual)' : '—')) + '</span>');
      icSet(detDrawer, '최종 수정일', '<span style="font-size:11.5px">' + (esc(board.dpart(rec.updatedAt)) || '—') + '</span>');
      // 요구 내용
      purpSet(detDrawer, '배경', rec.background);
      purpSet(detDrawer, '상세 요구사항', rec.description);
      // 수용 조건
      renderAcc(rec.acceptanceCriteria);
      // footer
      var meta = detDrawer.querySelector('.stam-dw-foot-meta'); if (meta) meta.textContent = '최종 변경 ' + (board.dpart(rec.updatedAt) || '—');
      return renderChanges(id);
    });
  }

  function renderAcc(text) {
    var list = detDrawer.querySelector('.rq-acc-list');
    if (!list) return;
    var items = String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!items.length) { list.innerHTML = '<div style="font-size:12px;color:var(--t3)">수용 조건이 없습니다.</div>'; return; }
    list.innerHTML = items.map(function (s, i) {
      return '<div class="rq-acc-item"><span class="rq-acc-n">' + (i + 1) + '</span><span>' + esc(s) + '</span></div>';
    }).join('');
  }

  function renderChanges(id) {
    var list = detDrawer.querySelector('.rq-chg-list');
    if (!list) return;
    return db.listRecords('artifactChanges', PID, { includeDeleted: true }).then(function (all) {
      var mine = (all || []).filter(function (c) { return c.artifactId === id; })
        .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
      if (!mine.length) { list.innerHTML = '<div style="font-size:12px;color:var(--t3);padding:6px 0">변경 이력이 없습니다.</div>'; return; }
      list.innerHTML = mine.map(function (c) {
        var what = c.changeType === 'create' ? '요구사항 최초 등록'
          : c.changeType === 'delete' ? '요구사항 삭제(soft delete)'
            : (c.field === 'status' ? '상태 변경 → ' + esc(c.after) : '요구사항 정보 수정');
        return '<div class="rq-chg-item"><span class="rq-chg-dot"></span>' +
          '<span><span class="rq-chg-who">' + esc(c.by || 'user') + '</span>가 ' + what + '</span>' +
          '<span class="rq-chg-sp"></span><span class="rq-chg-date">' + esc(board.dpart(c.at)) + '</span></div>';
      }).join('');
    });
  }

  // ── 수정 ────────────────────────────────────────────────────────────
  var editDrawer = document.getElementById('rq-dw-edit');
  function prefillEdit(id) {
    if (!editDrawer) return;
    db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      var st = board.statusInfo(rec);
      var sumId = editDrawer.querySelector('.rq-edit-sum-id'); if (sumId) sumId.textContent = rec.id;
      var badge = editDrawer.querySelector('.rq-req-badge'); if (badge) badge.textContent = rec.id;
      var title = editDrawer.querySelector('.rq-dw-htitle'); if (title) title.textContent = rec.title || '';
      var idInput = fieldByLabel(editDrawer, '요구사항 ID'); if (idInput) idInput.value = rec.id;
      setVal(editDrawer, '유형', board.typeOf(rec));
      setVal(editDrawer, '요구사항명', rec.title || '');
      setVal(editDrawer, '우선순위', board.priInfo(rec.priority).label);
      setVal(editDrawer, '상태', st.label);
      setVal(editDrawer, '담당자', rec.owner || '');
      setVal(editDrawer, '배경', rec.background || '');
      setVal(editDrawer, '상세 요구사항', rec.description || '');
      setVal(editDrawer, '수용 조건', rec.acceptanceCriteria || '');
      setVal(editDrawer, '관련 메뉴 경로', rec.menuPath || '');
      setVal(editDrawer, '검토자', rec.reviewer || '');
      if (rec.approvalStatus) setVal(editDrawer, '승인 상태', rec.approvalStatus);
      setVal(editDrawer, '검토 메모', rec.reviewNote || '');
    });
  }

  function submitEdit() {
    if (!editDrawer || !currentId) return;
    var id = currentId;
    db.getRecord(STORE, id).then(function (prev) {
      if (!prev) return;
      var ko = getVal(editDrawer, '상태') || '작성중';
      var v2 = statusFromKo(ko);
      var patch = {
        title: getVal(editDrawer, '요구사항명') || prev.title,
        requirementType: getVal(editDrawer, '유형') || prev.requirementType,
        priority: getVal(editDrawer, '우선순위') || prev.priority,
        owner: getVal(editDrawer, '담당자') || prev.owner,
        background: getVal(editDrawer, '배경'),
        description: getVal(editDrawer, '상세 요구사항') || prev.description,
        acceptanceCriteria: getVal(editDrawer, '수용 조건'),
        menuPath: getVal(editDrawer, '관련 메뉴 경로'),
        reviewer: getVal(editDrawer, '검토자'),
        approvalStatus: getVal(editDrawer, '승인 상태'),
        reviewNote: getVal(editDrawer, '검토 메모'),
        status: v2.status,
        reviewStatus: v2.reviewStatus,
        updatedBy: BY
      };
      var statusChanged = (prev.status !== v2.status) || (prev.reviewStatus !== v2.reviewStatus);
      return db.updateRecord(STORE, id, patch).then(function () {
        return db.appendChange({
          changeId: changeId(id, statusChanged ? 'status' : 'update'), projectId: PID, artifactId: id,
          changeType: 'update', field: statusChanged ? 'status' : 'summary',
          before: statusChanged ? board.statusInfo(prev).label : null,
          after: statusChanged ? board.statusInfo({ status: v2.status, reviewStatus: v2.reviewStatus }).label : '요구사항 정보 수정',
          at: nowIso(), by: BY
        });
      });
    }).then(function () { closeDrawers(); return board.render(); })
      .catch(function (e) { alert('저장 오류: ' + e.message); });
  }

  // ── 삭제 (soft delete) ──────────────────────────────────────────────
  var CONFIRM_MSG = '이 요구사항을 삭제하시겠습니까? 삭제된 항목은 목록에서 숨겨지지만 변경이력에는 남습니다.';
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
    return rows.map(function (r) { return r.getAttribute('data-rq-id'); }).filter(Boolean);
  }

  // ── 닫기 ────────────────────────────────────────────────────────────
  function closeDrawers() {
    var scrim = document.getElementById('rq-scrim');
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.rq-drawer').forEach(function (d) { d.classList.remove('open'); });
    if (window.STAMBoardList && listRoot) window.STAMBoardList.clearActive(listRoot);
  }

  // ── 바인딩 ──────────────────────────────────────────────────────────
  var listRoot = document.querySelector('[data-stam-board-list]');
  var tbody = document.getElementById('rq-tbody');

  var regBtn = document.getElementById('rq-reg-btn');
  if (regBtn) regBtn.addEventListener('click', function () { setTimeout(resetRegister, 0); });
  if (regDrawer) {
    var regSubmit = regDrawer.querySelector('.stam-dw-foot-right .rq-btn-pri');
    if (regSubmit) regSubmit.addEventListener('click', submitRegister);
  }

  if (tbody) {
    tbody.addEventListener('click', function (e) {
      if (e.target.closest('.rq-ch')) return;
      var row = e.target.closest('.rq-data-row');
      if (!row) return;
      var id = row.getAttribute('data-rq-id');
      if (id) openDetail(id);
    });
  }

  if (detDrawer) {
    var editBtn = detDrawer.querySelector('[data-rq-open="edit"]');
    if (editBtn) editBtn.addEventListener('click', function () { if (currentId) setTimeout(function () { prefillEdit(currentId); }, 0); });
    var detDel = document.getElementById('rq-det-del-btn');
    if (detDel) detDel.addEventListener('click', function () {
      if (!currentId) return;
      if (!window.confirm(CONFIRM_MSG)) return;
      softDelete([currentId]).then(function () { closeDrawers(); return board.render(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
    });
  }

  if (editDrawer) {
    var editSubmit = editDrawer.querySelector('.stam-dw-foot-right .rq-btn-pri');
    if (editSubmit) editSubmit.addEventListener('click', submitEdit);
  }

  var delBtn = document.getElementById('rq-del-btn');
  if (delBtn) delBtn.addEventListener('click', function () {
    var ids = selectedIds();
    if (!ids.length) return;
    if (!window.confirm(CONFIRM_MSG)) return;
    softDelete(ids).then(function () { return board.render(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
  });

}());
