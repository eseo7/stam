# STAM PR #359 — Requirements Role Matrix Smoke QA Report

## 1. 목적

- PR #358 `requirements` role-scoped write rules가 **owner / admin / editor / viewer** 매트릭스대로 동작하는지 **contract smoke QA** 증빙을 남긴다.
- Requirements CRUD UI wiring **전**에 rules ↔ service authorize skeleton 정합성을 자동 검증한다.
- 이 PR은 **테스트/QA helper PR**이며, 제품 UI·Firestore rules 범위 확대·CRUD 연결은 **포함하지 않는다**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `5ca33dd074a224dd89cd55657036a4708925f044` |
| 선행 | PR #358 requirements write rules by role |
| Firebase project | `stam-preview-hosting` (rules 변경 없음) |

## 3. repo 구조 확인 (작업 전)

| 확인 항목 | 결과 |
|-----------|------|
| `stam/pages/dev/**` | **없음** — dev/qa 전용 페이지 패턴 미존재 |
| `stam/pages/prototype/**` | 존재 (Cycle DB 실험 화면, Firebase 미사용) |
| 기존 contract scripts | `test-requirements-rules-contract.mjs`, `test-requirements-service-contract.mjs` 등 |

→ **QA helper는 Node contract script + 본 리포트로 제공.** `stam/pages/dev/requirements-role-matrix-smoke.html`은 **추가하지 않음** (허용 조건 미충족).

## 4. Role matrix (기대값)

| role | read | create | update | delete |
|------|------|--------|--------|--------|
| owner | allow | allow | allow | **deny** |
| admin | allow | allow | allow | **deny** |
| editor | allow | allow | allow | **deny** |
| viewer | allow | **deny** | **deny** | **deny** |
| guest / empty | deny | deny | deny | deny |

### 기타 산출물 write (유지 deny)

| collection | create | update | delete |
|------------|--------|--------|--------|
| `wbsItems` | deny | deny | deny |
| `screenSpecs` | deny | deny | deny |
| `screenFields` | deny | deny | deny |
| `screenActions` | deny | deny | deny |
| `artifactLinks` | deny | deny | deny |

## 5. 산출물

| 파일 | 변경 |
|------|------|
| `scripts/test-requirements-role-matrix-contract.mjs` | **신규** — role matrix smoke contract |
| `scripts/test-requirements-rules-contract.mjs` | PR #359 cross-ref 주석 |
| `docs/reports/STAM_PR359_Requirements_Role_Matrix_Smoke_QA.md` | 본 리포트 |
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` | A3a smoke QA gate 추가 |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-14 PR #359 결정 기록 |

## 6. 자동 검증 (contract smoke)

```bash
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-service-contract.mjs
```

### 6-1. `test-requirements-role-matrix-contract.mjs` 결과

```txt
requirements role matrix (PR #358 contract evidence):
role     | read   | create   | update   | delete   | rules+service
------------------------------------------------------------------
owner    | allow  | allow    | allow    | deny     | PASS
admin    | allow  | allow    | allow    | deny     | PASS
editor   | allow  | allow    | allow    | deny     | PASS
viewer   | allow  | deny     | deny     | deny     | PASS
guest    | deny   | deny     | deny     | deny     | PASS
(empty)  | deny   | deny     | deny     | deny     | PASS

other artifact collections write-closed: wbsItems, screenSpecs, screenFields, screenActions, artifactLinks
requirements role matrix contract: PASS
```

### 6-2. 검증 범위

| 계층 | 검증 내용 |
|------|-----------|
| `firestore.rules` | `isRequirementWriter` = owner/admin/editor; requirements delete deny; 기타 산출물 write deny |
| `stam.requirements-service.js` | `WRITE_ROLES` / `READ_ROLES`, `createMemberRoleAuthorize` 매트릭스 |
| service runtime (role-bound) | writer role create/update 허용; viewer create/update 거부; 모든 role delete 거부 |
| default runtime service | UI wiring 전 allow-all 유지 (변경 없음) |

## 7. 범위 외

| 항목 | 비고 |
|------|------|
| Requirements CRUD UI wiring | 후속 PR |
| `stam/pages/requirements/**` 변경 | 금지 |
| `firestore.rules` 권한 확대 | 금지 |
| requirement delete 개방 | 금지 |
| functionalSpecs / wbsItems / screenSpecs write 개방 | 금지 |
| staging browser 수동 QA | 본 PR은 contract smoke; emulator/browser QA는 선택 후속 |
| `stam/pages/dev/**` QA page | repo 패턴 없음 — 미추가 |

## 8. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS | **변경 없음** |
| 사용 JS (제품) | **변경 없음** |
| 신규 CSS/JS 파일 (stam/css, stam/js) | **0건** |
| inline style/script | **없음** |
| 금지 경로 | **미변경** (auth/boards/dashboard/requirements pages, nav-data, workflows, firebase config 등) |

## 9. 후속 PR

1. Requirements CRUD UI wiring (boards + service authorize 주입)
2. requirement delete rules (soft delete)
3. staging emulator / browser role matrix QA (선택 — maintainer)
