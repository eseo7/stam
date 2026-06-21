/* ============================================================
 * STAM Screen Specification — 화면설계서 목록 상호작용
 * stam/pages/boards/screen-specification.html (예정)
 * v1.0 | 2026-06-11
 * mock only — no localStorage / Firestore / DB
 * ============================================================ */
(function () {
  'use strict';

  /* ── Data ── */
  var MENUS = [
    { id: 'G-01', name: '대시보드', screens: [
      { id: 'SCR-001', name: '대시보드', ver: 'v1.1', wst: 'complete', rst: 'done', ast: 'approved', type: 'main', menu: '대시보드', owner: '박PM', av: '박', ac: '#5451E8', upd: '2026-06-07', hasImg: true, annots: 2,
        purp: 'STAM 플랫폼 첫 진입 화면으로 프로젝트 전체 현황과 처리 대기 항목을 일람합니다.',
        acts: [{ n: '화면설계서 바로가기', loc: '현황 카드', act: '목록 이동' }, { n: '검토 요청 확인', loc: '알림 영역', act: 'Drawer 열기' }],
        links: { req: ['REQ-001'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '박PM', at: '06-07', t: 'KPI 카드 순서 변경', f: 'v1.0', to: 'v1.1' }, { k: 'create', who: '이UX', at: '05-20', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-02', name: '회원', screens: [
      { id: 'SCR-002', name: '회원가입', ver: 'v1.0', wst: 'complete', rst: 'pending', ast: 'none', type: 'form', menu: '회원 > 회원가입', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-10', hasImg: true, annots: 3,
        purp: '사용자 계정 생성을 위한 정보 입력 화면입니다. 약관 동의, 본인 인증 단계를 포함합니다.',
        acts: [{ n: '이름·이메일 입력', loc: '폼 필드', act: '입력값 유효성 검사' }, { n: '회원가입 완료', loc: '제출 버튼', act: '계정 생성 처리' }],
        links: { req: ['REQ-001', 'REQ-002'], art: [], work: [], ifc: ['IFC-001'], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-10', t: '약관 동의 항목 추가', f: 'v0.9', to: 'v1.0' }, { k: 'st', who: '김기획', at: '06-09', t: '검토 요청 전환', f: '작성완료', to: '검토 대기' }, { k: 'create', who: '이UX', at: '05-25', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-003', name: '로그인 / 인증', ver: 'v1.2', wst: 'complete', rst: 'done', ast: 'approved', type: 'form', menu: '회원 > 로그인', owner: '최개발', av: '최', ac: '#00BF40', upd: '2026-06-05', hasImg: true, annots: 4,
        purp: 'STAM 플랫폼 진입을 위한 인증 화면입니다.',
        acts: [{ n: '로그인', loc: '제출 버튼', act: '인증 처리' }, { n: '비밀번호 찾기', loc: '링크', act: '재설정 화면 이동' }],
        links: { req: ['REQ-001'], art: [], work: [], ifc: ['IFC-001'], fn: [] },
        hist: [{ k: 'edit', who: '최개발', at: '06-05', t: '접근성 개선', f: 'v1.1', to: 'v1.2' }, { k: 'st', who: '박PM', at: '05-28', t: '승인 완료', f: '검토 대기', to: '승인 완료' }] },
      { id: 'SCR-004', name: '마이페이지', ver: 'v0.8', wst: 'writing', rst: 'none', ast: 'none', type: 'main', menu: '회원 > 마이페이지', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: false, annots: 0,
        purp: '로그인 사용자의 프로필, 활동 이력, 설정을 관리하는 화면입니다.',
        acts: [{ n: '프로필 수정', loc: '편집 버튼', act: '수정 폼 열기' }, { n: '활동 이력 조회', loc: '탭', act: '이력 목록 표시' }],
        links: { req: ['REQ-004'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-08', t: '활동 이력 탭 추가', f: 'v0.7', to: 'v0.8' }, { k: 'create', who: '이UX', at: '05-30', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-03', name: '산출물 관리', screens: [
      { id: 'SCR-005', name: '요구사항정의서 목록', ver: 'v1.0', wst: 'complete', rst: 'done', ast: 'approved', type: 'list', menu: '산출물 관리 > 요구사항정의서', owner: '김기획', av: '김', ac: '#6541F2', upd: '2026-06-07', hasImg: true, annots: 2,
        purp: '프로젝트 요구사항을 정의하고 관리하는 목록 화면입니다.',
        acts: [{ n: '요구사항 등록', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '행 클릭', loc: '목록 행', act: '상세 Drawer 열기' }],
        links: { req: [], art: [], work: ['WBS-010'], ifc: [], fn: ['FN-001'] },
        hist: [{ k: 'st', who: '박PM', at: '06-07', t: '승인 완료', f: '검토 대기', to: '승인 완료' }, { k: 'edit', who: '김기획', at: '06-05', t: '필터 구성 확정', f: 'v0.3', to: 'v1.0' }] },
      { id: 'SCR-006', name: '메뉴구조 / 화면목록', ver: 'v0.5', wst: 'writing', rst: 'none', ast: 'none', type: 'list', menu: '산출물 관리 > 메뉴구조', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-09', hasImg: false, annots: 0,
        purp: '프로젝트의 메뉴 구조와 화면 목록을 계층형으로 관리하는 화면입니다.',
        acts: [{ n: '메뉴 추가', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '화면 연결', loc: '행 액션', act: '화면설계서 연결' }],
        links: { req: ['REQ-011'], art: [], work: ['WBS-002'], ifc: [], fn: ['FN-002', 'FN-003'] },
        hist: [{ k: 'edit', who: '이UX', at: '06-09', t: '계층 표현 방식 수정', f: 'v0.4', to: 'v0.5' }, { k: 'create', who: '이UX', at: '06-01', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-007', name: 'WBS 작업', ver: 'v1.1', wst: 'complete', rst: 'done', ast: 'approved', type: 'list', menu: '산출물 관리 > WBS 작업', owner: '박PM', av: '박', ac: '#5451E8', upd: '2026-06-06', hasImg: true, annots: 5,
        purp: '프로젝트 작업을 계획·관리하는 목록 화면입니다. 간트 타임라인을 포함합니다.',
        acts: [{ n: '작업 등록', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '행 클릭', loc: '목록 행', act: '상세 Drawer 열기' }],
        links: { req: ['REQ-008'], art: [], work: ['WBS-007'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '박PM', at: '06-06', t: '간트 타임라인 추가', f: 'v1.0', to: 'v1.1' }, { k: 'st', who: '박PM', at: '05-30', t: '승인 완료', f: '검토 대기', to: '승인 완료' }] },
      { id: 'SCR-008', name: '화면설계서 목록', ver: 'v0.6', wst: 'writing', rst: 'none', ast: 'none', type: 'list', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-09', hasImg: false, annots: 0,
        purp: '화면설계서를 메뉴 단위 hierarchy 구조로 관리하는 목록 화면입니다.',
        acts: [{ n: '화면 등록', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '행 클릭', loc: '목록 행', act: '상세 Drawer 열기' }],
        links: { req: ['REQ-011'], art: ['ART-003'], work: ['WBS-011'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-09', t: 'hierarchy tree table 구조 적용', f: 'v0.5', to: 'v0.6' }, { k: 'create', who: '이UX', at: '06-01', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-009', name: '화면설계서 상세', ver: 'v0.4', wst: 'complete', rst: 'done', ast: 'approved', type: 'detail', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: true, annots: 7,
        purp: '화면설계서 항목의 개요·연결정보·검토이력을 우측 Drawer 방식으로 표시합니다.',
        acts: [{ n: '탭 전환', loc: 'Drawer 탭', act: '탭 콘텐츠 전환' }, { n: '검토 요청', loc: 'Drawer 하단', act: '상태 변경' }],
        links: { req: ['REQ-012'], art: ['ART-003'], work: ['WBS-009'], ifc: [], fn: ['FN-004'] },
        hist: [{ k: 'st', who: '박PM', at: '06-08', t: '승인 완료', f: '검토 대기', to: '승인 완료' }, { k: 'edit', who: '이UX', at: '06-07', t: '연결정보 탭 추가', f: 'v0.3', to: 'v0.4' }] },
      { id: 'SCR-010', name: '화면설계서 등록', ver: 'v0.3', wst: 'writing', rst: 'none', ast: 'none', type: 'form', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: false, annots: 0,
        purp: '새 화면설계서를 등록하는 폼 화면입니다. 기본 정보, 이미지 첨부, 연결정보를 입력합니다.',
        acts: [{ n: '정보 입력', loc: '폼 필드', act: '유효성 검사' }, { n: '저장', loc: '하단 버튼', act: '등록 처리' }],
        links: { req: ['REQ-012'], art: [], work: ['WBS-009'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-08', t: '이미지 첨부 영역 추가', f: 'v0.2', to: 'v0.3' }, { k: 'create', who: '이UX', at: '06-03', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-011', name: '화면설계서 수정', ver: 'v0.3', wst: 'writing', rst: 'none', ast: 'none', type: 'form', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: false, annots: 0,
        purp: '기존 화면설계서를 수정하는 폼 화면입니다. 변경 사유 입력 기능을 포함합니다.',
        acts: [{ n: '정보 수정', loc: '폼 필드', act: '유효성 검사' }, { n: '저장', loc: '하단 버튼', act: '변경 처리' }],
        links: { req: ['REQ-012'], art: [], work: ['WBS-009'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-08', t: '변경 사유 입력 추가', f: 'v0.2', to: 'v0.3' }, { k: 'create', who: '이UX', at: '06-03', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-04', name: '검토 관리', screens: [
      { id: 'SCR-012', name: '검토 요청 현황', ver: 'v0.7', wst: 'complete', rst: 'pending', ast: 'none', type: 'list', menu: '검토 관리 > 검토 요청 현황', owner: '김기획', av: '김', ac: '#6541F2', upd: '2026-06-09', hasImg: false, annots: 0,
        purp: '프로젝트 전체 검토 요청 현황을 일람하고 처리하는 화면입니다.',
        acts: [{ n: '검토 요청 확인', loc: '목록 행', act: '상세 Drawer 열기' }, { n: '승인/반려', loc: '행 액션', act: '상태 변경' }],
        links: { req: ['REQ-015'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'st', who: '박PM', at: '06-09', t: '검토 요청 전환', f: '작성완료', to: '검토 대기' }, { k: 'edit', who: '김기획', at: '06-07', t: '상태 chip 구성 보정', f: 'v0.6', to: 'v0.7' }] },
      { id: 'SCR-013', name: '검토 요청 결과', ver: 'v0.2', wst: 'writing', rst: 'none', ast: 'none', type: 'detail', menu: '검토 관리 > 검토 결과', owner: '김기획', av: '김', ac: '#6541F2', upd: '2026-06-09', hasImg: false, annots: 0,
        purp: '검토 요청 처리 결과를 확인하는 화면입니다. 승인/반려 사유를 포함합니다.',
        acts: [{ n: '목록으로 돌아가기', loc: '하단 버튼', act: '목록 이동' }],
        links: { req: ['REQ-015'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'create', who: '김기획', at: '06-09', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-05', name: '보내기 / 설정', screens: [
      { id: 'SCR-014', name: '산출물보내기', ver: 'v1.0', wst: 'complete', rst: 'pending', ast: 'none', type: 'popup', menu: '보내기 / 설정 >보내기', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-06', hasImg: false, annots: 0,
        purp: '선택한 산출물을 PDF·Excel 등 형식으로보내는 팝업 화면입니다.',
        acts: [{ n: '형식 선택', loc: '라디오', act: '형식 변경' }, { n: '보내기', loc: '하단 버튼', act: '파일 생성' }],
        links: { req: [], art: ['ART-006'], work: [], ifc: ['IFC-002'], fn: ['FN-005'] },
        hist: [{ k: 'st', who: '김기획', at: '06-06', t: '검토 요청 전환', f: '작성완료', to: '검토 대기' }, { k: 'create', who: '이UX', at: '05-28', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-015', name: '프로젝트 구성원 관리', ver: 'v0.3', wst: 'complete', rst: 'pending', ast: 'none', type: 'admin', menu: '보내기 / 설정 > 구성원 관리', owner: '박PM', av: '박', ac: '#5451E8', upd: '2026-06-09', hasImg: false, annots: 0,
        purp: '프로젝트 참여 구성원의 역할 및 접근 범위를 관리하는 화면입니다.',
        acts: [{ n: '구성원 초대', loc: '상단 버튼', act: '초대 Drawer 열기' }, { n: '역할 변경', loc: '행 선택', act: '역할 저장' }],
        links: { req: ['REQ-004'], art: [], work: ['WBS-002'], ifc: [], fn: [] },
        hist: [{ k: 'st', who: '박PM', at: '06-09', t: '검토 요청 전환', f: '작성완료', to: '검토 대기' }, { k: 'edit', who: '박PM', at: '06-07', t: '접근 범위 컬럼 추가', f: 'v0.2', to: 'v0.3' }] }
    ] }
  ];

  var ALL_SCREENS = MENUS.reduce(function (acc, g) {
    return acc.concat(g.screens);
  }, []);

  var REQ_MAP = { 'REQ-001': { n: '인증 요구사항', st: 'approved' }, 'REQ-002': { n: '회원가입 정보 입력', st: 'approved' }, 'REQ-004': { n: '구성원 접근 범위', st: 'approved' }, 'REQ-008': { n: '작업 목록 조회', st: 'approved' }, 'REQ-011': { n: '화면 목록 조회', st: 'approved' }, 'REQ-012': { n: 'Drawer 패턴 정의', st: 'review' }, 'REQ-015': { n: '검토 결과 표시', st: 'draft' } };
  var ART_MAP = { 'ART-003': { n: '화면설계서 Drawer 패턴 정의서', st: 'review' }, 'ART-006': { n: '산출물보내기 명세서', st: 'done' } };
  var WBS_MAP = { 'WBS-002': { n: 'IA 구조 확정 및 메뉴 기준 수립', st: 'done' }, 'WBS-007': { n: 'WBS 목록 화면 기준 설계', st: 'draft' }, 'WBS-009': { n: 'WBS Drawer 상세 설계', st: 'draft' }, 'WBS-010': { n: '요구사항정의서 목록 화면 준비', st: 'draft' }, 'WBS-011': { n: '화면설계서 목록 화면 설계', st: 'draft' } };
  var IFC_MAP = { 'IFC-001': { n: '인증 처리 인터페이스', st: 'done' }, 'IFC-002': { n: '파일보내기 인터페이스', st: 'review' } };
  var FN_MAP = { 'FN-001': { n: '요구사항 목록 조회', st: 'done' }, 'FN-002': { n: '메뉴 구조 등록', st: 'draft' }, 'FN-003': { n: '화면별 기능 매핑', st: 'review' }, 'FN-004': { n: '기능 변경이력 기록', st: 'draft' }, 'FN-005': { n: '기능정의서 내보내기', st: 'hold' } };

  var WST = { writing: { lbl: '작성중', cls: 'ss-chip-ws-w' }, complete: { lbl: '작성완료', cls: 'ss-chip-ws-c' } };
  var RST = { none: { lbl: '미요청', cls: 'ss-chip-rs-n' }, pending: { lbl: '검토 대기', cls: 'ss-chip-rs-p' }, done: { lbl: '검토 완료', cls: 'ss-chip-rs-d' } };
  var AST = { none: { lbl: '미승인', cls: 'ss-chip-as-n' }, approved: { lbl: '승인 완료', cls: 'ss-chip-as-a' }, rejected: { lbl: '반려됨', cls: 'ss-chip-as-r' } };
  var TYP = { list: { lbl: '목록 화면' }, detail: { lbl: '상세 화면' }, form: { lbl: '폼 화면' }, popup: { lbl: '팝업' }, admin: { lbl: '관리 화면' }, main: { lbl: '메인/대시보드' }, result: { lbl: '결과 화면' } };

  var ICONS = {
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    canvas: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    upload: '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>'
  };

  /* State */
  var S = {
    q: 'all',
    srch: '',
    dwMode: null,
    dwItem: null,
    dwTab: 0,
    openId: null,
    grp: { 'G-01': false, 'G-02': false, 'G-03': true, 'G-04': false, 'G-05': false },
    sel: new Set(),
    F: { wst: '', rst: '', ast: '', type: '', grpId: '', img: '' }
  };

  /* ── Helpers ── */
  function ic(d, sz, sw) {
    sz = sz || 14;
    sw = sw || 1.8;
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }

  function wChip(v, h) {
    var x = WST[v] || WST.writing;
    return '<span class="ss-chip ' + x.cls + '"' + (h ? ' style="height:23px;font-size:12px"' : '') + '>' + x.lbl + '</span>';
  }

  function rChip(v, h) {
    var x = RST[v] || RST.none;
    return '<span class="ss-chip ' + x.cls + '"' + (h ? ' style="height:23px;font-size:12px"' : '') + '>' + x.lbl + '</span>';
  }

  function aChip(v, h) {
    var x = AST[v] || AST.none;
    return '<span class="ss-chip ' + x.cls + '"' + (h ? ' style="height:23px;font-size:12px"' : '') + '>' + x.lbl + '</span>';
  }

  function typChip(t) {
    var x = TYP[t] || TYP.list;
    return '<span class="ss-type-chip">' + x.lbl + '</span>';
  }

  function typChipSm(t) {
    var x = TYP[t] || TYP.list;
    return '<span class="ss-type-chip ss-type-chip-sm">' + x.lbl + '</span>';
  }

  function imgChip(has) {
    return has
      ? '<span class="ss-img-chip has">' + ic(ICONS.img, 9) + '이미지</span>'
      : '<span class="ss-img-chip no">없음</span>';
  }

  function annChip(n) {
    return n > 0
      ? '<span class="ss-img-chip has ss-img-chip-ann">' + ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 9) + '주석 ' + n + '</span>'
      : '';
  }

  function ava(ini, col, sz) {
    sz = sz || 22;
    return '<span class="ss-ava" style="width:' + sz + 'px;height:' + sz + 'px;background:' + (col || '#5451E8') + ';font-size:' + Math.round(sz * 0.45) + 'px">' + ini + '</span>';
  }

  function findScreen(id) {
    for (var i = 0; i < ALL_SCREENS.length; i++) {
      if (ALL_SCREENS[i].id === id) return ALL_SCREENS[i];
    }
    return null;
  }

  function findMenu(gid) {
    for (var i = 0; i < MENUS.length; i++) {
      if (MENUS[i].id === gid) return MENUS[i];
    }
    return null;
  }

  /* ── Summary Strip ── */
  function renderStrip() {
    var all = ALL_SCREENS;
    var t = all.length;
    var w = all.filter(function (s) { return s.wst === 'writing'; }).length;
    var p = all.filter(function (s) { return s.rst === 'pending'; }).length;
    var a = all.filter(function (s) { return s.ast === 'approved'; }).length;
    var cells = [
      { id: 'all', lbl: '전체', v: t, dot: null, col: 'var(--t1)', sub: '전체 화면설계서' },
      { id: 'writing', lbl: '작성중', v: w, dot: '#64748B', col: '#475569', sub: '작성 진행 중' },
      { id: 'pending', lbl: '검토 대기', v: p, dot: '#854D0E', col: '#854D0E', sub: '검토자 배정 대기' },
      { id: 'approved', lbl: '승인 완료', v: a, dot: '#047857', col: '#047857', sub: '승인 확정' }
    ];
    var el = document.getElementById('ss-sstrip');
    if (!el) return;
    el.innerHTML = cells.map(function (c) {
      return '<div class="ss-sstrip-cell' + (S.q === c.id ? ' on' : '') + '" data-ss-q="' + c.id + '">' +
        '<div class="ss-sstrip-lbl">' + (c.dot ? '<span class="ss-sstrip-dot" style="background:' + c.dot + '"></span>' : '') + c.lbl + '</div>' +
        '<div class="ss-sstrip-num" style="color:' + c.col + '">' + c.v + '<span style="font-size:12px;font-weight:500;color:var(--t3);margin-left:3px">건</span></div>' +
        '<div class="ss-sstrip-sub">' + c.sub + '</div></div>';
    }).join('');
    var meta = document.getElementById('ss-sstrip-meta');
    if (meta) meta.textContent = '메뉴 그룹 ' + MENUS.length + '개 · 화면 ' + t + '개';
  }

  /* ── Filter logic ── */
  function filterScreens(screens) {
    var F = S.F;
    return screens.filter(function (s) {
      if (F.wst && s.wst !== F.wst) return false;
      if (F.rst && s.rst !== F.rst) return false;
      if (F.ast && s.ast !== F.ast) return false;
      if (F.type && s.type !== F.type) return false;
      if (F.img === 'has' && !s.hasImg) return false;
      if (F.img === 'no' && s.hasImg) return false;
      if (F.img === 'ann' && s.annots === 0) return false;
      return true;
    });
  }

  function getFilterCount() {
    return Object.keys(S.F).filter(function (k) { return S.F[k] !== ''; }).length;
  }

  /* updateFilterInfo: 패널 내 foot-info 텍스트 업데이트 (초기 렌더 시 호출) */
  function updateFilterInfo() {
    var cnt   = getFilterCount();
    var total = 0;
    MENUS.forEach(function (grp) {
      var screens = grp.screens;
      if (cnt > 0) screens = filterScreens(screens);
      total += screens.length;
    });
    /* STAM.boardFilter.init()이 생성한 sbf-foot-info 요소를 찾아 업데이트 */
    var el = document.querySelector('#ss-fpop .sbf-foot-info');
    if (el) el.textContent = '조건 ' + cnt + '개 · 결과 ' + total + '건';
  }
  /* toggleFilter/closeFilter/updateFilterBtn/resetFilter/applyFilter:
     STAM.boardFilter.init()의 공통 핸들러로 대체됨 → initFilter() 참조 */

  /* ── Selection ── */
  function toggleAll(cb) {
    var rows = document.querySelectorAll('.ss-sc-row');
    rows.forEach(function (r) {
      var id = r.getAttribute('data-id');
      var rowCb = r.querySelector('.ss-cb');
      if (cb.checked) {
        S.sel.add(id);
        if (rowCb) rowCb.checked = true;
        r.classList.add('sel');
        r.classList.add('is-selected');
      } else {
        S.sel.delete(id);
        if (rowCb) rowCb.checked = false;
        r.classList.remove('sel');
        r.classList.remove('is-selected');
      }
    });
    updateGroupCheckboxes();
    updateSelBar();
  }

  function toggleSel(id, checked) {
    if (checked) S.sel.add(id); else S.sel.delete(id);
    updateSelBar();
    var allCb = document.getElementById('ss-cb-all');
    var total = document.querySelectorAll('.ss-sc-row').length;
    if (allCb) {
      allCb.checked = S.sel.size === total && total > 0;
      allCb.indeterminate = S.sel.size > 0 && S.sel.size < total;
    }
    updateGroupCheckboxes();
  }

  function toggleGrpSel(gid) {
    var grp = findMenu(gid);
    if (!grp) return;
    var ids = grp.screens.map(function (s) { return s.id; });
    var allSel = ids.every(function (id) { return S.sel.has(id); });
    ids.forEach(function (id) {
      if (allSel) S.sel.delete(id); else S.sel.add(id);
    });
    renderTable();
    updateSelBar();
  }

  function updateGroupCheckboxes() {
    MENUS.forEach(function (grp) {
      var cb = document.getElementById('cb-' + grp.id);
      if (!cb) return;
      var ids = grp.screens.map(function (s) { return s.id; });
      var selCount = ids.filter(function (id) { return S.sel.has(id); }).length;
      cb.checked = selCount === ids.length && ids.length > 0;
      cb.indeterminate = selCount > 0 && selCount < ids.length;
    });
  }

  function updateSelBar() {
    var n = S.sel.size;
    var btn = document.getElementById('ss-del-btn');
    var lbl = document.getElementById('ss-del-btn-lbl');
    if (!btn) return;
    btn.disabled = n === 0;
    if (lbl) lbl.textContent = n > 0 ? '삭제 (' + n + ')' : '삭제';
  }

  /* ── Delete ── */
  function showDeleteConfirm() {
    var n = S.sel.size;
    if (n === 0) return;
    var ids = Array.from(S.sel).sort();
    var msg = document.getElementById('ss-dlg-msg');
    var target = document.getElementById('ss-dlg-target');
    var overlay = document.getElementById('ss-dlg-overlay');
    if (msg) msg.textContent = '선택한 화면설계서 ' + n + '건을 삭제하시겠습니까?';
    if (target) {
      target.textContent = n === 1 ? ids[0] : ids[0] + ' 외 ' + (n - 1) + '건';
      target.classList.add('show');
    }
    if (overlay) overlay.classList.add('open');
  }

  function cancelDelete() {
    var overlay = document.getElementById('ss-dlg-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function confirmDelete() {
    S.sel.clear();
    cancelDelete();
    updateSelBar();
    var allCb = document.getElementById('ss-cb-all');
    if (allCb) {
      allCb.checked = false;
      allCb.indeterminate = false;
    }
    renderTable();
  }

  /* ── Table ── */
  function renderTable() {
    var q = S.srch.toLowerCase();
    var html = '';
    var total = 0;

    /* Records section (신규 작성 기록) — 항상 상단에 표시 */
    if (SSP.records && SSP.records.length > 0) {
      var rDraft  = SSP.records.filter(function(r) { return r.status === 'draft'; }).length;
      var rSaved  = SSP.records.filter(function(r) { return r.status === 'saved'; }).length;
      var rReview = SSP.records.filter(function(r) { return r.status === 'review'; }).length;
      html += '<tr class="ss-gr-row ss-records-grp">' +
        '<td class="ss-ch stam-check-cell"></td>' +
        '<td colspan="8"><div class="ss-gr-cell">' +
        '<svg class="ss-gr-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<span class="ss-gr-name">신규 작성 기록</span>' +
        '<span class="ss-gr-sep"></span>' +
        '<span class="ss-gr-count">' + SSP.records.length + '개 화면</span>' +
        '<div class="ss-gr-chips">' +
        (rDraft  > 0 ? '<span class="ss-gr-chip ss-chip-rec-draft">작성중 '  + rDraft  + '</span>' : '') +
        (rSaved  > 0 ? '<span class="ss-gr-chip ss-chip-rec-saved">저장됨 '   + rSaved  + '</span>' : '') +
        (rReview > 0 ? '<span class="ss-gr-chip ss-chip-rec-review">검토요청 ' + rReview + '</span>' : '') +
        '</div></div></td></tr>';

      SSP.records.forEach(function(rec, ri) {
        var last = ri === SSP.records.length - 1;
        var blockInfo = rec.blocks ? rec.blocks.length + '블록' : '';
        var tplInfo   = rec.pageTemplateName || '';
        var infoTxt   = tplInfo + (tplInfo && blockInfo ? ' · ' : '') + blockInfo;
        html += '<tr class="ss-sc-row ss-record-row stam-table-row' + (last ? ' lg' : '') +
          '" data-id="' + rec.id + '" data-record-id="' + rec.id + '">' +
          '<td class="ss-ch stam-check-cell"></td>' +
          '<td class="ss-name-col"><div class="ss-sc-cell">' +
            '<span class="ss-sc-ind">└</span>' +
            '<span class="ss-sc-id">' + rec.screenId + '</span>' +
            '<span class="ss-sc-name">' + (rec.screenName || '제목 없음') + '</span>' +
            '<span class="ss-type-chip ss-type-chip-sm ss-rec-svc-chip">' + rec.serviceTypeName + '</span>' +
            '<span class="ss-type-chip ss-type-chip-sm">' + rec.frontAdminName + '</span>' +
          '</div></td>' +
          '<td><span class="ss-vp">v0.1</span></td>' +
          '<td>' + recordStatusChip(rec.status) + '</td>' +
          '<td>' + rChip(rec.reviewStatus === 'requested' ? 'pending' : 'none') + '</td>' +
          '<td>' + aChip('none') + '</td>' +
          '<td style="font-size:11px;color:var(--t3);white-space:nowrap">' + infoTxt + '</td>' +
          '<td style="color:var(--t3);font-size:12px">' + (rec.updatedAt ? rec.updatedAt.slice(5).replace('.', '-') : '') + '</td>' +
          '<td><div class="ss-rec-actions">' +
            '<button type="button" class="ss-rec-act-btn" data-ssv-action="record-detail" data-record-id="' + rec.id + '">상세</button>' +
            '<button type="button" class="ss-rec-act-btn ss-rec-act-edit" data-ssv-action="record-edit" data-record-id="' + rec.id + '">수정</button>' +
          '</div></td>' +
        '</tr>';
      });
    }

    MENUS.forEach(function (grp) {
      if (S.F.grpId && grp.id !== S.F.grpId) return;
      var screens = grp.screens;
      if (S.q === 'writing') screens = screens.filter(function (s) { return s.wst === 'writing'; });
      if (S.q === 'pending') screens = screens.filter(function (s) { return s.rst === 'pending'; });
      if (S.q === 'approved') screens = screens.filter(function (s) { return s.ast === 'approved'; });
      screens = filterScreens(screens);
      var grpMatch = q && grp.name.toLowerCase().indexOf(q) !== -1;
      if (q && !grpMatch) {
        screens = screens.filter(function (s) {
          return s.id.toLowerCase().indexOf(q) !== -1 || s.name.toLowerCase().indexOf(q) !== -1;
        });
      }
      if (screens.length === 0 && !grpMatch && q) return;
      if (screens.length === 0 && S.q !== 'all') return;
      total += screens.length;
      var gW = screens.filter(function (s) { return s.wst === 'writing'; }).length;
      var gP = screens.filter(function (s) { return s.rst === 'pending'; }).length;
      var gA = screens.filter(function (s) { return s.ast === 'approved'; }).length;
      var exp = S.grp[grp.id] !== false || (q && screens.length > 0);
      var grpIds = grp.screens.map(function (s) { return s.id; });
      var grpSelCount = grpIds.filter(function (id) { return S.sel.has(id); }).length;
      var cbChecked = grpSelCount === grp.screens.length && grp.screens.length > 0;
      var cbIndet = grpSelCount > 0 && grpSelCount < grp.screens.length;
      html += '<tr class="ss-gr-row">' +
        '<td class="ss-ch stam-check-cell"><input type="checkbox" class="ss-cb stam-check" id="cb-' + grp.id + '"' +
        (cbChecked ? ' checked' : '') + (cbIndet ? ' data-indet' : '') +
        ' data-ss-grp-sel="' + grp.id + '"></td>' +
        '<td colspan="8"><div class="ss-gr-cell" data-ss-grp="' + grp.id + '">' +
        '<svg class="ss-gr-caret' + (exp ? '' : ' col') + '" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '<span class="ss-gr-icon">' + ic(ICONS.folder, 14) + '</span>' +
        '<span class="ss-gr-name">' + grp.name + '</span>' +
        '<span class="ss-gr-sep"></span>' +
        '<span class="ss-gr-count">' + grp.screens.length + '개 화면</span>' +
        '<div class="ss-gr-chips">' +
        (gW > 0 ? '<span class="ss-gr-chip ss-chip-ws-w">작성중 ' + gW + '</span>' : '') +
        (gP > 0 ? '<span class="ss-gr-chip ss-chip-rs-p">검토대기 ' + gP + '</span>' : '') +
        (gA > 0 ? '<span class="ss-gr-chip ss-chip-as-a">승인 ' + gA + '</span>' : '') +
        '</div></div></td></tr>';
      if (!exp) return;
      screens.forEach(function (s, i) {
        var last = i === screens.length - 1;
        var isSel = S.sel.has(s.id);
        var isOpen = S.openId === s.id;
        html += '<tr class="ss-sc-row stam-table-row' + (isSel ? ' sel is-selected' : '') + (isOpen ? ' is-active' : '') + (last ? ' lg' : '') + '" data-id="' + s.id + '">' +
          '<td class="ss-ch stam-check-cell"><input type="checkbox" class="ss-cb stam-check"' + (isSel ? ' checked' : '') +
          ' data-ss-sel="' + s.id + '"></td>' +
          '<td class="ss-name-col"><div class="ss-sc-cell"><span class="ss-sc-ind">└</span>' +
          '<span class="ss-sc-id">' + s.id + '</span><span class="ss-sc-name">' + s.name + '</span>' +
          typChipSm(s.type) + '</div></td>' +
          '<td><span class="ss-vp">' + s.ver + '</span></td>' +
          '<td>' + wChip(s.wst) + '</td>' +
          '<td>' + rChip(s.rst) + '</td>' +
          '<td>' + aChip(s.ast) + '</td>' +
          '<td style="display:flex;align-items:center;gap:4px">' + imgChip(s.hasImg) + annChip(s.annots) + '</td>' +
          '<td style="color:var(--t3);font-size:12px">' + s.upd.slice(5) + '</td>' +
          '<td></td></tr>';
      });
    });
    if (!html) {
      html = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--t3)">조건에 맞는 화면설계서가 없습니다.</td></tr>';
    }
    var tbody = document.getElementById('ss-tbody');
    if (tbody) tbody.innerHTML = html;
    var tfoot = document.getElementById('ss-tfoot-info');
    if (tfoot) {
      tfoot.innerHTML = total === ALL_SCREENS.length
        ? '전체 ' + ALL_SCREENS.length + '건'
        : '필터 적용 · <b style="color:var(--t1)">' + total + '</b>건';
    }
    document.querySelectorAll('.ss-gr-row .ss-cb[data-indet]').forEach(function (cb) {
      cb.indeterminate = true;
    });
    var allCb = document.getElementById('ss-cb-all');
    var totalRows = document.querySelectorAll('.ss-sc-row').length;
    if (allCb) {
      allCb.checked = S.sel.size === totalRows && totalRows > 0;
      allCb.indeterminate = S.sel.size > 0 && S.sel.size < totalRows;
    }
  }

  function setQ(q) {
    S.q = q;
    renderStrip();
    renderTable();
  }

  function doSearch() {
    var srch = document.getElementById('ss-srch');
    S.srch = srch ? srch.value : '';
    renderTable();
  }

  function toggleGroup(gid) {
    S.grp[gid] = !S.grp[gid];
    renderTable();
  }

  /* ── Drawer ── */
  function showDw(mode, item) {
    S.dwMode = mode;
    S.dwItem = item;
    S.dwTab = 0;
    S.openId = (mode === 'detail' && item) ? item.id : null;
    renderDw();
    var drawer = document.getElementById('ss-drawer');
    var scrim = document.getElementById('ss-dw-scrim');
    if (drawer) drawer.classList.add('open');
    if (scrim) scrim.classList.add('show');
    renderTable();
  }

  function closeDw() {
    S.dwMode = null;
    S.dwItem = null;
    S.openId = null;
    closeAllCustomSelects();
    var drawer = document.getElementById('ss-drawer');
    var scrim = document.getElementById('ss-dw-scrim');
    if (drawer) drawer.classList.remove('open');
    if (scrim) scrim.classList.remove('show');
    renderTable();
  }

  function setTab(i) {
    S.dwTab = i;
    renderDw();
  }

  function openDetail(id) {
    showDw('detail', findScreen(id));
  }

  function openRegister() {
    showDw('register', null);
  }

  function openEdit() {
    showDw('edit', S.dwItem);
  }

  function openReviewReq() {
    showDw('reviewreq', S.dwItem);
  }

  function renderDw() {
    var m = { detail: renderDetail, register: renderRegister, edit: renderEdit, reviewreq: renderReviewReq };
    if (m[S.dwMode]) m[S.dwMode](S.dwItem);
    enhanceDrawerSelects();
  }

  /* ── Custom Select (Drawer 내부 select 톤 보정 전용) ──
     네이티브 <select>는 값의 source of truth로 유지(숨김)하고,
     그 위에 STAM/WBS 톤의 trigger + option panel을 덧씌운다.
     데이터/필드/저장 로직은 변경하지 않는다. */
  var csUid = 0;
  /* WBS selected option과 동일 톤의 작은 check (currentColor 상속) */
  var CS_CHECK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function buildCustomSelect(native) {
    if (native.getAttribute('data-cs') === '1') return;
    native.setAttribute('data-cs', '1');
    var uid = 'sscs-' + (++csUid);
    var activeIdx = -1;

    var wrap = document.createElement('div');
    wrap.className = 'ss-cs stam-cs';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ss-cs-trigger stam-cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', uid + '-list');

    var valSpan = document.createElement('span');
    valSpan.className = 'ss-cs-val stam-cs-value';

    var caret = document.createElement('span');
    caret.className = 'ss-cs-caret stam-cs-icon';
    caret.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(valSpan);
    trigger.appendChild(caret);

    var panel = document.createElement('div');
    panel.className = 'ss-cs-panel stam-cs-menu';
    panel.id = uid + '-list';
    panel.setAttribute('role', 'listbox');

    Array.prototype.forEach.call(native.options, function (o, i) {
      var od = document.createElement('div');
      od.className = 'ss-cs-opt stam-cs-opt';
      od.id = uid + '-opt-' + i;
      od.setAttribute('role', 'option');
      od.setAttribute('data-idx', i);
      od.setAttribute('aria-selected', 'false');
      if (o.value === '') od.classList.add('is-placeholder');
      /* WBS와 동일: 모든 option에 check 슬롯(고정폭) → 텍스트 시작 정렬 일치.
         실제 selected(is-sel)일 때만 CSS로 check 표시. */
      var ck = document.createElement('span');
      ck.className = 'ss-cs-check stam-cs-check';
      ck.setAttribute('aria-hidden', 'true');
      ck.innerHTML = CS_CHECK_SVG;
      var tx = document.createElement('span');
      tx.className = 'ss-cs-otext stam-cs-otext';
      tx.textContent = o.textContent;
      od.appendChild(ck);
      od.appendChild(tx);
      panel.appendChild(od);
    });

    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    native.classList.add('ss-cs-native');

    function syncLabel() {
      var sel = native.options[native.selectedIndex];
      valSpan.textContent = sel ? sel.textContent : '';
      valSpan.classList.toggle('is-placeholder', !!sel && sel.value === '');
      Array.prototype.forEach.call(panel.children, function (c) {
        var idx = parseInt(c.getAttribute('data-idx'), 10);
        var isSelected = idx === native.selectedIndex;
        var isPlaceholder = c.classList.contains('is-placeholder');
        /* placeholder는 선택돼 있어도 selected 강조를 주지 않는다. */
        c.classList.toggle('is-sel', isSelected && !isPlaceholder);
        c.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    }
    syncLabel();

    function setActive(idx) {
      var opts = panel.children;
      if (idx < 0) idx = 0;
      if (idx > opts.length - 1) idx = opts.length - 1;
      activeIdx = idx;
      Array.prototype.forEach.call(opts, function (c, i) {
        c.classList.toggle('is-active', i === idx);
      });
      var act = opts[idx];
      if (act) {
        trigger.setAttribute('aria-activedescendant', act.id);
        act.scrollIntoView({ block: 'nearest' });
      }
    }

    /* opened dropdown 하단 클리핑 보정: Drawer body 영역 기준으로
       아래 공간이 부족하고 위가 더 넓으면 위로 펼친다(.cs-up). */
    function applyFlip() {
      wrap.classList.remove('cs-up');
      wrap.classList.remove('is-up');
      var container = document.getElementById('ss-dw-body');
      if (!container) return;
      var ph = panel.offsetHeight;
      var tRect = trigger.getBoundingClientRect();
      var cRect = container.getBoundingClientRect();
      var below = cRect.bottom - tRect.bottom;
      var above = tRect.top - cRect.top;
      if (below < ph + 8 && above > below) {
        wrap.classList.add('cs-up');
        wrap.classList.add('is-up');
      }
    }

    function openPanel() {
      closeAllCustomSelects();
      wrap.classList.add('open');
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      applyFlip();
      setActive(native.selectedIndex >= 0 ? native.selectedIndex : 0);
    }

    function selectIdx(idx) {
      if (native.selectedIndex !== idx) {
        native.selectedIndex = idx;
        native.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncLabel();
      closeCustomSelect(wrap);
      trigger.focus();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains('open')) closeCustomSelect(wrap);
      else openPanel();
    });

    trigger.addEventListener('keydown', function (e) {
      var isOpen = wrap.classList.contains('open');
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) openPanel(); else setActive(activeIdx + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) openPanel(); else setActive(activeIdx - 1);
          break;
        case 'Home':
          if (isOpen) { e.preventDefault(); setActive(0); }
          break;
        case 'End':
          if (isOpen) { e.preventDefault(); setActive(panel.children.length - 1); }
          break;
        case 'Enter':
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          if (!isOpen) openPanel(); else selectIdx(activeIdx);
          break;
        case 'Tab':
          if (isOpen) closeCustomSelect(wrap);
          break;
      }
    });

    panel.addEventListener('mousemove', function (e) {
      var od = e.target.closest('.ss-cs-opt');
      if (od) setActive(parseInt(od.getAttribute('data-idx'), 10));
    });

    panel.addEventListener('click', function (e) {
      var od = e.target.closest('.ss-cs-opt');
      if (!od) return;
      e.stopPropagation();
      selectIdx(parseInt(od.getAttribute('data-idx'), 10));
    });
  }

  function closeCustomSelect(wrap) {
    wrap.classList.remove('open');
    wrap.classList.remove('cs-up');
    wrap.classList.remove('is-open');
    wrap.classList.remove('is-up');
    var t = wrap.querySelector('.ss-cs-trigger');
    if (t) {
      t.setAttribute('aria-expanded', 'false');
      t.removeAttribute('aria-activedescendant');
    }
  }

  function closeAllCustomSelects() {
    document.querySelectorAll('.ss-cs.open').forEach(closeCustomSelect);
  }

  function enhanceDrawerSelects() {
    var body = document.getElementById('ss-dw-body');
    if (!body) return;
    body.querySelectorAll('select.ss-inp').forEach(buildCustomSelect);
  }

  function dwFootTemp() {
    return '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary ss-dw-btn-temp">임시저장</button>';
  }

  /* 실제 제품 페이지가 있는 화면만 전체 보기 → 제품 페이지로 이동.
     나머지는 제품 페이지 미존재 → 전체 보기 비활성(준비중), 상세 Drawer 기준 유지. */
  var PRODUCT_PAGE = {
    'SCR-007': '/pages/boards/wbs.html',
    'SCR-008': '/pages/boards/screen-specification.html'
  };

  function dwFootFullView(item) {
    var page = item && PRODUCT_PAGE[item.id];
    if (page) {
      return '<button type="button" class="stam-btn stam-btn--md stam-btn--ghost" data-ss-dw-action="fullview" data-ss-fullview-page="' + page + '">전체 보기</button>';
    }
    return '<button type="button" class="stam-btn stam-btn--md stam-btn--ghost" data-ss-dw-action="fullview" disabled title="제품 페이지 준비중">전체 보기</button>';
  }

  function tabOverview(d) {
    return '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>상태</h3></div><div class="ss-status-row">' +
      '<span class="ss-sr-item"><span class="ss-sr-lbl">작성</span>' + wChip(d.wst, true) + '</span>' +
      '<span class="ss-sr-sep"></span><span class="ss-sr-item"><span class="ss-sr-lbl">검토</span>' + rChip(d.rst, true) + '</span>' +
      '<span class="ss-sr-sep"></span><span class="ss-sr-item"><span class="ss-sr-lbl">승인</span>' + aChip(d.ast, true) + '</span></div></div>' +
      '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>기본 정보</h3></div><div class="ss-igrid">' +
      '<div class="ss-ic"><div class="ss-ik">화면 ID</div><div class="ss-iv" style="font-size:12px;color:var(--brand);font-weight:700">' + d.id + '</div></div>' +
      '<div class="ss-ic"><div class="ss-ik">화면 유형</div><div class="ss-iv">' + typChip(d.type) + '</div></div>' +
      '<div class="ss-ic"><div class="ss-ik">버전</div><div class="ss-iv"><span class="ss-vp">' + d.ver + '</span></div></div>' +
      '<div class="ic full"><div class="ss-ik">메뉴 경로</div><div class="ss-iv" style="font-size:12.5px;color:var(--t2);font-weight:500">' + d.menu + '</div></div>' +
      '<div class="ss-ic"><div class="ss-ik">담당자</div><div class="ss-iv">' + ava(d.av, d.ac) + ' ' + d.owner + '</div></div>' +
      '<div class="ss-ic"><div class="ss-ik">최종 수정</div><div class="ss-iv" style="font-size:12px;color:var(--t3);font-weight:400">' + d.upd + '</div></div></div></div>' +
      '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>화면 목적</h3></div><div class="ss-purp-box">' + d.purp + '</div></div>' +
      (d.acts && d.acts.length ? '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>주요 액션</h3></div><div class="ss-act-list">' +
        d.acts.map(function (a, i) {
          return '<div class="ss-act-item"><span class="ss-act-n">' + (i + 1) + '</span><span><b style="color:var(--t1)">' + a.n + '</b> — ' + a.loc + ' → ' + a.act + '</span></div>';
        }).join('') + '</div></div>' : '') +
      '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>화면 이미지 / UI 주석</h3></div><div class="ss-img-card"><div class="ss-img-thumb">' +
      (d.hasImg
        ? '<div style="display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--t3)">' + ic(ICONS.img, 50, 1) + '<span style="font-size:12px;opacity:.5">화면 이미지 썸네일</span></div>'
        : '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--t3)">' + ic(ICONS.img, 34, 1.5) + '<span style="font-size:12px;opacity:.5">이미지 없음</span></div>') +
      '</div><div class="ss-img-meta"><div class="ss-img-meta-row"><div class="ss-img-chips">' + imgChip(d.hasImg) + ' ' + annChip(d.annots) + '</div></div>' +
      '<div class="ss-img-actions"><button type="button" class="ss-btn ss-btn-out" style="font-size:11.5px;padding:5px 10px">' + ic(ICONS.edit, 12) + ' UI 주석 편집 열기</button>' +
      '<button type="button" class="ss-btn ss-btn-ghost" style="font-size:11.5px;padding:5px 10px">' + ic(ICONS.canvas, 12) + ' 전체 캔버스 보기</button></div></div></div></div>';
  }

  function tabLinks(d) {
    var secs = [
      { t: '연결 요구사항', empty: '연결된 요구사항 없음', items: d.links.req, map: REQ_MAP, fg: '#1D4ED8', bg: 'rgba(29,78,216,.08)' },
      { t: '연결 산출물', empty: '연결된 산출물 없음', items: d.links.art, map: ART_MAP, fg: 'var(--brand)', bg: 'var(--stam-soft)' },
      { t: '연결 작업', empty: '연결된 작업 없음', items: d.links.work, map: WBS_MAP, fg: '#047857', bg: 'rgba(4,120,87,.08)' },
      { t: '인터페이스 연결', empty: '연결된 인터페이스 없음', items: d.links.ifc, map: IFC_MAP, fg: '#854D0E', bg: 'rgba(133,77,14,.08)' },
      { t: '연결 기능', empty: '연결된 기능 없음', items: d.links.fn || [], map: FN_MAP, fg: '#7c3aed', bg: 'rgba(124,58,237,.12)' }
    ];
    var stMap = {
      done: { l: '완료', bg: 'rgba(4,120,87,.10)', fg: '#047857' },
      review: { l: '검토중', bg: 'rgba(84,81,232,.10)', fg: '#4340C8' },
      draft: { l: '작성중', bg: 'rgba(100,116,139,.10)', fg: '#64748B' },
      approved: { l: '승인', bg: 'rgba(4,120,87,.10)', fg: '#047857' }
    };
    return secs.map(function (s) {
      return '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>' + s.t + '</h3></div>' +
        (s.items.length
          ? '<div style="display:flex;flex-direction:column;gap:7px">' + s.items.map(function (id) {
            var item = s.map[id] || { n: id, st: 'draft' };
            var st = stMap[item.st] || stMap.draft;
            return '<div class="ss-tcard"><div class="ss-tic" style="background:' + s.bg + ';color:' + s.fg + '">' + ic(ICONS.doc, 14) + '</div>' +
              '<div class="ss-tb"><div class="ss-tid" style="color:' + s.fg + '">' + id + '</div><div class="ss-tn">' + item.n + '</div></div>' +
              '<span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:99px;background:' + st.bg + ';color:' + st.fg + '">' + st.l + '</span></div>';
          }).join('') + '</div>'
          : '<div class="ss-empty">' + s.empty + ' <button type="button" class="ss-link-add" style="height:28px;font-size:11px">' + ic(ICONS.plus, 11) + ' 연결 추가</button></div>') +
        '</div>';
    }).join('');
  }

  function tabHistory(d) {
    var kMap = {
      edit: { ico: ic(ICONS.edit, 13), bg: 'rgba(84,81,232,.10)', fg: 'var(--brand)' },
      st: { ico: ic(ICONS.check, 13), bg: 'rgba(4,120,87,.10)', fg: '#047857' },
      create: { ico: ic(ICONS.plus, 13), bg: 'rgba(29,78,216,.10)', fg: '#1D4ED8' }
    };
    return '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>변경 이력</h3></div><div class="ss-rtl">' +
      d.hist.map(function (h) {
        var k = kMap[h.k] || kMap.edit;
        return '<div class="ss-ri"><div class="ss-rdot" style="background:' + k.bg + ';color:' + k.fg + '">' + k.ico + '</div>' +
          '<div class="ss-rb"><div class="ss-rw">' + h.t + (h.f ? ' <span style="font-size:11px;color:var(--t3);font-weight:400">' + h.f + ' → ' + (h.to || h.n) + '</span>' : '') +
          '</div><div class="ss-ra">' + h.who + ' · ' + h.at + '</div></div></div>';
      }).join('') + '</div></div>' +
      '<div class="ss-dw-sec ss-approval-box"><div class="ss-dw-sec-hdr"><h3>검토 / 승인 액션</h3></div><div class="ss-approval-actions" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="ss-btn" style="background:rgba(4,120,87,.10);color:#047857;border-color:rgba(4,120,87,.22)">' + ic(ICONS.check, 12) + ' 승인</button>' +
      '<button type="button" class="ss-btn" style="background:var(--danger-bg);color:var(--danger-col);border-color:var(--danger-bd)">' + ic(ICONS.close, 12) + ' 반려</button></div></div>';
  }

  function renderDetail(d) {
    var lc = d.links.req.length + d.links.art.length + d.links.work.length + d.links.ifc.length + (d.links.fn ? d.links.fn.length : 0);
    var tabs = document.getElementById('ss-dw-tabs');
    var head = document.getElementById('ss-dw-head');
    var body = document.getElementById('ss-dw-body');
    var foot = document.getElementById('ss-dw-foot');
    if (tabs) tabs.style.display = 'flex';
    if (head) {
      head.innerHTML = '<div class="ss-dw-hrow"><span class="ss-dw-id">' + d.id + '</span><span class="ss-vp">' + d.ver + '</span><span class="ss-dw-mode-badge is-detail">상세</span><span style="flex:1"></span>' +
        '<button type="button" class="ss-dw-close" data-ss-dw-action="close" aria-label="닫기">' + ic(ICONS.close, 15) + '</button></div>' +
        '<div class="ss-dw-htitle">' + d.name + '</div>' +
        '<div class="ss-dw-hmeta">' + typChip(d.type) + wChip(d.wst) + rChip(d.rst) + aChip(d.ast) + '</div>';
    }
    if (tabs) {
      tabs.innerHTML = [['개요', null], ['연결정보', lc], ['검토이력', d.hist.length]].map(function (pair, i) {
        return '<button type="button" class="ss-dw-tab' + (S.dwTab === i ? ' on' : '') + '" data-ss-tab="' + i + '">' + pair[0] +
          (pair[1] !== null ? '<span class="ss-dw-tc">' + pair[1] + '</span>' : '') + '</button>';
      }).join('');
    }
    if (body) body.innerHTML = [tabOverview, tabLinks, tabHistory][S.dwTab](d);
    if (foot) {
      var footHtml = '<span class="ss-dw-detail-timestamp">최종 변경 ' + d.upd + '</span>';
      if (d.ast === 'approved') {
        footHtml += '<span class="ss-dw-fm">' + d.ver + ' · 승인 완료</span>';
      } else {
        footHtml += '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary ss-dw-btn-temp" data-ss-dw-action="edit">수정</button>' +
          '<button type="button" class="stam-btn stam-btn--md ss-btn-review" data-ss-dw-action="reviewreq">검토 요청</button>';
      }
      footHtml += dwFootFullView(d);
      foot.innerHTML = footHtml;
    }
  }

  function renderRegister() {
    var tabs = document.getElementById('ss-dw-tabs');
    var head = document.getElementById('ss-dw-head');
    var body = document.getElementById('ss-dw-body');
    var foot = document.getElementById('ss-dw-foot');
    if (tabs) tabs.style.display = 'none';
    if (head) {
      head.innerHTML = '<div class="ss-dw-hrow"><span class="ss-dw-mode-badge is-create">신규 등록</span><span style="flex:1"></span><button type="button" class="ss-dw-close" data-ss-dw-action="close" aria-label="닫기">' + ic(ICONS.close, 15) + '</button></div>' +
        '<div class="ss-dw-htitle">화면 등록</div><div class="ss-dw-hdesc">화면설계서 기본 정보, 이미지, 연결정보를 등록합니다.</div>';
    }
    if (body) {
      body.innerHTML = '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">1</span><span class="ss-fs-title">기본 정보</span></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">화면 ID <span class="ss-req">*</span></label><input class="ss-inp stam-input is-readonly ro" value="자동 생성" readonly></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">화면명 <span class="ss-req">*</span></label><input class="ss-inp stam-input" placeholder="화면명 입력"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">화면 유형 <span class="ss-req">*</span></label><select class="ss-inp"><option value="">유형 선택</option><option>목록 화면</option><option>상세 화면</option><option>폼 화면</option><option>팝업</option><option>관리 화면</option></select></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">버전</label><input class="ss-inp stam-input" value="v0.1" placeholder="v0.1"></div>' +
        '<div class="ss-ffield full"><label class="ss-flbl stam-label">메뉴 경로 <span class="ss-req">*</span></label><select class="ss-inp"><option value="">메뉴 그룹 선택</option><option>대시보드</option><option>회원</option><option>산출물 관리</option><option>검토 관리</option><option>보내기 / 설정</option></select></div></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">2</span><span class="ss-fs-title">작성 정보</span></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">담당자 <span class="ss-req">*</span></label><input class="ss-inp stam-input" placeholder="담당자 이름"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">초기 상태</label><select class="ss-inp"><option>작성중</option><option>작성완료</option></select></div>' +
        '<div class="ss-ffield full"><label class="ss-flbl stam-label">화면 목적</label><textarea class="ss-inp stam-textarea" placeholder="이 화면의 목적을 간략히 기술합니다." rows="3"></textarea></div></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">3</span><span class="ss-fs-title">화면 이미지</span></div><div class="ss-upload-area">' + ic(ICONS.upload, 24, 1.5) +
        '<span style="font-size:12.5px;font-weight:600">이미지 첨부</span><span style="font-size:11px;color:var(--t3)">PNG, JPG, GIF · 최대 10MB</span></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">4</span><span class="ss-fs-title">연결정보</span></div><div class="ss-link-group">' +
        '<button type="button" class="ss-link-add">' + ic(ICONS.plus, 11) + ' 요구사항 연결</button>' +
        '<button type="button" class="ss-link-add">' + ic(ICONS.plus, 11) + ' 작업 연결</button>' +
        '<button type="button" class="ss-link-add">' + ic(ICONS.plus, 11) + ' 인터페이스 연결</button></div></div>';
    }
    if (foot) {
      foot.innerHTML = '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary" data-ss-dw-action="close">취소</button>' +
        dwFootTemp() + dwFootFullView() +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--primary ss-dw-btn-primary">등록</button>';
    }
  }

  function renderEdit(d) {
    if (!d) { renderRegister(); return; }
    var tabs = document.getElementById('ss-dw-tabs');
    var head = document.getElementById('ss-dw-head');
    var body = document.getElementById('ss-dw-body');
    var foot = document.getElementById('ss-dw-foot');
    if (tabs) tabs.style.display = 'none';
    if (head) {
      head.innerHTML = '<div class="ss-dw-hrow"><span class="ss-dw-id">' + d.id + '</span><span class="ss-vp">' + d.ver + '</span><span class="ss-dw-mode-badge is-edit">수정</span><span style="flex:1"></span>' +
        '<button type="button" class="ss-dw-close" data-ss-dw-action="close" aria-label="닫기">' + ic(ICONS.close, 15) + '</button></div>' +
        '<div class="ss-dw-htitle">화면 수정</div><div class="ss-dw-hdesc">화면설계서 기본 정보와 이미지/연결정보를 수정합니다.</div>';
    }
    if (body) {
      body.innerHTML = '<div class="ss-edit-sum">' + ava(d.av, d.ac, 28) +
        '<div><div style="font-size:12.5px;font-weight:700;color:var(--t1)">' + d.name + '</div>' +
        '<div style="font-size:11px;color:var(--t3);margin-top:2px">' + d.menu + ' · ' + d.upd + ' 최종 수정</div></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">1</span><span class="ss-fs-title">기본 정보 수정</span></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">화면명 <span class="ss-req">*</span></label><input class="ss-inp stam-input" value="' + d.name + '"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">화면 유형</label><select class="ss-inp"><option>' + (TYP[d.type] ? TYP[d.type].lbl : d.type) + '</option></select></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">담당자</label><input class="ss-inp stam-input" value="' + d.owner + '"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">버전</label><input class="ss-inp stam-input" value="' + d.ver + '"></div>' +
        '<div class="ss-ffield full"><label class="ss-flbl stam-label">화면 목적</label><textarea class="ss-inp stam-textarea" rows="3">' + d.purp + '</textarea></div></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">2</span><span class="ss-fs-title">상태 정보</span></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">작성 상태</label><select class="ss-inp"><option' + (d.wst === 'writing' ? ' selected' : '') + '>작성중</option><option' + (d.wst === 'complete' ? ' selected' : '') + '>작성완료</option></select></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">검토 상태</label><input class="ss-inp stam-input is-readonly ro" value="' + (RST[d.rst] ? RST[d.rst].lbl : '-') + '" readonly></div></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">3</span><span class="ss-fs-title">화면 이미지 관리</span></div><div class="ss-img-card"><div class="ss-img-thumb" style="min-height:100px">' +
        (d.hasImg
          ? '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--t3)">' + ic(ICONS.img, 34, 1) + '<span style="font-size:11.5px;opacity:.5">현재 이미지</span></div>'
          : '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--t3)">' + ic(ICONS.img, 28, 1.5) + '<span style="font-size:11.5px;opacity:.5">이미지 없음</span></div>') +
        '</div><div class="ss-img-meta" style="padding:10px 14px"><div class="ss-img-actions">' +
        (d.hasImg
          ? '<button type="button" class="ss-btn ss-btn-out" style="font-size:11.5px;padding:5px 10px">' + ic(ICONS.img, 12) + ' 이미지 교체</button><button type="button" class="ss-btn ss-btn-ghost" style="font-size:11.5px;padding:5px 10px">' + ic(ICONS.close, 12) + ' 이미지 제거</button>'
          : '<button type="button" class="ss-btn ss-btn-out" style="font-size:11.5px;padding:5px 10px">' + ic(ICONS.upload, 12) + ' 이미지 첨부</button>') +
        '</div></div></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">4</span><span class="ss-fs-title">변경 사유</span></div><div class="ss-ffield">' +
        '<label class="ss-flbl stam-label">변경 사유</label><textarea class="ss-inp stam-textarea" rows="3" placeholder="이번 수정의 변경 사유를 간략히 기술합니다."></textarea>' +
        '<span class="ss-helper">버전 이력에 기록됩니다.</span></div></div>';
    }
    if (foot) {
      foot.innerHTML = '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary" data-ss-dw-action="detail-back">취소</button>' +
        dwFootTemp() + dwFootFullView(d) +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--primary ss-dw-btn-primary">저장</button>';
    }
  }

  function renderReviewReq(d) {
    if (!d) return;
    var tabs = document.getElementById('ss-dw-tabs');
    var head = document.getElementById('ss-dw-head');
    var body = document.getElementById('ss-dw-body');
    var foot = document.getElementById('ss-dw-foot');
    if (tabs) tabs.style.display = 'none';
    if (head) {
      head.innerHTML = '<div class="ss-dw-hrow"><span style="flex:1"></span><button type="button" class="ss-dw-close" data-ss-dw-action="close" aria-label="닫기">' + ic(ICONS.close, 15) + '</button></div>' +
        '<div class="ss-dw-htitle">검토 요청</div><div class="ss-dw-hdesc">선택한 화면설계서의 검토를 요청합니다.</div>';
    }
    if (body) {
      body.innerHTML = '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>요청 대상</h3></div><div class="ss-target-card">' +
        '<div style="width:36px;height:36px;border-radius:var(--r-md);background:var(--stam-soft);display:grid;place-items:center;color:var(--brand);flex-shrink:0">' + ic(ICONS.doc, 16) + '</div>' +
        '<div><div style="font-size:12.5px;font-weight:700;color:var(--t1)">' + d.name + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:4px">' + wChip(d.wst) + ' ' + typChip(d.type) + '</div></div>' +
        '<span class="ss-dw-id" style="margin-left:auto">' + d.id + '</span></div></div>' +
        '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>검토자</h3></div><div class="ss-fgrid">' +
        '<div class="ss-ffield full"><label class="ss-flbl stam-label">검토자 <span class="ss-req">*</span></label>' +
        '<select class="ss-inp"><option value="">검토자 선택</option><option>박PM</option><option>김기획</option><option>이UX</option><option>최개발</option></select>' +
        '<span class="ss-helper">검토 완료 시 알림이 발송됩니다.</span></div></div></div>' +
        '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>요청 메시지</h3></div><div class="ss-ffield"><label class="ss-flbl stam-label">메시지</label>' +
        '<textarea class="ss-inp stam-textarea" rows="4" placeholder="검토 요청 메시지를 입력합니다."></textarea></div></div>' +
        '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>마감일</h3></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">마감일</label><input type="date" class="ss-inp stam-input" value="2026-06-18"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">우선순위</label><select class="ss-inp"><option>보통</option><option>높음</option><option>긴급</option></select></div></div></div>' +
        '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>관련 버전</h3></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">검토 버전</label><input class="ss-inp stam-input is-readonly ro" value="' + d.ver + '" readonly></div>' +
        '<div class="ss-ffield"><label class="ss-flbl stam-label">작성 상태</label><input class="ss-inp stam-input is-readonly ro" value="' + (WST[d.wst] ? WST[d.wst].lbl : '-') + '" readonly></div></div></div>';
    }
    if (foot) {
      foot.innerHTML = '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary" data-ss-dw-action="close">취소</button>' +
        '<span style="flex:1"></span>' +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--primary ss-dw-btn-primary" data-ss-dw-action="reviewreq">검토 요청</button>';
    }
  }

  /* ================================================================
   * FULLPAGE EDITOR — View Mode 구조
   * view.mode: list | template | editor | preview
   * draft: template/editor/preview 전용
   * savedItems: list/detail 기준 (ALL_SCREENS와 동기화)
   * ================================================================ */

  /* ── State ── */
  var SSP = {
    view: { mode: 'list' },
    editor: { mode: 'create', activeId: null, previewDirty: false, previewAppliedAt: null, wfBlocks: [], selBlock: null },
    detailDrawer: { open: false, activeId: null },
    serviceType: 'branding',
    templateTab: 'front',
    draft: null,
    previewModel: null,
    savedItems: [],
    records: [],
    activeRecordId: null
  };

  var SS_SEQ = 16;

  /* ── Service type + template definitions (1Depth: service type, 2Depth: front/admin) ── */
  var SERVICE_TYPES = [
    { id: 'branding', name: '홍보형',
      front: [
        { id: 'branding-f1', name: '메인/랜딩 화면', desc: '브랜드·서비스 소개를 위한 히어로 섹션 중심 랜딩 구조', screenType: 'main', recommendedUse: '홍보·브랜드 홈', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['히어로 섹션', '주요 서비스 카드', 'CTA 버튼', '고객사/수상 실적'], iconPath: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
        { id: 'branding-f2', name: '회사소개/서비스소개 화면', desc: '회사·팀·서비스를 소개하는 콘텐츠 페이지 구조', screenType: 'detail', recommendedUse: '소개·About 화면', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['섹션 제목', '텍스트+이미지 블록', '팀 소개', '연혁'], iconPath: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
        { id: 'branding-f3', name: '상품/서비스 소개 상세 화면', desc: '특정 상품·서비스의 기능·가격·FAQ를 상세 소개하는 구조', screenType: 'detail', recommendedUse: '상품·서비스 상세 소개', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['상품 이미지', '주요 기능 목록', '가격/플랜 비교', 'FAQ', 'CTA 버튼'], iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
        { id: 'branding-f4', name: '문의/상담 신청 화면', desc: '문의 유형 선택·내용 입력·제출 구조', screenType: 'form', recommendedUse: '문의·상담 신청', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['문의 유형 선택', '이름·연락처 입력', '내용 입력', '파일 첨부', '제출 버튼'], iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
        { id: 'branding-f5', name: '공지/뉴스 목록 화면', desc: '공지사항·뉴스·보도자료 목록 구조', screenType: 'list', recommendedUse: '공지·뉴스 목록', defaultStructure: { useSearch: true, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: true }, items: ['카테고리 탭', '검색 조건', '게시글 목록', '빈 결과 안내'], iconPath: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
        { id: 'branding-f6', name: '빈 템플릿', desc: '아무 구조도 없는 빈 캔버스. 처음부터 직접 설계합니다.', screenType: 'form', recommendedUse: '자유 설계', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ],
      admin: [
        { id: 'branding-a1', name: '문의/상담 관리 화면', desc: '접수된 문의·상담 목록을 검색·처리하는 관리 화면', screenType: 'list', recommendedUse: '문의·상담 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '문의 목록 테이블', '상태 chip', '답변/처리 액션', '빈 결과 안내'], iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
        { id: 'branding-a2', name: '콘텐츠/배너 관리 화면', desc: '홈페이지 콘텐츠·배너를 등록·수정·노출 설정하는 관리 화면', screenType: 'list', recommendedUse: '배너·콘텐츠 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '콘텐츠 목록 테이블', '노출 상태 chip', '수정/삭제 액션'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' },
        { id: 'branding-a3', name: '공지/뉴스 관리 화면', desc: '공지사항·뉴스를 등록·수정·노출하는 관리 화면', screenType: 'list', recommendedUse: '공지·뉴스 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '게시글 목록 테이블', '공개 상태 chip', '수정/삭제 액션', '빈 결과 안내'], iconPath: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
        { id: 'branding-a4', name: '팝업/노출 관리 화면', desc: '팝업·레이어 광고의 등록·기간·노출 순서를 관리하는 화면', screenType: 'list', recommendedUse: '팝업·배너 노출 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '팝업 목록 테이블', '노출 상태 chip', '순서 조정 액션'], iconPath: '<rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>' },
        { id: 'branding-a5', name: '통계 대시보드 화면', desc: '방문자·유입·문의 현황 KPI 및 차트 요약 화면', screenType: 'main', recommendedUse: '통계·현황 대시보드', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['KPI 카드 그리드', '방문자 차트', '유입 경로 차트', '최근 문의 목록'], iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { id: 'branding-a6', name: '빈 템플릿', desc: '아무 구조도 없는 빈 캔버스. 처음부터 직접 설계합니다.', screenType: 'list', recommendedUse: '자유 설계', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ]
    },
    { id: 'commerce', name: '커머스형',
      front: [
        { id: 'commerce-f1', name: '메인/홈 화면', desc: '추천 상품·기획전·배너 중심의 쇼핑몰 홈 구조', screenType: 'main', recommendedUse: '쇼핑몰 홈', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['메인 배너', '추천 상품 카드', '기획전 섹션', '최근 본 상품'], iconPath: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
        { id: 'commerce-f2', name: '상품 목록/검색 화면', desc: '검색·카테고리·필터·정렬 중심의 상품 탐색 화면', screenType: 'list', recommendedUse: '상품 탐색 화면', defaultStructure: { useSearch: true, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: true }, items: ['카테고리 필터', '검색 조건', '상품 카드 그리드', '정렬 선택', '빈 결과 안내'], iconPath: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
        { id: 'commerce-f3', name: '상품 상세 화면', desc: '상품 이미지·설명·옵션·구매 버튼 구조', screenType: 'detail', recommendedUse: '상품 상세 보기', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['상품 이미지 슬라이드', '상품명·가격', '옵션 선택', '수량·장바구니·구매 버튼', '상세 설명 탭'], iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
        { id: 'commerce-f4', name: '장바구니 화면', desc: '선택 상품 목록·수량 조정·금액 합계 구조', screenType: 'list', recommendedUse: '장바구니', defaultStructure: { useSearch: false, useTable: true, useStatusChip: false, useRowAction: true, useEmpty: true }, items: ['상품 목록 테이블', '수량 조정 액션', '금액 합계', '주문하기 버튼', '빈 결과 안내'], iconPath: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' },
        { id: 'commerce-f5', name: '주문/결제 화면', desc: '배송지·결제수단·최종 확인 단계 구조', screenType: 'form', recommendedUse: '주문·결제 플로우', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['주문 상품 요약', '배송지 입력', '결제수단 선택', '최종 금액 확인', '결제 버튼'], iconPath: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
        { id: 'commerce-f6', name: '주문 완료 화면', desc: '결제 완료 안내·주문번호·다음 단계 안내 구조', screenType: 'form', recommendedUse: '주문 완료 확인', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['완료 아이콘', '주문번호 표시', '배송 안내', '홈/내역 이동 버튼'], iconPath: '<polyline points="20 6 9 17 4 12"/>' },
        { id: 'commerce-f7', name: '마이페이지/주문내역 화면', desc: '내 주문·적립금·쿠폰·배송지 관리 구조', screenType: 'detail', recommendedUse: '마이페이지·주문내역', defaultStructure: { useSearch: false, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['프로필 영역', '주문내역 테이블', '상태 chip', '재구매/취소 액션'], iconPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
        { id: 'commerce-f8', name: '인증 흐름 화면', desc: '로그인·회원가입·비밀번호 찾기 단계 구조', screenType: 'form', recommendedUse: '쇼핑몰 로그인·가입', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['로그인 폼', 'SNS 로그인', '회원가입 탭', '아이디/비밀번호 찾기'], iconPath: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' }
      ],
      admin: [
        { id: 'commerce-a1', name: '운영 대시보드 화면', desc: '매출·주문·회원 KPI 및 최근 이벤트 요약 화면', screenType: 'main', recommendedUse: '커머스 운영 대시보드', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['KPI 카드 그리드', '매출 차트', '최근 주문 목록', '빠른 링크'], iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { id: 'commerce-a2', name: '상품 관리 목록 화면', desc: '상품 검색·필터·목록·상태 관리 화면', screenType: 'list', recommendedUse: '상품 목록 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '상품 목록 테이블', '판매 상태 chip', '수정/삭제 액션', '빈 결과 안내'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>' },
        { id: 'commerce-a3', name: '상품 등록/수정/상세 화면', desc: '상품 정보·이미지·옵션·가격을 등록·수정하는 폼', screenType: 'form', recommendedUse: '상품 등록·수정', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['기본 정보 폼', '이미지 업로드', '옵션 빌더', '가격·재고 입력', '저장/취소 버튼'], iconPath: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>' },
        { id: 'commerce-a4', name: '주문 관리 화면', desc: '주문 검색·상태 필터·처리·배송 관리 화면', screenType: 'list', recommendedUse: '주문 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '주문 목록 테이블', '주문 상태 chip', '발송/취소 액션'], iconPath: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { id: 'commerce-a5', name: '회원 관리 화면', desc: '회원 검색·등급·상태 관리 화면', screenType: 'list', recommendedUse: '회원 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '회원 목록 테이블', '등급 chip', '계정 관리 액션', '빈 결과 안내'], iconPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { id: 'commerce-a6', name: '쿠폰/프로모션 관리 화면', desc: '쿠폰 코드·프로모션 생성·배포·현황 관리', screenType: 'list', recommendedUse: '쿠폰·프로모션 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '쿠폰 목록 테이블', '사용 상태 chip', '발급/만료 액션'], iconPath: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' },
        { id: 'commerce-a7', name: '정산/매출 관리 화면', desc: '기간별 매출·정산 현황·지급 내역을 관리하는 화면', screenType: 'list', recommendedUse: '정산·매출 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['기간 검색', '정산 목록 테이블', '정산 상태 chip', '매출 합계'], iconPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
        { id: 'commerce-a8', name: '배송/클레임 관리 화면', desc: '배송 현황·반품·교환 요청 처리 관리 화면', screenType: 'list', recommendedUse: '배송·클레임 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '배송/클레임 목록 테이블', '처리 상태 chip', '처리/반려 액션'], iconPath: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' }
      ]
    },
    { id: 'business', name: '업무시스템형',
      front: [
        { id: 'business-f1', name: '로그인 화면', desc: '이메일·비밀번호 로그인, SSO 연동 구조', screenType: 'form', recommendedUse: '업무 시스템 로그인', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['로그인 폼', 'SSO/소셜 로그인', '아이디·비밀번호 찾기', '로그인 버튼'], iconPath: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
        { id: 'business-f2', name: '내 업무 목록 화면', desc: '나에게 할당된 처리 대기·진행 중인 업무 목록 구조', screenType: 'list', recommendedUse: '내 업무·할 일 목록', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['상태 탭', '검색 조건', '업무 목록 테이블', '상태 chip', '처리/상세 액션', '빈 결과 안내'], iconPath: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { id: 'business-f3', name: '신청/등록 폼 화면', desc: '업무 신청·등록을 위한 멀티 섹션 입력 폼 구조', screenType: 'form', recommendedUse: '신청·등록 폼', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['폼 섹션', '필수 항목 표시', '첨부파일 업로드', '제출/임시저장 버튼'], iconPath: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>' },
        { id: 'business-f4', name: '상세/처리현황 화면', desc: '신청 항목의 상세 정보와 처리 단계·이력을 확인하는 화면', screenType: 'detail', recommendedUse: '신청 상세·처리현황', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['기본 정보 영역', '처리 단계 스텝', '처리 이력', '상태 chip', '추가 요청 버튼'], iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
        { id: 'business-f5', name: '알림/메시지 화면', desc: '시스템 알림·메시지 목록과 상세 확인 구조', screenType: 'list', recommendedUse: '알림·메시지 목록', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: true }, items: ['알림 유형 탭', '알림 목록', '읽음 상태 chip', '빈 결과 안내'], iconPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
        { id: 'business-f6', name: '마이페이지 화면', desc: '내 정보·신청 이력·알림 설정을 관리하는 구조', screenType: 'detail', recommendedUse: '마이페이지', defaultStructure: { useSearch: false, useTable: true, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['프로필 영역', '신청 이력 테이블', '알림 설정', '비밀번호 변경'], iconPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
        { id: 'business-f7', name: '빈 템플릿', desc: '아무 구조도 없는 빈 캔버스. 처음부터 직접 설계합니다.', screenType: 'form', recommendedUse: '자유 설계', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ],
      admin: [
        { id: 'business-a1', name: '관리 대시보드 화면', desc: 'KPI·처리 현황·대기 항목 중심의 운영 대시보드', screenType: 'main', recommendedUse: '업무 관리 대시보드', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['KPI 카드 그리드', '처리 현황 차트', '대기 항목 목록', '빠른 링크'], iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { id: 'business-a2', name: '관리 목록/검색 화면', desc: '검색·필터·테이블·행 액션 중심의 관리 목록 화면', screenType: 'list', recommendedUse: '업무 목록·관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '결과 테이블', '상태 chip', '행 액션', '빈 결과 안내'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>' },
        { id: 'business-a3', name: '등록/수정/상세 폼 화면', desc: '항목 등록·수정·상세 보기를 하나의 폼으로 처리하는 구조', screenType: 'form', recommendedUse: '등록·수정·상세 화면', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['폼 입력 영역', '필수 항목 표시', '상태 chip', '저장/취소 버튼'], iconPath: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>' },
        { id: 'business-a4', name: '승인/검토 처리 화면', desc: '검토 요청·승인·반려 워크플로우 처리 화면', screenType: 'list', recommendedUse: '승인·검토 처리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검토 대상 목록', '상태 chip', '승인·반려 액션', '처리 이력'], iconPath: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { id: 'business-a5', name: '사용자/권한 관리 화면', desc: '사용자 계정·역할·권한을 관리하는 화면', screenType: 'list', recommendedUse: '사용자·권한 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '사용자 목록 테이블', '권한 chip', '역할 할당 액션', '계정 잠금/해제'], iconPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { id: 'business-a6', name: '설정/공통코드 관리 화면', desc: '시스템 설정·공통 코드·메뉴 구성을 관리하는 화면', screenType: 'list', recommendedUse: '설정·코드 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: false, useRowAction: true, useEmpty: false }, items: ['분류 탭', '코드 목록 테이블', '등록/수정 폼', '저장 버튼'], iconPath: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
        { id: 'business-a7', name: '이력/감사로그 화면', desc: '사용자 활동·변경 이력·감사 로그를 조회하는 화면', screenType: 'list', recommendedUse: '이력·감사로그', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['기간 검색', '이벤트 필터', '로그 테이블', '상태 chip', '상세 보기'], iconPath: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
        { id: 'business-a8', name: '파일/Import/Export 화면', desc: '파일 업로드·대량 가져오기·내보내기 관리 화면', screenType: 'list', recommendedUse: '파일·Import/Export 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['파일 업로드 영역', '파일 목록 테이블', '상태 chip', '다운로드/삭제 액션', 'Import/Export 버튼'], iconPath: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>' }
      ]
    },
    { id: 'community', name: '커뮤니티/콘텐츠형',
      front: [
        { id: 'community-f1', name: '메인/피드 화면', desc: '최신 게시글·추천 콘텐츠·인기 태그 중심의 피드 구조', screenType: 'main', recommendedUse: '메인·피드 화면', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['추천 콘텐츠 카드', '인기 태그', '팔로잉 피드', 'CTA 버튼'], iconPath: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
        { id: 'community-f2', name: '게시글/콘텐츠 목록 화면', desc: '카테고리·검색·정렬 중심의 게시글 목록 구조', screenType: 'list', recommendedUse: '게시글·콘텐츠 목록', defaultStructure: { useSearch: true, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: true }, items: ['카테고리 탭', '검색 조건', '게시글 카드 목록', '정렬 선택', '빈 결과 안내'], iconPath: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
        { id: 'community-f3', name: '게시글/콘텐츠 상세 화면', desc: '본문·미디어·좋아요·공유·댓글 구조', screenType: 'detail', recommendedUse: '게시글·콘텐츠 상세', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['콘텐츠 제목', '본문+미디어', '좋아요·공유 버튼', '댓글 목록', '관련 콘텐츠'], iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
        { id: 'community-f4', name: '작성/등록 화면', desc: '게시글·콘텐츠 작성을 위한 에디터 구조', screenType: 'form', recommendedUse: '게시글·콘텐츠 작성', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['제목 입력', '리치 에디터', '카테고리·태그 선택', '이미지 첨부', '발행/임시저장 버튼'], iconPath: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>' },
        { id: 'community-f5', name: '댓글/리뷰 화면', desc: '댓글 목록·입력·신고·좋아요 구조', screenType: 'list', recommendedUse: '댓글·리뷰 화면', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: true }, items: ['댓글 입력 영역', '댓글 목록', '좋아요·신고 버튼', '빈 결과 안내'], iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
        { id: 'community-f6', name: '프로필 화면', desc: '사용자 정보·작성 콘텐츠·팔로우 구조', screenType: 'detail', recommendedUse: '사용자 프로필', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['프로필 이미지·정보', '팔로우/팔로워', '작성 콘텐츠 목록', '활동 이력'], iconPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
        { id: 'community-f7', name: '알림 화면', desc: '좋아요·댓글·팔로우 알림 목록 구조', screenType: 'list', recommendedUse: '알림 목록', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: true }, items: ['알림 유형 탭', '알림 목록', '읽음 상태 chip', '빈 결과 안내'], iconPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
        { id: 'community-f8', name: '빈 템플릿', desc: '아무 구조도 없는 빈 캔버스. 처음부터 직접 설계합니다.', screenType: 'form', recommendedUse: '자유 설계', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ],
      admin: [
        { id: 'community-a1', name: '콘텐츠 관리 목록 화면', desc: '게시글·콘텐츠 검색·상태 관리·삭제 화면', screenType: 'list', recommendedUse: '콘텐츠 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '콘텐츠 목록 테이블', '노출 상태 chip', '수정/삭제 액션', '빈 결과 안내'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' },
        { id: 'community-a2', name: '콘텐츠 등록/수정/상세 화면', desc: '게시글·콘텐츠를 등록·수정하는 관리용 에디터 화면', screenType: 'form', recommendedUse: '콘텐츠 등록·수정', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['제목·카테고리 입력', '리치 에디터', '이미지 업로드', '공개 상태 chip', '저장/취소 버튼'], iconPath: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>' },
        { id: 'community-a3', name: '댓글/신고 관리 화면', desc: '댓글·신고 목록 검색·처리·숨김 관리 화면', screenType: 'list', recommendedUse: '댓글·신고 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '댓글/신고 목록 테이블', '처리 상태 chip', '숨김/삭제 액션', '빈 결과 안내'], iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
        { id: 'community-a4', name: '회원 관리 화면', desc: '커뮤니티 회원 검색·등급·정지 관리 화면', screenType: 'list', recommendedUse: '회원 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '회원 목록 테이블', '등급 chip', '정지/해제 액션'], iconPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { id: 'community-a5', name: '카테고리 관리 화면', desc: '콘텐츠 분류·태그·카테고리 트리 구조 관리 화면', screenType: 'list', recommendedUse: '카테고리·태그 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: false, useRowAction: true, useEmpty: false }, items: ['분류 트리', '카테고리 목록 테이블', '등록/수정/삭제 액션'], iconPath: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
        { id: 'community-a6', name: '통계 대시보드 화면', desc: '방문자·게시글·활성 유저 KPI 및 차트 대시보드', screenType: 'main', recommendedUse: '커뮤니티 통계 대시보드', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['KPI 카드 그리드', '활성 유저 차트', '인기 콘텐츠 목록', '빠른 링크'], iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { id: 'community-a7', name: '공지/배너 관리 화면', desc: '커뮤니티 공지·배너 등록·노출 관리 화면', screenType: 'list', recommendedUse: '공지·배너 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '공지/배너 목록 테이블', '노출 상태 chip', '수정/삭제 액션'], iconPath: '<rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>' },
        { id: 'community-a8', name: '빈 템플릿', desc: '아무 구조도 없는 빈 캔버스. 처음부터 직접 설계합니다.', screenType: 'list', recommendedUse: '자유 설계', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ]
    },
    { id: 'reservation', name: '예약/신청형',
      front: [
        { id: 'reservation-f1', name: '예약/신청 메인 화면', desc: '예약 가능 서비스·일정 카드 중심의 메인 구조', screenType: 'main', recommendedUse: '예약·신청 메인', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['서비스 카드', '일정 선택 캘린더', '빠른 예약 CTA', '안내 섹션'], iconPath: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
        { id: 'reservation-f2', name: '일정/상품 목록 화면', desc: '예약 가능한 일정·상품 목록 탐색 화면', screenType: 'list', recommendedUse: '예약 가능 목록', defaultStructure: { useSearch: true, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: true }, items: ['날짜·조건 검색', '일정/상품 카드 목록', '잔여 수량 chip', '빈 결과 안내'], iconPath: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
        { id: 'reservation-f3', name: '예약/신청 상세 화면', desc: '예약 가능 일정·상세 정보·예약 시작 구조', screenType: 'detail', recommendedUse: '예약 상세 안내', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['서비스 정보', '일정 상세', '가용 상태 chip', '예약하기 버튼'], iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
        { id: 'reservation-f4', name: '예약/신청 폼 화면', desc: '예약자 정보·옵션·일정 선택 입력 폼 구조', screenType: 'form', recommendedUse: '예약·신청 폼', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['예약자 정보 입력', '옵션·수량 선택', '일정 선택', '메모 입력', '예약 완료 버튼'], iconPath: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>' },
        { id: 'reservation-f5', name: '예약 완료 화면', desc: '예약 완료 안내·예약번호·다음 단계 안내 구조', screenType: 'form', recommendedUse: '예약 완료 확인', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['완료 아이콘', '예약번호 표시', '예약 내역 요약', '내 예약 이동 버튼'], iconPath: '<polyline points="20 6 9 17 4 12"/>' },
        { id: 'reservation-f6', name: '내 예약/신청 내역 화면', desc: '신청한 예약 목록·상태·상세 확인 구조', screenType: 'list', recommendedUse: '내 예약·신청 내역', defaultStructure: { useSearch: false, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['예약 내역 테이블', '예약 상태 chip', '상세/취소 액션', '빈 결과 안내'], iconPath: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { id: 'reservation-f7', name: '취소/변경 화면', desc: '예약 취소·날짜·옵션 변경 요청 처리 구조', screenType: 'form', recommendedUse: '예약 취소·변경', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['예약 정보 요약', '취소/변경 사유 선택', '위약금 안내', '확인 버튼'], iconPath: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
        { id: 'reservation-f8', name: '빈 템플릿', desc: '아무 구조도 없는 빈 캔버스. 처음부터 직접 설계합니다.', screenType: 'form', recommendedUse: '자유 설계', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ],
      admin: [
        { id: 'reservation-a1', name: '예약/신청 관리 목록 화면', desc: '접수된 예약·신청 목록을 검색·필터·처리하는 관리 화면', screenType: 'list', recommendedUse: '예약·신청 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '예약 목록 테이블', '예약 상태 chip', '승인/반려 액션', '빈 결과 안내'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' },
        { id: 'reservation-a2', name: '예약 상세/처리 화면', desc: '예약 상세 정보 확인·처리·메모 추가 관리 화면', screenType: 'detail', recommendedUse: '예약 상세 처리', defaultStructure: { useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false }, items: ['예약 정보 영역', '처리 단계 스텝', '처리 이력', '상태 chip', '처리 버튼'], iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
        { id: 'reservation-a3', name: '일정/재고 관리 화면', desc: '예약 가능 일정·정원·재고를 등록·관리하는 화면', screenType: 'list', recommendedUse: '일정·재고 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '일정 목록 테이블', '잔여 상태 chip', '추가/마감 액션'], iconPath: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
        { id: 'reservation-a4', name: '승인/반려 처리 화면', desc: '승인 대기 예약·신청을 검토·승인·반려하는 화면', screenType: 'list', recommendedUse: '승인·반려 처리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '대기 목록 테이블', '상태 chip', '승인·반려 액션', '사유 입력'], iconPath: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { id: 'reservation-a5', name: '고객/신청자 관리 화면', desc: '예약·신청한 고객 정보와 이력을 관리하는 화면', screenType: 'list', recommendedUse: '고객·신청자 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true }, items: ['검색 조건', '고객 목록 테이블', '등급 chip', '이력 조회 액션', '빈 결과 안내'], iconPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { id: 'reservation-a6', name: '알림/메시지 관리 화면', desc: '예약 확정·취소·리마인드 알림 발송 관리 화면', screenType: 'list', recommendedUse: '알림·메시지 관리', defaultStructure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false }, items: ['검색 조건', '알림 목록 테이블', '발송 상태 chip', '재발송/취소 액션'], iconPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
        { id: 'reservation-a7', name: '통계 대시보드 화면', desc: '예약 건수·매출·취소율 KPI 및 차트 대시보드', screenType: 'main', recommendedUse: '예약 통계 대시보드', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['KPI 카드 그리드', '예약 추이 차트', '취소율 차트', '최근 예약 목록'], iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { id: 'reservation-a8', name: '빈 템플릿', desc: '아무 구조도 없는 빈 캔버스. 처음부터 직접 설계합니다.', screenType: 'list', recommendedUse: '자유 설계', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ]
    },
    { id: 'blank', name: '빈 템플릿',
      front: [
        { id: 'blank-f1', name: '빈 Front 화면', desc: '아무 구조도 없는 빈 캔버스. Front 화면을 처음부터 직접 설계합니다.', screenType: 'form', recommendedUse: '자유 설계 (Front)', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ],
      admin: [
        { id: 'blank-a1', name: '빈 Admin 화면', desc: '아무 구조도 없는 빈 캔버스. Admin 화면을 처음부터 직접 설계합니다.', screenType: 'list', recommendedUse: '자유 설계 (Admin)', defaultStructure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false }, items: ['직접 구성'], iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>' }
      ]
    }
  ];

  /* ── Wireframe presets — 템플릿별 초기 구성 요소 (defaultComponents 기반) ── */
  var WIREFRAME_PRESETS = {
    'commerce-f1': {
      defaultWireframeType: 'commerce-home',
      defaultFlowLinks: [{ to: 'commerce-f2', label: '상품 탐색' }],
      defaultComponents: [
        { id: 'cmp-header',          type: 'wf-header',          name: '상단 헤더',          enabled: true, description: '로고·검색·장바구니·로그인 영역', props: {} },
        { id: 'cmp-search-bar',      type: 'wf-search-bar',      name: '검색 영역',          enabled: true, description: '통합 검색 입력',                  props: {} },
        { id: 'cmp-hero',            type: 'wf-hero',            name: '메인 배너/히어로',   enabled: true, description: '기획전·브랜드 배너 슬라이드',       props: {} },
        { id: 'cmp-quick-menu',      type: 'wf-quick-menu',      name: '퀵 메뉴',            enabled: true, description: '카테고리 빠른 이동 아이콘',        props: {} },
        { id: 'cmp-product-section', type: 'wf-product-section', name: '추천 상품 섹션',     enabled: true, description: '개인화 추천·인기 상품 카드',       props: {} },
        { id: 'cmp-promo-section',   type: 'wf-promo-section',   name: '기획전/프로모션 섹션', enabled: true, description: '시즌·테마 기획전 배너',         props: {} },
        { id: 'cmp-footer-info',     type: 'wf-footer-info',     name: '하단 안내 영역',     enabled: true, description: '배송·혜택·고객센터 안내',          props: {} }
      ]
    },
    'commerce-f2': {
      defaultWireframeType: 'commerce-product-list',
      defaultFlowLinks: [{ to: 'commerce-f3', label: '상품 상세 보기' }],
      defaultComponents: [
        { id: 'cmp-list-title',    type: 'wf-screen-title',   name: '목록 제목/결과 수',    enabled: true, description: '카테고리명·검색어·결과 건수 표시', props: {} },
        { id: 'cmp-filter',        type: 'wf-filter',         name: '검색/필터 영역',       enabled: true, description: '카테고리·가격·브랜드·조건 필터',   props: {} },
        { id: 'cmp-sort',          type: 'wf-sort',           name: '정렬 영역',            enabled: true, description: '인기순·최신순·가격순 정렬 선택',   props: {} },
        { id: 'cmp-product-grid',  type: 'wf-product-grid',   name: '상품 카드 그리드',     enabled: true, description: '썸네일·상품명·가격·찜 버튼 카드', props: {} },
        { id: 'cmp-pagination',    type: 'wf-pagination',     name: '페이지네이션',         enabled: true, description: '페이지 이동 또는 더보기 버튼',     props: {} },
        { id: 'cmp-empty',         type: 'wf-empty',          name: '빈 결과 상태',         enabled: true, description: '검색 결과 없음 안내',              props: {} }
      ]
    },
    'commerce-f3': {
      defaultWireframeType: 'commerce-product-detail',
      defaultFlowLinks: [{ to: 'commerce-f4', label: '장바구니 담기' }],
      domainOptions: [
        { id: 'fresh-food', name: '신선식품 정보', enabled: false, fields: ['원산지', '유통기한', '보관법', '알레르기', '배송 유형', '도착 예정일'] }
      ],
      defaultComponents: [
        { id: 'cmp-gallery',          type: 'wf-image-gallery',    name: '이미지/갤러리 영역',    enabled: true, description: '상품 대표 이미지·썸네일 슬라이드', props: {} },
        { id: 'cmp-product-info',     type: 'wf-product-info',     name: '상품명/가격/상태 정보', enabled: true, description: '상품명·판매가·할인율·재고 상태',   props: {} },
        { id: 'cmp-option-selector',  type: 'wf-option-selector',  name: '옵션/수량 선택',        enabled: true, description: '색상·사이즈·수량 선택 영역',      props: {} },
        { id: 'cmp-cta-buy',          type: 'wf-cta-buy',          name: '장바구니/구매 CTA',     enabled: true, description: '장바구니 담기·바로 구매 버튼',    props: {} },
        { id: 'cmp-detail-tabs',      type: 'wf-detail-tabs',      name: '상세정보/후기/문의 탭', enabled: true, description: '상품 상세·구매 후기·문의 탭 전환', props: {} },
        { id: 'cmp-related-products', type: 'wf-related-products', name: '추천 상품 영역',        enabled: true, description: '함께 구매·최근 본 상품 가로 스크롤', props: {} }
      ]
    },
    'commerce-f4': {
      defaultWireframeType: 'commerce-cart',
      defaultFlowLinks: [{ to: 'commerce-f5', label: '주문/결제 이동' }],
      defaultComponents: [
        { id: 'cmp-cart-title',   type: 'wf-cart-title',   name: '장바구니 제목',         enabled: true, description: '장바구니 헤더·총 상품 수',         props: {} },
        { id: 'cmp-bulk-action',  type: 'wf-bulk-action',  name: '선택/삭제 일괄 액션',   enabled: true, description: '전체 선택·선택 삭제 컨트롤',       props: {} },
        { id: 'cmp-cart-items',   type: 'wf-cart-items',   name: '상품 목록',             enabled: true, description: '상품 이미지·이름·옵션·수량·금액 행', props: {} },
        { id: 'cmp-delivery-info',type: 'wf-delivery-info',name: '배송/수령 정보 요약',   enabled: true, description: '배송 방법·도착 예정 안내',          props: {} },
        { id: 'cmp-order-summary',type: 'wf-order-summary',name: '주문 금액 요약',        enabled: true, description: '상품 금액·할인·배송비·결제 예정액', props: {} },
        { id: 'cmp-cart-cta',     type: 'wf-cart-cta',     name: '주문하기 CTA',          enabled: true, description: '선택 상품 주문 버튼',              props: {} },
        { id: 'cmp-cart-empty',   type: 'wf-cart-empty',   name: '빈 장바구니 상태',      enabled: true, description: '상품 없음 안내·쇼핑 계속 버튼',    props: {} }
      ]
    },
    'commerce-f5': {
      defaultWireframeType: 'commerce-checkout',
      defaultFlowLinks: [{ to: 'commerce-f6', label: '주문 완료' }],
      defaultComponents: [
        { id: 'cmp-address',          type: 'wf-checkout-address',  name: '배송지 정보',      enabled: true, description: '배송지 선택·수령인·주소 입력',      props: {} },
        { id: 'cmp-co-items',         type: 'wf-checkout-items',    name: '주문 상품 요약',   enabled: true, description: '주문 상품 목록 축약 표시',           props: {} },
        { id: 'cmp-co-discount',      type: 'wf-checkout-discount', name: '쿠폰/포인트/할인',enabled: true, description: '쿠폰 코드·포인트 사용 입력',         props: {} },
        { id: 'cmp-co-payment',       type: 'wf-checkout-payment',  name: '결제수단',         enabled: true, description: '카드·계좌이체·간편결제 선택',       props: {} },
        { id: 'cmp-co-terms',         type: 'wf-checkout-terms',    name: '약관 동의',        enabled: true, description: '구매 약관·개인정보 동의 체크',      props: {} },
        { id: 'cmp-co-price',         type: 'wf-checkout-price',    name: '결제 금액 요약',   enabled: true, description: '최종 결제 금액·혜택 적용 합계',     props: {} },
        { id: 'cmp-co-cta',           type: 'wf-checkout-cta',      name: '결제 CTA',         enabled: true, description: '결제하기 버튼',                     props: {} }
      ]
    },
    'commerce-f7': {
      defaultWireframeType: 'commerce-my-dashboard',
      defaultFlowLinks: [],
      defaultComponents: [
        { id: 'cmp-my-profile',    type: 'wf-my-profile',    name: '사용자 요약',         enabled: true, description: '닉네임·등급·아바타 요약 카드',     props: {} },
        { id: 'cmp-order-status',  type: 'wf-order-status',  name: '주문 진행 상태',      enabled: true, description: '주문·결제·배송·완료 단계 현황',    props: {} },
        { id: 'cmp-asset-summary', type: 'wf-asset-summary', name: '쿠폰/포인트/자산 요약', enabled: true, description: '보유 쿠폰 수·포인트 잔액 카드', props: {} },
        { id: 'cmp-quick-links',   type: 'wf-quick-links',   name: '빠른 메뉴',           enabled: true, description: '주문내역·찜·리뷰·문의 빠른 이동', props: {} },
        { id: 'cmp-recent-orders', type: 'wf-recent-orders', name: '최근 주문/최근 활동', enabled: true, description: '최근 주문 상품 목록',              props: {} }
      ]
    },
    'business-a2': {
      defaultWireframeType: 'business-admin-list',
      defaultComponents: [
        { id: 'cmp-screen-title',  type: 'wf-screen-title',  name: '화면 제목',     enabled: true, description: '화면명·등록 버튼',                    props: {} },
        { id: 'cmp-search-filter', type: 'wf-search-filter', name: '검색 조건',     enabled: true, description: '검색어·날짜·상태 조건 입력',           props: {} },
        { id: 'cmp-search-btn',    type: 'wf-search-btn',    name: '조회/초기화 버튼', enabled: true, description: '조회·초기화 실행 버튼',            props: {} },
        { id: 'cmp-stats',         type: 'wf-stats-summary', name: '요약 통계',     enabled: true, description: '전체·처리중·완료 등 건수 요약',       props: {} },
        { id: 'cmp-data-table',    type: 'wf-data-table',    name: '결과 테이블',   enabled: true, description: '컬럼 헤더·데이터 행·정렬',            props: {} },
        { id: 'cmp-status-chip',   type: 'wf-status-chip',   name: '상태 chip',     enabled: true, description: '작성·검토·승인 상태 칩',              props: {} },
        { id: 'cmp-row-action',    type: 'wf-row-action',    name: '행 액션',       enabled: true, description: '상세·수정·삭제 행 버튼',              props: {} },
        { id: 'cmp-empty-state',   type: 'wf-empty',         name: '빈 결과 상태',  enabled: true, description: '결과 없음 안내 문구',                 props: {} }
      ]
    },
    'business-a3': {
      defaultWireframeType: 'business-admin-form',
      defaultComponents: [
        { id: 'cmp-form-basic',    type: 'wf-form-section',  name: '기본 정보 섹션',   enabled: true, description: '이름·ID·상태 등 기본 입력 필드',     props: {} },
        { id: 'cmp-form-fields',   type: 'wf-form-fields',   name: '입력 필드 그룹',   enabled: true, description: '섹션별 세부 입력 필드',               props: {} },
        { id: 'cmp-file-upload',   type: 'wf-file-upload',   name: '첨부파일 영역',    enabled: true, description: '파일 선택·드롭 업로드 영역',          props: {} },
        { id: 'cmp-validation',    type: 'wf-validation-msg',name: '검증 메시지',      enabled: true, description: '필수 입력·형식 오류 안내',            props: {} },
        { id: 'cmp-form-cta',      type: 'wf-form-cta',      name: '저장/취소 CTA',   enabled: true, description: '저장·취소·삭제 버튼 영역',            props: {} }
      ]
    },
    'business-a4': {
      defaultWireframeType: 'business-approval',
      defaultComponents: [
        { id: 'cmp-appr-summary',   type: 'wf-approval-summary',  name: '요청 정보 요약', enabled: true, description: '요청자·일시·유형 요약 카드',       props: {} },
        { id: 'cmp-appr-content',   type: 'wf-approval-content',  name: '신청 내용',      enabled: true, description: '검토 대상 신청 내용 상세',         props: {} },
        { id: 'cmp-review-comment', type: 'wf-review-comment',    name: '검토 의견',      enabled: true, description: '검토자 의견 입력 텍스트에리어',    props: {} },
        { id: 'cmp-appr-cta',       type: 'wf-approval-cta',      name: '승인/반려 CTA',  enabled: true, description: '승인·반려·보완 요청 버튼',         props: {} },
        { id: 'cmp-history',        type: 'wf-history',           name: '처리 이력',      enabled: true, description: '처리 단계·담당자·일시 타임라인',   props: {} },
        { id: 'cmp-perm-notice',    type: 'wf-permission-notice', name: '권한/상태 안내', enabled: true, description: '현재 처리 권한 및 상태 안내',      props: {} }
      ]
    }
  };

  function findTemplateById(id) {
    for (var s = 0; s < SERVICE_TYPES.length; s++) {
      var st = SERVICE_TYPES[s];
      var groups = ['front', 'admin'];
      for (var g = 0; g < groups.length; g++) {
        var list = st[groups[g]] || [];
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) return list[i];
        }
      }
    }
    return SERVICE_TYPES[0].front[0];
  }

  function findServiceTypeById(stId) {
    for (var s = 0; s < SERVICE_TYPES.length; s++) {
      if (SERVICE_TYPES[s].id === stId) return SERVICE_TYPES[s];
    }
    return SERVICE_TYPES[0];
  }

  function svgIc(path, sz, sw) {
    sz = sz || 14; sw = sw || 2;
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  /* ================================================================
   * MEMORY RECORDS — 브라우저 메모리 기반 record 관리
   * localStorage / Firestore / API / fetch 저장 없음
   * ================================================================ */

  function recordStatusChip(status) {
    var map = {
      draft:  { cls: 'ss-chip-rec-draft',  lbl: '작성중' },
      saved:  { cls: 'ss-chip-rec-saved',  lbl: '저장됨' },
      review: { cls: 'ss-chip-rec-review', lbl: '검토요청' }
    };
    var m = map[status] || map.draft;
    return '<span class="ss-chip ' + m.cls + '">' + m.lbl + '</span>';
  }

  function findRecordById(id) {
    for (var i = 0; i < SSP.records.length; i++) {
      if (SSP.records[i].id === id) return SSP.records[i];
    }
    return null;
  }

  function buildRecordFromCurrentDraft(saveType) {
    if (SSP.view.mode === 'editor' && SSP.draft) { collectDraftFromEditor(); }
    var d = SSP.draft;
    if (!d) return null;

    var now = new Date();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    var dateStr = now.getFullYear() + '.' + mm + '.' + dd;

    var status = saveType === 'draft' ? 'draft' : saveType === 'review' ? 'review' : 'saved';
    var reviewStatus = saveType === 'review' ? 'requested' : 'not_requested';

    var svcType = SSP.serviceType || d.serviceType || 'branding';
    var svcObj = findServiceTypeById(svcType);
    var svcTypeName = d.serviceTypeName || (svcObj ? svcObj.name : svcType);
    var frontAdmin = SSP.frontAdmin || d.templateGroup || 'front';
    var frontAdminName = frontAdmin === 'admin' ? 'Admin' : 'Front';
    var pageTemplate = SSP.pageTemplate || d.pageTemplate || '';

    var ptpl = null;
    for (var pi = 0; pi < CREATE_PAGE_TEMPLATE_LIST.length; pi++) {
      if (CREATE_PAGE_TEMPLATE_LIST[pi].id === pageTemplate) { ptpl = CREATE_PAGE_TEMPLATE_LIST[pi]; break; }
    }
    var pageTemplateName = ptpl ? ptpl.name : (d.templateName || pageTemplate);

    var recordId = SSP.activeRecordId || ('SCR-MEM-' + Date.now());

    return {
      id: recordId,
      screenId: d.screenId || recordId,
      screenName: d.screenName || '제목 없음',
      serviceType: svcType,
      serviceTypeName: svcTypeName,
      frontAdmin: frontAdmin,
      frontAdminName: frontAdminName,
      pageTemplate: pageTemplate,
      pageTemplateName: pageTemplateName,
      status: status,
      reviewStatus: reviewStatus,
      approvalStatus: 'pending',
      owner: '나',
      domain: d.bizArea || '',
      memo: d.memo || '',
      blocks: (SSP.editor.wfBlocks || []).map(function(b) { return Object.assign({}, b); }),
      draft: Object.assign({}, d),
      updatedAt: dateStr,
      createdAt: dateStr
    };
  }

  function upsertScreenRecord(record) {
    var existingIdx = -1;
    for (var i = 0; i < SSP.records.length; i++) {
      if (SSP.records[i].id === record.id || SSP.records[i].screenId === record.screenId) {
        existingIdx = i;
        break;
      }
    }
    if (existingIdx >= 0) {
      SSP.records[existingIdx] = record;
    } else {
      SSP.records.unshift(record);
    }
    SSP.activeRecordId = record.id;
  }

  function hydrateDraftFromRecord(record) {
    SSP.activeRecordId = record.id;
    SSP.serviceType   = record.serviceType  || SSP.serviceType;
    SSP.frontAdmin    = record.frontAdmin   || SSP.frontAdmin;
    SSP.pageTemplate  = record.pageTemplate || SSP.pageTemplate;

    SSP.draft = record.draft
      ? Object.assign({}, record.draft)
      : {
          screenId: record.screenId, screenName: record.screenName,
          serviceType: record.serviceType, serviceTypeName: record.serviceTypeName,
          templateGroup: record.frontAdmin, pageTemplate: record.pageTemplate,
          templateName: record.pageTemplateName,
          screenType: 'main', menuPath: '', purpose: '', memo: record.memo || '',
          bizArea: record.domain || '', searchItems: [], tableColumns: [], rowActions: []
        };

    SSP.editor.wfBlocks      = (record.blocks || []).map(function(b) { return Object.assign({}, b); });
    SSP.editor.selBlock      = null;
    SSP.editor.previewDirty  = false;
    SSP.editor.previewAppliedAt = null;
    SSP.previewModel = null;
  }

  function showToast(msg) {
    var existing = document.getElementById('ss-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'ss-toast';
    toast.className = 'ss-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      toast.classList.add('show');
      setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 320);
      }, 2200);
    });
  }

  function execMemorySave(saveType) {
    var nameEl = document.getElementById('ed-screen-name');
    var draftName = SSP.draft ? (SSP.draft.screenName || '') : '';
    var name = nameEl ? nameEl.value.trim() : draftName.trim();
    if (!name) {
      if (nameEl) {
        nameEl.focus();
        nameEl.style.outline = '2px solid #DC2626';
        setTimeout(function() { nameEl.style.outline = ''; }, 2000);
      }
      alert('화면명을 입력하세요.');
      return null;
    }
    var record = buildRecordFromCurrentDraft(saveType);
    if (!record) return null;
    upsertScreenRecord(record);
    var toastMap = { draft: '임시저장되었습니다.', saved: '저장되었습니다.', review: '검토요청으로 저장되었습니다.' };
    showToast(toastMap[saveType] || '저장되었습니다.');
    return record;
  }

  /* ── View switching ── */
  function switchView(mode) {
    SSP.view.mode = mode;
    var listEl = document.querySelector('.screen-spec-page');
    var tplEl = document.getElementById('ss-template-view');
    var edEl = document.getElementById('ss-editor-view');
    var pvEl = document.getElementById('ss-preview-view');
    if (listEl) listEl.style.display = mode === 'list' ? '' : 'none';
    if (tplEl) tplEl.style.display = mode === 'template' ? '' : 'none';
    if (edEl) edEl.style.display = mode === 'editor' ? '' : 'none';
    if (pvEl) pvEl.style.display = mode === 'preview' ? '' : 'none';
    var poMain = document.getElementById('po-main');
    if (poMain && mode !== 'list') poMain.scrollTop = 0;
  }

  /* ── Draft management ── */
  function createDraftFromTemplate(tpl, group, stId, stName) {
    var idNum = SS_SEQ < 10 ? '0' + SS_SEQ : '' + SS_SEQ;
    var ds = tpl.defaultStructure || {};
    SSP.draft = {
      template: tpl.id, templateName: tpl.name, templateGroup: group || 'front',
      templateKind: 'page',
      serviceType: stId || SSP.serviceType || 'branding',
      serviceTypeName: stName || (findServiceTypeById(stId || SSP.serviceType || 'branding').name),
      screenName: '', screenId: 'SCR-' + idNum, bizArea: '',
      screenType: tpl.screenType || 'list', menuPath: '', purpose: '', memo: '',
      screenTitle: '', topNote: '',
      useSearch: !!ds.useSearch, useTable: !!ds.useTable,
      useStatusChip: !!ds.useStatusChip, useRowAction: !!ds.useRowAction, useEmpty: !!ds.useEmpty,
      searchItems: ds.useSearch ? [{ cond: '검색어', inputType: 'text', required: false, defaultVal: '', order: 1 }] : [],
      tableColumns: ds.useTable ? [
        { name: '항목명', key: 'name', visible: true, sortable: true, width: '200px' },
        { name: '상태', key: 'status', visible: true, sortable: false, width: '80px' }
      ] : [],
      rowActions: ds.useRowAction ? [{ name: '상세 보기', style: 'ghost', link: '', permission: '전체', condition: '항상' }] : [],
      attachmentNote: ''
    };
    /* Apply wireframe preset if available */
    var preset = WIREFRAME_PRESETS[tpl.id] || {};
    SSP.draft.defaultWireframeType = preset.defaultWireframeType || null;
    SSP.draft.defaultFlowLinks = (preset.defaultFlowLinks || []).slice();
    SSP.draft.domainOptions = (preset.domainOptions || []).map(function(o) { return Object.assign({}, o); });
    SSP.draft.components = (preset.defaultComponents || []).map(function(c) {
      return { id: c.id, type: c.type, name: c.name, enabled: c.enabled !== false, description: c.description || '', props: Object.assign({}, c.props || {}) };
    });
    SSP.editor.mode = 'create';
    SSP.editor.activeId = null;
    SSP.editor.previewDirty = false;
    SSP.editor.previewAppliedAt = null;
    SSP.previewModel = buildPreviewModelFromDraft(SSP.draft);
  }

  function collectDraftFromEditor() {
    var d = SSP.draft;
    if (!d) return;
    var g = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    d.screenName  = g('ed-screen-name');
    d.bizArea     = g('ed-biz-area');
    d.menuPath    = g('ed-menu-path');
    d.purpose     = g('ed-purpose');
    d.memo        = g('ed-memo');
    d.screenTitle = g('ed-screen-title');
    d.topNote     = g('ed-top-note');
    var typeEl = document.getElementById('ed-screen-type');
    if (typeEl) d.screenType = typeEl.value;
    ['useSearch', 'useTable', 'useStatusChip', 'useRowAction', 'useEmpty'].forEach(function(k) {
      var el = document.querySelector('[data-ed-toggle="' + k + '"]');
      if (el) d[k] = el.checked;
    });
    document.querySelectorAll('[data-ed-sb-field]').forEach(function(inp) {
      var idx = parseInt(inp.getAttribute('data-ed-sb-idx'), 10);
      var field = inp.getAttribute('data-ed-sb-field');
      if (d.searchItems[idx] !== undefined) d.searchItems[idx][field] = inp.value;
    });
    document.querySelectorAll('[data-ed-cb-field]').forEach(function(inp) {
      var idx = parseInt(inp.getAttribute('data-ed-cb-idx'), 10);
      var field = inp.getAttribute('data-ed-cb-field');
      if (d.tableColumns[idx] !== undefined) d.tableColumns[idx][field] = inp.value;
    });
    document.querySelectorAll('[data-ed-ab-field]').forEach(function(inp) {
      var idx = parseInt(inp.getAttribute('data-ed-ab-idx'), 10);
      var field = inp.getAttribute('data-ed-ab-field');
      if (d.rowActions[idx] !== undefined) d.rowActions[idx][field] = inp.value;
    });
  }

  /* backward-compat alias used by execSave / refreshEditorBuilders */
  function readDraftFromForm() { collectDraftFromEditor(); }

  /* ── Create View (새 화면설계서 작성 — Step 1: 서비스 유형 선택) ── */
  var CREATE_SVC_LIST = [
    { id: 'branding',    name: '홍보형',           desc: '회사소개, 브랜드, 랜딩, 캠페인, 콘텐츠 홍보 화면',
      icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
    { id: 'commerce',    name: '커머스형',          desc: '상품, 장바구니, 주문, 결제, 마이페이지 화면',
      icon: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' },
    { id: 'business',    name: '업무시스템형',       desc: '관리자, 승인, 검토, 운영, 내부 업무 처리 화면',
      icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
    { id: 'community',   name: '커뮤니티/콘텐츠형', desc: '게시판, 피드, 콘텐츠 상세, 댓글, 공지 화면',
      icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    { id: 'reservation', name: '예약/신청형',        desc: '예약, 신청, 접수, 일정, 완료 화면',
      icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { id: 'blank',       name: '빈 템플릿',         desc: '정해진 유형 없이 직접 구성하는 화면',
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' }
  ];

  function renderTemplateView() {
    var el = document.getElementById('ss-template-view');
    if (!el) return;
    if (!SSP.serviceType) SSP.serviceType = 'branding';
    SSP.createStep = 1;
    var sel = SSP.serviceType;

    el.innerHTML =
      '<div class="ss-create-inner">' +
        '<div class="ss-create-hdr">' +
          '<h2 class="ss-create-title">새 화면설계서 작성</h2>' +
          '<p class="ss-create-sub">설계 대상 서비스 유형과 화면 영역을 선택한 뒤, Page Template을 기준으로 화면설계서를 시작합니다.</p>' +
        '</div>' +
        '<div class="ss-create-steps" role="list" aria-label="작성 단계">' +
          '<div class="ss-step is-active" role="listitem">' +
            '<span class="ss-step-num">1</span>' +
            '<span class="ss-step-label">서비스 유형</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step" role="listitem">' +
            '<span class="ss-step-num">2</span>' +
            '<span class="ss-step-label">Front / Admin</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step" role="listitem">' +
            '<span class="ss-step-num">3</span>' +
            '<span class="ss-step-label">Page Template</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step" role="listitem">' +
            '<span class="ss-step-num">4</span>' +
            '<span class="ss-step-label">기본 정보</span>' +
          '</div>' +
        '</div>' +
        '<div class="ss-create-sec-hdr">' +
          '<h3 class="ss-create-sec-title">설계 대상 서비스의 유형을 선택하세요</h3>' +
          '<p class="ss-create-sec-desc">선택한 유형을 기준으로 적합한 Page Template 목록이 제공됩니다.</p>' +
        '</div>' +
        '<div class="ss-svc-grid">' +
          CREATE_SVC_LIST.map(function(s) {
            return '<button type="button" class="ss-svc-card' + (s.id === sel ? ' is-active' : '') + '" data-ss-svc="' + s.id + '">' +
              '<span class="ss-svc-card-icon">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' + s.icon + '</svg>' +
              '</span>' +
              '<span class="ss-svc-card-body">' +
                '<span class="ss-svc-card-name">' + s.name + '</span>' +
                '<span class="ss-svc-card-desc">' + s.desc + '</span>' +
              '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="ss-create-foot">' +
          '<div class="ss-create-foot-l">' +
            '<button type="button" class="ss-create-btn" data-ssv-action="create-prev">' +
              svgIc('<polyline points="15 18 9 12 15 6"/>', 13) + ' 이전' +
            '</button>' +
          '</div>' +
          '<div class="ss-create-foot-r">' +
            '<button type="button" class="ss-create-btn is-primary" id="ss-create-next-btn" data-ssv-action="create-next">' +
              '다음 단계 ' + svgIc('<polyline points="9 18 15 12 9 6"/>', 13) +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── Create View Step 2: Front / Admin ── */
  var CREATE_FRONT_ADMIN_LIST = [
    { id: 'front', name: 'Front',
      desc: '사용자에게 노출되는 웹/앱 화면을 설계합니다.',
      icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>' },
    { id: 'admin', name: 'Admin',
      desc: '운영자, 관리자, 내부 담당자가 사용하는 업무 화면을 설계합니다.',
      icon: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' }
  ];

  var SS_STEP_CHK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  function renderCreateStep2() {
    var el = document.getElementById('ss-template-view');
    if (!el) return;
    if (!SSP.frontAdmin) SSP.frontAdmin = 'front';
    SSP.createStep = 2;
    var sel = SSP.frontAdmin;

    el.innerHTML =
      '<div class="ss-create-inner">' +
        '<div class="ss-create-hdr">' +
          '<h2 class="ss-create-title">새 화면설계서 작성</h2>' +
          '<p class="ss-create-sub">설계 대상 서비스 유형과 화면 영역을 선택한 뒤, Page Template을 기준으로 화면설계서를 시작합니다.</p>' +
        '</div>' +
        '<div class="ss-create-steps" role="list" aria-label="작성 단계">' +
          '<div class="ss-step is-done" role="listitem">' +
            '<span class="ss-step-num">' + SS_STEP_CHK + '</span>' +
            '<span class="ss-step-label">서비스 유형</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step is-active" role="listitem">' +
            '<span class="ss-step-num">2</span>' +
            '<span class="ss-step-label">Front / Admin</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step" role="listitem">' +
            '<span class="ss-step-num">3</span>' +
            '<span class="ss-step-label">Page Template</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step" role="listitem">' +
            '<span class="ss-step-num">4</span>' +
            '<span class="ss-step-label">기본 정보</span>' +
          '</div>' +
        '</div>' +
        '<div class="ss-create-sec-hdr">' +
          '<h3 class="ss-create-sec-title">화면 영역을 선택하세요</h3>' +
          '<p class="ss-create-sec-desc">선택한 서비스 유형에 맞춰 Front 또는 Admin 화면설계서 흐름을 이어갑니다.</p>' +
        '</div>' +
        '<div class="ss-svc-grid ss-svc-grid-2">' +
          CREATE_FRONT_ADMIN_LIST.map(function(s) {
            return '<button type="button" class="ss-svc-card' + (s.id === sel ? ' is-active' : '') + '" data-ss-fa="' + s.id + '">' +
              '<span class="ss-svc-card-icon">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' + s.icon + '</svg>' +
              '</span>' +
              '<span class="ss-svc-card-body">' +
                '<span class="ss-svc-card-name">' + s.name + '</span>' +
                '<span class="ss-svc-card-desc">' + s.desc + '</span>' +
              '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="ss-create-foot">' +
          '<div class="ss-create-foot-l">' +
            '<button type="button" class="ss-create-btn" data-ssv-action="create-prev">' +
              svgIc('<polyline points="15 18 9 12 15 6"/>', 13) + ' 이전' +
            '</button>' +
          '</div>' +
          '<div class="ss-create-foot-r">' +
            '<button type="button" class="ss-create-btn is-primary" data-ssv-action="create-next">' +
              '다음 단계 ' + svgIc('<polyline points="9 18 15 12 9 6"/>', 13) +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── Create View Step 3: Page Template selection ── */
  var CREATE_PAGE_TEMPLATE_LIST = [
    { id: 'dashboard',  name: '대시보드',
      desc: '주요 지표·현황 요약·빠른 링크로 구성되는 홈/대시보드 화면',
      sections: ['KPI 카드', '차트 영역', '최근 활동', '빠른 실행'],
      structure: { useSearch: false, useTable: true, useStatusChip: true, useRowAction: false, useEmpty: false } },
    { id: 'list-search', name: '목록 / 검색',
      desc: '검색 조건 + 결과 테이블로 구성되는 일반 목록·조회 화면',
      sections: ['검색 영역', '필터', '결과 테이블', '페이지네이션'],
      structure: { useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true } },
    { id: 'reg-form', name: '등록 / 수정 폼',
      desc: '입력 필드와 저장 액션으로 구성되는 폼 화면',
      sections: ['폼 섹션', '유효성 안내', '액션 버튼'],
      structure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false } },
    { id: 'settings', name: '설정',
      desc: '항목별 설정값을 관리하고 저장하는 설정 화면',
      sections: ['설정 그룹', '설정 항목', '저장 버튼'],
      structure: { useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false } }
  ];

  function renderCreateStep3() {
    var el = document.getElementById('ss-template-view');
    if (!el) return;
    SSP.createStep = 3;
    if (!SSP.pageTemplate) SSP.pageTemplate = CREATE_PAGE_TEMPLATE_LIST[0].id;
    var sel = SSP.pageTemplate;
    var svcObj = findServiceTypeById(SSP.serviceType || 'branding');
    var svcName = svcObj.name;
    var areaName = (SSP.frontAdmin === 'admin') ? 'Admin' : 'Front';

    el.innerHTML =
      '<div class="ss-create-inner">' +
        '<div class="ss-create-hdr">' +
          '<h2 class="ss-create-title">새 화면설계서 작성</h2>' +
          '<p class="ss-create-sub">설계 대상 서비스 유형과 화면 영역을 선택한 뒤, Page Template을 기준으로 화면설계서를 시작합니다.</p>' +
        '</div>' +
        '<div class="ss-create-steps" role="list" aria-label="작성 단계">' +
          '<div class="ss-step is-done" role="listitem">' +
            '<span class="ss-step-num">' + SS_STEP_CHK + '</span>' +
            '<span class="ss-step-label">서비스 유형</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step is-done" role="listitem">' +
            '<span class="ss-step-num">' + SS_STEP_CHK + '</span>' +
            '<span class="ss-step-label">Front / Admin</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step is-active" role="listitem">' +
            '<span class="ss-step-num">3</span>' +
            '<span class="ss-step-label">Page Template</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step" role="listitem">' +
            '<span class="ss-step-num">4</span>' +
            '<span class="ss-step-label">기본 정보</span>' +
          '</div>' +
        '</div>' +
        '<div class="ss-create-sec-hdr">' +
          '<h3 class="ss-create-sec-title">Page Template을 선택하세요</h3>' +
          '<p class="ss-create-sec-desc">선택한 서비스 유형과 화면 영역에 맞는 Page Template을 선택합니다.</p>' +
        '</div>' +
        '<div class="ss-ptpl-grid">' +
          CREATE_PAGE_TEMPLATE_LIST.map(function(t) {
            return '<button type="button" class="ss-ptpl-card' + (t.id === sel ? ' is-active' : '') + '" data-ss-ptpl="' + t.id + '">' +
              '<div class="ss-ptpl-name">' + t.name + '</div>' +
              '<div class="ss-ptpl-tgt">' + svcName + ' · ' + areaName + '</div>' +
              '<div class="ss-ptpl-meta">' +
                '<span class="ss-ptpl-tag">섹션 ' + t.sections.length + '개</span>' +
              '</div>' +
              '<div class="ss-ptpl-desc">' + t.desc + '</div>' +
              '<div class="ss-ptpl-sl">기본 포함 섹션</div>' +
              t.sections.map(function(s) { return '<div class="ss-ptpl-si">' + s + '</div>'; }).join('') +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="ss-create-foot">' +
          '<div class="ss-create-foot-l">' +
            '<button type="button" class="ss-create-btn" data-ssv-action="create-prev">' +
              svgIc('<polyline points="15 18 9 12 15 6"/>', 13) + ' 이전' +
            '</button>' +
          '</div>' +
          '<div class="ss-create-foot-r">' +
            '<button type="button" class="ss-create-btn is-primary" data-ssv-action="create-next">' +
              '다음 단계 ' + svgIc('<polyline points="9 18 15 12 9 6"/>', 13) +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── Create View Step 4: Basic Info + Summary ── */
  function renderCreateStep4() {
    var el = document.getElementById('ss-template-view');
    if (!el) return;
    SSP.createStep = 4;
    var svcObj = findServiceTypeById(SSP.serviceType || 'branding');
    var svcName = svcObj.name;
    var areaName = (SSP.frontAdmin === 'admin') ? 'Admin' : 'Front';
    var ptpl = (function() {
      for (var i = 0; i < CREATE_PAGE_TEMPLATE_LIST.length; i++) {
        if (CREATE_PAGE_TEMPLATE_LIST[i].id === SSP.pageTemplate) return CREATE_PAGE_TEMPLATE_LIST[i];
      }
      return CREATE_PAGE_TEMPLATE_LIST[0];
    }());
    var idNum = SS_SEQ < 10 ? '0' + SS_SEQ : '' + SS_SEQ;
    var defaultId = SSP.step4ScreenId || ('SCR-' + idNum);

    el.innerHTML =
      '<div class="ss-create-inner">' +
        '<div class="ss-create-hdr">' +
          '<h2 class="ss-create-title">새 화면설계서 작성</h2>' +
          '<p class="ss-create-sub">설계 대상 서비스 유형과 화면 영역을 선택한 뒤, Page Template을 기준으로 화면설계서를 시작합니다.</p>' +
        '</div>' +
        '<div class="ss-create-steps" role="list" aria-label="작성 단계">' +
          '<div class="ss-step is-done" role="listitem">' +
            '<span class="ss-step-num">' + SS_STEP_CHK + '</span>' +
            '<span class="ss-step-label">서비스 유형</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step is-done" role="listitem">' +
            '<span class="ss-step-num">' + SS_STEP_CHK + '</span>' +
            '<span class="ss-step-label">Front / Admin</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step is-done" role="listitem">' +
            '<span class="ss-step-num">' + SS_STEP_CHK + '</span>' +
            '<span class="ss-step-label">Page Template</span>' +
          '</div>' +
          '<span class="ss-step-sep" aria-hidden="true"></span>' +
          '<div class="ss-step is-active" role="listitem">' +
            '<span class="ss-step-num">4</span>' +
            '<span class="ss-step-label">기본 정보</span>' +
          '</div>' +
        '</div>' +
        '<div class="ss-create-sec-hdr">' +
          '<h3 class="ss-create-sec-title">기본 정보를 입력하세요</h3>' +
          '<p class="ss-create-sec-desc">화면설계서의 기본 정보를 입력하면 편집기에서 바로 작업을 시작할 수 있습니다.</p>' +
        '</div>' +
        '<div class="ss-s4-wrap">' +
          '<div class="ss-s4-form">' +
            '<div class="ss-frow2">' +
              '<div class="ss-fgrp">' +
                '<label class="ss-flbl" for="ss-s4-screen-id">화면 ID</label>' +
                '<input type="text" id="ss-s4-screen-id" class="ss-finp" value="' + defaultId + '" placeholder="SCR-00" autocomplete="off">' +
                '<p class="ss-fhint">자동 부여됩니다. 필요시 수정 가능합니다.</p>' +
              '</div>' +
              '<div class="ss-fgrp">' +
                '<label class="ss-flbl" for="ss-s4-screen-name">화면명 <span class="ss-req">*</span></label>' +
                '<input type="text" id="ss-s4-screen-name" class="ss-finp" placeholder="화면명을 입력하세요" autocomplete="off">' +
              '</div>' +
            '</div>' +
            '<div class="ss-fgrp">' +
              '<label class="ss-flbl" for="ss-s4-biz-area">비즈니스 영역</label>' +
              '<input type="text" id="ss-s4-biz-area" class="ss-finp" placeholder="예: 회원 관리, 주문 처리" autocomplete="off">' +
            '</div>' +
            '<div class="ss-fgrp">' +
              '<label class="ss-flbl">초기 작성 상태</label>' +
              '<div class="ss-st-radios">' +
                '<label class="ss-st-r"><input type="radio" name="ss-s4-status" value="writing" checked> 작성 중</label>' +
                '<label class="ss-st-r"><input type="radio" name="ss-s4-status" value="done"> 작성완료</label>' +
                '<label class="ss-st-r"><input type="radio" name="ss-s4-status" value="review"> 검토대기</label>' +
              '</div>' +
            '</div>' +
            '<div class="ss-fgrp">' +
              '<label class="ss-flbl" for="ss-s4-memo">메모</label>' +
              '<textarea id="ss-s4-memo" class="ss-finp ss-finp-ta" placeholder="화면 작성 시 참고할 내용을 입력하세요 (선택사항)"></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="ss-sum-panel">' +
            '<div class="ss-sum-ttl">작성 요약</div>' +
            '<div class="ss-sum-row"><span class="ss-sum-lbl">서비스 유형</span><span class="ss-sum-val">' + svcName + '</span></div>' +
            '<div class="ss-sum-row"><span class="ss-sum-lbl">화면 영역</span><span class="ss-sum-val">' + areaName + '</span></div>' +
            '<div class="ss-sum-row"><span class="ss-sum-lbl">Page Template</span><span class="ss-sum-val">' + ptpl.name + '</span></div>' +
            '<hr class="ss-sum-div">' +
            '<div class="ss-sum-row" style="flex-direction:column;gap:4px">' +
              '<span class="ss-sum-lbl" style="width:auto">포함 섹션</span>' +
              '<span class="ss-sum-val" style="font-size:11px;font-weight:400;color:var(--t2)">' + ptpl.sections.join(' · ') + '</span>' +
            '</div>' +
            '<hr class="ss-sum-div">' +
            '<div class="ss-sum-note">입력 완료 후 편집기에서 화면 구성 및 주석을 작성합니다.</div>' +
          '</div>' +
        '</div>' +
        '<div class="ss-create-foot">' +
          '<div class="ss-create-foot-l">' +
            '<button type="button" class="ss-create-btn" data-ssv-action="create-prev">' +
              svgIc('<polyline points="15 18 9 12 15 6"/>', 13) + ' 이전' +
            '</button>' +
          '</div>' +
          '<div class="ss-create-foot-r">' +
            '<button type="button" class="ss-create-btn is-primary" data-ssv-action="create-next">' +
              '완료 및 편집기 열기 ' + svgIc('<polyline points="9 18 15 12 9 6"/>', 13) +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── Editor builder helpers ── */
  function edToggleRow(key, checked, label, sub) {
    return '<div class="ss-ed-toggle-row">' +
      '<div class="ss-ed-toggle-row-l">' +
        '<span class="ss-ed-toggle-lbl">' + label + '</span>' +
        (sub ? '<span class="ss-ed-toggle-sub">' + sub + '</span>' : '') +
      '</div>' +
      '<label class="ss-ed-toggle-sw">' +
        '<input type="checkbox" data-ed-toggle="' + key + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="ss-ed-toggle-track"></span>' +
        '<span class="ss-ed-toggle-knob"></span>' +
      '</label>' +
    '</div>';
  }

  var DEL_IC = '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>';

  function buildSearchBuilder() {
    var d = SSP.draft;
    if (!d || !d.useSearch) return '<div class="ss-ed-builder-off">검색영역을 사용하지 않습니다 — 화면 구조에서 켜면 여기에 표시됩니다.</div>';
    return '<div class="ss-ed-builder-rows" id="ed-sb-rows">' +
      d.searchItems.map(function(item, i) {
        return '<div class="ss-ed-builder-row">' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">조건명</label><input class="ss-ed-binp" data-ed-sb-field="cond" data-ed-sb-idx="' + i + '" value="' + (item.cond||'') + '" placeholder="조건명"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">입력타입</label><input class="ss-ed-binp" data-ed-sb-field="inputType" data-ed-sb-idx="' + i + '" value="' + (item.inputType||'') + '" placeholder="text/select/date"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">필수</label><input class="ss-ed-binp" style="width:52px" data-ed-sb-field="required" data-ed-sb-idx="' + i + '" value="' + (item.required ? 'Y' : 'N') + '" placeholder="Y/N"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">기본값</label><input class="ss-ed-binp" data-ed-sb-field="defaultVal" data-ed-sb-idx="' + i + '" value="' + (item.defaultVal||'') + '" placeholder="기본값"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">순서</label><input class="ss-ed-binp" style="width:52px" data-ed-sb-field="order" data-ed-sb-idx="' + i + '" value="' + (item.order||1) + '" placeholder="1"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">&nbsp;</label><button type="button" class="ss-ed-builder-del" data-ed-sb-del="' + i + '">' + svgIc(DEL_IC, 13) + '</button></div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<button type="button" class="ss-ed-builder-add" data-ed-add="search">' + svgIc('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 12) + ' 검색 조건 추가</button>';
  }

  function buildColBuilder() {
    var d = SSP.draft;
    if (!d || !d.useTable) return '<div class="ss-ed-builder-off">결과테이블을 사용하지 않습니다 — 화면 구조에서 켜면 여기에 표시됩니다.</div>';
    return '<div class="ss-ed-builder-rows" id="ed-cb-rows">' +
      d.tableColumns.map(function(col, i) {
        return '<div class="ss-ed-builder-row">' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">컬럼명</label><input class="ss-ed-binp" data-ed-cb-field="name" data-ed-cb-idx="' + i + '" value="' + (col.name||'') + '" placeholder="컬럼명"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">데이터키</label><input class="ss-ed-binp" data-ed-cb-field="key" data-ed-cb-idx="' + i + '" value="' + (col.key||'') + '" placeholder="camelCase"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">표시</label><input class="ss-ed-binp" style="width:52px" data-ed-cb-field="visible" data-ed-cb-idx="' + i + '" value="' + (col.visible ? 'Y' : 'N') + '" placeholder="Y/N"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">정렬가능</label><input class="ss-ed-binp" style="width:60px" data-ed-cb-field="sortable" data-ed-cb-idx="' + i + '" value="' + (col.sortable ? 'Y' : 'N') + '" placeholder="Y/N"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">너비</label><input class="ss-ed-binp" style="width:68px" data-ed-cb-field="width" data-ed-cb-idx="' + i + '" value="' + (col.width||'120px') + '" placeholder="120px"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">&nbsp;</label><button type="button" class="ss-ed-builder-del" data-ed-cb-del="' + i + '">' + svgIc(DEL_IC, 13) + '</button></div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<button type="button" class="ss-ed-builder-add" data-ed-add="col">' + svgIc('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 12) + ' 컬럼 추가</button>';
  }

  function buildActionBuilder() {
    var d = SSP.draft;
    if (!d || !d.useRowAction) return '<div class="ss-ed-builder-off">행 액션을 사용하지 않습니다 — 화면 구조에서 켜면 여기에 표시됩니다.</div>';
    return '<div class="ss-ed-builder-rows" id="ed-ab-rows">' +
      d.rowActions.map(function(act, i) {
        return '<div class="ss-ed-builder-row">' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">액션명</label><input class="ss-ed-binp" data-ed-ab-field="name" data-ed-ab-idx="' + i + '" value="' + (act.name||'') + '" placeholder="액션명"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">버튼 스타일</label><input class="ss-ed-binp" data-ed-ab-field="style" data-ed-ab-idx="' + i + '" value="' + (act.style||'ghost') + '" placeholder="primary/ghost"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">연결 화면</label><input class="ss-ed-binp" data-ed-ab-field="link" data-ed-ab-idx="' + i + '" value="' + (act.link||'') + '" placeholder="화면 ID"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">권한</label><input class="ss-ed-binp" data-ed-ab-field="permission" data-ed-ab-idx="' + i + '" value="' + (act.permission||'전체') + '" placeholder="전체/관리자"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">표시조건</label><input class="ss-ed-binp" data-ed-ab-field="condition" data-ed-ab-idx="' + i + '" value="' + (act.condition||'항상') + '" placeholder="항상/로그인"></div>' +
          '<div class="ss-ed-bc"><label class="ss-ed-blbl">&nbsp;</label><button type="button" class="ss-ed-builder-del" data-ed-ab-del="' + i + '">' + svgIc(DEL_IC, 13) + '</button></div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<button type="button" class="ss-ed-builder-add" data-ed-add="action">' + svgIc('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 12) + ' 액션 추가</button>';
  }

  function buildDescTable(d) {
    var items = []; var n = 1;
    items.push({ n: n++, name: '화면 제목', src: '템플릿 기본', on: true });
    if (d.topNote) items.push({ n: n++, name: '상단 안내문구', src: '입력값 기반', on: true });
    if (d.useSearch) {
      items.push({ n: n++, name: '검색 조건', src: '입력값 기반 (' + d.searchItems.length + '개)', on: true });
      items.push({ n: n++, name: '조회 버튼', src: '템플릿 기본', on: true });
    }
    if (d.useTable) items.push({ n: n++, name: '결과 테이블', src: '입력값 기반 (' + d.tableColumns.length + '열)', on: true });
    if (d.useStatusChip) items.push({ n: n++, name: '상태 chip', src: '템플릿 기본', on: true });
    if (d.useRowAction) items.push({ n: n++, name: '행 액션', src: '입력값 기반 (' + d.rowActions.length + '개)', on: true });
    if (d.useEmpty) items.push({ n: n++, name: '빈 결과 상태', src: '템플릿 기본', on: true });
    ['useSearch','useTable','useStatusChip','useRowAction','useEmpty'].forEach(function(k) {
      if (!d[k]) {
        var lblMap = { useSearch: '검색영역', useTable: '결과테이블', useStatusChip: '상태 chip', useRowAction: '행 액션', useEmpty: '빈 결과 상태' };
        items.push({ n: 0, name: lblMap[k], src: '사용 안 함', on: false });
      }
    });
    var nums = ['❶','❷','❸','❹','❺','❻','❼','❽','❾','❿'];
    return '<table class="ss-ed-desc-table"><thead><tr>' +
      '<th style="width:40px">번호</th><th>항목명</th><th>생성 방식</th><th style="width:70px">상태</th>' +
      '</tr></thead><tbody>' +
      items.map(function(item) {
        return '<tr>' +
          '<td class="ss-ed-desc-num">' + (item.on ? (nums[item.n - 1] || item.n) : '—') + '</td>' +
          '<td class="ss-ed-desc-name">' + item.name + '</td>' +
          '<td class="ss-ed-desc-src">' + item.src + '</td>' +
          '<td>' + (item.on ? '<span class="ss-ed-chip-on">사용함</span>' : '<span class="ss-ed-chip-off">미사용</span>') + '</td>' +
        '</tr>';
      }).join('') +
    '</tbody></table>';
  }

  /* ── previewModel ── */
  function buildPreviewModelFromDraft(draft) {
    if (!draft) return null;
    var items = []; var n = 1;
    if (draft.components && draft.components.length > 0) {
      /* component-based wireframe (preset templates) */
      draft.components.forEach(function(cmp) {
        if (cmp.enabled !== false) {
          items.push({ n: n++, name: cmp.name, type: cmp.type, value: cmp.description || '', props: cmp.props || {} });
        }
      });
    } else {
      /* fallback: toggle-based wireframe */
      var sName = draft.screenTitle || draft.screenName || '(화면명 미입력)';
      items.push({ n: n++, name: '화면 제목', type: 'title', value: sName });
      if (draft.topNote) items.push({ n: n++, name: '상단 안내문구', type: 'note', value: draft.topNote });
      if (draft.useSearch) {
        items.push({ n: n++, name: '검색 조건', type: 'search', value: draft.searchItems.slice() });
        items.push({ n: n++, name: '조회 버튼', type: 'btn', value: null });
      }
      if (draft.useTable) items.push({ n: n++, name: '결과 테이블', type: 'table', value: draft.tableColumns.slice() });
      if (draft.useStatusChip) items.push({ n: n++, name: '상태 chip', type: 'chip', value: null });
      if (draft.useRowAction) items.push({ n: n++, name: '행 액션', type: 'actions', value: draft.rowActions.slice() });
      if (draft.useEmpty) items.push({ n: n++, name: '빈 결과 상태', type: 'empty', value: null });
    }
    return {
      items: items,
      screenName: draft.screenName,
      screenTitle: draft.screenTitle,
      templateName: draft.templateName,
      templateGroup: draft.templateGroup,
      screenType: draft.screenType,
      defaultWireframeType: draft.defaultWireframeType || null
    };
  }

  function markPreviewDirty() {
    SSP.editor.previewDirty = true;
    document.querySelectorAll('.ss-wireframe-chip').forEach(function(chip) {
      chip.className = 'ss-wireframe-chip ss-wf-chip--dirty';
      chip.textContent = '변경사항 미적용';
    });
  }

  function applyPreviewModel() {
    collectDraftFromEditor();
    SSP.previewModel = buildPreviewModelFromDraft(SSP.draft);
    SSP.editor.previewDirty = false;
    SSP.editor.previewAppliedAt = Date.now();
    renderWireframePreview(SSP.previewModel);
  }

  /* ── Wireframe renderer ── */
  function renderWireframeItem(item) {
    var marker = '<span class="ss-wf-marker">' + item.n + '</span>';
    var conds, cols, acts;
    switch (item.type) {
      case 'title':
        return '<div class="ss-wf-block ss-wf-block--title">' + marker + '<span class="ss-wf-title-text">' + item.value + '</span></div>';
      case 'note':
        return '<div class="ss-wf-block ss-wf-block--note">' + marker + '<span class="ss-wf-note-text">' + item.value + '</span></div>';
      case 'search':
        conds = Array.isArray(item.value) ? item.value : [];
        return '<div class="ss-wf-block ss-wf-block--search">' + marker +
          '<div class="ss-wf-search-row">' +
            conds.map(function(c) {
              return '<div class="ss-wf-search-cond"><div class="ss-wf-cond-lbl">' + (c.cond || '조건') + '</div><div class="ss-wf-cond-inp"></div></div>';
            }).join('') +
          '</div>' +
        '</div>';
      case 'btn':
        return '<div class="ss-wf-block ss-wf-block--btn">' + marker + '<div class="ss-wf-btn-mock">조회</div></div>';
      case 'table':
        cols = Array.isArray(item.value) ? item.value.filter(function(c) { return c.visible !== 'N'; }) : [];
        if (!cols.length) return '<div class="ss-wf-block ss-wf-block--table">' + marker + '<div class="ss-wf-table-empty">컬럼 없음</div></div>';
        return '<div class="ss-wf-block ss-wf-block--table">' + marker +
          '<div class="ss-wf-table-wrap"><table class="ss-wf-table"><thead><tr>' +
            cols.map(function(c) { return '<th>' + (c.name || '—') + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
            [1, 2].map(function() {
              return '<tr>' + cols.map(function() { return '<td><div class="ss-wf-cell-ph"></div></td>'; }).join('') + '</tr>';
            }).join('') +
          '</tbody></table></div>' +
        '</div>';
      case 'chip':
        return '<div class="ss-wf-block ss-wf-block--chip">' + marker +
          '<div class="ss-wf-chips"><span class="ss-wf-chip-item ss-wf-ci--a">작성</span><span class="ss-wf-chip-item ss-wf-ci--b">검토</span><span class="ss-wf-chip-item ss-wf-ci--c">승인</span></div>' +
        '</div>';
      case 'actions':
        acts = Array.isArray(item.value) ? item.value : [];
        return '<div class="ss-wf-block ss-wf-block--actions">' + marker +
          '<div class="ss-wf-acts">' + acts.map(function(a) { return '<div class="ss-wf-act-btn">' + (a.name || '액션') + '</div>'; }).join('') + '</div>' +
        '</div>';
      case 'empty':
      case 'wf-empty':
        return '<div class="ss-wf-block ss-wf-block--empty">' + marker + '<div class="ss-wf-empty-ph">' + (item.name || '빈 결과 상태') + '</div></div>';

      /* ── Component-based wireframe types ── */
      case 'wf-hero':
        return '<div class="ss-wf-block ss-wf-block--hero">' + marker +
          '<div class="ss-wf-hero-inner"><div class="ss-wf-hero-ph"></div><div class="ss-wf-cmp-desc">' + item.value + '</div></div></div>';
      case 'wf-header':
        return '<div class="ss-wf-block ss-wf-block--header">' + marker +
          '<div class="ss-wf-header-row"><span class="ss-wf-hd-logo">LOGO</span><span class="ss-wf-hd-search-ph"></span><span class="ss-wf-hd-icons">☰</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-quick-menu':
        return '<div class="ss-wf-block ss-wf-block--quick-menu">' + marker +
          '<div class="ss-wf-quick-grid">' + ['식품','패션','뷰티','생활','스포츠','디지털'].map(function(l) { return '<div class="ss-wf-quick-item"><div class="ss-wf-qi-icon"></div><span class="ss-wf-qi-lbl">' + l + '</span></div>'; }).join('') + '</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-product-section':
      case 'wf-related-products':
        return '<div class="ss-wf-block ss-wf-block--product-section">' + marker +
          '<div class="ss-wf-sec-title-row"><span class="ss-wf-sec-lbl">' + item.name + '</span></div>' +
          '<div class="ss-wf-product-row">' + [1,2,3,4].map(function() { return '<div class="ss-wf-product-card"><div class="ss-wf-pc-img"></div><div class="ss-wf-pc-name"></div><div class="ss-wf-pc-price"></div></div>'; }).join('') + '</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-product-grid':
        return '<div class="ss-wf-block ss-wf-block--product-grid">' + marker +
          '<div class="ss-wf-grid-3">' + [1,2,3,4,5,6].map(function() { return '<div class="ss-wf-product-card"><div class="ss-wf-pc-img"></div><div class="ss-wf-pc-name"></div><div class="ss-wf-pc-price"></div></div>'; }).join('') + '</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-promo-section':
        return '<div class="ss-wf-block ss-wf-block--promo">' + marker +
          '<div class="ss-wf-promo-ph"><span>기획전/프로모션 배너</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-product-info':
        return '<div class="ss-wf-block ss-wf-block--product-info">' + marker +
          '<div class="ss-wf-pi-rows"><div class="ss-wf-pi-row ss-wf-pi-name"></div><div class="ss-wf-pi-row ss-wf-pi-price"></div><div class="ss-wf-pi-row ss-wf-pi-status"></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-image-gallery':
        return '<div class="ss-wf-block ss-wf-block--gallery">' + marker +
          '<div class="ss-wf-gallery-row"><div class="ss-wf-gallery-main"></div><div class="ss-wf-gallery-thumbs">' + [1,2,3,4].map(function() { return '<div class="ss-wf-gallery-th"></div>'; }).join('') + '</div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-option-selector':
        return '<div class="ss-wf-block ss-wf-block--option">' + marker +
          '<div class="ss-wf-opt-row"><div class="ss-wf-opt-sel"></div><div class="ss-wf-opt-qty"></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-detail-tabs':
        return '<div class="ss-wf-block ss-wf-block--tabs">' + marker +
          '<div class="ss-wf-tab-row"><span class="ss-wf-tab active">상세정보</span><span class="ss-wf-tab">구매후기</span><span class="ss-wf-tab">문의</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-cart-items':
        return '<div class="ss-wf-block ss-wf-block--cart-items">' + marker +
          '<div class="ss-wf-cart-rows">' + [1,2].map(function() { return '<div class="ss-wf-cart-row"><div class="ss-wf-cr-img"></div><div class="ss-wf-cr-info"><div class="ss-wf-cr-name"></div><div class="ss-wf-cr-opt"></div></div><div class="ss-wf-cr-qty"></div><div class="ss-wf-cr-price"></div></div>'; }).join('') + '</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-order-summary':
      case 'wf-checkout-price':
        return '<div class="ss-wf-block ss-wf-block--summary">' + marker +
          '<div class="ss-wf-summary-rows"><div class="ss-wf-sum-row"><span></span><span></span></div><div class="ss-wf-sum-row"><span></span><span></span></div><div class="ss-wf-sum-total"><span>결제 금액</span><span class="ss-wf-sum-amt"></span></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-cta-buy':
      case 'wf-cart-cta':
      case 'wf-checkout-cta':
        return '<div class="ss-wf-block ss-wf-block--cta-primary">' + marker +
          '<div class="ss-wf-cta-row"><div class="ss-wf-cta-ghost">' + (item.type === 'wf-cta-buy' ? '장바구니 담기' : '주문하기') + '</div><div class="ss-wf-cta-primary">' + (item.type === 'wf-checkout-cta' ? '결제하기' : '구매하기') + '</div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-approval-cta':
        return '<div class="ss-wf-block ss-wf-block--approval-cta">' + marker +
          '<div class="ss-wf-appr-cta-row"><div class="ss-wf-appr-approve">승인</div><div class="ss-wf-appr-reject">반려</div><div class="ss-wf-appr-request">보완 요청</div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-my-profile':
        return '<div class="ss-wf-block ss-wf-block--my-profile">' + marker +
          '<div class="ss-wf-profile-card"><div class="ss-wf-profile-avatar"></div><div class="ss-wf-profile-info"><div class="ss-wf-pi-name"></div><div class="ss-wf-pi-grade"></div></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-order-status':
        return '<div class="ss-wf-block ss-wf-block--order-status">' + marker +
          '<div class="ss-wf-step-row">' + ['결제완료','배송준비','배송중','배송완료'].map(function(s,i) { return '<div class="ss-wf-step' + (i===0?' active':'') + '"><div class="ss-wf-step-dot"></div><span class="ss-wf-step-lbl">' + s + '</span></div>'; }).join('<div class="ss-wf-step-line"></div>') + '</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-asset-summary':
      case 'wf-stats-summary':
        return '<div class="ss-wf-block ss-wf-block--stat-cards">' + marker +
          '<div class="ss-wf-stat-row"><div class="ss-wf-stat-card"><div class="ss-wf-sc-val"></div><div class="ss-wf-sc-lbl">쿠폰</div></div><div class="ss-wf-stat-card"><div class="ss-wf-sc-val"></div><div class="ss-wf-sc-lbl">포인트</div></div><div class="ss-wf-stat-card"><div class="ss-wf-sc-val"></div><div class="ss-wf-sc-lbl">적립금</div></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-data-table':
        return '<div class="ss-wf-block ss-wf-block--data-table">' + marker +
          '<div class="ss-wf-table-wrap"><table class="ss-wf-table"><thead><tr><th>항목</th><th>상태</th><th>날짜</th><th>담당자</th></tr></thead><tbody>' +
          [1,2,3].map(function() { return '<tr><td><div class="ss-wf-cell-ph"></div></td><td><div class="ss-wf-cell-ph"></div></td><td><div class="ss-wf-cell-ph"></div></td><td><div class="ss-wf-cell-ph"></div></td></tr>'; }).join('') +
          '</tbody></table></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-status-chip':
        return '<div class="ss-wf-block ss-wf-block--status-chips">' + marker +
          '<div class="ss-wf-chips"><span class="ss-wf-chip-item ss-wf-ci--a">작성</span><span class="ss-wf-chip-item ss-wf-ci--b">검토</span><span class="ss-wf-chip-item ss-wf-ci--c">승인</span><span class="ss-wf-chip-item ss-wf-ci--d">반려</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-row-action':
        return '<div class="ss-wf-block ss-wf-block--row-action">' + marker +
          '<div class="ss-wf-acts"><div class="ss-wf-act-btn">상세</div><div class="ss-wf-act-btn">수정</div><div class="ss-wf-act-btn">삭제</div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-history':
        return '<div class="ss-wf-block ss-wf-block--history">' + marker +
          '<div class="ss-wf-timeline">' + ['등록','검토요청','승인'].map(function(s) { return '<div class="ss-wf-tl-item"><div class="ss-wf-tl-dot"></div><div class="ss-wf-tl-body"><span class="ss-wf-tl-status">' + s + '</span><span class="ss-wf-tl-meta"></span></div></div>'; }).join('') + '</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-approval-summary':
        return '<div class="ss-wf-block ss-wf-block--appr-summary">' + marker +
          '<div class="ss-wf-appr-card"><div class="ss-wf-ac-row"><span class="ss-wf-ac-lbl">요청자</span><span class="ss-wf-ac-val"></span></div><div class="ss-wf-ac-row"><span class="ss-wf-ac-lbl">요청일</span><span class="ss-wf-ac-val"></span></div><div class="ss-wf-ac-row"><span class="ss-wf-ac-lbl">유형</span><span class="ss-wf-ac-val"></span></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-search-bar':
      case 'wf-filter':
      case 'wf-search-filter':
        return '<div class="ss-wf-block ss-wf-block--filter">' + marker +
          '<div class="ss-wf-filter-row"><div class="ss-wf-f-inp"></div><div class="ss-wf-f-inp"></div><div class="ss-wf-f-inp ss-wf-f-wide"></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-sort':
        return '<div class="ss-wf-block ss-wf-block--sort">' + marker +
          '<div class="ss-wf-sort-row"><span class="ss-wf-sort-btn active">인기순</span><span class="ss-wf-sort-btn">최신순</span><span class="ss-wf-sort-btn">가격순</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-pagination':
        return '<div class="ss-wf-block ss-wf-block--pagination">' + marker +
          '<div class="ss-wf-page-row"><span class="ss-wf-page-btn">‹</span><span class="ss-wf-page-btn active">1</span><span class="ss-wf-page-btn">2</span><span class="ss-wf-page-btn">3</span><span class="ss-wf-page-btn">›</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-form-section':
      case 'wf-form-fields':
        return '<div class="ss-wf-block ss-wf-block--form-section">' + marker +
          '<div class="ss-wf-form-rows"><div class="ss-wf-form-row"><div class="ss-wf-fr-lbl"></div><div class="ss-wf-fr-inp"></div></div><div class="ss-wf-form-row"><div class="ss-wf-fr-lbl"></div><div class="ss-wf-fr-inp"></div></div><div class="ss-wf-form-row"><div class="ss-wf-fr-lbl"></div><div class="ss-wf-fr-inp ss-wf-fr-ta"></div></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-form-cta':
        return '<div class="ss-wf-block ss-wf-block--form-cta">' + marker +
          '<div class="ss-wf-cta-row"><div class="ss-wf-cta-ghost">취소</div><div class="ss-wf-cta-primary">저장</div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-screen-title':
        return '<div class="ss-wf-block ss-wf-block--screen-title">' + marker +
          '<div class="ss-wf-screen-title-row"><span class="ss-wf-st-text">' + (item.value || item.name || '화면 제목') + '</span><span class="ss-wf-st-btn">+ 등록</span></div></div>';
      case 'wf-cart-title':
        return '<div class="ss-wf-block ss-wf-block--cart-title">' + marker +
          '<div class="ss-wf-cart-title-row"><strong>' + (item.name || '장바구니') + '</strong><span class="ss-wf-cmp-desc">' + item.value + '</span></div></div>';
      case 'wf-bulk-action':
        return '<div class="ss-wf-block ss-wf-block--bulk-action">' + marker +
          '<div class="ss-wf-bulk-row"><span class="ss-wf-bulk-chk">☐ 전체 선택</span><span class="ss-wf-bulk-del">선택 삭제</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-delivery-info':
        return '<div class="ss-wf-block ss-wf-block--delivery-info">' + marker +
          '<div class="ss-wf-delivery-row"><span class="ss-wf-delivery-ph">배송 방법 · 도착 예정 안내</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-cart-empty':
        return '<div class="ss-wf-block ss-wf-block--cart-empty">' + marker +
          '<div class="ss-wf-empty-ph">' + (item.value || '장바구니가 비어 있습니다') + '</div></div>';
      case 'wf-checkout-address':
        return '<div class="ss-wf-block ss-wf-block--checkout-section">' + marker +
          '<div class="ss-wf-co-label">배송지 정보</div><div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-checkout-items':
        return '<div class="ss-wf-block ss-wf-block--checkout-section">' + marker +
          '<div class="ss-wf-co-label">주문 상품 요약</div><div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-checkout-discount':
        return '<div class="ss-wf-block ss-wf-block--checkout-section">' + marker +
          '<div class="ss-wf-co-label">쿠폰 / 포인트</div><div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-checkout-payment':
        return '<div class="ss-wf-block ss-wf-block--checkout-section">' + marker +
          '<div class="ss-wf-co-label">결제수단 선택</div><div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-checkout-terms':
        return '<div class="ss-wf-block ss-wf-block--checkout-section">' + marker +
          '<div class="ss-wf-co-label">약관 동의</div><div class="ss-wf-co-chk-row"><span>☐ 전체 동의</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-quick-links':
        return '<div class="ss-wf-block ss-wf-block--quick-links">' + marker +
          '<div class="ss-wf-qlinks-row"><span class="ss-wf-qlink-item">주문내역</span><span class="ss-wf-qlink-item">찜목록</span><span class="ss-wf-qlink-item">리뷰</span><span class="ss-wf-qlink-item">문의</span></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-recent-orders':
        return '<div class="ss-wf-block ss-wf-block--recent-orders">' + marker +
          '<div class="ss-wf-recent-row"><div class="ss-wf-recent-ph"></div><div class="ss-wf-recent-ph"></div><div class="ss-wf-recent-ph"></div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-file-upload':
        return '<div class="ss-wf-block ss-wf-block--file-upload">' + marker +
          '<div class="ss-wf-upload-box">📎 파일 선택 / 드롭</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-validation-msg':
        return '<div class="ss-wf-block ss-wf-block--validation">' + marker +
          '<div class="ss-wf-val-msg">⚠ 필수 입력 · 형식 오류 안내</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-approval-content':
        return '<div class="ss-wf-block ss-wf-block--appr-content">' + marker +
          '<div class="ss-wf-appr-content-ph"><div class="ss-wf-cmp-desc">' + item.value + '</div></div></div>';
      case 'wf-review-comment':
        return '<div class="ss-wf-block ss-wf-block--review-comment">' + marker +
          '<div class="ss-wf-textarea-ph">검토 의견 입력...</div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-permission-notice':
        return '<div class="ss-wf-block ss-wf-block--permission-notice">' + marker +
          '<div class="ss-wf-notice-row">ℹ ' + (item.value || '현재 처리 권한 및 상태 안내') + '</div></div>';
      case 'wf-search-btn':
        return '<div class="ss-wf-block ss-wf-block--btn">' + marker +
          '<div class="ss-wf-btn-row"><div class="ss-wf-btn-mock">조회</div><div class="ss-wf-btn-ghost">초기화</div></div>' +
          '<div class="ss-wf-cmp-desc">' + item.value + '</div></div>';
      case 'wf-footer-info':
        return '<div class="ss-wf-block ss-wf-block--footer-info">' + marker +
          '<div class="ss-wf-footer-ph">' + (item.value || '배송·혜택·고객센터 안내') + '</div></div>';
      default:
        /* generic component block */
        return '<div class="ss-wf-block ss-wf-block--generic">' + marker +
          '<div class="ss-wf-generic-inner"><span class="ss-wf-generic-name">' + (item.name || '') + '</span>' +
          (item.value ? '<span class="ss-wf-cmp-desc">' + item.value + '</span>' : '') +
          '</div></div>';
    }
  }

  function renderWireframePreview(previewModel) {
    var el = document.getElementById('ss-live-wireframe');
    if (!el) return;
    var dirty = SSP.editor.previewDirty;
    var sName = (previewModel && (previewModel.screenTitle || previewModel.screenName)) || '(화면명 미입력)';
    el.innerHTML =
      '<div class="ss-wireframe-head">' +
        '<span class="ss-wireframe-label">' + svgIc('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>', 13) + ' 구조 미리보기</span>' +
        '<span class="ss-wireframe-chip ' + (dirty ? 'ss-wf-chip--dirty' : 'ss-wf-chip--ok') + '">' + (dirty ? '변경사항 미적용' : '적용됨') + '</span>' +
        '<button type="button" class="ss-wireframe-apply" data-ssv-action="apply-preview">' +
          svgIc('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.12"/>', 13) + ' 미리보기 적용' +
        '</button>' +
      '</div>' +
      '<div class="ss-wireframe-note">현재 적용된 draft 기준 · 실제 데이터 아님</div>' +
      '<div class="ss-wireframe-body">' +
        (previewModel && previewModel.items && previewModel.items.length
          ? previewModel.items.map(renderWireframeItem).join('')
          : '<div class="ss-wireframe-empty">구조가 없습니다.</div>') +
      '</div>' +
      '<div class="ss-wireframe-title-bar"><span class="ss-wf-screen-name">' + sName + '</span></div>';
  }

  /* ── Editor form panel (right) ── */
  function renderEditorFormPanel(draft) {
    var el = document.getElementById('ss-editor-form-panel');
    if (!el || !draft) return;
    var d = draft;
    el.innerHTML =
      '<section class="ss-ed-section" id="sec-basic">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">기본 정보</h3></div>' +
        '<div class="ss-ed-form-grid">' +
          '<div class="ss-ed-field"><label class="ss-ed-lbl stam-label">화면명 <span class="ss-req">*</span></label><input id="ed-screen-name" class="ss-ed-inp stam-input" value="' + d.screenName + '" placeholder="화면명 입력"></div>' +
          '<div class="ss-ed-field"><label class="ss-ed-lbl stam-label">화면 ID</label><input class="ss-ed-inp ss-ed-ro stam-input is-readonly" value="' + d.screenId + '" readonly></div>' +
          '<div class="ss-ed-field"><label class="ss-ed-lbl stam-label">업무영역</label><input id="ed-biz-area" class="ss-ed-inp stam-input" value="' + d.bizArea + '" placeholder="예: 산출물 관리"></div>' +
          '<div class="ss-ed-field"><label class="ss-ed-lbl stam-label">화면유형 <span class="ss-req">*</span></label>' +
            '<select id="ed-screen-type" class="ss-ed-inp">' +
              '<option value="list"' + (d.screenType === 'list' ? ' selected' : '') + '>목록 화면</option>' +
              '<option value="detail"' + (d.screenType === 'detail' ? ' selected' : '') + '>상세 화면</option>' +
              '<option value="form"' + (d.screenType === 'form' ? ' selected' : '') + '>폼 화면</option>' +
              '<option value="popup"' + (d.screenType === 'popup' ? ' selected' : '') + '>팝업</option>' +
              '<option value="admin"' + (d.screenType === 'admin' ? ' selected' : '') + '>관리 화면</option>' +
              '<option value="main"' + (d.screenType === 'main' ? ' selected' : '') + '>메인/대시보드</option>' +
            '</select>' +
          '</div>' +
          '<div class="ss-ed-field ss-ed-field-full"><label class="ss-ed-lbl stam-label">메뉴 경로 <span class="ss-req">*</span></label><input id="ed-menu-path" class="ss-ed-inp stam-input" value="' + d.menuPath + '" placeholder="예: 산출물 관리 > 화면설계서"></div>' +
          '<div class="ss-ed-field ss-ed-field-full"><label class="ss-ed-lbl stam-label">화면 목적</label><textarea id="ed-purpose" class="ss-ed-inp ss-ed-ta stam-textarea" rows="3" placeholder="이 화면의 목적을 간략히 기술합니다.">' + d.purpose + '</textarea></div>' +
          '<div class="ss-ed-field ss-ed-field-full"><label class="ss-ed-lbl stam-label">작성 메모</label><textarea id="ed-memo" class="ss-ed-inp ss-ed-ta stam-textarea" rows="2" placeholder="기획·디자인 메모를 남깁니다.">' + d.memo + '</textarea></div>' +
        '</div>' +
      '</section>' +
      '<section class="ss-ed-section" id="sec-structure">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">화면 구조</h3><span class="ss-ed-sec-note">켜면 해당 builder가 활성화됩니다</span></div>' +
        '<div class="ss-ed-form-grid" style="margin-bottom:14px">' +
          '<div class="ss-ed-field"><label class="ss-ed-lbl stam-label">화면 제목</label><input id="ed-screen-title" class="ss-ed-inp stam-input" value="' + d.screenTitle + '" placeholder="화면 상단 표시 제목"></div>' +
          '<div class="ss-ed-field"><label class="ss-ed-lbl stam-label">상단 안내문구</label><input id="ed-top-note" class="ss-ed-inp stam-input" value="' + d.topNote + '" placeholder="선택 입력"></div>' +
        '</div>' +
        '<div class="ss-ed-toggle-grid">' +
          edToggleRow('useSearch', d.useSearch, '검색영역 사용', '검색 조건 입력 패널') +
          edToggleRow('useTable', d.useTable, '결과테이블 사용', '컬럼 헤더와 데이터 행') +
          edToggleRow('useStatusChip', d.useStatusChip, '상태 chip 사용', '작성/검토/승인 상태 표시') +
          edToggleRow('useRowAction', d.useRowAction, '행 액션 사용', '행별 버튼: 상세/수정/삭제') +
          edToggleRow('useEmpty', d.useEmpty, '빈 결과 상태 사용', '데이터 없을 때 안내 영역') +
        '</div>' +
      '</section>' +
      '<section class="ss-ed-section" id="sec-search">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">검색 조건</h3><span class="ss-ed-sec-note">검색영역 OFF 시 미사용</span></div>' +
        '<div id="ed-search-builder">' + buildSearchBuilder() + '</div>' +
      '</section>' +
      '<section class="ss-ed-section" id="sec-columns">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">테이블 컬럼</h3><span class="ss-ed-sec-note">결과테이블 OFF 시 미사용</span></div>' +
        '<div id="ed-col-builder">' + buildColBuilder() + '</div>' +
      '</section>' +
      '<section class="ss-ed-section" id="sec-actions">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">행 액션</h3><span class="ss-ed-sec-note">행 액션 OFF 시 미사용</span></div>' +
        '<div id="ed-action-builder">' + buildActionBuilder() + '</div>' +
      '</section>' +
      '<section class="ss-ed-section" id="sec-desc">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">Description 요약</h3><span class="ss-ed-sec-note">현재 draft 기준 자동 생성</span></div>' +
        '<div id="ed-desc-summary">' + buildDescTable(d) + '</div>' +
      '</section>' +
      '<section class="ss-ed-section" id="sec-attach">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">첨부파일 참고자료</h3></div>' +
        '<div class="ss-ed-attach-zone" title="준비중">첨부파일 영역 (준비중)</div>' +
        '<p class="ss-ed-attach-note">실제 파일 업로드는 추후 지원 예정입니다.</p>' +
      '</section>' +
      '<section class="ss-ed-section" id="sec-related">' +
        '<div class="ss-ed-sec-hdr"><h3 class="ss-ed-sec-title">연관 정보</h3><span class="ss-ed-sec-note">연결 추가는 추후 지원 예정</span></div>' +
        '<div class="ss-ed-related-grid">' +
          '<div class="ss-ed-related-item"><div class="ss-ed-related-lbl">연관 요구사항</div><div class="ss-ed-related-ph">연결 추가 (준비중)</div></div>' +
          '<div class="ss-ed-related-item"><div class="ss-ed-related-lbl">연관 WBS</div><div class="ss-ed-related-ph">연결 추가 (준비중)</div></div>' +
          '<div class="ss-ed-related-item"><div class="ss-ed-related-lbl">메뉴/IA 위치</div><div class="ss-ed-related-ph">IA 매핑 (준비중)</div></div>' +
          '<div class="ss-ed-related-item"><div class="ss-ed-related-lbl">연결 화면</div><div class="ss-ed-related-ph">화면 Flow 연결 (준비중)</div></div>' +
        '</div>' +
      '</section>';
  }

  /* ── Editor Workbench Helpers (P12/P13/P14) ── */
  var WB_COMP_CATS = [
    {
      id: 'layout', name: '레이아웃',
      items: [
        { id: 'container',   name: '컨테이너',  blockName: '컨테이너 영역' },
        { id: 'grid',        name: '그리드',     blockName: '그리드 레이아웃' },
        { id: 'flex-row',    name: '플렉스 행',  blockName: '가로 정렬 영역' },
        { id: 'stack',       name: '스택',       blockName: '세로 정렬 영역' },
        { id: 'divider',     name: '디바이더',   blockName: '구분선' },
        { id: 'scroll-area', name: '스크롤 영역', blockName: '스크롤 콘텐츠 영역' }
      ]
    },
    {
      id: 'text', name: '텍스트',
      items: [
        { id: 'title',     name: '제목',       blockName: '화면 제목' },
        { id: 'body',      name: '본문',       blockName: '본문 텍스트' },
        { id: 'label',     name: '라벨',       blockName: '필드 라벨' },
        { id: 'help',      name: '도움말',     blockName: '도움말 문구' },
        { id: 'link-text', name: '링크 텍스트', blockName: '텍스트 링크' }
      ]
    },
    {
      id: 'content', name: '콘텐츠',
      items: [
        { id: 'image',     name: '이미지',  blockName: '이미지 영역' },
        { id: 'video',     name: '비디오',  blockName: '비디오 영역' },
        { id: 'card',      name: '카드',    blockName: '카드 영역' },
        { id: 'banner',    name: '배너',    blockName: '배너 영역' },
        { id: 'icon',      name: '아이콘',  blockName: '아이콘 표시' },
        { id: 'thumbnail', name: '썸네일', blockName: '썸네일 목록' }
      ]
    },
    {
      id: 'input', name: '입력',
      items: [
        { id: 'text-input',   name: '텍스트 입력', blockName: '텍스트 입력 필드' },
        { id: 'select',       name: '셀렉트',      blockName: '선택 입력' },
        { id: 'checkbox',     name: '체크박스',    blockName: '체크박스 그룹' },
        { id: 'radio',        name: '라디오',      blockName: '라디오 그룹' },
        { id: 'toggle',       name: '토글',        blockName: '토글 스위치' },
        { id: 'date',         name: '날짜 선택',   blockName: '날짜 선택 필드' },
        { id: 'file-upload',  name: '파일 업로드', blockName: '파일 업로드 영역' }
      ]
    },
    {
      id: 'data', name: '데이터',
      items: [
        { id: 'table',      name: '데이터 테이블', blockName: '결과 테이블' },
        { id: 'list',       name: '리스트',        blockName: '목록 리스트' },
        { id: 'pagination', name: '페이지네이션',  blockName: '페이지네이션' },
        { id: 'filter',     name: '필터',          blockName: '필터 영역' },
        { id: 'search',     name: '검색',          blockName: '검색 조건' }
      ]
    },
    {
      id: 'state', name: '상태',
      items: [
        { id: 'status-chip', name: '상태 chip', blockName: '상태 표시' },
        { id: 'badge',       name: '배지',      blockName: '배지 표시' },
        { id: 'progress',    name: '진행 상태', blockName: '진행 상태 표시' },
        { id: 'alert',       name: '알림',      blockName: '알림 메시지' },
        { id: 'empty',       name: '빈 상태',   blockName: '빈 결과 안내' }
      ]
    },
    {
      id: 'common', name: '공통 참조',
      items: [
        { id: 'gnb',    name: 'GNB',    blockName: '공통 GNB' },
        { id: 'footer', name: 'Footer', blockName: '공통 Footer' },
        { id: 'modal',  name: 'Modal',  blockName: '확인 모달' },
        { id: 'toast',  name: 'Toast',  blockName: '토스트 알림' }
      ]
    }
  ];

  var _wfDragIdx = null;

  function buildCompLib() {
    return WB_COMP_CATS.map(function(cat, ci) {
      return '<div class="comp-cat' + (ci < 2 ? ' open' : '') + '" data-cat-id="' + cat.id + '">' +
        '<div class="cc-hdr">' + cat.name +
          '<svg class="cc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>' +
        '</div>' +
        '<div class="cc-items">' +
          cat.items.map(function(item) {
            return '<div class="comp-item" data-comp-cat="' + cat.id + '" data-comp-id="' + item.id + '" data-comp-name="' + item.blockName + '" title="클릭하여 블록 추가">' +
              '<span class="ci-dot"></span>' +
              '<span class="ci-name">' + item.name + '</span>' +
              '<span class="ci-add">+</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function buildWfBlocks(blocks, selIdx) {
    if (!blocks || !blocks.length) {
      return '<div class="wf-drop-placeholder">블록을 추가하거나 라이브러리에서 드래그하세요.</div>';
    }
    return blocks.map(function(b, i) {
      var num = i < 9 ? '0' + (i + 1) : '' + (i + 1);
      var isSel = (selIdx === i);
      var eyeIc = b.visible === false
        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      return '<div class="wf-block' + (isSel ? ' sel' : '') + (b.visible === false ? ' hidden' : '') + '" draggable="true" data-wf-idx="' + i + '">' +
        '<div class="wf-handle" aria-label="드래그하여 순서 변경" title="드래그하여 순서 변경">' +
          '<svg class="wf-grip" viewBox="0 0 8 14" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>' +
          '<span class="wf-hnum">' + num + '</span>' +
        '</div>' +
        '<div class="wf-body">' +
          '<div class="wf-bname">' + (b.name || '블록명') + '</div>' +
          '<div class="wf-bdesc">' + (b.desc || '화면 구성 요소') + '</div>' +
        '</div>' +
        '<div class="wf-acts">' +
          '<button type="button" class="wf-act" data-wf-act="toggle" data-wf-idx="' + i + '" title="표시/숨기기">' + svgIc(eyeIc, 13) + '</button>' +
          '<button type="button" class="wf-act" data-wf-act="up" data-wf-idx="' + i + '" title="위로">' + svgIc('<polyline points="18 15 12 9 6 15"/>', 13) + '</button>' +
          '<button type="button" class="wf-act" data-wf-act="down" data-wf-idx="' + i + '" title="아래로">' + svgIc('<polyline points="6 9 12 15 18 9"/>', 13) + '</button>' +
          '<button type="button" class="wf-act del" data-wf-act="del" data-wf-idx="' + i + '" title="삭제">' + svgIc('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', 13) + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function buildInspEmpty() {
    return '<div class="insp-empty">' +
      '<div class="insp-ico">' + svgIc('<rect x="3" y="3" width="18" height="18" rx="3"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="14" y2="12"/><line x1="8" y1="16" x2="11" y2="16"/>', 18) + '</div>' +
      '<div class="insp-em-msg">컴포넌트를 선택하세요</div>' +
      '<div class="insp-em-sub">블록을 클릭하면 속성, 표시/권한,<br>액션/연결 정보를 편집할 수 있습니다.</div>' +
    '</div>';
  }

  function buildInspContent(block, idx) {
    if (!block) return buildInspEmpty();
    var tab = SSP.editor.inspectorTab || 'props';
    var nm = (block.name || '').replace(/"/g, '&quot;');
    var dc = (block.desc || '').replace(/"/g, '&quot;');

    var panelHtml = '';
    if (tab === 'props') {
      panelHtml =
        '<div class="if"><div class="iflbl">컴포넌트명</div>' +
          '<input class="ifinp" data-insp-field="name" data-wf-idx="' + idx + '" value="' + nm + '"></div>' +
        '<div class="if"><div class="iflbl">설명</div>' +
          '<input class="ifinp" data-insp-field="desc" data-wf-idx="' + idx + '" value="' + dc + '"></div>' +
        '<div class="ifdiv"></div>' +
        '<div class="if"><div class="iflbl">중요도</div>' +
          '<div class="irg">' +
            '<label class="iri"><input type="radio" name="insp-imp-' + idx + '" value="h"' + (block.imp === 'h' ? ' checked' : '') + '><span class="imp-h">높음</span> 필수 핵심 영역</label>' +
            '<label class="iri"><input type="radio" name="insp-imp-' + idx + '" value="m"' + (block.imp !== 'h' && block.imp !== 'l' ? ' checked' : '') + '><span class="imp-m">중간</span> 권장 포함 영역</label>' +
            '<label class="iri"><input type="radio" name="insp-imp-' + idx + '" value="l"' + (block.imp === 'l' ? ' checked' : '') + '><span class="imp-l">낮음</span> 선택 또는 보조 영역</label>' +
          '</div>' +
        '</div>';
    } else if (tab === 'vis') {
      var disp = block.display || {};
      var condVal = disp.condition || '항상 표시';
      var rolesArr = (disp.roles && disp.roles.length) ? disp.roles : ['전체 사용자'];
      var editArr  = (disp.editableBy && disp.editableBy.length) ? disp.editableBy : ['작성자', 'PM'];
      panelHtml =
        '<div class="if"><div class="iflbl">표시 조건</div>' +
          '<input class="ifinp" value="' + condVal.replace(/"/g, '&quot;') + '" readonly></div>' +
        '<div class="if"><div class="iflbl">접근 역할</div>' +
          '<div class="if-chips">' + rolesArr.map(function(r) { return '<span class="if-chip">' + r + '</span>'; }).join('') + '</div></div>' +
        '<div class="if"><div class="iflbl">편집 가능 역할</div>' +
          '<div class="if-chips">' + editArr.map(function(r) { return '<span class="if-chip">' + r + '</span>'; }).join('') + '</div></div>' +
        '<div class="ifdiv"></div>' +
        '<div class="if"><div class="iflbl">상태별 노출</div>' +
          '<div class="if-seg">' +
            '<span class="if-seg-item on">초안</span>' +
            '<span class="if-seg-item on">검토중</span>' +
            '<span class="if-seg-item on">확정</span>' +
          '</div></div>';
    } else if (tab === 'action') {
      var act = block.action || {};
      panelHtml =
        '<div class="if"><div class="iflbl">주요 액션</div>' +
          '<input class="ifinp" value="' + (act.primary || '미정').replace(/"/g, '&quot;') + '" readonly></div>' +
        '<div class="if"><div class="iflbl">연결 화면</div>' +
          '<input class="ifinp" value="' + (act.link || '미연결').replace(/"/g, '&quot;') + '" readonly></div>' +
        '<div class="if"><div class="iflbl">이벤트</div>' +
          '<input class="ifinp" value="' + (act.event || '클릭').replace(/"/g, '&quot;') + '" readonly></div>' +
        '<div class="ifdiv"></div>' +
        '<div class="if"><div class="iflbl">후속 액션</div>' +
          '<div class="if-chips">' +
            '<span class="if-chip">수정</span>' +
            '<span class="if-chip">삭제</span>' +
            '<span class="if-chip">검토요청</span>' +
          '</div></div>';
    } else if (tab === 'data') {
      var dat = block.data || {};
      panelHtml =
        '<div class="if"><div class="iflbl">데이터 출처</div>' +
          '<input class="ifinp" value="' + (dat.source || '미정').replace(/"/g, '&quot;') + '" readonly></div>' +
        '<div class="if"><div class="iflbl">필수 여부</div>' +
          '<div class="if-seg">' +
            '<span class="if-seg-item' + (!dat.required ? ' on' : '') + '">선택</span>' +
            '<span class="if-seg-item' + (dat.required ? ' on' : '') + '">필수</span>' +
          '</div></div>' +
        '<div class="if"><div class="iflbl">검증 규칙</div>' +
          '<input class="ifinp" value="' + (dat.validation || '미입력').replace(/"/g, '&quot;') + '" readonly></div>' +
        '<div class="ifdiv"></div>' +
        '<div class="if"><div class="iflbl">빈 상태</div>' +
          '<input class="ifinp" value="' + (dat.emptyState || '표시 필요').replace(/"/g, '&quot;') + '" readonly></div>' +
        '<div class="if"><div class="iflbl">오류 상태</div>' +
          '<input class="ifinp" value="' + (dat.errorState || '표시 필요').replace(/"/g, '&quot;') + '" readonly></div>';
    }

    return '<div class="insp-content">' +
      '<div class="insp-tabs">' +
        '<button type="button" class="insp-tab' + (tab === 'props'  ? ' on' : '') + '" data-insp-tab="props">속성</button>' +
        '<button type="button" class="insp-tab' + (tab === 'vis'    ? ' on' : '') + '" data-insp-tab="vis">표시/권한</button>' +
        '<button type="button" class="insp-tab' + (tab === 'action' ? ' on' : '') + '" data-insp-tab="action">액션/연결</button>' +
        '<button type="button" class="insp-tab' + (tab === 'data'   ? ' on' : '') + '" data-insp-tab="data">데이터/검증</button>' +
      '</div>' +
      '<div class="insp-panel">' + panelHtml + '</div>' +
    '</div>';
  }

  /* ── Editor View (split orchestrator) ── */
  function renderEditorView() {
    var d = SSP.draft;
    if (!d) return;
    var headEl = document.getElementById('ss-editor-head');
    var splitEl = document.getElementById('ss-editor-split');
    var footEl = document.getElementById('ss-editor-foot');

    var ptpl = null;
    for (var pi = 0; pi < CREATE_PAGE_TEMPLATE_LIST.length; pi++) {
      if (CREATE_PAGE_TEMPLATE_LIST[pi].id === (SSP.pageTemplate || d.pageTemplate)) { ptpl = CREATE_PAGE_TEMPLATE_LIST[pi]; break; }
    }
    if (!ptpl) ptpl = CREATE_PAGE_TEMPLATE_LIST[0];

    if (!SSP.editor.wfBlocks || !SSP.editor.wfBlocks.length) {
      SSP.editor.wfBlocks = ptpl.sections.map(function(s) {
        return { name: s, desc: '화면 구성 요소', visible: true, imp: 'm' };
      });
    }
    if (SSP.editor.selBlock === undefined) SSP.editor.selBlock = null;
    if (!SSP.editor.inspectorTab) SSP.editor.inspectorTab = 'props';

    var groupLabel = (d.templateGroup === 'admin' || SSP.frontAdmin === 'admin') ? 'Admin' : 'Front';
    var svcName = d.serviceTypeName || '';

    if (headEl) {
      headEl.innerHTML =
        '<button type="button" class="ctx-back" data-ssv-action="list">' +
          svgIc('<polyline points="15 18 9 12 15 6"/>', 11) + ' 목록으로' +
        '</button>' +
        '<span class="ctx-sep"></span>' +
        '<span class="ctx-id">' + (d.screenId || '') + '</span>' +
        '<span class="ctx-name">' + (d.screenName || '제목 없음') + '</span>' +
        '<span class="ctx-chip">' + (svcName || '서비스') + '</span>' +
        '<span class="ctx-chip" style="background:rgba(100,116,139,.1);border-color:rgba(100,116,139,.2);color:var(--t3)">' + groupLabel + '</span>' +
        '<span class="ctx-flex"></span>' +
        '<button type="button" class="ctx-change" data-ssv-action="editor-change-template">템플릿 변경</button>';
    }

    if (splitEl) {
      var canvasSub = (svcName || '서비스') + ' · ' + groupLabel + ' · 블록 ' + SSP.editor.wfBlocks.length + '개';
      splitEl.innerHTML =
        '<aside class="comp-lib">' +
          '<div class="cl-hdr"><span class="cl-ttl">Component Library</span></div>' +
          '<div class="cl-body">' + buildCompLib() + '</div>' +
        '</aside>' +
        '<main class="wf-canvas">' +
          '<div class="wf-inner">' +
            '<div class="canvas-top">' +
              '<div class="canvas-info">' +
                '<div class="canvas-ttl">' + ptpl.name + ' — Wireframe</div>' +
                '<div class="canvas-sub">' + canvasSub + '</div>' +
              '</div>' +
              '<button type="button" class="canvas-prev-btn" data-ssv-action="preview">미리보기</button>' +
            '</div>' +
            buildWfBlocks(SSP.editor.wfBlocks, SSP.editor.selBlock) +
          '</div>' +
        '</main>' +
        '<aside class="inspector">' +
          '<div class="insp-hdr">' +
            '<div class="insp-ttl">Inspector</div>' +
            '<div class="insp-sub" id="insp-sub">컴포넌트를 선택하면 속성을 편집할 수 있습니다</div>' +
          '</div>' +
          '<div id="insp-body">' +
            (SSP.editor.selBlock !== null ? buildInspContent(SSP.editor.wfBlocks[SSP.editor.selBlock], SSP.editor.selBlock) : buildInspEmpty()) +
          '</div>' +
        '</aside>';
    }

    if (footEl) {
      footEl.innerHTML =
        '<button type="button" class="bsm" data-ssv-action="list">취소</button>' +
        '<div class="ed-si" id="ed-si-status"><span class="dot"></span><span>임시 작업 중</span></div>' +
        '<div class="ed-btm-flex"></div>' +
        '<button type="button" class="bsm ghost" data-ssv-action="preview">미리보기</button>' +
        '<button type="button" class="bsm" data-ssv-action="mem-draft">임시저장</button>' +
        '<button type="button" class="bsm" data-ssv-action="mem-save">저장</button>' +
        '<button type="button" class="bsm primary" data-ssv-action="mem-review">저장 후 검토요청</button>';
    }
  }

  function refreshEditorBuilders() {
    var sb = document.getElementById('ed-search-builder');
    var cb = document.getElementById('ed-col-builder');
    var ab = document.getElementById('ed-action-builder');
    var ds = document.getElementById('ed-desc-summary');
    if (sb) sb.innerHTML = buildSearchBuilder();
    if (cb) cb.innerHTML = buildColBuilder();
    if (ab) ab.innerHTML = buildActionBuilder();
    if (ds && SSP.draft) ds.innerHTML = buildDescTable(SSP.draft);
    markPreviewDirty();
  }

  /* ── Preview View ── */
  function buildPreviewItems(d) {
    var items = []; var n = 1;
    var sName = d.screenName || '(화면명 미입력)';
    items.push({ n: n++, name: '화면 제목', detail: d.screenTitle || sName, type: 'title' });
    if (d.topNote) items.push({ n: n++, name: '상단 안내문구', detail: d.topNote, type: 'note' });
    if (d.useSearch) {
      items.push({ n: n++, name: '검색 조건', detail: d.searchItems.map(function(i){return i.cond||'—';}).join(', '), type: 'search' });
      items.push({ n: n++, name: '조회 버튼', detail: '검색 실행 → 결과테이블 갱신', type: 'btn' });
    }
    if (d.useTable) items.push({ n: n++, name: '결과 테이블', detail: d.tableColumns.map(function(c){return c.name||'—';}).join(', '), type: 'table' });
    if (d.useStatusChip) items.push({ n: n++, name: '상태 chip', detail: '작성중 / 작성완료 / 검토대기 / 승인완료', type: 'chip' });
    if (d.useRowAction) items.push({ n: n++, name: '행 액션', detail: d.rowActions.map(function(a){return a.name||'—';}).join(', '), type: 'action' });
    if (d.useEmpty) items.push({ n: n++, name: '빈 결과 상태', detail: '조건에 맞는 결과가 없습니다.', type: 'empty' });
    return items;
  }

  function buildMockup(d, items) {
    var sName = d.screenName || '(화면명)';
    var html = '';
    items.forEach(function(item) {
      var m = '<span class="ss-pv-marker">' + item.n + '</span>';
      if (item.type === 'title') {
        html += '<div class="ss-pv-mock-sec ss-pv-title-bar">' + m + '<span class="ss-pv-title">' + (d.screenTitle || sName) + '</span></div>';
      } else if (item.type === 'note') {
        html += '<div class="ss-pv-mock-sec ss-pv-note-bar">' + m + ' ' + d.topNote + '</div>';
      } else if (item.type === 'search') {
        var srInps = d.searchItems.slice(0, 3).map(function(si) {
          return '<div class="ss-pv-search-inp">' + (si.cond || '검색') + '</div>';
        }).join('');
        html += '<div class="ss-pv-mock-sec"><div class="ss-pv-sec-lbl">' + m + ' 검색 조건</div><div class="ss-pv-search-row">' + srInps + '</div></div>';
      } else if (item.type === 'btn') {
        html += '<div class="ss-pv-mock-sec ss-pv-btn-row">' + m + '<span class="ss-pv-btn-p">조회</span><span class="ss-pv-btn-g">초기화</span></div>';
      } else if (item.type === 'table') {
        var cols = d.tableColumns.slice(0, 4);
        var thHtml = cols.map(function(c){return '<th>' + (c.name||'—') + '</th>';}).join('') +
          (d.useStatusChip ? '<th>상태</th>' : '') + (d.useRowAction && d.rowActions.length ? '<th>액션</th>' : '');
        var tdHtml = cols.map(function(){return '<td>샘플</td>';}).join('') +
          (d.useStatusChip ? '<td><span class="ss-pv-chip">완료</span></td>' : '') +
          (d.useRowAction && d.rowActions[0] ? '<td><span class="ss-pv-act-lnk">' + (d.rowActions[0].name||'보기') + '</span></td>' : '');
        html += '<div class="ss-pv-mock-sec"><div class="ss-pv-sec-lbl">' + m + ' 결과 테이블</div>' +
          '<table class="ss-pv-table"><thead><tr>' + thHtml + '</tr></thead><tbody>' +
          '<tr>' + tdHtml + '</tr><tr>' + tdHtml + '</tr>' +
          '</tbody></table></div>';
      } else if (item.type === 'chip') {
        /* rendered inline in table */
      } else if (item.type === 'action') {
        /* rendered inline in table */
      } else if (item.type === 'empty') {
        html += '<div class="ss-pv-empty">' + m + ' 조건에 맞는 결과가 없습니다.</div>';
      }
    });
    return html || '<div class="ss-pv-empty">입력된 구조가 없습니다. 편집기에서 화면 구조를 작성한 뒤 다시 확인하세요.</div>';
  }

  function renderPreviewView() {
    var d = SSP.draft;
    if (!d) return;
    var el = document.getElementById('ss-preview-view');
    if (!el) return;

    var visBlocks = (SSP.editor.wfBlocks && SSP.editor.wfBlocks.length)
      ? SSP.editor.wfBlocks.filter(function(b) { return b.visible !== false; })
      : [];
    var today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

    var mockBodyHtml = visBlocks.map(function(b, i) {
      var num = i < 9 ? '0' + (i + 1) : '' + (i + 1);
      return '<div class="pmf-blk" data-pv-idx="' + i + '">' +
        '<div class="pmf-badge">' + num + '</div>' +
        '<div class="pmf-blk-name">' + (b.name || '블록') + '</div>' +
        '<div class="pmf-blk-lines">' +
          '<div class="pmf-bline" style="width:' + (55 + (i % 3) * 10) + '%"></div>' +
          '<div class="pmf-bline" style="width:' + (35 + (i % 4) * 8) + '%"></div>' +
        '</div>' +
      '</div>';
    }).join('') || '<div style="padding:20px;text-align:center;font-size:12px;color:var(--t3)">화면 구성 블록이 없습니다.</div>';

    var descItemsHtml = visBlocks.map(function(b, i) {
      var num = i < 9 ? '0' + (i + 1) : '' + (i + 1);
      var hasDesc = b.desc && b.desc !== '화면 구성 요소';
      var disp = b.display || {};
      var act = b.action || {};
      var dat = b.data || {};
      return '<div class="desc-item" data-pv-idx="' + i + '">' +
        '<div class="desc-item-top">' +
          '<div class="desc-num">' + num + '</div>' +
          '<div class="desc-item-name">' + (b.name || '블록') + '</div>' +
          '<div class="desc-st ' + (hasDesc ? 'dst-ok' : 'dst-miss') + '">' + (hasDesc ? '완료' : '미작성') + '</div>' +
        '</div>' +
        '<div class="desc-fields">' +
          '<div class="desc-field"><span class="dflbl">설명</span><span class="' + (hasDesc ? 'dfval' : 'dfempty') + '">' + (b.desc || '미입력') + '</span></div>' +
          '<div class="desc-field"><span class="dflbl">중요도</span><span class="dfval">' + (b.imp === 'h' ? '높음' : b.imp === 'l' ? '낮음' : '중간') + '</span></div>' +
          '<div class="desc-field"><span class="dflbl">표시 조건</span><span class="' + (disp.condition ? 'dfval' : 'dfempty') + '">' + (disp.condition || '미입력') + '</span></div>' +
          '<div class="desc-field"><span class="dflbl">연결 화면</span><span class="' + (act.link && act.link !== '미연결' ? 'dfval' : 'dfempty') + '">' + (act.link || '미연결') + '</span></div>' +
          '<div class="desc-field"><span class="dflbl">데이터 출처</span><span class="' + (dat.source && dat.source !== '미정' ? 'dfval' : 'dfempty') + '">' + (dat.source || '미정') + '</span></div>' +
        '</div>' +
      '</div>';
    }).join('');

    var missCnt = visBlocks.filter(function(b) { return !b.desc || b.desc === '화면 구성 요소'; }).length;
    var missingHtml = missCnt > 0
      ? '<div class="prev-missing">' +
          svgIc('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 13) +
          '필수 미작성 항목 ' + missCnt + '개</div>'
      : '';

    el.innerHTML =
      '<div class="prev-hdr">' +
        '<span class="prev-hdr-id">' + (d.screenId || '') + '</span>' +
        '<span class="prev-hdr-name">' + (d.screenName || '제목 없음') + '</span>' +
        '<span class="prev-hdr-chip phc-draft">초안</span>' +
        '<span class="prev-hdr-meta">작성자: 나 · ' + today + '</span>' +
        '<div class="prev-hdr-sp"></div>' +
        '<button type="button" class="prev-hdr-close" data-ssv-action="editor">Editor로 돌아가기</button>' +
      '</div>' +
      '<div class="prev-body-wrap">' +
        '<div class="prev-mock-col" id="prev-mock-col">' +
          '<div class="pmf">' +
            '<div class="pmf-gnb">' +
              '<div class="pmf-logo"></div><div class="pmf-sp"></div>' +
              '<div class="pmf-nav"><div class="pmf-ni"></div><div class="pmf-ni"></div><div class="pmf-ni"></div></div>' +
            '</div>' +
            '<div class="pmf-body" id="prev-mock-body">' + mockBodyHtml + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="prev-desc-col" id="prev-desc-col">' +
          '<div class="prev-desc-hdr">' +
            '<span class="prev-desc-hdr-lbl">Description</span>' +
            '<div class="prev-legend">' +
              '<span class="ldot ldot-ok"></span><span class="ldot-lbl">완료</span>' +
              '<span class="ldot ldot-miss" style="margin-left:5px"></span><span class="ldot-lbl">미작성</span>' +
            '</div>' +
          '</div>' +
          '<div id="prev-desc-body" style="flex:1;overflow-y:auto;scrollbar-width:thin">' + descItemsHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="prev-ftr">' +
        missingHtml +
        '<div class="prev-ftr-sp"></div>' +
        '<button type="button" class="pbtn" data-ssv-action="editor">닫기</button>' +
        '<button type="button" class="pbtn ghost" data-ssv-action="mem-save">저장</button>' +
        '<button type="button" class="pbtn primary" data-ssv-action="mem-review">저장 후 검토요청</button>' +
      '</div>';
  }

  /* ── Save flow ── */
  function execSave() {
    readDraftFromForm();
    var d = SSP.draft;
    if (!d) return null;
    var nameEl = document.getElementById('ed-screen-name');
    var name = nameEl ? nameEl.value.trim() : d.screenName.trim();
    if (!name) {
      if (nameEl) {
        nameEl.focus();
        nameEl.style.outline = '2px solid #DC2626';
        setTimeout(function() { nameEl.style.outline = ''; }, 2000);
      }
      alert('화면명을 입력하세요.');
      return null;
    }
    var newId = d.screenId;
    SS_SEQ++;
    var saved = {
      id: newId, name: name, ver: 'v0.1',
      wst: 'writing', rst: 'none', ast: 'none',
      type: d.screenType || 'list',
      menu: d.menuPath || '미지정',
      owner: '나', av: '나', ac: '#5451E8',
      upd: '2026-06-14', hasImg: false, annots: 0,
      purp: d.purpose || '',
      acts: (d.rowActions || []).map(function(a) { return { n: a.name||'액션', loc: '행 액션', act: a.condition||'항상' }; }),
      links: { req: [], art: [], work: [], ifc: [], fn: [] },
      hist: [{ k: 'create', who: '나', at: '06-14', t: '최초 등록', n: 'v0.1' }],
      template: d.template, templateName: d.templateName, templateGroup: d.templateGroup || 'front',
      templateKind: d.templateKind || 'page', serviceType: d.serviceType || 'branding', serviceTypeName: d.serviceTypeName || '',
      _draft: d
    };
    SSP.savedItems.push(saved);
    for (var i = 0; i < MENUS.length; i++) {
      if (MENUS[i].id === 'G-03') { MENUS[i].screens.push(saved); break; }
    }
    ALL_SCREENS.push(saved);
    SSP.draft = null;
    return saved;
  }

  /* ── View event handler ── */
  function initViewEvents() {
    /* Global delegation: data-ssv-action = list | template | editor | preview | save | save-detail */
    document.addEventListener('click', function(e) {
      /* Service type card selection (create view step 1) */
      var svcCard = e.target.closest('[data-ss-svc]');
      if (svcCard && SSP.view.mode === 'template') {
        SSP.serviceType = svcCard.getAttribute('data-ss-svc');
        document.querySelectorAll('[data-ss-svc]').forEach(function(c) { c.classList.remove('is-active'); });
        svcCard.classList.add('is-active');
        return;
      }

      /* Front/Admin card selection (create view step 2) */
      var faCard = e.target.closest('[data-ss-fa]');
      if (faCard && SSP.view.mode === 'template') {
        SSP.frontAdmin = faCard.getAttribute('data-ss-fa');
        document.querySelectorAll('[data-ss-fa]').forEach(function(c) { c.classList.remove('is-active'); });
        faCard.classList.add('is-active');
        return;
      }

      /* Page Template card selection (create view step 3) */
      var ptplCard = e.target.closest('[data-ss-ptpl]');
      if (ptplCard && SSP.view.mode === 'template') {
        SSP.pageTemplate = ptplCard.getAttribute('data-ss-ptpl');
        document.querySelectorAll('[data-ss-ptpl]').forEach(function(c) { c.classList.remove('is-active'); });
        ptplCard.classList.add('is-active');
        return;
      }

      /* Component Library item click → insert block */
      var compItem = e.target.closest('.comp-item[data-comp-id]');
      if (compItem && SSP.view.mode === 'editor') {
        var newBlock = {
          id: 'block-' + Date.now(),
          type: compItem.getAttribute('data-comp-id'),
          category: compItem.getAttribute('data-comp-cat'),
          name: compItem.getAttribute('data-comp-name') || compItem.getAttribute('data-comp-id'),
          desc: '화면 구성 요소',
          visible: true,
          imp: 'm',
          display: { condition: '항상 표시', roles: ['전체 사용자'], editableBy: ['작성자', 'PM'] },
          action: { primary: '미정', link: '미연결', event: '클릭' },
          data: { source: '미정', required: false, validation: '미입력', emptyState: '표시 필요', errorState: '표시 필요' },
          status: 'draft'
        };
        SSP.editor.wfBlocks.push(newBlock);
        SSP.editor.selBlock = SSP.editor.wfBlocks.length - 1;
        SSP.editor.inspectorTab = 'props';
        renderEditorView();
        return;
      }

      /* Component Library category toggle */
      var ccHdr = e.target.closest('.cc-hdr');
      if (ccHdr && SSP.view.mode === 'editor') {
        var catEl = ccHdr.closest('.comp-cat');
        if (catEl) catEl.classList.toggle('open');
        return;
      }

      /* Wireframe block action buttons (toggle/up/down/del) */
      var wfActBtn = e.target.closest('[data-wf-act]');
      if (wfActBtn && SSP.view.mode === 'editor') {
        e.stopPropagation();
        var actType = wfActBtn.getAttribute('data-wf-act');
        var wfIdx = parseInt(wfActBtn.getAttribute('data-wf-idx'), 10);
        var blks = SSP.editor.wfBlocks;
        if (actType === 'toggle') {
          blks[wfIdx].visible = (blks[wfIdx].visible !== false) ? false : true;
        } else if (actType === 'up' && wfIdx > 0) {
          var tmp = blks[wfIdx]; blks[wfIdx] = blks[wfIdx - 1]; blks[wfIdx - 1] = tmp;
          if (SSP.editor.selBlock === wfIdx) SSP.editor.selBlock = wfIdx - 1;
          else if (SSP.editor.selBlock === wfIdx - 1) SSP.editor.selBlock = wfIdx;
        } else if (actType === 'down' && wfIdx < blks.length - 1) {
          var tmp2 = blks[wfIdx]; blks[wfIdx] = blks[wfIdx + 1]; blks[wfIdx + 1] = tmp2;
          if (SSP.editor.selBlock === wfIdx) SSP.editor.selBlock = wfIdx + 1;
          else if (SSP.editor.selBlock === wfIdx + 1) SSP.editor.selBlock = wfIdx;
        } else if (actType === 'del') {
          blks.splice(wfIdx, 1);
          if (SSP.editor.selBlock === wfIdx) SSP.editor.selBlock = null;
          else if (SSP.editor.selBlock > wfIdx) SSP.editor.selBlock--;
        }
        renderEditorView();
        return;
      }

      /* Inspector tab switching (no full re-render needed) */
      var inspTabBtn = e.target.closest('.insp-tab[data-insp-tab]');
      if (inspTabBtn && SSP.view.mode === 'editor') {
        SSP.editor.inspectorTab = inspTabBtn.getAttribute('data-insp-tab');
        var inspBodyEl = document.getElementById('insp-body');
        if (inspBodyEl && SSP.editor.selBlock !== null) {
          inspBodyEl.innerHTML = buildInspContent(SSP.editor.wfBlocks[SSP.editor.selBlock], SSP.editor.selBlock);
        }
        return;
      }

      /* Wireframe block selection → update inspector */
      var wfBlock = e.target.closest('[data-wf-idx]');
      if (wfBlock && SSP.view.mode === 'editor' && !e.target.closest('[data-wf-act]')) {
        var wbIdx = parseInt(wfBlock.getAttribute('data-wf-idx'), 10);
        SSP.editor.selBlock = (SSP.editor.selBlock === wbIdx) ? null : wbIdx;
        document.querySelectorAll('.wf-block').forEach(function(bl, i) {
          bl.classList.toggle('sel', i === SSP.editor.selBlock);
        });
        var inspBody = document.getElementById('insp-body');
        if (inspBody) {
          inspBody.innerHTML = SSP.editor.selBlock !== null
            ? buildInspContent(SSP.editor.wfBlocks[SSP.editor.selBlock], SSP.editor.selBlock)
            : buildInspEmpty();
        }
        return;
      }

      /* Preview mockup block highlight */
      var pvBlk = e.target.closest('.pmf-blk');
      if (pvBlk && SSP.view.mode === 'preview') {
        var pvIdx = parseInt(pvBlk.getAttribute('data-pv-idx'), 10);
        var wasLit = pvBlk.classList.contains('lit');
        document.querySelectorAll('.pmf-blk').forEach(function(b) { b.classList.remove('lit'); });
        document.querySelectorAll('.desc-item').forEach(function(di) { di.classList.remove('lit'); });
        if (!wasLit) {
          pvBlk.classList.add('lit');
          var destItem = document.querySelector('.desc-item[data-pv-idx="' + pvIdx + '"]');
          if (destItem) {
            destItem.classList.add('lit');
            var dc2 = document.getElementById('prev-desc-body');
            if (dc2) dc2.scrollTop = Math.max(0, destItem.offsetTop - 40);
          }
        }
        return;
      }

      /* Preview description item highlight */
      var pvDescItem = e.target.closest('.desc-item[data-pv-idx]');
      if (pvDescItem && SSP.view.mode === 'preview') {
        var pvdIdx = parseInt(pvDescItem.getAttribute('data-pv-idx'), 10);
        var wasDescLit = pvDescItem.classList.contains('lit');
        document.querySelectorAll('.pmf-blk').forEach(function(b) { b.classList.remove('lit'); });
        document.querySelectorAll('.desc-item').forEach(function(di) { di.classList.remove('lit'); });
        if (!wasDescLit) {
          pvDescItem.classList.add('lit');
          var mockBlk = document.querySelector('.pmf-blk[data-pv-idx="' + pvdIdx + '"]');
          if (mockBlk) {
            mockBlk.classList.add('lit');
            var mc = document.getElementById('prev-mock-col');
            if (mc) mc.scrollTop = Math.max(0, mockBlk.offsetTop - mc.offsetTop - 40);
          }
        }
        return;
      }

      /* ssv-action routing */
      var actionBtn = e.target.closest('[data-ssv-action]');
      if (!actionBtn) return;
      var act = actionBtn.getAttribute('data-ssv-action');

      if (act === 'list') {
        SSP.draft = null;
        switchView('list');
        renderStrip();
        renderTable();

      } else if (act === 'template') {
        switchView('template');
        renderTemplateView();

      } else if (act === 'editor') {
        switchView('editor');
        renderEditorView();

      } else if (act === 'apply-preview') {
        applyPreviewModel();

      } else if (act === 'preview') {
        if (SSP.editor.previewDirty) { applyPreviewModel(); }
        switchView('preview');
        renderPreviewView();
        var poMain = document.getElementById('po-main');
        if (poMain) poMain.scrollTop = 0;

      } else if (act === 'mem-draft') {
        var mRec = execMemorySave('draft');
        if (!mRec) return;
        renderTable();
        var siEl = document.getElementById('ed-si-status');
        if (siEl) siEl.innerHTML = '<span class="dot dot-ok"></span><span>임시저장됨</span>';

      } else if (act === 'mem-save') {
        var mRec2 = execMemorySave('saved');
        if (!mRec2) return;
        switchView('list');
        renderStrip();
        renderTable();

      } else if (act === 'mem-review') {
        var mRec3 = execMemorySave('review');
        if (!mRec3) return;
        switchView('list');
        renderStrip();
        renderTable();

      } else if (act === 'record-detail') {
        var rdId = actionBtn.getAttribute('data-record-id');
        var rdRec = rdId ? findRecordById(rdId) : null;
        if (!rdRec) return;
        hydrateDraftFromRecord(rdRec);
        switchView('preview');
        renderPreviewView();
        var poMainPv = document.getElementById('po-main');
        if (poMainPv) poMainPv.scrollTop = 0;

      } else if (act === 'record-edit') {
        var reId = actionBtn.getAttribute('data-record-id');
        var reRec = reId ? findRecordById(reId) : null;
        if (!reRec) return;
        hydrateDraftFromRecord(reRec);
        switchView('editor');
        renderEditorView();

      } else if (act === 'save' || act === 'save-detail') {
        var saved = execSave();
        if (!saved) return;
        switchView('list');
        renderStrip();
        renderTable();
        if (act === 'save-detail') {
          setTimeout(function() { openDetail(saved.id); }, 80);
        }

      } else if (act === 'back-to-template') {
        switchView('template');
        renderTemplateView();

      } else if (act === 'create-next') {
        var curStep = SSP.createStep || 1;
        if (curStep === 1) {
          renderCreateStep2();
        } else if (curStep === 2) {
          renderCreateStep3();
        } else if (curStep === 3) {
          renderCreateStep4();
        } else if (curStep === 4) {
          var nameEl = document.getElementById('ss-s4-screen-name');
          if (nameEl && !nameEl.value.trim()) {
            nameEl.focus();
            nameEl.style.outline = '2px solid #ef4444';
            setTimeout(function() { nameEl.style.outline = ''; }, 2000);
            return;
          }
          var ptpl4 = (function() {
            for (var i = 0; i < CREATE_PAGE_TEMPLATE_LIST.length; i++) {
              if (CREATE_PAGE_TEMPLATE_LIST[i].id === SSP.pageTemplate) return CREATE_PAGE_TEMPLATE_LIST[i];
            }
            return CREATE_PAGE_TEMPLATE_LIST[0];
          }());
          var tplObj = {
            id: 'ptpl-' + ptpl4.id,
            name: ptpl4.name,
            screenType: ptpl4.id === 'list-search' ? 'list' : ptpl4.id === 'reg-form' ? 'form' : 'main',
            defaultStructure: ptpl4.structure,
            items: ptpl4.sections
          };
          createDraftFromTemplate(tplObj, SSP.frontAdmin || 'front', SSP.serviceType || 'branding');
          if (SSP.draft) {
            var snEl4 = document.getElementById('ss-s4-screen-name');
            var sidEl4 = document.getElementById('ss-s4-screen-id');
            var baEl4 = document.getElementById('ss-s4-biz-area');
            var mEl4 = document.getElementById('ss-s4-memo');
            var stEl4 = document.querySelector('[name="ss-s4-status"]:checked');
            if (snEl4) SSP.draft.screenName = snEl4.value.trim();
            if (sidEl4 && sidEl4.value.trim()) SSP.draft.screenId = sidEl4.value.trim();
            if (baEl4) SSP.draft.bizArea = baEl4.value.trim();
            if (mEl4) SSP.draft.memo = mEl4.value.trim();
            if (stEl4) SSP.draft.wst = stEl4.value;
          }
          switchView('editor');
          renderEditorView();
        }

      } else if (act === 'create-prev') {
        var curStep = SSP.createStep || 1;
        if (curStep <= 1) {
          SSP.draft = null;
          switchView('list');
          renderStrip();
          renderTable();
        } else if (curStep === 2) {
          renderTemplateView();
        } else if (curStep === 3) {
          renderCreateStep2();
        } else if (curStep === 4) {
          renderCreateStep3();
        }

      } else if (act === 'editor-change-template') {
        SSP.editor.wfBlocks = [];
        SSP.editor.selBlock = null;
        SSP.createStep = 3;
        switchView('template');
        renderCreateStep3();
      }
    });

    /* Toggle change → refresh builders + inspector importance sync */
    document.addEventListener('change', function(e) {
      if (SSP.view.mode !== 'editor' || !SSP.draft) return;
      var toggle = e.target.closest('[data-ed-toggle]');
      if (toggle) {
        readDraftFromForm();
        var key = toggle.getAttribute('data-ed-toggle');
        SSP.draft[key] = toggle.checked;
        refreshEditorBuilders();
        return;
      }
      var inp = e.target.closest('.ss-ed-inp');
      if (inp) { markPreviewDirty(); }
      var impRadio = e.target.closest('input[type="radio"][name^="insp-imp-"]');
      if (impRadio && SSP.editor.wfBlocks) {
        var impIdx = parseInt(impRadio.getAttribute('name').replace('insp-imp-', ''), 10);
        if (SSP.editor.wfBlocks[impIdx]) SSP.editor.wfBlocks[impIdx].imp = impRadio.value;
      }
    });

    /* Input events → mark preview dirty + inspector field sync */
    document.addEventListener('input', function(e) {
      if (SSP.view.mode !== 'editor' || !SSP.draft) return;
      if (e.target.closest('.ss-ed-inp')) { markPreviewDirty(); }
      var inspInp = e.target.closest('[data-insp-field]');
      if (inspInp && SSP.editor.wfBlocks) {
        var iIdx = parseInt(inspInp.getAttribute('data-wf-idx'), 10);
        var iField = inspInp.getAttribute('data-insp-field');
        if (SSP.editor.wfBlocks[iIdx]) {
          SSP.editor.wfBlocks[iIdx][iField] = inspInp.value;
          var canvasSel = '.wf-block[data-wf-idx="' + iIdx + '"] .wf-b' + (iField === 'name' ? 'name' : 'desc');
          var canvasEl = document.querySelector(canvasSel);
          if (canvasEl) canvasEl.textContent = inspInp.value;
        }
      }
    });

    /* Builder add/delete */
    document.addEventListener('click', function(e) {
      if (SSP.view.mode !== 'editor' || !SSP.draft) return;

      var addBtn = e.target.closest('[data-ed-add]');
      if (addBtn) {
        readDraftFromForm();
        var t = addBtn.getAttribute('data-ed-add');
        if (t === 'search') SSP.draft.searchItems.push({ cond: '', inputType: 'text', required: false, defaultVal: '', order: SSP.draft.searchItems.length + 1 });
        else if (t === 'col') SSP.draft.tableColumns.push({ name: '', key: '', visible: true, sortable: false, width: '120px' });
        else if (t === 'action') SSP.draft.rowActions.push({ name: '', style: 'ghost', link: '', permission: '전체', condition: '항상' });
        refreshEditorBuilders();
        return;
      }

      var sbDel = e.target.closest('[data-ed-sb-del]');
      if (sbDel) {
        readDraftFromForm();
        SSP.draft.searchItems.splice(parseInt(sbDel.getAttribute('data-ed-sb-del'), 10), 1);
        refreshEditorBuilders(); return;
      }
      var cbDel = e.target.closest('[data-ed-cb-del]');
      if (cbDel) {
        readDraftFromForm();
        SSP.draft.tableColumns.splice(parseInt(cbDel.getAttribute('data-ed-cb-del'), 10), 1);
        refreshEditorBuilders(); return;
      }
      var abDel = e.target.closest('[data-ed-ab-del]');
      if (abDel) {
        readDraftFromForm();
        SSP.draft.rowActions.splice(parseInt(abDel.getAttribute('data-ed-ab-del'), 10), 1);
        refreshEditorBuilders(); return;
      }
    }, true);

    /* Section nav smooth scroll */
    document.addEventListener('click', function(e) {
      var navLink = e.target.closest('[data-ssv-nav]');
      if (navLink && SSP.view.mode === 'editor') {
        e.preventDefault();
        var targetId = navLink.getAttribute('data-ssv-nav');
        var targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.querySelectorAll('.ss-ed-nav-link').forEach(function(l) { l.classList.remove('active'); });
          navLink.classList.add('active');
        }
      }
    });

    /* Wireframe block drag-and-drop (P13) */
    document.addEventListener('dragstart', function(e) {
      var blk = e.target.closest('.wf-block[data-wf-idx]');
      if (!blk || SSP.view.mode !== 'editor') return;
      _wfDragIdx = parseInt(blk.getAttribute('data-wf-idx'), 10);
      blk.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    document.addEventListener('dragover', function(e) {
      var blk = e.target.closest('.wf-block[data-wf-idx]');
      if (!blk || SSP.view.mode !== 'editor' || _wfDragIdx === null) return;
      e.preventDefault();
      document.querySelectorAll('.wf-block').forEach(function(b) { b.classList.remove('is-drop-target'); });
      blk.classList.add('is-drop-target');
    });

    document.addEventListener('drop', function(e) {
      var blk = e.target.closest('.wf-block[data-wf-idx]');
      if (!blk || SSP.view.mode !== 'editor' || _wfDragIdx === null) return;
      e.preventDefault();
      var toIdx = parseInt(blk.getAttribute('data-wf-idx'), 10);
      if (toIdx !== _wfDragIdx) {
        var moved = SSP.editor.wfBlocks.splice(_wfDragIdx, 1)[0];
        SSP.editor.wfBlocks.splice(toIdx, 0, moved);
        if (SSP.editor.selBlock === _wfDragIdx) SSP.editor.selBlock = toIdx;
        else if (SSP.editor.selBlock > _wfDragIdx && SSP.editor.selBlock <= toIdx) SSP.editor.selBlock--;
        else if (SSP.editor.selBlock < _wfDragIdx && SSP.editor.selBlock >= toIdx) SSP.editor.selBlock++;
        renderEditorView();
      }
      _wfDragIdx = null;
    });

    document.addEventListener('dragend', function(e) {
      _wfDragIdx = null;
      document.querySelectorAll('.wf-block').forEach(function(b) {
        b.classList.remove('is-dragging', 'is-drop-target');
      });
    });
  }

  /* ── Event wiring ── */
  function initNav() {
    if (window.STAM && window.STAM.navRender) {
      window.STAM.navRender.init('B4');
    }
  }

  function initStrip() {
    var strip = document.getElementById('ss-sstrip');
    if (!strip) return;
    strip.addEventListener('click', function (e) {
      var cell = e.target.closest('[data-ss-q]');
      if (!cell) return;
      setQ(cell.getAttribute('data-ss-q'));
    });
  }

  function initSearch() {
    var srch = document.getElementById('ss-srch');
    if (!srch) return;
    srch.addEventListener('input', doSearch);
  }

  function initFilter() {
    if (!window.STAM || !window.STAM.boardFilter) return;
    window.STAM.boardFilter.init({
      trigger: '#ss-filter-btn',
      panel:   '#ss-fpop',
      reset:   '#ss-filter-reset',
      apply:   '#ss-filter-apply',
      groups: [
        { key: 'wst', label: '작성 상태', type: 'radio', options: [
          { value: '', label: '전체' },
          { value: 'writing',  label: '작성중',   dot: 'd-write' },
          { value: 'complete', label: '작성완료',  dot: 'd-brand' }
        ]},
        { key: 'rst', label: '검토 상태', type: 'radio', options: [
          { value: '', label: '전체' },
          { value: 'none',    label: '미요청',    dot: 'd-wait' },
          { value: 'pending', label: '검토 대기', dot: 'd-warn' },
          { value: 'done',    label: '검토 완료', dot: 'd-done' }
        ]},
        { key: 'ast', label: '승인 상태', type: 'radio', options: [
          { value: '', label: '전체' },
          { value: 'none',     label: '미승인',    dot: 'd-wait' },
          { value: 'approved', label: '승인 완료', dot: 'd-done' },
          { value: 'rejected', label: '반려됨',    dot: 'd-fatal' }
        ]},
        { key: 'type', label: '화면 유형', type: 'radio', options: [
          { value: '', label: '전체' },
          { value: 'list',   label: '목록 화면' },
          { value: 'detail', label: '상세 화면' },
          { value: 'form',   label: '폼 화면' },
          { value: 'popup',  label: '팝업' },
          { value: 'admin',  label: '관리 화면' }
        ]},
        { key: 'grp', label: '메뉴 그룹', type: 'radio', options: [
          { value: '', label: '전체' },
          { value: 'G-01', label: '대시보드' },
          { value: 'G-02', label: '회원' },
          { value: 'G-03', label: '산출물 관리' },
          { value: 'G-04', label: '검토 관리' },
          { value: 'G-05', label: '내보내기 / 설정' }
        ]},
        { key: 'img', label: '이미지 / 주석', type: 'radio', options: [
          { value: '', label: '전체' },
          { value: 'has', label: '이미지 있음' },
          { value: 'no',  label: '이미지 없음' },
          { value: 'ann', label: '주석 있음' }
        ]}
      ],
      onChange: function (values) {
        /* 패널 열린 상태에서 결과 미리보기 foot-info 업데이트 */
        var tmpF = {
          wst:   values.wst   ? values.wst[0]   || '' : '',
          rst:   values.rst   ? values.rst[0]   || '' : '',
          ast:   values.ast   ? values.ast[0]   || '' : '',
          type:  values.type  ? values.type[0]  || '' : '',
          grpId: values.grp   ? values.grp[0]   || '' : '',
          img:   values.img   ? values.img[0]   || '' : ''
        };
        var prevF = S.F;
        S.F = tmpF;
        var total = 0;
        MENUS.forEach(function (g) { total += filterScreens(g.screens).length; });
        S.F = prevF;
        var cnt = Object.keys(tmpF).filter(function (k) { return tmpF[k] !== ''; }).length;
        var el = document.querySelector('#ss-fpop .sbf-foot-info');
        if (el) el.textContent = '조건 ' + cnt + '개 · 결과 ' + total + '건';
      },
      onApply: function (values) {
        S.F.wst   = values.wst   ? values.wst[0]   || '' : '';
        S.F.rst   = values.rst   ? values.rst[0]   || '' : '';
        S.F.ast   = values.ast   ? values.ast[0]   || '' : '';
        S.F.type  = values.type  ? values.type[0]  || '' : '';
        S.F.grpId = values.grp   ? values.grp[0]   || '' : '';
        S.F.img   = values.img   ? values.img[0]   || '' : '';
        renderTable();
      },
      onReset: function () {
        S.F = { wst: '', rst: '', ast: '', type: '', grpId: '', img: '' };
        renderTable();
      }
    });
  }

  function initTable() {
    var tbody = document.getElementById('ss-tbody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      if (e.target.closest('.ss-ch')) return;
      var grpCell = e.target.closest('[data-ss-grp]');
      if (grpCell) {
        toggleGroup(grpCell.getAttribute('data-ss-grp'));
        return;
      }
      var row = e.target.closest('.ss-sc-row');
      if (row) {
        if (e.target.closest('[data-ssv-action]')) return;
        var recId = row.getAttribute('data-record-id');
        if (recId) {
          var clickedRec = findRecordById(recId);
          if (clickedRec) {
            hydrateDraftFromRecord(clickedRec);
            switchView('preview');
            renderPreviewView();
            var poM = document.getElementById('po-main');
            if (poM) poM.scrollTop = 0;
          }
          return;
        }
        openDetail(row.getAttribute('data-id'));
      }
    });
    tbody.addEventListener('change', function (e) {
      var grpCb = e.target.closest('[data-ss-grp-sel]');
      if (grpCb) {
        e.stopPropagation();
        toggleGrpSel(grpCb.getAttribute('data-ss-grp-sel'));
        return;
      }
      var selCb = e.target.closest('[data-ss-sel]');
      if (selCb) {
        e.stopPropagation();
        var row = selCb.closest('.ss-sc-row');
        if (row) { row.classList.toggle('sel', selCb.checked); row.classList.toggle('is-selected', selCb.checked); }
        toggleSel(selCb.getAttribute('data-ss-sel'), selCb.checked);
      }
    });
  }

  function initSelection() {
    var allCb = document.getElementById('ss-cb-all');
    if (!allCb) return;
    allCb.addEventListener('change', function () { toggleAll(allCb); });
  }

  function initDelete() {
    var delBtn = document.getElementById('ss-del-btn');
    if (delBtn) delBtn.addEventListener('click', showDeleteConfirm);

    var overlay = document.getElementById('ss-dlg-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          cancelDelete();
          return;
        }
        var btn = e.target.closest('[data-ss-del-action]');
        if (!btn) return;
        var act = btn.getAttribute('data-ss-del-action');
        if (act === 'cancel') cancelDelete();
        else if (act === 'confirm') confirmDelete();
      });
    }
  }

  function initDrawer() {
    var scrim = document.getElementById('ss-dw-scrim');
    if (scrim) scrim.addEventListener('click', closeDw);

    var drawer = document.getElementById('ss-drawer');
    if (!drawer) return;
    drawer.addEventListener('click', function (e) {
      var tabBtn = e.target.closest('[data-ss-tab]');
      if (tabBtn) {
        setTab(parseInt(tabBtn.getAttribute('data-ss-tab'), 10));
        return;
      }
      var actionBtn = e.target.closest('[data-ss-dw-action]');
      if (!actionBtn) return;
      var act = actionBtn.getAttribute('data-ss-dw-action');
      if (act === 'close') closeDw();
      else if (act === 'edit') openEdit();
      else if (act === 'reviewreq') openReviewReq();
      else if (act === 'detail-back' && S.dwItem) openDetail(S.dwItem.id);
      else if (act === 'fullview') {
        var page = actionBtn.getAttribute('data-ss-fullview-page');
        if (page) window.location.href = page;
      }
    });
  }

  function initRegisterBtn() {
    var regBtn = document.getElementById('ss-reg-btn');
    if (regBtn) regBtn.addEventListener('click', function() {
      SSP.serviceType    = null;
      SSP.frontAdmin     = null;
      SSP.pageTemplate   = null;
      SSP.step4ScreenId  = null;
      SSP.createStep     = null;
      SSP.activeRecordId = null;
      switchView('template');
      renderTemplateView();
    });
  }

  function initEscapeKey() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var overlay = document.getElementById('ss-dlg-overlay');
      if (overlay && overlay.classList.contains('open')) {
        e.preventDefault();
        cancelDelete();
        return;
      }
      if (S.dwMode !== null) {
        e.preventDefault();
        closeDw();
      }
    });
  }

  function initCustomSelect() {
    /* outside click → 열린 custom select 닫기 */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.ss-cs')) closeAllCustomSelects();
    });
    /* ESC → 열린 select가 있으면 select만 닫고 Drawer 닫힘은 막는다.
       capture 단계로 등록해 Drawer ESC 핸들러보다 먼저 처리. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.ss-cs.open')) {
        e.preventDefault();
        e.stopPropagation();
        closeAllCustomSelects();
      }
    }, true);
  }

  function initAll() {
    renderStrip();
    renderTable();
    /* updateFilterBtn 제거: STAM.boardFilter.init()이 배지 상태를 관리 */
    updateFilterInfo();
    updateSelBar();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initStrip();
    initSearch();
    initFilter();
    initTable();
    initSelection();
    initDelete();
    initDrawer();
    initRegisterBtn();
    initViewEvents();
    initEscapeKey();
    initCustomSelect();
    initAll();
  });

}());
