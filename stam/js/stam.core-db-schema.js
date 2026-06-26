/* ============================================================================
 * STAM Core DB Schema v0.1 — 논리 구조 상수 (실DB ↔ Local DB 공통 기준)
 * ----------------------------------------------------------------------------
 * 이 파일은 "DB 논리 구조"만 정의하는 순수 상수 모듈이다. IndexedDB/Firestore
 * 같은 물리 저장소에 의존하지 않는다. Local IndexedDB v2 어댑터
 * (stam.local-core-db.js)와 import/board 화면이 이 상수를 공유한다.
 *
 * 원칙(STAM-Core-DB-Table-Definition-v0.1 문서와 정합):
 *  - Local DB도 DB다. 자동 clear / deleteDatabase / 자동 seed 금지.
 *  - 6개 게시판 데이터는 게시판별 store(테이블)에 저장한다(통합 artifacts 아님).
 *  - 삭제는 물리 삭제가 아니라 soft delete(status=deleted)가 기본이다.
 *  - 실DB와 물리적으로 100% 같을 필요는 없지만 논리 구조는 같아야 한다.
 * ==========================================================================*/
(function () {
  'use strict';

  // ── Local IndexedDB v2 DB 이름 (v1 'stam-prototype-cycle-db' 와 분리) ──
  var DB_NAME = 'stam-core-local-db-v1';
  var DB_VERSION = 1;

  // ── 인덱스 keyPath 정의 (이름 공유) ──────────────────────────────
  var INDEX_KEYPATH = {
    byProject: 'projectId',
    byImportBatch: 'importBatchId',
    byRequirement: 'requirementId'
  };

  // ── store(=논리 테이블) 정의: keyPath + 인덱스 목록 ──────────────
  // 데이터 row 는 자동 생성하지 않는다. 여기서는 구조만 선언한다.
  var STORES = {
    projects:              { keyPath: 'projectId',     indexes: [] },
    requirements:          { keyPath: 'id', indexes: ['byProject', 'byImportBatch', 'byRequirement'] },
    functionalDefinitions: { keyPath: 'id', indexes: ['byProject', 'byImportBatch', 'byRequirement'] },
    menuScreens:           { keyPath: 'id', indexes: ['byProject', 'byImportBatch', 'byRequirement'] },
    wbsItems:              { keyPath: 'id', indexes: ['byProject', 'byImportBatch', 'byRequirement'] },
    screenSpecifications:  { keyPath: 'id', indexes: ['byProject', 'byImportBatch', 'byRequirement'] },
    testScenarios:         { keyPath: 'id', indexes: ['byProject', 'byImportBatch', 'byRequirement'] },
    artifactLinks:         { keyPath: 'linkId',        indexes: ['byProject', 'byImportBatch'] },
    artifactChanges:       { keyPath: 'changeId',      indexes: ['byProject', 'byImportBatch'] },
    importBatches:         { keyPath: 'importBatchId', indexes: ['byProject'] },
    importRows:            { keyPath: 'importRowId',   indexes: ['byProject', 'byImportBatch'] }
  };

  // ── 6개 게시판 메인 store (요구사항 1건 당 생성 개수) ──────────────
  //  requirements 1 · functionalDefinitions 1 · menuScreens 1 · wbsItems 3 ·
  //  screenSpecifications 1 · testScenarios 2 · artifactLinks 8
  var BOARD_STORES = [
    'requirements', 'functionalDefinitions', 'menuScreens',
    'wbsItems', 'screenSpecifications', 'testScenarios'
  ];

  // ── generator 의 artifactType → v2 store 매핑 ────────────────────
  var ARTIFACT_TYPE_TO_STORE = {
    requirement: 'requirements',
    functionalDefinition: 'functionalDefinitions',
    menuScreen: 'menuScreens',
    wbs: 'wbsItems',
    screenSpecification: 'screenSpecifications',
    testScenario: 'testScenarios'
  };

  // ── 공통 상태값 ──────────────────────────────────────────────────
  var STATUS = {
    DRAFT: 'draft',         // 자동 생성 초안
    ACTIVE: 'active',       // 사용자 확정 진행
    CONFIRMED: 'confirmed', // 확정
    DELETED: 'deleted'      // soft delete
  };
  var REVIEW_STATUS = {
    REVIEW_NEEDED: 'Review Needed',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved'
  };

  // ── linkType enum (repoContract 와 동일 기준) ────────────────────
  var LINK_TYPE = {
    requirementToFunction: 'requirementToFunction',
    functionToScreen: 'functionToScreen',
    screenToWbs: 'screenToWbs',
    screenToScreenSpec: 'screenToScreenSpec',
    requirementToTestScenario: 'requirementToTestScenario',
    requirementToArtifact: 'requirementToArtifact'
  };

  // ── soft delete 기준 ─────────────────────────────────────────────
  //  list 기본 조회에서 status=deleted 는 제외한다. hard delete 미구현.
  var SOFT_DELETE = {
    STATUS_VALUE: STATUS.DELETED,
    FIELDS: ['status', 'deletedAt', 'deletedBy', 'deleteReason']
  };

  // ── board metadata (화면/메뉴는 이미 존재 — 참고용 상수, store 아님) ──
  var BOARD_META = {
    requirements:          { label: '요구사항',         store: 'requirements' },
    functionalDefinitions: { label: '기능정의',         store: 'functionalDefinitions' },
    menuScreens:           { label: '메뉴/화면',        store: 'menuScreens' },
    wbsItems:              { label: 'WBS',              store: 'wbsItems' },
    screenSpecifications:  { label: '화면설계서',       store: 'screenSpecifications' },
    testScenarios:         { label: '테스트 시나리오',  store: 'testScenarios' }
  };

  window.STAM_CORE = window.STAM_CORE || {};
  window.STAM_CORE.schema = {
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    STORES: STORES,
    INDEX_KEYPATH: INDEX_KEYPATH,
    BOARD_STORES: BOARD_STORES.slice(),
    ARTIFACT_TYPE_TO_STORE: ARTIFACT_TYPE_TO_STORE,
    STATUS: STATUS,
    REVIEW_STATUS: REVIEW_STATUS,
    LINK_TYPE: LINK_TYPE,
    SOFT_DELETE: SOFT_DELETE,
    BOARD_META: BOARD_META,
    storeNames: function () { return Object.keys(STORES); }
  };
}());
