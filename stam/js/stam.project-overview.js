/* ============================================================
 * STAM Project Overview — Dashboard 초기화
 * 파르나스 리뉴얼 구축 | A1 Project Overview
 * 의존: stam.nav-data.js, stam.shell.js, stam.theme.js
 * IA Baseline v3.3 | 2026-06-07
 * ============================================================ */
(function () {
  'use strict';

  /* ============================================================
   * 대시보드 데이터
   * ============================================================ */

  /* 산출물 진행 현황 — 11개 유형 */
  /* total 합계: 148 / done 합계: 62 / review 합계: 21 / pending 합계: 6 */
  var deliverables = [
    { name: '요구사항정의서',    total: 18, done:  8, review: 3, pending: 1, pct: 44 },
    { name: '메뉴구조/화면목록', total: 12, done:  9, review: 1, pending: 0, pct: 75 },
    { name: 'WBS 작업',          total: 24, done: 10, review: 4, pending: 2, pct: 42 },
    { name: '화면설계서',        total: 32, done: 12, review: 7, pending: 2, pct: 38 },
    { name: '기능정의서',        total: 15, done:  7, review: 2, pending: 1, pct: 47 },
    { name: 'API 명세서',        total: 20, done:  8, review: 2, pending: 0, pct: 40 },
    { name: '테이블 정의서',     total: 10, done:  5, review: 1, pending: 0, pct: 50 },
    { name: 'DB 정보',           total:  6, done:  3, review: 1, pending: 0, pct: 50 },
    { name: '서버 정보',         total:  5, done:  0, review: 0, pending: 0, pct:  0 },
    { name: '접근/보안 정보',    total:  4, done:  0, review: 0, pending: 0, pct:  0 },
    { name: '정책정의서',        total:  2, done:  0, review: 0, pending: 0, pct:  0 },
  ];

  /* 내 업무 */
  var myWork = [
    { name: '화면설계서 5건 검토',          type: '검토', ref: '화면설계서',    due: '06-07', status: 'wip',  prio: 'high' },
    { name: 'WBS 지연 항목 확인',           type: '확인', ref: 'WBS 작업',      due: '06-08', status: 'wip',  prio: 'high' },
    { name: '요구사항 승인 처리',           type: '승인', ref: '요구사항정의서', due: '06-09', status: 'todo', prio: 'high' },
    { name: '접근/보안 정보 공개범위 검토', type: '검토', ref: '접근/보안 정보', due: '06-10', status: 'todo', prio: 'mid'  },
    { name: 'API 명세서 검토 완료 처리',    type: '검토', ref: 'API 명세서',     due: '06-11', status: 'wip',  prio: 'low'  },
    { name: '오픈 시나리오 고객확인 대기',  type: '확인', ref: '오픈 시나리오',  due: '06-12', status: 'todo', prio: 'mid'  },
  ];

  /* 승인 요약 KPI */
  var approvalKpi = [
    { num: 6,  lbl: '승인 대기', color: '#F0B24E' },
    { num: 12, lbl: '검토중',    color: '#6FA8FF'  },
    { num: 2,  lbl: '반려',      color: '#FF8585'  },
    { num: 38, lbl: '승인 완료', color: '#46C97D'  },
    { num: 3,  lbl: '지연 승인', color: '#FF8585'  },
  ];

  /* 최근 승인 요청 */
  var approvalList = [
    { id: 'REQ-0101', title: '산출물 등록 및 버전 관리', status: 'todo' },
    { id: 'SCR-0021', title: '고객 로그인 화면',          status: 'todo' },
    { id: 'WBS-0042', title: 'DB 마이그레이션 작업',      status: 'wip'  },
    { id: 'API-0012', title: '사용자 권한 조회 API',       status: 'wip'  },
  ];

  /* Risk & Gate */
  var risks = [
    { name: 'DB Migration Gate',           lv: 'high', owner: '이서버', status: '대기',   action: 'DB 마이그레이션 계획 검토', due: '06-15' },
    { name: 'A1 Auth/RBAC Gate',           lv: 'mid',  owner: '박개발', status: '진행중', action: '권한 체계 최종 확정',       due: '06-10' },
    { name: '접근/보안 정보 정책 미확정',  lv: 'high', owner: '김PM',   status: '대기',   action: '마스킹 정책 검토',           due: '06-09' },
    { name: '고객 승인 지연',              lv: 'mid',  owner: 'PM',     status: '대기',   action: '고객사 일정 재확인',         due: '06-08' },
    { name: '오픈 시나리오 Go/No-Go 대기', lv: 'low',  owner: '이PM',   status: '대기',   action: 'Go/No-Go 회의 일정 확정',   due: '06-20' },
  ];

  /* 테스트/품질 통계 */
  var testStats = [
    { num: 34, lbl: '테스트케이스', cls: '' },
    { num: 18, lbl: '성공',         cls: 'pass' },
    { num: 3,  lbl: '실패',         cls: 'fail' },
    { num: 5,  lbl: '보류',         cls: 'warn' },
    { num: 7,  lbl: '결함',         cls: 'fail' },
    { num: 24, lbl: '오픈 시나리오', cls: 'brand' },
  ];

  /* 납품/내보내기 통계 */
  var deliveryStats = [
    { num: '4',    lbl: '내보내기 요청' },
    { num: '2',    lbl: '납품 패키지'  },
    { num: '5',    lbl: '공유 링크'    },
    { num: '준비중', lbl: '매뉴얼 자동 생성' },
  ];

  /* 최근 변경 */
  var recentUpdates = [
    { target: 'WBS 작업 B3',               type: 'update', typeLbl: '확정',     author: '김PM',  time: '오늘 10:42', scope: '메뉴 순서 확정' },
    { target: '오픈 시나리오 C8',          type: 'move',   typeLbl: '이동',     author: '이PM',  time: '오늘 09:15', scope: 'C8 → C7 이동' },
    { target: 'DB/서버/접근보안 정보 분리', type: 'struct', typeLbl: '구조변경', author: '박설계', time: '어제 17:30', scope: 'B9·B10·B11 분리' },
    { target: 'S-Core Dream 폰트 적용',    type: 'update', typeLbl: '변경',     author: 'Claude', time: '어제 16:00', scope: '전역 폰트 적용' },
    { target: '로고 에셋 교체',            type: 'update', typeLbl: '변경',     author: 'Claude', time: '어제 14:20', scope: '브랜드 에셋 교체' },
  ];

  /* Next Action */
  var nextActions = [
    { text: '요구사항 승인 대기 3건 처리',                    count: '3건' },
    { text: 'WBS 지연 항목 4건 확인',                         count: '4건' },
    { text: 'DB 정보 공개범위 검토',                          count: ''    },
    { text: '접근/보안 정보 마스킹 정책 확인',                count: ''    },
    { text: 'Project Overview 이후 목록 화면 1차 생성 준비',  count: ''    },
  ];

  /* ============================================================
   * 헬퍼
   * ============================================================ */

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    return e;
  }

  function pctBarColor(pct) {
    if (pct >= 75) { return '#46C97D'; }
    if (pct >= 40) { return '#5451E8'; }
    if (pct >   0) { return '#F0B24E'; }
    return 'rgba(180,184,200,.15)';
  }

  function statusBadge(s) {
    if (s === 'done') { return '<span class="status-badge s-done">완료</span>'; }
    if (s === 'wip')  { return '<span class="status-badge s-wip">진행중</span>'; }
    return '<span class="status-badge s-todo">대기</span>';
  }

  function lvLabel(lv) {
    if (lv === 'high') { return '고위험'; }
    if (lv === 'mid')  { return '중위험'; }
    return '저위험';
  }

  /* ============================================================
   * Left Navigation — nav-render.js로 위임 (공통화)
   * stam.nav-render.init('A1') 이 renderSidebar + initSearch +
   * nav click routing 을 모두 처리합니다.
   * ============================================================ */
  function initNav() {
    if (window.STAM && window.STAM.navRender) {
      window.STAM.navRender.init('A1');
    }
  }

  /* ============================================================
   * 렌더: 산출물 진행 현황 테이블
   * ============================================================ */
  function initDeliverables() {
    var tbody = document.getElementById('po-deliv-tbody');
    if (!tbody) { return; }
    deliverables.forEach(function (d) {
      var clr = pctBarColor(d.pct);
      var statusCls, statusTxt;
      if (d.pct >= 75) { statusCls = 's-done'; statusTxt = '완료 단계'; }
      else if (d.pct >= 40) { statusCls = 's-wip'; statusTxt = '진행중'; }
      else if (d.pct > 0)   { statusCls = 's-wip'; statusTxt = '시작됨'; }
      else { statusCls = 's-todo'; statusTxt = '미시작'; }

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span class="po-deliv-name">' + d.name + '</span></td>' +
        '<td style="text-align:center;font-family:var(--mono);font-size:12px;color:var(--t2)">' + d.total + '</td>' +
        '<td style="text-align:center;font-family:var(--mono);font-size:12px;color:#46C97D">' + d.done + '</td>' +
        '<td style="text-align:center;font-family:var(--mono);font-size:12px;color:#6FA8FF">' + d.review + '</td>' +
        '<td style="text-align:center;font-family:var(--mono);font-size:12px;color:#F0B24E">' + d.pending + '</td>' +
        '<td class="po-prog-cell">' +
          '<div class="po-prog-wrap">' +
            '<div class="po-prog-bar">' +
              '<div class="po-prog-fill" style="width:' + d.pct + '%;background:' + clr + '"></div>' +
            '</div>' +
            '<span class="po-prog-pct">' + d.pct + '%</span>' +
          '</div>' +
        '</td>' +
        '<td><span class="status-badge ' + statusCls + '">' + statusTxt + '</span></td>';
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
   * 렌더: 내 업무 목록
   * ============================================================ */
  function initMyWork() {
    var list = document.getElementById('po-work-list');
    if (!list) { return; }
    myWork.forEach(function (w) {
      var item = el('div', 'po-work-item');
      item.innerHTML =
        '<div class="po-work-top">' +
          '<div class="po-work-prio ' + w.prio + '"></div>' +
          '<div class="po-work-name">' + w.name + '</div>' +
          statusBadge(w.status) +
        '</div>' +
        '<div class="po-work-meta">' +
          '<span class="po-work-type">' + w.type + '</span>' +
          '<span class="po-work-ref">' + w.ref + '</span>' +
          '<span class="po-work-due">마감 ~' + w.due + '</span>' +
        '</div>';
      list.appendChild(item);
    });
  }

  /* ============================================================
   * 렌더: 승인 요약
   * ============================================================ */
  function initApproval() {
    var kpiEl = document.getElementById('po-approval-kpi');
    if (kpiEl) {
      approvalKpi.forEach(function (a) {
        var item = el('div', 'po-appr-item');
        item.innerHTML =
          '<div class="po-appr-num" style="color:' + a.color + '">' + a.num + '</div>' +
          '<div class="po-appr-lbl">' + a.lbl + '</div>';
        kpiEl.appendChild(item);
      });
    }

    var listEl = document.getElementById('po-approval-list');
    if (listEl) {
      approvalList.forEach(function (a) {
        var row = el('div', 'po-appr-row');
        row.innerHTML =
          '<span class="po-appr-row-id">' + a.id + '</span>' +
          '<span class="po-appr-row-title">' + a.title + '</span>' +
          statusBadge(a.status);
        listEl.appendChild(row);
      });
    }
  }

  /* ============================================================
   * 렌더: Risk & Gate
   * ============================================================ */
  function initRisk() {
    var body = document.getElementById('po-risk-body');
    if (!body) { return; }
    var list = el('div', 'po-risk-list');
    risks.forEach(function (r) {
      var item = el('div', 'po-risk-item');
      item.innerHTML =
        '<div class="po-risk-top">' +
          '<div class="po-risk-name">' + r.name + '</div>' +
          '<span class="po-risk-lv ' + r.lv + '">' + lvLabel(r.lv) + '</span>' +
        '</div>' +
        '<div class="po-risk-meta">' +
          '<span>담당: ' + r.owner + '</span>' +
          '<span>상태: ' + r.status + '</span>' +
          '<span>마감 ~' + r.due + '</span>' +
        '</div>' +
        '<div class="po-risk-action">→ ' + r.action + '</div>';
      list.appendChild(item);
    });
    body.appendChild(list);
  }

  /* ============================================================
   * 렌더: 테스트/품질 + 납품/내보내기 통계
   * ============================================================ */
  function initTestDelivery() {
    var testEl = document.getElementById('po-test-body');
    if (testEl) {
      var grid = el('div', 'po-mini-stats');
      testStats.forEach(function (t) {
        var stat = el('div', 'po-mini-stat');
        stat.innerHTML =
          '<div class="po-mini-stat-num ' + t.cls + '">' + t.num + '</div>' +
          '<div class="po-mini-stat-lbl">' + t.lbl + '</div>';
        grid.appendChild(stat);
      });
      testEl.appendChild(grid);
    }

    var delivEl = document.getElementById('po-delivery-body');
    if (delivEl) {
      var grid2 = el('div', 'po-mini-stats col2');
      deliveryStats.forEach(function (d) {
        var stat = el('div', 'po-mini-stat');
        stat.innerHTML =
          '<div class="po-mini-stat-num brand">' + d.num + '</div>' +
          '<div class="po-mini-stat-lbl">' + d.lbl + '</div>';
        grid2.appendChild(stat);
      });
      delivEl.appendChild(grid2);
    }
  }

  /* ============================================================
   * 렌더: 최근 변경 테이블
   * ============================================================ */
  function initRecent() {
    var tbody = document.getElementById('po-recent-tbody');
    if (!tbody) { return; }
    recentUpdates.forEach(function (u) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="font-weight:600;color:var(--t1);font-size:12px;white-space:nowrap">' + u.target + '</td>' +
        '<td><span class="po-change-type ' + u.type + '">' + u.typeLbl + '</span></td>' +
        '<td style="font-size:11.5px;white-space:nowrap">' + u.author + '</td>' +
        '<td style="font-family:var(--mono);font-size:11px;color:var(--t3);white-space:nowrap">' + u.time + '</td>' +
        '<td style="font-size:11px;color:var(--t3)">' + u.scope + '</td>';
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
   * 렌더: Next Action
   * ============================================================ */
  function initNextAction() {
    var body = document.getElementById('po-next-body');
    if (!body) { return; }
    var list = el('div', 'po-next-list');
    nextActions.forEach(function (a, i) {
      var item = el('div', 'po-next-item');
      item.innerHTML =
        '<div class="po-next-num">' + (i + 1) + '</div>' +
        '<div class="po-next-text">' + a.text + '</div>' +
        (a.count ? '<span class="po-next-count">' + a.count + '</span>' : '');
      list.appendChild(item);
    });
    body.appendChild(list);
  }

  /* ============================================================
   * 초기화
   * ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initDeliverables();
    initMyWork();
    initApproval();
    initRisk();
    initTestDelivery();
    initRecent();
    initNextAction();
  });

}());
