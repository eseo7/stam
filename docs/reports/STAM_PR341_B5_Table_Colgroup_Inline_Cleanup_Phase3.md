# STAM PR #341 — B5 Table Colgroup Inline Cleanup Phase 3

## 목적

B5 `functional-specification.html` table `<colgroup>` `width` / `min-width` inline 9건을 `stam/css/stam.functional-specification.css` class로 이동한다. B5 inline cleanup **Phase 3** — colgroup width만 핀셋 정리.

## 수치 (PR #340 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **68** | **59** | −9 |
| Table colgroup inline | **9** | **0** | Phase 3 완료 |
| 신규 CSS/JS 파일 | — | **0** | |

## Class mapping (값 정확 보존)

| # | 컬럼 | Class | width |
|---|------|-------|-------|
| 1 | checkbox | `.fn-col-ch` | `40px` |
| 2 | 기능 ID / 기능명 | `.fn-col-title` | `min-width: 220px` |
| 3 | 연결 요구사항 | `.fn-col-req` | `100px` |
| 4 | 연결 화면 | `.fn-col-screen` | `130px` |
| 5 | 기능유형 | `.fn-col-type` | `80px` |
| 6 | 우선순위 | `.fn-col-priority` | `76px` |
| 7 | 상태 | `.fn-col-status` | `88px` |
| 8 | 담당자 | `.fn-col-owner` | `80px` |
| 9 | 최종 수정일 | `.fn-col-updated` | `100px` |

요구사항정의서 `.rq-table col.rq-col-*` (PR #86) 및 C8 `.os-scenario-table .os-col-*` (PR #335) 패턴과 동일.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-table`, `.fn-col-ch`, `.fn-col-title`, `.fn-col-req`, `.fn-col-screen`, `.fn-col-type`, `.fn-col-priority`, `.fn-col-status`, `.fn-col-owner`, `.fn-col-updated` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR341_B5_Table_Colgroup_Inline_Cleanup_Phase3.md` (신규)

## 미변경 (Phase 3 범위 외)

- 담당자 avatar / cell inline
- Drawer 내부 inline
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg 'style=' stam/pages/boards/functional-specification.html | rg 'colgroup|<col'  # 0
rg -c 'style=' stam/pages/boards/functional-specification.html  # 59
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| Colgroup inline | 0 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 4+)

- 담당자 avatar / cell inline
- Drawer tab panel / form inline
