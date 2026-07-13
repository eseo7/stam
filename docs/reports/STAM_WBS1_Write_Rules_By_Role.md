# STAM WBS-1 — WBS Write Rules by Role

## 1. 목적

PR #389 inventory 및 구현 전 결정에 따라 `projects/{projectId}/wbsItems/{wbsItemId}` write rules를 **role-scoped**로 제한적으로 연다.

- active member 중 `owner` / `admin` / `editor` → create·update 허용
- `viewer` → read only (write deny)
- delete / softDelete → **미개방**
- WBS counter `projects/{projectId}/counters/wbsItems` → writer-only create/update
- UI / service / adapter / picker → **후속 PR (WBS-2~)** 

## 2. 기준 base commit

| 항목 | 값 |
|------|-----|
| base | `main` @ `bc1d2c929beb2ea857342eb4c5d8d03f654e89d4` |
| 선행 | PR #389 WBS Live Firestore Inventory & Gate merge |
| collection | `wbsItems` (고정) |

## 3. Collection path

| 경로 | 설명 |
|------|------|
| `projects/{projectId}/wbsItems/{wbsItemId}` | WBS 항목 문서 |
| `projects/{projectId}/counters/wbsItems` | WBS-### 코드 카운터 |

## 4. Role matrix

| role | read | create | update | delete | counter write |
|------|------|--------|--------|--------|---------------|
| owner | allow | allow | allow | deny | allow |
| admin | allow | allow | allow | deny | allow |
| editor | allow | allow | allow | deny | allow |
| viewer | allow | deny | deny | deny | deny |
| non-member | deny | deny | deny | deny | deny |

## 5. Rules helper 계약

| helper | 역할 |
|--------|------|
| `isWbsWriter(projectId)` | `isRequirementWriter`와 동일 role 집합 (owner/admin/editor) |
| `projectMemberPath(projectId, memberUid)` | 임의 멤버 uid용 member doc 경로 |
| `isValidWbsMemberSnapshot(projectId, memberUid, memberName)` | active member snapshot 검증 |
| `isValidWbsTitle(title)` | string, **2–120자** |
| `isValidWbsPhase(phase)` | enum: 착수 / 분석 / 설계 / 구현 / 검수 / 오픈 / 완료 |
| `isValidWbsStatus(status)` | enum: `wait` / `in_progress` / `delayed` / `done` / `hold` |
| `isValidWbsPriority(priority)` | enum: `high` / `mid` / `low` |
| `isValidWbsCode(code)` | regex `^WBS-[0-9]{3,}$` |
| `isValidWbsDate(date)` | regex `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` |
| `isValidWbsProgress(status, progress)` | int 0–100; done→100, non-done→0–99 |
| `isValidWbsOwner(projectId, data)` | ownerId + ownerName required, active snapshot |
| `isValidWbsReviewer(projectId, data)` | optional all-or-none reviewerId + reviewerName |
| `isValidWbsRequirementLink(data)` | optional 3-key triplet |
| `isValidWbsFunctionalSpecLink(data)` | optional 3-key triplet |
| `wbsWriteKeys()` | payload key whitelist |
| `wbsRequiredKeys()` | create/update 필수 key 목록 |
| `isValidWbsCreate(projectId, wbsItemId)` | writer + full field validation |
| `isValidWbsUpdate(projectId, wbsItemId)` | writer + immutable fields + version +1 |
| `isValidWbsItemsCounterWrite()` | lastNumber only; create=1, update=prev+1 |

## 6. Write key whitelist

