/* ============================================================================
 * STAM Requirements Firestore CRUD UI Wiring (PR #360)
 * ----------------------------------------------------------------------------
 * Wires requirements.html register/edit drawers to STAM.requirementsService.
 *   - create / update via service boundary (no direct Firestore paths)
 *   - owner/admin/editor write; viewer read-only UI
 *   - delete remains closed (buttons disabled, no softDelete calls)
 *   - related artifact persistence NOT wired (other deliverables write closed)
 * List read/detail: stam.requirements-firestore-list.js
 * ========================================================================== */
(function () {
  'use strict';

  var DELETE_DENIED_MSG = '요구사항 삭제는 아직 지원되지 않습니다.';
  var WRITE_DENIED_MSG = '이 프로젝트에서는 요구사항 등록·수정 권한이 없습니다. (viewer)';

  var STATUS_KO_TO_DOMAIN = {
    '작성중': { status: 'draft', reviewStatus: 'Review Needed' },
    '검토요청': { status: 'review', reviewStatus: 'In Review' },
    '검토완료': { status: 'review', reviewStatus: 'Approved' },
    '승인완료': { status: 'approved', reviewStatus: 'Approved' },
    '보류': { status: 'archived', reviewStatus: 'Rejected' },
  };

  var PRIORITY_KO_TO_DOMAIN = {
    '높음': 'high',
    '보통': 'normal',
    '낮음': 'low',
  };

  var PRIORITY_DOMAIN_TO_KO = {
    critical: '높음',
    high: '높음',
    normal: '보통',
    low: '낮음',
  };

  var APPROVAL_KO_TO_DOMAIN = {
    '미승인': 'none',
    '승인완료': 'approved',
    '반려': 'rejected',
  };

  var APPROVAL_DOMAIN_TO_KO = {
    none: '미승인',
    approved: '승인완료',
    rejected: '반려',
    pending: '미승인',
  };

  function listApi() {
    return window.STAM && window.STAM.requirementsFirestoreList;
  }

  function contract() {
    return window.STAM && window.STAM.requirementsServiceContract;
  }

  function service() {
    return window.STAM && window.STAM.requirementsService;
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function memberRole() {
    var api = listApi();
    if (!api || typeof api.getState !== 'function') return '';
    var snapshot = api.getState();
    return snapshot && snapshot.member ? clean(snapshot.member.role) : '';
  }

  function canWrite() {
    var roleContract = contract();
    if (!roleContract || typeof roleContract.canWriteRequirements !== 'function') return true;
    return roleContract.canWriteRequirements(memberRole());
  }

  function writeGuard() {
    var api = listApi();
    if (!api || typeof api.getState !== 'function') {
      alert(WRITE_DENIED_MSG);
      return null;
    }

    var snapshot = api.getState() || {};
    var role = clean(snapshot.member && snapshot.member.role).toLowerCase();
    var projectId = clean(snapshot.projectId);

    if (!projectId) {
      alert('프로젝트를 선택한 뒤 다시 시도하세요.');
      return null;
    }

    if (['owner', 'admin', 'editor'].indexOf(role) < 0) {
      alert(WRITE_DENIED_MSG);
      return null;
    }

    return {
      snapshot: snapshot,
      projectId: projectId,
      memberRole: role
    };
  }

  function serviceContext(source) {
    var api = listApi();
    if (api && typeof api.serviceContext === 'function') {
      return api.serviceContext(source);
    }
    return { source: source || 'requirements-firestore-crud' };
  }

  function fieldByLabel(scope, label) {
    if (!scope) return null;
    var fields = scope.querySelectorAll('.rq-ffield');
    for (var i = 0; i < fields.length; i++) {
      var lbl = fields[i].querySelector('.rq-flbl');
      if (lbl && lbl.textContent.trim().indexOf(label) === 0) {
        return fields[i].querySelector('input, select, textarea');
      }
    }
    return null;
  }

  function getVal(scope, label) {
    var el = fieldByLabel(scope, label);
    return el ? clean(el.value) : '';
  }

  function setVal(scope, label, val) {
    var el = fieldByLabel(scope, label);
    if (!el) return;
    if (el.tagName === 'SELECT') {
      setSelect(el, val);
      return;
    }
    el.value = val == null ? '' : val;
  }

  function setSelect(sel, val) {
    var found = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === val || clean(sel.options[i].textContent) === clean(val)) {
        sel.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) sel.selectedIndex = 0;
    syncCustomSelect(sel);
  }

  function syncCustomSelect(sel) {
    if (!window.STAM || !window.STAM.customSelect) return;
    var wrap = sel.closest('.rq-cs');
    if (!wrap) return;
    var opt = sel.options[sel.selectedIndex];
    var valEl = wrap.querySelector('.rq-cs-val');
    if (valEl) {
      valEl.textContent = opt ? opt.textContent : '';
      valEl.classList.toggle('is-placeholder', !!(opt && opt.value === ''));
    }
    wrap.querySelectorAll('.rq-cs-opt').forEach(function (node, index) {
      node.classList.toggle('is-selected', index === sel.selectedIndex);
    });
  }

  function statusFromKo(ko) {
    return STATUS_KO_TO_DOMAIN[ko] || STATUS_KO_TO_DOMAIN['작성중'];
  }

  function statusToKo(item) {
    var api = listApi();
    if (api && typeof api.statusInfo === 'function') {
      return api.statusInfo(item).label;
    }
    return '작성중';
  }

  function priorityFromKo(ko) {
    return PRIORITY_KO_TO_DOMAIN[ko] || 'normal';
  }

  function priorityToKo(item) {
    var api = listApi();
    if (api && typeof api.priorityInfo === 'function') {
      return api.priorityInfo(item).label;
    }
    return '보통';
  }

  function approvalFromKo(ko) {
    return APPROVAL_KO_TO_DOMAIN[ko] || 'none';
  }

  function approvalToKo(value) {
    return APPROVAL_DOMAIN_TO_KO[clean(value).toLowerCase()] || '미승인';
  }

  function setButtonDisabled(el, disabled, title) {
    if (!el) return;
    el.disabled = !!disabled;
    if (disabled && title) el.setAttribute('title', title);
    else el.removeAttribute('title');
    el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  function applyWriteAccessUI() {
    var writable = canWrite();
    setButtonDisabled(document.getElementById('rq-reg-btn'), !writable, WRITE_DENIED_MSG);
    setButtonDisabled(document.querySelector('#rq-dw-detail [data-rq-open="edit"]'), !writable, WRITE_DENIED_MSG);
    setButtonDisabled(document.getElementById('rq-del-btn'), true, DELETE_DENIED_MSG);
    setButtonDisabled(document.getElementById('rq-det-del-btn'), true, DELETE_DENIED_MSG);
  }

  function closeDrawersAndRefresh() {
    var scrim = document.getElementById('rq-scrim');
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.rq-drawer').forEach(function (drawer) {
      drawer.classList.remove('open');
    });
    var root = document.querySelector('[data-stam-board-list]');
    if (root && window.STAMBoardList && typeof window.STAMBoardList.clearActive === 'function') {
      window.STAMBoardList.clearActive(root);
    }
    var api = listApi();
    if (api && typeof api.load === 'function') {
      return api.load();
    }
    return Promise.resolve();
  }

  function resetRegister() {
    var regDrawer = document.getElementById('rq-dw-register');
    if (!regDrawer) return;
    var idInput = fieldByLabel(regDrawer, '요구사항 ID');
    if (idInput) idInput.value = '(저장 시 자동 부여)';
    ['유형', '우선순위', '상태', '승인 상태'].forEach(function (label) {
      var select = fieldByLabel(regDrawer, label);
      if (select && select.tagName === 'SELECT') {
        select.selectedIndex = 0;
        syncCustomSelect(select);
      }
    });
    ['요구사항명', '담당자', '배경', '상세 요구사항', '수용 조건', '관련 메뉴 경로', '검토자', '검토 메모'].forEach(function (label) {
      setVal(regDrawer, label, '');
    });
  }

  function buildCreateInput(regDrawer) {
    var title = getVal(regDrawer, '요구사항명');
    var description = getVal(regDrawer, '상세 요구사항');
    var koStatus = getVal(regDrawer, '상태') || '작성중';
    var mapped = statusFromKo(koStatus);
    var ownerName = getVal(regDrawer, '담당자');
    var approvalKo = getVal(regDrawer, '승인 상태');
    return {
      title: title,
      description: description || getVal(regDrawer, '배경'),
      status: mapped.status,
      priority: priorityFromKo(getVal(regDrawer, '우선순위') || '보통'),
      ownerName: ownerName,
      reviewStatus: mapped.reviewStatus,
      approvalStatus: approvalFromKo(approvalKo),
      tags: [],
    };
  }

  function submitRegister() {
    var guard = writeGuard();
    if (!guard) return Promise.resolve();
    var regDrawer = document.getElementById('rq-dw-register');
    var svc = service();
    if (!regDrawer || !svc || typeof svc.create !== 'function') return Promise.resolve();
    var projectId = guard.projectId;

    var title = getVal(regDrawer, '요구사항명');
    var description = getVal(regDrawer, '상세 요구사항');
    if (!title) {
      alert('요구사항명을 입력하세요.');
      return Promise.resolve();
    }
    if (title.length < 2) {
      alert('요구사항명은 2자 이상 입력하세요.');
      return Promise.resolve();
    }
    if (!description) {
      alert('상세 요구사항을 입력하세요.');
      return Promise.resolve();
    }

    var input = buildCreateInput(regDrawer);
    var context = serviceContext('requirements-firestore-create');
    return svc.create(projectId, input, context).then(function () {
      return closeDrawersAndRefresh();
    }).catch(function (err) {
      console.error('[stam.requirements-firestore-crud] create', err);
      alert('등록 오류: ' + (err && err.message ? err.message : err));
    });
  }

  function prefillEdit(item) {
    var editDrawer = document.getElementById('rq-dw-edit');
    if (!editDrawer || !item) return;
    var code = clean(item.code) || clean(item.id) || 'REQ';
    var sumId = editDrawer.querySelector('.rq-edit-sum-id');
    if (sumId) sumId.textContent = code;
    var badge = editDrawer.querySelector('.rq-req-badge');
    if (badge) badge.textContent = code;
    var titleEl = editDrawer.querySelector('.rq-dw-htitle');
    if (titleEl) titleEl.textContent = clean(item.title) || '(제목 없음)';
    setVal(editDrawer, '요구사항 ID', code);
    setVal(editDrawer, '유형', clean(item.requirementType || item.type || item.category || '기능') || '기능');
    setVal(editDrawer, '요구사항명', item.title || '');
    setVal(editDrawer, '우선순위', priorityToKo(item));
    setVal(editDrawer, '상태', statusToKo(item));
    setVal(editDrawer, '담당자', clean(item.ownerName || item.ownerUid) || '');
    setVal(editDrawer, '배경', item.background || '');
    setVal(editDrawer, '상세 요구사항', item.description || '');
    setVal(editDrawer, '수용 조건', item.acceptanceCriteria || '');
    setVal(editDrawer, '관련 메뉴 경로', item.menuPath || '');
    setVal(editDrawer, '검토자', item.reviewer || '');
    setVal(editDrawer, '승인 상태', approvalToKo(item.approvalStatus));
    setVal(editDrawer, '검토 메모', item.reviewNote || '');
  }

  function buildUpdatePatch(editDrawer) {
    var koStatus = getVal(editDrawer, '상태') || '작성중';
    var mapped = statusFromKo(koStatus);
    return {
      title: getVal(editDrawer, '요구사항명'),
      description: getVal(editDrawer, '상세 요구사항'),
      status: mapped.status,
      priority: priorityFromKo(getVal(editDrawer, '우선순위') || '보통'),
      ownerName: getVal(editDrawer, '담당자'),
      reviewStatus: mapped.reviewStatus,
      approvalStatus: approvalFromKo(getVal(editDrawer, '승인 상태')),
    };
  }

  function submitEdit() {
    var guard = writeGuard();
    if (!guard) return Promise.resolve();
    var editDrawer = document.getElementById('rq-dw-edit');
    var svc = service();
    if (!editDrawer || !svc || typeof svc.update !== 'function') return Promise.resolve();
    var projectId = guard.projectId;
    var item = guard.snapshot.currentItem;
    if (!projectId || !item || !item.id) {
      alert('수정할 요구사항을 다시 선택하세요.');
      return Promise.resolve();
    }

    var title = getVal(editDrawer, '요구사항명');
    var description = getVal(editDrawer, '상세 요구사항');
    if (!title) {
      alert('요구사항명을 입력하세요.');
      return Promise.resolve();
    }
    if (title.length < 2) {
      alert('요구사항명은 2자 이상 입력하세요.');
      return Promise.resolve();
    }
    if (!description) {
      alert('상세 요구사항을 입력하세요.');
      return Promise.resolve();
    }

    var patch = buildUpdatePatch(editDrawer);
    var context = serviceContext('requirements-firestore-update');
    return svc.update(projectId, item.id, patch, context).then(function () {
      return closeDrawersAndRefresh();
    }).catch(function (err) {
      console.error('[stam.requirements-firestore-crud] update', err);
      alert('저장 오류: ' + (err && err.message ? err.message : err));
    });
  }

  function bindDeleteGuards() {
    ['rq-del-btn', 'rq-det-del-btn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.getAttribute('data-rq-delete-guard') === '1') return;
      btn.setAttribute('data-rq-delete-guard', '1');
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        alert(DELETE_DENIED_MSG);
      });
    });
  }

  function bindCrudHandlers() {
    var regDrawer = document.getElementById('rq-dw-register');
    var editDrawer = document.getElementById('rq-dw-edit');
    var regBtn = document.getElementById('rq-reg-btn');

    if (regBtn && regBtn.getAttribute('data-rq-crud-bound') !== '1') {
      regBtn.setAttribute('data-rq-crud-bound', '1');
      regBtn.addEventListener('click', function () {
        if (!canWrite()) return;
        setTimeout(resetRegister, 0);
      });
    }

    if (regDrawer) {
      var regSubmit = regDrawer.querySelector('.stam-dw-foot-right .rq-btn-pri');
      if (regSubmit && regSubmit.getAttribute('data-rq-crud-bound') !== '1') {
        regSubmit.setAttribute('data-rq-crud-bound', '1');
        regSubmit.addEventListener('click', submitRegister);
      }
    }

    if (editDrawer) {
      var editSubmit = editDrawer.querySelector('.stam-dw-foot-right .rq-btn-pri');
      if (editSubmit && editSubmit.getAttribute('data-rq-crud-bound') !== '1') {
        editSubmit.setAttribute('data-rq-crud-bound', '1');
        editSubmit.addEventListener('click', submitEdit);
      }
    }

    document.querySelectorAll('[data-rq-open="edit"]').forEach(function (btn) {
      if (btn.getAttribute('data-rq-crud-bound') === '1') return;
      btn.setAttribute('data-rq-crud-bound', '1');
      btn.addEventListener('click', function () {
        if (!canWrite()) return;
        var api = listApi();
        var item = api && typeof api.getState === 'function' ? api.getState().currentItem : null;
        if (item) setTimeout(function () { prefillEdit(item); }, 0);
      });
    });

    bindDeleteGuards();
    applyWriteAccessUI();
  }

  function hookListLoad() {
    var api = listApi();
    if (!api || typeof api.load !== 'function' || api.load.__rqCrudHooked) return;
    var originalLoad = api.load;
    api.load = function rqCrudLoad() {
      return originalLoad().then(function (items) {
        applyWriteAccessUI();
        return items;
      });
    };
    api.load.__rqCrudHooked = true;
  }

  function init() {
    hookListLoad();
    bindCrudHandlers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.STAM = window.STAM || {};
  window.STAM.requirementsFirestoreCrud = {
    applyWriteAccessUI: applyWriteAccessUI,
    submitRegister: submitRegister,
    submitEdit: submitEdit,
    prefillEdit: prefillEdit,
    canWrite: canWrite,
    writeGuard: writeGuard,
    memberRole: memberRole,
  };
}());
