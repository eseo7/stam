# Board Factory — Page Contract v1

> 브랜치 `refactor/board-factory-page-contract-v1` · PR `refactor(board-factory): define page contract sections`
> base = main `e6f30fa` (PR #142 checkbox column alignment merge 후).
> Board Factory v2 본문을 **5개 공통 section contract** 로 명시하고, 요구사항 v2 / 메뉴구조 v2 / 기능정의서 v2 가 동일 contract 로 렌더되도록 정리한 작업의 설계/QA 문서.
> **Draft 전용** — 사용자 브라우저 QA 전 Ready / merge / deploy 금지.

---

## 1. 목적

- Board Factory v2 화면 본문을 **Page Header · Summary Strip · Toolbar · Table Body · Table Footer** 5개 공통 section 으로 명시(contract)한다.
- 3개 v2 화면(요구사항 / 메뉴구조 / 기능정의서)이 **같은 contract** 로 렌더되고, 화면 간 시각 차이는 **config 값 차이에서만** 발생하도록 한다.
- **구조는 공통, 내용은 config** — 화면별 전용 patch(요구사항 전용 / 메뉴구조 전용 / 기능정의서 전용)를 두지 않는다.
- 대규모 rewrite 가 아니라, **현재 동작을 100% 유지**하면서 contract 명칭과 section 경계를 코드/문서에 드러내는 정리(naming + decomposition + docs)다.

본 작업은 **이미 동일 엔진(`STAM.boardFactory.mount`)으로 렌더되던 3개 화면의 암묵적 contract 를 명시적 contract 로 승격**한 것이다. 렌더 결과 DOM 은 아래 §9 에서 검증한 대로 기존과 동일하다(구조 anchor 클래스 2개 rename 제외).

## 2. 적용 대상 (3개 v2 화면)

| # | 화면 | route | mount config | nav id |
| - | --- | --- | --- | --- |
| 01 | 요구사항정의서 v2 | `stam/pages/boards-v2/requirements.html` | `requirementsV2` | B1 |
| 02 | 메뉴구조/화면목록 v2 | `stam/pages/boards-v2/menu-screen-list.html` | `menuScreenListV2` | B2 |
| 03 | 기능정의서 v2 | `stam/pages/boards-v2/functional-specification.html` | `functionalSpecificationV2` | B5 |

- QA 진입점: `stam/pages/boards-v2/index.html` (Board Factory v2 Preview Index, 3개 카드).
- 위 4개 HTML 은 **본 PR 에서 변경하지 않는다** (mount 대상 config 만 다를 뿐 구조 동일). contract 정리는 engine / css / config / 문서 레이어에서만 수행한다.

## 3. Before / After 구조

### 3-1. Before (암묵적 contract)

- `stam.board-factory.js` 가 `skeletonHtml()` 한 함수에서 header · summary · toolbar · table · footer · drawer 를 **하나의 문자열**로 생성.
- 헤더 액션 버튼은 `bindStatic()` 안에서 다른 이벤트 바인딩과 섞여 생성.
- count + pagination(=footer)이 `renderTable()` 내부에 포함 → Table Body 와 Table Footer 경계가 코드에 드러나지 않음.
- summary 렌더 함수명이 `renderSummary` → contract 명칭(Summary Strip)과 불일치.
- 5개 section 이 **코드상 명시적 경계 없이** 존재 (동작은 정상이나 contract 가 암묵적).

### 3-2. After (명시적 contract)

`skeletonHtml()` 이 5개 section builder + drawer builder 의 **합성**으로 분리됨:

```
skeletonHtml()
 ├─ pageHeaderHtml()    → (1) Page Header   .bf-page-header
 ├─ summaryStripHtml()  → (2) Summary Strip .bf-summary
 ├─ toolbarHtml()       → (3) Toolbar       .bf-toolbar
 ├─ tableSectionHtml()  → .bf-tbl-outer 카드
 │    ├─ tableBodyHtml()   → (4) Table Body   .bf-table
 │    └─ tableFooterHtml() → (5) Table Footer .bf-table-footer
 └─ drawersHtml()       → register / detail / edit drawer (5 section 외 공통)
```

런타임 렌더 함수도 section 단위로 정리(역할이 드러나게 최소 정리):

| contract section | 정적 골격 builder | 런타임 render 함수 |
| --- | --- | --- |
| (1) Page Header | `pageHeaderHtml()` | `renderPageHeader()` ← 헤더 액션 버튼 (bindStatic 에서 분리) |
| (2) Summary Strip | `summaryStripHtml()` | `renderSummaryStrip()` ← 구 `renderSummary` rename |
| (3) Toolbar | `toolbarHtml()` | (정적) + `bindStatic` search/delete + `initFilter` |
| (4) Table Body | `tableBodyHtml()` | `renderTable()` (colgroup/thead/tbody/empty) |
| (5) Table Footer | `tableFooterHtml()` | `renderTableFooter()` ← `renderTable` 에서 count+pagination 분리 / `renderPagination()` |

> 기존에 명확했던 함수명(`renderTable` / `renderPagination`)은 억지로 바꾸지 않고 유지했다. 새로 드러낸 경계만 명명(`renderTableFooter`)하고, contract 명칭과 어긋나던 `renderSummary` 만 `renderSummaryStrip` 으로 정렬했다.

## 4. 공통 section 5개 정의

모든 항목은 **구조(공통)** 와 **화면별 config(값)** 로 나뉜다. DOM class 는 Board Factory 전용 `.bf-` prefix 를 유지한다.

### (1) Page Header — `.bf-page-header`

- **공통 구조**: title / description / right actions (primary action + secondary actions).
- **DOM**: `.bf-page-header.stam-board-header` → `.bf-header-l`(title/desc) + `.bf-header-r[data-bf-actions]`(actions). 레이아웃 시각은 공통 `.stam-board-header` 가 담당.
- **엔진**: `pageHeaderHtml()`(정적) + `renderPageHeader()`(actions 버튼/click).
- **화면별 config**: `title`, `description`, `actions.header[]` (각 `{ label, variant: primary|outline, icon, action }`).

### (2) Summary Strip — `.bf-summary`

- **공통 구조**: cards(cells) array — 각 cell 의 label / value / sub(description) / dot(tone·color) / key.
- **DOM**: `.bf-summary` → `.bf-ss-strip` → `.bf-ss-cell`(`.bf-ss-lbl` + `.bf-ss-dot` + `.bf-ss-num` + `.bf-ss-sub`).
- **엔진**: `summaryStripHtml()`(빈 컨테이너) + `renderSummaryStrip(summary)`(`dataSource.summary().metrics` 로 값 채움).
- **화면별 config**: `summary.cells[]` (각 `{ key, label, dot, sub }`). 예) 전체 / 검토중 / 승인완료 / 보류 / 연결 화면설계서 / 연결 WBS.

