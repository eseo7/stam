# STAM PR C — screenActions Spec v1

| 항목 | 값 |
|------|-----|
| 상태 | **Official v1 — PR C implemented** |
| base | `origin/main` @ `e42526d3a7f85930169b0dd8eccf38d17c4026d0` |
| 저장 경로 | `projects/{projectId}/screenActions/{actionId}` |
| actionId | Firestore **랜덤 document ID** (auto-id) |
| schemaVersion | `1` |
| 작성일 | 2026-08-01 |

---

## 1. 목적과 범위

### 1.1 목적

화면설계서 master(`screenSpecs`)에 종속되는 **화면 액션 정의**를 Firestore에 CRUD 가능한 1차 데이터로 제공한다. Action Editor UI·런타임 Confirm/Toast 없이 Service·Adapter·Rules·계약 테스트만으로 데이터 계층을 닫는다.

### 1.2 PR C 포함

- `screenActions` 데이터 계약 (schemaVersion 1)
- Domain Service (`STAM.screenActionService`)
- Firestore Adapter (`STAM.screenActionFirestoreAdapter`)
- Firestore Rules write open (ScreenAction-1 helpers, editor 이상)
- Service/Adapter/Rules **contract tests** (4종)
- Firestore Rules **Emulator E2E** + Adapter **Emulator E2E** (로컬·수동)
- **Hard delete** (editor+)
- 상위 `screenSpecId` 존재·동일 `projectId` 검증 (**create** — Service preflight + Adapter preflight/transaction; Rules create)
- `targetScreenSpecId` 존재·동일 `projectId` 검증 (**navigate** / **openDrawer** when set — Service semantics + Adapter preflight/transaction; Rules create/update)
- 동일 `screenSpecId` 내 **정규화 name** 중복 차단 (**Service + Adapter query preflight**, transaction 밖; sequential best-effort reject, concurrent uniqueness not guaranteed)
- Audit 필드: screenSpecs·screenFields와 **동형** (Service ISO → Adapter serverTimestamp → read ISO normalize)
- `actionType` / `controlType` / `placement` / `variant` enum 전량 Service 검증
- `confirmRequired` / `confirmTitle` / `confirmMessage` / `successMessage` **데이터 필드** 저장 (UI 런타임 제외)

### 1.3 PR C 제외

| 제외 | 후속 |
|------|------|
| `visibilityCondition`, `enabledCondition` | PR D |
| Action Editor UI, detail drawer 액션 섹션, Confirm/Alert/Toast **런타임** | PR D |
| `targetUrl`, `apiEndpoint`, `payloadTemplate`, `icon`, `shortcut` | 후속 |
| deterministic actionId | **제외 확정** |
| soft delete (`isDeleted`) | **제외 확정** |
| SB/KR ID seed·import | PR E/G |
| PPT/IA 자동 ingest | PR G |
| `channelScope`, `localeScope` | PR F |

---

## 2. Firestore 경로·ID

| 항목 | 값 |
|------|-----|
| **Path** | `projects/{projectId}/screenActions/{actionId}` |
| **actionId** | Firestore **random auto-id** (`collection.doc()` — 클라이언트 지정 id 미사용) |
| **Parent FK** | `screenSpecId` → `projects/{projectId}/screenSpecs/{screenSpecId}` |
| **Target FK** | `targetScreenSpecId` → 동일 screenSpecs subcollection (navigate 필수, openDrawer optional) |
| **Delete** | **Hard delete** — 물리 `delete()` |
| **schemaVersion** | `1` 고정 |

### 2.1 Firestore 문서 예시

**Path:** `projects/PARNAS-RENEWAL/screenActions/xY7kL2mN9pQ3rT8vW1zA`

```json
{
  "id": "xY7kL2mN9pQ3rT8vW1zA",
  "projectId": "PARNAS-RENEWAL",
  "screenSpecId": "scr-abc123def456",
  "order": 10,
  "name": "goBack",
  "label": "뒤로",
  "actionType": "cancel",
  "controlType": "button",
  "placement": "toolbar",
  "variant": "secondary",
  "targetScreenSpecId": null,
  "disabled": false,
  "confirmRequired": false,
  "confirmTitle": null,
  "confirmMessage": null,
  "successMessage": null,
  "schemaVersion": 1,
  "createdAt": "<Firestore Timestamp>",
  "createdBy": "uid-editor-001",
  "updatedAt": "<Firestore Timestamp>",
  "updatedBy": "uid-editor-001"
}
```

**Navigate 예시 (`targetScreenSpecId` required):**

