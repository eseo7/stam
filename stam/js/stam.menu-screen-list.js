(function () {
  'use strict';

  // ── Custom select (SSOT — stam.custom-select.js) ──────────────
  var MSL_CS_CFG = {
    selectSelector: 'select.msl-inp',
    nativeMarkerAttr: 'data-msl-cs',
    uidPrefix: 'mslcs',
    wrapClass: 'msl-cs',
    triggerClass: 'msl-cs-trigger',
    valClass: 'msl-cs-val',
    caretClass: 'msl-cs-caret',
    panelClass: 'msl-cs-panel',
    optClass: 'msl-cs-opt',
    checkClass: 'msl-cs-check',
    otextClass: 'msl-cs-otext',
    nativeClass: 'msl-cs-native',
    flipContainer: '.msl-dw-body',
    openClass: 'open',
    upClass: 'cs-up',
    openSelector: '.msl-cs.open'
  };

  function enhanceMslDrawerSelects(drawerEl) {
    if (!drawerEl || !(window.STAM && window.STAM.customSelect)) return;
    window.STAM.customSelect.init(drawerEl, MSL_CS_CFG);
  }
  function closeAllMslCustomSelects() {
    if (window.STAM && window.STAM.customSelect) {
      window.STAM.customSelect.closeAll(document, MSL_CS_CFG);
    }
  }

  // ── Drawer state ──────────────────────────────────────────────
  var scrim = document.getElementById('msl-scrim');

  function openDrawer(type) {
    closeAll();
    var el = document.getElementById('msl-dw-' + type);
    if (!el) return;
    if (scrim) scrim.classList.add('show');
    el.classList.add('open');
    enhanceMslDrawerSelects(el);
  }

  // drawer / scrim / custom-select 만 닫는다.
  // .is-selected 는 Controller(checkbox) 소유 — drawer 닫기로 selection 을 해제하지 않는다.
  function closeAll() {
    closeAllMslCustomSelects();
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.msl-drawer').forEach(function (d) {
      d.classList.remove('open');
    });
    // v2 drawer도 함께 닫기 (상호배타)
    var v2dw   = document.getElementById('msv2-dw');
    var v2sc   = document.getElementById('msv2-scrim');
    if (v2dw) v2dw.setAttribute('data-open', 'false');
    if (v2sc) v2sc.style.display = 'none';
  }

  // STAMBoardList Controller 가 row .is-active / checkbox .is-selected / delete count(삭제 (N)) /
  // header 전체선택·indeterminate / Escape 의 .is-active 해제를 일괄 담당.
  // 본 화면은 onRowActivate 만 상세 drawer open 으로 연결한다.
  var listRoot = document.querySelector('[data-stam-board-list]');
  var boardApi = null;
  if (listRoot && window.STAMBoardList) {
    boardApi = window.STAMBoardList.init(listRoot, {
      deleteBtn: '#msl-del-btn',
      onRowActivate: function (rowEl) {
        // v2 row(msv2-int-row)는 stam.menu-screen-crud.js가 처리 — static drawer 열지 않음
        var active = listRoot.querySelector('.stam-table-row.is-active');
        if (active && active.classList.contains('msv2-int-row')) return;
        openDrawer('detail');
      },
    });
  }

  function closeAllAndClearActive() {
    closeAll();
    if (boardApi) boardApi.clearActive();
  }

  // Row click / checkbox / delete count / header 전체선택 은 STAMBoardList Controller 가 담당.
  // 화면 자체 bindRows() / bindCheckboxes() 는 제거됨 (row click=.is-active, checkbox=.is-selected 분리).
  document.querySelectorAll('[data-msl-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      openDrawer(el.getAttribute('data-msl-open'));
    });
  });

  // ── Close buttons ─────────────────────────────────────────────
  document.querySelectorAll('.msl-dw-close, [data-msl-close]').forEach(function (el) {
    el.addEventListener('click', closeAllAndClearActive);
  });

  // ── Scrim click → close ───────────────────────────────────────
  if (scrim) {
    scrim.addEventListener('click', closeAllAndClearActive);
  }

  // ── ESC key (custom select 우선, 없으면 drawer 닫기 + .is-active 해제) ──
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.msl-cs.open')) {
      e.preventDefault();
      e.stopPropagation();
      closeAllMslCustomSelects();
    } else {
      closeAllAndClearActive();
    }
  }, true);

  // ── Outside click → close custom select ──────────────────────
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.msl-cs')) closeAllMslCustomSelects();
  });

  // ── Register button ───────────────────────────────────────────
  var regBtn = document.getElementById('msl-reg-btn');
  if (regBtn) {
    regBtn.addEventListener('click', function () { openDrawer('register'); });
  }

  // ── Tab switching (detail drawer) ────────────────────────────
  document.querySelectorAll('.msl-dw-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var drawer = tab.closest('.msl-drawer');
      if (!drawer) return;
      drawer.querySelectorAll('.msl-dw-tab').forEach(function (t) { t.classList.remove('on'); });
      tab.classList.add('on');
      var idx = Array.from(drawer.querySelectorAll('.msl-dw-tab')).indexOf(tab);
      drawer.querySelectorAll('.msl-tab-panel').forEach(function (p, i) {
        p.style.display = i === idx ? '' : 'none';
      });
    });
  });

  // ── Init ──────────────────────────────────────────────────────
  if (window.STAM && window.STAM.navRender) {
    window.STAM.navRender.init('B2');
  }
  // row click / checkbox / 전체선택 / delete count 는 STAMBoardList 가 담당 (위 init 참조).

  /* ── Board Filter 공통 컴포넌트 초기화 ── */
  if (window.STAM && window.STAM.boardFilter) {
    window.STAM.boardFilter.init({
      root:    document,
      trigger: '#msl-filter-open-btn',
      panel:   '#msl-filter-panel',
      reset:   '#msl-filter-reset',
      apply:   '#msl-filter-apply',
      groups: [
        { key: 'status',      label: '상태',   options: ['작성중', '검토중', '확정', '보류'] },
        { key: 'screen-type', label: '화면유형', options: ['목록', '등록', '상세', '수정', '팝업', 'Drawer', '설정', '대시보드'] },
        { key: 'lv1',         label: 'LV1',    options: ['산출물 관리', '인증', '서비스 루트', '관리/설정'] },
        { key: 'fo-bo',       label: 'FO/BO',  options: ['FO', 'BO'] }
      ],
      onApply: function (/* values */) {
        /* 실제 필터링 미구현 — UI Mock */
      }
    });
  }

}());
