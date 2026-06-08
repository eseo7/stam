/* ============================================================
 * STAM Preview UI — 보드 맵 카드 + 진척도 바 렌더링
 * 의존: stam.nav-data.js (window.STAM.data)
 * ============================================================ */
(function () {
  'use strict';

  /* 칸반 카드 생성 — phase 정보 포함 */
  function makeCard(m, isRoot) {
    var idBadge = isRoot
      ? '<span class="kcard-root">' + m.id + '</span>'
      : '<span class="kcard-id">'   + m.id + '</span>';
    var groupBadge = isRoot
      ? '<span class="group-badge g-G">R</span>'
      : '<span class="group-badge g-' + m.g + '">' + m.g + '</span>';
    var isP1 = m.phase === 1;
    var dotHtml = '<span class="s-dot ' + (isP1 ? 'brand' : 'todo') + '"></span>';
    var listPill = isP1 ? '<span class="list-first-pill">목록</span>' : '';
    var div = document.createElement('div');
    div.className = 'kcard';
    div.innerHTML =
      '<div class="kcard-top">' +
        idBadge + groupBadge +
        '<span class="kcard-name">' + m.n + '</span>' +
        dotHtml +
      '</div>' +
      '<div class="kcard-screen">' + m.s + '</div>' +
      '<div class="kcard-meta">' + listPill + '<span class="kcard-cols">' + m.cols + ' col</span></div>';
    return div;
  }

  /* Board Map 렌더링 */
  function renderBoardMap(opts) {
    var rootItems = window.STAM.data.rootItems;
    var menus     = window.STAM.data.menus;
    var p1Col     = document.getElementById(opts.p1ColId);
    var p2Col     = document.getElementById(opts.p2ColId);
    var p1CountEl = document.getElementById(opts.p1CountId);
    var p2CountEl = document.getElementById(opts.p2CountId);

    /* Phase 1 — 3개 tier로 분류 */
    var tiers = [
      { tier: 1, label: '1차 — 핵심 진입 흐름', items: [] },
      { tier: 2, label: '2차 — 주요 산출물',     items: [] },
      { tier: 3, label: '3차 — 보조 메뉴',       items: [] },
    ];

    rootItems.filter(function (m) { return m.phase === 1; }).forEach(function (m) {
      var t = tiers.filter(function (t) { return t.tier === m.tier; })[0];
      if (t) t.items.push({ id:m.id, type:m.type, n:m.n, s:m.s, cols:m.cols, isRoot:true, g:m.g, phase:m.phase });
    });
    menus.filter(function (m) { return m.phase === 1; }).forEach(function (m) {
      var t = tiers.filter(function (t) { return t.tier === m.tier; })[0];
      if (t) t.items.push({ id:m.id, g:m.g, n:m.n, s:m.s, cols:m.cols, isRoot:false, phase:m.phase });
    });

    tiers.forEach(function (t) {
      if (!t.items.length) return;
      var sec = document.createElement('div');
      sec.className = 'sub-section';
      sec.innerHTML = '<div class="sub-label">' + t.label + ' (' + t.items.length + '개)</div>';
      var cards = document.createElement('div');
      cards.className = 'sub-cards';
      t.items.forEach(function (m) { cards.appendChild(makeCard(m, m.isRoot)); });
      sec.appendChild(cards);
      p1Col.appendChild(sec);
    });

    /* Later Phase */
    var later = rootItems.filter(function (m) { return m.phase === 2; })
      .concat(menus.filter(function (m) { return m.phase === 2; }));
    later.forEach(function (m) {
      p2Col.appendChild(makeCard(
        { id:m.id, g:m.g, n:m.n, s:m.s, cols:m.cols, phase: m.phase || 2 },
        m.type === 'root'
      ));
    });

    /* 카운트 업데이트 */
    var p1c = rootItems.filter(function (m) { return m.phase === 1; }).length
            + menus.filter(function (m) { return m.phase === 1; }).length;
    var p2c = rootItems.filter(function (m) { return m.phase === 2; }).length
            + menus.filter(function (m) { return m.phase === 2; }).length;
    if (p1CountEl) p1CountEl.textContent = p1c + '개';
    if (p2CountEl) p2CountEl.textContent = p2c + '개';
  }

  /* 그룹별 진척도 바 렌더링 */
  function renderProgressBars(containerId) {
    var groupData = [
      { id: '루트', name: '서비스 루트',    total:  6, p1:  6, color: 'var(--g-g)' },
      { id: 'A',    name: '대시보드',       total:  6, p1:  3, color: 'var(--g-a)' },
      { id: 'B',    name: '산출물 관리',    total: 12, p1: 12, color: 'var(--g-b)' },
      { id: 'C',    name: '테스트/품질',    total:  8, p1:  5, color: 'var(--g-c)' },
      { id: 'D',    name: '협업/검토/승인', total:  8, p1:  5, color: 'var(--g-d)' },
      { id: 'E',    name: '내보내기/납품',  total:  7, p1:  1, color: 'var(--g-e)' },
      { id: 'F',    name: '관리/설정',      total: 11, p1:  5, color: 'var(--g-f)' },
      { id: 'G',    name: '마이페이지',     total:  6, p1:  4, color: 'var(--g-g)' },
    ];
    var pg = document.getElementById(containerId);
    if (!pg) return;
    groupData.forEach(function (g) {
      var pct = Math.round((g.p1 / g.total) * 100);
      var div = document.createElement('div');
      div.className = 'progress-item';
      div.innerHTML =
        '<div class="progress-top">' +
          '<span class="progress-label">' + g.name + ' (' + g.id + ')</span>' +
          '<span class="progress-pct" style="color:' + g.color + '">' + pct + '%</span>' +
        '</div>' +
        '<div class="progress-bar-bg">' +
          '<div class="progress-bar-fill" style="width:' + pct + '%;background:' + g.color + '"></div>' +
        '</div>' +
        '<div class="progress-detail">Phase 1 목록 화면 ' + g.p1 + '개 / 전체 ' + g.total + '개</div>';
      pg.appendChild(div);
    });
  }

  window.STAM = window.STAM || {};
  window.STAM.ui = {
    renderBoardMap:    renderBoardMap,
    renderProgressBars: renderProgressBars,
  };
}());
