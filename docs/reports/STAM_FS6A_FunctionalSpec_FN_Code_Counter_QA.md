# STAM FS-6A — Functional Specification FN_### Code Counter QA

## 1. 목적

FS-5 CRUD create 이후, 기능정의서 신규 create 시 `code`가 비어 있으면 Firestore transaction으로 **`FN_001`, `FN_002` …** 형식의 표시 ID를 자동 할당한다. 내부 저장 키는 Firestore doc id를 유지한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `13ffbac` (FS-5 CRUD UI #374) |
| counter path | `projects/{projectId}/counters/functionalSpecifications` |
| code format | `FN_` + 3자리 zero-pad (`FN_001`) |
| 참조 패턴 | Requirements `REQ_###` (`stam.requirements-firestore-adapter.js`) |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `firestore.rules` | `isValidFunctionalSpecificationsCounterWrite()` + counters match 확장 |
| `stam/js/stam.functional-spec-firestore-adapter.js` | `allocateFunctionalSpecCode` transaction |
| `scripts/test-functional-spec-rules-contract.mjs` | FS-6A counter rules assertions |
| `scripts/test-functional-spec-service-contract.mjs` | adapter counter allocation assertions |
| `scripts/test-functional-spec-counter-contract.mjs` | **신규** — counter 전용 contract |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-26 FS-6A 결정 로그 |

## 4. Counter 계약 (FS-6A)

| 항목 | 내용 |
|------|------|
| Counter doc | `counters/functionalSpecifications` **단일 문서만** 허용 |
| Counter fields | `lastNumber` (int, >= 1) only |
| Create (counter 없음) | `lastNumber == 1` |
| Update (counter 있음) | `lastNumber == prev.lastNumber + 1` |
| Writer roles | owner / admin / editor (`isRequirementWriter`) |
| Viewer / guest / empty | counter write **deny** |
| Counter delete | **deny** |
| Spec create (code empty) | adapter transaction → `FN_###` 할당 후 functionalSpecifications doc write |
| Spec create (code 제공) | counter **미증분**, 제공 code 그대로 저장 |
| Internal id | Firestore auto doc id 유지 |
| Requirement picker | **미구현** (FS-6B 후속) |
| delete/softDelete | **미개방** |

## 5. Rules 변경 요약

```txt
projects/{projectId}/counters/{counterId}
  allow create, update:
    isRequirementWriter(projectId)
    && (
      counterId == 'requirements' && isValidRequirementsCounterWrite()
      || counterId == 'functionalSpecifications' && isValidFunctionalSpecificationsCounterWrite()
    )
  allow delete: if false
```

> **정정:** client transaction 사용 시에도 counter 경로에 대한 rules create/update 허용이 **필수**다.

## 6. 검증

```bash
node --check stam/js/stam.functional-spec-firestore-adapter.js
node scripts/test-functional-spec-counter-contract.mjs
node scripts/test-functional-spec-rules-contract.mjs
node scripts/test-functional-spec-service-contract.mjs
node scripts/test-functional-spec-role-matrix-contract.mjs
node scripts/test-functional-spec-crud-ui-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
```

## 7. Governance

| 항목 | 결과 |
|------|------|
| `stam.functional-spec-firestore-crud.js` | **변경 없음** |
| `stam.functional-spec-firestore-list.js` | **변경 없음** |
| `stam/pages/**` | **변경 없음** |
| `stam/css/**` | **변경 없음** |
| `stam.nav-data.js` | **변경 없음** |
| Requirements JS | **변경 없음** |
| service/adapter delete API | **미개방** |
| requirement picker | **미구현** |
| workflows/package/firebase config | **변경 없음** |

## 8. 후속 PR

| PR | 범위 |
|----|------|
| FS-6B | requirement picker (requirements read only) |
| FS-7 | maintainer Google 세션 live Firestore persistence evidence |

## 9. Known limitation

- maintainer Google 세션 **실제 Firestore persistence** QA는 FS-7 evidence 범위 — 이번 PR에서 PASS 처리하지 않음.
