/* ============================================================================
 * STAM Project Cycle DB Prototype — Matrix screen logic
 * ----------------------------------------------------------------------------
 * 화면 로직은 CycleRepo 인터페이스(STAM_CYCLE.LocalRepo)만 호출한다.
 * Missing 은 저장하지 않고 기대 link 경로 대비 실제 link 를 계산해 표시한다.
 * ==========================================================================*/
(function () {
  'use strict';

  var repo = window.STAM_CYCLE && window.STAM_CYCLE.LocalRepo;
  var PID = window.STAM_CYCLE && window.STAM_CYCLE.PROJECT_ID;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // linkStatus -> 표시 배지 (한글 우선 · 영문 병기, 기존 docs/component class 만 사용)
  // status 키(logic)는 그대로 두고 표시 텍스트만 한글화한다.
  function statusCell(status) {
    if (!status || status === 'missing') return '<span class="mono">연결 누락(Missing)</span>';
    if (status === 'linked') return '<span class="sbadge done">연결됨(Linked)</span>';
    if (status === 'reviewNeeded') return '<span class="sbadge plan">검토 필요(Review Needed)</span>';
    if (status === 'draft') return '<span class="sbadge guide">초안(Draft)</span>';
    if (status === 'changed') return '<span class="sbadge lock">변경됨(Changed)</span>';
    if (status === 'outOfScope') return '<span class="mono">범위 외(Out of Scope)</span>';
    return '<span class="mono">' + esc(status) + '</span>';
  }

  // 여러 link status 중 대표값(약한 순으로) 선택
  function weakest(statuses) {
    var order = ['missing', 'draft', 'reviewNeeded', 'changed', 'linked', 'outOfScope'];
    var best = null, bestIdx = 999;
    statuses.forEach(function (s) {
      var i = order.indexOf(s);
      if (i > -1 && i < bestIdx) { bestIdx = i; best = s; }
    });
    return best;
  }

  function indexLinks(links) {
    // fromArtifactId + linkType -> link[]
    var byFromType = {};
    links.forEach(function (l) {
      var k = l.fromArtifactId + '|' + l.linkType;
      (byFromType[k] = byFromType[k] || []).push(l);
    });
    return byFromType;
  }

  function firstLink(map, fromId, linkType) {
    var arr = map[fromId + '|' + linkType];
    return arr && arr.length ? arr[0] : null;
  }
  function allLinks(map, fromId, linkType) {
    return map[fromId + '|' + linkType] || [];
  }

  // 요구사항 1행의 stage별 연결 상태를 계산한다.
  function computeRow(req, map) {
    var row = { req: req, func: 'missing', screen: 'missing', wbs: 'missing', spec: 'missing', test: 'missing', wbsCount: 0 };

    var fLink = firstLink(map, req.artifactId, 'requirementToFunction');
    if (fLink) {
      row.func = fLink.linkStatus;
      var sLink = firstLink(map, fLink.toArtifactId, 'functionToScreen');
      if (sLink) {
        row.screen = sLink.linkStatus;
        var screenId = sLink.toArtifactId;
        var wbsLinks = allLinks(map, screenId, 'screenToWbs');
        row.wbsCount = wbsLinks.length;
        if (wbsLinks.length) row.wbs = weakest(wbsLinks.map(function (l) { return l.linkStatus; }));
        var spLink = firstLink(map, screenId, 'screenToScreenSpec');
        if (spLink) row.spec = spLink.linkStatus;
      }
    }
    var tLink = firstLink(map, req.artifactId, 'requirementToTestScenario');
    if (tLink) row.test = tLink.linkStatus;

    return row;
  }

  function render(data) {
    var artifacts = data.artifacts, links = data.links, changes = data.changes;
    var hasData = artifacts.length > 0;

    // status line (사용자 확인용 — projectId 는 보조 정보로 낮춤)
    $('proto-status').innerHTML = hasData
      ? '저장된 산출물 <strong>' + artifacts.length + '</strong>개 · 연결 정보 <strong>' + links.length +
        '</strong>개 · 변경 기록 <strong>' + changes.length + '</strong>건 ' +
        '<span class="mono">(projectId ' + esc(PID) + ')</span>'
      : '아직 저장된 데이터가 없습니다 — <strong>① 시드 생성</strong>을 눌러 샘플 요구사항과 산출물 연결을 만드세요.';

    var reqs = artifacts.filter(function (a) { return a.artifactType === 'requirement'; });
    var map = indexLinks(links);
    var rows = reqs.map(function (r) { return computeRow(r, map); });

    // summary
    var missingCount = rows.filter(function (r) {
      return [r.func, r.screen, r.wbs, r.spec, r.test].indexOf('missing') > -1;
    }).length;
    var fullyLinked = rows.filter(function (r) {
      return [r.func, r.screen, r.wbs, r.spec, r.test].every(function (s) { return s !== 'missing'; });
    }).length;
    var reviewCount = rows.filter(function (r) {
      return [r.func, r.screen, r.wbs, r.spec, r.test].indexOf('reviewNeeded') > -1;
    }).length;
    var changedCount = rows.filter(function (r) {
      return [r.func, r.screen, r.wbs, r.spec, r.test].indexOf('changed') > -1;
    }).length;

    $('proto-summary').innerHTML =
      cell('전체 요구사항', reqs.length) +
      cell('주요 산출물 연결됨', fullyLinked) +
      cell('산출물 누락', missingCount) +
      cell('검토 필요', reviewCount) +
      cell('변경 영향', changedCount) +
      cell('전체 산출물', artifacts.length);

    // matrix table
    if (!reqs.length) {
      $('proto-matrix').innerHTML = '<p class="mcrd-body">표시할 요구사항이 없습니다.</p>';
    } else {
      var head = '<thead><tr><th>요구사항</th><th>기능정의</th><th>메뉴/화면</th>' +
        '<th>WBS</th><th>화면설계서</th><th>테스트 시나리오</th><th>검토 상태</th></tr></thead>';
      var body = rows.map(function (r) {
        var wbsCell = statusCell(r.wbs) + (r.wbsCount > 1 ? ' <span class="mono">(' + r.wbsCount + ')</span>' : '');
        return '<tr>' +
          '<td>' + esc(r.req.artifactId) + ' ' + esc(r.req.title) + '</td>' +
          '<td>' + statusCell(r.func) + '</td>' +
          '<td>' + statusCell(r.screen) + '</td>' +
          '<td>' + wbsCell + '</td>' +
          '<td>' + statusCell(r.spec) + '</td>' +
          '<td>' + statusCell(r.test) + '</td>' +
          '<td>' + esc(r.req.reviewStatus) + '</td>' +
          '</tr>';
      }).join('');
      $('proto-matrix').innerHTML = '<table class="stbl">' + head + '<tbody>' + body + '</tbody></table>';
    }

    // changes (변경 기록 — 보조 영역)
    if (!changes.length) {
      $('proto-changes').innerHTML = '<p class="mcrd-body">변경 기록 없음.</p>';
    } else {
      var recent = changes.slice(-8).reverse();
      $('proto-changes').innerHTML = '<table class="stbl"><thead><tr><th>시각</th><th>산출물</th>' +
        '<th>유형</th><th>항목</th><th>내용</th></tr></thead><tbody>' +
        recent.map(function (c) {
          return '<tr><td class="mono">' + esc((c.at || '').replace('T', ' ').slice(0, 19)) + '</td>' +
            '<td>' + esc(c.artifactId) + '</td><td>' + esc(c.changeType) + '</td>' +
            '<td>' + esc(c.field) + '</td><td>' + esc(c.after) + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="mcrd-body">총 변경 기록 ' + changes.length + '건 (최근 8건 표시).</p>';
    }
  }

  function cell(k, v) {
    return '<div class="meta-cell"><span class="meta-k">' + esc(k) + '</span><span class="meta-v code">' + esc(v) + '</span></div>';
  }

  function loadAndRender() {
    return Promise.all([repo.listArtifacts(PID), repo.listLinks(PID), repo.listChanges(PID)])
      .then(function (res) { render({ artifacts: res[0], links: res[1], changes: res[2] }); });
  }

  function setBusy(busy, msg) {
    var s = $('proto-status');
    if (busy && s) s.innerHTML = esc(msg || '처리 중…');
  }

  function init() {
    if (!repo) {
      $('proto-status').textContent = 'CycleRepo(LocalRepo) 로드 실패';
      return;
    }
    $('btn-seed').addEventListener('click', function () {
      setBusy(true, '시드 생성 중…');
      // 재생성 시 중복 방지를 위해 초기화 후 시드
      repo.reset()
        .then(function () { return window.STAM_CYCLE.seed(repo); })
        .then(loadAndRender)
        .catch(function (e) { $('proto-status').textContent = '시드 오류: ' + e.message; });
    });
    $('btn-reset').addEventListener('click', function () {
      setBusy(true, '초기화 중…');
      repo.reset().then(loadAndRender)
        .catch(function (e) { $('proto-status').textContent = '초기화 오류: ' + e.message; });
    });
    $('btn-reload').addEventListener('click', function () {
      setBusy(true, '다시 불러오는 중…');
      loadAndRender().catch(function (e) { $('proto-status').textContent = '조회 오류: ' + e.message; });
    });

    // 최초 로드 — 저장된 데이터를 그대로 조회(재로드 유지 검증)
    loadAndRender().catch(function (e) { $('proto-status').textContent = '초기 조회 오류: ' + e.message; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
