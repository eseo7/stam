/* ─────────────────────────────────────────────
   STAM Common Board List Controller v1
   PR #92 — 공통 목록 테이블 인터랙션 통합

   사용:
     <table class="stam-select-table" data-stam-board-list> ... </table>
     STAMBoardList.init(tableEl, {
       onRowActivate(row, api) { ... },     // row click 후
       onClearActive(row, api) { ... },     // Escape / 다른 row 클릭으로 해제
       onSelectionChange(rows, api) { ... },// checkbox 토글 후
       onDelete(rows, api) { ... },         // 삭제 버튼 클릭 (선택>=1 일 때만)
       clearActiveOnCheckbox: false,        // checkbox 클릭 시 active 해제 여부
     });

   API:
     STAMBoardList.init(root, options)
     STAMBoardList.getSelectedRows(root)
     STAMBoardList.clearActive(root)
     STAMBoardList.clearSelected(root)
     STAMBoardList.refresh(root)

   계약:
     - row click → .is-active (drawer 대상)
     - checkbox  → .is-selected (bulk action 대상)
     - .stam-delete-btn: 0 → disabled "삭제", N → enabled "삭제 (N)"
     - Escape → .is-active 해제 (.is-selected 유지)
     - 실제 삭제/저장 로직은 본 파일에서 수행하지 않음
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SEL = {
    table: '.stam-select-table',
    row: '.stam-table-row',
    check: '.stam-check',
    checkAll: '[data-stam-check-all]',
    deleteBtn: '.stam-delete-btn',
    deleteLabel: '.stam-delete-label',
  };

  var INTERACTIVE = 'input, button, a, select, textarea, label, .stam-check-cell';

  var REGISTRY = new WeakMap();

  function $all(root, sel) { return Array.from(root.querySelectorAll(sel)); }

  function getRowCheckboxes(root) {
    return $all(root, SEL.row + ' ' + SEL.check);
  }

  function getRows(root) {
    return $all(root, SEL.row);
  }

  function getSelectedRows(root) {
    return getRows(root).filter(function (r) { return r.classList.contains('is-selected'); });
  }

  function getActiveRow(root) {
    return root.querySelector(SEL.row + '.is-active');
  }

  function clearActive(root) {
    var ctx = REGISTRY.get(root);
    var prev = getActiveRow(root);
    if (prev) {
      prev.classList.remove('is-active');
      if (ctx && typeof ctx.opts.onClearActive === 'function') {
        ctx.opts.onClearActive(prev, makeApi(root));
      }
    }
  }

  function clearSelected(root) {
    getRows(root).forEach(function (r) {
      r.classList.remove('is-selected');
      var cb = r.querySelector(SEL.check);
      if (cb) cb.checked = false;
    });
    updateDelete(root);
    syncHeader(root);
  }

  function setRowSelected(row, on) {
    row.classList.toggle('is-selected', !!on);
    var cb = row.querySelector(SEL.check);
    if (cb) cb.checked = !!on;
  }

  function updateDelete(root) {
    var ctx = REGISTRY.get(root);
    if (!ctx) return;
    var n = getSelectedRows(root).length;
    var btn = ctx.deleteBtn;
    if (btn) {
      btn.disabled = n === 0;
      var lbl = btn.querySelector(SEL.deleteLabel);
      if (lbl) lbl.textContent = n > 0 ? '삭제 (' + n + ')' : '삭제';
    }
    if (typeof ctx.opts.onSelectionChange === 'function') {
      ctx.opts.onSelectionChange(getSelectedRows(root), makeApi(root));
    }
  }

  function syncHeader(root) {
    var ctx = REGISTRY.get(root);
    if (!ctx || !ctx.headerCheck) return;
    var cbs = getRowCheckboxes(root);
    if (!cbs.length) {
      ctx.headerCheck.checked = false;
      ctx.headerCheck.indeterminate = false;
      return;
    }
    var checked = cbs.filter(function (c) { return c.checked; }).length;
    ctx.headerCheck.checked = checked > 0 && checked === cbs.length;
    ctx.headerCheck.indeterminate = checked > 0 && checked < cbs.length;
  }

  function activate(root, row) {
    var ctx = REGISTRY.get(root);
    var prev = getActiveRow(root);
    if (prev && prev !== row) {
      prev.classList.remove('is-active');
      if (ctx && typeof ctx.opts.onClearActive === 'function') {
        ctx.opts.onClearActive(prev, makeApi(root));
      }
    }
    row.classList.add('is-active');
    if (ctx && typeof ctx.opts.onRowActivate === 'function') {
      ctx.opts.onRowActivate(row, makeApi(root));
    }
  }

  function makeApi(root) {
    return {
      root: root,
      getSelectedRows: function () { return getSelectedRows(root); },
      getActiveRow: function () { return getActiveRow(root); },
      clearActive: function () { clearActive(root); },
      clearSelected: function () { clearSelected(root); },
      refresh: function () { refresh(root); },
    };
  }

  function onRowClick(root, e) {
    var row = e.target.closest(SEL.row);
    if (!row || !root.contains(row)) return;
    if (e.target.closest(INTERACTIVE)) return;
    activate(root, row);
  }

  function onCheckboxChange(root, e) {
    var cb = e.target.closest(SEL.check);
    if (!cb) return;

    var ctx = REGISTRY.get(root);
    if (ctx && ctx.headerCheck === cb) {
      var on = cb.checked;
      getRows(root).forEach(function (r) { setRowSelected(r, on); });
      cb.indeterminate = false;
    } else {
      var row = cb.closest(SEL.row);
      if (!row) return;
      row.classList.toggle('is-selected', cb.checked);
    }

    if (ctx && ctx.opts.clearActiveOnCheckbox) clearActive(root);
    updateDelete(root);
    syncHeader(root);
  }

  function onCheckboxClick(e) {
    // Prevent checkbox click from triggering row click handler.
    e.stopPropagation();
  }

  function onKeyDown(root, e) {
    if (e.key !== 'Escape') return;
    clearActive(root);
  }

  function onDeleteClick(root, e) {
    var ctx = REGISTRY.get(root);
    if (!ctx || !ctx.deleteBtn) return;
    if (ctx.deleteBtn.disabled) return;
    var selected = getSelectedRows(root);
    if (typeof ctx.opts.onDelete === 'function') {
      ctx.opts.onDelete(selected, makeApi(root));
    }
  }

  function refresh(root) {
    updateDelete(root);
    syncHeader(root);
  }

  function init(root, options) {
    if (!root) return null;
    if (REGISTRY.has(root)) return makeApi(root);

    var opts = options || {};
    var headerCheck = root.querySelector(SEL.checkAll);
    var scope = opts.toolbarRoot || (root.closest('[data-stam-board-list-scope]') || root.parentNode || document);
    function findBtn(sel) {
      return (sel && (scope.querySelector(sel) || document.querySelector(sel))) || null;
    }
    var deleteBtn = findBtn(opts.deleteBtn) || scope.querySelector(SEL.deleteBtn);

    var ctx = { opts: opts, headerCheck: headerCheck, deleteBtn: deleteBtn };
    REGISTRY.set(root, ctx);

    root.addEventListener('click', function (e) {
      if (e.target.closest(SEL.check)) return;
      onRowClick(root, e);
    });
    root.addEventListener('change', function (e) { onCheckboxChange(root, e); });
    root.addEventListener('click', function (e) {
      if (e.target.closest(SEL.check)) onCheckboxClick(e);
    }, true);

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function (e) { onDeleteClick(root, e); });
    }
    document.addEventListener('keydown', function (e) { onKeyDown(root, e); });

    refresh(root);
    return makeApi(root);
  }

  global.STAMBoardList = {
    init: init,
    getSelectedRows: getSelectedRows,
    clearActive: clearActive,
    clearSelected: clearSelected,
    refresh: refresh,
  };
}(typeof window !== 'undefined' ? window : this));
