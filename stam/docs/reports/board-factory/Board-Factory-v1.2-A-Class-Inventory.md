# Board Factory v1.2 — A-Class Inventory (r2)

> 실사 보고서 · docs-only · 구현 PR 아님
> 대상: STAM A-class 1차 후보 3개 게시판
> 작성 기준: r2 (코드 실측 · 추정 금지)
> 선행: PR #134 merge 완료 main 기준

---

## Gate-0. 작업 트리 / 브랜치 / repo-relative path 정렬

| 항목 | 기대값 | 실측 | 판정 |
| --- | --- | --- | --- |
| repo root | `stam-qa` (repo root) | repo root = clone root, 하위에 `stam/` 모듈 디렉터리 존재 | PASS |
| remote | `https://github.com/eseo7/stam.git` | `origin` → eseo7/stam (proxy 경유) | PASS |
| 선행 PR | PR #134 merge/deploy | HEAD = `refactor(board): align button variant tokens (#134)` | PASS |
| 기준 파일 1 | `stam/pages/boards/functional-specification.html` | 존재 (786 lines) | PASS |
| 기준 파일 2 | `stam/pages/boards/menu-screen-list.html` | 존재 (776 lines) | PASS |
| 기준 파일 3 | `stam/pages/boards/requirements.html` | 존재 (930 lines) | PASS |

- 본 문서의 모든 근거는 **repo-relative path**로만 작성한다.
  - 좋은 예: `stam/pages/boards/requirements.html:L231`
  - 나쁜 예: `D:\vibe_coding\STAM\stam-qa\stam\pages\boards\requirements.html:231`, `stam-qa/stam/...`
- 주의: 작업 지시서의 일부 경로(`stam/css/stam.board.css`, `stam/js/stam.board-factory.js` 등)는 실제 존재하지 않거나 본 PR에서 생성 금지 대상이다. 실제 공통 CSS는 `stam/css/stam.board-layout.css`, `stam.board-toolbar.css`, `stam.board-filter.css`, `stam.drawer.css`, `stam.table-selection.css`, `stam.custom-select.css`로 분리되어 있다.

---

## 0. 사용법 / 판정 규칙

- **A 유지**: 기존 골격이 공통 Factory config로 1:1 표현 가능. custom slot ≤ 3, non-built-in cell renderer 미과다, 표준 data/reference contract로 흡수 가능.
- **B 격상**: slot 과다 / custom cell 과다 / tree·expand 필수 / reference 해석 불명확 등 Stop-Criteria 1개 이상 충돌. config로는 표현되나 추가 slot 필요.
- **C 제외 (Special App)**: split editor, canvas, Gantt/timeline, custom state machine 등 list-first 모델 자체가 부적합.
- 각 셀의 근거는 `파일:Lxxx` 또는 `파일:Lxxx-Lyyy`.
- "UI Mock"은 화면 요소는 존재하나 실제 동작(필터링/검색/저장)이 코드에 미구현인 상태를 의미한다.

판정 요약 (상세는 §12):

| 화면 | 판정 | 핵심 사유 |
| --- | --- | --- |
| 기능정의서 | **A 유지** | 표준 골격 · 단, 연결화면 저장값(label) 정규화 과제 |
| 메뉴구조/화면목록 | **A 유지** | LV는 flat column(indent-in-cell) — tree 아님 |
| 요구사항정의서 | **A 유지 (조건부)** | 검토/수용/승인 built-in detail section 흡수 가능해야 함 + 보통/중간 vocab 결함 선결 |

---

## 1. 대상 화면

| # | 화면 | HTML | JS | 전용 CSS | navRender code |
| --- | --- | --- | --- | --- | --- |
| 1 | 기능정의서 | `stam/pages/boards/functional-specification.html` | `stam/js/stam.functional-specification.js` | `stam/css/stam.functional-specification.css` | `B5` (`...functional-specification.js:L142`) |
| 2 | 메뉴구조/화면목록 | `stam/pages/boards/menu-screen-list.html` | `stam/js/stam.menu-screen-list.js` | `stam/css/stam.menu-screen-list.css` | `B2` (`...menu-screen-list.js:L130`) |
| 3 | 요구사항정의서 | `stam/pages/boards/requirements.html` | `stam/js/stam.requirements.js` | `stam/css/stam.requirements.css` | `B1` (`...requirements.js:L132`) |

공통 prefix: 기능정의서 `fn-`, 메뉴구조 `msl-`, 요구사항 `rq-`.

---

## 2. 화면 구조 비교

골격 블록 단위로 3개 화면을 비교한다. ✅=존재, ➖=미존재.

