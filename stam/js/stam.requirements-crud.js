/* ============================================================================
 * STAM 요구사항 게시판 — Local Core DB v2 CRUD 연결
 * ----------------------------------------------------------------------------
 * 기존 요구사항 화면(목록 + 등록/상세/수정 Drawer)을 Local Core DB v2
 * (stam-core-local-db-v1 · requirements store)에 연결한다.
 *   - 등록: 직접 입력 → requirements insert (sourceType=manual)
 *   - 상세: 행 클릭 → record 내용/추적ID(importBatchId/requirementId/상태) 표시
 *   - 수정: 필드 저장 → updateRecord + artifactChanges append (updatedAt 갱신)
 *   - 삭제: soft delete (status=deleted) — 물리 삭제 금지, 변경이력 남김
 *   - 상태: draft/reviewing/confirmed/rejected + reviewStatus 매핑
 * 목록 렌더는 stam.requirements-cycle.js(window.STAM.rqBoard) 재사용.
 * 자동 seed/clear/deleteDatabase 없음. Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var core = window.STAM_CORE || {};
  var db = core.db;
  var schema = core.schema;
  var board = window.STAM && window.STAM.rqBoard;
  if (!db || !schema || !board) return;

  var PID = board.PID;
  var STORE = 'requirements';
  var BY = 'prototype-user';
  var currentId = null;

  function nowIso() { return new Date().toISOString(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function genReqId() {
    var d = new Date();
    var ymd = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var hms = '' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    return 'REQ-MANUAL-' + ymd + '-' + hms;
  }
  function genMenuDraftId() {
    var d = new Date();
    var ymd = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var hms = '' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    return 'MENU-AUTO-' + ymd + '-' + hms;
  }
  function changeId(id, kind) { return 'CHG-' + id + '-' + kind + '-' + Date.now(); }

  function ensureMenuScreenDraftFromRequirement(req) {
    if (!req || !req.id) return Promise.resolve(null);
    var reqId = req.id;
    return db.listRecords('menuScreens', PID).then(function (items) {
      var exists = (items || []).some(function (m) {
        return m.requirementId === reqId
          || m.requirementId === req.requirementId
          || m.sourceRef === reqId;
      });
      if (exists) return null;
      var menuDraftId = genMenuDraftId();
      var draft = {
        id: menuDraftId,
        projectId: PID,
        boardType: 'menuScreen',
        sourceType: 'Requirement Import',
        sourceRef: reqId,
        requirementId: reqId,
        importBatchId: 'REQ-MANUAL',
        importRowId: reqId,
        screenName: req.title || '(요구사항 기반 화면 초안)',
        menuName: req.title || '(요구사항 기반 메뉴 초안)',
        lv1: '',
        lv2: '',
        lv3: '',
        screenType: '화면',
        channel: '',
        routePath: '',
        owner: req.owner || '미지정',
        functionId: '',
        screenSpecificationId: '',
        description: req.description || '',
        status: 'draft',
        reviewStatus: 'Review Needed',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: BY,
        updatedBy: BY
      };
      return db.createRecord('menuScreens', draft).then(function () {
        return db.appendChange({
          changeId: changeId(menuDraftId, 'create-menu-screen'),
          projectId: PID,
          artifactId: menuDraftId,
          changeType: 'create',
          field: 'menuScreen',
          before: null,
          after: draft.screenName,
          at: nowIso(),
          by: BY
        }).then(function () { return draft; });
      });
    });
  }

  var KO_TO_V2 = {
    '작성중': { status: 'draft', reviewStatus: 'Review Needed' },
    '검토요청': { status: 'reviewing', reviewStatus: 'In Review' },
    '검토완료': { status: 'reviewing', reviewStatus: 'Approved' },
    '승인완료': { status: 'confirmed', reviewStatus: 'Approved' },
    '보류': { status: 'rejected', reviewStatus: 'Rejected' }
  };
  function statusFromKo(ko) { return KO_TO_V2[ko] || KO_TO_V2['작성중']; }

  // ── 폼 필드 접근 (label 기준) ───────────────────────────────────────
  function fieldByLabel(scope, label) {
    var fields = scope.querySelectorAll('.rq-ffield');
    for (var i = 0; i < fields.length; i++) {
      var lbl = fields[i].querySelector('.rq-flbl');
      if (lbl && lbl.textContent.trim().indexOf(label) === 0) {
        return fields[i].querySelector('input, select, textarea');
      }
    }
    return null;
  }
  function getVal(scope, label) { var el = fieldByLabel(scope, label); return el ? String(el.value || '').trim() : ''; }
  function setVal(scope, label, val) {
    var el = fieldByLabel(scope, label);
    if (!el) return;
    if (el.tagName === 'SELECT') { setSelect(el, val); }
    else { el.value = val == null ? '' : val; }
  }
  function setSelect(sel, val) {
    var found = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === val || sel.options[i].textContent.trim() === val) { sel.selectedIndex = i; found = true; break; }
    }
    if (!found) sel.selectedIndex = 0;
    syncCs(sel);
  }
  // custom-select(stam.custom-select.js, rq cfg) 라벨/선택표시 동기화
  function syncCs(sel) {
    var wrap = sel.closest('.rq-cs');
    if (!wrap) return;
    var opt = sel.options[sel.selectedIndex];
    var valEl = wrap.querySelector('.rq-cs-val');
    if (valEl) {
      valEl.textContent = opt ? opt.textContent : '';
      valEl.classList.toggle('is-placeholder', !!(opt && opt.value === ''));
    }
    wrap.querySelectorAll('.rq-cs-opt').forEach(function (o, i) { o.classList.toggle('is-selected', i === sel.selectedIndex); });
  }

  // ── 상세 탭 — STAM.detailDrawer (PR #256 공통 renderer) ─────────────────
  function mountRequirementDetailTab(el, config) {
    if (!el) return;
    if (window.STAM && window.STAM.detailDrawer) {
      window.STAM.detailDrawer.mount(el, config);
      return;
    }
    el.textContent = '—';
  }

  function statusChipItems(rec) {
    var st = board.statusInfo(rec);
    var tone = st.cls === 'rq-chip-approved' || st.cls === 'rq-chip-done' ? 'pass'
      : st.cls === 'rq-chip-hold' ? 'fail'
        : st.cls === 'rq-chip-review' ? 'brand'
          : 'warn';
    return [{ label: st.label, tone: tone }];
  }

  function priorityChipItems(rec) {
    var pr = board.priInfo(rec.priority);
    var tone = pr.cls === 'rq-chip-high' ? 'fail'
      : pr.cls === 'rq-chip-low' ? 'brand'
        : 'warn';
    return [{ label: pr.label, tone: tone }];
  }

  function typeChipItems(rec) {
    return [{ label: board.typeOf(rec), tone: 'brand' }];
  }

  function detailField(label, value, opts) {
    opts = opts || {};
    var f = { label: label };
    if (opts.full) f.full = true;
    if (opts.type) f.type = opts.type;
    if (value != null && String(value) !== '') {
      f.value = value;
      return f;
    }
    if (opts.type) {
      f.value = opts.value != null ? opts.value : '';
      if (opts.emptyText) f.emptyText = opts.emptyText;
      return f;
    }
    if (opts.emptyText) {
      f.emptyText = opts.emptyText;
      f.value = '';
      return f;
    }
    return null;
  }

  function pushField(fields, field) {
    if (field) fields.push(field);
  }

  function sourceText(rec) {
    var base = rec.sourceType || '—';
    return rec.sourceRef ? base + ' · ' + rec.sourceRef : base;
  }

  function importBatchText(rec) {
    if (rec.importBatchId) {
      return rec.importBatchId + (rec.importRowId ? ' / ' + rec.importRowId : '');
    }
    return rec.sourceType === 'manual' ? '직접 등록(manual)' : '';
  }

  function acceptanceItems(text) {
    return String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function buildRequirementInfoConfig(rec) {
    var accItems = acceptanceItems(rec.acceptanceCriteria);
    var sections = [
      {
        title: '요약',
        fields: [
          { label: '유형', type: 'chips', value: typeChipItems(rec) },
          { label: '우선순위', type: 'chips', value: priorityChipItems(rec) },
          { label: '상태', type: 'chips', value: statusChipItems(rec) },
        ],
      },
      {
        title: '기본 정보',
        fields: (function () {
          var fields = [];
          pushField(fields, detailField('요구사항 ID', rec.id));
          pushField(fields, detailField('요구사항명', rec.title));
          pushField(fields, { label: '유형', type: 'chips', value: typeChipItems(rec) });
          pushField(fields, { label: '우선순위', type: 'chips', value: priorityChipItems(rec) });
          pushField(fields, { label: '상태', type: 'chips', value: statusChipItems(rec) });
          pushField(fields, detailField('담당자', board.ownerOf(rec)));
          pushField(fields, detailField('관련 메뉴 경로', rec.menuPath));
          pushField(fields, detailField('검토 상태', rec.reviewStatus));
          pushField(fields, detailField('행위자', rec.actor));
          pushField(fields, detailField('출처', sourceText(rec)));
          pushField(fields, detailField('Import 배치', importBatchText(rec)));
          pushField(fields, detailField('최종 수정일', board.dpart(rec.updatedAt)));
          return fields;
        })(),
      },
      {
        title: '요구 내용',
        fields: [
          { label: '배경', type: 'note', value: rec.background || '', emptyText: '배경이 없습니다.', full: true },
          { label: '상세 요구사항', type: 'note', value: rec.description || '', emptyText: '상세 요구사항이 없습니다.', full: true },
        ],
      },
      {
        title: '수용 조건',
        fields: accItems.length
          ? [{ label: '조건', type: 'list', value: accItems, full: true }]
          : [],
        emptyText: '수용 조건이 없습니다.',
      },
    ];
    return { sections: sections };
  }

  function buildRequirementLinkConfig(rec) {
    var links = [
      { label: '연결 화면설계서', id: rec.linkedScreenSpec },
      { label: '연결 WBS', id: rec.linkedWbs },
      { label: '관련 메뉴 경로', id: rec.menuPath },
    ];
    var linkN = links.filter(function (l) { return !!l.id; }).length;
    var sections = [
      {
        title: '연결 요약',
        fields: [{ label: '연결 건수', value: String(linkN) + '건' }],
      },
      {
        title: '연결 산출물',
        fields: links.map(function (l) {
          return {
            label: l.label,
            value: l.id || '',
            emptyText: '연결 없음',
          };
        }),
      },
    ];
    if (linkN === 0) {
      sections.push({
        title: '안내',
        fields: [{
          label: '연결 정보',
          type: 'note',
          value: '연결된 화면설계서, WBS, 메뉴 경로가 없습니다. 수정에서 연결 정보를 입력할 수 있습니다.',
          full: true,
        }],
      });
    }
    return { sections: sections };
  }

  function buildRequirementReviewConfig(rec) {
    var hasReview = !!(rec.reviewer || rec.approvalStatus || rec.reviewNote || rec.reviewStatus);
    if (!hasReview) {
      return {
        sections: [{
          title: '검토 이력',
          emptyText: '검토 이력이 없습니다.',
          fields: [],
        }],
      };
    }
    return {
      sections: [
        {
          title: '검토 정보',
          fields: [
            detailField('검토자', rec.reviewer, { emptyText: '미지정' }),
            detailField('승인 상태', rec.approvalStatus, { emptyText: '미지정' }),
            detailField('검토 상태', rec.reviewStatus, { emptyText: '미지정' }),
          ].filter(Boolean),
        },
        {
          title: '검토 메모',
          fields: [{
            label: '메모',
            type: 'note',
            value: rec.reviewNote || '',
            emptyText: '검토 메모가 없습니다.',
            full: true,
          }],
        },
      ],
    };
  }

  function historyLine(c) {
    var who = esc(c.by || 'user');
    var what = c.changeType === 'create' ? '요구사항 최초 등록'
      : c.changeType === 'delete' ? '요구사항 삭제(soft delete)'
        : (c.field === 'status' ? '상태 변경 → ' + (c.after || '') : '요구사항 정보 수정');
    return who + ' — ' + what + ' (' + board.dpart(c.at) + ')';
  }

  function buildRequirementHistoryConfig(items) {
    if (!items || !items.length) {
      return {
        sections: [{
          title: '변경 이력',
          emptyText: '변경 이력이 없습니다.',
          fields: [],
        }],
      };
    }
    return {
      sections: [{
        title: '변경 이력',
        fields: [{
          label: '이력',
          type: 'list',
          value: items.map(historyLine),
          full: true,
        }],
      }],
    };
  }

  function renderRequirementDetail(rec) {
    var infoEl = document.getElementById('rq-tab-info');
    if (infoEl) mountRequirementDetailTab(infoEl, buildRequirementInfoConfig(rec));

    var linkEl = document.getElementById('rq-tab-link');
    if (linkEl) mountRequirementDetailTab(linkEl, buildRequirementLinkConfig(rec));

    var reviewEl = document.getElementById('rq-tab-review');
    if (reviewEl) mountRequirementDetailTab(reviewEl, buildRequirementReviewConfig(rec));

    var histEl = document.getElementById('rq-tab-history');
    if (!histEl) return Promise.resolve();

    return db.listRecords('artifactChanges', PID, { includeDeleted: true }).then(function (all) {
      var mine = (all || []).filter(function (c) { return c.artifactId === rec.id; })
        .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
      mountRequirementDetailTab(histEl, buildRequirementHistoryConfig(mine));
    }).catch(function () {
      mountRequirementDetailTab(histEl, {
        sections: [{
          title: '변경 이력',
          emptyText: '변경 이력을 불러올 수 없습니다.',
          fields: [],
        }],
      });
    });
  }

  function esc(s) { return board.esc(s); }

  // ── 등록 ────────────────────────────────────────────────────────────
  var regDrawer = document.getElementById('rq-dw-register');
  function resetRegister() {
    if (!regDrawer) return;
    var idInput = fieldByLabel(regDrawer, '요구사항 ID');
    if (idInput) idInput.value = '(저장 시 자동 부여)';
    ['유형', '우선순위', '상태', '승인 상태'].forEach(function (l) { var s = fieldByLabel(regDrawer, l); if (s && s.tagName === 'SELECT') { s.selectedIndex = 0; syncCs(s); } });
    ['요구사항명', '담당자', '배경', '상세 요구사항', '수용 조건', '관련 메뉴 경로', '검토자', '검토 메모'].forEach(function (l) { setVal(regDrawer, l, ''); });
  }

  function submitRegister() {
    if (!regDrawer) return;
    var title = getVal(regDrawer, '요구사항명');
    var desc = getVal(regDrawer, '상세 요구사항');
    var rtype = getVal(regDrawer, '유형');
    if (!title) { alert('요구사항명을 입력하세요.'); return; }
    if (!desc) { alert('상세 요구사항을 입력하세요.'); return; }
    var ko = getVal(regDrawer, '상태') || '작성중';
    var v2 = statusFromKo(ko);
    var id = genReqId();
    var rec = {
      id: id,
      projectId: PID,
      boardType: 'requirement',
      requirementId: id,
      sourceType: 'manual',
      title: title,
      description: desc,
      requirementType: rtype || '기능',
      priority: getVal(regDrawer, '우선순위') || '보통',
      owner: getVal(regDrawer, '담당자') || '미지정',
      actor: '',
      background: getVal(regDrawer, '배경'),
      acceptanceCriteria: getVal(regDrawer, '수용 조건'),
      menuPath: getVal(regDrawer, '관련 메뉴 경로'),
      reviewer: getVal(regDrawer, '검토자'),
      approvalStatus: getVal(regDrawer, '승인 상태'),
      reviewNote: getVal(regDrawer, '검토 메모'),
      status: v2.status,
      reviewStatus: v2.reviewStatus
    };
    db.createRecord(STORE, rec)
      .then(function () {
        return db.appendChange({
          changeId: changeId(id, 'create'), projectId: PID, artifactId: id,
          changeType: 'create', field: 'requirement', before: null, after: title, at: nowIso(), by: BY
        });
      })
      .then(function () {
        return ensureMenuScreenDraftFromRequirement(rec).catch(function (menuErr) {
          console.error('[stam.requirements] menu draft create failed', menuErr);
          alert('요구사항은 저장됐지만 메뉴/화면 초안 생성에 실패했습니다. 메뉴구조/화면목록에서 직접 등록하거나 다시 시도하세요.');
        });
      })
      .then(function () { closeDrawers(); return board.render(); })
      .catch(function (e) {
        console.error('[stam.requirements] register', e);
        alert('등록 오류: ' + (e.message || e));
      });
  }

  // ── 상세 ────────────────────────────────────────────────────────────
  var detDrawer = document.getElementById('rq-dw-detail');
  function openDetail(id) {
    if (!detDrawer) return Promise.resolve();
    return db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      currentId = id;
      var st = board.statusInfo(rec), pr = board.priInfo(rec.priority);
      var badge = detDrawer.querySelector('.rq-req-badge'); if (badge) badge.textContent = rec.id;
      var hChip = detDrawer.querySelector('.rq-dw-hrow1 .rq-chip'); if (hChip) { hChip.className = 'rq-chip ' + st.cls; hChip.style.marginLeft = '4px'; hChip.textContent = st.label; }
      var title = detDrawer.querySelector('.rq-dw-htitle'); if (title) title.textContent = rec.title || '(제목 없음)';
      var hmeta = detDrawer.querySelectorAll('.rq-dw-hmeta .rq-chip');
      if (hmeta[0]) { hmeta[0].className = 'rq-chip rq-chip-type'; hmeta[0].textContent = board.typeOf(rec); }
      if (hmeta[1]) { hmeta[1].className = 'rq-chip ' + pr.cls; hmeta[1].textContent = pr.label; }
      renderRequirementDetail(rec);
      var meta = detDrawer.querySelector('.stam-dw-foot-meta'); if (meta) meta.textContent = '최종 변경 ' + (board.dpart(rec.updatedAt) || '—');
    });
  }

  // ── 수정 ────────────────────────────────────────────────────────────
  var editDrawer = document.getElementById('rq-dw-edit');
  function prefillEdit(id) {
    if (!editDrawer) return;
    db.getRecord(STORE, id).then(function (rec) {
      if (!rec) return;
      var st = board.statusInfo(rec);
      var sumId = editDrawer.querySelector('.rq-edit-sum-id'); if (sumId) sumId.textContent = rec.id;
      var badge = editDrawer.querySelector('.rq-req-badge'); if (badge) badge.textContent = rec.id;
      var title = editDrawer.querySelector('.rq-dw-htitle'); if (title) title.textContent = rec.title || '';
      var idInput = fieldByLabel(editDrawer, '요구사항 ID'); if (idInput) idInput.value = rec.id;
      setVal(editDrawer, '유형', board.typeOf(rec));
      setVal(editDrawer, '요구사항명', rec.title || '');
      setVal(editDrawer, '우선순위', board.priInfo(rec.priority).label);
      setVal(editDrawer, '상태', st.label);
      setVal(editDrawer, '담당자', rec.owner || '');
      setVal(editDrawer, '배경', rec.background || '');
      setVal(editDrawer, '상세 요구사항', rec.description || '');
      setVal(editDrawer, '수용 조건', rec.acceptanceCriteria || '');
      setVal(editDrawer, '관련 메뉴 경로', rec.menuPath || '');
      setVal(editDrawer, '검토자', rec.reviewer || '');
      if (rec.approvalStatus) setVal(editDrawer, '승인 상태', rec.approvalStatus);
      setVal(editDrawer, '검토 메모', rec.reviewNote || '');
    });
  }

  function submitEdit() {
    if (!editDrawer || !currentId) return;
    var id = currentId;
    db.getRecord(STORE, id).then(function (prev) {
      if (!prev) return;
      var ko = getVal(editDrawer, '상태') || '작성중';
      var v2 = statusFromKo(ko);
      var patch = {
        title: getVal(editDrawer, '요구사항명') || prev.title,
        requirementType: getVal(editDrawer, '유형') || prev.requirementType,
        priority: getVal(editDrawer, '우선순위') || prev.priority,
        owner: getVal(editDrawer, '담당자') || prev.owner,
        background: getVal(editDrawer, '배경'),
        description: getVal(editDrawer, '상세 요구사항') || prev.description,
        acceptanceCriteria: getVal(editDrawer, '수용 조건'),
        menuPath: getVal(editDrawer, '관련 메뉴 경로'),
        reviewer: getVal(editDrawer, '검토자'),
        approvalStatus: getVal(editDrawer, '승인 상태'),
        reviewNote: getVal(editDrawer, '검토 메모'),
        status: v2.status,
        reviewStatus: v2.reviewStatus,
        updatedBy: BY
      };
      var statusChanged = (prev.status !== v2.status) || (prev.reviewStatus !== v2.reviewStatus);
      return db.updateRecord(STORE, id, patch).then(function () {
        return db.appendChange({
          changeId: changeId(id, statusChanged ? 'status' : 'update'), projectId: PID, artifactId: id,
          changeType: 'update', field: statusChanged ? 'status' : 'summary',
          before: statusChanged ? board.statusInfo(prev).label : null,
          after: statusChanged ? board.statusInfo({ status: v2.status, reviewStatus: v2.reviewStatus }).label : '요구사항 정보 수정',
          at: nowIso(), by: BY
        });
      });
    }).then(function () { closeDrawers(); return board.render(); })
      .catch(function (e) { alert('저장 오류: ' + e.message); });
  }

  // ── 삭제 (soft delete) ──────────────────────────────────────────────
  var CONFIRM_MSG = '이 요구사항을 삭제하시겠습니까? 삭제된 항목은 목록에서 숨겨지지만 변경이력에는 남습니다.';
  function softDelete(ids) {
    if (!ids.length) return Promise.resolve();
    return ids.reduce(function (p, id) {
      return p.then(function () {
        return db.softDeleteRecord(STORE, id, { by: BY, reason: '사용자 삭제' }).then(function () {
          return db.appendChange({
            changeId: changeId(id, 'delete'), projectId: PID, artifactId: id,
            changeType: 'delete', field: 'status', before: 'active', after: 'deleted', at: nowIso(), by: BY
          });
        });
      });
    }, Promise.resolve());
  }
  function selectedIds() {
    var rows = (window.STAMBoardList && listRoot) ? window.STAMBoardList.getSelectedRows(listRoot) : [];
    return rows.map(function (r) { return r.getAttribute('data-rq-id'); }).filter(Boolean);
  }

  // ── 닫기 ────────────────────────────────────────────────────────────
  function closeDrawers() {
    var scrim = document.getElementById('rq-scrim');
    if (scrim) scrim.classList.remove('show');
    document.querySelectorAll('.rq-drawer').forEach(function (d) { d.classList.remove('open'); });
    if (window.STAMBoardList && listRoot) window.STAMBoardList.clearActive(listRoot);
  }

  // ── 바인딩 ──────────────────────────────────────────────────────────
  var listRoot = document.querySelector('[data-stam-board-list]');
  var tbody = document.getElementById('rq-tbody');

  var regBtn = document.getElementById('rq-reg-btn');
  if (regBtn) regBtn.addEventListener('click', function () { setTimeout(resetRegister, 0); });
  if (regDrawer) {
    var regSubmit = regDrawer.querySelector('.stam-dw-foot-right .rq-btn-pri');
    if (regSubmit) regSubmit.addEventListener('click', submitRegister);
  }

  if (tbody) {
    tbody.addEventListener('click', function (e) {
      if (e.target.closest('.rq-ch')) return;
      var row = e.target.closest('.rq-data-row');
      if (!row) return;
      var id = row.getAttribute('data-rq-id');
      if (id) openDetail(id);
    });
  }

  if (detDrawer) {
    var editBtn = detDrawer.querySelector('[data-rq-open="edit"]');
    if (editBtn) editBtn.addEventListener('click', function () { if (currentId) setTimeout(function () { prefillEdit(currentId); }, 0); });
    var detDel = document.getElementById('rq-det-del-btn');
    if (detDel) detDel.addEventListener('click', function () {
      if (!currentId) return;
      if (!window.confirm(CONFIRM_MSG)) return;
      softDelete([currentId]).then(function () { closeDrawers(); return board.render(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
    });
  }

  if (editDrawer) {
    var editSubmit = editDrawer.querySelector('.stam-dw-foot-right .rq-btn-pri');
    if (editSubmit) editSubmit.addEventListener('click', submitEdit);
  }

  var delBtn = document.getElementById('rq-del-btn');
  if (delBtn) delBtn.addEventListener('click', function () {
    var ids = selectedIds();
    if (!ids.length) return;
    if (!window.confirm(CONFIRM_MSG)) return;
    softDelete(ids).then(function () { return board.render(); }).catch(function (e) { alert('삭제 오류: ' + e.message); });
  });

}());
