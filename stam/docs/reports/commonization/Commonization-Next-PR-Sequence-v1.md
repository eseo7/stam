# Commonization Next PR Sequence — v1

**작성일:** 2026-06-16  
**전제:** PR #127 Filter SSOT merge/deploy 완료  
**목표:** 안전한 순서로 공통화를 단계적으로 진행

---

## 1. 진행 원칙

1. **기존 route 보호:** 기존 5개 게시판의 route는 Board Factory 검증 완료 전까지 교체 금지
2. **CSS 먼저:** JS보다 CSS 공통화가 위험도 낮음. CSS → JS → Board Factory 순서
3. **작은 PR:** 한 PR에 너무 많은 영역 포함하면 회귀 위험 증가. 주제별 분리
4. **병렬 검증:** Board Factory preview route를 기존 route와 병렬로 운영하며 검증
5. **후속 항목 우선 기록:** 현재 PR에 담기 어려운 항목은 이슈로 기록

---

## 2. PR 후보 목록 및 우선순위

### Group 1 — 즉시 착수 가능 (CSS·문구 수준, 위험도 최소)

#### PR C-01: Filter Footer 문구 통일
- **내용:** 화면설계서 filter panel의 "전체 해제" → "초기화" 통일 (또는 반대)
- **파일:** `pages/boards/screen-specification.html` 또는 `js/stam.board-filter.js`
- **위험도:** 🟢 최소
- **사전 조건:** 없음
- **팀 결정 필요:** "전체 해제" vs "초기화" 중 표준 문구 결정
- **예상 규모:** 1줄 수정

---

#### PR C-02: Drawer Footer 버튼 크기 CSS SSOT
- **내용:** `stam.drawer.css`에 `.stam-drawer-foot .stam-btn` 크기 규칙 추가
  → WBS·화면설계서 인라인 `<style>` override 불필요하게 만듦
- **파일:** `css/stam.drawer.css`
- **위험도:** 🟢 최소
- **사전 조건:** 없음
- **예상 규모:** 5~8줄 추가

```css
/* 추가할 규칙 */
.stam-drawer-foot .stam-btn {
  box-sizing: border-box;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1;
}
```

---

### Group 2 — 단기 착수 권장 (CSS + HTML 클래스 수준, 위험도 낮음)

#### PR C-03: Drawer Footer SSOT — 3개 게시판
- **내용:**
  1. 요구사항/메뉴구조/기능정의서 CSS에서 `.[prefix]-dw-foot*` 규칙 제거
  2. HTML에서 이중 클래스 `rq-dw-foot stam-drawer-foot` → `stam-drawer-foot` 단일화
  3. 버튼 variant 통일 (취소: ghost, 임시저장: outline, 등록: primary)
  4. `data-drawer-close` / `data-drawer-open` attribute 표준화
- **파일:** `css/stam.requirements.css`, `css/stam.menu-screen-list.css`, `css/stam.functional-specification.css`, 해당 HTML 3개
- **사전 조건:** PR C-02 완료
- **위험도:** 🟢 낮음
- **예상 규모:** 소규모 (~30줄 제거 + HTML 속성 수정)

---

#### PR C-04: Pagination SSOT — `stam.pagination.js` 신규
- **내용:**
  1. `js/stam.pagination.js` 신규 작성
  2. 요구사항/메뉴구조/기능정의서 정적 pagination HTML → JS renderer로 교체
  3. active 클래스 `on` + `is-current` → `is-current` 단일화
  4. `[prefix]-pg`, `[prefix]-pgb` 클래스 제거
- **파일:** `js/stam.pagination.js` (신규), HTML 3개, JS 3개
- **사전 조건:** 없음 (C-03과 병렬 가능)
- **위험도:** 🟢 낮음
- **예상 규모:** 소규모 (신규 JS ~80줄 + 각 파일 소수 수정)

---

### Group 3 — 중기 착수 (JS 공통화, 위험도 중간)

#### PR C-05: Custom Select JS 공통화
- **내용:**
  1. `js/stam.custom-select.js` (또는 `stam.board-factory.js` 내부) 신규 작성
  2. 요구사항/메뉴구조/기능정의서 JS에서 `buildXxxCustomSelect()` 개별 구현 제거
  3. 공통 `STAM.customSelect.enhance(el)` API 호출로 교체
- **파일:** 기존 `css/stam.custom-select.css` (변경 없음), `js/stam.custom-select.js` (신규), JS 3개 (수정)
- **사전 조건:** 없음
- **위험도:** 🟡 중간 (동작 테스트 필수)
- **예상 규모:** 중규모 (신규 JS ~100줄 + 3개 JS에서 ~210줄 제거)

---

#### PR C-06: Board Title/Summary/Toolbar — 공통 HTML 패턴 정리
- **내용:**
  1. 각 게시판 HTML에서 이중 클래스 (`rq-page-hdr stam-board-header`) → 단일 클래스 정리
  2. 불필요한 게시판 prefix 클래스 제거 (CSS가 이미 `stam-board-header`로 처리)
  3. Summary strip prefix 클래스 통일 (중기 목표: 공통 summary renderer 준비)