| 블록 | 기능정의서 | 메뉴구조/화면목록 | 요구사항정의서 |
| --- | --- | --- | --- |
| 상단 컨텍스트 (`data-stam-project-context`) | ✅ `:L39-49` | ✅ `:L38-48` | ✅ `:L38-48` |
| Topbar (`data-stam-topbar`) | ✅ `:L27-31` | ✅ `:L26-30` | ✅ `:L26-30` |
| 좌측 nav (`data-stam-left-nav`) | ✅ `:L35` | ✅ `:L34` | ✅ `:L34` |
| Board Header (`stam-board-header`) | ✅ `:L54-69` | ✅ `:L53-68` | ✅ `:L53-68` |
| Summary Strip | ✅ `:L72-113` | ✅ `:L71-112` | ✅ `:L71-112` |
| Toolbar / Search / Filter / Delete | ✅ `:L116-147` | ✅ `:L115-146` | ✅ `:L115-146` |
| 선택형 Table (`stam-select-table` + `data-stam-board-list`) | ✅ `:L152` | ✅ `:L151` | ✅ `:L151` |
| Pagination (`stam-board-pagination`) | ✅ `:L293-301` | ✅ `:L342-346` | ✅ `:L336-346` |
| Register Drawer | ✅ `#fn-dw-register :L309` | ✅ `#msl-dw-register :L356` | ✅ `#rq-dw-register :L354` |
| Detail Drawer | ✅ `#fn-dw-detail :L460` | ✅ `#msl-dw-detail :L520` | ✅ `#rq-dw-detail :L535` |
| Edit Drawer | ✅ `#fn-dw-edit :L614` | ✅ `#msl-dw-edit :L618` | ✅ `#rq-dw-edit :L717` |
| Drawer Footer (`stam-drawer-foot`) | ✅ `:L440,L600,L749` | ✅ `:L500,L602,L742` | ✅ `:L515,L703,L893` |
| Empty / Loading / Error state | ⚠️ 부분 (연결 empty-link만) `:L530?` | ⚠️ 부분 (`msl-empty-link :L476`, `미연결/미작성` chip `:L237,L275`) | ⚠️ 부분 (`rq-empty-link :L463`) |
| Dark mode | ✅ `data-theme` + 토큰 기반 (전용 CSS / `stam.tokens.css`) | ✅ 동일 | ✅ 동일 |

관찰:
- 3개 모두 **동일 골격**(상단 컨텍스트 → 헤더 → summary → toolbar → select table → pagination → register/detail/edit drawer → drawer footer). A-class 후보로서 골격 동질성 확인.
- **명시적 Loading/Error state는 어느 화면에도 없음.** 데이터가 정적 HTML이므로 빈/로딩/오류 상태가 미설계. → Factory는 `empty/loading/error` 상태 슬롯을 built-in으로 제공해야 함(현재는 결함이 아니라 미설계 영역).

### 2-1. Summary Strip 지표 분해

| 화면 | 지표 셀 | meta 행 | 근거 |
| --- | --- | --- | --- |
| 기능정의서 | 전체(5) · 작성중(2) · 검토중(1) · 승인완료(1) · 보류(1) · 연결요구사항(5) · 연결화면(3) | 높음 우선순위 2건 · 이번주 등록 3건 · 미연결 요구사항 0건 | `:L72-113` |
| 메뉴구조 | 전체(38) · 작성중(12) · 검토중(9) · 확정(15) · 보류(2) · 미연결 요구사항(8) · 미작성 화면설계서(14) | FO 31건 · BO 7건 · 이번주 등록 5건 | `:L71-112` |
| 요구사항 | 전체(24) · 작성중(7) · 검토중(5) · 승인완료(10) · 보류(2) · 연결화면(18) · 연결WBS(12) | 높음 우선순위 8건 · 미연결 6건 · 이번주 등록 3건 | `:L71-112` |

관찰:
- summary 숫자는 **현재 페이지 행 수로 산출 불가**. 예: 요구사항 전체=24지만 렌더된 행은 7 (`stam/pages/boards/requirements.html:L335`). 기능정의서 전체=5인데 "연결요구사항=5/연결화면=3"은 행 집계가 아닌 도메인 facet.
- summary strip은 정적 하드코딩이며 list query와 무관. → **Factory에서는 `dataSource.summary(query)` 계약이 필요**(§8 결론).
- summary 라벨 vocab(검토중)과 status chip vocab(검토요청/검토완료/확정)이 불일치 (§9 참조).

### 2-2. Detail Hydration 방식

| 화면 | detail drawer 인스턴스 | row → detail 바인딩 | 행에 없는 상세 데이터 |
| --- | --- | --- | --- |
| 기능정의서 | 단일 고정 `#fn-dw-detail` (항상 FN-001 표시) | `onRowActivate: openDrawer('detail')` `...functional-specification.js:L65` | 기능설명/입력조건/처리규칙/예외처리/API/변경이력 `:L546-597` |
| 메뉴구조 | 단일 고정 `#msl-dw-detail` (항상 SCR-001) | `...menu-screen-list.js:L64` | 연결카드 상세/변경이력/담당자 이름 `:L559-599` |
| 요구사항 | 단일 고정 `#rq-dw-detail` (항상 REQ-001) | `...requirements.js:L64` | 배경/상세요구사항/수용조건/연결카드/검토이력/변경이력 `:L596-699` |

관찰:
- detail drawer는 **클릭한 행과 무관하게 항상 동일한 정적 인스턴스**를 연다. row 데이터로 hydration하지 않음.
- detail 본문은 list row가 보유하지 않는 필드(설명·이력·수용조건 등)를 포함. → **v2에서 `dataSource.get(id)` 호출로 detail hydration 필수** (§7 결론).
- 즉, list row만으로 detail 표현 **불가능** → `get(id)` 계약 필요.

---

## 3. 컬럼 비교

