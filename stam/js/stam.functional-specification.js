(function () {
  'use strict';

  // ── Drawer state ──────────────────────────────────────────────
  var scrim = document.getElementById('fn-scrim');

  function openDrawer(type) {
    closeAll(false);
    var el = document.getElementById('fn-dw-' + type);
    if (!el) return;
    if (scrim) scrim.classList.add('show');
    el.classList.add('open');
  }

  function closeAll(resetState) {
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.fn-drawer').forEach(function (d) {
      d.classList.remove('open');
    });
    if (resetState !== false) {
      document.querySelectorAll('#fn-tbody .fn-data-row.is-selected').forEach(function (r) {
        r.classList.remove('is-selected');
        var cb = r.querySelector('.fn-cb');
        if (cb) cb.checked = false;
      });
    }
  }

  // ── Row click → detail drawer ────────────────────────────────
  function bindRows() {
    var rows = document.querySelectorAll('#fn-tbody .fn-data-row');
    rows.forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('fn-cb')) return;
        rows.forEach(function (r) { r.classList.remove('is-selected'); });
        row.classList.add('is-selected');
        openDrawer('detail');
      });
    });
  }

  // ── Checkbox: select row, update delete button ────────────────
  function bindCheckboxes() {
    var delBtn = document.getElementById('fn-del-btn');
    var allCb  = document.getElementById('fn-cb-all');

    document.querySelectorAll('#fn-tbody .fn-cb').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var row = cb.closest('.fn-data-row');
        if (row) { row.classList.toggle('is-selected', cb.checked); }
        updateDelBtn();
      });
    });

    if (allCb) {
      allCb.addEventListener('change', function () {
        document.querySelectorAll('#fn-tbody .fn-cb').forEach(function (cb) {
          cb.checked = allCb.checked;
          var row = cb.closest('.fn-data-row');
          if (row) { row.classList.toggle('is-selected', cb.checked); }
        });
        updateDelBtn();
      });
    }

    function updateDelBtn() {
      if (!delBtn) return;
      var n = document.querySelectorAll('#fn-tbody .fn-cb:checked').length;
      delBtn.disabled = n === 0;
      delBtn.querySelector('.fn-del-lbl').textContent = n > 0 ? '삭제 (' + n + ')' : '삭제';
    }
  }

  // ── detail drawer → 수정 button ─────────────────────────────
  document.querySelectorAll('[data-fn-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      openDrawer(el.getAttribute('data-fn-open'));
    });
  });

  // ── Close buttons ─────────────────────────────────────────────
  document.querySelectorAll('.fn-dw-close, [data-fn-close]').forEach(function (el) {
    el.addEventListener('click', function () { closeAll(); });
  });

  // ── Scrim click → close ───────────────────────────────────────
  if (scrim) {
    scrim.addEventListener('click', function () { closeAll(); });
  }

  // ── ESC key → close ──────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
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
  bindRows();
  bindCheckboxes();

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
