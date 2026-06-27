/* ============================================================================
 * STAM 화면설계서 게시판 — Local Core DB v2 CRUD 연결
 * ----------------------------------------------------------------------------
 * v2 목록(#ss-v2-tbody)과 전용 v2 Drawer(#ssv2-drawer)를 Local Core DB v2
 * (stam-core-local-db-v1 · screenSpecifications store)에 연결한다.
 *   - 등록: 직접 입력 → screenSpecifications insert (sourceType=manual)
 *   - 상세: 행 클릭 → 추적 정보(screenSpecId/screenType/templateId/연결ID/
 *     importBatchId·importRowId/일자/상태) + 변경이력 표시
 *   - 수정: updateRecord + artifactChanges append (updatedAt 갱신)
 *   - 삭제: soft delete(status=deleted) — 물리 삭제 금지, 변경이력 남김
 *   - 상태: draft/reviewing/confirmed/rejected + reviewStatus 매핑
 * 기존 화면설계서 목록/템플릿/에디터는 건드리지 않는다(회귀 방지). 템플릿/에디터
 * 고급 편집은 후속. 자동 seed/clear/deleteDatabase 없음. Firebase/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var core = window.STAM_CORE || {};
  var db = core.db, schema = core.schema;
  var board = window.STAM && window.STAM.ssBoard;
  if (!db || !schema || !board) return;

  var PID = board.PID;
  var STORE = 'screenSpecifications';
  var BY = 'prototype-user';
  var currentId = null;

  function nowIso() { return new Date().toISOString(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function genId() {
    var d = new Date();
    return 'SCR-MANUAL-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function changeId(id, kind) { return 'CHG-' + id + '-' + kind + '-' + Date.now(); }
  function esc(s) { return board.esc(s); }
  function $(id) { return document.getElementById(id); }

  var KO_TO_V2 = {
    '작성중': { status: 'draft', reviewStatus: 'Review Needed' },
    '검토요청': { status: 'reviewing', reviewStatus: 'In Review' },
    '검토완료': { status: 'reviewing', reviewStatus: 'Approved' },
    '승인완료': { status: 'confirmed', reviewStatus: 'Approved' },
    '보류': { status: 'rejected', reviewStatus: 'Rejected' }
  };
  function statusFromKo(ko) { return KO_TO_V2[ko] || KO_TO_V2['작성중']; }
  function koFromRec(rec) {
    var s = rec.status, r = rec.reviewStatus;
    if (s === 'confirmed') return '승인완료';
    if (s === 'rejected') return '보류';
    if (s === 'reviewing') return r === 'Approved' ? '검토완료' : '검토요청';
    return '작성중';
  }

  var drawer = $('ssv2-drawer'), scrim = $('ssv2-scrim');

  function setMode(mode) {
    if (drawer) drawer.setAttribute('data-mode', mode);
    var isForm = (mode === 'register' || mode === 'edit');
    var det = $('ssv2-detail'), form = $('ssv2-form'), fd = $('ssv2-foot-detail'), ff = $('ssv2-foot-form');
    if (det) det.style.display = isForm ? 'none' : '';
    if (form) form.style.display = isForm ? '' : 'none';
    if (fd) fd.style.display = isForm ? 'none' : 'flex';
    if (ff) ff.style.display = isForm ? 'flex' : 'none';
  }
  function openDrawer(mode) {
    if (scrim) scrim.style.display = 'block';
    if (drawer) drawer.setAttribute('data-open', 'true');
    setMode(mode);
  }
  function closeDrawer() {
    if (scrim) scrim.style.display = 'none';
    if (drawer) drawer.setAttribute('data-open', 'false');
  }

  function setHeader(rec) {
    var st = board.statusInfo(rec || { status: 'draft' });
    var wid = $('ssv2-wid'); if (wid) wid.textContent = (rec && rec.id) || '신규';
    var chip = $('ssv2-status-chip'); if (chip) { chip.textContent = st.label; chip.style.background = st.bg; chip.style.color = st.fg; }
    var title = $('ssv2-title'); if (title) title.textContent = rec ? board.nameOf(rec) : '새 화면설계서 등록';
  }

  // ── 상세 ────────────────────────────────────────────────────────────
  function drow(k, v) {
    return '<div class="ssv2-drow"><span class="ssv2-k">' + esc(k) + '</span><span>' + esc(v == null || v === '' ? '—' : v) + '</span></div>';
  }
  function openDetail(id) {
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      setHeader(rec);
      var h = '';
      h += drow('screenSpecId', rec.id);
      h += drow('screenName', board.nameOf(rec));
      h += drow('screenType', rec.screenType);
      h += drow('templateId', rec.templateId);
      h += drow('routePath', rec.routePath);
      h += drow('owner', board.ownerOf(rec));
      h += drow('requirementId', rec.requirementId);
      h += drow('functionId', rec.functionId);
      h += drow('wbsId', rec.wbsId);
      h += drow('menuId', rec.menuId);
      h += drow('status', rec.status);
      h += drow('reviewStatus', rec.reviewStatus);
      h += drow('sourceType', rec.sourceType || (rec.importBatchId ? 'import' : 'manual'));
      h += drow('importBatchId', rec.importBatchId);
      h += drow('importRowId', rec.importRowId);
      h += drow('createdAt', board.dpart(rec.createdAt));
      h += drow('updatedAt', board.dpart(rec.updatedAt));
      if (rec.description) h += '<div style="margin-top:8px"><div class="ssv2-k" style="margin-bottom:4px">설명</div><div style="font-size:12px;color:var(--t1);line-height:1.6">' + esc(rec.description) + '</div></div>';
      var det = $('ssv2-detail'); if (det) det.innerHTML = h;
      openDrawer('detail');
      return renderChanges(id, det);
    });
  }
  function renderChanges(id, det) {
    if (!det) return;
    return db.listRecords('artifactChanges', PID, { includeDeleted: true }).then(function (all) {
      var mine = (all || []).filter(function (c) { return c.artifactId === id; })
        .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
      var h = '<div style="margin-top:12px;border-top:1px solid var(--bd);padding-top:10px"><div class="ssv2-k" style="margin-bottom:6px">변경이력</div>';
      if (!mine.length) h += '<div style="font-size:12px;color:var(--t3)">변경 이력이 없습니다.</div>';
      else h += mine.map(function (c) {
        var what = c.changeType === 'create' ? '화면설계서 최초 등록'
          : c.changeType === 'delete' ? '화면설계서 삭제(soft delete)'
            : (c.field === 'status' ? '상태 변경 → ' + esc(c.after) : '화면설계서 수정');
        return '<div style="display:flex;gap:8px;font-size:11.5px;padding:3px 0"><span style="color:var(--t2)">' + esc(c.by || 'user') + '</span><span style="color:var(--t1)">' + what + '</span><span style="margin-left:auto;color:var(--t3)">' + esc(board.dpart(c.at)) + '</span></div>';
      }).join('');
      h += '</div>';
      det.insertAdjacentHTML('beforeend', h);
    });
  }

  // ── 폼 ──────────────────────────────────────────────────────────────
  function fillForm(rec) {
    $('ssv2-f-name').value = rec ? board.nameOf(rec) : '';
    $('ssv2-f-type').value = (rec && rec.screenType) || '';
    $('ssv2-f-status').value = rec ? koFromRec(rec) : '작성중';
    $('ssv2-f-owner').value = (rec && rec.owner) || '';
    $('ssv2-f-template').value = (rec && rec.templateId) || '';
    $('ssv2-f-route').value = (rec && rec.routePath) || '';
    $('ssv2-f-req').value = (rec && rec.requirementId) || '';
    $('ssv2-f-fun').value = (rec && rec.functionId) || '';
    $('ssv2-f-wbs').value = (rec && rec.wbsId) || '';
    $('ssv2-f-menu').value = (rec && rec.menuId) || '';
    $('ssv2-f-desc').value = (rec && rec.description) || '';
  }
  function readForm() {
    var ko = $('ssv2-f-status').value || '작성중';
    var v2 = statusFromKo(ko);
    return {
      screenName: $('ssv2-f-name').value.trim(),
      screenType: $('ssv2-f-type').value.trim(),
      owner: $('ssv2-f-owner').value.trim(),
      templateId: $('ssv2-f-template').value.trim(),
      routePath: $('ssv2-f-route').value.trim(),
      requirementId: $('ssv2-f-req').value.trim(),
      functionId: $('ssv2-f-fun').value.trim(),
      wbsId: $('ssv2-f-wbs').value.trim(),
      menuId: $('ssv2-f-menu').value.trim(),
      description: $('ssv2-f-desc').value.trim(),
      status: v2.status, reviewStatus: v2.reviewStatus
    };
  }

  function openRegister() { currentId = null; fillForm(null); setHeader(null); openDrawer('register'); }
  function openEdit(id) {
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id; fillForm(rec); setHeader(rec); openDrawer('edit');
    });
  }

  function save() {
    var f = readForm();
    if (!f.screenName) { alert('화면명을 입력하세요.'); return; }
    if (currentId) {
      var id = currentId;
      db.getRecord(STORE, id).then(function (prev) {
        if (!prev) return;
        var patch = {
          screenName: f.screenName, title: f.screenName, screenType: f.screenType, owner: f.owner,
          templateId: f.templateId, routePath: f.routePath, requirementId: f.requirementId,
          functionId: f.functionId, wbsId: f.wbsId, menuId: f.menuId, description: f.description,
          status: f.status, reviewStatus: f.reviewStatus, updatedBy: BY
        };
        var statusChanged = (prev.status !== f.status) || (prev.reviewStatus !== f.reviewStatus);
        return db.updateRecord(STORE, id, patch).then(function () {
          return db.appendChange({
            changeId: changeId(id, statusChanged ? 'status' : 'update'), projectId: PID, artifactId: id,
            changeType: 'update', field: statusChanged ? 'status' : 'summary',
            before: statusChanged ? koFromRec(prev) : null,
            after: statusChanged ? koFromRec({ status: f.status, reviewStatus: f.reviewStatus }) : '화면설계서 수정',
            at: nowIso(), by: BY
          });
        });
      }).then(function () { closeDrawer(); return board.refresh(); }).catch(function (e) { alert('저장 오류: ' + e.message); });
    } else {
      var nid = genId();
      var rec = {
        id: nid, projectId: PID, boardType: 'screenSpecification', screenSpecId: nid, sourceType: 'manual',
        screenName: f.screenName, title: f.screenName, screenType: f.screenType, owner: f.owner || '미지정',
        templateId: f.templateId, routePath: f.routePath, requirementId: f.requirementId,
        functionId: f.functionId, wbsId: f.wbsId, menuId: f.menuId, description: f.description,
        status: f.status, reviewStatus: f.reviewStatus
      };
      db.createRecord(STORE, rec).then(function () {
        return db.appendChange({ changeId: changeId(nid, 'create'), projectId: PID, artifactId: nid, changeType: 'create', field: 'screenSpecification', before: null, after: f.screenName, at: nowIso(), by: BY });
      }).then(function () { closeDrawer(); return board.refresh(); }).catch(function (e) { alert('등록 오류: ' + e.message); });
    }
  }

  var CONFIRM_MSG = '이 화면설계서를 삭제하시겠습니까? 삭제된 항목은 목록에서 숨겨지지만 변경이력에는 남습니다.';
  function del() {
    if (!currentId) return;
    if (!window.confirm(CONFIRM_MSG)) return;
    var id = currentId;
    db.softDeleteRecord(STORE, id, { by: BY, reason: '사용자 삭제' }).then(function () {
      return db.appendChange({ changeId: changeId(id, 'delete'), projectId: PID, artifactId: id, changeType: 'delete', field: 'status', before: 'active', after: 'deleted', at: nowIso(), by: BY });
    }).then(function () { closeDrawer(); return board.refresh(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
  }

  // ── 바인딩 ──────────────────────────────────────────────────────────
  // v2 행/버튼은 기존 단일 목록(#ss-tbody)에 통합 주입되므로 위임으로 처리한다.
  var tbody = $('ss-tbody');
  if (tbody) tbody.addEventListener('click', function (e) {
    var reg = e.target.closest('[data-ssv2-reg]'); if (reg) { e.stopPropagation(); openRegister(); return; }
    var ed = e.target.closest('[data-ssv2-edit]'); if (ed) { e.stopPropagation(); openEdit(ed.getAttribute('data-ssv2-edit')); return; }
    var de = e.target.closest('[data-ssv2-detail]'); if (de) { e.stopPropagation(); openDetail(de.getAttribute('data-ssv2-detail')); return; }
    var row = e.target.closest('.ssv2-int-row'); if (!row) return;
    var id = row.getAttribute('data-ssv2-id'); if (id) openDetail(id);
  });
  var closeBtn = $('ssv2-close'); if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (scrim) scrim.addEventListener('click', closeDrawer);
  var editBtn = $('ssv2-edit-btn'); if (editBtn) editBtn.addEventListener('click', function () { if (currentId) openEdit(currentId); });
  var delBtn = $('ssv2-del-btn'); if (delBtn) delBtn.addEventListener('click', del);
  var saveBtn = $('ssv2-save-btn'); if (saveBtn) saveBtn.addEventListener('click', save);
  var cancelBtn = $('ssv2-cancel-btn'); if (cancelBtn) cancelBtn.addEventListener('click', function () { if (currentId) openDetail(currentId); else closeDrawer(); });

}());
