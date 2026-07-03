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
  var DEFAULT_QUERY = { includeDeleted: false };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
    });
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

  function service() {
    return window.STAM && window.STAM.requirementsService;
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
    var code = clean(item.code) || clean(item.id) || 'REQ';
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

  function messageRow(title, desc) {
    return '<tr class="rq-empty-row"><td colspan="9">' +
      '<div>' +
      '<div>' + esc(title) + '</div>' +
      '<div>' + esc(desc) + '</div>' +
      '</div></td></tr>';
  }

  function renderRows(items) {
    var body = tbody();
    if (!body) return;
    if (!items.length) {
      body.innerHTML = messageRow('아직 등록된 요구사항이 없습니다.', '현재 프로젝트의 Firestore requirements 목록이 비어 있습니다.');
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
    var body = tbody();
    if (body) body.innerHTML = messageRow('요구사항을 불러오는 중입니다.', 'Firestore requirements 목록을 읽고 있습니다.');
  }

  function renderError(message) {
    var body = tbody();
    if (body) body.innerHTML = messageRow('요구사항을 불러오지 못했습니다.', message || '잠시 후 다시 시도해 주세요.');
    setSummary([]);
    refreshBoardList();
  }

  function load() {
    var projectId = resolveProjectId();
    var svc = service();
    renderLoading();

    if (!projectId) {
      renderError('projectId가 없어 목록을 조회할 수 없습니다.');
      return Promise.resolve([]);
    }
    if (!svc || typeof svc.listByProject !== 'function') {
      renderError('Requirement Service를 사용할 수 없습니다.');
      return Promise.resolve([]);
    }

    return authReady().then(function (user) {
      var activeUser = user || currentUser();
      var context = {
        actorUid: activeUser && activeUser.uid,
        actorName: activeUser && (activeUser.displayName || activeUser.email),
        source: 'requirements-firestore-list',
      };
      return svc.listByProject(projectId, DEFAULT_QUERY, context);
    }).then(function (items) {
      var list = (items || []).filter(function (item) { return item && item.isDeleted !== true; });
      renderRows(list);
      setSummary(list);
      return list;
    }).catch(function (err) {
      renderError(err && err.message);
      return [];
    });
  }

  window.STAM = window.STAM || {};
  window.STAM.requirementsFirestoreList = {
    load: load,
    renderRows: renderRows,
    setSummary: setSummary,
    resolveProjectId: resolveProjectId,
    statusInfo: statusInfo,
    priorityInfo: priorityInfo,
  };

  ready(load);
}());
