/*
 * STAM Board Builder Admin Preview v1 — 입력 기반 게시판 config preview (preview)
 *
 * 사용자가 카테고리 / 게시판명 / 게시판 코드 / 설명 + 필드(기본 + 커스텀)를
 * 입력하면, Field Schema v1(STAM.boardFieldSchema)을 이용해 Board Factory 형식의
 * config(columns / filters / drawer)를 '생성하고' 화면에서 즉시 preview 한다.
 *
 *  - DB 없음: localStorage / in-memory 만 사용한다.
 *    · stam.boardBuilder.previewConfig — 생성된 config
 *    · stam.boardBuilder.formState     — 입력 폼 상태(새로고침 복원)
 *  - Firestore / API / fetch 호출 없음.
 *  - 1차 범위: 생성 config 를 실제 Board Factory route 로 mount 하지 않는다.
 *    table / filter / drawer preview 는 본 페이지 안에서 정적으로 보여준다.
 *    실제 engine 연결은 후속 "Custom Board Runtime Preview" PR.
 *  - App Shell 미부착 / Left Menu 대체 아님 / nav-data 미변경.
 *
 * 정의: docs/reports/commonization/Board-Builder-Admin-Preview-v1.md
 */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.boardBuilderPreview) return;

  var LS_CONFIG = 'stam.boardBuilder.previewConfig';
  var LS_FORM = 'stam.boardBuilder.formState';

  /* 기본 제공 필드 프리셋 (체크박스). role: id/name 은 idName 컬럼 구성에 사용. */
  var DEFAULT_FIELD_PRESETS = [
    { key: 'id',        label: 'ID',        type: 'text',     role: 'id',   on: true },
    { key: 'title',     label: '제목',      type: 'text',     role: 'name', required: true, on: true },
    { key: 'status',    label: '상태',      type: 'status',   on: true,  options: ['작성중', '검토요청', '검토완료', '승인완료', '보류'],
      tone: { '작성중': 'neutral', '검토요청': 'warn', '검토완료': 'info', '승인완료': 'pass', '보류': 'fail' } },
    { key: 'ownerId',   label: '담당자',    type: 'user',     on: true },
    { key: 'priority',  label: '우선순위',  type: 'priority', on: false, options: ['높음', '보통', '낮음'],
      tone: { '높음': 'high', '보통': 'mid', '낮음': 'low' } },
    { key: 'type',      label: '유형',      type: 'select',   on: false, options: ['일반', '기능', '화면'] },
    { key: 'updatedAt', label: '최종수정일', type: 'date',    role: 'updated', on: true },
    { key: 'desc',      label: '설명',      type: 'textarea', on: false }
  ];

  /* 커스텀 필드에서 고를 수 있는 type (task 명세 11종). */
  var BUILDER_FIELD_TYPES = ['text', 'textarea', 'select', 'date', 'user', 'status', 'priority', 'relation', 'boolean', 'number', 'url'];

  var SAMPLE_USERS = ['김민준', '이수빈', '박지호'];
  var TEMPLATE_LABEL = '목록 + 필터 + 등록 Drawer + 상세 Drawer + 수정 Drawer';

  /* ── utils ───────────────────────────────────────────────────── */
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return String(n).padStart(3, '0'); }
  function csvToArray(s) {
    if (!s) return [];
    return String(s).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function slugify(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function slugToCamel(s) {
    var parts = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean);
    if (!parts.length) return '';
    return parts.map(function (w, i) { return i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1); }).join('');
  }
  function lsGet(key) {
    try { var v = window.localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function lsRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) {}
  }

  /* ── config 생성 (pure: DOM 비의존, 테스트 가능) ───────────────────
   * form = { category, title, slug, description, fields:[{key,label,type,options[],tone?,role?,required?}] }
   * Field Schema v1(defineField/engineMapping)로 정규화해 columns/filters/drawer 파생. */
  function buildConfig(form) {
    form = form || {};
    var FS = window.STAM && window.STAM.boardFieldSchema;
    var fieldsIn = (form.fields || []);
    var idKey = 'id', nameKey = null;
    fieldsIn.forEach(function (f) {
      if (f.role === 'id') idKey = f.key;
      if (f.role === 'name') nameKey = f.key;
    });

    var fields = fieldsIn.map(function (f) {
      var spec = {
        key: f.key, label: f.label, type: f.type,
        options: (f.options && f.options.length) ? f.options : null,
        tone: f.tone || null,
        required: !!f.required
      };
      var nf = FS ? FS.defineField(spec) : spec;
      if (f.role) nf.role = f.role;
      return nf;
    });

    function colType(type) {
      var m = FS ? FS.engineMapping(type) : null;
      return (m && m.column) || 'text';
    }
    function controlType(field) {
      if (field.role === 'id') return 'readonly';
      var m = FS ? FS.engineMapping(field.type) : null;
      var c = m && m.control;
      if (c === 'textarea') return 'textarea';
      if (c === 'select') return 'select';
      return 'text';
    }
    function optionObjs(field) {
      return (field.options || []).map(function (o) { return { label: o, value: o }; });
    }
    function drawerField(field) {
      return {
        key: field.key, label: field.label, type: controlType(field),
        required: !!field.required, full: field.type === 'textarea',
        options: optionObjs(field)
      };
    }

    /* columns: checkbox + idName(id/name) + 나머지 visibleInTable + 상세 */
    var columns = [{ type: 'checkbox' }];
    if (idKey || nameKey) {
      var idF = fields.filter(function (f) { return f.key === idKey; })[0];
      var nameF = nameKey ? fields.filter(function (f) { return f.key === nameKey; })[0] : null;
      columns.push({
        type: 'idName',
        label: (idF ? idF.label : 'ID') + ' / ' + (nameF ? nameF.label : '명'),
        idField: idKey, nameField: nameKey || idKey
      });
    }
    fields.forEach(function (f) {
      if (f.key === idKey || (nameKey && f.key === nameKey)) return;
      if (!f.visibleInTable) return;
      columns.push({ type: colType(f.type), label: f.label, field: f.key, width: f.width || null });
    });
    columns.push({ type: 'actionButtons', label: '', buttons: [{ action: 'detail', label: '상세' }] });

    /* filters: visibleInFilter 필드 */
    var filters = fields.filter(function (f) { return f.visibleInFilter; }).map(function (f) {
      return { key: f.key, label: f.label, options: optionObjs(f) };
    });

    /* drawer: create(편집 가능) / detail(표시) / edit */
    var createFields = fields.filter(function (f) { return f.visibleInDrawer && f.editable !== false; }).map(drawerField);
    var detailFields = fields.filter(function (f) { return f.visibleInDrawer; }).map(drawerField);

    var slug = form.slug || slugify(form.title) || 'board';
    return {
      id: (slugToCamel(slug) || 'board') + 'V2',
      slug: slug,
      category: form.category || '',
      title: form.title || '',
      description: form.description || '',
      idKey: idKey,
      nameKey: nameKey || idKey,
      template: TEMPLATE_LABEL,
      fields: fields,
      columns: columns,
      filters: filters,
      drawer: { create: createFields, detail: detailFields, edit: createFields.slice() },
      actions: ['create', 'delete', 'filter'],
      generatedAt: new Date().toISOString()
    };
  }

  /* ── sample rows (preview 용 3행 자동 생성) ───────────────────── */
  function sampleValue(field, i, prefix) {
    var opts = (field.options && field.options.length) ? field.options : null;
    switch (field.type) {
      case 'textarea': return field.label + ' 예시 내용 ' + i + '.';
      case 'select': return opts ? opts[(i - 1) % opts.length] : ('항목 ' + i);
      case 'status': return opts ? opts[(i - 1) % opts.length] : '작성중';
      case 'priority': return opts ? opts[(i - 1) % opts.length] : '보통';
      case 'multiSelect': return opts ? [opts[(i - 1) % opts.length]] : ['태그' + i];
      case 'date': return sampleDate(i);
      case 'user': return SAMPLE_USERS[(i - 1) % SAMPLE_USERS.length];
      case 'relation': return [prefix + '-R' + pad(i)];
      case 'boolean': return (i % 2 === 1);
      case 'number': return i * 10;
      case 'url': return 'https://example.com/' + prefix.toLowerCase() + '/' + i;
      default: return field.role === 'id' ? (prefix + '-' + pad(i)) : (field.label + ' 샘플 ' + i);
    }
  }
  function sampleDate(i) {
    var d = 9 + i; // 2026-06-1x 근처
    return '2026-06-' + (d < 10 ? '0' + d : d);
  }
  function sampleRows(config, n) {
    var prefix = (config.slug || 'row').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ROW';
    var rows = [];
    for (var i = 1; i <= n; i++) {
      var r = {};
      (config.fields || []).forEach(function (f) { r[f.key] = sampleValue(f, i, prefix); });
      rows.push(r);
    }
    return rows;
  }
  function toneFor(field, value) {
    if (field && field.tone && field.tone[value]) return field.tone[value];
    return 'neutral';
  }

  /* ── DOM helpers ─────────────────────────────────────────────── */
  function q(root, sel) { return root.querySelector(sel); }
  function qa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  /* ── controller ──────────────────────────────────────────────── */
  function init(rootArg) {
    var root = rootArg || document;
    var els = {
      category: q(root, '[data-bb="category"]'),
      title: q(root, '[data-bb="title"]'),
      slug: q(root, '[data-bb="slug"]'),
      description: q(root, '[data-bb="description"]'),
      defaults: q(root, '[data-bb-defaults]'),
      cfName: q(root, '[data-bb-cf="name"]'),
      cfKey: q(root, '[data-bb-cf="key"]'),
      cfType: q(root, '[data-bb-cf="type"]'),
      cfOptions: q(root, '[data-bb-cf="options"]'),
      cfList: q(root, '[data-bb-cflist]'),
      preview: q(root, '[data-bb-preview]'),
      copyStatus: q(root, '[data-bb-copy-status]')
    };
    if (!els.defaults) return null; // 페이지 골격 없음 → no-op

    /* 기본 필드 체크박스 렌더 */
    els.defaults.innerHTML = DEFAULT_FIELD_PRESETS.map(function (p) {
      var meta = (window.STAM.boardFieldSchema && window.STAM.boardFieldSchema.types[p.type]) || {};
      return '<label class="bb-fchk">' +
        '<input type="checkbox" data-bb-default value="' + esc(p.key) + '"' + (p.on ? ' checked' : '') + '>' +
        '<span class="bb-fchk-label">' + esc(p.label) + '</span>' +
        '<span class="bb-fchk-type">' + esc(p.type) + '</span>' +
        '</label>';
    }).join('');

    /* 커스텀 필드 type 옵션 렌더 */
    if (els.cfType) {
      els.cfType.innerHTML = BUILDER_FIELD_TYPES.map(function (t) {
        var meta = (window.STAM.boardFieldSchema && window.STAM.boardFieldSchema.types[t]) || {};
        return '<option value="' + esc(t) + '">' + esc(t) + (meta.label ? ' · ' + esc(meta.label) : '') + '</option>';
      }).join('');
    }

    var customFields = []; // { name, key, type, options:[] }

    function renderCustomList() {
      if (!els.cfList) return;
      if (!customFields.length) { els.cfList.innerHTML = '<div class="bb-empty">추가된 커스텀 필드가 없습니다.</div>'; return; }
      els.cfList.innerHTML = customFields.map(function (f, i) {
        return '<div class="bb-cfrow">' +
          '<span class="bb-cfrow-name">' + esc(f.name) + '</span>' +
          '<span class="bb-cfrow-key">' + esc(f.key) + '</span>' +
          '<span class="bb-chip bb-chip--type">' + esc(f.type) + '</span>' +
          (f.options.length ? '<span class="bb-cfrow-opts">' + esc(f.options.join(', ')) + '</span>' : '') +
          '<button type="button" class="bb-cfrow-del" data-bb-cf-del="' + i + '" aria-label="삭제">✕</button>' +
          '</div>';
      }).join('');
    }

    function collectForm() {
      var checkedKeys = qa(root, '[data-bb-default]').filter(function (c) { return c.checked; })
        .map(function (c) { return c.getAttribute('value'); });
      var fields = [];
      DEFAULT_FIELD_PRESETS.forEach(function (p) {
        if (checkedKeys.indexOf(p.key) === -1) return;
        fields.push({ key: p.key, label: p.label, type: p.type, options: p.options || [], tone: p.tone || null, role: p.role || null, required: !!p.required });
      });
      customFields.forEach(function (f) {
        fields.push({ key: f.key, label: f.name, type: f.type, options: f.options, tone: null, role: null, required: false });
      });
      return {
        category: els.category ? els.category.value : '',
        title: els.title ? els.title.value.trim() : '',
        slug: els.slug ? els.slug.value.trim() : '',
        description: els.description ? els.description.value.trim() : '',
        defaults: checkedKeys,
        customFields: customFields.slice(),
        fields: fields
      };
    }

    function saveForm() { lsSet(LS_FORM, collectForm()); }

    function restoreForm() {
      var s = lsGet(LS_FORM);
      if (!s) { renderCustomList(); return; }
      if (els.category && s.category) els.category.value = s.category;
      if (els.title) els.title.value = s.title || '';
      if (els.slug) els.slug.value = s.slug || '';
      if (els.description) els.description.value = s.description || '';
      if (s.defaults) {
        qa(root, '[data-bb-default]').forEach(function (c) {
          c.checked = s.defaults.indexOf(c.getAttribute('value')) !== -1;
        });
      }
      customFields = (s.customFields || []).map(function (f) {
        return { name: f.name, key: f.key, type: f.type, options: f.options || [] };
      });
      renderCustomList();
    }

    function addCustomField() {
      var name = els.cfName ? els.cfName.value.trim() : '';
      var key = els.cfKey ? els.cfKey.value.trim() : '';
      var type = els.cfType ? els.cfType.value : 'text';
      var options = els.cfOptions ? csvToArray(els.cfOptions.value) : [];
      if (!name) { if (els.cfName) els.cfName.focus(); return; }
      if (!key) key = slugToCamel(name) || ('field' + (customFields.length + 1));
      if (BUILDER_FIELD_TYPES.indexOf(type) === -1) type = 'text';
      customFields.push({ name: name, key: key, type: type, options: options });
      if (els.cfName) els.cfName.value = '';
      if (els.cfKey) els.cfKey.value = '';
      if (els.cfOptions) els.cfOptions.value = '';
      renderCustomList();
      saveForm();
    }

    function generate() {
      var form = collectForm();
      var config = buildConfig(form);
      lsSet(LS_CONFIG, config);
      lsSet(LS_FORM, form);
      renderPreview(config);
    }

    function reset() {
      lsRemove(LS_CONFIG);
      lsRemove(LS_FORM);
      if (els.category) els.category.selectedIndex = 0;
      if (els.title) els.title.value = '';
      if (els.slug) els.slug.value = '';
      if (els.description) els.description.value = '';
      qa(root, '[data-bb-default]').forEach(function (c) {
        var p = DEFAULT_FIELD_PRESETS.filter(function (x) { return x.key === c.getAttribute('value'); })[0];
        c.checked = !!(p && p.on);
      });
      customFields = [];
      renderCustomList();
      if (els.preview) els.preview.innerHTML = '<div class="bb-empty">아직 생성된 config 가 없습니다. 입력 후 <b>Preview 생성</b>을 누르세요.</div>';
      if (els.copyStatus) els.copyStatus.textContent = '';
    }

    function copyJson() {
      var config = lsGet(LS_CONFIG);
      if (!config) { setCopyStatus('생성된 config 가 없습니다.'); return; }
      var json = JSON.stringify(config, null, 2);
      var done = function () { setCopyStatus('JSON 복사 완료 ✓'); };
      var fail = function () {
        var ta = els.preview ? els.preview.querySelector('[data-bb-json]') : null;
        if (ta && ta.select) { ta.removeAttribute('readonly'); ta.select(); ta.setAttribute('readonly', 'readonly'); }
        setCopyStatus('자동 복사 실패 — JSON 영역을 선택 후 Ctrl/Cmd+C 로 복사하세요.');
      };
      try {
        if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
          window.navigator.clipboard.writeText(json).then(done, fail);
        } else { fail(); }
      } catch (e) { fail(); }
    }
    function setCopyStatus(msg) { if (els.copyStatus) els.copyStatus.textContent = msg; }

    /* ── preview render ────────────────────────────────────────── */
    function chip(label, tone) {
      return '<span class="bf-chip bf-chip--' + esc(tone || 'neutral') + '">' + esc(label) + '</span>';
    }
    function cellHtml(col, row, config) {
      var field = (config.fields || []).filter(function (f) { return f.key === col.field; })[0];
      if (col.type === 'checkbox') return '<input type="checkbox" disabled>';
      if (col.type === 'actionButtons') return '<button type="button" class="bb-rowbtn" disabled>상세</button>';
      if (col.type === 'idName') {
        return '<span class="bb-id">' + esc(row[col.idField]) + '</span> <span class="bb-name">' + esc(row[col.nameField]) + '</span>';
      }
      var val = row[col.field];
      if (col.type === 'statusChip' || col.type === 'priorityChip' || col.type === 'chip' || col.type === 'typeChip') {
        if (typeof val === 'boolean') return chip(val ? '예' : '아니오', val ? 'pass' : 'neutral');
        return chip(val, toneFor(field, val));
      }
      if (col.type === 'relationChip') {
        return [].concat(val || []).map(function (v) { return '<span class="bf-chip bf-chip--brand">' + esc(v) + '</span>'; }).join(' ');
      }
      if (col.type === 'user') return '<span class="bb-user">' + esc(val) + '</span>';
      if (col.type === 'link') return '<a class="bb-link" href="' + esc(val) + '" target="_blank" rel="noopener">' + esc(val) + '</a>';
      if (typeof val === 'boolean') return chip(val ? '예' : '아니오', val ? 'pass' : 'neutral');
      return esc(val);
    }

    function renderPreview(config) {
      if (!els.preview) return;
      var rows = sampleRows(config, 3);
      var visCols = config.columns.filter(function (c) { return c.type !== 'checkbox' && c.type !== 'actionButtons'; });

      var summary = '<div class="bb-summary">' +
        sumCell('게시판명', config.title || '—') +
        sumCell('코드', config.slug || '—') +
        sumCell('필드 수', config.fields.length) +
        sumCell('컬럼 수', visCols.length) +
        sumCell('필터 수', config.filters.length) +
        '</div>';

      var colsList = '<div class="bb-pgroup"><div class="bb-pgroup-h">generated columns (' + visCols.length + ')</div>' +
        '<div class="bb-taglist">' + visCols.map(function (c) {
          return '<span class="bb-tag">' + esc(c.label || c.field) + ' <em>' + esc(c.type) + '</em></span>';
        }).join('') + '</div></div>';

      var filtersList = '<div class="bb-pgroup"><div class="bb-pgroup-h">generated filters (' + config.filters.length + ')</div>' +
        '<div class="bb-taglist">' + (config.filters.length ? config.filters.map(function (f) {
          return '<span class="bb-tag">' + esc(f.label) + (f.options.length ? ' <em>' + f.options.length + ' opt</em>' : '') + '</span>';
        }).join('') : '<span class="bb-empty">필터 대상 필드 없음</span>') + '</div></div>';

      var drawerList = '<div class="bb-pgroup"><div class="bb-pgroup-h">generated drawer fields · create (' + config.drawer.create.length + ')</div>' +
        '<div class="bb-taglist">' + config.drawer.create.map(function (f) {
          return '<span class="bb-tag">' + esc(f.label) + ' <em>' + esc(f.type) + '</em>' + (f.required ? ' <b class="bb-req">*</b>' : '') + '</span>';
        }).join('') + '</div></div>';

      var thead = '<tr>' + config.columns.map(function (c) {
        if (c.type === 'checkbox') return '<th class="bb-th-chk"><input type="checkbox" disabled></th>';
        if (c.type === 'actionButtons') return '<th></th>';
        return '<th>' + esc(c.label || c.field) + '</th>';
      }).join('') + '</tr>';
      var tbody = rows.map(function (r) {
        return '<tr>' + config.columns.map(function (c) {
          return '<td' + (c.type === 'checkbox' ? ' class="bb-td-chk"' : '') + '>' + cellHtml(c, r, config) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      var table = '<div class="bb-pgroup"><div class="bb-pgroup-h">table preview · sample rows (3)</div>' +
        '<div class="bb-ptable-wrap"><table class="bb-ptable"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div></div>';

      var notice = '<div class="bb-notice">이 config 는 아직 DB 에 저장되지 않았습니다. (localStorage preview · key <code>' + esc(LS_CONFIG) + '</code>)</div>';

      var json = '<div class="bb-pgroup"><div class="bb-pgroup-h">generated config (JSON)</div>' +
        '<textarea class="bb-json" data-bb-json readonly rows="14">' + esc(JSON.stringify(config, null, 2)) + '</textarea></div>';

      els.preview.innerHTML = summary + notice + colsList + filtersList + drawerList + table + json;
    }
    function sumCell(label, value) {
      return '<div class="bb-sum-cell"><div class="bb-sum-k">' + esc(label) + '</div><div class="bb-sum-v">' + esc(value) + '</div></div>';
    }

    /* ── events ────────────────────────────────────────────────── */
    root.addEventListener('click', function (e) {
      var act = e.target.closest('[data-bb-action]');
      if (act) {
        var a = act.getAttribute('data-bb-action');
        if (a === 'generate') generate();
        else if (a === 'reset') reset();
        else if (a === 'copy') copyJson();
        else if (a === 'auto-slug') { if (els.slug && els.title) { els.slug.value = slugify(els.title.value); saveForm(); } }
        return;
      }
      var del = e.target.closest('[data-bb-cf-del]');
      if (del) { customFields.splice(parseInt(del.getAttribute('data-bb-cf-del'), 10), 1); renderCustomList(); saveForm(); return; }
      var addBtn = e.target.closest('[data-bb-cf-add]');
      if (addBtn) { addCustomField(); return; }
    });
    root.addEventListener('input', function (e) {
      if (e.target.closest('[data-bb], [data-bb-default]')) saveForm();
    });
    root.addEventListener('change', function (e) {
      if (e.target.closest('[data-bb], [data-bb-default]')) saveForm();
    });

    /* ── boot: 복원 ────────────────────────────────────────────── */
    restoreForm();
    var saved = lsGet(LS_CONFIG);
    if (saved) renderPreview(saved);
    else if (els.preview) els.preview.innerHTML = '<div class="bb-empty">아직 생성된 config 가 없습니다. 입력 후 <b>Preview 생성</b>을 누르세요.</div>';

    return {
      generate: generate, reset: reset, collectForm: collectForm,
      addCustomField: addCustomField
    };
  }

  window.STAM.boardBuilderPreview = {
    version: 'v1',
    init: init,
    buildConfig: buildConfig,
    sampleRows: sampleRows,
    slugify: slugify,
    slugToCamel: slugToCamel,
    keys: { config: LS_CONFIG, form: LS_FORM },
    defaultFieldPresets: DEFAULT_FIELD_PRESETS,
    builderFieldTypes: BUILDER_FIELD_TYPES
  };
}());