```json
{
  "id": "aB3cD4eF5gH6iJ7kL8mN",
  "projectId": "PARNAS-RENEWAL",
  "screenSpecId": "scr-abc123def456",
  "order": 20,
  "name": "openList",
  "label": "목록 보기",
  "actionType": "navigate",
  "controlType": "button",
  "placement": "toolbar",
  "variant": "primary",
  "targetScreenSpecId": "scr-list-page-001",
  "disabled": false,
  "confirmRequired": false,
  "confirmTitle": null,
  "confirmMessage": null,
  "successMessage": null,
  "schemaVersion": 1,
  "createdAt": "<Firestore Timestamp>",
  "createdBy": "uid-editor-001",
  "updatedAt": "<Firestore Timestamp>",
  "updatedBy": "uid-editor-001"
}
```

> **Note:** Stored `createdAt`/`updatedAt` are Firestore Timestamps. Adapter read path normalizes to ISO 8601 strings (screenSpecs/screenFields adapter pattern).

---

## 3. 전체 스키마 (21 top-level fields)

Rules whitelist: `screenActionWriteKeys()` / `screenActionRequiredKeys()` — **동일 21키**.

| # | 필드 | Firestore 타입 | Create | Update | 기본값 | 비고 |
|---|------|----------------|--------|--------|--------|------|
| 1 | `id` | string | auto (doc id) | immutable | doc id | random auto-id |
| 2 | `projectId` | string | **required** | immutable | — | path와 일치 |
| 3 | `screenSpecId` | string | **required** | immutable | — | FK → screenSpecs |
| 4 | `order` | int | optional | optional | `0` | ≥ 0 |
| 5 | `name` | string | **required** | optional | — | machine name, §3.1 |
| 6 | `label` | string | **required** | optional | — | UI 라벨 1–120 |
| 7 | `actionType` | string | **required** | optional | — | enum §4.1 |
| 8 | `controlType` | string | optional | optional | `button` | enum §4.2 |
| 9 | `placement` | string | optional | optional | `toolbar` | enum §4.3 |
| 10 | `variant` | string | optional | optional | `secondary` | enum §4.4 |
| 11 | `targetScreenSpecId` | string\|null | conditional | optional | `null` | §4.5 |
| 12 | `disabled` | bool | optional | optional | `false` | 정적 속성 |
| 13 | `confirmRequired` | bool | optional | optional | `false` | §4.6 |
| 14 | `confirmTitle` | string\|null | optional | optional | `null` | §4.6 |
| 15 | `confirmMessage` | string\|null | conditional | optional | `null` | §4.6 |
| 16 | `successMessage` | string\|null | optional | optional | `null` | ≤ 500, clearable |
| 17 | `schemaVersion` | int | **required** | immutable | `1` | |
| 18 | `createdAt` | timestamp | server | immutable | server | |
| 19 | `createdBy` | string | **required** | immutable | actor uid | |
| 20 | `updatedAt` | timestamp | server | server | server | |
| 21 | `updatedBy` | string | **required** | actor uid | actor uid | |

**PR C 미포함 필드:** `isDeleted`, `deletedAt`, `deletedBy`, `version`, `visibilityCondition`, `enabledCondition`, `targetUrl`, `apiEndpoint`, `icon`, `shortcut`.

### 3.1 name 정규화 규칙 (uniqueness 비교용)

| 규칙 | 설명 |
|------|------|
| **trim** | leading/trailing Unicode whitespace 제거 (`trim()`) |
| **비교 정책** | **case-insensitive** (`toLowerCase()` 후 equality) |
| **저장값** | 사용자 입력 **원문** 저장 (대소문자 보존). 비교만 정규화 |
| **허용 charset (저장)** | `^[a-zA-Z][a-zA-Z0-9_]{1,79}$` (2–80자, 영문 시작) |
| **금지** | 공백-only, `_` only, 숫자 시작 |

**정규화 name (derived, 저장하지 않음):** `normalizeName(name) = trim(name).toLowerCase()`

중복 검사: 동일 `screenSpecId` 내 `normalizeName(existing.name) === normalizeName(input.name)`.

---

## 4. 필드 계약·enum

### 4.1 actionType enum

```txt
navigate | submit | save | cancel | delete | openDrawer | closeDrawer | download | custom
```

Service: `ACTION_TYPE_VALUES` (9 values). Create **required**. Update patch optional — 변경 시 merged document full validation.

### 4.2 controlType enum

```txt
button | link | icon | menuItem
```

Create omit → default **`button`**.

### 4.3 placement enum

```txt
header | toolbar | form | tableRow | footer | inline
```

Create omit → default **`toolbar`**.

### 4.4 variant enum

```txt
primary | secondary | tertiary | danger | text
```

Create omit → default **`secondary`**.

### 4.5 targetScreenSpecId semantics

