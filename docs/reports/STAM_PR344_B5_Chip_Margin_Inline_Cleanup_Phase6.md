# STAM PR #344 — B5 Chip Margin Inline Cleanup Phase 6

## 목적

B5 `functional-specification.html` Drawer header chip `margin-left` inline 2건을 CSS/class 기반으로 이동한다. B5 inline cleanup **Phase 6** — chip margin-left inline만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #343 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **30** | **28** | −2 |
| chip `margin-left` inline | **2** | **0** | Phase 6 완료 |
| 기타 inline (form/linked/tab/textarea 등) | 28 | 28 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

### chip margin-left inline breakdown (Before)

| # | 위치 | inline | After |
|---|------|--------|-------|
| 1 | 상세 Drawer header (`#fn-dw-detail`) | `style="margin-left:4px"` on `.fn-chip-done` | `.fn-chip-ml` |
| 2 | 수정 Drawer header (`#fn-dw-edit`) | `style="margin-left:4px"` on `.fn-chip-done` | `.fn-chip-ml` |

요구사항 `.rq-chip-ml { margin-left:4px }` (PR #86) 패턴과 동일.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-chip-ml`, `.fn-chip`, `.fn-chip-done` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR344_B5_Chip_Margin_Inline_Cleanup_Phase6.md` (신규)

## 미변경 (Phase 6 범위 외)

- 등록 Drawer header `margin-left:2px` (313, non-chip)
- linked card `margin-left:auto` (544, 552)
- tab panel / textarea / fn-ik margin-bottom inline
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 28
rg -n 'margin-left' stam/pages/boards/functional-specification.html | rg 'fn-chip.*style'  # 0
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| chip margin-left inline | 0 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 7+)

- linked cards layout/icon inline
- tab panel `display:none`
- textarea `min-height` inline
- 등록 Drawer header inline
