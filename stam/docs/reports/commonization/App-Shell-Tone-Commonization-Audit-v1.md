# App Shell / Tone & Manner Commonization Audit — v1

**작성일:** 2026-06-16  
**대상:** STAM 전체 App Shell + 톤앤매너 공통화 범위

---

## 1. Left Navigation 구현 구조

### 구현 파일
| 역할 | 파일 | 규모 |
|------|------|------|
| 데이터 SSOT | `js/stam.nav-data.js` | 15,436 lines |
| 렌더러 | `js/stam.nav-render.js` | 4,850 lines |
| Shell 초기화 | `js/stam.shell.js` | 415 lines |
| CSS | `css/stam.shell.css` | 817 lines |

### 공통화 판정: ✅ PASS (SSOT 달성)

**근거:**
- 모든 페이지가 동일한 `stam.nav-data.js` → `stam.nav-render.js` → `stam.shell.js` 체인 사용
- `window.STAM.navRender.init(activeId)` 단일 진입점
- 메뉴 구조 변경 시 `stam.nav-data.js` 한 곳만 수정하면 전체 반영

### 구조 요약
```
<nav class="po-sidebar" data-stam-left-nav>
  .po-proj-badge     (프로젝트 컨텍스트 배지)
  .po-sidebar-search (메뉴 검색)
  .po-menu-groups[]  (메뉴 그룹 accordion)
    .po-menu-group
      .po-group-icon + .po-group-title
      .po-menu-items[]
        .po-menu-item (active, badge 지원)
```

### 위험 요소
- `stam.nav-data.js` 파일 크기(15,436줄)가 매우 큼. 구조를 작은 모듈로 분리하면 향후 유지보수 개선 가능 (현재 작동은 문제없음).

---

## 2. Topbar 구현 구조

### 구현 파일
| 역할 | 파일 | 규모 |
|------|------|------|
| 렌더러 | `js/stam.topbar-render.js` | 8,382 lines |
| CSS | `css/stam.shell.css` (일부) | — |

### 공통화 판정: ✅ PASS (SSOT 달성)

**근거:**
- 모든 페이지가 `data-stam-topbar` attribute로 동일 renderer 사용
- 브레드크럼, 클라이언트명, 검색, 테마 토글, 알림, 유저메뉴 — 모두 renderer가 생성

### HTML 활성화 패턴
```html
<header class="po-topbar stam-topbar"
  data-stam-topbar
  data-tb-crumbs="홈 > 산출물 관리 > 요구사항정의서"
  data-tb-client="파르나스 리뉴얼 구축">
</header>
```

### Topbar 요소
- `.doc-nav` — 48px 고정 높이, sticky
- 브레드크럼 (첫 항목은 index.html 링크)
- 클라이언트 이름
- 검색 박스
- 테마 토글
- 알림 벨
- 유저 메뉴 드롭다운

### 위험 요소
- `stam.topbar-render.js` 파일 크기(8,382줄)가 큼. 렌더러가 너무 많은 역할을 담당.

---

## 3. Top2 / Sub Header (Project Context) 구현 구조

### 구현 파일
| 역할 | 파일 | 규모 |
|------|------|------|
| 렌더러 | `js/stam.project-context-render.js` | 3,461 lines |
| CSS | `css/stam.project-overview.css` | 968 lines |

### 공통화 판정: ✅ PASS (SSOT 달성)

### HTML 활성화 패턴
```html
<section class="po-ctx"
  data-stam-project-context
  data-pc-title="파르나스 리뉴얼 구축"
  data-pc-client="파르나스 호텔"
  data-pc-stage="분석·설계"
  data-pc-status="진행중"
  data-pc-role="PM"
  data-pc-date="2026-03-01 ~ 2026-09-30"
  data-pc-progress="42"
  data-pc-risk="중간"
  data-pc-updated="2026-06-13">
</section>
```

### 표시 요소
- 프로젝트 제목, 클라이언트
- 단계, 상태 배지
- 역할, 날짜
- 진행률 바
- 리스크 레벨
- 최종 수정일

---

## 4. Content Layout 구조

### 구현 파일
| 역할 | 파일 |
|------|------|
| 전체 레이아웃 | `css/stam.shell.css` |
| 게시판 레이아웃 | `css/stam.board-layout.css` |

### 공통 레이아웃 패턴
```
body
└── .po-app (또는 .stam-layout)
    ├── .po-sidebar (Left Nav — 256px)
    └── .po-main
        ├── .po-topbar (48px sticky)
        ├── .po-ctx (Project Context)
        └── .po-content / .stam-board-wrap
            └── [board content]
```

### 주요 토큰
- `--sw: 256px` — 사이드바 너비
- `--topbar-h: 48px` — 탑바 높이
- `--content-max: 1560px` — 최대 콘텐츠 너비
- `--content-pad-x: 32px` — 좌우 패딩