`id`, `projectId`, `code`, `title`, `phase`, `businessArea`, `functionGroup`, `screenPath`, `status`, `priority`, `ownerId`, `ownerName`, `reviewerId`, `reviewerName`, `startDate`, `endDate`, `plannedEffort`, `actualEffort`, `progress`, `description`, `requirementId`, `requirementCode`, `requirementTitle`, `functionalSpecId`, `functionalSpecCode`, `functionalSpecTitle`, audit fields (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`, `version`).

### 1차 제외 필드 (whitelist 미포함 → deny)

`approvalStatus`, `riskLevel`, `meetingIds`, `parentId`, `sortOrder`, `reviewStatus`, `importBatchId`, `screenSpecId`

## 7. owner/reviewer active member snapshot

`projects/{projectId}/members/{memberUid}` 문서 검증:

- 문서 존재
- `userId == memberUid`
- `projectId == projectId`
- `status == "active"`
- `displayName == memberName`
- memberUid / memberName 빈 문자열 금지

**owner**: `ownerId` + `ownerName` 필수, snapshot 통과 필수.

**reviewer**: optional. 연결 시 `reviewerId` + `reviewerName` 모두 존재 + snapshot 통과. 미연결 시 두 키 모두 absent. partial key / null / 빈 문자열 금지.

## 8. progress contract

| status | progress |
|--------|----------|
| `done` | 정확히 `100` |
| non-done | `0`–`99` (100 금지) |

- int only, 음수 금지, 100 초과 금지

## 9. requirement/functionSpec optional triplet

### requirement link

`requirementId`, `requirementCode`, `requirementTitle` — optional triplet.

- 허용: 세 키 모두 absent **또는** 세 키 모두 존재
- `requirementCode` 형식: `^REQ_[0-9]{3,}$`
- partial key / null / 빈 문자열 금지
- snapshot title은 연결 시점 표시값 (원본 title 동기 강제 없음)

### functional spec link

`functionalSpecId`, `functionalSpecCode`, `functionalSpecTitle` — optional triplet.

- 허용: 세 키 모두 absent **또는** 세 키 모두 존재
- `functionalSpecCode` 형식: `^FN_[0-9]{3,}$`
- `screenSpecId` 혼용 금지

## 10. counter contract

경로: `projects/{projectId}/counters/wbsItems`

| 항목 | 규칙 |
|------|------|
| writer | owner / admin / editor |
| reader | active member (viewer 포함) |
| delete | deny |
| 허용 key | `lastNumber` only |
| create | `lastNumber == 1` |
| update | `lastNumber == prev.lastNumber + 1` |
| 감소 / 동일값 / 2+ jump | deny |

## 11. create/update immutable fields

### create

- `version == 1`
- `isDeleted == false`
- `deletedAt == null`, `deletedBy == null`
- `createdBy == updatedBy == request.auth.uid`
- `createdAt == updatedAt == request.time`

### update immutable

`id`, `projectId`, `code`, `createdAt`, `createdBy`, `isDeleted`, `deletedAt`, `deletedBy`

- `updatedBy == request.auth.uid`
- `updatedAt == request.time`
- `version == prev.version + 1`

## 12. 변경 파일

| 파일 | 변경 |
|------|------|
| `firestore.rules` | WBS-1 helper block + wbsItems match + counter branch |
| `scripts/test-wbs-rules-contract.mjs` | **신규** |
| `scripts/test-wbs-role-matrix-contract.mjs` | **신규** |
| `scripts/test-requirements-rules-contract.mjs` | wbsItems write-closed 목록 제거 |
| `scripts/test-requirements-role-matrix-contract.mjs` | wbsItems write-closed 목록 제거 |
| `scripts/test-functional-spec-rules-contract.mjs` | wbsItems write-closed 목록 제거 |
| `scripts/test-functional-spec-role-matrix-contract.mjs` | wbsItems write-closed 목록 제거 |
| `docs/reports/STAM_WBS1_Write_Rules_By_Role.md` | 본 리포트 |

## 13. 검증 결과

```bash
node scripts/test-wbs-rules-contract.mjs
node scripts/test-wbs-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-functional-spec-rules-contract.mjs
node scripts/test-functional-spec-role-matrix-contract.mjs
node scripts/test-functional-spec-counter-contract.mjs
npx -y firebase-tools@13.35.1 emulators:exec --only firestore --project demo-rules-compile "echo RULES_OK"
```

## 14. Governance

| 항목 | 결과 |
|------|------|
| 제품 pages/css/js | **변경 없음** |
| service/adapter/picker | **후속 WBS-2** |
| 신규 stam/js 파일 | **0건** |
| inline style/script | **없음** |
| nav-data / workflows / package | **변경 없음** |
| rules 직접 deploy | **0건** |
| `wbs.html` Firestore service/adapter 로드 | **없음** (여전히 미연결) |

## 15. 후속 WBS-2

| 항목 | 내용 |
|------|------|
| WBS-2 | `stam.wbs-service.js` + Firestore adapter + counter transaction |
| WBS-3 | role matrix smoke QA (service 연계) |
| WBS-4 | Atomic Product Wiring — `wbs.html` Live 노출 |
| delete/softDelete | rules 미개방 유지 |
