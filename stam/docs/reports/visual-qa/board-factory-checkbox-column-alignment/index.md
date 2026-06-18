# Board Factory — Table Checkbox Column Alignment QA

> PR #140 (요구사항 v2 preview) 사용자 브라우저 QA 중 발견된 **table header checkbox ↔ body row checkbox x축 정렬 어긋남**을 Board Factory **공통 table 레이어** 기준으로 보정한 작업의 QA 문서.
>
> 요구사항 v2 개별 화면 문제가 아니라 Board Factory engine 이 출력하는 모든 v2 테이블의 공통 문제이므로 **요구사항 전용 patch 금지 → 공통 보정**으로 처리한다.

---

## 1. 문제

- Board Factory v2 테이블에서 **header checkbox(전체 선택)** 와 **body row checkbox** 의 x축(가로) 위치가 일렬로 맞지 않음.
- header checkbox 는 테이블 헤더 첫 칸, body checkbox 는 각 row 첫 칸에 있으나 세로 기준선이 미세하게(~6px) 어긋남.
- 사용자가 요구사항 v2(`/stam/pages/boards-v2/requirements.html`) 화면에서 확인.
- 같은 Board Factory engine 을 쓰는 기능정의서 v2 / 메뉴구조 v2 도 동일 증상.

## 2. DOM 구조 (Board Factory engine)

`stam/js/stam.board-factory.js` 가 출력하는 단일 `<table>` (colgroup + thead + tbody, sticky header / 별도 header table 없음):

- **checkbox 컬럼 col**: `<col style="width:40px">` (colgroup, `renderHead`)
- **header checkbox th**: `<th class="stam-check-cell"><input type="checkbox" class="stam-check" data-bf-check-all></th>`
- **body checkbox td**: `<td class="stam-check-cell"><input type="checkbox" class="stam-check" data-bf-row-check ...></td>`
- **row tr**: `<tr class="bf-data-row stam-table-row" ...>`

→ header / body checkbox cell 은 **동일 class `stam-check-cell`**, input 은 동일 `stam-check`(15px, `display:inline-block`), 컬럼 width 도 40px 로 동일.

## 3. 원인 — header/body checkbox cell 의 `text-align` 불일치

공통 `stam.css/stam.table-selection.css` 의 규칙 specificity 차이:

| 대상 | 적용 규칙 | specificity | text-align |
| --- | --- | --- | --- |
| header check th | `.stam-select-table thead th { text-align:left }` | (0,2,1) | **left** (← `.stam-check-cell` center 를 override) |
| body check td | `.stam-check-cell { text-align:center }` | (0,1,0) | **center** (tbody td 에는 더 높은 text-align 규칙 없음) |

- `.stam-check-cell { text-align:center; padding:0 6px !important }` 는 th/td 양쪽에 동일 적용되지만, **header th 에만** `.stam-select-table thead th { text-align:left }` (0,2,1) 이 추가로 매치되어 center 를 덮어쓴다.
- 결과: header checkbox 는 cell 좌측(padding-left 기준), body checkbox 는 cell 중앙 → **x축 ~6px 어긋남**.
- width(40px) / padding(0 6px !important) / input(15px) 은 th·td 동일하므로 **차이는 오직 text-align** 한 가지.
- active row 좌측 bar(`.stam-table-row.is-active > td:first-child::before`)는 `position:absolute` 오버레이라 레이아웃 이동 없음 → 정렬 원인 아님. sticky header / 별도 header table 없음 → 컬럼 width 불일치 원인 아님.

## 4. 수정 방식 — 공통 table 레이어 보정 (CSS only)

`stam/css/stam.board-factory.css` 에 `.bf-table` scope 한정 규칙 1블록 추가:

```css
.bf-table.stam-select-table thead th.stam-check-cell,
.bf-table.stam-select-table tbody td.stam-check-cell {
  text-align: center;
}
```

