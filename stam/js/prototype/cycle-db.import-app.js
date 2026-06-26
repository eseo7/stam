/* ============================================================================
 * STAM Project Cycle DB Prototype — Requirement Import 화면 로직
 * ----------------------------------------------------------------------------
 * 요구사항 표 데이터(TSV/CSV 붙여넣기 또는 샘플)를 가져와 generator 로 6개 게시판
 * 초안 데이터 + 링크 + 변경기록을 만들고, 기존 CycleRepo(LocalRepo)로 저장한다.
 * 게시판은 이미 존재한다는 전제 — 이 화면은 "데이터 생성 자동화"만 검증한다.
 * 모든 생성물은 초안(draft) / 검토 필요(Review Needed).
 * ==========================================================================*/
(function () {
  'use strict';

  var repo = window.STAM_CYCLE && window.STAM_CYCLE.LocalRepo;
  var gen = window.STAM_CYCLE && window.STAM_CYCLE.generator;
  var PID = (window.STAM_CYCLE && window.STAM_CYCLE.PROJECT_ID) || 'proto-proj-001';

  var TYPE_LABEL = {
    requirement: '요구사항',
    functionalDefinition: '기능정의',
    menuScreen: '메뉴/화면',
    wbs: 'WBS',
    screenSpecification: '화면설계서',
    testScenario: '테스트 시나리오'
  };
  var TYPE_ORDER = ['requirement', 'functionalDefinition', 'menuScreen', 'wbs', 'screenSpecification', 'testScenario'];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function batchId() { return 'imp_' + Date.now(); }

  function statusBadges(a) {
    var s = a.status === 'draft' ? '<span class="sbadge guide">초안(Draft)</span>' : '<span class="mono">' + esc(a.status) + '</span>';
    var r = a.reviewStatus === 'Review Needed' ? '<span class="sbadge plan">검토 필요(Review Needed)</span>' : '<span class="mono">' + esc(a.reviewStatus) + '</span>';
    return s + ' ' + r;
  }

  // ── 미리보기 ────────────────────────────────────────────────
  function doPreview() {
    var text = $('imp-input').value;
    var parsed = gen.parseTable(text);
    var v = gen.validate(parsed);
    return repo.listArtifacts(PID).then(function (existing) {
      var existIds = {};
      existing.forEach(function (a) { if (a.artifactType === 'requirement') existIds[a.artifactId] = true; });
      var dupExisting = parsed.rows.filter(function (r) { return r.requirementId && existIds[r.requirementId]; })
        .map(function (r) { return { row: r.__row, requirementId: r.requirementId }; });

      var html = '';
      html += '<div class="meta-row">' +
        cell('인식된 요구사항 행', v.recognized) +
        cell('필수값 누락', v.missingRequired.length) +
        cell('입력 내 중복 ID', v.duplicateInInput.length) +
        cell('기존과 중복 ID', dupExisting.length) +
        '</div>';
      if (v.unknownColumns.length) {
        html += '<p class="mcrd-body">알 수 없는 컬럼(무시됨): <code>' + esc(v.unknownColumns.join(', ')) + '</code></p>';
      }
      if (v.missingRequired.length || v.duplicateInInput.length || dupExisting.length) {
        html += '<div class="ibox warn"><strong>제외 대상</strong> 필수값(requirementId·title) 누락 행과 중복 requirementId 행은 ' +
          '<strong>생성에서 제외</strong>됩니다(이번 PR 단순 처리 — 병합 없음).</div>';
      }
      // 미리보기 테이블
      if (parsed.rows.length) {
        html += '<table class="stbl"><thead><tr><th>행</th><th>requirementId</th><th>title</th><th>priority</th><th>상태</th></tr></thead><tbody>' +
          parsed.rows.map(function (r) {
            var bad = !r.requirementId || !r.title;
            var dup = (existIds[r.requirementId]) || parsed.rows.filter(function (x) { return x.requirementId === r.requirementId; }).length > 1;
            var st = bad ? '<span class="mono">제외(필수값 누락)</span>' : (dup ? '<span class="mono">제외(중복 ID)</span>' : '<span class="sbadge done">생성 대상</span>');
            return '<tr><td class="mono">' + esc(r.__row) + '</td><td>' + esc(r.requirementId) + '</td><td>' + esc(r.title) + '</td><td>' + esc(r.priority) + '</td><td>' + st + '</td></tr>';
          }).join('') + '</tbody></table>';
      } else {
        html += '<p class="mcrd-body">붙여넣은 데이터가 없습니다. <strong>샘플 데이터 불러오기</strong>를 눌러보세요.</p>';
      }
      $('imp-preview').innerHTML = html;
      $('imp-status').innerHTML = '미리보기 완료 — 생성 대상 행을 확인한 뒤 <strong>6개 게시판 초안 생성</strong>을 누르세요.';
      return { parsed: parsed, validation: v, dupExisting: dupExisting, existIds: existIds };
    });
  }

  // ── 생성 ────────────────────────────────────────────────────
  function doGenerate() {
    $('imp-status').textContent = '생성 중…';
    return doPreview().then(function (ctx) {
      // 유효 행만: 필수값 있고, 입력내/기존 중복 아님
      var counts = {};
      var valid = ctx.parsed.rows.filter(function (r) {
        if (!r.requirementId || !r.title) return false;
        counts[r.requirementId] = (counts[r.requirementId] || 0) + 1;
        return true;
      }).filter(function (r) {
        return counts[r.requirementId] === 1 && !ctx.existIds[r.requirementId];
      });

      if (!valid.length) {
        $('imp-status').innerHTML = '<strong>생성할 유효한 요구사항 행이 없습니다.</strong> (필수값 누락/중복 제외 후 0건)';
        return;
      }
      var bid = batchId();
      var out = gen.generate(valid, PID, bid);

      var p = repo.saveProject ? repo.saveProject({ projectId: PID, name: 'Prototype Cycle Project', createdAt: new Date().toISOString(), createdBy: 'prototype-user' }) : Promise.resolve();
      return Promise.resolve(p)
        .then(function () { return Promise.all(out.artifacts.map(function (a) { return repo.saveArtifact(a); })); })
        .then(function () { return Promise.all(out.links.map(function (l) { return repo.saveLink(l); })); })
        .then(function () { return Promise.all(out.changes.map(function (c) { return repo.appendChange(c); })); })
        .then(function () { return renderResult(bid, valid.length); })
        .then(function () {
          $('imp-status').innerHTML = '<strong>생성 완료</strong> — importBatchId <code>' + esc(bid) + '</code> · 유효 요구사항 ' + valid.length +
            '건 → 산출물 ' + out.artifacts.length + '개 · 연결 ' + out.links.length + '개. 새로고침해도 유지됩니다.';
        });
    }).catch(function (e) { $('imp-status').textContent = '생성 오류: ' + e.message; });
  }

  // ── 결과 렌더 (저장소에서 importBatchId 로 다시 조회 — 영속 검증 겸함) ──
  function renderResult(bid, reqCount) {
    return Promise.all([repo.listArtifacts(PID), repo.listLinks(PID)]).then(function (res) {
      var artifacts = res[0], links = res[1];
      var mine = artifacts.filter(function (a) { return a.customFields && a.customFields.importBatchId === bid; });
      var myLinks = links.filter(function (l) { return l.importBatchId === bid; });

      // summary
      var c = gen.countByType(mine);
      $('imp-summary').innerHTML =
        cell('생성된 요구사항', c.requirement) +
        cell('생성된 기능정의', c.functionalDefinition) +
        cell('생성된 메뉴/화면', c.menuScreen) +
        cell('생성된 WBS', c.wbs) +
        cell('생성된 화면설계서', c.screenSpecification) +
        cell('생성된 테스트 시나리오', c.testScenario) +
        cell('생성된 연결', myLinks.length);

      // sections by type
      var html = '';
      TYPE_ORDER.forEach(function (t) {
        var rows = mine.filter(function (a) { return a.artifactType === t; });
        if (!rows.length) return;
        html += '<p class="mcrd-body"><strong>' + esc(TYPE_LABEL[t]) + ' 게시판</strong> — ' + rows.length + '건</p>';
        html += '<table class="stbl"><thead><tr><th>artifactId</th><th>title</th><th>상태</th><th>원본 요구사항</th></tr></thead><tbody>' +
          rows.map(function (a) {
            var reqId = (a.customFields && a.customFields.requirementId) || '';
            return '<tr><td class="mono">' + esc(a.artifactId) + '</td><td>' + esc(a.title) + '</td><td>' + statusBadges(a) +
              '</td><td class="mono">' + esc(reqId) + '</td></tr>';
          }).join('') + '</tbody></table>';
      });
      $('imp-result').innerHTML = html || '<p class="mcrd-body">생성된 데이터가 없습니다.</p>';
    });
  }

  function cell(k, v) {
    return '<div class="meta-cell"><span class="meta-k">' + esc(k) + '</span><span class="meta-v code">' + esc(v) + '</span></div>';
  }

  function init() {
    if (!repo || !gen) { $('imp-status').textContent = 'prototype 모듈 로드 실패'; return; }
    $('btn-sample').addEventListener('click', function () {
      $('imp-input').value = gen.sampleTsv();
      $('imp-status').innerHTML = '샘플 데이터를 불러왔습니다 — <strong>미리보기</strong>를 누르세요.';
    });
    $('btn-preview').addEventListener('click', function () { doPreview(); });
    $('btn-generate').addEventListener('click', function () { doGenerate(); });
    $('btn-reset').addEventListener('click', function () {
      repo.reset().then(function () {
        $('imp-result').innerHTML = '';
        $('imp-summary').innerHTML = '';
        $('imp-preview').innerHTML = '';
        $('imp-status').innerHTML = '로컬 DB의 prototype 데이터를 모두 삭제했습니다.';
      }).catch(function (e) { $('imp-status').textContent = '초기화 오류: ' + e.message; });
    });

    // 최초: 기존 저장 상태 안내
    repo.listArtifacts(PID).then(function (a) {
      $('imp-status').innerHTML = a.length
        ? '현재 로컬 DB에 산출물 <strong>' + a.length + '</strong>개가 저장되어 있습니다. 샘플/붙여넣기 후 생성하거나, <a href="matrix.html">요구사항 누락 검증표</a>에서 연결 상태를 보세요.'
        : '샘플 데이터 불러오기 → 미리보기 → 6개 게시판 초안 생성 순서로 진행하세요.';
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
