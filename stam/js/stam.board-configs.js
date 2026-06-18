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

/*
 * ── Board Factory Page Contract v1 ──────────────────────────────
 * 본 파일의 3개 config (functionalSpecificationV2 / menuScreenListV2 /
 * requirementsV2)는 모두 동일한 Board Factory Page Contract 를 따른다.
 * 구조(키)는 공통, 값만 화면별로 다르다 — 화면별 전용 patch 는 두지 않는다.
 *
 *   contract section   공통 config 키                          화면별 '값'
 *   1) Page Header     title / description / actions.header    라벨 · 버튼 문구
 *   2) Summary Strip   summary.cells[]                         cell 종류/라벨/key
 *   3) Toolbar         searchPlaceholder / filters[]           placeholder · 필터군
 *   4) Table Body      columns[] / vocab / dataSource          컬럼 · chip tone · 데이터
 *   5) Table Footer    pageSize / (pagination)                 page 크기
 *   (+ drawer / detail : 등록 · 상세 drawer contract)
 *
 * 엔진 렌더 함수(stam.board-factory.js)와 1:1 대응:
 *   pageHeaderHtml / summaryStripHtml / toolbarHtml / tableBodyHtml /
 *   tableFooterHtml (+ renderPageHeader / renderSummaryStrip /
 *   renderTable / renderTableFooter).
 * 정의: docs/reports/commonization/Board-Factory-Page-Contract-v1.md
 */

