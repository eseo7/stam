# STAM PR #346 — B5 Tab Panel Display Inline Cleanup Phase 8

## 목적

B5 `functional-specification.html` 상세 Drawer tab panel 초기 숨김용 inline `style="display:none"` 2건을 CSS/class 기반으로 이동한다. B5 inline cleanup **Phase 8** — tab panel `display:none` inline만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #345 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **22** | **20** | −2 |
| tab panel `display:none` inline | **2** | **0** | Phase 8 완료 |
| 기타 inline (textarea / fn-ik / 등록 Drawer 등) | 20 | 20 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

### tab panel inline breakdown (Before)

| # | 라인 | inline | After |
|---|------|--------|-------|
| 1 | 559 | `display:none` (기능 내용 탭) | `#fn-dw-detail` + `.fn-dw-tab.on` CSS |
| 2 | 588 | `display:none` (변경 이력 탭) | 동일 |

## 접근 방식

`stam/js/stam.functional-specification.js` tab 전환은 `p.style.display = i === idx ? '' : 'none'` 계약을 유지한다 (본 PR에서 JS 변경 금지).

- C8(PR #337)은 `.os-tab-panel.is-active` + JS `classList` 전환.
- B5는 JS 미변경 조건 하에 **`.fn-dw-tab.on` + `:has()`** 로 활성 패널만 `display:block` 노출.
- 비활성 패널은 CSS 기본 `display:none` + JS inline `display:none` 이중 적용 (동작 동일).

```css
#fn-dw-detail .fn-tab-panel { display: none; }
#fn-dw-detail:has(.fn-dw-tabs .fn-dw-tab:nth-child(1).on) .fn-dw-body > .fn-tab-panel:nth-child(1),
#fn-dw-detail:has(.fn-dw-tabs .fn-dw-tab:nth-child(2).on) .fn-dw-body > .fn-tab-panel:nth-child(2),
#fn-dw-detail:has(.fn-dw-tabs .fn-dw-tab:nth-child(3).on) .fn-dw-body > .fn-tab-panel:nth-child(3) { display: block; }
```

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 (`STAM.functional-specification.js` tab handler 유지) |
| 클래스 | `.fn-tab-panel`, `.fn-dw-tab.on`, `#fn-dw-detail` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR346_B5_Tab_Panel_Display_Inline_Cleanup_Phase8.md` (신규)

## 미변경 (Phase 8 범위 외)

- fn-ik `margin-bottom` inline
- textarea `min-height` inline
- 등록 Drawer header inline
- content layout `display:flex` inline
- history `strong` color inline
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 20
rg -n 'display:none|display: none' stam/pages/boards/functional-specification.html  # 0
rg -n 'fn-tab-panel' stam/pages/boards/functional-specification.html
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| tab panel `display:none` inline | 0 |
| inline style/script 신규 | 없음 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |
| tab switching JS | 미변경 |

## 후속 (Phase 9+)

- fn-ik `margin-bottom` inline
- textarea `min-height` inline
- 등록 Drawer header inline
- content layout `display:flex` inline
- history `strong` color inline
