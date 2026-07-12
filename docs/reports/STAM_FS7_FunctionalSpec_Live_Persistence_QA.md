# STAM FS-7 — Functional Specification Live Firestore Persistence QA

## 1. 목적

FS-5~FS-6B merge 이후 기능정의서 **실제 Firestore persistence**를 Agent 세션 + Maintainer 대표 흐름으로 증빙한다.

- create / update (요구사항 picker 연결·변경·해제 포함)
- FN_### counter 할당
- unlink 시 `requirementId` / `requirementCode` / `requirementTitle` **필드 제거** (빈 문자열·null 잔존 없음)
- viewer write 차단, delete 미개방

본 PR은 **live QA evidence PR** (docs-only)이며, 제품 `stam/js/**` · `firestore.rules` · pages/css **변경을 포함하지 않는다**.

> QA 실행 자동화(script + workflow)는 **PR #382** (`ci(fs-7): manual workflow_dispatch live Firestore QA runner`)에서 별도 관리한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `b09582e` (FS-6B picker #378 + empty-list fix #380 + legacy display/sort hotfix #381) |
| 선행 merge | FS-5 #374, FS-6A #377, FS-6B #378, picker race fix #380, legacy display + registration sort #381 |
| staging live | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| projectId | `stam-demo` |
| collection | `projects/{projectId}/functionalSpecifications/{functionalSpecId}` |
| counter | `projects/{projectId}/counters/functionalSpecifications` |
| 화면 | `stam/pages/boards/functional-specification.html` |

## 3. 사전 확인 (contract — maintainer 실행 전)

```bash
node scripts/test-functional-spec-service-contract.mjs
node scripts/test-functional-spec-crud-ui-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
node scripts/test-functional-spec-counter-contract.mjs
node scripts/test-functional-spec-role-matrix-contract.mjs
node scripts/test-requirement-picker-contract.mjs
node scripts/test-board-list-sort-contract.mjs
node scripts/test-functional-spec-registration-sort-regression.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/qa-fs6b-requirement-picker-browser-smoke.mjs
node scripts/qa-fs7-fn-sort-agent-live.mjs
```

| script | 기대 |
|--------|------|
| `test-functional-spec-service-contract.mjs` | PASS |
| `test-functional-spec-crud-ui-contract.mjs` | PASS |
| `test-functional-spec-list-contract.mjs` | PASS |
| `test-functional-spec-counter-contract.mjs` | PASS |
| `test-functional-spec-role-matrix-contract.mjs` | PASS |
| `test-requirement-picker-contract.mjs` | PASS |
| `test-board-list-sort-contract.mjs` | PASS |
| `test-functional-spec-registration-sort-regression.mjs` | PASS |
| `test-requirements-firestore-list-contract.mjs` | PASS |
| `qa-fs6b-requirement-picker-browser-smoke.mjs` | 15/15 PASS |
| `qa-fs7-fn-sort-agent-live.mjs` | L-01 Agent live PASS |

