/* ============================================================================
 * STAM Functional Specification Firestore CRUD UI Wiring (FS-5)
 * ----------------------------------------------------------------------------
 * Wires functional-specification.html register/edit drawers to
 * STAM.functionalSpecService create/update.
 *   - owner/admin/editor write; viewer read-only UI
 *   - delete remains closed (buttons visible + disabled)
 * List read/detail: stam.functional-spec-firestore-list.js
 * ========================================================================== */
(function () {
  'use strict';

  var DELETE_DENIED_MSG = '기능정의서 삭제는 아직 지원되지 않습니다.';
  var WRITE_DENIED_MSG = '이 프로젝트에서는 기능정의서 등록·수정 권한이 없습니다. (viewer)';

  var STATUS_KO_TO_DOMAIN = {
    '작성중': { status: 'draft', reviewStatus: 'Review Needed' },
    '검토요청': { status: 'review', reviewStatus: 'In Review' },
    '검토완료': { status: 'done', reviewStatus: 'Approved' },
    '승인완료': { status: 'approved', reviewStatus: 'Approved' },
    '보류': { status: 'hold', reviewStatus: 'On Hold' },
  };

  var PRIORITY_KO_TO_DOMAIN = {
    '높음': 'high',
    '중간': 'mid',
    '낮음': 'low',
  };

  var FUNCTION_TYPE_KO_TO_DOMAIN = {
    '조회': 'view',
    '등록': 'create',
    '수정': 'update',
    '삭제': 'delete',
    '승인': 'approve',
    '알림': 'notify',
    '내보내기': 'export',
    '연동': 'integrate',
  };

  var FUNCTION_TYPE_DOMAIN_TO_KO = {
    view: '조회',
    create: '등록',
    update: '수정',
    delete: '삭제',
    approve: '승인',
    notify: '알림',
    export: '내보내기',
    integrate: '연동',
  };

  function listApi() {
    return window.STAM && window.STAM.functionalSpecFirestoreList;
  }

  function contract() {
    return window.STAM && window.STAM.functionalSpecServiceContract;
  }

  function service() {
    return window.STAM && window.STAM.functionalSpecService;
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
    if (!roleContract || typeof roleContract.canWriteFunctionalSpecs !== 'function') return false;
    return roleContract.canWriteFunctionalSpecs(memberRole());
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
      memberRole: role,
    };
  }

  function serviceContext(source) {
    var api = listApi();
    if (api && typeof api.serviceContext === 'function') {
      return api.serviceContext(source);
    }
    return { source: source || 'functional-spec-firestore-crud' };
  }

  function requirementPickerEl(scope) {
    if (!scope) return null;
    var field = null;
    var fields = scope.querySelectorAll('.fn-ffield');
    for (var i = 0; i < fields.length; i++) {
      var lbl = fields[i].querySelector('.fn-flbl');
      if (lbl && lbl.textContent.trim().indexOf('연결 요구사항') === 0) {
        field = fields[i];
        break;
      }
    }
    return field ? field.querySelector('[data-stam-requirement-picker]') : null;
  }

  function requirementPickerApi() {
    return window.STAM && window.STAM.requirementPicker;
  }

  function refreshRequirementPickerContext() {
    var api = requirementPickerApi();
    if (!api || typeof api.refreshContext !== 'function') return;
    var list = listApi();
    var snapshot = list && typeof list.getState === 'function' ? list.getState() : {};
    var options = {
      projectId: clean(snapshot.projectId),
      memberRole: clean(snapshot.member && snapshot.member.role),
      context: serviceContext('functional-spec-requirement-picker'),
    };
    document.querySelectorAll('[data-stam-requirement-picker]').forEach(function (container) {
      api.refreshContext(container, options);
    });
  }

  function getRequirementSelection(scope) {
    var api = requirementPickerApi();
    var picker = requirementPickerEl(scope);
    if (!api || !picker || typeof api.getValue !== 'function') {
      return { requirementId: '', requirementCode: '', requirementTitle: '' };
    }
    return api.getValue(picker);
  }

  function setRequirementSelection(scope, item) {
    var api = requirementPickerApi();
    var picker = requirementPickerEl(scope);
    if (!api || !picker || typeof api.setValue !== 'function') return;
    if (!item || (!clean(item.requirementId) && !clean(item.requirementCode))) {
      api.clear(picker);
      return;
    }
    api.setValue(picker, {
      requirementId: clean(item.requirementId),
      requirementCode: clean(item.requirementCode),
      requirementTitle: clean(item.requirementTitle),
    });
  }

  function clearRequirementSelection(scope) {
    var api = requirementPickerApi();
    var picker = requirementPickerEl(scope);
    if (!api || !picker || typeof api.clear !== 'function') return;
    api.clear(picker);
  }

  function applyRequirementPickerDisabled() {
    var api = requirementPickerApi();
    if (!api || typeof api.setDisabled !== 'function') return;
    var writable = canWrite();
    document.querySelectorAll('[data-stam-requirement-picker]').forEach(function (container) {
      api.setDisabled(container, !writable);
    });
  }
  function fieldByLabel(scope, label) {
    if (!scope) return null;
    var fields = scope.querySelectorAll('.fn-ffield');
    for (var i = 0; i < fields.length; i++) {
      var lbl = fields[i].querySelector('.fn-flbl');
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
    var wrap = sel.closest('.fn-cs');
    if (!wrap) return;
    var opt = sel.options[sel.selectedIndex];
    var valEl = wrap.querySelector('.fn-cs-val');
    if (valEl) {
      valEl.textContent = opt ? opt.textContent : '';
      valEl.classList.toggle('is-placeholder', !!(opt && opt.value === ''));
    }
    wrap.querySelectorAll('.fn-cs-opt').forEach(function (node, index) {
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
    return PRIORITY_KO_TO_DOMAIN[ko] || 'mid';
  }

  function priorityToKo(item) {
    var api = listApi();
    if (api && typeof api.priorityInfo === 'function') {
      return api.priorityInfo(item).label;
    }
    return '중간';
  }

  function functionTypeFromKo(ko) {
    return FUNCTION_TYPE_KO_TO_DOMAIN[ko] || '';
  }

  function functionTypeToKo(item) {
    var raw = clean(item && item.functionType).toLowerCase();
    if (raw && FUNCTION_TYPE_DOMAIN_TO_KO[raw]) return FUNCTION_TYPE_DOMAIN_TO_KO[raw];
    var api = listApi();
    if (api && typeof api.functionTypeLabel === 'function') {
      return api.functionTypeLabel(item);
    }
    return '';
  }

  function functionalSpecDisplayCode(item) {
    var api = listApi();
    if (api && typeof api.formatFunctionalSpecCode === 'function') {
      return api.formatFunctionalSpecCode(item);
    }
    if (item && clean(item.code)) return clean(item.code);
    return '-';
  }

  function ensureClosedDeleteButtonVisible(btn) {
    if (!btn) return;
    btn.classList.add('stam-btn--danger-outline');
    if (btn.id === 'fn-del-btn') {
      btn.classList.add('stam-board-delete', 'stam-delete-btn');
    }
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
    setButtonDisabled(document.getElementById('fn-reg-btn'), !writable, WRITE_DENIED_MSG);
    setButtonDisabled(document.querySelector('#fn-dw-detail [data-fn-open="edit"]'), !writable, WRITE_DENIED_MSG);
    var toolbarDelete = document.getElementById('fn-del-btn');
    var detailDelete = document.getElementById('fn-det-del-btn');
    ensureClosedDeleteButtonVisible(toolbarDelete);
    ensureClosedDeleteButtonVisible(detailDelete);
    setButtonDisabled(toolbarDelete, true, DELETE_DENIED_MSG);
    setButtonDisabled(detailDelete, true, DELETE_DENIED_MSG);
    applyRequirementPickerDisabled();
  }

  function closeDrawersAndRefresh() {
    var scrim = document.getElementById('fn-scrim');
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.fn-drawer').forEach(function (drawer) {
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
    var regDrawer = document.getElementById('fn-dw-register');
    if (!regDrawer) return;
    setVal(regDrawer, '기능 ID', '(저장 시 자동 부여)');
    ['기능유형', '우선순위', '상태', '연결 화면'].forEach(function (label) {
      var select = fieldByLabel(regDrawer, label);
      if (select && select.tagName === 'SELECT') {
        select.selectedIndex = 0;
        syncCustomSelect(select);
      }
    });
    ['기능명', '담당자', '기능 설명', '입력 조건', '처리 규칙', '예외/오류 처리', '관련 API/연동', '비고'].forEach(function (label) {
      setVal(regDrawer, label, '');
    });
    clearRequirementSelection(regDrawer);
  }

  function buildCreateInput(regDrawer) {
    var koStatus = getVal(regDrawer, '상태') || '작성중';
    var mapped = statusFromKo(koStatus);
    var ownerName = getVal(regDrawer, '담당자');
    var req = getRequirementSelection(regDrawer);
    var input = {
      title: getVal(regDrawer, '기능명'),
      status: mapped.status,
      priority: priorityFromKo(getVal(regDrawer, '우선순위') || '중간'),
      functionType: functionTypeFromKo(getVal(regDrawer, '기능유형')),
      ownerName: ownerName,
      reviewStatus: mapped.reviewStatus,
      linkedScreen: getVal(regDrawer, '연결 화면'),
      description: getVal(regDrawer, '기능 설명'),
      inputSpec: getVal(regDrawer, '입력 조건'),
      businessRule: getVal(regDrawer, '처리 규칙'),
      exceptionRule: getVal(regDrawer, '예외/오류 처리'),
      apiRef: getVal(regDrawer, '관련 API/연동'),
      note: getVal(regDrawer, '비고'),
    };
    if (clean(req.requirementId) || clean(req.requirementCode)) {
      input.requirementId = clean(req.requirementId);
      input.requirementCode = clean(req.requirementCode);
      input.requirementTitle = clean(req.requirementTitle);
    }
    return input;
  }

  function submitRegister() {
    var guard = writeGuard();
    if (!guard) return Promise.resolve();
    var regDrawer = document.getElementById('fn-dw-register');
    var svc = service();
    if (!regDrawer || !svc || typeof svc.create !== 'function') return Promise.resolve();
    var projectId = guard.projectId;

    var title = getVal(regDrawer, '기능명');
    if (!title) {
      alert('기능명을 입력하세요.');
      return Promise.resolve();
    }
    if (title.length < 2) {
      alert('기능명은 2자 이상 입력하세요.');
      return Promise.resolve();
    }

    var input = buildCreateInput(regDrawer);
    var context = serviceContext('functional-spec-firestore-create');
    return svc.create(projectId, input, context).then(function () {
      return closeDrawersAndRefresh();
    }).catch(function (err) {
      console.error('[stam.functional-spec-firestore-crud] create', err);
      alert('등록 오류: ' + (err && err.message ? err.message : err));
    });
  }

  function prefillEdit(item) {
    var editDrawer = document.getElementById('fn-dw-edit');
    if (!editDrawer || !item) return;
    var code = functionalSpecDisplayCode(item);
    var sumId = editDrawer.querySelector('.fn-edit-sum-id');
    if (sumId) sumId.textContent = code;
    var badge = editDrawer.querySelector('.fn-fn-badge');
    if (badge) badge.textContent = code;
    var titleEl = editDrawer.querySelector('.fn-dw-htitle');
    if (titleEl) titleEl.textContent = clean(item.title) || '(제목 없음)';
    setVal(editDrawer, '기능 ID', code);
    setVal(editDrawer, '기능유형', functionTypeToKo(item));
    setVal(editDrawer, '기능명', item.title || '');
    setVal(editDrawer, '우선순위', priorityToKo(item));
    setVal(editDrawer, '상태', statusToKo(item));
    setVal(editDrawer, '담당자', clean(item.ownerName || item.ownerUid) || '');
    setRequirementSelection(editDrawer, item);
    setVal(editDrawer, '연결 화면', item.linkedScreen || '');
    setVal(editDrawer, '기능 설명', item.description || '');
    setVal(editDrawer, '입력 조건', item.inputSpec || '');
    setVal(editDrawer, '처리 규칙', item.businessRule || '');
    setVal(editDrawer, '예외/오류 처리', item.exceptionRule || '');
    setVal(editDrawer, '관련 API/연동', item.apiRef || '');
    setVal(editDrawer, '비고', item.note || '');
  }

  function buildUpdatePatch(editDrawer) {
    var koStatus = getVal(editDrawer, '상태') || '작성중';
    var mapped = statusFromKo(koStatus);
    var req = getRequirementSelection(editDrawer);
    var patch = {
      title: getVal(editDrawer, '기능명'),
      status: mapped.status,
      priority: priorityFromKo(getVal(editDrawer, '우선순위') || '중간'),
      functionType: functionTypeFromKo(getVal(editDrawer, '기능유형')),
      ownerName: getVal(editDrawer, '담당자'),
      reviewStatus: mapped.reviewStatus,
      linkedScreen: getVal(editDrawer, '연결 화면'),
      description: getVal(editDrawer, '기능 설명'),
      inputSpec: getVal(editDrawer, '입력 조건'),
      businessRule: getVal(editDrawer, '처리 규칙'),
      exceptionRule: getVal(editDrawer, '예외/오류 처리'),
      apiRef: getVal(editDrawer, '관련 API/연동'),
      note: getVal(editDrawer, '비고'),
      requirementId: clean(req.requirementId),
      requirementCode: clean(req.requirementCode),
      requirementTitle: clean(req.requirementTitle),
    };
    return patch;
  }

  function submitEdit() {
    var guard = writeGuard();
    if (!guard) return Promise.resolve();
    var editDrawer = document.getElementById('fn-dw-edit');
    var svc = service();
    if (!editDrawer || !svc || typeof svc.update !== 'function') return Promise.resolve();
    var projectId = guard.projectId;
    var item = guard.snapshot.currentItem;
    if (!projectId || !item || !item.id) {
      alert('수정할 기능정의서를 다시 선택하세요.');
      return Promise.resolve();
    }

    var title = getVal(editDrawer, '기능명');
    if (!title) {
      alert('기능명을 입력하세요.');
      return Promise.resolve();
    }
    if (title.length < 2) {
      alert('기능명은 2자 이상 입력하세요.');
      return Promise.resolve();
    }

    var patch = buildUpdatePatch(editDrawer);
    var context = serviceContext('functional-spec-firestore-update');
    return svc.update(projectId, item.id, patch, context).then(function () {
      return closeDrawersAndRefresh();
    }).catch(function (err) {
      console.error('[stam.functional-spec-firestore-crud] update', err);
      alert('저장 오류: ' + (err && err.message ? err.message : err));
    });
  }

  function bindDeleteGuards() {
    ['fn-del-btn', 'fn-det-del-btn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.getAttribute('data-fn-delete-guard') === '1') return;
      btn.setAttribute('data-fn-delete-guard', '1');
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        alert(DELETE_DENIED_MSG);
      });
    });
  }

  function bindSelectionAccessRefresh() {
    var root = document.querySelector('[data-stam-board-list]');
    if (!root || root.getAttribute('data-fn-crud-selection-bound') === '1') return;
    root.setAttribute('data-fn-crud-selection-bound', '1');
    root.addEventListener('change', function (event) {
      if (event.target && event.target.matches('.fn-cb')) {
        applyWriteAccessUI();
      }
    });
  }

  function bindCrudHandlers() {
    var regDrawer = document.getElementById('fn-dw-register');
    var editDrawer = document.getElementById('fn-dw-edit');
    var regBtn = document.getElementById('fn-reg-btn');

    if (regBtn && regBtn.getAttribute('data-fn-crud-bound') !== '1') {
      regBtn.setAttribute('data-fn-crud-bound', '1');
      regBtn.addEventListener('click', function () {
        if (!canWrite()) return;
        setTimeout(resetRegister, 0);
      });
    }

    if (regDrawer) {
      var regSubmit = regDrawer.querySelector('.stam-dw-foot-right .fn-btn-pri');
      if (regSubmit && regSubmit.getAttribute('data-fn-crud-bound') !== '1') {
        regSubmit.setAttribute('data-fn-crud-bound', '1');
        regSubmit.addEventListener('click', submitRegister);
      }
    }

    if (editDrawer) {
      var editSubmit = editDrawer.querySelector('.stam-dw-foot-right .fn-btn-pri');
      if (editSubmit && editSubmit.getAttribute('data-fn-crud-bound') !== '1') {
        editSubmit.setAttribute('data-fn-crud-bound', '1');
        editSubmit.addEventListener('click', submitEdit);
      }
    }

    document.querySelectorAll('[data-fn-open="edit"]').forEach(function (btn) {
      if (btn.getAttribute('data-fn-crud-bound') === '1') return;
      btn.setAttribute('data-fn-crud-bound', '1');
      btn.addEventListener('click', function () {
        if (!canWrite()) return;
        var api = listApi();
        var item = api && typeof api.getState === 'function' ? api.getState().currentItem : null;
        if (item) setTimeout(function () { prefillEdit(item); }, 0);
      });
    });

    bindDeleteGuards();
    bindSelectionAccessRefresh();
    applyWriteAccessUI();
  }

  function hookListLoad() {
    var api = listApi();
    if (!api || typeof api.load !== 'function' || api.load.__fnCrudHooked) return;
    var originalLoad = api.load;
    api.load = function fnCrudLoad() {
      return originalLoad().then(function (items) {
        refreshRequirementPickerContext();
        applyWriteAccessUI();
        return items;
      });
    };
    api.load.__fnCrudHooked = true;
  }

  function init() {
    hookListLoad();
    var pickerApi = requirementPickerApi();
    if (pickerApi && typeof pickerApi.initAll === 'function') {
      pickerApi.initAll({
        getProjectId: function () {
          var api = listApi();
          var snapshot = api && typeof api.getState === 'function' ? api.getState() : {};
          return clean(snapshot.projectId);
        },
        getContext: function () {
          return serviceContext('functional-spec-requirement-picker');
        },
        getMemberRole: memberRole,
      });
    }
    bindCrudHandlers();
    refreshRequirementPickerContext();
    applyRequirementPickerDisabled();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.STAM = window.STAM || {};
  window.STAM.functionalSpecFirestoreCrud = {
    applyWriteAccessUI: applyWriteAccessUI,
    submitRegister: submitRegister,
    submitEdit: submitEdit,
    prefillEdit: prefillEdit,
    canWrite: canWrite,
    writeGuard: writeGuard,
    memberRole: memberRole,
  };
}());
