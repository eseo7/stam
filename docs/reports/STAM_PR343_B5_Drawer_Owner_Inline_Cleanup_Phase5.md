# STAM PR #343 — B5 Drawer Owner Inline Cleanup Phase 5

## 목적

B5 `functional-specification.html` 상세 Drawer (`#fn-dw-detail`) owner/avatar/date/info-grid cell inline `style=""` 9건을 CSS/class 기반으로 이동한다. B5 inline cleanup **Phase 5** — Drawer owner/avatar/date 표시용 inline만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #342 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **39** | **30** | −9 |
| 상세 Drawer owner/avatar/date/cell inline | **9** | **0** | Phase 5 완료 |
| 등록 Drawer / form / linked / tab inline | 30 | 30 | **미변경** |
| Table tbody inline | 0 | 0 | PR #342 유지 |
| 신규 CSS/JS 파일 | — | **0** | |

### Drawer inline breakdown (Before)

| # | 위치 | inline | After |
|---|------|--------|-------|
| 1 | header owner wrapper | `display:flex;align-items:center;gap:5px;margin-left:4px` | `.fn-dw-owner` |
| 2 | header avatar | `background:#5451E8` | `.fn-ava--bg-5451e8` (PR #342 재사용) |
| 3 | header owner name | `font-size:11.5px;color:var(--t2)` | `.fn-dw-owner-name` |
| 4 | info grid 기능 ID | `font-weight:700;color:var(--stam)` | `.fn-iv-id` |
| 5 | info grid 담당자 avatar | `background:#5451E8` | `.fn-ava--bg-5451e8` |
| 6 | info grid 최종 수정일 | `font-size:12px` on `.fn-iv` | `.fn-iv.fn-iv-date` |
| 7 | info grid 미연결 | `color:var(--t3)` | `.fn-iv-muted` |
| 8 | info grid 검토 상태 | `font-size:11.5px` | `.fn-iv-dash` |
| 9 | info grid Import 배치 | `font-size:11px;color:var(--t3)` | `.fn-iv-dash-muted` |

요구사항 `.rq-dw-owner` / `.rq-dw-owner-name` (PR #86) 패턴과 동일 naming.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-dw-owner`, `.fn-dw-owner-name`, `.fn-iv-id`, `.fn-iv-date`, `.fn-iv-muted`, `.fn-iv-dash`, `.fn-iv-dash-muted`, `.fn-ava--bg-5451e8` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR343_B5_Drawer_Owner_Inline_Cleanup_Phase5.md` (신규)

## 미변경 (Phase 5 범위 외)

- chip `margin-left:4px` (header/edit drawer)
- 등록 Drawer header inline (313, 321, 334)
- textarea `min-height` inline
- linked cards / tab panel / history inline
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 30
rg -n 'style=' stam/pages/boards/functional-specification.html | rg 'fn-dw-owner|fn-ava.*style|fn-iv.*style'  # 0
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| Drawer owner/avatar/date inline | 0 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 6+)

- chip margin-left inline
- linked cards layout/icon inline
- tab panel `display:none`
- textarea `min-height` inline
