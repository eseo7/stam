# STAM Common UI Audit Result

> 자동 생성 — `node scripts/audit-common-ui.mjs`
> Generated: 2026-06-12T16:21:45.305Z

---

## 1. Audit Summary

| 항목 | 값 |
|---|---|
| 생성 시각 | 2026-06-12T16:21:45.305Z |
| 검사 보드 수 | 4 |
| 전체 판단 | **CAUTION** |
| P0 | 0건 |
| P1 | 2건 |
| P2 | 3건 |

> ⚠️ P0 없음. P1 개선 권장.

---

## 2. Board Matrix

| Board | CSS Order | JS Order | App Shell | Form Controls | Drawer | Table Row Sel | Buttons | Board Toolbar | Board Filter |
|---|---|---|---|---|---|---|---|---|---|
| **requirements** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ⚠️ PARTIAL | ✅ PASS | ✅ PASS | ✅ PASS |
| **menu-screen-list** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ⚠️ PARTIAL | ✅ PASS | ✅ PASS | ✅ PASS |
| **wbs** | ⚠️ PARTIAL | ⚠️ PARTIAL | ✅ PASS | 🔵 LEGACY | 🔵 LEGACY | ⚠️ PARTIAL | ✅ PASS | 🔵 LEGACY | 🔵 LEGACY |
| **screen-specification** | ⚠️ PARTIAL | ⚠️ PARTIAL | ✅ PASS | 🔵 LEGACY | 🔵 LEGACY | ⚠️ PARTIAL | ✅ PASS | 🔵 LEGACY | 🔵 LEGACY |

**범례**: ✅ PASS | ⚠️ PARTIAL | 🔵 LEGACY | 🔶 CAUTION | ❌ TODO

---

## 3. Board Detail

### requirements `standard-board`

**파일**: `stam/pages/boards/requirements.html` / `stam/js/stam.requirements.js` / `stam/css/stam.requirements.css`

**CSS Order**: ✅ PASS
- 발견: `../../css/stam.tokens.css`  `../../css/stam.shell.css`  `../../css/stam.components.css`  `../../css/stam.project-overview.css`  `../../css/stam.form-controls.css`

**JS Order**: ✅ PASS
- 발견: `../../js/stam.theme.js`  `../../js/stam.nav-data.js`  `../../js/stam.shell.js`  `../../js/stam.nav-render.js`  `../../js/stam.topbar-render.js`

**App Shell**: ✅ PASS
- 발견: `data-stam-left-nav`  `data-stam-topbar`  `data-stam-project-context`  `navRender.init('B1')`

**Form Controls**: ✅ PASS
- 발견: `stam-label`  `stam-input`  `stam-select`  `stam-textarea`

**Drawer**: ✅ PASS
- 발견: `stam-drawer`  `stam-drawer-scrim`

**Table Row Sel**: ⚠️ PARTIAL
- 발견: `stam-table-row`  `sel/selected (legacy)`  `stopPropagation`
- 누락: `is-selected`
- ⚠️ stam-table-row와 sel/selected 혼용 — 충돌 가능성

**Buttons**: ✅ PASS
- 발견: `stam-btn`  `stam-btn-primary`  `stam-btn-ghost`  `stam-btn-outline`  `stam-btn-danger`
- 누락: `stam-btn-secondary`  `stam-btn-warning`

**Board Toolbar**: ✅ PASS
- 발견: `stam-board-toolbar`  `stam-board-toolbar-left`  `stam-board-toolbar-base`  `stam-board-toolbar-right`

**Board Filter**: ✅ PASS
- 발견: `stam-board-filter-trigger`  `stam-board-filter-panel`  `STAM.boardFilter.init`  `stam.board-filter.js`  `stam.board-filter.css`

---

### menu-screen-list `standard-board`

**파일**: `stam/pages/boards/menu-screen-list.html` / `stam/js/stam.menu-screen-list.js` / `stam/css/stam.menu-screen-list.css`

**CSS Order**: ✅ PASS
- 발견: `../../css/stam.tokens.css`  `../../css/stam.shell.css`  `../../css/stam.components.css`  `../../css/stam.project-overview.css`  `../../css/stam.form-controls.css`

**JS Order**: ✅ PASS
- 발견: `../../js/stam.theme.js`  `../../js/stam.nav-data.js`  `../../js/stam.shell.js`  `../../js/stam.nav-render.js`  `../../js/stam.topbar-render.js`

**App Shell**: ✅ PASS
- 발견: `data-stam-left-nav`  `data-stam-topbar`  `data-stam-project-context`  `navRender.init('B2')`

**Form Controls**: ✅ PASS
- 발견: `stam-label`  `stam-input`  `stam-select`  `stam-textarea`

**Drawer**: ✅ PASS
- 발견: `stam-drawer`  `stam-drawer-scrim`

**Table Row Sel**: ⚠️ PARTIAL
- 발견: `stam-table-row`  `sel/selected (legacy)`  `stopPropagation`
- 누락: `is-selected`
- ⚠️ stam-table-row와 sel/selected 혼용 — 충돌 가능성

**Buttons**: ✅ PASS
- 발견: `stam-btn`  `stam-btn-primary`  `stam-btn-secondary`  `stam-btn-ghost`  `stam-btn-outline`
- 누락: `stam-btn-warning`

**Board Toolbar**: ✅ PASS
- 발견: `stam-board-toolbar`  `stam-board-toolbar-left`  `stam-board-toolbar-base`  `stam-board-toolbar-right`

**Board Filter**: ✅ PASS
- 발견: `stam-board-filter-trigger`  `stam-board-filter-panel`  `STAM.boardFilter.init`  `stam.board-filter.js`  `stam.board-filter.css`

