/* ============================================================================
 * STAM WBS Picker — shared read-only WBS item selector (ScreenSpec readiness)
 * ----------------------------------------------------------------------------
 * Uses STAM.referencePicker core. Reads via wbsService only.
 * No direct Firestore access. No auto-mount on file load.
 * ========================================================================== */
(function () {
  'use strict';

  var READ_SOURCE = 'wbsService.listByProject';
  var WBS_CODE_RE = /^WBS-[0-9]{3,}$/;
  var PLACEHOLDER_LABEL = 'WBS 선택';
  var UNLINK_LABEL = '연결 없음';
  var SEARCH_PLACEHOLDER = 'WBS-### 또는 제목 검색';
  var EMPTY_LABEL = '표시할 WBS 항목이 없습니다';

  var pickerInstance = null;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function wbsContract() {
    return window.STAM && window.STAM.wbsServiceContract;
  }

  function referencePickerApi() {
    if (!window.STAM || !window.STAM.referencePicker || typeof window.STAM.referencePicker.create !== 'function') {
      throw new Error('wbsPicker: referencePicker is required');
    }
    return window.STAM.referencePicker;
  }

  function formatMeta(raw) {
    var parts = [raw && raw.phase, raw && raw.functionGroup, raw && raw.ownerName]
      .map(function (v) { return clean(v); })
      .filter(Boolean);
    return parts.join(' \u00b7 ');
  }

  function ensurePicker() {
    if (pickerInstance) return pickerInstance;
    var contract = wbsContract();
    if (!contract || typeof contract.createMemberRoleAuthorize !== 'function') {
      throw new Error('wbsPicker: wbsServiceContract is required');
    }
    pickerInstance = referencePickerApi().create({
      type: 'wbsItem',
      placeholder: PLACEHOLDER_LABEL,
      unlinkLabel: UNLINK_LABEL,
      searchPlaceholder: SEARCH_PLACEHOLDER,
      emptyLabel: EMPTY_LABEL,
      errorLabel: 'WBS 목록을 불러오지 못했습니다',
      allowClear: true,
      loadItems: function (request) {
        var projectId = clean(request && request.projectId);
        var memberRole = clean(request && request.memberRole);
        var context = (request && request.context) || {};
        return listWbsItems(projectId, context, memberRole);
      },
      normalizeItem: function (raw) {
        if (!raw) return null;
        var code = clean(raw.code);
        var title = clean(raw.title);
        var id = clean(raw.id);
        if (!id || !code || !title || !WBS_CODE_RE.test(code) || raw.isDeleted === true) return null;
        return {
          id: id,
          code: code,
          title: title,
          meta: formatMeta(raw),
          raw: raw,
        };
      },
      normalizeValue: function (value) {
        if (!value) {
          return { id: '', code: '', title: '', meta: '' };
        }
        var id = clean(value.wbsItemId || value.id);
        var code = clean(value.wbsItemCode || value.code);
        var title = clean(value.wbsItemTitle || value.title);
        if (id || code || title) {
          if (!id || !code || !title) {
            throw new Error('wbsPicker: partial wbs value is not allowed');
          }
          if (!WBS_CODE_RE.test(code)) {
            throw new Error('wbsPicker: invalid wbsItemCode');
          }
        }
        return { id: id, code: code, title: title, meta: '' };
      },
      toPublicValue: function (internal) {
        return {
          wbsItemId: clean(internal.id),
          wbsItemCode: clean(internal.code),
          wbsItemTitle: clean(internal.title),
        };
      },
      formatLabel: function (item) {
        var code = clean(item.code);
        var title = clean(item.title) || '(제목 없음)';
        return code ? (code + ' \u00b7 ' + title) : title;
      },
      formatMeta: function (item) {
        return clean(item.meta);
      },
      filterText: function (item, query) {
        if (!query) return true;
        var hay = (clean(item.code) + ' ' + clean(item.title) + ' ' + clean(item.meta)).toLowerCase();
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
    var contract = wbsContract();
    if (!contract || typeof contract.createService !== 'function') {
      throw new Error('wbsPicker: wbsServiceContract is required');
    }
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    return contract.createService({ authorize: authorize });
  }

  function listWbsItems(projectId, context, memberRole) {
    var pid = clean(projectId);
    if (!pid) return Promise.reject(new Error('wbsPicker: projectId is required'));
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
  window.STAM.wbsPicker = {
    READ_SOURCE: READ_SOURCE,
    createReadService: createReadService,
    listWbsItems: listWbsItems,
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
