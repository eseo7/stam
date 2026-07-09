# STAM FS-1 — Functional Specifications Write Rules by Role

## 1. 목적

PR #368 inventory 및 구현 전 결정에 따라 `projects/{projectId}/functionalSpecifications/{functionalSpecId}` write rules를 **role-scoped**로 제한적으로 연다.

- active member 중 `owner` / `admin` / `editor` → create·update 허용
- `viewer` → read only (write deny)
- delete / softDelete → **미개방** (Requirements 동형)
- UI / service / adapter → **후속 PR (FS-2~)** 
- `functionalDefinitions` → **local/prototype 명칭** — Firestore 기준명으로 사용하지 않음

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `67d3194` (PR #368 inventory merge 후) |
| 선행 | PR #358–#367 Requirements write rules + CRUD |
| inventory | `docs/reports/STAM_FunctionalSpec_DB_Connection_Inventory.md` |
| collection | `functionalSpecifications` (고정) |

## 3. 구현 전 결정 (반영)

| 결정 | 내용 |
|------|------|
| Collection 명 | `functionalSpecifications` — 경로 `projects/{projectId}/functionalSpecifications/{functionalSpecId}` |
| 요구사항 연결 1차 | `requirementId` (doc id), `requirementCode` (`REQ_###`), `requirementTitle` (snapshot) — **모두 optional** |
| delete/softDelete | rules `delete: false`; update 시 `isDeleted`/`deletedAt`/`deletedBy` immutable |
| Local softDelete | `stam.functional-definition-crud.js` IndexedDB softDelete는 Firestore 1차 정책과 **불일치** — inventory §9 문서화 유지 |

## 4. Firestore write 범위

| 경로 | read | create | update | delete |
|------|------|--------|--------|--------|
| `projects/{projectId}/functionalSpecifications/{functionalSpecId}` | active member | owner/admin/editor | owner/admin/editor | **deny** |
| `requirements` | (기존) | (기존) | (기존) | deny |
| `wbsItems` / `screenSpecs` / `screenFields` / `screenActions` / `artifactLinks` | active member | **deny** | **deny** | **deny** |

### Role matrix (functionalSpecifications)

| role | read | create/update | delete |
|------|------|---------------|--------|
| owner | yes | yes | no |
| admin | yes | yes | no |
| editor | yes | yes | no |
| viewer | yes | no | no |

## 5. Rules helper 계약

| helper | 역할 |
|--------|------|
| `isFunctionalSpecWriter(projectId)` | `isRequirementWriter`와 동일 role 집합 |
| `isValidFunctionalSpecTitle(title)` | string, **2–120자** |
| `isValidFunctionalSpecStatus(status)` | enum: `draft` / `review` / `done` / `approved` / `hold` |
| `isValidFunctionalSpecPriority(priority)` | enum: `high` / `mid` / `low` |
| `isValidFunctionalSpecFunctionType(functionType)` | enum: `view` / `create` / `update` / `delete` / `approve` / `notify` / `export` / `integrate` (optional key) |
| `functionalSpecWriteKeys()` | payload key whitelist |
| `isValidFunctionalSpecCreate(projectId, functionalSpecId)` | writer + `data.id == functionalSpecId` + keys whitelist |
| `isValidFunctionalSpecUpdate(projectId, functionalSpecId)` | writer + immutable audit/delete fields + version +1 |

### Write keys (1차)

`id`, `projectId`, `code`, `title`, `description`, `status`, `priority`, `functionType`, `ownerUid`, `ownerName`, `requirementId`, `requirementCode`, `requirementTitle`, `linkedScreen`, `inputSpec`, `businessRule`, `exceptionRule`, `apiRef`, `note`, `reviewStatus`, audit fields (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`, `version`).

### Create payload 필수 조건

| 항목 | 검증 |
|------|------|
| `id` | == path `functionalSpecId` |
| `projectId` | == path `projectId` |
| `title` | 2–120자 string |
| `status` | functional spec enum |
| `priority` | high / mid / low |
| `version` | `1` |
| `isDeleted` | `false` |
| `deletedAt` / `deletedBy` | `null` |
| `requirementId` / `requirementCode` / `requirementTitle` | optional string |
| keys | `hasOnly(functionalSpecWriteKeys())` |

## 6. 산출물

| 파일 | 변경 |
|------|------|
| `firestore.rules` | `functionalSpecifications` role-scoped create/update helpers + match block |
| `scripts/test-functional-spec-rules-contract.mjs` | **신규** |
| `docs/reports/STAM_FS1_FunctionalSpec_Write_Rules_By_Role.md` | 본 리포트 |

## 7. 검증

```bash
node scripts/test-functional-spec-rules-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
npx -y firebase-tools@13.35.1 emulators:exec --only firestore --project demo-rules-compile "echo RULES_OK"
```

## 8. Governance

| 항목 | 결과 |
|------|------|
| 제품 pages/css/js | **변경 없음** |
| service/adapter | **후속 FS-2** |
| 신규 stam/js 파일 | **0건** |
| inline style/script | **없음** |
| nav-data / workflows / package | **변경 없음** |

## 9. 후속 PR

| PR | 내용 |
|----|------|
| FS-2 | `stam.functional-spec-service.js` + Firestore adapter |
| FS-3 | role matrix smoke QA |
| FS-4 | list read binding |
| FS-5 | CRUD UI wiring (delete visible+disabled) |
| FS-6 | `FN_###` code + requirement picker |
| FS-7 | live/browser QA evidence |