판정 규칙: renderer가 공통 모듈이 그리는 게 아니라 모두 **정적 HTML 셀**이므로, 아래 renderer 열은 "v2 built-in renderer 매핑 후보"를 의미한다. `sortable`/`filterable`은 현재 DOM 기준 — **세 화면 모두 컬럼 정렬 UI/핸들러 없음 → sortable=No**.

### 3-1. 기능정의서 (9 컬럼) — `stam/pages/boards/functional-specification.html:L153-176`

| # | key(추정) | label | valueType | renderer(후보) | width | sortable | filterable | built-in |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `_select` | (체크박스) | bool | checkbox | 40px | No | No | ✅ |
| 2 | `idName` | 기능 ID / 기능명 | id+text | idName | min220 | No | (검색) | ✅ |
| 3 | `linkedReq` | 연결 요구사항 | relation(REQ) | relationChip | 100px | No | No | ✅ |
| 4 | `linkedScreen` | 연결 화면 | relation(label!) | relationChip | 130px | No | filter | ⚠️ (저장값 label) |
| 5 | `fnType` | 기능유형 | enum | typeChip | 80px | No | filter | ✅ |
| 6 | `priority` | 우선순위 | enum | priorityChip | 76px | No | filter | ✅ |
| 7 | `status` | 상태 | enum | statusChip | 88px | No | filter | ✅ |
| 8 | `assignee` | 담당자 | user(name) | user/avatar | 80px | No | filter | ⚠️ (name string) |
| 9 | `updatedAt` | 최종 수정일 | date | date | 100px | No | No | ✅ |

### 3-2. 메뉴구조/화면목록 (10 컬럼) — `stam/pages/boards/menu-screen-list.html:L152-176`

| # | key | label | valueType | renderer | width | sortable | filterable | built-in |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `_select` | (체크박스) | bool | checkbox | 40px | No | No | ✅ |
| 2 | `idName` | 화면 ID / 화면명 | id+text | idName | min200 | No | (검색) | ✅ |
| 3 | `lv1` | LV1 | text | text | 110px | No | filter | ✅ |
| 4 | `lv2` | LV2 | text | text | 110px | No | No | ✅ |
| 5 | `screenType` | 화면유형 | enum | typeChip | 80px | No | filter | ✅ |
| 6 | `foBo` | FO/BO | enum | typeChip(변형) | 60px | No | filter | ✅ |
| 7 | `linkedReq` | 연결 요구사항 | relation(REQ, multi) | relationChip | 130px | No | No | ✅ |
| 8 | `linkedScreenSpec` | 연결 화면설계서 | relation(SCR) | relationChip | 130px | No | No | ✅ |
| 9 | `status` | 상태 | enum | statusChip | 76px | No | filter | ✅ |
| 10 | `updatedAt` | 최종 수정일 | date | date | 96px | No | No | ✅ |

- LV1/LV2가 **별도 flat column** (`:L189-190` `msl-lv-text`). indent/tree 위젯 아님 → §11-1 참조.
- 연결 요구사항이 **multi chip** (SCR-001 행: REQ-001 + REQ-002 `:L194-197`).

### 3-3. 요구사항정의서 (9 컬럼) — `stam/pages/boards/requirements.html:L152-174`

| # | key | label | valueType | renderer | width | sortable | filterable | built-in |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `_select` | (체크박스) | bool | checkbox | 40px | No | No | ✅ |
| 2 | `idName` | 요구사항 ID / 요구사항명 | id+text | idName | min240 | No | (검색) | ✅ |
| 3 | `reqType` | 유형 | enum | typeChip | 80px | No | filter | ✅ |
| 4 | `priority` | 우선순위 | enum | priorityChip | 76px | No | filter | ⚠️ vocab 결함 |
| 5 | `status` | 상태 | enum | statusChip | 88px | No | filter | ✅ |
| 6 | `assignee` | 담당자 | user(name) | user/avatar | 80px | No | filter | ⚠️ name string |
| 7 | `linkedScreenSpec` | 연결 화면설계서 | relation(SCR) | relationChip | 130px | No | No | ✅ |
| 8 | `linkedWbs` | 연결 WBS | relation(WBS) | relationChip | 130px | No | No | ✅ |
| 9 | `updatedAt` | 최종 수정일 | date | date | 100px | No | No | ✅ |

### 3-4. 컬럼 종합

| 항목 | 기능정의서 | 메뉴구조 | 요구사항 |
| --- | --- | --- | --- |
| 컬럼 개수 | 9 | 10 | 9 |
| non-built-in custom cell 수 | 0 (단 linkedScreen 저장값 이슈) | 0 | 0 |
| relation 컬럼 | 2 (REQ id, 화면 label) | 2 (REQ id multi, SCR id) | 2 (SCR id, WBS id) |
| user 컬럼 | 1 (name) | 0 (table엔 없음) | 1 (name) |

→ 세 화면 컬럼 모두 **built-in renderer registry로 흡수 가능** (custom cell 0). Stop-Criteria "custom cell 과다" 미충돌.

---

## 4. 필터 비교

세 화면 모두 공통 `window.STAM.boardFilter.init(...)` 사용 + `onApply`가 **UI Mock**(실제 행 필터 미구현).

