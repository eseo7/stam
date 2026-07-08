# STAM PR #361 — Requirements Service Hardening QA Report

## 1. 목적

- `stam.requirements-service.js` 기본 런타임 service의 **deny-by-default** 전환.
- requirement **delete / softDelete public API 폐쇄** — 후속 “requirement soft delete/archive policy PR”로 분리.
- PR #360 CRUD UI (read/create/update) 동작 유지.
- Firestore rules, nav-data, boards UI **미변경**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `f66b611` |
| 선행 | PR #360 CRUD UI wiring |
| 범위 | service contract hardening + contract tests + QA report |

## 3. 변경 요약

| 파일 | 변경 |
|------|------|
| `stam/js/stam.requirements-service.js` | `defaultAuthorize()` → `Promise.resolve(false)`; `softDelete` public API 제거 |
| `scripts/test-requirements-service-contract.mjs` | deny-by-default + softDelete 미노출 assert |
| `scripts/test-requirements-role-matrix-contract.mjs` | runtime deny-by-default + softDelete 미노출 assert |
| `scripts/test-requirements-crud-ui-contract.mjs` | service source deny-by-default / softDelete 미노출 assert |
| `docs/reports/STAM_PR361_Requirements_Service_Hardening_QA.md` | 본 리포트 |

## 4. Service 계약 (변경 후)

| 항목 | 이전 (PR #360) | 이후 (PR #361) |
|------|----------------|----------------|
| `defaultAuthorize()` | `Promise.resolve(true)` (allow-all) | `Promise.resolve(false)` (deny-by-default) |
| `window.STAM.requirementsService` (script load 직후) | 모든 action 허용 | 모든 action 거부 |
| `softDelete` public API | 노출 (`adapter.update` 경유) | **미노출** |
| role-bound service (`bindAuthorizedService`) | `createMemberRoleAuthorize` — read/create/update 허용, delete 거부 | **동일** (PR #360 UI 유지) |

### Public API surface

| method | 노출 | 비고 |
|--------|------|------|
| `listByProject` | O | authorize 통과 시 |
| `getById` | O | authorize 통과 시 |
| `create` | O | authorize 통과 시 |
| `update` | O | authorize 통과 시 |
| `softDelete` | **X** | 후속 delete policy PR에서 재도입 예정 |

## 5. Role matrix (유지)

| role | read | create | update | delete |
|------|------|--------|--------|--------|
| owner | allow | allow | allow | **deny** |
| admin | allow | allow | allow | **deny** |
| editor | allow | allow | allow | **deny** |
| viewer | allow | **deny** | **deny** | **deny** |

`bindAuthorizedService` 후 runtime service는 PR #360과 동일하게 role-bound authorize를 사용한다.

## 6. 자동 검증 (contract)

```bash
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
```

## 7. Wiring 계약 (유지)

| 계층 | 계약 |
|------|------|
| List | guard 통과 후 `createMemberRoleAuthorize`로 runtime rebind |
| CRUD UI | `service.create` / `service.update` only |
| Delete UI | disabled + `softDelete` 미호출 |
| Adapter | `listByProject` / `getById` / `create` / `update` only (PR #360과 동일) |

## 8. 범위 외

| 항목 | 비고 |
|------|------|
| `firestore.rules` | 변경 없음 |
| `stam/js/stam.nav-data.js` | 변경 없음 |
| `stam/pages/**` | 변경 없음 |
| requirement delete UI | 후속 PR |
| soft delete / archive policy | 후속 PR |
| functionalSpecs / wbsItems / screenSpecs write | 계속 deny |

## 9. 결론

- 기본 `requirementsService`는 더 이상 allow-all이 아니다.
- delete 경로는 service public API에서 제거됐으며, UI·adapter·rules delete deny와 정합된다.
- PR #360 CRUD UI는 list wiring의 role-bound rebind에 의존하며, 본 PR 후에도 동작한다.
