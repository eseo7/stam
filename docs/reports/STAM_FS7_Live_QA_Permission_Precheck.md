# STAM FS-7 — Live QA Permission Precheck Report

## 1. Run context

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
CRUD checklist (W-01~W-12): **미실행** — `PRECHECK-permission`에서 차단

## 2. Permission subcheck 결과

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
- [ ] Google Cloud Console IAM 적용 (§5 두 역할)
- [ ] `fs7-live-firestore-qa.yml` → `workflow_dispatch` 재실행
- [ ] Agent: artifact → `STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` §7-3 갱신
- [ ] 그 후 §7-4 Maintainer 대표 흐름 **1회**

## 7. 재실행 완료 조건

1. `PRECHECK-permission` **PASS**
2. W-01~W-12 + W-10b + V-01~V-03 실행
3. unlink 3키 absent (`hasOwnProperty` false)
4. `CLEANUP` **PASS**
5. artifact 생성
6. `STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` §7-3 갱신
7. 그 후 Maintainer 대표 흐름 1회 (§7-4)

## 8. 관련

- `docs/reports/STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` §7-3
- `.github/workflows/fs7-live-firestore-qa.yml`
- `scripts/qa-fs7-live-persistence-agent.mjs`
