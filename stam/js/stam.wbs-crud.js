/* ============================================================================
 * STAM WBS 게시판 — Local Core DB v2 CRUD 연결
 * ----------------------------------------------------------------------------
 * v2 작업 목록(#wbs-v2-tbody)과 기존 #wbs-drawer(detail/create/edit 모드)를
 * Local Core DB v2(stam-core-local-db-v1 · wbsItems store)에 연결한다.
 *   - 등록: 기존 등록 폼(create) → wbsItems insert (sourceType=manual)
 *   - 상세: 행 클릭 → 기존 상세 Drawer + v2 추적 정보 표시
 *   - 수정: 기존 수정 폼(edit) → updateRecord + artifactChanges append
 *   - 삭제: soft delete(status=deleted) — 물리 삭제 금지, 변경이력 남김
 *   - 상태: draft/reviewing/confirmed/rejected + reviewStatus 매핑
 * 간트/그룹 정적 테이블은 건드리지 않는다. 목록 렌더는 window.STAM.wbsBoard.
 * 자동 seed/clear/deleteDatabase 없음. Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var core = window.STAM_CORE || {};
  var db = core.db, schema = core.schema;
  var board = window.STAM && window.STAM.wbsBoard;
  if (!db || !schema || !board) return;

  var PID = board.PID;
  var STORE = 'wbsItems';
  var BY = 'prototype-user';
  var currentId = null;

  function nowIso() { return new Date().toISOString(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function genWbsId() {
    var d = new Date();
    return 'WBS-MANUAL-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function changeId(id, kind) { return 'CHG-' + id + '-' + kind + '-' + Date.now(); }
  function esc(s) { return board.esc(s); }

  // 진행상태(한글 toggle) ↔ v2
  var KO_TO_V2 = {
    '대기': { status: 'draft', reviewStatus: 'Review Needed' },
    '진행중': { status: 'reviewing', reviewStatus: 'In Review' },
    '지연': { status: 'reviewing', reviewStatus: 'In Review' },
    '완료': { status: 'confirmed', reviewStatus: 'Approved' },
    '보류': { status: 'rejected', reviewStatus: 'Rejected' }
  };
  function statusFromKo(ko) { return KO_TO_V2[ko] || KO_TO_V2['대기']; }
  function koFromStatus(rec) {
    if (rec.status === 'confirmed') return '완료';
    if (rec.status === 'rejected') return '보류';
    if (rec.status === 'reviewing') return '진행중';
    return '대기';
  }

  // ── 폼 접근 (label 기준, body scope) ────────────────────────────────
  function rowByLabel(body, label) {
    var rows = body.querySelectorAll('.wbs-form-row');
    for (var i = 0; i < rows.length; i++) {
      var lbl = rows[i].querySelector('.wbs-form-label');
      if (lbl && lbl.textContent.trim().indexOf(label) === 0) return rows[i];
    }
    return null;
  }
  function inGet(body, label) { var r = rowByLabel(body, label); var el = r && r.querySelector('input,textarea'); return el ? String(el.value || '').trim() : ''; }
  function inSet(body, label, v) { var r = rowByLabel(body, label); var el = r && r.querySelector('input,textarea'); if (el) el.value = v == null ? '' : v; }
  function selGet(body, label) { var r = rowByLabel(body, label); var b = r && r.querySelector('[data-wbs-sel]'); return b ? (b.getAttribute('data-sel-val') || '') : ''; }
  function selSet(body, label, v) {
    var r = rowByLabel(body, label); var b = r && r.querySelector('[data-wbs-sel]'); if (!b) return;
    b.setAttribute('data-sel-val', v || '');
    var sp = b.querySelector('.wbs-sel-sp'); if (sp) { sp.textContent = v || '— 선택 —'; sp.classList.toggle('is-placeholder', !v); }
    var tg = b.querySelector('.wbs-sel'); if (tg) tg.classList.toggle('placeholder', !v);
  }
  function dpGet(body, label) { var r = rowByLabel(body, label); var d = r && r.querySelector('[data-wbs-dp]'); return d ? (d.getAttribute('data-dp-val') || '') : ''; }
  function dpSet(body, label, v) {
    var r = rowByLabel(body, label); var d = r && r.querySelector('[data-wbs-dp]'); if (!d) return;
    d.setAttribute('data-dp-val', v || '');
    var vEl = d.querySelector('.wbs-dp-val'); if (vEl) { vEl.textContent = v || '날짜 선택'; vEl.classList.toggle('ph', !v); }
  }
  function togGet(body, label) { var r = rowByLabel(body, label); var a = r && r.querySelector('.wbs-form-toggle.active'); return a ? a.textContent.trim() : ''; }
  function togSet(body, label, v) {
    var r = rowByLabel(body, label); if (!r) return;
    r.querySelectorAll('.wbs-form-toggle').forEach(function (b) { b.classList.toggle('active', b.textContent.trim() === v); });
  }

  // record ← create/edit form
  function readForm(body) {
    var ko = togGet(body, '진행상태') || '대기';
    var v2 = statusFromKo(ko);
    return {
      taskName: inGet(body, '작업명'),
      taskType: selGet(body, '단계'),
      functionGroup: inGet(body, '기능그룹'),
      menuPath: inGet(body, '메뉴/화면'),
      assignee: selGet(body, '담당자'),
      reviewer: selGet(body, '검토자'),
      priority: togGet(body, '우선순위') || '보통',
      startDate: dpGet(body, '시작일'),
      endDate: dpGet(body, '종료일'),
      effortEstimate: inGet(body, '예상 공수'),
      description: inGet(body, '작업 설명'),
      status: v2.status, reviewStatus: v2.reviewStatus
    };
  }
  function writeForm(body, rec) {
    inSet(body, '작업명', rec.title || rec.taskName || '');
    selSet(body, '단계', board.taskTypeOf(rec));
    inSet(body, '기능그룹', rec.functionGroup || '');
    inSet(body, '메뉴/화면', rec.menuPath || '');
    selSet(body, '담당자', rec.assignee || rec.owner || '');
    selSet(body, '검토자', rec.reviewer || '');
    togSet(body, '진행상태', koFromStatus(rec));
    togSet(body, '우선순위', rec.priority || '보통');
    dpSet(body, '시작일', rec.startDate || '');
    dpSet(body, '종료일', rec.endDate || '');
    inSet(body, '예상 공수', rec.effortEstimate || '');
    inSet(body, '작업 설명', rec.description || '');
  }

  // ── 상세 표시 ───────────────────────────────────────────────────────
  var drawer = document.getElementById('wbs-drawer');
  var panel = document.getElementById('wbs-drawer-panel');
  var detailBody = drawer && drawer.querySelector('.wbs-detail-body');

  function sumSet(label, html) {
    if (!detailBody) return;
    detailBody.querySelectorAll('.wbs-dw-sum-item').forEach(function (it) {
      var k = it.querySelector('.wbs-dw-sum-k');
      if (k && k.textContent.trim().indexOf(label) === 0) { var v = it.querySelector('.wbs-dw-sum-v'); if (v) v.innerHTML = html; }
    });
  }
  function icSet(label, html) {
    if (!detailBody) return;
    detailBody.querySelectorAll('.wbs-dw-info-cell').forEach(function (it) {
      var k = it.querySelector('.wbs-dw-ik');
      if (k && k.textContent.trim().indexOf(label) === 0) { var v = it.querySelector('.wbs-dw-iv'); if (v) v.innerHTML = html; }
    });
  }

  function trackBlock(rec) {
    function row(k, v) { return '<div style="display:flex;gap:8px;padding:3px 0;font-size:11.5px"><span style="min-width:108px;color:var(--t3)">' + esc(k) + '</span><span style="color:var(--t1);word-break:break-all">' + esc(v == null || v === '' ? '—' : v) + '</span></div>'; }
    var h = '<div class="wbs-drawer-sec"><div class="wbs-drawer-sec-title">추적 정보 (Local Core DB v2)</div><div>';
    h += row('wbsId', rec.id);
    h += row('taskType', board.taskTypeOf(rec));
    h += row('requirementId', rec.requirementId);
    h += row('functionId', rec.functionId);
    h += row('screenId', rec.screenId);
    h += row('parentWbsId', rec.parentWbsId);
    h += row('assignee', rec.assignee || rec.owner);
    h += row('기간', board.periodOf(rec));
    h += row('progress', (rec.progress != null && rec.progress !== '') ? rec.progress + '%' : '0%');
    h += row('status', rec.status);
    h += row('reviewStatus', rec.reviewStatus);
    h += row('sourceType', rec.sourceType || (rec.importBatchId ? 'import' : 'manual'));
    h += row('importBatchId', rec.importBatchId);
    h += row('importRowId', rec.importRowId);
    h += row('createdAt', board.dpart(rec.createdAt));
    h += row('updatedAt', board.dpart(rec.updatedAt));
    h += '</div></div>';
    return h;
  }

  function openDetail(id) {
    if (!detailBody) return Promise.resolve();
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      var st = board.statusInfo(rec);
      var wid = document.getElementById('wbs-dw-wid'); if (wid) wid.textContent = rec.id;
      var title = document.getElementById('wbs-dw-title'); if (title) title.textContent = rec.title || rec.taskName || '(작업명 없음)';
      var desc = detailBody.querySelector('.wbs-dw-desc'); if (desc) desc.textContent = rec.description || '—';
      sumSet('담당자', esc(rec.assignee || rec.owner || '미지정'));
      sumSet('검토자', esc(rec.reviewer || '—'));
      sumSet('기간', esc(board.periodOf(rec)));
      sumSet('공수', esc(rec.effortEstimate || '—'));
      sumSet('기간판정', '<span style="display:inline-block;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;background:' + st.bg + ';color:' + st.fg + '">' + esc(st.label) + '</span>');
      icSet('단계', '<span class="wbs-type-chip">' + esc(board.taskTypeOf(rec)) + '</span>');
      icSet('기능그룹', esc(rec.functionGroup || '—'));
      icSet('메뉴/화면', esc(rec.menuPath || '—'));
      icSet('우선순위', esc(rec.priority || '보통'));
      icSet('승인상태', esc(rec.reviewStatus || '—'));
      icSet('시작일', esc(rec.startDate || '—'));
      icSet('종료일', esc(rec.endDate || '—'));
      icSet('예상공수', esc(rec.effortEstimate || '—'));
      var pct = (rec.progress != null && rec.progress !== '') ? rec.progress : 0;
      var pl = detailBody.querySelector('.wbs-dw-prog-pct-label'); if (pl) pl.textContent = pct + '%';
      var pf = detailBody.querySelector('.wbs-dw-prog-fill'); if (pf) { pf.className = 'wbs-prog-fill'; pf.style.width = pct + '%'; }
      // v2 추적 블록 (idempotent)
      var old = document.getElementById('wbs-dw-v2track'); if (old) old.parentNode.removeChild(old);
      var wrap = document.createElement('div'); wrap.id = 'wbs-dw-v2track'; wrap.innerHTML = trackBlock(rec);
      detailBody.appendChild(wrap);
      return renderChanges(id);
    });
  }

  function renderChanges(id) {
    var host = document.getElementById('wbs-dw-v2track');
    if (!host) return;
    return db.listRecords('artifactChanges', PID, { includeDeleted: true }).then(function (all) {
      var mine = (all || []).filter(function (c) { return c.artifactId === id; })
        .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
      var h = '<div class="wbs-drawer-sec"><div class="wbs-drawer-sec-title">변경이력 (v2)</div>';
      if (!mine.length) h += '<div style="font-size:12px;color:var(--t3)">변경 이력이 없습니다.</div>';
      else h += mine.map(function (c) {
        var what = c.changeType === 'create' ? 'WBS 작업 최초 등록'
          : c.changeType === 'delete' ? 'WBS 작업 삭제(soft delete)'
            : (c.field === 'status' ? '상태 변경 → ' + esc(c.after) : 'WBS 작업 수정');
        return '<div style="display:flex;gap:8px;font-size:11.5px;padding:3px 0"><span style="color:var(--t2)">' + esc(c.by || 'user') + '</span><span style="color:var(--t1)">' + what + '</span><span style="margin-left:auto;color:var(--t3)">' + esc(board.dpart(c.at)) + '</span></div>';
      }).join('');
      h += '</div>';
      host.insertAdjacentHTML('beforeend', h);
    });
  }

  // ── 등록 ────────────────────────────────────────────────────────────
  var createBody = drawer && drawer.querySelector('.wbs-create-body');
  function resetCreate() {
    if (!createBody) return;
    inSet(createBody, '작업명', ''); inSet(createBody, '기능그룹', ''); inSet(createBody, '메뉴/화면', '');
    inSet(createBody, '예상 공수', ''); inSet(createBody, '실 공수', ''); inSet(createBody, '작업 설명', '');
    selSet(createBody, '단계', ''); selSet(createBody, '담당자', ''); selSet(createBody, '검토자', '');
    dpSet(createBody, '시작일', ''); dpSet(createBody, '종료일', '');
    togSet(createBody, '진행상태', '대기'); togSet(createBody, '우선순위', '보통');
  }
  function submitCreate() {
    if (!createBody) return;
    var f = readForm(createBody);
    if (!f.taskName) { alert('작업명을 입력하세요.'); return; }
    var id = genWbsId();
    var rec = {
      id: id, projectId: PID, boardType: 'wbs', wbsId: id, sourceType: 'manual',
      title: f.taskName, taskName: f.taskName, taskType: f.taskType || '작업',
      functionGroup: f.functionGroup, menuPath: f.menuPath,
      assignee: f.assignee || '미지정', owner: f.assignee || '미지정', reviewer: f.reviewer,
      priority: f.priority, startDate: f.startDate, endDate: f.endDate,
      effortEstimate: f.effortEstimate, progress: 0,
      description: f.description, requirementId: '', functionId: '', screenId: '', parentWbsId: '',
      status: f.status, reviewStatus: f.reviewStatus
    };
    db.createRecord(STORE, rec)
      .then(function () {
        return db.appendChange({ changeId: changeId(id, 'create'), projectId: PID, artifactId: id, changeType: 'create', field: 'wbs', before: null, after: f.taskName, at: nowIso(), by: BY });
      })
      .then(function () { closeDrawer(); return board.render(); })
      .catch(function (e) { alert('등록 오류: ' + e.message); });
  }

  // ── 수정 ────────────────────────────────────────────────────────────
  var editBody = drawer && drawer.querySelector('.wbs-edit-body');
  function prefillEdit(id) {
    if (!editBody) return;
    db.getRecord(STORE, id).then(function (rec) { if (rec) writeForm(editBody, rec); });
  }
  function submitEdit() {
    if (!editBody || !currentId) return;
    var id = currentId;
    db.getRecord(STORE, id).then(function (prev) {
      if (!prev) return;
      var f = readForm(editBody);
      var patch = {
        title: f.taskName || prev.title, taskName: f.taskName || prev.taskName,
        taskType: f.taskType || prev.taskType, functionGroup: f.functionGroup, menuPath: f.menuPath,
        assignee: f.assignee || prev.assignee, owner: f.assignee || prev.owner, reviewer: f.reviewer,
        priority: f.priority, startDate: f.startDate, endDate: f.endDate,
        effortEstimate: f.effortEstimate, description: f.description,
        status: f.status, reviewStatus: f.reviewStatus, updatedBy: BY
      };
      var statusChanged = (prev.status !== f.status) || (prev.reviewStatus !== f.reviewStatus);
      return db.updateRecord(STORE, id, patch).then(function () {
        return db.appendChange({
          changeId: changeId(id, statusChanged ? 'status' : 'update'), projectId: PID, artifactId: id,
          changeType: 'update', field: statusChanged ? 'status' : 'summary',
          before: statusChanged ? koFromStatus(prev) : null,
          after: statusChanged ? koFromStatus({ status: f.status }) : 'WBS 작업 수정', at: nowIso(), by: BY
        });
      });
    }).then(function () { closeDrawer(); return board.render(); })
      .catch(function (e) { alert('저장 오류: ' + e.message); });
  }

  // ── 삭제 (soft delete) ──────────────────────────────────────────────
  var CONFIRM_MSG = '이 WBS 작업을 삭제하시겠습니까? 삭제된 항목은 목록에서 숨겨지지만 변경이력에는 남습니다.';
  function softDelete(id) {
    return db.softDeleteRecord(STORE, id, { by: BY, reason: '사용자 삭제' }).then(function () {
      return db.appendChange({ changeId: changeId(id, 'delete'), projectId: PID, artifactId: id, changeType: 'delete', field: 'status', before: 'active', after: 'deleted', at: nowIso(), by: BY });
    });
  }

  function closeDrawer() {
    if (drawer) drawer.setAttribute('data-open', 'false');
    if (panel) panel.setAttribute('data-mode', 'detail');
  }

  // ── 바인딩 ──────────────────────────────────────────────────────────
  var tbody = document.getElementById('wbs-v2-tbody');
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      var row = e.target.closest('.wbs-v2-row');
      if (!row) return;
      var id = row.getAttribute('data-wbs-id');
      if (!id) return;
      openDetail(id).then(function () {
        if (drawer) drawer.setAttribute('data-open', 'true');
        if (panel) panel.setAttribute('data-mode', 'detail');
      });
    });
  }

  // 등록 버튼 → stam.wbs.js 가 create 모드로 drawer 열고, 그 뒤 폼 초기화
  var regBtn = document.getElementById('wbs-reg-btn');
  if (regBtn) regBtn.addEventListener('click', function () { setTimeout(resetCreate, 0); });

  // 상세 → 수정: stam.wbs.js 가 mode=edit 전환, 그 뒤 prefill
  var editBtn = drawer && drawer.querySelector('.wbs-drawer-edit-btn');
  if (editBtn) editBtn.addEventListener('click', function () { if (currentId) setTimeout(function () { prefillEdit(currentId); }, 0); });

  // 저장/등록 primary 버튼 (capture 단계에서 가로채 mock 다이얼로그 억제)
  var createSave = drawer && drawer.querySelector('.wbs-create-footer-slot .wbs-footer-end');
  if (createSave) createSave.addEventListener('click', function (e) { e.stopPropagation(); submitCreate(); }, true);
  var editSave = drawer && drawer.querySelector('.wbs-edit-footer-slot .wbs-footer-end');
  if (editSave) editSave.addEventListener('click', function (e) { e.stopPropagation(); submitEdit(); }, true);

  // 삭제
  var delBtn = document.getElementById('wbs-det-del-btn');
  if (delBtn) delBtn.addEventListener('click', function () {
    if (!currentId) return;
    if (!window.confirm(CONFIRM_MSG)) return;
    softDelete(currentId).then(function () { closeDrawer(); return board.render(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
  });

}());
