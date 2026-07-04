# STAM PR #336 — C8 Zone C Text Color Inline Cleanup Phase 1

## 목적

`stam/pages/boards/open-scenario.html` **Zone C Scenario List tbody**의 반복 `style="color:var(--t3)"`를 CSS로 이동한다. **표현만** 변경 — JS·CRUD·guard·Firestore 변경 없음.

## 수치 (PR #335 이후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **47** | **8** | −39 |
| Zone C tbody `color:var(--t3)` inline | **39** | **0** | os-time 17 + os-iss-col 22 |
| display:none / margin-left / Toolbar 등 | 8 | 8 | **미변경** |
| 신규 JS 파일 | — | **0** | |

## Class mapping

| 대상 | Before | After |
|------|--------|-------|
| `os-time` dash (실제 시작 등) | `style="color:var(--t3)"` | `.os-time` 기존 rule (`color: var(--t3)`) — inline 제거만 |
| `os-iss-col` dash (이슈 없음) | `style="color:var(--t3)"` | `.os-iss-col--muted` |

```css
.os-iss-col--muted { color: var(--t3); }
```

## 범위

`#os-tbody` 내 Scenario List 행 — muted dash `—` 셀만 (이슈 badge `os-iss-badge` 행 미변경)

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `stam/css/stam.open-scenario.css`
- `docs/reports/STAM_PR336_C8_Zone_C_Text_Color_Inline_Cleanup_Phase1.md` (신규)

## 미변경

- `stam/js/**`
- `stam.project-context-guard.js`
- `style="display:none"`, `style="margin-left:auto"`, Toolbar inline
- Drawer, Zone F
- Firestore / Auth / CRUD

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/open-scenario.html
rg 'style="color:var\(--t3\)"' stam/pages/boards/open-scenario.html
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 JS 파일 | 0 |
| Zone C tbody color inline | 0 |
| `stam/js/**` 변경 | 없음 |

## 후속 (Phase 7+)

- Toolbar `display:none` inline
- `test-open-scenario-no-inline-style.mjs` 회귀 CI
