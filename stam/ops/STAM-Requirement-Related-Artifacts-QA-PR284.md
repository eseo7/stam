# STAM Requirement Related Artifacts QA — PR #284

## Scope

- Direct requirement registration
- Related artifact checkbox options
- Shared persistence flow from PR #283 (`persistRelatedArtifactsFromRequirement`)
- QA/audit only, no product code changes

## Baseline

- PR #283 merge commit: `b01042634f3129840202a0fb694e3df42095d5c1`
- Verified on `main` at `b01042634f3129840202a0fb694e3df42095d5c1`

## QA Summary

| Scenario | Expected | Result | Notes |
|---|---|---|---|
| Default ON | Requirement 1 + menuScreen 1 + WBS 3 | PASS | Screen spec / functional def not created |
| Master OFF | Requirement only | PASS | Child checkboxes disabled; zero related artifacts |
| All ON | Requirement 1 + related artifacts 6 | PASS | menuScreen 1, WBS 3, screen spec 1, functional def 1 |
| Duplicate prevention | No duplicate artifacts | PASS | Re-persist skipped menuScreen + WBS; counts unchanged |
| Mobile 430px | Drawer usable | PASS | Checkboxes, master toggle, footer, submit button OK |
| Regression | Existing registration works | PASS | Required-field alerts, list refresh, detail drawer |

## Evidence

### Test data titles

| Scenario | Requirement title | Requirement ID |
|---|---|---|
| Default ON | QA-PR284 기본 ON 자동 생성 테스트 | REQ-MANUAL-20260629-055534 |
| Master OFF | QA-PR284 마스터 OFF 테스트 | REQ-MANUAL-20260629-055535 |
| All ON | QA-PR284 전체 ON 테스트 | REQ-MANUAL-20260629-055542 |
| Regression | QA-PR284 회귀 테스트 | REQ-MANUAL-20260629-055544 |

### Created record counts

**Scenario 1 — Default ON**

| Store | Count |
|---|---|
| requirements | 1 |
| menuScreens | 1 |
| wbsItems | 3 (분석, 설계, 검증) |
| screenSpecifications | 0 |
| functionalDefinitions | 0 |

**Scenario 2 — Master OFF**

| Store | Count |
|---|---|
| requirements | 1 |
| menuScreens | 0 |
| wbsItems | 0 |
| screenSpecifications | 0 |
| functionalDefinitions | 0 |

**Scenario 3 — All ON**

| Store | Count |
|---|---|
| requirements | 1 |
| menuScreens | 1 |
| wbsItems | 3 |
| screenSpecifications | 1 |
| functionalDefinitions | 1 |
| **Related total** | **6** |

**Scenario 4 — Duplicate prevention**

Re-invoked `persistRelatedArtifactsFromRequirement` for `REQ-MANUAL-20260629-055534`:

- `createdCount`: 0
- `skippedCount`: 2 (`menuScreen`, `wbs` — `already_exists`)
- Counts before/after: menuScreen 1, WBS 3 (unchanged)
- Message: `이미 생성된 관련 산출물이 있어 누락된 항목만 추가했습니다.`

### Console result

- Playwright headless run: **0 console errors**, **0 page errors**

### Execution method

- Local static server (`stam/` root) + Playwright Chromium headless
- Page: `/pages/boards/requirements.html`
- IndexedDB verification via `STAM_CORE.db.listRecords`

## Static verification (pre-QA)

```text
grep persistRelatedArtifactsFromRequirement stam/js/stam.requirements-crud.js
  → submitRegister flow lines 548–550

grep ensureMenuScreenDraftFromRequirement stam/js/stam.requirements-crud.js
  → defined line 44 only; NOT called from submitRegister

node --check stam/js/stam.requirements-crud.js  → OK
node --check stam/js/stam.requirement-artifacts.js → OK
```

## Final Decision

**PASS**

## Follow-up

- Legacy `ensureMenuScreenDraftFromRequirement` cleanup (dead code in submit flow; function still defined)
- Excel/import flow alignment in a separate PR
