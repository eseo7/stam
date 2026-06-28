# STAM Common UI Source Audit — Requirements vs Menu Screen List v1

> PR #263 — 요구사항정의서 vs 메뉴구조/화면목록 공통 UI **소스 contract** 전수 감사  
> Generated: 2026-06-28  
> Base: `main` @ `458f5fea29bf308fcdba7571015ea0dd93da9457` (post PR #262)  
> **제품 HTML/CSS/JS 수정 없음 — 감사 리포트만**

---

## Executive Summary

| 항목 | 값 |
|---|---|
| 최종 판정 | **HOLD** |
| PASS 영역 | 4 / 30 |
| HOLD 영역 | 25 / 30 |
| N/A | 1 / 30 |
| 핵심 결론 | 겉보기 레이아웃은 매우 유사하나, **동일 stam-* contract 단일 SSOT가 아님**. `rq-*` / `msl-*` 병렬 구현 + MSL **이중 Drawer 스택**이 재사용·유지보수 리스크. |

**이미 공통화된 것:** App shell, Filter panel, Detail drawer body (`STAM.detailDrawer`), Active detail footer variant (PR #262).

**겉만 비슷한 것:** Summary strip, Toolbar/Search, Table chips, Drawer shell/tabs/forms, Button aliases.

**당장 통합 위험:** MSL legacy `#msl-dw-*` + `#msv2-dw` 공존, form field schema 차이, RQ 72건 inline style.

---

## 1. 전체 요약표

| # | 영역 | Visual parity | Source contract | Token parity | Reuse readiness | 최종 | 근거 파일/라인 |
|---:|---|:---:|:---:|:---:|:---:|:---:|---|
| 1 | Page layout | PASS | HOLD | PASS | HOLD | **HOLD** | `requirements.html:51` `.req-page` / `menu-screen-list.html:52` `.msl-page` |
| 2 | Page header | HOLD | HOLD | PASS | HOLD | **HOLD** | `requirements.html:54-68` / `menu-screen-list.html:55-69` — `stam-board-header` + `rq-page-hdr*` / `msl-page-hdr*` |
| 3 | Summary Strip | PASS | HOLD | HOLD | HOLD | **HOLD** | `requirements.html:72-113` inline dot / `menu-screen-list.html:73-114` `stam-summary-dot` |
| 4 | Toolbar | PASS | HOLD | PASS | HOLD | **HOLD** | `stam-board-toolbar` + `rq-toolbar` / `msl-toolbar` |
| 5 | Search | PASS | HOLD | HOLD | HOLD | **HOLD** | `requirements.html:119-121` SVG `style=` / `menu-screen-list.html:120-122` `stam-icon-muted` |
| 6 | Filter | PASS | PASS | PASS | PASS | **PASS** | `stam-board-filter-panel` — 양쪽 동일 (`requirements.html:138-146`) |
| 7 | Bulk actions | HOLD | HOLD | PASS | HOLD | **HOLD** | `rq-btn-del` + `stam-btn--md` vs `msl-btn-del` modifier 누락 |
| 8 | Table | PASS | HOLD | PASS | HOLD | **HOLD** | `stam-select-table` + inline `col` vs `stam-col-*` |
| 9 | Table row/cell/chip | HOLD | HOLD | HOLD | HOLD | **HOLD** | `rq-chip`/`rq-link-chip` vs `msl-chip`/`stam-link-chip` |
| 10 | Pagination/footer | HOLD | HOLD | PASS | HOLD | **HOLD** | RQ prev/next SVG (`requirements.html:337-346`) vs MSL 숫자만 |
| 11 | 상세 Drawer header | HOLD | HOLD | PASS | HOLD | **HOLD** | RQ `rq-dw-head` / MSL `msv2` `setHeader()` `stam-drawer-head-*` |
| 12 | 상세 Drawer tabs | PASS | HOLD | PASS | HOLD | **HOLD** | RQ `rq-dw-tabs` / MSL `stam-drawer-tabs` (+ legacy `msl-dw-tabs`) |
| 13 | 상세 Drawer body | PASS | PASS | PASS | PASS | **PASS** | `STAM.detailDrawer.mount` — `requirements-crud.js:150`, `menu-screen-crud.js:143` |
| 14 | 상세 Drawer footer | PASS | PASS | PASS | HOLD | **HOLD** | Active: `stam-btn-danger-outline` 등; legacy `msl-dw-detail`는 `msl-btn` |
| 15 | 등록 Drawer header | HOLD | HOLD | PASS | HOLD | **HOLD** | `rq-dw-register` vs `msv2` JS header + `msl-dw-register` |
| 16 | 등록 Drawer body | HOLD | HOLD | PASS | HOLD | **HOLD** | `rq-fs`/`rq-inp` vs `stam-form-section`/`stam-form-input` |
| 17 | 등록 Drawer footer | HOLD | HOLD | PASS | HOLD | **HOLD** | `rq-btn-*` static vs `renderFooter()` `stam-btn--md` |
| 18 | 수정 Drawer header | HOLD | HOLD | PASS | HOLD | **HOLD** | `rq-edit-sum` vs `stam-edit-notice` |
| 19 | 수정 Drawer body | HOLD | HOLD | PASS | HOLD | **HOLD** | 필드/섹션 스키마 상이 (4 vs 3 섹션) |
| 20 | 수정 Drawer footer | HOLD | HOLD | PASS | HOLD | **HOLD** | 등록 footer와 동일 이중 contract |
| 21 | Button class contract | PASS | HOLD | HOLD | HOLD | **HOLD** | `rq-btn`/`msl-btn` 병렬 alias — `stam.requirements.css:12-33`, `stam.menu-screen-list.css:9-23` |
| 22 | Icon source | HOLD | HOLD | N/A | HOLD | **HOLD** | inline SVG; close 14px vs 16px (legacy MSL) |
| 23 | Color token | HOLD | HOLD | HOLD | HOLD | **HOLD** | RQ summary `style="background:#64748B"` 등 hardcoded |
| 24 | Hover token | PASS | HOLD | HOLD | HOLD | **HOLD** | 동일 패턴이나 CSS 2벌 복제; `#DC2626` hardcoded del hover |
| 25 | Focus state | PASS | HOLD | PASS | HOLD | **HOLD** | search `:focus-within` screen CSS 병렬 |
| 26 | Dark mode | PASS | HOLD | PASS | HOLD | **HOLD** | `[data-theme=dark]` chip/row — 양 screen CSS 거의 동일 복제 |
| 27 | Mobile 430px | HOLD | HOLD | N/A | HOLD | **HOLD** | 양 board CSS에 `@media (max-width:430px)` 없음 |
| 28 | inline style | HOLD | HOLD | N/A | HOLD | **HOLD** | RQ 72건 / MSL 0건 |
| 29 | JS dynamic style | HOLD | HOLD | N/A | HOLD | **HOLD** | `requirements-crud.js:471` `hChip.style.marginLeft` |
| 30 | 화면 전용 class | HOLD | HOLD | N/A | HOLD | **HOLD** | `rq-*` ~1046 / `msl-*` ~1019 (contract audit script) |

---

## 2. class 비교표 (주요 UI 역할)

| UI 역할 | 요구사항 class | 메뉴구조 class | 공통 class | 화면 전용 | 판정 |
|---|---|---|:---:|:---:|:---:|
| 페이지 래퍼 | `req-page` | `msl-page` | — | 양쪽 | HOLD |
| 보드 헤더 | `rq-page-hdr` + `stam-board-header` | `msl-page-hdr` + `stam-board-header` | `stam-board-header`, `stam-board-title`, `stam-board-actions` | `rq-page-hdr*`, `msl-page-hdr*` | HOLD |
| 헤더 CTA | `rq-btn-pri` + `stam-btn-primary` | `msl-btn-out` ×2 (직접 등록) | `stam-btn`, `stam-board-action-btn` | `rq-btn`, `msl-btn` | HOLD |
| Summary strip | `rq-sstrip`, `rq-ss-cell` | `msl-sstrip`, `msl-ss-cell` | — (MSL dot만 `stam-summary-dot`) | 양쪽 | HOLD |
| Toolbar | `rq-toolbar` | `msl-toolbar` | `stam-board-toolbar`, `stam-board-toolbar-left` | `rq-toolbar`, `msl-toolbar` | HOLD |
| Search | `rq-search` | `msl-search` | `stam-board-search` | `rq-search`, `msl-search` | HOLD |
| Filter trigger | `rq-filter-btn` | `msl-filter-btn` | `stam-board-filter-trigger`, `stam-board-filter-count` | `rq-filter-btn`, `msl-filter-btn` | HOLD |
| Delete bulk | `rq-btn-del` | `msl-btn-del` | `stam-board-delete`, `stam-delete-btn`, `stam-btn-danger` | alias | HOLD |
| Table | `rq-table` | `msl-table` | `stam-select-table`, `stam-table-row`, `stam-check-cell` | `rq-table`, `msl-table` | HOLD |
| ID/Name cell | `rq-req-id-cell` | `msl-id-cell` | — | 양쪽 | HOLD |
| Status chip | `rq-chip rq-chip-*` | `msl-chip msl-chip-*` | — (detail만 `stam-detail-chip`) | 양쪽 | HOLD |
| Link chip (table) | `rq-link-chip` | `stam-link-chip` (+ `is-spec`, `is-muted`) | MSL만 `stam-link-chip` | RQ `rq-link-chip` | HOLD |
| Pagination | `rq-pg`, `rq-pgb` | `msl-pg`, `msl-pgb` | `stam-board-pagination`, `stam-page-btn` | `rq-pgb`, `msl-pgb` | HOLD |
| Drawer shell | `rq-drawer` | `msl-drawer` / `#msv2-dw.stam-drawer` | `stam-drawer`, `stam-drawer-scrim` | `rq-drawer`, `msl-drawer` | HOLD |
| Drawer tabs (active) | `rq-dw-tab` | `stam-drawer-tab` | MSL active path | `rq-dw-tab`, legacy `msl-dw-tab` | HOLD |
| Drawer detail body | `rq-tab-panel` → `stam-detail` | `stam-drawer-tab-panel` → `stam-detail` | `stam-detail`, `stam-detail-section` | `rq-tab-panel` | PASS |
| Drawer form section | `rq-fs`, `rq-fs-hdr` | `stam-form-section`, `stam-form-section-head` | MSL msv2만 | `rq-fs*` | HOLD |
| Form field | `rq-ffield`, `rq-inp` | `stam-form-field`, `stam-form-input` | partial `stam-label`, `stam-input` (RQ) | `rq-ffield`, `msl-ffield` | HOLD |
| Drawer footer (detail) | `stam-btn-danger-outline` 등 | 동일 (msv2 `renderFooter`) | `stam-drawer-foot`, `stam-dw-foot-*` | legacy `msl-btn` | HOLD |
| Drawer footer (reg/edit) | `rq-btn-*` + `stam-btn--md` | `stam-btn--md` (msv2) / `msl-btn` (legacy) | `stam-drawer-foot` | `rq-btn`, `msl-btn` | HOLD |

---

## 3. token 비교표

| UI 역할 | 요구사항 token | 메뉴구조 token | 실제 이기는 CSS rule | dark mode | 판정 |
|---|---|---|---|---|:---:|
| Primary button | `--btn-primary-bg`, `--btn-primary-bg-hover` | 동일 | `rq-btn-pri` / `msl-btn-pri` (screen CSS) | light/dark via tokens | PASS |
| Ghost button | `--t3` (alias) | `--t3` (alias) | screen CSS alias — common `--btn-ghost-text` 와 다름 | tokens | HOLD |
| Outline hover | `--stam`, `--bd-s` | 동일 | screen CSS alias | tokens | HOLD |
| Delete hover | `#DC2626` hardcoded | `#DC2626` hardcoded | screen CSS — `--btn-danger-*` 미사용 | partial | HOLD |
| Summary brand dot | `var(--stam)` (1 cell) + inline `#hex` | `stam-summary-dot.is-*` | `board-layout.css:252-266` vs inline | inline 우회 | HOLD |
| Table row hover | `rgba(84,81,232,.03)` | 동일 | screen CSS 복제 | `[data-theme=dark]` 복제 | HOLD |
| Search focus ring | `var(--stam)`, `var(--stam-soft)` | 동일 | `rq-search:focus-within` / `msl-search:focus-within` | tokens | PASS |
| Drawer width | `--stam-drawer-width`, `--stam-drawer-gutter` | 동일 (+ `is-narrow` on msv2) | `stam.drawer.css:6-10` | N/A | PASS |
| Link chip | `var(--stam-soft)`, `var(--stam)` | `stam-link-chip` + `is-spec` blue | `stam.board-layout.css:323+` vs `rq-link-chip` | dark rules in board-layout | HOLD |
| Chip status draft | rgba slate | 동일 values | parallel `rq-chip-draft` / `msl-chip-draft` | both screen CSS | HOLD |

---

## 4. icon 비교표

| 아이콘 역할 | 요구사항 source/path | 메뉴구조 source/path | 공통화 | 판정 |
|---|---|---|:---:|:---:|
| Export | inline SVG 12×12 download path | 동일 path | path 동일, registry 없음 | HOLD |
| Add / Register | inline SVG plus 12×12 | 동일 | path 동일 | HOLD |
| Search | inline SVG 13×13 circle+line | 동일 + `stam-icon-muted` class | path 동일 | HOLD |
| Filter | inline SVG 12×12 lines | 동일 | path 동일 | HOLD |
| Delete (toolbar) | inline SVG trash 12×12 | 동일 | path 동일 | HOLD |
| Pagination prev/next | inline SVG chevron 10×10 | **없음** (static HTML) | 불일치 | HOLD |
| Drawer close | inline SVG X **14×14** | legacy **16×16** / msv2 **14×14** | size drift | HOLD |
| Save (footer) | inline SVG 11×11 document | `ICON_SAVE` in JS 11×11 | path 동일 | HOLD |
| Edit (footer) | inline SVG 11×11 pencil | `ICON_EDIT` in JS 11×11 | path 동일 | HOLD |
| Link empty state | inline SVG 13×13 link | 동일 path | path 동일 | HOLD |

---

## 5. Grep 검색 요약

```bash
# rq-btn — 24 matches (HTML 11 + JS 2 + CSS 11)
grep -R "rq-btn" stam/pages/boards/requirements.html stam/js/stam.requirements-crud.js stam/css/stam.requirements.css

# msl-btn — 24 matches (HTML 13 + CSS 11; CRUD JS는 stam-btn 사용)
grep -R "msl-btn" stam/pages/boards/menu-screen-list.html stam/js/stam.menu-screen-crud.js stam/css/stam.menu-screen-list.css

# style= — requirements 72 / menu-screen-list 0
grep -R "style=" stam/pages/boards/requirements.html stam/pages/boards/menu-screen-list.html

# <style — 0 (양쪽 모두 없음)
grep -R "<style" stam/pages/boards/requirements.html stam/pages/boards/menu-screen-list.html

# .style. — requirements-crud.js 1건 (hChip.style.marginLeft); menu-screen-crud.js 0건
grep -R "\.style\." stam/js/stam.requirements-crud.js stam/js/stam.menu-screen-crud.js

# svg width — RQ html 22 / MSL html 15 / RQ js 0 / MSL js 6 (ICON_* constants)
grep -R "svg width" stam/pages/boards/requirements.html stam/pages/boards/menu-screen-list.html stam/js/stam.requirements-crud.js stam/js/stam.menu-screen-crud.js
```

---

## 6. 위험도 TOP 10

| 순위 | 영역 | 문제 | 왜 위험한지 | 수정 난이도 | 권장 PR |
|:---:|---|---|---|:---:|---|
| 1 | MSL Drawer 이중 스택 | `#msl-dw-*` static + `#msv2-dw` runtime | 잘못된 drawer 수정·QA 타깃 혼선 | High | PR #268 |
| 2 | 등록/수정 form contract | `rq-fs` vs `stam-form-section` | 3번째 보드마다 또 다른 form 패턴 | Medium | PR #264 |
| 3 | Button alias | `rq-btn`/`msl-btn` CSS 2벌 | hover/focus/dark drift | Medium | PR #265 |
| 4 | Summary strip token | RQ inline hex vs `stam-summary-dot` | dark/brand 불일치 | Low | PR #266 |
| 5 | Table link chip | `rq-link-chip` vs `stam-link-chip` | 연결 칩 variant 분기 | Low | PR #267 |
| 6 | Status chip taxonomy | `rq-chip-approved` vs `msl-chip-done` | 도메인 상태 매핑 오류 | Medium | PR #268 |
| 7 | RQ inline style | 72건 `style=` | 토큰 우회·회귀 | Medium | PR #269 |
| 8 | Icon 분산 | inline SVG registry 없음 | size/stroke drift | Low | PR #270 |
| 9 | Pagination | prev/next·count 문구 불일치 | footer UX 불일치 | Low | PR #271 |
| 10 | Mobile 430px | board CSS에 규칙 없음 | narrow viewport 미보장 | Medium | PR #272 |

---

## 7. 결론 (3분류)

### 1. 이미 진짜 공통화된 영역

- **App shell:** `po-shell`, `stam-topbar`, `data-stam-left-nav`, `data-stam-project-context`
- **Filter panel:** `stam-board-filter-*`, `STAM.boardFilter`, `sbf-clear-btn` / `sbf-apply-btn`
- **Detail drawer body:** `STAM.detailDrawer` + `stam-detail*` (4탭 모두)
- **Detail drawer footer (active runtime):** `stam-btn-danger-outline`, `stam-btn-ghost-muted`, `stam-btn-primary` (PR #262 이후)

### 2. 겉보기만 비슷하고 소스 contract가 다른 영역

- Summary strip (`rq-sstrip` vs `msl-sstrip`, dot 색 지정 방식)
- Toolbar / Search (`rq-search` vs `msl-search`, RQ SVG inline style)
- Table chips / link chips (`rq-chip`/`rq-link-chip` vs `msl-chip`/`stam-link-chip`)
- Drawer shell / tabs / register-edit forms (`rq-dw-*` vs `msv2` `stam-drawer-*` + legacy `msl-dw-*`)
- Button aliases (`rq-btn` / `msl-btn` — 거의 동일 CSS가 파일 2벌)

### 3. 당장 공통화하면 위험해서 별도 설계가 필요한 영역

- **MSL dual drawer:** static demo drawer 제거/통합 설계 없이 markup 삭제 금지
- **Form field schema:** 요구사항(배경/수용조건/검토) vs 메뉴(FO/BO/LV/경로) — 단순 class 치환 불가
- **Chip semantics:** 승인완료/확정/우선순위/화면유형 — registry 설계 선행
- **requirements.html inline style 72건:** 일괄 이관 시 시각 회귀 — screenshot QA gate 필수

---

## 8. 수정 우선순위 제안

1. **PR #264** — 등록/수정 Drawer form/footer contract 정렬 (단일 `stam-form-section` + footer `stam-btn--*` SSOT)
2. **PR #265** — `rq-btn`/`msl-btn` alias 제거, `stam.buttons.css` 단일 SSOT
3. **PR #266** — Summary strip `stam-summary-dot`/`stam-summary-num` SSOT (RQ inline hex 제거)
4. **PR #267** — Table link chip `stam-link-chip` SSOT (`rq-link-chip` 이관)
5. **PR #268** — MSL legacy `#msl-dw-*` deprecate + chip status registry
6. **PR #269** — Requirements inline style 72건 이관
7. **PR #270** — Icon inline SVG registry
8. **PR #271** — Pagination/footer count contract
9. **PR #272** — Board `@media (max-width:430px)` narrow layout SSOT

---

## 9. 부록

### 감사 대상 파일 메모

- `stam/css/stam.board.css` — **repo에 없음**. 실질 대응: `stam.board-layout.css`, `stam.board-toolbar.css`, `stam.board-filter.css`
- MSL active CRUD runtime: `#msv2-dw` (`stam.menu-screen-crud.js` header comment line 4)
- Contract automation: `node scripts/qa/audit-common-ui-contract.mjs` → 양 board **WARN** (legacy prefix baseline)

### CSS 로드 차이

| | Requirements | Menu Screen List |
|---|---|---|
| `stam.custom-select.css` | **미링크** | 링크됨 |
| `stam.detail-drawer.css` | 링크됨 | 링크됨 |

---

*End of audit report v1*
