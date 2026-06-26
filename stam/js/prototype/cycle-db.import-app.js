/* ============================================================================
 * STAM Project Cycle DB Prototype — Requirement Import 화면 로직 (v2 저장)
 * ----------------------------------------------------------------------------
 * 요구사항 표 데이터(Excel/TSV/CSV 또는 샘플)를 가져와 generator 로 6개 게시판
 * 초안 데이터 + 링크 + 변경기록을 만들고, Local Core DB v2(STAM_CORE.db)의
 * 게시판별 store 에 저장한다(통합 artifacts 아님). import 이력(importBatches/
 * importRows)도 함께 기록하고, 생성물에 importBatchId/importRowId/requirementId 를
 * 보존한다. 게시판은 이미 존재한다는 전제 — 이 화면은 "데이터 생성 자동화"만 검증.
 * 모든 생성물은 초안(draft) / 검토 필요(Review Needed). 자동 seed/clear 없음.
 * ==========================================================================*/
(function () {
  'use strict';

  var gen = window.STAM_CYCLE && window.STAM_CYCLE.generator;
  var core = window.STAM_CORE || {};
  var db = core.db;          // v2 Local Core DB (게시판별 store)
  var schema = core.schema;  // v2 논리 구조 상수
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
    return db.listRecords('requirements', PID).then(function (existing) {
      var existIds = {};
      existing.forEach(function (a) { var rid = a.requirementId || a.id; if (rid) existIds[rid] = true; });
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

      // 1) import 이력: 원본 row 마다 importRows (reqId → importRowId 매핑)
      var rowIdOf = {};
      var importRows = valid.map(function (r) {
        var rid = bid + '-row' + (r.__row || 0);
        rowIdOf[r.requirementId] = rid;
        return {
          importRowId: rid, importBatchId: bid, projectId: PID,
          requirementId: r.requirementId, sourceRow: r.__row,
          raw: {
            requirementId: r.requirementId, title: r.title, description: r.description || '',
            priority: r.priority || '', actor: r.actor || '',
            requirementType: r.requirementType || '', sourceNote: r.sourceNote || ''
          },
          status: schema.STATUS.ACTIVE
        };
      });

      // 2) generator 재사용 — 요구사항 1건당 생성 개수/링크 기준 그대로 유지
      var out = gen.generate(valid, PID, bid);

      // 3) artifact → v2 게시판별 store record 로 변환 (추적 ID 보존)
      var records = out.artifacts.map(function (a) {
        var store = schema.ARTIFACT_TYPE_TO_STORE[a.artifactType];
        var cf = a.customFields || {};
        var reqId = cf.requirementId || '';
        return {
          store: store,
          rec: {
            id: a.artifactId,
            projectId: a.projectId,
            boardType: a.artifactType,
            requirementId: reqId,
            importBatchId: bid,
            importRowId: rowIdOf[reqId] || '',
            title: a.title,
            description: a.description || '',
            status: a.status,                 // draft
            reviewStatus: a.reviewStatus,     // Review Needed
            owner: a.owner || '미지정',
            sourceType: a.sourceType || 'Requirement Import',
            sourceRef: a.sourceRef || '',
            priority: cf.priority || '',
            actor: cf.actor || '',
            requirementType: cf.requirementType || '',
            sourceNote: cf.sourceNote || '',
            customFields: cf
          }
        };
      });

      // 4) 링크에 importRowId 보강 (requirementId 는 generator 가 이미 보존)
      var links = out.links.map(function (l) { l.importRowId = rowIdOf[l.requirementId] || ''; return l; });

      // 5) 저장: importBatch → importRows → 게시판별 record → links → changes
      return db.createImportBatch({
        importBatchId: bid, projectId: PID, source: 'Requirement Import',
        rowCount: valid.length, artifactCount: out.artifacts.length, linkCount: out.links.length,
        status: schema.STATUS.ACTIVE
      })
        .then(function () { return Promise.all(importRows.map(function (r) { return db.saveImportRow(r); })); })
        .then(function () { return Promise.all(records.map(function (x) { return db.createRecord(x.store, x.rec); })); })
        .then(function () { return Promise.all(links.map(function (l) { return db.saveLink(l); })); })
        .then(function () { return Promise.all(out.changes.map(function (c) { return db.appendChange(c); })); })
        .then(function () { return renderResult(bid, valid.length); })
        .then(function () {
          $('imp-status').innerHTML = '<strong>생성 완료</strong> — importBatchId <code>' + esc(bid) + '</code> · 유효 요구사항 ' + valid.length +
            '건 → 산출물 ' + out.artifacts.length + '개 · 연결 ' + out.links.length +
            '개를 v2 게시판별 store 에 저장했습니다. 새로고침해도 유지됩니다.';
        });
    }).catch(function (e) { $('imp-status').textContent = '생성 오류: ' + e.message; });
  }

  // ── 결과 렌더 (v2 store 에서 importBatchId 로 다시 조회 — 영속 검증 겸함) ──
  function renderResult(bid, reqCount) {
    var storeNames = schema.BOARD_STORES;
    var jobs = storeNames.map(function (s) { return db.listRecords(s, PID); });
    jobs.push(db.listRecords('artifactLinks', PID));
    return Promise.all(jobs).then(function (res) {
      var links = res[res.length - 1].filter(function (l) { return l.importBatchId === bid; });
      var byStore = {};
      storeNames.forEach(function (s, i) {
        byStore[s] = res[i].filter(function (a) { return a.importBatchId === bid; });
      });

      $('imp-summary').innerHTML =
        cell('생성된 요구사항', byStore.requirements.length) +
        cell('생성된 기능정의', byStore.functionalDefinitions.length) +
        cell('생성된 메뉴/화면', byStore.menuScreens.length) +
        cell('생성된 WBS', byStore.wbsItems.length) +
        cell('생성된 화면설계서', byStore.screenSpecifications.length) +
        cell('생성된 테스트 시나리오', byStore.testScenarios.length) +
        cell('생성된 연결', links.length);

      var html = '';
      storeNames.forEach(function (s) {
        var rows = byStore[s];
        if (!rows.length) return;
        var label = (schema.BOARD_META[s] && schema.BOARD_META[s].label) || s;
        html += '<p class="mcrd-body"><strong>' + esc(label) + ' 게시판</strong> — ' + rows.length + '건 · <span class="mono">' + esc(s) + '</span></p>';
        html += '<table class="stbl"><thead><tr><th>id</th><th>title</th><th>상태</th><th>원본 요구사항</th></tr></thead><tbody>' +
          rows.map(function (a) {
            return '<tr><td class="mono">' + esc(a.id) + '</td><td>' + esc(a.title) + '</td><td>' + statusBadges(a) +
              '</td><td class="mono">' + esc(a.requirementId || '') + '</td></tr>';
          }).join('') + '</tbody></table>';
      });
      $('imp-result').innerHTML = html || '<p class="mcrd-body">생성된 데이터가 없습니다.</p>';
    });
  }

  function cell(k, v) {
    return '<div class="meta-cell"><span class="meta-k">' + esc(k) + '</span><span class="meta-v code">' + esc(v) + '</span></div>';
  }

  // ── 헤더 매핑 (한글/영문 → canonical) ──────────────────────────
  var HEADER_MAP = {
    'requirementid': 'requirementId', 'title': 'title', 'description': 'description',
    'priority': 'priority', 'actor': 'actor', 'requirementtype': 'requirementType', 'sourcenote': 'sourceNote',
    '요구사항id': 'requirementId', '요구사항 id': 'requirementId', '요구사항아이디': 'requirementId',
    '제목': 'title', '요구사항명': 'title', '요구사항 명': 'title',
    '설명': 'description', '내용': 'description',
    '우선순위': 'priority',
    '사용자': 'actor', '행위자': 'actor',
    '유형': 'requirementType', '요구사항유형': 'requirementType', '요구사항 유형': 'requirementType',
    '비고': 'sourceNote', '출처': 'sourceNote'
  };
  function mapHeader(h) {
    var k = String(h == null ? '' : h).trim();
    var canon = HEADER_MAP[k.toLowerCase()] || HEADER_MAP[k];
    return canon || k; // 매핑 없으면 원본 유지(이후 unknownColumns 로 표시)
  }
  function cleanCell(s) {
    // TSV 무결성 유지를 위해 셀 내 탭/개행 제거
    return String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
  }

  // aoa(2차원 배열) → { tsv, headers, dataCount } / 오류는 throw(code 포함)
  function aoaToTsv(aoa) {
    var rows = (aoa || []).filter(function (r) {
      return r && r.some(function (c) { return cleanCell(c) !== ''; });
    });
    if (!rows.length) { throw withCode('EMPTY', '빈 파일입니다. 데이터가 없습니다.'); }
    var rawHeaders = rows[0];
    if (!rawHeaders || !rawHeaders.length || !rawHeaders.some(function (c) { return cleanCell(c) !== ''; })) {
      throw withCode('NO_HEADER', '헤더 행이 없습니다. 첫 행에 컬럼명을 넣어주세요.');
    }
    var headers = rawHeaders.map(mapHeader);
    if (headers.indexOf('requirementId') < 0 || headers.indexOf('title') < 0) {
      throw withCode('NO_REQUIRED', '필수 컬럼(requirementId·title)을 찾을 수 없습니다. ' +
        '헤더에 requirementId/title (또는 요구사항ID/제목) 컬럼을 포함해주세요.');
    }
    var dataRows = rows.slice(1);
    var lines = [headers.map(cleanCell).join('\t')];
    dataRows.forEach(function (r) {
      var arr = [];
      for (var i = 0; i < headers.length; i++) arr.push(cleanCell(r[i]));
      lines.push(arr.join('\t'));
    });
    return { tsv: lines.join('\n'), headers: headers, dataCount: dataRows.length };
  }
  function withCode(code, msg) { var e = new Error(msg); e.code = code; return e; }

  function showFileStatus(html, kind) {
    var el = $('imp-file-status');
    if (!el) return;
    el.style.display = '';
    el.className = 'ibox ' + (kind === 'err' ? 'warn' : 'info');
    el.innerHTML = html;
  }

  // ── 파일 업로드 처리 ──────────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    var name = file.name || '';
    var lower = name.toLowerCase();
    var isText = /\.(csv|tsv)$/.test(lower);
    var isXls = /\.xls$/.test(lower);
    var isXlsx = /\.xlsx$/.test(lower);
    showFileStatus('파일 읽는 중… <code>' + esc(name) + '</code>', 'info');

    if (isText) {
      var fr = new FileReader();
      fr.onerror = function () { showFileStatus('파일을 읽을 수 없습니다: <code>' + esc(name) + '</code>', 'err'); };
      fr.onload = function () {
        var text = String(fr.result || '');
        if (!text.trim()) { showFileStatus('빈 파일입니다: <code>' + esc(name) + '</code>', 'err'); return; }
        // CSV/TSV 는 그대로 텍스트 입력 영역에 채운다(기존 흐름 재사용)
        $('imp-input').value = text.replace(/\r/g, '');
        var lineCount = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; }).length;
        var dataCount = Math.max(0, lineCount - 1);
        showFileStatus('파일 <code>' + esc(name) + '</code> 읽기 완료 · 형식 ' +
          (lower.indexOf('.tsv') > -1 ? 'TSV' : 'CSV') + ' · 데이터 ' + dataCount + '행 인식. ' +
          '<strong>미리보기</strong>를 눌러 확인하세요.', 'info');
        $('imp-status').innerHTML = '파일에서 입력을 불러왔습니다 — <strong>미리보기</strong>를 누르세요.';
        doPreview();
      };
      fr.readAsText(file);
      return;
    }

    if (isXls) {
      showFileStatus('<strong>구버전 <code>.xls</code>(바이너리)는 이번 단계에서 지원하지 않습니다.</strong> ' +
        '엑셀에서 <code>.xlsx</code> 또는 <code>.csv</code> 로 저장 후 다시 업로드해주세요.', 'err');
      return;
    }

    if (isXlsx) {
      var xlsx = window.STAM_CYCLE && window.STAM_CYCLE.xlsx;
      if (!xlsx) { showFileStatus('엑셀 파서 모듈 로드 실패.', 'err'); return; }
      xlsx.readFile(file).then(function (res) {
        var conv;
        try { conv = aoaToTsv(res.aoa); }
        catch (e) {
          showFileStatus('엑셀 변환 오류 — ' + esc(e.message) +
            ' <br>(파일 <code>' + esc(name) + '</code> · 시트 <code>' + esc(res.sheetName) + '</code>)', 'err');
          return;
        }
        $('imp-input').value = conv.tsv;
        showFileStatus('파일 <code>' + esc(name) + '</code> · 시트 <code>' + esc(res.sheetName) + '</code> · ' +
          '인식 데이터 <strong>' + conv.dataCount + '행</strong> · 컬럼 <code>' + esc(conv.headers.join(', ')) + '</code> ' +
          '→ 입력 영역에 반영했습니다. 필요 시 직접 수정 후 <strong>미리보기</strong>를 누르세요.', 'info');
        $('imp-status').innerHTML = '엑셀에서 ' + conv.dataCount + '행을 변환했습니다 — <strong>미리보기</strong>를 누르세요.';
        doPreview();
      }).catch(function (e) {
        var code = e && e.code;
        var msg = (code === 'NOT_ZIP') ? '엑셀(.xlsx) 형식이 아니거나 손상된 파일입니다.'
          : (code === 'NO_SHEET') ? '시트를 찾을 수 없습니다.'
            : (code === 'UNSUPPORTED') ? (e.message || '지원하지 않는 파일입니다.')
              : ('파일을 읽을 수 없습니다 — ' + (e && e.message || ''));
        showFileStatus(esc(msg) + ' <br>(<code>' + esc(name) + '</code>)', 'err');
      });
      return;
    }

    showFileStatus('지원하지 않는 파일 형식입니다: <code>' + esc(name) + '</code> ' +
      '(.xlsx / .csv / .tsv 를 사용해주세요).', 'err');
  }

  function init() {
    if (!db || !schema || !gen) { $('imp-status').textContent = 'core-db / generator 모듈 로드 실패'; return; }
    $('btn-sample').addEventListener('click', function () {
      $('imp-input').value = gen.sampleTsv();
      $('imp-status').innerHTML = '샘플 데이터를 불러왔습니다 — <strong>미리보기</strong>를 누르세요.';
    });
    var fileEl = $('imp-file');
    if (fileEl) {
      fileEl.addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0];
        handleFile(f);
      });
    }
    $('btn-preview').addEventListener('click', function () { doPreview(); });
    $('btn-generate').addEventListener('click', function () { doGenerate(); });
    // 명시적 초기화(사용자 버튼) — v2 store 만 비운다. v1 DB 는 건드리지 않음.
    // 자동 호출 없음 · deleteDatabase 미사용 · 자동 seed 없음.
    $('btn-reset').addEventListener('click', function () {
      db.clearStoresExplicit().then(function () {
        $('imp-result').innerHTML = '';
        $('imp-summary').innerHTML = '';
        $('imp-preview').innerHTML = '';
        $('imp-status').innerHTML = 'Local Core DB v2 의 데이터를 비웠습니다(명시적 초기화). v1 데이터는 보존됩니다.';
      }).catch(function (e) { $('imp-status').textContent = '초기화 오류: ' + e.message; });
    });

    // 최초: v2 저장 상태 안내 (자동 생성/seed 없음)
    db.listRecords('requirements', PID).then(function (a) {
      $('imp-status').innerHTML = a.length
        ? '현재 v2 요구사항 store 에 <strong>' + a.length + '</strong>건이 저장되어 있습니다. 샘플/CSV/Excel 후 생성하거나, <a href="matrix.html">요구사항 누락 검증표</a>를 보세요.'
        : '샘플 데이터 불러오기(또는 CSV/Excel 업로드) → 미리보기 → 6개 게시판 초안 생성 순서로 진행하세요.';
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
