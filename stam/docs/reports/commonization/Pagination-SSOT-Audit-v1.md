# Pagination SSOT Audit — v1

**작성일:** 2026-06-16  
**대상:** 요구사항정의서 / 메뉴구조·화면목록 / WBS / 화면설계서 / 기능정의서

---

## 1. Pagination CSS 현황

### SSOT 달성 여부: ✅ PASS

**파일:** `css/stam.board-layout.css`

```css
/* Pagination 컨테이너 */
.stam-board-pagination {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

/* 페이지 버튼 */
.stam-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--bd);
  background: var(--bg-sur);
  color: var(--t2);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 100ms, color 100ms, border-color 100ms;
  line-height: 1;
}

/* 현재 페이지 */
.stam-page-btn.is-current {
  background: var(--stam);
  border-color: var(--stam);
  color: #fff;
  font-weight: 700;
  cursor: default;
}

/* Hover */
.stam-page-btn:hover:not([disabled]):not(.is-current) {
  background: var(--bg-sur2);
  color: var(--t1);
  border-color: var(--bd-s);
}

/* Disabled */
.stam-page-btn[disabled],
.stam-page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
```

**PR #95 주석 확인:** 각 게시판 CSS에 아래 주석 있음:
```css
/* PR #95: Table footer / pagination 전용 규칙 제거 — 공통 .stam-board-footer / .stam-board-pagination 사용 */
```

---

## 2. Pagination DOM 구조 현황 (게시판별)

### 2-1. 요구사항정의서 (requirements.html)

```html
<div class="rq-tbl-foot stam-board-footer">
  <span class="stam-board-count">총 <b>24</b>건 중 <b>7</b>건 표시</span>
  <div class="rq-pg stam-board-pagination">
    <button class="rq-pgb stam-page-btn" type="button" aria-label="이전 페이지">
      <svg>...</svg>
    </button>
    <button class="rq-pgb on stam-page-btn is-current" type="button">1</button>
    <button class="rq-pgb stam-page-btn" type="button">2</button>
    <button class="rq-pgb stam-page-btn" type="button">3</button>
    <button class="rq-pgb stam-page-btn" type="button" aria-label="다음 페이지">
      <svg>...</svg>
    </button>
  </div>
</div>
```

**특이사항:**
- `rq-pg stam-board-pagination` — 이중 클래스
- `rq-pgb on stam-page-btn is-current` — `on` + `is-current` 이중 active 클래스
- 정적 HTML (버튼 3개 고정)
- `.stam-board-count` 사용 (SSOT)

---

### 2-2. 메뉴구조/화면목록 (menu-screen-list.html)

구조 패턴 동일:
- `msl-tbl-foot stam-board-footer`
- `msl-pg stam-board-pagination`
- `msl-pgb stam-page-btn`
- `msl-pgb on stam-page-btn is-current`

---

### 2-3. WBS (wbs.html)

**Pagination 없음.** WBS는 전체 데이터를 한 번에 로드하는 완전 로드 방식. 그룹 collapse/expand로 화면 관리.

---

### 2-4. 화면설계서 (screen-specification.html)

**Pagination 없음.** JS가 테이블을 동적으로 생성하지만 pagination 구현 없음. 전체 목록 표시.

---

### 2-5. 기능정의서 (functional-specification.html)

구조 패턴 동일:
- `fn-tbl-foot stam-board-footer`
- `fn-pg stam-board-pagination`
- `fn-pgb stam-page-btn`
- 이중 active 클래스 (`on` + `is-current`)

---

## 3. 화면별 차이 비교

| 항목 | 요구사항 | 메뉴구조 | WBS | 화면설계서 | 기능정의서 |
|------|----------|----------|-----|-----------|-----------|
| Pagination 존재 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 구현 방식 | 정적 HTML | 정적 HTML | — | — | 정적 HTML |
| STAM 공통 클래스 | ✅ | ✅ | — | — | ✅ |
| 게시판 prefix 클래스 | ✅ 중복 | ✅ 중복 | — | — | ✅ 중복 |
| active 클래스 | `on` + `is-current` | `on` + `is-current` | — | — | `on` + `is-current` |
| JS 제어 | ❌ 없음 | ❌ 없음 | — | — | ❌ 없음 |
| 실제 동작 | ❌ 없음 | ❌ 없음 | — | — | ❌ 없음 |
| 총 건수 표시 | ✅ | ✅ | — | — | ✅ |

---

## 4. 중복 구현 위치

### CSS 중복
PR #95로 각 게시판 CSS에서 pagination 개별 규칙은 제거 완료. CSS는 SSOT 달성.

### HTML 중복 (이중 클래스)
3개 게시판 모두 `[prefix]-pgb stam-page-btn` 이중 클래스 부여. `[prefix]-pgb`는 불필요.

### JS 미구현 (전체 공통 문제)
Pagination JS controller가 없음. 실제 데이터 페이징 동작 없음.

### Active 클래스 혼선
`on` 클래스와 `is-current` 클래스가 동시에 사용됨:
- `on` — 기존 게시판 prefix 방식
- `is-current` — STAM 공통 방식

