# STAM PR #350 — B5 Final Inline Cleanup Phase 12

## 목적

B5 `functional-specification.html` 잔여 inline style 2건을 CSS class 기반으로 이동하고, B5 화면 **정적 HTML inline style 0건**을 달성한다. B5 inline cleanup **Phase 12** (최종).

## 수치 (작업 전 `rg` 측정, PR #349 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **2** | **0** | −2, **B5 목표 달성** |
| content layout inline | **1** | **0** | `.fn-purp-list` |
| history strong color inline | **1** | **0** | `.fn-chg-em` |
| 신규 CSS/JS 파일 | — | **0** | |

### 잔여 inline breakdown (Before)

| # | 위치 | inline | After |
|---|------|--------|-------|
| 1 | 기능 내용 탭 content wrapper | `display:flex;flex-direction:column;gap:14px` | `.fn-purp-list` |
| 2 | 변경 이력 상태 strong | `color:var(--stam)` | `.fn-chg-em` |

## B5 inline cleanup 전체 수치 (Phase 1–12)

| Phase | PR | Before | After | 범위 |
|-------|-----|--------|-------|------|
| 1 | #339 | 79 | 70 | Summary Strip |
| 2 | #340 | 70 | 68 | Toolbar |
| 3 | #341 | 68 | 59 | Table colgroup |
| 4 | #342 | 59 | 39 | Table tbody cells |
| 5 | #343 | 39 | 30 | Drawer owner/info |
| 6 | #344 | 30 | 28 | Chip margin |
| 7 | #345 | 28 | 22 | Linked cards |
| 8 | #346 | 22 | 20 | Tab panel display |
| 9 | #347 | 20 | 10 | Textarea min-height |
| 10 | #348 | 10 | 5 | fn-ik margin |
| 11 | #349 | 5 | 2 | Register drawer header |
| 12 | #350 | 2 | **0** | Content layout + history strong |

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-purp-list`, `.fn-chg-em` |

```css
.fn-purp-list { display:flex;flex-direction:column;gap:14px }
.fn-chg-em { color:var(--stam) }
```

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR350_B5_Final_Inline_Cleanup_Phase12.md` (신규)

## 미변경

- `stam/js/stam.functional-specification.js`
- `stam/js/stam.functional-definition-crud.js` (JS 렌더 변경 금지)
- Firestore / Auth / CRUD / guard / routing / filter / tab switching

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 0
rg -n 'fn-purp-list|fn-chg-em' stam/pages/boards/functional-specification.html
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| B5 HTML inline `style=""` | **0** |
| inline style/script 신규 | 없음 |
| 금지 경로 변경 | 없음 |
| JS/CRUD/필터/tab 로직 | 미변경 |

## 완료

B5 `functional-specification.html` 정적 HTML inline style cleanup **완료** (Phase 1–12).
