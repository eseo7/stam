/* ============================================================================
 * STAM Requirements Firestore List
 * ----------------------------------------------------------------------------
 * Read-only list binding for requirements.html.
 * Source contract:
 *   STAM.requirementsService.listByProject(projectId, query, context)
 *
 * No Firestore path construction, no create/update/delete/softDelete calls.
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
    currentItem: null,
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
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
      topbar.setAttribute('data-tb-crumbs', '내 프로젝트|' + name + '|요구사항정의서');
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

    document.title = '요구사항정의서 — ' + name + ' — STAM';
    if (window.STAM.projectContextRender && typeof window.STAM.projectContextRender.init === 'function') {
      window.STAM.projectContextRender.init();
    }
    if (window.STAM.topbarRender && typeof window.STAM.topbarRender.init === 'function') {
      window.STAM.topbarRender.init();
    }
    if (window.STAM.navRender && typeof window.STAM.navRender.init === 'function') {
      window.STAM.navRender.init('B1');
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
    return window.STAM && window.STAM.requirementsService;
  }

  function serviceContract() {
    return window.STAM && window.STAM.requirementsServiceContract;
  }

  function bindAuthorizedService(memberRole) {
    var contract = serviceContract();
    if (!contract || typeof contract.createService !== 'function') return;
    if (typeof contract.createMemberRoleAuthorize !== 'function') return;
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    window.STAM.requirementsService = contract.createService({ authorize: authorize });
  }

  function serviceContext(source) {
    return {
      actorUid: state.user && state.user.uid,
      actorName: state.user && (state.user.displayName || state.user.email),
      memberRole: state.member && state.member.role,
      projectId: state.projectId,
      source: source || 'requirements-firestore',
    };
  }

  function tbody() {
    return document.getElementById('rq-tbody');
  }

  function listRoot() {
    return document.querySelector('[data-stam-board-list]');
  }

  function refreshBoardList() {
    var root = listRoot();
    if (root && window.STAMBoardList && typeof window.STAMBoardList.refresh === 'function') {
      window.STAMBoardList.refresh(root);
    }
  }

  function refreshCrudAccessUI() {
    var crud = window.STAM && window.STAM.requirementsFirestoreCrud;
    if (crud && typeof crud.applyWriteAccessUI === 'function') {
      crud.applyWriteAccessUI();
    }
  }

  function dpart(value) {
    return String(value || '').replace('T', ' ').slice(0, 10);
  }

  function valueOf(item, keys, fallback) {
    for (var i = 0; i < keys.length; i++) {
      var value = item[keys[i]];
      if (value != null && clean(value) !== '') return value;
    }
    return fallback;
  }

  function statusInfo(item) {
    var status = clean(item.status).toLowerCase();
    var reviewStatus = clean(item.reviewStatus).toLowerCase();
    if (status === 'approved') return { label: '승인완료', cls: 'rq-chip-approved' };
    if (status === 'archived') return { label: '보관', cls: 'rq-chip-hold' };
    if (status === 'review') {
      return reviewStatus === 'approved'
        ? { label: '검토완료', cls: 'rq-chip-done' }
        : { label: '검토요청', cls: 'rq-chip-review' };
    }
    if (status === 'active') return { label: '진행중', cls: 'rq-chip-review' };
    return { label: '작성중', cls: 'rq-chip-draft' };
  }

  function priorityInfo(item) {
    var priority = clean(item.priority).toLowerCase();
    if (priority === 'critical' || priority === 'high') return { label: '높음', cls: 'rq-chip-high' };
    if (priority === 'low') return { label: '낮음', cls: 'rq-chip-low' };
    return { label: '보통', cls: 'rq-chip-mid' };
  }

  function ownerText(item) {
    return clean(valueOf(item, ['ownerName', 'ownerUid', 'createdBy'], '미지정')) || '미지정';
  }

  function typeText(item) {
    return clean(valueOf(item, ['requirementType', 'type', 'category'], '기능')) || '기능';
  }

  function formatRequirementCode(item) {
    if (item && clean(item.code)) return clean(item.code);
    return '-';
  }

  function getTimestampMs(value) {
    var api = window.STAMBoardList;
    if (api && typeof api.getTimestampMs === 'function') return api.getTimestampMs(value);
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value === 'string') {
      var parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  function sortRequirementsByLatest(list) {
    var api = window.STAMBoardList;
    if (api && typeof api.sortByBoardRegistration === 'function') {
      return api.sortByBoardRegistration(list);
    }
    return (list || []).slice();
  }

  function linkChip(value) {
    var text = clean(value);
    if (!text) return '<span class="rq-link-chip-none">미연결</span>';
    return '<span class="rq-link-chip">' + esc(text) + '</span>';
  }

  function rowHtml(item) {
    var status = statusInfo(item);
    var priority = priorityInfo(item);
    var owner = ownerText(item);
    var initial = esc(owner.charAt(0) || '?');
    var code = formatRequirementCode(item);
    var title = clean(item.title) || '(제목 없음)';
    var screen = valueOf(item, ['linkedScreenSpec', 'screenSpecCode', 'screenSpecId'], '');
    var wbs = valueOf(item, ['linkedWbs', 'wbsCode', 'wbsItemId'], '');
    var updated = dpart(item.updatedAt || item.createdAt) || '—';

    return '<tr class="rq-data-row stam-table-row" data-rq-id="' + esc(item.id) + '">' +
      '<td class="rq-ch stam-check-cell"><input type="checkbox" class="rq-cb stam-check"></td>' +
      '<td><div class="rq-req-id-cell"><span class="rq-req-id">' + esc(code) + '</span>' +
      '<span class="rq-req-name">' + esc(title) + '</span></div></td>' +
      '<td><span class="rq-chip rq-chip-type">' + esc(typeText(item)) + '</span></td>' +
      '<td><span class="rq-chip ' + priority.cls + '">' + esc(priority.label) + '</span></td>' +
      '<td><span class="rq-chip ' + status.cls + '">' + esc(status.label) + '</span></td>' +
      '<td><div><span class="rq-ava">' + initial + '</span>' +
      '<span>' + esc(owner) + '</span></div></td>' +
      '<td>' + linkChip(screen) + '</td>' +
      '<td>' + linkChip(wbs) + '</td>' +
      '<td>' + esc(updated) + '</td>' +
      '</tr>';
  }

  function detailValue(item, keys, fallback) {
    return esc(valueOf(item || {}, keys, fallback || '—'));
  }

  function setText(selector, text) {
    var el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function setHtml(selector, html) {
    var el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  function detailConfig(item) {
    var status = statusInfo(item);
    var priority = priorityInfo(item);
    return {
      sections: [
        {
          title: '기본 정보',
          fields: [
            { label: '요구사항 ID', value: esc(formatRequirementCode(item)) },
            { label: '배경', value: detailValue(item, ['background'], '—'), full: true },
            { label: '요구사항명', value: detailValue(item, ['title']) },
            { label: '유형', value: detailValue(item, ['requirementType', 'type', 'category'], '기능') },
            { label: '우선순위', value: priority.label },
            { label: '상태', value: status.label },
            { label: '담당자', value: ownerText(item) },
            { label: '최종 수정일', value: detailValue(item, ['updatedAt', 'createdAt']) },
          ],
        },
        {
          title: '요구 내용',
          fields: [
            { label: '설명', value: detailValue(item, ['description'], '—'), full: true },
          ],
        },
      ],
    };
  }

  function renderDetail(item) {
    state.currentItem = item || null;
    var status = statusInfo(item);
    var priority = priorityInfo(item);
    var code = formatRequirementCode(item);
    var title = clean(item.title) || '(제목 없음)';
    setText('#rq-dw-detail .rq-req-badge', code);
    setText('#rq-dw-detail .rq-dw-htitle', title);
    setHtml('#rq-dw-detail .rq-dw-hmeta',
      '<span class="rq-chip rq-chip-type">' + esc(typeText(item)) + '</span>' +
      '<span class="rq-chip ' + priority.cls + '">' + esc(priority.label) + '</span>' +
      '<span class="rq-chip ' + status.cls + '">' + esc(status.label) + '</span>');
    setText('#rq-dw-edit .rq-req-badge', code);
    setText('#rq-dw-edit .rq-dw-htitle', title);
    setHtml('#rq-dw-edit .rq-dw-hmeta',
      '<span class="rq-chip rq-chip-type">' + esc(typeText(item)) + '</span>' +
      '<span class="rq-chip ' + priority.cls + '">' + esc(priority.label) + '</span>');

    var info = document.getElementById('rq-tab-info');
    if (info && window.STAM && window.STAM.detailDrawer && typeof window.STAM.detailDrawer.mount === 'function') {
      window.STAM.detailDrawer.mount(info, detailConfig(item));
    } else if (info) {
      info.innerHTML = '<div><strong>' + esc(code) + '</strong><br>' + esc(title) + '</div>';
    }

    setHtml('#rq-tab-link',
      '<div>' +
      '<div>연결 화면설계서: ' + linkChip(valueOf(item, ['linkedScreenSpec', 'screenSpecCode', 'screenSpecId'], '')) + '</div>' +
      '<div>연결 WBS: ' + linkChip(valueOf(item, ['linkedWbs', 'wbsCode', 'wbsItemId'], '')) + '</div>' +
      '</div>');
    setHtml('#rq-tab-review', '<div>검토 상태: ' + esc(item.reviewStatus || '—') + '</div>');
    setHtml('#rq-tab-history', '<div>변경 이력은 후속 ChangeLog PR에서 연결합니다.</div>');
  }

  function openDetailFromRow(row) {
    var id = row && clean(row.getAttribute('data-rq-id'));
    var svc = service();
    if (!id || !state.projectId || !svc || typeof svc.getById !== 'function') return Promise.resolve(null);
    var context = serviceContext('requirements-firestore-detail');
    return svc.getById(state.projectId, id, context).then(function (item) {
      if (item) renderDetail(item);
      return item;
    }).catch(function () {
      return null;
    });
  }

  function uiFeedback() {
    return window.STAM && window.STAM.uiFeedback;
  }

  function uiMessages() {
    return window.STAM && window.STAM.uiMessages;
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
      icon: 'clipboard-check',
    });
  }

  function statusMessageRow(title, desc, modifier) {
    var feedback = uiFeedback();
    if (!feedback || typeof feedback.tableMessageRow !== 'function') return '';
    return feedback.tableMessageRow({
      colspan: tableColspan(),
      title: title,
      description: desc,
      variant: modifier,
    });
  }

  function renderFeedbackRow(html) {
    var body = tbody();
    if (!body || !html) return;
    body.innerHTML = html;
    var feedback = uiFeedback();
    if (feedback && typeof feedback.hydrateIcons === 'function') {
      feedback.hydrateIcons(body);
    }
  }

  function renderRows(items) {
    var body = tbody();
    if (!body) return;
    var messages = uiMessages() && uiMessages().requirements;
    if (!items.length) {
      renderFeedbackRow(emptyStateRow(
        messages && messages.emptyTitle || '등록된 요구사항이 없습니다',
        messages && messages.emptyDesc || ''
      ));
      refreshBoardList();
      return;
    }
    body.innerHTML = items.map(rowHtml).join('');
    refreshBoardList();
  }

  function setSummary(items) {
    var total = items.length;
    var nums = document.querySelectorAll('.rq-ss-num');
    if (nums[0]) nums[0].textContent = total;
    if (nums[1]) nums[1].textContent = items.filter(function (item) { return item.status === 'draft'; }).length;
    if (nums[2]) nums[2].textContent = items.filter(function (item) { return item.status === 'review'; }).length;
    if (nums[3]) nums[3].textContent = items.filter(function (item) { return item.status === 'approved'; }).length;
    if (nums[4]) nums[4].textContent = items.filter(function (item) { return item.status === 'archived'; }).length;
    if (nums[5]) nums[5].textContent = items.filter(function (item) {
      return !!clean(valueOf(item, ['linkedScreenSpec', 'screenSpecCode', 'screenSpecId'], ''));
    }).length;
    if (nums[6]) nums[6].textContent = items.filter(function (item) {
      return !!clean(valueOf(item, ['linkedWbs', 'wbsCode', 'wbsItemId'], ''));
    }).length;

    var highPriority = document.querySelectorAll('.rq-ss-meta-val')[0];
    var unlinked = document.querySelectorAll('.rq-ss-meta-val')[1];
    var recent = document.querySelectorAll('.rq-ss-meta-val')[2];
    if (highPriority) {
      highPriority.textContent = items.filter(function (item) {
        return item.priority === 'high' || item.priority === 'critical';
      }).length + '건';
    }
    if (unlinked) {
      unlinked.textContent = items.filter(function (item) {
        return !clean(valueOf(item, ['linkedScreenSpec', 'screenSpecCode', 'screenSpecId'], '')) &&
          !clean(valueOf(item, ['linkedWbs', 'wbsCode', 'wbsItemId'], ''));
      }).length + '건';
    }
    if (recent) recent.textContent = '—';

    var count = document.querySelector('.stam-board-count');
    if (count) count.innerHTML = '총 <b>' + total + '</b>건 중 <b>' + total + '</b>건 표시';
  }

  function renderLoading() {
    var messages = uiMessages();
    var req = messages && messages.requirements;
    var common = messages && messages.common;
    renderFeedbackRow(statusMessageRow(
      req && req.loadingTitle || (common && common.loading && common.loading.title) || '',
      req && req.loadingDesc || (common && common.loading && common.loading.description) || '',
      'loading'
    ));
  }

  function renderError() {
    var messages = uiMessages();
    var req = messages && messages.requirements;
    var common = messages && messages.common;
    renderFeedbackRow(statusMessageRow(
      req && req.errorTitle || (common && common.networkError && common.networkError.title) || '',
      common && common.networkError && common.networkError.description || '',
      'error'
    ));
    setSummary([]);
    refreshBoardList();
  }

  function load() {
    var projectId = resolveProjectId();
    renderLoading();

    return guardProjectAccess(projectId).then(function (guard) {
      if (!guard) return [];
      bindAuthorizedService(guard.member && guard.member.role);
      var svc = service();
      if (!svc || typeof svc.listByProject !== 'function') {
        renderError();
        return [];
      }
      var context = serviceContext('requirements-firestore-list');
      return svc.listByProject(projectId, DEFAULT_QUERY, context);
    }).then(function (items) {
      var list = sortRequirementsByLatest(
        (items || []).filter(function (item) { return item && item.isDeleted !== true; })
      );
      state.items = list;
      renderRows(list);
      setSummary(list);
      refreshCrudAccessUI();
      return list;
    }).catch(function () {
      state.items = [];
      renderError();
      refreshCrudAccessUI();
      return [];
    });
  }

  window.STAM = window.STAM || {};
  window.STAM.requirementsFirestoreList = {
    load: load,
    openDetailFromRow: openDetailFromRow,
    guardProjectAccess: guardProjectAccess,
    applyProjectContext: applyProjectContext,
    renderRows: renderRows,
    emptyStateRow: emptyStateRow,
    setSummary: setSummary,
    resolveProjectId: resolveProjectId,
    statusInfo: statusInfo,
    priorityInfo: priorityInfo,
    formatRequirementCode: formatRequirementCode,
    getTimestampMs: getTimestampMs,
    sortRequirementsByLatest: sortRequirementsByLatest,
    bindAuthorizedService: bindAuthorizedService,
    serviceContext: serviceContext,
    getState: function () {
      return {
        projectId: state.projectId,
        project: state.project,
        member: state.member,
        user: state.user,
        items: state.items,
        currentItem: state.currentItem,
      };
    },
  };

  ready(load);
}());
