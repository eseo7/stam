/* ============================================================================
 * STAM Screen Specification Firestore List
 * ----------------------------------------------------------------------------
 * Read-only list binding for screen-specification.html (live mode).
 * Source: STAM.screenSpecService.listByProject(projectId, query, context)
 * Existing approved list integration path; no direct Firestore path construction.
 * Register wiring: stam.screen-specification-crud.js
 * ========================================================================== */
(function () {
  'use strict';

  var STORAGE_PROJECT_ID = 'stam:selectedProjectId';
  var STORAGE_PROJECT_NAME = 'stam:selectedProjectName';
  var DEFAULT_QUERY = { includeDeleted: false };
  var ROUTES = {
    login: '/pages/auth/login.html',
    projects: '/pages/auth/projects.html',
    accessDenied: '/pages/auth/access-denied.html',
  };

  var state = {
    projectId: '',
    project: null,
    member: null,
    user: null,
    items: [],
    filteredItems: [],
  };

  var loadSeq = 0;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function isLiveMode() {
    return !!document.querySelector('[data-stam-screen-spec-live="true"]');
  }

  function esc(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function queryParam(name) {
    try {
      return clean(new URLSearchParams(window.location.search).get(name));
    } catch (err) {
      return '';
    }
  }

  function storedProjectId() {
    try {
      return clean(sessionStorage.getItem(STORAGE_PROJECT_ID));
    } catch (err) {
      return '';
    }
  }

  function resolveProjectId() {
    return queryParam('projectId') || storedProjectId();
  }

  function currentUser() {
    if (!window.firebase || !window.firebase.auth) return null;
    try {
      return window.firebase.auth().currentUser || null;
    } catch (err) {
      return null;
    }
  }

  function firestore() {
    if (!window.firebase || !window.firebase.firestore) return null;
    try {
      return window.firebase.firestore();
    } catch (err) {
      return null;
    }
  }

  function redirect(path) {
    window.location.replace(path);
  }

  function authReady() {
    if (!window.firebase || !window.firebase.auth) return Promise.resolve(null);
    try {
      var auth = window.firebase.auth();
      if (auth.currentUser) return Promise.resolve(auth.currentUser);
      return new Promise(function (resolve) {
        var unsubscribe = auth.onAuthStateChanged(function (user) {
          if (unsubscribe) unsubscribe();
          resolve(user || null);
        });
      });
    } catch (err) {
      return Promise.resolve(null);
    }
  }

  function verifyProjectAccess(db, user, projectId) {
    var memberRef = db.collection('projects').doc(projectId).collection('members').doc(user.uid);
    var projectRef = db.collection('projects').doc(projectId);
    return memberRef.get().then(function (memberSnap) {
      if (!memberSnap.exists) return { ok: false, reason: 'no-member' };
      var member = memberSnap.data() || {};
      if (member.status !== 'active') return { ok: false, reason: 'inactive' };
      return projectRef.get().then(function (projectSnap) {
        if (!projectSnap.exists) return { ok: false, reason: 'no-project' };
        return {
          ok: true,
          project: projectSnap.data() || {},
          member: member,
        };
      });
    });
  }

  function roleLabel(role) {
    var value = clean(role);
    if (!value) return 'Member';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function statusLabel(status) {
    var value = clean(status).toLowerCase();
    if (value === 'archived') return '보관';
    return value || '진행중';
  }

  function updatedLabel(value) {
    if (!value) return '';
    if (typeof value.toDate === 'function') {
      try {
        return '업데이트 ' + value.toDate().toLocaleString('ko-KR');
      } catch (err) {
        return '';
      }
    }
    return '업데이트 ' + String(value);
  }

  function applyProjectContext(projectId, project, member) {
    var name = clean(project.name || project.projectName) || projectId;
    var client = clean(project.client || project.clientName) || 'STAM';
    var stage = clean(project.stage || project.description) || name;
    var status = statusLabel(project.status);
    var role = roleLabel(member.role);
    var updated = updatedLabel(project.updatedAt);

    try {
      sessionStorage.setItem(STORAGE_PROJECT_ID, projectId);
      sessionStorage.setItem(STORAGE_PROJECT_NAME, name);
    } catch (err) { /* ignore */ }

    var ctx = document.querySelector('[data-stam-project-context]');
    if (ctx) {
      ctx.setAttribute('data-pc-title', name);
      ctx.setAttribute('data-pc-client', client);
      ctx.setAttribute('data-pc-stage', stage);
      ctx.setAttribute('data-pc-status', status);
      ctx.setAttribute('data-pc-role', role);
      if (updated) ctx.setAttribute('data-pc-updated', updated);
    }

    var topbar = document.querySelector('[data-stam-topbar]');
    if (topbar) {
      topbar.setAttribute('data-tb-crumbs', '내 프로젝트|' + name + '|화면설계서');
      topbar.setAttribute('data-tb-client', client);
    }

    var leftNav = document.querySelector('[data-stam-left-nav]');
    if (leftNav) {
      leftNav.setAttribute('data-project-title', name);
      leftNav.setAttribute('data-project-stage', stage);
      leftNav.setAttribute('data-project-status', status);
      leftNav.setAttribute('data-project-role', role);
    }

    window.STAM = window.STAM || {};
    window.STAM.currentProjectContext = {
      title: name,
      stage: stage,
      status: status,
      role: role,
    };

    document.title = '화면설계서 — ' + name + ' — STAM';
    if (window.STAM.projectContextRender && typeof window.STAM.projectContextRender.init === 'function') {
      window.STAM.projectContextRender.init();
    }
    if (window.STAM.topbarRender && typeof window.STAM.topbarRender.init === 'function') {
      window.STAM.topbarRender.init();
    }
    if (window.STAM.navRender && typeof window.STAM.navRender.init === 'function') {
      window.STAM.navRender.init('B4');
    }
  }

  function guardProjectAccess(projectId) {
    if (!projectId) {
      redirect(ROUTES.projects);
      return Promise.resolve(null);
    }
    var db = firestore();
    if (!db) {
      renderError();
      return Promise.resolve(null);
    }
    return authReady().then(function (user) {
      if (!user) {
        redirect(ROUTES.login);
        return null;
      }
      return verifyProjectAccess(db, user, projectId).then(function (result) {
        if (!result.ok) {
          if (result.reason === 'no-member' || result.reason === 'inactive') {
            redirect(ROUTES.accessDenied);
          } else {
            redirect(ROUTES.projects);
          }
          return null;
        }
        state.projectId = projectId;
        state.project = result.project;
        state.member = result.member;
        state.user = user;
        applyProjectContext(projectId, result.project, result.member);
        return {
          projectId: projectId,
          user: user,
          project: result.project,
          member: result.member,
        };
      });
    });
  }

  function service() {
    return window.STAM && window.STAM.screenSpecService;
  }

  function serviceContract() {
    return window.STAM && window.STAM.screenSpecServiceContract;
  }

  function bindAuthorizedService(memberRole) {
    var contract = serviceContract();
    if (!contract || typeof contract.createService !== 'function') return;
    if (typeof contract.createMemberRoleAuthorize !== 'function') return;
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    window.STAM.screenSpecService = contract.createService({ authorize: authorize });
  }

  function serviceContext(source) {
    return {
      actorUid: state.user && state.user.uid,
      actorName: state.user && (state.user.displayName || state.user.email),
      memberRole: state.member && state.member.role,
      projectId: state.projectId,
      source: source || 'screen-spec-firestore',
    };
  }

  function uiFeedback() {
    return window.STAM && window.STAM.uiFeedback;
  }

  function uiMessages() {
    return window.STAM && window.STAM.uiMessages;
  }

  function dpart(value) {
    if (!value) return '';
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate().toISOString().replace('T', ' ').slice(0, 10);
      } catch (err) {
        return '';
      }
    }
    return String(value).replace('T', ' ').slice(0, 10);
  }

  function writeStatusInfo(item) {
    var wst = clean(item.writeStatus);
    if (wst === 'complete') return { key: 'complete', lbl: '작성완료', cls: 'ss-chip-ws-c' };
    return { key: 'writing', lbl: '작성중', cls: 'ss-chip-ws-w' };
  }

  function reviewStatusInfo(item) {
    var rst = clean(item.reviewStatus);
    if (rst === 'pending') return { key: 'pending', lbl: '검토 대기', cls: 'ss-chip-rs-p' };
    if (rst === 'done') return { key: 'done', lbl: '검토 완료', cls: 'ss-chip-rs-d' };
    return { key: 'none', lbl: '미요청', cls: 'ss-chip-rs-n' };
  }

  function approvalStatusInfo(item) {
    var ast = clean(item.approvalStatus);
    if (ast === 'approved') return { key: 'approved', lbl: '승인 완료', cls: 'ss-chip-as-a' };
    if (ast === 'rejected') return { key: 'rejected', lbl: '반려됨', cls: 'ss-chip-as-r' };
    return { key: 'none', lbl: '미승인', cls: 'ss-chip-as-n' };
  }

  function screenTypeLabel(item) {
    var map = {
      list: '목록 화면',
      detail: '상세 화면',
      form: '폼 화면',
      popup: '팝업',
      admin: '관리 화면',
      main: '메인/대시보드',
      result: '결과 화면',
      other: '기타',
    };
    var key = clean(item.screenType);
    return map[key] || key || '기타';
  }

  function formatScreenCode(item) {
    return clean(item.code) || clean(item.id) || '—';
  }

  function ownerText(item) {
    return clean(item.ownerName) || '미지정';
  }

  function getTimestampMs(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value === 'string') {
      var parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  function sortItemsForDisplay(list) {
    return (list || []).slice().sort(function (a, b) {
      var aMs = getTimestampMs(a.updatedAt || a.createdAt);
      var bMs = getTimestampMs(b.updatedAt || b.createdAt);
      if (aMs !== bMs) return bMs - aMs;
      var aCode = formatScreenCode(a);
      var bCode = formatScreenCode(b);
      if (aCode !== bCode) return bCode.localeCompare(aCode);
      return clean(b.id).localeCompare(clean(a.id));
    });
  }

  function readLiveFilters() {
    var srchEl = document.getElementById('ss-srch');
    var srch = srchEl ? clean(srchEl.value).toLowerCase() : '';
    var F = { wst: '', rst: '', ast: '', type: '', img: '' };
    if (window.STAM && window.STAM.ssLiveFilters) {
      F = Object.assign(F, window.STAM.ssLiveFilters);
    }
    return { srch: srch, F: F };
  }

  function applyClientFilters(items) {
    var filters = readLiveFilters();
    var q = filters.srch;
    var F = filters.F;
    return (items || []).filter(function (item) {
      if (F.wst && writeStatusInfo(item).key !== F.wst) return false;
      if (F.rst && reviewStatusInfo(item).key !== F.rst) return false;
      if (F.ast && approvalStatusInfo(item).key !== F.ast) return false;
      if (F.type && clean(item.screenType) !== F.type) return false;
      if (F.img === 'has' && !(item.imageCount > 0)) return false;
      if (F.img === 'no' && item.imageCount > 0) return false;
      if (F.img === 'ann' && !(item.annotationCount > 0)) return false;
      if (!q) return true;
      var hay = (
        formatScreenCode(item) + ' ' +
        clean(item.title) + ' ' +
        clean(item.menuPath)
      ).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function applyStripQuery(items) {
    var q = window.STAM && window.STAM.ssLiveQuery ? clean(window.STAM.ssLiveQuery) : 'all';
    if (q === 'writing') {
      return items.filter(function (item) { return writeStatusInfo(item).key === 'writing'; });
    }
    if (q === 'pending') {
      return items.filter(function (item) { return reviewStatusInfo(item).key === 'pending'; });
    }
    if (q === 'approved') {
      return items.filter(function (item) { return approvalStatusInfo(item).key === 'approved'; });
    }
    return items;
  }

  function chipHtml(cls, lbl) {
    return '<span class="ss-chip ' + cls + '">' + esc(lbl) + '</span>';
  }

  function imgChip(count) {
    var n = Number(count) || 0;
    if (n > 0) {
      return '<span class="ss-img-chip has">이미지 ' + n + '</span>';
    }
    return '<span class="ss-img-chip no">없음</span>';
  }

  function annChip(count) {
    var n = Number(count) || 0;
    if (n > 0) {
      return '<span class="ss-img-chip has ss-img-chip-ann">주석 ' + n + '</span>';
    }
    return '';
  }

  function rowHtml(item) {
    var wst = writeStatusInfo(item);
    var rst = reviewStatusInfo(item);
    var ast = approvalStatusInfo(item);
    var code = formatScreenCode(item);
    var title = clean(item.title) || '(화면명 없음)';
    var owner = ownerText(item);
    var updated = dpart(item.updatedAt || item.createdAt) || '—';
    var ver = item.version ? ('v' + item.version) : 'v1';

    return '<tr class="ss-sc-row stam-table-row ssv2-int-row" data-ss-firestore-id="' + esc(item.id) + '">' +
      '<td class="ss-ch stam-check-cell"><input type="checkbox" class="ss-cb stam-check" data-ss-sel="' + esc(item.id) + '"></td>' +
      '<td class="ss-name-col"><div class="ss-sc-cell">' +
        '<span class="ss-sc-ind">└</span>' +
        '<span class="ss-sc-id">' + esc(code) + '</span>' +
        '<span class="ss-sc-name">' + esc(title) + '</span>' +
        '<span class="ss-type-chip ss-type-chip-sm">' + esc(screenTypeLabel(item)) + '</span>' +
      '</div></td>' +
      '<td><span class="ss-vp">' + esc(ver) + '</span></td>' +
      '<td>' + chipHtml(wst.cls, wst.lbl) + '</td>' +
      '<td>' + chipHtml(rst.cls, rst.lbl) + '</td>' +
      '<td>' + chipHtml(ast.cls, ast.lbl) + '</td>' +
      '<td><div class="ss-img-chips">' + imgChip(item.imageCount) + annChip(item.annotationCount) + '</div></td>' +
      '<td>' + esc(updated) + '</td>' +
      '<td><div class="ss-rec-actions">' +
        '<button type="button" class="ss-rec-act-btn" data-ss-firestore-detail="' + esc(item.id) + '">상세</button>' +
        '<button type="button" class="ss-rec-act-btn ss-rec-act-edit" disabled title="수정 Firestore 연결은 후속 PR">수정</button>' +
      '</div></td>' +
    '</tr>';
  }

  function tableColspan() {
    return 9;
  }

  function emptyStateRow(title, desc) {
    var feedback = uiFeedback();
    if (!feedback || typeof feedback.tableEmptyRow !== 'function') return '';
    return feedback.tableEmptyRow({
      colspan: tableColspan(),
      title: title,
      description: desc,
      icon: 'layout',
    });
  }

  function statusMessageRow(title, desc, variant) {
    var feedback = uiFeedback();
    if (!feedback || typeof feedback.tableMessageRow !== 'function') return '';
    return feedback.tableMessageRow({
      colspan: tableColspan(),
      title: title,
      description: desc,
      variant: variant,
    });
  }

  function renderFeedbackRow(html) {
    var tbody = document.getElementById('ss-tbody');
    if (tbody) tbody.innerHTML = html;
    setSummary([]);
    updateFooter(0, 0);
  }

  function renderLoading() {
    var messages = uiMessages();
    var common = messages && messages.common;
    renderFeedbackRow(statusMessageRow(
      (common && common.loading && common.loading.title) || '목록을 불러오는 중…',
      (common && common.loading && common.loading.description) || '',
      'loading'
    ));
  }

  function renderError() {
    var messages = uiMessages();
    var common = messages && messages.common;
    renderFeedbackRow(statusMessageRow(
      (common && common.networkError && common.networkError.title) || '목록을 불러오지 못했습니다',
      (common && common.networkError && common.networkError.description) || '',
      'error'
    ));
  }

  function updateFooter(shown, total) {
    var tfoot = document.getElementById('ss-tfoot-info');
    if (!tfoot) return;
    if (shown === total) {
      tfoot.innerHTML = '전체 ' + total + '건';
    } else {
      tfoot.innerHTML = '필터 적용 · <b>' + shown + '</b>건';
    }
  }

  function setSummary(items) {
    var all = state.items || [];
    var t = all.length;
    var w = all.filter(function (item) { return writeStatusInfo(item).key === 'writing'; }).length;
    var p = all.filter(function (item) { return reviewStatusInfo(item).key === 'pending'; }).length;
    var a = all.filter(function (item) { return approvalStatusInfo(item).key === 'approved'; }).length;
    var q = window.STAM && window.STAM.ssLiveQuery ? clean(window.STAM.ssLiveQuery) : 'all';

    var cells = [
      { id: 'all', lbl: '전체', v: t, tone: '', sub: '전체 화면설계서' },
      { id: 'writing', lbl: '작성중', v: w, tone: 'is-slate', sub: '작성 진행 중' },
      { id: 'pending', lbl: '검토 대기', v: p, tone: 'is-warn', sub: '검토자 배정 대기' },
      { id: 'approved', lbl: '승인 완료', v: a, tone: 'is-pass', sub: '승인 확정' },
    ];

    var el = document.getElementById('ss-sstrip');
    if (el) {
      el.innerHTML = cells.map(function (c) {
        var toneClass = c.tone ? (' ' + c.tone) : '';
        return '<div class="ss-sstrip-cell' + (q === c.id ? ' on' : '') + '" data-ss-q="' + c.id + '">' +
          '<div class="ss-sstrip-lbl">' + (c.tone ? '<span class="ss-sstrip-dot stam-summary-dot' + toneClass + '"></span>' : '') + c.lbl + '</div>' +
          '<div class="ss-sstrip-num stam-summary-num' + toneClass + '">' + c.v + '<span class="ss-sstrip-sub"> 건</span></div>' +
          '<div class="ss-sstrip-sub">' + c.sub + '</div></div>';
      }).join('');
    }

    var meta = document.getElementById('ss-sstrip-meta');
    if (meta) meta.textContent = 'Firestore 화면 ' + t + '개';
  }

  function renderRows(list) {
    var tbody = document.getElementById('ss-tbody');
    if (!tbody) return;
    var total = state.items.length;
    if (!list.length) {
      var hasFilter = total > 0;
      var html = hasFilter
        ? emptyStateRow('조건에 맞는 화면설계서가 없습니다.', '검색어나 필터를 줄이거나 초기화하고 다시 확인하세요.')
        : emptyStateRow('아직 작성된 화면설계서가 없습니다.', '직접 등록으로 화면설계서를 추가하세요.');
      tbody.innerHTML = html;
      updateFooter(0, total);
      return;
    }

    var head = '<tr class="ss-gr-row ssv2-grp">' +
      '<td class="ss-ch stam-check-cell"></td>' +
      '<td colspan="8"><div class="ss-gr-cell">' +
      '<span class="ss-gr-name">등록된 화면설계서</span>' +
      '<span class="ss-gr-sep"></span>' +
      '<span class="ss-gr-count">' + list.length + '개 화면</span>' +
      '</div></td></tr>';

    tbody.innerHTML = head + list.map(rowHtml).join('');
    updateFooter(list.length, total);
  }

  function countFilteredItems(filterValues, stripQuery) {
    var F = filterValues || { wst: '', rst: '', ast: '', type: '', img: '' };
    var q = clean(stripQuery) || 'all';
    var base = applyStripQuery(state.items);
    return base.filter(function (item) {
      if (F.wst && writeStatusInfo(item).key !== F.wst) return false;
      if (F.rst && reviewStatusInfo(item).key !== F.rst) return false;
      if (F.ast && approvalStatusInfo(item).key !== F.ast) return false;
      if (F.type && clean(item.screenType) !== F.type) return false;
      if (F.img === 'has' && !(item.imageCount > 0)) return false;
      if (F.img === 'no' && item.imageCount > 0) return false;
      if (F.img === 'ann' && !(item.annotationCount > 0)) return false;
      return true;
    }).length;
  }

  function render() {
    if (!isLiveMode()) return;
    var stripFiltered = applyStripQuery(state.items);
    var filtered = applyClientFilters(stripFiltered);
    state.filteredItems = filtered;
    renderRows(filtered);
    setSummary(state.items);
    refreshCrudAccessUI();
  }

  function renderStrip() {
    setSummary(state.items);
  }

  function refreshCrudAccessUI() {
    var crud = window.STAM && window.STAM.screenSpecFirestoreCrud;
    if (crud && typeof crud.applyWriteAccessUI === 'function') {
      crud.applyWriteAccessUI();
    }
  }

  function load() {
    if (!isLiveMode()) return Promise.resolve([]);
    var projectId = resolveProjectId();
    var seq = ++loadSeq;
    renderLoading();

    return guardProjectAccess(projectId).then(function (guard) {
      if (!guard) return [];
      bindAuthorizedService(guard.member && guard.member.role);
      var svc = service();
      if (!svc || typeof svc.listByProject !== 'function') {
        renderError();
        return [];
      }
      return svc.listByProject(projectId, DEFAULT_QUERY, serviceContext('screen-spec-firestore-list'));
    }).then(function (items) {
      if (seq !== loadSeq) return state.items;
      state.items = sortItemsForDisplay((items || []).filter(function (item) {
        return item && item.isDeleted !== true;
      }));
      render();
      return state.items;
    }).catch(function (err) {
      console.error('[screen-spec-firestore-list] load failed', err);
      state.items = [];
      renderError();
      refreshCrudAccessUI();
      return [];
    });
  }

  function bindRowEvents() {
    var tbody = document.getElementById('ss-tbody');
    if (!tbody || tbody.getAttribute('data-ss-firestore-rows-bound') === '1') return;
    tbody.setAttribute('data-ss-firestore-rows-bound', '1');
    tbody.addEventListener('click', function (e) {
      var detailBtn = e.target.closest('[data-ss-firestore-detail]');
      if (detailBtn) {
        e.stopPropagation();
        alert('화면설계서 상세 Firestore 연결은 후속 PR 범위입니다.');
      }
    });
  }

  function hookRerender() {
    window.STAM = window.STAM || {};
    window.STAM.ssLiveFilters = window.STAM.ssLiveFilters || { wst: '', rst: '', ast: '', type: '', img: '' };
    window.STAM.ssLiveQuery = window.STAM.ssLiveQuery || 'all';
    window.STAM.ssRerender = function () {
      render();
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.screenSpecFirestoreList = {
    load: load,
    render: render,
    renderStrip: renderStrip,
    guardProjectAccess: guardProjectAccess,
    applyProjectContext: applyProjectContext,
    resolveProjectId: resolveProjectId,
    serviceContext: serviceContext,
    bindAuthorizedService: bindAuthorizedService,
    getState: function () {
      return {
        projectId: state.projectId,
        project: state.project,
        member: state.member,
        user: state.user,
        items: state.items,
        filteredItems: state.filteredItems,
      };
    },
    findById: function (id) {
      var sid = clean(id);
      return (state.items || []).find(function (item) { return clean(item.id) === sid; }) || null;
    },
    countFilteredItems: countFilteredItems,
  };

  ready(function () {
    if (!isLiveMode()) return;
    hookRerender();
    bindRowEvents();
    load();
  });
}());
