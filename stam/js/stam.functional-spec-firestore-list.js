/* ============================================================================
 * STAM Functional Specification Firestore List
 * ----------------------------------------------------------------------------
 * Read-only list binding for functional-specification.html (FS-4).
 * Source contract:
 *   STAM.functionalSpecService.listByProject(projectId, query, context)
 *
 * No Firestore path construction, no create/update/delete/softDelete/remove calls.
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

  var FUNCTION_TYPE_LABELS = {
    view: '조회',
    create: '등록',
    update: '수정',
    delete: '삭제',
    approve: '승인',
    notify: '알림',
    export: '보내기',
    integrate: '연동',
  };

  var AVA_CLASSES = ['fn-ava--bg-5451e8', 'fn-ava--bg-8b5cf6', 'fn-ava--bg-10b981'];

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
      topbar.setAttribute('data-tb-crumbs', '내 프로젝트|' + name + '|기능정의서');
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

    document.title = '기능정의서 — ' + name + ' — STAM';
    if (window.STAM.projectContextRender && typeof window.STAM.projectContextRender.init === 'function') {
      window.STAM.projectContextRender.init();
    }
    if (window.STAM.topbarRender && typeof window.STAM.topbarRender.init === 'function') {
      window.STAM.topbarRender.init();
    }
    if (window.STAM.navRender && typeof window.STAM.navRender.init === 'function') {
      window.STAM.navRender.init('B5');
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
    return window.STAM && window.STAM.functionalSpecService;
  }

  function serviceContract() {
    return window.STAM && window.STAM.functionalSpecServiceContract;
  }

  function bindAuthorizedService(memberRole) {
    var contract = serviceContract();
    if (!contract || typeof contract.createService !== 'function') return;
    if (typeof contract.createMemberRoleAuthorize !== 'function') return;
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    window.STAM.functionalSpecService = contract.createService({ authorize: authorize });
  }

  function serviceContext(source) {
    return {
      actorUid: state.user && state.user.uid,
      actorName: state.user && (state.user.displayName || state.user.email),
      memberRole: state.member && state.member.role,
      projectId: state.projectId,
      source: source || 'functional-spec-firestore',
    };
  }

  function tbody() {
    return document.getElementById('fn-tbody');
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
    var crud = window.STAM && window.STAM.functionalSpecFirestoreCrud;
    if (crud && typeof crud.applyWriteAccessUI === 'function') {
      crud.applyWriteAccessUI();
    }
  }

  function setText(selector, text) {
    var el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function setHtml(selector, html) {
    var el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  function detailDate(value) {
    return dpart(value) || '—';
  }

  function linkedCardsHtml(item) {
    var html = '';
    var reqCode = requirementDisplayCode(item);
    var reqTitle = clean(item.requirementTitle);
    if (reqCode) {
      html += '<div class="fn-linked-card">' +
        '<span data-stam-icon="link" data-stam-icon-class="is-sm fn-linked-card-icon"></span>' +
        '<div><div class="fn-linked-card-id">' + esc(reqCode) + '</div>' +
        '<div class="fn-linked-card-name">' + esc(reqTitle || '연결 요구사항') + '</div></div>' +
        '<span class="fn-linked-card-tag">요구사항</span></div>';
    }
    var screen = clean(item.linkedScreen);
    if (screen) {
      html += '<div class="fn-linked-card">' +
        '<span data-stam-icon="layout" data-stam-icon-class="is-sm fn-linked-card-icon is-screen"></span>' +
        '<div><div class="fn-linked-card-id is-screen">' + esc(screen) + '</div>' +
        '<div class="fn-linked-card-name">연결 화면</div></div>' +
        '<span class="fn-linked-card-tag">화면</span></div>';
    }
    if (!html) {
      return '<div class="fn-iv-muted">연결된 항목이 없습니다</div>';
    }
    return html;
  }

  function linkedBadgeText(item) {
    var reqCount = hasRequirementLink(item) ? 1 : 0;
    var screenCount = clean(item.linkedScreen) ? 1 : 0;
    if (!reqCount && !screenCount) return '연결 없음';
    return '요구사항 ' + reqCount + ' · 화면 ' + screenCount;
  }

  function renderDetail(item) {
    state.currentItem = item || null;
    if (!item) return;
    var status = statusInfo(item);
    var priority = priorityInfo(item);
    var code = formatFunctionalSpecCode(item);
    var title = clean(item.title) || '(제목 없음)';
    var owner = ownerText(item);
    var ownerInitial = esc(owner.charAt(0) || '?');
    var typeLabel = functionTypeLabel(item);
    var updated = detailDate(item.updatedAt || item.createdAt);
    var reqCode = requirementDisplayCode(item);

    setText('#fn-dw-detail .fn-fn-badge', code);
    setText('#fn-dw-detail .fn-dw-htitle', title);
    setHtml('#fn-dw-detail .fn-dw-hmeta',
      '<span class="fn-chip fn-chip-type">' + esc(typeLabel) + '</span>' +
      '<span class="fn-chip ' + priority.cls + '">' + esc(priority.label) + '</span>' +
      '<div class="fn-dw-owner"><span class="fn-ava ' + avaClass(owner) + '">' + ownerInitial + '</span>' +
      '<span class="fn-dw-owner-name">' + esc(owner) + '</span></div>');
    setText('#fn-dw-detail .fn-iv-id', code);
    setHtml('#fn-dw-detail .fn-tab-panel:nth-child(1) .fn-ic:nth-child(2) .fn-iv',
      '<span class="fn-chip fn-chip-type">' + esc(typeLabel) + '</span>');
    setHtml('#fn-dw-detail .fn-tab-panel:nth-child(1) .fn-ic:nth-child(3) .fn-iv',
      '<span class="fn-chip ' + priority.cls + '">' + esc(priority.label) + '</span>');
    setHtml('#fn-dw-detail .fn-tab-panel:nth-child(1) .fn-ic:nth-child(4) .fn-iv',
      '<span class="fn-chip ' + status.cls + '">' + esc(status.label) + '</span>');
    setHtml('#fn-dw-detail .fn-tab-panel:nth-child(1) .fn-ic:nth-child(5) .fn-iv',
      '<span class="fn-ava ' + avaClass(owner) + '">' + ownerInitial + '</span>' + esc(owner));
    setText('#fn-dw-detail .fn-tab-panel:nth-child(1) .fn-iv-date', updated);
    setHtml('#fn-dw-detail .fn-tab-panel:nth-child(1) .fn-ic:nth-child(7) .fn-iv',
      reqCode
        ? '<span class="fn-link-chip">' + esc(reqCode) + '</span>'
        : '<span class="fn-iv-muted">미연결</span>');
    setText('#fn-dw-detail .fn-tab-panel:nth-child(1) .fn-ic:nth-child(8) .fn-iv',
      clean(item.reviewStatus) || '—');
    setText('#fn-dw-detail .fn-dw-sec-badge', linkedBadgeText(item));
    setHtml('#fn-dw-detail .fn-linked-list', linkedCardsHtml(item));

    var contentBoxes = document.querySelectorAll('#fn-dw-detail .fn-tab-panel:nth-child(2) .fn-purp-box');
    var contentValues = [
      clean(item.description) || '—',
      clean(item.inputSpec) || '—',
      clean(item.businessRule) || '—',
      clean(item.exceptionRule) || '—',
      clean(item.apiRef) || '—',
    ];
    contentBoxes.forEach(function (box, index) {
      if (contentValues[index] !== undefined) box.textContent = contentValues[index];
    });

    setHtml('#fn-dw-detail .fn-tab-panel:nth-child(3) .fn-chg-list',
      '<div class="fn-iv-muted">변경 이력은 후속 ChangeLog PR에서 연결합니다.</div>');
    setText('#fn-dw-detail .stam-dw-foot-meta', updated === '—' ? '' : ('최종 변경 ' + updated));

    setText('#fn-dw-edit .fn-fn-badge', code);
    setText('#fn-dw-edit .fn-dw-htitle', title);
    setHtml('#fn-dw-edit .fn-dw-hmeta',
      '<span class="fn-chip fn-chip-type">' + esc(typeLabel) + '</span>' +
      '<span class="fn-chip ' + priority.cls + '">' + esc(priority.label) + '</span>');
    var sumId = document.querySelector('#fn-dw-edit .fn-edit-sum-id');
    if (sumId) sumId.textContent = code;
    var sumTxt = document.querySelector('#fn-dw-edit .fn-edit-sum-txt');
    if (sumTxt) {
      sumTxt.innerHTML = '<span class="fn-edit-sum-id">' + esc(code) + '</span> 수정 모드 — 최종 변경 ' +
        esc(updated) + ' · 저장 시 변경 이력이 기록됩니다';
    }
  }

  function openDetailFromRow(row) {
    var id = row && clean(row.getAttribute('data-fn-id'));
    var svc = service();
    if (!id || !state.projectId || !svc || typeof svc.getById !== 'function') return Promise.resolve(null);
    var context = serviceContext('functional-spec-firestore-detail');
    return svc.getById(state.projectId, id, context).then(function (item) {
      if (item) renderDetail(item);
      return item;
    }).catch(function () {
      return null;
    });
  }

  function bindDetailRowActivation() {
    var body = tbody();
    if (!body || body.getAttribute('data-fn-detail-bound') === '1') return;
    if (typeof body.addEventListener !== 'function') return;
    body.setAttribute('data-fn-detail-bound', '1');
    body.addEventListener('click', function (event) {
      if (event.target.closest('input.fn-cb')) return;
      var row = event.target.closest('.fn-data-row');
      if (!row) return;
      openDetailFromRow(row);
    }, true);
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

  function latestSortTime(item) {
    return getTimestampMs(item && item.updatedAt) || getTimestampMs(item && item.createdAt);
  }

  function sortFunctionalSpecsByLatest(list) {
    return (list || []).slice().sort(function (a, b) {
      var aTime = latestSortTime(a);
      var bTime = latestSortTime(b);
      if (bTime !== aTime) return bTime - aTime;
      var ac = clean(a && (a.code || a.id));
      var bc = clean(b && (b.code || b.id));
      return bc.localeCompare(ac);
    });
  }

  function formatFunctionalSpecCode(item) {
    if (item && clean(item.code)) return clean(item.code);
    return '-';
  }

  function statusInfo(item) {
    var status = clean(item.status).toLowerCase();
    var reviewStatus = clean(item.reviewStatus).toLowerCase();
    if (status === 'approved') return { label: '승인완료', cls: 'fn-chip-approved' };
    if (status === 'hold') return { label: '보류', cls: 'fn-chip-hold' };
    if (status === 'done') return { label: '검토완료', cls: 'fn-chip-done' };
    if (status === 'review') {
      return reviewStatus === 'approved'
        ? { label: '검토완료', cls: 'fn-chip-done' }
        : { label: '검토요청', cls: 'fn-chip-review' };
    }
    return { label: '작성중', cls: 'fn-chip-draft' };
  }

  function priorityInfo(item) {
    var priority = clean(item.priority).toLowerCase();
    if (priority === 'high') return { label: '높음', cls: 'fn-chip-high' };
    if (priority === 'low') return { label: '낮음', cls: 'fn-chip-low' };
    return { label: '중간', cls: 'fn-chip-mid' };
  }

  function functionTypeLabel(item) {
    var raw = clean(item.functionType).toLowerCase();
    if (raw && FUNCTION_TYPE_LABELS[raw]) return FUNCTION_TYPE_LABELS[raw];
    return clean(item.functionType) || '기능';
  }

  function ownerText(item) {
    return clean(valueOf(item, ['ownerName', 'ownerUid', 'createdBy'], '미지정')) || '미지정';
  }

  function avaClass(name) {
    var h = 0;
    var s = String(name || '?');
    for (var i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % AVA_CLASSES.length;
    return AVA_CLASSES[h];
  }

  function requirementDisplayCode(item) {
    return clean(valueOf(item, ['requirementCode'], ''));
  }

  function hasRequirementLink(item) {
    return !!(requirementDisplayCode(item) || clean(item.requirementId));
  }

  function requirementChip(item) {
    var code = requirementDisplayCode(item);
    if (code) return '<span class="fn-link-chip">' + esc(code) + '</span>';
    return '<span class="fn-chip fn-chip-hold">연결 필요</span>';
  }

  function screenChip(item) {
    var screen = clean(valueOf(item, ['linkedScreen'], ''));
    if (screen) return '<span class="fn-link-chip fn-link-chip-scr">' + esc(screen) + '</span>';
    return '<span class="fn-updated-cell">—</span>';
  }

  function rowHtml(item) {
    var status = statusInfo(item);
    var priority = priorityInfo(item);
    var owner = ownerText(item);
    var initial = esc(owner.charAt(0) || '?');
    var code = formatFunctionalSpecCode(item);
    var title = clean(item.title) || '(제목 없음)';
    var updated = dpart(item.updatedAt || item.createdAt) || '—';

    return '<tr class="fn-data-row stam-table-row" data-fn-id="' + esc(item.id) + '">' +
      '<td class="fn-ch stam-check-cell"><input type="checkbox" class="fn-cb stam-check" onclick="event.stopPropagation()"></td>' +
      '<td><div class="fn-id-cell"><span class="fn-fn-id">' + esc(code) + '</span>' +
      '<span class="fn-fn-name">' + esc(title) + '</span></div></td>' +
      '<td>' + requirementChip(item) + '</td>' +
      '<td>' + screenChip(item) + '</td>' +
      '<td><span class="fn-chip fn-chip-type">' + esc(functionTypeLabel(item)) + '</span></td>' +
      '<td><span class="fn-chip ' + priority.cls + '">' + esc(priority.label) + '</span></td>' +
      '<td><span class="fn-chip ' + status.cls + '">' + esc(status.label) + '</span></td>' +
      '<td><div class="fn-who">' +
      '<span class="fn-ava ' + avaClass(owner) + '">' + initial + '</span>' +
      '<span class="fn-owner-name">' + esc(owner) + '</span></div></td>' +
      '<td class="fn-updated-cell">' + esc(updated) + '</td>' +
      '</tr>';
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
    var messages = uiMessages() && uiMessages().functionalSpec;
    if (!items.length) {
      renderFeedbackRow(emptyStateRow(
        messages && messages.emptyTitle || '등록된 기능정의서가 없습니다',
        messages && messages.emptyDesc || ''
      ));
      refreshBoardList();
      return;
    }
    body.innerHTML = items.map(rowHtml).join('');
    bindDetailRowActivation();
    refreshBoardList();
  }

  function setSummary(items) {
    var total = items.length;
    var nums = document.querySelectorAll('.fn-ss-num');
    if (nums[0]) nums[0].textContent = total;
    if (nums[1]) nums[1].textContent = items.filter(function (item) { return item.status === 'draft'; }).length;
    if (nums[2]) nums[2].textContent = items.filter(function (item) {
      return item.status === 'review' || item.status === 'done';
    }).length;
    if (nums[3]) nums[3].textContent = items.filter(function (item) { return item.status === 'approved'; }).length;
    if (nums[4]) nums[4].textContent = items.filter(function (item) { return item.status === 'hold'; }).length;
    if (nums[5]) nums[5].textContent = items.filter(function (item) {
      return hasRequirementLink(item);
    }).length;
    if (nums[6]) nums[6].textContent = items.filter(function (item) {
      return !!clean(valueOf(item, ['linkedScreen'], ''));
    }).length;

    var highPriority = document.querySelectorAll('.fn-ss-meta-val')[0];
    var recent = document.querySelectorAll('.fn-ss-meta-val')[1];
    var unlinked = document.querySelectorAll('.fn-ss-meta-val')[2];
    if (highPriority) {
      highPriority.textContent = items.filter(function (item) { return item.priority === 'high'; }).length + '건';
    }
    if (recent) recent.textContent = '—';
    if (unlinked) {
      unlinked.textContent = items.filter(function (item) {
        return !hasRequirementLink(item);
      }).length + '건';
    }

    var count = document.querySelector('.stam-board-count');
    if (count) count.innerHTML = '총 <b>' + total + '</b>건 중 <b>' + total + '</b>건 표시';
  }

  function addSourceBadge() {
    var titleEl = document.querySelector('.fn-page-hdr-title');
    if (
      titleEl
      && typeof titleEl.insertAdjacentHTML === 'function'
      && !document.getElementById('fsl-srcbadge')
    ) {
      titleEl.insertAdjacentHTML('beforeend',
        '<span id="fsl-srcbadge" class="fn-chip fn-chip-type fn-chip-ml">Firestore</span>');
    }
  }

  function renderLoading() {
    var messages = uiMessages();
    var spec = messages && messages.functionalSpec;
    var common = messages && messages.common;
    renderFeedbackRow(statusMessageRow(
      spec && spec.loadingTitle || (common && common.loading && common.loading.title) || '',
      spec && spec.loadingDesc || (common && common.loading && common.loading.description) || '',
      'loading'
    ));
  }

  function renderError() {
    var messages = uiMessages();
    var spec = messages && messages.functionalSpec;
    var common = messages && messages.common;
    renderFeedbackRow(statusMessageRow(
      spec && spec.errorTitle || (common && common.networkError && common.networkError.title) || '',
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
      var context = serviceContext('functional-spec-firestore-list');
      return svc.listByProject(projectId, DEFAULT_QUERY, context);
    }).then(function (items) {
      var list = sortFunctionalSpecsByLatest(
        (items || []).filter(function (item) { return item && item.isDeleted !== true; })
      );
      state.items = list;
      renderRows(list);
      setSummary(list);
      addSourceBadge();
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
  window.STAM.functionalSpecFirestoreList = {
    load: load,
    guardProjectAccess: guardProjectAccess,
    applyProjectContext: applyProjectContext,
    renderRows: renderRows,
    renderDetail: renderDetail,
    openDetailFromRow: openDetailFromRow,
    emptyStateRow: emptyStateRow,
    setSummary: setSummary,
    resolveProjectId: resolveProjectId,
    statusInfo: statusInfo,
    priorityInfo: priorityInfo,
    functionTypeLabel: functionTypeLabel,
    formatFunctionalSpecCode: formatFunctionalSpecCode,
    getTimestampMs: getTimestampMs,
    sortFunctionalSpecsByLatest: sortFunctionalSpecsByLatest,
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
