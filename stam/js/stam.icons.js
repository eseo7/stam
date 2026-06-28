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
    },
    list: {
      viewBox: '0 0 24 24',
      body: '<line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
    },
    layout: {
      viewBox: '0 0 24 24',
      body: '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round"></rect><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="9" y1="21" x2="9" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
    },
    info: {
      viewBox: '0 0 24 24',
      body: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"></circle><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
    },
    'alert-triangle': {
      viewBox: '0 0 24 24',
      body: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>'
    },
    users: {
      viewBox: '0 0 24 24',
      body: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
    },
    'check-circle': {
      viewBox: '0 0 24 24',
      body: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline>'
    },
    check: {
      viewBox: '0 0 24 24',
      body: '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></polyline>'
    },
    refresh: {
      viewBox: '0 0 24 24',
      body: '<polyline points="1 4 1 10 7 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline><path d="M3.51 15a9 9 0 1 0 .49-4.87" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
    },
    clock: {
      viewBox: '0 0 24 24',
      body: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"></circle><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline>'
    },
    circle: {
      viewBox: '0 0 24 24',
      body: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"></circle>'
    },
    paperclip: {
      viewBox: '0 0 24 24',
      body: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>'
    },
    message: {
      viewBox: '0 0 24 24',
      body: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
    },
    'clipboard-check': {
      viewBox: '0 0 24 24',
      body: '<polyline points="9 11 12 14 22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
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
