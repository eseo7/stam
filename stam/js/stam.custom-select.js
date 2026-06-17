/*
 * STAM Custom Select — SSOT
 *
 * 요구사항정의서(rq) / 메뉴구조·화면목록(msl) / 기능정의서(fn) 게시판이
 * 각자 복사해서 사용하던 custom select 로직을 공통 모듈로 통합.
 *
 * 사용:
 *   STAM.customSelect.init(rootEl, config);
 *   STAM.customSelect.closeAll(rootEl, config);
 *
 * config 는 화면별 prefix/selector/class 차이를 받아서 처리한다.
 * 본 모듈은 DOM 구조·class 이름·동작 시퀀스를 기존 화면별 구현과 동일하게 재현한다.
 */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.customSelect) return;

  var CARET_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  var CHECK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  var counter = 0;

  function classListAdd(el, classStr) {
    classStr.split(/\s+/).forEach(function (c) { if (c) el.classList.add(c); });
  }
  function classListRemove(el, classStr) {
    classStr.split(/\s+/).forEach(function (c) { if (c) el.classList.remove(c); });
  }
  function firstClass(classStr) {
    return classStr.split(/\s+/)[0];
  }

  function build(native, cfg) {
    if (native.getAttribute(cfg.nativeMarkerAttr) === '1') return;
    native.setAttribute(cfg.nativeMarkerAttr, '1');

    var uid = cfg.uidPrefix + '-' + (++counter);
    var activeIdx = -1;

    var wrap = document.createElement('div');
    wrap.className = cfg.wrapClass;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = cfg.triggerClass;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', uid + '-list');

    var valSpan = document.createElement('span');
    valSpan.className = cfg.valClass;

    var caret = document.createElement('span');
    caret.className = cfg.caretClass;
    caret.innerHTML = CARET_SVG;

    trigger.appendChild(valSpan);
    trigger.appendChild(caret);

    var panel = document.createElement('div');
    panel.className = cfg.panelClass;
    panel.id = uid + '-list';
    panel.setAttribute('role', 'listbox');

    Array.prototype.forEach.call(native.options, function (o, i) {
      var od = document.createElement('div');
      od.className = cfg.optClass;
      od.id = uid + '-opt-' + i;
      od.setAttribute('role', 'option');
      od.setAttribute('data-idx', i);
      od.setAttribute('aria-selected', 'false');
      if (o.value === '') od.classList.add('is-placeholder');
      var ck = document.createElement('span');
      ck.className = cfg.checkClass;
      ck.setAttribute('aria-hidden', 'true');
      ck.innerHTML = CHECK_SVG;
      var tx = document.createElement('span');
      tx.className = cfg.otextClass;
      tx.textContent = o.textContent;
      od.appendChild(ck);
      od.appendChild(tx);
      panel.appendChild(od);
    });

    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    native.classList.add(cfg.nativeClass);

    var optClassFirst = firstClass(cfg.optClass);

    function syncLabel() {
      var sel = native.options[native.selectedIndex];
      valSpan.textContent = sel ? sel.textContent : '';
      valSpan.classList.toggle('is-placeholder', !!sel && sel.value === '');
      Array.prototype.forEach.call(panel.children, function (c) {
        var idx = parseInt(c.getAttribute('data-idx'), 10);
        var isSelected = idx === native.selectedIndex;
        var isPlaceholder = c.classList.contains('is-placeholder');
        c.classList.toggle('is-sel', isSelected && !isPlaceholder);
        c.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    }
    syncLabel();

    function setActive(idx) {
      var opts = panel.children;
      if (idx < 0) idx = 0;
      if (idx > opts.length - 1) idx = opts.length - 1;
      activeIdx = idx;
      Array.prototype.forEach.call(opts, function (c, i) {
        c.classList.toggle('is-active', i === idx);
      });
      var act = opts[idx];
      if (act) {
        trigger.setAttribute('aria-activedescendant', act.id);
        act.scrollIntoView({ block: 'nearest' });
      }
    }

    function applyFlip() {
      classListRemove(wrap, cfg.upClass);
      var container = cfg.flipContainer ? wrap.closest(cfg.flipContainer) : null;
      if (!container) return;
      var ph = panel.offsetHeight || 200;
      var tRect = trigger.getBoundingClientRect();
      var cRect = container.getBoundingClientRect();
      var below = cRect.bottom - tRect.bottom;
      var above = tRect.top - cRect.top;
      if (below < ph + 8 && above > below) classListAdd(wrap, cfg.upClass);
    }

    function openPanel() {
      closeAll(document, cfg);
      classListAdd(wrap, cfg.openClass);
      trigger.setAttribute('aria-expanded', 'true');
      applyFlip();
      setActive(native.selectedIndex >= 0 ? native.selectedIndex : 0);
    }

    function closeThis() {
      closeWrap(wrap, cfg);
    }

    function selectIdx(idx) {
      if (native.selectedIndex !== idx) {
        native.selectedIndex = idx;
        native.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncLabel();
      closeThis();
      trigger.focus();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains(firstClass(cfg.openClass))) closeThis();
      else openPanel();
    });

    trigger.addEventListener('keydown', function (e) {
      var isOpen = wrap.classList.contains(firstClass(cfg.openClass));
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) openPanel(); else setActive(activeIdx + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) openPanel(); else setActive(activeIdx - 1);
          break;
        case 'Home':
          if (isOpen) { e.preventDefault(); setActive(0); }
          break;
        case 'End':
          if (isOpen) { e.preventDefault(); setActive(panel.children.length - 1); }
          break;
        case 'Enter':
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          if (!isOpen) openPanel(); else selectIdx(activeIdx);
          break;
        case 'Tab':
          if (isOpen) closeThis();
          break;
      }
    });

    panel.addEventListener('mousemove', function (e) {
      var od = e.target.closest('.' + optClassFirst);
      if (od) setActive(parseInt(od.getAttribute('data-idx'), 10));
    });

    panel.addEventListener('click', function (e) {
      var od = e.target.closest('.' + optClassFirst);
      if (!od) return;
      e.stopPropagation();
      selectIdx(parseInt(od.getAttribute('data-idx'), 10));
    });
  }

  function closeWrap(wrap, cfg) {
    classListRemove(wrap, cfg.openClass);
    classListRemove(wrap, cfg.upClass);
    var t = wrap.querySelector('.' + firstClass(cfg.triggerClass));
    if (t) { t.setAttribute('aria-expanded', 'false'); t.removeAttribute('aria-activedescendant'); }
  }

  function closeAll(root, cfg) {
    (root || document).querySelectorAll(cfg.openSelector).forEach(function (w) {
      closeWrap(w, cfg);
    });
  }

  function init(root, cfg) {
    if (!root || !cfg) return;
    root.querySelectorAll(cfg.selectSelector).forEach(function (n) { build(n, cfg); });
  }

  window.STAM.customSelect = {
    init: init,
    closeAll: closeAll
  };
}());