| 항목 | 기능정의서 `...functional-specification.js:L147-165` | 메뉴구조 `...menu-screen-list.js:L135-152` | 요구사항 `...requirements.js:L137-154` |
| --- | --- | --- | --- |
| 필터 그룹 수 | 5 | 4 | 4 |
| keyword (검색) | ✅ 실제 동작 (client-side) | ⚠️ UI Mock (핸들러 없음) | ⚠️ UI Mock (핸들러 없음) |
| status | 작성중·검토요청·검토완료·승인완료·보류 | 작성중·검토중·확정·보류 | 작성중·검토요청·검토완료·승인완료·보류 |
| type/유형 | `fn-type` 8종 | `screen-type` 8종 | `type` 기능·화면·데이터·정책 (4종) |
| 기타 필터 | priority, linked-scr, assignee | lv1, fo-bo | priority, assignee |
| `onApply` 동작 | UI Mock (`:L161-163`) | UI Mock (`:L148-150`) | UI Mock (`:L150-152`) |

핵심 결함 발견:
- **요구사항 type 필터 불완전**: 필터 옵션은 `기능/화면/데이터/정책` 4종 (`...requirements.js:L146`)인데, 등록 select는 `기능/화면/데이터/권한/연동/정책/비기능` 7종 (`stam/pages/boards/requirements.html:L385-392`), 테이블에는 `권한`(`:L274`)·`연동`(`:L296`)·`비기능`(`:L318`) 행이 존재. → 필터로는 절대 잡히지 않는 유형 존재.
- **요구사항 priority 필터 vocab 불일치**: §9 / §0 참조 (필터 `중간` vs 표시·저장 `보통`).

### 4-1. 검색 대상 필드 / 필터 적용 규칙

| 화면 | 검색 placeholder | 실제 검색 대상 | query.filters 적용 |
| --- | --- | --- | --- |
| 기능정의서 | "기능 ID · 기능명 · 담당자 검색" `:L121` | **row.textContent 전체** 부분일치 (`...functional-specification.js:L131-137`) | 미적용 (onApply mock) |
| 메뉴구조 | "화면 ID · 화면명 · 담당자 검색" `:L120` | (검색 input에 `id` 없음 → JS 미연결) | 미적용 |
| 요구사항 | "요구사항 ID · 요구사항명 · 담당자 검색" `:L120` | (검색 input에 `id` 없음 → JS 미연결) | 미적용 |

관찰:
- 기능정의서만 검색이 실제 동작하나, 대상이 "지정 필드(ID/이름/담당자)"가 아니라 **행 전체 텍스트**라 placeholder 의도와 불일치.
- 메뉴구조·요구사항 검색은 input만 존재, 핸들러 없음 → UI Mock.
- 어떤 화면도 `query.filters`를 실제 row 필터에 반영하지 않음. → **Factory에서 keyword/filters → list(query) 적용 규칙을 신규로 정의**해야 함(기존엔 없음).

---

## 5. 드로워 필드 비교

노출 표기: R=register, D=detail, E=edit.

### 5-1. 기능정의서 드로워 필드 — register `:L325-438`, detail `:L485-598`, edit `:L630-747`

| key | label | field type | valueType | card. | required | default | validation | R/D/E | renderer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fnId | 기능 ID | readonly input | id | 1 | - | 자동(FN-006) | - | R E (D infoGrid) | text/ro |
| fnType | 기능유형 | select(custom) | enum | 1 | ✅ `:L338` | - | enum | R E D | typeChip |
| fnName | 기능명 | input | text | 1 | ✅ `:L352` | - | non-empty | R E (D title) | text |
| priority | 우선순위 | select | enum | 1 | ✅ `:L356` | - | enum(높음/중간/낮음) | R E D | priorityChip |
| status | 상태 | select | enum | 1 | - | 작성중 | enum | R E D | statusChip |
| assignee | 담당자 | input(text!) | user | 1 | - | - | - | R E D | user/avatar |
| linkedReq | 연결 요구사항 | input(text!) | relation(REQ) | 1 | - | - | - | R E (D card) | relationCards |
| linkedScreen | 연결 화면 | select(label) | relation(label) | 1 | - | - | - | R E (D card) | relationCards |
| desc/input/rule/exc/api/remark | 기능 내용 6필드 | textarea/input | text | 1 | - | - | - | R E (D textBlock) | textBlock |

### 5-2. 메뉴구조 드로워 필드 — register `:L369-499`, detail `:L540-599`, edit `:L631-741`

| key | label | field type | valueType | card. | required | default | R/D/E | renderer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scrId | 화면 ID | readonly input | id | 1 | ✅(표기) | 자동 | R E D | text/ro |
| foBo | FO/BO | select | enum | 1 | ✅ `:L384` | - | R E D | typeChip |
| scrName | 화면명 | input | text | 1 | ✅ `:L392` | - | R E D | text |
| screenType | 화면유형 | select | enum | 1 | ✅ `:L396` | - | R E D | typeChip |
| status | 상태 | select | enum | 1 | - | 작성중 | R E D | statusChip |
| lv1 | LV1 | select | enum | 1 | - | - | R E D | text |
| lv2 | LV2 | input(text) | text | 1 | - | - | R E D | text |
| lv3 | LV3 | input(text) | text | 1 | - | - | R E | text |
| assignee | 담당자 | input(text!) | user | 1 | - | - | R E D | user/avatar |
| linkedReq | 연결 요구사항 | chips + add btn | relation(REQ) | N | - | - | R E D | relationCards |
| linkedScreenSpec | 연결 화면설계서 | chips/empty + add | relation(SCR) | N | - | - | R D | relationCards |
| remark | 비고 | textarea | text | 1 | - | - | R | textBlock |