| actionType | targetScreenSpecId | Service | Rules |
|------------|-------------------|---------|-------|
| `navigate` | **required** non-empty string | required | required non-empty + exists |
| `openDrawer` | optional `null` or non-empty string | optional | `null` or non-empty + exists when set |
| all others | **must be `null`** | reject non-null | must be `null` |

**Update:** `actionType` 또는 `targetScreenSpecId` patch 시 merged semantics 재적용. non-navigate/non-openDrawer로 변경 시 Service가 `targetScreenSpecId: null` 강제.

**Existence (Adapter preflight + transaction + Rules):** target doc exists; `projectId` exact match; `isDeleted !== true`.

### 4.6 confirm / success message fields (data only)

| Field | Rule |
|-------|------|
| `confirmRequired` | bool, default `false` |
| `confirmRequired === false` | `confirmTitle` **must be null**; `confirmMessage` **must be null** |
| `confirmRequired === true` | `confirmMessage` **required** 1–500 chars; `confirmTitle` optional null or ≤ 120 |
| `successMessage` | optional null or string ≤ 500 |

**PR C 범위:** 필드 저장·검증만. Confirm Dialog / Alert / Toast **UI 렌더·실행은 제외**.

### 4.7 order

| 규칙 | 값 |
|------|-----|
| 타입 | integer |
| 범위 | **≥ 0** |
| 기본값 (create omit) | `0` |
| **동순위 (tie)** | **허용** |
| 정렬 (list) | `(order ASC, createdAt ASC, id ASC)` — `compareScreenActions` |

---

## 5. Service 공개 API

**Module:** `stam/js/stam.screen-action-service.js`  
**Global:** `STAM.screenActionService`, `STAM.screenActionServiceContract`

### 5.1 ACTIONS

```javascript
{
  LIST:   'screenAction.list',
  READ:   'screenAction.read',
  CREATE: 'screenAction.create',
  UPDATE: 'screenAction.update',
  DELETE: 'screenAction.delete',
}
```

### 5.2 ERROR_CODES

```javascript
{
  VALIDATION_FAILED:        'SCREEN_ACTION_VALIDATION_FAILED',
  PARENT_NOT_FOUND:         'SCREEN_ACTION_PARENT_NOT_FOUND',
  PARENT_PROJECT_MISMATCH:  'SCREEN_ACTION_PARENT_PROJECT_MISMATCH',
  TARGET_NOT_FOUND:         'SCREEN_ACTION_TARGET_NOT_FOUND',
  TARGET_PROJECT_MISMATCH:  'SCREEN_ACTION_TARGET_PROJECT_MISMATCH',
  NOT_FOUND:                'SCREEN_ACTION_NOT_FOUND',
  DUPLICATE_NAME:           'SCREEN_ACTION_DUPLICATE_NAME',
  IMMUTABLE_FIELD:          'SCREEN_ACTION_IMMUTABLE_FIELD',
  PERMISSION_DENIED:        'SCREEN_ACTION_PERMISSION_DENIED',
  TARGET_CONSTRAINT:        'SCREEN_ACTION_TARGET_CONSTRAINT',
}
```

### 5.3 Service methods

```javascript
createService(options?) => {
  listByScreenSpec(projectId, screenSpecId, query?, context?) => Promise<ScreenAction[]>
  listByProject(projectId, query?, context?) => Promise<ScreenAction[]>   // optional query.screenSpecId, query.actionType
  getById(projectId, actionId, context?) => Promise<ScreenAction|null>
  create(projectId, input, context?) => Promise<ScreenAction>
  update(projectId, actionId, patch, context?) => Promise<ScreenAction>
  delete(projectId, actionId, context?) => Promise<void>

  // contract exports
  validateScreenActionInput(input, mode)
  validateCompleteDocument(doc)
  buildCreatePayload(input, context)
  buildUpdatePatch(current, patch, context)
  normalizeScreenAction(raw)
  normalizeName(name)
}
```

### 5.4 Authorization

| Action | Roles |
|--------|-------|
| LIST, READ | owner, admin, editor, **viewer** |
| CREATE, UPDATE, DELETE | owner, admin, **editor** |

`createMemberRoleAuthorize(getMemberRole)` — screenFields/screenSpecs와 동일 패턴.

### 5.5 FORBIDDEN input fields

**Create (`CREATE_FORBIDDEN_INPUT_FIELDS`):**

```txt
id, projectId, schemaVersion, createdAt, createdBy, updatedAt, updatedBy
```

**Update (`UPDATE_FORBIDDEN_INPUT_FIELDS`):**

```txt
id, projectId, screenSpecId, schemaVersion, createdAt, createdBy, updatedAt, updatedBy
```

### 5.6 Service 보장 (validation summary)

