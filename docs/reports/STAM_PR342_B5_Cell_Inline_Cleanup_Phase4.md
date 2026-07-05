# STAM PR #342 — B5 Cell Inline Cleanup Phase 4

## 목적

B5 `functional-specification.html` table row/cell 영역 담당자/avatar/date inline `style=""` 20건을 CSS/class 기반으로 이동한다. B5 inline cleanup **Phase 4** — Table tbody 표시용 inline만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #341 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **59** | **39** | −20 |
| Table tbody (owner/avatar/date) inline | **20** | **0** | 5 rows × 4 inline |
| Drawer / form inline | 39 | 39 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

### Table cell inline breakdown (Before)

| 유형 | inline | 건수 |
|------|--------|------|
| owner wrapper `display:flex;…` | `style="display:flex;align-items:center;gap:5px"` | 5 |
| avatar background | `style="background:#5451E8\|#8B5CF6\|#10B981"` | 5 |
| owner name | `style="font-size:12px;color:var(--t2)"` | 5 |
| updated date cell | `style="font-size:11.5px;color:var(--t3)"` | 5 |

## 변경 요약

| 대상 | Before | After |
|------|--------|-------|
| owner wrapper | `style="display:flex;…"` | `.fn-who` |
| avatar bg | `style="background:#…"` | `.fn-ava--bg-5451e8` / `--bg-8b5cf6` / `--bg-10b981` |
| owner name | `style="font-size:12px;color:var(--t2)"` | `.fn-owner-name` |
| updated date | `<td style="font-size:11.5px;…">` | `<td class="fn-updated-cell">` |

C8 `.os-who` / `.os-ava--bg-*` (PR #333) 패턴과 동일 naming.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-who`, `.fn-owner-name`, `.fn-updated-cell`, `.fn-ava--bg-*` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR342_B5_Cell_Inline_Cleanup_Phase4.md` (신규)

## 미변경 (Phase 4 범위 외)

- Drawer owner/avatar inline (lines 473+, 510+)
- Drawer tab panel / form / textarea inline
- 등록 Drawer header inline
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 39
rg -n 'style=' stam/pages/boards/functional-specification.html | rg '^19[0-9]|^2[0-8][0-9]'  # 0 (tbody)
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| Table cell inline | 0 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 5+)

- Drawer owner/avatar/cell inline
- Drawer tab panel `display:none`
- Form textarea `min-height` inline