### 5-3. 요구사항 드로워 필드 — register `:L370-513`, detail `:L561-700`, edit `:L733-890`

| key | label | field type | valueType | card. | required | default | R/D/E | renderer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqId | 요구사항 ID | readonly input | id | 1 | - | 자동(REQ-025) | R E D | text/ro |
| reqType | 유형 | select | enum | 1 | ✅ `:L383` | - | R E D | typeChip |
| reqName | 요구사항명 | input | text | 1 | ✅ `:L396` | - | R E D | text |
| priority | 우선순위 | select | enum | 1 | ✅ `:L400` | - | (높음/**보통**/낮음) | R E D | priorityChip |
| status | 상태 | select | enum | 1 | - | 작성중 | R E D | statusChip |
| assignee | 담당자 | input(text!) | user | 1 | - | - | R E D | user/avatar |
| background | 배경 | textarea | text | 1 | ✅ `:L433` | - | R E D | textBlock |
| detailReq | 상세 요구사항 | textarea | text | 1 | ✅ `:L437` | - | R E D | textBlock |
| acceptance | 수용 조건 | textarea(줄바꿈→항목) | text[] | N | - | - | R E D | acceptanceList |
| linkedScreenSpec | 연결 화면설계서 | card/empty + add/rm | relation(SCR) | N | - | - | R E D | relationCards |
| linkedWbs | 연결 WBS | card/empty + add/rm | relation(WBS) | N | - | - | R E D | relationCards |
| menuPath | 관련 메뉴 경로 | input(text) | text | 1 | - | - | R E D | text |
| reviewer | 검토자 | input(text!) | user | 1 | - | - | R E D | user/avatar |
| approvalStatus | 승인 상태 | select | enum | 1 | - | 미승인 | R E D | approvalStatus |
| reviewMemo | 검토 메모 | textarea | text | 1 | - | - | R E D | textBlock |
| (detail) reviewHistory | 검토 이력 | (읽기전용 list) | object[] | N | - | - | D | reviewList |
| (detail) changeHistory | 변경 이력 | (읽기전용 list) | object[] | N | - | - | D | historyList |

관찰:
- 모든 relation/user 입력이 **자유 텍스트 input 또는 label select** — id 기반 reference picker 없음 (§7).
- register/edit/detail 필드 집합이 화면마다 일관 (drawer 예외 적음) → Stop-Criteria "drawer 예외 과다" 미충돌.
- 요구사항이 가장 필드가 많고(검토자/승인상태/검토메모/검토이력) detail section도 가장 많음 → built-in detail section 흡수 가능 여부가 A 유지 조건(§11, §13).

---

## 6. Field Type 사용 매핑

| field type | 기능정의서 | 메뉴구조 | 요구사항 |
| --- | --- | --- | --- |
| readonly id | ✅ | ✅ | ✅ |
| text input | ✅ | ✅ | ✅ |
| textarea | ✅ (6) | ✅ (1) | ✅ (4) |
| select(enum) | ✅ | ✅ | ✅ |
| custom-select(SSOT) | ✅ (`fn-sel`) | ✅ (`msl-inp`) | ✅ (`rq-inp`) |
| relation chips + add | ➖ (text/select) | ✅ | ✅ |
| relation card + remove | ➖ | ➖ | ✅ (`:L833`) |
| user(name string) | ✅ | ✅ | ✅ |
| acceptance list (줄바꿈) | ➖ | ➖ | ✅ |

### 6-1. Built-in Renderer Registry (실측 → 후보 매핑)

세 화면에서 실제 사용된 셀 표현을 묶으면 아래 built-in column renderer로 전부 흡수된다.

| renderer | 사용처 | 비고 |
| --- | --- | --- |
| `checkbox` | 전 화면 1열 | `stam-check` + `data-stam-check-all` |
| `idName` | 전 화면 2열 | id(강조) + name 2-line |
| `text` | LV1/LV2, 메뉴경로 등 | 단순 텍스트 |
| `date` | 최종 수정일 | `updatedAt` |
| `chip` | (base) | 색상 variant 기반 |
| `priorityChip` | fn/rq 우선순위 | 높음/중간(보통)/낮음 |
| `statusChip` | 전 화면 상태 | vocab 화면별 상이 (§9) |
| `typeChip` | fn 기능유형 / msl 화면유형·FO/BO / rq 유형 | |
| `user/avatar` | 담당자 (이니셜 + 이름) | |
| `relationChip` | REQ/SCR/WBS chip (단일·multi) | |
| `link` | (미사용, 예약) | 외부 라우팅용 후보 |
| `actionButtons` | (행 단위 미사용; toolbar/footer에 존재) | |

→ **non-built-in custom renderer = 0**. 전 화면 컬럼이 12종 built-in 후보로 흡수됨.

### 6-2. Built-in Detail Section Registry (실측 → 후보 매핑)

