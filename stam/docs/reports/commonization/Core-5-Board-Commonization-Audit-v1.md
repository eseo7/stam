# Core 5 Board Commonization Audit — v1

**작성일:** 2026-06-16  
**대상:** 요구사항정의서 / 메뉴구조·화면목록 / WBS 작업 / 화면설계서 / 기능정의서  
**판정 기준:** 같은 CSS·JS·DOM 생성 함수·renderer·config 구조를 사용하면 PASS, 복사 구현이면 FAIL

---

## 1. 파일 목록 및 규모

| 게시판 | HTML | JS (lines) | CSS (bytes) |
|--------|------|-----------|-------------|
| 요구사항정의서 | `pages/boards/requirements.html` | `stam.requirements.js` (310) | `stam.requirements.css` (21,969) |
| 메뉴구조/화면목록 | `pages/boards/menu-screen-list.html` | `stam.menu-screen-list.js` (309) | `stam.menu-screen-list.css` (20,428) |
| WBS 작업 | `pages/boards/wbs.html` (1,847 lines) | `stam.wbs.js` (1,120) | `stam.wbs.css` (91,455) |
| 화면설계서 | `pages/boards/screen-specification.html` | `stam.screen-specification.js` (2,495) | `stam.screen-specification.css` (83,773) |
| 기능정의서 | `pages/boards/functional-specification.html` | `stam.functional-specification.js` (327) | `stam.functional-specification.css` (16,099) |

---

## 2. 공통 CSS 로딩 구조 — PASS 항목

모든 5개 게시판이 동일한 순서로 공통 CSS를 로드합니다.

```
1. stam.tokens.css          ✅ 전체 공통
2. stam.shell.css           ✅ 전체 공통
3. stam.components.css      ✅ 전체 공통
4. stam.project-overview.css ✅ 전체 공통
5. stam.form-controls.css   ✅ 전체 공통
6. stam.drawer.css          ✅ 전체 공통
7. stam.table-selection.css ✅ 전체 공통
8. stam.buttons.css         ✅ 전체 공통
9. stam.board-toolbar.css   ✅ 전체 공통
10. stam.board-filter.css   ✅ 전체 공통
11. stam.board-layout.css   ✅ 전체 공통
12. stam.[board].css        ❌ 게시판별 개별 (아래 상세)
```

**판정:** CSS 로딩 체인은 PASS. 공통 레이어가 명확히 분리되어 있음.

---

## 3. 공통 JS 로딩 구조 — PASS 항목

모든 게시판이 동일한 순서로 공통 JS를 로드합니다.

```
1. stam.theme.js                 ✅ 전체 공통
2. stam.nav-data.js              ✅ 전체 공통 (SSOT)
3. stam.shell.js                 ✅ 전체 공통
4. stam.nav-render.js            ✅ 전체 공통
5. stam.topbar-render.js         ✅ 전체 공통
6. stam.project-context-render.js ✅ 전체 공통
7. stam.board-filter.js          ✅ 전체 공통 (SSOT)
8. stam.board-list.js            ✅ 전체 공통 (SSOT)
9. stam.[board].js               ❌ 게시판별 개별
```

**예외:** WBS는 `stam.tables.css`와 `stam.custom-select.css`를 추가 로드. 화면설계서도 `stam.custom-select.css` 추가.

---

## 4. 영역별 공통화 판정

### 4-1. Board Header / Title 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| 공통 CSS | ✅ PASS | `.stam-board-header`, `.stam-board-title-wrap`, `.stam-board-title`, `.stam-board-desc`, `.stam-board-actions` — 모두 `stam.board-layout.css` |
| HTML 구조 | ⚠️ PARTIAL | class 이중 부여 패턴: `rq-page-hdr stam-board-header` 방식. STAM 공통 클래스 + 게시판 prefix 혼재 |
| 버튼 배치 | ❌ FAIL | 버튼 수·레이블이 게시판마다 다름 (요구사항: 2개, WBS: 4개). config 기반이 아닌 하드코딩 |
| PR #95 적용 | ✅ PASS | 각 게시판 CSS에서 자체 page-header 규칙 제거 완료 |

**위험도:** 중간. HTML에 이중 클래스 패턴은 유지보수 혼란 요인.

---

### 4-2. Summary Strip 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| 구조 | ❌ FAIL | `.rq-sstrip` / `.msl-sstrip` / `.fn-sstrip` 등 각각 개별 구현 |
| CSS | ❌ FAIL | 각 게시판 CSS에 동일 구조를 prefix만 바꿔 복사 (~15줄×3) |
| 셀 종류·수 | ❌ 게시판마다 다름 | 요구사항: 상태별 5셀, 메뉴구조: 유형별 4셀 |
| 공통 renderer | ❌ 없음 | 각각 정적 HTML |

