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

  // ── 수정 모드 select → 공통 STAM custom select (요구사항정의서와 동일 동작/스타일) ──
  var SSV2_CS_CFG = {
    selectSelector: '#ssv2-form select',
    nativeMarkerAttr: 'data-ssv2-cs',
    uidPrefix: 'ssv2cs',
    wrapClass: 'ssv2-cs',
    triggerClass: 'ssv2-cs-trigger',
    valClass: 'ssv2-cs-val',
    caretClass: 'ssv2-cs-caret',
    panelClass: 'ssv2-cs-panel',
    optClass: 'ssv2-cs-opt',
    checkClass: 'ssv2-cs-check',
    otextClass: 'ssv2-cs-otext',
    nativeClass: 'ssv2-cs-native',
    flipContainer: '.ssv2-dw-bd',
    openClass: 'open',
    upClass: 'cs-up',
    openSelector: '.ssv2-cs.open'
  };
  function hasCS() { return !!(window.STAM && window.STAM.customSelect); }
  function closeAllSelects() { if (hasCS()) window.STAM.customSelect.closeAll(document, SSV2_CS_CFG); }
  // 값이 매 레코드마다 바뀌므로, 빌드된 custom select 를 native 로 복원 후 다시 빌드한다
  // (custom-select 모듈은 1회 빌드만 하므로 값 동기화를 위해 reset → fill → enhance 순서로 사용).
  function resetSelects() {
    var form = $('ssv2-form'); if (!form) return;
    form.querySelectorAll('.ssv2-cs').forEach(function (w) {
      var nat = w.querySelector('select');
      if (nat) { nat.classList.remove('ssv2-cs-native'); nat.removeAttribute('data-ssv2-cs'); w.parentNode.insertBefore(nat, w); }
      w.remove();
    });
  }
  function enhanceSelects() { var form = $('ssv2-form'); if (form && hasCS()) window.STAM.customSelect.init(form, SSV2_CS_CFG); }

  function setMode(mode) {
    if (drawer) drawer.setAttribute('data-mode', mode);
    var isForm = (mode === 'register' || mode === 'edit');
    if (!isForm) closeAllSelects();
    var det = $('ssv2-detail'), form = $('ssv2-form'), fd = $('ssv2-foot-detail'), ff = $('ssv2-foot-form');
    var tabs = $('ssv2-tabs'), hmeta = $('ssv2-hmeta');
    if (det) det.style.display = isForm ? 'none' : '';
    if (form) form.style.display = isForm ? '' : 'none';
    if (tabs) tabs.style.display = isForm ? 'none' : 'flex';
    if (hmeta) hmeta.style.display = isForm ? 'none' : 'flex';
    if (fd) fd.style.display = isForm ? 'none' : 'flex';
    if (ff) ff.style.display = isForm ? 'flex' : 'none';
  }
  function openDrawer(mode) {
    if (scrim) scrim.style.display = 'block';
    if (drawer) drawer.setAttribute('data-open', 'true');
    setMode(mode);
  }
  function closeDrawer() {
    closeAllSelects();
    if (scrim) scrim.style.display = 'none';
    if (drawer) drawer.setAttribute('data-open', 'false');
  }

  // ── 값 → 한글 표시 ──────────────────────────────────────────────────
  function reviewKo(r) { return ({ 'Review Needed': '검토 필요', 'In Review': '검토중', 'Approved': '승인완료', 'Rejected': '반려', 'Changed': '변경됨' })[r] || (r || '미지정'); }
  function sourceKo(rec) {
    var s = rec.sourceType;
    if (s === 'manual') return '직접 등록';
    if (s === 'Requirement Import') return '요구사항 가져오기';
    if (!s) return rec.importBatchId ? '요구사항 가져오기' : '직접 등록';
    return s;
  }
  function approvalKo(rec) {
    if (rec.status === 'confirmed') return '승인완료';
    if (rec.status === 'rejected') return '반려';
    if (rec.reviewStatus === 'Approved') return '승인완료';
    return '미승인';
  }
  function statusChipHtml(rec) {
    var st = board.statusInfo(rec);
    return '<span class="ssv2-stchip" style="background:' + st.bg + ';color:' + st.fg + '">' + esc(st.label) + '</span>';
  }

  function setHeader(rec) {
    var st = board.statusInfo(rec || { status: 'draft' });
    var wid = $('ssv2-wid'); if (wid) wid.textContent = (rec && rec.id) || '신규';
    var chip = $('ssv2-status-chip'); if (chip) { chip.textContent = st.label; chip.style.background = st.bg; chip.style.color = st.fg; }
    var title = $('ssv2-title'); if (title) title.textContent = rec ? board.nameOf(rec) : '새 화면설계서 등록';
    var hmeta = $('ssv2-hmeta');
    if (hmeta) {
      if (!rec) { hmeta.innerHTML = ''; return; }
      var owner = board.ownerOf(rec);
      var ini = esc(String(owner).charAt(0) || '?');
      hmeta.innerHTML = '<span class="ssv2-typechip">' + esc(rec.screenType || '화면') + '</span>' +
        '<span class="ssv2-ava">' + ini + '</span><span style="font-size:11.5px;color:var(--t2)">' + esc(owner) + '</span>';
    }
  }

  // ── 상세 (요구사항정의서 공통 상세 레이아웃: 탭 + igrid + 카드 + 타임라인) ──
  function ic(label, value, opts) {
    opts = opts || {};
    var empty = (value == null || value === '');
    var inner = opts.html ? value : esc(empty ? (opts.empty || '미지정') : value);
    return '<div class="ssv2-ic' + (opts.full ? ' full' : '') + '">' +
      '<div class="ssv2-ik">' + esc(label) + '</div>' +
      '<div class="ssv2-iv' + (empty && !opts.html ? ' muted' : '') + '">' + inner +
      (opts.sub ? ' <small>' + esc(opts.sub) + '</small>' : '') + '</div></div>';
  }
  function card(label, id, typeName, color) {
    var has = !!id;
    var icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:' + (has ? (color || 'var(--stam)') : 'var(--t3)') + '"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>';
    return '<div class="ssv2-card">' + icon +
      '<div style="min-width:0"><div class="ssv2-card-id' + (has ? '' : ' none') + '"' + ((has && color) ? (' style="color:' + color + '"') : '') + '>' + esc(has ? id : '연결 없음') + '</div>' +
      '<div class="ssv2-card-name">' + esc(label) + '</div></div>' +
      '<span class="ssv2-card-type">' + esc(typeName) + '</span></div>';
  }
  function setPanel(idx, html) { if (!drawer) return; var p = drawer.querySelector('.ssv2-tabpanel[data-tp="' + idx + '"]'); if (p) p.innerHTML = html; }
  function setActiveTab(idx) {
    if (!drawer) return;
    drawer.querySelectorAll('.ssv2-tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-ssv2-tab') === String(idx)); });
    drawer.querySelectorAll('.ssv2-tabpanel').forEach(function (p) { p.style.display = p.getAttribute('data-tp') === String(idx) ? '' : 'none'; });
  }

  function openDetail(id) {
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      setHeader(rec);
      var fmeta = $('ssv2-foot-meta'); if (fmeta) fmeta.textContent = rec.updatedAt ? ('최종 변경 ' + board.dpart(rec.updatedAt)) : '';
      setActiveTab(0);
      // 탭 0: 기본 정보 (카드/grid) + 설명
      var srcSub = rec.importBatchId ? ('가져오기 회차 ' + rec.importBatchId + (rec.importRowId ? ' · 원본 행 ' + rec.importRowId : '')) : '';
      var g = '<div class="ssv2-sec"><div class="ssv2-sec-hdr"><h3>기본 정보</h3></div><div class="ssv2-igrid">';
      g += ic('화면 ID', '<span style="font-weight:700;color:var(--stam)">' + esc(rec.id) + '</span>', { html: true });
      g += ic('화면명', board.nameOf(rec));
      g += ic('화면 유형', rec.screenType);
      g += ic('작성 상태', statusChipHtml(rec), { html: true });
      g += ic('검토 상태', reviewKo(rec.reviewStatus));
      g += ic('승인 상태', approvalKo(rec));
      g += ic('담당자', rec.owner, { empty: '미지정' });
      g += ic('적용 템플릿', rec.templateId);
      g += ic('화면 경로', rec.routePath);
      g += ic('생성 방식', sourceKo(rec), { sub: srcSub });
      g += ic('최초 등록일', board.dpart(rec.createdAt));
      g += ic('최종 수정일', board.dpart(rec.updatedAt));
      g += '</div></div>';
      g += '<div class="ssv2-sec"><div class="ssv2-sec-hdr"><h3>설명</h3></div>' +
        (rec.description ? '<div class="ssv2-purp">' + esc(rec.description) + '</div>' : '<div class="ssv2-empty">화면설계서 설명이 없습니다.</div>') + '</div>';
      setPanel(0, g);
      // 탭 1: 연결 정보 (카드형)
      var linkN = [rec.requirementId, rec.functionId, rec.wbsId, rec.menuId].filter(Boolean).length;
      var c = '<div class="ssv2-sec"><div class="ssv2-sec-hdr"><h3>연결 정보</h3><span class="ssv2-sec-badge">연결 ' + linkN + '</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">';
      c += card('연결 요구사항', rec.requirementId, '요구사항', 'var(--stam)');
      c += card('연결 기능정의', rec.functionId, '기능정의', '#10B981');
      c += card('연결 WBS', rec.wbsId, 'WBS', '#8B5CF6');
      c += card('연결 메뉴', rec.menuId, '메뉴/화면', '#F59E0B');
      c += '</div></div>';
      setPanel(1, c);
      openDrawer('detail');
      return renderHistory(id);
    });
  }

  function renderHistory(id) {
    return db.listRecords('artifactChanges', PID, { includeDeleted: true }).then(function (all) {
      var mine = (all || []).filter(function (c) { return c.artifactId === id; })
        .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
      // 탭 2: 검토 이력 (현재 데이터 없음 → fallback)
      setPanel(2, '<div class="ssv2-sec"><div class="ssv2-sec-hdr"><h3>검토 이력</h3></div><div class="ssv2-empty">검토 이력이 없습니다.</div></div>');
      // 탭 3: 변경 이력 (타임라인)
      var h = '<div class="ssv2-sec"><div class="ssv2-sec-hdr"><h3>변경 이력</h3><span class="ssv2-sec-badge">' + mine.length + '건</span></div>';
      if (!mine.length) h += '<div class="ssv2-empty">변경 이력이 없습니다.</div>';
      else h += '<div class="ssv2-chg-list">' + mine.map(function (c) {
        var who = (!c.by || c.by === 'prototype-user') ? '작업자' : c.by;
        var what = c.changeType === 'create' ? '화면설계서를 등록했습니다.'
          : c.changeType === 'delete' ? '화면설계서를 삭제했습니다.'
            : (c.field === 'status' ? '작성 상태를 변경했습니다.' : '화면설계서를 수정했습니다.');
        return '<div class="ssv2-chg-item"><span class="ssv2-chg-dot"></span>' +
          '<span><span class="ssv2-chg-who">' + esc(who) + '</span> — ' + what + '</span>' +
          '<span class="ssv2-chg-sp"></span><span class="ssv2-chg-date">' + esc(board.dpart(c.at)) + '</span></div>';
      }).join('') + '</div>';
      h += '</div>';
      setPanel(3, h);
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

  function openRegister() {
    currentId = null; resetSelects(); fillForm(null); setHeader(null); openDrawer('register'); enhanceSelects();
  }
  function openEdit(id) {
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id; resetSelects(); fillForm(rec); setHeader(rec); openDrawer('edit'); enhanceSelects();
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
  // 탭 전환
  var tabsEl = $('ssv2-tabs');
  if (tabsEl) tabsEl.addEventListener('click', function (e) {
    var t = e.target.closest('.ssv2-tab'); if (!t) return;
    setActiveTab(t.getAttribute('data-ssv2-tab'));
  });
  // 전체 보기 (후속 연결 예정 안내)
  var fvBtn = $('ssv2-fullview-btn');
  if (fvBtn) fvBtn.addEventListener('click', function () { alert('화면설계서 전체 보기 기능은 후속 연결 예정입니다.'); });
  var editBtn = $('ssv2-edit-btn'); if (editBtn) editBtn.addEventListener('click', function () { if (currentId) openEdit(currentId); });
  var delBtn = $('ssv2-del-btn'); if (delBtn) delBtn.addEventListener('click', del);
  var saveBtn = $('ssv2-save-btn'); if (saveBtn) saveBtn.addEventListener('click', save);
  var cancelBtn = $('ssv2-cancel-btn'); if (cancelBtn) cancelBtn.addEventListener('click', function () { if (currentId) openDetail(currentId); else closeDrawer(); });

  // custom select: 바깥 클릭 → 닫기 / ESC → 열린 패널 우선 닫기
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.ssv2-cs')) closeAllSelects();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.ssv2-cs.open')) { e.preventDefault(); e.stopPropagation(); closeAllSelects(); }
  }, true);

}());
