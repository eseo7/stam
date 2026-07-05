# STAM PR #348 — B5 Input Key Margin Inline Cleanup Phase 10

## 목적

B5 `functional-specification.html` 상세 Drawer 기능 내용 탭 `fn-ik` `margin-bottom` inline style 5건을 CSS class 기반으로 이동한다. B5 inline cleanup **Phase 10** — `fn-ik` margin-bottom inline만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #347 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **10** | **5** | −5 |
| `fn-ik` `margin-bottom` inline | **5** | **0** | Phase 10 완료 |
| 기타 inline (등록 Drawer / layout / history 등) | 5 | 5 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

### fn-ik margin-bottom inline breakdown (Before)

| # | 필드 | inline | After |
|---|------|--------|-------|
| 1 | 기능 설명 | `margin-bottom:6px` | `.fn-ik-mb6` |
| 2 | 입력 조건 | `margin-bottom:6px` | `.fn-ik-mb6` |
| 3 | 처리 규칙 | `margin-bottom:6px` | `.fn-ik-mb6` |
| 4 | 예외/오류 처리 | `margin-bottom:6px` | `.fn-ik-mb6` |
| 5 | 관련 API/연동 | `margin-bottom:6px` | `.fn-ik-mb6` |

기본 `.fn-ik` margin-bottom 4px 유지. 기능 내용 탭 purp-box 레이아웃용 6px variant만 modifier로 분리.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-ik`, `.fn-ik.fn-ik-mb6` |

```css
.fn-ik.fn-ik-mb6 { margin-bottom:6px }
```

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR348_B5_Input_Key_Margin_Inline_Cleanup_Phase10.md` (신규)

## 미변경 (Phase 10 범위 외)

- 등록 Drawer header inline
- content layout `display:flex` inline
- history `strong` color inline
- Summary Strip / Toolbar / colgroup / table tbody
- Drawer owner/avatar/date / chip margin / linked card
- tab panel display / textarea min-height
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing / filter

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 5
rg -n 'margin-bottom' stam/pages/boards/functional-specification.html  # 0 (HTML)
rg -n 'fn-ik-mb6' stam/pages/boards/functional-specification.html  # 5
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| `fn-ik` margin-bottom inline | 0 |
| inline style/script 신규 | 없음 |
| 금지 경로 변경 | 없음 |
| JS/CRUD/필터/tab 로직 | 미변경 |

## 후속 (Phase 11+)

- 등록 Drawer header inline (3)
- content layout `display:flex` inline (1)
- history `strong` color inline (1)