- **파일:** HTML 5개, 각 게시판 CSS 일부
- **사전 조건:** C-03 완료
- **위험도:** 🟡 중간 (CSS 클래스 제거 시 의도치 않은 스타일 손실 가능)
- **예상 규모:** 중규모

---

### Group 4 — 중기 착수 (Table SSOT 강화)

#### PR C-07: Table SSOT — `stam.board-list.js` API 강화
- **내용:**
  1. 검색 기능을 `STAMBoardList` API로 통합 (현재 각 게시판 JS에 개별 구현)
  2. `STAMBoardList.initSearch(inputEl, options)` 추가
  3. 각 게시판 JS에서 search input handler 중복 제거
- **파일:** `js/stam.board-list.js` (수정), JS 3개 (수정)
- **사전 조건:** 없음
- **위험도:** 🟡 중간
- **예상 규모:** 소규모

---

#### PR C-08: Chip SSOT — 공통 상태 chip token map
- **내용:**
  1. `css/stam.chips.css` (신규) — 공통 상태 chip class 정의
  2. `stam-chip-approved`, `stam-chip-review`, `stam-chip-draft`, `stam-chip-hold`, `stam-chip-high`, `stam-chip-medium`, `stam-chip-low` 등
  3. 각 게시판 CSS에서 chip 규칙 제거 후 공통 class로 교체
- **파일:** `css/stam.chips.css` (신규), HTML 3개 (chip class 교체), 각 게시판 CSS 3개 (chip 규칙 제거)
- **사전 조건:** 없음
- **위험도:** 🟡 중간 (chip 색상 게시판별 통일 필요)
- **예상 규모:** 중규모

---

### Group 5 — Drawer Shell SSOT

#### PR C-09: Drawer Shell SSOT — `stam.board-drawer.js` 신규
- **내용:**
  1. `js/stam.board-drawer.js` 신규 작성
  2. `STAM.boardDrawer.init(config)` API: open/close, mode switch, tab, scrim
  3. 요구사항/메뉴구조/기능정의서 JS에서 `openDrawer()`, `closeAll()`, 탭 전환 로직 제거
  4. `stam.board-drawer.js` 호출로 교체
- **파일:** `js/stam.board-drawer.js` (신규), JS 3개 (수정)
- **사전 조건:** C-05 완료
- **위험도:** 🔴 높음 (핵심 UX 동작 변경. 충분한 테스트 필수)
- **예상 규모:** 중~대규모

---

### Group 6 — App Shell / Top / Top2 / Left SSOT

#### 현황: ✅ 이미 SSOT 달성
- Left Nav: `stam.nav-render.js` SSOT
- Topbar: `stam.topbar-render.js` SSOT
- Project Context: `stam.project-context-render.js` SSOT

#### 남은 작업 (소규모)
- `stam.nav-data.js` 파일 크기(15,436줄) 모듈 분리 (기능 개선, 필수 아님)
- Topbar renderer 역할 분리 (선택 항목)

---

### Group 7 — Board Factory v1 (대형 PR)

#### PR C-10: `stam.board-factory.js` + boards-v2/ Preview Route (요구사항정의서)
- **내용:**
  1. `js/stam.board-factory.js` 신규 작성
  2. `js/stam.board-configs/config.requirements.js` 신규
  3. `pages/boards-v2/requirements.html` 신규 (Board Factory 기반 preview)
- **사전 조건:** C-04 (Pagination), C-05 (CustomSelect), C-07 (Search), C-08 (Chip) 완료
- **위험도:** 🔴 높음 (신규 아키텍처 도입)
- **예상 규모:** 대규모

---

#### PR C-11: boards-v2/ 나머지 4개 게시판 추가
- **사전 조건:** PR C-10 검증 완료
- **위험도:** 🔴 높음

---

### Group 8 — 기존 Route 교체 (최종 단계)

#### PR C-12 ~ C-16: 각 게시판 기존 route 교체
- 1개씩 순차 교체
- 각 교체 전 검증 체크리스트 충족 필수
- **위험도:** 🔴 최고 (사용자에게 직접 영향)

---

## 3. PR 전체 시퀀스 다이어그램

```
현재 상태 (PR #127 완료)
│
├─ Group 1 (즉시, 병렬 가능)
│   ├─ PR C-01: Filter 문구 통일
│   └─ PR C-02: Drawer Footer 버튼 크기 CSS
│
├─ Group 2 (C-02 완료 후)
│   ├─ PR C-03: Drawer Footer SSOT
│   └─ PR C-04: Pagination SSOT   ← 병렬 가능
│
├─ Group 3+4 (병렬 가능)
│   ├─ PR C-05: Custom Select JS 공통화
│   ├─ PR C-06: Board Title/Summary/Toolbar 정리
│   ├─ PR C-07: Table SSOT Search 강화
│   └─ PR C-08: Chip SSOT
│
├─ Group 5 (C-05 완료 후)
│   └─ PR C-09: Drawer Shell SSOT
│
├─ Group 7 (C-04,05,07,08 완료 후)
│   ├─ PR C-10: Board Factory + 요구사항 preview
│   └─ PR C-11: 나머지 4개 게시판 preview
│
└─ Group 8 (검증 완료 후, 1개씩)
    ├─ PR C-12: 요구사항 route 교체
    ├─ PR C-13: 메뉴구조 route 교체
    ├─ PR C-14: WBS route 교체
    ├─ PR C-15: 화면설계서 route 교체
    └─ PR C-16: 기능정의서 route 교체
```

