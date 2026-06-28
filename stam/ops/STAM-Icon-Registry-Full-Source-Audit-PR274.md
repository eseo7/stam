# STAM Icon Registry Full-Source Audit — PR #274

## 1. 목적

PR #272에서 merge된 Icon Registry SSOT foundation 이후, STAM 제품 소스(`stam/pages/**`, `stam/js/**`, `stam/css/**`) 전체의 아이콘 사용 현황을 전수검사합니다.

본 PR은 **audit-only**입니다. 제품 HTML/CSS/JS는 읽기·grep·분석만 수행하며, 구현 변경은 PR #275로 이관합니다.

**판정 기준**

| 기준 | 판정 |
|------|------|
| 아이콘 source가 registry 1곳에 있고 화면이 호출만 함 | PASS |
| 화면별 inline SVG 복붙 잔존 | HOLD |
| 공통 class만 붙이고 SVG/path가 중복 | HOLD |
| 화면에서 비슷하게 보임 | PASS 아님 |

---

## 2. 기준 main / 조사 일시 / 조사 범위

| 항목 | 값 |
|------|-----|
| 기준 main SHA | `33eadaeb5205710b5479d7cb7ca63cbdb71b3381` |
| 조사 일시 (UTC) | 2026-06-28T14:25:06Z |
| 제품 우선 범위 | `stam/pages/**`, `stam/js/**`, `stam/css/**` |
| 참고 범위 (PASS/FAIL 미반영) | `stam/docs/**`, `stam/*.html` |

### 조사 명령 요약

```bash
# A. Registry
grep -n "var ICONS\|filter:\|close:\|..." stam/js/stam.icons.js

# B. Product inline SVG
grep -RIn "<svg" stam/pages stam/js > /tmp/pr274-product-inline-svg.txt
# → 112 lines

# C. viewBox/path 중복
grep -RIn "viewBox=" stam/pages stam/js > /tmp/pr274-product-viewbox.txt
# → 114 lines

# D. Registry 호출
grep -RIn "data-stam-icon\|renderStamIcon\|hydrateStamIcons\|STAM_ICONS" stam/pages stam/js
# → 66 lines (제품 호출 ~54, registry 정의 12)

# E. Icon class
grep -RIn "class=.*icon\|[-_]icon" stam/pages stam/js stam/css
# → 295 lines

# F. Script load order
grep -RIn "stam.icons.js\|stam.menu-screen-crud.js\|..." stam/pages

# G. Docs/preview (참고)
grep -RIn "<svg" stam/docs stam/*.html
# → 752 lines
```

---

## 3. Executive Summary

| 지표 | 값 |
|------|-----|
| **product inline SVG total** | **112** (`<svg` grep hits in `stam/pages` + `stam/js`; registry `renderStamIcon` template 1건 포함) |
| **registry usage total** | **54** (제품: `data-stam-icon` 50 + `renderStamIcon()` 4; `stam.icons.js` 내부 정의 12건 제외) |
| **registry key count** | **14** |
| **duplicated icon candidates** | **13** (registry key 존재 + 제품 inline/path 중복 그룹) |
| **immediate phase 2 candidates** | **9 files** (아래 §11 참조) |
| **HOLD candidates** | **6 categories** (shell gicon, unicode hist, wf-grip, template catalog, docs/preview, screen-specific semantic) |

**PR #272 전환 완료 화면 (registry PASS)**

- `requirements.html` — toolbar/detail/register/edit 아이콘 → `data-stam-icon` (inline SVG 2건만 잔존: 도메인 layout 아이콘)
- `menu-screen-list.html` — 동일 패턴 전환 완료
- `wbs.html` — toolbar/filter/search/chevron-down → `data-stam-icon` (JS inline SVG 11건 잔존)

**미전환 HOLD 화면**

- `functional-specification.html` — 18 inline SVG
- `open-scenario.html` — 26 inline SVG
- `screen-specification.html` — 11 inline SVG + `stam.screen-specification.js` 15건

---

## 4. Current Icon Registry

`stam/js/stam.icons.js` — PR #272 foundation