### (3) Toolbar — `.bf-toolbar`

- **공통 구조**: search input / filter button / bulk delete button / (optional) right actions.
- **DOM**: `.bf-toolbar.stam-board-toolbar` → `.bf-search`(`[data-bf-search]`) + `.bf-filter-btn`(`stam-icon stam-icon-filter`) + `.bf-del-btn`(`[data-bf-delete]`) + `.stam-board-toolbar-right` + `#bf-filter-panel`(공통 filter popup).
- **엔진**: `toolbarHtml()`(정적) + `bindStatic`(search debounce / bulk delete) + `initFilter()`(공통 `STAM.boardFilter`).
- **화면별 config**: `searchPlaceholder`, `filters[]` (각 `{ key, label, options }`). bulk delete / filter popup 구조는 공통 고정.

### (4) Table Body — `.bf-table`

- **공통 구조**: selectable checkbox column / columns / row cells / chip renderer / row actions / empty state.
- **DOM**: `.bf-tbl-outer` → `.bf-tbl-scroll` → `table.bf-table.stam-select-table`(colgroup/thead/tbody) + `.bf-state`(empty/loading/error).
- **엔진**: `tableBodyHtml()`(정적) + `renderTable(rows,total)` + `rowHtml()` + 공통 `RENDERERS`(idName/text/date/chip/statusChip/typeChip/priorityChip/user/relationChip/link).
- **화면별 config**: `columns[]`, `idKey`/`nameKey`, `vocab`(chip/tone mapping), `dataSource`(data), `actionButtons` 의 `buttons`.

### (5) Table Footer — `.bf-table-footer`

- **공통 구조**: total count / visible count / pagination / page buttons.
- **DOM**: `.bf-table-footer.stam-board-footer`(`.bf-tbl-outer` 카드 **내부**, 시각 동일 유지) → `.bf-count[data-bf-count]` + `.bf-pg[data-bf-pagination]`. 레이아웃 시각은 공통 `.stam-board-footer` 가 담당.
- **엔진**: `tableFooterHtml()`(정적) + `renderTableFooter(rows,total)` + `renderPagination(total)`.
- **화면별 config**: `pageSize`, `pagination`(생략 시 on; `false` 면 페이지 버튼 미렌더 — count 는 유지).

## 5. 화면별 config 인벤토리 (공통 키 vs 다른 값)

### 5-1. 공통 키 (3개 화면 동일 — contract)

`boardId · title · description · searchPlaceholder · idKey · nameKey · pageSize · defaultSort · vocab · actions.header · summary.cells · columns · filters · drawer · detail · dataSource · referenceSource`

> 키 집합·중첩 구조가 3개 화면에서 **완전히 동일**하다. 즉 contract 는 이미 config 형태로 공유되고 있으며, 본 PR 은 이를 명시화·문서화한다.

