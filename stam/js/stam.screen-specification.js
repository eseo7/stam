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
      { id: 'SCR-001', name: '대시보드', ver: 'v1.1', wst: 'complete', rst: 'done', ast: 'approved', type: 'main', menu: '대시보드', owner: '박PM', av: '박', ac: '#5451E8', upd: '2026-06-07', hasImg: true, annots: 2, template: 'dashboard', templateName: '대시보드 화면',
        purp: 'STAM 플랫폼 첫 진입 화면으로 프로젝트 전체 현황과 처리 대기 항목을 일람합니다.',
        acts: [{ n: '화면설계서 바로가기', loc: '현황 카드', act: '목록 이동' }, { n: '검토 요청 확인', loc: '알림 영역', act: 'Drawer 열기' }],
        links: { req: ['REQ-001'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '박PM', at: '06-07', t: 'KPI 카드 순서 변경', f: 'v1.0', to: 'v1.1' }, { k: 'create', who: '이UX', at: '05-20', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-02', name: '회원', screens: [
      { id: 'SCR-002', name: '회원가입', ver: 'v1.0', wst: 'complete', rst: 'pending', ast: 'none', type: 'form', menu: '회원 > 회원가입', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-10', hasImg: true, annots: 3, template: 'form-create', templateName: '등록 Drawer 화면',
        purp: '사용자 계정 생성을 위한 정보 입력 화면입니다. 약관 동의, 본인 인증 단계를 포함합니다.',
        acts: [{ n: '이름·이메일 입력', loc: '폼 필드', act: '입력값 유효성 검사' }, { n: '회원가입 완료', loc: '제출 버튼', act: '계정 생성 처리' }],
        links: { req: ['REQ-001', 'REQ-002'], art: [], work: [], ifc: ['IFC-001'], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-10', t: '약관 동의 항목 추가', f: 'v0.9', to: 'v1.0' }, { k: 'st', who: '김기획', at: '06-09', t: '검토 요청 전환', f: '작성완료', to: '검토 대기' }, { k: 'create', who: '이UX', at: '05-25', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-003', name: '로그인 / 인증', ver: 'v1.2', wst: 'complete', rst: 'done', ast: 'approved', type: 'form', menu: '회원 > 로그인', owner: '최개발', av: '최', ac: '#00BF40', upd: '2026-06-05', hasImg: true, annots: 4, template: 'form-create', templateName: '등록 Drawer 화면',
        purp: 'STAM 플랫폼 진입을 위한 인증 화면입니다.',
        acts: [{ n: '로그인', loc: '제출 버튼', act: '인증 처리' }, { n: '비밀번호 찾기', loc: '링크', act: '재설정 화면 이동' }],
        links: { req: ['REQ-001'], art: [], work: [], ifc: ['IFC-001'], fn: [] },
        hist: [{ k: 'edit', who: '최개발', at: '06-05', t: '접근성 개선', f: 'v1.1', to: 'v1.2' }, { k: 'st', who: '박PM', at: '05-28', t: '승인 완료', f: '검토 대기', to: '승인 완료' }] },
      { id: 'SCR-004', name: '마이페이지', ver: 'v0.8', wst: 'writing', rst: 'none', ast: 'none', type: 'main', menu: '회원 > 마이페이지', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: false, annots: 0, template: 'dashboard', templateName: '대시보드 화면',
        purp: '로그인 사용자의 프로필, 활동 이력, 설정을 관리하는 화면입니다.',
        acts: [{ n: '프로필 수정', loc: '편집 버튼', act: '수정 폼 열기' }, { n: '활동 이력 조회', loc: '탭', act: '이력 목록 표시' }],
        links: { req: ['REQ-004'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-08', t: '활동 이력 탭 추가', f: 'v0.7', to: 'v0.8' }, { k: 'create', who: '이UX', at: '05-30', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-03', name: '산출물 관리', screens: [
      { id: 'SCR-005', name: '요구사항정의서 목록', ver: 'v1.0', wst: 'complete', rst: 'done', ast: 'approved', type: 'list', menu: '산출물 관리 > 요구사항정의서', owner: '김기획', av: '김', ac: '#6541F2', upd: '2026-06-07', hasImg: true, annots: 2, template: 'list', templateName: '목록형 화면',
        purp: '프로젝트 요구사항을 정의하고 관리하는 목록 화면입니다.',
        acts: [{ n: '요구사항 등록', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '행 클릭', loc: '목록 행', act: '상세 Drawer 열기' }],
        links: { req: [], art: [], work: ['WBS-010'], ifc: [], fn: ['FN-001'] },
        hist: [{ k: 'st', who: '박PM', at: '06-07', t: '승인 완료', f: '검토 대기', to: '승인 완료' }, { k: 'edit', who: '김기획', at: '06-05', t: '필터 구성 확정', f: 'v0.3', to: 'v1.0' }] },
      { id: 'SCR-006', name: '메뉴구조 / 화면목록', ver: 'v0.5', wst: 'writing', rst: 'none', ast: 'none', type: 'list', menu: '산출물 관리 > 메뉴구조', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-09', hasImg: false, annots: 0, template: 'list', templateName: '목록형 화면',
        purp: '프로젝트의 메뉴 구조와 화면 목록을 계층형으로 관리하는 화면입니다.',
        acts: [{ n: '메뉴 추가', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '화면 연결', loc: '행 액션', act: '화면설계서 연결' }],
        links: { req: ['REQ-011'], art: [], work: ['WBS-002'], ifc: [], fn: ['FN-002', 'FN-003'] },
        hist: [{ k: 'edit', who: '이UX', at: '06-09', t: '계층 표현 방식 수정', f: 'v0.4', to: 'v0.5' }, { k: 'create', who: '이UX', at: '06-01', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-007', name: 'WBS 작업', ver: 'v1.1', wst: 'complete', rst: 'done', ast: 'approved', type: 'list', menu: '산출물 관리 > WBS 작업', owner: '박PM', av: '박', ac: '#5451E8', upd: '2026-06-06', hasImg: true, annots: 5, template: 'list', templateName: '목록형 화면',
        purp: '프로젝트 작업을 계획·관리하는 목록 화면입니다. 간트 타임라인을 포함합니다.',
        acts: [{ n: '작업 등록', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '행 클릭', loc: '목록 행', act: '상세 Drawer 열기' }],
        links: { req: ['REQ-008'], art: [], work: ['WBS-007'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '박PM', at: '06-06', t: '간트 타임라인 추가', f: 'v1.0', to: 'v1.1' }, { k: 'st', who: '박PM', at: '05-30', t: '승인 완료', f: '검토 대기', to: '승인 완료' }] },
      { id: 'SCR-008', name: '화면설계서 목록', ver: 'v0.6', wst: 'writing', rst: 'none', ast: 'none', type: 'list', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-09', hasImg: false, annots: 0, template: 'list', templateName: '목록형 화면',
        purp: '화면설계서를 메뉴 단위 hierarchy 구조로 관리하는 목록 화면입니다.',
        acts: [{ n: '화면 등록', loc: '상단 버튼', act: '등록 Drawer 열기' }, { n: '행 클릭', loc: '목록 행', act: '상세 Drawer 열기' }],
        links: { req: ['REQ-011'], art: ['ART-003'], work: ['WBS-011'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-09', t: 'hierarchy tree table 구조 적용', f: 'v0.5', to: 'v0.6' }, { k: 'create', who: '이UX', at: '06-01', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-009', name: '화면설계서 상세', ver: 'v0.4', wst: 'complete', rst: 'done', ast: 'approved', type: 'detail', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: true, annots: 7, template: 'form-detail', templateName: '상세 Drawer 화면',
        purp: '화면설계서 항목의 개요·연결정보·검토이력을 우측 Drawer 방식으로 표시합니다.',
        acts: [{ n: '탭 전환', loc: 'Drawer 탭', act: '탭 콘텐츠 전환' }, { n: '검토 요청', loc: 'Drawer 하단', act: '상태 변경' }],
        links: { req: ['REQ-012'], art: ['ART-003'], work: ['WBS-009'], ifc: [], fn: ['FN-004'] },
        hist: [{ k: 'st', who: '박PM', at: '06-08', t: '승인 완료', f: '검토 대기', to: '승인 완료' }, { k: 'edit', who: '이UX', at: '06-07', t: '연결정보 탭 추가', f: 'v0.3', to: 'v0.4' }] },
      { id: 'SCR-010', name: '화면설계서 등록', ver: 'v0.3', wst: 'writing', rst: 'none', ast: 'none', type: 'form', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: false, annots: 0, template: 'form-create', templateName: '등록 Drawer 화면',
        purp: '새 화면설계서를 등록하는 폼 화면입니다. 기본 정보, 이미지 첨부, 연결정보를 입력합니다.',
        acts: [{ n: '정보 입력', loc: '폼 필드', act: '유효성 검사' }, { n: '저장', loc: '하단 버튼', act: '등록 처리' }],
        links: { req: ['REQ-012'], art: [], work: ['WBS-009'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-08', t: '이미지 첨부 영역 추가', f: 'v0.2', to: 'v0.3' }, { k: 'create', who: '이UX', at: '06-03', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-011', name: '화면설계서 수정', ver: 'v0.3', wst: 'writing', rst: 'none', ast: 'none', type: 'form', menu: '산출물 관리 > 화면설계서', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-08', hasImg: false, annots: 0, template: 'form-create', templateName: '등록 Drawer 화면',
        purp: '기존 화면설계서를 수정하는 폼 화면입니다. 변경 사유 입력 기능을 포함합니다.',
        acts: [{ n: '정보 수정', loc: '폼 필드', act: '유효성 검사' }, { n: '저장', loc: '하단 버튼', act: '변경 처리' }],
        links: { req: ['REQ-012'], art: [], work: ['WBS-009'], ifc: [], fn: [] },
        hist: [{ k: 'edit', who: '이UX', at: '06-08', t: '변경 사유 입력 추가', f: 'v0.2', to: 'v0.3' }, { k: 'create', who: '이UX', at: '06-03', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-04', name: '검토 관리', screens: [
      { id: 'SCR-012', name: '검토 요청 현황', ver: 'v0.7', wst: 'complete', rst: 'pending', ast: 'none', type: 'list', menu: '검토 관리 > 검토 요청 현황', owner: '김기획', av: '김', ac: '#6541F2', upd: '2026-06-09', hasImg: false, annots: 0, template: 'approval', templateName: '승인/검토 화면',
        purp: '프로젝트 전체 검토 요청 현황을 일람하고 처리하는 화면입니다.',
        acts: [{ n: '검토 요청 확인', loc: '목록 행', act: '상세 Drawer 열기' }, { n: '승인/반려', loc: '행 액션', act: '상태 변경' }],
        links: { req: ['REQ-015'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'st', who: '박PM', at: '06-09', t: '검토 요청 전환', f: '작성완료', to: '검토 대기' }, { k: 'edit', who: '김기획', at: '06-07', t: '상태 chip 구성 보정', f: 'v0.6', to: 'v0.7' }] },
      { id: 'SCR-013', name: '검토 요청 결과', ver: 'v0.2', wst: 'writing', rst: 'none', ast: 'none', type: 'detail', menu: '검토 관리 > 검토 결과', owner: '김기획', av: '김', ac: '#6541F2', upd: '2026-06-09', hasImg: false, annots: 0, template: 'form-detail', templateName: '상세 Drawer 화면',
        purp: '검토 요청 처리 결과를 확인하는 화면입니다. 승인/반려 사유를 포함합니다.',
        acts: [{ n: '목록으로 돌아가기', loc: '하단 버튼', act: '목록 이동' }],
        links: { req: ['REQ-015'], art: [], work: [], ifc: [], fn: [] },
        hist: [{ k: 'create', who: '김기획', at: '06-09', t: '최초 등록', n: 'v0.1' }] }
    ] },
    { id: 'G-05', name: '보내기 / 설정', screens: [
      { id: 'SCR-014', name: '산출물보내기', ver: 'v1.0', wst: 'complete', rst: 'pending', ast: 'none', type: 'popup', menu: '보내기 / 설정 >보내기', owner: '이UX', av: '이', ac: '#0066FF', upd: '2026-06-06', hasImg: false, annots: 0, template: 'blank', templateName: '빈 템플릿',
        purp: '선택한 산출물을 PDF·Excel 등 형식으로보내는 팝업 화면입니다.',
        acts: [{ n: '형식 선택', loc: '라디오', act: '형식 변경' }, { n: '보내기', loc: '하단 버튼', act: '파일 생성' }],
        links: { req: [], art: ['ART-006'], work: [], ifc: ['IFC-002'], fn: ['FN-005'] },
        hist: [{ k: 'st', who: '김기획', at: '06-06', t: '검토 요청 전환', f: '작성완료', to: '검토 대기' }, { k: 'create', who: '이UX', at: '05-28', t: '최초 등록', n: 'v0.1' }] },
      { id: 'SCR-015', name: '프로젝트 구성원 관리', ver: 'v0.3', wst: 'complete', rst: 'pending', ast: 'none', type: 'admin', menu: '보내기 / 설정 > 구성원 관리', owner: '박PM', av: '박', ac: '#5451E8', upd: '2026-06-09', hasImg: false, annots: 0, template: 'blank', templateName: '빈 템플릿',
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

  /* ── Template definitions ── */
  var TEMPLATES = [
    { id: 'list', name: '목록형 화면', desc: '검색·필터·테이블 구조의 목록 화면', count: 7, use: '목록·조회·관리 화면', defaultType: 'list',
      items: ['화면 제목', '검색 조건', '조회 버튼', '결과 테이블', '상태 chip', '행 액션', '빈 결과 상태'],
      useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: true,
      icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>' },
    { id: 'form-create', name: '등록 Drawer 화면', desc: '입력 폼 중심의 등록·작성 Drawer 화면', count: 5, use: '신규 등록·작성 화면', defaultType: 'form',
      items: ['화면 제목', '폼 입력 영역', '필수 항목 표시', '저장 버튼', '취소 버튼'],
      useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false,
      icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>' },
    { id: 'form-detail', name: '상세 Drawer 화면', desc: '저장된 항목을 읽기 전용으로 표시하는 상세 Drawer', count: 5, use: '상세 보기·이력 화면', defaultType: 'detail',
      items: ['화면 제목', '기본 정보', '상태 표시', '변경 이력', '액션 버튼'],
      useSearch: false, useTable: false, useStatusChip: true, useRowAction: false, useEmpty: false,
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
    { id: 'dashboard', name: '대시보드 화면', desc: 'KPI 카드·차트 중심의 현황 요약 화면', count: 4, use: '현황 요약·통계 화면', defaultType: 'main',
      items: ['화면 제목', 'KPI 카드', '차트/그래프 영역', '상세 링크'],
      useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false,
      icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
    { id: 'approval', name: '승인/검토 화면', desc: '검토 요청·승인·반려 워크플로우 화면', count: 6, use: '승인·검토·감사 화면', defaultType: 'list',
      items: ['화면 제목', '검토 대상 목록', '상태 chip', '승인 액션', '반려 사유', '이력'],
      useSearch: true, useTable: true, useStatusChip: true, useRowAction: true, useEmpty: false,
      icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
    { id: 'blank', name: '빈 템플릿', desc: '항목 없이 직접 구성하는 빈 화면 템플릿', count: 1, use: '비정형·커스텀 화면', defaultType: 'list',
      items: ['화면 제목'],
      useSearch: false, useTable: false, useStatusChip: false, useRowAction: false, useEmpty: false,
      icon: '<rect x="3" y="3" width="18" height="18" rx="2"/>' }
  ];

  /* ── Create Form State (JS 메모리 only — no localStorage) ── */
  var CS = {
    template: 'list',
    templateName: '목록형 화면',
    screenName: '',
    screenId: '',
    bizArea: '',
    screenType: 'list',
    menuPath: '',
    purpose: '',
    memo: '',
    screenTitle: '',
    topNote: '',
    useSearch: true,
    useTable: true,
    useStatusChip: true,
    useRowAction: true,
    useEmpty: true,
    searchItems: [{ cond: '화면 ID', inputType: 'text', required: true, defaultVal: '', order: 1 }],
    tableColumns: [{ name: '화면명', key: 'screenName', visible: true, sortable: true, width: '200px' }, { name: '상태', key: 'status', visible: true, sortable: false, width: '80px' }],
    rowActions: [{ name: '상세 보기', style: 'ghost', link: '', permission: '전체', condition: '항상' }],
    status: 'writing',
    savedId: null
  };

  var SS_ID_SEQ = 16;

  function resetCS(tplId) {
    var tpl = TEMPLATES.filter(function (t) { return t.id === tplId; })[0] || TEMPLATES[0];
    CS.template = tpl.id;
    CS.templateName = tpl.name;
    CS.screenName = '';
    CS.screenId = '';
    CS.bizArea = '';
    CS.screenType = tpl.defaultType;
    CS.menuPath = '';
    CS.purpose = '';
    CS.memo = '';
    CS.screenTitle = '';
    CS.topNote = '';
    CS.useSearch = tpl.useSearch;
    CS.useTable = tpl.useTable;
    CS.useStatusChip = tpl.useStatusChip;
    CS.useRowAction = tpl.useRowAction;
    CS.useEmpty = tpl.useEmpty;
    CS.searchItems = CS.useSearch ? [{ cond: '검색어', inputType: 'text', required: false, defaultVal: '', order: 1 }] : [];
    CS.tableColumns = CS.useTable ? [{ name: '항목명', key: 'name', visible: true, sortable: true, width: '200px' }] : [];
    CS.rowActions = CS.useRowAction ? [{ name: '상세 보기', style: 'ghost', link: '', permission: '전체', condition: '항상' }] : [];
    CS.status = 'writing';
    CS.savedId = null;
  }

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

  function updateFilterBtn() {
    var cnt = getFilterCount();
    var btn = document.getElementById('ss-filter-btn');
    var badge = document.getElementById('ss-filter-cnt');
    if (!btn) return;
    btn.classList.toggle('active', cnt > 0);
    if (badge) {
      if (cnt > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = cnt;
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function updateFilterInfo() {
    var cnt = getFilterCount();
    var total = 0;
    MENUS.forEach(function (grp) {
      var screens = grp.screens;
      if (cnt > 0) screens = filterScreens(screens);
      total += screens.length;
    });
    var el = document.getElementById('ss-fpop-info');
    if (el) el.textContent = '조건 ' + cnt + '개 · 결과 ' + total + '건';
  }

  function toggleFilter(e) {
    if (e) e.stopPropagation();
    updateFilterInfo();
    var fpop = document.getElementById('ss-fpop');
    if (fpop) fpop.classList.toggle('open');
  }

  function closeFilter() {
    var fpop = document.getElementById('ss-fpop');
    if (fpop) fpop.classList.remove('open');
  }

  function resetFilter() {
    S.F = { wst: '', rst: '', ast: '', type: '', grpId: '', img: '' };
    document.querySelectorAll('.ss-filter-pop-opts .ss-fopt').forEach(function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-val') === '');
    });
    updateFilterBtn();
    updateFilterInfo();
    renderTable();
  }

  function applyFilter() {
    var groups = ['ss-f-wst', 'ss-f-rst', 'ss-f-ast', 'ss-f-type', 'ss-f-grp', 'ss-f-img'];
    var keys = ['wst', 'rst', 'ast', 'type', 'grpId', 'img'];
    groups.forEach(function (gid, i) {
      var grpEl = document.getElementById(gid);
      var sel = grpEl ? grpEl.querySelector('.ss-fopt.on') : null;
      S.F[keys[i]] = sel ? sel.getAttribute('data-val') : '';
    });
    updateFilterBtn();
    updateFilterInfo();
    renderTable();
    closeFilter();
  }

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
    if (lbl) lbl.textContent = n > 0 ? '삭제 ' + n : '삭제';
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
        '<td class="ss-ch"><input type="checkbox" class="ss-cb" id="cb-' + grp.id + '"' +
        (cbChecked ? ' checked' : '') + (cbIndet ? ' data-indet' : '') +
        ' data-ss-grp-sel="' + grp.id + '"></td>' +
        '<td colspan="7"><div class="ss-gr-cell" data-ss-grp="' + grp.id + '">' +
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
        html += '<tr class="ss-sc-row stam-table-row' + (isSel ? ' sel is-selected' : '') + (isOpen ? ' is-row-open' : '') + (last ? ' lg' : '') + '" data-id="' + s.id + '">' +
          '<td class="ss-ch"><input type="checkbox" class="ss-cb"' + (isSel ? ' checked' : '') +
          ' data-ss-sel="' + s.id + '"></td>' +
          '<td class="ss-name-col"><div class="ss-sc-cell"><span class="ss-sc-ind">└</span>' +
          '<span class="ss-sc-id">' + s.id + '</span><span class="ss-sc-name">' + s.name + '</span>' +
          typChipSm(s.type) + '</div></td>' +
          '<td><span class="ss-vp">' + s.ver + '</span></td>' +
          '<td>' + wChip(s.wst) + '</td>' +
          '<td>' + rChip(s.rst) + '</td>' +
          '<td>' + aChip(s.ast) + '</td>' +
          '<td style="display:flex;align-items:center;gap:4px">' + imgChip(s.hasImg) + annChip(s.annots) + '</td>' +
          '<td style="color:var(--t3);font-size:12px">' + s.upd.slice(5) + '</td></tr>';
      });
    });
    if (!html) {
      html = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--t3)">조건에 맞는 화면설계서가 없습니다.</td></tr>';
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
    resetCS('list');
    showDw('register', null);
  }

  function openEdit() {
    showDw('edit', S.dwItem);
  }

  function openReviewReq() {
    showDw('reviewreq', S.dwItem);
  }

  function renderDw() {
    var m = { detail: renderDetail, register: renderRegister, edit: renderEdit, reviewreq: renderReviewReq, preview: renderPreviewDw };
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
    wrap.className = 'ss-cs';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ss-cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', uid + '-list');

    var valSpan = document.createElement('span');
    valSpan.className = 'ss-cs-val';

    var caret = document.createElement('span');
    caret.className = 'ss-cs-caret';
    caret.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(valSpan);
    trigger.appendChild(caret);

    var panel = document.createElement('div');
    panel.className = 'ss-cs-panel';
    panel.id = uid + '-list';
    panel.setAttribute('role', 'listbox');

    Array.prototype.forEach.call(native.options, function (o, i) {
      var od = document.createElement('div');
      od.className = 'ss-cs-opt';
      od.id = uid + '-opt-' + i;
      od.setAttribute('role', 'option');
      od.setAttribute('data-idx', i);
      od.setAttribute('aria-selected', 'false');
      if (o.value === '') od.classList.add('is-placeholder');
      /* WBS와 동일: 모든 option에 check 슬롯(고정폭) → 텍스트 시작 정렬 일치.
         실제 selected(is-sel)일 때만 CSS로 check 표시. */
      var ck = document.createElement('span');
      ck.className = 'ss-cs-check';
      ck.setAttribute('aria-hidden', 'true');
      ck.innerHTML = CS_CHECK_SVG;
      var tx = document.createElement('span');
      tx.className = 'ss-cs-otext';
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
      var container = document.getElementById('ss-dw-body');
      if (!container) return;
      var ph = panel.offsetHeight;
      var tRect = trigger.getBoundingClientRect();
      var cRect = container.getBoundingClientRect();
      var below = cRect.bottom - tRect.bottom;
      var above = tRect.top - cRect.top;
      if (below < ph + 8 && above > below) wrap.classList.add('cs-up');
    }

    function openPanel() {
      closeAllCustomSelects();
      wrap.classList.add('open');
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
    var tplRow = d.templateName
      ? '<div class="ss-detail-tpl-row"><span class="ss-detail-tpl-lbl">템플릿</span><span class="ss-detail-tpl-val">' + d.templateName + '</span></div>'
      : '';
    var structItems = [
      { lbl: '검색영역', on: d.type === 'list' || d.type === 'admin' },
      { lbl: '결과테이블', on: d.type === 'list' || d.type === 'admin' },
      { lbl: '상태 chip', on: d.wst !== 'none' },
      { lbl: '행 액션', on: d.acts && d.acts.length > 0 },
      { lbl: '빈 결과 상태', on: d.type === 'list' }
    ];
    var structRow = '<div class="ss-detail-struct-row">' +
      structItems.map(function(si) {
        return '<span class="ss-detail-struct-chip' + (si.on ? ' is-on' : '') + '">' + si.lbl + (si.on ? ' ✓' : '') + '</span>';
      }).join('') +
    '</div>';
    /* Description table */
    var descRows = [];
    var dn = 1;
    descRows.push({ n: dn++, name: '화면 제목', desc: d.name });
    if (d.type === 'list' || d.type === 'admin') {
      descRows.push({ n: dn++, name: '검색 조건', desc: '화면 ID · 화면명 검색' });
      descRows.push({ n: dn++, name: '조회 버튼', desc: '조회 실행' });
      descRows.push({ n: dn++, name: '결과 테이블', desc: '화면 목록 표시' });
    }
    if (d.wst !== 'none') descRows.push({ n: dn++, name: '상태 chip', desc: '작성/검토/승인 상태 표시' });
    if (d.acts && d.acts.length) {
      d.acts.forEach(function(a) { descRows.push({ n: dn++, name: a.n, desc: a.loc + ' → ' + a.act }); });
    }
    if (d.type === 'list') descRows.push({ n: dn++, name: '빈 결과 상태', desc: '결과 없음 안내 문구' });
    var descTable = '<table class="ss-detail-desc-table"><thead><tr><th class="ss-detail-desc-num">번호</th><th>항목명</th><th>설명</th></tr></thead><tbody>' +
      descRows.map(function(r) {
        return '<tr><td class="ss-detail-desc-num">' + r.n + '</td><td class="ss-detail-desc-name">' + r.name + '</td><td class="ss-detail-desc-desc">' + r.desc + '</td></tr>';
      }).join('') +
    '</tbody></table>';

    return tplRow + structRow +
      '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>상태</h3></div><div class="ss-status-row">' +
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
      '<button type="button" class="ss-btn ss-btn-ghost" style="font-size:11.5px;padding:5px 10px">' + ic(ICONS.canvas, 12) + ' 전체 캔버스 보기</button></div></div></div></div>' +
      '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>Description 상세</h3></div>' + descTable + '</div>';
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
    var drawer = document.getElementById('ss-drawer');
    if (drawer) drawer.classList.remove('is-wide');
    if (foot) foot.className = 'ss-dw-foot';
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

  /* ── Create Drawer helpers ── */

  function svgIcon(path, sz) {
    sz = sz || 14;
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  function buildTplCards() {
    return '<div class="ss-tpl-grid" id="ss-tpl-grid">' +
      TEMPLATES.map(function (t) {
        var isActive = t.id === CS.template;
        return '<div class="ss-tpl-card' + (isActive ? ' active' : '') + '" data-ss-tpl="' + t.id + '">' +
          '<div class="ss-tpl-card-icon">' + svgIcon(t.icon, 14) + '</div>' +
          '<div class="ss-tpl-card-name">' + t.name + '</div>' +
          '<div class="ss-tpl-card-desc">' + t.desc + '</div>' +
          '<div class="ss-tpl-card-meta">' +
            '<span class="ss-tpl-card-badge">기본 항목 ' + t.count + '개</span>' +
            '<span class="ss-tpl-card-badge">' + t.use + '</span>' +
          '</div>' +
          '<button type="button" class="ss-tpl-sel-btn" data-ss-tpl="' + t.id + '">' +
            svgIcon(isActive ? '<polyline points="20 6 9 17 4 12"/>' : '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 11) +
            (isActive ? '선택됨' : '이 템플릿 선택') +
          '</button>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function buildToggleSwitch(key, checked) {
    return '<label class="ss-toggle-sw">' +
      '<input type="checkbox" data-ss-toggle="' + key + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="ss-toggle-track"></span>' +
      '<span class="ss-toggle-knob"></span>' +
    '</label>';
  }

  function buildToggleRows() {
    var rows = [
      { key: 'useSearch', lbl: '검색영역 사용', sub: '검색 조건 입력 패널', on: CS.useSearch },
      { key: 'useTable', lbl: '결과테이블 사용', sub: '컬럼 헤더와 데이터 행', on: CS.useTable },
      { key: 'useStatusChip', lbl: '상태 chip 사용', sub: '작성/검토/승인 상태 표시', on: CS.useStatusChip },
      { key: 'useRowAction', lbl: '행 액션 사용', sub: '행별 버튼 또는 드롭다운', on: CS.useRowAction },
      { key: 'useEmpty', lbl: '빈 결과 상태 사용', sub: '결과 없음 안내 문구', on: CS.useEmpty }
    ];
    return '<div class="ss-toggle-grid">' +
      rows.map(function (r) {
        return '<div class="ss-toggle-row">' +
          '<div class="ss-toggle-row-l">' +
            '<span class="ss-toggle-lbl">' + r.lbl + '</span>' +
            '<span class="ss-toggle-sub">' + r.sub + '</span>' +
          '</div>' +
          buildToggleSwitch(r.key, r.on) +
        '</div>';
      }).join('') +
    '</div>';
  }

  function buildSearchBuilder() {
    if (!CS.useSearch) return '<div class="ss-dw-sec-empty">검색영역 사용 안 함 — 화면 구조에서 켜면 표시됩니다.</div>';
    var hdrs = ['<div class="ss-builder-col-lbl">조건명</div>','<div class="ss-builder-col-lbl">입력타입</div>','<div class="ss-builder-col-lbl">필수</div>','<div class="ss-builder-col-lbl">기본값</div>','<div class="ss-builder-col-lbl">순서</div>','<div></div>'];
    return '<div class="ss-builder-rows" id="ss-sb-rows">' +
      CS.searchItems.map(function (item, i) {
        return '<div class="ss-builder-row ss-br-search" data-sb-idx="' + i + '">' +
          '<div><div class="ss-builder-col-lbl">조건명</div><input class="ss-builder-inp" data-sb-field="cond" data-sb-idx="' + i + '" value="' + item.cond + '" placeholder="조건명"></div>' +
          '<div><div class="ss-builder-col-lbl">입력타입</div><input class="ss-builder-inp" data-sb-field="inputType" data-sb-idx="' + i + '" value="' + item.inputType + '" placeholder="text / select / date"></div>' +
          '<div><div class="ss-builder-col-lbl">필수</div><input class="ss-builder-inp" data-sb-field="required" data-sb-idx="' + i + '" value="' + (item.required ? 'Y' : 'N') + '" placeholder="Y/N"></div>' +
          '<div><div class="ss-builder-col-lbl">기본값</div><input class="ss-builder-inp" data-sb-field="defaultVal" data-sb-idx="' + i + '" value="' + item.defaultVal + '" placeholder="기본값"></div>' +
          '<div><div class="ss-builder-col-lbl">순서</div><input class="ss-builder-inp" data-sb-field="order" data-sb-idx="' + i + '" value="' + item.order + '" placeholder="1"></div>' +
          '<div><div class="ss-builder-col-lbl">&nbsp;</div><button type="button" class="ss-builder-del" data-sb-del="' + i + '" title="삭제">' + svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', 12) + '</button></div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<button type="button" class="ss-builder-add-btn" data-ss-builder-add="search">' +
      svgIcon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 12) + ' 검색 조건 추가' +
    '</button>';
  }

  function buildColBuilder() {
    if (!CS.useTable) return '<div class="ss-dw-sec-empty">결과테이블 사용 안 함 — 화면 구조에서 켜면 표시됩니다.</div>';
    return '<div class="ss-builder-rows" id="ss-cb-rows">' +
      CS.tableColumns.map(function (col, i) {
        return '<div class="ss-builder-row ss-br-col" data-cb-idx="' + i + '">' +
          '<div><div class="ss-builder-col-lbl">컬럼명</div><input class="ss-builder-inp" data-cb-field="name" data-cb-idx="' + i + '" value="' + col.name + '" placeholder="컬럼명"></div>' +
          '<div><div class="ss-builder-col-lbl">데이터키</div><input class="ss-builder-inp" data-cb-field="key" data-cb-idx="' + i + '" value="' + col.key + '" placeholder="camelCase"></div>' +
          '<div><div class="ss-builder-col-lbl">표시</div><input class="ss-builder-inp" data-cb-field="visible" data-cb-idx="' + i + '" value="' + (col.visible ? 'Y' : 'N') + '" placeholder="Y/N"></div>' +
          '<div><div class="ss-builder-col-lbl">정렬가능</div><input class="ss-builder-inp" data-cb-field="sortable" data-cb-idx="' + i + '" value="' + (col.sortable ? 'Y' : 'N') + '" placeholder="Y/N"></div>' +
          '<div><div class="ss-builder-col-lbl">너비</div><input class="ss-builder-inp" data-cb-field="width" data-cb-idx="' + i + '" value="' + col.width + '" placeholder="120px"></div>' +
          '<div><div class="ss-builder-col-lbl">&nbsp;</div><button type="button" class="ss-builder-del" data-cb-del="' + i + '" title="삭제">' + svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', 12) + '</button></div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<button type="button" class="ss-builder-add-btn" data-ss-builder-add="col">' +
      svgIcon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 12) + ' 컬럼 추가' +
    '</button>';
  }

  function buildActionBuilder() {
    if (!CS.useRowAction) return '<div class="ss-dw-sec-empty">행 액션 사용 안 함 — 화면 구조에서 켜면 표시됩니다.</div>';
    return '<div class="ss-builder-rows" id="ss-ab-rows">' +
      CS.rowActions.map(function (act, i) {
        return '<div class="ss-builder-row ss-br-action" data-ab-idx="' + i + '">' +
          '<div><div class="ss-builder-col-lbl">액션명</div><input class="ss-builder-inp" data-ab-field="name" data-ab-idx="' + i + '" value="' + act.name + '" placeholder="액션명"></div>' +
          '<div><div class="ss-builder-col-lbl">버튼 스타일</div><input class="ss-builder-inp" data-ab-field="style" data-ab-idx="' + i + '" value="' + act.style + '" placeholder="primary / ghost"></div>' +
          '<div><div class="ss-builder-col-lbl">연결 화면</div><input class="ss-builder-inp" data-ab-field="link" data-ab-idx="' + i + '" value="' + act.link + '" placeholder="화면 ID"></div>' +
          '<div><div class="ss-builder-col-lbl">권한</div><input class="ss-builder-inp" data-ab-field="permission" data-ab-idx="' + i + '" value="' + act.permission + '" placeholder="전체/관리자"></div>' +
          '<div><div class="ss-builder-col-lbl">표시조건</div><input class="ss-builder-inp" data-ab-field="condition" data-ab-idx="' + i + '" value="' + act.condition + '" placeholder="항상/로그인"></div>' +
          '<div><div class="ss-builder-col-lbl">&nbsp;</div><button type="button" class="ss-builder-del" data-ab-del="' + i + '" title="삭제">' + svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', 12) + '</button></div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<button type="button" class="ss-builder-add-btn" data-ss-builder-add="action">' +
      svgIcon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 12) + ' 액션 추가' +
    '</button>';
  }

  function buildDescSummary() {
    var items = [];
    var n = 1;
    var tpl = TEMPLATES.filter(function (t) { return t.id === CS.template; })[0];
    if (CS.screenTitle || (tpl && tpl.items.indexOf('화면 제목') !== -1)) items.push({ n: n++, name: '화면 제목', src: '템플릿 기본', on: true });
    if (CS.topNote) items.push({ n: n++, name: '상단 안내문구', src: '입력값 기반', on: true });
    if (CS.useSearch) {
      items.push({ n: n++, name: '검색 조건', src: '입력값 기반 (' + CS.searchItems.length + '개)', on: true });
      items.push({ n: n++, name: '조회 버튼', src: '템플릿 기본', on: true });
    }
    if (CS.useTable) {
      items.push({ n: n++, name: '결과 테이블', src: '입력값 기반 (' + CS.tableColumns.length + '열)', on: true });
    }
    if (CS.useStatusChip) items.push({ n: n++, name: '상태 chip', src: '입력값 기반', on: true });
    if (CS.useRowAction) items.push({ n: n++, name: '행 액션', src: '입력값 기반 (' + CS.rowActions.length + '개)', on: true });
    if (CS.useEmpty) items.push({ n: n++, name: '빈 결과 상태', src: '템플릿 기본', on: true });
    if (!CS.useSearch) items.push({ n: 0, name: '검색영역', src: '사용 안 함', on: false });
    if (!CS.useTable) items.push({ n: 0, name: '결과테이블', src: '사용 안 함', on: false });
    if (!CS.useStatusChip) items.push({ n: 0, name: '상태 chip', src: '사용 안 함', on: false });
    if (!CS.useRowAction) items.push({ n: 0, name: '행 액션', src: '사용 안 함', on: false });
    if (!CS.useEmpty) items.push({ n: 0, name: '빈 결과 상태', src: '사용 안 함', on: false });

    return '<table class="ss-desc-summary"><thead><tr>' +
      '<th class="ss-dsn">번호</th><th class="ss-dsname">항목명</th><th class="ss-dssrc">생성 방식</th><th>상태</th>' +
      '</tr></thead><tbody>' +
      items.map(function (item) {
        return '<tr>' +
          '<td class="ss-dsn">' + (item.on ? '❶❷❸❹❺❻❼❽❾❿'.split('')[item.n - 1] || item.n : '—') + '</td>' +
          '<td class="ss-dsname">' + item.name + '</td>' +
          '<td class="ss-dssrc">' + item.src + '</td>' +
          '<td>' + (item.on ? '<span class="ss-desc-chip-on">사용함</span>' : '<span class="ss-desc-chip-off">미사용</span>') + '</td>' +
        '</tr>';
      }).join('') +
    '</tbody></table>';
  }

  function readCSFromForm() {
    var f = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    CS.screenName = f('cs-screen-name');
    CS.screenId = f('cs-screen-id');
    CS.bizArea = f('cs-biz-area');
    CS.menuPath = f('cs-menu-path');
    CS.purpose = f('cs-purpose');
    CS.memo = f('cs-memo');
    CS.screenTitle = f('cs-screen-title');
    CS.topNote = f('cs-top-note');
    /* type from select */
    var typeEl = document.getElementById('cs-screen-type');
    if (typeEl) CS.screenType = typeEl.value;
    /* builder inputs */
    document.querySelectorAll('[data-sb-field]').forEach(function(inp) {
      var idx = parseInt(inp.getAttribute('data-sb-idx'), 10);
      var field = inp.getAttribute('data-sb-field');
      if (CS.searchItems[idx] !== undefined) CS.searchItems[idx][field] = inp.value;
    });
    document.querySelectorAll('[data-cb-field]').forEach(function(inp) {
      var idx = parseInt(inp.getAttribute('data-cb-idx'), 10);
      var field = inp.getAttribute('data-cb-field');
      if (CS.tableColumns[idx] !== undefined) CS.tableColumns[idx][field] = inp.value;
    });
    document.querySelectorAll('[data-ab-field]').forEach(function(inp) {
      var idx = parseInt(inp.getAttribute('data-ab-idx'), 10);
      var field = inp.getAttribute('data-ab-field');
      if (CS.rowActions[idx] !== undefined) CS.rowActions[idx][field] = inp.value;
    });
  }

  function updateCreateHeaderChips() {
    var selChip = document.getElementById('ss-create-sel-chip');
    var statusChip = document.getElementById('ss-create-status-chip');
    if (selChip) selChip.textContent = '선택 템플릿: ' + CS.templateName;
    if (statusChip) {
      statusChip.textContent = CS.status === 'draft-saved' ? '임시저장됨' : CS.status === 'review-requested' ? '검토요청' : '작성중';
      statusChip.className = 'ss-create-status-chip' + (CS.status === 'draft-saved' ? ' is-draft' : CS.status === 'review-requested' ? ' is-review' : '');
    }
    /* update desc summary if visible */
    var descEl = document.getElementById('ss-desc-summary-wrap');
    if (descEl) descEl.innerHTML = buildDescSummary();
  }

  function renderRegister() {
    var tabs = document.getElementById('ss-dw-tabs');
    var head = document.getElementById('ss-dw-head');
    var body = document.getElementById('ss-dw-body');
    var foot = document.getElementById('ss-dw-foot');
    var drawer = document.getElementById('ss-drawer');
    if (tabs) tabs.style.display = 'none';
    if (drawer) drawer.classList.remove('is-wide');

    if (head) {
      head.innerHTML =
        '<div class="ss-dw-hrow">' +
          '<span class="ss-dw-mode-badge is-create">신규 등록</span>' +
          '<span style="flex:1"></span>' +
          '<button type="button" class="ss-dw-close" data-ss-dw-action="close" aria-label="닫기">' + ic(ICONS.close, 15) + '</button>' +
        '</div>' +
        '<div class="ss-dw-htitle">화면설계서 작성</div>' +
        '<div class="ss-dw-head-chips">' +
          '<span class="ss-create-status-chip" id="ss-create-status-chip">작성중</span>' +
          '<span class="ss-sel-chip" id="ss-create-sel-chip">선택 템플릿: ' + CS.templateName + '</span>' +
        '</div>' +
        '<div class="ss-dw-hguide">템플릿을 선택한 뒤 입력폼을 작성합니다.</div>';
    }

    if (body) {
      body.innerHTML =
        /* 1. 템플릿 선택 */
        '<div class="ss-dw-sec">' +
          '<div class="ss-dw-sec-hdr"><h3>① 템플릿 선택</h3></div>' +
          buildTplCards() +
        '</div>' +

        /* 2. 기본 정보 */
        '<div class="ss-dw-sec">' +
          '<div class="ss-dw-sec-hdr"><h3>② 기본 정보</h3></div>' +
          '<div class="ss-fgrid">' +
            '<div class="ss-ffield"><label class="ss-flbl">화면명 <span class="ss-req">*</span></label><input id="cs-screen-name" class="ss-inp" value="' + CS.screenName + '" placeholder="화면명 입력"></div>' +
            '<div class="ss-ffield"><label class="ss-flbl">화면 ID</label><input id="cs-screen-id" class="ss-inp ro" value="자동 생성 (SCR-' + (SS_ID_SEQ < 10 ? '0' + SS_ID_SEQ : SS_ID_SEQ) + ')" readonly></div>' +
            '<div class="ss-ffield"><label class="ss-flbl">업무영역</label><input id="cs-biz-area" class="ss-inp" value="' + CS.bizArea + '" placeholder="예: 산출물 관리"></div>' +
            '<div class="ss-ffield"><label class="ss-flbl">화면유형 <span class="ss-req">*</span></label>' +
              '<select id="cs-screen-type" class="ss-inp">' +
                '<option value="list"' + (CS.screenType === 'list' ? ' selected' : '') + '>목록 화면</option>' +
                '<option value="detail"' + (CS.screenType === 'detail' ? ' selected' : '') + '>상세 화면</option>' +
                '<option value="form"' + (CS.screenType === 'form' ? ' selected' : '') + '>폼 화면</option>' +
                '<option value="popup"' + (CS.screenType === 'popup' ? ' selected' : '') + '>팝업</option>' +
                '<option value="admin"' + (CS.screenType === 'admin' ? ' selected' : '') + '>관리 화면</option>' +
                '<option value="main"' + (CS.screenType === 'main' ? ' selected' : '') + '>메인/대시보드</option>' +
              '</select>' +
            '</div>' +
            '<div class="ss-ffield full"><label class="ss-flbl">메뉴 경로 <span class="ss-req">*</span></label><input id="cs-menu-path" class="ss-inp" value="' + CS.menuPath + '" placeholder="예: 산출물 관리 > 화면설계서"></div>' +
            '<div class="ss-ffield full"><label class="ss-flbl">화면 목적</label><textarea id="cs-purpose" class="ss-inp" rows="2" placeholder="이 화면의 목적을 간략히 기술합니다.">' + CS.purpose + '</textarea></div>' +
            '<div class="ss-ffield full"><label class="ss-flbl">작성 메모</label><textarea id="cs-memo" class="ss-inp" rows="2" placeholder="기획·디자인 메모를 남깁니다.">' + CS.memo + '</textarea></div>' +
          '</div>' +
        '</div>' +

        /* 3. 화면 구조 */
        '<div class="ss-dw-sec">' +
          '<div class="ss-dw-sec-hdr"><h3>③ 화면 구조</h3><span class="ss-dw-sec-hdr-note">사용 여부를 켜면 해당 builder가 표시됩니다</span></div>' +
          '<div class="ss-fgrid" style="margin-bottom:12px">' +
            '<div class="ss-ffield"><label class="ss-flbl">화면 제목</label><input id="cs-screen-title" class="ss-inp" value="' + CS.screenTitle + '" placeholder="화면 상단 표시 제목"></div>' +
            '<div class="ss-ffield"><label class="ss-flbl">상단 안내문구</label><input id="cs-top-note" class="ss-inp" value="' + CS.topNote + '" placeholder="선택 입력"></div>' +
          '</div>' +
          buildToggleRows() +
        '</div>' +

        /* 4. 검색 조건 */
        '<div class="ss-dw-sec" id="ss-sec-search">' +
          '<div class="ss-dw-sec-hdr"><h3>④ 검색 조건 항목</h3></div>' +
          buildSearchBuilder() +
        '</div>' +

        /* 5. 테이블 컬럼 */
        '<div class="ss-dw-sec" id="ss-sec-col">' +
          '<div class="ss-dw-sec-hdr"><h3>⑤ 테이블 컬럼 항목</h3></div>' +
          buildColBuilder() +
        '</div>' +

        /* 6. 행 액션 */
        '<div class="ss-dw-sec" id="ss-sec-action">' +
          '<div class="ss-dw-sec-hdr"><h3>⑥ 행 액션 항목</h3></div>' +
          buildActionBuilder() +
        '</div>' +

        /* 7. Description 요약 */
        '<div class="ss-dw-sec">' +
          '<div class="ss-dw-sec-hdr"><h3>⑦ 자동 생성 Description 요약</h3><span class="ss-dw-sec-hdr-note">상세 설명은 미리보기 및 상세 Drawer에서 확인</span></div>' +
          '<div id="ss-desc-summary-wrap">' + buildDescSummary() + '</div>' +
        '</div>' +

        /* 8. 첨부파일 */
        '<div class="ss-dw-sec">' +
          '<div class="ss-dw-sec-hdr"><h3>⑧ 첨부파일 참고자료</h3></div>' +
          '<div class="ss-attach-zone">' +
            '<div class="ss-attach-zone-icon">' + svgIcon('<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>', 28) + '</div>' +
            '<div class="ss-attach-zone-title">참고자료 파일명 입력 또는 드롭</div>' +
            '<div class="ss-attach-zone-sub">PNG, PDF, DOCX, XLSX · 참고용 파일 목록으로 관리됩니다</div>' +
            '<input class="ss-inp" style="max-width:320px;margin-top:4px" placeholder="파일명 직접 입력 (예: 화면설계서_v1.pdf)">' +
          '</div>' +
          '<div class="ss-attach-note">첨부파일은 화면 구조를 대체하지 않고 참고자료로만 사용합니다.</div>' +
        '</div>';
    }

    if (foot) {
      foot.className = 'ss-dw-foot ss-create-foot';
      foot.innerHTML =
        '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary" data-ss-dw-action="close">취소</button>' +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary" data-ss-dw-action="create-draft">임시저장</button>' +
        '<span class="ss-foot-spacer"></span>' +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--ghost" data-ss-dw-action="create-preview">미리보기</button>' +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--primary ss-dw-btn-primary" data-ss-dw-action="create-save">저장</button>' +
        '<button type="button" class="stam-btn stam-btn--md ss-btn-review" data-ss-dw-action="create-review">검토요청</button>';
    }
    enhanceDrawerSelects();
  }

  /* ── Preview Drawer ── */
  function renderPreviewDw() {
    readCSFromForm();
    var tabs = document.getElementById('ss-dw-tabs');
    var head = document.getElementById('ss-dw-head');
    var body = document.getElementById('ss-dw-body');
    var foot = document.getElementById('ss-dw-foot');
    var drawer = document.getElementById('ss-drawer');
    if (tabs) tabs.style.display = 'none';
    if (drawer) drawer.classList.add('is-wide');

    if (head) {
      head.innerHTML =
        '<div class="ss-dw-hrow">' +
          '<span class="ss-dw-mode-badge is-create">미리보기</span>' +
          '<span style="flex:1"></span>' +
          '<button type="button" class="ss-dw-close" data-ss-dw-action="preview-back" aria-label="돌아가기">' + ic(ICONS.close, 15) + '</button>' +
        '</div>' +
        '<div class="ss-dw-htitle">화면설계서 미리보기</div>' +
        '<div class="ss-dw-head-chips">' +
          '<span class="ss-sel-chip">선택 템플릿: ' + CS.templateName + '</span>' +
          '<span class="ss-create-status-chip">현재 입력값 기준</span>' +
          '<span class="ss-create-status-chip">사용함 항목만 자동 재번호</span>' +
          '<span class="ss-create-status-chip">샘플 데이터 아님</span>' +
        '</div>';
    }

    /* Build description items (active only) */
    var descItems = [];
    var n = 1;
    var sName = CS.screenName || '(화면명 미입력)';
    if (CS.screenTitle || true) descItems.push({ n: n++, name: '화면 제목', detail: CS.screenTitle || sName, type: 'title' });
    if (CS.topNote) descItems.push({ n: n++, name: '상단 안내문구', detail: CS.topNote, type: 'note' });
    if (CS.useSearch) {
      descItems.push({ n: n++, name: '검색 조건', detail: CS.searchItems.map(function(i){return i.cond;}).join(', ') || '검색 조건 없음', type: 'search' });
      descItems.push({ n: n++, name: '조회 버튼', detail: '조회 실행', type: 'btn' });
    }
    if (CS.useTable) descItems.push({ n: n++, name: '결과 테이블', detail: CS.tableColumns.map(function(c){return c.name;}).join(', ') || '컬럼 없음', type: 'table' });
    if (CS.useStatusChip) descItems.push({ n: n++, name: '상태 chip', detail: '작성중 / 완료 / 승인 완료', type: 'chip' });
    if (CS.useRowAction) descItems.push({ n: n++, name: '행 액션', detail: CS.rowActions.map(function(a){return a.name;}).join(', ') || '액션 없음', type: 'action' });
    if (CS.useEmpty) descItems.push({ n: n++, name: '빈 결과 상태', detail: '결과 없음 안내 문구 표시', type: 'empty' });

    /* Left: mockup */
    var mockupRows = '';
    descItems.forEach(function(item) {
      if (item.type === 'title') {
        mockupRows += '<div class="ss-mock-section ss-mock-title-bar"><span class="ss-mock-marker">' + item.n + '</span><span class="ss-mock-title">' + (CS.screenTitle || sName) + '</span></div>';
      } else if (item.type === 'note') {
        mockupRows += '<div class="ss-mock-section" style="font-size:11px;color:var(--t3);padding:6px 10px;background:var(--bg-sur2);border-radius:4px;border-left:3px solid var(--brand)"><span class="ss-mock-marker">' + item.n + '</span> ' + CS.topNote + '</div>';
      } else if (item.type === 'search') {
        mockupRows += '<div class="ss-mock-section"><div style="font-size:9px;color:var(--t3);margin-bottom:4px"><span class="ss-mock-marker">' + item.n + '</span> 검색 조건</div>' +
          '<div class="ss-mock-search-row">' +
          CS.searchItems.slice(0, 3).map(function(si) {
            return '<div class="ss-mock-search-inp">' + si.cond + '</div>';
          }).join('') +
          '</div></div>';
      } else if (item.type === 'btn') {
        mockupRows += '<div class="ss-mock-section" style="display:flex;gap:6px"><span class="ss-mock-marker">' + item.n + '</span><div class="ss-mock-btn">조회</div><div class="ss-mock-btn ghost">초기화</div></div>';
      } else if (item.type === 'table') {
        var cols = CS.tableColumns.slice(0, 4);
        mockupRows += '<div class="ss-mock-section"><div style="font-size:9px;color:var(--t3);margin-bottom:4px"><span class="ss-mock-marker">' + item.n + '</span> 결과 테이블</div>' +
          '<table class="ss-mock-table"><thead><tr>' + cols.map(function(c){return '<th>' + c.name + '</th>';}).join('') + (CS.useStatusChip ? '<th>상태</th>' : '') + (CS.useRowAction ? '<th>액션</th>' : '') + '</tr></thead>' +
          '<tbody><tr>' + cols.map(function(){return '<td style="color:var(--t3);font-size:10px">샘플</td>';}).join('') +
          (CS.useStatusChip ? '<td><span class="ss-mock-chip">완료</span></td>' : '') +
          (CS.useRowAction && CS.rowActions[0] ? '<td><span style="font-size:9.5px;color:var(--brand)">' + CS.rowActions[0].name + '</span></td>' : '') +
          '</tr><tr>' + cols.map(function(){return '<td style="color:var(--t3);font-size:10px">샘플</td>';}).join('') +
          (CS.useStatusChip ? '<td><span class="ss-mock-chip" style="background:rgba(100,116,139,.10);color:#64748B">작성중</span></td>' : '') +
          (CS.useRowAction && CS.rowActions[0] ? '<td><span style="font-size:9.5px;color:var(--brand)">' + CS.rowActions[0].name + '</span></td>' : '') +
          '</tr></tbody></table></div>';
      } else if (item.type === 'empty') {
        mockupRows += '<div class="ss-mock-empty"><span class="ss-mock-marker">' + item.n + '</span> 조건에 맞는 결과가 없습니다.</div>';
      }
    });

    if (body) {
      body.innerHTML =
        '<div class="ss-preview-labels">' +
          '<span class="ss-preview-label accent">선택 템플릿: ' + CS.templateName + '</span>' +
          '<span class="ss-preview-label">사용함 항목만 자동 재번호</span>' +
          '<span class="ss-preview-label">숨김/삭제 항목 제외</span>' +
          '<span class="ss-preview-label">샘플 데이터 아님</span>' +
        '</div>' +
        '<div class="ss-preview-layout">' +
          '<div class="ss-preview-mockup">' +
            '<div class="ss-preview-mockup-bar">' +
              '<span class="ss-preview-mockup-title">' + (CS.screenTitle || sName) + '</span>' +
              '<span class="ss-preview-mockup-tag">UI 목업</span>' +
            '</div>' +
            '<div class="ss-preview-mockup-body">' + (mockupRows || '<div class="ss-mock-empty">입력된 구조가 없습니다. 폼을 작성한 뒤 미리보기를 확인하세요.</div>') + '</div>' +
          '</div>' +
          '<div class="ss-preview-desc-panel">' +
            '<div class="ss-preview-desc-hdr">Description (' + descItems.length + '개 항목)</div>' +
            '<div class="ss-preview-desc-list">' +
              descItems.map(function(item) {
                return '<div class="ss-preview-desc-item">' +
                  '<div class="ss-preview-marker">' + item.n + '</div>' +
                  '<div class="ss-preview-desc-content">' +
                    '<div class="ss-preview-desc-name">' + item.name + '</div>' +
                    '<div class="ss-preview-desc-detail">' + item.detail + '</div>' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>';
    }

    if (foot) {
      foot.className = 'ss-dw-foot ss-create-foot';
      foot.innerHTML =
        '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary" data-ss-dw-action="preview-back">작성 계속</button>' +
        '<span class="ss-foot-spacer"></span>' +
        (CS.savedId
          ? '<button type="button" class="stam-btn stam-btn--md stam-btn--ghost" data-ss-dw-action="preview-detail">저장된 상세 보기</button>'
          : '') +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--primary ss-dw-btn-primary" data-ss-dw-action="create-save">저장</button>' +
        '<button type="button" class="stam-btn stam-btn--md" data-ss-dw-action="close">닫기</button>';
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
        '<div class="ss-ffield"><label class="ss-flbl">화면명 <span class="ss-req">*</span></label><input class="ss-inp" value="' + d.name + '"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl">화면 유형</label><select class="ss-inp"><option>' + (TYP[d.type] ? TYP[d.type].lbl : d.type) + '</option></select></div>' +
        '<div class="ss-ffield"><label class="ss-flbl">담당자</label><input class="ss-inp" value="' + d.owner + '"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl">버전</label><input class="ss-inp" value="' + d.ver + '"></div>' +
        '<div class="ss-ffield full"><label class="ss-flbl">화면 목적</label><textarea class="ss-inp" rows="3">' + d.purp + '</textarea></div></div></div>' +
        '<div class="ss-fs"><div class="ss-fs-hdr"><span class="ss-fs-num">2</span><span class="ss-fs-title">상태 정보</span></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl">작성 상태</label><select class="ss-inp"><option' + (d.wst === 'writing' ? ' selected' : '') + '>작성중</option><option' + (d.wst === 'complete' ? ' selected' : '') + '>작성완료</option></select></div>' +
        '<div class="ss-ffield"><label class="ss-flbl">검토 상태</label><input class="ss-inp ro" value="' + (RST[d.rst] ? RST[d.rst].lbl : '-') + '" readonly></div></div></div>' +
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
        '<label class="ss-flbl">변경 사유</label><textarea class="ss-inp" rows="3" placeholder="이번 수정의 변경 사유를 간략히 기술합니다."></textarea>' +
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
        '<div class="ss-ffield full"><label class="ss-flbl">검토자 <span class="ss-req">*</span></label>' +
        '<select class="ss-inp"><option value="">검토자 선택</option><option>박PM</option><option>김기획</option><option>이UX</option><option>최개발</option></select>' +
        '<span class="ss-helper">검토 완료 시 알림이 발송됩니다.</span></div></div></div>' +
        '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>요청 메시지</h3></div><div class="ss-ffield"><label class="ss-flbl">메시지</label>' +
        '<textarea class="ss-inp" rows="4" placeholder="검토 요청 메시지를 입력합니다."></textarea></div></div>' +
        '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>마감일</h3></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl">마감일</label><input type="date" class="ss-inp" value="2026-06-18"></div>' +
        '<div class="ss-ffield"><label class="ss-flbl">우선순위</label><select class="ss-inp"><option>보통</option><option>높음</option><option>긴급</option></select></div></div></div>' +
        '<div class="ss-dw-sec"><div class="ss-dw-sec-hdr"><h3>관련 버전</h3></div><div class="ss-fgrid">' +
        '<div class="ss-ffield"><label class="ss-flbl">검토 버전</label><input class="ss-inp ro" value="' + d.ver + '" readonly></div>' +
        '<div class="ss-ffield"><label class="ss-flbl">작성 상태</label><input class="ss-inp ro" value="' + (WST[d.wst] ? WST[d.wst].lbl : '-') + '" readonly></div></div></div>';
    }
    if (foot) {
      foot.innerHTML = '<button type="button" class="stam-btn stam-btn--md stam-btn--secondary" data-ss-dw-action="close">취소</button>' +
        '<span style="flex:1"></span>' +
        '<button type="button" class="stam-btn stam-btn--md stam-btn--primary ss-dw-btn-primary" data-ss-dw-action="reviewreq">검토 요청</button>';
    }
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
    var filterBtn = document.getElementById('ss-filter-btn');
    if (filterBtn) filterBtn.addEventListener('click', toggleFilter);

    document.querySelectorAll('.ss-filter-pop-opts').forEach(function (grp) {
      grp.addEventListener('click', function (e) {
        var btn = e.target.closest('.ss-fopt');
        if (!btn) return;
        grp.querySelectorAll('.ss-fopt').forEach(function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
        updateFilterInfo();
      });
    });

    var fpop = document.getElementById('ss-fpop');
    if (fpop) {
      fpop.addEventListener('click', function (e) {
        var action = e.target.closest('[data-ss-filter-action]');
        if (!action) return;
        var act = action.getAttribute('data-ss-filter-action');
        if (act === 'reset') resetFilter();
        else if (act === 'apply') applyFilter();
      });
    }

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.ss-filter-wrap')) closeFilter();
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
      if (row) openDetail(row.getAttribute('data-id'));
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

  function mockSave() {
    readCSFromForm();
    var newId = 'SCR-0' + (SS_ID_SEQ++);
    var typeKey = CS.screenType || 'list';
    var newScreen = {
      id: newId,
      name: CS.screenName || '(이름 없음)',
      ver: 'v0.1',
      wst: CS.status === 'review-requested' ? 'complete' : 'writing',
      rst: CS.status === 'review-requested' ? 'pending' : 'none',
      ast: 'none',
      type: typeKey,
      menu: CS.menuPath || '미지정',
      owner: '작성자',
      av: '나',
      ac: '#5451E8',
      upd: '2026-06-14',
      hasImg: false,
      annots: 0,
      purp: CS.purpose || '화면 목적 미입력',
      acts: CS.rowActions.map(function(a) { return { n: a.name, loc: '행', act: a.condition }; }),
      links: { req: [], art: [], work: [], ifc: [], fn: [] },
      hist: [{ k: 'create', who: '나', at: '06-14', t: '최초 등록', n: 'v0.1' }],
      template: CS.template,
      templateName: CS.templateName
    };
    /* 산출물 관리 그룹에 추가 */
    var grp = MENUS.filter(function(g) { return g.id === 'G-03'; })[0];
    if (grp) grp.screens.push(newScreen);
    ALL_SCREENS.push(newScreen);
    CS.savedId = newId;
    return newScreen;
  }

  function initDrawer() {
    var scrim = document.getElementById('ss-dw-scrim');
    if (scrim) scrim.addEventListener('click', closeDw);

    var drawer = document.getElementById('ss-drawer');
    if (!drawer) return;

    /* Template card selection (event delegation on drawer) */
    drawer.addEventListener('click', function (e) {
      /* template card */
      var tplBtn = e.target.closest('[data-ss-tpl]');
      if (tplBtn && (S.dwMode === 'register')) {
        var tplId = tplBtn.getAttribute('data-ss-tpl');
        readCSFromForm();
        resetCS(tplId);
        renderRegister();
        return;
      }

      /* builder add */
      var builderAdd = e.target.closest('[data-ss-builder-add]');
      if (builderAdd) {
        var bType = builderAdd.getAttribute('data-ss-builder-add');
        readCSFromForm();
        if (bType === 'search') CS.searchItems.push({ cond: '', inputType: 'text', required: false, defaultVal: '', order: CS.searchItems.length + 1 });
        else if (bType === 'col') CS.tableColumns.push({ name: '', key: '', visible: true, sortable: false, width: '120px' });
        else if (bType === 'action') CS.rowActions.push({ name: '', style: 'ghost', link: '', permission: '전체', condition: '항상' });
        renderRegister();
        return;
      }

      /* builder delete */
      var sbDel = e.target.closest('[data-sb-del]');
      if (sbDel) {
        readCSFromForm();
        var idx = parseInt(sbDel.getAttribute('data-sb-del'), 10);
        CS.searchItems.splice(idx, 1);
        renderRegister();
        return;
      }
      var cbDel = e.target.closest('[data-cb-del]');
      if (cbDel) {
        readCSFromForm();
        var idx = parseInt(cbDel.getAttribute('data-cb-del'), 10);
        CS.tableColumns.splice(idx, 1);
        renderRegister();
        return;
      }
      var abDel = e.target.closest('[data-ab-del]');
      if (abDel) {
        readCSFromForm();
        var idx = parseInt(abDel.getAttribute('data-ab-del'), 10);
        CS.rowActions.splice(idx, 1);
        renderRegister();
        return;
      }

      /* tab */
      var tabBtn = e.target.closest('[data-ss-tab]');
      if (tabBtn) {
        setTab(parseInt(tabBtn.getAttribute('data-ss-tab'), 10));
        return;
      }

      /* action buttons */
      var actionBtn = e.target.closest('[data-ss-dw-action]');
      if (!actionBtn) return;
      var act = actionBtn.getAttribute('data-ss-dw-action');

      if (act === 'close') { closeDw(); }
      else if (act === 'edit') { openEdit(); }
      else if (act === 'reviewreq') { openReviewReq(); }
      else if (act === 'detail-back' && S.dwItem) { openDetail(S.dwItem.id); }
      else if (act === 'fullview') {
        var page = actionBtn.getAttribute('data-ss-fullview-page');
        if (page) window.location.href = page;
      }
      /* Create Drawer actions */
      else if (act === 'create-draft') {
        readCSFromForm();
        CS.status = 'draft-saved';
        updateCreateHeaderChips();
      }
      else if (act === 'create-preview') {
        S.dwMode = 'preview';
        renderPreviewDw();
      }
      else if (act === 'create-save') {
        var saved = mockSave();
        closeDw();
        renderStrip();
        renderTable();
        /* open detail of newly saved screen */
        setTimeout(function() { openDetail(saved.id); }, 50);
      }
      else if (act === 'create-review') {
        readCSFromForm();
        CS.status = 'review-requested';
        var saved2 = mockSave();
        closeDw();
        renderStrip();
        renderTable();
        setTimeout(function() { openDetail(saved2.id); }, 50);
      }
      /* Preview actions */
      else if (act === 'preview-back') {
        S.dwMode = 'register';
        renderRegister();
      }
      else if (act === 'preview-detail') {
        if (CS.savedId) { closeDw(); setTimeout(function(){ openDetail(CS.savedId); }, 50); }
      }
    });

    /* Toggle switches */
    drawer.addEventListener('change', function(e) {
      var toggle = e.target.closest('[data-ss-toggle]');
      if (toggle && S.dwMode === 'register') {
        readCSFromForm();
        var key = toggle.getAttribute('data-ss-toggle');
        CS[key] = toggle.checked;
        /* rebuild relevant builder sections */
        var secSearch = document.getElementById('ss-sec-search');
        var secCol = document.getElementById('ss-sec-col');
        var secAction = document.getElementById('ss-sec-action');
        var descWrap = document.getElementById('ss-desc-summary-wrap');
        if (secSearch) secSearch.innerHTML = '<div class="ss-dw-sec-hdr"><h3>④ 검색 조건 항목</h3></div>' + buildSearchBuilder();
        if (secCol) secCol.innerHTML = '<div class="ss-dw-sec-hdr"><h3>⑤ 테이블 컬럼 항목</h3></div>' + buildColBuilder();
        if (secAction) secAction.innerHTML = '<div class="ss-dw-sec-hdr"><h3>⑥ 행 액션 항목</h3></div>' + buildActionBuilder();
        if (descWrap) descWrap.innerHTML = buildDescSummary();
        enhanceDrawerSelects();
        return;
      }
    });
  }

  function initRegisterBtn() {
    var regBtn = document.getElementById('ss-reg-btn');
    if (regBtn) regBtn.addEventListener('click', openRegister);
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
    updateFilterBtn();
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
    initEscapeKey();
    initCustomSelect();
    initAll();
  });

}());
