# STAM PR B — screenFields Spec Draft v1

| 항목 | 값 |
|------|-----|
| 상태 | **Official v1 — PR B implemented** |
| base | `origin/main` @ `3c81d45` |
| 저장 경로 | `projects/{projectId}/screenFields/{fieldId}` |
| fieldId | Firestore **랜덤 document ID** (auto-id) |
| schemaVersion | `1` |
| 작성일 | 2026-08-01 |

---

## 1. 목적과 범위

### 1.1 목적

화면설계서 master(`screenSpecs`)에 종속되는 **필드 정의**를 Firestore에 CRUD 가능한 1차 데이터로 제공한다. UI Field Editor 없이 Service·Adapter·Rules·계약 테스트만으로 데이터 계층을 닫는다.

### 1.2 PR B 포함

- `screenFields` 데이터 계약 (schemaVersion 1)
- Domain Service (`STAM.screenFieldService`)
- Firestore Adapter (`STAM.screenFieldFirestoreAdapter`)
- Firestore Rules write open (editor 이상)
- Service/Adapter/Rules **contract tests**
- Firestore Rules **Emulator E2E**
- **Hard delete** (editor+)
- 상위 `screenSpecId` 존재·동일 `projectId` 검증
- 동일 `screenSpecId` 내 **정규화 name** 중복 차단 (Service + Adapter transaction)
- Audit 필드: screenSpecs와 **동형** (Service ISO → Adapter serverTimestamp → read ISO normalize)

### 1.3 PR B 제외

| 제외 | 후속 |
|------|------|
| `channelScope`, `localeScope` | PR F |
| `visibilityCondition`, `enabledCondition` | PR D |
| `screenActions` | PR C |
| Field Editor UI, detail drawer 필드 섹션 | PR D |
| SB/KR ID seed·import | PR E/G |
| deterministic fieldId | **제외 확정** |
| PPT/IA 자동 ingest | PR G |

---

## 2. Firestore 문서 예시

**Path:** `projects/PARNAS-RENEWAL/screenFields/xY7kL2mN9pQ3rT8vW1zA`

```json
{
  "id": "xY7kL2mN9pQ3rT8vW1zA",
  "projectId": "PARNAS-RENEWAL",
  "screenSpecId": "scr-abc123def456",
  "order": 10,
  "name": "titleText",
  "label": "제목 텍스트",
  "type": "text",
  "required": true,
  "readonly": false,
  "disabled": false,
  "defaultValue": null,
  "placeholder": "제목을 입력하세요",
  "helpText": "최대 120자",
  "minLength": 1,
  "maxLength": 120,
  "options": [],
  "validationRules": [
    { "kind": "regex", "pattern": "^[^\\x00-\\x1F]*$" }
  ],
  "schemaVersion": 1,
  "createdAt": "<Firestore Timestamp>",
  "createdBy": "uid-editor-001",
  "updatedAt": "<Firestore Timestamp>",
  "updatedBy": "uid-editor-001"
}
```

**Select 예시 (options non-empty):**

```json
{
  "id": "aB3cD4eF5gH6iJ7kL8mN",
  "projectId": "PARNAS-RENEWAL",
  "screenSpecId": "scr-abc123def456",
  "order": 20,
  "name": "category",
  "label": "분류",
  "type": "select",
  "required": true,
  "readonly": false,
  "disabled": false,
  "defaultValue": "offers",
  "placeholder": "분류 선택",
  "helpText": null,
  "minLength": null,
  "maxLength": null,
  "options": [
    { "value": "offers", "label": "오퍼스" },
    { "value": "news", "label": "공지" }
  ],
  "validationRules": [],
  "schemaVersion": 1,
  "createdAt": "<Firestore Timestamp>",
  "createdBy": "uid-editor-001",
  "updatedAt": "<Firestore Timestamp>",
  "updatedBy": "uid-editor-001"
}
```

> **Note:** Stored `createdAt`/`updatedAt` are Firestore Timestamps. Client read path normalizes to ISO 8601 strings (screenSpecs adapter pattern).

---

## 3. 필드별 타입·필수 여부·기본값