| detail section | 기능정의서 | 메뉴구조 | 요구사항 |
| --- | --- | --- | --- |
| `infoGrid` | ✅ `:L490-517` | ✅ `:L546-555` | ✅ `:L566-593` |
| `textBlock` | ✅ 기능내용 `:L548-571` | ➖ | ✅ 배경/상세 `:L598-608` |
| `relationCards` | ✅ `:L525-542` | ✅ `:L563-574` | ✅ `:L625-643` |
| `historyList` (변경이력) | ✅ `:L582-595` | ✅ `:L579-598` | ✅ `:L679-698` |
| `reviewList` (검토이력) | ➖ | ➖ | ✅ `:L650-671` |
| `acceptanceList` (수용조건) | ➖ | ➖ | ✅ `:L612-617` |
| `approvalStatus` | ➖ | ➖ | ✅ (승인상태 필드 `:L500-505`) |
| `attachmentList` | ➖ | ➖ | ➖ (예약) |

→ 요구사항이 `reviewList`/`acceptanceList`/`approvalStatus` 3개 추가 섹션을 요구. 이들이 built-in detail section으로 등재되면 요구사항도 A 유지 가능(§13).

---

## 7. relation / user 참조 점검

| 참조 | 화면 | 실제 표시 | 행 내 보유? | id vs label |
| --- | --- | --- | --- | --- |
| REQ-* | fn (`:L187`), msl (`:L195`), — | chip 텍스트 | ✅ 행에 id 문자열 | **id** (good) |
| SCR-* | msl (`:L199`), rq (`:L195`) | chip | ✅ | **id** (good) |
| WBS-* | rq (`:L196`) | chip | ✅ | **id** (good) |
| 연결 화면(기능정의서) | fn (`:L188,L210,L254`) | "요구사항정의서" 등 화면 **이름** | ✅ 라벨만 | **label** ⚠️ |
| 담당자 | fn/rq 행, 3화면 drawer | "김철수"·이니셜 | ✅ 이름 문자열 | **이름 문자열** ⚠️ (userId 없음) |
| 검토자 | rq drawer (`:L496,L875`) | "이수연" | drawer만 | **이름 문자열** ⚠️ |

핵심 발견:
1. **기능정의서 연결 화면 저장값 이슈**: `linkedReq`는 `REQ-001`(id)인데 `linkedScreen`은 화면 **이름 라벨**("요구사항정의서", "메뉴구조/화면목록", "기능정의서")로 저장됨 (`stam/pages/boards/functional-specification.html:L188,L210,L232,L254,L276`; edit select `:L704-709`). 다른 화면의 SCR-*/REQ-* id 참조와 불일치. → **`라벨 → id` 후속 매핑 과제**.
2. **user는 전 화면 이름 문자열만 존재, userId 없음**. avatar는 이름 첫 글자 (`:L194 김`). → **이름 → userId 후속 매핑 과제**.

### 7-1. referenceSource 정의 (현 상태 → v2 계약)

- 현재: 후보 목록이 **static 하드코딩**. 예) fn 연결화면 select 옵션 `요구사항정의서/메뉴구조·화면목록/화면설계서/WBS` (`...functional-specification.js:L158` 및 HTML select `:L394-400`), 담당자 필터 옵션 `김철수/이영희/박지수` (`...functional-specification.js:L159`).
- v2: `referenceSource.listOptions(type, query)` / `resolve(type, ids)` 계약으로 치환 (Architecture 문서 참조). reference type = `requirement | screen | screenSpec | wbs | user`.

---

## 8. Action 비교

| action | 기능정의서 | 메뉴구조 | 요구사항 | 핸들러 |
| --- | --- | --- | --- | --- |
| 내보내기 | ✅ `:L60` | ✅ `:L59` | ✅ `:L59` | 미구현(정적 버튼) |
| 등록(register open) | ✅ `#fn-reg-btn :L64` | ✅ `#msl-reg-btn :L63` | ✅ `#rq-reg-btn :L63` | `openDrawer('register')` |
| 삭제(bulk) | ✅ `#fn-del-btn` | ✅ `#msl-del-btn` | ✅ `#rq-del-btn` | `STAMBoardList` 카운트만, 실제 삭제 미구현 |
| row → detail | ✅ | ✅ | ✅ | `onRowActivate` |
| detail → edit | ✅ `data-fn-open="edit"` | ✅ `data-msl-open="edit"` | ✅ `data-rq-open="edit"` | `openDrawer('edit')` |
| 임시저장 | ✅ | ✅ | ✅ | 미구현 |
| 저장/등록 commit | ✅ | ✅ | ✅ | 미구현 |
| 전체 보기 | ✅ | ✅ | ✅ | 미구현 |
| 연결 추가 | ➖(text입력) | ✅ `msl-link-add` | ✅ `rq-link-add` | 미구현 |
| 연결 해제 | ➖ | ➖ | ✅ `rq-linked-card-rm :L833` | 미구현 |

관찰: 저장/삭제/내보내기/연결은 모두 **미구현(정적)**. STAMBoardList는 선택/활성/삭제카운트 UI만 담당하고 실제 저장 로직 없음 (`stam/js/stam.board-list.js:L27` 계약 명시). → Factory data contract는 신규 layer (기존 저장 로직 동결).

---

## 9. Chip / Status 비교 + vocab 정규화

