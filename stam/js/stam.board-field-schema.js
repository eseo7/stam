/*
 * STAM Board Field Schema v1 — Board Factory 게시판 생성용 필드 표준 (preview)
 *
 * "게시판 찍어내기"(Board Builder) 이전 단계의 기반 정의 모듈.
 *  - 게시판 생성기가 사용할 공통 field type / 속성 / 기본값을 한 곳에 표준화한다.
 *  - 목록 컬럼(table) · 필터(filter) · 드로워 입력(drawer) · export · permission
 *    기준을 field type 단위로 분리해 둔다.
 *  - 본 모듈은 '정의 / 정규화 / 검증 전용'이다. 기존 board-factory 엔진의 렌더
 *    경로를 바꾸지 않으며(화면 동작 그대로 유지), 실제 관리자 생성 UI / DB 저장 /
 *    자동 생성 버튼은 포함하지 않는다.
 *  - 후속: Board Config Registry v1 → Board Builder Admin Preview →
 *    Custom Board Runtime Preview 에서 본 schema 를 소비한다.
 *
 * 정의 / inventory: docs/reports/commonization/Board-Field-Schema-v1.md
 * API/Firestore/localStorage 미사용.
 */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.boardFieldSchema) return;

  /* ── tone 토큰 (chip tone) — 기존 stam.board-factory.css .bf-chip--* 와 정합 ──
   * 엔진 canonical tone: neutral / brand / info / warn / pass / fail / high / mid / low.
   * task 예시의 warning / success / danger 표기는 별칭으로 받아 canonical 로 정규화한다. */
  var TONE_TOKENS = ['neutral', 'brand', 'info', 'warn', 'pass', 'fail', 'high', 'mid', 'low'];
  var TONE_ALIASES = {
    warning: 'warn', success: 'pass', danger: 'fail', error: 'fail',
    ok: 'pass', muted: 'neutral', primary: 'brand'
  };
  function resolveTone(tone) {
    if (!tone) return 'neutral';
    if (TONE_TOKENS.indexOf(tone) !== -1) return tone;
    return TONE_ALIASES[tone] || 'neutral';
  }

  /* ── 12개 field type catalog ──────────────────────────────────────
   * 각 type 은 board-factory 엔진의 컬럼 renderer(RENDERERS 키)와 드로워
   * control(fieldHtml 분기), 필터 동작에 매핑된다 — 엔진을 바꾸지 않고 '연결'만 한다.
   *   column   : 목록 표시 renderer (null = 목록 비표시, drawer 전용)
   *   control  : 드로워 입력 control
   *   filter   : 필터 UI (false = 필터 비대상 / 'checkbox' / 'range'(후속))
   *   tone     : chip tone mapping 사용 여부
   *   options  : 선택지(options/vocab) 사용 여부
   *   relation : 참조 연결 (true = refType 지정 / 'users' = 사용자 참조)
   *   multi    : 복수 값(배열) 여부
   *   defaults : 해당 type 의 visible* 기본값 (필드에서 override 가능) */
  var FIELD_TYPES = {
    text:        { label: '짧은 텍스트',   column: 'text',         control: 'input',    inputType: 'text',   filter: false,      align: 'left',   tone: false, options: false, relation: false,   multi: false, sortable: true,  defaults: { visibleInTable: true,  visibleInFilter: false }, example: '제목 · ID · 담당부서' },
    textarea:    { label: '긴 설명',       column: null,           control: 'textarea', inputType: null,     filter: false,      align: 'left',   tone: false, options: false, relation: false,   multi: false, sortable: false, defaults: { visibleInTable: false, visibleInFilter: false }, example: '상세 설명 · 비고' },
    select:      { label: '단일 선택',     column: 'chip',         control: 'select',   inputType: null,     filter: 'checkbox', align: 'left',   tone: true,  options: true,  relation: false,   multi: false, sortable: true,  defaults: { visibleInTable: true,  visibleInFilter: true  }, example: '유형 · 구분' },
    multiSelect: { label: '복수 선택',     column: 'relationChip', control: 'select',   inputType: null,     filter: 'checkbox', align: 'left',   tone: true,  options: true,  relation: false,   multi: true,  sortable: false, defaults: { visibleInTable: true,  visibleInFilter: true  }, example: '태그 · 관련 산출물 유형' },
    date:        { label: '날짜',          column: 'date',         control: 'input',    inputType: 'date',   filter: 'range',    align: 'left',   tone: false, options: false, relation: false,   multi: false, sortable: true,  defaults: { visibleInTable: true,  visibleInFilter: false }, example: '작성일 · 최종수정일 · 검토일' },
    user:        { label: '담당자/검토자',  column: 'user',         control: 'select',   inputType: null,     filter: 'checkbox', align: 'left',   tone: false, options: true,  relation: 'users', multi: false, sortable: false, defaults: { visibleInTable: true,  visibleInFilter: true  }, example: '담당자 · 검토자 · 승인자' },
    relation:    { label: '산출물 연결',   column: 'relationChip', control: 'select',   inputType: null,     filter: 'checkbox', align: 'left',   tone: false, options: true,  relation: true,    multi: true,  sortable: false, defaults: { visibleInTable: true,  visibleInFilter: true  }, example: '요구사항 · 화면설계서 · WBS · 기능정의' },
    status:      { label: '상태 chip',     column: 'statusChip',   control: 'select',   inputType: null,     filter: 'checkbox', align: 'left',   tone: true,  options: true,  relation: false,   multi: false, sortable: true,  defaults: { visibleInTable: true,  visibleInFilter: true  }, example: '작성중 · 검토요청 · 승인완료' },
    priority:    { label: '우선순위 chip',  column: 'priorityChip', control: 'select',   inputType: null,     filter: 'checkbox', align: 'left',   tone: true,  options: true,  relation: false,   multi: false, sortable: true,  defaults: { visibleInTable: true,  visibleInFilter: true  }, example: '높음 · 보통 · 낮음' },
    boolean:     { label: '예/아니오',     column: 'chip',         control: 'select',   inputType: null,     filter: 'checkbox', align: 'center', tone: true,  options: true,  relation: false,   multi: false, sortable: true,  defaults: { visibleInTable: true,  visibleInFilter: true  }, example: '필수 여부 · 공개 여부' },
    number:      { label: '숫자',          column: 'text',         control: 'input',    inputType: 'number', filter: 'range',    align: 'right',  tone: false, options: false, relation: false,   multi: false, sortable: true,  defaults: { visibleInTable: true,  visibleInFilter: false }, example: '정렬순서 · 개수' },
    url:         { label: '링크',          column: 'link',         control: 'input',    inputType: 'url',    filter: false,      align: 'left',   tone: false, options: false, relation: false,   multi: false, sortable: false, defaults: { visibleInTable: true,  visibleInFilter: false }, example: '화면 URL · 문서 URL' }
  };

  /* ── field schema 속성 기본값 (task 명세 18속성) ──────────────────── */
  var FIELD_DEFAULTS = {
    key: null,
    label: '',
    type: 'text',
    required: false,
    defaultValue: null,
    placeholder: '',
    options: null,
    visibleInTable: true,
    visibleInDrawer: true,
    visibleInFilter: false,
    editable: true,
    sortable: false,
    exportable: true,
    width: null,
    align: 'left',
    tone: null,
    validation: null,
    permission: null
  };

  /* defineField(spec): type 기본값을 적용해 완전한 field schema 로 정규화한다.
   * 우선순위: spec > type defaults(align/sortable/visible*) > FIELD_DEFAULTS.
   * (게시판 생성기 / Registry 가 소비. 엔진 렌더 경로는 변경하지 않는다.) */
  function defineField(spec) {
    spec = spec || {};
    var type = FIELD_TYPES[spec.type] ? spec.type : 'text';
    var meta = FIELD_TYPES[type];
    var f = {};
    Object.keys(FIELD_DEFAULTS).forEach(function (k) { f[k] = FIELD_DEFAULTS[k]; });
    // type 기본값
    f.type = type;
    f.align = meta.align;
    f.sortable = meta.sortable;
    if (meta.defaults) Object.keys(meta.defaults).forEach(function (k) { f[k] = meta.defaults[k]; });
    // spec override (명시값 우선)
    Object.keys(spec).forEach(function (k) { if (spec[k] !== undefined) f[k] = spec[k]; });
    // tone alias → canonical 정규화
    if (f.tone && typeof f.tone === 'object') {
      var norm = {};
      Object.keys(f.tone).forEach(function (code) { norm[code] = resolveTone(f.tone[code]); });
      f.tone = norm;
    }
    return f;
  }

  /* engineMapping(type): board-factory 엔진과의 연결 정보 조회
   * (RENDERERS 컬럼 키 / fieldHtml control / 필터 동작). engine 변경 없이 참조만. */
  function engineMapping(type) {
    var meta = FIELD_TYPES[type];
    if (!meta) return null;
    return {
      column: meta.column,
      control: meta.control,
      inputType: meta.inputType,
      filter: meta.filter,
      multi: meta.multi,
      relation: meta.relation
    };
  }

  /* isKnownType(type): 알려진 12개 field type 인지 검사 (inventory 검증용). */
  function isKnownType(type) {
    return Object.prototype.hasOwnProperty.call(FIELD_TYPES, type);
  }

  window.STAM.boardFieldSchema = {
    version: 'v1',
    types: FIELD_TYPES,
    typeKeys: Object.keys(FIELD_TYPES),   // 12종
    toneTokens: TONE_TOKENS,
    toneAliases: TONE_ALIASES,
    resolveTone: resolveTone,
    defaults: FIELD_DEFAULTS,
    defineField: defineField,
    engineMapping: engineMapping,
    isKnownType: isKnownType
  };
}());
