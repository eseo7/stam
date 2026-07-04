# STAM PR #327 — Source Commonization Audit & Cleanup Plan

## 1. 목적

- 기준 main(`335af92dbcda5b423c7ec770e02b5f3d859f3338`) 시점 STAM **제품 소스**가 `CLAUDE.md` / Cursor Governance 기준대로 공통화되어 있는지 **감사**한다.
- **공통화 완료**, **부분 공통화**, **위반·정리 필요** 영역을 문서화한다.
- 후속 cleanup PR을 **안전하게 분리**하기 위한 계획을 제시한다.
- 이 PR은 **감사·계획 리포트 전용**이며, 제품 코드·CSS·JS·HTML·Firebase rules/config·seed script는 **변경하지 않는다**.

### 이번 PR에서 하지 않는 것

| 항목 | 비고 |
|------|------|
| inline style 제거 | 후속 PR |
| 버튼 클래스 수정 | 후속 PR |
| Project access/context 공통화 구현 | 후속 PR |
| Firestore service 패턴 확장 | 후속 PR |
| 실제 cleanup 구현 | 후속 PR |

---

## 2. 사전 기준 파일 확인 (작업 전 필수)

| 파일 | 경로 | 확인 |
|------|------|------|
| CLAUDE.md | `/workspace/CLAUDE.md` | ✅ 존재 |
| claude.md (소문자) | — | ❌ 없음 (`CLAUDE.md`만 SSOT) |
| Cursor Governance | `.cursor/rules/stam-agent-governance.mdc` | ✅ 존재 |

### Governance 핵심 원칙 (요약)

1. 새 화면은 **기존 STAM 공통 컴포넌트 조립** (그리기 아님).
2. 작업 전 **기존 CSS/JS/Guide** 확인·사용 클래스/함수 보고.
3. diff에 **신규 CSS/JS 파일** 또는 **inline style/script** → FAIL.
4. 토큰(`stam.tokens.css` `--*`) 외 하드코딩 색·간격·폰트 금지.
5. `.stam-btn--*` Button Guide 준수.
6. 승인 없이 `stam/css/**`, `stam/js/**` 확장 금지.

### 필수 공통 자산 (제품 화면)

| 구분 | 경로 |
|------|------|
| 토큰 | `stam/css/stam.tokens.css` |
| 셸 | `stam/css/stam.shell.css` |
| 컴포넌트 | `stam/css/stam.components.css` |
| 테마 | `stam/js/stam.theme.js` |
| 셸 JS | `stam/js/stam.shell.js` |
| Left Nav | `stam/js/stam.nav-render.js` |
| Topbar | `stam/js/stam.topbar-render.js` |
| Project Context | `stam/js/stam.project-context-render.js` |
| 가이드 | `stam/docs/STAM-Component-Guide.html`, `STAM-Button-Guide.html`, `STAM-Agent-Component-Inventory.html` |

---

## 3. 감사 방법

- **정적 분석:** `stam/pages/**` HTML, `stam/css/**`, `stam/js/**` 구조·import·data-attribute 계약.
- **ripgrep:** `style=`, `<style>`, inline `<script>`, `project-context-guard`, `stam-btn--` 사용 여부.
- **선행 감사 문서 교차:** `stam/docs/reports/commonization/**`, `docs/reports/STAM_PR316`–`#326`.
- **범위:** `stam/pages/**` 20 HTML (auth 6, dashboard 1, boards 7, boards-v2 5, prototype 3).
- **미포함:** 이번 감사에서 코드 수정·자동 fix 없음.

---

## 4. 감사 요약

| 영역 | 완료 | 부분 | 위반/정리 필요 |
|------|------|------|----------------|
| App Shell (po-shell + renderers) | 10p | 2p | 8p (의도적 alternate) |
| `project-context-guard.js` | 5 Live | — | B5, C8, boards-v2, auth, prototype |
| Auth 진입 (stam.auth-*) | 6p | — | theme `onclick` 소량 |
| Requirements Firestore read path | B1 | — | — |
| Inline `style=""` | 15p clean | — | **5 files / 252 hits** |
| Inline `<style>` | 18p clean | — | **2 files** |
| Inline `<script>` body | 16p clean | — | **4 files** (boards-v2) |
| Button Guide `stam-btn--*` | auth, B1, B2 | dual-class 혼용 | B3, B4, C8 legacy |
| Board Factory v2 | 3 shell pages | inline boot | index/builder standalone |

