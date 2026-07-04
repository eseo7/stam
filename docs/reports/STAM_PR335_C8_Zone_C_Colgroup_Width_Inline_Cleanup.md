# STAM PR #335 — C8 Zone C Colgroup Width Inline Cleanup

## 목적

`stam/pages/boards/open-scenario.html` **Zone C: Scenario List** table `colgroup` `width` / `min-width` inline 15건을 `stam/css/stam.open-scenario.css` class로 이동한다. **표현만** 변경 — JS·CRUD·guard·Firestore 변경 없음.

## 수치 (PR #334 이후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **62** | **47** | −15 |
| Zone C `colgroup` col inline | **15** | **0** | Scenario List table |
| text color / display / Toolbar inline | 47 | 47 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

## Class mapping (값 정확 보존)

| # | 컬럼 | Class | width |
|---|------|-------|-------|
| 1 | checkbox | `.os-col-cb` | `28px` |
| 2 | ID | `.os-col-id` | `76px` |
| 3 | 구분 | `.os-col-phase` | `68px` |
| 4 | 단계 | `.os-col-stage` | `60px` |
| 5 | 작업명 | `.os-col-name` | `min-width: 160px` |
| 6 | 담당자 | `.os-col-owner` | `82px` |
| 7 | 확인자 | `.os-col-checker` | `82px` |
| 8 | 예정 시작 | `.os-col-plan-start` | `82px` |
| 9 | 실제 시작 | `.os-col-actual-start` | `82px` |
| 10 | 체크 결과 | `.os-col-check-result` | `72px` |
| 11 | 이슈 ID | `.os-col-issue` | `64px` |
| 12 | 승인 | `.os-col-approval` | `52px` |
| 13 | 고객확인 | `.os-col-customer` | `72px` |
| 14 | 공개범위 | `.os-col-scope` | `64px` |
| 15 | 상세 | `.os-col-action` | `44px` |

## 범위

`.os-scenario-table` → `colgroup` 15 `<col>` (lines ~345–361)

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `stam/css/stam.open-scenario.css`
- `docs/reports/STAM_PR335_C8_Zone_C_Colgroup_Width_Inline_Cleanup.md` (신규)

## 미변경

- `stam/js/**`
- `stam.project-context-guard.js`
- tbody `style="color:..."` / `display:none` / Toolbar inline
- Drawer 구조·탭
- Firestore / Auth / CRUD

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/open-scenario.html
rg '<col style=' stam/pages/boards/open-scenario.html
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| Zone C colgroup inline | 0 |
| `stam/js/**` 변경 | 없음 |

## 후속 (Phase 6+)

- Zone C tbody `color:var(--t3)` inline
- Toolbar `display:none` inline
- `test-open-scenario-no-inline-style.mjs` 회귀 CI
