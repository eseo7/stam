(function () {
  'use strict';

  // ── Custom select (SSOT — stam.custom-select.js) ──────────────
  var RQ_CS_CFG = {
    selectSelector: 'select.rq-inp',
    nativeMarkerAttr: 'data-rq-cs',
    uidPrefix: 'rqcs',
    wrapClass: 'rq-cs',
    triggerClass: 'rq-cs-trigger',
    valClass: 'rq-cs-val',
    caretClass: 'rq-cs-caret',
    panelClass: 'rq-cs-panel',
    optClass: 'rq-cs-opt',
    checkClass: 'rq-cs-check',
    otextClass: 'rq-cs-otext',
    nativeClass: 'rq-cs-native',
    flipContainer: '.rq-dw-body',
    openClass: 'open',
    upClass: 'cs-up',
    openSelector: '.rq-cs.open'
  };

  function enhanceRqDrawerSelects(drawerEl) {
    if (!drawerEl || !(window.STAM && window.STAM.customSelect)) return;
    window.STAM.customSelect.init(drawerEl, RQ_CS_CFG);
  }
  function closeAllRqCustomSelects() {
    if (window.STAM && window.STAM.customSelect) {
      window.STAM.customSelect.closeAll(document, RQ_CS_CFG);
    }
  }

  // ── Drawer state ──────────────────────────────────────────────
  const scrim = document.getElementById('rq-scrim');

  function openDrawer(type) {
    closeAll();
    const el = document.getElementById('rq-dw-' + type);
    if (!el) return;
    scrim.classList.add('show');
    el.classList.add('open');
    enhanceRqDrawerSelects(el);
  }

  // drawer / scrim / custom-select 만 닫는다.
  // .is-selected 는 Controller(checkbox) 소유 — drawer 닫기로 selection 을 해제하지 않는다.
  function closeAll() {
    closeAllRqCustomSelects();
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.rq-drawer').forEach(function (d) {
      d.classList.remove('open');
    });
  }

  // STAMBoardList Controller 가 row .is-active / checkbox .is-selected / delete count(삭제 (N)) /
  // header 전체선택·indeterminate / Escape 의 .is-active 해제를 일괄 담당.
  // 본 화면은 onRowActivate 만 상세 drawer open 으로 연결한다.
  var listRoot = document.querySelector('[data-stam-board-list]');
  var boardApi = null;
  if (listRoot && window.STAMBoardList) {
    boardApi = window.STAMBoardList.init(listRoot, {
      deleteBtn: '#rq-del-btn',
      onRowActivate: function (row) {
        var listApi = window.STAM && window.STAM.requirementsFirestoreList;
        if (listApi && typeof listApi.openDetailFromRow === 'function') {
          listApi.openDetailFromRow(row).then(function () { openDrawer('detail'); });
          return;
        }
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

  // ── Detail drawer → 수정 button ─────────────────────────────
  document.querySelectorAll('[data-rq-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      openDrawer(el.getAttribute('data-rq-open'));
    });
  });

  // ── Close buttons ─────────────────────────────────────────────
  document.querySelectorAll('.rq-dw-close, [data-rq-close]').forEach(function (el) {
    el.addEventListener('click', closeAllAndClearActive);
  });

  // ── Scrim click → close ───────────────────────────────────────
  if (scrim) {
    scrim.addEventListener('click', closeAllAndClearActive);
  }

  // ── ESC key (custom select 우선, 없으면 drawer 닫기 + .is-active 해제) ──
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.rq-cs.open')) {
      e.preventDefault();
      e.stopPropagation();
      closeAllRqCustomSelects();
    } else {
      closeAllAndClearActive();
    }
  }, true);

  // ── Outside click → close custom select ──────────────────────
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.rq-cs')) closeAllRqCustomSelects();
  });

  // ── Register button ───────────────────────────────────────────
  var regBtn = document.getElementById('rq-reg-btn');
  if (regBtn) {
    regBtn.addEventListener('click', function () { openDrawer('register'); });
  }

  // ── Tab switching (detail drawer) ────────────────────────────
  document.querySelectorAll('.rq-dw-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var panel = tab.closest('.rq-drawer');
      if (!panel) return;
      panel.querySelectorAll('.rq-dw-tab').forEach(function (t) { t.classList.remove('on'); });
      tab.classList.add('on');
      var idx = Array.from(panel.querySelectorAll('.rq-dw-tab')).indexOf(tab);
      panel.querySelectorAll('.rq-tab-panel').forEach(function (p, i) {
        p.style.display = i === idx ? '' : 'none';
      });
    });
  });

  // ── Init ──────────────────────────────────────────────────────
  if (window.STAM && window.STAM.navRender) {
    window.STAM.navRender.init('B1');
  }
  // row click / checkbox / 전체선택 / delete count 는 STAMBoardList 가 담당 (위 init 참조).

  /* ── Board Filter 공통 컴포넌트 초기화 ── */
  if (window.STAM && window.STAM.boardFilter) {
    window.STAM.boardFilter.init({
      root:    document,
      trigger: '#rq-filter-open-btn',
      panel:   '#rq-filter-panel',
      reset:   '#rq-filter-reset',
      apply:   '#rq-filter-apply',
      groups: [
        { key: 'status',   label: '상태',   options: ['작성중', '검토요청', '검토완료', '승인완료', '보류'] },
        { key: 'type',     label: '유형',   options: ['기능', '화면', '데이터', '정책'] },
        { key: 'priority', label: '우선순위', options: ['높음', '중간', '낮음'] },
        { key: 'assignee', label: '담당자', options: ['김철수', '이영희', '박지수'] }
      ],
      onApply: function (/* values */) {
        /* 실제 필터링 미구현 — UI Mock */
      }
    });
  }

}());