**판정:** FAIL. Summary strip은 config 기반 공통 renderer가 필요한 영역.

---

### 4-3. Toolbar / Search 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| 공통 CSS | ⚠️ PARTIAL | `.stam-board-toolbar`, `.stam-board-search`, `.stam-board-filter-trigger` 는 공통. 그러나 각 게시판이 `.rq-toolbar`, `.msl-search` 등 별도 클래스도 보유 |
| Search input | ❌ FAIL | 각 게시판 CSS에 동일 search box 스타일 복사 (~20줄×3) |
| Filter button | ⚠️ PARTIAL | `.stam-board-filter-trigger` 공통 클래스 사용. 그러나 게시판별 prefix 클래스 중복 존재 |
| 추가 버튼 | ❌ FAIL | WBS에만 있는 버튼들 (Gantt collapse, Group collapse, Column settings, Focus View) — 하드코딩 |

**판정:** Filter button 공통화는 어느 정도 달성. 나머지는 config 기반 toolbar renderer 필요.

---

### 4-4. Filter 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| JS renderer | ✅ PASS | `stam.board-filter.js` 단일 SSOT. `window.STAM.boardFilter.init()` API |
| CSS | ✅ PASS | `stam.board-filter.css` 단일 SSOT |
| Filter groups config | ✅ PASS | 각 게시판이 고유 `groups: []` config 전달 |
| Filter panel HTML | ✅ PASS | `.stam-board-filter-panel`, `.stam-board-filter-grid`, `.stam-board-filter-actions` 공통 |
| Filter footer 문구 | ❌ 차이 있음 | 화면설계서: "전체 해제" vs 나머지: "초기화". 후속 개선 항목 |

**판정:** Filter는 현재 공통화 수준 중 가장 성숙한 영역. PR #127 완료로 SSOT 달성.

---

### 4-5. Table 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| 공통 table controller | ✅ PASS | `STAMBoardList.init()` — `stam.board-list.js` SSOT |
| 공통 CSS selector | ✅ PASS | `.stam-select-table`, `.stam-table-row`, `.stam-check`, `.is-active`, `.is-selected` |
| 컬럼 구조 | ❌ FAIL | 각 게시판마다 다른 컬럼, `<colgroup>` 하드코딩 |
| 셀 렌더링 | ❌ FAIL | `<td>` 내부 HTML이 게시판별 하드코딩. chip 스타일은 게시판 prefix CSS 사용 |
| WBS 특수 구조 | ❌ 격리 | 22컬럼, group rows, focus/shared col, Gantt view — 별도 구조 |
| 화면설계서 특수 구조 | ❌ 격리 | 테이블 구조가 JS로 동적 생성 (stam.screen-specification.js) |

**판정:** Table selection behavior는 PASS. Column schema·cell render는 FAIL.

---

### 4-6. Pagination 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| CSS | ✅ PASS | `.stam-board-pagination`, `.stam-page-btn`, `.is-current` — `stam.board-layout.css` SSOT. PR #95 완료 |
| HTML | ⚠️ PARTIAL | `rq-pg stam-board-pagination` 이중 클래스. STAM 공통이 있으나 게시판 prefix도 중복 |
| JS 제어 | ❌ 없음 | 페이지 네이션 JS가 없음. 현재 정적 버튼. 실제 동작 없음 |
| WBS | ❌ 없음 | WBS에 pagination 없음 (전체 로드) |
| 화면설계서 | ❌ 없음 | JS 동적 렌더링이나 pagination 구현 없음 |

**판정:** CSS SSOT는 달성. JS controller가 없어 실제 동작은 미구현 상태.

---

### 4-7. Drawer 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| 공통 CSS | ✅ PASS | `.stam-drawer`, `.stam-drawer-head`, `.stam-drawer-body`, `.stam-drawer-foot`, `.stam-drawer-scrim` — `stam.drawer.css` SSOT |
| HTML 구조 | ⚠️ PARTIAL | 공통 STAM 클래스 + 게시판 prefix 클래스 이중 부여 |
| Drawer open/close JS | ❌ FAIL | `openDrawer()` / `closeAll()` 함수가 각 게시판 JS에 개별 구현 (3회 복사) |
| 탭 전환 JS | ❌ FAIL | 동일 탭 전환 로직이 각 게시판 JS에 복사 |
| WBS drawer | ❌ 격리 | 완전히 다른 구조: `.wbs-drawer`, `.wbs-drawer-panel`, `data-mode` attribute |
| 화면설계서 drawer | ❌ 격리 | JS 완전 동적 렌더링. `#ss-dw-head`, `#ss-dw-body`, `#ss-dw-foot` — id 기반 동적 주입 |

