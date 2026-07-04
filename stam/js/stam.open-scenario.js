(function () {
  'use strict';

  /* ── Scrim & Drawer ─────────────────────────────────────────── */
  var scrim  = document.getElementById('os-scrim');
  var drawer = document.getElementById('os-dw-detail');

  /* row 의 .is-active / .is-selected / delete count / header 전체선택 은
     공통 Controller(window.STAMBoardList) 가 담당한다. 본 함수는 drawer UI 만 연다. */
  function openDetailDrawer(/* scnId */) {
    if (!drawer) return;
    scrim && scrim.classList.add('show');
    drawer.classList.add('open');
  }

  function closeDrawer() {
    scrim && scrim.classList.remove('show');
    drawer && drawer.classList.remove('open');
    if (boardApi) boardApi.clearActive();
  }

  /* ── Board List Controller 연결 ──────────────────────────────
     row click = .is-active + drawer open / checkbox = .is-selected /
     header 전체선택 / delete count(삭제 (N)) / Escape 의 .is-active 해제를 위임. */
  var listRoot = document.querySelector('[data-stam-board-list]');
  var boardApi = null;
  if (listRoot && window.STAMBoardList) {
    boardApi = window.STAMBoardList.init(listRoot, {
      deleteBtn: '#os-delete-btn',
      onRowActivate: function (row) { openDetailDrawer(row.getAttribute('data-scn-id')); },
      // 실제 삭제 로직은 만들지 않음 — placeholder 만 유지 (선택 1개 이상일 때만 호출됨).
      onDelete: function () { alert('선택된 시나리오 삭제는 후속 PR에서 구현합니다.'); },
    });
  }

  /* ── [상세] button click ──────────────────────────────────────
     행 내부 [상세] 버튼은 Controller 가 interactive 로 보고 무시하므로,
     해당 행의 click 을 재발행해 Controller 의 row activate(.is-active + drawer) 로 위임. */
  function bindDetailButtons() {
    document.querySelectorAll('.os-detail-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var row = btn.closest('.stam-table-row');
        if (row) row.click();
        else openDetailDrawer(btn.getAttribute('data-scn'));
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
        tabNames.forEach(function (name, i) {
          var panel = document.getElementById('os-tab-' + name);
          if (!panel) return;
          panel.classList.toggle('is-active', i === idx);
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

  /* ── Checkbox / 전체선택 / delete count: 공통 Controller 위임 ─────
     row .is-selected, header 전체선택/indeterminate, 삭제 (N) 라벨은
     STAMBoardList.init() 가 처리한다 (위 onRowActivate/onDelete 연결 참조).
     화면 자체 bindCheckboxes() 는 제거. */

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
  /* row click / checkbox / 전체선택 / delete count 는 STAMBoardList 가 담당.
     화면 자체 bindRows() / bindCheckboxes() 는 제거됨. */
  bindDetailButtons();
  bindDrawerTabs();
  bindPhaseTabs();
  bindFilterChips();

}());
