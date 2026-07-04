# STAM PR #337 — C8 Display None Inline Cleanup

## 목적

`stam/pages/boards/open-scenario.html` 잔여 inline `display:none` 6건을 CSS/class 기반으로 이동한다. Filter count badge 초기 숨김과 Drawer tab panel 전환을 정리한다.

## 수치 (PR #336 이후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **8** | **2** | −6 |
| `display:none` inline | **6** | **0** | filter count 1 + drawer panels 5 |
| `margin-left:auto` / `flex:1` | 2 | 2 | **#338 대상** |
| 신규 CSS/JS 파일 | — | **0** | |

## 변경 요약

| 대상 | Before | After |
|------|--------|-------|
| `#os-filter-count` | `style="display:none"` | `.stam-board-filter-count` (기존 `stam.board-filter.css`) |
| Drawer tab panels | `style="display:none"` (5) | `.os-tab-panel` / `.os-tab-panel.is-active` |
| `bindDrawerTabs()` | `panel.style.display` | `panel.classList.toggle('is-active')` |

```css
.os-tab-panel { display: none; }
.os-tab-panel.is-active { display: block; }
```

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `stam/css/stam.open-scenario.css`
- `stam/js/stam.open-scenario.js` — `bindDrawerTabs()` only
- `docs/reports/STAM_PR337_C8_Display_None_Inline_Cleanup.md` (신규)

## 미변경

- `stam.board-filter.js` — 공통 컴포넌트 (`.visible` + `style.display` 계약 유지)
- `stam.project-context-guard.js`
- table row/cell/colgroup/status/text
- `margin-left:auto`, `flex:1` inline
- Firestore / Auth / CRUD

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/open-scenario.html
rg 'display:none' stam/pages/boards/open-scenario.html
node --check stam/js/stam.open-scenario.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| `stam.board-filter.js` 변경 | 없음 |
| `display:none` inline | 0 |

## 후속 (#338)

- `.os-tbl-count` `margin-left:auto` (1)
- Drawer footer `flex:1` (1) → C8 inline **0** 목표
