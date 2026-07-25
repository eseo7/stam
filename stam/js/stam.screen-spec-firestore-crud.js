/* ============================================================================
 * STAM Screen Specification Firestore CRUD UI Wiring
 * ----------------------------------------------------------------------------
 * Wires screen-specification.html register drawer (#ssv2-drawer) to
 * STAM.screenSpecService.create with requirement / functional-spec / WBS pickers.
 * List read: stam.screen-spec-firestore-list.js
 * ========================================================================== */
(function () {
  'use strict';

  var WRITE_DENIED_MSG = '이 프로젝트에서는 화면설계서 등록 권한이 없습니다. (viewer)';

  var SCREEN_TYPE_KO_TO_DOMAIN = {
    '목록': 'list',
    '상세': 'detail',
    '등록': 'form',
    '수정': 'form',
    '팝업': 'popup',
    '대시보드': 'main',
    '기타': 'other',
  };

  var STATUS_KO_TO_DOMAIN = {
    '작성중': { writeStatus: 'writing', reviewStatus: 'none', approvalStatus: 'none' },
    '검토요청': { writeStatus: 'complete', reviewStatus: 'pending', approvalStatus: 'none' },
    '검토완료': { writeStatus: 'complete', reviewStatus: 'done', approvalStatus: 'none' },
    '승인완료': { writeStatus: 'complete', reviewStatus: 'done', approvalStatus: 'approved' },
    '보류': { writeStatus: 'complete', reviewStatus: 'done', approvalStatus: 'rejected' },
  };

  var busy = { create: false };
  var pickersMounted = false;

  function isLiveMode() {
    return !!document.querySelector('[data-stam-screen-spec-live="true"]');
  }

  function listApi() {
    return window.STAM && window.STAM.screenSpecFirestoreList;
  }

  function contract() {
    return window.STAM && window.STAM.screenSpecServiceContract;
  }

  function service() {
    return window.STAM && window.STAM.screenSpecService;
  }

  function uiMessages() {
    return window.STAM && window.STAM.uiMessages;
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function $(id) {
    return document.getElementById(id);
  }

  function memberRole() {
    var api = listApi();
    if (!api || typeof api.getState !== 'function') return '';
    var snapshot = api.getState();
    return snapshot && snapshot.member ? clean(snapshot.member.role) : '';
  }

  function canWrite() {
    var roleContract = contract();
    if (!roleContract || typeof roleContract.canWriteScreenSpec !== 'function') return false;
    return roleContract.canWriteScreenSpec(memberRole());
  }

  function writeGuard() {
    var api = listApi();
    var messages = uiMessages();
    var denied = messages && messages.screenSpec && messages.screenSpec.writeDenied;
    if (!api || typeof api.getState !== 'function') {
      alert(denied || WRITE_DENIED_MSG);
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
      alert(denied || WRITE_DENIED_MSG);
      return null;
    }
    return { snapshot: snapshot, projectId: projectId, memberRole: role };
  }

  function serviceContext(source) {
    var api = listApi();
    if (api && typeof api.serviceContext === 'function') {
      return api.serviceContext(source);
    }
    return { source: source || 'screen-spec-firestore-crud' };
  }

  function formRoot() {
    return $('ssv2-form');
  }

  function linkSlot(name) {
    var form = formRoot();
    if (!form) return null;
    return form.querySelector('[data-stam-screen-spec-link-slot="' + name + '"]');
  }

  function requirementPickerEl() {
    var slot = linkSlot('requirement');
    return slot ? slot.querySelector('[data-stam-requirement-picker]') : null;
  }

  function functionalSpecPickerEl() {
    var slot = linkSlot('functionalSpec');
    return slot ? slot.querySelector('[data-stam-functional-spec-picker]') : null;
  }

  function wbsPickerEl() {
    var slot = linkSlot('wbs');
    return slot ? slot.querySelector('[data-stam-wbs-picker]') : null;
  }

  function pickerOptions(source) {
    var api = listApi();
    var snapshot = api && typeof api.getState === 'function' ? api.getState() : {};
    return {
      projectId: clean(snapshot.projectId),
      memberRole: clean(snapshot.member && snapshot.member.role),
      context: serviceContext(source),
    };
  }

  function getRequirementSelection() {
    var api = window.STAM && window.STAM.requirementPicker;
    var picker = requirementPickerEl();
    if (!api || !picker || typeof api.getValue !== 'function') {
      return { requirementId: '', requirementCode: '', requirementTitle: '' };
    }
    return api.getValue(picker);
  }

  function getFunctionalSpecSelection() {
    var api = window.STAM && window.STAM.functionalSpecPicker;
    var picker = functionalSpecPickerEl();
    if (!api || !picker || typeof api.getValue !== 'function') {
      return { functionalSpecId: '', functionalSpecCode: '', functionalSpecTitle: '' };
    }
    return api.getValue(picker);
  }

  function getWbsSelection() {
    var api = window.STAM && window.STAM.wbsPicker;
    var picker = wbsPickerEl();
    if (!api || !picker || typeof api.getValue !== 'function') {
      return { wbsItemId: '', wbsItemCode: '', wbsItemTitle: '' };
    }
    return api.getValue(picker);
  }

  function clearRequirementSelection() {
    var api = window.STAM && window.STAM.requirementPicker;
    var picker = requirementPickerEl();
    if (api && picker && typeof api.clear === 'function') api.clear(picker);
  }

  function clearFunctionalSpecSelection() {
    var api = window.STAM && window.STAM.functionalSpecPicker;
    var picker = functionalSpecPickerEl();
    if (api && picker && typeof api.clear === 'function') api.clear(picker);
  }

  function clearWbsSelection() {
    var api = window.STAM && window.STAM.wbsPicker;
    var picker = wbsPickerEl();
    if (api && picker && typeof api.clear === 'function') api.clear(picker);
  }

  function destroyPickers() {
    var reqApi = window.STAM && window.STAM.requirementPicker;
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    var wbsApi = window.STAM && window.STAM.wbsPicker;
    var req = requirementPickerEl();
    var fn = functionalSpecPickerEl();
    var wbs = wbsPickerEl();
    if (reqApi && req && typeof reqApi.destroy === 'function') reqApi.destroy(req);
    if (fnApi && fn && typeof fnApi.destroy === 'function') fnApi.destroy(fn);
    if (wbsApi && wbs && typeof wbsApi.destroy === 'function') wbsApi.destroy(wbs);
    pickersMounted = false;
  }

  function mountPickers() {
    if (pickersMounted) {
      refreshPickerContext();
      return;
    }
    var opts = pickerOptions('screen-spec-picker-mount');
    var reqApi = window.STAM && window.STAM.requirementPicker;
    var req = requirementPickerEl();
    if (reqApi && req && typeof reqApi.mount === 'function' && req.getAttribute('data-stam-reference-picker-mounted') !== '1') {
      reqApi.mount(req, opts);
    }
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    var fn = functionalSpecPickerEl();
    if (fnApi && fn && typeof fnApi.mount === 'function' && fn.getAttribute('data-stam-reference-picker-mounted') !== '1') {
      fnApi.mount(fn, opts);
    }
    var wbsApi = window.STAM && window.STAM.wbsPicker;
    var wbs = wbsPickerEl();
    if (wbsApi && wbs && typeof wbsApi.mount === 'function' && wbs.getAttribute('data-stam-reference-picker-mounted') !== '1') {
      wbsApi.mount(wbs, opts);
    }
    pickersMounted = true;
    loadPickers();
  }

  function loadPickers() {
    var reqApi = window.STAM && window.STAM.requirementPicker;
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    var wbsApi = window.STAM && window.STAM.wbsPicker;
    var promises = [];
    var req = requirementPickerEl();
    var fn = functionalSpecPickerEl();
    var wbs = wbsPickerEl();
    if (reqApi && req && typeof reqApi.load === 'function') promises.push(reqApi.load(req));
    if (fnApi && fn && typeof fnApi.load === 'function') promises.push(fnApi.load(fn));
    if (wbsApi && wbs && typeof wbsApi.load === 'function') promises.push(wbsApi.load(wbs));
    return Promise.all(promises);
  }

  function refreshPickerContext() {
    var opts = pickerOptions('screen-spec-picker-refresh');
    var reqApi = window.STAM && window.STAM.requirementPicker;
    if (reqApi && typeof reqApi.refreshContext === 'function') {
      var req = requirementPickerEl();
      if (req) reqApi.refreshContext(req, opts);
    }
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    if (fnApi && typeof fnApi.refreshContext === 'function') {
      var fn = functionalSpecPickerEl();
      if (fn) fnApi.refreshContext(fn, opts);
    }
    var wbsApi = window.STAM && window.STAM.wbsPicker;
    if (wbsApi && typeof wbsApi.refreshContext === 'function') {
      var wbs = wbsPickerEl();
      if (wbs) wbsApi.refreshContext(wbs, opts);
    }
  }

  function applyPickerDisabled(disabled) {
    var reqApi = window.STAM && window.STAM.requirementPicker;
    var fnApi = window.STAM && window.STAM.functionalSpecPicker;
    var wbsApi = window.STAM && window.STAM.wbsPicker;
    if (reqApi && typeof reqApi.setDisabled === 'function') {
      var req = requirementPickerEl();
      if (req) reqApi.setDisabled(req, disabled);
    }
    if (fnApi && typeof fnApi.setDisabled === 'function') {
      var fn = functionalSpecPickerEl();
      if (fn) fnApi.setDisabled(fn, disabled);
    }
    if (wbsApi && typeof wbsApi.setDisabled === 'function') {
      var wbs = wbsPickerEl();
      if (wbs) wbsApi.setDisabled(wbs, disabled);
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
    setButtonDisabled($('ssv2-save-btn'), !writable, WRITE_DENIED_MSG);
    setButtonDisabled(document.querySelector('[data-ssv2-reg]'), !writable, WRITE_DENIED_MSG);
    applyPickerDisabled(!writable);
  }

  function screenTypeFromKo(ko) {
    return SCREEN_TYPE_KO_TO_DOMAIN[ko] || 'other';
  }

  function statusFromKo(ko) {
    return STATUS_KO_TO_DOMAIN[ko] || STATUS_KO_TO_DOMAIN['작성중'];
  }

  function applyLinkTriplet(target, selection, fields, omitWhenEmpty) {
    var id = clean(selection[fields[0]]);
    var code = clean(selection[fields[1]]);
    var title = clean(selection[fields[2]]);
    if (id && code && title) {
      target[fields[0]] = id;
      target[fields[1]] = code;
      target[fields[2]] = title;
    } else if (!omitWhenEmpty) {
      target[fields[0]] = '';
      target[fields[1]] = '';
      target[fields[2]] = '';
    }
  }

  function buildCreateInput() {
    var mapped = statusFromKo($('ssv2-f-status') && $('ssv2-f-status').value || '작성중');
    var snapshot = listApi() && typeof listApi().getState === 'function' ? listApi().getState() : {};
    var member = snapshot.member || {};
    var user = snapshot.user || {};
    var ownerId = clean(user.uid);
    var ownerName = clean(member.displayName) || clean(user.displayName) || clean(user.email) || '담당자';

    var input = {
      title: clean($('ssv2-f-name') && $('ssv2-f-name').value),
      screenType: screenTypeFromKo(clean($('ssv2-f-type') && $('ssv2-f-type').value)),
      writeStatus: mapped.writeStatus,
      reviewStatus: mapped.reviewStatus,
      approvalStatus: mapped.approvalStatus,
      ownerId: ownerId,
      ownerName: ownerName,
      templateId: clean($('ssv2-f-template') && $('ssv2-f-template').value),
      routePath: clean($('ssv2-f-route') && $('ssv2-f-route').value),
      description: clean($('ssv2-f-desc') && $('ssv2-f-desc').value),
    };

    applyLinkTriplet(input, getRequirementSelection(), [
      'requirementId', 'requirementCode', 'requirementTitle',
    ], true);
    applyLinkTriplet(input, getFunctionalSpecSelection(), [
      'functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle',
    ], true);
    applyLinkTriplet(input, getWbsSelection(), [
      'wbsItemId', 'wbsItemCode', 'wbsItemTitle',
    ], true);

    return input;
  }

  function resetRegisterForm() {
    if ($('ssv2-f-name')) $('ssv2-f-name').value = '';
    if ($('ssv2-f-type')) $('ssv2-f-type').selectedIndex = 0;
    if ($('ssv2-f-status')) $('ssv2-f-status').selectedIndex = 0;
    if ($('ssv2-f-owner')) {
      var snapshot = listApi() && typeof listApi().getState === 'function' ? listApi().getState() : {};
      var member = snapshot.member || {};
      var user = snapshot.user || {};
      $('ssv2-f-owner').value = clean(member.displayName) || clean(user.displayName) || '';
    }
    if ($('ssv2-f-template')) $('ssv2-f-template').value = '';
    if ($('ssv2-f-route')) $('ssv2-f-route').value = '';
    if ($('ssv2-f-menu')) $('ssv2-f-menu').value = '';
    if ($('ssv2-f-desc')) $('ssv2-f-desc').value = '';
    clearRequirementSelection();
    clearFunctionalSpecSelection();
    clearWbsSelection();
  }

  function setMode(mode) {
    var drawer = $('ssv2-drawer');
    if (drawer) drawer.setAttribute('data-mode', mode);
    var isForm = mode === 'register' || mode === 'edit';
    var det = $('ssv2-detail');
    var form = formRoot();
    var fd = $('ssv2-foot-detail');
    var ff = $('ssv2-foot-form');
    var tabs = $('ssv2-tabs');
    var hmeta = $('ssv2-hmeta');
    if (det) det.style.display = isForm ? 'none' : '';
    if (form) form.style.display = isForm ? '' : 'none';
    if (tabs) tabs.style.display = isForm ? 'none' : 'flex';
    if (hmeta) hmeta.style.display = isForm ? 'none' : 'flex';
    if (fd) fd.style.display = isForm ? 'none' : 'flex';
    if (ff) ff.style.display = isForm ? 'flex' : 'none';
  }

  function setHeaderRegister() {
    var wid = $('ssv2-wid');
    if (wid) wid.textContent = '신규';
    var chip = $('ssv2-status-chip');
    if (chip) {
      chip.textContent = '작성중';
      chip.style.background = 'var(--bg-sur2)';
      chip.style.color = 'var(--t2)';
    }
    var title = $('ssv2-title');
    if (title) title.textContent = '새 화면설계서 등록';
    var hmeta = $('ssv2-hmeta');
    if (hmeta) hmeta.innerHTML = '';
  }

  function openDrawerRegister() {
    var scrim = $('ssv2-scrim');
    var drawer = $('ssv2-drawer');
    if (scrim) scrim.style.display = 'block';
    if (drawer) drawer.setAttribute('data-open', 'true');
    resetRegisterForm();
    setHeaderRegister();
    setMode('register');
    mountPickers();
    applyWriteAccessUI();
  }

  function closeDrawer() {
    destroyPickers();
    var scrim = $('ssv2-scrim');
    var drawer = $('ssv2-drawer');
    if (scrim) scrim.style.display = 'none';
    if (drawer) drawer.setAttribute('data-open', 'false');
  }

  function closeAndRefresh() {
    closeDrawer();
    var api = listApi();
    if (api && typeof api.load === 'function') {
      return api.load();
    }
    return Promise.resolve();
  }

  function setSaving(saving) {
    var btn = $('ssv2-save-btn');
    if (!btn) return;
    btn.disabled = saving || !canWrite();
    if (saving) btn.setAttribute('data-ss-saving', '1');
    else btn.removeAttribute('data-ss-saving');
  }

  function submitRegister() {
    if (busy.create) return Promise.resolve();
    var guard = writeGuard();
    if (!guard) return Promise.resolve();
    var svc = service();
    if (!svc || typeof svc.create !== 'function') return Promise.resolve();

    var title = clean($('ssv2-f-name') && $('ssv2-f-name').value);
    if (!title) {
      alert('화면명을 입력하세요.');
      return Promise.resolve();
    }
    if (title.length < 2) {
      alert('화면명은 2자 이상 입력하세요.');
      return Promise.resolve();
    }

    busy.create = true;
    setSaving(true);
    var input = buildCreateInput();
    var context = serviceContext('screen-spec-firestore-create');

    return svc.create(guard.projectId, input, context).then(function () {
      busy.create = false;
      setSaving(false);
      return closeAndRefresh();
    }).catch(function (err) {
      busy.create = false;
      setSaving(false);
      console.error('[screen-spec-firestore-crud] create failed', err);
      alert('등록 오류: ' + (err && err.message ? err.message : err));
    });
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var reg = e.target.closest('[data-ssv2-reg]');
      if (!reg || !isLiveMode()) return;
      e.stopPropagation();
      e.preventDefault();
      openDrawerRegister();
    }, true);

    var closeBtn = $('ssv2-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      if (!isLiveMode()) return;
      closeDrawer();
    });

    var scrim = $('ssv2-scrim');
    if (scrim) scrim.addEventListener('click', function () {
      if (!isLiveMode()) return;
      closeDrawer();
    });

    var saveBtn = $('ssv2-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      if (!isLiveMode()) return;
      submitRegister();
    });

    var cancelBtn = $('ssv2-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      if (!isLiveMode()) return;
      closeDrawer();
    });
  }

  window.STAM = window.STAM || {};
  window.STAM.screenSpecFirestoreCrud = {
    applyWriteAccessUI: applyWriteAccessUI,
    openRegister: openDrawerRegister,
    closeDrawer: closeDrawer,
    submitRegister: submitRegister,
    destroyPickers: destroyPickers,
    buildCreateInput: buildCreateInput,
  };

  if (isLiveMode()) {
    bindEvents();
  }
}());