| key | viewBox | source status | note |
|-----|---------|---------------|------|
| `filter` | `0 0 16 16` | SSOT | WBS 16×16 source 채택; `stroke-width` 1.5 |
| `close` | `0 0 24 24` | SSOT | X 두 line |
| `edit` | `0 0 24 24` | SSOT | pencil; save와 구분 유지 |
| `save` | `0 0 24 24` | SSOT | floppy disk |
| `trash` | `0 0 24 24` | SSOT | 표준 delete (lid+body) |
| `search` | `0 0 24 24` | SSOT | 24×24 magnifier |
| `search-sm` | `0 0 14 14` | SSOT | WBS compact search |
| `plus` | `0 0 24 24` | SSOT | cross/plus |
| `download` | `0 0 24 24` | SSOT | arrow-down tray |
| `link` | `0 0 24 24` | SSOT | chain link |
| `chevron-down` | `0 0 16 16` | SSOT | 16×16; WBS gantt/grp toggle |
| `chevron-left` | `0 0 24 24` | SSOT | pagination prev |
| `chevron-right` | `0 0 24 24` | SSOT | pagination next |
| `calendar` | `0 0 24 24` | SSOT | date picker; **registry 등록만, 제품 호출 0** |

**API**

| symbol | line | role |
|--------|------|------|
| `window.STAM_ICONS` | 94 | registry object export |
| `window.renderStamIcon` | 95 | programmatic SVG render |
| `window.hydrateStamIcons` | 96 | `[data-stam-icon]` DOM hydration |
| `DOMContentLoaded` auto-hydrate | 98–104 | page load 시 자동 실행 |

---

## 5. Product Inline SVG Inventory

### 5.1 파일별 count

| file | count | area | icon meaning (대표) | decision | note |
|------|------:|------|---------------------|----------|------|
| `stam/pages/boards/open-scenario.html` | 26 | 보드 헤더·툴바·리스크·모달 | download, plus, list, layout, search, filter, trash-alt, close, risk icons | CONVERT | 최대 잔존; registry 미등록 key 다수 |
| `stam/pages/boards/functional-specification.html` | 18 | 보드 헤더·툴바·drawer·pagination | download, plus, search, filter, trash, chevron, close, save, edit, link | CONVERT | RQ/MSL 패턴과 동일 icon set inline |
| `stam/js/stam.screen-specification.js` | 15 | 동적 렌더·wizard·workflow | close, edit, chevron, check, file, grip, template icons | CONVERT/HOLD | `wf-grip`·template `iconPath` 일부 HOLD |
| `stam/pages/boards/screen-specification.html` | 11 | 보드 헤더·툴바·pagination | download, plus, search, filter, trash, chevron, edit | CONVERT | HTML 정적 잔존 |
| `stam/js/stam.wbs.js` | 11 | date picker·toast·select | calendar, chevron, check, alert variants | CONVERT/HOLD | `calendar` key 있으나 JS inline; toast semantic HOLD 검토 |
| `stam/js/stam.shell.js` | 8 | nav group gicon A–G | domain nav pictograms | HOLD | 12×12 IA 도메인 전용; registry 대상 아님 |
| `stam/js/stam.board-factory.js` | 7 | board factory toolbar·drawer | search, filter, trash, chevron, close, edit | CONVERT | `iconSvg()` helper가 inline path 유지 |
| `stam/js/stam.topbar-render.js` | 5 | global topbar | theme moon/sun, bell, chevron, user | CHECK | shell 공통; PR #275 후속 또는 별도 key |
| `stam/pages/boards/requirements.html` | 2 | 연결 타입 chip | layout/grid (rect+line) | HOLD | 도메인 semantic; registry key 없음 |
| `stam/js/stam.nav-render.js` | 2 | sidebar search | search-sm variant | CONVERT | `search-sm` key로 전환 가능 |
| `stam/js/stam.custom-select.js` | 2 | custom select | chevron-down, check | CONVERT | `chevron-down` + 신규 `check` key |
| `stam/js/stam.board-builder-preview.js` | 1 | builder preview | trash (extended variant) | CONVERT | `trash` vs lid-less variant — key 통일 검토 |
| `stam/js/stam.screen-specification-cycle.js` | 1 | cycle UI | inline SVG | CHECK | |
| `stam/js/stam.screen-specification-crud.js` | 1 | CRUD UI | inline SVG | CHECK | |
| `stam/js/stam.menu-screen-cycle.js` | 1 | cycle UI | inline SVG | CHECK | |
| `stam/js/stam.icons.js` | 1 | registry render | template output | DONE | SSOT render 함수; 제품 중복 아님 |

