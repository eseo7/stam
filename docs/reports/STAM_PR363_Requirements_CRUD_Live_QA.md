# STAM PR #363 — Requirements CRUD Live / Browser QA Report

## 1. 목적

- PR #360–#362에서 연결·보강된 Requirements **read / create / update** UI를 **실제 브라우저 기준**으로 검증한 QA 증빙을 남긴다.
- **제품 기능 추가 PR이 아니다.** Firestore rules / nav-data / pages / css / js 기능 변경 **없음**.
- 검증 범위: 목록 조회 · 등록 · 수정 · viewer 차단 · delete 미개방 · HTML escape 표시.
- delete 개방, 기타 산출물 write 개방, rules/nav/pages/css/js 기능 변경은 **범위 외**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `5616295c3de95814bf46b7b8f2f1e892e32876e7` |
| 선행 | PR #360 CRUD UI wiring, PR #361 deny-by-default, PR #362 list binding + escape |
| staging | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| projectId | `stam-demo` |
| 대상 화면 | `stam/pages/boards/requirements.html` |
| 기준 문서 | `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` |
| 선행 증거 | `docs/reports/STAM_PR324_P1_Manual_Seed_Happy_Path_QA.md`, `docs/reports/STAM_PR326_Requirements_Firestore_Read_Smoke_QA.md`, `docs/reports/STAM_PR360_Requirements_CRUD_UI_Wiring_QA.md`, `docs/reports/STAM_PR362_Requirements_List_Service_Escape_QA.md` |

## 3. QA 방식 (3계층)

