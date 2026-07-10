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

---

## 9. PR #374 Preview CI

| 항목 | 값 |
|------|-----|
| PR | #374 — `cursor/fs5-functional-spec-crud-ui-d057` |
| Preview workflow | `PR Preview - Firebase Hosting` |
| Run | `29018640765` |
| 결론 | **SUCCESS** |
| Preview URL | `https://stam-design-staging--pr374-ln84jfp8.web.app` |
| Channel | `pr374` (expires 2026-07-16) |
| QA path | `/pages/boards/functional-specification?projectId=stam-demo` |

### Preview artifact check (2026-07-09 UTC)

| 항목 | 결과 |
|------|------|
| `stam.functional-spec-firestore-crud.js` script tag | **PASS** |
| `stam.functional-spec-firestore-list.js` | **PASS** |
| Drawer `FN-001` / `요구사항 목록 조회` mock | **PASS** — HTML에 **없음** |
| `#fn-det-del-btn` visible + disabled | **PASS** |
| 미인증 browser redirect | **PASS** → `/pages/auth/login` |

## 10. Browser smoke QA (제품 JS + Firebase shim)

로컬 정적 서버: `python3 -m http.server` 대체 — `scripts/qa-functional-spec-crud-browser-smoke.mjs` 내장 static server (`127.0.0.1:9876`)  
브라우저: Playwright Chromium headless (`/tmp/qa-deps`)  
페이지: `/pages/boards/functional-specification.html?projectId=stam-demo`  
Firebase: QA shim (member role·functionalSpecifications read/write 에뮬레이션)

```bash
node scripts/qa-functional-spec-crud-browser-smoke.mjs
```

### 10-1. 시나리오 결과

| ID | 시나리오 | role | 기대 | 결과 |
|----|----------|------|------|------|
| B-01 | 목록 조회 | owner | Firestore list → table row | **PASS** (1 row) |
| B-02 | escape 표시 | owner | title XSS 문자열 HTML escape | **PASS** (`&lt;img`, `&amp;`) |
| B-03 | writer 등록 UI | owner | `#fn-reg-btn` enabled | **PASS** |
| B-04 | 등록 submit | owner | adapter `set` (create) | **PASS** |
| B-05 | 상세 binding | owner | row click → detail drawer (mock 아님) | **PASS** |
| B-06 | 수정 submit | owner | edit drawer → adapter `update` | **PASS** |
| B-07 | editor write UI | editor | `#fn-reg-btn` enabled | **PASS** |
| B-08 | viewer 차단 | viewer | register **disabled** | **PASS** |
| B-09 | delete 미개방 | owner | `#fn-del-btn` disabled + alert | **PASS** |
| B-10 | detail delete | owner | `#fn-det-del-btn` disabled | **PASS** |
| B-11 | mock cleanup | owner | `요구사항 목록 조회` / FN-001 drawer mock 없음 | **PASS** |
| P-01 | Preview artifact | — | crud script + mock absent | **PASS** |
| P-02 | Preview unauth | — | login redirect | **PASS** |

> **admin** role은 `canWriteFunctionalSpecs` contract·`WRITE_ROLES`에 owner/editor와 동일 write 허용 — 별도 browser 시나리오는 editor write UI(B-07) + role matrix contract로 커버.

### 10-2. Browser 실행 로그 (2026-07-09 UTC)

```txt
PASS  browser-list-read: functional spec list rendered (1 row)
PASS  browser-escape-display: title HTML-escaped in row innerHTML
PASS  browser-owner-write-ui: register enabled; toolbar delete disabled
PASS  browser-delete-guard: delete alert confirmed
PASS  browser-create-submit: Firestore adapter write on create
PASS  browser-detail-binding: detail badge from selected row: -
PASS  browser-detail-delete-disabled: detail delete disabled
PASS  browser-update-submit: Firestore adapter write on update
PASS  browser-mock-cleanup: FN-001 drawer mock title removed
PASS  browser-viewer-readonly-ui: register disabled for viewer
PASS  browser-editor-write-ui: register enabled for editor
PASS  preview-unauth-redirect: .../pages/auth/login
PASS  preview-artifact-check: crud script present; FN-001 mock absent

--- summary ---
total=13 pass=13 fail=0
```

## 11. Maintainer Preview live persistence (Ready gate)

FS-5는 functionalSpecifications **최초 create/update UI PR**이므로, Ready 전환 전 maintainer Google 세션으로 Preview channel에서 아래를 **실제 Firestore persistence**로 확인하는 것을 권장한다.

| # | Checklist | owner/editor | viewer |
|---|-----------|--------------|--------|
| 1 | Preview URL 접속 (`pr374`) | | |
| 2 | `functional-specification?projectId=stam-demo` 진입 | | |
| 3 | 목록 조회 | [ ] | [ ] |
| 4 | 기능 등록 (create) | [ ] | — |
| 5 | 새로고침 후 등록 유지 | [ ] | — |
| 6 | row 선택 → 상세/수정 (update) | [ ] | — |
| 7 | 새로고침 후 수정 유지 | [ ] | — |
| 8 | 등록/수정 버튼 disabled | — | [ ] |
| 9 | delete 버튼 disabled + alert | [ ] | [ ] |
| 10 | 콘솔 fatal error 없음 | [ ] | [ ] |

**Cloud Agent 한계:** Google OAuth maintainer 세션으로 Preview live persistence는 본 환경에서 대행 불가. §10 browser harness + §9 Preview artifact가 **Ready 전 primary automated evidence**이다.

## 12. 종합 판정 (Ready 전)

| 영역 | 판정 |
|------|------|
| Preview CI deploy | **PASS** |
| Contract tests (§6) | **PASS** |
| Browser writer smoke (owner create/update) | **PASS** |
| Browser editor write UI | **PASS** |
| Browser viewer write deny | **PASS** |
| Delete 미개방 | **PASS** |
| Drawer mock cleanup | **PASS** |
| Maintainer Preview live persistence | **권장** — §11 checklist (merge 전 maintainer 확인) |

**Ready 전환 권고:** §9–§10 automated smoke **PASS** 기준으로 PR #374 **Ready 전환 가능**. 다만 §11 maintainer live persistence 확인이 완료되면 merge 신뢰도가 더 높아진다.