**제품 inline SVG 합계: 112** (pages 68 + js 44; `stam.icons.js` template 1 포함)

### 5.2 판정 분포

| decision | count (files) | inline SVG lines |
|----------|---------------|------------------|
| CONVERT | 9 | ~95 |
| HOLD | 3 | ~10 |
| CHECK | 4 | ~4 |
| DONE | 1 | 1 |

---

## 6. Registry Usage Inventory

### 6.1 파일별 registry 호출

| file | usage type | icon key | count | note |
|------|------------|----------|------:|------|
| `stam/pages/boards/requirements.html` | `data-stam-icon` hydrate | download, plus, search, filter, trash, chevron-left, chevron-right, close, link, save, edit | 23 | PR #272 전환 완료; layout chip SVG 2건 제외 |
| `stam/pages/boards/menu-screen-list.html` | `data-stam-icon` hydrate | download, plus, search, filter, trash, close, link, save, edit | 18 | PR #272 전환 완료 |
| `stam/pages/boards/wbs.html` | `data-stam-icon` hydrate | chevron-down, search-sm, filter | 9 | gantt/grp toggle + toolbar |
| `stam/js/stam.menu-screen-crud.js` | `renderStamIcon()` | close, save, plus, edit | 4 | dynamic row close + footer constants |
| `stam/js/stam.icons.js` | definition + hydrate | (all 14 keys) | 12 | SSOT; 제품 호출 아님 |

**제품 registry 호출 합계: 54** (`data-stam-icon` 50 + `renderStamIcon` 4)

### 6.2 key별 사용 빈도 (제품)

| icon key | data-stam-icon | renderStamIcon | total |
|----------|---------------:|---------------:|------:|
| plus | 11 | 1 | 12 |
| close | 8 | 1 | 9 |
| chevron-down | 7 | 0 | 7 |
| save | 6 | 1 | 7 |
| link | 3 | 0 | 3 |
| filter | 3 | 0 | 3 |
| edit | 3 | 1 | 4 |
| trash | 2 | 0 | 2 |
| search | 2 | 0 | 2 |
| download | 2 | 0 | 2 |
| search-sm | 1 | 0 | 1 |
| chevron-right | 1 | 0 | 1 |
| chevron-left | 1 | 0 | 1 |
| calendar | 0 | 0 | 0 |

---

## 7. Duplicate / Variant Findings

registry key가 존재하나 제품에 동일 의미 inline SVG/path가 중복된 그룹입니다.

| icon meaning | files | difference | risk | recommendation |
|--------------|-------|------------|------|----------------|
| **filter** | `functional-specification.html`, `open-scenario.html`, `screen-specification.html`, `stam.board-filter.js` | viewBox 16 vs 24; stroke-width 1.5/1.6/1.8 | 시각 drift | `filter` key + `data-stam-icon` 전환 |
| **close** | `functional-specification.html`, `open-scenario.html`, `stam.board-factory.js`, `stam.screen-specification.js` | path 동일; size 14 vs registry default | 중복 source | `close` key 전환 |
| **edit** | `functional-specification.html`, `screen-specification.html`, `stam.board-factory.js`, `stam.screen-specification.js` | path 미세 차이 (`9.5-9.5z` vs `9.5z`) | path drift | `edit` key SSOT 통일 |
| **save** | `functional-specification.html` | registry와 동일 path | 중복 | `save` key 전환 |
| **trash** | `functional-specification.html`, `open-scenario.html`, `screen-specification.html`, `stam.board-factory.js`, `stam.board-builder-preview.js`, `stam.screen-specification.js` | standard vs extended (lid-less / extra lines) | 2 variant | `trash` key + variant 정책 결정 |
| **search** | `functional-specification.html`, `open-scenario.html`, `screen-specification.html`, `stam.board-factory.js`, `stam.nav-render.js` | 24×24 vs 14×14 | size variant | `search` / `search-sm` 분리 유지 |
| **plus** | `functional-specification.html`, `open-scenario.html`, `screen-specification.html` | registry와 동일 | 중복 | `plus` key 전환 |
| **download** | `functional-specification.html`, `open-scenario.html`, `screen-specification.html` | registry와 동일 | 중복 | `download` key 전환 |
| **link** | `functional-specification.html` | registry와 동일 | 중복 | `link` key 전환 |
| **chevron-left/right** | `functional-specification.html`, `screen-specification.html` | registry와 동일 polyline | 중복 | key 전환 |
| **chevron-down** | `stam.wbs.js`, `stam.custom-select.js`, `stam.screen-specification.js` | 16×16 registry vs 24×24 inline `M6 9l6 6 6-6` | viewBox drift | registry `chevron-down` 또는 `chevron-down-24` variant |
| **calendar** | `stam.wbs.js:862` | registry 등록됨; JS inline 동일 path | key 미사용 | `renderStamIcon('calendar')` 전환 |
| **check** | `stam.custom-select.js`, `stam.wbs.js`, `stam.screen-specification.js` | registry **미등록**; 5+ 중복 | 신규 key 필요 | PR #275에 `check` key 추가 |

