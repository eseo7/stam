/* ============================================================================
 * STAM WBS Firestore List (WBS-4)
 * ----------------------------------------------------------------------------
 * Read-only list/detail/KPI/filter binding for wbs.html.
 * Data: STAM.wbsService.listByProject / getById only.
 * No direct wbsItems Firestore queries. No create/update/delete.
 * ========================================================================== */
(function () {
  'use strict';

  var STORAGE_PROJECT_ID = 'stam:selectedProjectId';
  var STORAGE_PROJECT_NAME = 'stam:selectedProjectName';
  var DEFAULT_QUERY = { includeDeleted: false };
  var TABLE_COLSPAN = 22;
  var ROUTES = {
    login: '/pages/auth/login.html',
    projects: '/pages/auth/projects.html',
    accessDenied: '/pages/auth/access-denied.html',
  };

  var STATUS_MAP = {
    wait: { label: '대기', cls: 'wc-wait' },
    in_progress: { label: '진행중', cls: 'wc-prog' },
    delayed: { label: '지연', cls: 'wc-delay' },
    done: { label: '완료', cls: 'wc-done' },
    hold: { label: '보류', cls: 'wc-hold' },
  };

  var PRIORITY_MAP = {
    high: { label: '높음', cls: 'wp-high' },
    mid: { label: '보통', cls: 'wp-mid' },
    low: { label: '낮음', cls: 'wp-low' },
  };

  var state = {
    projectId: '',
    project: null,
    member: null,
    user: null,
    items: [],
    filteredItems: [],
    currentItem: null,
    filterValues: {},
    searchText: '',
    myOnly: false,
    riskOnly: false,
  };

  var loadSeq = 0;
  var filterBound = false;
  var rowEventsBound = false;

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

  function isLiveMode() {
    return !!document.querySelector('[data-stam-wbs-live="true"]');
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

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatLocalDate(date) {
    return date.getFullYear()
      + '-' + String(date.getMonth() + 1).padStart(2, '0')
      + '-' + String(date.getDate()).padStart(2, '0');
  }

  function weekBoundsLocal(todayIsoValue) {
    var parts = clean(todayIsoValue).split('-');
    var monday = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var day = monday.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    var sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { monIso: formatLocalDate(monday), sunIso: formatLocalDate(sunday) };
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

  function statusLabelProject(status) {
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
    var status = statusLabelProject(project.status);
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
      topbar.setAttribute('data-tb-crumbs', '내 프로젝트|' + name + '|WBS 작업');
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

    document.title = 'WBS 작업 — ' + name + ' — STAM';
    if (window.STAM.projectContextRender && typeof window.STAM.projectContextRender.init === 'function') {
      window.STAM.projectContextRender.init();
    }
    if (window.STAM.topbarRender && typeof window.STAM.topbarRender.init === 'function') {
      window.STAM.topbarRender.init();
    }
    if (window.STAM.navRender && typeof window.STAM.navRender.init === 'function') {
      window.STAM.navRender.init('B3');
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
    return window.STAM && window.STAM.wbsService;
  }

  function serviceContract() {
    return window.STAM && window.STAM.wbsServiceContract;
  }

  function bindAuthorizedService(memberRole) {
    var contract = serviceContract();
    if (!contract || typeof contract.createService !== 'function') return;
    if (typeof contract.createMemberRoleAuthorize !== 'function') return;
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    window.STAM.wbsService = contract.createService({ authorize: authorize });
  }

  function serviceContext(source) {
    return {
      actorUid: state.user && state.user.uid,
      actorName: state.user && (state.user.displayName || state.user.email),
      memberRole: state.member && state.member.role,
      projectId: state.projectId,
      source: source || 'wbs-firestore-list',
    };
  }

  function uiFeedback() {
    return window.STAM && window.STAM.uiFeedback;
  }

  function uiMessages() {
    return window.STAM && window.STAM.uiMessages;
  }

  function tableEl() {
    return document.querySelector('[data-stam-wbs-static-list]') || document.getElementById('wbs-static-table');
  }

  function runtimeHost() {
    return document.querySelector('[data-stam-wbs-runtime]') || document.getElementById('wbs-live-feedback-host');
  }

  function emptyStateRow(title, desc) {
    var feedback = uiFeedback();
    if (!feedback || typeof feedback.tableEmptyRow !== 'function') return '';
    return feedback.tableEmptyRow({
      colspan: TABLE_COLSPAN,
      title: title,
      description: desc,
      icon: 'clipboard-list',
    });
  }

  function statusMessageRow(title, desc, modifier) {
    var feedback = uiFeedback();
    if (!feedback || typeof feedback.tableMessageRow !== 'function') return '';
    return feedback.tableMessageRow({
      colspan: TABLE_COLSPAN,
      title: title,
      description: desc,
      variant: modifier,
    });
  }

  function renderFeedbackInTable(html) {
    var table = tableEl();
    if (!table || !html) return;
    table.querySelectorAll('tbody').forEach(function (tb) { tb.remove(); });
    var tbody = document.createElement('tbody');
    tbody.id = 'wbs-live-feedback-host';
    tbody.setAttribute('data-stam-wbs-runtime', '');
    tbody.innerHTML = html;
    table.appendChild(tbody);
    var feedback = uiFeedback();
    if (feedback && typeof feedback.hydrateIcons === 'function') {
      feedback.hydrateIcons(tbody);
    }
  }

  function renderLoading() {
    var messages = uiMessages();
    var wbs = messages && messages.wbs;
    var common = messages && messages.common;
    renderFeedbackInTable(statusMessageRow(
      wbs && wbs.loadingTitle || (common && common.loading && common.loading.title) || '',
      wbs && wbs.loadingDesc || (common && common.loading && common.loading.description) || '',
      'loading'
    ));
  }

  function renderError() {
    var messages = uiMessages();
    var wbs = messages && messages.wbs;
    var common = messages && messages.common;
    renderFeedbackInTable(statusMessageRow(
      wbs && wbs.errorTitle || (common && common.networkError && common.networkError.title) || '',
      common && common.networkError && common.networkError.description || '',
      'error'
    ));
    renderKpis([]);
    renderTimelineSummary([]);
  }

  function sortItemsForDisplay(list) {
    var api = window.STAMBoardList;
    if (api && typeof api.sortByBoardRegistration === 'function') {
      return api.sortByBoardRegistration(list);
    }
    return (list || []).slice();
  }

  function dpart(value) {
    if (!value) return '';
    if (typeof value.toDate === 'function') {
      try {
        var dt = value.toDate();
        return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      } catch (err) {
        return '';
      }
    }
    return String(value).replace('T', ' ').slice(0, 10);
  }

  function periodLabel(start, end) {
    var s = dpart(start);
    var e = dpart(end);
    if (!s && !e) return '—';
    if (!s || !e) return s || e;
    return s.slice(5) + ' ~ ' + e.slice(5);
  }

  function effortLabel(value) {
    if (value == null || value === '') return '—';
    var num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return num + '일';
  }

  function statusInfo(status) {
    var key = clean(status).toLowerCase();
    return STATUS_MAP[key] || { label: clean(status) || '—', cls: 'wc-wait' };
  }

  function priorityInfo(priority) {
    var key = clean(priority).toLowerCase();
    return PRIORITY_MAP[key] || { label: '보통', cls: 'wp-mid' };
  }

  function deriveScheduleState(item, todayIsoValue) {
    var today = clean(todayIsoValue) || todayIso();
    var status = clean(item && item.status).toLowerCase();
    var start = dpart(item && item.startDate);
    var end = dpart(item && item.endDate);

    if (status === 'done') return { verdict: '완료', verdictCls: 'wc-done', risk: '' };
    if (status === 'hold') return { verdict: '보류', verdictCls: 'wc-hold', risk: '' };
    if (status === 'delayed') return { verdict: '지연', verdictCls: 'wc-delay', risk: '일정 지연' };
    if (!start || !end) return { verdict: '—', verdictCls: '', risk: '' };
    if (today > end) return { verdict: '기간초과', verdictCls: 'wc-delay', risk: '일정 초과' };
    if (status === 'wait' && today < start) return { verdict: '미착수', verdictCls: 'wc-wait', risk: '' };
    if (status === 'in_progress') return { verdict: '진행중', verdictCls: 'wc-prog', risk: '' };
    return { verdict: '정상', verdictCls: 'wc-done', risk: '' };
  }

  function isItemDelayed(item, todayIsoValue) {
    var status = clean(item && item.status).toLowerCase();
    if (status === 'done' || status === 'hold') return false;
    if (status === 'delayed') return true;
    return !!deriveScheduleState(item, todayIsoValue).risk;
  }

  function validProgress(value) {
    if (value == null || value === '') return null;
    var num = Number(value);
    if (!Number.isFinite(num) || num < 0 || num > 100) return null;
    return num;
  }

  function computeKpis(items, todayIsoValue) {
    var today = clean(todayIsoValue) || todayIso();
    var list = items || [];
    var groups = {};
    list.forEach(function (item) {
      var g = clean(item.functionGroup) || '(미지정)';
      groups[g] = true;
    });

    var bounds = weekBoundsLocal(today);
    var monIso = bounds.monIso;
    var sunIso = bounds.sunIso;

    return {
      total: list.length,
      inProgress: list.filter(function (i) { return clean(i.status).toLowerCase() === 'in_progress'; }).length,
      done: list.filter(function (i) { return clean(i.status).toLowerCase() === 'done'; }).length,
      delayed: list.filter(function (i) { return isItemDelayed(i, today); }).length,
      dueWeek: list.filter(function (i) {
        if (clean(i.status).toLowerCase() === 'done') return false;
        var end = dpart(i.endDate);
        return end && end >= monIso && end <= sunIso;
      }).length,
      groupCount: Object.keys(groups).length,
    };
  }

  function dominantStatus(items, todayIsoValue) {
    var list = items || [];
    if (!list.length) return 'wait';
    var today = clean(todayIsoValue) || todayIso();
    if (list.some(function (item) { return isItemDelayed(item, today); })) return 'delayed';
    if (list.some(function (item) { return clean(item.status).toLowerCase() === 'in_progress'; })) return 'in_progress';
    if (list.some(function (item) { return clean(item.status).toLowerCase() === 'wait'; })) return 'wait';
    if (list.some(function (item) { return clean(item.status).toLowerCase() === 'hold'; })) return 'hold';
    if (list.every(function (item) { return clean(item.status).toLowerCase() === 'done'; })) return 'done';
    return 'wait';
  }

  function computeTimelineSummary(items, todayIsoValue) {
    var today = clean(todayIsoValue) || todayIso();
    var list = items || [];
    var starts = [];
    var ends = [];
    var progressSum = 0;
    var progressCount = 0;
    list.forEach(function (item) {
      var s = dpart(item.startDate);
      var e = dpart(item.endDate);
      if (s) starts.push(s);
      if (e) ends.push(e);
      var progress = validProgress(item.progress);
      if (progress != null) {
        progressSum += progress;
        progressCount += 1;
      }
    });
    starts.sort();
    ends.sort();
    var minStart = starts[0] || '';
    var maxEnd = ends[ends.length - 1] || '';
    var dayCount = 0;
    if (minStart && maxEnd) {
      var a = new Date(minStart + 'T00:00:00');
      var b = new Date(maxEnd + 'T00:00:00');
      dayCount = Math.max(0, Math.round((b - a) / 86400000) + 1);
    }
    var grouped = groupItems(list);
    var groupSummary = grouped.map(function (grp) {
      var avg = 0;
      var pc = 0;
      grp.items.forEach(function (item) {
        var progress = validProgress(item.progress);
        if (progress != null) {
          avg += progress;
          pc += 1;
        }
      });
      var gs = grp.items.map(function (i) { return dpart(i.startDate); }).filter(Boolean).sort();
      var ge = grp.items.map(function (i) { return dpart(i.endDate); }).filter(Boolean).sort();
      return {
        functionGroup: grp.name,
        count: grp.items.length,
        startDate: gs[0] || '',
        endDate: ge[ge.length - 1] || '',
        averageProgress: pc ? Math.round(avg / pc) : 0,
        dominantStatus: dominantStatus(grp.items, today),
      };
    });
    return {
      minStartDate: minStart,
      maxEndDate: maxEnd,
      inclusiveDayCount: dayCount,
      itemCount: list.length,
      averageProgress: progressCount ? Math.round(progressSum / progressCount) : 0,
      groupSummary: groupSummary,
    };
  }

  function groupItems(items) {
    var sorted = sortItemsForDisplay(items || []);
    var map = {};
    var order = [];
    sorted.forEach(function (item) {
      var name = clean(item.functionGroup) || '(미지정)';
      if (!map[name]) {
        map[name] = [];
        order.push(name);
      }
      map[name].push(item);
    });
    return order.map(function (name, index) {
      return {
        key: 'grp-' + index,
        name: name,
        items: map[name],
      };
    });
  }

  function requirementLabel(item) {
    var code = clean(item.requirementCode);
    var title = clean(item.requirementTitle);
    if (code && title) return code + ' · ' + title;
    if (code) return code;
    if (title) return title;
    if (clean(item.requirementId)) return '(제목 없음)';
    return '';
  }

  function functionalSpecLabel(item) {
    var code = clean(item.functionalSpecCode);
    var title = clean(item.functionalSpecTitle);
    if (code && title) return code + ' · ' + title;
    if (code) return code;
    if (title) return title;
    if (clean(item.functionalSpecId)) return '(제목 없음)';
    return '';
  }

  function ownerInitial(name) {
    return esc(clean(name).charAt(0) || '?');
  }

  function avatarHtml(name) {
    var n = clean(name) || '미지정';
    return '<span class="wbs-avatar"><span class="wbs-av-dot">' + ownerInitial(n) + '</span>' + esc(n) + '</span>';
  }

  function rowHtml(item) {
    var status = statusInfo(item.status);
    var priority = priorityInfo(item.priority);
    var schedule = deriveScheduleState(item, todayIso());
    var req = requirementLabel(item);
    var fn = functionalSpecLabel(item);
    var risk = schedule.risk || '—';
    var riskHtml = risk === '—'
      ? '<span class="wbs-muted">—</span>'
      : '<span class="wbs-risk-flag">' + esc(risk) + '</span>';

    return '<tr class="wbs-data-row stam-table-row" data-wbs-item-id="' + esc(item.id) + '" data-wbs-code="' + esc(item.code) + '" data-wbs-owner-id="' + esc(item.ownerId) + '" data-wbs-status="' + esc(item.status) + '">' +
      '<td class="wbs-td-chk stam-check-cell"><input type="checkbox" class="wbs-row-chk stam-check" title="행 선택"></td>' +
      '<td class="wbs-col-area is-focus-col"><span class="wbs-type-chip">' + esc(clean(item.businessArea) || '—') + '</span></td>' +
      '<td class="wbs-col-grp col-d"><span class="wbs-type-chip">' + esc(clean(item.functionGroup) || '—') + '</span></td>' +
      '<td class="wbs-col-id is-shared-col"><span class="wbs-id-chip">' + esc(clean(item.code) || '—') + '</span></td>' +
      '<td class="wbs-col-menu is-shared-col"><span class="wbs-type-chip">' + esc(clean(item.screenPath) || '—') + '</span></td>' +
      '<td class="wbs-col-task is-shared-col" title="' + esc(clean(item.title)) + '">' + esc(clean(item.title) || '(제목 없음)') + '</td>' +
      '<td class="wbs-col-type is-shared-col"><span class="wbs-type-chip">' + esc(clean(item.phase) || '—') + '</span></td>' +
      '<td class="wbs-col-assign is-shared-col">' + avatarHtml(item.ownerName) + '</td>' +
      '<td class="wbs-col-reviewer is-focus-col">' + (clean(item.reviewerName) ? avatarHtml(item.reviewerName) : '<span class="wbs-muted">—</span>') + '</td>' +
      '<td class="wbs-col-status is-shared-col"><span class="wbs-chip ' + status.cls + '">' + esc(status.label) + '</span></td>' +
      '<td class="wbs-col-prio is-shared-col"><span class="wbs-prio ' + priority.cls + '"><span class="wbs-prio-dot"></span>' + esc(priority.label) + '</span></td>' +
      '<td class="wbs-col-period is-shared-col"><span class="wbs-period">' + esc(periodLabel(item.startDate, item.endDate)) + '</span></td>' +
      '<td class="wbs-col-start col-d"><span class="wbs-date">' + esc(dpart(item.startDate) || '—') + '</span></td>' +
      '<td class="wbs-col-end col-d"><span class="wbs-date">' + esc(dpart(item.endDate) || '—') + '</span></td>' +
      '<td class="wbs-col-effort is-focus-col"><span class="wbs-effort">' + esc(effortLabel(item.plannedEffort)) + '</span></td>' +
      '<td class="wbs-col-actual is-focus-col"><span class="wbs-effort">' + esc(effortLabel(item.actualEffort)) + '</span></td>' +
      '<td class="wbs-col-verdict is-focus-col"><span class="wbs-chip ' + esc(schedule.verdictCls) + ' sm">' + esc(schedule.verdict) + '</span></td>' +
      '<td class="wbs-col-req is-shared-col">' + (req ? '<span class="wbs-link-chip">' + esc(req) + '</span>' : '<span class="wbs-muted">—</span>') + '</td>' +
      '<td class="wbs-col-scr is-shared-col">' + (fn ? '<span class="wbs-link-chip">' + esc(fn) + '</span>' : '<span class="wbs-muted">—</span>') + '</td>' +
      '<td class="wbs-col-meeting is-focus-col"><span class="wbs-muted">—</span></td>' +
      '<td class="wbs-col-appr is-shared-col"><span class="wbs-muted">—</span></td>' +
      '<td class="wbs-col-risk is-shared-col">' + riskHtml + '</td>' +
      '</tr>';
  }

  function groupHeaderHtml(grp) {
    var done = grp.items.filter(function (i) { return clean(i.status).toLowerCase() === 'done'; }).length;
    var avg = 0;
    var pc = 0;
    grp.items.forEach(function (item) {
      var progress = validProgress(item.progress);
      if (progress != null) {
        avg += progress;
        pc += 1;
      }
    });
    var pct = pc ? Math.round(avg / pc) : 0;
    var dom = dominantStatus(grp.items, todayIso());
    var domInfo = statusInfo(dom);
    var fillCls = dom === 'done' ? 'done' : (dom === 'delayed' ? 'delay' : (dom === 'hold' ? 'hold' : ''));
    return '<tbody class="wbs-grp-hdr-body">' +
      '<tr><td colspan="' + TABLE_COLSPAN + '">' +
      '<div class="wbs-grp-hdr-inner">' +
      '<button class="wbs-grp-toggle-btn" data-grp="' + esc(grp.key) + '" type="button" title="접기"><span data-stam-icon="chevron-down" data-stam-icon-class="is-sm"></span></button>' +
      '<span class="wbs-grp-ico wbs-grp-ico--design">' + esc(clean(grp.items[0] && grp.items[0].phase) || '—') + '</span>' +
      '<span class="wbs-grp-name">' + esc(grp.name) + '</span>' +
      '<span class="wbs-grp-stats"><span class="wbs-grp-stat-txt">' + grp.items.length + '건</span>' +
      '<span class="wbs-chip ' + domInfo.cls + ' sm">' + esc(domInfo.label) + ' ' + done + '</span></span>' +
      '<div class="wbs-grp-progress"><div class="wbs-grp-prog-bar"><progress class="wbs-live-progress wbs-live-progress--grp ' + fillCls + '" max="100" value="' + pct + '"></progress></div>' +
      '<span class="wbs-grp-prog-pct">' + pct + '%</span></div>' +
      '</div></td></tr></tbody>' +
      '<tbody class="wbs-grp-rows" data-grp="' + esc(grp.key) + '">' +
      grp.items.map(rowHtml).join('') +
      '</tbody>';
  }

  function renderKpis(items) {
    var kpis = computeKpis(items, todayIso());
    function setKpi(key, num, sub) {
      var card = document.querySelector('[data-wbs-kpi="' + key + '"]');
      if (!card) return;
      var numEl = card.querySelector('.wbs-kpi-num');
      var subEl = card.querySelector('.wbs-kpi-sub');
      if (numEl) numEl.textContent = String(num);
      if (subEl && sub != null) subEl.textContent = sub;
    }
    setKpi('total', kpis.total, kpis.groupCount ? kpis.groupCount + '개 기능그룹' : '—');
    setKpi('in_progress', kpis.inProgress, '—');
    var donePct = kpis.total ? Math.round((kpis.done / kpis.total) * 1000) / 10 : 0;
    setKpi('done', kpis.done, kpis.total ? donePct + '% 달성' : '—');
    setKpi('delayed', kpis.delayed, '—');
    setKpi('due_week', kpis.dueWeek, '—');
  }

  function renderTimelineSummary(items) {
    var summary = computeTimelineSummary(items);
    var meta = document.querySelector('.wbs-gantt-meta');
    if (meta) {
      if (!summary.itemCount) {
        meta.textContent = '— · 읽기 전용';
      } else if (!summary.minStartDate || !summary.maxEndDate) {
        meta.textContent = '— · ' + summary.itemCount + '건 · 읽기 전용';
      } else {
        meta.textContent = summary.minStartDate + ' ~ ' + summary.maxEndDate + ' · ' +
          summary.inclusiveDayCount + '일 · ' + summary.itemCount + '건 · 읽기 전용';
      }
    }
    var gsumCells = document.querySelectorAll('.wbs-gsum-cell .wbs-gsum-val');
    if (gsumCells[0]) gsumCells[0].innerHTML = summary.inclusiveDayCount + '<small>일</small>';
    if (gsumCells[1]) gsumCells[1].innerHTML = summary.itemCount + '<small>건</small>';
    var kpis = computeKpis(items, todayIso());
    if (gsumCells[2]) gsumCells[2].innerHTML = kpis.inProgress + '<small>건</small>';
    if (gsumCells[3]) gsumCells[3].innerHTML = kpis.delayed + '<small>건</small>';
    if (gsumCells[4]) gsumCells[4].innerHTML = kpis.dueWeek + '<small>건</small>';
    if (gsumCells[5]) {
      gsumCells[5].innerHTML = summary.averageProgress + '<small>%</small>';
      var progHost = gsumCells[5].parentElement && gsumCells[5].parentElement.querySelector('.wbs-gsum-prog');
      if (progHost) {
        var progEl = progHost.querySelector('progress.wbs-live-progress');
        if (progEl) progEl.value = summary.averageProgress;
      }
    }
    var groupsHost = document.querySelector('.wbs-gsum-groups');
    if (!groupsHost) return;
    var hdr = groupsHost.querySelector('.wbs-gsum-grp-hdr');
    groupsHost.innerHTML = '';
    if (hdr) groupsHost.appendChild(hdr);
    else {
      groupsHost.innerHTML = '<div class="wbs-gsum-grp-hdr">' +
        '<span class="wbs-gsum-grp-hcol wbs-gsum-grp-name">기능그룹</span>' +
        '<span class="wbs-gsum-grp-hcol wbs-gsum-grp-period">기간</span>' +
        '<span class="wbs-gsum-grp-hcol wbs-gsum-grp-count">건수</span>' +
        '<span class="wbs-gsum-grp-hcol wbs-gsum-grp-status">상태</span>' +
        '<span class="wbs-gsum-grp-hcol wbs-gsum-grp-bar">진행률</span></div>';
    }
    summary.groupSummary.forEach(function (grp) {
      var st = statusInfo(grp.dominantStatus);
      var row = document.createElement('div');
      row.className = 'wbs-gsum-grp-row' + (grp.dominantStatus === 'delayed' ? ' is-delay' : '');
      row.innerHTML =
        '<span class="wbs-gsum-grp-name">' + esc(grp.functionGroup) + '</span>' +
        '<span class="wbs-gsum-grp-period">' + esc(periodLabel(grp.startDate, grp.endDate)) + '</span>' +
        '<span class="wbs-gsum-grp-count">' + grp.count + '건</span>' +
        '<span class="wbs-gsum-grp-status"><span class="wbs-chip ' + st.cls + ' sm">' + esc(st.label) + '</span></span>' +
        '<div class="wbs-gsum-grp-bar">' +
        '<div class="wbs-gsum-grp-track"><progress class="wbs-live-progress" max="100" value="' + grp.averageProgress + '"></progress></div>' +
        '<span class="wbs-gsum-grp-pct">' + grp.averageProgress + '%</span></div>';
      groupsHost.appendChild(row);
    });
    var mobile = document.querySelector('.wbs-gantt-mobile');
    if (mobile) mobile.innerHTML = '';
  }

  function renderRows(items) {
    var table = tableEl();
    if (!table) return;
    var list = items || [];
    var messages = uiMessages() && uiMessages().wbs;
    table.querySelectorAll('tbody').forEach(function (tb) { tb.remove(); });
    if (!list.length) {
      var hasSourceItems = (state.items || []).length > 0;
      var emptyTitle = hasSourceItems
        ? (messages && messages.filterEmptyTitle || '조건에 맞는 WBS 작업이 없습니다')
        : (messages && messages.emptyTitle || '등록된 WBS 작업이 없습니다');
      var emptyDesc = hasSourceItems
        ? (messages && messages.filterEmptyDesc || '검색어나 필터 조건을 조정해 주세요.')
        : (messages && messages.emptyDesc || '');
      var tbody = document.createElement('tbody');
      tbody.id = 'wbs-live-feedback-host';
      tbody.setAttribute('data-stam-wbs-runtime', '');
      tbody.innerHTML = emptyStateRow(emptyTitle, emptyDesc);
      table.appendChild(tbody);
      var feedback = uiFeedback();
      if (feedback && typeof feedback.hydrateIcons === 'function') feedback.hydrateIcons(tbody);
      return;
    }
    var groups = groupItems(list);
    var html = groups.map(groupHeaderHtml).join('');
    table.insertAdjacentHTML('beforeend', html);
    var feedback = uiFeedback();
    if (feedback && typeof feedback.hydrateIcons === 'function') feedback.hydrateIcons(table);
    if (window.STAM && window.STAM.icons && typeof window.STAM.icons.hydrate === 'function') {
      window.STAM.icons.hydrate(table);
    }
  }

  function setDetailText(key, text, html) {
    var el = document.querySelector('[data-wbs-detail="' + key + '"]');
    if (!el) return;
    if (html) el.innerHTML = html;
    else el.textContent = text == null || text === '' ? '—' : text;
  }

  function renderDetail(item) {
    state.currentItem = item || null;
    if (!item) return;
    var status = statusInfo(item.status);
    var priority = priorityInfo(item.priority);
    var schedule = deriveScheduleState(item, todayIso());
    var code = clean(item.code) || '—';
    var title = clean(item.title) || '(제목 없음)';

    var widEl = document.getElementById('wbs-dw-wid');
    if (widEl) widEl.textContent = code;
    var titleEl = document.getElementById('wbs-dw-title');
    if (titleEl) titleEl.textContent = title;
    var meta = document.getElementById('wbs-dw-meta');
    if (meta) {
      meta.innerHTML = '<span class="wbs-chip ' + status.cls + '">' + esc(status.label) + '</span>' +
        '<span class="wbs-prio ' + priority.cls + '"><span class="wbs-prio-dot"></span>' + esc(priority.label) + '</span>' +
        '<span class="wbs-type-chip">' + esc(clean(item.phase) || '—') + '</span>';
    }

    setDetailText('owner', clean(item.ownerName) || '—');
    setDetailText('reviewer', clean(item.reviewerName) || '—');
    setDetailText('period', periodLabel(item.startDate, item.endDate));
    setDetailText('effort', effortLabel(item.plannedEffort));
    setDetailText('verdict', schedule.verdict, '<span class="wbs-chip ' + schedule.verdictCls + ' sm">' + esc(schedule.verdict) + '</span>');
    setDetailText('phase', clean(item.phase) || '—', '<span class="wbs-type-chip">' + esc(clean(item.phase) || '—') + '</span>');
    setDetailText('businessArea', clean(item.businessArea) || '—');
    setDetailText('functionGroup', clean(item.functionGroup) || '—');
    setDetailText('screenPath', clean(item.screenPath) || '—');
    setDetailText('priority', priority.label, '<span class="wbs-prio ' + priority.cls + '"><span class="wbs-prio-dot"></span>' + esc(priority.label) + '</span>');
    setDetailText('approval', '—');
    setDetailText('startDate', dpart(item.startDate) || '—');
    setDetailText('endDate', dpart(item.endDate) || '—');
    setDetailText('plannedEffort', effortLabel(item.plannedEffort));
    setDetailText('actualEffort', effortLabel(item.actualEffort));
    setDetailText('progress', item.progress != null ? String(item.progress) + '%' : '—');
    var progressBar = document.querySelector('[data-wbs-detail="progressBar"]');
    if (progressBar) progressBar.value = item.progress != null ? Number(item.progress) || 0 : 0;
    setDetailText('requirement', requirementLabel(item) || '—');
    setDetailText('functionalSpec', functionalSpecLabel(item) || '—');
    setDetailText('description', clean(item.description) || '—');
    setDetailText('updatedAt', dpart(item.updatedAt) || '—');
    setDetailText('updatedAtFooter', dpart(item.updatedAt) || '—');

    renderFullView(item);
  }

  function renderFullView(item) {
    if (!item) return;
    var fvWid = document.getElementById('wbs-fv-wid');
    var fvTitle = document.getElementById('wbs-fv-title');
    var fvMeta = document.getElementById('wbs-fv-meta');
    var fvBody = document.getElementById('wbs-fv-body');
    if (fvWid) fvWid.textContent = clean(item.code) || '—';
    if (fvTitle) fvTitle.textContent = clean(item.title) || '(제목 없음)';
    if (fvMeta) {
      var status = statusInfo(item.status);
      var priority = priorityInfo(item.priority);
      fvMeta.innerHTML = '<span class="wbs-chip ' + status.cls + '">' + esc(status.label) + '</span>' +
        '<span class="wbs-prio ' + priority.cls + '"><span class="wbs-prio-dot"></span>' + esc(priority.label) + '</span>';
    }
    if (fvBody && window.STAM && window.STAM.wbsUi && typeof window.STAM.wbsUi.buildFullViewDetail === 'function') {
      fvBody.innerHTML = window.STAM.wbsUi.buildFullViewDetail(item);
    } else if (fvBody) {
      fvBody.innerHTML = '<div class="wbs-iv-muted">—</div>';
    }
  }

  function openDetailById(id) {
    var svc = service();
    if (!id || !state.projectId || !svc || typeof svc.getById !== 'function') return Promise.resolve(null);
    return svc.getById(state.projectId, id, serviceContext('wbs-firestore-detail')).then(function (item) {
      if (item) {
        renderDetail(item);
        if (window.STAM && window.STAM.wbsUi && typeof window.STAM.wbsUi.openDrawer === 'function') {
          window.STAM.wbsUi.openDrawer('detail');
        }
      }
      return item;
    }).catch(function () {
      return null;
    });
  }

  function matchesSearch(item, text) {
    var q = clean(text).toLowerCase();
    if (!q) return true;
    var fields = [
      item.code, item.title, item.ownerName, item.reviewerName,
      item.businessArea, item.functionGroup, item.screenPath,
      item.requirementCode, item.requirementTitle,
      item.functionalSpecCode, item.functionalSpecTitle,
    ];
    return fields.some(function (f) { return clean(f).toLowerCase().indexOf(q) >= 0; });
  }

  function matchesFilters(item, values) {
    var v = values || {};
    if (v.status && v.status.length) {
      var st = clean(item.status).toLowerCase();
      if (v.status.indexOf(st) < 0) return false;
    }
    if (v.priority && v.priority.length) {
      var pr = clean(item.priority).toLowerCase();
      if (v.priority.indexOf(pr) < 0) return false;
    }
    if (v.phase && v.phase.length) {
      if (v.phase.indexOf(clean(item.phase)) < 0) return false;
    }
    if (v.group && v.group.length) {
      if (v.group.indexOf(clean(item.functionGroup)) < 0) return false;
    }
    if (v.owner && v.owner.length) {
      if (v.owner.indexOf(clean(item.ownerId)) < 0) return false;
    }
    return true;
  }

  function applyFilters() {
    var list = state.items || [];
    var filtered = list.filter(function (item) {
      if (state.myOnly && clean(item.ownerId) !== clean(state.user && state.user.uid)) return false;
      if (state.riskOnly && !isItemDelayed(item, todayIso())) return false;
      if (!matchesSearch(item, state.searchText)) return false;
      if (!matchesFilters(item, state.filterValues)) return false;
      return true;
    });
    state.filteredItems = filtered.slice();
    renderRows(filtered);
    renderKpis(filtered);
    renderTimelineSummary(filtered);
    var count = document.querySelector('.stam-board-count');
    if (count) {
      count.innerHTML = '총 <b>' + list.length + '</b>건 중 <b>' + filtered.length + '</b>건 표시';
    }
  }

  function updateFilterOptions() {
    var api = window.STAM && window.STAM.wbsUi && window.STAM.wbsUi.filterApi;
    if (!api || typeof api.setGroupOptions !== 'function') return;
    var groups = {};
    var owners = {};
    (state.items || []).forEach(function (item) {
      var g = clean(item.functionGroup);
      if (g) groups[g] = { value: g, label: g };
      var oid = clean(item.ownerId);
      var oname = clean(item.ownerName);
      if (oid) owners[oid] = { value: oid, label: oname || oid, avatar: oname.charAt(0) || '?' };
    });
    api.setGroupOptions('group', Object.keys(groups).sort().map(function (k) { return groups[k]; }));
    api.setGroupOptions('owner', Object.keys(owners).sort(function (a, b) {
      return (owners[a].label || '').localeCompare(owners[b].label || '');
    }).map(function (k) { return owners[k]; }));
  }

  function bindFilterEvents() {
    if (filterBound) return;
    filterBound = true;
    var searchInput = document.querySelector('.wbs-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchText = clean(searchInput.value);
        applyFilters();
      });
    }
    var myBtn = document.getElementById('wbs-my-btn');
    if (myBtn) {
      myBtn.addEventListener('click', function () {
        state.myOnly = !state.myOnly;
        myBtn.classList.toggle('active', state.myOnly);
        applyFilters();
      });
    }
    var riskBtn = document.getElementById('wbs-risk-btn');
    if (riskBtn) {
      riskBtn.addEventListener('click', function () {
        state.riskOnly = !state.riskOnly;
        riskBtn.classList.toggle('active', state.riskOnly);
        applyFilters();
      });
    }
    var resetBtn = document.querySelector('.wbs-filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.searchText = '';
        state.myOnly = false;
        state.riskOnly = false;
        state.filterValues = {};
        if (searchInput) searchInput.value = '';
        if (myBtn) myBtn.classList.remove('active');
        if (riskBtn) riskBtn.classList.remove('active');
        var api = window.STAM && window.STAM.wbsUi && window.STAM.wbsUi.filterApi;
        if (api && typeof api.reset === 'function') api.reset();
        applyFilters();
      });
    }
    var applyBtn = document.getElementById('wbs-fp-apply');
    if (applyBtn && !applyBtn.getAttribute('data-wbs-filter-bound')) {
      applyBtn.setAttribute('data-wbs-filter-bound', '1');
      applyBtn.addEventListener('click', function () {
        var api = window.STAM && window.STAM.wbsUi && window.STAM.wbsUi.filterApi;
        state.filterValues = api && typeof api.getValues === 'function' ? api.getValues() : {};
        applyFilters();
      });
    }
  }

  function updateMasterCheckbox() {
    var masterChk = document.getElementById('wbs-chk-all');
    if (!masterChk) return;
    var all = document.querySelectorAll('.wbs-row-chk');
    var checked = document.querySelectorAll('.wbs-row-chk:checked');
    if (!all.length) {
      masterChk.checked = false;
      masterChk.indeterminate = false;
      return;
    }
    if (!checked.length) {
      masterChk.checked = false;
      masterChk.indeterminate = false;
    } else if (checked.length === all.length) {
      masterChk.checked = true;
      masterChk.indeterminate = false;
    } else {
      masterChk.checked = false;
      masterChk.indeterminate = true;
    }
  }

  function bindRowEvents() {
    if (rowEventsBound) return;
    rowEventsBound = true;
    var table = tableEl();
    if (!table) return;
    table.addEventListener('click', function (event) {
      var chk = event.target.closest && event.target.closest('.wbs-row-chk');
      if (chk) {
        event.stopPropagation();
        var row = chk.closest('.wbs-data-row');
        if (row) {
          row.classList.toggle('selected', chk.checked);
          row.classList.toggle('is-selected', chk.checked);
        }
        updateMasterCheckbox();
        return;
      }
      if (event.target.closest && event.target.closest('.wbs-td-chk')) return;
      var row = event.target.closest('.wbs-data-row');
      if (!row) return;
      document.querySelectorAll('.wbs-data-row.is-active').forEach(function (r) {
        if (r !== row) r.classList.remove('is-active');
      });
      row.classList.add('is-active');
      var id = clean(row.getAttribute('data-wbs-item-id'));
      openDetailById(id);
    }, true);

    var masterChk = document.getElementById('wbs-chk-all');
    if (masterChk) {
      masterChk.addEventListener('change', function () {
        var checked = masterChk.checked;
        document.querySelectorAll('.wbs-row-chk').forEach(function (c) {
          c.checked = checked;
          var r = c.closest('.wbs-data-row');
          if (r) {
            r.classList.toggle('selected', checked);
            r.classList.toggle('is-selected', checked);
          }
        });
      });
    }
  }

  function refreshCrudAccessUI() {
    var crud = window.STAM && window.STAM.wbsFirestoreCrud;
    if (crud && typeof crud.applyWriteAccessUI === 'function') crud.applyWriteAccessUI();
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
      return svc.listByProject(projectId, DEFAULT_QUERY, serviceContext('wbs-firestore-list'));
    }).then(function (items) {
      if (seq !== loadSeq) return state.items;
      var list = sortItemsForDisplay(
        (items || []).filter(function (item) { return item && item.isDeleted !== true; })
      );
      state.items = list;
      state.filteredItems = list.slice();
      updateFilterOptions();
      applyFilters();
      bindRowEvents();
      bindFilterEvents();
      refreshCrudAccessUI();
      return list;
    }).catch(function () {
      state.items = [];
      renderError();
      refreshCrudAccessUI();
      return [];
    });
  }

  function getStateCopy() {
    return {
      projectId: state.projectId,
      project: state.project ? Object.assign({}, state.project) : null,
      member: state.member ? Object.assign({}, state.member) : null,
      user: state.user ? { uid: state.user.uid, displayName: state.user.displayName, email: state.user.email } : null,
      items: state.items.slice(),
      filteredItems: state.filteredItems.slice(),
      currentItem: state.currentItem ? Object.assign({}, state.currentItem) : null,
      filterValues: Object.assign({}, state.filterValues),
      searchText: state.searchText,
      myOnly: state.myOnly,
      riskOnly: state.riskOnly,
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.wbsFirestoreList = {
    load: load,
    getState: getStateCopy,
    serviceContext: serviceContext,
    openDetailById: openDetailById,
    renderDetail: renderDetail,
    applyFilters: applyFilters,
    formatLocalDate: formatLocalDate,
    weekBoundsLocal: weekBoundsLocal,
    deriveScheduleState: deriveScheduleState,
    isItemDelayed: isItemDelayed,
    dominantStatus: dominantStatus,
    computeKpis: computeKpis,
    computeTimelineSummary: computeTimelineSummary,
    groupItems: groupItems,
    guardProjectAccess: guardProjectAccess,
    bindAuthorizedService: bindAuthorizedService,
    resolveProjectId: resolveProjectId,
    renderRows: renderRows,
    renderTimelineSummary: renderTimelineSummary,
    statusInfo: statusInfo,
    priorityInfo: priorityInfo,
  };

  ready(function () {
    if (isLiveMode()) load();
  });
}());
