# STAM WBS Live Firestore 1차 구현 — Inventory & Gate

## 문서 메타

| 항목 | 값 |
|------|-----|
| repo | `eseo7/stam` |
| base | `main` @ `72a658d` (FS-7 live QA evidence #379 merge 후) |
| 조사 일시 (UTC) | 2026-07-13 |
| 성격 | **docs-only** — Inventory · Schema · Gate · QA 초안 (제품 코드 / rules / nav-data **미변경**) |
| 대상 화면 | `stam/pages/boards/wbs.html` (nav `B3`, Live · **정적**) |
| Gate 순서 | 요구사항 → 기능정의서(FS-7 완료) → **WBS** → 화면설계서 (`docs/ops/STAM-Phase1-Implementation-Gate.md` §6 단계 3) |
| 선행 완료 | Requirements CRUD live · FunctionalSpec CRUD + picker + live QA (FS-1~FS-7) |
| 관련 설계 | `stam/docs/STAM-WBS-Board-List-Contract-v1.html` · `stam/docs/reports/STAM-WBS-Traceability-ID-Alignment-Plan.md` |

---

## 1. Current Inventory

### 1-1. WBS 제품 화면 · 전용 자산

| 구분 | 실제 경로 | 역할 | Firestore |
|------|-----------|------|-----------|
| **제품 화면** | `stam/pages/boards/wbs.html` (1856 lines) | 정적 17행 그룹 테이블 + Drawer + Gantt + Filter + Focus View | **미연결** |
| **전용 CSS** | `stam/css/stam.wbs.css` (3856 lines) | WBS 레이아웃·KPI·Gantt·Drawer·테이블·모달 | — |
| **UI shell** | `stam/js/stam.wbs.js` (1120 lines) | Gantt 접기, 그룹 toggle, Focus View, Drawer mode, checkbox, filter UI mock, FV inline, date/select, dialog | **미사용** |
| **Local 목록** | `stam/js/stam.wbs-cycle.js` (98 lines) | `#wbs-v2-tbody` IndexedDB `wbsItems` render | Local only |
| **Local CRUD** | `stam/js/stam.wbs-crud.js` (327 lines) | `#wbs-drawer` create/detail/edit + softDelete → Local Core DB v2 | Local only |

**`wbs.html` script 로드 (현재):**

```txt
stam.icons.js · stam.theme.js · stam.nav-data.js · stam.shell.js
stam.nav-render.js · stam.topbar-render.js
stam.project-context-guard.js · stam.project-context-render.js
stam.board-filter.js · stam.wbs.js
stam.core-db-schema.js · stam.local-core-db.js · stam.wbs-cycle.js · stam.wbs-crud.js
```

**FS/requirements 대비 누락 (1차 wiring PR에서 추가 예정, 본 PR에서 생성하지 않음):**

- Firebase SDK (`/__/firebase/8.10.1/*`, `/__/firebase/init.js`)
- `stam.ui-messages.js` · `stam.ui-feedback.js`
- `stam.*-firestore-*.js` · `stam.wbs-service.js` (미존재)
- Auth bootstrap / membership role resolver (FS CRUD 패턴)

### 1-2. WBS Firestore 전용 JS

**없음.** `stam.wbs-firestore-adapter.js` / `stam.wbs-service.js` / `stam.wbs-firestore-list.js` / `stam.wbs-firestore-crud.js` / contract test script (`scripts/test-wbs-*`) **0건**.

### 1-3. 공통 Auth / Firestore / Access / Board / Feedback

| 레이어 | 실제 경로 | WBS 1차 재사용 |
|--------|-----------|----------------|
| Auth entry | `stam/js/stam.auth.js` | hosting auth state (후속 wiring) |
| Auth bootstrap | `stam/js/stam.auth-bootstrap.js` | uid / custom token (FS-7 QA pattern) |
| Membership gate | `stam/js/stam.auth-membership-gate.js` | read-only routing |
| Project list | `stam/js/stam.auth-project-list.js` | project 선택 |
| Project context | `stam/js/stam.project-context-guard.js` · `stam.project-context-render.js` | `?projectId=` SSOT |
| Board filter shell | `stam/js/stam.board-filter.js` | `#wbs-filter-panel` (현재 `onApply` mock) |
| UI feedback | `stam/js/stam.ui-feedback.js` | list empty/loading/error row |
| UI messages | `stam/js/stam.ui-messages.js` | toast/alert copy (FS CRUD 사용) |
| Shell / Nav | `stam/js/stam.shell.js` · `stam.nav-render.js` · `stam.topbar-render.js` | B3 Live 정적 |

**주의:** WBS는 `stam.board-list.js` **미사용** (`STAM-WBS-Board-List-Contract-v1.html` — 22컬럼·다중 tbody·자체 checkbox).

### 1-4. 기능정의서(FS) Live 패턴 — 복제 참조 SSOT

| 레이어 | 실제 경로 | WBS 대응 (후속 PR에서 생성) |
|--------|-----------|------------------------------|
| Domain service | `stam/js/stam.functional-spec-service.js` | `stam.wbs-service.js` |
| Firestore adapter | `stam/js/stam.functional-spec-firestore-adapter.js` | `stam.wbs-firestore-adapter.js` |
| List binding | `stam/js/stam.functional-spec-firestore-list.js` | `stam.wbs-firestore-list.js` |
| CRUD UI | `stam/js/stam.functional-spec-firestore-crud.js` | `stam.wbs-firestore-crud.js` |
| Requirement picker | `stam/js/stam.requirement-picker.js` | **재사용** (`data-stam-requirement-picker`) |
| FunctionalSpec picker | **없음** (FS CRUD는 requirement picker만) | **신규 필요** — `stam.functional-spec-picker.js` (FS-6B picker 패턴 일반화) |
| Requirements read (picker deps) | `stam.requirements-service.js` · `stam.requirements-firestore-adapter.js` | picker data source |
| FS read (functionalSpec picker deps) | `stam.functional-spec-service.js` · `stam.functional-spec-firestore-adapter.js` | picker data source |

**Contract / QA scripts (FS, WBS 후속에서 mirror):**

```txt
scripts/test-functional-spec-service-contract.mjs
scripts/test-functional-spec-rules-contract.mjs
scripts/test-functional-spec-role-matrix-contract.mjs
scripts/test-functional-spec-list-contract.mjs
scripts/test-functional-spec-crud-ui-contract.mjs
scripts/test-functional-spec-counter-contract.mjs
scripts/test-requirement-picker-contract.mjs
scripts/qa-fs6b-requirement-picker-browser-smoke.mjs
scripts/qa-fs7-live-persistence-agent.mjs
.github/workflows/fs7-live-firestore-qa.yml
```

### 1-5. Local Core DB v2 (프로토타입 — Firestore SSOT와 분리)

| 파일 | 내용 |
|------|------|
| `stam/js/stam.core-db-schema.js` | store `wbsItems` keyPath `id`, indexes `byProject` · `byImportBatch` · `byRequirement` |
| `stam/js/stam.local-core-db.js` | IndexedDB CRUD API |
| `stam/js/stam.requirement-artifacts.js` | import 시 `wbsItems` seed (generator) |

**Local record 필드 ( `stam.wbs-crud.js` create 기준 ) — Firestore 매핑 시 rename 필요:**

| Local v2 | UI label | Firestore 1차 (제안) |
|----------|----------|----------------------|
| `id` / `wbsId` | WBS ID | doc id + `code` (`WBS-###`) |
| `taskName` / `title` | 작업명 | `title` |
| `taskType` | 단계 | `phase` |
| — | 업무영역 | `businessArea` |
| `functionGroup` | 기능그룹 | `functionGroup` |
| `menuPath` | 메뉴/화면 | `screenPath` |
| KO status via `status`+`reviewStatus` | 진행상태 | `status` (단일 enum) |
| `priority` | 우선순위 | `priority` |
| `assignee` / `owner` | 담당자 | `ownerName` (+ `ownerId` 후속) |
| `reviewer` | 검토자 | `reviewerName` (+ `reviewerId` 후속) |
| `startDate` / `endDate` | 시작일/종료일 | 동명 |
| `effortEstimate` | 예상 공수 | `plannedEffort` |
| — | 실 공수 | `actualEffort` |
| `progress` | 진행률 | `progress` |
| `description` | 작업 설명 | `description` |
| `requirementId` | 관련 요구사항 | `requirementId` + code/title snapshot |
| `functionId` | 관련 화면설계(기능정의) | `functionalSpecId` + code/title snapshot |
| `screenId` | (legacy) | 1차 미사용 — `screenPath` 텍스트만 |

### 1-6. Firebase Rules · Index

**`firestore.rules` (main @ `72a658d`):**

```javascript
match /wbsItems/{wbsItemId} {
  allow get, list: if canReadProject(projectId);
  allow create, update, delete: if false;  // write 전면 deny
}
```

- `counters/wbsItems` match **없음** — code counter PR(WBS-2 rules)에서 FS `functionalSpecifications` counter 패턴 추가 필요.
- `isValidWbs*` helper **없음**.

**`firestore.indexes.json`:** `wbsItems` composite index **0건**. 1차 list는 client-side sort (`createdAt DESC`)로 시작; 필터 확장 시 `projectId + status + functionGroup` 등 후속 검토.

### 1-7. WBS 관련 docs (참고, 본 PR 미수정)

| 경로 | 용도 |
|------|------|
| `stam/docs/STAM-WBS-Board-List-Contract-v1.html` | row active/selected, delete count 계약 |
| `stam/docs/STAM-WBS-Board-List-Structure-Review-v1.html` | 22컬럼 구조 |
| `stam/docs/reports/STAM-WBS-Traceability-ID-Alignment-Plan.md` | WORK→WBS ID 정렬 (후속) |
| `docs/reports/STAM_PR328_WBS_Inline_Style_Cleanup_Phase1.md` | inline cleanup 이력 |
| `docs/ops/STAM-Phase1-Implementation-Gate.md` §4-3 · §6 단계 3 | Gate SSOT |

### 1-8. 화면 이중 목록 구조 (중요)

| 영역 | selector | 데이터 소스 | 1차 전환 |
|------|----------|-------------|----------|
| **Primary** | `.wbs-table` · `.wbs-data-row[data-wbs-id]` | HTML 정적 17행 (6 기능그룹 tbody) | Firestore list render **대체** |
| **Prototype** | `#wbs-v2-tbody` · `.wbs-v2-section` | Local Core DB v2 (`stam.wbs-cycle.js`) | **숨김/제거** (Live 전환 PR에서) |

Drawer (`#wbs-drawer`)는 `stam.wbs.js`(mode UI) + `stam.wbs-crud.js`(Local CRUD)가 **분리 연결**. Firestore CRUD wiring 시 FS 패턴처럼 `stam.wbs-firestore-crud.js`가 drawer form ↔ service bridge 담당.

---

## 2. Static → Live Mapping

분류: **A** Firestore 원본 · **B** 원본에서 계산 · **C** 1차 정적/비활성 · **D** 후속 범위

| UI 구역 | DOM / JS hook | 1차 분류 | 1차 동작 |
|---------|---------------|----------|----------|
| **KPI strip** | `.wbs-kpi-strip` · 5 cards | **B** | Firestore list 로드 후 집계 (total / in_progress / done / delayed / due_this_week) |
| **일정 요약 타임라인** | `.wbs-gantt-section` · `.wbs-gsum` · meta | **B** (header summary) + **C** (mobile card copy) | min/max `startDate`/`endDate`, count, 완료율 계산; **편집·드래그 없음** |
| **기능그룹별 일정 요약** | `.wbs-gsum-groups` · `.wbs-gsum-grp-row` | **B** | `functionGroup` groupBy → period/count/status/progress bar |
| **필터** | `.wbs-filter-wrap` · `#wbs-filter-panel` · `#wbs-my-btn` · `#wbs-risk-btn` · `.wbs-search-input` | **A** (client filter on loaded items) | Firestore list in-memory filter; `boardFilter.onApply` **1차 최소 구현** (status/priority/group); my/risk는 `ownerName`/`status=delayed` 파생 |
| **목록** | `.wbs-table` · `.wbs-data-row` · group headers | **A** | Firestore read → tbody re-render (group header stats = **B**) |
| **등록 Drawer** | `#wbs-drawer` `data-mode=create` · `.wbs-create-body` | **A** | create via service; code auto (`WBS-###`) |
| **상세 Drawer** | `.wbs-detail-body` | **A** | getById read |
| **수정 Drawer** | `.wbs-edit-body` | **A** | update via service |
| **연결 정보** | `.wbs-drawer-sec` 연결 · form sec 6 | **A** (req + functionalSpec only) | picker link 3-key snapshot; meeting **C** |
| **댓글** | `.wbs-dw-cmt*` · textarea/send | **C** | UI 유지, input/send **disabled** + 1차 범위 tooltip |
| **변경이력** | `.wbs-dw-hist-item` (정적) · v2 track in crud | **C** | HTML mock 유지; Firestore subcollection **D** |
| **Excel 가져오기** | page header secondary btn | **C** | **disabled** + `title="1차 범위 외"` |
| **내보내기** | page header secondary btn | **C** | **disabled** + 동일 |
| **Focus View** | `.wbs-focus-exit-bar` · `[data-focus-toggle]` · `stam.wbs.js` `initFocusView` | **C** | shell CSS toggle only (데이터 무관) — **유지** |
| **전체 간트 보기** | `#wbs-gantt-fullview-btn` · `#wbs-gantt-modal` | **B** + **C** | modal bars = list-derived read-only; **Gantt 편집 D** |
| **전체보기 inline (FV)** | `#wbs-fv-inline` | **C** | detail mirror UI — Firestore detail bind 후 **read-only 유지** |
| **삭제 (toolbar/detail)** | `#wbs-delete-btn` · `#wbs-det-del-btn` | **C** | visible + **disabled** + FS 동형 alert |
| **임시저장** | edit/create footer ghost btn | **C** | disabled |
| **승인상태·리스크·회의록·기간판정 컬럼** | table cols · detail cells | **B/C** | verdict/risk = date+status derived display; approval/meeting = **C** static |
| **Local v2 section** | `.wbs-v2-section` · `#wbs-v2-tbody` | **D** | Firestore live 후 제거 |

**1차 excluded 버튼 정책:** 숨기지 않음. `disabled` + `title` 또는 `STAM.uiMessages` scope hint (`1차 범위 외`).

---

## 3. Firestore Schema

### 3-1. Collection path (Gate SSOT)

```txt
projects/{projectId}/wbsItems/{wbsItemId}
```

- `wbsItemId` == document id == payload `id`
- top-level `wbsItems` **사용하지 않음** (`STAM-Firestore-Project-Membership-Gate-Guide.html`)

### 3-2. Field contract (1차)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | create | == path `wbsItemId` |
| `projectId` | string | create | == path `projectId` |
| `code` | string | create (auto) | `WBS-###` via counter; display chip |
| `title` | string | create | 2–120자 (FS title rule 동형) |
| `phase` | string | create | enum §3-3 |
| `businessArea` | string | optional | e.g. `UI/UX`, `기획/IA` |
| `functionGroup` | string | create | group header key |
| `screenPath` | string | optional | 메뉴/화면 경로 |
| `status` | string | create | enum §3-3 |
| `priority` | string | create | `high` · `mid` · `low` |
| `ownerId` | string | optional | 1차: member uid when resolvable |
| `ownerName` | string | create | display; form select value |
| `reviewerId` | string | optional | |
| `reviewerName` | string | optional | |
| `startDate` | string | create | `YYYY-MM-DD` ISO date **string** |
| `endDate` | string | create | `YYYY-MM-DD`; rules: `endDate >= startDate` when both set |
| `plannedEffort` | number | optional | **일(day) 단위** 정수/소수; UI `4일` ↔ `4` |
| `actualEffort` | number | optional | 동일 단위 |
| `progress` | number | optional | **0–100** integer; default `0` |
| `description` | string | optional | max 4000 |
| `requirementId` | string | optional | Firestore doc id |
| `requirementCode` | string | optional | `REQ_###` snapshot |
| `requirementTitle` | string | optional | snapshot |
| `functionalSpecId` | string | optional | Firestore doc id |
| `functionalSpecCode` | string | optional | `FN_###` snapshot |
| `functionalSpecTitle` | string | optional | snapshot |
| `createdAt` | timestamp | create | serverTimestamp |
| `updatedAt` | timestamp | create/update | serverTimestamp |
| `createdBy` | string | create | uid |
| `updatedBy` | string | update | uid |
| `version` | number | create/update | start `1`, update +1 (FS 동형) |
| `isDeleted` | boolean | create | `false` only; delete 미개방 |
| `deletedAt` / `deletedBy` | null | create | immutable |

**1차 제외 필드 (UI only / 후속):** `approvalStatus`, `riskLevel`, `meetingIds`, `parentId`, `sortOrder`, `reviewStatus` (Local v2 legacy), `importBatchId`.

### 3-3. Enum · display mapping

**`phase` (단계)** — UI select opts (`wbs.html`):

`착수` · `분석` · `설계` · `구현` · `검수` · `오픈` · `완료`

Storage: **한글 그대로** (UI 1:1) 또는 slug (`analysis`, `design`, …) — **결정: 한글 storage** (WBS static chip과 일치, FS `functionType` 영문 enum과 분리).

**`status` (진행상태)** — UI toggle / chip:

| UI | Stored | CSS chip |
|----|--------|----------|
| 대기 | `wait` | `wc-wait` |
| 진행중 | `in_progress` | `wc-prog` |
| 지연 | `delayed` | `wc-delay` |
| 완료 | `done` | `wc-done` |
| 보류 | `hold` | `wc-hold` |

Local v2 `draft/reviewing/confirmed/rejected` **사용하지 않음** (Firestore SSOT 전환 시 폐기).

**`priority`:** `high` · `mid` · `low` (UI 높음/보통/낮음 ↔ service normalize).

### 3-4. Code generation

| Item | Value |
|------|-------|
| Counter doc | `projects/{projectId}/counters/wbsItems` |
| Counter field | `lastNumber` (integer) |
| Code format | `WBS-` + zero-pad 3 (`WBS-001` …) |
| Transaction | FS `createWithAllocatedCode` 동형 |
| Rules | `isValidWbsItemsCounterWrite()` — writer role + counter shape |

**Local `genWbsId()` (`WBS-MANUAL-YYYYMMDD-…`)** — Firestore 1차 **폐기**.

### 3-5. Link unlink — 3-key absent policy (FS-7 회귀 방지)

**Requirement unlink** — update patch에서 아래 키 **FieldValue.delete()** (키 absent):

- `requirementId`
- `requirementCode`
- `requirementTitle`

**FunctionalSpec unlink** — 동일:

- `functionalSpecId`
- `functionalSpecCode`
- `functionalSpecTitle`

**금지:** `""`, `null` 잔존, partial key 잔존 (FS-7 W-07 FAIL 조건).

**Unlinked create:** 6 keys 모두 **omit**.

### 3-6. Index 필요 여부

| Query | 1차 | Index |
|-------|-----|-------|
| List all by project | `collection(wbsItems).get()` | default |
| Sort `createdAt DESC` | client-side after fetch | **불필요** (FS-7 #381: registration sort client-side) |
| Filter status + functionGroup | client-side | 후속 server filter 시 composite 추가 |
| byRequirement | picker 역참조 없음 | 후속 |

### 3-7. Sort contract (1차)

**Default list sort:** `createdAt DESC` → `code DESC` → `id DESC`

- `updatedAt` sort **금지** (FS-7 sort flip root cause)
- Group header 내부 행: `functionGroup` ASC → 위 sort tie-break

---

## 4. Included / Excluded

### 4-1. Included (WBS Live 1차)

| # | Capability |
|---|------------|
| 1 | List read (`wbsItems` collection) |
| 2 | Create + auto `WBS-###` code |
| 3 | Detail read (drawer) |
| 4 | Update |
| 5 | Requirement picker (`STAM.requirementPicker` 재사용) |
| 6 | Functional specification picker (신규 module, FS picker 패턴) |
| 7 | Default sort `createdAt DESC` |
| 8 | owner/admin/editor write · viewer read-only UI |
| 9 | delete **disabled** (UI + rules deny) |
| 10 | KPI strip recalc (**B**) |
| 11 | Min timeline + functionGroup summary (**B**) |
| 12 | Firestore live QA (W-01~W-13 + CLEANUP) |

### 4-2. Excluded (1차 — UI visible, disabled where applicable)

| Item | UI handling |
|------|-------------|
| delete / softDelete | `#wbs-delete-btn`, `#wbs-det-del-btn` disabled + confirm alert |
| comments persistence | textarea/send disabled |
| history subcollection | static mock only |
| Excel import / export | header buttons disabled |
| Gantt bar editing | read-only label 유지 |
| approval workflow | 승인상태 column static |
| bulk edit | checkbox select UI 유지, bulk action disabled |
| drag/drop reorder | 없음 |
| meeting link | `+ 회의록 연결` disabled |
| 임시저장 | footer btn disabled |
| Local Core DB v2 section | hide after Firestore bind |

---

## 5. Permission Matrix

Rules helper (후속 WBS-1 rules PR): `isWbsWriter(projectId)` = `isRequirementWriter(projectId)` (owner/admin/editor).

| role | wbsItems read | create | update | delete |
|------|---------------|--------|--------|--------|
| owner | yes | yes | yes | **no** |
| admin | yes | yes | yes | **no** |
| editor | yes | yes | yes | **no** |
| viewer | yes | **no** | **no** | **no** |
| non-member | no | no | no | no |

**UI (FS CRUD 동형):**

| Control | viewer |
|---------|--------|
| `#wbs-reg-btn` | disabled |
| `.wbs-drawer-edit-btn` | disabled |
| create/edit save | blocked + `writeGuard()` message |
| delete buttons | disabled (all roles) |
| pickers | read-only / disabled on edit |

**Counter write:** `counters/wbsItems` — writer only (FS counter 동형).

---

## 6. Reuse Plan

판정: **재사용** · **일반화** · **신규(승인 PR)** · **WBS 전용**

| Module | 판정 | Notes |
|--------|------|-------|
| Firestore adapter pattern | **일반화** | `functional-spec-firestore-adapter.js` → counter, unlink delete, timestamp |
| Domain service pattern | **일반화** | role gate, validate, normalize, create/update payload builder |
| List render pattern | **일반화** | auth wait, loading/empty/error via `uiFeedback`, sort helper |
| CRUD drawer wiring | **일반화** | `writeGuard`, deferred prefill **금지**, create/update shared mapper |
| Requirement picker | **재사용** | `stam.requirement-picker.js` as-is |
| FunctionalSpec picker | **신규** | `stam.functional-spec-picker.js` — requirement-picker mirror |
| Permission UI | **재사용** | FS `setButtonDisabled` + `writeGuard` pattern |
| Common messages / feedback | **재use** | `stam.ui-messages.js`, `stam.ui-feedback.js` |
| Live QA workflow | **일반화** | `fs7-live-firestore-qa.yml` → `wbs-live-firestore-qa.yml` |
| Cleanup script | **일반화** | agent-created docs delete by tag |
| Artifact report | **일반화** | always written PASS/FAIL/BLOCKED |
| `stam.wbs.js` shell | **WBS 전용** | extend hooks only; no rewrite |
| Grouped table render | **WBS 전용** | new list module renders 6-group tbody |
| `stam.wbs-crud.js` Local | **폐기 경로** | Firestore crud replaces; Local path feature-flag off |
| `stam.board-list.js` | **미사용** | WBS contract 유지 |

### FS-7 회귀 방지 checklist (WBS mandatory)

| # | Item | WBS enforcement |
|---|------|-----------------|
| 1 | deferred prefill race 금지 | picker `load()` complete **before** edit prefill; single `openEdit(id)` chain |
| 2 | create/update mapping 공통화 | `wbsService.buildPayload(form, mode)` single SSOT |
| 3 | unlink key delete 보장 | adapter `applyRequirementUnlinkDeletes` + `applyFunctionalSpecUnlinkDeletes` |
| 4 | custom token precheck | QA workflow auth step before agent CRUD |
| 5 | artifact always written | QA report JSON even on BLOCKED |
| 6 | runtime shutdown | `browser.close()` in finally |
| 7 | staging browser + Firestore 검증 | UI chip + Console doc cross-check |

---

## 7. QA Gate

### 7-1. Contract smoke (선행 — 각 구현 PR)

```bash
node scripts/test-wbs-service-contract.mjs          # WBS-2
node scripts/test-wbs-rules-contract.mjs            # WBS-1
node scripts/test-wbs-role-matrix-contract.mjs      # WBS-1
node scripts/test-wbs-list-contract.mjs             # WBS-3
node scripts/test-wbs-crud-ui-contract.mjs          # WBS-4
node scripts/test-wbs-counter-contract.mjs          # WBS-2
node scripts/test-requirement-picker-contract.mjs   # reuse
node scripts/test-functional-spec-picker-contract.mjs # WBS-5 (신규)
```

### 7-2. Live scenarios (W-01~W-13)

| ID | Scenario | UI | Firestore |
|----|----------|-----|-----------|
| W-01 | list load | grouped table / empty state | docs listed |
| W-02 | linked create (req + FN picker) | chips `REQ_###` · `FN_###` | 6 link fields present |
| W-03 | refresh persistence | W-02 유지 | fields persist |
| W-04 | code generation | `WBS-###` | counter `lastNumber`++ |
| W-05 | update | field change visible | doc updated, `version`+1 |
| W-06 | refresh update persistence | W-05 유지 | match |
| W-07 | requirement unlink | chip gone | 3 req keys **absent** |
| W-08 | functionalSpec unlink | chip gone | 3 fn keys **absent** |
| W-09 | unlinked create | no link chips | 6 keys omit |
| W-10 | KPI recalculation | strip counts match list | — |
| W-11 | viewer read-only | write buttons disabled | write denied |
| W-12 | delete disabled | toolbar + detail delete disabled | `allow delete: false` |
| W-13 | no fatal console error | DevTools clean | — |
| CLEANUP | agent test docs removed | — | tagged docs deleted |

### 7-3. Live QA environment

| Item | Value |
|------|-------|
| staging | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| STAM projectId | `stam-demo` |
| screen | `/pages/boards/wbs.html?projectId=stam-demo` |
| workflow | `.github/workflows/wbs-live-firestore-qa.yml` (WBS-8 PR) |

---

## 8. Risks / Decisions

| ID | Risk / Decision | Mitigation |
|----|-----------------|------------|
| R1 | 정적 17행 + Local v2 이중 목록 | Firestore bind PR에서 static tbody + v2 section **한 번에** 교체 |
| R2 | 22컬럼 grouped table render 복잡도 | 1차: `functionGroup` client groupBy; empty groups hidden |
| R3 | Local v2 vs Firestore field naming | service layer explicit map; Local CRUD **deprecated** |
| R4 | `phase` 한글 vs slug | **결정: 한글 storage** (UI parity) |
| R5 | owner/reviewer uid vs name | 1차: `ownerName`/`reviewerName` write; uid optional enrichment PR |
| R6 | FunctionalSpec picker **신규 module** | FS-6B requirement-picker 복제 PR 선행 (WBS-5) |
| R7 | rules + counter 없음 | WBS-1 dedicated rules PR; FS-1 pattern |
| R8 | WORK vs WBS ID traceability | `STAM-WBS-Traceability-ID-Alignment-Plan.md` — **후속**, 1차 blocker 아님 |
| R9 | Filter mock groups ≠ demo data | 1차 filter opts를 **live distinct values**로 hydrate |
| R10 | FS-7 sort flip recurrence | **`createdAt DESC` only**; contract regression script |

---

## 9. Recommended PR Sequence

실제 소스 분석 기준 보정 순서:

| PR | Branch prefix | Scope | 산출 |
|----|---------------|-------|------|
| **WBS-0** | `docs/wbs-inventory-gate` | **본 PR** — Inventory · Schema · Gate | `docs/reports/STAM_WBS_Live_Firestore_Inventory_Gate.md` |
| **WBS-1** | `rules/wbs-write-by-role` | `firestore.rules` — read + writer create/update, delete deny, `isValidWbs*`, counter | rules contract + role matrix |
| **WBS-2** | `feat/wbs-service-adapter` | `stam.wbs-service.js` + `stam.wbs-firestore-adapter.js` + counter | service/adapter/counter contract |
| **WBS-3** | `feat/wbs-list-read` | `stam.wbs-firestore-list.js` + `wbs.html` firebase scripts + static tbody → live render | list contract, KPI/timeline **B** hook |
| **WBS-4** | `feat/wbs-crud-ui` | `stam.wbs-firestore-crud.js` create/detail/update drawer bind | crud-ui contract |
| **WBS-5** | `feat/wbs-pickers` | requirement picker wire + **`stam.functional-spec-picker.js`** 신규 | picker contracts + browser smoke |
| **WBS-6** | `feat/wbs-permission-ui` | viewer read-only, writeGuard refresh | role UI smoke |
| **WBS-7** | `feat/wbs-derived-views` | KPI strip + gantt summary + group stats full **B** | derived calc contract |
| **WBS-8** | `docs/wbs-live-qa` | `wbs-live-firestore-qa.yml` + agent script + evidence md | W-01~W-13 artifact |

**PR 분리 원칙 (Gate 재확인):**

```txt
inventory/schema → rules → service/adapter → list → CRUD → pickers → permission → derived → live QA
```

- Rules PR과 UI PR **분리**
- docs-only Gate PR은 코드 **0**
- nav B3 Live 승격(실 DB)은 **WBS-3~4 merge + QA PASS 후** 별도 shell PR

---

## Appendix A — `wbs.html` script · DOM quick reference

| ID / class | Purpose |
|------------|---------|
| `#wbs-reg-btn` | 등록 drawer |
| `#wbs-drawer` · `#wbs-drawer-panel` | drawer shell `data-mode` |
| `.wbs-detail-body` / `.wbs-edit-body` / `.wbs-create-body` | mode bodies |
| `#wbs-delete-btn` | bulk delete toolbar |
| `#wbs-det-del-btn` | detail delete |
| `.wbs-data-row[data-wbs-id]` | primary list row |
| `#wbs-v2-tbody` | Local prototype (retire) |
| `#wbs-gantt-modal` | full gantt modal |
| `#wbs-fv-inline` | focus full view inline |

---

## Appendix B — Governance (본 PR)

| Check | Result |
|-------|--------|
| 제품 코드 변경 | **0** |
| `firestore.rules` 변경 | **0** |
| `stam/css/**` · `stam/js/**` 신규 | **0** |
| inline style/script in diff | **0** |
| nav-data 변경 | **0** |
| 새 CSS/JS 파일 | **0** |

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| Phase 1 Gate | `docs/ops/STAM-Phase1-Implementation-Gate.md` |
| FS Inventory (패턴 원형) | `docs/reports/STAM_FunctionalSpec_DB_Connection_Inventory.md` |
| FS-7 Live QA (회귀 SSOT) | `docs/reports/STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` |
| FS-1 Write Rules | `docs/reports/STAM_FS1_FunctionalSpec_Write_Rules_By_Role.md` |
| Membership Gate | `stam/docs/STAM-Firestore-Project-Membership-Gate-Guide.html` |
| WBS List Contract | `stam/docs/STAM-WBS-Board-List-Contract-v1.html` |