| 필드 | Firestore 타입 | Create | Update | 기본값 | 비고 |
|------|----------------|--------|--------|--------|------|
| `id` | string | auto (doc id) | immutable | doc id | random auto-id |
| `projectId` | string | **required** | immutable | — | path와 일치 |
| `screenSpecId` | string | **required** | immutable | — | FK → screenSpecs |
| `order` | int | optional | optional | `0` | ≥ 0 |
| `name` | string | **required** | optional | — | machine name, §3.1 |
| `label` | string | **required** | optional | — | UI 라벨 1–120 |
| `type` | string | **required** | optional | — | enum §4 |
| `required` | bool | optional | optional | `false` | |
| `readonly` | bool | optional | optional | `false` | 정적 속성 |
| `disabled` | bool | optional | optional | `false` | 정적 속성 |
| `defaultValue` | mixed\|null | optional | optional | `null` | §5 |
| `placeholder` | string\|null | optional | optional | `null` | ≤ 200, clearable |
| `helpText` | string\|null | optional | optional | `null` | ≤ 500, clearable |
| `minLength` | int\|null | optional | optional | `null` | text types only |
| `maxLength` | int\|null | optional | optional | `null` | text types only |
| `options` | array | optional | optional | `[]` | select types only, §6 |
| `validationRules` | array | optional | optional | `[]` | regex only, §7 |
| `schemaVersion` | int | **required** | immutable | `1` | |
| `createdAt` | timestamp | server | immutable | server | |
| `createdBy` | string | **required** | immutable | actor uid | |
| `updatedAt` | timestamp | server | server | server | |
| `updatedBy` | string | **required** | actor uid | actor uid | |

**PR B 미포함 필드:** `isDeleted`, `deletedAt`, `deletedBy`, `version`, `code`, `channelScope`, `localeScope`, `visibilityCondition`, `enabledCondition`, `exampleValue`.

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

## 4. type enum

```txt
text | textarea | number | boolean | switch | select | multiselect | date | datetime | file | image | editor
```

| type | options | min/maxLength | defaultValue (create) |
|------|---------|---------------|------------------------|
| `text` | `[]` | optional | §5 |
| `textarea` | `[]` | optional | §5 |
| `editor` | `[]` | optional | §5 |
| `number` | `[]` | forbidden | §5 |
| `boolean` | `[]` | forbidden | §5 |
| `switch` | `[]` | forbidden | §5 |
| `select` | **required ≥1** | forbidden | §5 |
| `multiselect` | **required ≥1** | forbidden | §5 |
| `date` | `[]` | forbidden | §5 |
| `datetime` | `[]` | forbidden | §5 |
| `file` | `[]` | forbidden | **null only** |
| `image` | `[]` | forbidden | **null only** |

**type 변경 (update):** 허용. 단, 변경 시 `defaultValue`·`options`·`minLength`·`maxLength`·`validationRules`가 새 type 규칙을 **동시에** 만족해야 함.

---

## 5. defaultValue 타입 매트릭스

| type | 허용 JSON 타입 | 추가 검증 |
|------|---------------|----------|
| `text`, `textarea`, `editor` | string \| null | minLength/maxLength 준수 |
| `number` | number (finite) \| null | — |
| `boolean`, `switch` | boolean \| null | — |
| `select` | string \| null | null 또는 `options[].value` 중 하나 |
| `multiselect` | string[] \| null | null 또는 each element ∈ option values, **unique** |
| `date`, `datetime` | string \| null | ISO8601 date / date-time (Service regex) |
| `file`, `image` | **null only** (create & update) | non-null 거부 |

**update 시 clear:** `defaultValue: null` 명시적 허용.

---

## 6. options 계약

```typescript
type ScreenFieldOption = {
  value: string;   // required, 1–80 chars, trim non-empty
  label: string;   // required, 1–120 chars, trim non-empty
  disabled?: boolean;  // optional, default false — PR B 저장만, UI 후속
};
```

| 규칙 | 설명 |
|------|------|
| **적용 type** | `select`, `multiselect` only. 그 외 type → **must be `[]`** |
| **value unique** | 동일 field 내 `options[].value` **case-sensitive** unique |
| **label/value 필수** | 각 항목 둘 다 non-empty after trim |
| **max items** | 100 |
| **value charset** | `^[a-zA-Z0-9_-]{1,80}$` |
| **update** | 전체 배열 replace (partial patch item 불가 — 배열 통째 교체) |

---

## 7. validation 계약

### 7.1 역할 분리 (중복 저장 금지)

| 계층 | 필드 | PR B 허용 |
|------|------|----------|
| **최상위 기본 제약** | `minLength`, `maxLength` | text/textarea/editor only |
| **확장 규칙** | `validationRules[]` | **`regex` kind only** |

**금지:** `validationRules`에 `{ kind: 'maxLength' }` 등 최상위와 동일 semantics 중복 저장. max length는 **`maxLength` 필드만** 사용.

