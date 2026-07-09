# STAM Board Empty State — Common Component QA

## 1. 목적

게시판/산출물 목록 화면의 empty / loading / error tbody 상태를 **공통 컴포넌트**로 분리한다. 요구사항정의서·기능정의서 list 모듈의 로컬 복제 구현을 제거하고, 향후 보드 화면 확장 시 동일 API를 재사용한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `aab7ff5` |
| 선행 | PR #374 FS-5 merge **보류** (empty state 복붙 금지) |
| 대상 | `requirements.html`, `functional-specification.html` list binding |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.board-empty-state.js` | **신규** — shared row renderer |
| `stam/css/stam.board-empty-state.css` | **신규** — shared empty state styles |
| `stam/js/stam.requirements-firestore-list.js` | 로컬 `rq-empty-state` 제거 → 공통 API |
| `stam/js/stam.functional-spec-firestore-list.js` | 로컬 `fn-empty-row` 제거 → 공통 API |
| `stam/pages/boards/requirements.html` | CSS + script tag |
| `stam/pages/boards/functional-specification.html` | CSS + script tag |
| `scripts/test-board-empty-state-contract.mjs` | **신규** |
| `scripts/test-requirements-empty-state-contract.mjs` | 공통 컴포넌트 기준 갱신 |

## 4. API (`window.STAM.boardEmptyState`)

| 메서드 | 용도 |
|--------|------|
| `emptyRow(options)` | 0건 empty state (icon 기본 `clipboard-check`) |
| `loadingRow(options)` | 목록 로딩 |
| `errorRow(options)` | read 실패 |
| `messageRow(options)` | variant 지정 generic |
| `hydrateIcons(root)` | `data-stam-icon` hydrate |

### Options

| 필드 | 설명 |
|------|------|
| `colspan` | tbody colspan (default 9) |
| `title` | 제목 |
| `description` | 부가 설명 |
| `variant` | `empty` / `loading` / `error` (`messageRow`) |
| `icon` | empty icon name; `false`면 icon 생략 |
| `actionLabel` / `actionId` | optional CTA button (escaped id/label) |

## 5. DOM / CSS 계약

| 클래스 | 용도 |
|--------|------|
| `.stam-board-empty-row` | tbody `<tr>` |
| `.stam-board-empty-row--empty\|loading\|error` | variant modifier |
| `.stam-board-empty-state` | inner flex container |
| `.stam-board-empty-state--status` | loading/error compact layout |
| `.stam-board-empty-icon` | empty icon wrapper |
| `.stam-board-empty-title` | title |
| `.stam-board-empty-desc` | description |

## 6. 검증

```bash
node --check stam/js/stam.board-empty-state.js
node scripts/test-board-empty-state-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
```

## 7. Governance

| 항목 | 결과 |
|------|------|
| Firestore service/adapter/rules | **변경 없음** |
| CRUD 저장 로직 | **변경 없음** |
| nav-data / workflows / package | **변경 없음** |
| 신규 공통 JS | `stam.board-empty-state.js` **1건** |
| 신규 공통 CSS | `stam.board-empty-state.css` **1건** |
| inline style/script (page) | **없음** |
| `rq-empty-state` list 모듈 잔존 | **없음** |
| `fn-empty-row` list 모듈 잔존 | **없음** |

## 8. 후속

| PR | 내용 |
|----|------|
| FS-5 #374 | rebase 후 merge (CRUD wiring; empty state는 본 PR 선행) |
| future boards | `STAM.boardEmptyState.*` 재사용 |
