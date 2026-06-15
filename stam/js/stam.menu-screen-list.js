(function () {
  'use strict';

  // ── Custom select (msl-cs) ────────────────────────────────────
  var mslCsUid = 0;
  var MSL_CHECK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function buildMslCustomSelect(native) {
    if (native.getAttribute('data-msl-cs') === '1') return;
    native.setAttribute('data-msl-cs', '1');
    var uid = 'mslcs-' + (++mslCsUid);
    var activeIdx = -1;

    var wrap = document.createElement('div');
    wrap.className = 'msl-cs';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'msl-cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', uid + '-list');

    var valSpan = document.createElement('span');
    valSpan.className = 'msl-cs-val';

    var caret = document.createElement('span');
    caret.className = 'msl-cs-caret';
    caret.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(valSpan);
    trigger.appendChild(caret);

    var panel = document.createElement('div');
    panel.className = 'msl-cs-panel';
    panel.id = uid + '-list';
    panel.setAttribute('role', 'listbox');

    Array.prototype.forEach.call(native.options, function (o, i) {
      var od = document.createElement('div');
      od.className = 'msl-cs-opt';
      od.id = uid + '-opt-' + i;
      od.setAttribute('role', 'option');
      od.setAttribute('data-idx', i);
      od.setAttribute('aria-selected', 'false');
      if (o.value === '') od.classList.add('is-placeholder');
      var ck = document.createElement('span');
      ck.className = 'msl-cs-check';
      ck.setAttribute('aria-hidden', 'true');
      ck.innerHTML = MSL_CHECK_SVG;
      var tx = document.createElement('span');
      tx.className = 'msl-cs-otext';
      tx.textContent = o.textContent;
      od.appendChild(ck);
      od.appendChild(tx);
      panel.appendChild(od);
    });

    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    native.classList.add('msl-cs-native');

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
      var container = wrap.closest('.msl-dw-body');
      if (!container) return;
      var ph = panel.offsetHeight || 200;
      var tRect = trigger.getBoundingClientRect();
      var cRect = container.getBoundingClientRect();
      var below = cRect.bottom - tRect.bottom;
      var above = tRect.top - cRect.top;
      if (below < ph + 8 && above > below) wrap.classList.add('cs-up');
    }

    function openPanel() {
      closeAllMslCustomSelects();
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
      closeMslCustomSelect(wrap);
      trigger.focus();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains('open')) closeMslCustomSelect(wrap);
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
          if (isOpen) closeMslCustomSelect(wrap);
          break;
      }
    });

    panel.addEventListener('mousemove', function (e) {
      var od = e.target.closest('.msl-cs-opt');
      if (od) setActive(parseInt(od.getAttribute('data-idx'), 10));
    });

    panel.addEventListener('click', function (e) {
      var od = e.target.closest('.msl-cs-opt');
      if (!od) return;
      e.stopPropagation();
      selectIdx(parseInt(od.getAttribute('data-idx'), 10));
    });
  }

  function closeMslCustomSelect(wrap) {
    wrap.classList.remove('open');
    wrap.classList.remove('cs-up');
    var t = wrap.querySelector('.msl-cs-trigger');
    if (t) { t.setAttribute('aria-expanded', 'false'); t.removeAttribute('aria-activedescendant'); }
  }

  function closeAllMslCustomSelects() {
    document.querySelectorAll('.msl-cs.open').forEach(closeMslCustomSelect);
  }

  function enhanceMslDrawerSelects(drawerEl) {
    if (!drawerEl) return;
    drawerEl.querySelectorAll('select.msl-inp').forEach(buildMslCustomSelect);
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
  }

  // STAMBoardList Controller 가 row .is-active / checkbox .is-selected / delete count(삭제 (N)) /
  // header 전체선택·indeterminate / Escape 의 .is-active 해제를 일괄 담당.
  // 본 화면은 onRowActivate 만 상세 drawer open 으로 연결한다.
  var listRoot = document.querySelector('[data-stam-board-list]');
  var boardApi = null;
  if (listRoot && window.STAMBoardList) {
    boardApi = window.STAMBoardList.init(listRoot, {
      deleteBtn: '#msl-del-btn',
      onRowActivate: function () { openDrawer('detail'); },
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