### 9-1. priority (우선순위)

| 화면 | 표시(table/drawer) | 필터 chip | CSS class | 정합성 |
| --- | --- | --- | --- | --- |
| 기능정의서 | 높음/**중간**/낮음 (`:L190,L234,L278`) | 높음/중간/낮음 | `fn-chip-high/mid/low` | ✅ 일치 |
| 요구사항 | 높음/**보통**/낮음 (`:L231,L253,L297,L404,L772`) | 높음/**중간**/낮음 (`...requirements.js:L147`) | `rq-chip-mid` | ❌ **불일치** |

→ **확정 결함**: 요구사항 표시·저장값은 `보통`, 필터값은 `중간`. 사용자가 필터 `중간`을 눌러도 어떤 행도 매칭되지 않음(실제 필터가 mock이라 현재는 잠복). 동일 의미(`mid`)에 두 어휘 공존.

정규 vocab 제안:
```js
priority: {
  high:   { label: "높음", aliases: [] },
  normal: { label: "보통", aliases: ["중간"] },   // 저장값 normal, 표시 보통, 중간은 legacy alias
  low:    { label: "낮음", aliases: [] }
}
```
- 저장값 `normal`, 표시 라벨 `보통` 권장. `중간`은 legacy alias 또는 제거 후보.

### 9-2. status (상태)

| 화면 | status vocab |
| --- | --- |
| 기능정의서 | 작성중 / 검토요청 / 검토완료 / 승인완료 / 보류 (`:L367-372`) |
| 메뉴구조 | 작성중 / 검토중 / 확정 / 보류 (`:L412-415`) |
| 요구사항 | 작성중 / 검토요청 / 검토완료 / 승인완료 / 보류 (`:L411-416`) |

→ 메뉴구조만 `검토중`/`확정`을 사용(나머지는 `검토요청·검토완료·승인완료`). summary strip은 세 화면 모두 `검토중`이라는 집계 라벨 사용. 화면별 status 도메인 어휘가 상이 → **status는 화면별 enum으로 두되, summary 집계 키 매핑이 필요**.

정규 vocab 제안(예):
```js
status: {
  draft:    { label: "작성중" },
  inReview: { label: "검토요청", aliases: ["검토중"] },
  reviewed: { label: "검토완료" },
  approved: { label: "승인완료", aliases: ["확정"] },
  hold:     { label: "보류" }
}
```
- 단, 메뉴구조의 `확정`을 `approved`로 통합할지 별도 enum 유지할지는 PR #136 도메인 결정사항 (Stop 후보).

### 9-3. type chip

| 화면 | type 도메인 | 필터 노출 | 결함 |
| --- | --- | --- | --- |
| 기능정의서 기능유형 | 조회/등록/수정/삭제/승인/알림/내보내기/연동 | 동일 8종 | - |
| 메뉴구조 화면유형 | 목록/등록/상세/수정/팝업/Drawer/설정/대시보드 | 동일 8종 | - |
| 요구사항 유형 | 기능/화면/데이터/권한/연동/정책/비기능 (`:L385-392`) | 기능/화면/데이터/정책 (4종) | ❌ 권한/연동/비기능 필터 누락 |

---

## 10. Permission 비교

| 항목 | 기능정의서 | 메뉴구조 | 요구사항 |
| --- | --- | --- | --- |
| 역할 기반 버튼 노출 제어 | ➖ 없음 | ➖ 없음 | ➖ 없음 |
| `data-pc-role` 표시 | ✅ "Project Admin / PM" (컨텍스트 표시만) | ✅ | ✅ |
| 편집/삭제 권한 게이트 | ➖ | ➖ | ➖ |

→ **권한 제어 미구현**. 모든 액션 버튼이 항상 노출. Factory config에는 `permissions` 슬롯을 예약하되, 현 동작(전체 허용)을 기본값으로 둠. 권한은 별도 과제(제품 저장/권한 로직 동결 원칙).

---

## 11. Custom Renderer / Slot 필요성

| slot 후보 | 필요 화면 | built-in으로 흡수? | 판정 |
| --- | --- | --- | --- |
| cellRenderer | (없음 — 전부 built-in) | ✅ | slot 불필요 |
| detailSection: reviewList | 요구사항 | built-in 등재 시 ✅ | built-in 권장 |
| detailSection: acceptanceList | 요구사항 | built-in 등재 시 ✅ | built-in 권장 |
| detailSection: approvalStatus | 요구사항 | built-in 등재 시 ✅ | built-in 권장 |
| drawerFieldRenderer: relation add/remove | msl, rq | reference picker built-in 시 ✅ | built-in 권장 |
| toolbarExtra | (없음) | - | 보류 |
| rowExpansion | (없음 — 메뉴 LV는 flat) | - | 미사용 |
| customFooter | (없음 — drawer footer 공통) | - | 금지 유지 |

→ 세 화면 모두 custom **cellRenderer 0**, custom **drawerFieldRenderer**는 relation picker만 (built-in화 권장). slot 3개 초과 화면 없음 → Stop-Criteria "slot 과다" 미충돌. (§13 집계)

### 11-1. 메뉴 계층 렌더링 방식 (핵심 판정)

