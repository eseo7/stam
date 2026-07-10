/* ============================================================================
 * STAM Requirement Picker — shared read-only requirements selector (FS-6B)
 * ----------------------------------------------------------------------------
 * Data source priority:
 *   1. STAM.requirementsService.listByProject (read-only, role authorize)
 *   2. STAM.requirementsFirestoreAdapter (fallback — not used when service exists)
 *
 * Screens must not duplicate Firestore queries or use requirements-firestore-list
 * as a picker data source.
 * ========================================================================== */
(function () {
  'use strict';

  var PLACEHOLDER_LABEL = '요구사항 선택';
  var UNLINK_LABEL = '연결 없음';
  var READ_SOURCE = 'requirementsService.listByProject';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var liveContextProviders = {
    getProjectId: null,
    getMemberRole: null,
    getContext: null,
  };

  function resolveLiveContext(container) {
    var state = stateOf(container) || {};
    var projectId = clean(state.projectId);
    var memberRole = clean(state.memberRole);
    var context = Object.assign({}, state.context || {});
    if (!projectId && typeof liveContextProviders.getProjectId === 'function') {
      projectId = clean(liveContextProviders.getProjectId());
    }
    if (!memberRole && typeof liveContextProviders.getMemberRole === 'function') {
      memberRole = clean(liveContextProviders.getMemberRole());
    }
    if (typeof liveContextProviders.getContext === 'function') {
      context = Object.assign({}, liveContextProviders.getContext(), context);
    }
    context = Object.assign({}, context, {
      projectId: projectId || clean(context.projectId),
      memberRole: memberRole || clean(context.memberRole),
    });
    return {
      projectId: projectId,
      memberRole: memberRole,
      context: context,
    };
  }

  function applyLiveContext(container) {
    var state = stateOf(container);
    if (!state) return;
    var next = resolveLiveContext(container);
    var changed = clean(state.projectId) !== clean(next.projectId)
      || clean(state.memberRole) !== clean(next.memberRole);
    if (!changed) return;
    setState(container, {
      projectId: next.projectId,
      memberRole: next.memberRole,
      context: next.context,
      items: null,
      loadError: null,
      loadingPromise: null,
    });
  }

  function formatLoadError(err) {
    if (!err) return '요구사항 목록을 불러오지 못했습니다.';
    var message = clean(err.message || err);
    if (!message) return '요구사항 목록을 불러오지 못했습니다.';
    return message;
  }

  function requirementsContract() {
    return window.STAM && window.STAM.requirementsServiceContract;
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

  function normalizeValue(value) {
    if (!value) {
      return {
        requirementId: '',
        requirementCode: '',
        requirementTitle: '',
      };
    }
    return {
      requirementId: clean(value.requirementId || value.id),
      requirementCode: clean(value.requirementCode || value.code),
      requirementTitle: clean(value.requirementTitle || value.title),
    };
  }

  function hasSelection(value) {
    var next = normalizeValue(value);
    return !!(next.requirementId || next.requirementCode);
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

  function caretSvg() {
    return '<svg class="stam-cs-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  }

  function checkSvg() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  }

  function buildPickerMarkup(placeholder) {
    return '' +
      '<div class="stam-cs" data-stam-requirement-picker-root>' +
        '<input type="hidden" data-stam-requirement-picker-id value="">' +
        '<input type="hidden" data-stam-requirement-picker-code value="">' +
        '<input type="hidden" data-stam-requirement-picker-title value="">' +
        '<button type="button" class="stam-cs-trigger" data-stam-requirement-picker-toggle aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="stam-cs-value is-placeholder" data-stam-requirement-picker-label>' + esc(placeholder || PLACEHOLDER_LABEL) + '</span>' +
          caretSvg() +
        '</button>' +
        '<div class="stam-cs-menu" data-stam-requirement-picker-menu role="listbox" hidden>' +
          '<input type="text" class="stam-input" data-stam-requirement-picker-search placeholder="REQ_### 또는 제목 검색" autocomplete="off">' +
          '<div data-stam-requirement-picker-options></div>' +
        '</div>' +
      '</div>';
  }

  function rootEl(container) {
    return container && container.querySelector('[data-stam-requirement-picker-root]');
  }

  function stateOf(container) {
    return container && container.__stamRequirementPickerState;
  }

  function setState(container, patch) {
    var prev = stateOf(container) || {};
    container.__stamRequirementPickerState = Object.assign({}, prev, patch || {});
    return container.__stamRequirementPickerState;
  }

  function closePicker(container) {
    var root = rootEl(container);
    if (!root) return;
    root.classList.remove('is-open', 'is-up');
    var toggle = root.querySelector('[data-stam-requirement-picker-toggle]');
    var menu = root.querySelector('[data-stam-requirement-picker-menu]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (menu) menu.hidden = true;
  }

  function closeAllPickers(exceptContainer) {
    document.querySelectorAll('[data-stam-requirement-picker]').forEach(function (node) {
      if (exceptContainer && node === exceptContainer) return;
      closePicker(node);
    });
  }

  function applySelection(container, item) {
    var root = rootEl(container);
    if (!root) return;
    var value = normalizeValue(item);
    var idInput = root.querySelector('[data-stam-requirement-picker-id]');
    var codeInput = root.querySelector('[data-stam-requirement-picker-code]');
    var titleInput = root.querySelector('[data-stam-requirement-picker-title]');
    var label = root.querySelector('[data-stam-requirement-picker-label]');
    if (idInput) idInput.value = value.requirementId;
    if (codeInput) codeInput.value = value.requirementCode;
    if (titleInput) titleInput.value = value.requirementTitle;
    if (label) {
      if (hasSelection(value)) {
        label.textContent = formatOptionLabel({
          id: value.requirementId,
          code: value.requirementCode,
          title: value.requirementTitle,
        });
        label.classList.remove('is-placeholder');
      } else {
        var placeholder = clean(container.getAttribute('data-stam-requirement-picker-placeholder')) || PLACEHOLDER_LABEL;
        label.textContent = placeholder;
        label.classList.add('is-placeholder');
      }
    }
    var state = stateOf(container);
    if (state && typeof state.onChange === 'function') {
      state.onChange(getValue(container));
    }
  }

  function renderOptions(container, items, filterText) {
    var root = rootEl(container);
    if (!root) return;
    var optionsHost = root.querySelector('[data-stam-requirement-picker-options]');
    if (!optionsHost) return;
    var query = clean(filterText).toLowerCase();
    var selected = getValue(container);
    var state = stateOf(container);
    var html = '';

    html += '<div class="stam-cs-opt is-placeholder' + (hasSelection(selected) ? '' : ' is-sel') + '" role="option" data-stam-requirement-picker-opt="" data-req-id="" data-req-code="" data-req-title="" aria-selected="' + (hasSelection(selected) ? 'false' : 'true') + '">' +
      '<span class="stam-cs-check" aria-hidden="true">' + checkSvg() + '</span>' +
      '<span class="stam-cs-otext">' + esc(UNLINK_LABEL) + '</span>' +
      '</div>';

    if (state && state.loadError) {
      html += '<div class="stam-cs-opt is-disabled" role="option" aria-disabled="true">' +
        '<span class="stam-cs-check" aria-hidden="true"></span>' +
        '<span class="stam-cs-otext">' + esc(formatLoadError(state.loadError)) + '</span>' +
        '</div>';
      optionsHost.innerHTML = html;
      return;
    }

    (items || []).forEach(function (item) {
      var code = formatRequirementCode(item);
      var title = clean(item.title);
      var label = formatOptionLabel(item);
      if (query) {
        var hay = (code + ' ' + title).toLowerCase();
        if (hay.indexOf(query) < 0) return;
      }
      var reqId = clean(item.id);
      var isSelected = selected.requirementId === reqId;
      html += '<div class="stam-cs-opt' + (isSelected ? ' is-sel' : '') + '" role="option" data-stam-requirement-picker-opt="1"' +
        ' data-req-id="' + esc(reqId) + '"' +
        ' data-req-code="' + esc(code) + '"' +
        ' data-req-title="' + esc(title) + '"' +
        ' aria-selected="' + (isSelected ? 'true' : 'false') + '">' +
        '<span class="stam-cs-check" aria-hidden="true">' + checkSvg() + '</span>' +
        '<span class="stam-cs-otext">' + esc(label) + '</span>' +
        '</div>';
    });

    if (!html) {
      html = '<div class="stam-cs-opt is-disabled" role="option" aria-disabled="true">' +
        '<span class="stam-cs-check" aria-hidden="true"></span>' +
        '<span class="stam-cs-otext">표시할 요구사항이 없습니다</span>' +
        '</div>';
    }

    optionsHost.innerHTML = html;
  }

  function ensureLoaded(container) {
    var state = stateOf(container);
    if (!state) return Promise.resolve([]);
    applyLiveContext(container);
    state = stateOf(container);
    if (!state) return Promise.resolve([]);
    if (state.items) return Promise.resolve(state.items);
    if (state.loadingPromise) return state.loadingPromise;

    var loadingPromise = listRequirements(state.projectId, state.context, state.memberRole)
      .then(function (items) {
        var nextItems = (items || []).slice().sort(function (a, b) {
          return formatRequirementCode(a).localeCompare(formatRequirementCode(b));
        });
        setState(container, { items: nextItems, loadError: null });
        return nextItems;
      })
      .catch(function (err) {
        setState(container, { items: [], loadError: err });
        throw err;
      })
      .finally(function () {
        var current = stateOf(container);
        if (current) current.loadingPromise = null;
      });

    setState(container, { loadingPromise: loadingPromise });
    return loadingPromise;
  }

  function openPicker(container) {
    var root = rootEl(container);
    if (!root || root.classList.contains('is-disabled')) return Promise.resolve();
    closeAllPickers(container);
    root.classList.add('is-open');
    var toggle = root.querySelector('[data-stam-requirement-picker-toggle]');
    var menu = root.querySelector('[data-stam-requirement-picker-menu]');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (menu) menu.hidden = false;

    var search = root.querySelector('[data-stam-requirement-picker-search]');
    if (search) {
      search.value = '';
      setTimeout(function () { search.focus(); }, 0);
    }

    return ensureLoaded(container).then(function (items) {
      renderOptions(container, items, '');
    }).catch(function (err) {
      var current = stateOf(container);
      if (current) setState(container, { items: [], loadError: err || current.loadError || new Error('load failed') });
      renderOptions(container, [], '');
    });
  }

  function bindPicker(container) {
    if (!container || container.getAttribute('data-stam-requirement-picker-bound') === '1') return;
    container.setAttribute('data-stam-requirement-picker-bound', '1');
    container.innerHTML = buildPickerMarkup(
      container.getAttribute('data-stam-requirement-picker-placeholder') || PLACEHOLDER_LABEL
    );

    var root = rootEl(container);
    var toggle = root.querySelector('[data-stam-requirement-picker-toggle]');
    var menu = root.querySelector('[data-stam-requirement-picker-menu]');
    var search = root.querySelector('[data-stam-requirement-picker-search]');
    var optionsHost = root.querySelector('[data-stam-requirement-picker-options]');

    if (toggle) {
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (root.classList.contains('is-open')) {
          closePicker(container);
          return;
        }
        openPicker(container);
      });
    }

    if (search) {
      search.addEventListener('input', function () {
        var state = stateOf(container);
        renderOptions(container, state && state.items ? state.items : [], search.value);
      });
      search.addEventListener('click', function (event) {
        event.stopPropagation();
      });
    }

    if (optionsHost) {
      optionsHost.addEventListener('click', function (event) {
        var opt = event.target.closest('[data-stam-requirement-picker-opt]');
        if (!opt || opt.classList.contains('is-disabled')) return;
        applySelection(container, {
          requirementId: opt.getAttribute('data-req-id') || '',
          requirementCode: opt.getAttribute('data-req-code') || '',
          requirementTitle: opt.getAttribute('data-req-title') || '',
        });
        closePicker(container);
      });
    }

    if (menu) {
      menu.addEventListener('click', function (event) {
        event.stopPropagation();
      });
    }
  }

  function mount(container, options) {
    if (!container) return;
    var opts = options || {};
    bindPicker(container);
    setState(container, {
      projectId: clean(opts.projectId),
      context: opts.context || {},
      memberRole: clean(opts.memberRole),
      onChange: typeof opts.onChange === 'function' ? opts.onChange : null,
      items: null,
      loadError: null,
      loadingPromise: null,
    });
    if (opts.value) setValue(container, opts.value);
    else clear(container);
    setDisabled(container, !!opts.disabled);
  }

  function getValue(container) {
    var root = rootEl(container);
    if (!root) return normalizeValue(null);
    return normalizeValue({
      requirementId: root.querySelector('[data-stam-requirement-picker-id]') && root.querySelector('[data-stam-requirement-picker-id]').value,
      requirementCode: root.querySelector('[data-stam-requirement-picker-code]') && root.querySelector('[data-stam-requirement-picker-code]').value,
      requirementTitle: root.querySelector('[data-stam-requirement-picker-title]') && root.querySelector('[data-stam-requirement-picker-title]').value,
    });
  }

  function setValue(container, value) {
    applySelection(container, value);
  }

  function clear(container) {
    applySelection(container, null);
    var state = stateOf(container);
    if (state) {
      var search = rootEl(container) && rootEl(container).querySelector('[data-stam-requirement-picker-search]');
      if (search) search.value = '';
      if (state.items) renderOptions(container, state.items, '');
    }
  }

  function setDisabled(container, disabled) {
    var root = rootEl(container);
    if (!root) return;
    root.classList.toggle('is-disabled', !!disabled);
    var toggle = root.querySelector('[data-stam-requirement-picker-toggle]');
    var search = root.querySelector('[data-stam-requirement-picker-search]');
    if (toggle) toggle.disabled = !!disabled;
    if (search) search.disabled = !!disabled;
    if (disabled) closePicker(container);
  }

  function refreshContext(container, options) {
    if (!container) return;
    var opts = options || {};
    var live = resolveLiveContext(container);
    setState(container, {
      projectId: clean(opts.projectId) || live.projectId || '',
      context: opts.context || live.context || {},
      memberRole: clean(opts.memberRole) || live.memberRole || '',
      items: null,
      loadError: null,
      loadingPromise: null,
    });
  }

  function initAll(options) {
    var opts = options || {};
    var getProjectId = typeof opts.getProjectId === 'function' ? opts.getProjectId : function () { return ''; };
    var getContext = typeof opts.getContext === 'function' ? opts.getContext : function () { return {}; };
    var getMemberRole = typeof opts.getMemberRole === 'function' ? opts.getMemberRole : function () { return ''; };
    liveContextProviders.getProjectId = getProjectId;
    liveContextProviders.getContext = getContext;
    liveContextProviders.getMemberRole = getMemberRole;

    document.querySelectorAll('[data-stam-requirement-picker]').forEach(function (container) {
      mount(container, {
        projectId: getProjectId(),
        context: getContext(),
        memberRole: getMemberRole(),
      });
    });

    if (!document.documentElement.getAttribute('data-stam-requirement-picker-doc-bound')) {
      document.documentElement.setAttribute('data-stam-requirement-picker-doc-bound', '1');
      document.addEventListener('click', function () {
        closeAllPickers(null);
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeAllPickers(null);
      });
    }
  }

  function destroy(container) {
    if (!container) return;
    closePicker(container);
    container.removeAttribute('data-stam-requirement-picker-bound');
    container.innerHTML = '';
    delete container.__stamRequirementPickerState;
  }

  window.STAM = window.STAM || {};
  window.STAM.requirementPicker = {
    READ_SOURCE: READ_SOURCE,
    formatRequirementCode: formatRequirementCode,
    formatOptionLabel: formatOptionLabel,
    createReadService: createReadService,
    listRequirements: listRequirements,
    mount: mount,
    getValue: getValue,
    setValue: setValue,
    clear: clear,
    setDisabled: setDisabled,
    refreshContext: refreshContext,
    initAll: initAll,
    destroy: destroy,
    closeAll: closeAllPickers,
  };
}());
