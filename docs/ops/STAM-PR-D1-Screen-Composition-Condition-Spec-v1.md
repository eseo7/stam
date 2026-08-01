# STAM PR D1 — Screen Composition & Condition Spec v1

| 항목 | 값 |
|------|-----|
| 상태 | **Draft v1 — PR D1 implemented (Draft PR)** |
| base | `origin/main` @ `e808b5c682027a2fd70bfde1d259442233b9c2c3` |
| branch | `cursor/pr-d1-screen-composition-contract` |
| schemaVersion | `1` (기존 screenFields / screenActions / screenSpecs 호환 유지) |
| 작성일 | 2026-08-01 |

---

## 1. 목적

실제 화면설계서를 **화면 구성(screenSections)** 과 **구조화 조건(ConditionGroup)** 으로 표현할 수 있는 데이터 계약을 추가한다.

논리 계층:

```
screenSpec
 ├─ screenSections
 ├─ screenFields
 └─ screenActions
```

물리 Firestore 경로는 PR B/C와 동일하게 **project 루트 flat subcollection** 패턴을 유지한다 (`screenSpecId` FK).

---

## 2. Out of Scope

| 제외 | 후속 |
|------|------|
| Section/Field/Action Editor UI | PR D2 |
| 조건 편집 UI, 순서 변경 UI | PR D2 |
| 공통 렌더러, 조건 evaluator | PR D3 |
| Button/Confirm/Alert/Toast/Empty State 런타임 | PR D3 |
| PPT/IA/스토리보드 Import | PR G |
| seed 데이터 대량 생성 | — |
| 운영 Firebase Rules 배포 | — |
| schemaVersion 1 문서 일괄 migration | — |
| Firestore index 추가 | — |

---

## 3. Firestore 경로

| 컬렉션 | Path | Parent FK |
|--------|------|-----------|
| screenSpecs | `projects/{projectId}/screenSpecs/{screenSpecId}` | project |
| **screenSections** | `projects/{projectId}/screenSections/{sectionId}` | `screenSpecId` |
| screenFields | `projects/{projectId}/screenFields/{fieldId}` | `screenSpecId` |
| screenActions | `projects/{projectId}/screenActions/{actionId}` | `screenSpecId` |

- Section/Field/Action 문서에 Section 메타(제목·종류·접기)를 **중복 저장하지 않음**
- Field/Action에는 소속 `sectionId`만 저장
- Section 삭제 시 cascade delete **하지 않음** — 참조가 있으면 Service에서 거부

---

## 4. screenSections 완성 문서 schema (schemaVersion 1)

```json
{
  "id": "string",
  "projectId": "string",
  "screenSpecId": "string",
  "name": "string",
  "label": "string",
  "sectionType": "search|form|detail|table|card|tabs|tab|repeater|history|custom",
  "parentSectionId": "string|null",
  "order": 0,
  "layout": {
    "columns": 1,
    "gap": "md",
    "collapsible": false,
    "defaultCollapsed": false
  },
  "visibilityCondition": "ConditionGroup|null",
  "description": "string|null",
  "schemaVersion": 1,
  "createdAt": "timestamp",
  "createdBy": "uid",
  "updatedAt": "timestamp",
  "updatedBy": "uid"
}
```

### 4.1 sectionType 의미

| 값 | 의미 |
|----|------|
| search | 목록 조회 조건 영역 |
| form | 등록·수정 입력 |
| detail | 읽기 전용 상세 |
| table | 결과 목록/컬럼 |
| card | 시각적 정보 묶음 |
| tabs | tab Section 상위 |
| tab | tabs 하위 개별 탭 |
| repeater | 반복 행/항목 |
| history | 등록·수정·검토 이력 |
| custom | 계약 외 특수 구역 |

### 4.2 구조 검증

- `sectionType=tab` → `parentSectionId` 필수, parent는 `sectionType=tabs`
- `layout.defaultCollapsed=true` + `collapsible=false` → `defaultCollapsed`를 `false`로 정규화
- `parentSectionId`: self-reference·1단계 순환·ancestor 순환 거부
- 동일 `screenSpecId` 내 `name` 중복 거부 (정규화 lowercase)

---

## 5. screenFields 확장 schema

기존 PR B 필드 **유지** + 다음 optional 필드 추가 (create 시 기본값 기록):

| 필드 | 타입 | 기본값 |
|------|------|--------|
| `sectionId` | string\|null | null |
| `fieldRole` | enum | input |
| `layout` | `{ row, column, span }` | `{ null, null, 12 }` |
| `visibilityCondition` | ConditionGroup\|null | null |
| `enabledCondition` | ConditionGroup\|null | null |
| `requiredCondition` | ConditionGroup\|null | null |

`fieldRole`: `input` \| `display` \| `filter` \| `tableColumn` \| `repeaterItem`

