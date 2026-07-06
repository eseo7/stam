# STAM PR #354 — Google Auth Skeleton

## 1. 목적

PR #353 Technical Plan 이후 **1차 실제 구현 첫 단계**로, Firebase Auth Google Provider 기반 **로그인/로그아웃 Skeleton**을 구현한다.

Firestore read/write, `users/{uid}` upsert, 프로젝트 목록/생성, membership gate 조회는 **후속 PR**로 분리한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `cc7c948` |
| 선행 문서 | `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` |
| SDK | Firebase compat v8.10.1, Hosting `/__/firebase/init.js` |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.auth.js` | **신규** — Google Auth skeleton API |
| `stam/pages/auth/login.html` | `stam.auth.js` 연결 |
| `stam/pages/auth/projects.html` | 사용자 정보 + skeleton 안내, `stam.auth.js` 연결 |
| `stam/pages/auth/access-pending.html` | `stam.auth.js` 연결 |
| `stam/pages/auth/access-denied.html` | `stam.auth.js` 연결 |
| `stam/pages/auth/no-project.html` | `stam.auth.js` 연결 |

**미변경 (의도적):**

- `stam/js/stam.auth-bootstrap.js` — 후속 정리 전까지 유지
- `stam/js/stam.auth-membership-gate.js` — contract test + 후속 membership PR
- `stam/js/stam.auth-project-list.js` — 후속 프로젝트 목록 PR
- `firestore.rules`, `firebase.json`, `package.json`, workflows

## 4. `STAM.auth` API

| 함수 | 동작 |
|------|------|
| `getCurrentUser()` | `firebase.auth().currentUser` 반환 |
| `requireAuth()` | 미인증 시 `login.html` redirect |
| `signInWithGoogle()` | `GoogleAuthProvider` + `signInWithPopup` |
| `signOut()` | sign-out 후 `login.html` |
| `renderAuthUser(user)` | `.stam-auth-state-card` 로그인 계정 표시 |

## 5. 라우팅 (Skeleton)

| 화면 | 미인증 | 인증됨 |
|------|--------|--------|
| `login` | 유지 | → `projects.html` |
| `project-select` | → `login.html` | skeleton 안내 표시 |
| `access-pending` / `access-denied` / `no-project` | → `login.html` | 사용자 정보 표시, Firestore 조회 없음 |

로그인 성공 시 **membership gate 없이** `projects.html`로 이동한다.

## 6. 검증

```bash
node scripts/test-auth-entry-flow-contract.mjs
node scripts/test-project-context-guard-contract.mjs

# Firestore 호출 없음 (classList.add 제외)
rg 'firestore|collectionGroup|\.collection\(' stam/js/stam.auth.js
```

## 7. Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS | **0건** |
| inline style/script | **없음** |
| `firebaseConfig` / `initializeApp` | **없음** |
| Firestore read/write | **없음** |
| `users/{uid}` upsert | **없음** |
| 금지 경로 (`boards/`, `dashboard/`, rules, package) | **미변경** |

## 8. 후속 PR (예상)

| 순서 | 작업 |
|------|------|
| A1 | `users/{uid}` bootstrap |
| A2 | membership gate + 프로젝트 목록 Firestore read |
| A3 | 프로젝트 생성 write |