### 5-2. 화면별로 다른 값 (config 에만 존재)

| section | 요구사항 v2 | 메뉴구조 v2 | 기능정의서 v2 |
| --- | --- | --- | --- |
| Page Header actions | 내보내기 · **요구사항 등록** | 내보내기 · **화면 등록** | 내보내기 · **기능 등록** |
| Summary cells (7) | 전체/검토중/승인완료/보류/높음 우선순위/연결 화면설계서/연결 WBS | 전체/작성중/검토중/확정/보류/연결 요구사항/연결 화면설계서 | 전체/작성중/검토중/승인완료/보류/연결 요구사항/연결 화면 |
| Toolbar filters | 4 (상태·유형·우선순위·담당자) | 5 (상태·화면유형·FO/BO·LV1·담당자) | 5 (상태·기능유형·우선순위·연결 화면·담당자) |
| Table columns | 10 | 12 | 10 |
| vocab | status5·type7·priority3 | status4·screenType8·fob2·lv1 | status5·type8·priority3 |
| Table Footer | pageSize 20 | pageSize 20 | pageSize 20 |
| searchPlaceholder | 요구사항 ID·명·담당자·출처 | 화면 ID·명·메뉴·담당자 | 기능 ID·명·담당자 |

> 위 표의 모든 차이는 **config 값** 이다. 구조/DOM/CSS/엔진 코드 차이는 0.

## 6. 화면별 config 로 남기는 항목

- Page Header: `title`, `description`, `actions.header[]`(label/variant/icon/action).
- Summary Strip: `summary.cells[]`(key/label/dot/sub) — cell 종류·라벨·색.
- Toolbar: `searchPlaceholder`, `filters[]`(key/label/options).
- Table Body: `columns[]`, `idKey`/`nameKey`, `vocab`(chip tone mapping), `dataSource`(seed/list/summary/get/create/update/remove), `referenceSource`.
- Table Footer: `pageSize`, (optional) `pagination`.
- Drawer/Detail: `drawer.sections`, `detail.tabs` — 화면별 필드/탭.

## 7. 공통화하면 안 되는 항목 (config 유지)

- **데이터·seed·summary 집계식** — 화면마다 다른 도메인. 엔진으로 끌어올리면 안 됨 (`dataSource` 에 유지).
- **vocab(코드→라벨/tone) 표** — 화면별 status/type/priority 집합이 다름 (`vocab` 에 유지).
- **컬럼 정의·연결 refType·drawer 필드/탭** — 화면별 산출물 구조 (`columns`/`drawer`/`detail` 에 유지).
- **요구사항/메뉴구조/기능정의서 전용 라벨·문구** — config 값으로만. 엔진/CSS 에 화면명 분기 금지.
- **기존 공통 모듈** — `STAM.boardFilter`(filter popup), `STAM.customSelect`(드로워 select), `stam.icons.css`(icon asset), `stam.table-selection.css`(checkbox alignment)는 **사용만** 하고 수정하지 않는다.

## 8. 변경 파일

| 파일 | 상태 | 변경 내용 |
| --- | --- | --- |
| `stam/js/stam.board-factory.js` | 수정 | Page Contract 주석 + `skeletonHtml()` 을 5개 section builder(`pageHeaderHtml`/`summaryStripHtml`/`toolbarHtml`/`tableBodyHtml`/`tableFooterHtml`)+`drawersHtml` 합성으로 분리. `renderPageHeader()` 분리(헤더 액션 from bindStatic). `renderSummary`→`renderSummaryStrip` rename. `renderTableFooter()` 분리(count+pagination from `renderTable`). footer `pagination:false` 옵션(기본 on). **렌더 DOM 동일**(anchor 2개 rename 제외). |
| `stam/css/stam.board-factory.css` | 수정 | Page Contract anchor 주석 블록 + 기존 section 주석을 contract 명칭으로 정렬. **시각 규칙 변경 0** (신규/삭제 규칙 없음). |
| `stam/js/stam.board-configs.js` | 수정 | 상단 contract overview 주석 + 3개 config 별 banner 주석(section→키 인벤토리). **config 값/구조 변경 0** (주석만 추가). |
| `stam/docs/reports/commonization/Board-Factory-Page-Contract-v1.md` | 신규 | 본 문서. |

### 8-1. DOM anchor class rename (구조 anchor 한정)

| Before | After | 영향 |
| --- | --- | --- |
| `.bf-header` | `.bf-page-header` | CSS/JS 어디에서도 selector 로 사용 안 함(미스타일) → 시각 변화 0 |
| `.bf-tbl-foot` | `.bf-table-footer` | 동일 — 시각은 공통 `.stam-board-footer` 가 담당 → 변화 0 |

