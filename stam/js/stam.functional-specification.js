(function () {
  'use strict';

  // ── Custom select (SSOT — stam.custom-select.js) ──────────────
  // fn 게시판은 stam-cs* 보조 클래스를 함께 부여한다 (CSS 호환 유지).
  var FN_CS_CFG = {
    selectSelector: 'select.fn-sel',
    nativeMarkerAttr: 'data-fn-cs',
    uidPrefix: 'fncs',
    wrapClass: 'fn-cs stam-cs',
    triggerClass: 'fn-cs-trigger stam-cs-trigger',
    valClass: 'fn-cs-val stam-cs-value',
    caretClass: 'fn-cs-caret stam-cs-icon',
    panelClass: 'fn-cs-panel stam-cs-menu',
    optClass: 'fn-cs-opt stam-cs-opt',
    checkClass: 'fn-cs-check stam-cs-check',
    otextClass: 'fn-cs-otext stam-cs-otext',
    nativeClass: 'fn-cs-native',
    flipContainer: '.fn-dw-body',
    openClass: 'open is-open',
    upClass: 'cs-up is-up',
    openSelector: '.fn-cs.open'
  };

  function enhanceFnDrawerSelects(drawerEl) {
    if (!drawerEl || !(window.STAM && window.STAM.customSelect)) return;
    window.STAM.customSelect.init(drawerEl, FN_CS_CFG);
  }
  function closeAllFnCustomSelects() {
    if (window.STAM && window.STAM.customSelect) {
      window.STAM.customSelect.closeAll(document, FN_CS_CFG);
    }
  }

  // ── Drawer state ──────────────────────────────────────────────
  var scrim = document.getElementById('fn-scrim');

  function openDrawer(type) {
    closeAll(false);
    var el = document.getElementById('fn-dw-' + type);
    if (!el) return;
    if (scrim) scrim.classList.add('show');
    el.classList.add('open');
    enhanceFnDrawerSelects(el);
  }

  // closeAll: drawer/scrim/custom-select 만 닫는다.
  // is-selected 는 controller 가 관리 — drawer 닫기로 selection 을 해제하지 않는다.
  function closeAll() {
    closeAllFnCustomSelects();
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.fn-drawer').forEach(function (d) {
      d.classList.remove('open');
    });
  }

  // STAMBoardList Controller 가 row active / checkbox selected / delete count /
  // header checkbox / Escape 의 .is-active 해제를 일괄 담당한다.
  // 본 화면은 onRowActivate 만 drawer open 으로 연결한다.
  var listRoot = document.querySelector('[data-stam-board-list]');
  var boardApi = null;
  if (listRoot && window.STAMBoardList) {
    boardApi = window.STAMBoardList.init(listRoot, {
      deleteBtn: '#fn-del-btn',
      onRowActivate: function () { openDrawer('detail'); },
    });
  }

  // ── detail drawer → 수정 button ─────────────────────────────
  document.querySelectorAll('[data-fn-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      openDrawer(el.getAttribute('data-fn-open'));
    });
  });

  function closeAllAndClearActive() {
    closeAll();
    if (boardApi) boardApi.clearActive();
  }

  // ── Close buttons ─────────────────────────────────────────────
  document.querySelectorAll('.fn-dw-close, [data-fn-close]').forEach(function (el) {
    el.addEventListener('click', closeAllAndClearActive);
  });

  // ── Scrim click → close ───────────────────────────────────────
  if (scrim) {
    scrim.addEventListener('click', closeAllAndClearActive);
  }

  // ── ESC key (custom select 우선, 없으면 drawer 닫기) ──────────
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.fn-cs.open')) {
      e.preventDefault();
      e.stopPropagation();
      closeAllFnCustomSelects();
    } else {
      closeAllAndClearActive();
    }
  }, true);

  // ── Outside click → close custom select ──────────────────────
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.fn-cs')) closeAllFnCustomSelects();
  });

  // ── Register button ───────────────────────────────────────────
  var regBtn = document.getElementById('fn-reg-btn');
  if (regBtn) {
    regBtn.addEventListener('click', function () { openDrawer('register'); });
  }

  // ── Tab switching (detail drawer) ────────────────────────────
  document.querySelectorAll('.fn-dw-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var drawer = tab.closest('.fn-drawer');
      if (!drawer) return;
      drawer.querySelectorAll('.fn-dw-tab').forEach(function (t) { t.classList.remove('on'); });
      tab.classList.add('on');
      var idx = Array.from(drawer.querySelectorAll('.fn-dw-tab')).indexOf(tab);
      drawer.querySelectorAll('.fn-tab-panel').forEach(function (p, i) {
        p.style.display = i === idx ? '' : 'none';
      });
    });
  });

  // ── Search: client-side filter ────────────────────────────────
  var searchInput = document.getElementById('fn-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase();
      document.querySelectorAll('#fn-tbody .fn-data-row').forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = q === '' || text.indexOf(q) !== -1 ? '' : 'none';
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────
  if (window.STAM && window.STAM.navRender) {
    window.STAM.navRender.init('B5');
  }
  // Row/checkbox/delete count 바인딩은 STAMBoardList Controller 가 담당 (위)

  /* ── Board Filter 공통 컴포넌트 초기화 ── */
  if (window.STAM && window.STAM.boardFilter) {
    window.STAM.boardFilter.init({
      root:    document,
      trigger: '#fn-filter-open-btn',
      panel:   '#fn-filter-panel',
      reset:   '#fn-filter-reset',
      apply:   '#fn-filter-apply',
      groups: [
        { key: 'status',      label: '상태',     options: ['작성중', '검토요청', '검토완료', '승인완료', '보류'] },
        { key: 'fn-type',     label: '기능유형', options: ['조회', '등록', '수정', '삭제', '승인', '알림', '내보내기', '연동'] },
        { key: 'priority',    label: '우선순위', options: ['높음', '중간', '낮음'] },
        { key: 'linked-scr',  label: '연결 화면', options: ['요구사항정의서', '메뉴구조/화면목록', '화면설계서', 'WBS'] },
        { key: 'assignee',    label: '담당자',   options: ['김철수', '이영희', '박지수'] }
      ],
      onApply: function (/* values */) {
        /* 실제 필터링 미구현 — UI Mock */
      }
    });
  }

}());
