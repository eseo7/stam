/* ============================================================
 * STAM Nav Data — 서비스 루트 6개 + 프로젝트 내부 58개
 * IA Baseline v3.3 | 2026-06-07
 * ============================================================ */
(function () {
  'use strict';

  /* ─── 서비스 루트 6개 ─── */
  var rootItems = [
    { id: 'R1', type: 'root', n: '로그인',           s: '로그인 화면',      cols: 6,  phase: 1, tier: 1 },
    { id: 'R2', type: 'root', n: '최초 프로필 설정', s: '프로필 설정 화면', cols: 6,  phase: 1, tier: 2 },
    { id: 'R3', type: 'root', n: '내 구독 현황',     s: '내 구독 목록',     cols: 8,  phase: 1, tier: 2 },
    { id: 'R4', type: 'root', n: '내 프로젝트 목록', s: '프로젝트 목록',    cols: 8,  phase: 1, tier: 1 },
    { id: 'R5', type: 'root', n: '즐겨찾는 프로젝트',s: '즐겨찾기 목록',   cols: 5,  phase: 1, tier: 3 },
    { id: 'R6', type: 'root', n: '초대받은 프로젝트',s: '초대 목록',        cols: 6,  phase: 1, tier: 3 },
  ];

  /* 서비스 루트 — 컬럼 상세 포함 (루트 카드 렌더링용) */
  var rootMenusFull = [
    { n: '로그인',           s: '로그인 화면',      cols: ['이메일','로그인 방식','초대 상태','계정 상태','비밀번호 재설정','MFA'] },
    { n: '최초 프로필 설정', s: '프로필 설정 화면', cols: ['이름','표시 이름','회사/소속','직무/역할','프로필 이미지','알림 기본 설정'] },
    { n: '내 구독 현황',     s: '내 구독 목록',     cols: ['구독명','구독자/회사','플랜','상태','프로젝트 수','멤버 수','저장공간 사용량','갱신일/만료일'] },
    { n: '내 프로젝트 목록', s: '프로젝트 목록',    cols: ['프로젝트명','고객사','상태','단계','내 역할','최근 변경일','미처리 승인','내 업무 수'] },
    { n: '즐겨찾는 프로젝트',s: '즐겨찾기 목록',   cols: ['프로젝트명','상태','최근 접속일','미처리 건','내 역할'] },
    { n: '초대받은 프로젝트',s: '초대 목록',        cols: ['프로젝트명','초대한 사람','초대 권한','초대일','만료일','수락 상태'] },
  ];

  /* ─── 프로젝트 내부 그룹 7개 ─── */
  var groups = [
    { id: 'A', name: '대시보드',       count: 6 },
    { id: 'B', name: '산출물 관리',    count: 12 },
    { id: 'C', name: '테스트/품질',    count: 8 },
    { id: 'D', name: '협업/검토/승인', count: 8 },
    { id: 'E', name: '내보내기/납품',  count: 7 },
    { id: 'F', name: '관리/설정',      count: 11 },
    { id: 'G', name: '마이페이지',     count: 6 },
  ];

  /* ─── 프로젝트 내부 메뉴 58개 ─── */
  /* colStr: 핵심 컬럼 (쉼표 구분 문자열) | cols: 컬럼 수 */
  /* phase: 1=Phase 1 Core, 2=Later Phase */
  var menus = [
    /* A — 대시보드 (6) */
    { id:'A1', g:'A', n:'Project Overview',    s:'프로젝트 오버뷰 대시보드', colStr:'전체 산출물 진행률,승인 대기,리스크/Gate,최근 변경,내 업무,주요 마일스톤',    cols:6,  phase:1, tier:1, href:'pages/dashboard/project-overview.html' },
    { id:'A2', g:'A', n:'My Work',             s:'내 업무 목록',             colStr:'업무명,유형,상태,마감일,관련 산출물,요청자,우선순위',                           cols:7,  phase:1, tier:1 },
    { id:'A3', g:'A', n:'Recent Updates',      s:'최근 변경 목록',           colStr:'변경 대상,변경 유형,변경자,변경일,영향 범위,관련 산출물',                       cols:6,  phase:2 },
    { id:'A4', g:'A', n:'Approval Summary',   s:'승인 요약 목록',           colStr:'산출물,요청자,승인자,상태,요청일,지연 여부',                                    cols:6,  phase:1, tier:2 },
    { id:'A5', g:'A', n:'Risk & Gate',         s:'리스크/Gate 목록',         colStr:'Gate명,상태,담당자,영향 범위,해결 예정일,우선순위',                             cols:6,  phase:2 },
    { id:'A6', g:'A', n:'Project Timeline',    s:'프로젝트 타임라인',        colStr:'단계,시작일,종료일,진행률,주요 마일스톤,지연 여부',                             cols:6,  phase:2 },
    /* B — 산출물 관리 (12) */
    { id:'B1',  g:'B', n:'요구사항정의서',       s:'요구사항 목록',         colStr:'요구사항 ID,제목,구분,우선순위,상태,담당자,관련 화면,승인 상태',                   cols:8,  phase:1, tier:1, href:'pages/boards/requirements.html' },
    { id:'B2',  g:'B', n:'메뉴구조/화면목록',    s:'화면 목록',             colStr:'화면 ID,화면명,LV1,LV2,화면 유형,FO/BO,상태,담당자',                            cols:8,  phase:1, tier:1, href:'pages/boards/menu-screen-list.html' },
    { id:'B3',  g:'B', n:'WBS 작업',            s:'WBS 목록',               colStr:'WBS ID,작업명,메뉴/기능 그룹,산출물 유형,담당자,시작일,종료일,진행 상태,지연 여부',cols:9,  phase:1, tier:1, href:'pages/boards/wbs.html' },
    { id:'B4',  g:'B', n:'화면설계서',          s:'화면설계 목록',          colStr:'화면 ID,화면명,버전,작성 상태,검토 상태,승인 상태,최종 수정일',                   cols:7,  phase:1, tier:1, href:'pages/boards/screen-specification.html' },
    { id:'B5',  g:'B', n:'기능정의서',          s:'기능 목록',              colStr:'기능 ID,기능명,관련 화면,처리 유형,상태,API 연결,담당자',                         cols:7,  phase:1, tier:2, href:'pages/boards/functional-specification.html' },
    { id:'B6',  g:'B', n:'프로그램 목록정의서', s:'프로그램 목록',          colStr:'프로그램 ID,프로그램명,화면 ID,모듈,유형,개발 상태,담당자',                       cols:7,  phase:1, tier:2 },
    { id:'B7',  g:'B', n:'API 명세서',          s:'API 목록',               colStr:'API ID,API명,Method,Endpoint,관련 기능,인증,상태',                               cols:7,  phase:1, tier:1 },
    { id:'B8',  g:'B', n:'테이블 정의서',       s:'테이블 목록',            colStr:'테이블 ID,논리명,물리명,DB,Schema,컬럼 수,PK,사용 화면,상태',                    cols:9,  phase:1, tier:1 },
    { id:'B9',  g:'B', n:'DB 정보',             s:'DB 정보 목록',           colStr:'DB ID,환경,DBMS,DB명,Host/Endpoint(마스킹),Schema,연결 서버,담당자,공개범위,상태',cols:10, phase:1, tier:2 },
    { id:'B10', g:'B', n:'서버 정보',           s:'서버 정보 목록',         colStr:'서버 ID,환경,서버명,서버 구분,Domain/IP,용도,연결 DB,담당자,공개범위,상태',       cols:10, phase:1, tier:2 },
    { id:'B11', g:'B', n:'접근/보안 정보',      s:'접근/보안 정보 목록',    colStr:'보안정보 ID,유형,이름,연결 대상,환경,공개범위,원문 보관 방식,열람 정책,만료일,Rotation 상태,마지막 열람,상태', cols:12, phase:1, tier:2 },
    { id:'B12', g:'B', n:'정책정의서',          s:'정책 목록',              colStr:'정책 ID,정책명,구분,적용 화면,상태,검토자,승인 상태',                             cols:7,  phase:1, tier:2 },
    /* C — 테스트/품질 (8) */
    { id:'C1', g:'C', n:'테스트케이스',         s:'테스트케이스 목록',      colStr:'TC ID,제목,관련 요구사항,관련 화면,유형,상태,담당자',                            cols:7,  phase:1, tier:1 },
    { id:'C2', g:'C', n:'단위테스트',           s:'단위테스트 목록',        colStr:'테스트 ID,기능명,담당자,결과,결함 수,실행일',                                    cols:6,  phase:1, tier:2 },
    { id:'C3', g:'C', n:'통합테스트',           s:'통합테스트 목록',        colStr:'시나리오 ID,시나리오명,관련 화면,결과,이슈,실행일',                              cols:6,  phase:1, tier:2 },
    { id:'C4', g:'C', n:'UAT / 사용자 검수',   s:'UAT 목록',               colStr:'검수 ID,고객 담당자,화면/기능,결과,보완 요청,검수일',                            cols:6,  phase:1, tier:2 },
    { id:'C5', g:'C', n:'테스트 결과 대시보드', s:'테스트 결과 대시보드',   colStr:'테스트 구분,전체 건수,성공,실패,보류,결함 전환,실행률',                          cols:7,  phase:2 },
    { id:'C6', g:'C', n:'결함 대시보드',        s:'결함 대시보드',          colStr:'전체 결함 수,접수/수정중/완료/재검증/종료/보류,심각도별,담당자별,평균 처리일,종료율', cols:6, phase:2 },
    { id:'C7', g:'C', n:'결함관리',             s:'결함 목록',              colStr:'결함 ID,제목,심각도,우선순위,상태,담당자,관련 테스트,관련 화면,재오픈 여부',      cols:9,  phase:1, tier:1 },
    { id:'C8', g:'C', n:'오픈 시나리오',        s:'오픈 시나리오 목록',     colStr:'시나리오 ID,오픈 단계,시나리오명,대상 시스템,담당자,고객 확인자,예정일시,소요시간,준비 상태,리스크,롤백 여부,Go/No-Go,최종 확인일', cols:13, phase:2 },
    /* D — 협업/검토/승인 (8) */
    { id:'D1', g:'D', n:'검토 요청',  s:'검토 요청 목록',  colStr:'요청 ID,산출물,요청자,검토자,상태,요청일,마감일',          cols:7, phase:1, tier:1 },
    { id:'D2', g:'D', n:'승인 요청',  s:'승인 요청 목록',  colStr:'승인 ID,산출물,승인자,상태,요청일,승인/반려일',            cols:6, phase:1, tier:1 },
    { id:'D3', g:'D', n:'승인 이력',  s:'승인 이력 목록',  colStr:'산출물,버전,승인자,결과,의견,처리일',                      cols:6, phase:1, tier:2 },
    { id:'D4', g:'D', n:'댓글/의견',  s:'댓글 목록',       colStr:'대상 산출물,작성자,댓글 유형,상태,작성일',                 cols:5, phase:2 },
    { id:'D5', g:'D', n:'멘션',       s:'멘션 목록',       colStr:'멘션 대상,호출자,대상자,상태,작성일',                      cols:5, phase:2 },
    { id:'D6', g:'D', n:'변경이력',   s:'변경이력 목록',   colStr:'대상,변경 항목,변경 전/후,변경자,변경일',                  cols:5, phase:2 },
    { id:'D7', g:'D', n:'공지사항',   s:'공지 목록',       colStr:'제목,작성자,중요도,노출 범위,등록일',                      cols:5, phase:1, tier:2 },
    { id:'D8', g:'D', n:'회의록',     s:'회의록 목록',     colStr:'회의명,일시,참석자,안건,액션아이템,작성자',                 cols:6, phase:1, tier:2 },
    /* E — 내보내기/납품 (7) */
    { id:'E1', g:'E', n:'내보내기 요청',         s:'Export 요청 목록',         colStr:'요청 ID,산출물 유형,포맷,요청자,상태,생성일',               cols:6, phase:1, tier:2 },
    { id:'E2', g:'E', n:'산출물 패키지',         s:'납품 패키지 목록',         colStr:'패키지명,포함 산출물,대상 고객,버전,상태',                  cols:5, phase:2 },
    { id:'E3', g:'E', n:'고객 공유 링크',        s:'공유 링크 목록',           colStr:'링크명,대상 산출물,공개범위,만료일,접근 수',                cols:5, phase:2 },
    { id:'E4', g:'E', n:'납품 이력',             s:'납품 이력 목록',           colStr:'납품명,고객사,버전,납품일,승인 상태',                       cols:5, phase:2 },
    { id:'E5', g:'E', n:'Markdown Export',       s:'Markdown 내보내기 목록',   colStr:'산출물,파일명,생성자,생성일,상태',                          cols:5, phase:2 },
    { id:'E6', g:'E', n:'PDF/Word/Excel Export', s:'문서 내보내기 목록',       colStr:'산출물,포맷,템플릿,생성자,생성일',                          cols:5, phase:2 },
    { id:'E7', g:'E', n:'매뉴얼 자동 생성',     s:'매뉴얼 생성 목록',         colStr:'매뉴얼 유형,대상 화면,자동 생성률,보완 상태,포맷',          cols:5, phase:2 },
    /* F — 관리/설정 (11) */
    { id:'F1',  g:'F', n:'멤버 관리',       s:'멤버 목록',          colStr:'이름,이메일,소속,역할,프로젝트 권한,초대 상태',            cols:6, phase:1, tier:1 },
    { id:'F2',  g:'F', n:'초대 관리',       s:'초대 목록',          colStr:'이메일,초대한 사람,권한,상태,만료일',                      cols:5, phase:1, tier:2 },
    { id:'F3',  g:'F', n:'산출물 접근권한', s:'접근권한 목록',      colStr:'대상 산출물,공개범위,열람자,편집자,승인자,예외 공유',      cols:6, phase:2 },
    { id:'F4',  g:'F', n:'역할/권한 관리',  s:'역할 목록',          colStr:'역할명,권한 수,적용 멤버,설명',                            cols:4, phase:1, tier:3 },
    { id:'F5',  g:'F', n:'게시판 설정',     s:'게시판 목록',        colStr:'게시판명,산출물 유형,사용 여부,커스텀 필드 수',            cols:4, phase:2 },
    { id:'F6',  g:'F', n:'커스텀 필드',     s:'필드 목록',          colStr:'필드명,입력 타입,필수 여부,사용 게시판,정렬',              cols:5, phase:2 },
    { id:'F7',  g:'F', n:'상태값 관리',     s:'상태값 목록',        colStr:'상태명,적용 대상,색상,순서,사용 여부',                     cols:5, phase:2 },
    { id:'F8',  g:'F', n:'알림 설정',       s:'알림 규칙 목록',     colStr:'이벤트,수신자,채널,사용 여부',                             cols:4, phase:2 },
    { id:'F9',  g:'F', n:'프로젝트 설정',   s:'프로젝트 설정 화면', colStr:'프로젝트명,고객사,단계,시작일,종료일,기본 공개범위',      cols:6, phase:1, tier:2 },
    { id:'F10', g:'F', n:'구독 사용량',     s:'사용량 목록',        colStr:'프로젝트 수,멤버 수,저장공간,Export 수,한도,사용률',      cols:6, phase:2 },
    { id:'F11', g:'F', n:'감사로그',        s:'감사로그 목록',      colStr:'이벤트,사용자,대상,일시,IP/환경,결과',                     cols:6, phase:2 },
    /* G — 마이페이지 (6) */
    { id:'G1', g:'G', n:'내 프로필',      s:'프로필 화면',        colStr:'이름,표시 이름,회사/소속,역할,프로필 이미지',             cols:5, phase:1, tier:2 },
    { id:'G2', g:'G', n:'내 알림',        s:'알림 목록',          colStr:'알림 유형,대상,상태,발생일',                               cols:4, phase:1, tier:2 },
    { id:'G3', g:'G', n:'내 승인 대기',   s:'내 승인 목록',       colStr:'산출물,요청자,마감일,상태',                                cols:4, phase:1, tier:2 },
    { id:'G4', g:'G', n:'내 댓글/멘션',   s:'내 멘션 목록',       colStr:'대상 산출물,댓글,호출자,상태',                             cols:4, phase:2 },
    { id:'G5', g:'G', n:'내 프로젝트',    s:'내 프로젝트 목록',   colStr:'프로젝트명,내 역할,최근 접속,미처리 건',                   cols:4, phase:1, tier:2 },
    { id:'G6', g:'G', n:'계정 설정',      s:'계정 설정 화면',     colStr:'이메일,로그인 방식,보안 설정,MFA 설정',                    cols:4, phase:2 },
  ];

  window.STAM = window.STAM || {};
  window.STAM.data = {
    rootItems:     rootItems,
    rootMenusFull: rootMenusFull,
    groups:        groups,
    menus:         menus,
  };
}());