/*
 * ── Board Field Schema v1 — config 필드 ↔ field type 매핑 ─────────
 * 본 파일의 columns / filters / drawer 필드는 공통 field schema(12 type)로
 * 분류된다. type 정의/기본값/엔진 매핑은 stam.board-field-schema.js
 * (STAM.boardFieldSchema), 화면별 field inventory 는 Board-Field-Schema-v1.md.
 * 본 매핑은 '게시판 찍어내기' 기반 정리용 주석이며, 아래 config 의 값/구조와
 * 엔진 렌더 경로는 변경하지 않는다(화면 동작 유지). schema 모듈은 v2 페이지에
 * 로드되지 않고 후속 Registry/Builder 단계에서 소비된다.
 *
 *   schema type   config 사용 예 (engine 컬럼 / 드로워 control)
 *   text          id · name · source · requester · lv2 · lv3 · api   (idName/text · input)
 *   textarea      desc · acceptance · rule · exception · note         (목록 비표시 · textarea)
 *   select        type(유형) · screenType · fob · lv1                 (chip/typeChip · select)
 *   date          updatedAt                                           (date · —)
 *   user          ownerId                                             (user · select·ref users)
 *   relation      reqIds · designIds · wbsIds · functionIds · screenIds (relationChip · select 다중·ref)
 *   status        status                                              (statusChip · select)
 *   priority      priority                                            (priorityChip · select)
 *   (미사용 예약)  multiSelect · boolean · number · url                후속 보드용
 * 3개 config 의 모든 컬럼/드로워 필드가 위 type 으로 100% 매핑됨(uncovered 0).
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

  /* ── Page Contract config · 기능정의서 v2 ────────────────────────
   * 1) Page Header  : title / description / actions.header (내보내기 · 기능 등록)
   * 2) Summary Strip: summary.cells × 7 (전체/작성중/검토중/승인완료/보류/연결 요구사항/연결 화면)
   * 3) Toolbar      : searchPlaceholder / filters × 5 (상태·기능유형·우선순위·연결 화면·담당자)
   * 4) Table Body   : columns × 10 / vocab(status5 · type8 · priority3)
   * 5) Table Footer : pageSize 20 / pagination 기본 on
   * 구조는 공통 contract, 위 '값'만 본 화면 전용 (전용 patch 0). */
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

  /* ──────────────────────────────────────────────────────────────
   * 메뉴구조 / 화면목록 v2 preview
   * 기존 boards/menu-screen-list.html 의 컬럼/드로워/필터를
   * Board Factory config 로 재현. static/in-memory.
   * 기존 화면은 변경하지 않는다.
   * ──────────────────────────────────────────────────────────── */

  var MSL_REQUIREMENTS = {
    'REQ-001': { label: '요구사항 목록 조회' },
    'REQ-002': { label: '메뉴 구조 관리' },
    'REQ-003': { label: 'WBS 관리' },
    'REQ-004': { label: '프로젝트 목록' },
    'REQ-005': { label: '사용자/권한 관리' }
  };
  var MSL_DESIGNS = {
    'SCR-001': { label: '요구사항 목록 — 화면설계서' },
    'SCR-002': { label: '요구사항 등록 — 화면설계서' },
    'SCR-003': { label: 'WBS 목록 — 화면설계서' },
    'SCR-004': { label: '프로젝트 목록 — 화면설계서' }
  };
  var MSL_USERS = {
    'user-001': { label: '김민준' },
    'user-002': { label: '이수빈' },
    'user-003': { label: '박지호' },
    'user-004': { label: '최서연' }
  };

  var MSL_SEED = [
    { id: 'MSL-001', name: '요구사항 목록',  lv1: '산출물 관리', lv2: '요구사항정의서', lv3: '',
      screenType: 'list', fob: 'FO', status: 'done',    ownerId: 'user-001',
      reqIds: ['REQ-001','REQ-002'], designIds: ['SCR-001'], updatedAt: '2026-06-10',
      note: '요구사항 목록 조회 화면. 검색·필터·정렬 지원.' },
    { id: 'MSL-002', name: '요구사항 등록',  lv1: '산출물 관리', lv2: '요구사항정의서', lv3: '',
      screenType: 'register', fob: 'FO', status: 'done', ownerId: 'user-001',
      reqIds: ['REQ-001'], designIds: ['SCR-002'], updatedAt: '2026-06-10',
      note: '요구사항 신규 등록 폼.' },
    { id: 'MSL-003', name: 'WBS 목록',       lv1: '산출물 관리', lv2: 'WBS 작업',       lv3: '',
      screenType: 'list', fob: 'FO', status: 'review', ownerId: 'user-002',
      reqIds: ['REQ-003'], designIds: [], updatedAt: '2026-06-09',
      note: 'WBS 작업 목록 화면. 설계서 미작성.' },
    { id: 'MSL-004', name: '화면설계서 목록', lv1: '산출물 관리', lv2: '화면설계서',     lv3: '',
      screenType: 'list', fob: 'FO', status: 'done', ownerId: 'user-002',
      reqIds: ['REQ-002'], designIds: ['SCR-003'], updatedAt: '2026-06-10',
      note: '화면설계서 산출물 목록.' },
    { id: 'MSL-005', name: '로그인',         lv1: '인증',         lv2: '',              lv3: '',
      screenType: 'list', fob: 'FO', status: 'draft', ownerId: 'user-003',
      reqIds: [], designIds: [], updatedAt: '2026-06-08',
      note: '인증 진입 화면. 연결 산출물 없음.' },
    { id: 'MSL-006', name: '프로젝트 목록',   lv1: '서비스 루트', lv2: '',              lv3: '',
      screenType: 'list', fob: 'FO', status: 'done', ownerId: 'user-004',
      reqIds: ['REQ-004'], designIds: ['SCR-004'], updatedAt: '2026-06-07',
      note: '내 프로젝트 진입 후 메인 목록.' },
    { id: 'MSL-007', name: '메뉴/화면 목록',  lv1: '산출물 관리', lv2: '메뉴구조/화면목록', lv3: '',
      screenType: 'list', fob: 'FO', status: 'review', ownerId: 'user-001',
      reqIds: ['REQ-002'], designIds: [], updatedAt: '2026-06-09',
      note: '본 화면. 설계서 미작성 상태.' },
    { id: 'MSL-008', name: '사용자 관리',     lv1: '관리/설정',   lv2: '멤버 관리',      lv3: '',
      screenType: 'list', fob: 'BO', status: 'hold', ownerId: 'user-003',
      reqIds: [], designIds: [], updatedAt: '2026-06-08',
      note: '관리자용 사용자 관리. 보류 처리.' },
    { id: 'MSL-009', name: '대시보드',         lv1: '대시보드',   lv2: '',              lv3: '',
      screenType: 'dashboard', fob: 'FO', status: 'done', ownerId: 'user-004',
      reqIds: ['REQ-004'], designIds: ['SCR-004'], updatedAt: '2026-06-07',
      note: '프로젝트 진입 대시보드.' },
    { id: 'MSL-010', name: '권한 설정',        lv1: '관리/설정', lv2: '멤버 관리',      lv3: '권한',
      screenType: 'setting', fob: 'BO', status: 'draft', ownerId: 'user-003',
      reqIds: ['REQ-005'], designIds: [], updatedAt: '2026-06-06',
      note: '역할별 권한 설정. 설계서 작성 전.' }
  ];

  var MSL_VOCAB = {
    status: {
      draft:  { label: '작성중', tone: 'neutral' },
      review: { label: '검토중', tone: 'warn' },
      done:   { label: '확정',   tone: 'pass' },
      hold:   { label: '보류',   tone: 'fail' }
    },
    screenType: {
      list:      { label: '목록',     tone: 'brand' },
      register:  { label: '등록',     tone: 'brand' },
      detail:    { label: '상세',     tone: 'brand' },
      edit:      { label: '수정',     tone: 'brand' },
      popup:     { label: '팝업',     tone: 'brand' },
      drawer:    { label: 'Drawer',   tone: 'brand' },
      setting:   { label: '설정',     tone: 'brand' },
      dashboard: { label: '대시보드', tone: 'brand' }
    },
    fob: {
      FO: { label: 'FO', tone: 'info' },
      BO: { label: 'BO', tone: 'high' }
    },
    lv1: {
      '서비스 루트':  { label: '서비스 루트',  tone: 'neutral' },
      '대시보드':     { label: '대시보드',     tone: 'neutral' },
      '산출물 관리':  { label: '산출물 관리',  tone: 'neutral' },
      '관리/설정':    { label: '관리/설정',    tone: 'neutral' },
      '인증':         { label: '인증',         tone: 'neutral' }
    }
  };

  function mslVocabOptions(key) {
    var v = MSL_VOCAB[key];
    return Object.keys(v).map(function (code) { return { label: v[code].label, value: code }; });
  }
  function mslRefOptions(map) {
    return Object.keys(map).map(function (id) { return { label: map[id].label, value: id }; });
  }

  var MSL_FILTER_FIELD = {
    status: 'status',
    screenType: 'screenType',
    fob: 'fob',
    lv1: 'lv1',
    owner: 'ownerId'
  };

  var mslRows = MSL_SEED.map(function (r) { return JSON.parse(JSON.stringify(r)); });
  var mslSeq = MSL_SEED.length;

  function mslMatchKeyword(row, kw) {
    if (!kw) return true;
    var q = kw.toLowerCase();
    var owner = (MSL_USERS[row.ownerId] && MSL_USERS[row.ownerId].label) || '';
    return [row.id, row.name, owner, row.lv1, row.lv2, row.lv3].some(function (s) {
      return String(s || '').toLowerCase().indexOf(q) !== -1;
    });
  }
  function mslMatchFilters(row, filters) {
    return Object.keys(filters || {}).every(function (key) {
      var sel = filters[key];
      if (!sel || !sel.length) return true;
      var field = MSL_FILTER_FIELD[key] || key;
      var val = row[field];
      if (Array.isArray(val)) return val.some(function (x) { return sel.indexOf(x) !== -1; });
      return sel.indexOf(val) !== -1;
    });
  }
  function mslApplyQuery(query) {
    var out = mslRows.filter(function (r) {
      return mslMatchKeyword(r, query.keyword) && mslMatchFilters(r, query.filters);
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

  var mslDataSource = {
    mode: 'static',
    nextId: function () {
      return 'MSL-' + String(mslSeq + 1).padStart(3, '0');
    },
    list: function (query) {
      var filtered = mslApplyQuery(query);
      var page = query.page || 1;
      var size = query.pageSize || 20;
      var start = (page - 1) * size;
      return { rows: filtered.slice(start, start + size), total: filtered.length };
    },
    get: function (id) {
      var found = mslRows.filter(function (r) { return r.id === id; })[0];
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },
    summary: function (query) {
      var filtered = mslApplyQuery(query);
      var foSet = 0, boSet = 0, reqSet = {}, scrSet = {};
      var m = { total: filtered.length, draft: 0, review: 0, done: 0, hold: 0, linkedReq: 0, linkedScr: 0 };
      filtered.forEach(function (r) {
        if (r.status === 'draft')  m.draft++;
        if (r.status === 'review') m.review++;
        if (r.status === 'done')   m.done++;
        if (r.status === 'hold')   m.hold++;
        if (r.fob === 'FO') foSet++;
        if (r.fob === 'BO') boSet++;
        (r.reqIds || []).forEach(function (x) { reqSet[x] = true; });
        (r.designIds || []).forEach(function (x) { scrSet[x] = true; });
      });
      m.linkedReq = Object.keys(reqSet).length;
      m.linkedScr = Object.keys(scrSet).length;
      m.fo = foSet; m.bo = boSet;
      return { metrics: m, facets: {} };
    },
    create: function (record) {
      mslRows.unshift(JSON.parse(JSON.stringify(record)));
      var m = /^MSL-(\d+)$/.exec(record.id || '');
      if (m) mslSeq = Math.max(mslSeq, parseInt(m[1], 10));
      return record;
    },
    update: function (id, patch) {
      var idx = -1;
      mslRows.forEach(function (r, i) { if (r.id === id) idx = i; });
      if (idx === -1) return null;
      var merged = Object.assign({}, mslRows[idx], patch, { id: id });
      mslRows[idx] = merged;
      return merged;
    },
    remove: function (id) {
      mslRows = mslRows.filter(function (r) { return r.id !== id; });
      return true;
    }
  };

  var MSL_REF_MAPS = { users: MSL_USERS, requirements: MSL_REQUIREMENTS, designs: MSL_DESIGNS };

  var mslReferenceSource = {
    listOptions: function (referenceType, query) {
      var map = MSL_REF_MAPS[referenceType] || {};
      var kw = (query && query.keyword || '').toLowerCase();
      var options = Object.keys(map)
        .filter(function (id) { return !kw || map[id].label.toLowerCase().indexOf(kw) !== -1 || id.toLowerCase().indexOf(kw) !== -1; })
        .map(function (id) { return { label: map[id].label, value: id }; });
      return { options: options, total: options.length, cursor: null };
    },
    resolve: function (referenceType, ids) {
      var map = MSL_REF_MAPS[referenceType] || {};
      var byId = {}, missingIds = [];
      (ids || []).forEach(function (id) {
        if (map[id]) byId[id] = { id: id, label: map[id].label };
        else missingIds.push(id);
      });
      return { byId: byId, missingIds: missingIds };
    }
  };

  function mslOwnerCell(row, ctx) {
    var rec = (ctx.refCache.users || {})[row.ownerId];
    var name = rec ? rec.label : row.ownerId;
    var safe = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<span class="bf-user"><span class="bf-ava" style="background:var(--stam)">' + safe.charAt(0) + '</span><span class="bf-user-name">' + safe + '</span></span>';
  }

  /* ── Page Contract config · 메뉴구조/화면목록 v2 ─────────────────
   * 1) Page Header  : title / description / actions.header (내보내기 · 화면 등록)
   * 2) Summary Strip: summary.cells × 7 (전체/작성중/검토중/확정/보류/연결 요구사항/연결 화면설계서)
   * 3) Toolbar      : searchPlaceholder / filters × 5 (상태·화면유형·FO/BO·LV1·담당자)
   * 4) Table Body   : columns × 12 / vocab(status4 · screenType8 · fob2 · lv1)
   * 5) Table Footer : pageSize 20 / pagination 기본 on
   * 구조는 공통 contract, 위 '값'만 본 화면 전용 (전용 patch 0). */
  window.STAM.boardConfigs.menuScreenListV2 = {
    boardId: 'menu-screen-list-v2',
    title: '메뉴구조/화면목록 v2',
    description: 'Board Factory 기반 메뉴구조/화면목록 Preview · 화면 ID/명을 메뉴 계층(LV1/LV2/LV3)·요구사항·화면설계서와 연결합니다.',
    searchPlaceholder: '화면 ID · 화면명 · 메뉴 · 담당자 검색',
    idKey: 'id',
    nameKey: 'name',
    pageSize: 20,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    vocab: MSL_VOCAB,

    actions: {
      header: [
        { label: '내보내기', variant: 'outline', icon: 'export' },
        { label: '화면 등록', variant: 'primary', action: 'register', icon: 'plus' }
      ]
    },

    summary: {
      cells: [
        { key: 'total',     label: '전체',          dot: 'var(--stam)', sub: '전체 화면' },
        { key: 'draft',     label: '작성중',        dot: '#64748B', sub: '초안 · 작성중' },
        { key: 'review',    label: '검토중',        dot: '#B45309', sub: '검토 요청' },
        { key: 'done',      label: '확정',          dot: '#047857', sub: '확정 완료' },
        { key: 'hold',      label: '보류',          dot: '#991B1B', sub: '보류 처리' },
        { key: 'linkedReq', label: '연결 요구사항', dot: '#3B82F6', sub: '연결된 요구사항' },
        { key: 'linkedScr', label: '연결 화면설계서', dot: '#8B5CF6', sub: '연결된 설계서' }
      ]
    },

    columns: [
      { type: 'checkbox' },
      { type: 'idName', label: '화면 ID / 화면명', idField: 'id', nameField: 'name', minWidth: '220px' },
      { type: 'text', label: 'LV1', field: 'lv1', width: 110 },
      { type: 'text', label: 'LV2', field: 'lv2', width: 130 },
      { type: 'chip', label: '화면유형', field: 'screenType', vocabKey: 'screenType', width: 84 },
      { type: 'chip', label: 'FO/BO', field: 'fob', vocabKey: 'fob', width: 70 },
      { type: 'relationChip', label: '연결 요구사항', field: 'reqIds', refType: 'requirements', width: 120 },
      { type: 'relationChip', label: '연결 화면설계서', field: 'designIds', refType: 'designs', width: 130 },
      { type: 'statusChip', label: '상태', field: 'status', width: 84 },
      { type: 'user', label: '담당자', field: 'ownerId', refType: 'users', width: 110 },
      { type: 'date', label: '최종 수정일', field: 'updatedAt', width: 100 },
      { type: 'actionButtons', label: '', width: 70, buttons: [{ action: 'detail', label: '상세' }] }
    ],

    filters: [
      { key: 'status',     label: '상태',     options: mslVocabOptions('status') },
      { key: 'screenType', label: '화면유형', options: mslVocabOptions('screenType') },
      { key: 'fob',        label: 'FO/BO',    options: mslVocabOptions('fob') },
      { key: 'lv1',        label: 'LV1',      options: mslVocabOptions('lv1') },
      { key: 'owner',      label: '담당자',   options: mslRefOptions(MSL_USERS) }
    ],

    drawer: {
      registerTitle: '새 화면 등록',
      sections: [
        { title: '기본 정보', fields: [
          { key: 'id', type: 'readonly', label: '화면 ID' },
          { key: 'fob', type: 'select', label: 'FO/BO', required: true, placeholder: 'FO/BO 선택', options: mslVocabOptions('fob') },
          { key: 'name', type: 'text', label: '화면명', required: true, full: true, placeholder: '화면명을 입력하세요' },
          { key: 'screenType', type: 'select', label: '화면유형', required: true, placeholder: '화면유형 선택', options: mslVocabOptions('screenType') },
          { key: 'status', type: 'select', label: '상태', default: 'draft', options: mslVocabOptions('status') },
          { key: 'ownerId', type: 'select', label: '담당자', full: true, placeholder: '담당자 선택', options: mslRefOptions(MSL_USERS) }
        ] },
        { title: '메뉴 계층', fields: [
          { key: 'lv1', type: 'select', label: 'LV1', placeholder: 'LV1 선택', options: mslVocabOptions('lv1') },
          { key: 'lv2', type: 'text', label: 'LV2', placeholder: 'LV2 메뉴명' },
          { key: 'lv3', type: 'text', label: 'LV3', placeholder: 'LV3 메뉴명' }
        ] },
        { title: '연결 정보', fields: [
          { key: 'reqIds', type: 'select', label: '연결 요구사항', full: true, asArray: true, placeholder: '요구사항 선택', options: mslRefOptions(MSL_REQUIREMENTS) },
          { key: 'designIds', type: 'select', label: '연결 화면설계서', full: true, asArray: true, placeholder: '화면설계서 선택', options: mslRefOptions(MSL_DESIGNS) }
        ] },
        { title: '비고', fields: [
          { key: 'note', type: 'textarea', label: '비고', full: true, minHeight: '72px', placeholder: '비고 또는 추가 설명' }
        ] }
      ]
    },

    detail: {
      tabs: [
        { label: '기본 정보', sections: [
          { type: 'infoGrid', title: '기본 정보', fields: [
            { label: '화면 ID', render: function (row) { return '<span style="font-weight:700;color:var(--stam)">' + row.id + '</span>'; } },
            { label: '화면유형', key: 'screenType', vocabKey: 'screenType' },
            { label: 'LV1', key: 'lv1' },
            { label: 'LV2', key: 'lv2' },
            { label: 'FO/BO', key: 'fob', vocabKey: 'fob' },
            { label: '상태', key: 'status', vocabKey: 'status' },
            { label: '담당자', render: mslOwnerCell },
            { label: '최종 수정일', key: 'updatedAt' }
          ] },
          { type: 'relationCards', title: '연결 정보', groups: [
            { label: '요구사항', field: 'reqIds', refType: 'requirements' },
            { label: '화면설계서', field: 'designIds', refType: 'designs' }
          ] }
        ] },
        { label: '비고', sections: [
          { type: 'textBlock', title: '비고', blocks: [
            { label: '비고', key: 'note' }
          ] }
        ] }
      ]
    },

    dataSource: mslDataSource,
    referenceSource: mslReferenceSource
  };

  /* ──────────────────────────────────────────────────────────────
   * 요구사항정의서 v2 preview
   * PR #139 vocab gate (Requirements-BoardFactory-Vocab-Gate-v1.md) 적용:
   *   - priority: high/medium/low — 라벨 높음/보통/낮음 (filter `중간` 정규화)
   *   - status: draft/requested/reviewed/approved/hold (5종)
   *   - type: feature/screen/data/policy/permission/integration/nonfunctional (7종)
   *   - relation table: designs + wbs / drawer: + functions + screens
   * 기존 요구사항 화면(stam/pages/boards/requirements.html) 미변경.
   * static/in-memory. API/Firestore/localStorage 미사용.
   * ──────────────────────────────────────────────────────────── */

  var RQ_USERS = {
    'user-001': { label: '김민준' },
    'user-002': { label: '이수빈' },
    'user-003': { label: '박지호' },
    'user-004': { label: '최서연' },
    'user-005': { label: '정하늘' }
  };
  var RQ_DESIGNS = {
    'SCR-001': { label: '요구사항 목록 — 화면설계서' },
    'SCR-002': { label: '요구사항 등록 — 화면설계서' },
    'SCR-003': { label: 'WBS 목록 — 화면설계서' },
    'SCR-004': { label: '대시보드 — 화면설계서' },
    'SCR-005': { label: '권한 설정 — 화면설계서' }
  };
  var RQ_WBS = {
    'WBS-101': { label: '요구사항 정의 (1주차)' },
    'WBS-102': { label: '화면 설계 (2주차)' },
    'WBS-201': { label: 'WBS 관리 모듈 개발' },
    'WBS-301': { label: '권한 정책 수립' },
    'WBS-401': { label: '외부 연동 인터페이스' }
  };
  var RQ_FUNCTIONS = {
    'FN-001': { label: '요구사항 목록 조회' },
    'FN-002': { label: '메뉴 구조 등록' },
    'FN-003': { label: '화면별 기능 매핑' },
    'FN-005': { label: '기능정의서 내보내기' }
  };
  var RQ_SCREENS = {
    'MSL-001': { label: '요구사항 목록' },
    'MSL-002': { label: '요구사항 등록' },
    'MSL-007': { label: '메뉴/화면 목록' },
    'MSL-009': { label: '대시보드' },
    'MSL-010': { label: '권한 설정' }
  };

  /* 1차 seed — status 5종 / priority 3종 / type 7종 / 연결 유무 다양 */
  var RQ_SEED = [
    { id: 'REQ-001', name: '요구사항 목록 조회 화면',         type: 'feature',       priority: 'high',   status: 'approved', ownerId: 'user-001',
      designIds: ['SCR-001'], wbsIds: ['WBS-101'], functionIds: ['FN-001'], screenIds: ['MSL-001'],
      source: '고객사 요청', requester: '기획팀', updatedAt: '2026-06-13',
      desc: '요구사항 목록을 검색·필터·정렬로 동적 조회한다.', acceptance: '검색·필터·정렬·페이지네이션 동작이 정의된 동작과 일치한다.', note: '' },
    { id: 'REQ-002', name: '요구사항 등록 폼',               type: 'screen',        priority: 'high',   status: 'requested', ownerId: 'user-002',
      designIds: ['SCR-002'], wbsIds: ['WBS-101'], functionIds: [], screenIds: ['MSL-002'],
      source: '내부 분석', requester: '기획팀', updatedAt: '2026-06-12',
      desc: '신규 요구사항을 등록할 수 있는 폼 화면을 제공한다.', acceptance: '필수 필드 누락 시 등록이 차단된다.', note: '' },
    { id: 'REQ-003', name: '연결 정보 chip/card 표현 기준', type: 'screen',        priority: 'medium', status: 'reviewed',  ownerId: 'user-002',
      designIds: [], wbsIds: ['WBS-102'], functionIds: ['FN-003'], screenIds: [],
      source: '디자인 가이드', requester: '디자인팀', updatedAt: '2026-06-11',
      desc: 'list/drawer 양쪽에서 연결 정보를 chip/card 로 일관되게 표현한다.', acceptance: '동일 데이터가 두 컴포넌트에서 동일 라벨/색으로 표시된다.', note: '' },
    { id: 'REQ-004', name: '변경 이력 자동 기록',             type: 'feature',       priority: 'medium', status: 'draft',     ownerId: 'user-001',
      designIds: [], wbsIds: [], functionIds: [], screenIds: [],
      source: '내부 분석', requester: '기획팀', updatedAt: '2026-06-10',
      desc: '상태/우선순위/담당자 변경 시 이력 레코드를 자동 생성한다.', acceptance: '이력 누락 0건. 변경자/시간/전후 값을 보존한다.', note: 'historyList slot 본구현 후속' },
    { id: 'REQ-005', name: '권한별 메뉴 가시성',             type: 'permission',    priority: 'high',   status: 'draft',     ownerId: 'user-003',
      designIds: ['SCR-005'], wbsIds: ['WBS-301'], functionIds: [], screenIds: ['MSL-010'],
      source: '보안 정책', requester: '보안팀', updatedAt: '2026-06-09',
      desc: '역할별 메뉴 노출/숨김 정책을 적용한다.', acceptance: '권한 없는 사용자는 해당 메뉴를 호출할 수 없다.', note: '' },
    { id: 'REQ-006', name: '외부 시스템 연동 API',           type: 'integration',   priority: 'medium', status: 'hold',      ownerId: 'user-004',
      designIds: [], wbsIds: ['WBS-401'], functionIds: [], screenIds: [],
      source: '고객사 요청', requester: '연동팀', updatedAt: '2026-06-08',
      desc: '외부 시스템과의 산출물 동기화 인터페이스를 제공한다.', acceptance: '인증·인코딩·에러 처리 규약이 합의된 명세와 일치한다.', note: '명세 확정 전 보류' },
    { id: 'REQ-007', name: '응답 시간 1.5초 이내',           type: 'nonfunctional', priority: 'low',    status: 'approved',  ownerId: 'user-005',
      designIds: [], wbsIds: [], functionIds: [], screenIds: [],
      source: '성능 기준', requester: '품질팀', updatedAt: '2026-06-07',
      desc: '주요 조회 화면의 응답 시간을 1.5초 이내로 유지한다.', acceptance: '95p 응답시간이 1.5초 이하.', note: '' },
    { id: 'REQ-008', name: '필수 코드 정책 정의',             type: 'policy',        priority: 'medium', status: 'reviewed',  ownerId: 'user-003',
      designIds: [], wbsIds: ['WBS-301'], functionIds: [], screenIds: [],
      source: '내부 분석', requester: '정책팀', updatedAt: '2026-06-06',
      desc: '시스템 전반에서 사용하는 공통 코드 정책을 정의한다.', acceptance: '코드 vocab 표가 단일 출처에서 관리된다.', note: '' },
    { id: 'REQ-009', name: '대시보드 KPI 데이터셋',           type: 'data',          priority: 'medium', status: 'requested', ownerId: 'user-004',
      designIds: ['SCR-004'], wbsIds: [], functionIds: [], screenIds: ['MSL-009'],
      source: '내부 분석', requester: '기획팀', updatedAt: '2026-06-05',
      desc: '대시보드에 노출할 KPI 의 데이터 모델/계산식을 정의한다.', acceptance: '계산식이 명세와 일치하고 갱신 주기가 명확하다.', note: '' },
    { id: 'REQ-010', name: '메뉴/화면 목록 보관 정책',        type: 'policy',        priority: 'low',    status: 'hold',      ownerId: 'user-001',
      designIds: [], wbsIds: [], functionIds: [], screenIds: ['MSL-007'],
      source: '내부 분석', requester: '기획팀', updatedAt: '2026-06-04',
      desc: '폐기된 화면의 보관/표시 정책을 정의한다.', acceptance: '폐기 화면은 목록에서 별도 표기된다.', note: '운영 정책 합의 보류' }
  ];

  /* PR #139 vocab gate 적용 */
  var RQ_VOCAB = {
    status: {
      draft:     { label: '작성중',   tone: 'neutral' },
      requested: { label: '검토요청', tone: 'warn' },
      reviewed:  { label: '검토완료', tone: 'info' },
      approved:  { label: '승인완료', tone: 'pass' },
      hold:      { label: '보류',     tone: 'fail' }
    },
    priority: {
      high:   { label: '높음', tone: 'high' },
      medium: { label: '보통', tone: 'mid' },
      low:    { label: '낮음', tone: 'low' }
    },
    type: {
      feature:       { label: '기능',   tone: 'brand' },
      screen:        { label: '화면',   tone: 'brand' },
      data:          { label: '데이터', tone: 'brand' },
      policy:        { label: '정책',   tone: 'brand' },
      permission:    { label: '권한',   tone: 'brand' },
      integration:   { label: '연동',   tone: 'brand' },
      nonfunctional: { label: '비기능', tone: 'brand' }
    }
  };

  function rqVocabOptions(key) {
    var v = RQ_VOCAB[key];
    return Object.keys(v).map(function (code) { return { label: v[code].label, value: code }; });
  }
  function rqRefOptions(map) {
    return Object.keys(map).map(function (id) { return { label: map[id].label, value: id }; });
  }

  var RQ_FILTER_FIELD = {
    status: 'status',
    type: 'type',
    priority: 'priority',
    owner: 'ownerId'
  };

  var rqRows = RQ_SEED.map(function (r) { return JSON.parse(JSON.stringify(r)); });
  var rqSeq = RQ_SEED.length;

  function rqMatchKeyword(row, kw) {
    if (!kw) return true;
    var q = kw.toLowerCase();
    var owner = (RQ_USERS[row.ownerId] && RQ_USERS[row.ownerId].label) || '';
    return [row.id, row.name, owner, row.source, row.requester].some(function (s) {
      return String(s || '').toLowerCase().indexOf(q) !== -1;
    });
  }
  function rqMatchFilters(row, filters) {
    return Object.keys(filters || {}).every(function (key) {
      var sel = filters[key];
      if (!sel || !sel.length) return true;
      var field = RQ_FILTER_FIELD[key] || key;
      var val = row[field];
      if (Array.isArray(val)) return val.some(function (x) { return sel.indexOf(x) !== -1; });
      return sel.indexOf(val) !== -1;
    });
  }
  function rqApplyQuery(query) {
    var out = rqRows.filter(function (r) {
      return rqMatchKeyword(r, query.keyword) && rqMatchFilters(r, query.filters);
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

  var rqDataSource = {
    mode: 'static',
    nextId: function () {
      return 'REQ-' + String(rqSeq + 1).padStart(3, '0');
    },
    list: function (query) {
      var filtered = rqApplyQuery(query);
      var page = query.page || 1;
      var size = query.pageSize || 20;
      var start = (page - 1) * size;
      return { rows: filtered.slice(start, start + size), total: filtered.length };
    },
    get: function (id) {
      var found = rqRows.filter(function (r) { return r.id === id; })[0];
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },
    summary: function (query) {
      var filtered = rqApplyQuery(query);
      var designSet = {}, wbsSet = {};
      var m = { total: filtered.length, draft: 0, reviewing: 0, approved: 0, hold: 0, highPriority: 0, linkedDesign: 0, linkedWbs: 0 };
      filtered.forEach(function (r) {
        if (r.status === 'draft')                            m.draft++;
        if (r.status === 'requested' || r.status === 'reviewed') m.reviewing++;
        if (r.status === 'approved')                         m.approved++;
        if (r.status === 'hold')                             m.hold++;
        if (r.priority === 'high')                           m.highPriority++;
        (r.designIds || []).forEach(function (x) { designSet[x] = true; });
        (r.wbsIds || []).forEach(function (x) { wbsSet[x] = true; });
      });
      m.linkedDesign = Object.keys(designSet).length;
      m.linkedWbs    = Object.keys(wbsSet).length;
      return { metrics: m, facets: {} };
    },
    create: function (record) {
      rqRows.unshift(JSON.parse(JSON.stringify(record)));
      var m = /^REQ-(\d+)$/.exec(record.id || '');
      if (m) rqSeq = Math.max(rqSeq, parseInt(m[1], 10));
      return record;
    },
    update: function (id, patch) {
      var idx = -1;
      rqRows.forEach(function (r, i) { if (r.id === id) idx = i; });
      if (idx === -1) return null;
      var merged = Object.assign({}, rqRows[idx], patch, { id: id });
      rqRows[idx] = merged;
      return merged;
    },
    remove: function (id) {
      rqRows = rqRows.filter(function (r) { return r.id !== id; });
      return true;
    }
  };

  var RQ_REF_MAPS = {
    users: RQ_USERS,
    designs: RQ_DESIGNS,
    wbs: RQ_WBS,
    functions: RQ_FUNCTIONS,
    screens: RQ_SCREENS
  };

  var rqReferenceSource = {
    listOptions: function (referenceType, query) {
      var map = RQ_REF_MAPS[referenceType] || {};
      var kw = (query && query.keyword || '').toLowerCase();
      var options = Object.keys(map)
        .filter(function (id) { return !kw || map[id].label.toLowerCase().indexOf(kw) !== -1 || id.toLowerCase().indexOf(kw) !== -1; })
        .map(function (id) { return { label: map[id].label, value: id }; });
      return { options: options, total: options.length, cursor: null };
    },
    resolve: function (referenceType, ids) {
      var map = RQ_REF_MAPS[referenceType] || {};
      var byId = {}, missingIds = [];
      (ids || []).forEach(function (id) {
        if (map[id]) byId[id] = { id: id, label: map[id].label };
        else missingIds.push(id);
      });
      return { byId: byId, missingIds: missingIds };
    }
  };

  function rqOwnerCell(row, ctx) {
    var rec = (ctx.refCache.users || {})[row.ownerId];
    var name = rec ? rec.label : row.ownerId;
    var safe = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<span class="bf-user"><span class="bf-ava" style="background:var(--stam)">' + safe.charAt(0) + '</span><span class="bf-user-name">' + safe + '</span></span>';
  }

  /* ── Page Contract config · 요구사항정의서 v2 ────────────────────
   * 1) Page Header  : title / description / actions.header (내보내기 · 요구사항 등록)
   * 2) Summary Strip: summary.cells × 7 (전체/검토중/승인완료/보류/높음 우선순위/연결 화면설계서/연결 WBS)
   * 3) Toolbar      : searchPlaceholder / filters × 4 (상태·유형·우선순위·담당자)
   * 4) Table Body   : columns × 10 / vocab(status5 · type7 · priority3)
   * 5) Table Footer : pageSize 20 / pagination 기본 on
   * 구조는 공통 contract, 위 '값'만 본 화면 전용 (전용 patch 0). */
  window.STAM.boardConfigs.requirementsV2 = {
    boardId: 'requirements-v2',
    title: '요구사항정의서 v2',
    description: 'Board Factory 기반 요구사항정의서 Preview · 기능·화면·데이터·정책 요구사항을 관리하고 화면설계서·WBS·기능정의서·메뉴목록과 연결합니다.',
    searchPlaceholder: '요구사항 ID · 요구사항명 · 담당자 · 출처 검색',
    idKey: 'id',
    nameKey: 'name',
    pageSize: 20,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    vocab: RQ_VOCAB,

    actions: {
      header: [
        { label: '내보내기', variant: 'outline', icon: 'export' },
        { label: '요구사항 등록', variant: 'primary', action: 'register', icon: 'plus' }
      ]
    },

    summary: {
      cells: [
        { key: 'total',        label: '전체',          dot: 'var(--stam)', sub: '전체 요구사항' },
        { key: 'reviewing',    label: '검토중',        dot: '#B45309', sub: '검토요청 + 검토완료' },
        { key: 'approved',     label: '승인완료',      dot: '#047857', sub: '최종 승인' },
        { key: 'hold',         label: '보류',          dot: '#991B1B', sub: '보류 처리' },
        { key: 'highPriority', label: '높음 우선순위', dot: '#DC2626', sub: '우선순위 높음' },
        { key: 'linkedDesign', label: '연결 화면설계서', dot: '#3B82F6', sub: '연결된 설계서' },
        { key: 'linkedWbs',    label: '연결 WBS',      dot: '#8B5CF6', sub: '연결된 WBS' }
      ]
    },

    columns: [
      { type: 'checkbox' },
      { type: 'idName', label: '요구사항 ID / 요구사항명', idField: 'id', nameField: 'name', minWidth: '240px' },
      { type: 'typeChip', label: '유형', field: 'type', width: 84 },
      { type: 'priorityChip', label: '우선순위', field: 'priority', width: 80 },
      { type: 'statusChip', label: '상태', field: 'status', width: 92 },
      { type: 'user', label: '담당자', field: 'ownerId', refType: 'users', width: 110 },
      { type: 'relationChip', label: '연결 화면설계서', field: 'designIds', refType: 'designs', width: 130 },
      { type: 'relationChip', label: '연결 WBS', field: 'wbsIds', refType: 'wbs', width: 120 },
      { type: 'date', label: '최종 수정일', field: 'updatedAt', width: 100 },
      { type: 'actionButtons', label: '', width: 70, buttons: [{ action: 'detail', label: '상세' }] }
    ],

    filters: [
      { key: 'status',   label: '상태',     options: rqVocabOptions('status') },
      { key: 'type',     label: '유형',     options: rqVocabOptions('type') },
      { key: 'priority', label: '우선순위', options: rqVocabOptions('priority') },
      { key: 'owner',    label: '담당자',   options: rqRefOptions(RQ_USERS) }
    ],

    drawer: {
      registerTitle: '새 요구사항 등록',
      sections: [
        { title: '기본 정보', fields: [
          { key: 'id', type: 'readonly', label: '요구사항 ID' },
          { key: 'type', type: 'select', label: '유형', required: true, placeholder: '유형 선택', options: rqVocabOptions('type') },
          { key: 'name', type: 'text', label: '요구사항명', required: true, full: true, placeholder: '요구사항명을 입력하세요' },
          { key: 'priority', type: 'select', label: '우선순위', required: true, placeholder: '우선순위 선택', options: rqVocabOptions('priority') },
          { key: 'status', type: 'select', label: '상태', required: true, default: 'draft', options: rqVocabOptions('status') },
          { key: 'ownerId', type: 'select', label: '담당자', required: true, full: true, placeholder: '담당자 선택', options: rqRefOptions(RQ_USERS) }
        ] },
        { title: '출처 / 요청', fields: [
          { key: 'source', type: 'text', label: '출처', placeholder: '예) 고객사 요청, 내부 분석' },
          { key: 'requester', type: 'text', label: '요청 부서', placeholder: '예) 기획팀, 보안팀' }
        ] },
        { title: '요구사항 내용', fields: [
          { key: 'desc', type: 'textarea', label: '설명', required: true, full: true, minHeight: '72px', placeholder: '요구사항의 배경/내용을 기술하세요' },
          { key: 'acceptance', type: 'textarea', label: '수용 기준', full: true, minHeight: '72px', placeholder: '수용 기준(Acceptance Criteria)을 기술하세요' },
          { key: 'note', type: 'textarea', label: '비고', full: true, minHeight: '60px', placeholder: '추가 사항을 입력하세요' }
        ] },
        { title: '연결 정보', fields: [
          { key: 'designIds', type: 'select', label: '연결 화면설계서', full: true, asArray: true, placeholder: '화면설계서 선택', options: rqRefOptions(RQ_DESIGNS) },
          { key: 'wbsIds', type: 'select', label: '연결 WBS', full: true, asArray: true, placeholder: 'WBS 선택', options: rqRefOptions(RQ_WBS) },
          { key: 'functionIds', type: 'select', label: '연결 기능정의서', full: true, asArray: true, placeholder: '기능 선택', options: rqRefOptions(RQ_FUNCTIONS) },
          { key: 'screenIds', type: 'select', label: '연결 메뉴/화면목록', full: true, asArray: true, placeholder: '화면 선택', options: rqRefOptions(RQ_SCREENS) }
        ] }
      ]
    },

    detail: {
      tabs: [
        { label: '기본 정보', sections: [
          { type: 'infoGrid', title: '기본 정보', fields: [
            { label: '요구사항 ID', render: function (row) { return '<span style="font-weight:700;color:var(--stam)">' + row.id + '</span>'; } },
            { label: '유형', key: 'type', vocabKey: 'type' },
            { label: '우선순위', key: 'priority', vocabKey: 'priority' },
            { label: '상태', key: 'status', vocabKey: 'status' },
            { label: '담당자', render: rqOwnerCell },
            { label: '출처', key: 'source' },
            { label: '요청 부서', key: 'requester' },
            { label: '최종 수정일', key: 'updatedAt' }
          ] }
        ] },
        { label: '요구사항 내용', sections: [
          { type: 'textBlock', title: '요구사항 내용', blocks: [
            { label: '설명', key: 'desc' },
            { label: '수용 기준', key: 'acceptance' },
            { label: '비고', key: 'note' }
          ] }
        ] },
        { label: '연결 산출물', sections: [
          { type: 'relationCards', title: '연결 정보', groups: [
            { label: '화면설계서', field: 'designIds', refType: 'designs' },
            { label: 'WBS', field: 'wbsIds', refType: 'wbs' },
            { label: '기능정의서', field: 'functionIds', refType: 'functions' },
            { label: '메뉴/화면목록', field: 'screenIds', refType: 'screens' }
          ] }
        ] }
      ]
    },

    dataSource: rqDataSource,
    referenceSource: rqReferenceSource
  };
}());
