/* ============================================================================
 * STAM Project Cycle DB Prototype — Requirement Import Generator (pure)
 * ----------------------------------------------------------------------------
 * 요구사항 표(row) 데이터를 입력으로 받아 6개 게시판(산출물) 초안 데이터와
 * 연결(link), 변경 기록(change)을 "생성"한다. DOM/저장소(repo)에 의존하지 않는
 * 순수 함수 모듈 — import-app.js 가 CycleRepo 로 저장한다.
 *
 * 게시판은 이미 존재한다는 전제다. 이 모듈은 게시판을 만들지 않고,
 * 게시판에 들어갈 "데이터 초안"만 생성한다. 모든 생성물은 draft / Review Needed.
 *
 * 실제 .xlsx 파서는 범위 밖. TSV/CSV 텍스트만 파싱한다(외부 라이브러리 없음).
 * IndexedDB schema/CycleRepo 인터페이스는 변경하지 않는다(객체 속성만 추가).
 * ==========================================================================*/
(function () {
  'use strict';

  var BY = 'prototype-user';
  var REQUIRED_COLS = ['requirementId', 'title'];
  var KNOWN_COLS = ['requirementId', 'title', 'description', 'priority', 'actor', 'requirementType', 'sourceNote'];

  function nowIso() { return new Date().toISOString(); }

  // ── TSV/CSV 파싱 (탭 우선, 없으면 콤마) ─────────────────────────
  function parseTable(text) {
    var lines = String(text == null ? '' : text).replace(/\r/g, '').split('\n')
      .filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return { headers: [], rows: [] };
    var delim = lines[0].indexOf('\t') > -1 ? '\t' : ',';
    var headers = lines[0].split(delim).map(function (h) { return h.trim(); });
    var rows = lines.slice(1).map(function (line, i) {
      var cells = line.split(delim);
      var obj = { __row: i + 2 }; // 1-based, +헤더
      headers.forEach(function (h, idx) { obj[h] = (cells[idx] || '').trim(); });
      return obj;
    });
    return { headers: headers, rows: rows };
  }

  // ── 검증 — 인식된 행 수 / 필수값 누락 / 입력 내 중복 ──────────────
  function validate(parsed) {
    var rows = parsed.rows || [];
    var missingRequired = [];
    var seen = {}, dupInInput = [];
    rows.forEach(function (r) {
      REQUIRED_COLS.forEach(function (c) {
        if (!r[c]) missingRequired.push({ row: r.__row, col: c });
      });
      var id = r.requirementId;
      if (id) {
        if (seen[id]) dupInInput.push({ row: r.__row, requirementId: id });
        seen[id] = true;
      }
    });
    var unknownCols = (parsed.headers || []).filter(function (h) { return KNOWN_COLS.indexOf(h) < 0; });
    return {
      recognized: rows.length,
      missingRequired: missingRequired,
      duplicateInInput: dupInInput,
      unknownColumns: unknownCols
    };
  }

  // ── 한 요구사항 행 → 6개 게시판 초안 + 링크 + 변경기록 ───────────
  function artifact(o, projectId, batchId) {
    var t = nowIso();
    return {
      artifactId: o.artifactId,
      projectId: projectId,
      artifactType: o.artifactType,
      title: o.title,
      description: o.description || '',
      status: 'draft',                       // 자동 생성 = 초안
      reviewStatus: 'Review Needed',         // 확정 아님
      owner: o.owner || '미지정',
      sourceType: o.sourceType || 'Requirement Import',
      sourceRef: o.sourceRef || '',
      customFields: o.customFields || {},
      createdAt: t, updatedAt: t, createdBy: BY, updatedBy: BY
    };
  }
  function link(o, projectId, batchId, reqId) {
    return {
      linkId: o.linkId,
      projectId: projectId,
      fromArtifactId: o.from, toArtifactId: o.to,
      fromType: o.fromType, toType: o.toType,
      linkType: o.linkType,
      linkStatus: o.linkStatus || 'reviewNeeded',
      // 추적용(스키마 변경 아님 — 객체 속성만 추가)
      importBatchId: batchId, requirementId: reqId,
      createdAt: nowIso(), createdBy: BY
    };
  }
  function change(o, projectId, batchId) {
    return {
      changeId: o.changeId,
      projectId: projectId,
      artifactId: o.artifactId,
      changeType: o.changeType,              // create | link
      field: o.field || '',
      before: null,
      after: o.after == null ? null : o.after,
      importBatchId: batchId,                // 추적용
      at: nowIso(), by: BY
    };
  }

  // rows -> { artifacts, links, changes, counts }
  function generate(rows, projectId, batchId) {
    var artifacts = [], links = [], changes = [];
    var seq = 0;
    function cid(prefix) { seq += 1; return prefix + '-' + batchId + '-' + seq; }

    rows.forEach(function (r) {
      var reqId = r.requirementId;
      var title = r.title;
      var srcRef = batchId + ':row' + (r.__row || '?');
      var cf = {
        importBatchId: batchId,
        sourceRow: r.__row,
        requirementId: reqId,
        priority: r.priority || '미지정',
        actor: r.actor || '미지정',
        requirementType: r.requirementType || '미지정',
        sourceNote: r.sourceNote || ''
      };

      // A. 요구사항
      var A = artifact({ artifactId: reqId, artifactType: 'requirement', title: title,
        description: r.description || '', sourceType: 'Requirement Import', sourceRef: srcRef, customFields: cf }, projectId, batchId);
      // B. 기능정의
      var B = artifact({ artifactId: reqId + '-FUN', artifactType: 'functionalDefinition',
        title: '[기능정의 초안] ' + title, description: '요구사항 "' + title + '"을 기준으로 기능정의 초안 작성이 필요합니다.',
        sourceType: 'Requirement Import', sourceRef: srcRef, customFields: cf }, projectId, batchId);
      // C. 메뉴/화면
      var C = artifact({ artifactId: reqId + '-SCR', artifactType: 'menuScreen',
        title: '[화면 후보] ' + title, description: '요구사항/기능정의 기준 화면 후보 초안.',
        sourceType: 'Requirement Import', sourceRef: srcRef, customFields: cf }, projectId, batchId);
      // D. WBS (3)
      var Ds = ['분석', '설계', '검증'].map(function (phase, i) {
        return artifact({ artifactId: reqId + '-WBS' + (i + 1), artifactType: 'wbs',
          title: '[WBS 초안] ' + title + ' ' + phase, description: phase + ' 작업 초안.',
          sourceType: 'Requirement Import', sourceRef: srcRef, customFields: cf }, projectId, batchId);
      });
      // E. 화면설계서
      var E = artifact({ artifactId: reqId + '-SSP', artifactType: 'screenSpecification',
        title: '[화면설계 초안] ' + title, description: '화면설계서 초안.',
        sourceType: 'Requirement Import', sourceRef: srcRef, customFields: cf }, projectId, batchId);
      // F. 테스트 시나리오 (2)
      var Fs = ['정상 케이스', '예외 케이스'].map(function (kind, i) {
        return artifact({ artifactId: reqId + '-TST' + (i + 1), artifactType: 'testScenario',
          title: '[테스트 초안] ' + title + ' ' + kind, description: kind + ' 테스트 초안.',
          sourceType: 'Requirement Import', sourceRef: srcRef, customFields: cf }, projectId, batchId);
      });

      var rowArtifacts = [A, B, C].concat(Ds).concat([E]).concat(Fs);
      rowArtifacts.forEach(function (a) {
        artifacts.push(a);
        changes.push(change({ changeId: cid('CHG'), artifactId: a.artifactId, changeType: 'create', field: a.artifactType, after: a.title }, projectId, batchId));
      });

      // 링크
      var rowLinks = [
        link({ linkId: cid('LNK'), from: A.artifactId, to: B.artifactId, fromType: 'requirement', toType: 'functionalDefinition', linkType: 'requirementToFunction' }, projectId, batchId, reqId),
        link({ linkId: cid('LNK'), from: B.artifactId, to: C.artifactId, fromType: 'functionalDefinition', toType: 'menuScreen', linkType: 'functionToScreen' }, projectId, batchId, reqId),
        link({ linkId: cid('LNK'), from: C.artifactId, to: E.artifactId, fromType: 'menuScreen', toType: 'screenSpecification', linkType: 'screenToScreenSpec' }, projectId, batchId, reqId)
      ];
      Ds.forEach(function (d) {
        rowLinks.push(link({ linkId: cid('LNK'), from: C.artifactId, to: d.artifactId, fromType: 'menuScreen', toType: 'wbs', linkType: 'screenToWbs' }, projectId, batchId, reqId));
      });
      Fs.forEach(function (f) {
        rowLinks.push(link({ linkId: cid('LNK'), from: A.artifactId, to: f.artifactId, fromType: 'requirement', toType: 'testScenario', linkType: 'requirementToTestScenario' }, projectId, batchId, reqId));
      });
      rowLinks.forEach(function (l) {
        links.push(l);
        changes.push(change({ changeId: cid('CHG'), artifactId: l.fromArtifactId, changeType: 'link', field: l.linkType, after: l.toArtifactId }, projectId, batchId));
      });
    });

    var counts = countByType(artifacts);
    counts.links = links.length;
    return { artifacts: artifacts, links: links, changes: changes, counts: counts };
  }

  function countByType(artifacts) {
    var c = { requirement: 0, functionalDefinition: 0, menuScreen: 0, wbs: 0, screenSpecification: 0, testScenario: 0 };
    artifacts.forEach(function (a) { if (c[a.artifactType] != null) c[a.artifactType] += 1; });
    return c;
  }

  // ── 샘플 요구사항 표 (TSV) ─────────────────────────────────────
  function sampleTsv() {
    return [
      ['requirementId', 'title', 'description', 'priority', 'actor', 'requirementType', 'sourceNote'].join('\t'),
      ['REQ-101', '로그인 2차 인증', 'OTP 기반 2차 인증을 지원한다.', '상', '사용자', '기능', '보안팀 요청'].join('\t'),
      ['REQ-102', '권한 관리', '관리자/일반 권한을 구분한다.', '중', '관리자', '기능', '고객 PM'].join('\t'),
      ['REQ-103', '게시판 목록 검색', '게시판 목록에 검색/필터를 제공한다.', '중', '사용자', '기능', '회의록 3p'].join('\t')
    ].join('\n');
  }

  window.STAM_CYCLE = window.STAM_CYCLE || {};
  window.STAM_CYCLE.generator = {
    parseTable: parseTable,
    validate: validate,
    generate: generate,
    countByType: countByType,
    sampleTsv: sampleTsv,
    REQUIRED_COLS: REQUIRED_COLS.slice(),
    KNOWN_COLS: KNOWN_COLS.slice()
  };
}());
