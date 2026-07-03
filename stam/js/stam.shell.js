/* ============================================================
 * STAM Shell — Left Navigation 렌더링 + Root Cards + Menu Table
 * 의존: stam.nav-data.js (window.STAM.data), stam.theme.js (window.STAM.theme)
 * v2 — accordion + group/menu badges | 2026-06-07
 * ============================================================ */
(function () {
  'use strict';

  /* ─── 그룹 아이콘 (12×12 inline SVG) ─── */
  var gIcons = {
    /* Dashboard — 2×2 grid */
    A: '<svg class="gicon" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="currentColor" opacity=".75"/><rect x="6.5" y="1" width="4.5" height="4.5" rx="1" fill="currentColor" opacity=".75"/><rect x="1" y="6.5" width="4.5" height="4.5" rx="1" fill="currentColor" opacity=".50"/><rect x="6.5" y="6.5" width="4.5" height="4.5" rx="1" fill="currentColor" opacity=".50"/></svg>',
    /* Document */
    B: '<svg class="gicon" viewBox="0 0 12 12" fill="none"><path d="M2.5 1.5h5L10 4v7H2.5V1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.5 1.5V4H10" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 6.5h3M4.5 8.5h2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>',
    /* Checkbox */
    C: '<svg class="gicon" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3.5 6l2 2 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    /* Chat bubble */
    D: '<svg class="gicon" viewBox="0 0 12 12" fill="none"><path d="M1.5 2h9v6H7.5L6 10 4.5 8H1.5V2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    /* Upload / export */
    E: '<svg class="gicon" viewBox="0 0 12 12" fill="none"><path d="M6 8V2.5M3.5 5L6 2.5 8.5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 10h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    /* Gear / settings */
    F: '<svg class="gicon" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.8" stroke="currentColor" stroke-width="1.2"/><path d="M6 1.5V3M6 9V10.5M1.5 6H3M9 6H10.5M3.05 3.05L4.1 4.1M7.9 7.9L8.95 8.95M3.05 8.95L4.1 7.9M7.9 4.1L8.95 3.05" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    /* Person */
    G: '<svg class="gicon" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 11c0-2.485 2.015-4.5 4.5-4.5S10.5 8.515 10.5 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  };

  /* ─── chevron SVG — 기본 ∧ (펼침), .closed 시 rotate(180deg) → ∨ ─── */
  var chevronSvg = '<svg class="glabel-chevron-svg" viewBox="0 0 10 10" fill="none"><path d="M2.5 6.5l2.5-3 2.5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ─── 1차 베타 메뉴 상태 (Live / Preview / Planned / Admin / Hidden) ─── */
  var LIVE_MENU_IDS = { A1: 1, B1: 1, B2: 1, B3: 1, B4: 1 };
  var PREVIEW_MENU_IDS = { B5: 1, B8: 1, B9: 1, B10: 1, C8: 1, E7: 1 };
  var ADMIN_MENU_IDS = { F3: 1, F4: 1, F11: 1 };
  var HIDDEN_MENU_IDS = { B6: 1, B7: 1 };

  function menuStatusFor(id, badge) {
    if (LIVE_MENU_IDS[id]) return 'live';
    if (PREVIEW_MENU_IDS[id]) return 'preview';
    if (ADMIN_MENU_IDS[id]) return 'admin';
    if (HIDDEN_MENU_IDS[id] || (badge && badge.type === 'hidden')) return 'hidden';
    return 'planned';
  }

  function menuStatusClass(status) {
    if (status === 'live') return 'is-live';
    if (status === 'preview') return 'is-preview';
    if (status === 'admin') return 'is-admin-only';
    if (status === 'hidden') return 'is-hidden';
    return 'is-planned';
  }

  /* ─── 메뉴별 badge 데이터 (정적 preview) ─── */
  var menuBadges = {
    /* A — 대시보드 */
    A1: { type: 'live',    text: 'Live'    },
    A2: { type: 'plan',    text: '계획됨'  },
    A3: { type: 'plan',    text: '계획됨'  },
    A4: { type: 'plan',    text: '계획됨'  },
    A5: { type: 'plan',    text: '계획됨'  },
    A6: { type: 'plan',    text: '계획됨'  },
    /* B — 산출물 관리 */
    B1:  { type: 'count',   text: '64'         },
    B2:  { type: 'count',   text: '10'         },
    B3:  { type: 'count',   text: '42'         },
    B4:  { type: 'count',   text: '61'         },
    B5:  { type: 'preview', text: 'Preview'    },
    B6:  { type: 'hidden',  text: '고객숨김'   },
    B7:  { type: 'hidden',  text: '고객숨김'   },
    B8:  { type: 'preview', text: 'Preview'    },
    B9:  { type: 'preview', text: 'Preview'    },
    B10: { type: 'preview', text: 'Preview'    },
    B11: { type: 'plan',    text: '계획됨'     },
    B12: { type: 'plan',    text: '계획됨'     },
    /* C — 테스트/품질 */
    C1: { type: 'plan',    text: '계획됨'  },
    C2: { type: 'plan',    text: '계획됨'  },
    C3: { type: 'plan',    text: '계획됨'  },
    C4: { type: 'plan',    text: '계획됨'  },
    C5: { type: 'plan',    text: '계획됨'  },
    C6: { type: 'plan',    text: '계획됨'  },
    C7: { type: 'plan',    text: '계획됨'  },
    C8: { type: 'preview', text: 'Preview' },
    /* D — 협업/검토/승인 */
    D1: { type: 'plan', text: '계획됨' },
    D2: { type: 'plan', text: '계획됨' },
    D3: { type: 'plan', text: '계획됨' },
    D4: { type: 'plan', text: '계획됨' },
    D5: { type: 'plan', text: '계획됨' },
    D6: { type: 'plan', text: '계획됨' },
    D7: { type: 'plan', text: '계획됨' },
    D8: { type: 'plan', text: '계획됨' },
    /* E — 내보내기/납품 */
    E1: { type: 'plan',    text: '계획됨'  },
    E2: { type: 'plan',    text: '계획됨'  },
    E3: { type: 'plan',    text: '계획됨'  },
    E4: { type: 'plan',    text: '계획됨'  },
    E5: { type: 'plan',    text: '계획됨'  },
    E6: { type: 'plan',    text: '계획됨'  },
    E7: { type: 'preview', text: 'Preview' },
    /* F — 관리/설정 */
    F1:  { type: 'plan',    text: '계획됨'     },
    F2:  { type: 'plan',    text: '계획됨'     },
    F3:  { type: 'admin',   text: 'Admin Only' },
    F4:  { type: 'admin',   text: 'Admin Only' },
    F5:  { type: 'plan',    text: '계획됨'     },
    F6:  { type: 'plan',    text: '계획됨'     },
    F7:  { type: 'plan',    text: '계획됨'     },
    F8:  { type: 'plan',    text: '계획됨'     },
    F9:  { type: 'plan',    text: '계획됨'     },
    F10: { type: 'plan',    text: '계획됨'     },
    F11: { type: 'admin',   text: 'Admin Only' },
    /* G — 마이페이지 */
    G1: { type: 'plan', text: '계획됨' },
    G2: { type: 'plan', text: '계획됨' },
    G3: { type: 'plan', text: '계획됨' },
    G4: { type: 'plan', text: '계획됨' },
    G5: { type: 'plan', text: '계획됨' },
    G6: { type: 'plan', text: '계획됨' },
  };

  /* ─── 기본 펼침 그룹 (레퍼런스 기준: A, B, F + active 그룹) ─── */
  var defaultOpen = { A: true, B: true, F: true };

  /* ============================================================
   * Left Navigation 렌더링
   * ============================================================ */
  function renderSidebar(el, activeId) {
    if (!el) return;
    activeId = activeId || 'A1';
    var menus  = window.STAM.data.menus;
    var groups = window.STAM.data.groups;

    /* active 그룹 판별 */
    var activeGroupId = 'A';
    for (var i = 0; i < menus.length; i++) {
      if (menus[i].id === activeId) { activeGroupId = menus[i].g; break; }
    }

    /* 그룹별 메뉴 묶기 */
    var grouped = {};
    groups.forEach(function (g) { grouped[g.id] = []; });
    menus.forEach(function (m) { if (grouped[m.g]) grouped[m.g].push(m); });

    groups.forEach(function (gr) {
      var isActiveGrp = gr.id === activeGroupId;
      var isOpen      = isActiveGrp || !!defaultOpen[gr.id];

      /* ── 섹션 컨테이너 ── */
      var sec = document.createElement('div');
      sec.className = 'gsec' + (isOpen ? '' : ' closed');
      sec.setAttribute('data-group',        gr.id);
      sec.setAttribute('data-default-open', isOpen ? '1' : '0');
      sec.setAttribute('data-total',        String(gr.count));

      /* ── 그룹 헤더 ── */
      var lbl = document.createElement('div');
      lbl.className = 'glabel' + (isActiveGrp ? ' glabel-active' : '');
      lbl.setAttribute('role', 'button');
      lbl.setAttribute('tabindex', '0');
      lbl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      var adminTag = (gr.id === 'F')
        ? '<span class="glabel-admin-tag">Admin</span>'
        : '';

      lbl.innerHTML =
        (gIcons[gr.id] || '') +
        '<span class="glabel-name">' + gr.name + '</span>' +
        adminTag +
        '<span class="glabel-cnt' + (isActiveGrp ? ' on' : '') + '">' + gr.count + '</span>' +
        chevronSvg;

      /* ── 그룹 바디 (collapsible) ── */
      var body = document.createElement('div');
      body.className = 'gsec-body';

      grouped[gr.id].forEach(function (m) {
        var badge    = menuBadges[m.id];
        var isActive = m.id === activeId;
        var status   = menuStatusFor(m.id, badge);
        var statusCls = menuStatusClass(status);

        var item = document.createElement('div');
        item.className = 'gitem ' + statusCls + (isActive ? ' on' : '');
        item.setAttribute('data-id',     m.id);
        item.setAttribute('data-group',  gr.id);
        item.setAttribute('data-gname',  gr.name);
        item.setAttribute('data-badge',  badge ? badge.text : '');
        item.setAttribute('data-status', status);
        item.setAttribute('data-desc',   m.s || '');
        item.setAttribute('data-name',   m.n);

        var badgeHtml = badge
          ? '<span class="mnav-badge nb-' + badge.type + '">' + badge.text + '</span>'
          : '';

        item.innerHTML =
          '<span class="gitem-dot"></span>' +
          '<span class="gitem-name">' + m.n + '</span>' +
          badgeHtml;

        body.appendChild(item);
      });

      sec.appendChild(lbl);
      sec.appendChild(body);
      el.appendChild(sec);

      /* ── 클릭 / 키보드 토글 ── */
      function toggle() {
        var nowClosed = sec.classList.toggle('closed');
        lbl.setAttribute('aria-expanded', nowClosed ? 'false' : 'true');
      }
      lbl.addEventListener('click', toggle);
      lbl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ============================================================
   * 서비스 루트 카드 렌더링 (변경 없음)
   * ============================================================ */
  function renderRootCards(el) {
    if (!el) return;
    window.STAM.data.rootMenusFull.forEach(function (m, i) {
      var card = document.createElement('div');
      card.className = 'root-card';
      card.innerHTML =
        '<div class="root-card-num">서비스 루트 ' + (i + 1) + '</div>' +
        '<div class="root-card-name">' + m.n + '</div>' +
        '<div class="root-card-screen">' + m.s + '</div>' +
        '<div class="root-card-cols">' +
          m.cols.map(function (c) { return '<span class="col-chip">' + c + '</span>'; }).join('') +
        '</div>';
      el.appendChild(card);
    });
  }

  /* ============================================================
   * 메뉴 전체 테이블 tbody 렌더링 (변경 없음)
   * ============================================================ */
  function renderMenuTable(tbody) {
    if (!tbody) return;
    var menus  = window.STAM.data.menus;
    var groups = window.STAM.data.groups;
    var curG   = null;

    menus.forEach(function (m) {
      if (m.g !== curG) {
        curG = m.g;
        var gr = groups.filter(function (g) { return g.id === m.g; })[0];
        var hr = document.createElement('tr');
        hr.className = 'group-header';
        hr.innerHTML =
          '<td colspan="7" style="padding-left:12px">' +
            '<span class="group-badge g-' + m.g + '" style="margin-right:8px">' + m.g + '</span>' +
            gr.name + ' · ' + gr.count + '개' +
          '</td>';
        tbody.appendChild(hr);
      }
      var colArr = m.colStr.split(',');
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span class="id-code">' + m.id + '</span></td>' +
        '<td><span class="group-badge g-' + m.g + '-soft">' + m.g + '</span></td>' +
        '<td style="font-weight:600;color:var(--t1)">' + m.n + '</td>' +
        '<td>' + m.s + '</td>' +
        '<td style="font-size:11.5px;color:var(--t3)">' + m.colStr + '</td>' +
        '<td class="col-count">' + colArr.length + '</td>' +
        '<td>' + (m.phase === 1
          ? '<span class="phase-p1">Phase 1</span>'
          : '<span class="phase-later">Later</span>') + '</td>';
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
   * Left Navigation 메뉴 검색
   * inputEl: #po-nav-search  |  navEl: #po-sidebar-nav
   * ============================================================ */
  function initSearch(inputEl, navEl) {
    if (!inputEl || !navEl) return;

    var clearBtn = inputEl.parentElement
      ? inputEl.parentElement.querySelector('.po-search-clear')
      : null;

    /* 빈 결과 상태 (동적 생성) */
    var emptyEl = document.createElement('div');
    emptyEl.className = 'po-nav-empty';
    emptyEl.innerHTML =
      '<span class="po-nav-empty-title">검색 결과가 없습니다</span>' +
      '<span class="po-nav-empty-sub">다른 메뉴명이나 코드로 검색해보세요</span>';
    navEl.appendChild(emptyEl);

    if (clearBtn) clearBtn.style.display = 'none';

    var savedState = null; /* { groupId: isOpen } */

    function captureState() {
      var snap = {};
      navEl.querySelectorAll('.gsec[data-group]').forEach(function (sec) {
        snap[sec.getAttribute('data-group')] = !sec.classList.contains('closed');
      });
      return snap;
    }

    function restoreState(snap) {
      navEl.querySelectorAll('.gsec[data-group]').forEach(function (sec) {
        var grp  = sec.getAttribute('data-group');
        var open = snap ? snap[grp] : sec.getAttribute('data-default-open') === '1';
        var lbl  = sec.querySelector('.glabel');
        if (open) {
          sec.classList.remove('closed');
          if (lbl) lbl.setAttribute('aria-expanded', 'true');
        } else {
          sec.classList.add('closed');
          if (lbl) lbl.setAttribute('aria-expanded', 'false');
        }
      });
    }

    function escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function highlightItem(item, q) {
      var nameEl = item.querySelector('.gitem-name');
      if (!nameEl) return;
      var orig = item.getAttribute('data-name') || nameEl.textContent;
      if (!q) { nameEl.textContent = orig; return; }
      var lower = orig.toLowerCase();
      var idx   = lower.indexOf(q);
      if (idx >= 0) {
        nameEl.innerHTML =
          escHtml(orig.slice(0, idx)) +
          '<mark class="nav-highlight">' + escHtml(orig.slice(idx, idx + q.length)) + '</mark>' +
          escHtml(orig.slice(idx + q.length));
      } else {
        nameEl.textContent = orig;
      }
    }

    function applyFilter(q) {
      q = q.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
      if (!q) { restoreDefault(); return; }
      if (savedState === null) savedState = captureState();

      var totalMatch = 0;

      navEl.querySelectorAll('.gsec[data-group]').forEach(function (sec) {
        var items      = sec.querySelectorAll('.gitem[data-id]');
        var groupMatch = 0;
        var total      = sec.getAttribute('data-total') || items.length;

        items.forEach(function (item) {
          var name  = (item.getAttribute('data-name')  || '').toLowerCase();
          var id    = (item.getAttribute('data-id')    || '').toLowerCase();
          var gname = (item.getAttribute('data-gname') || '').toLowerCase();
          var badge = (item.getAttribute('data-badge') || '').toLowerCase();
          var desc  = (item.getAttribute('data-desc')  || '').toLowerCase();

          var match = name.indexOf(q)  >= 0 ||
                      id.indexOf(q)    >= 0 ||
                      gname.indexOf(q) >= 0 ||
                      badge.indexOf(q) >= 0 ||
                      desc.indexOf(q)  >= 0;

          item.style.display = match ? '' : 'none';
          if (match) { highlightItem(item, q); groupMatch++; }
          else        { highlightItem(item, ''); }
        });

        var lbl = sec.querySelector('.glabel');
        if (groupMatch > 0) {
          sec.style.display = '';
          sec.classList.remove('closed');
          if (lbl) lbl.setAttribute('aria-expanded', 'true');
          var cntEl = sec.querySelector('.glabel-cnt');
          if (cntEl) cntEl.textContent = groupMatch + '/' + total;
        } else {
          sec.style.display = 'none';
        }
        totalMatch += groupMatch;
      });

      emptyEl.style.display = totalMatch === 0 ? 'flex' : 'none';
    }

    function restoreDefault() {
      navEl.querySelectorAll('.gitem[data-id]').forEach(function (item) {
        item.style.display = '';
        highlightItem(item, '');
      });
      navEl.querySelectorAll('.gsec[data-group]').forEach(function (sec) {
        sec.style.display = '';
        var total = sec.getAttribute('data-total');
        var cntEl = sec.querySelector('.glabel-cnt');
        if (cntEl && total) cntEl.textContent = total;
      });
      restoreState(savedState);
      savedState = null;
      emptyEl.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'none';
    }

    inputEl.addEventListener('input', function () { applyFilter(inputEl.value); });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { inputEl.value = ''; applyFilter(''); inputEl.blur(); }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        inputEl.value = ''; applyFilter(''); inputEl.focus();
      });
    }

    /* ⌘K / Ctrl+K — 검색창 포커스 */
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); inputEl.focus(); inputEl.select();
      }
    });
  }

  /* 전역 theme 복원 — Shell 진입 시 저장값 재적용 (stam.theme.js 선행 로드 전제) */
  if (window.STAM && typeof window.STAM.initTheme === 'function') {
    window.STAM.initTheme();
  }

  window.STAM = window.STAM || {};
  window.STAM.shell = {
    renderSidebar:    renderSidebar,
    renderRootCards:  renderRootCards,
    renderMenuTable:  renderMenuTable,
    initSearch:       initSearch,
  };
}());
