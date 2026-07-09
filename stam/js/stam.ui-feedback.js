/* ============================================================================
 * STAM UI Feedback — table empty/loading/error row renderer (v1)
 *
 * Returns HTML strings only. All user-facing strings are escaped.
 * Raw HTML action insertion is not supported in v1.
 *
 * API:
 *   STAM.uiFeedback.tableEmptyRow(options)
 *   STAM.uiFeedback.tableLoadingRow(options)
 *   STAM.uiFeedback.tableErrorRow(options)
 *   STAM.uiFeedback.tableMessageRow(options)
 *   STAM.uiFeedback.hydrateIcons(root)
 * ========================================================================== */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.uiFeedback) return;

  var ALLOWED_VARIANTS = {
    empty: true,
    loading: true,
    error: true,
    status: true,
  };

  function escape(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeVariant(value) {
    var variant = clean(value).toLowerCase();
    return ALLOWED_VARIANTS[variant] ? variant : 'status';
  }

  function normalizeColspan(value) {
    var colspan = Number(value);
    if (!Number.isFinite(colspan) || colspan < 1) return 1;
    return Math.floor(colspan);
  }

  function iconHtml(icon, iconClass) {
    var name = clean(icon);
    if (!name) return '';
    var cls = clean(iconClass) || 'is-lg';
    if (typeof window.renderStamIcon === 'function') {
      return '<div class="stam-table-feedback-icon" aria-hidden="true">' +
        window.renderStamIcon(name, { className: cls }) +
        '</div>';
    }
    return '<div class="stam-table-feedback-icon" data-stam-icon="' + escape(name) +
      '" data-stam-icon-class="' + escape(cls) + '"></div>';
  }

  function tableMessageRow(options) {
    var opts = options || {};
    var variant = normalizeVariant(opts.variant);
    var colspan = normalizeColspan(opts.colspan);
    var title = opts.title != null ? opts.title : '';
    var description = opts.description != null ? opts.description : '';
    var showIcon = variant === 'empty';
    var stateClass = showIcon ? '' : ' stam-table-feedback--status';
    var icon = showIcon ? iconHtml(opts.icon || 'clipboard-check', opts.iconClass) : '';

    return '<tr class="stam-table-feedback-row stam-table-feedback-row--' + variant + '">' +
      '<td colspan="' + colspan + '">' +
      '<div class="stam-table-feedback' + stateClass + '">' +
      icon +
      '<div class="stam-table-feedback-title">' + escape(title) + '</div>' +
      '<div class="stam-table-feedback-desc">' + escape(description) + '</div>' +
      '</div></td></tr>';
  }

  function tableEmptyRow(options) {
    var opts = Object.assign({}, options || {}, { variant: 'empty' });
    if (!opts.icon) opts.icon = 'clipboard-check';
    return tableMessageRow(opts);
  }

  function tableLoadingRow(options) {
    return tableMessageRow(Object.assign({}, options || {}, { variant: 'loading' }));
  }

  function tableErrorRow(options) {
    return tableMessageRow(Object.assign({}, options || {}, { variant: 'error' }));
  }

  function hydrateIcons(root) {
    if (root && typeof window.hydrateStamIcons === 'function') {
      window.hydrateStamIcons(root);
    }
  }

  window.STAM.uiFeedback = {
    tableMessageRow: tableMessageRow,
    tableEmptyRow: tableEmptyRow,
    tableLoadingRow: tableLoadingRow,
    tableErrorRow: tableErrorRow,
    hydrateIcons: hydrateIcons,
  };
}());