---

## 4. 각 PR 위험도 요약표

| PR | 제목 | 위험도 | 예상 규모 | 사전 조건 |
|----|------|--------|----------|----------|
| C-01 | Filter 문구 통일 | 🟢 최소 | 1줄 | 없음 |
| C-02 | Drawer Footer 버튼 크기 CSS | 🟢 최소 | 5~8줄 | 없음 |
| C-03 | Drawer Footer SSOT | 🟢 낮음 | 소규모 | C-02 |
| C-04 | Pagination SSOT | 🟢 낮음 | 소규모 | 없음 |
| C-05 | Custom Select JS | 🟡 중간 | 중규모 | 없음 |
| C-06 | Board Title/Summary 정리 | 🟡 중간 | 중규모 | C-03 |
| C-07 | Table Search SSOT | 🟡 중간 | 소규모 | 없음 |
| C-08 | Chip SSOT | 🟡 중간 | 중규모 | 없음 |
| C-09 | Drawer Shell SSOT | 🔴 높음 | 중대규모 | C-05 |
| C-10 | Board Factory + 요구사항 preview | 🔴 높음 | 대규모 | C-04,05,07,08 |
| C-11 | boards-v2 나머지 4개 | 🔴 높음 | 대규모 | C-10 검증 |
| C-12~16 | Route 교체 (1개씩) | 🔴 최고 | 소규모 | 각 preview 검증 |

---

## 5. 내일 우선 검토해야 할 항목 TOP 3

### 1위. Filter 문구 표준 결정 (PR C-01 착수 전)

"초기화" vs "전체 해제" 중 어떤 문구를 표준으로 할지 팀 결정 필요.  
결정 후 즉시 착수 가능한 최소 규모 PR.

### 2위. Drawer Footer 버튼 variant 표준 결정 (PR C-03 착수 전)

취소 버튼을 `ghost`로 할지 `secondary`로 할지. 현재 혼재 상태.  
결정 후 PR C-02, C-03 즉시 착수.

### 3위. Board Factory Schema 리뷰

Board-Factory-v1-Design-Plan.md의 config schema 초안을 팀이 검토하고 피드백.  
schema가 확정되어야 PR C-10 (Board Factory) 착수 가능.

---

## 6. 오픈 시나리오 처리 방침

| 항목 | 내용 |
|------|------|
| **현재 분류** | 공통화 전 개별 구현 화면 |
| **현재 위치** | `pages/boards/open-scenario.html` |
| **Board Factory 적용 검토 시점** | Board Factory v1 안정화 후 (PR C-11 이후) |
| **별도 분석 PR 필요 여부** | 예. 오픈 시나리오 고유 기능 파악 후 Board Factory 적용 범위 결정 |
| **기존 route 유지** | Board Factory 검증 완료 전까지 기존 route 그대로 유지 |

---

## 7. WBS, 화면설계서 — 특수 처리 계획

### WBS
- Group row collapse, 22컬럼, Focus View, Gantt bar 등 특수 기능
- Board Factory에 `features.groupBy`, `features.enableGantt`, `features.enableFocusView` config 추가로 지원
- Board Factory v1에서는 기본 board 3개 먼저 안정화 후 WBS 적용 (PR C-11 범위에 포함)

### 화면설계서
- List + Drawer → Board Factory 표준 패턴으로 커버
- Editor (split view), Template 선택 → Board Factory 범위 외. 기존 코드 유지
- 화면설계서 Board Factory 적용 범위: List + Drawer + Drawer Footer만

---

## 8. 공통화 완료 후 예상 결과

| 영역 | 현재 | 목표 |
|------|------|------|
| 공통 JS 파일 | 8개 | 12개 (SSOT 파일 4개 추가) |
| 게시판별 JS 규모 | 300~2,495줄 | ~50줄 (config + init만) |
| 게시판별 CSS 규모 | 16~91KB | ~3~5KB (chip + 특수 규칙만) |
| 인라인 `<style>` | 2개 (WBS, 화면설계서) | 0개 |
| Custom Select 복사 | 3회 (~210줄) | 0회 |
| Drawer JS 복사 | 3회 (~120줄) | 0회 |
| Chip CSS 복사 | 3회+ | 0회 |
| Empty/Loading/Error state | 미구현 | Board Factory 내 공통 구현 |