> Live Firestore checklist(W-01~W-12 + W-10b)는 **GitHub Actions** `fs7-live-firestore-qa.yml` (PR #382) 수동 실행 + artifact로 증빙한다. Cloud Agent는 Secret 값을 읽지 않는다.

## 4. QA 역할 분담

| 역할 | 담당 | 범위 |
|------|------|------|
| **Agent** | GitHub Actions (`fs7-live-firestore-qa.yml`) | W-01~W-12, W-10b, V-01~V-03 — Secret 주입 후 `qa-fs7-live-persistence-agent.mjs` 실행. artifact에 PASS/FAIL/BLOCKED + before/after 필드 증빙 |
| **Maintainer** | 사람 1회 | 대표 사용자 흐름만: 등록 → 요구사항 연결 → 저장 → 다시 열기 → 연결 해제 → 저장 → 새로고침 |

### QA 계층

| 계층 | 방법 | live 판정 |
|------|------|-----------|
| A. Contract smoke | §3 Node scripts | 선행 조건 |
| B. Browser shim | `qa-fs6b-requirement-picker-browser-smoke.mjs` | **live 대체 불가** |
| C. Agent live Firestore | GHA `workflow_dispatch` → `fs7-live-firestore-qa.yml` (PR #382) | **W-01~W-12 + W-10b 본 PR 목표** |
| D. Maintainer smoke | 대표 흐름 1회 (§5-2) | Ready gate 보조 |

## 5. Agent live persistence — 실행 절차

### 사전 조건 (GitHub Actions — PR #382 merge 후)

1. Repo secret 설정: `FS7_QA_SERVICE_ACCOUNT_JSON` (권장) 또는 `FIREBASE_SERVICE_ACCOUNT_STAM_PREVIEW_HOSTING`
2. Actions → **FS-7 Live Firestore QA** → **Run workflow** (`workflow_dispatch`)
3. Artifact `fs7-live-qa-report-<run_id>` 다운로드 → §7-3 반영

```bash
# Maintainer/Agent (Secret 값 미노출)
gh workflow run fs7-live-firestore-qa.yml --ref main
gh run list --workflow=fs7-live-firestore-qa.yml --limit 1
```

- Workflow: `.github/workflows/fs7-live-firestore-qa.yml`
- Script: `scripts/qa-fs7-live-persistence-agent.mjs` (PR #382)
- Firebase project: `stam-preview-hosting` only
- STAM projectId: `stam-demo`
- Agent UID: `fs7-agent-qa-b31c`
- Secret은 Actions 런타임에만 주입 — 로그/artifact/PR에 JSON 출력 **금지**

### 5-1. Agent Writer checklist (W-01~W-12 + W-10b)

| # | 시나리오 | UI 확인 | Firestore 확인 | 결과 |
|---|----------|---------|----------------|------|
| W-01 | maintainer 로그인 후 기능정의서 화면 진입 | 목록 로드 | — | PASS |
| W-02 | 요구사항 **선택** 후 기능 등록 | picker `REQ_### · title` 표시 | doc에 `requirementId`, `requirementCode`, `requirementTitle` **3필드 존재** | PASS |
| W-03 | 새로고침 후 W-02 등록 유지 | list/detail chip `REQ_###` | 동일 doc 필드 유지 | PASS |
| W-04 | FN_### code 자동 부여 | 목록/상세 `FN_###` | `code` 필드 + counter `lastNumber` 증가 | PASS |
| W-05 | 다른 요구사항으로 **변경** (update) | picker·chip 갱신 | 3필드 **동시** 새 값 | PASS |
| W-06 | 새로고침 후 W-05 유지 | UI 일치 | Firestore 일치 | PASS |
| W-07 | 요구사항 **연결 해제** (update) | chip `연결 필요` / detail 미표시 | doc에서 3필드 **키 자체 없음** (빈 문자열·null **아님**) | PASS |
| W-08 | 새로고침 후 W-07 유지 | unlink 상태 유지 | 3필드 여전히 없음 | PASS |
| W-09 | 미연결 등록 (picker 미선택) | 연결 chip 없음 | 3필드 **omit** (키 없음) | PASS |
| W-10 | raw Firestore doc id UI 미노출 | picker/list/detail에 doc id 문자열 없음 | `requirementId`는 저장만 (UI 미노출) | PASS |
| W-10b | legacy code 없는 요구사항 연결 표시 (#381) | list/detail **제목만** chip (raw id 미노출) | `requirementTitle` 존재, `requirementCode` 없음 허용 | PASS |
| W-11 | delete 미개방 | toolbar/detail delete disabled + alert | `allow delete: false` (rules) | PASS |
| W-12 | console fatal error 없음 | DevTools | — | PASS |

### 5-2. Maintainer 대표 흐름 (1회)

| 단계 | 확인 |
|------|------|
| 1 | 기능 등록 drawer 열기 |
| 2 | 요구사항 picker에서 항목 선택 → `REQ_### · 제목` 표시 |
| 3 | 저장 → 목록/상세 chip 확인 |
| 4 | 행 다시 열기 → 연결 유지 |
| 5 | 수정 drawer에서 **연결 없음** 선택 → 저장 |
| 6 | 새로고침 → unlink UI 유지 |
| 7 | (선택) Firestore Console에서 3필드 absent 스팟 체크 |

> Maintainer는 W-01~W-12 전체 수동 QA **불필요**. Agent script 증빙이 SSOT.

### Viewer checklist (Agent — V-01~V-03)

| # | 시나리오 | 기대 | 결과 |
|---|----------|------|------|
| V-01 | 목록 조회 | read OK | PASS |
| V-02 | 등록/수정 버튼 | **disabled** | PASS |
| V-03 | delete 버튼 | disabled + alert | PASS |

### Firestore unlink 검증 (W-07 필수)

Console에서 대상 `functionalSpecifications` 문서를 열고 아래를 확인한다.

1. `requirementId` 키 **없음**
2. `requirementCode` 키 **없음**
3. `requirementTitle` 키 **없음**
4. 빈 문자열 `""` 또는 `null` 값으로 남아 있지 **않음**
5. 다른 필드(`title`, `code`, `version` 등)는 정상 유지

```txt
# 기대 (unlink 후) — 연결 관련 키 자체가 absent
{
  "id": "...",
  "code": "FN_###",
  "title": "...",
  ...
  // requirementId / requirementCode / requirementTitle 없음
}
```

## 6. 기능 계약 (live 판정 기준)

| 계약 | live PASS 조건 |
|------|----------------|
| 연결 저장 | 3필드 모두 존재 |
| 연결 변경 | 3필드 동시 갱신 |
| 연결 해제 | 3필드 모두 **delete** (키 absent) |
| 부분 잔존 | **FAIL** — 일부만 있거나 빈 문자열 잔존 |
| 표시 | `REQ_###` 또는 legacy title only — raw doc id UI 미노출 (#381) |
| 목록 정렬 | `createdAt` DESC → code DESC → id DESC; `updatedAt` 정렬 **금지** (#381) |
| FN counter | `FN_###` 할당, counter 증가 |
| delete | UI·rules 미개방 |

## 7. Maintainer live QA 결과

### 7-1. PR #380 picker load fix (Preview live — 2026-07-10 UTC)

| 항목 | 값 |
|------|-----|
| PR | #380 — empty-list race fix |
| QA URL | `https://stam-design-staging--pr380-hxf3xupc.web.app/pages/boards/functional-specification.html?projectId=stam-demo` |
| 판정 | **PASS** (picker load blocker 해소) |

| 확인 | 결과 |
|------|------|
| 새로고침 후 등록 Drawer picker 로드 | **PASS** |
| `연결 없음` 외 실제 요구사항 목록 | **PASS** |
| 선택값 표시 | **PASS** |
| `REQ_### · 제목` 형식 | **PASS** |
| raw Firestore doc id UI 미노출 | **PASS** |
| open/load race 재현 | **PASS** (미재현) |
| console fatal error | **PASS** (없음) |

> 본 PASS는 **picker 목록 로드** 검증이다. FS-7 전체 checklist(W-02 Firestore persistence ~ W-12)는 **staging live**에서 이어서 진행한다.

### 7-2. PR #381 merge — legacy display + registration sort (main @ `b09582e`)

| 항목 | 값 |
|------|-----|
| PR | #381 — legacy requirement display + stable registration sort (L-01) |
| merge | squash → `b09582e` |
| Preview workflow | **SUCCESS** |
| mergeStateStatus | **CLEAN** |

| 확인 | 결과 |
|------|------|
| L-01 기존 live FAIL (FN row order flip) | **해소** |
| Agent live 반복 검증 (`qa-fs7-fn-sort-agent-live.mjs`) | **PASS** |
| `createdAt` update 시 불변 | **확인** |
| `updatedAt` 목록 정렬 제거 | **적용** |
| render 방어 정렬 + stale load guard | **적용** |
| 공통 helper (`STAMBoardList.sortByBoardRegistration`) | requirements + functional-spec list 반영 |

> Maintainer 수동 QA 없이 merge 진행. 상세 root cause: `docs/reports/STAM_FS7_PR381_Sort_Flip_RootCause.md`

### 7-3. Agent live checklist — **최종 PASS** (GHA run `29188829543`)

| 항목 | 값 |
|------|-----|
| 수행 주체 | **GitHub Actions** — `fs7-live-firestore-qa.yml` |
| QA URL | `https://stam-design-staging.web.app/pages/boards/functional-specification?projectId=stam-demo` |
| 검증 범위 | **실제 staging** Firestore (`stam-preview-hosting` / `stam-demo`) + Playwright 브라우저 UI |
| base | `main` @ `6caf36f` (PR #388 requirement link/unlink fix 포함) |
| workflow run | [`29188829543`](https://github.com/eseo7/stam/actions/runs/29188829543) |
| workflow 시작 | 2026-07-12T10:15:21Z (UTC) |
| QA 실행 완료 | 2026-07-12T10:16:37.963Z (UTC) — artifact `executedAt` |
| job 완료 | 2026-07-12T10:16:41Z (UTC) |
| secret source | `FIREBASE_SERVICE_ACCOUNT_STAM_PREVIEW_HOSTING` |
| artifact | `fs7-live-qa-report-29188829543` (**업로드 SUCCESS**) |
| exit code | **0** |

#### Summary

| 항목 | 결과 |
|------|------|
| PRECHECK-permission | **PASS** |
| W-01 ~ W-12 | **PASS** |
| W-10b | **PASS** |
| V-01 ~ V-03 | **PASS** |
| CLEANUP | **PASS** (test doc 3건 삭제) |
| **합계** | **pass=18 / fail=0 / blocked=0** |

#### 핵심 실증 (staging Firestore + UI)

| ID | 결과 | 증빙 요약 |
|----|------|-----------|
| W-02 | PASS | linked create — `requirementId` + `requirementCode` + `requirementTitle` 3키 존재 |
| W-05 | PASS | requirement A→B 변경 — before `REQ_002` → after `REQ_001` (3키 동시 갱신) |
| W-06 | PASS | refresh 후 변경 링크 유지 |
| W-07 | PASS | unlink — `keysAbsent: [requirementId, requirementCode, requirementTitle]` |
| W-08 | PASS | refresh 후 unlink 유지 — 3키 여전히 absent |
| W-09 | PASS | unlinked create — 3키 omit |
| W-10b | PASS | legacy title-only 표시 |

> W-05~W-08은 run `29188331795`에서 **제품 결함**으로 FAIL했으나, PR #388 (`6caf36f`) 수정 후 본 최종 run에서 **전부 PASS** 실증.

#### Permission / 제품 결함 이력 (참고 — 현재 blocker 아님)

| run | SHA | 결과 | 비고 |
|-----|-----|------|------|
| `29150397560` | `c2684c0` | PRECHECK **BLOCKED-PERMISSION** (`auth-custom-token`) | bootstrap PASS, W-* 미실행 |
| `29187518322` | `2a29795` | PRECHECK **BLOCKED-PERMISSION** | `iamcredentials.googleapis.com` API 비활성 — [진단](STAM_FS7_Auth_Permission_Diagnostic.md) |
| `29188331795` | `84a52d3` | W-05~W-08 **FAIL** | edit `prefillEdit` race — [root cause](STAM_FS7_Update_Link_RootCause.md) |
| `29188829543` | `6caf36f` | **18/18 PASS** | IAM Service Account Credentials API 활성화 + PR #388 반영 후 최종 성공 |

상세 permission precheck 이력: `docs/reports/STAM_FS7_Live_QA_Permission_Precheck.md`

### 7-3a. Agent live checklist — 초기 BLOCKED run (이력, run `29150397560`)

| 항목 | 값 |
|------|-----|
| workflow run | `29150397560` |
| base | `main` @ `c2684c0` |
| artifact | `fs7-live-qa-report-29150397560` |

#### Bootstrap (PASS)

| 단계 | 결과 |
|------|------|
| Install QA runtime dependencies | **PASS** |
| Secret presence check | **PASS** |
| Firebase Admin modular init | **PASS** |
| Credentials temp file | **PASS** |

#### PRECHECK-permission (당시 BLOCKED — **해소됨**)

| Subcheck | 당시 결과 | 최종 run `29188829543` |
|----------|-----------|------------------------|
| `firestore-read-project` | PASS | PASS |
| `firestore-read-functional-specs` | PASS | PASS |
| `auth-custom-token` | BLOCKED-PERMISSION | **PASS** |
| `firestore-write-delete-probe` | PASS | PASS |

**해소:** Google Cloud Console에서 **IAM Service Account Credentials API** (`iamcredentials.googleapis.com`) 활성화. B안 IAM 역할(`firebaseauth.admin`, `serviceAccountTokenCreator`) 승인·적용 이력은 `STAM_FS7_Live_QA_Permission_Precheck.md` 참고.

> **현재 blocker 아님.** 아래 "미실행" 표는 초기 run 기록이며, 최종 run `29188829543`에서 전 항목 실행·PASS.

#### Writer / Viewer (초기 run — 미실행, 이력)

| ID | 당시 결과 | 최종 run |
|----|-----------|----------|
| W-01 ~ W-12 | 미실행 (permission precheck 차단) | **PASS** |
| W-10b | 미실행 | **PASS** |
| V-01 ~ V-03 | 미실행 | **PASS** |
| CLEANUP | 미실행 | **PASS** |

### 7-4. Maintainer 대표 흐름 — **자동화 실증으로 대체 승인**

| 항목 | 값 |
|------|-----|
| 수행 주체 | Maintainer **별도 수동 재검증 면제** |
| 대체 근거 | 최종 GHA run `29188829543`이 **실제 staging 브라우저**에서 §5-2 대표 흐름을 포함한 전체 checklist **18/18 PASS** |
| Maintainer 확인 | 성공 run 로그·artifact 직접 확인 완료 |
| 판정 | **자동화 실증으로 대체 승인** (검증 생략이 아님 — 동일 시나리오를 Agent가 staging Firestore+UI에서 실행·증빙) |

§5-2 대표 흐름 매핑:

| §5-2 단계 | GHA 증빙 |
|-----------|----------|
| 등록 → 요구사항 연결 → 저장 | W-02 |
| 목록/상세 chip 확인 | W-02, W-03 |
| 행 다시 열기 → 연결 유지 | W-03, W-06 |
| 수정 drawer 연결 해제 → 저장 | W-07 |
| 새로고침 → unlink UI 유지 | W-08 |
| Firestore 3필드 absent | W-07, W-08 (`keysAbsent` 증빙) |

## 8. 종합 판정 — **FS-7 종료**

| 영역 | 판정 |
|------|------|
| Contract + shim smoke (§3) | **PASS** |
| PR #380 picker load (preview live) | **PASS** |
| PR #381 legacy display + sort (Agent live L-01) | **PASS** |
| Agent live W-01~W-12 + W-10b + V-01~V-03 + CLEANUP | **PASS** — run `29188829543`, **18/18** |
| Maintainer 대표 흐름 (§7-4) | **자동화 실증으로 대체 승인** |
| Unlink 필드 실제 제거 (live) | **PASS** — W-07/W-08, 3키 absent (`FieldValue.delete()`) |
| 제품 결함 W-05~W-08 | **해소** — PR #388 merge 후 최종 run PASS |

**FS-7 PR #379 merge 조건 (충족):**

1. GHA `fs7-live-firestore-qa.yml` → W-01~W-12 + W-10b + V-01~V-03 + CLEANUP **전부 PASS** ✅
2. §7-4 Maintainer 대표 흐름 — **자동화 실증으로 대체 승인** ✅
3. §7-3 GHA artifact before/after 증빙 기입 ✅
4. Preview workflow **SUCCESS** ✅
5. mergeStateStatus **CLEAN** ✅
6. Draft → **Ready** → squash merge

**최종 workflow:** run [`29188829543`](https://github.com/eseo7/stam/actions/runs/29188829543) @ `6caf36f` — exit code 0, artifact `fs7-live-qa-report-29188829543` 업로드 완료.

| 신규·갱신 파일 (본 PR) | `docs/reports/STAM_FS7_FunctionalSpec_Live_Persistence_QA.md`, `docs/reports/STAM_FS7_Live_QA_Permission_Precheck.md` |

## 9. Governance

| 항목 | 결과 |
|------|------|
| `stam/js/**` | **변경 없음** |
| `stam/css/**` | **변경 없음** |
| `firestore.rules` | **변경 없음** |
| `stam/pages/**` | **변경 없음** |
| 신규 파일 (본 PR) | `docs/reports/STAM_FS7_FunctionalSpec_Live_Persistence_QA.md`, `docs/reports/STAM_FS7_Live_QA_Permission_Precheck.md` |
| QA automation (별도 PR #382) | `scripts/qa-fs7-live-persistence-agent.mjs`, `.github/workflows/fs7-live-firestore-qa.yml` |

## 10. 관련 문서

- `docs/reports/STAM_FS5_FunctionalSpec_CRUD_UI_QA.md` — CRUD wiring
- `docs/reports/STAM_FS6A_FunctionalSpec_FN_Code_Counter_QA.md` — FN counter
- `docs/reports/STAM_FS6B_FunctionalSpec_Requirement_Picker_QA.md` — picker + shim smoke
- `docs/reports/STAM_FS6B_Picker_Empty_List_RootCause.md` — picker race root cause (#380)
- `docs/reports/STAM_FS7_Legacy_Requirement_Display_Hotfix_QA.md` — legacy display hotfix (#381)
- `docs/reports/STAM_FS7_PR381_Sort_Flip_RootCause.md` — L-01 FN row flip root cause (#381)
- `docs/reports/STAM_Board_List_Registration_Sort_QA.md` — registration sort contract (#381)
- `docs/reports/STAM_FS7_Live_QA_Permission_Precheck.md` — GHA run #29150397560 IAM 판정 (이력)
- `docs/reports/STAM_FS7_Auth_Permission_Diagnostic.md` — IAM Credentials API 진단
- `docs/reports/STAM_FS7_Update_Link_RootCause.md` — W-05~W-08 제품 결함 root cause (PR #388)