- Full enum validation (`actionType`, `controlType`, `placement`, `variant`)
- `name` / `label` format, trim
- `order` non-negative integer
- `disabled`, `confirmRequired` boolean
- `targetScreenSpecId` actionType semantics (§4.5)
- `confirmRequired` / `confirmTitle` / `confirmMessage` cross-rules (§4.6)
- `successMessage` optional string ≤ 500
- Create/update patch → `validateCompleteDocument` on merged state
- Duplicate name preflight (§9)
- Adapter error mapping (`mapAdapterError`)

---

## 6. Adapter 공개 API

**Module:** `stam/js/stam.screen-action-firestore-adapter.js`  
**Global:** `STAM.screenActionFirestoreAdapter`

```javascript
COLLECTION = 'screenActions'
SCREEN_SPECS_COLLECTION = 'screenSpecs'

create(options?) => {
  listByScreenSpec(projectId, screenSpecId, query?) => Promise<raw[]>
  listByProject(projectId, query?) => Promise<raw[]>
  getById(projectId, actionId) => Promise<raw|null>
  create(projectId, action) => Promise<raw>      // preflight + doc-ref transaction — §8
  update(projectId, actionId, patch) => Promise<raw>
  delete(projectId, actionId) => Promise<void>   // hard delete
  findDuplicateNormalizedName(projectId, screenSpecId, normalizedName, excludeActionId?) => Promise<string|null>
}

// contract exports
PREFLIGHT_CODES
normalizeName(name)
compareScreenActions(a, b)
runCreatePreflight(db, projectId, payload, excludeActionId?)
runCreateTransaction(db, projectId, payload)
runUpdatePreflight(db, projectId, actionId, patch, current)
runUpdateTransaction(db, projectId, actionId, patch, current)
assertScreenSpecParentExists(db, projectId, screenSpecId)
assertScreenSpecTargetExistsIfSet(db, projectId, targetScreenSpecId)
validateParentSnapshot(snap, projectId)
validateTargetSnapshot(snap, projectId)
needsTargetPreflight(patch, current)
effectiveTargetScreenSpecId(patch, current)
```

**Timestamp:** create/update 시 Adapter가 `FieldValue.serverTimestamp()` 주입. Service payload의 ISO audit 필드는 write 시 **replace**.

**Transaction scope:** `DocumentReference` read + write **only** — parent screenSpec doc, target screenSpec doc (when applicable), action doc. **Query reads inside transaction 금지** (compat SDK 제약).

**UPDATE_IMMUTABLE_FIELDS (Adapter patch guard):** `id`, `projectId`, `screenSpecId`, `createdAt`, `createdBy`, `schemaVersion`.

---

## 7. 역할별 CRUD 권한표

| Role | list/get | create | update | delete |
|------|----------|--------|--------|--------|
| owner | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| editor | ✅ | ✅ | ✅ | ✅ |
| viewer | ✅ | ❌ | ❌ | ❌ |
| non-member | ❌ | ❌ | ❌ | ❌ |

Rules: `isScreenActionWriter(projectId)` → `isScreenSpecWriter(projectId)` delegate.  
Counter doc: **없음**.

---

## 8. create / update / delete 처리 순서

### 8.1 CREATE

```
1. authorize(CREATE, context)
2. validateScreenActionInput(input, 'create')
3. buildCreatePayload → ISO createdAt/updatedAt in payload (pre-adapter)
4. Service preflight duplicate: findDuplicateNormalizedName (query.get outside transaction)
5. Adapter runCreatePreflight (outside transaction):
   a. assertScreenSpecParentExists (parent doc.get)
   b. assertDuplicateNameAbsent (collection.where('screenSpecId','==', id).get())
   c. assertScreenSpecTargetExistsIfSet (target doc.get when targetScreenSpecId set)
6. Adapter runCreateTransaction:
   a. transaction.get(parent screenSpec DocumentReference) → validateParentSnapshot
   b. if targetScreenSpecId set → transaction.get(target DocumentReference) → validateTargetSnapshot
   c. transaction.set(new random-id doc) + serverTimestamp audit
7. getById + normalizeScreenAction → ISO dates
```

### 8.2 UPDATE

```
1. authorize(UPDATE)
2. adapter.getById → NOT_FOUND if missing
3. validateScreenActionInput(patch, 'update')
4. buildUpdatePatch(current, patch):
   a. current + patch 병합
   b. actionType 전환에 따른 targetScreenSpecId 정규화
   c. confirmRequired 전환에 따른 confirmTitle/confirmMessage 정규화
   d. update 문자열 필드 trim/null 정규화
   e. 정규화된 완성 문서 validateCompleteDocument
   f. Adapter 전달 patch 생성 (자동 정규화 필드 포함)
5. if name normalized changed → Service preflight duplicate (exclude self)
6. Adapter runUpdatePreflight (outside transaction):
   a. if name changed → assertDuplicateNameAbsent
   b. if actionType or targetScreenSpecId in patch → assertScreenSpecTargetExistsIfSet(effective target)
7. Adapter runUpdateTransaction:
   a. transaction.get(action DocumentReference) → exists check
   b. if effective target non-empty → transaction.get(target DocumentReference) → validateTargetSnapshot
   c. transaction.update(action doc) + serverTimestamp updatedAt
8. getById + normalizeScreenAction
```

