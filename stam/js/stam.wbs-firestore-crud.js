/* ============================================================================
 * STAM WBS Firestore CRUD UI (WBS-4)
 * ----------------------------------------------------------------------------
 * Wires wbs.html register/edit drawers to STAM.wbsService create/update.
 * owner/admin/editor write; viewer read-only UI.
 * List read/detail: stam.wbs-firestore-list.js
 * ========================================================================== */
(function () {
  'use strict';

  var STATUS_KO_TO_DOMAIN = {
    '대기': 'wait',
    '진행중': 'in_progress',
    '지연': 'delayed',
    '완료': 'done',
    '보류': 'hold',
  };

  var PRIORITY_KO_TO_DOMAIN = {
    '높음': 'high',
    '보통': 'mid',
    '낮음': 'low',
  };

  var DOMAIN_STATUS_TO_KO = {
    wait: '대기',
    in_progress: '진행중',
    delayed: '지연',
    done: '완료',
    hold: '보류',
  };

  var DOMAIN_PRIORITY_TO_KO = {
    high: '높음',
    mid: '보통',
    low: '낮음',
  };

  var busy = { create: false, update: false };
  var pickersMounted = false;
  var functionalSpecMounted = false;

  function listApi() {
    return window.STAM && window.STAM.wbsFirestoreList;
  }

  function contract() {
    return window.STAM && window.STAM.wbsServiceContract;
  }

  function service() {
    return window.STAM && window.STAM.wbsService;
  }

  function uiMessages() {
    return window.STAM && window.STAM.uiMessages;
  }

  function wbsUi() {
    return window.STAM && window.STAM.wbsUi;
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
    if (!roleContract || typeof roleContract.canWriteWbs !== 'function') return false;
    return roleContract.canWriteWbs(memberRole());
  }

  function writeGuard() {
    var api = listApi();
    var messages = uiMessages();
    var denied = messages && messages.wbs && messages.wbs.writeDenied;
    if (!api || typeof api.getState !== 'function') {
      alert(denied || '권한이 없습니다.');
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
      alert(denied || '권한이 없습니다.');
      return null;
    }
    return { snapshot: snapshot, projectId: projectId, memberRole: role };
  }

  function serviceContext(source) {
    var api = listApi();
    if (api && typeof api.serviceContext === 'function') {
      return api.serviceContext(source);
    }
    return { source: source || 'wbs-firestore-crud' };
  }

  function formScope(mode) {
    return document.querySelector('[data-stam-wbs-form="' + mode + '"]');
  }

  function fieldEl(scope, name) {
    if (!scope) return null;
    var direct = scope.querySelector('[data-wbs-field="' + name + '"]');
    if (direct) {
      if (direct.matches('input, textarea, select')) return direct;
      return direct.querySelector('input, textarea, select') || direct;
    }
    return null;
  }

  function memberPickerEl(scope, role) {
    if (!scope) return null;
    return scope.querySelector('[data-stam-wbs-member-picker="' + role + '"]');
  }

  function requirementPickerEl(scope) {
    if (!scope) return null;
    var slot = scope.querySelector('[data-stam-wbs-link-slot="requirement"]');
    return slot ? slot.querySelector('[data-stam-requirement-picker]') : null;
  }

  function functionalSpecPickerEl(scope) {
    if (!scope) return null;
    var slot = scope.querySelector('[data-stam-wbs-link-slot="functionalSpec"]');
    return slot ? slot.querySelector('[data-stam-functional-spec-picker]') : null;
  }

  function getFieldValue(scope, name) {
    var ui = wbsUi();
    if (name === 'phase' || name === 'status' || name === 'priority') {
      if (ui && typeof ui.getToggleValue === 'function') {
        var row = scope && scope.querySelector('[data-wbs-field="' + name + '"]');
        if (row) {
          var toggle = ui.getToggleValue(row);
          if (toggle) return toggle;
        }
      }
      if (ui && typeof ui.getSelectValue === 'function' && name === 'phase') {
        var phaseRow = scope && scope.querySelector('[data-wbs-field="phase"]');
        if (phaseRow) return ui.getSelectValue(phaseRow) || '';
      }
    }
    if (name === 'startDate' || name === 'endDate') {
      if (ui && typeof ui.getDateValue === 'function') {
        var dp = scope && scope.querySelector('[data-wbs-field="' + name + '"]');
        if (dp) return ui.getDateValue(dp) || '';
      }
    }
    var el = fieldEl(scope, name);
    return el ? clean(el.value) : '';
  }

  function setFieldValue(scope, name, value) {
    var ui = wbsUi();
    if (name === 'phase') {
      var phaseHost = scope && scope.querySelector('[data-wbs-field="phase"]');
      if (phaseHost && ui && typeof ui.setSelectValue === 'function') {
        ui.setSelectValue(phaseHost, value || '');
        return;
      }
    }
    if (name === 'status' || name === 'priority') {
      var row = scope && scope.querySelector('[data-wbs-field="' + name + '"]');
      if (row && ui && typeof ui.setToggleValue === 'function') {
        ui.setToggleValue(row, value || '');
        return;
      }
    }
    if (name === 'startDate' || name === 'endDate') {
      var dp = scope && scope.querySelector('[data-wbs-field="' + name + '"]');
      if (dp && ui && typeof ui.setDateValue === 'function') {
        ui.setDateValue(dp, value || '');
        return;
      }
    }
    var el = fieldEl(scope, name);
    if (el) el.value = value == null ? '' : value;
  }

  function getMemberValue(scope, role) {
    var api = window.STAM && window.STAM.projectMemberPicker;
    var container = memberPickerEl(scope, role);
    if (!api || !container || typeof api.getValue !== 'function') {
      return role === 'owner' ? { ownerId: '', ownerName: '' } : { reviewerId: '', reviewerName: '' };
    }
    var snap = api.getValue(container);
    if (role === 'owner') {
      return { ownerId: clean(snap.ownerId || snap.uid), ownerName: clean(snap.ownerName || snap.name) };
    }
    return {
      reviewerId: clean(snap.reviewerId || snap.ownerId || snap.uid),
      reviewerName: clean(snap.reviewerName || snap.ownerName || snap.name),
    };
  }

  function setMemberValue(scope, role, snapshot) {
    var api = window.STAM && window.STAM.projectMemberPicker;
    var container = memberPickerEl(scope, role);
    if (!api || !container || typeof api.setValue !== 'function') return;
    if (!snapshot || (!clean(snapshot.ownerId) && !clean(snapshot.reviewerId))) {
      api.clear(container);
      return;
    }
    if (role === 'owner') {
      api.setValue(container, { ownerId: snapshot.ownerId, ownerName: snapshot.ownerName });
    } else {
      api.setValue(container, { reviewerId: snapshot.reviewerId, reviewerName: snapshot.reviewerName });
    }
  }

  function getRequirementSelection(scope) {
    var api = window.STAM && window.STAM.requirementPicker;
    var picker = requirementPickerEl(scope);
    if (!api || !picker || typeof api.getValue !== 'function') {
      return { requirementId: '', requirementCode: '', requirementTitle: '' };
    }
    return api.getValue(picker);
  }

  function setRequirementSelection(scope, item) {
    var api = window.STAM && window.STAM.requirementPicker;
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

  function getFunctionalSpecSelection(scope) {
    var api = window.STAM && window.STAM.functionalSpecPicker;
    var picker = functionalSpecPickerEl(scope);
    if (!api || !picker || typeof api.getValue !== 'function') {
      return { functionalSpecId: '', functionalSpecCode: '', functionalSpecTitle: '' };
    }
    return api.getValue(picker);
  }

  function setFunctionalSpecSelection(scope, item) {
    var api = window.STAM && window.STAM.functionalSpecPicker;
    var picker = functionalSpecPickerEl(scope);
    if (!api || !picker || typeof api.setValue !== 'function') return;
    if (!item || (!clean(item.functionalSpecId) && !clean(item.functionalSpecCode))) {
      api.clear(picker);
      return;
    }
    api.setValue(picker, {
      functionalSpecId: clean(item.functionalSpecId),
      functionalSpecCode: clean(item.functionalSpecCode),
      functionalSpecTitle: clean(item.functionalSpecTitle),
    });
  }

  function applyRequirementLinkFields(payload, req, options) {
    var opts = options || {};
    var rid = clean(req.requirementId);
    var rcode = clean(req.requirementCode);
    var rtitle = clean(req.requirementTitle);
    if (rid && rcode && rtitle) {
      payload.requirementId = rid;
      payload.requirementCode = rcode;
      payload.requirementTitle = rtitle;
    } else if (opts.omitWhenUnlinked) {
      delete payload.requirementId;
      delete payload.requirementCode;
      delete payload.requirementTitle;
    } else {
      payload.requirementId = '';
      payload.requirementCode = '';
      payload.requirementTitle = '';
    }
    return payload;
  }

  function applyFunctionalSpecLinkFields(payload, fn, options) {
    var opts = options || {};
    var fid = clean(fn.functionalSpecId);
    var fcode = clean(fn.functionalSpecCode);
    var ftitle = clean(fn.functionalSpecTitle);
    if (fid && fcode && ftitle) {
      payload.functionalSpecId = fid;
      payload.functionalSpecCode = fcode;
      payload.functionalSpecTitle = ftitle;
    } else if (opts.omitWhenUnlinked) {
      delete payload.functionalSpecId;
      delete payload.functionalSpecCode;
      delete payload.functionalSpecTitle;
    } else {
      payload.functionalSpecId = '';
      payload.functionalSpecCode = '';
      payload.functionalSpecTitle = '';
    }
    return payload;
  }

  function parseEffort(raw, allowEmpty) {
    if (raw === '' || raw == null) return allowEmpty ? null : undefined;
    var num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return NaN;
    return num;
  }

  function parseProgress(raw) {
    if (raw === '' || raw == null) return NaN;
    var num = Number(raw);
    if (!Number.isFinite(num) || num < 0 || num > 100 || Math.floor(num) !== num) return NaN;
    return num;
  }

  function buildCreateInput(scope) {
    var statusKo = getFieldValue(scope, 'status') || '대기';
    var status = STATUS_KO_TO_DOMAIN[statusKo] || 'wait';
    var progress = parseProgress(getFieldValue(scope, 'progress'));
    if (status === 'done') progress = 100;
    var owner = getMemberValue(scope, 'owner');
    var reviewer = getMemberValue(scope, 'reviewer');
    var input = {
      title: getFieldValue(scope, 'title'),
      phase: getFieldValue(scope, 'phase'),
      businessArea: getFieldValue(scope, 'businessArea'),
      functionGroup: getFieldValue(scope, 'functionGroup'),
      screenPath: getFieldValue(scope, 'screenPath'),
      status: status,
      priority: PRIORITY_KO_TO_DOMAIN[getFieldValue(scope, 'priority') || '보통'] || 'mid',
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
      startDate: getFieldValue(scope, 'startDate'),
      endDate: getFieldValue(scope, 'endDate'),
      progress: progress,
      description: getFieldValue(scope, 'description'),
    };
    var planned = parseEffort(getFieldValue(scope, 'plannedEffort'), true);
    var actual = parseEffort(getFieldValue(scope, 'actualEffort'), true);
    if (planned != null) input.plannedEffort = planned;
    if (actual != null) input.actualEffort = actual;
    if (reviewer.reviewerId && reviewer.reviewerName) {
      input.reviewerId = reviewer.reviewerId;
      input.reviewerName = reviewer.reviewerName;
    }
    applyRequirementLinkFields(input, getRequirementSelection(scope), { omitWhenUnlinked: true });
    applyFunctionalSpecLinkFields(input, getFunctionalSpecSelection(scope), { omitWhenUnlinked: true });
    return input;
  }

  function buildUpdatePatch(scope) {
    var statusKo = getFieldValue(scope, 'status') || '대기';
    var status = STATUS_KO_TO_DOMAIN[statusKo] || 'wait';
    var progress = parseProgress(getFieldValue(scope, 'progress'));
    if (status === 'done') progress = 100;
    var owner = getMemberValue(scope, 'owner');
    var reviewer = getMemberValue(scope, 'reviewer');
    var patch = {
      title: getFieldValue(scope, 'title'),
      phase: getFieldValue(scope, 'phase'),
      businessArea: getFieldValue(scope, 'businessArea'),
      functionGroup: getFieldValue(scope, 'functionGroup'),
      screenPath: getFieldValue(scope, 'screenPath'),
      status: status,
      priority: PRIORITY_KO_TO_DOMAIN[getFieldValue(scope, 'priority') || '보통'] || 'mid',
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
      startDate: getFieldValue(scope, 'startDate'),
      endDate: getFieldValue(scope, 'endDate'),
      progress: progress,
      description: getFieldValue(scope, 'description'),
    };
    var planned = parseEffort(getFieldValue(scope, 'plannedEffort'), true);
    var actual = parseEffort(getFieldValue(scope, 'actualEffort'), true);
    if (planned == null) patch.plannedEffort = '';
    else patch.plannedEffort = planned;
    if (actual == null) patch.actualEffort = '';
    else patch.actualEffort = actual;
    if (reviewer.reviewerId && reviewer.reviewerName) {
      patch.reviewerId = reviewer.reviewerId;
      patch.reviewerName = reviewer.reviewerName;
    } else {
      patch.reviewerId = '';
      patch.reviewerName = '';
    }
    applyRequirementLinkFields(patch, getRequirementSelection(scope));
    applyFunctionalSpecLinkFields(patch, getFunctionalSpecSelection(scope));
    return patch;
  }

  function validateInput(input, mode) {
    if (!clean(input.title) || clean(input.title).length < 2) {
      alert('작업명은 2자 이상 입력하세요.');
      return false;
    }
    if (!clean(input.phase)) {
      alert('단계를 선택하세요.');
      return false;
    }
    if (!clean(input.functionGroup)) {
      alert('기능그룹을 입력하세요.');
      return false;
    }
    if (!clean(input.ownerId) || !clean(input.ownerName)) {
      alert('담당자를 선택하세요.');
      return false;
    }
    if (!clean(input.startDate) || !clean(input.endDate)) {
      alert('시작일과 종료일을 입력하세요.');
      return false;
    }
    if (clean(input.endDate) < clean(input.startDate)) {
      alert('종료일은 시작일 이후여야 합니다.');
      return false;
    }
    if (input.progress == null || Number.isNaN(input.progress)) {
      alert('진행률은 0~100 사이 정수로 입력하세요.');
      return false;
    }
    if (input.status !== 'done' && input.progress === 100) {
      alert('완료 상태가 아니면 진행률 100은 저장할 수 없습니다.');
      return false;
    }
    if (input.plannedEffort !== undefined && Number.isNaN(input.plannedEffort)) {
      alert('예상 공수 형식이 올바르지 않습니다.');
      return false;
    }
    if (input.actualEffort !== undefined && Number.isNaN(input.actualEffort)) {
      alert('실 공수 형식이 올바르지 않습니다.');
      return false;
    }
    return true;
  }

  function setButtonDisabled(el, disabled, title) {
    if (!el) return;
    el.disabled = !!disabled;
    if (disabled && title) el.setAttribute('title', title);
    else el.removeAttribute('title');
    el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  function formatCreateError(err) {
    var messages = uiMessages();
    var wbsMsg = messages && messages.wbs;
    if (err && err.writeCommitted) {
      return wbsMsg && wbsMsg.writeCommittedReadFailed
        ? wbsMsg.writeCommittedReadFailed
        : '등록은 완료되었지만 저장 결과를 다시 불러오지 못했습니다. 목록을 새로고침해 확인해 주세요.';
    }
    if (err && err.preflight && err.code) {
      switch (err.code) {
        case 'WBS_MEMBER_DOC_MISSING':
        case 'WBS_MEMBER_USER_ID_MISMATCH':
        case 'WBS_MEMBER_PROJECT_ID_MISMATCH':
        case 'WBS_MEMBER_INACTIVE':
          return wbsMsg && wbsMsg.memberSnapshotMismatch
            ? wbsMsg.memberSnapshotMismatch
            : '현재 프로젝트 멤버 정보가 저장 권한 기준과 일치하지 않습니다.';
        case 'WBS_MEMBER_ROLE_INVALID':
          return wbsMsg && wbsMsg.memberRoleInvalid
            ? wbsMsg.memberRoleInvalid
            : '현재 멤버 역할 값은 owner/admin/editor 중 하나여야 합니다.';
        case 'WBS_OWNER_SNAPSHOT_MISMATCH':
          return wbsMsg && wbsMsg.ownerSnapshotMismatch
            ? wbsMsg.ownerSnapshotMismatch
            : '담당자 정보가 프로젝트 멤버 데이터와 일치하지 않습니다.';
        case 'WBS_REVIEWER_SNAPSHOT_MISMATCH':
          return wbsMsg && wbsMsg.reviewerSnapshotMismatch
            ? wbsMsg.reviewerSnapshotMismatch
            : '검토자 정보가 프로젝트 멤버 데이터와 일치하지 않습니다.';
        case 'WBS_COUNTER_INVALID':
          return wbsMsg && wbsMsg.counterInvalid
            ? wbsMsg.counterInvalid
            : 'WBS 번호 Counter 데이터 형식이 올바르지 않습니다.';
        default:
          return err.message;
      }
    }
    var msg = err && err.message ? err.message : String(err);
    if (err && err.wbsCreateStage === 'preflight-read' && /Missing or insufficient permissions/i.test(msg)) {
      return wbsMsg && wbsMsg.preflightReadPermissionDenied
        ? wbsMsg.preflightReadPermissionDenied
        : '저장 사전검사 정보를 확인할 권한이 없습니다.';
    }
    if (err && err.preflightPassed && /Missing or insufficient permissions/i.test(msg)) {
      return wbsMsg && wbsMsg.rulesRejectedAfterPreflight
        ? wbsMsg.rulesRejectedAfterPreflight
        : '사전검사는 통과했으나 Firestore Rules에서 등록을 거부했습니다.';
    }
    return msg;
  }

  function formatUpdateError(err) {
    var messages = uiMessages();
    var wbsMsg = messages && messages.wbs;
    if (err && (err.updateCommitted || err.wbsUpdateStage === 'post-update-read')) {
      return wbsMsg && wbsMsg.updateCommittedReadFailed
        ? wbsMsg.updateCommittedReadFailed
        : '수정은 완료되었지만 저장 결과를 다시 불러오지 못했습니다. 목록을 새로고침해 확인해 주세요.';
    }
    if (err && err.preflight && err.code) {
      switch (err.code) {
        case 'WBS_MEMBER_DOC_MISSING':
        case 'WBS_MEMBER_USER_ID_MISMATCH':
        case 'WBS_MEMBER_PROJECT_ID_MISMATCH':
        case 'WBS_MEMBER_INACTIVE':
          return wbsMsg && wbsMsg.memberSnapshotMismatch
            ? wbsMsg.memberSnapshotMismatch
            : '현재 프로젝트 멤버 정보가 저장 권한 기준과 일치하지 않습니다.';
        case 'WBS_MEMBER_ROLE_INVALID':
          return wbsMsg && wbsMsg.memberRoleInvalid
            ? wbsMsg.memberRoleInvalid
            : '현재 멤버 역할 값은 owner/admin/editor 중 하나여야 합니다.';
        case 'WBS_OWNER_SNAPSHOT_MISMATCH':
          return wbsMsg && wbsMsg.ownerSnapshotMismatch
            ? wbsMsg.ownerSnapshotMismatch
            : '담당자 정보가 프로젝트 멤버 데이터와 일치하지 않습니다.';
        case 'WBS_REVIEWER_SNAPSHOT_MISMATCH':
          return wbsMsg && wbsMsg.reviewerSnapshotMismatch
            ? wbsMsg.reviewerSnapshotMismatch
            : '검토자 정보가 프로젝트 멤버 데이터와 일치하지 않습니다.';
        case 'WBS_UPDATE_DOC_MISSING':
          return wbsMsg && wbsMsg.updateDocMissing
            ? wbsMsg.updateDocMissing
            : '수정할 WBS 항목을 찾을 수 없습니다. 목록을 새로고침해 주세요.';
        case 'WBS_UPDATE_CURRENT_VERSION_INVALID':
          return wbsMsg && wbsMsg.updateVersionInvalid
            ? wbsMsg.updateVersionInvalid
            : '현재 WBS 버전 정보가 올바르지 않습니다.';
        case 'WBS_UPDATE_VERSION_MISMATCH':
          return wbsMsg && wbsMsg.updateVersionMismatch
            ? wbsMsg.updateVersionMismatch
            : '다른 변경 사항이 먼저 저장되었습니다. 목록을 새로고침한 뒤 다시 수정해 주세요.';
        case 'WBS_UPDATE_IMMUTABLE_FIELD':
          return wbsMsg && wbsMsg.updateImmutableField
            ? wbsMsg.updateImmutableField
            : '수정할 수 없는 WBS 기본 정보가 변경 요청에 포함되었습니다.';
        case 'WBS_UPDATE_REVIEWER_PARTIAL':
          return wbsMsg && wbsMsg.updateReviewerPartial
            ? wbsMsg.updateReviewerPartial
            : '검토자 정보는 ID와 이름을 함께 수정해야 합니다.';
        default:
          return err.message;
      }
    }
    var msg = err && err.message ? err.message : String(err);
    if (err && err.wbsUpdateStage === 'preflight-read' && /Missing or insufficient permissions/i.test(msg)) {
      return wbsMsg && wbsMsg.updatePreflightReadPermissionDenied
        ? wbsMsg.updatePreflightReadPermissionDenied
        : '수정 사전검사 정보를 확인할 권한이 없습니다.';
    }
    if (err && err.updatePreflightPassed && /Missing or insufficient permissions/i.test(msg)) {
      return wbsMsg && wbsMsg.updateRulesRejectedAfterPreflight
        ? wbsMsg.updateRulesRejectedAfterPreflight
        : '사전검사는 통과했으나 Firestore Rules에서 수정을 거부했습니다.';
    }
    return msg;
  }

  function setFormDisabled(scope, disabled) {
    if (!scope) return;
    scope.querySelectorAll('input, textarea, select, button.wbs-form-toggle').forEach(function (el) {
      el.disabled = !!disabled;
    });
    scope.querySelectorAll('[data-wbs-dp], [data-wbs-sel]').forEach(function (el) {
      el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
    scope.querySelectorAll('[data-wbs-dp] .wbs-dp-trigger, [data-wbs-sel] .wbs-sel').forEach(function (el) {
      el.disabled = !!disabled;
    });
    var reqApi = window.STAM && window.STAM.requirementPicker;
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    var memApi = window.STAM && window.STAM.projectMemberPicker;
    if (reqApi && typeof reqApi.setDisabled === 'function') {
      scope.querySelectorAll('[data-stam-requirement-picker]').forEach(function (c) {
        reqApi.setDisabled(c, disabled);
      });
    }
    if (fnApi && typeof fnApi.setDisabled === 'function') {
      scope.querySelectorAll('[data-stam-functional-spec-picker]').forEach(function (c) {
        fnApi.setDisabled(c, disabled);
      });
    }
    if (memApi && typeof memApi.setDisabled === 'function') {
      scope.querySelectorAll('[data-stam-wbs-member-picker]').forEach(function (c) {
        memApi.setDisabled(c, disabled);
      });
    }
  }

  function applyWriteAccessUI() {
    var writable = canWrite();
    var messages = uiMessages();
    var denied = messages && messages.wbs && messages.wbs.writeDenied;
    var scopeUnsupported = messages && messages.wbs && messages.wbs.scopeUnsupported;
    var deleteMsg = messages && messages.wbs && messages.wbs.deleteUnsupported;
    setButtonDisabled(document.getElementById('wbs-reg-btn'), !writable, denied);
    setButtonDisabled(document.querySelector('.wbs-drawer-edit-btn'), !writable, denied);
    setButtonDisabled(document.getElementById('wbs-edit-save-btn'), !writable, denied);
    setButtonDisabled(document.getElementById('wbs-create-save-btn'), !writable, denied);
    setFormDisabled(formScope('edit'), !writable);
    setFormDisabled(formScope('create'), !writable);
    ['wbs-import-btn', 'wbs-export-btn', 'wbs-delete-btn', 'wbs-det-del-btn',
      'wbs-edit-temp-save-btn', 'wbs-create-temp-save-btn', 'wbs-gantt-fullview-btn'].forEach(function (id) {
      setButtonDisabled(document.getElementById(id), true, scopeUnsupported);
    });
    document.querySelectorAll('[data-stam-wbs-excluded-control="meeting"] button').forEach(function (btn) {
      setButtonDisabled(btn, true, scopeUnsupported);
    });
    if (document.querySelector('[data-stam-wbs-live="true"]')) {
      var fvBlockedMsg = '전체 보기는 상세 화면에서 확인할 수 있습니다.';
      document.querySelectorAll('.wbs-edit-footer-slot .wbs-fv-trigger-btn, .wbs-create-footer-slot .wbs-fv-trigger-btn').forEach(function (btn) {
        setButtonDisabled(btn, true, fvBlockedMsg);
      });
    }
  }

  function mountPickers() {
    if (pickersMounted) return;
    pickersMounted = true;
    var reqApi = window.STAM && window.STAM.requirementPicker;
    if (reqApi && typeof reqApi.initAll === 'function') {
      reqApi.initAll({
        getProjectId: function () {
          var api = listApi();
          return api && typeof api.getState === 'function' ? clean(api.getState().projectId) : '';
        },
        getMemberRole: memberRole,
        getContext: function () { return serviceContext('wbs-requirement-picker'); },
      });
    }
    var memApi = window.STAM && window.STAM.projectMemberPicker;
    if (memApi && typeof memApi.mount === 'function') {
      document.querySelectorAll('[data-stam-wbs-member-picker]').forEach(function (container) {
        var mode = clean(container.getAttribute('data-stam-wbs-member-picker')) || 'owner';
        memApi.mount(container, {
          getProjectId: function () {
            var api = listApi();
            return api && typeof api.getState === 'function' ? clean(api.getState().projectId) : '';
          },
          getMemberRole: memberRole,
          getContext: function () { return serviceContext('wbs-member-picker'); },
          mode: mode,
        });
      });
    }
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    if (fnApi && typeof fnApi.mount === 'function') {
      document.querySelectorAll('[data-stam-functional-spec-picker]').forEach(function (container) {
        if (container.getAttribute('data-stam-reference-picker-mounted') === '1') return;
        var api = listApi();
        var snapshot = api && typeof api.getState === 'function' ? api.getState() : {};
        fnApi.mount(container, {
          projectId: clean(snapshot.projectId),
          memberRole: memberRole(),
          context: serviceContext('wbs-functional-spec-picker'),
        });
        functionalSpecMounted = true;
      });
    }
  }

  function refreshPickerContext() {
    var api = listApi();
    var snapshot = api && typeof api.getState === 'function' ? api.getState() : {};
    var options = {
      projectId: clean(snapshot.projectId),
      memberRole: clean(snapshot.member && snapshot.member.role),
      context: serviceContext('wbs-picker-refresh'),
    };
    var reqApi = window.STAM && window.STAM.requirementPicker;
    if (reqApi && typeof reqApi.refreshContext === 'function') {
      document.querySelectorAll('[data-stam-requirement-picker]').forEach(function (c) {
        reqApi.refreshContext(c, options);
      });
    }
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    if (fnApi && typeof fnApi.refreshContext === 'function') {
      document.querySelectorAll('[data-stam-functional-spec-picker]').forEach(function (c) {
        fnApi.refreshContext(c, options);
      });
    }
    var memApi = window.STAM && window.STAM.projectMemberPicker;
    if (memApi && typeof memApi.refreshContext === 'function') {
      document.querySelectorAll('[data-stam-wbs-member-picker]').forEach(function (c) {
        memApi.refreshContext(c, options);
      });
    }
  }

  function loadDefaultOwner(scope) {
    var api = listApi();
    var snapshot = api && typeof api.getState === 'function' ? api.getState() : {};
    var pickerApi = window.STAM && window.STAM.projectMemberPicker;
    var ownerContainer = memberPickerEl(scope, 'owner');
    if (!pickerApi || !ownerContainer || !clean(snapshot.projectId)) {
      setMemberValue(scope, 'owner', null);
      return Promise.resolve();
    }
    return pickerApi.listActiveMembers(
      snapshot.projectId,
      serviceContext('wbs-member-picker'),
      memberRole()
    ).then(function (members) {
      pickerApi.applyDefaultOwner(ownerContainer, members, snapshot.user);
    }).catch(function (err) {
      console.error('wbs-firestore-crud: active member load failed', err);
      setMemberValue(scope, 'owner', null);
    });
  }

  function resetRegister() {
    var scope = formScope('create');
    if (!scope) return Promise.resolve();
    ['title', 'businessArea', 'functionGroup', 'screenPath', 'description'].forEach(function (f) {
      setFieldValue(scope, f, '');
    });
    setFieldValue(scope, 'status', '대기');
    setFieldValue(scope, 'priority', '보통');
    setFieldValue(scope, 'startDate', '');
    setFieldValue(scope, 'endDate', '');
    setFieldValue(scope, 'plannedEffort', '');
    setFieldValue(scope, 'actualEffort', '');
    setFieldValue(scope, 'progress', '0');
    setRequirementSelection(scope, null);
    setFunctionalSpecSelection(scope, null);
    setMemberValue(scope, 'owner', null);
    setMemberValue(scope, 'reviewer', null);
    return loadDefaultOwner(scope);
  }

  function openRegister() {
    mountPickers();
    refreshPickerContext();
    return resetRegister().then(function () {
      if (wbsUi() && typeof wbsUi().openDrawer === 'function') wbsUi().openDrawer('create');
    }).catch(function (err) {
      console.error('wbs-firestore-crud: openRegister failed', err);
      if (wbsUi() && typeof wbsUi().openDrawer === 'function') wbsUi().openDrawer('create');
    });
  }

  function prefillEdit(item) {
    var scope = formScope('edit');
    if (!scope || !item) return Promise.resolve();
    mountPickers();
    refreshPickerContext();
    setFieldValue(scope, 'title', item.title || '');
    setFieldValue(scope, 'phase', item.phase || '');
    setFieldValue(scope, 'businessArea', item.businessArea || '');
    setFieldValue(scope, 'functionGroup', item.functionGroup || '');
    setFieldValue(scope, 'screenPath', item.screenPath || '');
    setFieldValue(scope, 'status', DOMAIN_STATUS_TO_KO[clean(item.status).toLowerCase()] || '대기');
    setFieldValue(scope, 'priority', DOMAIN_PRIORITY_TO_KO[clean(item.priority).toLowerCase()] || '보통');
    setFieldValue(scope, 'startDate', clean(item.startDate).slice(0, 10));
    setFieldValue(scope, 'endDate', clean(item.endDate).slice(0, 10));
    setFieldValue(scope, 'plannedEffort', item.plannedEffort != null ? String(item.plannedEffort) : '');
    setFieldValue(scope, 'actualEffort', item.actualEffort != null ? String(item.actualEffort) : '');
    setFieldValue(scope, 'progress', item.progress != null ? String(item.progress) : '0');
    setFieldValue(scope, 'description', item.description || '');
    setRequirementSelection(scope, item);
    var pickerApi = window.STAM && window.STAM.projectMemberPicker;
    var api = listApi();
    var snapshot = api && typeof api.getState === 'function' ? api.getState() : {};
    var memberPromise = pickerApi && clean(snapshot.projectId)
      ? pickerApi.listActiveMembers(snapshot.projectId, serviceContext('wbs-member-picker'), memberRole())
      : Promise.resolve([]);
    return memberPromise.then(function () {
      setMemberValue(scope, 'owner', { ownerId: item.ownerId, ownerName: item.ownerName });
      if (item.reviewerId && item.reviewerName) {
        setMemberValue(scope, 'reviewer', { reviewerId: item.reviewerId, reviewerName: item.reviewerName });
      } else {
        setMemberValue(scope, 'reviewer', null);
      }
      var fnPicker = functionalSpecPickerEl(scope);
      var fnApi = window.STAM && window.STAM.functionalSpecPicker;
      if (!fnPicker || !fnApi) return;
      if (typeof fnApi.refreshContext === 'function') {
        fnApi.refreshContext(fnPicker, {
          projectId: clean(snapshot.projectId),
          memberRole: memberRole(),
          context: serviceContext('wbs-functional-spec-picker'),
        });
      }
      if (!clean(item.functionalSpecId) && !clean(item.functionalSpecCode)) {
        fnApi.clear(fnPicker);
        return;
      }
      return fnApi.load(fnPicker).then(function () {
        fnApi.setValue(fnPicker, {
          functionalSpecId: item.functionalSpecId,
          functionalSpecCode: item.functionalSpecCode,
          functionalSpecTitle: item.functionalSpecTitle,
        });
      });
    }).catch(function (err) {
      console.error('wbs-firestore-crud: edit prefill failed', err);
      setMemberValue(scope, 'owner', null);
      setMemberValue(scope, 'reviewer', null);
      var fnPicker = functionalSpecPickerEl(scope);
      var fnApi = window.STAM && window.STAM.functionalSpecPicker;
      if (fnPicker && fnApi && typeof fnApi.clear === 'function') fnApi.clear(fnPicker);
    });
  }

  function openEdit() {
    var api = listApi();
    var item = api && typeof api.getState === 'function' ? api.getState().currentItem : null;
    if (!item) return Promise.resolve();
    return prefillEdit(item).then(function () {
      if (wbsUi() && typeof wbsUi().openDrawer === 'function') wbsUi().openDrawer('edit');
    });
  }

  function afterSave() {
    var api = listApi();
    if (wbsUi() && typeof wbsUi().closeDrawer === 'function') wbsUi().closeDrawer();
    if (api && typeof api.load === 'function') return api.load();
    return Promise.resolve();
  }

  function submitCreate() {
    if (busy.create) return Promise.resolve();
    var guard = writeGuard();
    if (!guard) return Promise.resolve();
    var scope = formScope('create');
    var svc = service();
    if (!scope || !svc || typeof svc.create !== 'function') return Promise.resolve();
    var input = buildCreateInput(scope);
    if (!validateInput(input, 'create')) return Promise.resolve();
    busy.create = true;
    setButtonDisabled(document.getElementById('wbs-create-save-btn'), true);
    var context = serviceContext('wbs-firestore-create');
    var projectId = guard.projectId;
    return svc.create(projectId, input, context).then(function () {
      return afterSave();
    }).catch(function (err) {
      if (err && err.writeCommitted) {
        alert(formatCreateError(err));
      } else {
        alert('등록 오류: ' + formatCreateError(err));
      }
    }).then(function () {
      busy.create = false;
      applyWriteAccessUI();
    });
  }

  function submitUpdate() {
    if (busy.update) return Promise.resolve();
    var guard = writeGuard();
    if (!guard) return Promise.resolve();
    var api = listApi();
    var item = api && typeof api.getState === 'function' ? api.getState().currentItem : null;
    var scope = formScope('edit');
    var svc = service();
    if (!item || !scope || !svc || typeof svc.update !== 'function') return Promise.resolve();
    var patch = buildUpdatePatch(scope);
    if (!validateInput(patch, 'update')) return Promise.resolve();
    busy.update = true;
    setButtonDisabled(document.getElementById('wbs-edit-save-btn'), true);
    var context = serviceContext('wbs-firestore-update');
    var projectId = guard.projectId;
    return svc.update(projectId, item.id, patch, context).then(function () {
      return afterSave();
    }).catch(function (err) {
      if (err && (err.updateCommitted || err.wbsUpdateStage === 'post-update-read')) {
        alert(formatUpdateError(err));
      } else {
        alert('저장 오류: ' + formatUpdateError(err));
      }
    }).then(function () {
      busy.update = false;
      applyWriteAccessUI();
    });
  }

  function bindEvents() {
    var regBtn = document.getElementById('wbs-reg-btn');
    if (regBtn && !regBtn.getAttribute('data-wbs-crud-bound')) {
      regBtn.setAttribute('data-wbs-crud-bound', '1');
      regBtn.addEventListener('click', function () { openRegister(); });
    }
    var editBtn = document.querySelector('.wbs-drawer-edit-btn');
    if (editBtn && !editBtn.getAttribute('data-wbs-crud-bound')) {
      editBtn.setAttribute('data-wbs-crud-bound', '1');
      editBtn.addEventListener('click', function () { openEdit(); });
    }
    var createSave = document.getElementById('wbs-create-save-btn');
    if (createSave && !createSave.getAttribute('data-wbs-crud-bound')) {
      createSave.setAttribute('data-wbs-crud-bound', '1');
      createSave.addEventListener('click', function () { submitCreate(); });
    }
    var editSave = document.getElementById('wbs-edit-save-btn');
    if (editSave && !editSave.getAttribute('data-wbs-crud-bound')) {
      editSave.setAttribute('data-wbs-crud-bound', '1');
      editSave.addEventListener('click', function () { submitUpdate(); });
    }
    document.querySelectorAll('[data-wbs-field="status"]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.wbs-form-toggle');
        if (!btn) return;
        if (btn.textContent.trim() === '완료') {
          var form = row.closest('[data-stam-wbs-form]');
          if (form) setFieldValue(form, 'progress', '100');
        }
      });
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  window.STAM = window.STAM || {};
  window.STAM.wbsFirestoreCrud = {
    applyWriteAccessUI: applyWriteAccessUI,
    openRegister: openRegister,
    openEdit: openEdit,
    submitCreate: submitCreate,
    submitUpdate: submitUpdate,
    prefillEdit: prefillEdit,
    buildCreateInput: buildCreateInput,
    buildUpdatePatch: buildUpdatePatch,
    canWrite: canWrite,
  };

  ready(function () {
    if (!document.querySelector('[data-stam-wbs-live="true"]')) return;
    mountPickers();
    bindEvents();
    applyWriteAccessUI();
  });
}());