**duplicated icon candidates count: 13** (registry key 12개 중복 + check 미등록 1그룹)

### path 패턴 grep 결과 (C 보조)

```
# filter path M2 4h12...
→ 4 product locations (+ registry)

# close x1="18" y1="6"...
→ 7 product locations (+ registry)

# edit M11 4H4 / trash polyline 3 6 / search circle cx="11"
→ 각 5–10 product locations
```

---

## 8. Screen-specific Icon Class Findings

grep `class=.*icon|[-_]icon` → **295 lines**. 유형별 분류:

### 8.1 JS hook용 class (삭제 대상 아님)

| class | file | type | decision | note |
|-------|------|------|----------|------|
| `rq-btn-pri` 등 `*-btn` | requirements | JS hook | retain | 버튼 hook; visual은 `stam-btn` |
| `wbs-grp-toggle-btn` | wbs.html | JS hook | retain | collapse toggle |
| `ss-pgb` | screen-specification.html | JS hook | retain | pagination |
| `bf-dw-close` | board-factory.js | JS hook | retain | drawer close button |

### 8.2 visual icon class (registry 연동 또는 중복 source)

| class | file | type | decision | note |
|-------|------|------|----------|------|
| `stam-board-action-icon` | requirements, msl, wbs (registry) + fs, os, ss (inline) | visual sizing | mixed | registry 화면은 PASS; inline 화면은 CONVERT |
| `stam-icon-filter` | requirements, msl, wbs | registry visual | PASS | `data-stam-icon-class` 조합 |
| `stam-icon-muted` | menu-screen-list.html | registry visual | PASS | search 색상 |
| `stam-btn-icon` | open-scenario.html | inline visual | CONVERT | filter/trash inline SVG wrapper |
| `stam-list-search-icon` | open-scenario.html | inline visual | CONVERT | search inline |
| `os-risk-icon` | open-scenario.html | screen-specific | HOLD/CHECK | semantic risk icons 4종 |

### 8.3 legacy 화면 전용 class

| class | file | type | decision | note |
|-------|------|------|----------|------|
| `msl-edit-sum-ic` | menu-screen-list.html | legacy wrapper | retain | `data-stam-icon="edit"` 호스트; PR #275에서 정리 검토 |
| `rq-*-icon` | (잔존 없음) | legacy | removed | PR #266에서 visual alias 제거됨 |
| `wbs-chevron-icon` | stam.wbs.css | legacy CSS | CONVERT | `data-stam-icon` 전환 후 unused 제거 |
| `wbs-dp-caret`, `wbs-sel-ck` | stam.wbs.js | inline SVG class | CONVERT | chevron inline |

### 8.4 registry 공통 class

| class | file | type | decision | note |
|-------|------|------|----------|------|
| `stam-icon` | stam.icons.js, stam.components.css | SSOT | PASS | registry output class |
| `stam-icon-{key}` | render output | SSOT | PASS | e.g. `stam-icon-filter` |
| `is-xs`, `is-sm`, `is-md` | pages | size modifier | PASS | `data-stam-icon-class` |

### 8.5 후속 제거 대상

| class | file | type | decision | note |
|-------|------|------|----------|------|
| `stam.icons.css` mask-image rules | stam.icons.css | legacy mask SSOT | deprecate | PR #272 이후 inline SVG registry가 SSOT; mask CSS는 미사용 잔재 |
| `bf-filter-btn .stam-icon-filter` | stam.icons.css:76 | unused combo | remove | board-factory가 아직 inline |

**특정 class 잔존 grep**

