# STAM PR #355 — users/{uid} Bootstrap

## 1. 목적

PR #354 Google Auth Skeleton 이후, Google 로그인 성공 시 **`users/{uid}` Firestore 문서를 생성 또는 갱신**한다.

프로젝트 목록 조회, 프로젝트 생성, `members/{uid}` write는 **후속 PR**로 분리한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `b28f1fb` |
| 선행 | PR #354 Auth Skeleton, PR #353 Technical Plan §5 |
| SDK | Firebase compat v8.10.1 |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.auth.js` | `bootstrapUserDoc()` — login 시 users upsert |
| `firestore.rules` | `users/{uid}` self create/update rules (PR #355) |
| `docs/reports/STAM_PR355_Users_Bootstrap.md` | 본 리포트 |
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` | Rules 단계 1 완료 표기 |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | 결정 로그 추가 |

## 4. `users/{uid}` 계약

### 경로

```txt
users/{uid}    ← doc id == Firebase Auth uid
```

### Create (최초 로그인)

| 필드 | 값 |
|------|-----|
| `userId` | Auth uid |
| `email` / `emailNormalized` | Google profile |
| `displayName` / `photoURL` | Google profile (`photoURL` 없으면 `''`) |
| `provider` | `"google"` |
| `status` | `"active"` |
| `createdAt` / `updatedAt` / `lastLoginAt` | `serverTimestamp()` |

### Update (재로그인)

| 갱신 | 유지 |
|------|------|
| `email`, `emailNormalized`, `displayName`, `photoURL` | `userId`, `provider`, `status`, `createdAt` |
| `updatedAt`, `lastLoginAt` | |

## 5. Rules (PR #355)

| 동작 | 조건 |
|------|------|
| read | 본인 `users/{uid}` only |
| create | `isValidUserBootstrapCreate()` — whitelist keys, `status: active`, `provider: google` |
| update | `isValidUserBootstrapUpdate()` — profile + audit only, `status` 변경 금지 |
| delete | deny |

## 6. 클라이언트 흐름

```txt
onAuthStateChanged(user)
→ bootstrapUserDoc(user)   // users/{uid} get → set or update
→ renderAuthUser(user)
→ login screen이면 projects.html redirect
```

bootstrap 실패 시 login 화면에 안내 문구 표시, redirect 보류.

## 7. 미포함 (후속 PR)

- `collectionGroup('members')` membership gate routing
- 프로젝트 목록 Firestore read
- `projects/{projectId}` / `members/{uid}` write
- 산출물 CRUD

## 8. 검증

```bash
node scripts/test-auth-entry-flow-contract.mjs
node scripts/test-project-context-guard-contract.mjs

rg '\.collection\(' stam/js/stam.auth.js
# → users only

rg 'projects/|collectionGroup' stam/js/stam.auth.js
# → no matches
```

## 9. Governance

| 항목 | 결과 |
|------|------|
| Firestore scope | `users/{uid}` only |
| `firebaseConfig` / `initializeApp` | 없음 |
| auth 5 HTML 변경 | **없음** |
| `stam/pages/boards/**` 등 금지 경로 | **미변경** |
| package / workflow | **미변경** |

## 10. Rules 배포

`firestore.rules` 변경 포함. merge 후 staging rules deploy workflow 또는 maintainer 수동 배포 필요.

### PR Preview Rules Deploy 실패 분류 (Run `28792477329`)

| 분류 | 결과 |
|------|------|
| Firestore rules 문법/컴파일 | **해당 없음** — emulator compile PASS |
| rules 함수/변수 참조 | **보정** — `userId`를 helper 인자로 명시 전달 |
| deploy 권한/환경 | **원인** — `serviceusage.googleapis.com` 403 (`Permission denied to get service [firestore.googleapis.com]`) |
| Firebase project/target | `stam-preview-hosting` — deploy 단계 전 API check에서 차단 |

**조치 (infra, 본 PR 범위 외):** `FIREBASE_SERVICE_ACCOUNT_STAM_PREVIEW_HOSTING`에 Service Usage 조회 권한 부여, 또는 workflow에서 rules compile-only 검증 분리. `.github/workflows/**`는 본 보정 PR에서 수정하지 않음.

**로컬 rules compile 검증:**

```bash
npx -y firebase-tools@13.35.1 emulators:exec --only firestore --project demo-rules-compile "echo RULES_OK"
```

## 11. 조건부 merge · merge 후 조치

| 항목 | 내용 |
|------|------|
| merge 허용 | 코드/rules 범위 QA PASS, Hosting Preview PASS |
| merge 차단 아님 | Rules Deploy workflow FAIL (IAM 403) — **infra issue**, rules 문법 아님 |
| **merge 후 필수** | staging `firestore.rules` **별도 deploy** (`firebase-firestore-rules-staging.yml` 또는 maintainer CLI) |
| deploy 전 동작 | preview 환경에서 `users/{uid}` client write는 **기존 staging rules에 의해 deny** |

Rules Deploy PR preview workflow green은 infra 권한 수정 전까지 기대하지 않는다.
