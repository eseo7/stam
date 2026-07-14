/* ============================================================
 * STAM WBS — 작업 목록 화면 상호작용
 * stam/pages/boards/wbs.html
 * v3.4 | 2026-06-07
 * 체크박스 선택 / 그룹 공정률 / 내 담당·리스크 토글 / 드로어 전체보기
 * ============================================================ */
(function () {
  'use strict';

  /* ─── 단계 표시값 normalize ────────────────────────────── */
  /* 드롭다운에서 제거된 구값이 기존 데이터에 남아있을 때 표시명 보정 */
  var STAGE_LABEL_MAP = { '테스트': '검수', '오픈준비': '오픈', '안정화': '완료' };
  function normalizeStageLabel(val) {
    if (!val) return '';
    return STAGE_LABEL_MAP[val] || val;
  }

  function isLiveMode() {
    return !!document.querySelector('[data-stam-wbs-live="true"]');
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var drawerApi = {
    openDrawer: null,
    closeDrawer: null,
    setDrawerMode: null,
    openFullView: null,
    closeFullView: null,
    filterApi: null,
  };

  /* ─── 공통 helpers ─────────────────────────────────────── */
  function updateMasterChk() {
    var masterChk = document.getElementById('wbs-chk-all');
    if (!masterChk) return;
    var all     = document.querySelectorAll('.wbs-row-chk');
    var checked = document.querySelectorAll('.wbs-row-chk:checked');
    if (checked.length === 0) {
      masterChk.checked     = false;
      masterChk.indeterminate = false;
    } else if (checked.length === all.length) {
      masterChk.checked     = true;
      masterChk.indeterminate = false;
    } else {
      masterChk.checked     = false;
      masterChk.indeterminate = true;
    }
    updateDeleteBtn();
  }

  function updateDeleteBtn() {
    var btn = document.getElementById('wbs-delete-btn');
    if (!btn) return;
    if (isLiveMode()) {
      btn.disabled = true;
      btn.textContent = '\uc0ad\uc81c';
      return;
    }
    var count = document.querySelectorAll('.wbs-row-chk:checked').length;
    if (count === 0) {
      btn.disabled = true;
      btn.textContent = '\uc0ad\uc81c';
    } else {
      btn.disabled = false;
      btn.textContent = '\uc0ad\uc81c ' + count;
    }
  }

  /* ─── 1. Gantt 접기/펼치기 ─────────────────────────────── */
  var ganttSection = null;
  var ganttBody    = null;

  function setGanttOpen(open) {
    if (!ganttSection || !ganttBody) return;
    ganttSection.setAttribute('data-open', String(open));
    if (open) {
      ganttBody.style.maxHeight = ganttBody.scrollHeight + 'px';
      ganttBody.addEventListener('transitionend', function onEnd() {
        ganttBody.style.maxHeight = '';
        ganttBody.removeEventListener('transitionend', onEnd);
      });
    } else {
      ganttBody.style.maxHeight = ganttBody.scrollHeight + 'px';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          ganttBody.style.maxHeight = '0';
        });
      });
    }
    var vcBtn = document.getElementById('wbs-gantt-ctrl-btn');
    if (vcBtn) vcBtn.textContent = open ? 'Gantt \uc811\uae30' : 'Gantt \ud3bc\uce58\uae30';
    try { localStorage.setItem('stam.wbs.gantt', String(open)); } catch (e) {}
  }

  function initGanttToggle() {
    ganttSection = document.querySelector('.wbs-gantt-section');
    ganttBody    = ganttSection && ganttSection.querySelector('.wbs-gantt-body');
    if (!ganttSection || !ganttBody) return;

    var saved = null;
    try { saved = localStorage.getItem('stam.wbs.gantt'); } catch (e) {}
    var isOpen = saved === null ? true : saved === 'true';

    if (isOpen) {
      ganttBody.style.maxHeight = '';
      ganttSection.setAttribute('data-open', 'true');
    } else {
      ganttBody.style.maxHeight = '0';
      ganttSection.setAttribute('data-open', 'false');
      var vcBtn = document.getElementById('wbs-gantt-ctrl-btn');
      if (vcBtn) vcBtn.textContent = 'Gantt \ud3bc\uce58\uae30';
    }

    var ganttHead = ganttSection.querySelector('.wbs-gantt-head');
    if (ganttHead) {
      ganttHead.addEventListener('click', function () {
        setGanttOpen(ganttSection.getAttribute('data-open') === 'false');
      });
    }
    var vcBtn2 = document.getElementById('wbs-gantt-ctrl-btn');
    if (vcBtn2) {
      vcBtn2.addEventListener('click', function (e) {
        e.stopPropagation();
        setGanttOpen(ganttSection.getAttribute('data-open') === 'false');
      });
    }
  }

  /* ─── 2. 그룹 접기/펼치기 ──────────────────────────────── */
  function initGroupToggle() {
    var table = document.querySelector('[data-stam-wbs-static-list]');
    if (table && !table.getAttribute('data-grp-toggle-bound')) {
      table.setAttribute('data-grp-toggle-bound', '1');
      table.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.wbs-grp-toggle-btn');
        if (!btn) return;
        e.stopPropagation();
        var grpId = btn.getAttribute('data-grp');
        var tbody = document.querySelector('.wbs-grp-rows[data-grp="' + grpId + '"]');
        if (!tbody) return;
        var collapsed = tbody.classList.toggle('collapsed');
        btn.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
        btn.title = collapsed ? '\ud3bc\uce58\uae30' : '\uc811\uae30';
      });
    }
    document.querySelectorAll('.wbs-grp-toggle-btn').forEach(function (btn) {
      if (btn.getAttribute('data-grp-bound') === '1') return;
      btn.setAttribute('data-grp-bound', '1');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var grpId = btn.getAttribute('data-grp');
        var tbody = document.querySelector('.wbs-grp-rows[data-grp="' + grpId + '"]');
        if (!tbody) return;
        var collapsed = tbody.classList.toggle('collapsed');
        btn.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
        btn.title = collapsed ? '\ud3bc\uce58\uae30' : '\uc811\uae30';
      });
    });

    var allBtn       = document.getElementById('wbs-all-grp-btn');
    var allCollapsed = false;
    if (allBtn) {
      allBtn.addEventListener('click', function () {
        allCollapsed = !allCollapsed;
        document.querySelectorAll('.wbs-grp-rows').forEach(function (tbody) {
          tbody.classList.toggle('collapsed', allCollapsed);
        });
        document.querySelectorAll('.wbs-grp-toggle-btn').forEach(function (btn) {
          btn.setAttribute('data-collapsed', allCollapsed ? 'true' : 'false');
          btn.title = allCollapsed ? '\ud3bc\uce58\uae30' : '\uc811\uae30';
        });
        allBtn.textContent = allCollapsed ? '\uadf8\ub8f9 \uc804\uccb4 \ud3bc\uce58\uae30' : '\uadf8\ub8f9 \uc804\uccb4 \uc811\uae30';
      });
    }
  }

  /* ─── 2b. Topbar search → page filter search ─────────────── */
  function initTopbarSearch() {
    var trigger = document.querySelector('[data-tb-search-trigger]');
    var input   = document.querySelector('.wbs-search-input');
    if (!trigger || !input) return;
    trigger.addEventListener('click', function () {
      input.focus();
      var bar = input.closest('.wbs-filter-bar');
      if (bar && bar.scrollIntoView) {
        bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  /* ─── 3. Focus View ─────────────────────────────────────── */
  function initFocusView() {
    var shell = document.querySelector('.po-shell');
    if (!shell) return;
    function setFocus(on) {
      shell.classList.toggle('wbs-focus', on);
      document.querySelectorAll('[data-focus-toggle]').forEach(function (btn) {
        btn.textContent = on ? '← 나가기' : 'Focus View';
      });
    }
    document.querySelectorAll('[data-focus-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setFocus(!shell.classList.contains('wbs-focus'));
      });
    });
    document.querySelectorAll('[data-focus-exit]').forEach(function (btn) {
      btn.addEventListener('click', function () { setFocus(false); });
    });
  }

  /* ─── 4. Drawer ─────────────────────────────────────────── */
  function initDrawer() {
    var drawer = document.getElementById('wbs-drawer');
    var panel  = document.getElementById('wbs-drawer-panel');
    if (!drawer || !panel) return;
    var overlay = drawer.querySelector('.wbs-drawer-overlay');

    function setMode(mode) {
      panel.setAttribute('data-mode', mode);
      var badge = document.getElementById('wbs-dw-mode-badge');
      if (badge) {
        badge.textContent = { detail: '\uc0c1\uc138', edit: '\uc218\uc815', create: '\uc2e0\uaddc \ub4f1\ub85d' }[mode] || mode;
      }
      var widEl = document.getElementById('wbs-dw-wid');
      if (widEl) widEl.style.display = mode === 'create' ? 'none' : '';
    }

    function openDrawer(mode) {
      setMode(mode || 'detail');
      drawer.setAttribute('data-open', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      drawer.setAttribute('data-open', 'false');
      document.body.style.overflow = '';
      document.querySelectorAll('.wbs-data-row.is-active').forEach(function (r) {
        r.classList.remove('is-active');
      });
    }

    drawerApi.openDrawer = openDrawer;
    drawerApi.closeDrawer = closeDrawer;
    drawerApi.setDrawerMode = setMode;

    if (!isLiveMode()) {
      document.querySelectorAll('.wbs-data-row').forEach(function (row) {
        row.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('.wbs-td-chk')) return;
          document.querySelectorAll('.wbs-data-row.is-active').forEach(function (r) {
            if (r !== row) r.classList.remove('is-active');
          });
          row.classList.add('is-active');
          openDrawer('detail');
        });
      });
      var regBtn = document.getElementById('wbs-reg-btn');
      if (regBtn) regBtn.addEventListener('click', function () { openDrawer('create'); });
    }

    /* overlay */
    if (overlay) overlay.addEventListener('click', closeDrawer);

    /* 드로어 내부 이벤트 위임 */
    drawer.addEventListener('click', function (e) {
      var tgt = e.target;
      /* 닫기(✕) 버튼 */
      if (tgt.classList.contains('wbs-drawer-close') ||
          (tgt.closest && tgt.closest('.wbs-drawer-close'))) {
        closeDrawer(); return;
      }
      /* 취소 버튼 (edit → detail 복귀) */
      if (tgt.closest && tgt.closest('.wbs-drawer-cancel-btn')) {
        setMode('detail'); return;
      }
      /* 취소/닫기 버튼 (create → 닫기) */
      if (tgt.closest && tgt.closest('.wbs-drawer-close-btn')) {
        closeDrawer(); return;
      }
      /* 수정 버튼 (detail → edit) — Live 모드는 CRUD 직접 listener 단독 소유 */
      if (tgt.closest && tgt.closest('.wbs-drawer-edit-btn')) {
        if (isLiveMode()) return;
        setMode('edit');
        return;
      }
      /* 전체 보기 버튼 */
      if (tgt.closest && tgt.closest('.wbs-fv-trigger-btn')) {
        var curMode = panel.getAttribute('data-mode') || 'detail';
        closeDrawer();
        openFv(isLiveMode() ? 'detail' : curMode);
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.getAttribute('data-open') === 'true') {
        closeDrawer();
      }
    });
  }

  /* ─── 5. 체크박스 선택 ──────────────────────────────────── */
  function initCheckboxes() {
    /* 각 데이터 행 맨 앞에 체크박스 셀 동적 삽입 */
    document.querySelectorAll('.wbs-data-row').forEach(function (row) {
      var td  = document.createElement('td');
      td.className = 'wbs-td-chk';
      var chk = document.createElement('input');
      chk.type      = 'checkbox';
      chk.className = 'wbs-chk wbs-row-chk';
      chk.title     = '행 선택';
      td.appendChild(chk);
      row.insertBefore(td, row.firstChild);

      /* 체크박스 클릭: 버블링 차단 (drawer 열리지 않음) */
      chk.addEventListener('click', function (e) { e.stopPropagation(); });
      chk.addEventListener('change', function () {
        row.classList.toggle('selected', chk.checked);
        row.classList.toggle('is-selected', chk.checked);
        updateMasterChk();
        updateDeleteBtn();
      });
      /* td 클릭도 버블링 차단 */
      td.addEventListener('click', function (e) { e.stopPropagation(); });
    });

    /* 전체 선택 체크박스 */
    var masterChk = document.getElementById('wbs-chk-all');
    if (masterChk) {
      masterChk.addEventListener('change', function () {
        var checked = masterChk.checked;
        document.querySelectorAll('.wbs-row-chk').forEach(function (chk) {
          chk.checked = checked;
          var r = chk.closest('.wbs-data-row');
          if (r) { r.classList.toggle('selected', checked); r.classList.toggle('is-selected', checked); }
        });
        updateDeleteBtn();
      });
    }
  }

  /* ─── 5b. 삭제 버튼 ─────────────────────────────────────── */
  function initDeleteButton() {
    var btn = document.getElementById('wbs-delete-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var checked = document.querySelectorAll('.wbs-row-chk:checked');
      var count = checked.length;
      if (count === 0) return;
      var ids = [];
      checked.forEach(function (chk) {
        var row = chk.closest('.wbs-data-row');
        if (row) {
          var idEl = row.querySelector('.wbs-id-chip');
          if (idEl) ids.push(idEl.textContent.trim());
        }
      });
      window.STAM.wbsDialog.confirm({
        title: '삭제 확인',
        msg:   '선택한 WBS 작업 ' + count + '건을 삭제하시겠습니까?',
        target: ids.length ? ids.join(', ') : null,
        okLabel: '삭제', okClass: 'danger', type: 'danger'
      }, function () {
        document.querySelectorAll('.wbs-row-chk:checked').forEach(function (chk) {
          var row = chk.closest('.wbs-data-row');
          if (row) row.remove();
        });
        var masterChk = document.getElementById('wbs-chk-all');
        if (masterChk) { masterChk.checked = false; masterChk.indeterminate = false; }
        updateDeleteBtn();
      });
    });
  }

  /* ─── 6. 내 담당 / 리스크 토글 ─────────────────────────── */
  function initToggleButtons() {
    var myBtn   = document.getElementById('wbs-my-btn');
    var riskBtn = document.getElementById('wbs-risk-btn');

    function applyFilters() {
      var myActive   = myBtn   && myBtn.classList.contains('active');
      var riskActive = riskBtn && riskBtn.classList.contains('active');
      document.querySelectorAll('.wbs-data-row').forEach(function (row) {
        var ownerId = row.getAttribute('data-wbs-owner-id');
        var isMyRow = !!ownerId;
        var hasDelay = !!row.querySelector('.wbs-chip.wc-delay');
        var hasIssue = !!row.querySelector('.wbs-issue-dot');
        var isRisk   = hasDelay || hasIssue;
        var show = true;
        if (myActive   && !isMyRow) show = false;
        if (riskActive && !isRisk)  show = false;
        row.style.opacity = show ? '' : '0.28';
        row.style.pointerEvents = show ? '' : 'none';
      });
      /* 필터 비활성이면 그룹 행도 표시 복원 */
      if (!myActive && !riskActive) {
        document.querySelectorAll('.wbs-grp-hdr-body tr').forEach(function (r) {
          r.style.opacity = '';
        });
      }
    }

    if (myBtn) {
      myBtn.addEventListener('click', function () {
        myBtn.classList.toggle('active');
        applyFilters();
      });
    }
    if (riskBtn) {
      riskBtn.addEventListener('click', function () {
        riskBtn.classList.toggle('active');
        applyFilters();
      });
    }
  }

  /* ─── 7. 그룹 공정률 표시 (sticky 우측 셀) ─────────────── */
  function initGroupProgress() {
    var grpData = {
      'ia':      { pct: 100, cls: 'done'  },
      'shell':   { pct: 100, cls: 'done'  },
      'wbs-scr': { pct: 52,  cls: 'delay' },
      'board':   { pct: 0,   cls: ''      },
      'test':    { pct: 0,   cls: ''      },
      'open':    { pct: 0,   cls: 'hold'  }
    };

    /* 공정률을 .wbs-grp-prog-cell (sticky 우측 셀)에 삽입
       colspan 업데이트 불필요: main-td colspan=17 + prog-cell 1 = 18 */
    document.querySelectorAll('.wbs-grp-prog-cell').forEach(function (cell) {
      var grpId = cell.getAttribute('data-grp');
      var d     = grpData[grpId];
      if (!d) return;

      var prog  = document.createElement('div');
      prog.className = 'wbs-grp-progress';
      var bar   = document.createElement('div');
      bar.className = 'wbs-grp-prog-bar';
      var fill  = document.createElement('progress');
      fill.className = 'wbs-live-progress wbs-live-progress--grp' + (d.cls ? ' ' + d.cls : '');
      fill.max = 100;
      fill.value = d.pct;
      bar.appendChild(fill);
      var pctEl = document.createElement('span');
      pctEl.className = 'wbs-grp-prog-pct';
      pctEl.textContent = d.cls === 'hold' ? '보류' : d.pct + '%';
      prog.appendChild(bar);
      prog.appendChild(pctEl);
      cell.appendChild(prog);
    });
  }

  /* ─── 8. 드로어 전체보기 모달 ──────────────────────────── */

  function renderLinkedRequirements(row) {
    var ids = row ? (row.getAttribute('data-req') || '').split(',').filter(Boolean) : [];
    if (!ids.length) return '<div class="wbs-dw-linked-empty">연결된 요구사항 없음</div>';
    return ids.map(function (id) {
      return '<div class="wbs-dw-linked-item"><span class="wbs-link-chip">' + id.trim() + '</span></div>';
    }).join('');
  }

  function renderLinkedScreens(row) {
    var ids = row ? (row.getAttribute('data-scr') || '').split(',').filter(Boolean) : [];
    if (!ids.length) return '<div class="wbs-dw-linked-empty">연결된 화면설계 없음</div>';
    return ids.map(function (id) {
      return '<div class="wbs-dw-linked-item"><span class="wbs-link-chip">' + id.trim() + '</span></div>';
    }).join('');
  }

  function buildSec(title, rows) {
    var h = '<div class="wbs-drawer-sec"><div class="wbs-drawer-sec-title">' + title + '</div>';
    rows.forEach(function (r) {
      h += '<div class="wbs-drawer-row">'
        + '<span class="wbs-drawer-row-k">' + r[0] + '</span>'
        + '<span class="wbs-drawer-row-v">' + r[1] + '</span>'
        + '</div>';
    });
    return h + '</div>';
  }

  function buildFvDetailHtml() {
    return '<div class="wbs-iv-muted">—</div>';
  }

  function buildFvFormHtml() {
    return '<div class="wbs-iv-muted">—</div>';
  }

  function buildLiveFullViewDetail(item) {
    if (!item) return '<div class="wbs-iv-muted">—</div>';
    var list = window.STAM && window.STAM.wbsFirestoreList;
    var status = list && list.statusInfo ? list.statusInfo(item.status) : { label: '—', cls: '' };
    var priority = list && list.priorityInfo ? list.priorityInfo(item.priority) : { label: '—', cls: '' };
    var schedule = list && list.deriveScheduleState ? list.deriveScheduleState(item, todayIso()) : { verdict: '—' };
    function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    return '<div class="wbs-drawer-sec"><div class="wbs-drawer-sec-title">기본 정보</div>' +
      '<div class="wbs-dw-info-grid">' +
      '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">WBS ID</div><div class="wbs-dw-iv">' + esc(item.code) + '</div></div>' +
      '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">작업명</div><div class="wbs-dw-iv">' + esc(item.title) + '</div></div>' +
      '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">상태</div><div class="wbs-dw-iv"><span class="wbs-chip ' + status.cls + '">' + esc(status.label) + '</span></div></div>' +
      '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">우선순위</div><div class="wbs-dw-iv"><span class="wbs-prio ' + priority.cls + '">' + esc(priority.label) + '</span></div></div>' +
      '</div></div>' +
      '<div class="wbs-drawer-sec"><div class="wbs-drawer-sec-title">일정</div>' +
      '<div class="wbs-dw-desc">기간판정: ' + esc(schedule.verdict) + ' · 진행률: ' + esc(item.progress != null ? item.progress + '%' : '—') + '</div></div>';
  }

  function handleLiveFvEdit() {
    var crudApi = window.STAM && window.STAM.wbsFirestoreCrud;
    if (!crudApi || typeof crudApi.canWrite !== 'function' || !crudApi.canWrite()) return;
    closeFv();
    if (typeof crudApi.openEdit === 'function') crudApi.openEdit();
  }

  function openFv(mode) {
    var fvPanel  = document.getElementById('wbs-fv-inline');
    var modeTag  = document.getElementById('wbs-fv-mode-tag');
    var fvBody   = document.getElementById('wbs-fv-body');
    var fvFoot   = document.getElementById('wbs-fv-foot');
    var editTrig = document.getElementById('wbs-fv-edit-trigger');
    if (!fvPanel) return;

    var live = isLiveMode();
    var effectiveMode = live ? 'detail' : mode;
    var modeLabels = {
      detail: '\uc804\uccb4\ubcf4\uae30 \u00b7 \uc0c1\uc138',
      edit:   '\uc804\uccb4\ubcf4\uae30 \u00b7 \uc218\uc815',
      create: '\uc804\uccb4\ubcf4\uae30 \u00b7 \ub4f1\ub85d'
    };
    if (modeTag) modeTag.textContent = modeLabels[effectiveMode] || '\uc804\uccb4\ubcf4\uae30';
    if (editTrig) {
      if (live) {
        var crudApi = window.STAM && window.STAM.wbsFirestoreCrud;
        var canEdit = crudApi && typeof crudApi.canWrite === 'function' && crudApi.canWrite();
        editTrig.hidden = !canEdit;
        editTrig.disabled = !canEdit;
        if (!canEdit) editTrig.setAttribute('aria-disabled', 'true');
        else editTrig.removeAttribute('aria-disabled');
      } else {
        editTrig.hidden = effectiveMode !== 'detail';
        editTrig.disabled = false;
        editTrig.removeAttribute('aria-disabled');
      }
    }

    if (fvBody) {
      if (isLiveMode()) {
        var api = window.STAM && window.STAM.wbsFirestoreList;
        var item = api && typeof api.getState === 'function' ? api.getState().currentItem : null;
        fvBody.innerHTML = buildLiveFullViewDetail(item);
      } else {
        fvBody.innerHTML = (mode === 'detail')
          ? buildFvDetailHtml()
          : buildFvFormHtml();
      }
    }

    if (fvFoot) {
      if (isLiveMode()) {
        var crudApi = window.STAM && window.STAM.wbsFirestoreCrud;
        var canEdit = crudApi && typeof crudApi.canWrite === 'function' && crudApi.canWrite();
        var footHtml = '';
        if (canEdit) {
          footHtml += '<button class="wbs-btn wbs-fv-foot-edit" type="button">수정</button>';
        }
        footHtml += '<button class="wbs-btn wbs-btn-primary wbs-fv-back-foot" type="button">← 목록으로</button>';
        fvFoot.innerHTML = footHtml;
        var liveEditEl = fvFoot.querySelector('.wbs-fv-foot-edit');
        if (liveEditEl) liveEditEl.addEventListener('click', handleLiveFvEdit);
        var liveBackEl = fvFoot.querySelector('.wbs-fv-back-foot');
        if (liveBackEl) liveBackEl.addEventListener('click', closeFv);
      } else if (mode === 'detail') {
        fvFoot.innerHTML =
          '<span class="wbs-dw-detail-timestamp">—</span>'
          + '<button class="wbs-btn wbs-fv-foot-edit" type="button">수정</button>'
          + '<button class="wbs-btn wbs-btn-primary wbs-fv-back-foot" type="button">← 목록으로</button>';
        var footEditEl = fvFoot.querySelector('.wbs-fv-foot-edit');
        if (footEditEl) footEditEl.addEventListener('click', function () { openFv('edit'); });
        var backEl = fvFoot.querySelector('.wbs-fv-back-foot');
        if (backEl) backEl.addEventListener('click', closeFv);
      } else {
        var lbl = mode === 'create' ? '등록' : '저장';
        fvFoot.innerHTML =
          '<button class="wbs-btn wbs-fv-cancel-foot" type="button">취소</button>'
          + '<button class="wbs-btn" type="button">임시저장</button>'
          + '<span class="wbs-footer-spacer"></span>'
          + '<button class="wbs-btn wbs-fv-back-foot" type="button">← 목록으로</button>'
          + '<button class="wbs-btn wbs-btn-primary" type="button">' + lbl + '</button>';
        var cancelEl = fvFoot.querySelector('.wbs-fv-cancel-foot');
        if (cancelEl) {
          cancelEl.addEventListener('click', function () {
            if (mode === 'create') { closeFv(); } else { openFv('detail'); }
          });
        }
        var backEl2 = fvFoot.querySelector('.wbs-fv-back-foot');
        if (backEl2) backEl2.addEventListener('click', closeFv);
      }
    }

    /* 목록 숨기고 FV 패널 전면 표시 */
    var wbsWrap = document.querySelector('.wbs-wrap');
    if (wbsWrap) wbsWrap.classList.add('wbs-fv-active');

    fvPanel.setAttribute('data-open', 'true');

    /* 브라우저 상단으로 스크롤 */
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }

  function closeFv() {
    var fvPanel = document.getElementById('wbs-fv-inline');
    if (fvPanel) fvPanel.setAttribute('data-open', 'false');
    var wbsWrap = document.querySelector('.wbs-wrap');
    if (wbsWrap) wbsWrap.classList.remove('wbs-fv-active');
  }

  function initFullView() {
    var editTrig = document.getElementById('wbs-fv-edit-trigger');
    var xBtn     = document.getElementById('wbs-fv-x-btn');
    var backBtn  = document.getElementById('wbs-fv-back-btn');
    var footBack = document.getElementById('wbs-fv-foot-back');
    if (editTrig) {
      editTrig.addEventListener('click', function () {
        if (isLiveMode()) handleLiveFvEdit();
        else openFv('edit');
      });
    }
    if (xBtn)     xBtn.addEventListener('click', closeFv);
    if (backBtn)  backBtn.addEventListener('click', closeFv);
    if (footBack) footBack.addEventListener('click', closeFv);
    drawerApi.openFullView = openFv;
    drawerApi.closeFullView = closeFv;
  }



  /* ─── 8b. Gantt 전체보기 모달 ──────────────────────────── */
  function initGanttFullviewModal() {
    var modal    = document.getElementById('wbs-gantt-modal');
    var overlay  = document.getElementById('wbs-gantt-modal-overlay');
    var closeBtn = document.getElementById('wbs-gantt-modal-close');
    var openBtn  = document.getElementById('wbs-gantt-fullview-btn');
    if (!modal) return;

    function openModal() {
      modal.setAttribute('data-open', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.setAttribute('data-open', 'false');
      document.body.style.overflow = '';
    }

    if (openBtn) openBtn.addEventListener('click', function (e) { e.stopPropagation(); openModal(); });
    if (overlay) overlay.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.getAttribute('data-open') === 'true') {
        closeModal();
      }
    });
  }

  /* ─── 8b. 전체 간트 모달 그룹 아코디언 ────────────────── */
  function initGanttAccordion() {
    var hdrs = document.querySelectorAll('.wbs-gtl-grp-hdr-row[data-grp-key]');
    hdrs.forEach(function(hdr) {
      hdr.addEventListener('click', function() {
        var key = hdr.getAttribute('data-grp-key');
        var tasks = document.querySelector('.wbs-gtl-grp-tasks[data-grp-key="' + key + '"]');
        if (!tasks) return;
        var isOpen = hdr.getAttribute('data-open') !== 'false';
        hdr.setAttribute('data-open', isOpen ? 'false' : 'true');
        tasks.setAttribute('data-open', isOpen ? 'false' : 'true');
      });
    });
  }

  /* ─── 9. 필터 패널 — STAM.boardFilter.init() 로 대체됨 ──── */
  /* initFilterPanel() 제거: wbs-fp-chip/wbs-fp-sec 등 구 전용 클래스를
     사용하던 dead code. STAM.boardFilter.init() 호출(하단)로 대체. */


  /* ─── 11. 테마 토글 버튼 aria-label 동적 갱신 ─────────────── */
  function initThemeToggleBtn() {
    var btn = document.querySelector('.stam-theme-toggle');
    if (!btn) return;
    function syncLabel() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      var label  = isDark ? '\ub77c\uc774\ud2b8\ubaa8\ub4dc\ub85c \uc804\ud658' : '\ub2e4\ud06c\ubaa8\ub4dc\ub85c \uc804\ud658';
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }
    syncLabel();
    /* html[data-theme] 변경 감지 */
    var obs = new MutationObserver(syncLabel);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ─── 12. Left Navigation — nav-render.js로 위임 (공통화) ─── */
  /* stam.nav-render.init('B3') 이 renderSidebar + initSearch +  */
  /* nav click routing (nav-data[].href 기준) 을 모두 처리합니다. */
  function initNav() {
    if (!window.STAM || !window.STAM.navRender) return;
    window.STAM.navRender.init('B3');
  }

  /* ─── Init ──────────────────────────────────────────────── */

  /* ─── 13. Custom DatePicker ─────────────────────────────── */
  function initDatePickers() {
    var TODAY = todayIso();
    var WD=['\uc77c','\uc6d4','\ud654','\uc218','\ubaa9','\uae08','\ud1a0'];
    var MO=['1\uc6d4','2\uc6d4','3\uc6d4','4\uc6d4','5\uc6d4','6\uc6d4','7\uc6d4','8\uc6d4','9\uc6d4','10\uc6d4','11\uc6d4','12\uc6d4'];
    function p2(n){return(n<10?'0':'')+n;}
    function fmtKo(s){if(!s)return'';var a=s.split('-');return a[0]+'\ub144 '+parseInt(a[1],10)+'\uc6d4 '+parseInt(a[2],10)+'\uc77c';}
    var calIc='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--t3);flex-shrink:0"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    var chevD='<svg class="wbs-dp-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    var navU='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
    var navD='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M18 13l-6 6-6-6"/></svg>';
    var calCh='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    function buildDays(yr,mo,sel){var sd=new Date(yr,mo,1).getDay(),dim=new Date(yr,mo+1,0).getDate(),pd=new Date(yr,mo,0).getDate();var h='<div class="wbs-cal-grid wbs-cal-dow">';WD.forEach(function(w,i){h+='<span class="wbs-cal-w'+(i===0?' sun':i===6?' sat':'')+'">'+ w+'</span>';});h+='</div><div class="wbs-cal-grid wbs-cal-days">';for(var i=sd-1;i>=0;i--)h+='<span class="wbs-cal-day out">'+(pd-i)+'</span>';for(var d=1;d<=dim;d++){var ds=yr+'-'+p2(mo+1)+'-'+p2(d),dw=(sd+d-1)%7;var cl='wbs-cal-day'+(dw===0?' sun':dw===6?' sat':'')+(ds===TODAY?' today':'')+(ds===sel?' sel':'');h+='<button type="button" class="'+cl+'" data-dp-day="'+ds+'">'+d+'</button>';}var trail=(7-((sd+dim)%7))%7;for(var t=1;t<=trail;t++)h+='<span class="wbs-cal-day out">'+t+'</span>';return h+'</div>';}
    function buildMonths(yr,mo,sel){var sp=sel?sel.split('-'):null,sy=sp?parseInt(sp[0],10):null,sm=sp?parseInt(sp[1],10)-1:null;var tp=TODAY.split('-'),ty=parseInt(tp[0],10),tm=parseInt(tp[1],10)-1;var h='<div class="wbs-cal-years">';for(var y=yr-2;y<=yr+4;y++){h+='<div class="wbs-cal-year-row"><span class="wbs-cal-year-label'+(y===yr?' on':'')+'">'+y+'</span><div class="wbs-cal-month-grid">';for(var m=0;m<12;m++){var is=sp&&y===sy&&m===sm,it=y===ty&&m===tm;h+='<button type="button" class="wbs-cal-month'+(is?' sel':'')+(it?' today':'') +'" data-dp-month="'+y+'-'+m+'">'+(m+1)+'\uc6d4</button>';}h+='</div></div>';}return h+'</div>';}
    function buildPop(dp){var yr=parseInt(dp.getAttribute('data-dp-y'),10),mo=parseInt(dp.getAttribute('data-dp-m'),10),sel=dp.getAttribute('data-dp-val')||'',view=dp.getAttribute('data-dp-view')||'days';var h='<div class="wbs-cal-head"><button type="button" class="wbs-cal-title" data-dp-calmode>'+yr+'\ub144 '+MO[mo]+'<span class="wbs-cal-title-caret'+(view==='months'?' up':'')+'">'+ calCh+'</span></button><div class="wbs-cal-navs"><button type="button" class="wbs-cal-nav" data-dp-nav="-1" aria-label="\uc774\uc804">'+navU+'</button><button type="button" class="wbs-cal-nav" data-dp-nav="1" aria-label="\ub2e4\uc74c">'+navD+'</button></div></div>';h+=(view==='months')?buildMonths(yr,mo,sel):buildDays(yr,mo,sel);if(view!=='months')h+='<div class="wbs-cal-foot"><button type="button" class="wbs-cal-clear" data-dp-clear>\uc0ad\uc81c</button><button type="button" class="wbs-cal-today" data-dp-day="'+TODAY+'">\uc624\ub298</button></div>';return h;}
    /* .wbs-form-sec 내 absolute 포지셔닝: Drawer 스크롤 시 필드와 함께 이동 */
    var _dpPortal=null; /* 실제 팝업 요소 (DOM) */
    var _activeDp=null,_activeDpSec=null;
    function calcDpPos(dp){
      var trig=dp.querySelector('.wbs-dp-trigger');
      var sec=dp.closest('.wbs-form-sec')||dp.closest('.wbs-fv-body')||document.body;
      var tr=trig.getBoundingClientRect(),sr=sec.getBoundingClientRect();
      var top=tr.bottom-sr.top+sec.scrollTop+8;
      var left=tr.left-sr.left;
      var maxLeft=sr.width-282;
      left=Math.max(0,Math.min(left,maxLeft));
      return{top:top,left:left,sec:sec};
    }
    function closeDp(){if(_activeDp)_activeDp.classList.remove('open');if(_dpPortal&&_dpPortal.parentNode)_dpPortal.parentNode.removeChild(_dpPortal);if(_activeDpSec)_activeDpSec.classList.remove('popover-open');_dpPortal=null;_activeDp=null;_activeDpSec=null;}
    function openDp(dp){if(window._wbsCloseSel)window._wbsCloseSel();_activeDp=dp;dp.classList.add('open');var pos=calcDpPos(dp);_activeDpSec=pos.sec;pos.sec.classList.add('popover-open');_dpPortal=document.createElement('div');_dpPortal.className='wbs-dp-pop';_dpPortal.style.cssText='top:'+pos.top+'px;left:'+pos.left+'px;';_dpPortal.innerHTML=buildPop(dp);pos.sec.appendChild(_dpPortal);}
    window._wbsCloseDp=closeDp;
    function initOneDp(dp){var val=dp.getAttribute('data-dp-val')||'',tp=TODAY.split('-');dp.setAttribute('data-dp-y',val?val.split('-')[0]:tp[0]);dp.setAttribute('data-dp-m',val?String(parseInt(val.split('-')[1],10)-1):String(parseInt(tp[1],10)-1));dp.setAttribute('data-dp-view','days');dp.innerHTML='<button type="button" class="wbs-dp-trigger" data-dp-toggle>'+calIc+'<span class="wbs-dp-val'+(val?'':' ph')+'">'+(val?fmtKo(val):'\ub0a0\uc9dc \uc120\ud0dd')+'</span>'+chevD+'</button>';}
    document.querySelectorAll('[data-wbs-dp]').forEach(initOneDp);
    document.addEventListener('click',function(e){
      var tog=e.target.closest?e.target.closest('[data-dp-toggle]'):null;
      if(tog){var dp=tog.closest('.wbs-datepick');if(!dp)return;if(_activeDp===dp){closeDp();return;}closeDp();openDp(dp);return;}
      if(_activeDp&&_dpPortal.contains(e.target)){
        var dp=_activeDp,yr=parseInt(dp.getAttribute('data-dp-y'),10),mo=parseInt(dp.getAttribute('data-dp-m'),10),view=dp.getAttribute('data-dp-view')||'days';
        if(e.target.closest('[data-dp-calmode]')){view=view==='months'?'days':'months';dp.setAttribute('data-dp-view',view);_dpPortal.innerHTML=buildPop(dp);posDpP();return;}
        var nav=e.target.closest('[data-dp-nav]');if(nav){var dv=parseInt(nav.getAttribute('data-dp-nav'),10);if(view==='months'){yr+=dv;}else{mo+=dv;if(mo<0){mo=11;yr--;}if(mo>11){mo=0;yr++;}}dp.setAttribute('data-dp-y',yr);dp.setAttribute('data-dp-m',mo);_dpPortal.innerHTML=buildPop(dp);posDpP();return;}
        var mon=e.target.closest('[data-dp-month]');if(mon){var pts=mon.getAttribute('data-dp-month').split('-');dp.setAttribute('data-dp-y',parseInt(pts[0],10));dp.setAttribute('data-dp-m',parseInt(pts[1],10));dp.setAttribute('data-dp-view','days');_dpPortal.innerHTML=buildPop(dp);posDpP();return;}
        var day=e.target.closest('[data-dp-day]');if(day){var v=day.getAttribute('data-dp-day');dp.setAttribute('data-dp-val',v);var vEl=dp.querySelector('.wbs-dp-val');if(vEl){vEl.textContent=fmtKo(v);vEl.classList.remove('ph');}closeDp();return;}
        if(e.target.closest('[data-dp-clear]')){dp.setAttribute('data-dp-val','');var vEl2=dp.querySelector('.wbs-dp-val');if(vEl2){vEl2.textContent='\ub0a0\uc9dc \uc120\ud0dd';vEl2.classList.add('ph');}closeDp();return;}
        return;
      }
      if(_activeDp&&!(e.target.closest?e.target.closest('.wbs-datepick'):null))closeDp();
    },true);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&_activeDp)closeDp();});
  }

  /* ─── 14. Custom SelectBox ──────────────────────────────── */
  function initSelectBoxes() {
    var chkIc='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
    var chevIc='<svg class="wbs-sel-ck stam-cs-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    function buildMenu(opts,cur){
      return opts.map(function(o){
        var isSel = o === cur;
        return '<div class="wbs-sel-opt stam-cs-opt'+(isSel?' on is-sel':'')+'" data-sel-opt="'+o+'" role="option" aria-selected="'+(isSel?'true':'false')+'">'+
          '<span class="wbs-sel-check stam-cs-check">'+chkIc+'</span>'+
          '<span class="stam-cs-otext">'+o+'</span>'+
        '</div>';
      }).join('');
    }
    /* .wbs-form-sec 내 absolute 포지셔닝: Drawer 스크롤 시 필드와 함께 이동 */
    var _selPortal=null;
    var _activeSel=null,_activeSelBtn=null,_activeSelSec=null;
    function closeSel(){
      if(_activeSelBtn){_activeSelBtn.classList.remove('open');_activeSelBtn.classList.remove('is-open');}
      if(_activeSel){_activeSel.classList.remove('is-open');}
      if(_selPortal&&_selPortal.parentNode)_selPortal.parentNode.removeChild(_selPortal);
      if(_activeSelSec)_activeSelSec.classList.remove('popover-open');
      _selPortal=null;_activeSel=null;_activeSelBtn=null;_activeSelSec=null;
    }
    function openSel(box,btn){
      if(window._wbsCloseDp)window._wbsCloseDp();
      _activeSel=box;_activeSelBtn=btn;
      btn.classList.add('open');
      box.classList.add('is-open');
      var opts=(box.getAttribute('data-sel-opts')||'').split('|').filter(Boolean);
      var sec=box.closest('.wbs-form-sec')||box.closest('.wbs-fv-body')||document.body;
      _activeSelSec=sec;sec.classList.add('popover-open');
      var br=btn.getBoundingClientRect(),sr=sec.getBoundingClientRect();
      var top=br.bottom-sr.top+sec.scrollTop+5;var left=br.left-sr.left;var w=br.width;
      _selPortal=document.createElement('div');
      _selPortal.className='wbs-sel-menu stam-cs-menu';
      _selPortal.setAttribute('role','listbox');
      /* 공통 .stam-cs-menu 는 display:none + right:0 — WBS portal 마운트이므로 inline 으로 override */
      _selPortal.style.cssText='top:'+top+'px;left:'+left+'px;width:'+w+'px;right:auto;display:block;';
      _selPortal.innerHTML=buildMenu(opts,box.getAttribute('data-sel-val')||'');
      sec.appendChild(_selPortal);
    }
    window._wbsCloseSel=closeSel;
    function initOneSel(el){
      var val=el.getAttribute('data-sel-val')||'',ph=el.getAttribute('data-sel-placeholder')||'\u2014 \uc120\ud0dd \u2014';
      var disp=normalizeStageLabel(val);
      el.classList.add('stam-cs');
      el.innerHTML='<button type="button" class="wbs-sel stam-cs-trigger'+(val?'':' placeholder')+'" data-sel-toggle aria-haspopup="listbox" aria-expanded="false">'+
        '<span class="wbs-sel-sp stam-cs-value'+(val?'':' is-placeholder')+'">'+(disp||ph)+'</span>'+
        chevIc+
      '</button>';
    }
    document.querySelectorAll('[data-wbs-sel]').forEach(initOneSel);
    document.addEventListener('click',function(e){
      var tog=e.target.closest?e.target.closest('[data-sel-toggle]'):null;
      if(tog){var box=tog.closest('[data-wbs-sel]');if(!box)return;if(_activeSel===box){closeSel();return;}closeSel();openSel(box,tog);return;}
      if(_activeSel&&_selPortal.contains(e.target)){
        var opt=e.target.closest('[data-sel-opt]');
        if(opt){
          var val=opt.getAttribute('data-sel-opt');
          _activeSel.setAttribute('data-sel-val',val);
          var sp=_activeSel.querySelector('.wbs-sel-sp');
          if(sp){sp.textContent=val;sp.classList.remove('is-placeholder');}
          if(_activeSelBtn){_activeSelBtn.classList.remove('placeholder','open','is-open');}
          closeSel();
        }
        return;
      }
      if(_activeSel&&!(e.target.closest?e.target.closest('[data-wbs-sel]'):null))closeSel();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&_activeSel)closeSel();});
  }

  /* ─── 15. Custom Dialog (Alert / Confirm) ───────────────── */
  function initDialog() {
    var overlay=document.getElementById('wbs-dialog-overlay');if(!overlay)return;
    var titleEl=document.getElementById('wbs-dialog-title'),msgEl=document.getElementById('wbs-dialog-msg');
    var targetEl=document.getElementById('wbs-dialog-target'),icEl=document.getElementById('wbs-dialog-ic');
    var cancelBtn=document.getElementById('wbs-dialog-cancel'),okBtn=document.getElementById('wbs-dialog-ok');
    var _cb=null;
    var ics={
      danger:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      warn:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      success:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      info:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    function close(){overlay.classList.remove('open');_cb=null;}
    overlay.addEventListener('click',function(e){if(e.target===overlay)close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&overlay.classList.contains('open')){e.preventDefault();close();}});
    cancelBtn.addEventListener('click',close);
    okBtn.addEventListener('click',function(){var cb=_cb;close();if(cb)cb();});
    function open(opts,cb){titleEl.textContent=opts.title||'\uc54c\ub9bc';msgEl.textContent=opts.msg||'';if(opts.target){targetEl.textContent=opts.target;targetEl.classList.add('show');}else{targetEl.textContent='';targetEl.classList.remove('show');}var type=opts.type||(cb?'danger':'info');icEl.className='wbs-dialog-ic '+type;icEl.innerHTML=ics[type]||ics.info;if(cb){cancelBtn.style.display='';okBtn.className='wbs-dialog-btn '+(opts.okClass||'confirm');okBtn.textContent=opts.okLabel||'\ud655\uc778';}else{cancelBtn.style.display='none';okBtn.className='wbs-dialog-btn ok';okBtn.textContent=opts.okLabel||'\ud655\uc778';}_cb=cb||null;overlay.classList.add('open');}
    window.STAM=window.STAM||{};
    window.STAM.wbsDialog={confirm:function(opts,cb){open(opts,cb);},alert:function(opts){open(opts,null);}};
  }

  /* ─── 16. Drawer 저장/등록 피드백 ──────────────────────── */
  function initDrawerFeedback() {
    document.addEventListener('click', function(e) {
      if(!window.STAM||!window.STAM.wbsDialog)return;
      var btn=e.target.closest?e.target.closest('.wbs-drawer-footer .wbs-btn, .wbs-drawer-footer .stam-btn'):null;if(!btn)return;
      var panel=document.querySelector('.wbs-drawer-panel'),mode=panel?panel.getAttribute('data-mode'):'';
      if(btn.textContent.trim()==='임시저장'){window.STAM.wbsDialog.alert({title:'임시저장',msg:'작성 중인 내용이 임시저장되었습니다.',type:'info',okLabel:'확인'});return;}
      if(btn.classList.contains('wbs-btn-primary')&&!btn.classList.contains('wbs-fv-trigger-btn')&&!btn.closest('.wbs-fv-inline')){
        if(mode==='create')window.STAM.wbsDialog.alert({title:'등록 완료',msg:'WBS 작업이 등록되었습니다.',type:'success',okLabel:'확인'});
        else if(mode==='edit')window.STAM.wbsDialog.alert({title:'저장 완료',msg:'변경 내용이 저장되었습니다.',type:'success',okLabel:'확인'});
      }
    });
  }

  /* 폼 토글 버튼 인터랙션 (등록/수정 모드 작업유형·진행상태·우선순위) */
  function initFormToggles() {
    document.addEventListener('click', function (e) {
      var btn = e.target.classList.contains('wbs-form-toggle')
        ? e.target
        : (e.target.closest && e.target.closest('.wbs-form-toggle'));
      if (!btn) return;
      var group = btn.closest('.wbs-form-toggle-group');
      if (!group) return;
      e.stopPropagation();
      group.querySelectorAll('.wbs-form-toggle').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  }

  /* ─── 17. 정적 HTML 단계 배지 normalize ─────────────────── */
  function normalizeStageDisplayCells() {
    /* 데이터 행 단계 배지 (wbs-col-type) */
    document.querySelectorAll('td.wbs-col-type .wbs-type-chip').forEach(function (el) {
      var mapped = STAGE_LABEL_MAP[el.textContent.trim()];
      if (mapped) el.textContent = mapped;
    });
    /* 그룹 헤더 단계 아이콘 배지 (wbs-grp-ico) — 누락 보정 */
    document.querySelectorAll('span.wbs-grp-ico').forEach(function (el) {
      var mapped = STAGE_LABEL_MAP[el.textContent.trim()];
      if (mapped) el.textContent = mapped;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initThemeToggleBtn();
    initTopbarSearch();
    initGanttToggle();
    initGanttFullviewModal();
    initGanttAccordion();
    initGroupToggle();
    initFocusView();
    if (!isLiveMode()) {
      initCheckboxes();
      initDeleteButton();
      initToggleButtons();
      initGroupProgress();
    } else {
      updateDeleteBtn();
    }
    initDrawer();
    initFullView();
    if (window.STAM && window.STAM.boardFilter) {
      var filterGroups = [
        { key: 'status', label: '진행상태', options: [
          { value: 'wait', label: '대기', dot: 'd-wait' },
          { value: 'in_progress', label: '진행중', dot: 'd-prog' },
          { value: 'delayed', label: '지연', dot: 'd-delay' },
          { value: 'done', label: '완료', dot: 'd-done' },
          { value: 'hold', label: '보류', dot: 'd-hold' }
        ]},
        { key: 'priority', label: '우선순위', options: [
          { value: 'high', label: '높음', dot: 'd-high' },
          { value: 'mid', label: '보통', dot: 'd-mid' },
          { value: 'low', label: '낮음', dot: 'd-low' }
        ]},
        { key: 'phase', label: '단계', options: [
          { value: '착수', label: '착수' },
          { value: '분석', label: '분석' },
          { value: '설계', label: '설계' },
          { value: '구현', label: '구현' },
          { value: '검수', label: '검수' },
          { value: '오픈', label: '오픈' },
          { value: '완료', label: '완료' }
        ]},
        { key: 'group', label: '기능그룹', options: [] },
        { key: 'owner', label: '담당자', options: [] }
      ];
      drawerApi.filterApi = window.STAM.boardFilter.init({
        root: document,
        trigger: '#wbs-filter-open-btn',
        panel: '#wbs-filter-panel',
        reset: '#wbs-fp-clear',
        apply: '#wbs-fp-apply',
        groups: filterGroups,
        onApply: isLiveMode() ? undefined : function () { /* mock */ }
      });
    }
    initFormToggles();
    initDialog();
    initDatePickers();
    initSelectBoxes();
    if (!isLiveMode()) {
      initDrawerFeedback();
      normalizeStageDisplayCells();
    }

    window.STAM = window.STAM || {};
    window.STAM.wbsUi = {
      isLiveMode: isLiveMode,
      openDrawer: drawerApi.openDrawer,
      closeDrawer: drawerApi.closeDrawer,
      setDrawerMode: drawerApi.setDrawerMode,
      openFullView: drawerApi.openFullView,
      closeFullView: drawerApi.closeFullView,
      filterApi: drawerApi.filterApi,
      buildFullViewDetail: buildLiveFullViewDetail,
      getSelectValue: function (host) {
        var box = host && host.matches('[data-wbs-sel]') ? host : (host && host.querySelector('[data-wbs-sel]'));
        if (!box) return '';
        return box.getAttribute('data-sel-val') || '';
      },
      setSelectValue: function (host, val) {
        var box = host && host.matches('[data-wbs-sel]') ? host : (host && host.querySelector('[data-wbs-sel]'));
        if (!box) return;
        box.setAttribute('data-sel-val', val || '');
        var sp = box.querySelector('.wbs-sel-sp, .stam-cs-value');
        if (sp) {
          sp.textContent = normalizeStageLabel(val) || val || '— 선택 —';
          sp.classList.toggle('is-placeholder', !val);
        }
        var btn = box.querySelector('.wbs-sel, .stam-cs-trigger');
        if (btn) btn.classList.toggle('placeholder', !val);
      },
      getDateValue: function (host) {
        var dp = host && host.matches('[data-wbs-dp]') ? host : (host && host.querySelector('[data-wbs-dp]'));
        return dp ? (dp.getAttribute('data-dp-val') || '') : '';
      },
      setDateValue: function (host, val) {
        var dp = host && host.matches('[data-wbs-dp]') ? host : (host && host.querySelector('[data-wbs-dp]'));
        if (!dp) return;
        dp.setAttribute('data-dp-val', val || '');
        var vEl = dp.querySelector('.wbs-dp-val');
        if (vEl) {
          if (!val) {
            vEl.textContent = '\ub0a0\uc9dc \uc120\ud0dd';
            vEl.classList.add('ph');
          } else {
            var a = val.split('-');
            vEl.textContent = a[0] + '\ub144 ' + parseInt(a[1], 10) + '\uc6d4 ' + parseInt(a[2], 10) + '\uc77c';
            vEl.classList.remove('ph');
          }
        }
      },
      getToggleValue: function (host) {
        if (!host) return '';
        var active = host.querySelector('.wbs-form-toggle.active');
        return active ? active.textContent.trim() : '';
      },
      setToggleValue: function (host, val) {
        if (!host) return;
        host.querySelectorAll('.wbs-form-toggle').forEach(function (btn) {
          var on = btn.textContent.trim() === val;
          btn.classList.toggle('active', on);
        });
      }
    };
  });

}());