- `rq-.*icon` — **0건** (제거 완료)
- `msl-.*icon` — `msl-edit-sum-ic` 1건 (wrapper)
- `wbs-.*icon` — `wbs-dw-hist-icon`, `wbs-form-alert-icon`, `wbs-chevron-icon` 등 (unicode/SVG 혼재)
- `stam-icon-filter` — registry 화면 3건 PASS
- `stam-board-action-icon` — registry 6 + inline 10건
- `stam-icon-muted` — 1건 PASS

---

## 9. Script Load Order Findings

| page | stam.icons.js order | dependent JS | result |
|------|---------------------|--------------|--------|
| `menu-screen-list.html` | line 948 | `stam.menu-screen-crud.js` line 963 (`renderStamIcon`) | **PASS** |
| `requirements.html` | line 786 | `stam.requirements-crud.js` line 802 (registry 미호출) | **PASS** |
| `wbs.html` | line 1822 | `stam.wbs.js` line 1830 (inline SVG; HTML `data-stam-icon` hydrate) | **PASS** |
| `functional-specification.html` | 미로드 | — | **N/A** |
| `open-scenario.html` | 미로드 | — | **N/A** |
| `screen-specification.html` | 미로드 | `stam.screen-specification.js` (inline SVG) | **N/A** |

**판정:** registry 사용 3화면 모두 `stam.icons.js`가 dependent JS보다 먼저 로드됨. PR #275 전환 시 미로드 화면에 script 추가 필요.

---

## 10. Docs / Preview SVG Reference

**제품 PASS/FAIL 판단에 미반영** — 후속 정리 참고용.

| area | count | recommendation |
|------|------:|----------------|
| `stam/docs/**` + `stam/*.html` | **752** | 후속 docs normalization 대상 |
| `STAM-Docs-Index.html` | 125 | index/nav icon preview |
| `STAM-WBS-Mobile-Board-Applied-Preview-v1.html` | 124 | WBS mobile preview |
| `stam/docs/components/**` | 108 | component catalog SVG |
| Form/Shell/Mobile preview HTML | ~200 | applied preview fixtures |
| `stam/index.html` 등 root | 5+ | landing |

docs/preview는 제품 registry 전환 완료 후 별도 PR에서 정리 권장.

---

## 11. PR #275 Recommended Scope

### 1. 우선 전환할 제품 파일 목록

| priority | file | inline SVG | rationale |
|----------|------|----------:|-----------|
| P0 | `stam/pages/boards/functional-specification.html` | 18 | RQ/MSL과 동일 board 패턴; registry key 대부분 존재 |
| P0 | `stam/pages/boards/open-scenario.html` | 26 | 최대 잔존; board header/toolbar 일괄 전환 |
| P0 | `stam/pages/boards/screen-specification.html` | 11 | board header/toolbar |
| P1 | `stam/js/stam.board-factory.js` | 7 | 공통 board factory; 다화면 영향 |
| P1 | `stam/js/stam.screen-specification.js` | 15 | 동적 렌더 다수; 단계적 전환 |
| P2 | `stam/js/stam.wbs.js` | 11 | `calendar` key 이미 등록; date picker·select |
| P2 | `stam/js/stam.board-filter.js` | 1 path | filter path inline |
| P2 | `stam/js/stam.custom-select.js` | 2 | chevron + check |
| P2 | `stam/js/stam.nav-render.js` | 2 | search-sm 전환 |

### 2. 추가해야 할 registry key 목록

| proposed key | viewBox | source candidate | used by |
|--------------|---------|------------------|---------|
| `check` | `0 0 24 24` | `stam.custom-select.js` CHECK_SVG | custom-select, wbs, screen-spec |
| `chevron-up` | `0 0 24 24` | `stam.wbs.js` navU | date picker nav |
| `list` | `0 0 24 24` | `open-scenario.html` board action | list view toggle |
| `layout` | `0 0 24 24` | requirements chip, open-scenario | grid/layout toggle |
| `info` | `0 0 24 24` | open-scenario risk, wbs toast | alert-circle |
| `alert-triangle` | `0 0 24 24` | open-scenario, wbs danger toast | warning |
| `users` | `0 0 24 24` | open-scenario risk | people icon |
| `file` | `0 0 24 24` | screen-specification.js | document icon |
| `check-circle` | `0 0 24 24` | open-scenario risk | success state |

기존 key 활성화: `calendar` (등록만, 호출 0)