두 클래스가 충돌하지는 않지만, 공통 JS가 어떤 클래스를 기준으로 동작해야 하는지 불명확.

---

## 5. 공통 Renderer로 통합 가능한 항목

### 5-1. Pagination HTML 생성

아래 인터페이스로 공통 renderer 구성 가능:

```javascript
// 제안: stam.pagination.js (새 SSOT)
window.STAM.pagination.render(containerEl, {
  total: 24,          // 전체 건수
  pageSize: 10,       // 페이지당 건수
  currentPage: 1,     // 현재 페이지
  maxButtons: 5,      // 표시할 페이지 버튼 수
  onChange: function(page) { /* 페이지 변경 콜백 */ }
});
```

**생성될 HTML:**
```html
<div class="stam-board-footer">
  <span class="stam-board-count">총 <b>24</b>건 중 <b>10</b>건 표시</span>
  <div class="stam-board-pagination">
    <button class="stam-page-btn" aria-label="이전" disabled>←</button>
    <button class="stam-page-btn is-current">1</button>
    <button class="stam-page-btn">2</button>
    <button class="stam-page-btn">3</button>
    <button class="stam-page-btn" aria-label="다음">→</button>
  </div>
</div>
```

### 5-2. 제거될 중복 항목
- `rq-pg`, `msl-pg`, `fn-pg` 클래스
- `rq-pgb`, `msl-pgb`, `fn-pgb` 클래스
- `on` active 클래스 (→ `is-current` 단일화)
- 각 게시판의 정적 pagination HTML

---

## 6. Config로 달라져야 할 항목

| Config 항목 | 예시 값 | 비고 |
|-------------|---------|------|
| `pageSize` | `10`, `20`, `50` | 게시판마다 다를 수 있음 |
| `maxButtons` | `5` (기본값) | UI 너비에 따라 조정 |
| `onChange` | `function(page) {}` | 게시판별 데이터 로드 로직 |
| `total` | 동적 (API 응답) | 게시판마다 데이터 다름 |

**CSS는 config 없음:** `stam.board-layout.css` 단일 SSOT로 모든 게시판 커버.

---

## 7. 위험도

| 위험 항목 | 위험도 | 설명 |
|-----------|--------|------|
| JS controller 없음 | 🔴 높음 | 현재 pagination은 UI mock. 실제 동작 구현 시 각 게시판에 개별 구현하면 4번째 복사 발생 |
| `on` + `is-current` 혼재 | 🟡 중간 | 공통 JS 도입 시 어떤 클래스 기준으로 처리할지 결정 필요 |
| WBS/화면설계서 pagination 없음 | 🟡 중간 | Board Factory에서 pagination 적용 시 이 두 게시판의 데이터 로드 방식 재설계 필요 |
| 이중 클래스 | 🟢 낮음 | 현재 동작 문제없음. Board Factory 전환 시 정리 |

---

## 8. 예상 수정 파일

공통 Pagination renderer 구현 시:

| 파일 | 변경 유형 |
|------|----------|
| `js/stam.pagination.js` (신규) | Pagination renderer + controller |
| `pages/boards/requirements.html` | 정적 pagination HTML 제거, `<div id="rq-pagination-root">` 삽입 |
| `pages/boards/menu-screen-list.html` | 동일 |
| `pages/boards/functional-specification.html` | 동일 |
| `js/stam.requirements.js` | `STAM.pagination.render()` 호출 추가 |
| `js/stam.menu-screen-list.js` | 동일 |
| `js/stam.functional-specification.js` | 동일 |
| `css/stam.requirements.css` | pagination 관련 remnant 확인 |
| `css/stam.menu-screen-list.css` | 동일 |
| `css/stam.functional-specification.css` | 동일 |

---

## 9. 다음 PR 범위 제안

### 범위: Pagination SSOT PR

**포함:**
1. `js/stam.pagination.js` 신규 작성
   - `render(containerEl, config)` API
   - `update(config)` API (페이지 변경 시)
   - HTML 생성: `.stam-board-footer`, `.stam-board-pagination`, `.stam-page-btn`
   - Active class: `is-current` 단일 사용 (`on` 제거)
   - 총 건수 표시: `.stam-board-count`

2. `requirements.html` — 정적 pagination HTML → `<div id="rq-pg-root">` 대체
3. `menu-screen-list.html` — 동일
4. `functional-specification.html` — 동일
5. 각 게시판 JS — pagination.render() 호출 추가
6. 각 게시판 CSS — `[prefix]-pg`, `[prefix]-pgb` 클래스 규칙 제거 (이미 PR #95로 대부분 제거됨, remnant 확인)

**제외:**
- WBS, 화면설계서 — pagination 자체가 없음. 별도 PR에서 데이터 로드 방식 결정 후 추가
- 실제 API 연동 — 현재는 UI mock 데이터 기반으로만 구현

**예상 PR 크기:** 소규모 (신규 JS 1개 + HTML/JS 수정 6개)  
**위험도:** 낮음 (CSS는 이미 SSOT, JS만 추가)
