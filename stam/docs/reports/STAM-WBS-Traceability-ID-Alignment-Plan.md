# STAM WBS Traceability ID Alignment Plan

- 작성일: 2026-06-13
- 기준 커밋: `b84b8a4` (main)
- 관련 PR: #44, #45, #47
- 상태: 설계 문서 — 구현 미착수

---

## 1. 현재 문제 요약

### 1-1. WORK-XXX / WBS-XXX ID 네임스페이스 불일치

화면설계서 JS(`stam.screen-specification.js`)는 `WORK_MAP`을 통해 연결 작업을 `WORK-001 ~ WORK-010` ID로 관리한다.  
WBS 보드(`wbs.html`)는 실제 작업 행을 `WBS-001 ~ WBS-017` ID로 관리한다.  
두 시스템은 **공통 키가 없어 직접 연결 불가**한 상태다.

### 1-2. 화면설계서 `links.work`가 실제 WBS row를 가리키지 못함

15개 화면의 `links.work` 배열은 `WORK-XXX` 값을 참조하지만, WBS 보드에는 `WBS-XXX` 행만 존재한다.  
`links.work` → `WORK_MAP` 경로는 내부적으로 정합하나, **WBS 보드와 실제 연결 경로가 없다**.

### 1-3. WBS 관련 화면설계 컬럼이 SCR ID 기반이 아님

WBS 보드 테이블의 `.wbs-col-scr`(관련 화면설계) 컬럼:

- WBS-006: 텍스트 `"guide"` (SCR ID 아님)
- WBS-007: 텍스트 `"wbs"` (SCR ID 아님)
- WBS-008 ~ WBS-017: 모두 공백(`—`)

`SCR-XXX` 형식의 ID 체계가 미도입되어 **추적성 체인의 SCR → WBS 연결 방향이 동작하지 않는다**.

### 1-4. WBS Drawer는 empty state 구조만 갖춘 전 단계

PR #47 merge로 Drawer 연결정보의 mock(`wbs.html`, `WBS 화면 설계서`)이 제거되었다.  
현재는 `renderLinkedRequirements(null)` / `renderLinkedScreens(null)` 이 empty state만 반환하는 상태다.  
`data-req` / `data-scr` 속성 부재로 **실제 연결 렌더링 전 단계**다.

---

## 2. 최종 기준

| 항목 | 결정 |
|------|------|
| 실제 작업 단위 | WBS 보드의 `WBS-XXX` |
| `WORK-XXX` | mock ID — 후속 구현에서 `WBS-XXX` 기준으로 전환 |
| `links.work` 필드명 | 당장 유지 가능 (필드명 변경 시 렌더 함수 전체 수정 필요) |
| `links.work` 값 | `WORK-XXX` → `WBS-XXX` 참조로 교체 |
| `WORK_MAP` | → `WBS_MAP` 또는 WBS 참조 맵으로 전환 |
| 추적성 체인 | `REQ → MSC → FN → SCR → WBS` |

---

## 3. WORK_MAP → WBS 매핑 후보

현재 `WORK_MAP` 8개 항목과 WBS 보드 17개 행의 의미론적 매핑 분석.

| 기존 WORK ID | 기존 WORK 이름 | 대응 가능한 WBS ID | WBS 작업명 | 매핑 판단 | 비고 |
|------------|------------|-------------|---------|-------|--|
| WORK-001 | 인증 화면 UI 구현 | — | — | **대응 WBS 없음** | WBS 보드에 인증/로그인 관련 작업 행 없음 |
| WORK-003 | 요구사항 목록 UI 구현 | WBS-010 | 요구사항정의서 목록 화면 준비 | **검토 필요** | 의미 유사, "UI 구현"과 "화면 준비" 범위 차이 |
| WORK-005 | 작업 목록 화면 구현 | WBS-007 | WBS 목록 화면 기준 설계 | **검토 필요** | "작업 목록"이 WBS 목록을 의미하면 가능, 단 설계 vs 구현 구분 필요 |
| WORK-006 | 메뉴구조 화면 설계 | WBS-002 | IA 구조 확정 및 메뉴 기준 수립 | **검토 필요** | 메뉴구조 설계 맥락 유사, 범위·단계가 상이함 |
| WORK-007 | 보내기 팝업 구현 | — | — | **대응 WBS 없음** | WBS 보드에 팝업/내보내기 관련 작업 행 없음 |
| WORK-008 | 화면설계서 목록 UI 구현 | WBS-011 | 화면설계서 목록 화면 설계 | **매핑 가능** | 의미 일치, 설계/구현 단계 구분은 필요 |
| WORK-009 | Drawer 패턴 정의 및 구현 | WBS-009 | WBS Drawer 상세 설계 | **검토 필요** | "Drawer 패턴 전반" vs "WBS Drawer 한정" 범위 차이 |
| WORK-010 | 검토 관리 화면 구현 | — | — | **대응 WBS 없음** | WBS 보드에 검토 관리 관련 작업 행 없음 |

