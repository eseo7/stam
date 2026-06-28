/**
 * STAM Icon Registry SSOT (PR #272)
 * Icon SVG source lives here only. Screens call by registry key.
 */
(function () {
  'use strict';

  var ICONS = {
    filter: {
      viewBox: '0 0 16 16',
      body: '<path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>'
    },
    close: {
      viewBox: '0 0 24 24',
      body: '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
    },
    edit: {
      viewBox: '0 0 24 24',
      body: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
    },
    save: {
      viewBox: '0 0 24 24',
      body: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline>'
    },
    trash: {
      viewBox: '0 0 24 24',
      body: '<polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
    },
    search: {
      viewBox: '0 0 24 24',
      body: '<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"></circle><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
    },
    'search-sm': {
      viewBox: '0 0 14 14',
      body: '<circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"></circle><path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>'
    },
    plus: {
      viewBox: '0 0 24 24',
      body: '<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line>'
    },
    download: {
      viewBox: '0 0 24 24',
      body: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
    },
    link: {
      viewBox: '0 0 24 24',
      body: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
    },
    'chevron-down': {
      viewBox: '0 0 16 16',
      body: '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>'
    },
    'chevron-left': {
      viewBox: '0 0 24 24',
      body: '<polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></polyline>'
    },
    'chevron-right': {
      viewBox: '0 0 24 24',
      body: '<polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></polyline>'
    },
    calendar: {
      viewBox: '0 0 24 24',
      body: '<rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></rect><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>'
    }
  };

  function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function renderStamIcon(name, options) {
    options = options || {};
    var icon = ICONS[name];
    if (!icon) return '';
    var className = options.className ? ' ' + escapeAttr(options.className) : '';
    var label = options.label ? escapeAttr(options.label) : '';
    var aria = label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true"';
    return '<svg class="stam-icon stam-icon-' + escapeAttr(name) + className + '" viewBox="' + icon.viewBox + '" fill="none" ' + aria + '>' + icon.body + '</svg>';
  }

  function hydrateStamIcons(root) {
    root = root || document;
    root.querySelectorAll('[data-stam-icon]').forEach(function (node) {
      var name = node.getAttribute('data-stam-icon');
      var label = node.getAttribute('data-stam-icon-label') || '';
      var className = node.getAttribute('data-stam-icon-class') || '';
      var html = renderStamIcon(name, { label: label, className: className });
      if (html) node.innerHTML = html;
    });
  }

  window.STAM_ICONS = ICONS;
  window.renderStamIcon = renderStamIcon;
  window.hydrateStamIcons = hydrateStamIcons;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hydrateStamIcons(document);
    });
  } else {
    hydrateStamIcons(document);
  }
})();