### 7.2 validationRules schema (PR B)

```typescript
type ValidationRule = {
  kind: 'regex';           // PR B: regex only
  pattern: string;         // required, ≤ 500 chars, valid JS RegExp source
  flags?: string;          // optional, subset of 'gimsu' max 4 chars
};
```

| 규칙 | 설명 |
|------|------|
| max rules | 10 per field |
| empty array | allowed |
| 적용 type | `text`, `textarea`, `editor`, `number`(string coercion 없음 — number type은 regex **비권장**, Service warn optional), `select`/`multiselect` (value 검증은 options가 담당) |
| Service | pattern compile 시도 — invalid → validation error |

---

## 8. order 정의

| 규칙 | 값 |
|------|-----|
| 타입 | integer |
| 범위 | **≥ 0** |
| 기본값 (create omit) | `0` |
| **동순위 (tie)** | **허용** |
| 정렬 (list) | `(order ASC, createdAt ASC, id ASC)` |

동순위 허용 이유: reorder UI는 PR D; PR B는 데이터만 저장.

---

## 9. Service 공개 interface

**Module:** `stam/js/stam.screen-field-service.js`  
**Global:** `STAM.screenFieldService`, `STAM.screenFieldServiceContract`

### 9.1 ACTIONS

```javascript
{
  LIST:   'screenField.list',
  READ:   'screenField.read',
  CREATE: 'screenField.create',
  UPDATE: 'screenField.update',
  DELETE: 'screenField.delete',
}
```

### 9.2 Service methods

```javascript
createService(options?) => {
  listByScreenSpec(projectId, screenSpecId, query?, context?) => Promise<ScreenField[]>
  listByProject(projectId, query?, context?) => Promise<ScreenField[]>   // optional query.screenSpecId filter
  getById(projectId, fieldId, context?) => Promise<ScreenField|null>
  create(projectId, input, context?) => Promise<ScreenField>
  update(projectId, fieldId, patch, context?) => Promise<ScreenField>
  delete(projectId, fieldId, context?) => Promise<void>

  // contract exports
  validateScreenFieldInput(input, mode)
  buildCreatePayload(input, context, clock?)
  buildUpdatePatch(current, patch, context, clock?)
  normalizeScreenField(raw)
  normalizeName(name)
}
```

### 9.3 Authorization

| Action | Roles |
|--------|-------|
| LIST, READ | owner, admin, editor, **viewer** |
| CREATE, UPDATE, DELETE | owner, admin, **editor** |

`createMemberRoleAuthorize(getMemberRole)` — screenSpecs와 동일 패턴.

### 9.4 FORBIDDEN_FIELDS (create/update input)

```txt
id, projectId, screenSpecId (create: required in input but immutable on update),
createdAt, createdBy, updatedAt, updatedBy, schemaVersion
```

---

## 10. Adapter 공개 interface

**Module:** `stam/js/stam.screen-field-firestore-adapter.js`  
**Global:** `STAM.screenFieldFirestoreAdapter`

```javascript
COLLECTION = 'screenFields'

create(options?) => {
  listByScreenSpec(projectId, screenSpecId, query?) => Promise<raw[]>
  listByProject(projectId, query?) => Promise<raw[]>
  getById(projectId, fieldId) => Promise<raw|null>
  create(projectId, field) => Promise<raw>      // transaction — §11
  update(projectId, fieldId, patch) => Promise<raw>
  delete(projectId, fieldId) => Promise<void>   // hard delete
}

// contract exports
runCreateTransaction(db, projectId, payload)   // test hook
assertScreenSpecParentExists(db, projectId, screenSpecId)
findDuplicateNormalizedName(db, projectId, screenSpecId, normalizedName, excludeFieldId?)
```

**Timestamp:** create/update 시 Adapter가 `serverTimestamp()` 주입. Service payload의 ISO audit 필드는 **strip** 후 write.

---

## 11. create / update / delete 처리 순서

### 11.1 CREATE

```
1. authorize(CREATE, context)
2. validateScreenFieldInput(input, 'create')
3. buildCreatePayload → ISO createdAt/updatedAt in payload (pre-adapter)
4. Service preflight duplicate: findDuplicateNormalizedName (query.get outside transaction)
5. Adapter runCreatePreflight:
   a. assertScreenSpecParentExists (query.get DocumentReference outside transaction)
   b. assertDuplicateNameAbsent (query.get outside transaction)
6. Adapter runCreateTransaction:
   a. transaction.get(parent screenSpec DocumentReference)
   b. validate parent projectId exact equality + non-deleted
   c. transaction.set(new random-id doc) + serverTimestamp audit
7. normalizeScreenField(read back) → ISO dates
```

