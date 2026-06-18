/*
 * STAM Board Configs — functional specification v2 (preview)
 *
 * PR #135 Board Factory v1.2 설계 기준으로 작성한 기능정의서 v2 config.
 * dataSource 는 static / in-memory preview 전용이다.
 *   - 새로고침하면 초기 데이터로 복원된다.
 *   - localStorage / API / Firestore 저장은 사용하지 않는다.
 * 연결 화면은 화면 이름 라벨이 아니라 screenId 로 저장하고,
 * 담당자는 이름 문자열이 아니라 userId 로 저장한다 (reference 기반).
 */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  window.STAM.boardConfigs = window.STAM.boardConfigs || {};

  /* ── 참조 마스터 (in-memory) ───────────────────────────────── */
  var USERS = {
    'user-001': { label: '김철수', role: 'PM' },
    'user-002': { label: '이영희', role: '기획' },
    'user-003': { label: '박지수', role: '개발' }
  };
  var SCREENS = {
    'SCR-001': { label: '요구사항정의서' },
    'SCR-002': { label: '메뉴구조/화면목록' },
    'SCR-003': { label: '기능정의서' },
    'SCR-004': { label: '화면설계서' },
    'SCR-005': { label: 'WBS' }
  };
  var REQUIREMENTS = {
    'REQ-001': { label: '요구사항 목록 조회 화면' },
    'REQ-002': { label: '메뉴 구조 관리' },
    'REQ-003': { label: '화면-기능 매핑' },
    'REQ-004': { label: '변경 이력 추적' },
    'REQ-005': { label: '산출물 내보내기' }
  };

  /* ── 초기 데이터 (in-memory seed) ──────────────────────────── */
  var SEED = [
    { id: 'FN-001', name: '요구사항 목록 조회', type: 'view', priority: 'high', status: 'done', ownerId: 'user-001', reqIds: ['REQ-001'], screenIds: ['SCR-001'], updatedAt: '2026-06-13',
      desc: '요구사항정의서 목록 화면에서 등록된 모든 요구사항을 조회하는 기능입니다. 검색 및 필터 조건에 따라 목록을 동적으로 갱신합니다.',
      input: '검색어(기능 ID, 기능명, 담당자), 필터 조건(상태, 유형, 우선순위, 담당자)',
      rule: '전체 요구사항 목록을 기본 정렬(최종 수정일 내림차순)로 표시하고, 검색어·필터 조건으로 동적 필터링한다.',
      exception: '검색 결과가 없을 경우 "조건에 맞는 항목이 없습니다" 메시지를 표시한다.',
      api: 'GET /api/requirements', note: '' },
    { id: 'FN-002', name: '메뉴 구조 등록', type: 'create', priority: 'high', status: 'draft', ownerId: 'user-002', reqIds: ['REQ-002'], screenIds: ['SCR-002'], updatedAt: '2026-06-12',
      desc: '메뉴 구조/화면 목록을 신규 등록하는 기능입니다.',
      input: '메뉴명, LV1/LV2, 화면유형, FO/BO 구분',
      rule: '신규 메뉴 등록 시 ID를 자동 부여하고 트리 위치를 검증한다.',
      exception: '동일 레벨 내 중복 메뉴명 입력 시 경고를 표시한다.',
      api: 'POST /api/menus', note: '' },
    { id: 'FN-003', name: '화면별 기능 매핑', type: 'integrate', priority: 'mid', status: 'review', ownerId: 'user-003', reqIds: ['REQ-003'], screenIds: ['SCR-002'], updatedAt: '2026-06-11',
      desc: '화면과 기능을 연동하여 매핑 관계를 관리하는 기능입니다.',
      input: '화면 ID, 기능 ID 목록',
      rule: '다대다 매핑을 허용하고 매핑 변경 시 이력을 기록한다.',
      exception: '존재하지 않는 화면/기능 ID 매핑 시도 시 오류를 반환한다.',
      api: 'PUT /api/screen-functions', note: '' },
    { id: 'FN-004', name: '기능 변경이력 기록', type: 'update', priority: 'mid', status: 'draft', ownerId: 'user-001', reqIds: ['REQ-004'], screenIds: ['SCR-003'], updatedAt: '2026-06-10',
      desc: '기능 변경 시 변경 이력을 자동 기록하는 기능입니다.',
      input: '변경 전/후 값, 변경자, 변경 일시',
      rule: '상태·우선순위·담당자 변경 시 이력 레코드를 생성한다.',
      exception: '이력 저장 실패 시 변경을 롤백한다.',
      api: 'POST /api/functions/{id}/history', note: '' },
    { id: 'FN-005', name: '기능정의서 내보내기', type: 'export', priority: 'low', status: 'hold', ownerId: 'user-002', reqIds: ['REQ-005'], screenIds: ['SCR-003'], updatedAt: '2026-06-09',
      desc: '기능정의서를 외부 포맷(Excel/PDF)으로 내보내는 기능입니다.',
      input: '내보내기 범위, 포맷 옵션',
      rule: '선택된 컬럼만 포함하여 파일을 생성한다.',
      exception: '대용량 내보내기 시 비동기 처리로 전환한다.',
      api: 'GET /api/functions/export', note: '포맷 확정 전까지 보류' },
    { id: 'FN-006', name: '승인 요청 알림', type: 'notify', priority: 'mid', status: 'approved', ownerId: 'user-003', reqIds: ['REQ-002'], screenIds: ['SCR-002'], updatedAt: '2026-06-08',
      desc: '검토 요청 시 담당자에게 알림을 발송하는 기능입니다.',
      input: '수신자, 알림 유형',
      rule: '상태가 검토요청으로 변경되면 담당자에게 알림을 보낸다.',
      exception: '알림 채널 미설정 시 기본 채널로 발송한다.',
      api: 'POST /api/notifications', note: '' },
    { id: 'FN-007', name: '요구사항 삭제', type: 'delete', priority: 'low', status: 'done', ownerId: 'user-001', reqIds: ['REQ-001'], screenIds: ['SCR-001'], updatedAt: '2026-06-07',
      desc: '요구사항을 삭제하는 기능입니다. 연결된 기능이 있으면 경고합니다.',
      input: '삭제 대상 ID 목록',
      rule: '연결 항목이 없을 경우에만 즉시 삭제하고, 있을 경우 확인을 요구한다.',
      exception: '연결 기능이 존재하면 삭제를 차단한다.',
      api: 'DELETE /api/requirements/{id}', note: '' }
  ];

  /* ── vocab (표시/저장 어휘) ────────────────────────────────── */
  var VOCAB = {
    status: {
      draft:    { label: '작성중',   tone: 'neutral' },
      review:   { label: '검토요청', tone: 'warn' },
      done:     { label: '검토완료', tone: 'info' },
      approved: { label: '승인완료', tone: 'pass' },
      hold:     { label: '보류',     tone: 'fail' }
    },
    type: {
      view:      { label: '조회',     tone: 'brand' },
      create:    { label: '등록',     tone: 'brand' },
      update:    { label: '수정',     tone: 'brand' },
      delete:    { label: '삭제',     tone: 'brand' },
      approve:   { label: '승인',     tone: 'brand' },
      notify:    { label: '알림',     tone: 'brand' },
      export:    { label: '내보내기', tone: 'brand' },
      integrate: { label: '연동',     tone: 'brand' }
    },
    priority: {
      high: { label: '높음', tone: 'high' },
      mid:  { label: '중간', tone: 'mid' },
      low:  { label: '낮음', tone: 'low' }
    }
  };

  function vocabOptions(vocabKey) {
    var v = VOCAB[vocabKey];
    return Object.keys(v).map(function (code) { return { label: v[code].label, value: code }; });
  }
  function refOptions(map) {
    return Object.keys(map).map(function (id) { return { label: map[id].label, value: id }; });
  }

  /* ── 필터 key → row field 매핑 ─────────────────────────────── */
  var FILTER_FIELD = {
    status: 'status',
    type: 'type',
    priority: 'priority',
    screen: 'screenIds',
    owner: 'ownerId'
  };

  /* ── static dataSource (in-memory) ────────────────────────── */
  var rows = SEED.map(function (r) { return JSON.parse(JSON.stringify(r)); });
  var seq = 7;

  function matchesKeyword(row, kw) {
    if (!kw) return true;
    var q = kw.toLowerCase();
    var owner = (USERS[row.ownerId] && USERS[row.ownerId].label) || '';
    return [row.id, row.name, owner].some(function (s) {
      return String(s).toLowerCase().indexOf(q) !== -1;
    });
  }
  function matchesFilters(row, filters) {
    return Object.keys(filters || {}).every(function (key) {
      var sel = filters[key];
      if (!sel || !sel.length) return true;
      var field = FILTER_FIELD[key] || key;
      var val = row[field];
      if (Array.isArray(val)) return val.some(function (x) { return sel.indexOf(x) !== -1; });
      return sel.indexOf(val) !== -1;
    });
  }
  function applyQuery(query) {
    var out = rows.filter(function (r) {
      return matchesKeyword(r, query.keyword) && matchesFilters(r, query.filters);
    });
    var sort = query.sort || { key: 'updatedAt', direction: 'desc' };
    out.sort(function (a, b) {
      var av = a[sort.key], bv = b[sort.key];
      if (av === bv) return 0;
      var cmp = av > bv ? 1 : -1;
      return sort.direction === 'desc' ? -cmp : cmp;
    });
    return out;
  }

  var dataSource = {
    mode: 'static',
    // peek 전용: 시퀀스를 증가시키지 않는다. 실제 증가는 create() 가 담당.
    nextId: function () {
      return 'FN-' + String(seq + 1).padStart(3, '0');
    },
    list: function (query) {
      var filtered = applyQuery(query);
      var page = query.page || 1;
      var size = query.pageSize || 20;
      var start = (page - 1) * size;
      return { rows: filtered.slice(start, start + size), total: filtered.length };
    },
    get: function (id) {
      var found = rows.filter(function (r) { return r.id === id; })[0];
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },
    summary: function (query) {
      var filtered = applyQuery(query);
      var reqSet = {}, scrSet = {};
      var m = { total: filtered.length, draft: 0, review: 0, approved: 0, hold: 0, linkedReq: 0, linkedScr: 0 };
      filtered.forEach(function (r) {
        if (r.status === 'draft') m.draft++;
        if (r.status === 'review') m.review++;
        if (r.status === 'approved') m.approved++;
        if (r.status === 'hold') m.hold++;
        (r.reqIds || []).forEach(function (x) { reqSet[x] = true; });
        (r.screenIds || []).forEach(function (x) { scrSet[x] = true; });
      });
      m.linkedReq = Object.keys(reqSet).length;
      m.linkedScr = Object.keys(scrSet).length;
      return { metrics: m, facets: {} };
    },
    create: function (record) {
      rows.unshift(JSON.parse(JSON.stringify(record)));
      // 'FN-00N' 형태면 시퀀스를 커밋한다 (preview id == 저장 id 보장)
      var m = /^FN-(\d+)$/.exec(record.id || '');
      if (m) seq = Math.max(seq, parseInt(m[1], 10));
      return record;
    },
    update: function (id, patch) {
      var idx = -1;
      rows.forEach(function (r, i) { if (r.id === id) idx = i; });
      if (idx === -1) return null;
      var merged = Object.assign({}, rows[idx], patch, { id: id });
      rows[idx] = merged;
      return merged;
    },
    remove: function (id) {
      rows = rows.filter(function (r) { return r.id !== id; });
      return true;
    }
  };

  /* ── referenceSource (users / screens / requirements) ─────── */
  var REF_MAPS = { users: USERS, screens: SCREENS, requirements: REQUIREMENTS };

  var referenceSource = {
    listOptions: function (referenceType, query) {
      var map = REF_MAPS[referenceType] || {};
      var kw = (query && query.keyword || '').toLowerCase();
      var options = Object.keys(map)
        .filter(function (id) { return !kw || map[id].label.toLowerCase().indexOf(kw) !== -1 || id.toLowerCase().indexOf(kw) !== -1; })
        .map(function (id) { return { label: map[id].label, value: id }; });
      return { options: options, total: options.length, cursor: null };
    },
    resolve: function (referenceType, ids) {
      var map = REF_MAPS[referenceType] || {};
      var byId = {}, missingIds = [];
      (ids || []).forEach(function (id) {
        if (map[id]) byId[id] = { id: id, label: map[id].label };
        else missingIds.push(id);
      });
      return { byId: byId, missingIds: missingIds };
    }
  };

  /* ── owner cell renderer (detail infoGrid) ─────────────────── */
  function ownerCell(row, ctx) {
    var rec = (ctx.refCache.users || {})[row.ownerId];
    var name = rec ? rec.label : row.ownerId;
    var initial = name ? name.charAt(0) : '?';
    var safe = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<span class="bf-user"><span class="bf-ava" style="background:var(--stam)">' + safe.charAt(0) + '</span><span class="bf-user-name">' + safe + '</span></span>';
  }

  /* ── config ────────────────────────────────────────────────── */
  window.STAM.boardConfigs.functionalSpecificationV2 = {
    boardId: 'functional-specification-v2',
    title: '기능정의서 v2',
    description: 'Board Factory 기반 기능정의서 Preview · 화면별 기능을 정의하고 요구사항·화면설계서와 연결합니다.',
    searchPlaceholder: '기능 ID · 기능명 · 담당자 검색',
    idKey: 'id',
    nameKey: 'name',
    pageSize: 20,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    vocab: VOCAB,

    actions: {
      header: [
        { label: '내보내기', variant: 'outline', icon: 'export' },
        { label: '기능 등록', variant: 'primary', action: 'register', icon: 'plus' }
      ]
    },

    summary: {
      cells: [
        { key: 'total',     label: '전체',        dot: 'var(--stam)', sub: '전체 기능' },
        { key: 'draft',     label: '작성중',      dot: '#64748B', sub: '초안 · 작성중' },
        { key: 'review',    label: '검토중',      dot: '#B45309', sub: '검토요청' },
        { key: 'approved',  label: '승인완료',    dot: '#047857', sub: '최종 승인' },
        { key: 'hold',      label: '보류',        dot: '#991B1B', sub: '보류 처리' },
        { key: 'linkedReq', label: '연결 요구사항', dot: '#3B82F6', sub: '연결된 요구사항' },
        { key: 'linkedScr', label: '연결 화면',    dot: '#8B5CF6', sub: '연결된 화면' }
      ]
    },

    columns: [
      { type: 'checkbox' },
      { type: 'idName', label: '기능 ID / 기능명', idField: 'id', nameField: 'name', minWidth: '220px' },
      { type: 'relationChip', label: '연결 요구사항', field: 'reqIds', refType: 'requirements', width: 110 },
      { type: 'relationChip', label: '연결 화면', field: 'screenIds', refType: 'screens', width: 120 },
      { type: 'typeChip', label: '기능유형', field: 'type', width: 84 },
      { type: 'priorityChip', label: '우선순위', field: 'priority', width: 80 },
      { type: 'statusChip', label: '상태', field: 'status', width: 92 },
      { type: 'user', label: '담당자', field: 'ownerId', refType: 'users', width: 110 },
      { type: 'date', label: '최종 수정일', field: 'updatedAt', width: 100 },
      { type: 'actionButtons', label: '', width: 70, buttons: [{ action: 'detail', label: '상세' }] }
    ],

    filters: [
      { key: 'status',   label: '상태',     options: vocabOptions('status') },
      { key: 'type',     label: '기능유형', options: vocabOptions('type') },
      { key: 'priority', label: '우선순위', options: vocabOptions('priority') },
      { key: 'screen',   label: '연결 화면', options: refOptions(SCREENS) },
      { key: 'owner',    label: '담당자',   options: refOptions(USERS) }
    ],

    drawer: {
      registerTitle: '새 기능 등록',
      sections: [
        { title: '기본 정보', fields: [
          { key: 'id', type: 'readonly', label: '기능 ID' },
          { key: 'type', type: 'select', label: '기능유형', required: true, placeholder: '유형 선택', options: vocabOptions('type') },
          { key: 'name', type: 'text', label: '기능명', required: true, full: true, placeholder: '기능명을 입력하세요' },
          { key: 'priority', type: 'select', label: '우선순위', required: true, placeholder: '우선순위 선택', options: vocabOptions('priority') },
          { key: 'status', type: 'select', label: '상태', default: 'draft', options: vocabOptions('status') },
          { key: 'ownerId', type: 'select', label: '담당자', full: true, placeholder: '담당자 선택', options: refOptions(USERS) }
        ] },
        { title: '연결 정보', fields: [
          { key: 'reqIds', type: 'select', label: '연결 요구사항', full: true, asArray: true, placeholder: '요구사항 선택', options: refOptions(REQUIREMENTS) },
          { key: 'screenIds', type: 'select', label: '연결 화면', full: true, asArray: true, placeholder: '화면 선택', options: refOptions(SCREENS) }
        ] },
        { title: '기능 내용', fields: [
          { key: 'desc', type: 'textarea', label: '기능 설명', full: true, minHeight: '72px', placeholder: '기능의 목적과 동작을 기술하세요' },
          { key: 'input', type: 'textarea', label: '입력 조건', full: true, minHeight: '60px', placeholder: '기능 실행에 필요한 입력값 또는 조건을 기술하세요' },
          { key: 'rule', type: 'textarea', label: '처리 규칙', full: true, minHeight: '72px', placeholder: '비즈니스 로직 및 처리 순서를 기술하세요' },
          { key: 'exception', type: 'textarea', label: '예외/오류 처리', full: true, minHeight: '60px', placeholder: '예외 케이스 및 오류 처리 방식을 기술하세요' },
          { key: 'api', type: 'text', label: '관련 API/연동', full: true, placeholder: '관련 API 또는 연동 시스템을 입력하세요' },
          { key: 'note', type: 'textarea', label: '비고', full: true, minHeight: '60px', placeholder: '추가 사항을 입력하세요' }
        ] }
      ]
    },

    detail: {
      tabs: [
        { label: '기본 정보', sections: [
          { type: 'infoGrid', title: '기본 정보', fields: [
            { label: '기능 ID', render: function (row) { return '<span style="font-weight:700;color:var(--stam)">' + row.id + '</span>'; } },
            { label: '기능유형', key: 'type', vocabKey: 'type' },
            { label: '우선순위', key: 'priority', vocabKey: 'priority' },
            { label: '상태', key: 'status', vocabKey: 'status' },
            { label: '담당자', render: ownerCell },
            { label: '최종 수정일', key: 'updatedAt' }
          ] },
          { type: 'relationCards', title: '연결 정보', groups: [
            { label: '요구사항', field: 'reqIds', refType: 'requirements' },
            { label: '화면', field: 'screenIds', refType: 'screens' }
          ] }
        ] },
        { label: '기능 내용', sections: [
          { type: 'textBlock', title: '기능 내용', blocks: [
            { label: '기능 설명', key: 'desc' },
            { label: '입력 조건', key: 'input' },
            { label: '처리 규칙', key: 'rule' },
            { label: '예외/오류 처리', key: 'exception' },
            { label: '관련 API/연동', key: 'api' }
          ] }
        ] }
      ]
    },

    dataSource: dataSource,
    referenceSource: referenceSource
  };
}());