**SSOT:** top-level `order`는 기존 PR B 필드 유지. `layout.order`는 추가하지 않음.

### 5.1 fieldRole ↔ sectionType 호환 (Service)

| 조합 | 결과 |
|------|------|
| tableColumn + table section | 허용 |
| tableColumn + form section | 거부 |
| repeaterItem + repeater section | 허용 |
| filter + 다른 screenSpec section | 거부 |

---

## 6. screenActions 확장 schema

기존 PR C 필드 **유지** + 다음 optional 필드 추가:

| 필드 | 타입 | 기본값 |
|------|------|--------|
| `sectionId` | string\|null | null |
| `layout` | `{ row, column, span }` | `{ null, null, 12 }` |
| `visibilityCondition` | ConditionGroup\|null | null |
| `enabledCondition` | ConditionGroup\|null | null |

- `placement` (의미적 위치)와 `layout` (Section 내부 grid) **의미 분리 유지**
- PR C `buildUpdatePatch`의 actionType→target, confirmRequired→문구 정규화 **유지**

---

## 7. ConditionGroup schema

```json
{
  "logic": "all|any",
  "conditions": [
    {
      "source": "field|role|screenMode|recordState",
      "sourceId": "string|null",
      "operator": "eq|neq|in|notIn|exists|notExists|contains|gt|gte|lt|lte",
      "value": "string|number|boolean|null|array"
    }
  ]
}
```

- JavaScript 문자열 / eval 표현식 **금지**
- flat group only (중첩 group 미지원)
- conditions 최대 **20**개
- **Rules:** logic + conditions list bounds (1–20) + **각 condition item source/operator 필수** (`isValidConditionItemBasic` unrolled) — operator/value/sourceId 의미 검증은 Service
- `source=field` → `sourceId`는 동일 screenSpec의 screenField ID
- `source=role` → value는 owner/admin/editor/viewer
- `source=screenMode` → list/create/detail/edit/popup
- operator/value 타입 호환 검증 (exists→null, in→array, gt→number 등)

공통 모듈: `stam/js/stam.screen-condition-contract.js`

---

## 8. 정규화 규칙

| 대상 | 규칙 |
|------|------|
| name/label | trim, 공백-only 거부 |
| parentSectionId / sectionId | 공백-only → null |
| description | trim, 공백-only → null |
| layout.defaultCollapsed | collapsible=false이면 false |
| condition strings | trim |
| field sourceId | field source면 필수, role/screenMode/recordState면 null |
| **fieldRole (write)** | 누락 시 input; 명시 invalid/blank 거부 (기본값으로 은폐 금지) |
| **fieldRole (read)** | legacy 누락 → input; stored invalid 값은 그대로 노출 |
| **layout (write)** | 누락 시 default; 명시 invalid span/unknown key/타입 오류 거부 |
| **layout (read)** | 누락 key만 default; stored invalid span 등은 그대로 노출 |
| **schemaVersion (read)** | 누락 → 1; stored non-1 값은 은폐하지 않음 |
| **Section/Field 참조 검증** | Service create/update 시 Adapter에서 sectionsById·fieldIds 로드 (caller context 신뢰 금지) |
| **Field delete** | 동일 screenSpec 내 condition field 참조 존재 시 `CONDITIONS_REFERENCE_FIELD` 거부 |

---

## 9. complete document validation 순서

### create / update 공통 (Service)

1. forbidden input 필드 검사
2. patch merge (update)
3. **정규화** (actionType/target, confirm, composition, trim)
4. **complete document validation** (타입·enum·조건 shape·참조)
5. Adapter patch allowlist 구성

update 시 정규화 **선행** — PR C `#407` 회귀 방지.

---

## 10. Service 책임

| Service | 파일 |
|---------|------|
| screenSections | `stam/js/stam.screen-section-service.js` |
| screenFields (확장) | `stam/js/stam.screen-field-service.js` |
| screenActions (확장) | `stam/js/stam.screen-action-service.js` |
| ConditionGroup | `stam/js/stam.screen-condition-contract.js` |

### screenSection delete 차단

| ERROR_CODE | 조건 |
|------------|------|
| CHILD_SECTIONS_EXIST | child section 존재 |
| FIELDS_REFERENCE_SECTION | field.sectionId 참조 |
| ACTIONS_REFERENCE_SECTION | action.sectionId 참조 |

---

## 11. Adapter 책임

| Adapter | 파일 |
|---------|------|
| screenSections | `stam/js/stam.screen-section-firestore-adapter.js` |
| screenFields | `stam/js/stam.screen-field-firestore-adapter.js` (pass-through) |
| screenActions | `stam/js/stam.screen-action-firestore-adapter.js` (pass-through) |

- Query preflight는 transaction **밖**
- Transaction.get()은 DocumentReference only
- undefined 미저장, null 보존
- delete guard counters: `countChildSections`, `countFieldsReferencingSection`, `countActionsReferencingSection`

