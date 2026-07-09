# STAM FS-3 — Functional Specification Role Matrix Smoke QA Report

## 1. 목적

- FS-1 `functionalSpecifications` role-scoped write rules가 **owner / admin / editor / viewer** 매트릭스대로 동작하는지 **contract smoke QA** 증빙을 남긴다.
- FS-2 `STAM.functionalSpecService` authorize skeleton과 rules 정합성을 UI wiring **전**에 자동 검증한다.
- 이 PR은 **테스트/QA helper PR**이며, 제품 UI·Firestore rules·service/adapter 코드 변경은 **포함하지 않는다**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `bc56f12` (FS-2 #370 merge 후) |
| 선행 | FS-1 rules (#369), FS-2 service/adapter (#370) |
| Firebase project | `stam-preview-hosting` (rules 변경 없음) |

## 3. repo 구조 확인 (작업 전)

| 확인 항목 | 결과 |
|-----------|------|
| `stam/pages/dev/**` | **없음** — dev/qa 전용 페이지 패턴 미존재 |
| 기존 contract scripts | `test-functional-spec-rules-contract.mjs`, `test-functional-spec-service-contract.mjs` |

→ **QA helper는 Node contract script + 본 리포트로 제공.** 별도 QA HTML page는 **추가하지 않음**.

## 4. Role matrix (기대값)

| role | read | create | update | delete (rules) | delete action (service) |
|------|------|--------|--------|----------------|-------------------------|
| owner | allow | allow | allow | **deny** | **없음** |
| admin | allow | allow | allow | **deny** | **없음** |
| editor | allow | allow | allow | **deny** | **없음** |
| viewer | allow | **deny** | **deny** | **deny** | **없음** |
| guest | deny | deny | deny | deny | **없음** |
| empty | deny | deny | deny | deny | **없음** |
| unknown | deny | deny | deny | deny | **없음** |

### Requirements #359와의 차이

| 항목 | Requirements | Functional spec (FS-2/FS-3) |
|------|--------------|------------------------------|
| delete action | `requirement.delete` 존재, **항상 deny** | **`functionalSpec.delete` action 자체 없음** |
| default runtime | (PR #361 이후 deny-by-default) | FS-2부터 **deny-by-default** |

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
| `scripts/test-functional-spec-role-matrix-contract.mjs` | **신규** — role matrix smoke contract |
| `docs/reports/STAM_FS3_FunctionalSpec_Role_Matrix_Smoke_QA.md` | 본 리포트 |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-21 FS-3 결정 기록 |

## 6. 자동 검증 (contract smoke)

```bash
node scripts/test-functional-spec-role-matrix-contract.mjs
node scripts/test-functional-spec-rules-contract.mjs
node scripts/test-functional-spec-service-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-rules-contract.mjs
```

### 6-1. `test-functional-spec-role-matrix-contract.mjs` 결과

```txt
functional spec role matrix (FS-1 rules + FS-2 service contract evidence):
role     | read   | create   | update   | delete rules | delete action | status
--------------------------------------------------------------------------------
owner    | allow  | allow    | allow    | deny         | 없음          | PASS
admin    | allow  | allow    | allow    | deny         | 없음          | PASS
editor   | allow  | allow    | allow    | deny         | 없음          | PASS
viewer   | allow  | deny     | deny     | deny         | 없음          | PASS
guest    | deny   | deny     | deny     | deny         | 없음          | PASS
(empty)  | deny   | deny     | deny     | deny         | 없음          | PASS
unknown  | deny   | deny     | deny     | deny         | 없음          | PASS

other artifact collections write-closed: wbsItems, screenSpecs, screenFields, screenActions, artifactLinks
functional spec role matrix contract: PASS
```

### 6-2. 검증 범위

| 계층 | 검증 내용 |
|------|-----------|
| `firestore.rules` | `isFunctionalSpecWriter` = `isRequirementWriter`; functionalSpecifications delete deny; 기타 산출물 write deny |
| `stam.functional-spec-service.js` | `ACTIONS` = read/create/update only; `WRITE_ROLES` / `READ_ROLES`, `createMemberRoleAuthorize` 매트릭스 |
| service public API | `delete` / `softDelete` / `remove` **미노출** |
| service runtime (role-bound) | writer role create/update 허용; viewer/guest/unknown write 거부 |
| default runtime service | deny-by-default (FS-2) |

## 7. 범위 외

| 항목 | 비고 |
|------|------|
| Functional spec list/CRUD UI wiring | FS-4 / FS-5 |
| `stam/pages/**` 변경 | 금지 |
| `firestore.rules` 권한 확대 | 금지 |
| `stam/js/**` service/adapter 수정 | 금지 |
| functional spec delete 개방 | 금지 |
| staging browser 수동 QA | 본 PR은 contract smoke; live QA는 FS-7 |

## 8. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS | **변경 없음** |
| 사용 JS (제품) | **변경 없음** |
| 신규 CSS/JS 파일 (stam/css, stam/js) | **0건** |
| inline style/script | **없음** |
| 금지 경로 | **미변경** |

## 9. 후속 PR

| PR | 내용 |
|----|------|
| FS-4 | list read UI binding |
| FS-5 | CRUD UI wiring (delete visible+disabled) |
| FS-6 | `FN_###` code counter + requirement picker |
| FS-7 | live/browser QA evidence |