**판정:** CSS shell은 PASS. JS drawer controller는 FAIL (3회 복사). WBS·화면설계서는 완전 격리.

---

### 4-8. Drawer Footer 영역

| 항목 | 상태 | 비고 |
|------|------|------|
| 공통 CSS | ✅ PASS | `.stam-drawer-foot` — `stam.drawer.css` |
| 게시판별 CSS | ❌ FAIL | `.rq-dw-foot`, `.msl-dw-foot`, `.fn-dw-foot` 각각 개별 (~8줄씩 3번 복사) |
| 버튼 순서 | ❌ 불일치 | 요구사항: 취소·임시저장·전체보기 / 등록. 메뉴구조: 취소·임시저장·전체보기 / 등록 (구조 차이). 각각 하드코딩 |
| WBS drawer footer | ❌ 격리 | `.wbs-drawer-footer`. 인라인 `<style>`로 버튼 크기 override |
| 화면설계서 drawer footer | ❌ 격리 | JS 동적 생성. 인라인 `<style>` override 존재 |
| 메타 정보 | ⚠️ 부분 | 요구사항 detail drawer footer: 최종 변경 날짜 표시. 다른 게시판은 없음 |

**판정:** FAIL. Drawer footer는 가장 심각한 복사 영역 중 하나.

---

### 4-9. Button / Chip 스타일

| 항목 | 상태 | 비고 |
|------|------|------|
| 공통 button base | ✅ PASS | `.stam-btn`, `.stam-btn-primary`, `.stam-btn-secondary`, `.stam-btn-ghost`, `.stam-btn-outline`, `.stam-btn-danger` — `stam.components.css` + `stam.buttons.css` |
| 게시판별 button alias | ❌ FAIL | `.rq-btn.rq-btn-pri`, `.msl-btn.msl-btn-pri`, `.fn-btn.fn-btn-pri` — 동일 스타일을 prefix만 바꿔 3회 복사 |
| Chip 스타일 | ❌ FAIL | `.rq-chip-approved`, `.rq-chip-high`, `.msl-chip-done`, `.fn-chip-*` — 상태 chip이 게시판마다 개별 CSS |
| 공통 chip 시스템 | ❌ 없음 | 공통 chip renderer 없음. 상태값·색상이 게시판마다 다름 |

**판정:** FAIL. Button alias + chip이 가장 많은 CSS 복사 영역.

---

### 4-10. Empty / Loading / Error State

| 항목 | 상태 | 비고 |
|------|------|------|
| 공통 구현 | ❌ 없음 | 공통 empty/loading/error state 컴포넌트 없음 |
| 현재 상태 | ❌ 없음 | 5개 게시판 모두 mock data 로드 상태. 빈 상태 처리 없음 |

**판정:** FAIL. 구현 자체가 없음.

---

### 4-11. Custom Select

| 항목 | 상태 | 비고 |
|------|------|------|
| CSS | ✅ PASS | `stam.custom-select.css` SSOT |
| JS | ❌ FAIL | `buildRqCustomSelect()`, `buildMslCustomSelect()`, `buildFnCustomSelect()` — 동일 로직 3회 복사 (~70줄씩) |

**판정:** FAIL. JS 복사가 가장 두드러진 영역.

---

## 5. 공통화 수준 종합 판정

| 영역 | 판정 | 공통화율 | 비고 |
|------|------|----------|------|
| CSS 로딩 체인 | ✅ PASS | 95% | 게시판 CSS만 개별 |
| JS 로딩 체인 | ✅ PASS | 90% | 게시판 JS만 개별 |
| Board Header | ⚠️ PARTIAL | 70% | CSS 공통화, HTML 이중 클래스 |
| Summary Strip | ❌ FAIL | 20% | 구조 복사, CSS 복사 |
| Toolbar | ⚠️ PARTIAL | 50% | filter button 공통, search는 복사 |
| Filter | ✅ PASS | 90% | SSOT 달성. 문구 차이만 남음 |
| Table (selection) | ✅ PASS | 80% | behavior SSOT, schema 미구현 |
| Table (columns/cells) | ❌ FAIL | 0% | 모두 하드코딩 |
| Pagination CSS | ✅ PASS | 90% | SSOT 달성 |
| Pagination JS | ❌ FAIL | 0% | 미구현 |
| Drawer CSS | ✅ PASS | 85% | SSOT 달성 |
| Drawer JS | ❌ FAIL | 20% | 3회 복사 |
| Drawer Footer CSS | ❌ FAIL | 20% | 3회 복사 |
| Drawer Footer HTML | ❌ FAIL | 10% | 각각 하드코딩 |
| Button alias | ❌ FAIL | 0% | 3회 복사 |
| Chip system | ❌ FAIL | 0% | 게시판별 개별 |
| Custom Select JS | ❌ FAIL | 0% | 3회 복사 |
| Empty/Loading/Error | ❌ FAIL | 0% | 미구현 |

