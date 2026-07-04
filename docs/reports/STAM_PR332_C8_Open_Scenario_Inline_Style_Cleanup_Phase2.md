# STAM PR #332 — C8 Open Scenario Inline Style Cleanup Phase 2 (Zone B)

## 목적

`stam/pages/boards/open-scenario.html` **Zone B: Timeline / Step Board** 영역의 avatar `style="background:#..."`를 `stam/css/stam.open-scenario.css` class로 이동한다. **표현만** 변경 — JS·CRUD·guard·Firestore 변경 없음.

## 수치 (PR #331 이후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **131** | **112** | −19 |
| Zone B avatar `background` inline | **19** | **0** | `.os-step-who` only |
| Zone C/Drawer/Toolbar 등 | 112 | 112 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

## Class mapping (색상 hex 정확 보존)

| Before | After class | background |
|--------|-------------|------------|
| `style="background:#5451E8"` | `.os-ava--bg-5451e8` | `#5451E8` |
| `style="background:#10B981"` | `.os-ava--bg-10b981` | `#10B981` |
| `style="background:#F59E0B"` | `.os-ava--bg-f59e0b` | `#F59E0B` |
| `style="background:#EC4899"` | `.os-ava--bg-ec4899` | `#EC4899` |
| `style="background:#8B5CF6"` | `.os-ava--bg-8b5cf6` | `#8B5CF6` |

## Zone B 범위

`<!-- Zone B: Timeline / Step Board -->` ~ `</div>` (`.os-timeline-board`), `.os-step-who` avatar 19건

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `stam/css/stam.open-scenario.css`
- `docs/reports/STAM_PR332_C8_Open_Scenario_Inline_Style_Cleanup_Phase2.md` (신규)

## 미변경

- `stam/js/**` — `stam.open-scenario.js` 포함
- `stam.project-context-guard.js`
- Zone C 테이블 avatar, Drawer, Toolbar, colgroup, status/text color inline
- Firestore / Auth / CRUD
- 색상 토큰화·디자인 변경 없음

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/open-scenario.html
awk 'NR>=133 && NR<=296' stam/pages/boards/open-scenario.html | rg -c 'style='
rg 'os-step-who.*style=' stam/pages/boards/open-scenario.html
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| Zone B avatar background inline | 0 |
| `stam/js/**` 변경 | 없음 |
| guard JS 변경 | 없음 |

## 후속 (Phase 3+)

- Zone C Scenario List table avatar `background` inline
- Drawer approval avatar inline
- colgroup / status / text color inline
