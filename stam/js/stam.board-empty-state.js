/* ============================================================================
 * STAM Board Empty / Loading / Error State
 * ----------------------------------------------------------------------------
 * Shared tbody row renderer for board list modules.
 * Export: window.STAM.boardEmptyState
 * ========================================================================== */
(function () {
  'use strict';

  var DEFAULT_COLSPAN = 9;
  var DEFAULT_EMPTY_ICON = 'clipboard-check';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function esc(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeOptions(options) {
    var source = options || {};
    return {
      colspan: Number.isFinite(Number(source.colspan)) ? Number(source.colspan) : DEFAULT_COLSPAN,
      title: clean(source.title),
      description: clean(source.description),
      variant: clean(source.variant).toLowerCase() || 'empty',
      icon: source.icon === false ? false : clean(source.icon || DEFAULT_EMPTY_ICON),
      actionLabel: clean(source.actionLabel),
      actionId: clean(source.actionId),
    };
  }

  function iconHtml(iconName) {
    if (!iconName) return '';
    if (typeof window.renderStamIcon === 'function') {
      return '<div class="stam-board-empty-icon" aria-hidden="true">' +
        window.renderStamIcon(iconName, { className: 'is-lg' }) +
        '</div>';
    }
    return '<div class="stam-board-empty-icon" data-stam-icon="' + esc(iconName) +
      '" data-stam-icon-class="is-lg"></div>';
  }

  function actionHtml(actionLabel, actionId) {
    if (!actionLabel || !actionId) return '';
    return '<button type="button" class="stam-btn stam-btn-primary stam-board-empty-action" id="' +
      esc(actionId) + '">' + esc(actionLabel) + '</button>';
  }

  function messageRow(options) {
    var opts = normalizeOptions(options);
    var variant = opts.variant;
    var rowVariant = variant === 'empty' || variant === 'loading' || variant === 'error'
      ? variant
      : 'status';
    var stateClass = 'stam-board-empty-state';
    if (variant !== 'empty') stateClass += ' stam-board-empty-state--status';
    var showIcon = variant === 'empty' && opts.icon !== false;

    return '<tr class="stam-board-empty-row stam-board-empty-row--' + esc(rowVariant) + '">' +
      '<td colspan="' + opts.colspan + '">' +
      '<div class="' + stateClass + '">' +
      (showIcon ? iconHtml(opts.icon) : '') +
      '<div class="stam-board-empty-title">' + esc(opts.title) + '</div>' +
      (opts.description ? '<div class="stam-board-empty-desc">' + esc(opts.description) + '</div>' : '') +
      actionHtml(opts.actionLabel, opts.actionId) +
      '</div></td></tr>';
  }

  function emptyRow(options) {
    return messageRow(Object.assign({}, options || {}, { variant: 'empty' }));
  }

  function loadingRow(options) {
    return messageRow(Object.assign({}, options || {}, { variant: 'loading', icon: false }));
  }

  function errorRow(options) {
    return messageRow(Object.assign({}, options || {}, { variant: 'error', icon: false }));
  }

  function hydrateIcons(root) {
    if (root && typeof window.hydrateStamIcons === 'function') {
      window.hydrateStamIcons(root);
    }
  }

  window.STAM = window.STAM || {};
  window.STAM.boardEmptyState = {
    emptyRow: emptyRow,
    loadingRow: loadingRow,
    errorRow: errorRow,
    messageRow: messageRow,
    hydrateIcons: hydrateIcons,
  };
}());