---

## 6. WBS — Board Engine 흡수 레퍼런스

WBS는 복잡도가 가장 높지만, 아래 개념은 Board Engine 설계에 반드시 흡수해야 합니다.

| 개념 | WBS 구현 | Board Engine 흡수 방법 |
|------|---------|----------------------|
| Group row collapse | `data-grp`, `wbs-grp-rows` tbody, toggle JS | `groupBy` config + group toggle renderer |
| Column visibility | `is-focus-col`, `is-shared-col`, `col-d` | `columns[].visibleInMode` config |
| Focus View mode | `data-focus-toggle`, gantt hide/show | `viewModes: ['default', 'focus']` config |
| Gantt bar (optional) | 날짜 bar overlay | `enableGantt: true` config flag |
| 22-column schema | `<colgroup>` 22개 | `columns: []` config schema |
| Drawer mode attribute | `data-mode="detail|edit|create"` | `drawer.mode` state in Board Engine |
| LinkedRequirements render | `renderLinkedRequirements(row)` | `relatedItems` config + renderer |
| Progress bars | `initGroupProgress()` | `groupStats` config |

---

## 7. 화면설계서 — 특수 아키텍처 주의사항

화면설계서(screen-specification)는 단순 목록 게시판이 아닙니다.

```
List View → Detail Drawer → Template Selection (full-page) → Editor (split view) → Preview
```

이 구조는 Board Factory 표준 패턴과 다릅니다. 처리 방안:

- **List View + Drawer**: Board Factory 표준 패턴으로 커버 가능
- **Editor (split view)**: Board Factory 외부에서 별도 처리. `enableEditor: true` config flag로 분기
- **Template Selection**: 화면설계서 전용 모달. Board Factory 범위 외

---

## 8. 버려야 할 항목 (Board Factory 재생성 시)

| 항목 | 이유 |
|------|------|
| `.rq-btn`, `.msl-btn`, `.fn-btn` 클래스 시스템 | `.stam-btn` 계층으로 통합 대체 |
| `buildRqCustomSelect()`, `buildMslCustomSelect()`, `buildFnCustomSelect()` | 공통 `stam.custom-select.js` 또는 board factory 내부로 통합 |
| `openDrawer()`, `closeAll()` 각 게시판별 개별 함수 | Board Engine 내부 `drawer.open()`, `drawer.close()` 메서드로 통합 |
| 탭 전환 개별 JS | Board Engine `drawer.tabs` config로 통합 |
| 게시판별 summary strip CSS | 공통 `stam.board-summary.css` + renderer로 교체 |
| 게시판별 chip CSS | 공통 chip token map으로 교체 |
| 인라인 `<style>` (WBS, 화면설계서) | 공통 CSS로 흡수 |

---

## 9. Board Factory 재생성 시 유지할 레퍼런스 요소

| 요소 | 출처 | 이유 |
|------|------|------|
| STAMBoardList API 계약 | `stam.board-list.js` | 안정적인 row selection 계약. 유지 |
| boardFilter.init() config 패턴 | `stam.board-filter.js` | config 기반 filter 이미 SSOT. 계승 |
| `.stam-select-table` / `.stam-table-row` CSS 계약 | `stam.table-selection.css` | 안정적인 테이블 selection CSS |
| CSS token 시스템 | `stam.tokens.css` | 완성도 높음. 그대로 계승 |
| Drawer CSS 구조 | `stam.drawer.css` | shell은 공통화 완료. 계승 |
| WBS `data-mode` 패턴 | `stam.wbs.js` | drawer 모드 관리 패턴. 계승 |
| Pagination CSS | `stam.board-layout.css` | SSOT 달성. 계승 |
| Board header CSS | `stam.board-layout.css` | SSOT 달성. 계승 |

---

## 10. 결론

**현재 공통화 상태:** 레이아웃 shell + filter + table selection behavior는 공통화 달성. 나머지 핵심 영역(summary, toolbar buttons, drawer JS, chip, custom select JS)은 복사 구현 상태.

**가장 위험한 복사 TOP 3:**
1. Custom Select JS — 3개 게시판에 70줄씩 복사
2. Drawer open/close + tab JS — 3개 게시판에 동일 로직 복사
3. Button alias + chip CSS — 3개 게시판 CSS에 각각 30~50줄 복사

**Board Factory 우선 목표:** 위 3개 복사 영역을 Board Engine 내부로 흡수하고, columns/filter/drawer field를 config schema로 추상화.