---

## 12. Rules 책임

- **ScreenSection-1** helpers + `match /screenSections/{sectionId}`
- screenFields / screenActions writeKeys에 composition 필드 **optional 추가**
- requiredKeys는 **변경 없음** (기존 v1 문서 backward compat)
- 복잡한 참조 무결성·순환 검증은 Service 담당

---

## 13. role matrix

screenSections는 screenSpecs와 **동일 writer/reader** 원칙:

| role | read | create | update | delete |
|------|------|--------|--------|--------|
| owner/admin/editor | allow | allow | allow | allow* |
| viewer | allow | deny | deny | deny |
| guest/empty | deny | deny | deny | deny |

\* delete는 editor+ (screenFields/screenActions와 동형)

---

## 14. schemaVersion 1 호환 정책

- 기존 screenField/screenAction 문서에 composition 필드 **없어도** read/update 성공
- `normalizeScreenField` / `normalizeScreenAction` read 시 기본값 적용
- create 시 composition 기본값 **항상 기록**
- 강제 migration **하지 않음**

---

## 15. Section 삭제 참조 무결성

- cascade delete **금지**
- Service delete 전 child section / field / action 참조 count
- Rules는 shape·parent 경계만 검증

---

## 16. 대표 화면 5종 매핑 (fixture contract)

| 화면 | Sections | 검증 |
|------|----------|------|
| A 목록 | search + table | filter→search, tableColumn→table, Action section 연결 |
| B 등록 | form ×2 + repeater | enabledCondition field ref, repeaterItem |
| C 상세 | detail + history | role visibilityCondition |
| D 수정 | form + card/history | visibility + requiredCondition 동일 field ref |
| E 팝업/다국어 | tabs → tab×3 | tab parent tabs 필수, 순환 거부 |

표현: `scripts/test-screen-composition-fixture-contract.mjs` (seed 저장 없음)

---

## 17. 계약 테스트 목록과 수량

### 신규 (7 files, 148 cases)

| 파일 | 케이스 | 결과 |
|------|--------|------|
| `test-screen-section-service-contract.mjs` | 33 | PASS |
| `test-screen-section-adapter-contract.mjs` | 14 | PASS |
| `test-screen-section-rules-contract.mjs` | 11 | PASS |
| `test-screen-section-role-matrix-contract.mjs` | 10 | PASS |
| `test-screen-field-composition-extension-contract.mjs` | 32 | PASS |
| `test-screen-action-composition-extension-contract.mjs` | 22 | PASS |
| `test-screen-composition-fixture-contract.mjs` | 26 | PASS |

실행:

```bash
node scripts/test-screen-section-service-contract.mjs
node scripts/test-screen-section-adapter-contract.mjs
node scripts/test-screen-section-rules-contract.mjs
node scripts/test-screen-section-role-matrix-contract.mjs
node scripts/test-screen-field-composition-extension-contract.mjs
node scripts/test-screen-action-composition-extension-contract.mjs
node scripts/test-screen-composition-fixture-contract.mjs
```

### 회귀 (23 suites)

screenSpecs(6), screenFields(4), screenActions(4), requirements(3), functionalSpec(3), wbs(3) — **전부 PASS**

---

## 18. Emulator 실행 여부

| 항목 | 상태 |
|------|------|
| Emulator E2E 스크립트 | **미구현** (PR D1) |
| 로컬 실행 | **미실행** |
| CI 연결 | **CI 미연결** |

---

## 19. 운영 Rules 미배포

- `firestore.rules` 변경은 저장소에만 반영
- Staging Rules workflow는 CI에서 검증 대상
- **운영 Firebase Rules 배포 없음**

---

## 20. 후속 PR 경계

| PR | 범위 |
|----|------|
| **D2** | Section/Field/Action Editor UI, 조건 편집 UI, 순서 변경 UI |
| **D3** | 공통 렌더러, 조건 evaluator, Button/Confirm/Alert/Toast/Empty State, 화면 이동/Drawer 실행 |
| **G** | PPT/IA/스토리보드 분석 및 Import |

---

## 구현 파일

### 신규

- `stam/js/stam.screen-condition-contract.js`
- `stam/js/stam.screen-section-service.js`
- `stam/js/stam.screen-section-firestore-adapter.js`
- `docs/ops/STAM-PR-D1-Screen-Composition-Condition-Spec-v1.md`
- `scripts/test-screen-section-*.mjs` (4)
- `scripts/test-screen-field-composition-extension-contract.mjs`
- `scripts/test-screen-action-composition-extension-contract.mjs`
- `scripts/test-screen-composition-fixture-contract.mjs`

### 수정

- `firestore.rules` — ScreenSection-1 + composition optional keys
- `stam/js/stam.screen-field-service.js` — composition extension
- `stam/js/stam.screen-action-service.js` — composition extension
