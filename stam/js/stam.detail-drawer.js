/*
 * STAM Detail Drawer — 공통 본문 renderer (v0.1)
 *
 * Drawer shell(.stam-drawer*) 내부 본문 영역을 config 기반 HTML로 렌더한다.
 * 외부 dependency 없음. 제품 데이터/API/localStorage 접근 없음.
 *
 * 사용:
 *   STAM.detailDrawer.render(config)           → HTML string
 *   STAM.detailDrawer.mount(target, config)    → boolean
 *
 * 로드:
 *   <script src="../../js/stam.detail-drawer.js"></script>
 *   (STAM 네임스페이스는 theme/shell 이후, board JS 이전 권장)
 */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.detailDrawer) return;

  var DEFAULT_EMPTY = '—';

  function escape(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  function renderChip(chip) {
    if (typeof chip === 'string') {
      return '<span class="stam-detail-chip">' + escape(chip) + '</span>';
    }
    var cls = 'stam-detail-chip';
    if (chip && chip.tone) cls += ' is-' + escape(chip.tone);
    if (chip && chip.className) cls += ' ' + escape(chip.className);
    return '<span class="' + cls + '">' + escape(chip.label || '') + '</span>';
  }

  function renderFieldValue(field) {
    var type = field.type || 'text';
    var emptyText = field.emptyText != null ? field.emptyText : DEFAULT_EMPTY;
    var value = field.value;

    if (type === 'note') {
      if (isEmpty(value)) {
        return '<div class="stam-detail-empty">' + escape(emptyText) + '</div>';
      }
      return '<div class="stam-detail-note">' + escape(value) + '</div>';
    }

    if (type === 'list') {
      if (!Array.isArray(value) || value.length === 0) {
        return '<div class="stam-detail-empty">' + escape(emptyText) + '</div>';
      }
      var items = value.map(function (item) {
        return '<li>' + escape(item) + '</li>';
      }).join('');
      return '<ul class="stam-detail-list">' + items + '</ul>';
    }

    if (type === 'chips') {
      if (!Array.isArray(value) || value.length === 0) {
        return '<div class="stam-detail-empty">' + escape(emptyText) + '</div>';
      }
      var chips = value.map(renderChip).join('');
      return '<div class="stam-detail-chip-row">' + chips + '</div>';
    }

    if (isEmpty(value)) {
      return '<div class="stam-detail-empty">' + escape(emptyText) + '</div>';
    }

    var valueCls = 'stam-detail-value';
    if (type === 'plain') valueCls += ' is-plain';
    return '<div class="' + valueCls + '">' + escape(value) + '</div>';
  }

  function renderField(field) {
    if (!field || typeof field !== 'object') return '';

    var extra = field.className ? ' ' + escape(field.className) : '';
    var full = field.full ? ' is-full' : '';
    var label = field.label != null ? field.label : '';
    var labelHtml = label
      ? '<div class="stam-detail-label">' + escape(label) + '</div>'
      : '';

    return (
      '<div class="stam-detail-field' + full + extra + '">' +
        labelHtml +
        renderFieldValue(field) +
      '</div>'
    );
  }

  function renderSection(section) {
    if (!section || typeof section !== 'object') return '';

    var parts = [];
    parts.push('<section class="stam-detail-section">');

    var hasHead = section.title || section.meta;
    if (hasHead) {
      parts.push('<div class="stam-detail-section-head">');
      if (section.title) {
        parts.push('<h3 class="stam-detail-section-title">' + escape(section.title) + '</h3>');
      }
      if (section.meta) {
        parts.push('<span class="stam-detail-section-meta">' + escape(section.meta) + '</span>');
      }
      parts.push('</div>');
    }

    if (section.body) {
      parts.push('<div class="stam-detail-note is-body">' + section.body + '</div>');
    } else if (Array.isArray(section.fields) && section.fields.length > 0) {
      parts.push('<div class="stam-detail-grid">');
      section.fields.forEach(function (field) {
        parts.push(renderField(field));
      });
      parts.push('</div>');
    } else if (!section.body) {
      var emptyText = section.emptyText != null ? section.emptyText : DEFAULT_EMPTY;
      parts.push('<div class="stam-detail-empty">' + escape(emptyText) + '</div>');
    }

    parts.push('</section>');
    return parts.join('');
  }

  function renderActions(actions) {
    if (!actions) return '';
    var inner = '';
    if (typeof actions === 'string') {
      inner = actions;
    } else if (Array.isArray(actions)) {
      inner = actions.map(function (action) {
        if (typeof action === 'string') return action;
        if (!action || typeof action !== 'object') return '';
        var cls = escape(action.className || 'stam-btn stam-btn-secondary');
        var label = escape(action.label || '');
        if (action.href) {
          return '<a class="' + cls + '" href="' + escape(action.href) + '">' + label + '</a>';
        }
        return '<button type="button" class="' + cls + '">' + label + '</button>';
      }).join('');
    }
    if (!inner) return '';
    return '<div class="stam-detail-actions">' + inner + '</div>';
  }

  function render(config) {
    config = config || {};
    var parts = [];
    parts.push('<div class="stam-detail">');

    if (config.title) {
      parts.push(
        '<div class="stam-detail-section-head is-standalone">' +
          '<h3 class="stam-detail-section-title">' + escape(config.title) + '</h3>' +
        '</div>'
      );
    }

    (config.sections || []).forEach(function (section) {
      parts.push(renderSection(section));
    });

    if (config.dividerBeforeActions) {
      parts.push('<hr class="stam-detail-divider" aria-hidden="true">');
    }

    parts.push(renderActions(config.actions));
    parts.push('</div>');
    return parts.join('');
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') {
      return document.querySelector(target);
    }
    if (target.nodeType === 1) {
      return target;
    }
    return null;
  }

  function mount(target, config) {
    var el = resolveTarget(target);
    if (!el) return false;
    el.innerHTML = render(config);
    return true;
  }

  window.STAM.detailDrawer = {
    escape: escape,
    renderField: renderField,
    renderSection: renderSection,
    render: render,
    mount: mount,
  };
})();
