/*
 * STAM Board Builder Admin Preview v1 — 입력 기반 게시판 config preview (preview)
 *
 * 사용자가 카테고리 / 게시판명 / 게시판 코드 / 설명 + 단일 '필드 구성' 목록을
 * 입력하면, Field Schema v1(STAM.boardFieldSchema)을 이용해 Board Factory 형식의
 * config(columns / filters / drawer)를 '생성하고' 화면에서 즉시 preview 한다.
 *
 *  - 필드 구성: 기본/커스텀 구분 없는 단일 ordered list (card UI). 추천 초기 필드도
 *    수정 / 삭제 / 순서 변경(Drag&Drop + 위·아래 보조) / 중간 삽입 가능.
 *  - 표시 토글(목록/필터/드로워) + 필수(required)는 per-field. required 는
 *    checkbox 가 source of truth → generated config / drawer marker / JSON 일치.
 *    시스템/필수 고정 필드는 checkbox disabled + 사유 표시.
 *  - 생성 후에는 필드 편집/이동/추가/삭제가 우측 Preview 에 즉시 반영(live).
 *  - DB 없음: localStorage / in-memory 만 사용.
 *    · stam.boardBuilder.previewConfig / stam.boardBuilder.formState
 *  - Firestore / API / fetch 호출 없음. 실제 engine mount/저장 아님(후속 PR).
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

  /* 추천 초기 필드 (단일 정렬 목록 seed). 모두 수정/삭제/이동/삽입 가능.
   * role: id/name → idName 컬럼. system: 시스템 필드(키/타입/필수/삭제 잠금).
   * visibleInTable/Filter/Drawer: 표시 토글. required: 필수(checkbox source of truth). */
  var RECOMMENDED_FIELDS = [
    { key: 'id', label: 'ID', type: 'text', role: 'id', system: true, lockRequired: true, required: false,
      visibleInTable: true, visibleInFilter: false, visibleInDrawer: true, options: [], tone: null },
    { key: 'title', label: '제목', type: 'text', role: 'name', required: true,
      visibleInTable: true, visibleInFilter: false, visibleInDrawer: true, options: [], tone: null },
    { key: 'status', label: '상태', type: 'status', required: false,
      visibleInTable: true, visibleInFilter: true, visibleInDrawer: true,
      options: ['작성중', '검토요청', '검토완료', '승인완료', '보류'],
      tone: { '작성중': 'neutral', '검토요청': 'warn', '검토완료': 'info', '승인완료': 'pass', '보류': 'fail' } },
    { key: 'ownerId', label: '담당자', type: 'user', required: false,
      visibleInTable: true, visibleInFilter: true, visibleInDrawer: true, options: [], tone: null },
    { key: 'priority', label: '우선순위', type: 'priority', required: false,
      visibleInTable: true, visibleInFilter: true, visibleInDrawer: true,
      options: ['높음', '보통', '낮음'], tone: { '높음': 'high', '보통': 'mid', '낮음': 'low' } },
    { key: 'updatedAt', label: '최종수정일', type: 'date', role: 'updated', required: false,
      visibleInTable: true, visibleInFilter: false, visibleInDrawer: true, options: [], tone: null }
  ];

  /* 필드 type 선택지 (task 명세 11종). */
  var BUILDER_FIELD_TYPES = ['text', 'textarea', 'select', 'date', 'user', 'status', 'priority', 'relation', 'boolean', 'number', 'url'];
  var OPTION_TYPES = ['select', 'status', 'priority', 'multiSelect'];

  var SAMPLE_USERS = ['김민준', '이수빈', '박지호'];
  var TEMPLATE_LABEL = '목록 + 필터 + 등록 Drawer + 상세 Drawer + 수정 Drawer';

  /* 필드 카드 액션 아이콘 (inline SVG, 외부 asset 0) */
  var SVG_TRASH = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

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
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function slugify(s) {
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
    try { window.localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function lsRemove(key) { try { window.localStorage.removeItem(key); } catch (e) {} }

  /* 저장/입력 필드를 안전한 shape 로 정규화 (모든 표시/필수 플래그 보존) */
  function normField(f, i) {
    f = f || {};
    var type = BUILDER_FIELD_TYPES.indexOf(f.type) !== -1 ? f.type : 'text';
    return {
      key: f.key || ('field' + (i + 1)),
      label: f.label !== undefined ? f.label : '',
      type: type,
      role: f.role || null,
      system: !!f.system,
      lockRequired: !!(f.lockRequired || f.system),
      required: !!f.required,
      visibleInTable: f.visibleInTable !== false,
      visibleInFilter: !!f.visibleInFilter,
      visibleInDrawer: f.visibleInDrawer !== false,
      options: Array.isArray(f.options) ? f.options.slice() : csvToArray(f.options),
      tone: f.tone || null
    };
  }

  /* ── config 생성 (pure: DOM 비의존, 테스트 가능) ───────────────────
   * required / visibleInTable / visibleInFilter / visibleInDrawer 는 필드값을
   * type 기본값보다 우선 적용한다(사용자 토글 = source of truth). */
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
      if (typeof f.visibleInTable === 'boolean') spec.visibleInTable = f.visibleInTable;
      if (typeof f.visibleInFilter === 'boolean') spec.visibleInFilter = f.visibleInFilter;
      if (typeof f.visibleInDrawer === 'boolean') spec.visibleInDrawer = f.visibleInDrawer;
      var nf = FS ? FS.defineField(spec) : spec;
      if (f.role) nf.role = f.role;
      return nf;
    });

    function colType(type) { var m = FS ? FS.engineMapping(type) : null; return (m && m.column) || 'text'; }
    function controlType(field) {
      if (field.role === 'id') return 'readonly';
      var m = FS ? FS.engineMapping(field.type) : null;
      var c = m && m.control;
      if (c === 'textarea') return 'textarea';
      if (c === 'select') return 'select';
      return 'text';
    }
    function optionObjs(field) { return (field.options || []).map(function (o) { return { label: o, value: o }; }); }
    function drawerField(field) {
      var ctrl = controlType(field);
      return {
        key: field.key, label: field.label, type: ctrl,
        // required marker: checkbox 값 그대로 (readonly 자동 필드는 입력 필수 아님)
        required: !!field.required && ctrl !== 'readonly',
        full: field.type === 'textarea',
        options: optionObjs(field)
      };
    }

    var columns = [{ type: 'checkbox' }];
    if (idKey || nameKey) {
      var idF = fields.filter(function (f) { return f.key === idKey; })[0];
      var nameF = nameKey ? fields.filter(function (f) { return f.key === nameKey; })[0] : null;
      columns.push({ type: 'idName', label: (idF ? idF.label : 'ID') + ' / ' + (nameF ? nameF.label : '명'), idField: idKey, nameField: nameKey || idKey });
    }
    fields.forEach(function (f) {
      if (f.key === idKey || (nameKey && f.key === nameKey)) return;
      if (!f.visibleInTable) return;
      columns.push({ type: colType(f.type), label: f.label, field: f.key, width: f.width || null });
    });
    columns.push({ type: 'actionButtons', label: '', buttons: [{ action: 'detail', label: '상세' }] });

    var filters = fields.filter(function (f) { return f.visibleInFilter; }).map(function (f) {
      return { key: f.key, label: f.label, options: optionObjs(f) };
    });

    var createFields = fields.filter(function (f) { return f.visibleInDrawer && f.editable !== false; }).map(drawerField);
    var detailFields = fields.filter(function (f) { return f.visibleInDrawer; }).map(drawerField);

    var slug = form.slug || slugify(form.title) || 'board';
    return {
      id: (slugToCamel(slug) || 'board') + 'V2',
      slug: slug,
      category: form.category || '',
      title: form.title || '',
      description: form.description || '',
      idKey: idKey, nameKey: nameKey || idKey,
      template: TEMPLATE_LABEL,
      fields: fields,
      columns: columns,
      filters: filters,
      drawer: { create: createFields, detail: detailFields, edit: createFields.slice() },
      actions: ['create', 'delete', 'filter'],
      generatedAt: new Date().toISOString()
    };
  }

  /* ── sample rows ─────────────────────────────────────────────── */
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
  function sampleDate(i) { var d = 9 + i; return '2026-06-' + (d < 10 ? '0' + d : d); }
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
  function toneFor(field, value) { return (field && field.tone && field.tone[value]) ? field.tone[value] : 'neutral'; }

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
      fields: q(root, '[data-bb-fields]'),
      fieldCount: q(root, '[data-bb-fieldcount]'),
      preview: q(root, '[data-bb-preview]')
    };
    if (!els.fields) return null;

    var fields = clone(RECOMMENDED_FIELDS);
    var activeTab = 'screen';
    var dragIndex = -1;
    var advOpen = []; // 고급 설정이 열린 필드 key 목록 (구조 re-render 간 유지)

    /* ── 필드 카드 렌더 ───────────────────────────────────────────
     * 기본 노출: 순서/드래그 · 필드명 · 입력 방식(type) · 필수 · 표시 위치(목록/필터/입력폼) · 옵션.
     * 고급 설정(접힘): key · raw type · engine 매핑. key/raw type 은 첫 화면에 노출하지 않는다. */
    function typeOptions(sel) {
      return BUILDER_FIELD_TYPES.map(function (t) {
        var meta = (window.STAM.boardFieldSchema && window.STAM.boardFieldSchema.types[t]) || {};
        return '<option value="' + esc(t) + '"' + (t === sel ? ' selected' : '') + '>' + esc(meta.label || t) + '</option>';
      }).join('');
    }
    function reqControl(f) {
      var disabled = f.system || f.lockRequired;
      var reason = f.system ? '시스템 필드 — 변경 불가' : '필수 고정 — 변경 불가';
      return '<label class="bb-chk bb-chk--req' + (f.required ? ' is-on' : '') + (disabled ? ' is-locked' : '') + '"' +
        (disabled ? ' title="' + esc(reason) + '"' : '') + '>' +
        '<input type="checkbox" data-bb-fp="required"' + (f.required ? ' checked' : '') + (disabled ? ' disabled' : '') + '> 필수</label>';
    }
    function useChk(f, prop, label) {
      return '<label class="bb-chk"><input type="checkbox" data-bb-fp="' + prop + '"' + (f[prop] ? ' checked' : '') + '> ' + esc(label) + '</label>';
    }
    function advBody(f, lockInputs) {
      var map = (window.STAM.boardFieldSchema && window.STAM.boardFieldSchema.engineMapping(f.type)) || {};
      var mapTxt = 'column: ' + (map.column || '—') + ' · control: ' + (map.control || '—') + ' · filter: ' + String(map.filter);
      return '<div class="bb-adv-row"><span class="bb-adv-k">필드 key</span>' +
          '<input class="bb-input bb-adv-key" data-bb-fp="key" value="' + esc(f.key) + '" placeholder="key" aria-label="필드 key"' + (lockInputs ? ' disabled' : '') + '></div>' +
        '<div class="bb-adv-row"><span class="bb-adv-k">raw type</span><code class="bb-adv-v">' + esc(f.type) + '</code></div>' +
        '<div class="bb-adv-row"><span class="bb-adv-k">engine 매핑</span><code class="bb-adv-v">' + esc(mapTxt) + '</code></div>';
    }
    function renderFields() {
      if (els.fieldCount) els.fieldCount.textContent = fields.length + '개 필드';
      if (!fields.length) { els.fields.innerHTML = '<div class="bb-empty">필드가 없습니다. <b>＋ 필드 추가</b>로 추가하세요.</div>'; return; }
      els.fields.innerHTML = fields.map(function (f, i) {
        var lockInputs = f.system; // 시스템 필드는 key/type/삭제 잠금
        var optType = OPTION_TYPES.indexOf(f.type) !== -1;
        var advIsOpen = advOpen.indexOf(f.key) !== -1;
        return '<div class="bb-fcard' + (f.system ? ' is-system' : '') + '" data-bb-fi="' + i + '">' +
          '<div class="bb-fc-main">' +
            '<div class="bb-fc-rail">' +
              '<span class="bb-drag" draggable="true" data-bb-drag title="드래그하여 순서 변경" aria-label="순서 변경 핸들">⋮⋮</span>' +
              '<span class="bb-fc-no">' + (i + 1) + '</span>' +
            '</div>' +
            '<div class="bb-fc-body">' +
              '<div class="bb-fc-row1">' +
                '<input class="bb-input bb-fc-name" data-bb-fp="label" value="' + esc(f.label) + '" placeholder="필드명" aria-label="필드명">' +
                '<select class="bb-select bb-fc-type" data-bb-fp="type" aria-label="입력 방식"' + (lockInputs ? ' disabled' : '') + '>' + typeOptions(f.type) + '</select>' +
                (f.system ? '<span class="bb-fc-lock" title="시스템 필드 — 잠금">🔒 시스템</span>' : (f.role === 'name' ? '<span class="bb-fchip">이름</span>' : '')) +
              '</div>' +
              '<div class="bb-fc-row2">' +
                reqControl(f) +
                '<span class="bb-fc-sep"></span>' +
                '<span class="bb-fc-uselbl">표시</span>' +
                useChk(f, 'visibleInTable', '목록') +
                useChk(f, 'visibleInFilter', '필터') +
                useChk(f, 'visibleInDrawer', '입력폼') +
              '</div>' +
              (optType ? '<div class="bb-fc-row3"><input class="bb-input bb-fc-opts" data-bb-fp="options" value="' + esc((f.options || []).join(', ')) + '" placeholder="옵션(쉼표로 구분) 예) 높음, 보통, 낮음" aria-label="선택 옵션"></div>' : '') +
            '</div>' +
            '<div class="bb-fc-actions">' +
              '<button type="button" class="bb-iconbtn" data-bb-fmove="up" title="위로 이동" aria-label="위로 이동"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
              '<button type="button" class="bb-iconbtn" data-bb-fmove="down" title="아래로 이동" aria-label="아래로 이동"' + (i === fields.length - 1 ? ' disabled' : '') + '>↓</button>' +
              '<button type="button" class="bb-iconbtn" data-bb-finsert title="아래에 필드 추가" aria-label="아래에 필드 추가">＋</button>' +
              '<button type="button" class="bb-iconbtn bb-iconbtn--del" data-bb-fdel title="필드 삭제" aria-label="필드 삭제"' + (lockInputs ? ' disabled' : '') + '>' + SVG_TRASH + '</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="bb-fc-adv-tog' + (advIsOpen ? ' is-open' : '') + '" data-bb-advtog aria-expanded="' + (advIsOpen ? 'true' : 'false') + '">' +
            '<span class="bb-fc-adv-arr">▾</span> 고급 설정 보기 <span class="bb-fc-adv-meta">key · raw type · 매핑</span>' +
          '</button>' +
          '<div class="bb-fc-adv"' + (advIsOpen ? '' : ' hidden') + '>' + advBody(f, lockInputs) + '</div>' +
        '</div>';
      }).join('');
    }

    function blankField() {
      return { key: 'field' + (fields.length + 1), label: '새 필드', type: 'text', role: null, system: false, lockRequired: false,
        required: false, visibleInTable: true, visibleInFilter: false, visibleInDrawer: true, options: [], tone: null };
    }
    function updateFieldFromInput(inp) {
      var row = inp.closest('[data-bb-fi]'); if (!row) return;
      var i = parseInt(row.getAttribute('data-bb-fi'), 10);
      var prop = inp.getAttribute('data-bb-fp');
      if (!fields[i] || !prop) return;
      if (prop === 'visibleInTable' || prop === 'visibleInFilter' || prop === 'visibleInDrawer' || prop === 'required') fields[i][prop] = inp.checked;
      else if (prop === 'options') fields[i].options = csvToArray(inp.value);
      else fields[i][prop] = inp.value;
    }
    function moveField(i, dir) { var j = dir === 'up' ? i - 1 : i + 1; moveFieldTo(i, j); }
    function moveFieldTo(from, to) {
      if (from < 0 || from >= fields.length) return;
      to = Math.max(0, Math.min(fields.length - 1, to));
      if (from === to) { renderFields(); return; }
      var item = fields.splice(from, 1)[0];
      fields.splice(to, 0, item);
      renderFields(); saveForm(); refreshPreview();
    }
    function insertField(i) { fields.splice(i + 1, 0, blankField()); renderFields(); saveForm(); refreshPreview(); }
    function deleteField(i) { if (fields[i] && fields[i].system) return; fields.splice(i, 1); renderFields(); saveForm(); refreshPreview(); }
    function addField() { fields.push(blankField()); renderFields(); saveForm(); refreshPreview(); }

    /* ── drag & drop (vanilla HTML5, 외부 라이브러리 0) ─────────── */
    function clearDropMarks() { qa(els.fields, '.bb-fcard').forEach(function (c) { c.classList.remove('drop-before', 'drop-after'); }); }
    els.fields.addEventListener('dragstart', function (e) {
      var handle = e.target.closest('[data-bb-drag]'); if (!handle) return;
      var row = handle.closest('[data-bb-fi]'); if (!row) return;
      dragIndex = parseInt(row.getAttribute('data-bb-fi'), 10);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(dragIndex)); } catch (_) {}
      try { e.dataTransfer.setDragImage(row, 14, 14); } catch (_) {}
      row.classList.add('is-dragging');
    });
    els.fields.addEventListener('dragover', function (e) {
      if (dragIndex < 0) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var row = e.target.closest('.bb-fcard');
      clearDropMarks();
      if (row) {
        var rect = row.getBoundingClientRect();
        row.classList.add(e.clientY > rect.top + rect.height / 2 ? 'drop-after' : 'drop-before');
      }
    });
    els.fields.addEventListener('drop', function (e) {
      if (dragIndex < 0) return;
      e.preventDefault();
      var row = e.target.closest('.bb-fcard');
      var to;
      if (!row) { to = fields.length - 1; }
      else {
        var idx = parseInt(row.getAttribute('data-bb-fi'), 10);
        var rect = row.getBoundingClientRect();
        var after = e.clientY > rect.top + rect.height / 2;
        to = after ? idx + 1 : idx;
        if (dragIndex < to) to -= 1;
      }
      var from = dragIndex; dragIndex = -1; clearDropMarks();
      moveFieldTo(from, to);
    });
    els.fields.addEventListener('dragend', function () {
      dragIndex = -1; clearDropMarks();
      qa(els.fields, '.bb-fcard.is-dragging').forEach(function (c) { c.classList.remove('is-dragging'); });
    });

    /* ── form state ────────────────────────────────────────────── */
    function collectForm() {
      return {
        category: els.category ? els.category.value : '',
        title: els.title ? els.title.value.trim() : '',
        slug: els.slug ? els.slug.value.trim() : '',
        description: els.description ? els.description.value.trim() : '',
        fields: fields.map(function (f, i) { return normField(f, i); })
      };
    }
    function saveForm() { lsSet(LS_FORM, collectForm()); }
    function restoreForm() {
      var s = lsGet(LS_FORM);
      if (s) {
        if (els.category && s.category) els.category.value = s.category;
        if (els.title) els.title.value = s.title || '';
        if (els.slug) els.slug.value = s.slug || '';
        if (els.description) els.description.value = s.description || '';
        if (s.fields && s.fields.length) fields = s.fields.map(function (f, i) { return normField(f, i); });
      }
      renderFields();
    }

    /* 우측 미리보기는 항상 살아있다(빈 박스 없음): 현재 입력으로 즉시 config 를 만들어 표시한다.
     * '게시판 초안 보기'는 화면 미리보기 탭으로 포커스 + 현재 구성 저장 역할. */
    function generate() { activeTab = 'screen'; refreshPreview(); saveForm(); }
    function refreshPreview() {
      if (!els.preview) return;
      var config = buildConfig(collectForm());
      lsSet(LS_CONFIG, config);
      renderPreview(config);
    }
    function renderLive() { if (els.preview) renderPreview(buildConfig(collectForm())); } // LS 기록 없이 렌더(부팅/초기화)
    function reset() {
      lsRemove(LS_CONFIG); lsRemove(LS_FORM);
      if (els.category) els.category.selectedIndex = 0;
      if (els.title) els.title.value = '';
      if (els.slug) els.slug.value = '';
      if (els.description) els.description.value = '';
      fields = clone(RECOMMENDED_FIELDS);
      advOpen = [];
      activeTab = 'screen';
      renderFields();
      renderLive();
    }

    function copyJson() {
      var config = lsGet(LS_CONFIG) || buildConfig(collectForm()); // 항상 현재 구성 기준으로 복사 가능
      var json = JSON.stringify(config, null, 2);
      var done = function () { setCopyStatus('JSON 복사 완료 ✓'); };
      var fail = function () {
        var ta = root.querySelector('[data-bb-json]');
        if (ta && ta.select) { ta.removeAttribute('readonly'); ta.select(); ta.setAttribute('readonly', 'readonly'); }
        setCopyStatus('자동 복사 실패 — JSON 영역 선택 후 Ctrl/Cmd+C');
      };
      try {
        if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) window.navigator.clipboard.writeText(json).then(done, fail);
        else fail();
      } catch (e) { fail(); }
    }
    function setCopyStatus(msg) { qa(root, '[data-bb-copy-status]').forEach(function (c) { c.textContent = msg; }); }

    /* ── preview render (summary + tabs) ──────────────────────── */
    function chip(label, tone) { return '<span class="bf-chip bf-chip--' + esc(tone || 'neutral') + '">' + esc(label) + '</span>'; }
    function cellHtml(col, row, config) {
      var field = (config.fields || []).filter(function (f) { return f.key === col.field; })[0];
      if (col.type === 'checkbox') return '<input type="checkbox" disabled>';
      if (col.type === 'actionButtons') return '<button type="button" class="bb-rowbtn" disabled>상세</button>';
      if (col.type === 'idName') return '<span class="bb-id">' + esc(row[col.idField]) + '</span> <span class="bb-name">' + esc(row[col.nameField]) + '</span>';
      var val = row[col.field];
      if (col.type === 'statusChip' || col.type === 'priorityChip' || col.type === 'chip' || col.type === 'typeChip') {
        if (typeof val === 'boolean') return chip(val ? '예' : '아니오', val ? 'pass' : 'neutral');
        return chip(val, toneFor(field, val));
      }
      if (col.type === 'relationChip') return [].concat(val || []).map(function (v) { return '<span class="bf-chip bf-chip--brand">' + esc(v) + '</span>'; }).join(' ');
      if (col.type === 'user') return '<span class="bb-user">' + esc(val) + '</span>';
      if (col.type === 'link') return '<a class="bb-link" href="' + esc(val) + '" target="_blank" rel="noopener">' + esc(val) + '</a>';
      if (typeof val === 'boolean') return chip(val ? '예' : '아니오', val ? 'pass' : 'neutral');
      return esc(val);
    }
    function tag(label, em, req) {
      return '<span class="bb-tag">' + esc(label) + (em ? ' <em>' + esc(em) + '</em>' : '') + (req ? ' <b class="bb-req">*</b>' : '') + '</span>';
    }
    function renderPreview(config) {
      if (!els.preview) return;
      var rows = sampleRows(config, 3);
      var visCols = config.columns.filter(function (c) { return c.type !== 'checkbox' && c.type !== 'actionButtons'; });
      var listCount = config.fields.filter(function (f) { return f.visibleInTable; }).length;
      var reqCount = config.fields.filter(function (f) { return f.required; }).length;

      // 현재 구성 요약 — 생성 전에도 무엇이 만들어질지 한눈에 보인다.
      var head = '<div class="bb-rp-head">' +
        '<div class="bb-rp-head-ttl">현재 구성 요약 · ' + esc(config.title || '게시판명 미입력') + (config.slug ? ' · ' + esc(config.slug) : '') + '</div>' +
        '<div class="bb-stats">' +
          statCell('총 필드', config.fields.length, 'var(--stam)') +
          statCell('목록 표시', listCount, 'var(--info)') +
          statCell('필수 항목', reqCount, 'var(--fail)') +
          statCell('필터 필드', config.filters.length, 'var(--pass)') +
        '</div></div>';

      var tabbar = '<div class="bb-tabs" role="tablist">' +
        tabBtn('screen', '화면 미리보기') + tabBtn('fields', '필드 구성') + tabBtn('filters', '필터/입력화면') +
        tabBtn('json', 'JSON', '개발자 참고용') + '</div>';

      // 화면 미리보기 — 현재 구성 기준 예상 게시판 화면(board mock)
      var thead = '<tr>' + config.columns.map(function (c) {
        if (c.type === 'checkbox') return '<th class="bb-th-chk"><input type="checkbox" disabled></th>';
        if (c.type === 'actionButtons') return '<th></th>';
        return '<th>' + esc(c.label || c.field) + '</th>';
      }).join('') + '</tr>';
      var tbody = rows.length ? rows.map(function (r) {
        return '<tr>' + config.columns.map(function (c) { return '<td' + (c.type === 'checkbox' ? ' class="bb-td-chk"' : '') + '>' + cellHtml(c, r, config) + '</td>'; }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + config.columns.length + '" style="text-align:center;color:var(--t3);padding:18px;">필드를 추가하면 예상 목록이 표시됩니다.</td></tr>';
      var filterChips = config.filters.length
        ? config.filters.map(function (f) { return '<span class="bb-mk-chip">' + esc(f.label) + '</span>'; }).join('')
        : '<span class="bb-empty">필터 지정 필드 없음</span>';
      var boardMock = '<div class="bb-brd">' +
        '<div class="bb-brd-top"><span class="bb-brd-top-ttl">' + esc(config.title || '새 게시판') + '</span><span class="bb-brd-top-badge">미리보기</span></div>' +
        '<div class="bb-brd-hdr"><div class="bb-brd-hdr-ttl">' + esc(config.title || '새 게시판') + '</div>' +
          '<div class="bb-brd-hdr-acts"><span class="bb-mk-sec">전체</span><span class="bb-mk-pri">＋ 글 작성</span></div></div>' +
        '<div class="bb-brd-fbar"><span class="bb-mk-search">🔍 검색</span>' + filterChips + '</div>' +
        '<div class="bb-brd-tblwrap"><table class="bb-ptable"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div></div>';
      var screenPanel = panel('screen', boardMock +
        '<div class="bb-notice">아직 DB 에 저장되지 않은 <b>localStorage 미리보기</b>입니다. 위 화면은 현재 구성 기준 예상 결과입니다. (key <code>' + esc(LS_CONFIG) + '</code>)</div>');

      // 필드 구성
      var fieldsPanel = panel('fields',
        group('목록 컬럼 (' + visCols.length + ')', visCols.map(function (c) { return tag(c.label || c.field, c.type); }).join('') || emptyTag('표시할 컬럼 없음')) +
        group('전체 필드 (' + config.fields.length + ')', config.fields.map(function (f) {
          var vis = []; if (f.visibleInTable) vis.push('목록'); if (f.visibleInFilter) vis.push('필터'); if (f.visibleInDrawer) vis.push('입력폼');
          return tag(f.label || f.key, typeLabel(f.type) + (vis.length ? ' · ' + vis.join('/') : ''), f.required);
        }).join('')));

      // 필터 / 입력화면(drawer)
      var filtersPanel = panel('filters',
        group('필터 (' + config.filters.length + ')', config.filters.map(function (f) { return tag(f.label, f.options.length ? f.options.length + ' opt' : ''); }).join('') || emptyTag('필터 대상 필드 없음')) +
        group('입력폼 필드 · 등록 (' + config.drawer.create.length + ')', config.drawer.create.map(function (f) { return tag(f.label, f.type, f.required); }).join('') || emptyTag('입력폼 필드 없음')));

      // JSON (개발자 참고용)
      var jsonPanel = panel('json',
        '<div class="bb-json-bar"><button type="button" class="bb-btn bb-btn--ghost bb-btn--sm" data-bb-action="copy">JSON 복사</button><span class="bb-copy-status" data-bb-copy-status aria-live="polite"></span></div>' +
        '<textarea class="bb-json" data-bb-json readonly rows="22">' + esc(JSON.stringify(config, null, 2)) + '</textarea>');

      els.preview.innerHTML = head + tabbar + '<div class="bb-tabpanels">' + screenPanel + fieldsPanel + filtersPanel + jsonPanel + '</div>';
      applyActiveTab();
    }
    function typeLabel(t) { var meta = (window.STAM.boardFieldSchema && window.STAM.boardFieldSchema.types[t]) || {}; return meta.label || t; }
    function tabBtn(id, label, note) { return '<button type="button" class="bb-tab" role="tab" data-bb-tab="' + id + '">' + esc(label) + (note ? '<span class="bb-tab-note">' + esc(note) + '</span>' : '') + '</button>'; }
    function panel(id, inner) { return '<div class="bb-tabpanel" role="tabpanel" data-bb-panel="' + id + '">' + inner + '</div>'; }
    function group(h, inner) { return '<div class="bb-pgroup"><div class="bb-pgroup-h">' + esc(h) + '</div><div class="bb-taglist">' + inner + '</div></div>'; }
    function emptyTag(msg) { return '<span class="bb-empty">' + esc(msg) + '</span>'; }
    function statCell(label, value, color) { return '<div class="bb-stat"><div class="bb-stat-n" style="color:' + color + '">' + esc(value) + '</div><div class="bb-stat-l">' + esc(label) + '</div></div>'; }
    function applyActiveTab() {
      if (!els.preview) return;
      var tabs = qa(els.preview, '[data-bb-tab]'); if (tabs.length && !tabs.some(function (t) { return t.getAttribute('data-bb-tab') === activeTab; })) activeTab = 'screen';
      qa(els.preview, '[data-bb-tab]').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-bb-tab') === activeTab); });
      qa(els.preview, '[data-bb-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-bb-panel') !== activeTab; });
    }

    /* ── events ────────────────────────────────────────────────── */
    function fieldIndex(elm) { var row = elm.closest('[data-bb-fi]'); return row ? parseInt(row.getAttribute('data-bb-fi'), 10) : -1; }
    root.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-bb-tab]');
      if (tab) { activeTab = tab.getAttribute('data-bb-tab'); applyActiveTab(); return; }
      var act = e.target.closest('[data-bb-action]');
      if (act) {
        var a = act.getAttribute('data-bb-action');
        if (a === 'generate') generate();
        else if (a === 'reset') reset();
        else if (a === 'copy') copyJson();
        else if (a === 'add-field') addField();
        else if (a === 'auto-slug') { if (els.slug && els.title) { els.slug.value = slugify(els.title.value); saveForm(); refreshPreview(); } }
        return;
      }
      // 고급 설정 접기/펼치기 — 전체 re-render 없이 해당 카드만 토글(열림 상태는 advOpen 으로 유지).
      var advtog = e.target.closest('[data-bb-advtog]');
      if (advtog) {
        var advCard = advtog.closest('[data-bb-fi]'); if (!advCard) return;
        var advIdx = parseInt(advCard.getAttribute('data-bb-fi'), 10);
        var advKey = fields[advIdx] ? fields[advIdx].key : null;
        var advEl = advCard.querySelector('.bb-fc-adv');
        var willOpen = advEl.hasAttribute('hidden');
        if (willOpen) { advEl.removeAttribute('hidden'); advtog.classList.add('is-open'); advtog.setAttribute('aria-expanded', 'true'); if (advKey && advOpen.indexOf(advKey) === -1) advOpen.push(advKey); }
        else { advEl.setAttribute('hidden', ''); advtog.classList.remove('is-open'); advtog.setAttribute('aria-expanded', 'false'); advOpen = advOpen.filter(function (k) { return k !== advKey; }); }
        return;
      }
      // 템플릿 카드 — 시작점 예시(presentational). 필드 reseed/저장 없음(기능 확장 방지).
      var tpl = e.target.closest('[data-bb-tpl]');
      if (tpl) { qa(root, '[data-bb-tpl]').forEach(function (c) { c.classList.toggle('is-sel', c === tpl); }); return; }
      var mv = e.target.closest('[data-bb-fmove]'); if (mv) { if (!mv.disabled) moveField(fieldIndex(mv), mv.getAttribute('data-bb-fmove')); return; }
      var ins = e.target.closest('[data-bb-finsert]'); if (ins) { insertField(fieldIndex(ins)); return; }
      var del = e.target.closest('[data-bb-fdel]'); if (del) { if (!del.disabled) deleteField(fieldIndex(del)); return; }
    });
    // 입력 중에도 우측 미리보기는 즉시 반영(좌측 카드 re-render 없음 → 입력 포커스 유지).
    root.addEventListener('input', function (e) {
      if (e.target.closest('[data-bb-fp]')) { updateFieldFromInput(e.target); saveForm(); refreshPreview(); return; }
      if (e.target.closest('[data-bb]')) { saveForm(); refreshPreview(); }
    });
    root.addEventListener('change', function (e) {
      var fp = e.target.closest('[data-bb-fp]');
      if (fp) {
        updateFieldFromInput(e.target); saveForm();
        if (fp.getAttribute('data-bb-fp') === 'type') renderFields(); // 옵션 행 / raw type 노출 갱신
        refreshPreview();
        return;
      }
      if (e.target.closest('[data-bb]')) { saveForm(); refreshPreview(); }
    });

    /* ── boot ──────────────────────────────────────────────────────
     * 우측은 항상 살아있는 미리보기(빈 박스 없음). formState 복원 후 현재 입력 기준으로 렌더.
     * (LS_CONFIG 는 변경/생성 시 기록되어 copyJson·복원 캐시로 유지) */
    restoreForm();
    renderLive();

    return { generate: generate, reset: reset, collectForm: collectForm, addField: addField, getFields: function () { return fields.slice(); } };
  }

  window.STAM.boardBuilderPreview = {
    version: 'v1',
    init: init,
    buildConfig: buildConfig,
    sampleRows: sampleRows,
    slugify: slugify,
    slugToCamel: slugToCamel,
    keys: { config: LS_CONFIG, form: LS_FORM },
    recommendedFields: RECOMMENDED_FIELDS,
    builderFieldTypes: BUILDER_FIELD_TYPES
  };
}());