- **selector specificity (0,3,2)** → 공통 `.stam-select-table thead th` (0,2,1) 를 안정적으로 override → header/body checkbox 모두 center 통일.
- width 40px / padding 0 6px 는 기존 `.stam-check-cell` 규칙으로 th·td 이미 동일 → **text-align 한 줄만 보정**(최소 수정). 없는 class 신설 없음, 기존 class(`bf-table` / `stam-select-table` / `stam-check-cell`) 체계 그대로 사용.
- **JS / DOM 무변경**: header·body checkbox 는 이미 동일 `stam-check-cell` class 를 가지므로 engine 수정 불필요. checkbox checked / indeterminate / selection 로직 무변경.

## 5. 적용 범위

- `.bf-table` 는 Board Factory engine(`STAM.boardFactory.mount`) 만 출력 → 보정이 자동 적용되는 화면:
  - 요구사항 v2 (`/stam/pages/boards-v2/requirements.html`)
  - 기능정의서 v2 (`/stam/pages/boards-v2/functional-specification.html`)
  - 메뉴구조 v2 (`/stam/pages/boards-v2/menu-screen-list.html`)
  - 향후 Board Factory 로 추가되는 모든 v2 보드
- **기존 v1 화면 비영향**: v1 테이블은 `.bf-table` class 미보유 → 본 규칙 미매치. v1 전용 HTML/JS/CSS diff 0.

## 6. 비변경 / 회귀 방지

- checkbox 선택 로직(전체 선택 / 개별 선택 / indeterminate / `selected` state) — 무변경.
- row hover / selected(`is-active` / `is-selected`) 배경 + 좌측 active bar — 무변경(별도 selector, absolute 오버레이).
- sticky header / horizontal scroll wrapper(`.bf-tbl-scroll`) — 무변경.
- 다른 컬럼(id/name / chip / date / actionButtons) 정렬 — 무변경(보정은 `.stam-check-cell` 한정).
- `stam.table-selection.css` / `stam.icons.css` / `assets/icons/**` — 미수정.

## 7. 브라우저 QA 체크리스트 (PENDING — 사용자 브라우저 QA)

### 7-1. checkbox 정렬

- [ ] requirements v2 — header checkbox ↔ body row checkbox **x축 일렬 정렬** PASS
- [ ] functional-specification v2 — 동일 PASS
- [ ] menu-screen-list v2 — 동일 PASS

### 7-2. 동작 회귀

- [ ] 전체 선택 checkbox 동작 (header → 전 row 선택/해제) PASS
- [ ] 개별 row checkbox 동작 PASS
- [ ] indeterminate(부분 선택) 표시 PASS
- [ ] row hover / selected 배경 / 좌측 active bar 정상 PASS

### 7-3. 테마 / 뷰포트

- [ ] light mode PASS
- [ ] dark mode PASS
- [ ] 1920px PASS
- [ ] 1366px PASS
- [ ] console error 0
- [ ] narrow / mobile (≤820, ≤480) — **DEFERRED** (Board Factory responsive layout baseline PR)

### 7-4. 기존 v1 비영향

- [ ] 기존 v1 화면(`stam/pages/boards/*.html`) 테이블 checkbox 정렬 영향 없음

## 8. 정적 검증

- `node --check stam/js/stam.board-factory.js` PASS / `node --check stam/js/stam.board-configs.js` PASS
- CSS 중괄호 균형: `stam.board-factory.css` / `stam.icons.css`
- 변경 파일: `stam/css/stam.board-factory.css` + 본 QA 문서 (board-factory.js diff 0)
- 기존 v1 route diff 0 / 금지 파일 diff 0 / API·Firestore·localStorage 변경 0

## 9. Ready 전환 조건

- §7 사용자 브라우저 QA PASS 전까지 **Draft 유지**. Ready / merge / deploy 금지.
- narrow / mobile 은 DEFERRED (별도 후속 PR).
