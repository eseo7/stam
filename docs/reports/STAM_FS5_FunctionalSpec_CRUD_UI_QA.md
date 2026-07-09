# STAM FS-5 — Functional Specification CRUD UI Wiring QA

## 1. 목적

FS-4 Firestore list read binding 이후, B5 기능정의서 화면의 **등록/수정 Drawer**를 `STAM.functionalSpecService` create/update에 연결한다. delete/softDelete는 계속 미개방이며, FN_### counter·requirement picker는 FS-6 후속이다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `aab7ff5` (FS-4 post-merge evidence #373) |
| 선행 | FS-1~FS-4 merge 완료, staging FS-4 반영 확인 |
| 화면 | `stam/pages/boards/functional-specification.html` (B5) |
| collection | `projects/{projectId}/functionalSpecifications/{functionalSpecId}` |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.functional-spec-firestore-crud.js` | **신규** — register/edit create·update UI wiring |
| `stam/js/stam.functional-spec-firestore-list.js` | detail binding (`openDetailFromRow`, `renderDetail`, `currentItem`) 최소 보정 |
| `stam/pages/boards/functional-specification.html` | CRUD script tag, Drawer mock 제거, delete 버튼 visible+disabled |
| `scripts/test-functional-spec-crud-ui-contract.mjs` | **신규** |
| `docs/reports/STAM_FS5_FunctionalSpec_CRUD_UI_QA.md` | 본 리포트 |

## 4. CRUD 계약 (FS-5)

| 항목 | 내용 |
|------|------|
| Create | `STAM.functionalSpecService.create(projectId, input, context)` — 등록 Drawer |
| Update | `STAM.functionalSpecService.update(projectId, id, patch, context)` — 수정 Drawer |
| List reload | 저장 성공 후 `functionalSpecFirestoreList.load()` |
| Write roles | owner / admin / editor (`canWriteFunctionalSpecs`) |
| Viewer | 등록·수정 버튼 disabled, read-only |
| Delete | toolbar `#fn-del-btn` + detail `#fn-det-del-btn` **visible + disabled** + click guard alert |
| Detail binding | row click → `getById` → `renderDetail` (FN-001 mock 제거) |
| FN_### counter | **미구현** (FS-6) |
| Requirement picker | **미구현** (FS-6) — 연결 요구사항은 free-text 입력만 |

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
<script src="../../js/stam.functional-spec-firestore-crud.js"></script>
```

## 6. 검증

```bash
node --check stam/js/stam.functional-spec-firestore-crud.js
node --check stam/js/stam.functional-spec-firestore-list.js
node scripts/test-functional-spec-crud-ui-contract.mjs
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
| `stam/js/stam.functional-specification.js` | **변경 없음** |
| Requirements / WBS / screenSpecs JS | **변경 없음** |
| 신규 stam/js | crud module **1건** (FS-5 범위) |
| inline style/script (page) | **추가 없음** |
| delete/softDelete API | **미개방** |

## 8. 후속 PR

- FS-6: FN_### code counter + requirement picker
- FS-7: live QA evidence
