# STAM PR #363 — Requirements CRUD Live / Browser QA Report

## 1. 목적

- PR #358–#362에서 완료한 Requirements **read / create / update** wiring을 **실제 브라우저(Chromium)** 기준으로 QA 증빙한다.
- **viewer read-only**, **delete 미개방**, **HTML escape 표시**, **writeGuard 저장 전 차단**을 검증한다.
- 본 PR은 **live QA evidence PR**이며, 제품 기능·rules·nav·pages/css/js **변경을 포함하지 않는다**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `5616295c3de95814bf46b7b8f2f1e892e32876e7` |
| 선행 | PR #358 rules, #359 role matrix, #360 UI wiring, #361 deny-by-default, #362 list/escape |
| staging Preview | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| projectId | `stam-demo` |
| 대상 화면 | `stam/pages/boards/requirements.html` |

## 3. 사전 확인 (contract)

작업 전 `git status --short` **clean**, HEAD `5616295`.

```bash
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-no-inline-style.mjs
```

| script | 결과 |
|--------|------|
| `test-requirements-service-contract.mjs` | **PASS** |
| `test-requirements-crud-ui-contract.mjs` | **PASS** |
| `test-requirements-firestore-list-contract.mjs` | **PASS** |
| `test-requirements-role-matrix-contract.mjs` | **PASS** |
| `test-requirements-rules-contract.mjs` | **PASS** |
| `test-requirements-empty-state-contract.mjs` | **PASS** |
| `test-requirements-no-inline-style.mjs` | **PASS** |

### Role matrix (contract 기대값 — 유지)

| role | read | create | update | delete |
|------|------|--------|--------|--------|
| owner | allow | allow | allow | **deny** |
| admin | allow | allow | allow | **deny** |
| editor | allow | allow | allow | **deny** |
| viewer | allow | **deny** | **deny** | **deny** |

## 4. QA 방식

| 계층 | 방법 | 비고 |
|------|------|------|
| **A. Contract smoke** | Node contract scripts (§3) | rules ↔ service ↔ UI wiring 정합 |
| **B. Staging Preview routing** | Playwright → `stam-design-staging.web.app` | 미인증 진입 gate |
| **C. Browser product JS** | Playwright + Chromium, 로컬 `stam/` 정적 서버 | **제품 JS 그대로 로드** (`requirements-firestore-list.js`, `requirements-firestore-crud.js`, `requirements-service.js` 등). Firebase `/__/firebase/*`는 QA shim으로 대체 — Firestore member/project/requirements 경로만 에뮬레이션 |
| **D. Staging live Firestore CRUD** | P1 owner / P3 viewer Google 세션 | Cloud Agent 환경에 maintainer Google 세션·ADC **없음** — §9 maintainer checklist로 분리 |

- Playwright는 **repo `package.json` 미변경** — QA 런타임 `/tmp/qa-deps` 임시 설치.
- screenshot / artifact는 **repo에 커밋하지 않음**.

## 5. Staging Preview QA (미인증)

| 항목 | 결과 |
|------|------|
| `requirements?projectId=stam-demo` 직접 접근 (미로그인) | **PASS** → `/pages/auth/login` redirect |
| 실행 시각 (UTC) | 2026-07-09 |

```txt
https://stam-design-staging.web.app/pages/boards/requirements?projectId=stam-demo
→ https://stam-design-staging.web.app/pages/auth/login
```

## 6. Browser QA — 제품 JS (Chromium)

로컬 정적 서버: `python3 -m http.server 8765 --directory stam`  
브라우저: Playwright Chromium headless  
페이지: `/pages/boards/requirements.html?projectId=stam-demo`

### 6-1. 시나리오 결과

