/*
 * STAM Board Factory — engine (v1.2 preview)
 *
 * PR #135 에서 확정한 Board Factory v1.2 설계/실사 결과를 바탕으로 한
 * 첫 번째 공통 게시판 엔진. config + dataSource + referenceSource 를 받아
 * list-first 표준 골격(헤더 · summary · toolbar · table · drawer)을 렌더링한다.
 *
 * 사용:
 *   STAM.boardFactory.mount(rootEl, config);
 *
 * 본 엔진은 static / in-memory preview 만 수행한다.
 * localStorage / API / Firestore 저장 로직은 포함하지 않는다.
 * 기존 공통 모듈(STAM.boardFilter, STAM.customSelect)은 사용만 하고 수정하지 않는다.
 */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.boardFactory) return;

  /* ── utils ──────────────────────────────────────────────────── */
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function asArray(v) {
    if (v === null || v === undefined) return [];
    return Array.isArray(v) ? v : [v];
  }
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function vocabEntry(config, vocabKey, code) {
    var v = config.vocab && config.vocab[vocabKey];
    return (v && v[code]) || null;
  }
  function avatarColor(seed) {
    var palette = ['#5451E8', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#0EA5E9'];
    var s = String(seed || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }
  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /* ── built-in column renderers ──────────────────────────────────
   * 각 renderer: (row, col, ctx) → HTML string
   * checkbox / actionButtons 는 행 템플릿에서 별도 처리한다.
   */
  var RENDERERS = {
    idName: function (row, col, ctx) {
      var id = row[col.idField || 'id'];
      var name = row[col.nameField || 'name'];
      return '<div class="bf-id-cell">' +
        '<span class="bf-id">' + esc(id) + '</span>' +
        '<span class="bf-name">' + esc(name) + '</span></div>';
    },
    text: function (row, col) {
      return '<span class="bf-text">' + esc(row[col.field]) + '</span>';
    },
    date: function (row, col) {
      return '<span class="bf-date">' + esc(row[col.field]) + '</span>';
    },
    chip: function (row, col, ctx) {
      return chipHtml(ctx.config, col.vocabKey || col.field, row[col.field]);
    },
    statusChip: function (row, col, ctx) {
      return chipHtml(ctx.config, 'status', row[col.field || 'status']);
    },
    typeChip: function (row, col, ctx) {
      return chipHtml(ctx.config, 'type', row[col.field || 'type']);
    },
    priorityChip: function (row, col, ctx) {
      return chipHtml(ctx.config, 'priority', row[col.field || 'priority']);
    },
    user: function (row, col, ctx) {
      var ids = asArray(row[col.field]);
      if (!ids.length) return '<span class="bf-muted">—</span>';
      return ids.map(function (id) {
        var rec = (ctx.refCache[col.refType || 'users'] || {})[id];
        var name = rec ? rec.label : id;
        var initial = name ? name.charAt(0) : '?';
        return '<span class="bf-user">' +
          '<span class="bf-ava" style="background:' + avatarColor(id) + '">' + esc(initial) + '</span>' +
          '<span class="bf-user-name">' + esc(name) + '</span></span>';
      }).join('');
    },
    relationChip: function (row, col, ctx) {
      var ids = asArray(row[col.field]);
      if (!ids.length) return '<span class="bf-muted">—</span>';
      var cache = ctx.refCache[col.refType] || {};
      return '<span class="bf-rel-wrap">' + ids.map(function (id) {
        var rec = cache[id];
        var label = rec ? rec.label : id;
        var miss = rec ? '' : ' is-missing';
        return '<span class="bf-rel-chip' + miss + '" title="' + esc(label) + '">' + esc(id) + '</span>';
      }).join('') + '</span>';
    },
    link: function (row, col) {
      var val = row[col.field];
      if (!val) return '<span class="bf-muted">—</span>';
      var href = col.href ? col.href(row) : '#';
      return '<a class="bf-link" href="' + esc(href) + '">' + esc(val) + '</a>';
    }
  };

  function chipHtml(config, vocabKey, code) {
    if (code === null || code === undefined || code === '') return '<span class="bf-muted">—</span>';
    var entry = vocabEntry(config, vocabKey, code);
    var label = entry ? entry.label : code;
    var tone = entry && entry.tone ? entry.tone : 'neutral';
    return '<span class="bf-chip bf-chip--' + esc(tone) + '">' + esc(label) + '</span>';
  }

  /* ── built-in detail section renderers ──────────────────────────
   * 1차 구현: infoGrid / textBlock / relationCards
   * 후속 slot 후보: historyList / reviewList / acceptanceList / approvalStatus / attachmentList
   */
  var SECTIONS = {
    infoGrid: function (section, row, ctx) {
      var cells = (section.fields || []).map(function (f) {
        var val;
        if (typeof f.render === 'function') val = f.render(row, ctx);
        else if (f.vocabKey) val = chipHtml(ctx.config, f.vocabKey, row[f.key]);
        else val = esc(row[f.key]);
        return '<div class="bf-ig-cell"><div class="bf-ig-k">' + esc(f.label) + '</div>' +
          '<div class="bf-ig-v">' + (val || '<span class="bf-muted">—</span>') + '</div></div>';
      }).join('');
      return sectionShell(section.title, '<div class="bf-ig">' + cells + '</div>');
    },
    textBlock: function (section, row, ctx) {
      var blocks = (section.blocks || []).map(function (b) {
        var text = row[b.key];
        return '<div class="bf-tb-item"><div class="bf-tb-k">' + esc(b.label) + '</div>' +
          '<div class="bf-tb-box">' + (text ? esc(text) : '<span class="bf-muted">내용 없음</span>') + '</div></div>';
      }).join('');
      return sectionShell(section.title, '<div class="bf-tb">' + blocks + '</div>');
    },
    relationCards: function (section, row, ctx) {
      var cards = [];
      (section.groups || []).forEach(function (g) {
        var ids = asArray(row[g.field]);
        var cache = ctx.refCache[g.refType] || {};
        ids.forEach(function (id) {
          var rec = cache[id];
          cards.push('<div class="bf-rel-card">' +
            '<div class="bf-rel-card-main">' +
            '<div class="bf-rel-card-id">' + esc(id) + '</div>' +
            '<div class="bf-rel-card-name">' + esc(rec ? rec.label : '확인되지 않은 참조') + '</div>' +
            '</div><span class="bf-rel-card-tag">' + esc(g.label) + '</span></div>');
        });
      });
      var body = cards.length ? cards.join('') : '<div class="bf-empty-inline">연결된 항목이 없습니다.</div>';
      return sectionShell(section.title, '<div class="bf-rel-cards">' + body + '</div>');
    }
  };

  function sectionShell(title, inner) {
    return '<div class="bf-dw-sec"><div class="bf-dw-sec-hdr"><h3>' + esc(title) + '</h3></div>' + inner + '</div>';
  }

  /* ── custom select config (SSOT — stam.custom-select.js 사용만) ── */
  var CS_CFG = {
    selectSelector: 'select.bf-sel',
    nativeMarkerAttr: 'data-bf-cs',
    uidPrefix: 'bfcs',
    wrapClass: 'bf-cs stam-cs',
    triggerClass: 'bf-cs-trigger stam-cs-trigger',
    valClass: 'bf-cs-val stam-cs-value',
    caretClass: 'bf-cs-caret stam-cs-icon',
    panelClass: 'bf-cs-panel stam-cs-menu',
    optClass: 'bf-cs-opt stam-cs-opt',
    checkClass: 'bf-cs-check stam-cs-check',
    otextClass: 'bf-cs-otext stam-cs-otext',
    nativeClass: 'bf-cs-native',
    flipContainer: '.stam-drawer-body',
    openClass: 'is-open',
    upClass: 'is-up',
    openSelector: '.bf-cs.is-open'
  };

  /* ── BoardInstance ──────────────────────────────────────────── */
  function BoardInstance(root, config) {
    this.root = root;
    this.config = config;
    this.query = {
      keyword: '',
      filters: {},
      sort: (config.defaultSort) || { key: 'updatedAt', direction: 'desc' },
      page: 1,
      pageSize: (config.pageSize) || 20
    };
    this.refCache = {};
    this.selected = {};      // id → true
    this.lastRows = [];
    this.searchTimer = null;
  }

  BoardInstance.prototype.ctx = function () {
    return { config: this.config, refCache: this.refCache };
  };

  BoardInstance.prototype.mount = function () {
    this.root.classList.add('bf-board');
    this.root.innerHTML = this.skeletonHtml();
    this.cacheEls();
    this.bindStatic();
    this.initFilter();
    this.refresh();
  };

  BoardInstance.prototype.skeletonHtml = function () {
    var c = this.config;
    return '' +
      '<div class="bf-header stam-board-header">' +
        '<div class="bf-header-l stam-board-title-wrap">' +
          '<div class="bf-title stam-board-title">' + esc(c.title) + '</div>' +
          '<div class="bf-desc stam-board-desc">' + esc(c.description || '') + '</div>' +
        '</div>' +
        '<div class="bf-header-r stam-board-actions" data-bf-actions></div>' +
      '</div>' +
      '<div class="bf-summary" data-bf-summary></div>' +
      '<div class="bf-toolbar stam-board-toolbar">' +
        '<div class="stam-board-toolbar-left"><div class="stam-board-toolbar-base">' +
          '<div class="bf-search stam-board-search">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '<input type="text" data-bf-search placeholder="' + esc(c.searchPlaceholder || '검색') + '" autocomplete="off">' +
          '</div>' +
          '<div class="bf-toolbar-sep"></div>' +
          '<button class="bf-filter-btn stam-board-filter-trigger" data-bf-filter-trigger type="button" aria-expanded="false" aria-controls="bf-filter-panel">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 4h12M4 8h8M6 12h4"/></svg>' +
            '필터<span class="bf-filter-cnt stam-board-filter-count" data-bf-filter-count style="display:none">0</span>' +
          '</button>' +
          '<button class="bf-del-btn stam-btn stam-btn-danger" data-bf-delete type="button" disabled>' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>' +
            '<span data-bf-delete-label>삭제</span>' +
          '</button>' +
        '</div></div>' +
        '<div class="stam-board-toolbar-right"></div>' +
        '<div class="stam-board-filter-panel" id="bf-filter-panel" hidden>' +
          '<div class="stam-board-filter-grid"></div>' +
          '<div class="stam-board-filter-actions">' +
            '<button class="sbf-clear-btn" data-bf-filter-reset type="button">초기화</button>' +
            '<button class="sbf-apply-btn" data-bf-filter-apply type="button">적용</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="bf-tbl-outer">' +
        '<div class="bf-tbl-scroll"><table class="bf-table stam-select-table">' +
          '<colgroup data-bf-colgroup></colgroup>' +
          '<thead data-bf-thead></thead>' +
          '<tbody data-bf-tbody></tbody>' +
        '</table>' +
        '<div class="bf-state" data-bf-state hidden></div>' +
        '</div>' +
        '<div class="bf-tbl-foot stam-board-footer">' +
          '<span class="bf-count stam-board-count" data-bf-count></span>' +
          '<div class="bf-pg stam-board-pagination" data-bf-pagination></div>' +
        '</div>' +
      '</div>' +
      '<div class="bf-scrim stam-drawer-scrim" data-bf-scrim></div>' +
      '<div class="bf-drawer stam-drawer" data-bf-drawer="register" role="dialog" aria-modal="true" aria-label="등록"></div>' +
      '<div class="bf-drawer stam-drawer" data-bf-drawer="detail" role="dialog" aria-modal="true" aria-label="상세"></div>' +
      '<div class="bf-drawer stam-drawer" data-bf-drawer="edit" role="dialog" aria-modal="true" aria-label="수정"></div>';
  };

  BoardInstance.prototype.cacheEls = function () {
    var r = this.root;
    this.elActions = r.querySelector('[data-bf-actions]');
    this.elSummary = r.querySelector('[data-bf-summary]');
    this.elSearch = r.querySelector('[data-bf-search]');
    this.elColgroup = r.querySelector('[data-bf-colgroup]');
    this.elThead = r.querySelector('[data-bf-thead]');
    this.elTbody = r.querySelector('[data-bf-tbody]');
    this.elState = r.querySelector('[data-bf-state]');
    this.elCount = r.querySelector('[data-bf-count]');
    this.elPagination = r.querySelector('[data-bf-pagination]');
    this.elScrim = r.querySelector('[data-bf-scrim]');
    this.elDelete = r.querySelector('[data-bf-delete]');
    this.elDeleteLabel = r.querySelector('[data-bf-delete-label]');
  };

  BoardInstance.prototype.bindStatic = function () {
    var self = this;

    // header actions
    var actions = (this.config.actions && this.config.actions.header) || [];
    actions.forEach(function (act) {
      var btn = el('<button class="stam-btn stam-board-action-btn ' +
        (act.variant === 'primary' ? 'stam-btn-primary is-primary' : 'stam-btn-outline is-secondary') +
        '" type="button"></button>');
      btn.textContent = act.label;
      btn.addEventListener('click', function () {
        if (act.action === 'register') self.openRegister();
        else if (typeof act.onClick === 'function') act.onClick(self);
      });
      self.elActions.appendChild(btn);
    });

    // search (debounced, real filtering via dataSource)
    this.elSearch.addEventListener('input', function () {
      clearTimeout(self.searchTimer);
      self.searchTimer = setTimeout(function () {
        self.query.keyword = self.elSearch.value.trim();
        self.query.page = 1;
        self.refresh();
      }, 180);
    });

    // delete (in-memory)
    this.elDelete.addEventListener('click', function () {
      if (self.elDelete.disabled) return;
      self.deleteSelected();
    });

    // table interactions (event delegation)
    this.elTbody.addEventListener('click', function (e) {
      var checkbox = e.target.closest('[data-bf-row-check]');
      if (checkbox) { self.toggleSelect(checkbox.getAttribute('data-bf-id'), checkbox.checked); return; }
      var actionBtn = e.target.closest('[data-bf-action]');
      if (actionBtn) {
        e.stopPropagation();
        var act = actionBtn.getAttribute('data-bf-action');
        var id = actionBtn.getAttribute('data-bf-id');
        if (act === 'detail') self.openDetail(id);
        return;
      }
      var row = e.target.closest('[data-bf-row]');
      if (row) self.openDetail(row.getAttribute('data-bf-id'));
    });

    // scrim + esc + close + drawer footer/tab/edit (delegated on root)
    this.elScrim.addEventListener('click', function () { self.closeDrawers(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (self.root.querySelector('.bf-cs.is-open')) {
        if (window.STAM.customSelect) window.STAM.customSelect.closeAll(document, CS_CFG);
        return;
      }
      if (self.root.querySelector('.bf-drawer.open')) self.closeDrawers();
    }, true);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.bf-cs') && window.STAM.customSelect) {
        window.STAM.customSelect.closeAll(document, CS_CFG);
      }
    });

    this.root.addEventListener('click', function (e) {
      if (e.target.closest('[data-bf-close]')) { self.closeDrawers(); return; }
      var openEdit = e.target.closest('[data-bf-open="edit"]');
      if (openEdit) { self.openEdit(openEdit.getAttribute('data-bf-id')); return; }
      var submit = e.target.closest('[data-bf-submit]');
      if (submit) { self.handleSubmit(submit.getAttribute('data-bf-submit')); return; }
      var tab = e.target.closest('[data-bf-tab]');
      if (tab) { self.switchTab(tab); return; }
    });
  };

  /* ── filter (STAM.boardFilter SSOT 사용) ────────────────────── */
  BoardInstance.prototype.initFilter = function () {
    var self = this;
    if (!(window.STAM && window.STAM.boardFilter)) return;
    var groups = (this.config.filters || []).map(function (f) {
      return { key: f.key, label: f.label, type: f.type, options: f.options };
    });
    this.filterApi = window.STAM.boardFilter.init({
      root: this.root,
      trigger: '[data-bf-filter-trigger]',
      panel: '#bf-filter-panel',
      reset: '[data-bf-filter-reset]',
      apply: '[data-bf-filter-apply]',
      groups: groups,
      onApply: function (values) {
        self.query.filters = values || {};
        self.query.page = 1;
        self.refresh();
      },
      onReset: function () {
        self.query.filters = {};
        self.query.page = 1;
        self.refresh();
      }
    });
  };

  /* ── data refresh ───────────────────────────────────────────── */
  BoardInstance.prototype.refresh = function () {
    var self = this;
    var ds = this.config.dataSource;
    this.showState('loading');
    Promise.resolve()
      .then(function () { return ds.list(self.cloneQuery()); })
      .then(function (res) {
        res = res || { rows: [], total: 0 };
        self.lastRows = res.rows || [];
        return self.resolveRefs(self.lastRows).then(function () {
          self.renderTable(self.lastRows, res.total || 0);
        });
      })
      .then(function () {
        if (ds.summary) {
          return Promise.resolve(ds.summary(self.cloneQuery())).then(function (s) {
            self.renderSummary(s || { metrics: {} });
          });
        }
      })
      .catch(function (err) {
        if (window.console) console.error('[boardFactory] refresh error', err);
        self.showState('error');
      });
  };

  BoardInstance.prototype.cloneQuery = function () {
    return JSON.parse(JSON.stringify(this.query));
  };

  BoardInstance.prototype.resolveRefs = function (rows) {
    var self = this;
    var rs = this.config.referenceSource;
    if (!rs || !rs.resolve) return Promise.resolve();
    var needs = {};
    (this.config.columns || []).forEach(function (col) {
      if (!col.refType) return;
      rows.forEach(function (r) {
        asArray(r[col.field]).forEach(function (id) {
          if (!id) return;
          (needs[col.refType] = needs[col.refType] || {})[id] = true;
        });
      });
    });
    var types = Object.keys(needs);
    return Promise.all(types.map(function (type) {
      return Promise.resolve(rs.resolve(type, Object.keys(needs[type]))).then(function (out) {
        self.refCache[type] = Object.assign(self.refCache[type] || {}, (out && out.byId) || {});
      });
    }));
  };

  /* ── render: summary ────────────────────────────────────────── */
  BoardInstance.prototype.renderSummary = function (summary) {
    var cells = (this.config.summary && this.config.summary.cells) || [];
    if (!cells.length) { this.elSummary.hidden = true; return; }
    var metrics = summary.metrics || {};
    this.elSummary.hidden = false;
    var html = '<div class="bf-ss-strip">' + cells.map(function (cell, i) {
      var num = metrics[cell.key];
      if (num === undefined || num === null) num = 0;
      return '<div class="bf-ss-cell' + (i === 0 ? ' on' : '') + '">' +
        '<div class="bf-ss-lbl"><span class="bf-ss-dot" style="background:' + esc(cell.dot || 'var(--stam)') + '"></span>' + esc(cell.label) + '</div>' +
        '<div class="bf-ss-num"' + (i === 0 ? ' style="color:var(--stam)"' : '') + '>' + esc(num) + '</div>' +
        (cell.sub ? '<div class="bf-ss-sub">' + esc(cell.sub) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
    this.elSummary.innerHTML = html;
  };

  /* ── render: table ──────────────────────────────────────────── */
  BoardInstance.prototype.renderTable = function (rows, total) {
    var self = this;
    var cols = this.config.columns || [];

    // colgroup + thead (once)
    if (!this.elColgroup.children.length) {
      this.elColgroup.innerHTML = cols.map(function (c) {
        var w = c.width ? (typeof c.width === 'number' ? c.width + 'px' : c.width) : '';
        var style = c.type === 'checkbox' ? 'width:40px' :
          (c.minWidth ? 'min-width:' + c.minWidth : (w ? 'width:' + w : ''));
        return '<col' + (style ? ' style="' + style + '"' : '') + '>';
      }).join('');
      this.elThead.innerHTML = '<tr>' + cols.map(function (c) {
        if (c.type === 'checkbox') {
          return '<th class="stam-check-cell"><input type="checkbox" class="stam-check" data-bf-check-all></th>';
        }
        return '<th>' + esc(c.label || '') + '</th>';
      }).join('') + '</tr>';
      var checkAll = this.elThead.querySelector('[data-bf-check-all]');
      if (checkAll) checkAll.addEventListener('change', function () { self.toggleSelectAll(checkAll.checked); });
    }

    this.hideState();
    if (!rows.length) {
      this.elTbody.innerHTML = '';
      this.showState('empty');
    } else {
      var ctx = this.ctx();
      this.elTbody.innerHTML = rows.map(function (row) { return self.rowHtml(row, cols, ctx); }).join('');
    }

    // count + pagination
    var q = this.query;
    var start = (q.page - 1) * q.pageSize;
    var shown = Math.min(rows.length, q.pageSize);
    this.elCount.innerHTML = '총 <b>' + total + '</b>건 중 <b>' + (total === 0 ? 0 : (start + shown)) + '</b>건 표시';
    this.renderPagination(total);
    this.syncSelectionUi();
  };

  BoardInstance.prototype.rowHtml = function (row, cols, ctx) {
    var self = this;
    var id = row[this.config.idKey || 'id'];
    var tds = cols.map(function (col) {
      if (col.type === 'checkbox') {
        var checked = self.selected[id] ? ' checked' : '';
        return '<td class="stam-check-cell"><input type="checkbox" class="stam-check" data-bf-row-check data-bf-id="' + esc(id) + '"' + checked + '></td>';
      }
      if (col.type === 'actionButtons') {
        return '<td class="bf-action-cell">' + (col.buttons || [{ action: 'detail', label: '상세' }]).map(function (b) {
          return '<button class="bf-action-btn" type="button" data-bf-action="' + esc(b.action) + '" data-bf-id="' + esc(id) + '">' + esc(b.label) + '</button>';
        }).join('') + '</td>';
      }
      var fn = RENDERERS[col.type] || RENDERERS.text;
      return '<td' + (col.cellClass ? ' class="' + esc(col.cellClass) + '"' : '') + '>' + fn(row, col, ctx) + '</td>';
    }).join('');
    return '<tr class="bf-data-row stam-table-row" data-bf-row data-bf-id="' + esc(id) + '">' + tds + '</tr>';
  };

  BoardInstance.prototype.renderPagination = function (total) {
    var self = this;
    var q = this.query;
    var pages = Math.max(1, Math.ceil(total / q.pageSize));
    var cur = q.page;
    var html = '';
    html += '<button class="bf-pgb stam-page-btn" type="button" aria-label="이전 페이지" data-bf-page="' + (cur - 1) + '"' + (cur <= 1 ? ' disabled' : '') + '>' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></button>';
    for (var p = 1; p <= pages; p++) {
      html += '<button class="bf-pgb stam-page-btn' + (p === cur ? ' on is-current' : '') + '" type="button" data-bf-page="' + p + '">' + p + '</button>';
    }
    html += '<button class="bf-pgb stam-page-btn" type="button" aria-label="다음 페이지" data-bf-page="' + (cur + 1) + '"' + (cur >= pages ? ' disabled' : '') + '>' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button>';
    this.elPagination.innerHTML = html;
    this.elPagination.querySelectorAll('[data-bf-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        self.query.page = parseInt(btn.getAttribute('data-bf-page'), 10);
        self.refresh();
      });
    });
  };

  /* ── state (empty / loading / error) ────────────────────────── */
  BoardInstance.prototype.showState = function (kind) {
    if (!this.elState) return;
    var msg = {
      loading: '<div class="bf-state-spinner" aria-hidden="true"></div><div class="bf-state-msg">불러오는 중…</div>',
      empty: '<div class="bf-state-msg">조건에 맞는 항목이 없습니다.</div>',
      error: '<div class="bf-state-msg bf-state-err">데이터를 불러오지 못했습니다.</div>'
    }[kind] || '';
    if (kind === 'loading' && this.elTbody.children.length) return; // keep current rows while refreshing
    this.elState.className = 'bf-state bf-state--' + kind;
    this.elState.innerHTML = msg;
    this.elState.hidden = false;
  };
  BoardInstance.prototype.hideState = function () {
    if (this.elState) { this.elState.hidden = true; this.elState.innerHTML = ''; }
  };

  /* ── selection ──────────────────────────────────────────────── */
  BoardInstance.prototype.toggleSelect = function (id, on) {
    if (on) this.selected[id] = true; else delete this.selected[id];
    this.syncSelectionUi();
  };
  BoardInstance.prototype.toggleSelectAll = function (on) {
    var self = this;
    var idKey = this.config.idKey || 'id';
    this.lastRows.forEach(function (r) {
      if (on) self.selected[r[idKey]] = true; else delete self.selected[r[idKey]];
    });
    this.elTbody.querySelectorAll('[data-bf-row-check]').forEach(function (cb) { cb.checked = on; });
    this.syncSelectionUi();
  };
  BoardInstance.prototype.syncSelectionUi = function () {
    var ids = Object.keys(this.selected);
    var n = ids.length;
    this.elDelete.disabled = n === 0;
    this.elDeleteLabel.textContent = n === 0 ? '삭제' : '삭제(' + n + ')';
    // reflect row .is-selected
    this.elTbody.querySelectorAll('[data-bf-row]').forEach(function (row) {
      row.classList.toggle('is-selected', !!this.selected[row.getAttribute('data-bf-id')]);
    }.bind(this));
    var checkAll = this.elThead.querySelector('[data-bf-check-all]');
    if (checkAll) {
      var idKey = this.config.idKey || 'id';
      var pageIds = this.lastRows.map(function (r) { return r[idKey]; });
      checkAll.checked = pageIds.length > 0 && pageIds.every(function (id) { return this.selected[id]; }.bind(this));
    }
  };
  BoardInstance.prototype.deleteSelected = function () {
    var self = this;
    var ds = this.config.dataSource;
    var ids = Object.keys(this.selected);
    if (!ids.length) return;
    if (!ds.remove) { this.selected = {}; this.refresh(); return; }
    Promise.all(ids.map(function (id) { return Promise.resolve(ds.remove(id)); }))
      .then(function () { self.selected = {}; self.refresh(); });
  };

  /* ── drawers ────────────────────────────────────────────────── */
  BoardInstance.prototype.drawerEl = function (kind) {
    return this.root.querySelector('[data-bf-drawer="' + kind + '"]');
  };
  BoardInstance.prototype.openDrawerEl = function (kind) {
    this.closeDrawers(true);
    this.elScrim.classList.add('show');
    var d = this.drawerEl(kind);
    d.classList.add('open');
    if (window.STAM.customSelect) window.STAM.customSelect.init(d, CS_CFG);
  };
  BoardInstance.prototype.closeDrawers = function (silent) {
    if (window.STAM.customSelect) window.STAM.customSelect.closeAll(document, CS_CFG);
    this.elScrim.classList.remove('show');
    this.root.querySelectorAll('.bf-drawer.open').forEach(function (d) { d.classList.remove('open'); });
  };

  BoardInstance.prototype.switchTab = function (tab) {
    var drawer = tab.closest('.bf-drawer');
    if (!drawer) return;
    var tabs = Array.prototype.slice.call(drawer.querySelectorAll('[data-bf-tab]'));
    var idx = tabs.indexOf(tab);
    tabs.forEach(function (t) { t.classList.remove('on'); });
    tab.classList.add('on');
    drawer.querySelectorAll('[data-bf-tab-panel]').forEach(function (p, i) {
      p.style.display = i === idx ? '' : 'none';
    });
  };

  /* register */
  BoardInstance.prototype.openRegister = function () {
    var d = this.drawerEl('register');
    var nextId = (this.config.dataSource.nextId && this.config.dataSource.nextId()) || '';
    d.innerHTML = this.formDrawerHtml('register', null, nextId);
    this.openDrawerEl('register');
  };

  /* edit */
  BoardInstance.prototype.openEdit = function (id) {
    var self = this;
    Promise.resolve(this.config.dataSource.get(id)).then(function (record) {
      if (!record) return;
      var d = self.drawerEl('edit');
      d.innerHTML = self.formDrawerHtml('edit', record, record[self.config.idKey || 'id']);
      self.openDrawerEl('edit');
    });
  };

  BoardInstance.prototype.formDrawerHtml = function (mode, record, idValue) {
    var self = this;
    var dw = this.config.drawer || {};
    var sections = dw.sections || [];
    var isEdit = mode === 'edit';
    var statusEntry = record ? vocabEntry(this.config, 'status', record.status) : null;

    var head = '<div class="bf-dw-head stam-drawer-head">' +
      '<div class="bf-dw-hrow1">' +
      '<span class="bf-dw-badge">' + esc(isEdit ? idValue : 'NEW') + '</span>' +
      (statusEntry ? '<span class="bf-chip bf-chip--' + esc(statusEntry.tone || 'neutral') + '" style="margin-left:4px">' + esc(statusEntry.label) + '</span>' : '') +
      '<button class="bf-dw-close" type="button" data-bf-close aria-label="닫기"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<div class="bf-dw-title stam-drawer-title">' + esc(isEdit ? record[this.config.nameKey || 'name'] : (dw.registerTitle || '새 항목 등록')) + '</div>' +
      '</div>';

    var body = '<div class="bf-dw-body stam-drawer-body">' +
      '<div class="bf-form-err" data-bf-form-err role="alert" hidden></div>' +
      sections.map(function (sec, si) {
      var fields = (sec.fields || []).map(function (f) { return self.fieldHtml(f, record, idValue); }).join('');
      return '<div class="bf-fs"><div class="bf-fs-hdr"><span class="bf-fs-num">' + (si + 1) + '</span><span class="bf-fs-title">' + esc(sec.title) + '</span></div>' +
        '<div class="bf-fgrid stam-form-grid">' + fields + '</div></div>';
    }).join('') + '</div>';

    var foot = '<div class="stam-drawer-foot">' +
      '<div class="stam-dw-foot-left">' +
        '<button class="stam-btn stam-btn-ghost" type="button" data-bf-close>취소</button>' +
        '<button class="stam-btn stam-btn-outline" type="button" data-bf-noop title="preview - 미저장">임시저장</button>' +
        '<button class="stam-btn stam-btn-ghost" type="button" data-bf-noop>전체 보기</button>' +
      '</div>' +
      '<div class="stam-dw-foot-spacer"></div>' +
      '<div class="stam-dw-foot-right">' +
        '<button class="stam-btn stam-btn-primary" type="button" data-bf-submit="' + mode + '"' + (isEdit ? ' data-bf-id="' + esc(idValue) + '"' : '') + '>' + (isEdit ? '저장' : '등록') + '</button>' +
      '</div>' +
    '</div>';

    return head + body + foot;
  };

  BoardInstance.prototype.fieldHtml = function (f, record, idValue) {
    var full = f.full ? ' full-span' : '';
    var raw = record ? record[f.key] : (f.default !== undefined ? f.default : '');
    var val = Array.isArray(raw) ? (raw[0] || '') : (raw === undefined || raw === null ? '' : raw);
    var labelHtml = esc(f.label) + (f.required ? ' <span class="bf-req">*</span>' : '');
    var control;

    if (f.type === 'readonly' || f.key === (this.config.idKey || 'id')) {
      var roVal = record ? idValue : (idValue || '');
      control = '<input class="stam-input bf-ro" value="' + esc(roVal) + '" readonly>';
    } else if (f.type === 'textarea') {
      control = '<textarea class="stam-textarea" data-bf-field="' + esc(f.key) + '" placeholder="' + esc(f.placeholder || '') + '"' +
        (f.minHeight ? ' style="min-height:' + f.minHeight + '"' : '') + '>' + esc(val) + '</textarea>';
    } else if (f.type === 'select') {
      var opts = (f.options || []).map(function (o) {
        var ov = (o.value !== undefined ? o.value : o.label);
        var ol = (o.label !== undefined ? o.label : o.value);
        return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>';
      }).join('');
      var placeholder = f.placeholder ? '<option value="">' + esc(f.placeholder) + '</option>' : '';
      control = '<select class="stam-select bf-sel" data-bf-field="' + esc(f.key) + '"' + (f.asArray ? ' data-bf-array="1"' : '') + '>' + placeholder + opts + '</select>';
    } else {
      control = '<input class="stam-input" data-bf-field="' + esc(f.key) + '" value="' + esc(val) + '" placeholder="' + esc(f.placeholder || '') + '">';
    }

    var isRequired = f.required && f.type !== 'readonly' && f.key !== (this.config.idKey || 'id');
    return '<div class="bf-ffield stam-form-field' + full + '" data-bf-field-wrap="' + esc(f.key) + '"' +
      (isRequired ? ' data-bf-required="1"' : '') + '>' +
      '<label class="bf-flbl stam-label">' + labelHtml + '</label>' + control +
      '<div class="bf-field-err" data-bf-field-err hidden></div>' +
      '</div>';
  };

  /* ── required validation (register/edit submit 전 차단) ──────── */
  BoardInstance.prototype.validateRequired = function (drawer) {
    var dw = this.config.drawer || {};
    var idKey = this.config.idKey || 'id';
    var required = [];
    (dw.sections || []).forEach(function (sec) {
      (sec.fields || []).forEach(function (f) {
        if (f.required && f.type !== 'readonly' && f.key !== idKey) required.push(f);
      });
    });

    // 이전 invalid 상태 초기화
    drawer.querySelectorAll('[data-bf-field-wrap].is-invalid').forEach(function (w) { w.classList.remove('is-invalid'); });
    drawer.querySelectorAll('[data-bf-field-err]').forEach(function (e) { e.hidden = true; e.textContent = ''; });
    var banner = drawer.querySelector('[data-bf-form-err]');
    if (banner) { banner.hidden = true; banner.textContent = ''; }

    var invalids = [];
    required.forEach(function (f) {
      var control = drawer.querySelector('[data-bf-field="' + f.key + '"]');
      if (!control) return;
      var v = (control.value || '').trim();
      if (v === '') {
        var wrap = drawer.querySelector('[data-bf-field-wrap="' + f.key + '"]');
        if (wrap) {
          wrap.classList.add('is-invalid');
          var err = wrap.querySelector('[data-bf-field-err]');
          if (err) { err.textContent = (f.label || '필수 항목') + '을(를) 입력하세요.'; err.hidden = false; }
        }
        invalids.push({ field: f, control: control, wrap: wrap });
      }
    });

    if (invalids.length) {
      if (banner) {
        banner.textContent = '필수 항목 ' + invalids.length + '개를 확인하세요 — ' +
          invalids.map(function (x) { return x.field.label; }).join(', ');
        banner.hidden = false;
      }
      var first = invalids[0];
      var focusEl = first.wrap ? first.wrap.querySelector('.bf-cs-trigger') : null;
      (focusEl || first.control).focus();
    }
    return invalids.length === 0;
  };

  BoardInstance.prototype.handleSubmit = function (mode) {
    var self = this;
    var drawer = this.drawerEl(mode);
    // required 미충족 시 create/update 호출하지 않고 차단
    if (!this.validateRequired(drawer)) return false;
    var record = {};
    drawer.querySelectorAll('[data-bf-field]').forEach(function (input) {
      var key = input.getAttribute('data-bf-field');
      var value = input.value;
      if (input.getAttribute('data-bf-array') === '1') {
        record[key] = value ? [value] : [];
      } else {
        record[key] = value;
      }
    });
    var ds = this.config.dataSource;
    var done;
    if (mode === 'register') {
      record[this.config.idKey || 'id'] = (ds.nextId && ds.nextId()) || record[this.config.idKey || 'id'];
      record.updatedAt = record.updatedAt || todayStr();
      done = Promise.resolve(ds.create ? ds.create(record) : null);
    } else {
      var id = drawer.querySelector('[data-bf-submit]').getAttribute('data-bf-id');
      record.updatedAt = todayStr();
      done = Promise.resolve(ds.update ? ds.update(id, record) : null);
    }
    done.then(function () {
      self.closeDrawers();
      self.query.page = 1;
      self.refresh();
    });
  };

  /* detail */
  BoardInstance.prototype.openDetail = function (id) {
    var self = this;
    Promise.resolve(this.config.dataSource.get(id)).then(function (record) {
      if (!record) return;
      return self.resolveRefs([record]).then(function () {
        var d = self.drawerEl('detail');
        d.innerHTML = self.detailDrawerHtml(record);
        self.openDrawerEl('detail');
      });
    });
  };

  BoardInstance.prototype.detailDrawerHtml = function (record) {
    var self = this;
    var detail = this.config.detail || {};
    var ctx = this.ctx();
    var idValue = record[this.config.idKey || 'id'];
    var statusEntry = vocabEntry(this.config, 'status', record.status);
    var tabs = detail.tabs || [{ label: '상세', sections: detail.sections || [] }];

    var head = '<div class="bf-dw-head stam-drawer-head">' +
      '<div class="bf-dw-hrow1">' +
      '<span class="bf-dw-badge">' + esc(idValue) + '</span>' +
      (statusEntry ? '<span class="bf-chip bf-chip--' + esc(statusEntry.tone || 'neutral') + '" style="margin-left:4px">' + esc(statusEntry.label) + '</span>' : '') +
      '<button class="bf-dw-close" type="button" data-bf-close aria-label="닫기"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<div class="bf-dw-title stam-drawer-title">' + esc(record[this.config.nameKey || 'name']) + '</div>' +
      '</div>';

    var tabBar = tabs.length > 1 ? '<div class="bf-dw-tabs">' + tabs.map(function (t, i) {
      return '<button class="bf-dw-tab' + (i === 0 ? ' on' : '') + '" type="button" data-bf-tab>' + esc(t.label) + '</button>';
    }).join('') + '</div>' : '';

    var body = '<div class="bf-dw-body stam-drawer-body">' + tabs.map(function (t, i) {
      var inner = (t.sections || []).map(function (sec) {
        var fn = SECTIONS[sec.type];
        return fn ? fn(sec, record, ctx) : '';
      }).join('');
      return '<div class="bf-tab-panel" data-bf-tab-panel' + (i === 0 ? '' : ' style="display:none"') + '>' + inner + '</div>';
    }).join('') + '</div>';

    var foot = '<div class="stam-drawer-foot">' +
      '<div class="stam-dw-foot-meta">최종 변경 ' + esc(record.updatedAt || '') + '</div>' +
      '<div class="stam-dw-foot-spacer"></div>' +
      '<div class="stam-dw-foot-right">' +
        '<button class="stam-btn stam-btn-ghost" type="button" data-bf-noop>전체 보기</button>' +
        '<button class="stam-btn stam-btn-primary" type="button" data-bf-open="edit" data-bf-id="' + esc(idValue) + '">수정</button>' +
      '</div></div>';

    return head + tabBar + body + foot;
  };

  /* ── public API ─────────────────────────────────────────────── */
  window.STAM.boardFactory = {
    mount: function (root, config) {
      if (!root || !config) {
        if (window.console) console.error('[boardFactory] mount: root/config required');
        return null;
      }
      var inst = new BoardInstance(root, config);
      inst.mount();
      return inst;
    }
  };
}());