### 3. 제거/대체할 inline SVG 목록 (registry key 매핑)

| inline location | → registry key |
|-----------------|----------------|
| fs/os/ss board header download | `download` |
| fs/os/ss board header plus | `plus` |
| fs/os/ss toolbar search | `search` |
| fs/os/ss toolbar filter | `filter` |
| fs/os/ss toolbar trash | `trash` |
| fs/ss pagination chevron | `chevron-left`, `chevron-right` |
| fs/os modal close | `close` |
| fs drawer save/plus/edit | `save`, `plus`, `edit` |
| fs link chip | `link` |
| wbs.js calIc | `calendar` |
| custom-select CARET | `chevron-down` (viewBox 정책 확인) |
| custom-select CHECK | `check` (신규) |
| board-factory search/filter/trash/close | `search`, `filter`, `trash`, `close` |

### 4. 건드리면 안 되는 HOLD 항목

| item | reason |
|------|--------|
| `stam.shell.js` gicon A–G | 12×12 IA nav domain pictograms |
| `stam.screen-specification.js` `wf-grip` | drag handle; UI affordance 전용 |
| `stam.screen-specification.js` template `iconPath` catalog data | 도메인 template metadata |
| `wbs-dw-hist-icon` unicode (↺, ✎, ●) | text symbol; SVG registry 대상 아님 |
| `wbs-form-alert-icon` (⚠) | unicode alert |
| `requirements.html` layout chip SVG (2) | 도메인 semantic until `layout` key 정책 확정 |
| `stam/docs/**`, `stam/*.html` preview SVG (752) | docs-only; 제품 전환 후 별도 PR |
| `stam.topbar-render.js` theme moon/sun | shell infra; key 정책 PM 확인 후 |

### 5. 예상 변경 파일

```
stam/js/stam.icons.js                    # 신규 key 추가
stam/css/stam.components.css             # is-* size tokens (필요 시)
stam/pages/boards/functional-specification.html
stam/pages/boards/open-scenario.html
stam/pages/boards/screen-specification.html
stam/js/stam.board-factory.js
stam/js/stam.screen-specification.js     # 단계적
stam/js/stam.wbs.js
stam/js/stam.board-filter.js
stam/js/stam.custom-select.js
stam/js/stam.nav-render.js
stam/css/stam.icons.css                  # legacy mask deprecate 검토
```

### 6. 회귀 QA 항목

- [ ] RQ/MSL/WBS registry 화면: icon hydrate 정상 (PR #272 회귀 없음)
- [ ] FS/OS/SS board header action icons (download, plus, list, layout)
- [ ] FS/OS/SS toolbar (search, filter, trash) — filter 16×16 유지
- [ ] Drawer/modal close, save, edit, plus
- [ ] Pagination chevron-left/right
- [ ] WBS date picker calendar + chevron
- [ ] Custom select caret + check
- [ ] Dark mode + mobile 430px
- [ ] Console error 0
- [ ] `stam.icons.js` load order PASS on newly converted pages

---

## 12. Final Audit Decision

```
FINAL: AUDIT_COMPLETE_PENDING_PM_REVIEW
```

### PASS

- PR #272 Icon Registry foundation is present (`stam/js/stam.icons.js`, 14 keys, `renderStamIcon` / `hydrateStamIcons` API)
- target pages (`requirements.html`, `menu-screen-list.html`, `wbs.html`) use registry calls for converted icons (54 product invocations)
- `stam.icons.js` load order is safe for converted pages (3/3 PASS)

### HOLD

- remaining inline SVG list exists (**112** product `<svg` hits; **~95** CONVERT 대상)
- registry missing keys exist: `check`, `chevron-up`, `list`, `layout`, `info`, `alert-triangle`, `users`, `file`, `check-circle` (+ `calendar` 미호출)
- docs/preview SVG not yet normalized (**752** lines, 별도 scope)
- screen-specific visual icon classes remain (`stam-board-action-icon` on inline pages, `os-risk-icon`, `wbs-*-icon`, legacy mask CSS in `stam.icons.css`)

### NEXT

- PR #275 implementation scope based on this audit
- PM source review 후 P0→P1→P2 순서로 전환
- docs/preview normalization은 제품 PR #275 이후 별도 추적

---

*Audit commands executed against `33eadaeb5205710b5479d7cb7ca63cbdb71b3381`. Product source read-only; no product files modified.*