| ID | 시나리오 | 기대 | 결과 |
|----|----------|------|------|
| B-01 | **목록 조회** | Firestore list → table row render | **PASS** (1 row) |
| B-02 | **escape 표시** | `title`에 `<img onerror=…> & "'` 포함 시 HTML 이스케이프, raw tag 미주입 | **PASS** — cell text literal, `innerHTML`에 `&lt;img`, `&amp;` |
| B-03 | **owner 등록 UI** | `#rq-reg-btn` enabled | **PASS** |
| B-04 | **등록 submit** | drawer 저장 → adapter `set` (create) 1회 | **PASS** |
| B-05 | **수정 submit** | row 선택 → edit drawer 저장 → adapter `update` 1회 | **PASS** |
| B-06 | **viewer 차단** | `member.role=viewer` rebind 후 register/edit **disabled** | **PASS** |
| B-07 | **delete 미개방** | `#rq-del-btn`, `#rq-det-del-btn` disabled + click 시 alert `요구사항 삭제는 아직 지원되지 않습니다.` | **PASS** |
| B-08 | **writeGuard** (viewer) | UI disabled로 drawer open 차단; submit 경로는 contract + CRUD source `writeGuard()` assert (PR #360) | **PASS** (UI + contract) |

### 6-2. Browser 실행 로그 (요약)

```txt
PASS  staging-unauth-redirect
PASS  browser-list-read: requirements list rendered (1 row)
PASS  browser-escape-display: escaped title text: <img src=x onerror=alert(1)> & " ' test
PASS  browser-owner-write-ui: register enabled; list/detail delete disabled
PASS  browser-delete-guard: delete alert: 요구사항 삭제는 아직 지원되지 않습니다.
PASS  browser-create-submit: Firestore adapter write on create (1x)
PASS  browser-update-submit: Firestore adapter write on update (1x)
PASS  browser-viewer-readonly-ui: register/edit disabled for viewer

--- summary ---
total=8 pass=8 fail=0
```

### 6-3. 검증에 사용한 제품 경로

| 계층 | 파일 |
|------|------|
| List + escape | `stam/js/stam.requirements-firestore-list.js` (`load()`, `esc()`, `rowHtml`) |
| CRUD UI | `stam/js/stam.requirements-firestore-crud.js` (`applyWriteAccessUI`, `writeGuard`, `submitRegister`, `submitEdit`, `bindDeleteGuards`) |
| Service | `stam/js/stam.requirements-service.js` (`createMemberRoleAuthorize`, deny-by-default + role rebind) |
| Adapter | `stam/js/stam.requirements-firestore-adapter.js` (`create`/`update` `set`/`update`) |

## 7. UI 동작 매트릭스 (browser + contract)

| role | 목록 read | 등록 | 수정 | 삭제 버튼 | delete alert |
|------|-----------|------|------|-----------|--------------|
| owner/admin/editor | O | O | O | disabled | O (미지원 안내) |
| viewer | O | **disabled** | **disabled** | disabled | O (미지원 안내) |

## 8. 범위 외 (의도적 미변경)

| 항목 | 비고 |
|------|------|
| `firestore.rules` | 미변경 |
| `stam/pages/**`, `stam/css/**`, `stam/js/stam.requirements-*.js` | **기능 diff 없음** |
| `stam/js/stam.nav-data.js` | 미변경 |
| requirement delete / softDelete 개방 | 후속 PR |
| functionalSpecs / wbsItems / screenSpecs write | 미개방 |
| 멤버 초대/수정/삭제, project update/delete | 미개방 |
| 신규 dev/qa page | 미추가 |

## 9. Staging live Firestore CRUD — maintainer checklist (선택 후속)

Cloud Agent 런타임에는 PR #324 P1 maintainer Google 세션 및 `GOOGLE_APPLICATION_CREDENTIALS`가 없어 **staging 실제 Firestore write persistence**는 본 PR 실행에서 수행하지 않았다. maintainer는 아래를 추가 확인한다.

### P1 (owner @ stam-demo)

- [ ] Google 로그인 → `requirements.html?projectId=stam-demo`
- [ ] 기존 목록 read PASS
- [ ] 등록 drawer → 저장 → Firestore `projects/stam-demo/requirements/{id}` 신규 doc
- [ ] 행 선택 → 수정 drawer → 저장 → 동일 doc field 갱신
- [ ] 삭제 버튼 disabled + alert
- [ ] 콘솔 오류 없음

### P3 (viewer @ stam-demo)

- [ ] 목록 read PASS
- [ ] 등록/수정 버튼 disabled
- [ ] 저장 시도 없음 (writeGuard 미발동 확인)

### Escape (데이터 준비 시)

- [ ] maintainer seed 또는 등록으로 `title`에 `<>&"'` 포함 row 생성
- [ ] table/detail에 **literal text**로 표시, script 실행 없음

## 10. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS (페이지 기존) | `stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.requirements.css` 등 |
| 사용 JS (페이지 기존) | `stam.requirements-firestore-list.js`, `stam.requirements-firestore-crud.js`, `stam.requirements-service.js`, `stam.requirements-firestore-adapter.js` |
| 신규 CSS/JS (stam/) | **0건** |
| inline style/script (diff) | **없음** |
| 금지 경로 변경 | **없음** |

## 11. 산출물

| 파일 | 변경 |
|------|------|
| `docs/reports/STAM_PR363_Requirements_CRUD_Live_QA.md` | 본 리포트 |
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` | A3c live browser QA gate |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-17 PR #363 결정 |

## 12. 후속 PR

1. requirement delete (soft delete rules + UI + service authorize)
2. staging maintainer live Firestore persistence QA (§9 checklist — 선택)
3. functionalSpecs / WBS / screenSpecs write 단계별 개방