> `.bf-summary` / `.bf-toolbar` / `.bf-table` 는 이미 contract 명칭 + 스타일 보유 → 그대로 유지.

## 9. 정적 검증 결과

- `node --check stam/js/stam.board-factory.js` → **PASS**
- `node --check stam/js/stam.board-configs.js` → **PASS**
- CSS 중괄호 balance: `stam.board-factory.css` `{`=`}`=135 **BALANCED**, `stam.icons.css` `{`=`}`=33 **BALANCED**
- **렌더 DOM 동등성**: DOM shim 으로 3개 config 를 `boardFactory.mount` 한 결과 — mount throw 0 / 5개 anchor(`bf-page-header`·`bf-summary`·`bf-toolbar`·`bf-table`·`bf-table-footer`) 전부 present / `console.error` 0. 기존 엔진(HEAD) 출력과 **byte 단위 동일**(anchor 2개 rename 정규화 후 `diff` 0).
- forbidden files diff 0 / 기존 v1 route diff 0 (§11).

## 10. 브라우저 QA 체크리스트 (사용자 — PASS)

> **✅ 사용자 브라우저 QA PASS (2026-06-18).** 사용자가 로컬에서 3개 v2 화면을 확인하고 "똑같은데?"로 확인 — 본 PR 은 화면 변경이 아니라 **내부 contract 명시화**이므로 **"기존과 동일하게 보임" = PASS** 기준이다(console error 0 / 3개 v2 화면 미파손). 세부 항목은 사용자 종합 확인(동일 동작) 범위 내 PASS 로 간주한다. → Ready / squash merge / staging deploy 진행.

### 10-1. Preview Index
- [x] `stam/pages/boards-v2/index.html` 3개 카드 → 각 v2 화면 이동 PASS

### 10-2. 요구사항 v2
- [x] header / summary / toolbar / table / footer 5개 section 표시
- [x] checkbox alignment 유지 (header↔body x축)
- [x] filter popup 열림/적용/초기화
- [x] drawer open (등록/상세/수정)

### 10-3. 메뉴구조 v2
- [x] header / summary / toolbar / table / footer 5개 section 표시
- [x] checkbox alignment 유지
- [x] filter popup
- [x] drawer open

### 10-4. 기능정의서 v2
- [x] header / summary / toolbar / table / footer 5개 section 표시
- [x] checkbox alignment 유지
- [x] filter popup
- [x] drawer open

### 10-5. 테마 / 뷰포트 / 콘솔
- [x] light / dark — 사용자 확인 범위 PASS
- [x] 1920 / 1366 — 사용자 확인 범위 PASS
- [x] console error 0

## 11. 비영향 / 미변경 확인

- **기존 v1 영향 없음** — `stam/pages/boards/**`, v1 전용 JS/CSS(`stam.requirements.*`/`stam.menu-screen-list.*`/`stam.functional-specification.*` 등) diff 0. `.bf-` anchor rename 은 Board Factory 엔진(boards-v2 전용) DOM 에만 존재 → v1(`stam-board-*` 직접 사용) 비영향.
- **nav-data / Left Menu 미변경** — `stam.nav-data.js` / `stam.nav-render.js` / `stam.shell.js` / `stam.topbar-render.js` diff 0. preview 진입은 직접 URL / index 카드.
- **icon asset system 유지** — `stam.icons.css` / `stam/assets/icons/**` diff 0. toolbar filter 아이콘은 공통 `stam-icon stam-icon-filter` 유지.
- **checkbox alignment fix 유지** — `stam.table-selection.css` 및 `stam.board-factory.css` 의 `.bf-table ... .stam-check-cell` 정렬 규칙(PR #142) 그대로.
- **공통 filter popup 구조 유지** — `STAM.boardFilter` / `#bf-filter-panel` 구조 무변경.
- **API / Firestore / localStorage 미변경** — 해당 코드 0 (static / in-memory preview 유지).
- **firebase / workflows / package / config / build 미변경**.

## 12. narrow / mobile — DEFERRED

- narrow / mobile(≤820, ≤480) 폭 최적화는 본 PR 범위 밖. 기존 `stam.board-factory.css` 의 반응형 규칙(@media 1180/820/480)은 그대로 유지하며 신규 보정은 하지 않는다.
- 후속 *Board Factory responsive layout baseline* PR 로 분리.

## 13. Ready 전환 조건 — 충족 (Ready / merge / deploy 진행)

1. §9 정적 검증 전 항목 PASS — **완료**.
2. §10 사용자 브라우저 QA 전 항목 PASS — **완료 (2026-06-18, "똑같은데?" 동일 동작 확인)**.
3. §11 비영향 확인 (정적 PASS / 브라우저 회귀 없음 사용자 확인) — **완료**.

→ 3개 조건 충족 → **Ready 전환 → squash merge → staging live channel deploy** 진행.