- 메뉴구조의 LV1/LV2는 **테이블의 독립 컬럼**으로, 각각 `msl-lv-text` span 텍스트 (`stam/pages/boards/menu-screen-list.html:L189-190, L213-214, L232-233`). LV3는 drawer 입력만 (`:L446-449`).
- LV1은 indent나 트리 토글이 아니라 **flat 셀 값**. expand/collapse, rowExpansion, 부모-자식 접기 위젯 **없음**.
- 결론: **indent-in-cell (flat column) 방식 → A 유지 가능.** expand/collapse tree였다면 `rowExpansion` slot 필요 → B 격상 후보였을 것이나, 해당 없음.

---

## 12. Factory 적합성 판정

| 화면 | 골격 동질 | custom cell | custom drawer field | tree 필요 | reference 명확성 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| 기능정의서 | ✅ | 0 | relation(연결화면 label 정규화 필요) | No | 부분(연결화면 label) | **A 유지** |
| 메뉴구조 | ✅ | 0 | relation picker(built-in) | No (flat) | ✅ (REQ/SCR id) | **A 유지** |
| 요구사항 | ✅ | 0 | relation picker(built-in) | No | ✅ (SCR/WBS id) | **A 유지 (조건부)** |

조건부 사유(요구사항): `reviewList`/`acceptanceList`/`approvalStatus`가 built-in detail section으로 등재되어야 함. 등재 실패 시 B 격상.

선결 과제(공통):
- 기능정의서 연결화면 `label → id` 정규화.
- 요구사항 priority `보통/중간` vocab 통일.
- 요구사항 type 필터 누락(권한/연동/비기능) 보정.
- user `이름 → userId` 매핑.

---

## 13. Stop-Criteria 게이트 집계

| Stop 기준 | 기능정의서 | 메뉴구조 | 요구사항 |
| --- | --- | --- | --- |
| slot 과다(>3) | ✅ PASS (0) | ✅ PASS (≤1) | ✅ PASS (≤3) |
| custom cell 과다(>3 또는 >50%) | ✅ PASS (0) | ✅ PASS (0) | ✅ PASS (0) |
| drawer 예외 과다 | ✅ PASS | ✅ PASS | ✅ PASS |
| relation/user 해석 불명확 | ⚠️ 연결화면 label | ✅ PASS | ⚠️ user 이름만 |
| config 복잡도 과다 | ✅ PASS | ✅ PASS | ⚠️ 필드 多(흡수 가능) |
| data contract 불일치 | ⚠️ 저장 미구현(신규 layer) | ⚠️ 동일 | ⚠️ 동일 |
| reference contract 불일치 | ⚠️ label | ✅ | ✅ |
| 동적 컬럼 | ✅ PASS | ✅ PASS | ✅ PASS |
| split editor/canvas | ✅ PASS | ✅ PASS | ✅ PASS |
| Gantt/timeline | ✅ PASS | ✅ PASS | ✅ PASS |
| localStorage UI state 의존 | ✅ PASS (없음) | ✅ PASS | ✅ PASS |
| 복수 view mode | ✅ PASS | ✅ PASS | ✅ PASS |
| custom state machine | ✅ PASS | ✅ PASS | ⚠️ 승인 상태 흐름(단순 enum) |
| 메뉴 expand/collapse tree 필수 | n/a | ✅ PASS (flat) | n/a |
| review/approval/acceptance built-in 흡수 불가 | n/a | n/a | ⚠️ built-in 등재 전제 |

→ **치명적 Stop(B/C 강제) 없음.** ⚠️는 PR #136 선결 과제이며 모두 A 유지 범위 내에서 해소 가능.

---

## 14. 비교표 → Schema 반영 결론

1. **공통 골격 확정**: 상단컨텍스트·헤더·summary·toolbar(search/filter/delete)·select table·pagination·register/detail/edit drawer·drawer footer는 Factory config의 고정 레이아웃으로 둔다.
2. **columns**: built-in renderer 12종으로 전 컬럼 흡수. `key/label/valueType/renderer/width/sortable/filterable`를 컬럼 schema 필드로 둔다. `sortable`은 현재 전부 false(신규 기능).
3. **filters**: `keyword` + `filters[]`(group key/label/type/options). vocab은 semantic key로 정규화(§9). 요구사항 type 필터 누락 보정.
4. **drawer fields**: `key/label/fieldType/valueType/cardinality/required/default/validation/visibleIn[R,D,E]/renderer`. relation/user는 reference picker built-in.
5. **detail sections**: `infoGrid/textBlock/relationCards/historyList/reviewList/acceptanceList/approvalStatus(/attachmentList)` built-in. 요구사항 A 유지의 전제.
6. **dataSource**: `list/get/summary/create/update/remove`. detail은 `get(id)` 필수(§2-2), summary는 `summary(query)` 필수(§2-1).
7. **referenceSource**: relation/user를 id 기반으로. 기능정의서 연결화면 label·user 이름은 매핑 과제로 등재(§7).
8. **vocab**: `priority.normal{label:보통,aliases:[중간]}`, `status` 정규화(검토중→inReview, 확정→approved alias). 저장값=semantic key, 표시=label.

> 다음 산출물: `Board-Factory-v1.2-Architecture.md` (계약/스키마), `Board-Factory-v1.2-Migration-Gates.md` (게이트). 구현은 PR #136(기능정의서 v2 preview)부터.