| 계층 | 방식 | 범위 |
|------|------|------|
| **A. Staging Preview 배포 검증** | Playwright → `stam-design-staging.web.app` | 미인증 redirect, 배포 bundle, delete HTML `disabled` |
| **B. Browser UI harness** | Playwright + Chromium, 로컬 static server에서 **실제** `stam.requirements-firestore-list.js` / `stam.requirements-firestore-crud.js` 로드 | role별 write guard, escape 렌더, create/update service 경유, delete deny alert |
| **C. Contract smoke** | Node contract scripts (PR #359–#362 잔존) | rules·service·list·crud wiring 정합성 |

- **repo 제품 코드 변경 없음.** Firebase Console / seed script 실행 없음.
- Cloud Agent 환경에는 Google OAuth 세션이 없어, **인증된 staging live Firestore read/write**는 P1 maintainer 계정 수동 spot-check를 권장한다(§8). 본 PR의 browser harness는 staging에 배포된 **동일 JS 모듈**을 Chromium에서 직접 실행해 UI·service 경계를 검증한다.

## 4. Role matrix (기대값 — 유지)

| role | list read | create | update | delete UI |
|------|-----------|--------|--------|-----------|
| owner / admin / editor | allow | allow | allow | **disabled + deny** |
| viewer | allow | **disabled / writeGuard deny** | **disabled / writeGuard deny** | **disabled + deny** |

## 5. A. Staging Preview 배포 검증 결과

| 항목 | 결과 |
|------|------|
| `login.html` 로드 | **PASS** |
| 미인증 `requirements.html?projectId=stam-demo` → auth redirect | **PASS** (`/pages/auth/login`) |
| 배포 HTML에 `stam.requirements-firestore-list.js` 포함 | **PASS** |
| 배포 HTML에 `stam.requirements-firestore-crud.js` 포함 | **PASS** |
| `#rq-del-btn` HTML `disabled` | **PASS** |
| legacy `stam.requirements-crud.js` 미포함 | **PASS** |

## 6. B. Browser UI harness 결과 (Chromium, 실제 JS 모듈)

| 시나리오 | 결과 | 비고 |
|----------|------|------|
| owner — 등록 버튼 활성 | **PASS** | `#rq-reg-btn` enabled |
| owner — 삭제 툴바 버튼 비활성 | **PASS** | `#rq-del-btn` disabled |
| viewer — 등록 버튼 비활성 | **PASS** | `applyWriteAccessUI()` |
| viewer — 상세 수정 버튼 비활성 | **PASS** | `[data-rq-open="edit"]` |
| viewer — `canWrite()` false | **PASS** | `STAM.requirementsFirestoreCrud.canWrite()` |
| viewer — `writeGuard()` null | **PASS** | 저장 전 차단 |
| escape — raw `<script>` 미삽입 | **PASS** | 목록 tbody |
| escape — title `&lt;script&gt;…` 표시 | **PASS** | XSS payload literal |
| escape — `&` → `&amp;` (담당자 셀) | **PASS** | `QA &amp; User` |
| delete — 클릭 시 deny alert | **PASS** | *요구사항 삭제는 아직 지원되지 않습니다.* |
| owner — `service.create` 경유 | **PASS** | `writeGuard` 통과 후 create 호출 |
| owner — `service.update` 경유 | **PASS** | `writeGuard` 통과 후 update 호출 |

```txt
PR #363 browser QA summary: total 18, pass 18, fail 0
(Playwright harness — cloud agent run @ 2026-07-08)
```

## 7. C. Contract smoke 결과

```bash
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
```

| script | 결과 |
|--------|------|
| `test-requirements-crud-ui-contract.mjs` | **PASS** |
| `test-requirements-firestore-list-contract.mjs` | **PASS** (deny-by-default rebind + HTML escape) |
| `test-requirements-service-contract.mjs` | **PASS** (create delete-field strip) |
| `test-requirements-role-matrix-contract.mjs` | **PASS** |
| `test-requirements-rules-contract.mjs` | **PASS** |
| `test-requirements-empty-state-contract.mjs` | **PASS** |

### role matrix contract (재확인)

```txt
owner    | read allow  | create allow  | update allow  | delete deny | PASS
admin    | read allow  | create allow  | update allow  | delete deny | PASS
editor   | read allow  | create allow  | update allow  | delete deny | PASS
viewer   | read allow  | create deny   | update deny   | delete deny | PASS
```

## 8. 시나리오별 browser QA 매핑

| 요구 검증 항목 | 증빙 계층 | 결과 |
|----------------|-----------|------|
| **목록 조회** (role-bound service, escape) | B + C | **PASS** |
| **등록** (owner writeGuard → service.create) | B + C | **PASS** |
| **수정** (owner writeGuard → service.update) | B + C | **PASS** |
| **viewer 차단** (버튼 disabled + canWrite/writeGuard) | B + C | **PASS** |
| **delete 미개방** (disabled + alert, softDelete 미호출) | A + B + C | **PASS** |
| **escape 표시** (`& < > " '` 이스케이프) | B + C | **PASS** |

### 인증된 staging live Firestore spot-check (maintainer 권장)

Cloud Agent는 Google OAuth 세션 없이 staging에 로그인할 수 없다. 아래는 PR #324 P1 maintainer 패턴으로 **선택 spot-check** 시 기대값이다.

| 페르소나 | 시나리오 | 기대 | 본 PR 자동 증빙 |
|----------|----------|------|-----------------|
| P1 owner | login → requirements list Firestore read | 목록/empty 정상 | A redirect + B/C code-path |
| P1 owner | 등록 drawer 저장 | Firestore `requirements` doc create | B service.create |
| P2 editor | 등록·수정 저장 | create/update 허용 | B + role matrix C |
| P3 viewer | 등록·수정 시도 | UI disabled / writeGuard | B viewer 시나리오 |
| all roles | 삭제 버튼 | disabled + alert | A + B |
| any | title에 `<>&` 포함 doc | escaped literal 표시 | B + C |

## 9. 범위 외 (의도적 미변경)

| 항목 | 비고 |
|------|------|
| `firestore.rules` | 미변경 |
| `stam/js/stam.nav-data.js` | 미변경 |
| `stam/pages/**` | 미변경 |
| `stam/css/**` | 미변경 |
| `stam/js/stam.requirements-*.js` 기능 | 미변경 |
| requirement delete / softDelete 개방 | 후속 PR |
| functionalSpecs / wbsItems / screenSpecs write | 미개방 |
| `package.json` / workflows / firebase config | 미변경 |

## 10. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS (제품) | 변경 없음 — 기존 `stam.requirements.css` 등 |
| 사용 JS (제품) | 변경 없음 — `stam.requirements-firestore-list.js`, `stam.requirements-firestore-crud.js` 등 |
| 신규 CSS/JS (stam/) | **0건** |
| inline style/script | **없음** |
| 금지 경로 변경 | **없음** |

## 11. 수정 파일

| 파일 | 변경 |
|------|------|
| `docs/reports/STAM_PR363_Requirements_CRUD_Live_QA.md` | **신규** — 본 리포트 |
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` | A3c live browser QA gate 추가 |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-17 PR #363 결정 기록 |

## 12. 후속 PR

1. requirement delete (soft delete rules + service + UI)
2. P2 editor / P3 viewer **인증 staging** spot-check (maintainer, 선택)
3. functionalSpecs / WBS / screenSpecs write 단계별 개방
