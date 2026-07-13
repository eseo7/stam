/* ============================================================================
 * STAM Functional Specification Picker — read-only FN_### selector (WBS-3)
 * ----------------------------------------------------------------------------
 * Uses STAM.referencePicker core. Reads via functionalSpecService only.
 * No direct Firestore access. No auto-mount on file load.
 * ========================================================================== */
(function () {
  'use strict';

  var READ_SOURCE = 'functionalSpecService.listByProject';
  var FN_CODE_RE = /^FN_[0-9]{3,}$/;
  var PLACEHOLDER_LABEL = '기능정의 선택';
  var UNLINK_LABEL = '연결 없음';
  var SEARCH_PLACEHOLDER = 'FN_### 또는 제목 검색';
  var EMPTY_LABEL = '표시할 기능정의가 없습니다';

  var pickerInstance = null;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function functionalSpecContract() {
    return window.STAM && window.STAM.functionalSpecServiceContract;
  }

  function referencePickerApi() {
    if (!window.STAM || !window.STAM.referencePicker || typeof window.STAM.referencePicker.create !== 'function') {
      throw new Error('functionalSpecPicker: referencePicker is required');
    }
    return window.STAM.referencePicker;
  }

  function ensurePicker() {
    if (pickerInstance) return pickerInstance;
    var contract = functionalSpecContract();
    if (!contract || typeof contract.createMemberRoleAuthorize !== 'function') {
      throw new Error('functionalSpecPicker: functionalSpecServiceContract is required');
    }
    pickerInstance = referencePickerApi().create({
      type: 'functionalSpec',
      placeholder: PLACEHOLDER_LABEL,
      unlinkLabel: UNLINK_LABEL,
      searchPlaceholder: SEARCH_PLACEHOLDER,
      emptyLabel: EMPTY_LABEL,
      errorLabel: '기능정의 목록을 불러오지 못했습니다',
      allowClear: true,
      loadItems: function (request) {
        var projectId = clean(request && request.projectId);
        var memberRole = clean(request && request.memberRole);
        var context = (request && request.context) || {};
        return listFunctionalSpecs(projectId, context, memberRole);
      },
      normalizeItem: function (raw) {
        if (!raw) return null;
        var code = clean(raw.code);
        var title = clean(raw.title);
        var id = clean(raw.id);
        if (!id || !code || !title || !FN_CODE_RE.test(code) || raw.isDeleted === true) return null;
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
        var id = clean(value.functionalSpecId || value.id);
        var code = clean(value.functionalSpecCode || value.code);
        var title = clean(value.functionalSpecTitle || value.title);
        if (id || code || title) {
          if (!id || !code || !title) {
            throw new Error('functionalSpecPicker: partial functional spec value is not allowed');
          }
          if (!FN_CODE_RE.test(code)) {
            throw new Error('functionalSpecPicker: invalid functionalSpecCode');
          }
        }
        return { id: id, code: code, title: title, meta: '' };
      },
      toPublicValue: function (internal) {
        return {
          functionalSpecId: clean(internal.id),
          functionalSpecCode: clean(internal.code),
          functionalSpecTitle: clean(internal.title),
        };
      },
      formatLabel: function (item) {
        var code = clean(item.code);
        var title = clean(item.title) || '(제목 없음)';
        return code ? (code + ' \u00b7 ' + title) : title;
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
    var contract = functionalSpecContract();
    if (!contract || typeof contract.createService !== 'function') {
      throw new Error('functionalSpecPicker: functionalSpecServiceContract is required');
    }
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    return contract.createService({ authorize: authorize });
  }

  function listFunctionalSpecs(projectId, context, memberRole) {
    var pid = clean(projectId);
    if (!pid) return Promise.reject(new Error('functionalSpecPicker: projectId is required'));
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

  function destroy(container) {
    ensurePicker().destroy(container);
  }

  window.STAM = window.STAM || {};
  window.STAM.functionalSpecPicker = {
    READ_SOURCE: READ_SOURCE,
    createReadService: createReadService,
    listFunctionalSpecs: listFunctionalSpecs,
    mount: mount,
    load: load,
    getValue: getValue,
    setValue: setValue,
    clear: clear,
    setDisabled: setDisabled,
    refreshContext: refreshContext,
    destroy: destroy,
  };
}());