---

## 5. 공통화 완료 영역

### 5.1 App Shell SSOT

| 자산 | 역할 | 상태 |
|------|------|------|
| `stam.nav-data.js` | 메뉴 SSOT | ✅ |
| `stam.nav-render.js` | `data-stam-left-nav` 렌더 | ✅ |
| `stam.topbar-render.js` | `data-stam-topbar` 렌더 | ✅ |
| `stam.project-context-render.js` | `data-stam-project-context` 렌더 | ✅ |
| `stam.shell.js` | Live/Dimmed/Preview nav 상태 | ✅ (PR #319) |

**표준 DOM 계약:**

```html
<div class="po-shell">
  <header class="po-topbar stam-topbar" data-stam-topbar …></header>
  <div class="po-body">
    <nav class="po-sidebar" data-stam-left-nav …></nav>
    <main class="po-main">
      <div class="po-ctx" data-stam-project-context …></div>
```

### 5.2 Auth 진입 공통화

| 모듈 | 역할 |
|------|------|
| `stam.auth-bootstrap.js` | Google 로그인, sign-out, route shell |
| `stam.auth-membership-gate.js` | membership routing |
| `stam.auth-project-list.js` | projects 카드 목록 |
| `stam.auth.css` | auth 전용 스타일 |

6개 auth 페이지 모두 `stam-auth-page` + `data-stam-auth-screen` 계약 준수 (PR #320).

### 5.3 Project Context & Guard (베타 Live)

| 페이지 | guard | 동적 context |
|--------|-------|--------------|
| `dashboard/project-overview.html` | ✅ | ✅ `project-overview-context.js` |
| `boards/requirements.html` | ✅ | ✅ `requirements-firestore-list.js` |
| `boards/menu-screen-list.html` | ✅ | ⚠ static `data-pc-*` |
| `boards/wbs.html` | ✅ | ⚠ static |
| `boards/screen-specification.html` | ✅ | ⚠ static |

### 5.4 Requirements 보드 (B1) — reference implementation

- Inline style **0건** (PR #317 + `test-requirements-no-inline-style.mjs`).
- `stam.requirements-service.js` + Firestore adapter + read-only list.
- `stam-board-header` / `stam-summary-strip` / `stam-board-toolbar` / `data-stam-board-list` 계약.
- Empty state polish (PR #318), read smoke QA (PR #326).

### 5.5 CSS 기반 공통 레이어

| 파일 | 용도 |
|------|------|
| `stam.tokens.css` | 디자인 토큰 SSOT |
| `stam.shell.css` | 셸·nav·topbar |
| `stam.components.css` | 버튼·배지·KPI |
| `stam.board-toolbar.css` / `stam.board-filter.css` / `stam.board-layout.css` | 보드 크롬 |
| `stam.drawer.css` / `stam.detail-drawer.css` | 드로어 |
| `stam.board-factory.css` | Board Factory v2 |

### 5.6 모바일 베이스라인 (1차)

- PR #316: shell, A1, B1, components 반응형 규칙.

---

## 6. 부분 공통화 영역

| 영역 | 현황 | 갭 |
|------|------|-----|
| **B2 Menu/Screen List** | shell + board contract + guard | static project context, Firestore read 없음 |
| **B3 WBS** | shell + guard | custom toolbar/KPI, 15× `style=`, legacy `wbs-btn` |
| **B4 Screen Spec** | shell + guard | 23× `style=`, `<style>` 1, `ssv2-fbtn`, ~6k LOC page JS |
| **B5 Functional Spec** | shell, board contract | **guard 없음**, 79× `style=`, cycle DB mock |
| **C8 Open Scenario** | shell | **guard 없음**, 132× `style=`, `os-btn` |
| **boards-v2/** (3 shell) | po-shell + nav/topbar/ctx | guard 없음, inline `<script>` boot, preview only |
| **Auth theme toggle** | `stam-btn` 액션 버튼 | `tbtn` + `onclick="STAM.toggleTheme()"` 5p |
| **버튼** | B1/B2/B5 dual-class | `stam-btn` + legacy alias 혼용 (`sbf-*`, `rq-pgb`) |

---

## 7. 위반 / 정리 필요 영역

### 7.1 Governance FAIL 조건 (현재 main)

| 규칙 | 상태 | 근거 |
|------|------|------|
| Inline `style=""` | **FAIL** | 5 files, 252 occurrences |
| Inline `<style>` | **FAIL** | `screen-specification.html`, `boards-v2/index.html` |
| Inline `<script>` body | **FAIL** | boards-v2 4 files |
| Button Guide only `stam-btn--*` | **FAIL** | WBS, B4 drawer, C8, filter footers |
| Shell 조립 | **PARTIAL** | 10/20 standard shell; 나머지 의도적 alternate |

### 7.2 Inline style 상세 (ripgrep 기준)

| 파일 | `style=` 건수 |
|------|---------------|
| `boards/open-scenario.html` | 132 |
| `boards/functional-specification.html` | 79 |
| `boards/screen-specification.html` | 23 |
| `boards/wbs.html` | 15 |
| `prototype/cycle-db/import.html` | 3 |
| **기타 15 pages** | 0 |

### 7.3 project-context-guard 미적용

| 파일 | 비고 |
|------|------|
| `boards/functional-specification.html` | B5 Live |
| `boards/open-scenario.html` | C8 |
| `boards-v2/requirements.html` | preview |
| `boards-v2/menu-screen-list.html` | preview |
| `boards-v2/functional-specification.html` | preview |

### 7.4 페이지별 Shell 매트릭스

| 페이지 | po-shell | guard | 동적 ctx | 판정 |
|--------|----------|-------|----------|------|
| A1 project-overview | ✅ | ✅ | ✅ | **완료** |
| B1 requirements | ✅ | ✅ | ✅ | **완료** |
| B2 menu-screen-list | ✅ | ✅ | static | 부분 |
| B3 wbs | ✅ | ✅ | static | 부분 |
| B4 screen-specification | ✅ | ✅ | static | 부분 |
| B5 functional-specification | ✅ | ❌ | static | 부분 |
| C8 open-scenario | ✅ | ❌ | static | 부분 |
| boards-v2 (3) | ✅ | ❌ | ❌ | preview |
| auth (6) | ❌ | N/A | N/A | **의도적** |
| prototype (3) | ❌ | N/A | N/A | **의도적** |
| boards-v2 index/builder | ❌ | ❌ | ❌ | QA standalone |

---

## 8. CSS / JS 아키텍처 메모

### Page-specific CSS (제품)

| 파일 | 주 소비자 | 비고 |
|------|-----------|------|
| `stam.project-overview.css` | A1 + **전 보드 shell** | 이름과 달리 공유 shell layout |
| `stam.requirements.css` | B1 | PR #316 mobile 포함 |
| `stam.menu-screen-list.css` | B2 | |
| `stam.wbs.css` | B3 | ~91KB |
| `stam.screen-specification.css` | B4 | ~84KB |
| `stam.functional-specification.css` | B5 | |
| `stam.open-scenario.css` | C8 | |

### JS 중앙화 vs 페이지 전용

| 중앙화 (SSOT) | 페이지 전용 (대형) |
|---------------|-------------------|
| auth-*, nav/topbar/context render, project-context-guard, project-overview-context, requirements-service/adapter/firestore-list, board-filter/list, board-factory | `stam.screen-specification.js` (~6k LOC), `stam.wbs.js` (~1.1k), `stam.open-scenario.js`, `stam.functional-specification.js`, `stam.menu-screen-list.js` |

**유일한 end-to-end Firestore read Live 보드:** B1 Requirements.

---

## 9. 선행 PR (#316–#326) 대비 잔여

| PR | 완료 | 잔여 |
|----|------|------|
| #316 Mobile | shell, A1, B1 | B2–B5, C8 mobile |
| #317 Inline style | B1 + CI test | B3–B5, C8, boards-v2 index |
| #318 Empty state | B1 | — |
| #319 Nav live/dimmed | shell/nav | Live set 확대 |
| #320 Auth polish | 6 auth pages | theme inline onclick |
| #321 Context guard | A1, B1–B4 | B5, C8, boards-v2 |
| #322 Overview alerts | A1 context | — |
| #323–#326 Beta QA | docs only | P7, CRUD, other boards read |

### 기존 commonization 감사 문서 (참조)

- `stam/docs/reports/commonization/Core-5-Board-Commonization-Audit-v1.md`
- `stam/docs/reports/commonization/Commonization-Next-PR-Sequence-v1.md`
- `stam/docs/reports/commonization/Drawer-Footer-SSOT-Audit-v1.md`
- `stam/docs/reports/commonization/App-Shell-Tone-Commonization-Audit-v1.md`
- `stam/docs/reports/commonization/STAM-v2-Board-Common-Foundation-Audit-v1.md`

---

## 10. 후속 Cleanup PR 계획 (안전 분리)

> **원칙:** 한 PR = 한 보드 또는 한 위반 유형. 공통 CSS/JS 확장은 **별도 승인 PR** 선행.

| Phase | PR 테마 | 대상 | 리스크 | 선행 조건 |
|-------|---------|------|--------|-----------|
| **A1** | Inline style cleanup + CI | B5 functional-spec (79) | 🟡 | B1 패턴 복제 (`#317`) |
| **A2** | Inline style cleanup + CI | C8 open-scenario (132) | 🟡 | A1 |
| **A3** | Inline style cleanup + CI | B3 wbs (15) | 🟢 | — |
| **A4** | Inline style + `<style>` block | B4 screen-spec (23+block) | 🟡 | Drawer footer SSOT 검토 |
| **B1** | `project-context-guard` 확장 | B5, C8 | 🟡 | PR #321 계약 유지 |
| **B2** | Dynamic project context | B2–B4 static `data-pc-*` → Firestore/read | 🟡 | B1 Requirements 패턴 |
| **B3** | boards-v2 guard + boot JS 외부화 | 3 shell + inline script 제거 | 🟢 | Board Factory QA gate |
| **C1** | Drawer/filter footer SSOT | `ssv2-fbtn`, `sbf-*`, `wbs-dialog-btn` → `stam-btn--*` | 🟡 | `Drawer-Footer-SSOT-Audit-v1.md` |
| **C2** | Auth theme handler | `onclick` → data-attribute + bootstrap | 🟢 | — |
| **D1** | Mobile baseline phase 2 | B2–B5 page CSS | 🟡 | #316 |
| **E1** | Board Factory production adoption | v2 → prod route (B1/B2/B5) | 🔴 | QA gates, beta sign-off |
| **E2** | WBS / Screen Spec 구조 공통화 | Gantt/editor — standard board contract 외 | 🔴 | 별도 아키텍처 PR |

### 권장 1차 베타 후 즉시 착수 (낮은 리스크)

1. **A3** WBS inline style (15건)
2. **C2** Auth theme onclick
3. **B1** guard on B5 + C8

### 보류 (고위험·광범위)

- WBS Gantt / Screen Spec editor 전체를 board contract로 흡수
- Board Factory prod route swap
- Firestore read를 B2–B5 전체에 일괄 확장

---

## 11. PR #327 범위

| 항목 | 상태 |
|------|------|
| 제품 코드 변경 | **없음** |
| CSS/JS/HTML 변경 | **없음** |
| Firebase rules/config | **없음** |
| seed script | **없음** |
| inline style 제거 | **없음** (계획만) |
| 실제 cleanup | **후속 PR** |

## 12. 수정 파일

- `docs/reports/STAM_PR327_Source_Commonization_Audit_Cleanup_Plan.md` (신규)

## 13. 후속 추천

1. **Phase A1** 착수 — B5 functional-spec inline style (가장 B1과 유사한 board contract)
2. **contract test 확장** — `test-*-no-inline-style.mjs` 패턴을 B3–C8에 단계 적용
3. **P7 no-project QA** — beta matrix 잔여 (PR #325 후속)
4. **베타 kickoff** — P1 + Requirements read smoke + 본 감사 계획 링크를 onboarding에 포함