**요약:**

| 판단 | 항목 수 | WORK ID |
|------|---------|---------|
| 매핑 가능 | 1 | WORK-008 |
| 검토 필요 | 4 | WORK-003, 005, 006, 009 |
| 대응 WBS 없음 | 3 | WORK-001, 007, 010 |

---

## 4. `links.work` 변경 후보

현재 `links.work` 값과 WBS ID 기준 교체 후보.

| SCR ID | 화면명 | 현재 links.work | 변경 후보 | 판단 | 비고 |
|--------|-----|-------------|-----|--|--|
| SCR-001 | 대시보드 | WORK-001 | — | **보류** | 대응 WBS 없음 (WORK-001) |
| SCR-002 | 회원가입 | WORK-001 | — | **보류** | 대응 WBS 없음 (WORK-001) |
| SCR-003 | 로그인 / 인증 | WORK-001 | — | **보류** | 대응 WBS 없음 (WORK-001) |
| SCR-004 | 마이페이지 | (없음) | — | — | 변경 불필요 |
| SCR-005 | 요구사항정의서 목록 | WORK-003 | **WBS-010** 후보 | 검토 필요 | 요구사항정의서 목록 화면 준비 |
| SCR-006 | 메뉴구조 / 화면목록 | WORK-006 | **WBS-002** 후보 | 검토 필요 | IA 구조 확정 및 메뉴 기준 수립 |
| SCR-007 | WBS 작업 | WORK-005 | **WBS-007** 후보 | 검토 필요 | WBS 목록 화면 기준 설계 |
| SCR-008 | 화면설계서 목록 | WORK-008 | **WBS-011** | 매핑 가능 | 화면설계서 목록 화면 설계 |
| SCR-009 | 화면설계서 상세 | WORK-009 | **WBS-009** 후보 | 검토 필요 | WBS Drawer vs 전체 Drawer 범위 차이 |
| SCR-010 | 화면설계서 등록 | WORK-009 | **WBS-009** 후보 | 검토 필요 | 동일 |
| SCR-011 | 화면설계서 수정 | WORK-009 | **WBS-009** 후보 | 검토 필요 | 동일 |
| SCR-012 | 검토 요청 현황 | WORK-010 | — | **보류** | 대응 WBS 없음 (WORK-010) |
| SCR-013 | 검토 요청 결과 | (없음) | — | — | 변경 불필요 |
| SCR-014 | 산출물보내기 | WORK-007 | — | **보류** | 대응 WBS 없음 (WORK-007) |
| SCR-015 | 프로젝트 구성원 관리 | WORK-006 | **WBS-002** 후보 | 검토 필요 | SCR-006과 동일 후보 |

**요약:**

| 판단 | SCR 수 |
|------|--------|
| 매핑 가능 (즉시 교체 권장) | 1 (SCR-008) |
| 검토 필요 (승인 후 교체) | 7 (SCR-005~007, 009~011, 015) |
| 보류 (대응 WBS 없음) | 5 (SCR-001~003, 012, 014) |
| 변경 불필요 | 2 (SCR-004, 013) |

---

## 5. 대응 WBS가 없는 WORK 항목 처리안

