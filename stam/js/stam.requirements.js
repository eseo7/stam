(function () {
  'use strict';

  // ── Custom select ─────────────────────────────────────────────
  var rqCsUid = 0;
  var RQ_CHECK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function buildRqCustomSelect(native) {
    if (native.getAttribute('data-rq-cs') === '1') return;
    native.setAttribute('data-rq-cs', '1');
    var uid = 'rqcs-' + (++rqCsUid);
    var activeIdx = -1;

    var wrap = document.createElement('div');
    wrap.className = 'rq-cs';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'rq-cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', uid + '-list');

    var valSpan = document.createElement('span');
    valSpan.className = 'rq-cs-val';

    var caret = document.createElement('span');
    caret.className = 'rq-cs-caret';
    caret.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(valSpan);
    trigger.appendChild(caret);

    var panel = document.createElement('div');
    panel.className = 'rq-cs-panel';
    panel.id = uid + '-list';
    panel.setAttribute('role', 'listbox');

    Array.prototype.forEach.call(native.options, function (o, i) {
      var od = document.createElement('div');
      od.className = 'rq-cs-opt';
      od.id = uid + '-opt-' + i;
      od.setAttribute('role', 'option');
      od.setAttribute('data-idx', i);
      od.setAttribute('aria-selected', 'false');
      if (o.value === '') od.classList.add('is-placeholder');
      var ck = document.createElement('span');
      ck.className = 'rq-cs-check';
      ck.setAttribute('aria-hidden', 'true');
      ck.innerHTML = RQ_CHECK_SVG;
      var tx = document.createElement('span');
      tx.className = 'rq-cs-otext';
      tx.textContent = o.textContent;
      od.appendChild(ck);
      od.appendChild(tx);
      panel.appendChild(od);
    });

    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    native.classList.add('rq-cs-native');

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
      var container = wrap.closest('.rq-dw-body');
      if (!container) return;
      var ph = panel.offsetHeight || 200;
      var tRect = trigger.getBoundingClientRect();
      var cRect = container.getBoundingClientRect();
      var below = cRect.bottom - tRect.bottom;
      var above = tRect.top - cRect.top;
      if (below < ph + 8 && above > below) wrap.classList.add('cs-up');
    }

    function openPanel() {
      closeAllRqCustomSelects();
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
      closeRqCustomSelect(wrap);
      trigger.focus();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains('open')) closeRqCustomSelect(wrap);
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
          if (isOpen) closeRqCustomSelect(wrap);
          break;
      }
    });

    panel.addEventListener('mousemove', function (e) {
      var od = e.target.closest('.rq-cs-opt');
      if (od) setActive(parseInt(od.getAttribute('data-idx'), 10));
    });

    panel.addEventListener('click', function (e) {
      var od = e.target.closest('.rq-cs-opt');
      if (!od) return;
      e.stopPropagation();
      selectIdx(parseInt(od.getAttribute('data-idx'), 10));
    });
  }

  function closeRqCustomSelect(wrap) {
    wrap.classList.remove('open');
    wrap.classList.remove('cs-up');
    var t = wrap.querySelector('.rq-cs-trigger');
    if (t) { t.setAttribute('aria-expanded', 'false'); t.removeAttribute('aria-activedescendant'); }
  }

  function closeAllRqCustomSelects() {
    document.querySelectorAll('.rq-cs.open').forEach(closeRqCustomSelect);
  }

  function enhanceRqDrawerSelects(drawerEl) {
    if (!drawerEl) return;
    drawerEl.querySelectorAll('select.rq-inp').forEach(buildRqCustomSelect);
  }

  // ── Drawer state ──────────────────────────────────────────────
  const scrim = document.getElementById('rq-scrim');

  function openDrawer(type) {
    closeAll(false);
    const el = document.getElementById('rq-dw-' + type);
    if (!el) return;
    scrim.classList.add('show');
    el.classList.add('open');
    enhanceRqDrawerSelects(el);
  }

  function closeAll(resetState) {
    closeAllRqCustomSelects();
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.rq-drawer').forEach(function (d) {
      d.classList.remove('open');
    });
    if (resetState !== false) {
      document.querySelectorAll('#rq-tbody .rq-data-row.sel').forEach(function (r) {
        r.classList.remove('sel');
        r.classList.remove('is-selected');
        var cb = r.querySelector('.rq-cb');
        if (cb) cb.checked = false;
      });
    }
  }

  // ── Row click → detail drawer ────────────────────────────────
  function bindRows() {
    var rows = document.querySelectorAll('#rq-tbody .rq-data-row');
    rows.forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('rq-cb')) return;
        rows.forEach(function (r) { r.classList.remove('sel'); r.classList.remove('is-selected'); });
        row.classList.add('sel');
        row.classList.add('is-selected');
        openDrawer('detail');
      });
    });
  }

  // ── Checkbox: select row, update delete button ────────────────
  function bindCheckboxes() {
    var delBtn = document.getElementById('rq-del-btn');
    var allCb  = document.getElementById('rq-cb-all');

    document.querySelectorAll('#rq-tbody .rq-cb').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var row = cb.closest('.rq-data-row');
        if (row) { row.classList.toggle('sel', cb.checked); row.classList.toggle('is-selected', cb.checked); }
        updateDelBtn();
      });
    });

    if (allCb) {
      allCb.addEventListener('change', function () {
        document.querySelectorAll('#rq-tbody .rq-cb').forEach(function (cb) {
          cb.checked = allCb.checked;
          var row = cb.closest('.rq-data-row');
          if (row) { row.classList.toggle('sel', cb.checked); row.classList.toggle('is-selected', cb.checked); }
        });
        updateDelBtn();
      });
    }

    function updateDelBtn() {
      if (!delBtn) return;
      var n = document.querySelectorAll('#rq-tbody .rq-cb:checked').length;
      delBtn.disabled = n === 0;
      delBtn.querySelector('.rq-del-lbl').textContent = n > 0 ? '삭제 (' + n + ')' : '삭제';
    }
  }

  // ── Detail drawer → 수정 button ─────────────────────────────
  document.querySelectorAll('[data-rq-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      openDrawer(el.getAttribute('data-rq-open'));
    });
  });

  // ── Close buttons ─────────────────────────────────────────────
  document.querySelectorAll('.rq-dw-close, [data-rq-close]').forEach(function (el) {
    el.addEventListener('click', function () { closeAll(); });
  });

  // ── Scrim click → close ───────────────────────────────────────
  if (scrim) {
    scrim.addEventListener('click', function () { closeAll(); });
  }

  // ── ESC key (custom select 우선, 없으면 drawer 닫기) ──────────
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.rq-cs.open')) {
      e.preventDefault();
      e.stopPropagation();
      closeAllRqCustomSelects();
    } else {
      closeAll();
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
  bindRows();
  bindCheckboxes();

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