**Firebase Web compat note:** `Transaction.get()` accepts **DocumentReference only** — not Query. Duplicate checks are **never** inside transactions.

**No optimistic version lock** (screenActions는 `version` 필드 없음). Last-write-wins on scalar fields.

**Parent re-validation on update:** **없음** — `screenSpecId` immutable (Service forbidden + Rules + Adapter immutable guard).

### 8.3 DELETE (hard)

```
1. authorize(DELETE)
2. adapter.getById → NOT_FOUND if missing
3. collection.doc(actionId).delete() — physical delete
4. Rules: isScreenActionWriter(projectId)
```

Parent/target screenSpec **존재 여부와 무관**하게 delete 허용.

---

## 9. name 중복 검사 — 방식과 보장 한계

### 9.1 방식 (query preflight — transaction 밖)

**Firebase Web compat SDK:** `Transaction.get()`은 **DocumentReference만** 허용한다. Query read는 **지원하지 않는다**.  
공식: https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Transaction

1. **Service preflight:** `preflightDuplicateName` → `adapter.findDuplicateNormalizedName` → `collection.where('screenSpecId','==', id).get()` (**transaction 밖**)
2. **Adapter runCreatePreflight / runUpdatePreflight:** parent `doc.get()` + duplicate query `.get()` + target `doc.get()` when applicable (**transaction 밖**)
3. **Adapter transaction:** parent `transaction.get(parentDocRef)` + optional target `transaction.get(targetDocRef)` + `transaction.set` / `transaction.get(actionDocRef)` + `transaction.update` only

### 9.2 보장 한계

| 주장 | 실제 |
|------|------|
| Rules가 name unique 보장 | **❌ 불가** |
| Adapter transaction duplicate check | **❌ 사용하지 않음** — compat `Transaction.get(Query)` 미지원 |
| Adapter transaction scope | **DocumentReference read + write only** (parent/target/action doc) |
| Service + Adapter query preflight | **best-effort** — sequential duplicate reject |
| Concurrent insert 100% unique | **❌ 보장하지 않음** — unique registry / deterministic ID 없음 |

**문서 표현 (필수):** 「Firestore Rules는 name 유일성을 보장하지 않는다. Service 및 Adapter **query preflight**(transaction 밖)로 동일 screenSpecId 내 normalized name 중복을 **best-effort**로 방지한다. Firebase Web compat `Transaction.get()`은 Query를 지원하지 않으므로 concurrent insert에 대해 100% 유일성을 보장하지 않는다.」

---

## 10. parent / target 검증

### 10.1 Parent (`screenSpecId`)

| 시점 | 검증 | 실패 코드 |
|------|------|----------|
| **create — Service** | input required | `VALIDATION_FAILED` |
| **create — Adapter preflight** | parent doc exists; `projectId` 일치; `isDeleted !== true` | `PARENT_NOT_FOUND`, `PARENT_PROJECT_MISMATCH` |
| **create — Adapter transaction** | `transaction.get(parentRef)` 재검증 | 동일 |
| **create — Rules** | `isValidScreenActionParentOnCreate` — exists + projectId + non-deleted | permission-denied |
| **update** | `screenSpecId` **immutable** — patch 금지 | `IMMUTABLE_FIELD` / Rules deny |
| **delete** | parent 존재 **미검증** | — |

### 10.2 Target (`targetScreenSpecId`)

| 시점 | 검증 | 실패 코드 |
|------|------|----------|
| **create/update — Service** | actionType semantics (§4.5); merged validation | `VALIDATION_FAILED` |
| **create — Adapter preflight** | target set → doc exists; projectId; non-deleted | `TARGET_NOT_FOUND`, `TARGET_PROJECT_MISMATCH` |
| **create — Adapter transaction** | target set → `transaction.get(targetRef)` | 동일 |
| **update — Adapter preflight** | `needsTargetPreflight` → effective target exists if non-empty | 동일 |
| **update — Adapter transaction** | effective target non-empty → `transaction.get(targetRef)` | 동일 |
| **create/update — Rules** | `isValidScreenActionTargetRef` + `isValidScreenActionTargetOnWrite` | permission-denied |
| **delete** | target 존재 **미검증** | — |

