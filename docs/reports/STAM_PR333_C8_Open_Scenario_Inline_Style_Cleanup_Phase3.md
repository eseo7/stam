# STAM PR #333 — C8 Open Scenario Inline Style Cleanup Phase 3 (Zone C)

## 목적

`stam/pages/boards/open-scenario.html` **Zone C: Scenario List table**의 담당자/확인자 avatar `style="background:#..."`를 PR #332에서 추가한 `.os-ava--bg-*` class로 이동한다. **표현만** 변경 — JS·CRUD·guard·Firestore 변경 없음.

## 수치 (PR #332 이후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **112** | **64** | −48 |
| Zone C table `.os-who` avatar `background` inline | **48** | **0** | Scenario List tbody |
| Drawer avatar inline | 2 | 2 | **미변경** |
| colgroup / text color / display / Toolbar | — | — | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |
| 신규 `.os-ava--bg-*` class | — | **0** | #332 5종 재사용 |

## 재사용 class (#332)

| Class | background |
|-------|------------|
| `.os-ava--bg-5451e8` | `#5451E8` |
| `.os-ava--bg-10b981` | `#10B981` |
| `.os-ava--bg-f59e0b` | `#F59E0B` |
| `.os-ava--bg-ec4899` | `#EC4899` |
| `.os-ava--bg-8b5cf6` | `#8B5CF6` |

## Zone C 범위

`<!-- Zone C: Scenario List -->` ~ `.os-list-footer` (table tbody 담당자/확인자 `.os-who` avatar 48건)

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `docs/reports/STAM_PR333_C8_Open_Scenario_Inline_Style_Cleanup_Phase3.md` (신규)

## 미변경

- `stam/css/stam.open-scenario.css` — 신규 rule 없음 (#332 class 재사용)
- `stam/js/**`
- `stam.project-context-guard.js`
- Zone C colgroup `width`, `color`, `display:none` inline
- Drawer (`.os-info-val` avatar 2건), Toolbar, Zone F
- Firestore / Auth / CRUD

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/open-scenario.html
rg 'os-who.*style="background' stam/pages/boards/open-scenario.html
rg -c 'os-ava.*style="background' stam/pages/boards/open-scenario.html
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| 신규 avatar color class | 0 |
| Zone C table avatar background inline | 0 |
| `stam/js/**` 변경 | 없음 |

## 후속 (Phase 4+)

- Drawer approval/info avatar inline (2건)
- Zone C colgroup width inline
- status / text color / `display:none` inline
- Toolbar filter count `display:none`
