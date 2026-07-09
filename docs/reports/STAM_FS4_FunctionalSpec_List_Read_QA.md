# STAM FS-4 — Functional Specification Firestore List Read QA

## 1. 목적

FS-3 role matrix smoke QA 이후, 기능정의서 B5 화면(`functional-specification.html`)에 **Firestore 목록 read-only** 바인딩을 연결한다. create/update/delete/softDelete 저장은 **FS-5 후속**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `eb539c2` (FS-3 #371 merge 후) |
| 선행 | FS-1 rules, FS-2 service/adapter, FS-3 role matrix |
| 화면 | `stam/pages/boards/functional-specification.html` (B5) |
| collection | `projects/{projectId}/functionalSpecifications/{functionalSpecId}` |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.functional-spec-firestore-list.js` | **신규** — read-only list binding |
| `stam/pages/boards/functional-specification.html` | Firebase/service script tags, static tbody 제거, local list scripts 제거 |
| `scripts/test-functional-spec-list-contract.mjs` | **신규** |
| `docs/reports/STAM_FS4_FunctionalSpec_List_Read_QA.md` | 본 리포트 |

## 4. List 계약 (FS-4)

| 항목 | 내용 |
|------|------|
| Data source | `STAM.functionalSpecService.listByProject(projectId, { includeDeleted: false }, context)` |
| Auth / project guard | Firebase auth + active project member (Requirements list 패턴) |
| Role authorize | `createMemberRoleAuthorize`로 runtime service rebind |
| `state.items` | Firestore 목록과 동기화 (`getState().items`) |
| Loading | tbody status row — "기능정의 목록을 불러오는 중입니다." |
| Empty | "등록된 기능정의가 없습니다" |
| Error | "기능정의 목록을 불러오지 못했습니다." |
| Summary strip | Firestore items 기준 집계 |
| Delete / CRUD | **미연결** (list read only) |
| Local IndexedDB | `functional-definition-cycle/crud` script **제거** (Firestore 우선) |

## 5. Script order (`functional-specification.html`)

```html
<script src="../../js/stam.functional-specification.js"></script>
<script src="/__/firebase/8.10.1/firebase-app.js"></script>
<script src="/__/firebase/8.10.1/firebase-auth.js"></script>
<script src="/__/firebase/8.10.1/firebase-firestore.js"></script>
<script src="/__/firebase/init.js"></script>
<script src="../../js/stam.functional-spec-firestore-adapter.js"></script>
<script src="../../js/stam.functional-spec-service.js"></script>
<script src="../../js/stam.functional-spec-firestore-list.js"></script>
```

> `stam.firebase-config.js` 등 별도 래퍼 파일은 repo에 없음 — Requirements 화면과 동일하게 Hosting `__/firebase/*` init 사용.

## 6. 검증

```bash
node --check stam/js/stam.functional-spec-firestore-list.js
node scripts/test-functional-spec-list-contract.mjs
node scripts/test-functional-spec-service-contract.mjs
node scripts/test-functional-spec-role-matrix-contract.mjs
node scripts/test-functional-spec-rules-contract.mjs
```

## 7. Governance

| 항목 | 결과 |
|------|------|
| `firestore.rules` | **변경 없음** |
| `stam/css/**` | **변경 없음** |
| `stam/js/stam.functional-spec-service.js` | **변경 없음** |
| `stam/js/stam.functional-spec-firestore-adapter.js` | **변경 없음** |
| `stam/js/stam.nav-data.js` | **변경 없음** |
| 기존 기능정의서 UI JS (`stam.functional-specification.js`) | **변경 없음** |
| Requirements JS | **변경 없음** |
| 신규 stam/js | list module **1건** (FS-4 범위) |
| inline style/script (page) | **추가 없음** |
| create/update/delete 저장 연결 | **없음** |

## 8. 후속 PR

| PR | 내용 |
|----|------|
| FS-5 | CRUD UI wiring (create/update, write guard, delete visible+disabled) |
| FS-6 | `FN_###` code counter + requirement picker |
| FS-7 | live/browser QA evidence |