**Rules parent on update:** parent existence **재검증하지 않음** (screenSpecId immutable). Target existence **create·update 모두** 검증.

---

## 11. Rules 보장 vs Service 보장 vs non-goals

### 11.1 Rules가 보장하는 것 (ScreenAction-1)

- top-level 필드 whitelist / required keys (`screenActionWriteKeys`, `screenActionRequiredKeys`)
- `name`, `label`, enum fields, `order`, boolean flags
- `targetScreenSpecId` ref shape + target doc exists on write (when non-null)
- parent screenSpec exists + `projectId` exact match + non-deleted (**create only**)
- `confirmRequired` / `confirmTitle` / `confirmMessage` / `successMessage` coarse shape (§4.6)
- audit timestamp/actor policy, immutable fields on update
- hard delete writer gate

### 11.2 Rules non-goals (Service/Adapter 계약)

- normalized **name uniqueness**
- `targetScreenSpecId` trim / empty-string normalization semantics (Rules: non-empty string or null only)
- confirm field cross-rules beyond coarse shape (e.g. confirmRequired=false with title set — **Service rejects**, Rules may not catch all edge cases)
- list sort order (Service/Adapter `compareScreenActions`)
- duplicate preflight timing / concurrent safety

### 11.3 Service가 보장하는 것

- full enum validation, defaults on create
- `targetScreenSpecId` actionType semantics + trim
- confirm cross-field rules (§4.6)
- name normalize + duplicate query preflight (sequential best-effort)
- merged document validation on update
- permission authorize gate

### 11.4 Adapter가 보장하는 것

- parent/target existence preflight + transaction re-read (DocumentReference)
- duplicate query preflight (sequential best-effort)
- immutable field strip on update patch
- serverTimestamp injection on write
- hard delete

---

## 12. 오류 코드

| Code | HTTP analog | 설명 |
|------|-------------|------|
| `SCREEN_ACTION_VALIDATION_FAILED` | 400 | input / merged validation errors[] |
| `SCREEN_ACTION_PARENT_NOT_FOUND` | 404 | screenSpec missing/deleted |
| `SCREEN_ACTION_PARENT_PROJECT_MISMATCH` | 400 | parent.projectId ≠ projectId |
| `SCREEN_ACTION_TARGET_NOT_FOUND` | 404 | target screenSpec missing/deleted |
| `SCREEN_ACTION_TARGET_PROJECT_MISMATCH` | 400 | target.projectId ≠ projectId |
| `SCREEN_ACTION_NOT_FOUND` | 404 | action id missing |
| `SCREEN_ACTION_DUPLICATE_NAME` | 409 | normalized name collision |
| `SCREEN_ACTION_IMMUTABLE_FIELD` | 400 | id/projectId/screenSpecId/schemaVersion/audit on update |
| `SCREEN_ACTION_PERMISSION_DENIED` | 403 | authorize failed |
| `SCREEN_ACTION_TARGET_CONSTRAINT` | 400 | reserved — adapter map target; current adapter does not emit |

Service errors: `err.code = '<CODE>'`. Adapter preflight: `err.preflight = true`, `err.code` from `PREFLIGHT_CODES`.

---

## 13. Rules helper 목록 (ScreenAction-1)

**Block comment:** `ScreenAction write helpers (ScreenAction-1)`

| Helper | 역할 |
|--------|------|
| `isScreenActionWriter(projectId)` | `isScreenSpecWriter(projectId)` delegate (owner/admin/editor) |
| `isValidScreenActionName(name)` | charset + length 2–80 |
| `isValidScreenActionLabel(label)` | 1–120 |
| `isValidScreenActionType(actionType)` | enum (9 values) |
| `isValidScreenActionControlType(controlType)` | enum (4 values) |
| `isValidScreenActionPlacement(placement)` | enum (6 values) |
| `isValidScreenActionVariant(variant)` | enum (5 values) |
| `isValidScreenActionOrder(order)` | int ≥ 0 |
| `isValidScreenActionTargetRef(data)` | navigate/openDrawer/null semantics |
| `isValidScreenActionTargetOnWrite(projectId, data)` | target exists + projectId + non-deleted when set |
| `isValidScreenActionConfirm(data)` | confirmRequired bool + message/title shape |
| `isValidScreenActionParentRef(projectId, data)` | screenSpecId non-empty string |
| `isValidScreenActionParentOnCreate(projectId, data)` | parent exists + projectId + non-deleted |
| `screenActionWriteKeys()` | allowed keys whitelist (21) |
| `screenActionRequiredKeys()` | required keys on write (21) |
| `screenActionFieldValidation(projectId, data)` | compose field helpers |
| `isValidScreenActionCreate(projectId, actionId)` | writer + id match + validation + parent on create |
| `isValidScreenActionUpdate(projectId, actionId)` | writer + immutable fields + validation |
| `isValidScreenActionDelete(projectId, actionId)` | writer only |