`WORK-001`(인증), `WORK-007`(보내기 팝업), `WORK-010`(검토 관리)은 WBS 보드에 대응 행이 없다.  
이를 참조하는 SCR은 SCR-001~003(WORK-001), SCR-014(WORK-007), SCR-012(WORK-010)이다.

### A안: `links.work` 값 제거 또는 보류 처리

대응 WBS가 없는 항목은 `links.work: []`로 비우고, WBS 행이 생기면 추후 추가한다.

### B안: 신규 WBS 작업 행 추가

WBS 보드에 `WBS-018`(인증 화면), `WBS-019`(보내기 팝업), `WBS-020`(검토 관리) 등을 추가하고 연결한다.

| 안 | 장점 | 단점 | 위험도 | 추천 여부 |
|----|------|------|--------|-----------|
| A안 | 코드 변경 최소, 구조 단순 유지 | 연결 데이터 손실, empty state 노출 | 낮음 | **권장** |
| B안 | 추적성 체인 완성도 높음 | WBS 보드 HTML 수정 필요, 작업 범위 확대 | 중간 | 2차 구현으로 보류 |

**결론: A안 권장.** 대응 WBS가 없는 항목은 `links.work: []`로 정리하고, 실제 WBS 행이 추가될 때 연결을 보강한다.

---

## 6. 최소 구현안

아래 순서로 최소 범위만 구현한다.

1. **화면설계서 `WORK_MAP` → WBS 참조 맵 전환**
   - `WORK_MAP` 키를 `WBS-XXX`로 교체
   - 매핑 가능한 항목만 교체, 나머지는 항목 제거
   - 변수명은 `WBS_MAP`으로 변경 또는 `WORK_MAP` 유지하되 값만 WBS ID 기준으로 교체

2. **`links.work` 값 교체 (매핑 가능/검토 완료 항목만)**
   - SCR-008: `WORK-008` → `WBS-011`
   - 검토 필요 항목(SCR-005, 006, 007, 009~011, 015): 확인 후 교체
   - 보류 항목(SCR-001~003, 012, 014): `[]`로 비움

3. **대응 WBS 없는 WORK 제거** (A안 적용)
   - `WORK-001`, `WORK-007`, `WORK-010` 참조 화면 → `links.work: []`

4. **WBS HTML 관련 화면설계 컬럼 SCR ID 정리 (별도 PR)**
   - `.wbs-col-scr` 셀 값을 `data-scr="SCR-XXX"` 속성 기반으로 정리
   - 현재 텍스트 chip("guide", "wbs")을 SCR ID chip으로 교체

5. **WBS Drawer 동적 연결 렌더링 (별도 PR)**
   - `renderLinkedScreens(row)`가 `data-scr` 속성을 읽어 SCR chip 렌더링
   - SCR_MAP(MENUS 배열 참조) 연동

---

## 7. PR 분리 제안

| PR | 수정 대상 | 내용 | 의존성 |
|----|-----------|------|--------|
| PR 1 | `stam/js/stam.screen-specification.js` | `WORK_MAP` → WBS 참조 맵 전환, `links.work` 값 교체 | 없음 |
| PR 2 | `stam/pages/boards/wbs.html` | WBS row에 `data-scr="SCR-XXX"` 속성 추가, `.wbs-col-scr` chip 교체 | PR 1 확인 후 |
| PR 3 | `stam/js/stam.wbs.js` | `renderLinkedScreens(row)` SCR_MAP 연동, WBS Drawer 동적 렌더링 | PR 2 완료 후 |
| PR 4 | `stam/docs/` 또는 별도 화면 | Traceability Matrix 문서/화면 생성 | PR 1~3 완료 후 |
| 별도 PR | `stam/js/stam.wbs.js` | `buildFvDetailHtml_UNUSED()` dead code 제거 | 독립 (우선순위 낮음) |

---

## 8. 리스크

