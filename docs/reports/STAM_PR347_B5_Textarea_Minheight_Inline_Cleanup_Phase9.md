# STAM PR #347 — B5 Textarea Min-height Inline Cleanup Phase 9

## 목적

B5 `functional-specification.html` 등록·수정 Drawer textarea `min-height` inline style 10건을 CSS class 기반으로 이동한다. B5 inline cleanup **Phase 9** — textarea 높이 정적 표시값만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #346 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **20** | **10** | −10 |
| textarea `min-height` inline | **10** | **0** | Phase 9 완료 |
| 기타 inline (등록 Drawer / fn-ik / layout 등) | 10 | 10 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

### textarea min-height inline breakdown (Before)

| # | Drawer | 필드 | inline | After |
|---|--------|------|--------|-------|
| 1 | 등록 | 기능 설명 | `min-height:72px` | `.fn-ta-h72` |
| 2 | 등록 | 입력 조건 | `min-height:60px` | `.fn-ta-h60` |
| 3 | 등록 | 처리 규칙 | `min-height:72px` | `.fn-ta-h72` |
| 4 | 등록 | 예외/오류 처리 | `min-height:60px` | `.fn-ta-h60` |
| 5 | 등록 | 비고 | `min-height:60px` | `.fn-ta-h60` |
| 6 | 수정 | 기능 설명 | `min-height:72px` | `.fn-ta-h72` |
| 7 | 수정 | 입력 조건 | `min-height:60px` | `.fn-ta-h60` |
| 8 | 수정 | 처리 규칙 | `min-height:72px` | `.fn-ta-h72` |
| 9 | 수정 | 예외/오류 처리 | `min-height:60px` | `.fn-ta-h60` |
| 10 | 수정 | 비고 | `min-height:60px` | `.fn-ta-h60` |

`stam.board-configs.js` B5 field `minHeight: '72px' | '60px'` 와 동일값.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css`, `stam.form-controls.css` (`.stam-textarea` base) |
| JS | 변경 없음 |
| 클래스 | `textarea.fn-inp.fn-ta-h72`, `textarea.fn-inp.fn-ta-h60`, `.stam-textarea` |

```css
textarea.fn-inp.fn-ta-h72 { min-height:72px }
textarea.fn-inp.fn-ta-h60 { min-height:60px }
```

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR347_B5_Textarea_Minheight_Inline_Cleanup_Phase9.md` (신규)

## 미변경 (Phase 9 범위 외)

- 등록 Drawer header inline
- fn-ik `margin-bottom` inline
- content layout `display:flex` inline
- history `strong` color inline
- tab panel visibility (Phase 8 완료)
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 10
rg -n 'min-height' stam/pages/boards/functional-specification.html  # 0
rg -n 'fn-ta-h72|fn-ta-h60' stam/pages/boards/functional-specification.html  # 10
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| textarea `min-height` inline | 0 |
| inline style/script 신규 | 없음 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 10+)

- 등록 Drawer header inline
- fn-ik `margin-bottom` inline
- content layout `display:flex` inline
- history `strong` color inline
