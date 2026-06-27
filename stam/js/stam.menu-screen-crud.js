/* ============================================================================
 * STAM 메뉴구조/화면목록 게시판 — Local Core DB v2 CRUD
 * ----------------------------------------------------------------------------
 * menuScreens store(v2) 데이터의 상세/등록/수정/삭제를 단일 Drawer(#msv2-dw)로 처리.
 *   - 모드: register / detail / edit
 *   - 상세 탭: 기본 정보 / 연결 정보 / 검토 이력 / 변경 이력
 *   - Footer(상세): 삭제 · 전체 보기 · 수정
 *   - custom select: STAM.customSelect (native 파란 dropdown 없음)
 *   - soft delete만 허용 (hard delete 금지)
 *   - 변경이력: artifactChanges store
 *
 * Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var PID   = 'proto-proj-001';
  var STORE = 'menuScreens';
  var BY    = 'prototype-user';

  function $(id) { return document.getElementById(id); }
  function nowIso() { return (new Date()).toISOString(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function dpart(iso) { return String(iso || '').replace('T', ' ').slice(0, 10); }
  function changeId(id, type) { return id + '-' + type + '-' + Date.now(); }

  // ── Custom select config ─────────────────────────────────────────────────
  var CS_CFG = {
    selectSelector:   'select.msv2-sel',
    nativeMarkerAttr: 'data-msv2-cs',
    uidPrefix:        'msv2cs',
    wrapClass:        'msv2-cs',
    triggerClass:     'msv2-cs-trigger',
    valClass:         'msv2-cs-val',
    caretClass:       'msv2-cs-caret',
    panelClass:       'msv2-cs-panel',
    optClass:         'msv2-cs-opt',
    checkClass:       'msv2-cs-check',
    otextClass:       'msv2-cs-otext',
    nativeClass:      'msv2-cs-native',
    flipContainer:    '.msv2-dw-bd',
    openClass:        'open',
    upClass:          'cs-up',
    openSelector:     '.msv2-cs.open'
  };

  function resetSelects() {
    var form = document.querySelector('#msv2-dw .msv2-form-area');
    if (!form) return;
    form.querySelectorAll('.msv2-cs').forEach(function (w) {
      var nat = w.querySelector('select');
      if (nat) { nat.classList.remove('msv2-cs-native'); nat.removeAttribute('data-msv2-cs'); w.parentNode.insertBefore(nat, w); }
      w.remove();
    });
  }
  function enhanceSelects() {
    var form = document.querySelector('#msv2-dw .msv2-form-area');
    if (form && window.STAM && window.STAM.customSelect) window.STAM.customSelect.init(form, CS_CFG);
  }

  // ── 값 한글화 ─────────────────────────────────────────────────────────────
  var STATUS_KO = {
    draft: '작성중', active: '진행중', confirmed: '확정',
    hold: '보류', reviewing: '검토중', deleted: '삭제됨'
  };
  var REVIEW_KO = {
    'Review Needed': '검토 필요', 'In Review': '검토중', 'Approved': '승인완료'
  };

  function statusKo(s)  { return STATUS_KO[s]  || s || '작성중'; }
  function reviewKo(s)  { return REVIEW_KO[s]  || s || '—'; }
  function sourceKo(rec) {
    if (rec.sourceType === 'Requirement Import') return '요구사항 가져오기';
    if (rec.sourceType === 'manual')             return '직접 등록';
    return rec.importBatchId ? '요구사항 가져오기' : '직접 등록';
  }

  function statusChip(s) {
    var map = {
      draft:     ['작성중', 'rgba(100,116,139,.12)', '#64748B'],
      active:    ['진행중', 'rgba(59,130,246,.12)',  '#2563EB'],
      confirmed: ['확정',   'rgba(4,120,87,.12)',    '#047857'],
      hold:      ['보류',   'rgba(153,27,27,.12)',   '#991B1B'],
      reviewing: ['검토중', 'rgba(180,83,9,.12)',    '#B45309'],
    };
    var v = map[s] || map.draft;
    return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:' + v[1] + ';color:' + v[2] + '">' + v[0] + '</span>';
  }

  // ── Drawer 상태 ───────────────────────────────────────────────────────────
  var scrim     = $('msv2-scrim');
  var drawer    = $('msv2-dw');
  var currentId = null;

  function openDrawer(mode) {
    if (scrim)  scrim.style.display = 'block';
    if (drawer) { drawer.setAttribute('data-open', 'true'); drawer.setAttribute('data-mode', mode); }
    var tabs = $('msv2-tabs');
    if (tabs)  tabs.style.display = (mode === 'detail') ? '' : 'none';
    if (mode === 'detail') setActiveTab('info');
  }

  function closeDrawer() {
    resetSelects();
    if (scrim)  scrim.style.display = 'none';
    if (drawer) drawer.setAttribute('data-open', 'false');
    currentId = null;
  }

  function setActiveTab(tab) {
    document.querySelectorAll('.msv2-tab').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-msv2-tab') === tab);
    });
    document.querySelectorAll('.msv2-tab-panel').forEach(function (p) {
      p.style.display = (p.getAttribute('data-tab') === tab) ? '' : 'none';
    });
  }

  // ── DB ────────────────────────────────────────────────────────────────────
  function db() { return window.STAM_CORE && window.STAM_CORE.db; }

  // ── 상세 렌더링 헬퍼 ──────────────────────────────────────────────────────
  function ic(k, v) {
    return '<div class="msv2-ic"><div class="msv2-ik">' + esc(k) + '</div><div class="msv2-iv">' +
      (v || '<span style="color:var(--t3)">미지정</span>') + '</div></div>';
  }
  function linkedCard(title, val, color) {
    if (!val) {
      return '<div class="msv2-link-card msv2-link-card-empty">' +
        '<div class="msv2-link-card-lbl">' + esc(title) + '</div>' +
        '<div class="msv2-link-card-val" style="color:var(--t3)">연결 없음</div></div>';
    }
    return '<div class="msv2-link-card">' +
      '<div class="msv2-link-card-lbl" style="color:' + (color || 'var(--stam)') + '">' + esc(title) + '</div>' +
      '<div class="msv2-link-card-val"><span class="msv2-lchip">' + esc(val) + '</span></div></div>';
  }

  // ── 헤더 ─────────────────────────────────────────────────────────────────
  function setHeader(rec) {
    var head = $('msv2-head');
    if (!head) return;
    var badge = rec ? esc(rec.id) : 'NEW';
    var title = rec ? esc(rec.screenName || rec.menuName || '(이름 없음)') : '새 메뉴/화면 등록';
    var meta  = rec ? statusChip(rec.status) : '';
    head.innerHTML =
      '<div class="msv2-hrow1">' +
        '<span class="msv2-hdg-badge">' + badge + '</span>' +
        '<button class="msv2-close" id="msv2-close-btn" aria-label="닫기">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="msv2-htitle">' + title + '</div>' +
      '<div class="msv2-hmeta">' + meta + '</div>';
    var btn = $('msv2-close-btn');
    if (btn) btn.addEventListener('click', closeDrawer);
  }

  // ── 상세 탭 렌더링 ────────────────────────────────────────────────────────
  function renderDetail(rec) {
    // 기본 정보 탭
    var infoEl = $('msv2-tab-info');
    if (infoEl) infoEl.innerHTML =
      '<div class="msv2-igrid">' +
        ic('메뉴/화면 ID', '<span class="msv2-id-badge">' + esc(rec.id) + '</span>') +
        ic('화면명',       esc(rec.screenName || '미지정')) +
        ic('메뉴명',       esc(rec.menuName   || '미지정')) +
        ic('LV1',          esc(rec.lv1 || '—')) +
        ic('LV2',          esc(rec.lv2 || '—')) +
        ic('LV3',          esc(rec.lv3 || '—')) +
        ic('화면 유형',    esc(rec.screenType || '—')) +
        ic('채널',         esc(rec.channel    || '—')) +
        ic('화면 경로',    rec.routePath ? '<code class="msv2-code">' + esc(rec.routePath) + '</code>' : '—') +
        ic('담당자',       esc(rec.owner || '미지정')) +
        ic('작성 상태',    statusChip(rec.status)) +
        ic('검토 상태',    esc(reviewKo(rec.reviewStatus))) +
        ic('생성 방식',    esc(sourceKo(rec))) +
        ic('최초 등록일',  esc(dpart(rec.createdAt))) +
        ic('최종 수정일',  esc(dpart(rec.updatedAt))) +
      '</div>';

    // 연결 정보 탭
    var linkEl = $('msv2-tab-link');
    if (linkEl) linkEl.innerHTML =
      '<div class="msv2-link-cards">' +
        linkedCard('연결 요구사항',   rec.requirementId,        'var(--stam)') +
        linkedCard('연결 기능정의',   rec.functionId,           '#7C3AED') +
        linkedCard('연결 화면설계서', rec.screenSpecificationId,'#0369A1') +
      '</div>';

    // 검토 이력 탭
    var reviewEl = $('msv2-tab-review');
    if (reviewEl) reviewEl.innerHTML = '<p class="msv2-empty">검토 이력이 없습니다.</p>';

    // 변경 이력 탭
    var histEl = $('msv2-tab-history');
    if (histEl) {
      var d = db();
      if (!d) { histEl.innerHTML = '<p class="msv2-empty">변경 이력이 없습니다.</p>'; return; }
      d.listRecords('artifactChanges', PID, { includeDeleted: true }).then(function (all) {
        var items = (all || []).filter(function (c) { return c.artifactId === rec.id; })
          .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
        if (!items.length) { histEl.innerHTML = '<p class="msv2-empty">변경 이력이 없습니다.</p>'; return; }
        var html = '<div class="msv2-chg-list">';
        items.forEach(function (c) {
          var who  = c.by === BY ? '작업자' : (c.by || '시스템');
          var what = c.changeType === 'create' ? '메뉴/화면을 등록했습니다.'
            : c.changeType === 'delete'  ? '메뉴/화면을 삭제했습니다.'
            : c.changeType === 'status'  ? ('상태를 변경했습니다. ' + esc(statusKo(c.before)) + ' → ' + esc(statusKo(c.after)))
            : c.changeType === 'update'  ? '내용을 수정했습니다.'
            : esc(c.changeType || '변경');
          html += '<div class="msv2-chg-item"><span class="msv2-chg-dot"></span>' +
            '<span><b>' + esc(who) + '</b> ' + what + '</span>' +
            '<span class="msv2-chg-sp"></span>' +
            '<span class="msv2-chg-date">' + esc(dpart(c.at)) + '</span></div>';
        });
        html += '</div>';
        histEl.innerHTML = html;
      }).catch(function () {
        histEl.innerHTML = '<p class="msv2-empty">변경 이력을 불러올 수 없습니다.</p>';
      });
    }
  }

  // ── 푸터 렌더링 ───────────────────────────────────────────────────────────
  function renderFooter(mode, rec) {
    var foot = $('msv2-foot');
    if (!foot) return;
    if (mode === 'detail') {
      foot.innerHTML =
        '<div class="msv2-foot-meta"><span>최종 수정: ' + esc(dpart(rec && rec.updatedAt)) + '</span></div>' +
        '<div class="msv2-foot-spacer"></div>' +
        '<div class="msv2-foot-right">' +
          '<button class="msv2-fbtn msv2-fbtn-danger"  id="msv2-del-btn"  type="button">삭제</button>' +
          '<button class="msv2-fbtn msv2-fbtn-ghost"   id="msv2-view-btn" type="button">전체 보기</button>' +
          '<button class="msv2-fbtn msv2-fbtn-primary" id="msv2-edit-btn" type="button">수정</button>' +
        '</div>';
      var delBtn  = $('msv2-del-btn');  if (delBtn)  delBtn.addEventListener('click',  del);
      var editBtn = $('msv2-edit-btn'); if (editBtn) editBtn.addEventListener('click',  function () { openEdit(currentId); });
    } else {
      foot.innerHTML =
        '<div class="msv2-foot-spacer"></div>' +
        '<div class="msv2-foot-right">' +
          '<button class="msv2-fbtn msv2-fbtn-ghost"   id="msv2-cancel-btn" type="button">취소</button>' +
          '<button class="msv2-fbtn msv2-fbtn-primary" id="msv2-save-btn"   type="button">저장</button>' +
        '</div>';
      var cancelBtn = $('msv2-cancel-btn'); if (cancelBtn) cancelBtn.addEventListener('click', closeDrawer);
      var saveBtn   = $('msv2-save-btn');   if (saveBtn)   saveBtn.addEventListener('click',   save);
    }
  }

  // ── 폼 필드 ID 매핑 ───────────────────────────────────────────────────────
  var FMAP = {
    screenName:            'msv2-f-name',
    menuName:              'msv2-f-menuname',
    lv1:                   'msv2-f-lv1',
    lv2:                   'msv2-f-lv2',
    lv3:                   'msv2-f-lv3',
    screenType:            'msv2-f-type',
    channel:               'msv2-f-channel',
    routePath:             'msv2-f-route',
    owner:                 'msv2-f-owner',
    status:                'msv2-f-status',
    reviewStatus:          'msv2-f-review',
    requirementId:         'msv2-f-req',
    functionId:            'msv2-f-func',
    screenSpecificationId: 'msv2-f-spec',
  };

  function fillForm(rec) {
    Object.keys(FMAP).forEach(function (k) {
      var el = $(FMAP[k]);
      if (!el) return;
      el.value = (rec && rec[k] != null) ? rec[k] : '';
    });
  }

  function readForm() {
    var f = {};
    Object.keys(FMAP).forEach(function (k) {
      var el = $(FMAP[k]);
      if (el) f[k] = el.value.trim();
    });
    return f;
  }

  // ── Drawer 열기 ──────────────────────────────────────────────────────────
  function openRegister() {
    currentId = null;
    resetSelects();
    fillForm(null);
    setHeader(null);
    renderFooter('register', null);
    openDrawer('register');
    enhanceSelects();
  }

  function openDetail(id) {
    var d = db(); if (!d) return;
    d.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      setHeader(rec);
      renderDetail(rec);
      renderFooter('detail', rec);
      openDrawer('detail');
    });
  }

  function openEdit(id) {
    var d = db(); if (!d) return;
    d.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      resetSelects();
      fillForm(rec);
      setHeader(rec);
      renderFooter('edit', rec);
      openDrawer('edit');
      enhanceSelects();
    });
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function save() {
    var d = db(); if (!d) return;
    var f = readForm();
    if (!f.screenName) { alert('화면명을 입력하세요.'); return; }

    if (currentId) {
      var id    = currentId;
      var patch = Object.assign({}, f, { updatedAt: nowIso() });
      d.updateRecord(STORE, id, patch)
        .then(function () {
          return d.appendChange({ changeId: changeId(id, 'update'), projectId: PID, artifactId: id,
            changeType: 'update', field: 'menuScreen', before: null, after: f.screenName, at: nowIso(), by: BY });
        })
        .then(function () { closeDrawer(); return refresh(); })
        .catch(function (e) { alert('저장 오류: ' + e.message); });
    } else {
      var now  = nowIso();
      var nid  = 'MENU-MANUAL-' + now.slice(0, 10).replace(/-/g, '') + '-' + now.slice(11, 19).replace(/:/g, '');
      var rec  = Object.assign({
        id: nid, projectId: PID, sourceType: 'manual',
        status: f.status || 'draft', reviewStatus: f.reviewStatus || 'Review Needed',
        createdAt: now, updatedAt: now
      }, f);
      d.createRecord(STORE, rec)
        .then(function () {
          return d.appendChange({ changeId: changeId(nid, 'create'), projectId: PID, artifactId: nid,
            changeType: 'create', field: 'menuScreen', before: null, after: f.screenName, at: now, by: BY });
        })
        .then(function () { closeDrawer(); return refresh(); })
        .catch(function (e) { alert('등록 오류: ' + e.message); });
    }
  }

  function del() {
    if (!currentId) return;
    if (!confirm('이 메뉴/화면을 삭제하시겠습니까?')) return;
    var d = db(); if (!d) return;
    var id = currentId;
    d.softDeleteRecord(STORE, id, { by: BY, reason: '사용자 삭제' })
      .then(function () {
        return d.appendChange({ changeId: changeId(id, 'delete'), projectId: PID, artifactId: id,
          changeType: 'delete', field: 'status', before: 'active', after: 'deleted', at: nowIso(), by: BY });
      })
      .then(function () { closeDrawer(); return refresh(); })
      .catch(function (e) { alert('삭제 오류: ' + e.message); });
  }

  function refresh() {
    if (window.STAM && window.STAM.mslv2 && window.STAM.mslv2.refresh) {
      return window.STAM.mslv2.refresh();
    }
    return Promise.resolve();
  }

  // ── 이벤트 바인딩 ────────────────────────────────────────────────────────
  // data-msv2-reg: 헤더 버튼 포함 어디서든 직접 등록 열기 (캡처 위임)
  document.addEventListener('click', function (e) {
    var reg = e.target.closest('[data-msv2-reg]');
    if (reg) { e.stopPropagation(); openRegister(); return; }
  }, true);

  // tbody: v2 행 클릭 → 상세/수정
  var tbody = $('msl-tbody');
  if (tbody) tbody.addEventListener('click', function (e) {
    var ed  = e.target.closest('[data-msv2-edit]');   if (ed)  { e.stopPropagation(); openEdit(ed.getAttribute('data-msv2-edit'));       return; }
    var de  = e.target.closest('[data-msv2-detail]'); if (de)  { e.stopPropagation(); openDetail(de.getAttribute('data-msv2-detail'));   return; }
    var row = e.target.closest('.msv2-int-row');      if (!row) return;
    var id  = row.getAttribute('data-msv2-id');       if (id)  openDetail(id);
  });

  // scrim 클릭 → 닫기
  if (scrim) scrim.addEventListener('click', closeDrawer);

  // 탭 전환
  var tabsEl = $('msv2-tabs');
  if (tabsEl) tabsEl.addEventListener('click', function (e) {
    var t = e.target.closest('.msv2-tab'); if (!t) return;
    setActiveTab(t.getAttribute('data-msv2-tab'));
  });

  window.STAM = window.STAM || {};
  window.STAM.mslCrud = { openDetail: openDetail, openEdit: openEdit, openRegister: openRegister };

}());