**Match block:**

```javascript
match /screenActions/{actionId} {
  allow get, list: if canReadProject(projectId);
  allow create: if isValidScreenActionCreate(projectId, actionId);
  allow update: if isValidScreenActionUpdate(projectId, actionId);
  allow delete: if isValidScreenActionDelete(projectId, actionId);
}
```

**Rules header comment (ScreenAction-1):** write opened editor+; hard delete; parent/target existence on write when applicable; **name uniqueness NOT rules-enforced**.

---

## 14. 감사 필드 처리 (screenSpecs 동형)

| 단계 | createdAt / updatedAt | createdBy / updatedBy |
|------|----------------------|------------------------|
| Service `buildCreatePayload` | `nowIso()` string | actor uid |
| Service `buildUpdatePatch` | `nowIso()` on updatedAt | actor uid on updatedBy |
| Adapter write | **`FieldValue.serverTimestamp()`** replaces | pass through uid strings |
| Adapter read `normalizeValue` | Timestamp → ISO string | string |
| Rules create | `createdAt == request.time`, `updatedAt == request.time` | uid match |
| Rules update | `createdAt/createdBy` immutable; `updatedAt == request.time` | `updatedBy == uid()` |

---

## 15. 계약 테스트 및 Emulator E2E

### 15.1 Contract — Service (`test-screen-action-service-contract.mjs`)

- ACTIONS / ERROR_CODES / SCHEMA_VERSION export
- `normalizeName` trim + lowercase
- full `actionType` enum create validation
- navigate target required; cancel with target rejected
- confirmRequired / confirmMessage cross-rules
- forbidden create/update fields
- `buildCreatePayload` defaults (button/toolbar/secondary)
- update navigate without target → VALIDATION_FAILED
- role authorize stub
- fake adapter: create/update/delete + sequential duplicate reject

### 15.2 Contract — Adapter (`test-screen-action-adapter-contract.mjs`)

- no `transaction.get(query)` in source
- compat mock: Transaction.get rejects Query
- create success — txGets DocumentReference only
- duplicate create reject (case-insensitive name)
- target project mismatch / deleted target reject
- rename update + rename duplicate reject
- navigate update + hard delete

### 15.3 Contract — Rules (`test-screen-action-rules-contract.mjs`)

- ScreenAction-1 helper block exists
- screenActions match: get/list read; create/update/delete separate
- writer helpers; parent/target/confirm helpers
- **assert no rule claims name uniqueness**
- all actionType / controlType enum values in rules

### 15.4 Contract — Role matrix (`test-screen-action-role-matrix-contract.mjs`)

- owner/admin/editor: create/update/delete pass
- viewer: read pass, write fail
- WRITE_ROLES / READ_ROLES contract match
- delete allowed for writer (unlike screenSpecs delete false)

### 15.5 Rules Emulator E2E (`test-screen-action-firestore-rules-emulator.mjs`)

역할·Rules shape·audit·parent/target 검증 전용. **Adapter name 중복 검증 아님.**

| # | 시나리오 |
|---|----------|
| 1 | viewer list/get 허용 |
| 2 | viewer create/update/delete 거부 |
| 3 | editor create / update / hard delete 허용 |
| 4 | signed-out get/list/create 거부 |
| 5 | non-member / cross-project 접근 거부 |
| 6 | parent missing / deleted / other-project / projectId 누락 create 거부 |
| 7 | audit timestamp·createdBy·updatedBy 위조 create 거부 |
| 8 | update 시 createdAt/createdBy immutable 거부 |
| 9 | screenSpecId immutable 거부 |
| 10 | forbidden extra top-level key 거부 |
| 11 | delete 후 get NOT_FOUND; 동일 name 재등록 Rules layer 허용 |
| 12 | navigate without target create 거부 |
| 13 | navigate with valid target create 허용 |
| 14 | target missing / deleted / other-project create 거부 |

### 15.6 Adapter Emulator E2E (`test-screen-action-adapter-firestore-emulator.mjs`)

compat Web SDK + Firestore emulator + auth. **Service/Adapter query preflight** 경로.

| # | 시나리오 |
|---|----------|
| 1 | create 성공 |
| 2 | sequential duplicate normalized name create 거부 |
| 3 | update actionType navigate + target 성공 |
| 4 | rename update 성공 |
| 5 | rename duplicate reject |
| 6 | hard delete 성공 |
| 7 | `Transaction.get()` — DocumentReference only (Query 미사용) |

---

## 16. PR C 제외 및 후속 PR

