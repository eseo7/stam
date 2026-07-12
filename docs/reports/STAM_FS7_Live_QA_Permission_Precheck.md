# STAM FS-7 — Live QA Permission Precheck Report

> **상태 (2026-07-12):** 초기 BLOCKED-PERMISSION **해소 완료**. 최종 GHA run [`29188829543`](https://github.com/eseo7/stam/actions/runs/29188829543) — PRECHECK **PASS**, 전체 **18/18 PASS**. 본 문서는 **이력·IAM 결정 기록**용.

## 1. Run context (초기 BLOCKED run — 이력)

| 항목 | 값 |
|------|-----|
| workflow | `fs7-live-firestore-qa.yml` |
| run id | `29150397560` |
| git SHA | `c2684c0` |
| Firebase project | `stam-preview-hosting` |
| STAM project | `stam-demo` |
| secret source | `FIREBASE_SERVICE_ACCOUNT_STAM_PREVIEW_HOSTING` (boolean only) |
| artifact | `fs7-live-qa-report-29150397560` |

Runtime bootstrap (deps / Secret / Admin init): **PASS**  
CRUD checklist (W-01~W-12): **당시 미실행** — `PRECHECK-permission`에서 차단 → **최종 run `29188829543`에서 전부 PASS**

## 1a. 최종 해소 (run `29188829543`)

| 항목 | 값 |
|------|-----|
| workflow run | [`29188829543`](https://github.com/eseo7/stam/actions/runs/29188829543) |
| git SHA | `6caf36f` |
| executedAt | 2026-07-12T10:16:37.963Z (UTC) |
| PRECHECK-permission | **PASS** (`auth-custom-token` 포함) |
| summary | pass=18 / fail=0 / blocked=0 |
| artifact | `fs7-live-qa-report-29188829543` |

**해소 조치 (이력):**

1. Google Cloud Console — **IAM Service Account Credentials API** (`iamcredentials.googleapis.com`) 활성화 (run `29187518322` 진단)
2. B안 승인 IAM 역할 적용 (`firebaseauth.admin`, `serviceAccountTokenCreator`) — 상세 §5
3. 제품 결함 W-05~W-08 — PR #388 merge 후 재실행 PASS

## 2. Permission subcheck 결과 (초기 run `29150397560`)

| Subcheck | 결과 | 필요 권한 범주 (실패 시) |
|----------|------|--------------------------|
| `firestore-read-project` | **PASS** | — |
| `firestore-read-functional-specs` | **PASS** | — |
| `auth-custom-token` | **BLOCKED-PERMISSION** | Firebase Auth custom token 서명 (`iam.serviceAccounts.signBlob`) |
| `firestore-write-delete-probe` | **PASS** | — |

> 서비스 계정 이메일·private key·token·Secret JSON은 본 문서에 **기록하지 않음**.

## 3. 판정

- Firestore read/write/delete (`stam-demo`): **현재 Secret SA로 충족**
- 차단 원인: **Auth custom token 생성 권한만 부족**
- GCP Project **Owner** / **Editor** 부여 **불필요** (해당 범주로 분류하지 않음)

## 4. 계정 전략 — **B안 승인** (2026-07-12)

| 항목 | 결정 |
|------|------|
| 선택 | **B안** — 기존 `FIREBASE_SERVICE_ACCOUNT_STAM_PREVIEW_HOSTING` 재사용 |
| A안 (QA 전용 SA + `FS7_QA_SERVICE_ACCOUNT_JSON`) | **이번 단계 보류** |
| Secret 변경 | **없음** — 기존 Hosting secret 유지 |
| Production 프로젝트 | 접근 **금지** (변경 없음) |

Firestore subcheck는 이미 PASS. Hosting SA에 **Auth 관련 최소 권한만** Google Cloud Console에서 추가.

## 5. 승인된 최소 IAM (Maintainer — Console 적용)

적용 대상 프로젝트: **`stam-preview-hosting` only**  
Agent는 IAM을 **임의 적용하지 않음**.

| # | IAM 역할 | 적용 대상 | 목적 |
|---|----------|-----------|------|
| 1 | `roles/firebaseauth.admin` | Hosting 서비스 계정 (project) | `getUser` / `createUser` (agent UID bootstrap) |
| 2 | `roles/iam.serviceAccountTokenCreator` | Hosting 서비스 계정 **자기 자신** (SA 리소스, principal = 동일 SA) | `createCustomToken()` — custom token 서명 |

**이미 충족 (추가 불필요):** Firestore read / functionalSpecifications read / write-delete probe

### 명시적 금지

- `roles/owner`
- `roles/editor`
- 광범위 Firebase Admin / org-level superuser
- Production 프로젝트 권한
- 서비스 계정 JSON·이메일·private key를 PR·로그·채팅에 노출

## 6. Maintainer 체크리스트

- [x] IAM 변경 방향 승인 — **B안** (2026-07-12)
- [x] Google Cloud Console — IAM Service Account Credentials API 활성화
- [x] Google Cloud Console IAM 적용 (§5 두 역할)
- [x] `fs7-live-firestore-qa.yml` → `workflow_dispatch` 재실행 — 최종 run `29188829543` **SUCCESS**
- [x] Agent: artifact → `STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` §7-3 갱신
- [x] §7-4 Maintainer 대표 흐름 — **자동화 실증으로 대체 승인** (run `29188829543`)

## 7. 재실행 완료 조건 — **충족** (run `29188829543`)

1. `PRECHECK-permission` **PASS** ✅
2. W-01~W-12 + W-10b + V-01~V-03 실행 ✅
3. unlink 3키 absent (`hasOwnProperty` false) ✅
4. `CLEANUP` **PASS** ✅
5. artifact 생성 ✅
6. `STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` §7-3 갱신 ✅
7. §7-4 Maintainer 대표 흐름 — 자동화 실증으로 대체 승인 ✅

## 8. 관련

- `docs/reports/STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` §7-3
- `.github/workflows/fs7-live-firestore-qa.yml`
- `scripts/qa-fs7-live-persistence-agent.mjs`
