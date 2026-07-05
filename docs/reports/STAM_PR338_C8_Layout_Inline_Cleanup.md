# STAM PR #338 — C8 Layout Inline Cleanup

## 목적

`stam/pages/boards/open-scenario.html` 잔여 layout inline `style=""` 2건을 CSS/class 기반으로 이동한다. C8 오픈 시나리오 화면 inline style **0** 목표 달성.

## 수치 (PR #337 이후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **2** | **0** | −2 |
| `margin-left:auto` inline | **1** | **0** | `.os-tbl-count` CSS |
| `flex:1` inline | **1** | **0** | `.stam-dw-foot-spacer` (공통) |
| 신규 CSS/JS 파일 | — | **0** | |

## 변경 요약

| 대상 | Before | After |
|------|--------|-------|
| `.os-tbl-count` | `style="margin-left:auto"` | `.os-tbl-count { margin-left: auto; }` (`stam.open-scenario.css`) |
| Drawer footer spacer | `<div style="flex:1">` | `<div class="stam-dw-foot-spacer">` (`stam.drawer.css` 기존) |

```css
.os-tbl-count { font-size: 11px; color: var(--t3); margin-left: auto; }
```

```css
/* stam.drawer.css — 기존 공통 class 재사용 */
.stam-dw-foot-spacer { flex: 1; }
```

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.open-scenario.css`, `stam.drawer.css` (기존) |
| JS | 변경 없음 |
| 클래스 | `.os-tbl-count`, `.stam-dw-foot-spacer`, `.stam-drawer-foot` |

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `stam/css/stam.open-scenario.css`
- `docs/reports/STAM_PR338_C8_Layout_Inline_Cleanup.md` (신규)

## 미변경

- `stam/js/stam.open-scenario.js`
- `stam/js/stam.board-filter.js`
- `stam/js/stam.project-context-guard.js`
- `stam/js/stam.nav-data.js`
- `stam/pages/**` 내 다른 화면
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/open-scenario.html
rg 'margin-left:auto|flex:1' stam/pages/boards/open-scenario.html
node --check stam/js/stam.open-scenario.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| inline style/script | 0 |
| 금지 경로 변경 | 없음 |
| 공통 drawer spacer 재사용 | `.stam-dw-foot-spacer` (requirements / MSL / FN 동일 패턴) |