### 11.2 UPDATE

```
1. authorize(UPDATE)
2. load current by id
3. validateScreenFieldInput(patch, 'update')
4. buildUpdatePatch(current, patch)
5. if name changed → Service preflight duplicate (exclude self)
6. Adapter runUpdatePreflight → query.get duplicate check (outside transaction)
7. Adapter runUpdateTransaction → transaction.get(field DocumentReference) + transaction.update
8. normalize read back
```

**Firebase Web compat note:** `Transaction.get()` accepts **DocumentReference only** — not Query. Duplicate checks are **never** inside transactions.

**No optimistic version lock in PR B** (screenFields는 `version` 필드 없음). Last-write-wins on scalar fields.

### 11.3 DELETE (hard)

```
1. authorize(DELETE)
2. getById → NOT_FOUND if missing
3. adapter.delete(doc ref) — physical delete
4. Rules: isScreenFieldWriter(projectId)
```

Parent screenSpec **존재 여부와 무관**하게 delete 허용 (orphan field cleanup). Create 시에만 parent required.

---

## 12. 중복 검사 — 방식과 보장 한계

### 12.1 방식 (query preflight — transaction 밖)

**Firebase Web compat SDK:** `Transaction.get()`은 **DocumentReference만** 허용한다. Query read는 **지원하지 않는다**.  
공식: https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Transaction

1. **Service preflight:** `findDuplicateNormalizedName` → `collection.where('screenSpecId','==', id).get()` (**transaction 밖**)
2. **Adapter runCreatePreflight / runUpdatePreflight:** parent `doc.get()` + duplicate query `.get()` (**transaction 밖**)
3. **Adapter transaction:** parent `transaction.get(parentDocRef)` + `transaction.set` / `transaction.get(fieldDocRef)` + `transaction.update` only

### 12.2 보장 한계

| 주장 | 실제 |
|------|------|
| Rules가 name unique 보장 | **❌ 불가** |
| Adapter transaction duplicate check | **❌ 사용하지 않음** — compat Transaction.get(Query) 미지원 |
| Service + Adapter query preflight | **best-effort** — sequential duplicate reject |
| Concurrent insert 100% unique | **❌ 보장하지 않음** — unique registry / deterministic ID 없음 |

**문서 표현 (필수):** 「Firestore Rules는 name 유일성을 보장하지 않는다. Service 및 Adapter **query preflight**(transaction 밖)로 동일 screenSpecId 내 normalized name 중복을 **best-effort**로 방지한다. Firebase Web compat `Transaction.get()`은 Query를 지원하지 않으므로 concurrent insert에 대해 100% 유일성을 보장하지 않는다.」

**테스트:**
- `test-screen-field-adapter-contract.mjs` — Transaction mock rejects Query
- `test-screen-field-service-contract.mjs` — sequential duplicate reject
- `test-screen-field-adapter-firestore-emulator.mjs` — compat adapter create/update/delete (emulator)

---

## 13. Rules helper 목록 (PR B 구현 시)

**Block comment:** `ScreenField write helpers (ScreenField-1)`

| Helper | 역할 |
|--------|------|
| `isScreenFieldWriter(projectId)` | `isScreenSpecWriter(projectId)` delegate (owner/admin/editor) |
| `screenFieldWriteKeys()` | allowed keys whitelist |
| `screenFieldRequiredKeys()` | create required keys |
| `isValidScreenFieldName(name)` | charset + length |
| `isValidScreenFieldLabel(label)` | 1–120 |
| `isValidScreenFieldType(type)` | enum |
| `isValidScreenFieldOrder(order)` | int ≥ 0 |
| `isValidScreenFieldOptions(data)` | array shape, ≤100, value/label |
| `isValidScreenFieldValidationRules(data)` | regex-only, ≤10 |
| `isValidScreenFieldDefaultValue(data)` | coarse type kind vs `data.type` |
| `isValidScreenFieldMinMax(data)` | min≤max when both set |
| `isValidScreenFieldParentRef(projectId, data)` | screenSpecId non-empty string |
| `isValidScreenFieldParentOnCreate(projectId, data)` | parent exists + projectId match + non-deleted |
| `isValidScreenFieldCreate(projectId, fieldId)` | writer + id match + validation |
| `isValidScreenFieldUpdate(projectId, fieldId)` | writer + immutable fields + validation |
| `isValidScreenFieldDelete(projectId, fieldId)` | writer only |
| `screenFieldFieldValidation(projectId, data)` | compose helpers |

