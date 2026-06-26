/* ============================================================================
 * STAM Project Cycle DB Prototype — One-cycle seed data
 * ----------------------------------------------------------------------------
 * 한 사이클(요구사항 → 기능정의 → 메뉴/화면 → WBS → 화면설계서 → 테스트)을
 * 고정 projectId 로 생성한다. 모든 artifact 기본 reviewStatus = "Review Needed".
 *
 * Missing 검증을 위해 두 번째 요구사항(REQ-002)은 의도적으로 하위 연결을 두지
 * 않는다(누락 예시 행). Missing 은 저장하지 않고 화면에서 계산해 표시한다.
 *
 * 이 모듈은 CycleRepo 인터페이스만 사용해 저장한다(저장소 비종속).
 * ==========================================================================*/
(function () {
  'use strict';

  var PROJECT_ID = 'proto-proj-001';
  var BY = 'prototype-user';

  function nowIso() { return new Date().toISOString(); }

  // 표준 artifact 기본 필드를 채운다.
  function artifact(o) {
    var t = nowIso();
    return {
      artifactId: o.artifactId,
      projectId: PROJECT_ID,
      artifactType: o.artifactType,
      title: o.title,
      description: o.description || '',
      status: o.status || 'draft',
      reviewStatus: 'Review Needed',          // 기준: 모든 결과 Review Needed
      owner: o.owner || '미지정',
      sourceType: o.sourceType || 'Manual',
      sourceRef: o.sourceRef || '',
      customFields: o.customFields || {},
      createdAt: t,
      updatedAt: t,
      createdBy: BY,
      updatedBy: BY
    };
  }

  function link(o) {
    return {
      linkId: o.linkId,
      projectId: PROJECT_ID,
      fromArtifactId: o.from,
      toArtifactId: o.to,
      fromType: o.fromType,
      toType: o.toType,
      linkType: o.linkType,
      linkStatus: o.linkStatus,               // linked / draft / reviewNeeded ...
      createdAt: nowIso(),
      createdBy: BY
    };
  }

  function change(o) {
    return {
      changeId: o.changeId,
      projectId: PROJECT_ID,
      artifactId: o.artifactId,
      changeType: o.changeType,               // create | update | link | unlink
      field: o.field || '',
      before: o.before === undefined ? null : o.before,
      after: o.after === undefined ? null : o.after,
      at: nowIso(),
      by: BY
    };
  }

  // ── 데이터셋 구성 ────────────────────────────────────────────
  function buildSeed() {
    var artifacts = [
      // 완전 연결되는 한 사이클 (REQ-001)
      artifact({ artifactId: 'REQ-001', artifactType: 'requirement',          title: '로그인 2차 인증', description: 'OTP 기반 2차 인증을 지원한다.', sourceType: 'Excel Import', sourceRef: 'sheet:요구사항정의서!row4' }),
      artifact({ artifactId: 'FUN-001', artifactType: 'functionalDefinition',  title: '인증 기능 정의', description: '2차 인증 처리 흐름.' }),
      artifact({ artifactId: 'SCR-001', artifactType: 'menuScreen',            title: '로그인 화면', description: '로그인 / OTP 입력 화면.' }),
      artifact({ artifactId: 'WBS-001', artifactType: 'wbs',                   title: '인증 API 개발', description: 'OTP 발급/검증 API.' }),
      artifact({ artifactId: 'WBS-002', artifactType: 'wbs',                   title: '로그인 UI 개발', description: '로그인 화면 구현.' }),
      artifact({ artifactId: 'WBS-003', artifactType: 'wbs',                   title: '인증 테스트 작성', description: '단위/통합 테스트.' }),
      artifact({ artifactId: 'SSP-001', artifactType: 'screenSpecification',   title: '로그인 화면설계서', description: '필드/액션/권한 정의.' }),
      artifact({ artifactId: 'TST-001', artifactType: 'testScenario',          title: '로그인 테스트 시나리오', description: '정상/실패/잠금 케이스.' }),

      // Missing 예시 요구사항 (하위 연결 없음 — 누락 표시 검증용)
      artifact({ artifactId: 'REQ-002', artifactType: 'requirement',          title: '권한 관리 (부분 연결 예시)', description: '관리자/일반 권한 구분. 하위 산출물 미연결.', sourceType: 'Text Intake', sourceRef: 'block:blk-003' })
    ];

    var links = [
      // 5개 연결 타입 — linkStatus 를 섞어 linked/draft/reviewNeeded 를 모두 노출
      link({ linkId: 'LNK-001', from: 'REQ-001', to: 'FUN-001', fromType: 'requirement',         toType: 'functionalDefinition', linkType: 'requirementToFunction',     linkStatus: 'linked' }),
      link({ linkId: 'LNK-002', from: 'FUN-001', to: 'SCR-001', fromType: 'functionalDefinition', toType: 'menuScreen',           linkType: 'functionToScreen',         linkStatus: 'linked' }),
      link({ linkId: 'LNK-003', from: 'SCR-001', to: 'WBS-001', fromType: 'menuScreen',           toType: 'wbs',                  linkType: 'screenToWbs',              linkStatus: 'linked' }),
      link({ linkId: 'LNK-004', from: 'SCR-001', to: 'WBS-002', fromType: 'menuScreen',           toType: 'wbs',                  linkType: 'screenToWbs',              linkStatus: 'linked' }),
      link({ linkId: 'LNK-005', from: 'SCR-001', to: 'WBS-003', fromType: 'menuScreen',           toType: 'wbs',                  linkType: 'screenToWbs',              linkStatus: 'reviewNeeded' }),
      link({ linkId: 'LNK-006', from: 'SCR-001', to: 'SSP-001', fromType: 'menuScreen',           toType: 'screenSpecification',  linkType: 'screenToScreenSpec',       linkStatus: 'draft' }),
      link({ linkId: 'LNK-007', from: 'REQ-001', to: 'TST-001', fromType: 'requirement',         toType: 'testScenario',         linkType: 'requirementToTestScenario', linkStatus: 'linked' })
    ];

    var changes = artifacts.map(function (a, i) {
      return change({ changeId: 'CHG-' + (i + 1), artifactId: a.artifactId, changeType: 'create', field: 'artifact', after: a.title });
    }).concat(links.map(function (l, i) {
      return change({ changeId: 'CHG-L' + (i + 1), artifactId: l.fromArtifactId, changeType: 'link', field: l.linkType, after: l.toArtifactId });
    }));

    return {
      project: { projectId: PROJECT_ID, name: 'Prototype Cycle Project', createdAt: nowIso(), createdBy: BY },
      artifacts: artifacts,
      links: links,
      changes: changes
    };
  }

  // CycleRepo 인터페이스만 사용해 저장한다.
  function seed(repo) {
    var data = buildSeed();
    var p = repo.saveProject ? repo.saveProject(data.project) : Promise.resolve();
    return Promise.resolve(p)
      .then(function () { return Promise.all(data.artifacts.map(function (a) { return repo.saveArtifact(a); })); })
      .then(function () { return Promise.all(data.links.map(function (l) { return repo.saveLink(l); })); })
      .then(function () { return Promise.all(data.changes.map(function (c) { return repo.appendChange(c); })); })
      .then(function () { return data; });
  }

  window.STAM_CYCLE = window.STAM_CYCLE || {};
  window.STAM_CYCLE.PROJECT_ID = PROJECT_ID;
  window.STAM_CYCLE.buildSeed = buildSeed;
  window.STAM_CYCLE.seed = seed;
}());
