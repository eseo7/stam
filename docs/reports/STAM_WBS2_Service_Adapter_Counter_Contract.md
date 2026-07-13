# STAM WBS-2 — Off-screen Service, Firestore Adapter & Atomic Counter Contract

## 1. 목적

WBS Live 연결 전 단계로 제품 화면 밖에서 `STAM.wbsService` → `STAM.wbsFirestoreAdapter` → Firestore 경로 계층을 구현한다.

- Domain validation, role-based authorization
- list / get / create / update
- `"WBS-###"` atomic counter allocation
- reviewer / requirement / functionalSpec link·unlink
- update final-record validation, server timestamp, rollback contract

**이번 PR은 제품 화면에 로드하거나 UI에 연결하지 않는다.**

## 2. 기준 base commit

`4aff583bc255a03a32d2f0b5ff5f83ac33b2fe68` (main, PR #390 WBS-1)

## 3. 구현 파일

| 파일 | 역할 |
|------|------|
| `stam/js/stam.wbs-service.js` | Domain service + validation SSOT |
| `stam/js/stam.wbs-firestore-adapter.js` | Firestore adapter + atomic counter |
| `scripts/test-wbs-service-contract.mjs` | Service/adapter contract test |
| `scripts/test-wbs-counter-contract.mjs` | Counter/transaction/rollback test |
| `scripts/test-wbs-role-matrix-contract.mjs` | Rules + service role matrix (확장) |
| `docs/reports/STAM_WBS2_Service_Adapter_Counter_Contract.md` | 본 보고서 |

## 4. Service boundary

- Namespace: `window.STAM.wbsService`, `window.STAM.wbsServiceContract`
- ACTIONS: `wbs.read`, `wbs.create`, `wbs.update` only
- delete / softDelete / remove API 없음
- Default runtime service: authorize 미주입 시 모든 operation deny
- Adapter dependency injection via `createService({ adapter, authorize, clock })`

## 5. Adapter boundary

- Namespace: `window.STAM.wbsFirestoreAdapter`
- `COLLECTION = 'wbsItems'`, `COUNTER_DOC_ID = 'wbsItems'`, `CODE_PREFIX = 'WBS-'`
- Factory API: `listByProject`, `getById`, `create`, `update`
- delete / softDelete / remove 없음
- Explicit `code` input 거절 — 모든 create는 counter transaction 경유

## 6. Role matrix

| role | read | create | update | delete |
|------|------|--------|--------|--------|
| owner | allow | allow | allow | deny |
| admin | allow | allow | allow | deny |
| editor | allow | allow | allow | deny |
| viewer | allow | deny | deny | deny |
| guest | deny | deny | deny | deny |
| empty | deny | deny | deny | deny |
| unknown | deny | deny | deny | deny |

Service authorization matrix는 WBS-1 Firestore Rules matrix와 일치한다.

## 7. WBS schema mapping

Create 최종 payload 필수: `id`, `projectId`, `title`, `phase`, `functionGroup`, `status`, `priority`, `ownerId`, `ownerName`, `startDate`, `endDate`, `progress`, audit fields, `version: 1`, `isDeleted: false`.

`code`는 adapter transaction에서만 발급. 사용자 input에서 `code` 지정 불가.

## 8. Enum contract

- **phase** (7): 착수, 분석, 설계, 구현, 검수, 오픈, 완료
- **status** (5): wait, in_progress, delayed, done, hold
- **priority** (3): high, mid, low
- create에서 생략 시에만 default: `status=wait`, `priority=mid`, `progress=0`
- **enum defaults are applied only when omitted/undefined**
- **null/empty enum input rejected** (`null`, `''`, whitespace)
- 잘못된 enum은 조용히 default로 바꾸지 않고 validation error

금지 enum: draft, reviewing, confirmed, rejected, active, 검토중

## 9. Date validation

- Format: `YYYY-MM-DD` regex + 실제 달력 유효성 (leap year, month/day range, round-trip)
- `endDate >= startDate`
- Rules regex보다 강한 service 검증

## 10. Progress contract

- Integer 0–100, 소수/음수/100 초과 거절
- `status == done` → `progress == 100`
- `status != done` → `progress` 0–99

## 11. owner/reviewer contract

- **owner**: create 시 `ownerId` + `ownerName` 필수 pair; actor 자동 대체 없음
- **reviewer**: optional pair; update 시 all-empty → unlink
- **Service contract alone does not prove active membership.**
- **Active membership authenticity is enforced by WBS-1 Firestore Rules.**

## 12. requirement/functionalSpec triplet

- requirement: `requirementId`, `requirementCode` (`^REQ_[0-9]{3,}$`), `requirementTitle`
- functionalSpec: `functionalSpecId`, `functionalSpecCode` (`^FN_[0-9]{3,}$`), `functionalSpecTitle`
- all-absent / all-non-empty / all-empty(unlink) only; partial 거절

### Optional field clear

- 대상: `businessArea`, `screenPath`, `description`, `plannedEffort`, `actualEffort`
- update `undefined` → 기존 유지; 빈 문자열 → unlink
- **optional field clear uses `FieldValue.delete()`** in adapter
- **service final candidate and Firestore Rules payload are aligned** (cleared fields omitted from candidate)
- `null` → validation error

## 13. Atomic counter transaction

```
projects/{projectId}/counters/wbsItems  (lastNumber)
projects/{projectId}/wbsItems/{wbsItemId}
```

동일 Firestore transaction 내 `transaction.set(counterRef, …)` + `transaction.set(wbsRef, payload)`.

- **formatter accepts integer counter values only** (`Number.isInteger`, no `Math.floor` coercion)
- **explicit `code` key is always rejected** on adapter create (any value including `''`, `null`)

## 14. Rollback contract

WBS document write 실패 시 counter·document 모두 rollback. 부분 저장 없음.

## 15. Update final-record validation

`current + patch` 최종 상태 전체 검증. patch 단독 검증 금지.

## 16. Delete/softDelete 미개방

Service·adapter·ACTIONS 모두 delete/softDelete/remove 없음.

- **authorization requires explicit `true`** (`allowed !== true` → deny)

## 17. 테스트 결과

```
node scripts/test-wbs-service-contract.mjs      → PASS
node scripts/test-wbs-counter-contract.mjs      → PASS
node scripts/test-wbs-role-matrix-contract.mjs  → PASS
node scripts/test-wbs-rules-contract.mjs        → PASS
node scripts/test-functional-spec-*-contract.mjs  → PASS (회귀)
node scripts/test-requirements-*-contract.mjs     → PASS (회귀)
```

## 18. 제품 화면 미연결 증빙

`stam/pages/boards/wbs.html` grep:

- `stam.wbs-service.js` — no match
- `stam.wbs-firestore-adapter.js` — no match
- `wbsService` — no match
- `wbsFirestoreAdapter` — no match

기존 Local scripts 유지: `stam.core-db-schema.js`, `stam.local-core-db.js`, `stam.wbs-cycle.js`, `stam.wbs-crud.js`

## 19. Governance

| 항목 | 결과 |
|------|------|
| wbs.html 변경 | 0 |
| CSS 변경 | 0 |
| Rules 변경 | 0 |
| Firebase SDK 로드 (제품 화면) | 0 |
| 제품 UI 동작 변경 | 0 |
| 신규 off-screen JS | 2 |
| Firestore 직접 deploy | 0 |
| staging/prod 수동 배포 | 0 |
| Local Core DB 제거 | 0 |
| WBS-### 수동 코드 우회 | 불가 |
| 모든 create atomic transaction | 예 |
| owner/reviewer active authenticity | Rules 최종 강제 |

## 20. 후속 WBS-3 / WBS-4

- **WBS-3**: 추가 contract / integration gate
- **WBS-4**: Atomic Product Wiring — `wbs.html` script 교체, UI selector, Live Firestore 노출