**Match block:**

```javascript
match /screenFields/{fieldId} {
  allow get, list: if canReadProject(projectId);
  allow create: if isValidScreenFieldCreate(projectId, fieldId);
  allow update: if isValidScreenFieldUpdate(projectId, fieldId);
  allow delete: if isValidScreenFieldDelete(projectId, fieldId);
}
```

**명시적 non-goals (Rules):** parent screenSpec existence, normalized name uniqueness — **Service/Adapter only**.

---

## 14. 역할별 CRUD 권한표

| Role | list/get | create | update | delete |
|------|----------|--------|--------|--------|
| owner | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| editor | ✅ | ✅ | ✅ | ✅ |
| viewer | ✅ | ❌ | ❌ | ❌ |
| non-member | ❌ | ❌ | ❌ | ❌ |

Counter doc: **없음** (screenFields는 code/counter 불사용).

---

## 15. 상위 screenSpec 참조 검증

| 시점 | 검증 | 실패 코드 |
|------|------|----------|
| **create** | `projects/{pid}/screenSpecs/{screenSpecId}` exists; `projectId` 일치; `isDeleted !== true` | `SCREEN_FIELD_PARENT_NOT_FOUND`, `SCREEN_FIELD_PARENT_PROJECT_MISMATCH` |
| **update** | `screenSpecId` **immutable** — patch 금지 | `SCREEN_FIELD_IMMUTABLE_FIELD` |
| **delete** | parent 존재 **미검증** | — |
| **Rules** | `screenSpecId` is string non-empty only | — |

---

## 16. 감사 필드 처리 (screenSpecs 동형)

| 단계 | createdAt / updatedAt | createdBy / updatedBy |
|------|----------------------|------------------------|
| Service `buildCreatePayload` | `nowIso()` string | actor uid |
| Service `buildUpdatePatch` | `nowIso()` on updatedAt | actor uid on updatedBy |
| Adapter write | **`FieldValue.serverTimestamp()`** replaces | pass through uid strings |
| Adapter read `normalizeValue` | Timestamp → ISO string | string |
| Rules create | `createdAt == request.time`, `updatedAt == request.time` | uid match |
| Rules update | `createdAt/createdBy` immutable; `updatedAt == request.time` | `updatedBy == uid()` |

---

## 17. 오류 코드

| Code | HTTP analog | 설명 |
|------|-------------|------|
| `SCREEN_FIELD_VALIDATION_FAILED` | 400 | input validation errors[] |
| `SCREEN_FIELD_PARENT_NOT_FOUND` | 404 | screenSpec missing/deleted |
| `SCREEN_FIELD_PARENT_PROJECT_MISMATCH` | 400 | parent.projectId ≠ projectId |
| `SCREEN_FIELD_NOT_FOUND` | 404 | field id missing |
| `SCREEN_FIELD_DUPLICATE_NAME` | 409 | normalized name collision |
| `SCREEN_FIELD_IMMUTABLE_FIELD` | 400 | screenSpecId/id/projectId on update |
| `SCREEN_FIELD_PERMISSION_DENIED` | 403 | authorize failed |
| `SCREEN_FIELD_TYPE_CONSTRAINT` | 400 | options/min/max on wrong type |
| `SCREEN_FIELD_DEFAULT_VALUE_INVALID` | 400 | defaultValue vs type/options |
| `SCREEN_FIELD_OPTIONS_INVALID` | 400 | duplicate value, empty label |
| `SCREEN_FIELD_VALIDATION_RULE_INVALID` | 400 | bad regex pattern |

Service errors: `err.code = '<CODE>'`. Adapter preflight: `err.preflight = true` where applicable.

---

## 18. 예상 신규·수정 파일

### 18.1 신규

| 파일 | 용도 |
|------|------|
| `stam/js/stam.screen-field-service.js` | Domain service |
| `stam/js/stam.screen-field-firestore-adapter.js` | Firestore adapter |
| `scripts/test-screen-field-service-contract.mjs` | Service contract |
| `scripts/test-screen-field-rules-contract.mjs` | Rules structure |
| `scripts/test-screen-field-role-matrix-contract.mjs` | Role matrix |
| `scripts/test-screen-field-adapter-contract.mjs` | Adapter compat Transaction contract |
| `scripts/test-screen-field-adapter-firestore-emulator.mjs` | Adapter compat emulator integration |
| `docs/ops/STAM-PR-B-ScreenFields-Spec-v1.md` | 본 spec 정식본 |

