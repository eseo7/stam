# STAM PR #363 — Requirements CRUD Live / Browser QA Report

## 1. 목적

- PR #358–#362에서 완료한 Requirements **read / create / update** wiring을 **실제 브라우저(Chromium)** 기준으로 QA 증빙한다.
- **viewer read-only**, **delete 미개방**, **HTML escape 표시**, **writeGuard 저장 전 차단**을 검증한다.
- 본 PR은 **live QA evidence PR**이며, 제품 기능·rules·nav·pages/css/js **변경을 포함하지 않는다**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `54fb573ae24bcea1e8b356c2d5729e0946017886` (PR #367 merge 후) |
| PR #364 sync | `df09d63` — `main` merge (PR #367 list/background/code/sort 포함) |
| 선행 | PR #358–#362, **#365** write access UI, **#366** sortOrder omit, **#367** list state/background/REQ_###/sort |
| staging Preview | `https://stam-design-staging.web.app` |
| PR #364 Preview | `https://stam-design-staging--pr364-9jszye4x.web.app` (channel `pr364`; post-sync redeploy — §10-3) |
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
| **D. Staging live Firestore CRUD** | Maintainer Google 세션 (owner writer) | §10 — **PASS** (PR #366/#367 보정 후) |

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
| `firestore.rules` | **본 PR diff 없음** (main merge로 Preview에 #366/#367 rules 반영) |
| `stam/pages/**`, `stam/css/**`, `stam/js/stam.requirements-*.js` | **본 PR diff 없음** (기능은 #365–#367에서 main merge) |
| `stam/js/stam.nav-data.js` | 미변경 |
| requirement delete / softDelete 개방 | 후속 PR |
| functionalSpecs / wbsItems / screenSpecs write | 미개방 |
| 멤버 초대/수정/삭제, project update/delete | 미개방 |
| 신규 dev/qa page | 미추가 |

## 9. Maintainer live persistence — 실행 절차 (Ready gate)

Ready 전환 전 **아래 12항을 maintainer Google 세션으로 실제 수행**해야 한다. Cloud Agent는 본 절차를 대행할 수 없다 (§10).

### 사전 조건

- Firebase project: `stam-preview-hosting`
- 테스트 프로젝트: `stam-demo`
- writer: P1 (`owner`, `air***7@gmail.com` — PR #324 seed) 또는 P2 (`editor`)
- viewer: P3 (`viewer`, `beta-viewer@…` — §4.2 matrix)
- URL: staging live **또는** PR #364 preview channel

### Checklist

1. [x] maintainer 계정으로 staging 또는 PR Preview 접속
2. [x] `stam/pages/boards/requirements.html` 접근 (`?projectId=stam-demo`)
3. [x] writer — 요구사항 목록 조회
4. [x] writer — 요구사항 등록
5. [x] writer — 새로고침 후 등록 데이터 유지
6. [x] writer — 등록 데이터 수정
7. [x] writer — 새로고침 후 수정 데이터 유지
8. [ ] viewer — 목록 조회 (live) — **미확인**
9. [ ] viewer — 등록/수정 차단 (live) — **미확인** (harness §6 B-06 **PASS**)
10. [x] delete 미개방
11. [x] XSS성 문자열 실행 없이 표시만 (harness §6 B-02 + live row 표시)
12. [x] 콘솔 오류 없음

## 10. Maintainer live persistence QA 결과 (PR #364)

### 10-1. PR #366 merge 후 sync (2026-07-09)

| 항목 | 값 |
|------|-----|
| 선행 merge | PR #366 → `main` @ `fcacdc0` |
| PR #364 sync | `0cc2694` |
| Preview rebuild | **PASS** — run `28989618970` |
| Preview JS | `sortOrder` omit, `refreshCrudAccessUI` **확인** |

### 10-2. PR #367 merge 후 sync (2026-07-09)

| 항목 | 값 |
|------|-----|
| 선행 merge | PR #367 → `main` @ `54fb573` |
| PR #364 sync | `df09d63` |
| Preview rebuild | §10-3 (post-push) |
| 제품 보정 | `REQ_###` code, `background`, list state/sort, visible disabled delete — `docs/reports/STAM_PR367_Requirements_List_State_Background_Code_QA.md` |

### 10-3. Final maintainer live Firestore QA (writer / owner)

| 항목 | 값 |
|------|-----|
| 수행 주체 | Maintainer |
| 수행 일시 (UTC) | 2026-07-09 |
| QA URL | `https://stam-design-staging--pr367-upa3k10d.web.app` (PR #367 Preview; PR #364 Preview post-sync §10-3 동일 main 제품) |
| 테스트 프로젝트 | `stam-demo` |
| writer role | **owner** — `canWrite()=true`, `#rq-reg-btn` enabled |
| viewer role (live) | **미확인** |

### 시나리오별 결과

| # | 시나리오 | 결과 | 비고 |
|---|----------|------|------|
| L-01 | writer 목록 조회 | **PASS** | |
| L-02 | writer create | **PASS** | PR #366 `sortOrder` omit 후 permission denied 해소 |
| L-03 | create 후 새로고침 persistence | **PASS** | |
| L-04 | writer update | **PASS** | |
| L-05 | update 후 새로고침 persistence | **PASS** | |
| L-06 | viewer read (live) | **미확인** | harness §6 only |
| L-07 | viewer create/update deny (live) | **미확인** | harness §6 B-06 **PASS** |
| L-08 | delete 미개방 (live) | **PASS** | visible + disabled; alert guard |
| L-09 | XSS/escape (live Firestore row) | **PASS** | harness §6 B-02 + live 표시 |
| L-10 | console 오류 없음 (authed) | **PASS** | |
| L-11 | `REQ_###` 표시 / raw id 미노출 | **PASS** | PR #367 |
| L-12 | 배경 create/update persistence | **PASS** | PR #367 |
| L-13 | 신규/수정 row 목록 최상단 | **PASS** | PR #367 latest sort |
| L-14 | `getState().items.length > 0` | **PASS** | PR #367 |

### Ready gate 판정

| 구분 | 상태 |
|------|------|
| Contract smoke (§3) | **PASS** |
| Browser harness — 제품 JS (§6) | **PASS** |
| Staging unauth redirect (§5) | **PASS** |
| **Maintainer writer live Firestore persistence (§10-3)** | **PASS** |
| Maintainer viewer live (§9 #8–9) | **미확인** (harness only) |
| **PR #364 최종** | **Ready 가능** |

Maintainer viewer live 세션(§9 #8–9) 확인 시 **Ready** 전환. writer persistence gate는 충족.

## 11. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS (페이지 기존) | `stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.requirements.css` 등 |
| 사용 JS (페이지 기존) | `stam.requirements-firestore-list.js`, `stam.requirements-firestore-crud.js`, `stam.requirements-service.js`, `stam.requirements-firestore-adapter.js` |
| 신규 CSS/JS (stam/) | **0건** |
| inline style/script (diff) | **없음** |
| 금지 경로 변경 | **없음** |

## 12. 산출물

| 파일 | 변경 |
|------|------|
| `docs/reports/STAM_PR363_Requirements_CRUD_Live_QA.md` | 본 리포트 |
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` | A3c live browser QA gate |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-17 PR #363 결정 |

## 13. 후속 PR

1. requirement delete (soft delete rules + UI + service authorize)
2. **PR #364 Ready** — maintainer writer live persistence **PASS** (§10-3); viewer live §9 #8–9 **미확인**
3. functionalSpecs / WBS / screenSpecs write 단계별 개방
