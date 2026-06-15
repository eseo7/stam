(function () {
  'use strict';

  // ── Custom select (fn-cs) ─────────────────────────────────────
  var fnCsUid = 0;
  var FN_CHECK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function buildFnCustomSelect(native) {
    if (native.getAttribute('data-fn-cs') === '1') return;
    native.setAttribute('data-fn-cs', '1');
    var uid = 'fncs-' + (++fnCsUid);
    var activeIdx = -1;

    var wrap = document.createElement('div');
    wrap.className = 'fn-cs';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fn-cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', uid + '-list');

    var valSpan = document.createElement('span');
    valSpan.className = 'fn-cs-val';

    var caret = document.createElement('span');
    caret.className = 'fn-cs-caret';
    caret.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(valSpan);
    trigger.appendChild(caret);

    var panel = document.createElement('div');
    panel.className = 'fn-cs-panel';
    panel.id = uid + '-list';
    panel.setAttribute('role', 'listbox');

    Array.prototype.forEach.call(native.options, function (o, i) {
      var od = document.createElement('div');
      od.className = 'fn-cs-opt';
      od.id = uid + '-opt-' + i;
      od.setAttribute('role', 'option');
      od.setAttribute('data-idx', i);
      od.setAttribute('aria-selected', 'false');
      if (o.value === '') od.classList.add('is-placeholder');
      var ck = document.createElement('span');
      ck.className = 'fn-cs-check';
      ck.setAttribute('aria-hidden', 'true');
      ck.innerHTML = FN_CHECK_SVG;
      var tx = document.createElement('span');
      tx.className = 'fn-cs-otext';
      tx.textContent = o.textContent;
      od.appendChild(ck);
      od.appendChild(tx);
      panel.appendChild(od);
    });

    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    native.classList.add('fn-cs-native');

    function syncLabel() {
      var sel = native.options[native.selectedIndex];
      valSpan.textContent = sel ? sel.textContent : '';
      valSpan.classList.toggle('is-placeholder', !!sel && sel.value === '');
      Array.prototype.forEach.call(panel.children, function (c) {
        var idx = parseInt(c.getAttribute('data-idx'), 10);
        var isSelected = idx === native.selectedIndex;
        var isPlaceholder = c.classList.contains('is-placeholder');
        c.classList.toggle('is-sel', isSelected && !isPlaceholder);
        c.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    }
    syncLabel();

    function setActive(idx) {
      var opts = panel.children;
      if (idx < 0) idx = 0;
      if (idx > opts.length - 1) idx = opts.length - 1;
      activeIdx = idx;
      Array.prototype.forEach.call(opts, function (c, i) {
        c.classList.toggle('is-active', i === idx);
      });
      var act = opts[idx];
      if (act) {
        trigger.setAttribute('aria-activedescendant', act.id);
        act.scrollIntoView({ block: 'nearest' });
      }
    }

    function applyFlip() {
      wrap.classList.remove('cs-up');
      var container = wrap.closest('.fn-dw-body');
      if (!container) return;
      var ph = panel.offsetHeight || 200;
      var tRect = trigger.getBoundingClientRect();
      var cRect = container.getBoundingClientRect();
      var below = cRect.bottom - tRect.bottom;
      var above = tRect.top - cRect.top;
      if (below < ph + 8 && above > below) wrap.classList.add('cs-up');
    }

    function openPanel() {
      closeAllFnCustomSelects();
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      applyFlip();
      setActive(native.selectedIndex >= 0 ? native.selectedIndex : 0);
    }

    function selectIdx(idx) {
      if (native.selectedIndex !== idx) {
        native.selectedIndex = idx;
        native.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncLabel();
      closeFnCustomSelect(wrap);
      trigger.focus();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains('open')) closeFnCustomSelect(wrap);
      else openPanel();
    });

    trigger.addEventListener('keydown', function (e) {
      var isOpen = wrap.classList.contains('open');
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) openPanel(); else setActive(activeIdx + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) openPanel(); else setActive(activeIdx - 1);
          break;
        case 'Home':
          if (isOpen) { e.preventDefault(); setActive(0); }
          break;
        case 'End':
          if (isOpen) { e.preventDefault(); setActive(panel.children.length - 1); }
          break;
        case 'Enter':
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          if (!isOpen) openPanel(); else selectIdx(activeIdx);
          break;
        case 'Tab':
          if (isOpen) closeFnCustomSelect(wrap);
          break;
      }
    });

    panel.addEventListener('mousemove', function (e) {
      var od = e.target.closest('.fn-cs-opt');
      if (od) setActive(parseInt(od.getAttribute('data-idx'), 10));
    });

    panel.addEventListener('click', function (e) {
      var od = e.target.closest('.fn-cs-opt');
      if (!od) return;
      e.stopPropagation();
      selectIdx(parseInt(od.getAttribute('data-idx'), 10));
    });
  }

  function closeFnCustomSelect(wrap) {
    wrap.classList.remove('open');
    wrap.classList.remove('cs-up');
    var t = wrap.querySelector('.fn-cs-trigger');
    if (t) { t.setAttribute('aria-expanded', 'false'); t.removeAttribute('aria-activedescendant'); }
  }

  function closeAllFnCustomSelects() {
    document.querySelectorAll('.fn-cs.open').forEach(closeFnCustomSelect);
  }

  function enhanceFnDrawerSelects(drawerEl) {
    if (!drawerEl) return;
    drawerEl.querySelectorAll('select.fn-sel').forEach(buildFnCustomSelect);
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