| 리스크 | 영향 범위 | 대응 방법 |
|--------|-----------|-----------|
| 화면설계서 상세 연결정보 탭 표시 영향 | `WORK_MAP` 키 변경 시 `tabLinks()` 렌더 함수가 빈 결과 반환 가능 | 함수 내 map 참조를 WBS_MAP으로 동시 교체 |
| `WORK_MAP` 이름 변경 시 기존 렌더 함수 참조 깨짐 | `tabLinks()` secs 배열의 `map: WORK_MAP` 참조 | 변수명 변경 시 secs 배열도 동시 수정 |
| WBS HTML이 legacy-special-board 구조라 컬럼 변경 시 깨짐 가능성 | `.wbs-col-scr` 셀 구조 변경 시 CSS 컬럼 폭/정렬 영향 | 기존 chip CSS 재사용, 컬럼 폭 변경 최소화 |
| WBS 목록 가로 스크롤 영향 | SCR ID chip 추가 시 컬럼 폭 증가 가능 | 기존 `wbs-link-chip` 스타일 재사용으로 최소화 |
| empty state 노출 UX | mock 제거 후 실제 연결 전까지 `연결된 화면설계 없음` 상시 표시 | 현재 acceptable — PR 3 완료 시 해소 |
| staging QA 기준 차이 | `links.work` 값 변경 후 화면설계서 Drawer 연결정보 탭 표시 변경 | PR 1 이후 staging QA 필수 |

---

## 부록 A: 현재 WBS 보드 전체 행 목록

| WBS ID | 작업명 | 그룹 | 상태 | 관련 화면설계(현재) |
|--------|--------|------|------|-------------------|
| WBS-001 | 프로젝트 기준본 정리 | 기준본/IA | 완료 | — |
| WBS-002 | IA 구조 확정 및 메뉴 기준 수립 | 기준본/IA | 완료 | — |
| WBS-003 | App Shell 레이아웃 설계 | App Shell | 완료 | — |
| WBS-004 | Left Navigation 기준 고정 | App Shell | 완료 | — |
| WBS-005 | Light/Dark 스크롤바 기준 통일 | App Shell | 완료 | — |
| WBS-006 | UI Baseline Guide 작성 | WBS 화면 | 완료 | "guide" (텍스트) |
| WBS-007 | WBS 목록 화면 기준 설계 | WBS 화면 | 지연 | "wbs" (텍스트) |
| WBS-008 | Gantt Timeline Preview 구성 | WBS 화면 | 진행중 | — |
| WBS-009 | WBS Drawer 상세 설계 | WBS 화면 | 대기 | — |
| WBS-010 | 요구사항정의서 목록 화면 준비 | 산출물 게시판 | 대기 | — |
| WBS-011 | 화면설계서 목록 화면 설계 | 산출물 게시판 | 대기 | — |
| WBS-012 | 공통 게시판 패턴 정의 | 산출물 게시판 | 대기 | — |
| WBS-013 | 테스트케이스 목록 화면 설계 | 테스트/검수 | 대기 | — |
| WBS-014 | 결함 관리 화면 설계 | 테스트/검수 | 대기 | — |
| WBS-015 | UAT 검수 시나리오 작성 | 테스트/검수 | 대기 | — |
| WBS-016 | 오픈 시나리오 작성 | 오픈 준비 | 보류 | — |
| WBS-017 | 납품 패키지 구성 | 오픈 준비 | 보류 | — |

## 부록 B: 현재 WORK_MAP 전체

| WORK ID | 이름 | 상태 | 참조 SCR |
|---------|------|------|---------|
| WORK-001 | 인증 화면 UI 구현 | done | SCR-001, 002, 003 |
| WORK-003 | 요구사항 목록 UI 구현 | done | SCR-005 |
| WORK-005 | 작업 목록 화면 구현 | done | SCR-007 |
| WORK-006 | 메뉴구조 화면 설계 | review | SCR-006, 015 |
| WORK-007 | 보내기 팝업 구현 | done | SCR-014 |
| WORK-008 | 화면설계서 목록 UI 구현 | review | SCR-008 |
| WORK-009 | Drawer 패턴 정의 및 구현 | draft | SCR-009, 010, 011 |
| WORK-010 | 검토 관리 화면 구현 | draft | SCR-012 |