### 공통화 판정: ✅ PASS

---

## 5. Page Title Block 구조

### 공통 CSS (stam.board-layout.css)
```css
.stam-board-header { display:flex; justify-content:space-between; padding:16px 0 14px; border-bottom:1px solid var(--bd); }
.stam-board-title { font-size:18px; font-weight:700; color:var(--t1); }
.stam-board-desc  { font-size:12px; color:var(--t3); }
```

### 공통화 판정: ✅ PASS (CSS 공통화 달성)

**미완성 부분:** 각 게시판 HTML에서 `rq-page-hdr stam-board-header` 방식으로 이중 클래스 부여 중. 게시판 prefix 클래스는 불필요한 경우가 많음.

---

## 6. 버튼 계층

### 공통 버튼 시스템

| 파일 | 역할 |
|------|------|
| `css/stam.components.css` | `.stam-btn` base 정의 (height, padding, font-size, border-radius) |
| `css/stam.buttons.css` | variant alias (5,863줄) — primary, secondary, ghost, outline, danger, icon, text |

### 버튼 크기 변형
```css
.stam-btn--xs { height:24px; padding:0 8px;  font-size:11px; }
.stam-btn--sm { height:28px; padding:0 10px; font-size:12px; }
.stam-btn--md { height:32px; padding:0 12px; font-size:13px; } /* default */
.stam-btn--lg { height:40px; padding:0 16px; font-size:14px; }
```

### 공통화 판정: ✅ PASS (CSS SSOT 달성)

**위험 요소:**
- 각 게시판이 `.rq-btn`, `.msl-btn`, `.fn-btn` 등 자체 alias를 중복 정의. 공통 `.stam-btn` 계층과 이중 관리 상태.
- Board Factory 도입 시 게시판 prefix 버튼 alias는 제거 대상.

---

## 7. Chip 스타일

### 현재 상태: ❌ FAIL (게시판별 개별 정의)

각 게시판이 독립적인 chip CSS를 보유:
- `stam.requirements.css`: `.rq-chip-approved`, `.rq-chip-high`, `.rq-chip-draft`, `.rq-chip-type`, ...
- `stam.menu-screen-list.css`: `.msl-chip-done`, `.msl-chip-review`, ...
- `stam.functional-specification.css`: `.fn-chip-*`
- `stam.wbs.css`: `.wbs-chip-*`

**공통 chip 시스템 없음.** 동일 상태(승인완료, 검토중, 보류 등)가 게시판마다 다른 CSS 클래스와 색상으로 구현될 위험.

### 필요한 조치
공통 상태 chip 토큰 맵 필요:
```
status: approved → badge-green
status: review   → badge-blue  
status: draft    → badge-gray
status: hold     → badge-amber
priority: high   → badge-red
priority: medium → badge-yellow
priority: low    → badge-gray
```

---

## 8. Card 스타일

### 현재 상태: ⚠️ PARTIAL

- `css/stam.components.css` 에 기본 card 스타일 존재
- 홈 화면, 프로젝트 개요에서 사용
- 게시판 summary strip 셀은 카드 유사 구조이나 별도 구현

---

## 9. Spacing / Radius / Shadow / Border Token 사용 현황

### Token 정의 (stam.tokens.css)

**Radius:**
```
--r-sm: 4px
--r-md: 8px
--r-lg: 12px
```

**Layout Spacing:**
```
--content-pad-x: 32px
--grid-gap: 10px
```

**Border:**
```
--bd:   #E2E8F0 (standard border)
--bd-s: #CBD5E1 (strong border)
--bd-f: #5451E8 (focus border)
```

**Shadow:**
```
--stam-drawer-shadow: -8px 0 32px rgba(0,0,0,.16), 0 0 1px rgba(0,0,0,.07)
```

### Token 사용 판정: ⚠️ PARTIAL

**잘 된 부분:**
- 모든 색상 → CSS custom property 사용
- radius, border → token 사용
- 버튼 token `--btn-primary-*`, `--btn-secondary-*` 완비

**개선 필요:**
- spacing token이 충분하지 않음. `--grid-gap: 10px`, `--content-pad-x: 32px` 외에 컴포넌트 내부 spacing이 hardcode 되어 있는 경우 존재 (예: `padding: 12px 24px`, `gap: 8px`)
- Shadow token: drawer shadow만 정의됨. card shadow, table shadow 등 별도 token 없음
- Font size token: 없음. 각 CSS에 `font-size: 12px`, `font-size: 11.5px` 등 직접 작성

---

## 10. 라이트 / 다크 톤 일관성

### 공통화 판정: ✅ PASS (SSOT 달성)

