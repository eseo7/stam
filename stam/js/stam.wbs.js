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
    document.querySelectorAll('.wbs-grp-toggle-btn').forEach(function (btn) {
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
      /* 등록 모드: breadcrumb/meta는 CSS로 제어 */
    }

    function openDrawer(mode) {
      setMode(mode || 'detail');
      drawer.setAttribute('data-open', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      drawer.setAttribute('data-open', 'false');
      document.body.style.overflow = '';
    }

    /* 행 클릭 → 상세 모드 (체크박스 상태 변경 없음) */
    document.querySelectorAll('.wbs-data-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.wbs-td-chk')) return;
        document.querySelectorAll('.wbs-data-row').forEach(function (r) {
          if (r !== row) r.classList.remove('selected');
        });
        row.classList.add('selected');
        openDrawer('detail');
      });
    });

    /* + 작업 등록 → 등록 모드 */
    var regBtn = document.getElementById('wbs-reg-btn');
    if (regBtn) regBtn.addEventListener('click', function () { openDrawer('create'); });

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
      /* 수정 버튼 (detail → edit) */
      if (tgt.closest && tgt.closest('.wbs-drawer-edit-btn')) {
        setMode('edit'); return;
      }
      /* 전체 보기 버튼 */
      if (tgt.closest && tgt.closest('.wbs-fv-trigger-btn')) {
        var curMode = panel.getAttribute('data-mode') || 'detail';
        closeDrawer();
        openFv(curMode);
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
          if (r) r.classList.toggle('selected', checked);
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
        var avatarEl = row.querySelector('.wbs-avatar');
        var isMyRow  = avatarEl && avatarEl.textContent.indexOf('이서연') >= 0;
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
      var fill  = document.createElement('div');
      fill.className = 'wbs-grp-prog-fill' + (d.cls ? ' ' + d.cls : '');
      fill.style.width = d.pct + '%';
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
    var h = '';
    /* summary strip */
    h += '<div class="wbs-dw-summary fv-full">';
    h += '<div class="wbs-dw-sum-item"><span class="wbs-dw-sum-k">담당자</span><span class="wbs-dw-sum-v"><span class="wbs-av-dot ai" style="width:20px;height:20px;font-size:9px;flex-shrink:0">클</span>클로드</span></div>';
    h += '<div class="wbs-dw-sum-item"><span class="wbs-dw-sum-k">검토자</span><span class="wbs-dw-sum-v"><span class="wbs-av-dot" style="width:20px;height:20px;font-size:9px;flex-shrink:0">이</span>이서연</span></div>';
    h += '<div class="wbs-dw-sum-item"><span class="wbs-dw-sum-k">기간</span><span class="wbs-dw-sum-v" style="color:var(--fail)">06-01 ~ 06-05</span></div>';
    h += '<div class="wbs-dw-sum-item"><span class="wbs-dw-sum-k">예상공수</span><span class="wbs-dw-sum-v">4일</span></div>';
    h += '<div class="wbs-dw-sum-item"><span class="wbs-dw-sum-k">기간판정</span><span class="wbs-dw-sum-v"><span class="wbs-chip wc-delay sm">지연</span></span></div>';
    h += '<div class="wbs-dw-sum-item"><span class="wbs-dw-sum-k">리스크</span><span class="wbs-dw-sum-v"><span class="wbs-risk-dot risk-high"></span>일정 초과</span></div>';
    h += '</div>';
    /* 기본 정보 */
    h += '<div class="wbs-drawer-sec">';
    h += '<div class="wbs-drawer-sec-title">기본 정보</div>';
    h += '<div class="wbs-dw-info-grid">';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">작업 유형</div><div class="wbs-dw-iv"><span class="wbs-type-chip">디자인</span></div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">업무영역</div><div class="wbs-dw-iv">UI/UX</div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">기능그룹</div><div class="wbs-dw-iv">WBS 화면</div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">메뉴/화면</div><div class="wbs-dw-iv">WBS 작업 목록</div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">우선순위</div><div class="wbs-dw-iv"><span class="wbs-prio wp-high"><span class="wbs-prio-dot"></span>높음</span></div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">승인상태</div><div class="wbs-dw-iv"><span class="wbs-chip wc-wait sm">검토 대기</span></div></div>';
    h += '</div></div>';
    /* 일정 정보 */
    h += '<div class="wbs-drawer-sec">';
    h += '<div class="wbs-drawer-sec-title">일정 정보</div>';
    h += '<div class="wbs-dw-info-grid">';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">시작일</div><div class="wbs-dw-iv">2026-06-01</div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">종료일</div><div class="wbs-dw-iv" style="color:var(--fail);font-weight:700">2026-06-05<small style="color:var(--t3);font-weight:400;margin-left:4px">+2일</small></div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">예상공수</div><div class="wbs-dw-iv"><b>4일</b></div></div>';
    h += '<div class="wbs-dw-info-cell"><div class="wbs-dw-ik">실공수</div><div class="wbs-dw-iv" style="color:var(--t3)">진행 중</div></div>';
    h += '</div>';
    h += '<div class="wbs-dw-prog-row"><div class="wbs-prog delay" style="flex:1;max-width:none"><div class="wbs-prog-bar"><div class="wbs-prog-fill" style="width:65%"></div></div></div><span class="wbs-dw-prog-pct-label" style="color:var(--fail)">65%</span></div>';
    h += '</div>';
    /* 연결 정보 */
    h += '<div class="wbs-drawer-sec fv-full">';
    h += '<div class="wbs-drawer-sec-title-flex"><span>연결 정보</span><span class="stf-link">전체 상세 →</span></div>';
    h += '<div class="wbs-dw-linked-empty">연결된 요구사항 없음</div>';
    h += '<div class="wbs-dw-linked-item"><span class="wbs-link-chip">wbs.html</span><span class="wbs-dw-li-name">WBS 화면 설계서</span><span class="wbs-chip wc-prog sm">진행중</span></div>';
    h += '</div>';
    /* 작업 내용 */
    h += '<div class="wbs-drawer-sec fv-full">';
    h += '<div class="wbs-drawer-sec-title">작업 내용</div>';
    h += '<div class="wbs-dw-desc">Gantt 구성과 동시 진행 중입니다. Drawer 구조는 WBS-009로 분리 예정. 이번 주 내 완료 목표.</div>';
    h += '</div>';
    /* 댓글 */
    h += '<div class="wbs-drawer-sec fv-full">';
    h += '<div class="wbs-drawer-sec-title">댓글 <span style="font-size:10px;background:var(--bg-sur3);padding:1px 5px;border-radius:99px;margin-left:3px;font-weight:700;color:var(--t3)">2</span></div>';
    h += '<div class="wbs-dw-cmt"><div class="wbs-dw-cmt-av" style="background:var(--stam-soft);color:var(--stam)">최</div>';
    h += '<div class="wbs-dw-cmt-body"><div class="wbs-dw-cmt-meta"><span class="wbs-dw-cmt-who">최개발</span><span class="wbs-dw-cmt-time">06-02 09:12</span></div>';
    h += '<div class="wbs-dw-cmt-txt">REQ-007 재고 연동 API가 아직 완성 안 됐습니다. 연동 일정 확인 부탁드립니다.</div></div></div>';
    h += '<div class="wbs-dw-cmt"><div class="wbs-dw-cmt-av" style="background:rgba(16,185,129,.12);color:#059669">박</div>';
    h += '<div class="wbs-dw-cmt-body"><div class="wbs-dw-cmt-meta"><span class="wbs-dw-cmt-who">박PM</span><span class="wbs-dw-cmt-time">06-02 10:05</span></div>';
    h += '<div class="wbs-dw-cmt-txt"><span class="wbs-dw-mention">@최개발</span> 이번 주 목요일까지 API 제공 예정입니다. 일정 다시 검토 후 공유해 주세요.</div></div></div>';
    h += '<div class="wbs-dw-cmt-input-wrap"><textarea class="wbs-dw-cmt-input" rows="2" placeholder="댓글 입력 · @로 멘션"></textarea><button class="wbs-dw-cmt-send" type="button">↑</button></div>';
    h += '</div>';
    /* 변경이력 */
    h += '<div class="wbs-drawer-sec fv-full">';
    h += '<div class="wbs-drawer-sec-title">변경이력</div>';
    h += '<div class="wbs-dw-hist-item"><div class="wbs-dw-hist-icon hi-edit">✎</div><div class="wbs-dw-hist-body"><div class="wbs-dw-hist-title">실제공수 업데이트 <span class="wbs-dw-hist-from">5d</span><span class="wbs-dw-hist-arrow"> → </span><span class="wbs-dw-hist-to">7d</span></div><div class="wbs-dw-hist-meta">최개발 · 2026-06-01</div></div></div>';
    h += '<div class="wbs-dw-hist-item"><div class="wbs-dw-hist-icon hi-status">↺</div><div class="wbs-dw-hist-body"><div class="wbs-dw-hist-title">상태 변경 <span class="wbs-dw-hist-from">대기</span><span class="wbs-dw-hist-arrow"> → </span><span class="wbs-dw-hist-to">진행중</span></div><div class="wbs-dw-hist-meta">박PM · 2026-05-28</div></div></div>';
    h += '<div class="wbs-dw-hist-item"><div class="wbs-dw-hist-icon hi-memo">●</div><div class="wbs-dw-hist-body"><div class="wbs-dw-hist-title">최초 등록 <span style="font-size:11px;color:var(--t3);font-weight:400">v0.1 신규 등록</span></div><div class="wbs-dw-hist-meta">박PM · 2026-05-18</div></div></div>';
    h += '</div>';
    return h;
  }

  function buildFvDetailHtml_UNUSED() {
    return buildSec('\uae30\ubcf8 \uc815\ubcf4', [
        ['WBS ID',    '<span class="wbs-id-chip">WBS-007</span>'],
        ['\uba54\ub274/\ud654\uba74', 'WBS \uc791\uc5c5 \ubaa9\ub85d'],
        ['\uae30\ub2a5\uadf8\ub8f9',  'WBS \ud654\uba74'],
        ['\uc791\uc5c5\uc720\ud615',  '<span class="wbs-type-chip">\ub514\uc790\uc778</span>'],
        ['\ub2f4\ub2f9\uc790',    '<span class="wbs-avatar"><span class="wbs-av-dot ai">클</span>클로드</span>'],
        ['\uc6b0\uc120\uc21c\uc704',  '<span class="wbs-prio wp-high"><span class="wbs-prio-dot"></span>\ub192\uc74c</span>'],
        ['\uc0c1\ud0dc',      '<span class="wbs-chip wc-delay">\uc9c0\uc5f0</span>'],
        ['\uc9c4\ucc99\ub960', '<div class="wbs-prog delay" style="max-width:200px"><div class="wbs-prog-bar"><div class="wbs-prog-fill" style="width:65%"></div></div><span class="wbs-prog-pct">65%</span></div>'],
      ])
      + buildSec('\uc77c\uc815 \uc815\ubcf4', [
        ['\uacc4\ud68d \uc2dc\uc791', '2026-06-01'],
        ['\uacc4\ud68d \uc885\ub8cc', '<span style="color:var(--fail);font-weight:700">2026-06-05 <small style="color:var(--t3);font-weight:400">+2\uc77c \ucd08\uacfc</small></span>'],
        ['\uc2e4\uc801 \uc2dc\uc791', '2026-06-01'],
        ['\uc2e4\uc801 \uc885\ub8cc', '<span style="color:var(--t3)">\uc9c4\ud589 \uc911</span>'],
        ['\uae30\uac04\ud310\uc815',  '<span class="wbs-chip wc-delay" style="font-size:10px">\uc9c0\uc5f0 +2\uc77c</span>'],
        ['\uc608\uc0c1\uacf5\uc218',  '4\uc77c'],
      ])
      + buildSec('\uc5f0\uacb0 \uc815\ubcf4', [
        ['\uad00\ub828 \uc694\uad6c\uc0ac\ud56d', '<span class="wbs-muted">\u2014</span>'],
        ['\uad00\ub828 \ud654\uba74',     '<span class="wbs-muted">\u2014</span>'],
        ['\uad00\ub828 \uc0b0\ucd9c\ubb3c', '<span class="wbs-link-chip">wbs.html</span> WBS \ud654\uba74 \uc124\uacc4\uc11c'],
        ['\ud14c\uc2a4\ud2b8/\uacb0\ud568', '<span class="wbs-muted">\u2014</span>'],
      ])
      + buildSec('\ud611\uc5c5 \uc815\ubcf4', [
        ['\uac80\ud1a0\uc790',      '<span class="wbs-avatar"><span class="wbs-av-dot">\uc774</span>\uc774\uc11c\uc5f0</span>'],
        ['\uba58\uc158',        '<span class="wbs-muted">\u2014</span>'],
        ['\uad00\ub828 \ud68c\uc758\ub85d', '<span class="wbs-muted">\u2014</span>'],
      ])
      + buildSec('\uccb2\ubd80 / URL', [
        ['\uccb2\ubd80\ud30c\uc77c', '<span class="wbs-muted">\uc5c6\uc74c</span>'],
        ['URL \ucc38\uc870', '<span class="wbs-muted">\u2014</span>'],
      ])
      + '<div class="wbs-drawer-sec fv-full">'
        + '<div class="wbs-drawer-sec-title">\ub313\uae00</div>'
        + '<div class="wbs-drawer-comment-wrap">'
          + '<div class="wbs-drawer-comment-item">'
            + '<span class="wbs-avatar"><span class="wbs-av-dot">\uc774</span>\uc774\uc11c\uc5f0</span>'
            + '<span class="wbs-drawer-comment-meta">2026-06-07 09:30</span>'
            + '<div class="wbs-drawer-comment-body">Gantt \uad6c\uc131\uacfc \ub3d9\uc2dc \uc9c4\ud589 \uc911\uc785\ub2c8\ub2e4. \uc774\ubc88 \uc8fc \ub0b4 \uc644\ub8cc \ubaa9\ud45c.</div>'
          + '</div>'
          + '<textarea class="wbs-drawer-textarea" rows="2" placeholder="\ub313\uae00\uc744 \uc785\ub825\ud558\uc138\uc694\u2026"></textarea>'
        + '</div>'
      + '</div>'
      + '<div class="wbs-drawer-sec fv-full">'
        + '<div class="wbs-drawer-sec-title">\ubcc0\uacbd \uc774\ub825</div>'
        + '<div class="wbs-drawer-row"><span class="wbs-drawer-row-k">2026-06-07</span><span class="wbs-drawer-row-v" style="font-size:11.5px">\uc0c1\ud0dc \ubcc0\uacbd: \uc9c4\ud589\uc911 \u2192 \uc9c0\uc5f0 (\uacc4\ud68d \uc885\ub8cc\uc77c +2\uc77c \ucd08\uacfc)</span></div>'
        + '<div class="wbs-drawer-row"><span class="wbs-drawer-row-k">2026-06-01</span><span class="wbs-drawer-row-v" style="font-size:11.5px">\uc791\uc5c5 \uc2dc\uc791 \ub4f1\ub85d</span></div>'
      + '</div>';
  }

  function buildFvFormHtml(isReg) {
    function sec(num, lbl, rows) {
      return '<div class="wbs-form-sec fv-full">'
        + '<div class="wbs-form-sec-head"><span class="wbs-form-sec-num">' + num + '</span>'
        + '<span class="wbs-form-sec-label">' + lbl + '</span></div>'
        + '<div class="wbs-form-body">' + rows + '</div></div>';
    }
    function row(lbl, ctrl, full, req, hint) {
      return '<div class="wbs-form-row' + (full ? ' wbs-form-full' : '') + '">'
        + '<label class="wbs-form-label">' + lbl
        + (req  ? ' <span class="req">*</span>' : '')
        + (hint ? ' <span class="wbs-form-hint">' + hint + '</span>' : '')
        + '</label>' + ctrl + '</div>';
    }
    function fi(val, ph, dis) {
      return '<input class="wbs-drawer-form-input" type="text"'
        + (val ? ' value="' + val + '"' : '') + (ph ? ' placeholder="' + ph + '"' : '')
        + (dis ? ' disabled' : '') + '>';
    }
    function fsel(opts) {
      return '<select class="wbs-drawer-form-select">' + opts.map(function(o) {
        return '<option' + (o[1] ? ' selected' : '') + '>' + o[0] + '</option>';
      }).join('') + '</select>';
    }
    function ftog(btns, ai) {
      return '<div class="wbs-form-toggle-group">' + btns.map(function(b, i) {
        return '<button class="wbs-form-toggle' + (i === ai ? ' active' : '') + '" type="button">' + b + '</button>';
      }).join('') + '</div>';
    }
    function flnk(lbl) {
      return '<button class="wbs-form-link-btn" type="button">+ ' + lbl + ' 연결</button>';
    }
    var html = '';
    if (!isReg) {
      html += '<div class="wbs-form-alert fv-full">'
        + '<span class="wbs-form-alert-icon">⚠</span>'
        + '<div class="wbs-form-alert-body">'
        + '<div class="wbs-form-alert-title">진행 중인 작업을 수정합니다.</div>'
        + '<div class="wbs-form-alert-desc">일정 또는 담당자 변경 시 관련 팀원에게 영향을 줄 수 있습니다.</div>'
        + '</div></div>';
    }
    html += sec('1', '기본 정보',
      row('작업명', fi(isReg ? '' : 'WBS 목록 화면 기준 설계', '예) 상품 상세 화면 개발'), true, true)
      + row('작업 유형', ftog(['기획','설계','디자인','개발','테스트','검수','회의'], isReg ? 3 : 2), true, true)
      + row('기능그룹', fi(isReg ? '' : 'WBS 화면', '예) 회원관리, 상품'), false, true)
      + row('메뉴/화면 경로', fi(isReg ? '' : 'WBS 작업 목록', '예) 회원관리 > 회원가입'))
      + (isReg ? row('WBS ID <span class="wbs-form-auto-badge">자동 부여</span>', fi('', '저장 시 자동 부여', true), true) : '')
    );
    html += sec('2', '담당자 / 검토자',
      row('담당자', fsel(isReg
        ? [['— 선택 —', true],['이서연'],['김기획'],['박PM'],['최개발'],['정디자인']]
        : [['클로드', true],['이서연'],['김기획'],['박PM'],['최개발']]
      ), false, true)
      + row('검토자', fsel(isReg
        ? [['— 선택 —', true],['박PM'],['이서연'],['김기획'],['최개발']]
        : [['이서연', true],['박PM'],['김기획'],['최개발']]
      ))
    );
    html += sec('3', '상태 / 우선순위',
      row('진행상태', ftog(['대기','진행중','검토중','완료','보류'], isReg ? 0 : 2))
      + row('우선순위', ftog(['높음','보통','낮음'], isReg ? 1 : 0))
      + (!isReg ? row('승인상태', fsel([['검토 대기', true],['미요청'],['고객검토 중'],['승인 완료'],['반려됨']])) : '')
      + (!isReg ? row('리스크', fsel([['없음', true],['있음']])) : '')
    );
    html += sec('4', '일정 / 공수',
      row('시작일', fi(isReg ? '' : '2026-06-01', '예) 05-20'), false, true, 'MM-DD')
      + row('종료일', fi(isReg ? '' : '2026-06-05', '예) 06-05'), false, true, 'PMS 연동')
      + row('예상 공수', fi(isReg ? '' : '4일', '예) 8d 또는 40h'), false, false, 'd/h 단위')
      + row('실 공수', fi('', '예) 7d'), false, false, '전날 후 입력')
    );
    html += sec('5', '작업 내용',
      row('작업 설명', '<textarea class="wbs-drawer-form-textarea" rows="5" placeholder="구현 범위, 참고 사항, 제약 조건…"></textarea>', true)
    );
    html += sec('6', '관련 항목 연결',
      row('관련 요구사항', flnk('요구사항'), true)
      + row('관련 화면설계', flnk('화면설계'), true)
      + row('관련 회의록', flnk('회의록'), true)
      + row('관련 산출물', flnk('산출물'), true)
    );
    if (!isReg) {
      html += sec('7', '변경 사유',
        row('수정 메모', '<textarea class="wbs-drawer-form-textarea" rows="3" placeholder="수정 사유나 변경 내용을 기록하세요…"></textarea>', true)
      );
    }
    return html;
  }

  function buildFvFormHtml_UNUSED(isReg) {
    function fRow(lbl, inp, req) {
      return '<div class="wbs-drawer-form-row"><label class="wbs-drawer-form-label">'
        + lbl + (req ? ' <span class="req">*</span>' : '') + '</label>' + inp + '</div>';
    }
    function fi(val, ph) {
      return '<input class="wbs-drawer-form-input" type="text"'
        + (val ? ' value="' + val + '"' : '')
        + (ph  ? ' placeholder="' + ph + '"' : '') + '>';
    }
    function fd(val) {
      return '<input class="wbs-drawer-form-input" type="date"'
        + (val ? ' value="' + val + '"' : '') + '>';
    }
    function fsel(opts) {
      return '<select class="wbs-drawer-form-select">' + opts.map(function(o) {
        return '<option' + (o[1] ? ' selected' : '') + '>' + o[0] + '</option>';
      }).join('') + '</select>';
    }
    var html = '<div class="wbs-drawer-sec fv-full">'
      + '<div class="wbs-drawer-sec-title">\uae30\ubcf8 \uc815\ubcf4</div>'
      + fRow('\uc791\uc5c5\uba85', fi(isReg ? '' : 'WBS \ubaa9\ub85d \ud654\uba74 \uae30\uc900 \uc124\uacc4', '\uc791\uc5c5\uba85\uc744 \uc785\ub825\ud558\uc138\uc694'), true)
      + fRow('\uba54\ub274/\ud654\uba74', fi(isReg ? '' : 'WBS \uc791\uc5c5 \ubaa9\ub85d', '\uba54\ub274 \ub610\ub294 \ud654\uba74\uba85'))
      + fRow('\uae30\ub2a5\uadf8\ub8f9', fsel(isReg
          ? [['\u2014 \uc120\ud0dd \u2014', true],['\uae30\uc900\ubcf8/IA'],['App Shell/Navigation'],['WBS \ud654\uba74'],['\uc0b0\ucd9c\ubb3c \uac8c\uc2dc\ud310'],['\ud14c\uc2a4\ud2b8/\uac80\uc218'],['\uc624\ud508 \uc900\ube44']]
          : [['WBS \ud654\uba74', true],['\uae30\uc900\ubcf8/IA'],['App Shell/Navigation'],['\uc0b0\ucd9c\ubb3c \uac8c\uc2dc\ud310'],['\ud14c\uc2a4\ud2b8/\uac80\uc218'],['\uc624\ud508 \uc900\ube44']]
        ))
      + fRow('\ub2f4\ub2f9\uc790', fsel(isReg
          ? [['\u2014 \uc120\ud0dd \u2014', true],['\uc774\uc11c\uc5f0'],['\uae40\uae30\ud68d'],['\ubc15PM'],['\ucd5c\uac1c\ubc1c'],['\uc815\ub514\uc790\uc778']]
          : [['클로드', true],['\uc774\uc11c\uc5f0'],['\uae40\uae30\ud68d'],['\ubc15PM'],['\ucd5c\uac1c\ubc1c']]
        ))
      + '</div>';
    html += '<div class="wbs-drawer-sec">'
      + '<div class="wbs-drawer-sec-title">\uc0c1\ud0dc / \uc6b0\uc120\uc21c\uc704</div>'
      + fRow('\uc9c4\ud589\uc0c1\ud0dc', fsel(isReg
          ? [['\ub300\uae30', true],['\uc9c4\ud589\uc911'],['\uc644\ub8cc'],['\ubcf4\ub958']]
          : [['\ub300\uae30'],['\uc9c4\ud589\uc911'],['\uc9c0\uc5f0', true],['\uc644\ub8cc'],['\ubcf4\ub958']]
        ))
      + fRow('\uc6b0\uc120\uc21c\uc704', fsel(isReg
          ? [['\ub192\uc74c'],['\ubcf4\ud1b5', true],['\ub0ae\uc74c']]
          : [['\ub192\uc74c', true],['\ubcf4\ud1b5'],['\ub0ae\uc74c']]
        ))
      + (isReg ? '' : fRow('\uc9c4\ucc99\ub960', '<input class="wbs-drawer-form-input" type="number" value="65" min="0" max="100">'))
      + '</div>';
    html += '<div class="wbs-drawer-sec">'
      + '<div class="wbs-drawer-sec-title">\uc77c\uc815</div>'
      + fRow('\uacc4\ud68d \uc2dc\uc791', fd(isReg ? '' : '2026-06-01'))
      + fRow('\uacc4\ud68d \uc885\ub8cc', fd(isReg ? '' : '2026-06-05'))
      + fRow('\uc608\uc0c1\uacf5\uc218', fi(isReg ? '' : '4\uc77c', '\uc608: 4\uc77c'))
      + '</div>';
    html += '<div class="wbs-drawer-sec fv-full">'
      + '<div class="wbs-drawer-sec-title">\uba54\ubaa8</div>'
      + '<div class="wbs-drawer-form-row"><label class="wbs-drawer-form-label">\ube44\uace0</label>'
      + '<textarea class="wbs-drawer-form-textarea" placeholder="\ucd94\uac00 \uba54\ubaa8\ub97c \uc785\ub825\ud558\uc138\uc694\u2026"></textarea></div>'
      + '</div>';
    return html;
  }

  function openFv(mode) {
    var fvPanel  = document.getElementById('wbs-fv-inline');
    var modeTag  = document.getElementById('wbs-fv-mode-tag');
    var fvBody   = document.getElementById('wbs-fv-body');
    var fvFoot   = document.getElementById('wbs-fv-foot');
    var editTrig = document.getElementById('wbs-fv-edit-trigger');
    if (!fvPanel) return;

    var modeLabels = {
      detail: '\uc804\uccb4\ubcf4\uae30 \u00b7 \uc0c1\uc138',
      edit:   '\uc804\uccb4\ubcf4\uae30 \u00b7 \uc218\uc815',
      create: '\uc804\uccb4\ubcf4\uae30 \u00b7 \ub4f1\ub85d'
    };
    if (modeTag)  modeTag.textContent = modeLabels[mode] || '\uc804\uccb4\ubcf4\uae30';
    if (editTrig) editTrig.style.display = mode === 'detail' ? '' : 'none';

    if (fvBody) {
      fvBody.innerHTML = (mode === 'detail')
        ? buildFvDetailHtml()
        : buildFvFormHtml(mode === 'create');
    }

    if (fvFoot) {
      if (mode === 'detail') {
        fvFoot.innerHTML =
          '<span class="wbs-dw-detail-timestamp">최종 변경 2026-06-07 10:42</span>'
          + '<button class="wbs-btn wbs-fv-foot-edit" type="button">수정</button>'
          + '<button class="wbs-btn wbs-btn-primary wbs-fv-back-foot" type="button">← 목록으로</button>';
        var footEditEl = fvFoot.querySelector('.wbs-fv-foot-edit');
        if (footEditEl) footEditEl.addEventListener('click', function () { openFv('edit'); });
      } else {
        var lbl = mode === 'create' ? '등록' : '저장';
        fvFoot.innerHTML =
          '<button class="wbs-btn wbs-fv-cancel-foot" type="button">취소</button>'
          + '<button class="wbs-btn" type="button">임시저장</button>'
          + '<span style="flex:1"></span>'
          + '<button class="wbs-btn wbs-fv-back-foot" type="button">← 목록으로</button>'
          + '<button class="wbs-btn wbs-btn-primary" type="button">' + lbl + '</button>';
        var cancelEl = fvFoot.querySelector('.wbs-fv-cancel-foot');
        if (cancelEl) {
          cancelEl.addEventListener('click', function () {
            if (mode === 'create') { closeFv(); } else { openFv('detail'); }
          });
        }
      }
      var backEl = fvFoot.querySelector('.wbs-fv-back-foot');
      if (backEl) backEl.addEventListener('click', closeFv);
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
    if (editTrig) editTrig.addEventListener('click', function () { openFv('edit'); });
    if (xBtn)     xBtn.addEventListener('click', closeFv);
    if (backBtn)  backBtn.addEventListener('click', closeFv);
    if (footBack) footBack.addEventListener('click', closeFv);
  }



  /* ─── 9. 섹션형 필터 패널 ──────────────────────────────── */
  function initFilterPanel() {
    var openBtn    = document.getElementById('wbs-filter-open-btn');
    var panel      = document.getElementById('wbs-filter-panel');
    var backdrop   = document.getElementById('wbs-fp-backdrop');
    var resetTop   = document.getElementById('wbs-fp-reset-top');
    var clearBtn   = document.getElementById('wbs-fp-clear');
    var applyBtn   = document.getElementById('wbs-fp-apply');
    var countBadge = document.getElementById('wbs-filter-count-badge');
    var footInfo   = document.getElementById('wbs-fp-foot-info');
    if (!openBtn || !panel) return;

    function openPanel() {
      panel.setAttribute('data-open', 'true');
      openBtn.classList.add('active');
      if (backdrop) backdrop.classList.add('visible');
    }
    function closePanel() {
      panel.setAttribute('data-open', 'false');
      if (backdrop) backdrop.classList.remove('visible');
      var count = panel.querySelectorAll('.wbs-fp-chip.active').length;
      openBtn.classList.toggle('active', count > 0);
    }

    openBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.getAttribute('data-open') === 'true' ? closePanel() : openPanel();
    });

    /* backdrop \uc2a4\ud06c\ub864 \uac04\uc12d \ub300\uc2e0 document \uc218\uc900 \uc678\ubd80\ud074\ub9ad \uac10\uc9c0 */
    document.addEventListener('click', function (e) {
      if (panel.getAttribute('data-open') !== 'true') return;
      if (!panel.contains(e.target) && !openBtn.contains(e.target)) {
        closePanel();
      }
    });

    panel.querySelectorAll('.wbs-fp-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.classList.toggle('active');
        updateCount();
      });
    });

    var mockRes = [17, 15, 13, 11, 9, 7, 6, 4, 3];
    function updateCount() {
      var count = panel.querySelectorAll('.wbs-fp-chip.active').length;
      if (countBadge) {
        countBadge.textContent = String(count);
        countBadge.classList.toggle('visible', count > 0);
      }
      if (footInfo) {
        footInfo.textContent = '조건 ' + count + '개 · 결과 ' + mockRes[Math.min(count, mockRes.length - 1)] + '건';
      }
      if (panel.getAttribute('data-open') !== 'true') {
        openBtn.classList.toggle('active', count > 0);
      }
    }

    function resetAll() {
      panel.querySelectorAll('.wbs-fp-chip.active').forEach(function (c) { c.classList.remove('active'); });
      updateCount();
    }

    if (resetTop) resetTop.addEventListener('click', resetAll);
    if (clearBtn) clearBtn.addEventListener('click', resetAll);
    if (applyBtn) applyBtn.addEventListener('click', closePanel);

    var filterReset = document.querySelector('.wbs-filter-reset');
    if (filterReset) filterReset.addEventListener('click', resetAll);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.getAttribute('data-open') === 'true') closePanel();
    });
  }


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
    var TODAY='2026-06-07',WD=['\uc77c','\uc6d4','\ud654','\uc218','\ubaa9','\uae08','\ud1a0'],MO=['1\uc6d4','2\uc6d4','3\uc6d4','4\uc6d4','5\uc6d4','6\uc6d4','7\uc6d4','8\uc6d4','9\uc6d4','10\uc6d4','11\uc6d4','12\uc6d4'];
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
    var chevIc='<svg class="wbs-sel-ck" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    function buildMenu(opts,cur){return opts.map(function(o){return'<div class="wbs-sel-opt'+(o===cur?' on':'')+'" data-sel-opt="'+o+'">'+(o===cur?chkIc:'<span style="width:13px;flex-shrink:0"></span>')+'<span>'+o+'</span></div>';}).join('');}
    /* .wbs-form-sec 내 absolute 포지셔닝: Drawer 스크롤 시 필드와 함께 이동 */
    var _selPortal=null;
    var _activeSel=null,_activeSelBtn=null,_activeSelSec=null;
    function closeSel(){if(_activeSelBtn)_activeSelBtn.classList.remove('open');if(_selPortal&&_selPortal.parentNode)_selPortal.parentNode.removeChild(_selPortal);if(_activeSelSec)_activeSelSec.classList.remove('popover-open');_selPortal=null;_activeSel=null;_activeSelBtn=null;_activeSelSec=null;}
    function openSel(box,btn){if(window._wbsCloseDp)window._wbsCloseDp();_activeSel=box;_activeSelBtn=btn;btn.classList.add('open');var opts=(box.getAttribute('data-sel-opts')||'').split('|').filter(Boolean);var sec=box.closest('.wbs-form-sec')||box.closest('.wbs-fv-body')||document.body;_activeSelSec=sec;sec.classList.add('popover-open');var br=btn.getBoundingClientRect(),sr=sec.getBoundingClientRect();var top=br.bottom-sr.top+sec.scrollTop+5;var left=br.left-sr.left;var w=br.width;_selPortal=document.createElement('div');_selPortal.className='wbs-sel-menu';_selPortal.style.cssText='top:'+top+'px;left:'+left+'px;width:'+w+'px;';_selPortal.innerHTML=buildMenu(opts,box.getAttribute('data-sel-val')||'');sec.appendChild(_selPortal);}
    window._wbsCloseSel=closeSel;
    function initOneSel(el){var val=el.getAttribute('data-sel-val')||'',ph=el.getAttribute('data-sel-placeholder')||'\u2014 \uc120\ud0dd \u2014';var disp=normalizeStageLabel(val);el.innerHTML='<button type="button" class="wbs-sel'+(val?'':' placeholder')+'" data-sel-toggle><span class="wbs-sel-sp">'+(disp||ph)+'</span>'+chevIc+'</button>';}
    document.querySelectorAll('[data-wbs-sel]').forEach(initOneSel);
    document.addEventListener('click',function(e){
      var tog=e.target.closest?e.target.closest('[data-sel-toggle]'):null;
      if(tog){var box=tog.closest('[data-wbs-sel]');if(!box)return;if(_activeSel===box){closeSel();return;}closeSel();openSel(box,tog);return;}
      if(_activeSel&&_selPortal.contains(e.target)){
        var opt=e.target.closest('[data-sel-opt]');
        if(opt){var val=opt.getAttribute('data-sel-opt');_activeSel.setAttribute('data-sel-val',val);var sp=_activeSel.querySelector('.wbs-sel-sp');if(sp)sp.textContent=val;if(_activeSelBtn)_activeSelBtn.classList.remove('placeholder','open');closeSel();}
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
    initThemeToggleBtn();  /* 테마 토글 버튼 aria-label */
    initTopbarSearch();    /* topbar 검색 → 본문 검색 포커스 */
    initGanttToggle();
    initGroupToggle();
    initFocusView();
    initCheckboxes();     /* 체크박스 셀 삽입 */
    initDeleteButton();   /* 삭제 버튼 */
    initToggleButtons();
    initDrawer();         /* row click → drawer (체크박스 셀 제외) */
    initFullView();
    initFilterPanel();
    initFormToggles();    /* 등록/수정 폼 토글 버튼 */
    initDialog();         /* 커스텀 Alert/Confirm */
    initDatePickers();    /* 커스텀 DatePicker */
    initSelectBoxes();    /* 커스텀 SelectBox */
    initDrawerFeedback(); /* 저장/등록 피드백 */
    normalizeStageDisplayCells(); /* 단계 배지 표시값 보정 */
  });

}());
