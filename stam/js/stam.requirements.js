(function () {
  'use strict';

  // ── Drawer state ──────────────────────────────────────────────
  const scrim = document.getElementById('rq-scrim');

  function openDrawer(type) {
    closeAll(false);
    const el = document.getElementById('rq-dw-' + type);
    if (!el) return;
    scrim.classList.add('show');
    el.classList.add('open');
  }

  function closeAll(resetState) {
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.rq-drawer').forEach(function (d) {
      d.classList.remove('open');
    });
    if (resetState !== false) {
      document.querySelectorAll('#rq-tbody .rq-data-row.sel').forEach(function (r) {
        r.classList.remove('sel');
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
        rows.forEach(function (r) { r.classList.remove('sel'); });
        row.classList.add('sel');
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
        if (row) row.classList.toggle('sel', cb.checked);
        updateDelBtn();
      });
    });

    if (allCb) {
      allCb.addEventListener('change', function () {
        document.querySelectorAll('#rq-tbody .rq-cb').forEach(function (cb) {
          cb.checked = allCb.checked;
          var row = cb.closest('.rq-data-row');
          if (row) row.classList.toggle('sel', cb.checked);
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

  // ── ESC key ───────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
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
  bindRows();
  bindCheckboxes();

}());