**구조:**
```css
/* Light mode defaults on :root */
:root {
  --bg-base: #F8FAFC;
  --bg-sur: #FFFFFF;
  --t1: #0F172A;
  ...
}

/* Dark mode overrides */
[data-theme="dark"] {
  --bg-base: #13161D;
  --bg-sur: #1C2030;
  --t1: #F0F1F5;
  ...
}
```

**브랜드 컬러 다크 조정:**
- Light: `--stam: #5451E8`
- Dark: `--stam: #8B7FF8` (더 밝은 퍼플)

**`stam.theme.js`:** `window.STAM.toggleTheme()` 단일 함수로 `[data-theme="dark"]` attribute 토글.

**위험 요소:**
- 화면설계서(`screen-specification.html`)에 인라인 `<style>`이 있어 dark mode 토큰을 우회하는 하드코딩 가능성 있음
- WBS도 인라인 `<style>` 존재

---

## 11. 화면별 개별 스타일 위치 (위험 요소)

### 인라인 `<style>` 발견 위치

| 파일 | 내용 | 위험도 |
|------|------|--------|
| `wbs.html` | `.wbs-drawer-footer .stam-btn` 버튼 크기 override | ❌ 높음 |
| `screen-specification.html` | `.ss-dw-foot .stam-btn` 버튼 크기 override | ❌ 높음 |

**문제:** 인라인 `<style>`은 공통 CSS보다 specificity가 높아 토큰 변경이 반영되지 않을 수 있음. 또한 dark mode 토큰 적용이 복잡해짐.

---

## 12. 공통 Shell Renderer 필요 여부

### 현재 구조 평가

| 컴포넌트 | 현재 | 필요 여부 |
|----------|------|----------|
| Left Nav | ✅ 공통 renderer 있음 | 유지 |
| Topbar | ✅ 공통 renderer 있음 | 유지 |
| Project Context (Top2) | ✅ 공통 renderer 있음 | 유지 |
| Board Header | ⚠️ CSS 공통, HTML은 per-board | Board Factory가 생성하도록 |
| Summary Strip | ❌ per-board 정적 HTML | Board Factory renderer 필요 |
| Toolbar | ⚠️ 일부 공통 | Board Factory renderer 필요 |
| Drawer Shell | ⚠️ CSS 공통, JS는 per-board | Board Engine drawer controller 필요 |

**결론:** Shell(Nav/Topbar/ProjectCtx)은 공통화 완료. Board 레이어(Summary/Toolbar/Drawer)에 Board Engine renderer가 필요.

---

## 13. 현재 구조에서 위험한 중복 요소 TOP 5

### 1위. Custom Select JS — 3회 복사 (🔴 최고 위험)
- 위치: `requirements.js`, `menu-screen-list.js`, `functional-specification.js`
- 규모: ~70줄 × 3 = 210줄 복사
- 위험: 버그 수정 시 3곳 모두 수정 필요. 한 곳 빠지면 불일치 발생

### 2위. Drawer open/close/tab JS — 3회 복사 (🔴 높음)
- 위치: `requirements.js`, `menu-screen-list.js`, `functional-specification.js`
- 규모: ~40줄 × 3 = 120줄 복사
- 위험: Drawer 동작 변경 시 3곳 수정 필요

### 3위. Chip CSS — 게시판별 개별 (🟡 중간)
- 위치: 각 게시판 CSS
- 위험: 동일 상태(예: 승인완료)가 게시판마다 다른 색상으로 표현될 수 있음

### 4위. Button alias CSS — 3회 복사 (🟡 중간)
- 위치: `requirements.css`, `menu-screen-list.css`, `functional-specification.css`
- 위험: 버튼 스타일 변경 시 3곳 수정 필요

### 5위. 인라인 `<style>` 버튼 override — WBS, 화면설계서 (🟡 중간)
- 위치: `wbs.html`, `screen-specification.html`
- 위험: CSS token 변경이 반영되지 않는 사각지대

---

## 14. 종합 결론

### 공통화 완료 영역 (건드리지 말 것)
- Left Nav (SSOT)
- Topbar (SSOT)
- Project Context / Top2 (SSOT)
- CSS Token 시스템 (우수)
- Filter (SSOT — PR #127 완료)
- Table Selection Behavior (SSOT)
- Pagination CSS (SSOT — PR #95 완료)
- Board Header CSS (SSOT — PR #95 완료)
- Light/Dark Theme 전환 (SSOT)

### 공통화 필요 영역 (Board Factory 목표)
- Summary Strip renderer
- Toolbar config-based renderer
- Drawer JS controller (open/close/tab)
- Custom Select JS
- Chip token map + renderer
- Button alias 정리
- 인라인 `<style>` 제거
- Empty/Loading/Error state 공통 컴포넌트
- Pagination JS controller
