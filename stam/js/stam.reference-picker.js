/* ============================================================================
 * STAM Reference Picker — configurable read-only selection core
 * ----------------------------------------------------------------------------
 * Shared UI core for artifact pickers. No artifact-specific Firestore paths,
 * service names, or storage keys are embedded in this module.
 * ========================================================================== */
(function () {
  'use strict';

  var instances = typeof WeakMap === 'function' ? new WeakMap() : null;
  var instanceBag = typeof WeakMap !== 'function' ? [] : null;
  var docBound = false;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function caretSvg() {
    return '<svg class="stam-cs-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  }

  function checkSvg() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  }

  function recordOf(container) {
    if (!container) return null;
    if (instances) return instances.get(container) || null;
    for (var i = 0; i < instanceBag.length; i += 1) {
      if (instanceBag[i].container === container) return instanceBag[i];
    }
    return null;
  }

  function setRecord(container, record) {
    if (!container) return;
    if (instances) {
      instances.set(container, record);
      return;
    }
    for (var i = 0; i < instanceBag.length; i += 1) {
      if (instanceBag[i].container === container) {
        instanceBag[i] = record;
        return;
      }
    }
    instanceBag.push(record);
  }

  function deleteRecord(container) {
    if (!container) return;
    if (instances) {
      instances.delete(container);
      return;
    }
    instanceBag = instanceBag.filter(function (entry) {
      return entry.container !== container;
    });
  }

  function allRecords() {
    if (instances) {
      var out = [];
      return out;
    }
    return instanceBag.slice();
  }

  function requireConfigField(config, field) {
    if (!config || typeof config[field] !== 'function') {
      throw new Error('referencePicker: config.' + field + ' is required');
    }
  }

  function validateConfig(config) {
    var cfg = config || {};
    requireConfigField(cfg, 'loadItems');
    requireConfigField(cfg, 'normalizeItem');
    requireConfigField(cfg, 'normalizeValue');
    requireConfigField(cfg, 'toPublicValue');
    requireConfigField(cfg, 'formatLabel');
    if (typeof cfg.formatMeta !== 'function') cfg.formatMeta = function () { return ''; };
    if (typeof cfg.filterText !== 'function') {
      cfg.filterText = function (item, query) {
        var hay = (clean(item.code) + ' ' + clean(item.title) + ' ' + clean(item.meta)).toLowerCase();
        return !query || hay.indexOf(query) >= 0;
      };
    }
    if (typeof cfg.sortItems !== 'function') {
      cfg.sortItems = function (items) {
        return (items || []).slice().sort(function (a, b) {
          return clean(a.code || a.id).localeCompare(clean(b.code || b.id));
        });
      };
    }
    cfg.placeholder = clean(cfg.placeholder) || '선택';
    cfg.unlinkLabel = clean(cfg.unlinkLabel) || '연결 없음';
    cfg.searchPlaceholder = clean(cfg.searchPlaceholder) || '검색';
    cfg.emptyLabel = clean(cfg.emptyLabel) || '표시할 항목이 없습니다';
    cfg.errorLabel = clean(cfg.errorLabel) || '목록을 불러오지 못했습니다';
    cfg.allowClear = cfg.allowClear !== false;
    cfg.type = clean(cfg.type) || 'reference';
    return cfg;
  }

  function rootEl(container) {
    return container && container.querySelector('[data-stam-reference-picker-root]');
  }

  function stateOf(container) {
    var rec = recordOf(container);
    return rec ? rec.state : null;
  }

  function setState(container, patch) {
    var rec = recordOf(container);
    if (!rec) return null;
    rec.state = Object.assign({}, rec.state || {}, patch || {});
    return rec.state;
  }

  function contextKey(projectId, memberRole, context) {
    return clean(projectId) + '|' + clean(memberRole) + '|' + JSON.stringify(context || {});
  }

  function buildMarkup(cfg) {
    return '' +
      '<div class="stam-cs" data-stam-reference-picker-root data-stam-reference-picker-type="' + esc(cfg.type) + '">' +
        '<input type="hidden" data-stam-reference-picker-id value="">' +
        '<input type="hidden" data-stam-reference-picker-code value="">' +
        '<input type="hidden" data-stam-reference-picker-title value="">' +
        '<input type="hidden" data-stam-reference-picker-meta value="">' +
        '<button type="button" class="stam-cs-trigger" data-stam-reference-picker-toggle aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="stam-cs-value is-placeholder" data-stam-reference-picker-label>' + esc(cfg.placeholder) + '</span>' +
          caretSvg() +
        '</button>' +
        '<div class="stam-cs-menu" data-stam-reference-picker-menu role="listbox" hidden>' +
          '<input type="text" class="stam-input" data-stam-reference-picker-search placeholder="' + esc(cfg.searchPlaceholder) + '" autocomplete="off">' +
          '<div data-stam-reference-picker-options></div>' +
        '</div>' +
      '</div>';
  }

  function getInternalValue(container) {
    var root = rootEl(container);
    if (!root) {
      return { id: '', code: '', title: '', meta: '' };
    }
    return {
      id: clean(root.querySelector('[data-stam-reference-picker-id]') && root.querySelector('[data-stam-reference-picker-id]').value),
      code: clean(root.querySelector('[data-stam-reference-picker-code]') && root.querySelector('[data-stam-reference-picker-code]').value),
      title: clean(root.querySelector('[data-stam-reference-picker-title]') && root.querySelector('[data-stam-reference-picker-title]').value),
      meta: clean(root.querySelector('[data-stam-reference-picker-meta]') && root.querySelector('[data-stam-reference-picker-meta]').value),
    };
  }

  function hasSelection(value) {
    return !!(clean(value && value.id) || clean(value && value.code) || clean(value && value.title));
  }

  function applyInternalValue(container, cfg, value, item) {
    var root = rootEl(container);
    if (!root) return;
    var normalized = cfg.normalizeValue(value || null);
    var idInput = root.querySelector('[data-stam-reference-picker-id]');
    var codeInput = root.querySelector('[data-stam-reference-picker-code]');
    var titleInput = root.querySelector('[data-stam-reference-picker-title]');
    var metaInput = root.querySelector('[data-stam-reference-picker-meta]');
    var label = root.querySelector('[data-stam-reference-picker-label]');
    if (idInput) idInput.value = clean(normalized.id);
    if (codeInput) codeInput.value = clean(normalized.code);
    if (titleInput) titleInput.value = clean(normalized.title);
    if (metaInput) metaInput.value = clean(normalized.meta);
    if (label) {
      if (hasSelection(normalized)) {
        var displayItem = item || normalized;
        label.textContent = cfg.formatLabel(displayItem);
        label.classList.remove('is-placeholder');
      } else {
        label.textContent = cfg.placeholder;
        label.classList.add('is-placeholder');
      }
    }
    var rec = recordOf(container);
    if (rec && typeof rec.onChange === 'function') {
      rec.onChange(cfg.toPublicValue(normalized));
    }
  }

  function reportLoadError(cfg, rec, err) {
    if (err && typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('referencePicker: load failed', err);
    }
    if (rec && typeof rec.onLoadError === 'function') {
      try {
        rec.onLoadError(err);
      } catch (reportErr) {
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error('referencePicker: onLoadError callback failed', reportErr);
        }
      }
    }
  }

  function formatErrorLabel(cfg) {
    return cfg.errorLabel;
  }

  function listboxEl(container) {
    var root = rootEl(container);
    return root && root.querySelector('[data-stam-reference-picker-menu]');
  }

  function optionsHostEl(container) {
    var root = rootEl(container);
    return root && root.querySelector('[data-stam-reference-picker-options]');
  }

  function toggleEl(container) {
    var root = rootEl(container);
    return root && root.querySelector('[data-stam-reference-picker-toggle]');
  }

  function selectableOptions(container) {
    var host = optionsHostEl(container);
    if (!host) return [];
    var nodes = host.querySelectorAll('[role="option"]');
    var out = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var opt = nodes[i];
      if (opt.classList.contains('is-disabled')) continue;
      if (opt.getAttribute('aria-disabled') === 'true') continue;
      out.push(opt);
    }
    return out;
  }

  function removeAttr(el, name) {
    if (!el) return;
    if (typeof el.removeAttribute === 'function') {
      el.removeAttribute(name);
      return;
    }
    if (el.attributes) delete el.attributes[name];
  }

  function clearActiveVisual(container) {
    var host = optionsHostEl(container);
    if (!host) return;
    var active = host.querySelectorAll('.is-active');
    for (var i = 0; i < active.length; i += 1) {
      active[i].classList.remove('is-active');
    }
    var menu = listboxEl(container);
    removeAttr(menu, 'aria-activedescendant');
  }

  function preferredActiveIndex(container, options) {
    var opts = options || selectableOptions(container);
    if (!opts.length) return -1;
    var selected = getInternalValue(container);
    if (hasSelection(selected)) {
      var selectedId = clean(selected.id);
      for (var i = 0; i < opts.length; i += 1) {
        if (clean(opts[i].getAttribute('data-opt-id')) === selectedId) return i;
      }
    }
    return 0;
  }

  function setActiveIndex(container, index, options) {
    var opts = options || selectableOptions(container);
    clearActiveVisual(container);
    if (!opts.length) {
      setState(container, { activeIndex: -1 });
      return -1;
    }
    var next = Math.max(0, Math.min(index, opts.length - 1));
    var target = opts[next];
    if (target) {
      target.classList.add('is-active');
      var menu = listboxEl(container);
      var optionId = target.getAttribute('id');
      if (menu && optionId) menu.setAttribute('aria-activedescendant', optionId);
    }
    setState(container, { activeIndex: next });
    return next;
  }

  function moveActiveIndex(container, delta) {
    var opts = selectableOptions(container);
    if (!opts.length) return -1;
    var state = stateOf(container) || {};
    var current = typeof state.activeIndex === 'number' ? state.activeIndex : -1;
    if (current < 0) return setActiveIndex(container, delta > 0 ? 0 : opts.length - 1, opts);
    return setActiveIndex(container, current + delta, opts);
  }

  function selectOptionElement(container, cfg, opt) {
    if (!opt || opt.classList.contains('is-disabled')) return;
    applyInternalValue(container, cfg, {
      id: opt.getAttribute('data-opt-id') || '',
      code: opt.getAttribute('data-opt-code') || '',
      title: opt.getAttribute('data-opt-title') || '',
      meta: opt.getAttribute('data-opt-meta') || '',
    }, {
      id: opt.getAttribute('data-opt-id') || '',
      code: opt.getAttribute('data-opt-code') || '',
      title: opt.getAttribute('data-opt-title') || '',
      meta: opt.getAttribute('data-opt-meta') || '',
    });
    closePicker(container, { focusTrigger: true });
  }

  function selectActiveOption(container, cfg) {
    var state = stateOf(container) || {};
    var opts = selectableOptions(container);
    if (!opts.length) return;
    var index = typeof state.activeIndex === 'number' && state.activeIndex >= 0 ? state.activeIndex : 0;
    selectOptionElement(container, cfg, opts[index]);
  }

  function ensureListboxIds(container) {
    var rec = recordOf(container);
    if (!rec) return { listboxId: '', optionPrefix: '' };
    if (!rec.listboxId) {
      rec.listboxId = 'stam-reference-picker-listbox-' + String(Math.random()).slice(2);
      rec.optionPrefix = rec.listboxId + '-opt';
    }
    var menu = listboxEl(container);
    if (menu && !menu.getAttribute('id')) menu.setAttribute('id', rec.listboxId);
    var toggle = toggleEl(container);
    if (toggle && rec.listboxId) toggle.setAttribute('aria-controls', rec.listboxId);
    return { listboxId: rec.listboxId, optionPrefix: rec.optionPrefix };
  }

  function syncActiveAfterRender(container) {
    setActiveIndex(container, preferredActiveIndex(container));
  }

  function renderOptions(container, cfg, items, filterText) {
    var root = rootEl(container);
    if (!root) return;
    var rec = recordOf(container);
    if (!rec || rec.destroyed) return;
    var optionsHost = root.querySelector('[data-stam-reference-picker-options]');
    if (!optionsHost) return;
    var ids = ensureListboxIds(container);
    var query = clean(filterText).toLowerCase();
    var selected = getInternalValue(container);
    var html = '';
    var state = stateOf(container);
    var optionSeq = 0;

    function nextOptionId() {
      var id = ids.optionPrefix + '-' + optionSeq;
      optionSeq += 1;
      return id;
    }

    if (cfg.allowClear) {
      html += '<div class="stam-cs-opt is-placeholder' + (hasSelection(selected) ? '' : ' is-sel') + '" role="option" id="' + esc(nextOptionId()) + '" data-stam-reference-picker-opt="" data-opt-id="" data-opt-code="" data-opt-title="" data-opt-meta="" aria-selected="' + (hasSelection(selected) ? 'false' : 'true') + '">' +
        '<span class="stam-cs-check" aria-hidden="true">' + checkSvg() + '</span>' +
        '<span class="stam-cs-otext">' + esc(cfg.unlinkLabel) + '</span>' +
        '</div>';
    }

    if (state && state.loadError) {
      html += '<div class="stam-cs-opt is-disabled" role="option" aria-disabled="true" data-stam-reference-picker-retry="1">' +
        '<span class="stam-cs-check" aria-hidden="true"></span>' +
        '<span class="stam-cs-otext">' + esc(formatErrorLabel(cfg)) + '</span>' +
        '</div>';
      optionsHost.innerHTML = html;
      clearActiveVisual(container);
      setState(container, { activeIndex: -1 });
      return;
    }

  var visibleCount = 0;
    (items || []).forEach(function (item) {
      if (!item || !clean(item.id)) return;
      if (!cfg.filterText(item, query)) return;
      visibleCount += 1;
      var isSelected = clean(selected.id) === clean(item.id);
      var meta = clean(cfg.formatMeta(item));
      html += '<div class="stam-cs-opt' + (isSelected ? ' is-sel' : '') + '" role="option" id="' + esc(nextOptionId()) + '" data-stam-reference-picker-opt="1"' +
        ' data-opt-id="' + esc(item.id) + '"' +
        ' data-opt-code="' + esc(item.code) + '"' +
        ' data-opt-title="' + esc(item.title) + '"' +
        ' data-opt-meta="' + esc(meta) + '"' +
        ' aria-selected="' + (isSelected ? 'true' : 'false') + '">' +
        '<span class="stam-cs-check" aria-hidden="true">' + checkSvg() + '</span>' +
        '<span class="stam-cs-otext">' + esc(cfg.formatLabel(item)) + (meta ? ' <span class="stam-cs-meta">' + esc(meta) + '</span>' : '') + '</span>' +
        '</div>';
    });

    if (!visibleCount && !state.loadError) {
      html += '<div class="stam-cs-opt is-disabled" role="option" aria-disabled="true">' +
        '<span class="stam-cs-check" aria-hidden="true"></span>' +
        '<span class="stam-cs-otext">' + esc(cfg.emptyLabel) + '</span>' +
        '</div>';
    }

    optionsHost.innerHTML = html;
    syncActiveAfterRender(container);
  }

  function closePicker(container, options) {
    var root = rootEl(container);
    if (!root) return;
    var opts = options || {};
    root.classList.remove('is-open', 'is-up');
    var toggle = root.querySelector('[data-stam-reference-picker-toggle]');
    var menu = root.querySelector('[data-stam-reference-picker-menu]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (menu) menu.hidden = true;
    clearActiveVisual(container);
    setState(container, { activeIndex: -1 });
    var rec = recordOf(container);
    if (rec) rec.open = false;
    if (opts.focusTrigger && toggle && typeof toggle.focus === 'function') toggle.focus();
  }

  function closeAll(exceptContainer, options) {
    var opts = options || {};
    var records = instanceBag ? instanceBag.slice() : [];
    if (instances && typeof document !== 'undefined') {
      document.querySelectorAll('[data-stam-reference-picker-mounted]').forEach(function (node) {
        if (exceptContainer && node === exceptContainer) return;
        closePicker(node, opts);
      });
      return;
    }
    records.forEach(function (rec) {
      if (!rec || rec.destroyed) return;
      if (exceptContainer && rec.container === exceptContainer) return;
      closePicker(rec.container, opts);
    });
  }

  function ensureDocBound() {
    if (docBound || typeof document === 'undefined') return;
    docBound = true;
    document.addEventListener('click', function () {
      closeAll(null);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll(null, { focusTrigger: true });
    });
  }

  function load(container, cfg) {
    var rec = recordOf(container);
    if (!rec || rec.destroyed) return Promise.resolve([]);
    var state = stateOf(container);
    if (!state) return Promise.resolve([]);
    var version = state.loadVersion;
    var key = contextKey(state.projectId, state.memberRole, state.context);
    if (state.items && state.contextKey === key) return Promise.resolve(state.items);
    if (state.loadingPromise && state.loadingContextKey === key) return state.loadingPromise;

    var loadingPromise = Promise.resolve().then(function () {
      return cfg.loadItems({
        projectId: state.projectId,
        memberRole: state.memberRole,
        context: state.context,
      });
    }).then(function (rawItems) {
      var current = recordOf(container);
      if (!current || current.destroyed) return [];
      var currentState = stateOf(container);
      if (!currentState || currentState.loadVersion !== version) return [];
      var nextItems = cfg.sortItems((rawItems || []).map(cfg.normalizeItem).filter(Boolean));
      setState(container, {
        items: nextItems,
        loadError: null,
        contextKey: key,
        loadingPromise: null,
        loadingContextKey: null,
      });
      return nextItems;
    }).catch(function (err) {
      var current = recordOf(container);
      if (!current || current.destroyed) return [];
      var currentState = stateOf(container);
      if (!currentState || currentState.loadVersion !== version) return [];
      reportLoadError(cfg, current, err);
      setState(container, {
        items: [],
        loadError: err,
        contextKey: key,
        loadingPromise: null,
        loadingContextKey: null,
      });
      throw err;
    });

    setState(container, {
      loadingPromise: loadingPromise,
      loadingContextKey: key,
    });
    return loadingPromise;
  }

  function openPicker(container, cfg) {
    var root = rootEl(container);
    if (!root || root.classList.contains('is-disabled')) return Promise.resolve();
    var rec = recordOf(container);
    if (!rec || rec.destroyed) return Promise.resolve();
    ensureDocBound();
    closeAll(container);
    root.classList.add('is-open');
    rec.open = true;
    var toggle = root.querySelector('[data-stam-reference-picker-toggle]');
    var menu = root.querySelector('[data-stam-reference-picker-menu]');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (menu) menu.hidden = false;
    var search = root.querySelector('[data-stam-reference-picker-search]');
    if (search) {
      search.value = '';
      if (typeof search.focus === 'function') search.focus();
    }
    return load(container, cfg).then(function (items) {
      renderOptions(container, cfg, items, '');
    }).catch(function () {
      var state = stateOf(container);
      renderOptions(container, cfg, state && state.items ? state.items : [], '');
    });
  }

  function handleMenuKeydown(event, container, cfg) {
    var root = rootEl(container);
    if (!root || !root.classList.contains('is-open')) return;
    var key = event.key;
    if (key === 'ArrowDown') {
      event.preventDefault();
      moveActiveIndex(container, 1);
      return;
    }
    if (key === 'ArrowUp') {
      event.preventDefault();
      moveActiveIndex(container, -1);
      return;
    }
    if (key === 'Home') {
      event.preventDefault();
      setActiveIndex(container, 0);
      return;
    }
    if (key === 'End') {
      event.preventDefault();
      var opts = selectableOptions(container);
      setActiveIndex(container, opts.length - 1, opts);
      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      selectActiveOption(container, cfg);
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePicker(container, { focusTrigger: true });
    }
  }

  function bindContainer(container, cfg, options) {
    if (!container || container.getAttribute('data-stam-reference-picker-mounted') === '1') return;
    container.setAttribute('data-stam-reference-picker-mounted', '1');
    container.innerHTML = buildMarkup(cfg);
    var root = rootEl(container);
    var toggle = root.querySelector('[data-stam-reference-picker-toggle]');
    var menu = root.querySelector('[data-stam-reference-picker-menu]');
    var search = root.querySelector('[data-stam-reference-picker-search]');
    var optionsHost = root.querySelector('[data-stam-reference-picker-options]');
    ensureListboxIds(container);

    if (toggle) {
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (root.classList.contains('is-open')) {
          closePicker(container);
          return;
        }
        openPicker(container, cfg);
      });
      toggle.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (root.classList.contains('is-open')) {
            closePicker(container, { focusTrigger: true });
            return;
          }
          openPicker(container, cfg);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          var openPromise = root.classList.contains('is-open')
            ? Promise.resolve()
            : openPicker(container, cfg);
          openPromise.then(function () {
            var opts = selectableOptions(container);
            var start = preferredActiveIndex(container, opts);
            setActiveIndex(container, start, opts);
          });
        }
      });
    }
    if (search) {
      search.addEventListener('input', function () {
        var state = stateOf(container);
        renderOptions(container, cfg, state && state.items ? state.items : [], search.value);
      });
      search.addEventListener('click', function (event) {
        event.stopPropagation();
      });
      search.addEventListener('keydown', function (event) {
        handleMenuKeydown(event, container, cfg);
      });
    }
    if (optionsHost) {
      optionsHost.addEventListener('click', function (event) {
        var retry = event.target.closest('[data-stam-reference-picker-retry]');
        if (retry) {
          setState(container, { loadError: null, items: null, loadingPromise: null });
          openPicker(container, cfg);
          return;
        }
        var opt = event.target.closest('[data-stam-reference-picker-opt]');
        if (!opt || opt.classList.contains('is-disabled')) return;
        selectOptionElement(container, cfg, opt);
      });
      optionsHost.addEventListener('keydown', function (event) {
        handleMenuKeydown(event, container, cfg);
      });
    }
    if (menu) {
      menu.addEventListener('click', function (event) {
        event.stopPropagation();
      });
      menu.addEventListener('keydown', function (event) {
        handleMenuKeydown(event, container, cfg);
      });
    }
  }

  function create(config) {
    var cfg = validateConfig(config);

    function mount(container, options) {
      if (!container) return;
      if (container.getAttribute('data-stam-reference-picker-mounted') === '1') {
        throw new Error('referencePicker: duplicate mount is not allowed');
      }
      var opts = options || {};
      var loadVersion = 1;
      setRecord(container, {
        container: container,
        config: cfg,
        destroyed: false,
        open: false,
        onChange: typeof opts.onChange === 'function' ? opts.onChange : null,
        onLoadError: typeof opts.onLoadError === 'function' ? opts.onLoadError : null,
        state: {
          projectId: clean(opts.projectId),
          memberRole: clean(opts.memberRole),
          context: opts.context || {},
          items: null,
          loadError: null,
          loadingPromise: null,
          loadingContextKey: null,
          contextKey: '',
          loadVersion: loadVersion,
          activeIndex: -1,
        },
      });
      bindContainer(container, cfg, opts);
      if (opts.value) {
        instanceSetValue(container, cfg, opts.value);
      } else if (cfg.allowClear) {
        instanceClear(container, cfg);
      }
      instanceSetDisabled(container, !!opts.disabled);
    }

    function instanceSetValue(container, cfgRef, value) {
      var normalized = cfgRef.normalizeValue(value);
      applyInternalValue(container, cfgRef, normalized, normalized);
    }

    function instanceClear(container, cfgRef) {
      applyInternalValue(container, cfgRef, cfgRef.normalizeValue(null), null);
      var state = stateOf(container);
      var root = rootEl(container);
      var search = root && root.querySelector('[data-stam-reference-picker-search]');
      if (search) search.value = '';
      if (state && state.items) renderOptions(container, cfgRef, state.items, '');
    }

    function instanceSetDisabled(container, disabled) {
      var root = rootEl(container);
      if (!root) return;
      root.classList.toggle('is-disabled', !!disabled);
      var toggle = root.querySelector('[data-stam-reference-picker-toggle]');
      var search = root.querySelector('[data-stam-reference-picker-search]');
      if (toggle) toggle.disabled = !!disabled;
      if (search) search.disabled = !!disabled;
      if (disabled) closePicker(container);
    }

    function refreshContext(container, options) {
      if (!container) return;
      var opts = options || {};
      var state = stateOf(container) || {};
      var nextVersion = (state.loadVersion || 0) + 1;
      setState(container, {
        projectId: clean(opts.projectId != null ? opts.projectId : state.projectId),
        memberRole: clean(opts.memberRole != null ? opts.memberRole : state.memberRole),
        context: opts.context || state.context || {},
        items: null,
        loadError: null,
        loadingPromise: null,
        loadingContextKey: null,
        contextKey: '',
        loadVersion: nextVersion,
      });
    }

    function destroy(container) {
      var rec = recordOf(container);
      if (!rec) return;
      rec.destroyed = true;
      closePicker(container);
      container.removeAttribute('data-stam-reference-picker-mounted');
      container.innerHTML = '';
      deleteRecord(container);
    }

    return {
      mount: mount,
      load: function (container) {
        return load(container, cfg);
      },
      getValue: function (container) {
        return cfg.toPublicValue(getInternalValue(container));
      },
      setValue: function (container, value) {
        instanceSetValue(container, cfg, value);
      },
      clear: function (container) {
        instanceClear(container, cfg);
      },
      setDisabled: instanceSetDisabled,
      refreshContext: refreshContext,
      close: closePicker,
      destroy: destroy,
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.referencePicker = {
    create: create,
    _closeAll: closeAll,
  };
}());