### 18.2 수정

| 파일 | 변경 |
|------|------|
| `firestore.rules` | ScreenField-1 helpers + match block |
| `firestore.indexes.json` | optional: `screenFields` + `screenSpecId` (list query) |
| `.github/workflows/firebase-firestore-rules-*.yml` | emulator job에 screenField suite 추가 |

### 18.3 변경 없음

`stam/pages/**`, `stam/css/**`, `stam.screen-specification*.js`, Field Editor, screenActions.

---

## 19. 계약 테스트 및 Emulator E2E 시나리오

### 19.1 Contract — Service (`test-screen-field-service-contract.mjs`)

- ACTIONS / ERROR_CODES export
- `normalizeName` trim + lowercase
- create/update/delete service flow with fake adapter
- sequential duplicate name reject
- type enum, options, validationRules regex-only, file/image null default
- stable sort via `compareScreenFields`
- role authorize matrix stub

### 19.2 Contract — Rules (`test-screen-field-rules-contract.mjs`)

- ScreenField-1 helper block exists
- screenFields match: get/list read; create/update/delete separate
- writer = editor+
- **assert no rule claims name uniqueness**
- screenSpecs regression untouched
- delete allowed for writer (unlike screenSpecs delete false)

### 19.3 Contract — Role matrix (`test-screen-field-role-matrix-contract.mjs`)

- owner/admin/editor: create/update/delete pass
- viewer: read pass, write fail
- screenFields write-closed regression removed

### 19.4 Emulator E2E (`test-screen-field-firestore-rules-emulator.mjs`)

| # | 시나리오 |
|---|----------|
| 1 | editor create field on existing screenSpec → success |
| 2 | viewer create → permission denied |
| 3 | create with invalid type enum → rules reject |
| 4 | create duplicate normalized name (sequential) → second transaction fail (adapter) + rules pass shape |
| 5 | update name to collision → fail |
| 6 | editor hard delete own field → success |
| 7 | viewer delete → denied |
| 8 | create with non-existent screenSpecId → adapter PARENT_NOT_FOUND before write |
| 9 | list by project member reader → success |
| 10 | cross-project read → denied |

---

## 20. PR B 제외 및 후속 PR

| PR | 내용 |
|----|------|
| **PR C** | screenActions 계약·CRUD·Rules |
| **PR D** | Field Editor UI, visibility/enabled condition, validationMessage, detail drawer |
| **PR E** | SB→screenFields TSV seed (KR ID mapping) |
| **PR F** | channelScope, localeScope |
| **PR G** | PPT/IA ingest automation |

---

## 21. 구현 전 결정사항 최종 체크

| # | 결정 | 상태 |
|---|------|------|
| 1 | Hard delete PR B 포함 | ✅ **닫힘** |
| 2 | Random fieldId (auto-id) | ✅ **닫힘** |
| 3 | deterministic fieldId 제외 | ✅ **닫힘** |
| 4 | name 중복: Service + Adapter transaction | ✅ **닫힘** |
| 5 | Rules는 name unique **미보장** 명시 | ✅ **닫힘** |
| 6 | 저장 경로 flat subcollection | ✅ **닫힘** |
| 7 | channelScope/localeScope PR B 제외 | ✅ **닫힘** |
| 8 | condition fields PR B 제외 | ✅ **닫힘** |
| 9 | audit screenSpecs 동형 | ✅ **닫힘** |
| 10 | name 정규화: trim + case-insensitive compare | ✅ **닫힘** |
| 11 | maxLength top-level vs validationRules regex-only 분리 | ✅ **닫힘** |
| 12 | options value unique + label/value required | ✅ **닫힘** |
| 13 | order ≥ 0, ties allowed, sort policy | ✅ **닫힘** |
| 14 | defaultValue type/options consistency | ✅ **닫힘** |
| 15 | file/image defaultValue null only | ✅ **닫힘** |
| 16 | screenActions / Editor UI 제외 | ✅ **닫힘** |
| 17 | parent screenSpec create-only validation | ✅ **닫힘** |
| 18 | version field / soft delete 미도입 | ✅ **닫힘** |

**모든 구현 전 결정사항 닫힘 — PR B 구현 완료.**

---

*End of PR B Spec v1 (official)*
