# STAM 기능정의서 1차 DB 연결 — 소스·화면 조사 인벤토리

## 1. 목적

- `main` @ `8a3c6ba` (Requirements CRUD 라인 PR #364–#367 merge 완료) 기준으로 **기능정의서 1차 Firestore 연결**을 구현하기 전, 실제 소스 구조·화면 상태·요구사항 연결 필드를 조사한다.
- 본 문서는 **조사 보고서만** 작성한다. 제품 코드 / `firestore.rules` / pages·css·js / workflows·package·nav-data **수정 없음**.

| 항목 | 값 |
|------|-----|
| repo | `eseo7/stam` |
| base | `main` @ `8a3c6baf3fea278c29b73f14add1fc053cb4448f` |
| 조사 일시 (UTC) | 2026-07-09 |
| 선행 완료 | Requirements read/create/update (PR #358–#367, #364 evidence) |
| Gate 순서 | 요구사항 → **기능정의서** → WBS → 화면설계서 (`docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` §8-3) |

---

## 2. 화면 파일 경로

### 2-1. 제품 화면 (1차 DB 연결 대상)

| 구분 | 경로 | nav ID | 메뉴 상태 (`stam.shell.js`) |
|------|------|--------|----------------------------|
| **기능정의서 v1 (제품)** | `stam/pages/boards/functional-specification.html` | `B5` | **Preview** (`PREVIEW_MENU_IDS`) |
| 참고: 요구사항 (Live 선행) | `stam/pages/boards/requirements.html` | `B1` | **Live** (`LIVE_MENU_IDS`) |

- nav SSOT: `stam/js/stam.nav-data.js` — `B5` href `pages/boards/functional-specification.html`
- 1차 DB 연결 완료 후 `B5`를 Live로 승격하는 것은 **별도 nav/shell PR** (본 조사 범위 외).

### 2-2. Board Factory v2 Preview (참고 전용)

| 구분 | 경로 | 데이터 |
|------|------|--------|
| 기능정의서 v2 Preview | `stam/pages/boards-v2/functional-specification.html` | `STAM.boardConfigs.functionalSpecificationV2` + in-memory `SEED` |
| Preview 인덱스 | `stam/pages/boards-v2/index.html` | — |

- v2는 **static/in-memory** 미리보기. 새로고침 시 초기화. 1차 Firestore 연결은 **v1 제품 화면**을 Requirements 패턴으로 wiring하는 것이 Gate 기준 (`docs/ops/STAM-Phase1-Implementation-Gate.md` §6 단계 2).

### 2-3. 프로토타입 Cycle DB (Local Core DB v2)

| 구분 | 경로 |
|------|------|
| Import / 일괄 생성 | `stam/pages/prototype/cycle-db/import.html` |
| Matrix / Index | `stam/pages/prototype/cycle-db/matrix.html`, `index.html` |

- 엑셀 import 시 `functionalDefinitions` store에 초안 1건/요구사항 생성 (`cycle-db.generator.js`).
- 제품 기능정의서 v1은 동일 Local Core DB v2를 **이미 사용 중** (아래 §5).

---

## 3. 관련 JS / CSS 파일

### 3-1. 기능정의서 v1 — 로드 순서 (`functional-specification.html`)

| 역할 | 파일 | 비고 |
|------|------|------|
| Shell / Nav / Topbar / Project context | `stam.theme.js`, `stam.nav-data.js`, `stam.shell.js`, `stam.nav-render.js`, `stam.topbar-render.js`, `stam.project-context-guard.js`, `stam.project-context-render.js` | Requirements와 동일 계약 |
| Board 공통 | `stam.board-filter.js`, `stam.board-list.js`, `stam.custom-select.js` | 필터·체크박스·행 활성 |
| **UI shell (drawer/search/tab)** | `stam.functional-specification.js` | drawer open/close, 검색, 필터 UI; **DB 미사용** |
| **Local DB 목록** | `stam.functional-definition-cycle.js` | `STAM.fnBoard.render()` — IndexedDB `functionalDefinitions` |
| **Local DB CRUD** | `stam.functional-definition-crud.js` | create/update/**softDelete** — IndexedDB only |
| Core DB schema | `stam.core-db-schema.js`, `stam.local-core-db.js` | store 정의·CRUD API |
| Prototype repo (fallback) | `prototype/cycle-db.repo.js`, `cycle-db.repo.local.js` | v2 우선, v1 fallback 주석 |

**페이지 전용 CSS:** `stam/css/stam.functional-specification.css`  
**공통 CSS:** `stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.form-controls.css`, `stam.drawer.css`, `stam.table-selection.css`, `stam.buttons.css`, `stam.board-toolbar.css`, `stam.board-filter.css`, `stam.board-layout.css`, `stam.custom-select.css`, `stam.project-overview.css`

### 3-2. Board Factory v2 (참고)

| 파일 | 역할 |
|------|------|
| `stam/js/stam.board-configs.js` | `functionalSpecificationV2` config (필드·vocab·drawer·relation) |
| `stam/js/stam.board-factory.js` | 공통 게시판 엔진 |
| `stam/css/stam.board-factory.css` | v2 전용 레이아웃 |

### 3-3. Requirements Firestore 연결 패턴 (복제 참조)

| 레이어 | 파일 | 역할 |
|--------|------|------|
| Page orchestration | `stam.requirements.js` | selection, delete guard hook |
| Domain service | `stam.requirements-service.js` | role gate, payload normalize, CRUD contract |
| Firestore adapter | `stam.requirements-firestore-adapter.js` | collection path, counter `REQ_###` |
| List binding | `stam.requirements-firestore-list.js` | auth, list render, `getState()` |
| CRUD UI | `stam.requirements-firestore-crud.js` | register/edit, `writeGuard`, delete **미개방** |

기능정의서 1차 연결 시 **동일 4계층 분리** (service / adapter / list / crud) 권장.

### 3-4. 현재 기능정의서 Firestore 전용 JS

**없음.** `stam.functional-specification-firestore-*.js` / `stam.functional-spec-service.js` 등 미존재. contract test script도 없음 (`scripts/test-functional-*` 0건).

---

## 4. 현재 목록 / 등록 / 수정 / 상세 구조

### 4-1. DOM·Drawer 구조 (v1 HTML)

| 영역 | DOM ID / selector | 동작 |
|------|-------------------|------|
| 목록 테이블 | `#fn-tbody`, `[data-stam-board-list]` | 정적 5행 샘플 **또는** `fnBoard.render()` 동적 행 (`data-fn-id`) |
| 등록 | `#fn-dw-register` | `#fn-reg-btn` → drawer open |
| 상세 | `#fn-dw-detail` | 행 클릭 → `onRowActivate` + `openDetail(id)` |
| 수정 | `#fn-dw-edit` | 상세 `[data-fn-open="edit"]` |
| 삭제 | `#fn-del-btn`, `#det-del-btn` | Local CRUD에서 **soft delete 동작** (Firestore 1차에서는 미개방 예정) |
| Scrim | `#fn-scrim` | drawer overlay |

**폼 섹션 (등록/수정 공통 3단):**

1. **기본 정보** — 기능 ID(readonly), 기능유형*, 기능명*, 우선순위*, 상태, 담당자  
2. **연결 정보** — 연결 요구사항, 연결 화면  
3. **기능 내용** — 기능 설명, 입력 조건, 처리 규칙, 예외/오류 처리, 관련 API/연동, 비고  

**상세 탭:** 기본 정보 · 기능 내용 · 변경 이력

### 4-2. 런타임 데이터 소스 (이중 상태)

| 조건 | 목록 데이터 | CRUD |
|------|-------------|------|
| IndexedDB `functionalDefinitions` **有** | `stam.functional-definition-cycle.js`가 `#fn-tbody` 재렌더 | `stam.functional-definition-crud.js`가 create/update/softDelete |
| IndexedDB **無** (초기) | HTML **정적 5행** (FN-001~005) 유지 | CRUD는 DB 연결 후 동작; cycle.js는 empty state 표시 |

- Summary strip / meta / pagination 숫자는 **대부분 HTML 하드코딩** (동적 집계 미연결).
- Toolbar 필터 `onApply`는 **미구현** (`stam.functional-specification.js` — "실제 필터링 미구현 — UI Mock").
- 클라이언트 검색(`#fn-search-input`)만 DOM text 기준 동작.

### 4-3. Board Factory v2 필드 계약 (참고 SSOT)

`stam.board-configs.js` `functionalSpecificationV2` + `docs/reports/commonization/Board-Field-Schema-v1.md` §7:

| key | label | drawer | table |
|-----|-------|--------|-------|
| `id` | 기능 ID | readonly | idName |
| `name` | 기능명 | ✓ | idName |
| `type` | 기능유형 | ✓ | chip |
| `priority` | 우선순위 | ✓ | chip |
| `status` | 상태 | ✓ | chip |
| `ownerId` | 담당자 | ✓ (ref users) | user |
| `reqIds` | 연결 요구사항 | ✓ (array, ref) | relationChip |
| `screenIds` | 연결 화면 | ✓ (array, ref) | relationChip |
| `desc` / `input` / `rule` / `exception` / `api` / `note` | 기능 내용 | ✓ | — |
| `updatedAt` | 최종 수정일 | — | date |

v1 Local CRUD 필드명은 v2와 **부분 불일치** (아래 §6).

---

## 5. 요구사항 연결 UI 존재 여부

### 5-1. UI 존재 — **있음 (표시·입력만)**

| 위치 | UI | 현재 동작 |
|------|-----|-----------|
| 목록 컬럼 | `연결 요구사항` | chip `REQ-001` (정적) 또는 `requirementId` chip / "연결 필요" |
| Summary | `연결 요구사항` 셀 | HTML 하드코딩 숫자 |
| 등록/수정 drawer | `연결 요구사항` text input | placeholder `요구사항 ID 입력 (예: REQ-001)` |
| 상세 — 기본 정보 | `연결 요구사항` info cell | `openDetail` 시 `rec.requirementId` 표시 |
| 상세 — 연결 정보 탭 | `fn-linked-card` (요구사항 카드) | **정적 HTML** (FN-001 샘플); CRUD `openDetail`이 동적 갱신하지 않음 |
| v2 config | `reqIds` multi-select | in-memory `REQUIREMENTS` ref map (`REQ-001`~`005`) |

### 5-2. 실제 연결 검증 — **없음**

- Firestore `requirements` collection 조회로 옵션 채우기 **미구현**.
- `requirementId` / `reqIds` → Firestore requirement **doc id** vs **display code (`REQ_###`)** 변환 규칙 **미정의**.
- `artifactLinks` subcollection 기반 다대다 연결 **미사용** (Gate 단계 5 후속).
- 요구사항 등록 시 기능정의 초안 자동 생성은 **프로토타입 import/generator**에만 존재; 제품 Requirements Firestore 경로에는 **미연결** (`stam/ops/STAM-Requirement-Creation-Related-Artifacts-Flow-PR277.md`).

### 5-3. 요구사항 쪽 역참조

- `requirements` Firestore 문서에 `linkedFunctionalSpecIds` 등 **역방향 필드 없음** (`requirementWriteKeys()` 기준).
- 1차 연결은 **기능정의 → 요구사항 단방향 FK** (`requirementId` 또는 `requirementCode`)로 시작하는 것이 Requirements write keys 변경 최소화에 유리.

---

## 6. 현재 local / mock 데이터 구조

### 6-1. 명칭 불일치 (중요)

| 계층 | store / collection 명 |
|------|------------------------|
| Local Core DB v2 (IndexedDB) | `functionalDefinitions` |
| Prototype artifactType | `functionalDefinition` |
| Firestore Gate / Technical Plan | `functionalSpecifications` |
| Board Factory config id | `functionalSpecificationV2` |

1차 Firestore 구현 시 **collection 명은 Gate SSOT `functionalSpecifications`** 채택. Local v2와의 매핑 레이어는 adapter/service에서 명시.

### 6-2. Local Core DB v2 record (`functional-definition-crud.js` create)

```javascript
{
  id,                      // genFuncId() → 'FUN-MANUAL-YYYYMMDD-HHMMSS'
  projectId,                 // 'proto-proj-001' (fnBoard.PID — 하드코딩)
  boardType: 'functionalDefinition',
  sourceType: 'manual' | 'Requirement Import' | ...,
  requirementId,             // 연결 요구사항 (단일 string, 자유 텍스트)
  title,
  description,
  functionType,            // 기능유형 (한글: 조회/등록/…)
  priority,                // 한글: 높음/중간/낮음
  owner,                   // 담당자 display name (string)
  linkedScreen,            // 연결 화면 (단일 string)
  inputSpec,
  businessRule,
  exceptionRule,
  apiRef,
  note,
  status,                  // draft | reviewing | confirmed | rejected | deleted
  reviewStatus             // Review Needed | In Review | Approved | Rejected
  // + schema 공통: createdAt, updatedAt, importBatchId, ...
}
```

### 6-3. Board Factory v2 in-memory SEED

- 7건 (`FN-001`~`FN-007`), 필드: `id`, `name`, `type`(en code), `priority`, `status`, `ownerId`, `reqIds[]`, `screenIds[]`, content fields, `updatedAt`.
- `REQUIREMENTS` ref: `REQ-001`~`005` (label only, Firestore 무관).

### 6-4. HTML 정적 샘플 (IndexedDB 없을 때)

- 5행 `FN-001`~`FN-005`, `REQ-00x` chip, 담당자 이름 하드코딩.

### 6-5. Import generator 초안 (`cycle-db.generator.js`)

- 요구사항 1건당 `functionalDefinition` artifact 1건: `artifactId = reqId + '-FUN'`, `title = '[기능정의 초안] …'`.
- `artifactLinks` 로 `requirementToFunction` 링크 생성 (Local `artifactLinks` store).

---

## 7. Firestore collection 후보

### 7-1. 1차 대상 (Gate SSOT)

```txt
projects/{projectId}/functionalSpecifications/{functionalSpecId}
```

| 항목 | 내용 |
|------|------|
| rules 현황 | **`firestore.rules`에 match 블록 없음** (read/write 모두 미정의). `wbsItems`/`screenSpecs`는 read-only만 존재. |
| Technical Plan 최소 필드 | `functionalSpecId`, `projectId`, `requirementId?`, `title`, `description`, `status`, `ownerId?`, `deleted`, audit (`docs/ops/STAM-Phase1-Implementation-Gate.md` §4-2) |
| Requirements 대비 확장 필요 (UI 정합) | `functionType`, `priority`, `linkedScreen` 또는 `screenIds[]`, `inputSpec`, `businessRule`, `exceptionRule`, `apiRef`, `note`, `reviewStatus`, `code` (표시용 `FN_###` 후보), `version`/`isDeleted` (Requirements 패턴 정합) |

### 7-2. 연관 collection (1차 범위 외 / 읽기 참조만)

| Collection | 1차 역할 |
|------------|----------|
| `projects/{projectId}/requirements` | 연결 요구사항 picker · chip label resolve (**read only**) |
| `projects/{projectId}/counters/requirements` | Requirements 전용 (기능정의 code counter는 **별도 `counters/functionalSpecifications` 후보**) |
| `projects/{projectId}/artifactLinks` | 다대다 연결 — Gate **단계 5**, 1차 미개방 |
| `projects/{projectId}/screenSpecs` 등 | 연결 화면 — 1차는 **문자열/단일 FK** 수준만 |

### 7-3. Code / ID 전략 (결정 필요)

| 옵션 | 설명 |
|------|------|
| A. Requirements 동형 | Firestore auto id + `code` 필드 `FN_###` (counter transaction) |
| B. Local 동형 | `FUN-MANUAL-…` 또는 import id 유지 (UX 불리) |
| C. Display only | 목록에 `code` 표시, doc id는 내부 |

**권장:** Requirements PR #367 패턴 — **`code` = `FN_###`**, 목록/상세 표시는 code, storage key는 doc id.

---

## 8. 1차 create / update / read 범위

### 8-1. In scope (Gate 단계 2)

| 작업 | 범위 |
|------|------|
| **read** | project member active — 목록 list + 상세 get (`canReadProject` 동일) |
| **create** | owner/admin/editor — 필수: `title`, `functionType`(또는 type), `priority`; optional: `requirementId`, content fields, `linkedScreen` |
| **update** | owner/admin/editor — 동일 필드 patch; `version` increment (Requirements 패턴) |
| **list UI** | `#fn-tbody` Firestore list binding, empty state, `updatedAt desc` sort |
| **CRUD UI** | register/edit drawer submit → service → adapter |
| **요구사항 연결** | **단일 `requirementId`** (Firestore requirement doc id) + 목록 chip에 requirement `code`/`title` resolve (read join 또는 denormalize `requirementCode`) |
| **write access UI** | Requirements `refreshCrudAccessUI` 패턴 — viewer register/edit disabled |

### 8-2. Out of scope (1차 고정)

| 항목 | 사유 |
|------|------|
| **delete / softDelete** | Requirements와 동일 — rules `allow delete: if false`; UI visible+disabled + alert guard |
| `artifactLinks` write | Gate 단계 5 |
| `reqIds[]` / `screenIds[]` 다중 연결 | 1차는 단일 FK; v2 array는 후속 |
| Summary strip 동적 집계 | UI mock 유지 또는 partial (후속) |
| 필터 `onApply` Firestore query | 후속 (클라이언트 filter 유지 가능) |
| 변경 이력 탭 (`artifactChanges`) | Local 전용; Firestore `changeLogs` deferred |
| Board Factory v2 Firestore wiring | v1 제품 경로 우선 |
| Local IndexedDB → Firestore migration | 별도 결정 |
| 보내기 / 임시저장 버튼 | 동작 없음 유지 |
| B5 Preview → Live 승격 | DB+QA 완료 후 shell PR |

---

## 9. delete / softDelete 미개방 정책 적용 방식

### 9-1. Requirements 현행 (복제 기준)

| 계층 | 정책 |
|------|------|
| `firestore.rules` | `match /requirements/{id}` — `allow delete: if false`; update 시 `isDeleted`/`deletedAt`/`deletedBy` **immutable** |
| Service | delete action contract 존재하나 UI/runtime 미노출 |
| CRUD UI | `#rq-del-btn`, `#det-del-btn` — **visible + disabled**, click 시 alert guard (`stam.requirements-firestore-crud.js`) |
| List | `includeDeleted: false` 기본 |

### 9-2. 기능정의서 Local 현황 (정책 불일치 — 1차에서 정렬 필요)

| 계층 | 현황 |
|------|------|
| `stam.functional-definition-crud.js` | **softDelete 구현됨** (`db.softDeleteRecord`, status=deleted) |
| HTML | `#fn-del-btn`, `#det-del-btn` **enabled** (선택 시 삭제 가능) |
| IndexedDB | 물리 삭제 아님, 목록에서 제외 |

### 9-3. 1차 Firestore 적용안

1. **rules:** `functionalSpecifications` — `allow delete: if false`; create/update에 `isDeleted: false` 고정 (Requirements 동형).
2. **service:** delete API 미노출 또는 항상 deny.
3. **UI:** Requirements PR #367 패턴 — delete 버튼 visible+disabled, `data-fn-delete-guard`, viewer/writer 무관 **미개방**.
4. **Local CRUD:** Firestore wiring PR에서 **softDelete 호출 제거 또는 guard** (제품 정책 통일). Local IndexedDB 경로는 후속 정리 PR로 분리 가능.

---

## 10. viewer / editor / owner 권한 모델 적용 방식

### 10-1. Firestore rules (Requirements 기준 — 기능정의서에 복제 예정)

| Role | read | create | update | delete |
|------|------|--------|--------|--------|
| owner | ✓ | ✓ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ | ✗ |
| editor | ✓ | ✓ | ✓ | ✗ |
| viewer | ✓ | ✗ | ✗ | ✗ |
| guest / 비멤버 | ✗ | ✗ | ✗ | ✗ |

- Helper: `isRequirementWriter` → **`isFunctionalSpecWriter`** (동일 role 집합) 신규 추가 예정.
- Read: `canReadProject(projectId)` (active member).

### 10-2. Client service layer

- `stam.requirements-service.js` — `WRITE_ROLES`, `READ_ROLES`, `createMemberRoleAuthorize`, `canWriteRequirements` / `canReadRequirements`.
- 기능정의서: **`stam.functional-spec-service.js`** (신규)에서 동일 패턴, action namespace만 분리 (`functionalSpec.read`, `.create`, `.update`).

### 10-3. UI layer

- `stam.requirements-firestore-crud.js` — `canWrite()`, `applyWriteAccessUI()`, `writeGuard()` on submit.
- 기능정의서: `#fn-reg-btn`, register/edit primary, delete buttons에 동일 hook.
- Auth flow: `project-context-guard`, `?projectId=`, Firebase auth redirect — list module에서 Requirements list와 **동일 bootstrap** 재사용.

### 10-4. Contract / QA

- Requirements: `scripts/test-requirements-role-matrix-contract.mjs` (6 scripts).
- 기능정의서: **신규** `test-functional-spec-role-matrix-contract.mjs` 등 PR #358 analog 권장.

---

## 11. 요구사항 ↔ 기능정의서 필드·흐름 정의 (1차)

### 11-1. FK 방향

```txt
functionalSpecifications.requirementId  →  requirements/{requirementId}  (optional)
```

| 기능정의서 필드 | Requirements 필드 | 비고 |
|-----------------|-------------------|------|
| `requirementId` | doc `id` | FK (권장) |
| (denormalize) `requirementCode` | `code` (`REQ_###`) | 목록 chip 표시용, optional |
| (denormalize) `requirementTitle` | `title` | picker label cache, optional |
| `title` | `title` | 독립 — 기능명 ≠ 요구사항명 |
| `description` | `description` | 의미 유사, 별도 문서 |
| `priority` | `priority` | enum **다름** — mapping table 필요 (한글 높음/중간/낮음 ↔ low/normal/high/critical) |
| `status` + `reviewStatus` | `status` + `reviewStatus` | vocab 다름 — service normalize |
| `owner` (name) | `ownerName` / `ownerUid` | 기능정의서 1차: `ownerUid`+`ownerName` Requirements 동형 권장 |
| `linkedScreen` | — | Requirements에 없음; 1차 string 유지 |
| `functionType` | `category` / tags | Requirements `category` enum과 별도 |

### 11-2. 연결 UX 흐름 (1차 목표)

1. Writer가 기능 등록 drawer에서 **연결 요구사항** 선택 (Firestore requirements list에서 active project 항목).
2. Create payload에 `requirementId` 저장.
3. 목록/상세 chip에 `REQ_###` + title 표시 (requirements get 또는 denormalized fields).
4. 요구사항 미선택 허용 (optional FK) — v2 empty chip "연결 필요" 유지.
5. **역방향** (요구사항 상세에서 연결 기능 목록) — 1차 **미구현**.

### 11-3. Import / 자동 생성 흐름 (후속)

- `cycle-db.generator.js` — 요구사항 import 시 기능정의 초안 + link 생성.
- Firestore 제품 경로 연동은 `STAM-Requirement-Creation-Related-Artifacts-Flow-PR277.md` 후속 PR.

---

## 12. PR 분리 계획 (권장)

Requirements 라인 (#358 rules → #359 matrix → #360 UI → #361–#367 hardening → #364 QA)을 **축소 복제**:

| PR | 제목 (안) | 산출 | 금지 경로 준수 |
|----|-----------|------|----------------|
| **#FS-1** | `functionalSpecifications` write rules + role helpers | `firestore.rules`, `test-functional-spec-rules-contract.mjs` | rules only PR |
| **#FS-2** | functional-spec domain service + Firestore adapter | `stam.functional-spec-service.js`, `stam.functional-spec-firestore-adapter.js`, service contract test | 공통 JS 신규 — 가이드·승인 전 **service/adapter only**, pages 무변경 |
| **#FS-3** | role matrix smoke QA | `docs/reports/…`, `test-functional-spec-role-matrix-contract.mjs` | docs + scripts |
| **#FS-4** | list read binding + `functional-specification.html` script wiring | `stam.functional-spec-firestore-list.js`, pages script tags, list empty/static 제거 | pages 수정 최소 |
| **#FS-5** | CRUD UI wiring (create/update, write guard, delete closed) | `stam.functional-spec-firestore-crud.js`, `stam.functional-specification.js` hook, page drawer ids | delete 미개방 |
| **#FS-6** | code sequence `FN_###` + requirement picker | adapter counter, requirement resolve | requirements read only |
| **#FS-7** | live/browser QA evidence | `docs/reports/STAM_PRxxx_FunctionalSpec_…_QA.md` | docs only |
| **(후속)** | B5 Live 승격, summary 집계, filter query, artifactLinks, v2 adoption | shell/nav, board-factory | 별도 |

**의존 순서:** #FS-1 → #FS-2 → #FS-3 ∥ #FS-4 → #FS-5 → #FS-6 → #FS-7

**Local IndexedDB 정리:** Firestore list가 stable한 뒤 `functional-definition-cycle.js` / `crud.js` Local 경로 **제거 또는 feature flag** — 별도 PR (혼선 방지).

---

## 13. 갭 요약

| # | 갭 | 영향 |
|---|-----|------|
| G1 | `functionalSpecifications` rules 블록 없음 | read/write 모두 불가 |
| G2 | Firestore service/adapter/list/crud JS 없음 | 전체 신규 |
| G3 | v1 HTML 정적 샘플 + Local DB 이중화 | wiring 시 single source 전환 필요 |
| G4 | Local softDelete vs Gate delete closed 불일치 | UI/policy 정렬 필요 |
| G5 | `requirementId` vs `REQ_###` vs doc id 혼용 | picker·chip 규칙 선행 정의 |
| G6 | `projectId` 하드코딩 `proto-proj-001` | `?projectId=` + session guard로 교체 |
| G7 | Summary/filter mock | 1차 functional parity 아님 — 문서화·후속 |
| G8 | v1 단일 `requirementId` vs v2 `reqIds[]` | 1차 단일 FK로 scope 고정 |
| G9 | B5 Preview 메뉴 | Live 승격은 QA 후 |
| G10 | contract tests 0건 | PR #FS-1~3에서 추가 |

---

## 14. 조사 결론

- **1차 DB 연결 대상 화면**은 `stam/pages/boards/functional-specification.html` (B5, Preview).
- **현재 데이터**는 Local Core DB v2 `functionalDefinitions` + HTML mock; Firestore **미연결**.
- **요구사항 연결 UI**는 목록·drawer·상세에 **이미 존재**하나, Firestore requirements와의 **실제 FK·picker·resolve 없음**.
- **Firestore collection**은 Gate SSOT `projects/{projectId}/functionalSpecifications/{functionalSpecId}`; rules **미존재**.
- **1차 범위**는 Requirements와 동일하게 **read + create + update**, **delete/softDelete 미개방**, **viewer read-only**.
- **구현**은 rules → service/adapter → list → CRUD → code/picker → QA 순 **PR 분리** 권장.

---

## 15. Governance (본 조사 PR)

| 항목 | 결과 |
|------|------|
| 수정 파일 | `docs/reports/STAM_FunctionalSpec_DB_Connection_Inventory.md` **only** |
| 제품 코드 / rules / pages / css / js / nav / workflows / package | **변경 없음** |
| 신규 CSS/JS | **0건** |
| inline style/script | **없음** |

---

## 16. 참고 문서·파일

| 문서 / 파일 | 용도 |
|-------------|------|
| `docs/ops/STAM-Phase1-Implementation-Gate.md` §4-2, §6 단계 2 | Gate 필드·순서 |
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` §8-3, §11 단계 4 | collection 경로·rules 단계 |
| `docs/reports/STAM_PR363_Requirements_CRUD_Live_QA.md` | Requirements 완료 baseline |
| `docs/reports/commonization/Board-Field-Schema-v1.md` §7 | v2 필드 mapping |
| `stam/ops/STAM-Requirement-Creation-Related-Artifacts-Flow-PR277.md` | 요구사항→기능정의 자동 생성 후속 |
| `firestore.rules` | requirements writer 패턴 |
| `stam/js/stam.requirements-*.js` | 4계층 복제 참조 |
