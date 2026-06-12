(function () {
  'use strict';

  window.STAM = window.STAM || {};

  /**
   * window.STAM.boardFilter.init(opts)
   *
   * opts:
   *   root    - 쿼리 기준 요소 (기본 document)
   *   trigger - 필터 버튼 선택자
   *   panel   - 필터 패널 선택자 (hidden 속성으로 초기 숨김)
   *   reset   - 초기화 버튼 선택자 (footer)
   *   apply   - 적용 버튼 선택자
   *   groups  - 필터 그룹 배열 [{ key, label, options: [string | {label, value}] }]
   *   onApply - 적용 콜백 function(values) — values: { [key]: [val, ...] }
   */
  window.STAM.boardFilter = {
    init: function (opts) {
      opts = opts || {};
      var root = opts.root || document;

      var triggerEl = root.querySelector(opts.trigger);
      var panelEl   = opts.panel ? root.querySelector(opts.panel) : null;

      if (!triggerEl || !panelEl) return null;

      /* 중복 init 방지 */
      if (triggerEl.getAttribute('data-sbf-init') === '1') return null;
      triggerEl.setAttribute('data-sbf-init', '1');

      /* ── 헤더 생성 (WBS wbs-fp-head 기준) ── */
      var headEl = document.createElement('div');
      headEl.className = 'sbf-head';

      var headIcon = document.createElement('svg');
      headIcon.setAttribute('class', 'sbf-head-icon');
      headIcon.setAttribute('viewBox', '0 0 16 16');
      headIcon.setAttribute('fill', 'none');
      headIcon.setAttribute('aria-hidden', 'true');
      headIcon.innerHTML = '<path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';

      var headTitle = document.createElement('span');
      headTitle.className = 'sbf-head-title';
      headTitle.textContent = '필터';

      var headReset = document.createElement('button');
      headReset.type = 'button';
      headReset.className = 'sbf-head-reset';
      headReset.textContent = '초기화';

      headEl.appendChild(headIcon);
      headEl.appendChild(headTitle);
      headEl.appendChild(headReset);
      panelEl.insertBefore(headEl, panelEl.firstChild);

      /* ── groups 렌더링 ── */
      var gridEl = panelEl.querySelector('.stam-board-filter-grid');
      if (gridEl) {
        gridEl.innerHTML = '';
        (opts.groups || []).forEach(function (group) {
          var sec = document.createElement('div');
          sec.className = 'sbf-sec';

          var titleEl = document.createElement('div');
          titleEl.className = 'sbf-sec-title';
          titleEl.textContent = group.label;

          var chipsEl = document.createElement('div');
          chipsEl.className = 'sbf-chips';

          (group.options || []).forEach(function (opt) {
            var label = typeof opt === 'string' ? opt : opt.label;
            var value = typeof opt === 'string' ? opt : (opt.value || opt.label);
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'sbf-chip';
            chip.textContent = label;
            chip.dataset.sbfGroup = group.key;
            chip.dataset.sbfVal   = value;
            chip.setAttribute('aria-pressed', 'false');
            chipsEl.appendChild(chip);
          });

          sec.appendChild(titleEl);
          sec.appendChild(chipsEl);
          gridEl.appendChild(sec);
        });
      }

      /* ── 푸터에 조건 수 정보 삽입 (WBS wbs-fp-foot-info 기준) ── */
      var actionsEl = panelEl.querySelector('.stam-board-filter-actions');
      var footInfo  = null;
      if (actionsEl) {
        footInfo = document.createElement('span');
        footInfo.className = 'sbf-foot-info';
        footInfo.textContent = '조건 0개';
        actionsEl.insertBefore(footInfo, actionsEl.firstChild);
      }

      /* ── count badge (trigger 내부 badge 요소) ── */
      var badge = triggerEl.querySelector(
        '[id$="-filter-count"], .stam-board-filter-count'
      );

      function getActiveChips() {
        return panelEl.querySelectorAll('.sbf-chip.active');
      }

      function updateCount() {
        var count = getActiveChips().length;

        /* trigger 배지 */
        if (badge) {
          badge.textContent = String(count);
          if (count > 0) {
            badge.classList.add('visible');
            badge.style.display = '';
          } else {
            badge.classList.remove('visible');
            badge.style.display = 'none';
          }
        }

        /* trigger 버튼 active 상태 */
        triggerEl.classList.toggle('active', count > 0);

        /* 푸터 정보 */
        if (footInfo) {
          footInfo.textContent = '조건 ' + count + '개';
        }
      }

      /* ── open / close ── */
      var _closeTimer = null;

      function openPanel() {
        if (_closeTimer) { clearTimeout(_closeTimer); _closeTimer = null; }
        panelEl.hidden = false;
        /* 두 번 rAF → hidden 제거 후 layout 반영 후 transition 시작 */
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            panelEl.classList.add('is-open');
          });
        });
        triggerEl.setAttribute('aria-expanded', 'true');
        triggerEl.classList.add('is-open');
      }

      function closePanel() {
        panelEl.classList.remove('is-open');
        triggerEl.setAttribute('aria-expanded', 'false');
        triggerEl.classList.remove('is-open');
        _closeTimer = setTimeout(function () { panelEl.hidden = true; }, 200);
        updateCount();
      }

      /* ── trigger 클릭 ── */
      triggerEl.addEventListener('click', function (e) {
        e.stopPropagation();
        panelEl.classList.contains('is-open') ? closePanel() : openPanel();
      });

      /* ── chip 클릭 (toggle) ── */
      panelEl.addEventListener('click', function (e) {
        var chip = e.target.closest('.sbf-chip');
        if (!chip) return;
        var nowActive = !chip.classList.contains('active');
        chip.classList.toggle('active');
        chip.setAttribute('aria-pressed', nowActive ? 'true' : 'false');
        updateCount();
      });

      /* ── 공통 reset 로직 ── */
      function doReset() {
        getActiveChips().forEach(function (c) {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        updateCount();
      }

      /* 헤더 초기화 버튼 */
      headReset.addEventListener('click', doReset);

      /* 푸터 초기화 버튼 */
      var resetEl = opts.reset
        ? root.querySelector(opts.reset)
        : panelEl.querySelector('[id$="-filter-reset"]');

      if (resetEl) {
        resetEl.addEventListener('click', doReset);
      }

      /* ── 적용 ── */
      var applyEl = opts.apply
        ? root.querySelector(opts.apply)
        : panelEl.querySelector('[id$="-filter-apply"]');

      if (applyEl) {
        applyEl.addEventListener('click', function () {
          if (typeof opts.onApply === 'function') {
            var values = {};
            getActiveChips().forEach(function (c) {
              var g = c.dataset.sbfGroup;
              if (!values[g]) values[g] = [];
              values[g].push(c.dataset.sbfVal);
            });
            opts.onApply(values);
          }
          closePanel();
        });
      }

      /* ── ESC 키 ── */
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (!panelEl.classList.contains('is-open')) return;
        e.preventDefault();
        e.stopPropagation();
        closePanel();
      }, true);

      /* ── 외부 클릭 ── */
      document.addEventListener('click', function (e) {
        if (!panelEl.classList.contains('is-open')) return;
        if (panelEl.contains(e.target) || triggerEl.contains(e.target)) return;
        closePanel();
      });

      /* 공개 API */
      return {
        open:  openPanel,
        close: closePanel,
        reset: doReset,
        getValues: function () {
          var values = {};
          getActiveChips().forEach(function (c) {
            var g = c.dataset.sbfGroup;
            if (!values[g]) values[g] = [];
            values[g].push(c.dataset.sbfVal);
          });
          return values;
        }
      };
    }
  };

}());
