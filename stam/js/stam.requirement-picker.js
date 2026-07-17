/* ============================================================================
 * STAM Requirement Picker — shared read-only requirements selector (FS-6B)
 * ----------------------------------------------------------------------------
 * Uses STAM.referencePicker core. Reads via requirementsService only.
 * No direct Firestore access. No auto-mount on file load.
 * ========================================================================== */
(function () {
  'use strict';

  var READ_SOURCE = 'requirementsService.listByProject';
  var REQ_CODE_RE = /^REQ_[0-9]{3,}$/;
  var PLACEHOLDER_LABEL = '요구사항 선택';
  var UNLINK_LABEL = '연결 없음';
  var SEARCH_PLACEHOLDER = 'REQ_### 또는 제목 검색';
  var EMPTY_LABEL = '표시할 요구사항이 없습니다';

  var pickerInstance = null;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function requirementsContract() {
    return window.STAM && window.STAM.requirementsServiceContract;
  }

  function referencePickerApi() {
    if (!window.STAM || !window.STAM.referencePicker || typeof window.STAM.referencePicker.create !== 'function') {
      throw new Error('requirementPicker: referencePicker is required');
    }
    return window.STAM.referencePicker;
  }

  function formatRequirementCode(item) {
    if (!item) return '';
    return clean(item.requirementCode || item.code);
  }

  function formatOptionLabel(item) {
    if (!item) return PLACEHOLDER_LABEL;
    var code = formatRequirementCode(item);
    var title = clean(item.title) || '(제목 없음)';
    return code ? (code + ' \u00b7 ' + title) : title;
  }

  function ensurePicker() {
    if (pickerInstance) return pickerInstance;
    var contract = requirementsContract();
    if (!contract || typeof contract.createMemberRoleAuthorize !== 'function') {
      throw new Error('requirementPicker: requirementsServiceContract is required');
    }
    pickerInstance = referencePickerApi().create({
      type: 'requirement',
      placeholder: PLACEHOLDER_LABEL,
      unlinkLabel: UNLINK_LABEL,
      searchPlaceholder: SEARCH_PLACEHOLDER,
      emptyLabel: EMPTY_LABEL,
      errorLabel: '요구사항 목록을 불러오지 못했습니다',
      allowClear: true,
      loadItems: function (request) {
        var projectId = clean(request && request.projectId);
        var memberRole = clean(request && request.memberRole);
        var context = (request && request.context) || {};
        return listRequirements(projectId, context, memberRole);
      },
      normalizeItem: function (raw) {
        if (!raw) return null;
        var code = clean(raw.code);
        var title = clean(raw.title);
        var id = clean(raw.id);
        if (!id || !code || !title || !REQ_CODE_RE.test(code) || raw.isDeleted === true) return null;
        return {
          id: id,
          code: code,
          title: title,
          meta: '',
          raw: raw,
        };
      },
      normalizeValue: function (value) {
        if (!value) {
          return { id: '', code: '', title: '', meta: '' };
        }
        var id = clean(value.requirementId || value.id);
        var code = clean(value.requirementCode || value.code);
        var title = clean(value.requirementTitle || value.title);
        if (id || code || title) {
          if (!id || !code || !title) {
            throw new Error('requirementPicker: partial requirement value is not allowed');
          }
          if (!REQ_CODE_RE.test(code)) {
            throw new Error('requirementPicker: invalid requirementCode');
          }
        }
        return { id: id, code: code, title: title, meta: '' };
      },
      toPublicValue: function (internal) {
        return {
          requirementId: clean(internal.id),
          requirementCode: clean(internal.code),
          requirementTitle: clean(internal.title),
        };
      },
      formatLabel: function (item) {
        return formatOptionLabel(item);
      },
      formatMeta: function () {
        return '';
      },
      filterText: function (item, query) {
        if (!query) return true;
        var hay = (clean(item.code) + ' ' + clean(item.title)).toLowerCase();
        return hay.indexOf(query) >= 0;
      },
      sortItems: function (items) {
        return (items || []).slice().sort(function (a, b) {
          var ac = clean(a.code);
          var bc = clean(b.code);
          if (ac !== bc) return ac.localeCompare(bc);
          var at = clean(a.title);
          var bt = clean(b.title);
          if (at !== bt) return at.localeCompare(bt);
          return clean(a.id).localeCompare(clean(b.id));
        });
      },
    });
    return pickerInstance;
  }

  function createReadService(memberRole) {
    var contract = requirementsContract();
    if (!contract || typeof contract.createService !== 'function') {
      throw new Error('requirementPicker: requirementsServiceContract is required');
    }
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    return contract.createService({ authorize: authorize });
  }

  function listRequirements(projectId, context, memberRole) {
    var pid = clean(projectId);
    if (!pid) return Promise.reject(new Error('requirementPicker: projectId is required'));
    var readService = createReadService(memberRole);
    var ctx = Object.assign({}, context || {}, { memberRole: memberRole || (context && context.memberRole) });
    return readService.listByProject(pid, { includeDeleted: false }, ctx);
  }

  function mount(container, options) {
    ensurePicker().mount(container, options);
  }

  function load(container) {
    return ensurePicker().load(container);
  }

  function getValue(container) {
    return ensurePicker().getValue(container);
  }

  function setValue(container, value) {
    ensurePicker().setValue(container, value);
  }

  function clear(container) {
    ensurePicker().clear(container);
  }

  function setDisabled(container, disabled) {
    ensurePicker().setDisabled(container, disabled);
  }

  function refreshContext(container, options) {
    ensurePicker().refreshContext(container, options);
  }

  function initAll(options) {
    var opts = options || {};
    var getProjectId = typeof opts.getProjectId === 'function' ? opts.getProjectId : function () { return ''; };
    var getContext = typeof opts.getContext === 'function' ? opts.getContext : function () { return {}; };
    var getMemberRole = typeof opts.getMemberRole === 'function' ? opts.getMemberRole : function () { return ''; };

    document.querySelectorAll('[data-stam-requirement-picker]').forEach(function (container) {
      if (container.getAttribute('data-stam-reference-picker-mounted') === '1') return;
      mount(container, {
        projectId: getProjectId(),
        context: getContext(),
        memberRole: getMemberRole(),
      });
    });
  }

  function destroy(container) {
    ensurePicker().destroy(container);
  }

  function closeAll(exceptContainer) {
    if (window.STAM && window.STAM.referencePicker && typeof window.STAM.referencePicker._closeAll === 'function') {
      window.STAM.referencePicker._closeAll(exceptContainer);
      return;
    }
    ensurePicker().close(exceptContainer);
  }

  window.STAM = window.STAM || {};
  window.STAM.requirementPicker = {
    READ_SOURCE: READ_SOURCE,
    formatRequirementCode: formatRequirementCode,
    formatOptionLabel: formatOptionLabel,
    createReadService: createReadService,
    listRequirements: listRequirements,
    mount: mount,
    load: load,
    getValue: getValue,
    setValue: setValue,
    clear: clear,
    setDisabled: setDisabled,
    refreshContext: refreshContext,
    initAll: initAll,
    destroy: destroy,
    closeAll: closeAll,
  };
}());