| PR | 내용 |
|----|------|
| **PR D** | Action Editor UI, visibility/enabled condition, Confirm/Alert/Toast runtime, detail drawer |
| **PR E** | SB→screenActions TSV seed (KR ID mapping) |
| **PR F** | channelScope, localeScope |
| **PR G** | PPT/IA ingest automation |

---

## 18. 예상 신규·수정 파일

### 18.1 신규

| 파일 | 용도 |
|------|------|
| `stam/js/stam.screen-action-service.js` | Domain service |
| `stam/js/stam.screen-action-firestore-adapter.js` | Firestore adapter |
| `scripts/test-screen-action-service-contract.mjs` | Service contract |
| `scripts/test-screen-action-adapter-contract.mjs` | Adapter compat Transaction contract |
| `scripts/test-screen-action-rules-contract.mjs` | Rules structure |
| `scripts/test-screen-action-role-matrix-contract.mjs` | Role matrix |
| `scripts/test-screen-action-firestore-rules-emulator.mjs` | Rules Emulator E2E (로컬·수동) |
| `scripts/test-screen-action-adapter-firestore-emulator.mjs` | Adapter Emulator E2E (로컬·수동) |
| `docs/ops/STAM-PR-C-ScreenActions-Spec-v1.md` | 본 spec 정식본 |

### 18.2 수정

| 파일 | 변경 |
|------|------|
| `firestore.rules` | ScreenAction-1 helpers + `match /screenActions/{actionId}` block |

> **Note:** `firestore.indexes.json`, `.github/workflows/**` — **이번 PR에서 변경 없음**.

### 18.3 변경 없음

`stam/pages/**`, `stam/css/**`, `stam/js/**` (screen-action 2종 외), Field Editor, Action Editor UI, `stam.screen-specification*.js`, `firestore.indexes.json` (duplicate-name query·list query에 신규 composite index 근거 없음).

### 18.4 CI 및 Emulator 현황

| 항목 | 현황 |
|------|------|
| Emulator 테스트 파일 | **2종 구현됨** — `test-screen-action-firestore-rules-emulator.mjs`, `test-screen-action-adapter-firestore-emulator.mjs` |
| 로컬 실행 | **Java 필요** — Firebase Emulator (auth + firestore) |
| 기존 CI 연결 | **없음** — `.github/workflows/`에 screen-action emulator job 미등록 |
| Preview workflow (`firebase-hosting-pr-preview.yml`) | Firebase Hosting preview channel deploy **만** 수행 |
| Rules workflow (`firebase-firestore-rules-pr-preview.yml`) | `stam-preview-hosting` staging Rules deploy **만** 수행 (emulator test 없음) |
| PR C 완료 증거 | **계약 테스트 4종 PASS** + Preview/Rules workflow SUCCESS. **Emulator 실행은 CI에 포함되지 않음.** |
| 후속 | `.github/workflows` Emulator job 추가 — **별도 승인 PR에서 CI 연결 검토** |

---

## 21. 구현 전 결정사항 최종 체크

| # | 결정 | 상태 |
|---|------|------|
| 1 | Hard delete PR C 포함 | ✅ **닫힘** |
| 2 | Random actionId (auto-id) | ✅ **닫힘** |
| 3 | deterministic actionId 제외 | ✅ **닫힘** |
| 4 | name 중복: Service + Adapter **query preflight** (tx 밖) | ✅ **닫힘** |
| 5 | Rules는 name unique **미보장** 명시 | ✅ **닫힘** |
| 6 | 저장 경로 flat subcollection | ✅ **닫힘** |
| 7 | visibilityCondition / enabledCondition PR C 제외 | ✅ **닫힘** |
| 8 | Action Editor / Confirm·Toast **런타임** PR C 제외 | ✅ **닫힘** |
| 9 | audit screenSpecs 동형 | ✅ **닫힘** |
| 10 | name 정규화: trim + case-insensitive compare | ✅ **닫힘** |
| 11 | targetScreenSpecId navigate required / openDrawer optional / others null | ✅ **닫힘** |
| 12 | parent screenSpec create-only validation; immutable on update | ✅ **닫힘** |
| 13 | target screenSpec create+update validation (when set) | ✅ **닫힘** |
| 14 | Adapter transaction DocumentReference only | ✅ **닫힘** |
| 15 | confirm fields data-only; cross-rules in Service | ✅ **닫힘** |
| 16 | order ≥ 0, ties allowed, compareScreenActions sort | ✅ **닫힘** |
| 17 | targetUrl / apiEndpoint 제외 | ✅ **닫힘** |
| 18 | soft delete / version field 미도입 | ✅ **닫힘** |

**모든 구현 전 결정사항 닫힘 — PR C 구현 완료.**

---

*End of PR C Spec v1 (official)*
