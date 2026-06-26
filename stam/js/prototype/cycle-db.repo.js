/* ============================================================================
 * STAM Project Cycle DB Prototype — CycleRepo interface (contract)
 * ----------------------------------------------------------------------------
 * 이 파일은 프로토타입 전용 추상화 계층이다 (Backend Architecture & API Boundary
 * Guide 의 "Firebase SDK 직접 호출 금지 · Repository 경유" 원칙 정합).
 *
 * 화면 로직(cycle-db.app.js)은 이 CycleRepo 인터페이스만 호출하고,
 * 실제 저장소(IndexedDB / 후속 Firestore)는 어댑터로 교체한다.
 *
 * CycleRepo interface — 모든 메서드는 Promise 를 반환한다.
 *   getProject(projectId)            -> project | null
 *   saveArtifact(artifact)           -> artifact
 *   listArtifacts(projectId, opts?)  -> artifact[]
 *   saveLink(link)                   -> link
 *   listLinks(projectId, opts?)      -> link[]
 *   appendChange(change)             -> change
 *   listChanges(projectId, opts?)    -> change[]
 *
 * 어댑터는 위 7개 외 helper(saveProject, reset 등)를 추가로 가질 수 있다.
 * ==========================================================================*/
(function () {
  'use strict';

  var REQUIRED = [
    'getProject',
    'saveArtifact',
    'listArtifacts',
    'saveLink',
    'listLinks',
    'appendChange',
    'listChanges'
  ];

  // 어댑터가 인터페이스를 구현하는지 검증한다.
  function assertImplements(adapter, name) {
    if (!adapter || typeof adapter !== 'object') {
      throw new Error('CycleRepo adapter "' + name + '" is not an object');
    }
    REQUIRED.forEach(function (m) {
      if (typeof adapter[m] !== 'function') {
        throw new Error('CycleRepo adapter "' + name + '" missing method: ' + m);
      }
    });
    return adapter;
  }

  // ── artifactType / linkType / linkStatus 표준 enum (문서 기준과 정합) ──
  var ARTIFACT_TYPES = [
    'requirement',
    'functionalDefinition',
    'menuScreen',
    'wbs',
    'screenSpecification',
    'testScenario'
  ];

  var LINK_TYPES = [
    'requirementToFunction',
    'functionToScreen',
    'screenToWbs',
    'screenToScreenSpec',
    'requirementToTestScenario',
    'requirementToArtifact'
  ];

  var LINK_STATUS = [
    'linked',
    'draft',
    'reviewNeeded',
    'changed',
    'missing',
    'outOfScope'
  ];

  window.STAM_CYCLE = window.STAM_CYCLE || {};
  window.STAM_CYCLE.repoContract = {
    required: REQUIRED.slice(),
    artifactTypes: ARTIFACT_TYPES.slice(),
    linkTypes: LINK_TYPES.slice(),
    linkStatus: LINK_STATUS.slice(),
    assertImplements: assertImplements
  };
}());
