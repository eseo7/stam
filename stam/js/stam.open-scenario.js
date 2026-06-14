(function () {
  'use strict';

  /* ── Scrim & Drawer ─────────────────────────────────────────── */
  var scrim  = document.getElementById('os-scrim');
  var drawer = document.getElementById('os-dw-detail');

  function openDetailDrawer(scnId) {
    if (!drawer) return;
    scrim && scrim.classList.add('show');
    drawer.classList.add('open');
    var activeRow = document.querySelector('.os-row-active');
    if (activeRow) activeRow.classList.remove('os-row-active');
    if (scnId) {
      var row = document.querySelector('.os-row[data-scn-id="' + scnId + '"]');
      if (row) row.classList.add('os-row-active');
    }
  }

  function closeDrawer() {
    scrim && scrim.classList.remove('show');
    drawer && drawer.classList.remove('open');
    var activeRow = document.querySelector('.os-row-active');
    if (activeRow) activeRow.classList.remove('os-row-active');
  }

  /* ── Row click → detail drawer ─────────────────────────────── */
  function bindRows() {
    document.querySelectorAll('#os-tbody .os-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('.os-detail-btn')) return;
        openDetailDrawer(row.getAttribute('data-scn-id'));
      });
    });
  }

  /* ── [상세] button click ──────────────────────────────────────── */
  function bindDetailButtons() {
    document.querySelectorAll('.os-detail-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDetailDrawer(btn.getAttribute('data-scn'));
      });
    });
  }

  /* ── Close buttons ───────────────────────────────────────────── */
  var closeBtns = [
    document.getElementById('os-dw-close-btn'),
    document.getElementById('os-dw-cancel-btn'),
  ];
  closeBtns.forEach(function (btn) {
    if (btn) btn.addEventListener('click', closeDrawer);
  });

  if (scrim) scrim.addEventListener('click', closeDrawer);

  /* ── ESC key ─────────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ── Drawer tabs ─────────────────────────────────────────────── */
  function bindDrawerTabs() {
    var tabs     = document.querySelectorAll('.os-dw-tab');
    var tabNames = ['info', 'checklist', 'issue', 'attach', 'approval', 'history'];

    tabs.forEach(function (tab, idx) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
        tabNames.forEach(function (name) {
          var panel = document.getElementById('os-tab-' + name);
          if (panel) panel.style.display = '';
        });
        tabNames.forEach(function (name, i) {
          var panel = document.getElementById('os-tab-' + name);
          if (panel) panel.style.display = (i === idx) ? '' : 'none';
        });
      });
    });
  }

  /* ── Phase filter tabs ───────────────────────────────────────── */
  function bindPhaseTabs() {
    document.querySelectorAll('.os-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.os-tab').forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
      });
    });
  }

  /* ── Status filter chips ─────────────────────────────────────── */
  function bindFilterChips() {
    document.querySelectorAll('.os-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.classList.toggle('on');
      });
    });
  }

  /* ── 상황판 보기 button — placeholder ───────────────────────── */
  var sitboardBtn = document.getElementById('os-sitboard-btn');
  if (sitboardBtn) {
    sitboardBtn.addEventListener('click', function () {
      alert('상황판 전체창은 후속 PR에서 구현됩니다.');
    });
  }

  /* ── 시나리오 등록 button — placeholder ─────────────────────── */
  var regBtn = document.getElementById('os-reg-btn');
  if (regBtn) {
    regBtn.addEventListener('click', function () {
      alert('시나리오 등록 기능은 후속 PR에서 구현됩니다.');
    });
  }

  /* ── 컬럼 설정 button — placeholder ─────────────────────────── */
  var colBtn = document.getElementById('os-col-btn');
  if (colBtn) {
    colBtn.addEventListener('click', function () {
      alert('컬럼 설정 기능은 후속 PR에서 구현됩니다.');
    });
  }

  /* ── 내보내기 button — placeholder ──────────────────────────── */
  var exportBtn = document.getElementById('os-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      alert('내보내기 기능은 후속 PR에서 구현됩니다.');
    });
  }

  /* ── Board Filter 공통 컴포넌트 초기화 ─────────────────────── */
  if (window.STAM && window.STAM.boardFilter) {
    window.STAM.boardFilter.init({
      root:    document,
      trigger: '#os-filter-open-btn',
      panel:   '#os-filter-panel',
      reset:   '#os-filter-reset',
      apply:   '#os-filter-apply',
      groups: [
        { key: 'phase',    label: '오픈 단계', options: ['오픈 전', '오픈 당일', '오픈 후'] },
        { key: 'status',   label: '체크 결과', options: ['완료', '진행중', '대기', '이슈', '예정'] },
        { key: 'scope',    label: '공개범위',  options: ['내부공개', '고객공유', '내부전용'] },
        { key: 'confirm',  label: '고객확인',  options: ['미요청', '검토중', '확인대기', '고객공유'] },
        { key: 'assignee', label: '담당자',    options: ['최태호', '박지원', '김민수', '이다은'] },
      ],
      onApply: function () { /* 정적 목업 — 실제 필터링 미구현 */ }
    });
  }

  /* ── Nav 활성화 ──────────────────────────────────────────────── */
  if (window.STAM && window.STAM.navRender) {
    window.STAM.navRender.init('C8');
  }

  /* ── 전체 보기 / 접기 toggle ─────────────────────────────────── */
  var showAllBtn   = document.getElementById('os-show-all-btn');
  var scnTable     = document.getElementById('os-scenario-table');
  var listCountTxt = document.querySelector('.os-list-count-text');
  var tblCount     = document.querySelector('.os-tbl-count');
  if (showAllBtn && scnTable) {
    showAllBtn.addEventListener('click', function () {
      var expanded = scnTable.classList.toggle('os-list-expanded');
      showAllBtn.textContent = expanded ? '접기' : '전체 보기';
      if (listCountTxt) listCountTxt.textContent = expanded ? '총 24건 전체 표시' : '총 24건 중 8건 표시';
      if (tblCount) tblCount.textContent = expanded ? '24 / 24 표시' : '8 / 24 표시';
    });
  }

  /* ── Init ────────────────────────────────────────────────────── */
  bindRows();
  bindDetailButtons();
  bindDrawerTabs();
  bindPhaseTabs();
  bindFilterChips();

}());