---

### wbs `legacy-special-board`

**파일**: `stam/pages/boards/wbs.html` / `stam/js/stam.wbs.js` / `stam/css/stam.wbs.css`

**CSS Order**: ⚠️ PARTIAL
- 발견: `../../css/stam.tokens.css`  `../../css/stam.shell.css`  `../../css/stam.components.css`  `../../css/stam.project-overview.css`  `../../css/stam.table-selection.css`
- 누락: `stam.form-controls.css`  `stam.drawer.css`  `stam.board-toolbar.css`  `stam.board-filter.css`

**JS Order**: ⚠️ PARTIAL
- 발견: `../../js/stam.theme.js`  `../../js/stam.nav-data.js`  `../../js/stam.shell.js`  `../../js/stam.nav-render.js`  `../../js/stam.topbar-render.js`
- 누락: `stam.board-filter.js`

**App Shell**: ✅ PASS
- 발견: `data-stam-left-nav`  `data-stam-topbar`  `data-stam-project-context`  `navRender.init('B3')`

**Form Controls**: 🔵 LEGACY
- 발견: `wbs-form`

**Drawer**: 🔵 LEGACY
- 발견: `wbs-drawer`  `wbs-drawer-overlay`

**Table Row Sel**: ⚠️ PARTIAL
- 발견: `stam-table-row`  `sel/selected (legacy)`  `stopPropagation`
- 누락: `is-selected`
- ⚠️ stam-table-row와 sel/selected 혼용 — 충돌 가능성

**Buttons**: ✅ PASS
- 발견: `stam-btn`  `stam-btn-primary`  `stam-btn-danger`
- 누락: `stam-btn-secondary`  `stam-btn-ghost`  `stam-btn-outline`  `stam-btn-warning`

**Board Toolbar**: 🔵 LEGACY
- 발견: `wbs-filter-bar`

**Board Filter**: 🔵 LEGACY
- 발견: `wbs-filter-open-btn`  `wbs-filter-panel`  `wbs-fp-`  `initFilterPanel`

**참고 (P2)**: HTML 내 <style> 존재 / _UNUSED 함수 존재

---

### screen-specification `legacy-special-board`

**파일**: `stam/pages/boards/screen-specification.html` / `stam/js/stam.screen-specification.js` / `stam/css/stam.screen-specification.css`

**CSS Order**: ⚠️ PARTIAL
- 발견: `../../css/stam.tokens.css`  `../../css/stam.shell.css`  `../../css/stam.components.css`  `../../css/stam.project-overview.css`  `../../css/stam.table-selection.css`
- 누락: `stam.form-controls.css`  `stam.drawer.css`  `stam.board-toolbar.css`  `stam.board-filter.css`

**JS Order**: ⚠️ PARTIAL
- 발견: `../../js/stam.theme.js`  `../../js/stam.nav-data.js`  `../../js/stam.shell.js`  `../../js/stam.nav-render.js`  `../../js/stam.topbar-render.js`
- 누락: `stam.board-filter.js`

**App Shell**: ✅ PASS
- 발견: `data-stam-left-nav`  `data-stam-topbar`  `data-stam-project-context`  `navRender.init('B4')`

**Form Controls**: 🔵 LEGACY
- ⚠️ 자체 form class 미확인 — legacy 추정

**Drawer**: 🔵 LEGACY
- 발견: `wbs-drawer`  `ss-drawer`  `ss-dw-scrim`

**Table Row Sel**: ⚠️ PARTIAL
- 발견: `stam-table-row`  `sel/selected (legacy)`  `stopPropagation`
- 누락: `is-selected`
- ⚠️ stam-table-row와 sel/selected 혼용 — 충돌 가능성

**Buttons**: ✅ PASS
- 발견: `stam-btn`  `stam-btn-primary`  `stam-btn-outline`
- 누락: `stam-btn-secondary`  `stam-btn-ghost`  `stam-btn-danger`  `stam-btn-warning`

**Board Toolbar**: 🔵 LEGACY
- 발견: `ss-toolbar`

**Board Filter**: 🔵 LEGACY
- 발견: `ss-filter-`  `ss-fopt`  `toggleFilter`

**참고 (P2)**: HTML 내 <style> 존재

---

## 4. P0 / P1 / P2 Findings

### P0 — 즉시 확인 (0건)
_없음_

### P1 — 다음 PR 권장 (2건)
- ⚠️ requirements Table Row Selection 충돌 가능성
- ⚠️ menu-screen-list Table Row Selection 충돌 가능성

### P2 — 나중에 정리 (3건)
- 🔵 wbs: HTML 내 <style> 존재
- 🔵 wbs: _UNUSED 함수 존재
- 🔵 screen-specification: HTML 내 <style> 존재

---

## 5. Recommended Next Actions

1. Table Row Selection 상태 class 정렬 (requirements, menu-screen-list is-selected 일관 적용)
2. 화면설계서 Board Toolbar / Board Filter 공통화 (다음 단계)
3. Board Page Template HTML 파일 생성
4. Form Controls alias 확대 (stam-input 통합)
5. Drawer Policy 확장 문서화

---

## 6. Notes

- **WBS**: Legacy/Special Board. 자체 Gantt/Filter/Drawer/Toolbar 구조 보유. 즉시 공통화 대상 아님.
- **화면설계서**: Legacy Board. 다음 단계에서 Toolbar/Filter부터 점진 공통화 후보.
- **requirements / menu-screen-list**: Standard Board 기준 충족에 가까움. PARTIAL 항목 보완 권장.

_이 리포트는 정적 검사 기반이며 런타임 동작을 보장하지 않습니다._
