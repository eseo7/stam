# STAM PR #351 — 1차 실제 구현 Gate & Auth/DB Inventory

## 1. 목적

PR #350(B5 inline cleanup 완료) 이후, STAM을 **정적 Preview / 문서 정리 단계**에서 **1차 실제 구현 단계**로 전환하기 위한 **Gate 기준서**와 **현황 조사 리포트**를 작성한다.

이 PR은 **문서 전용**이다. Auth / Firestore / 제품 코드 / rules / config **변경 없음**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` |
| head 기준 | `69abcf6` (PR #350 merge) |
| 선행 완료 | PR #350 — B5 `functional-specification.html` inline style 0건 |
| 신규 Gate 문서 | `docs/ops/STAM-Phase1-Implementation-Gate.md` |

## 3. 산출물

| 파일 | 성격 |
|------|------|
| `docs/ops/STAM-Phase1-Implementation-Gate.md` | **신규** — 1차 실제 구현 Gate 기준서 |
| `docs/reports/STAM_PR351_Phase1_Implementation_Gate.md` | **신규** — 본 PR 조사 리포트 |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | 결정 로그 1건 추가 |

## 4. 변경 파일 (docs-only)

```txt
docs/ops/STAM-Phase1-Implementation-Gate.md          (신규)
docs/reports/STAM_PR351_Phase1_Implementation_Gate.md (신규)
docs/ops/STAM-Decisions-and-Heuristics.md             (결정 로그 추가)
```

**미변경 확인 대상:**

```txt
stam/pages/**
stam/css/**
stam/js/**
firestore.rules
firebase.json
.firebaserc
.github/workflows/**
package.json
scripts/**
```

## 5. Firebase / Auth / Firestore 파일 인벤토리

조사 일시: PR #351 작성 시점, `main` @ `69abcf6`

### 5-1. 인프라 Config

| 파일 | 용도 | 1차 Gate 관련 |
|------|------|---------------|
| `firebase.json` | Hosting(`stam/`) + Firestore rules/indexes 경로 | 변경 금지 (별도 PR) |
| `.firebaserc` | default project `stam-preview-hosting`, staging site `stam-design-staging` | 변경 금지 |
| `firestore.rules` | deny-by-default + active-member read + `collectionGroup('members')` discovery; **all writes deny** | write 개방은 단계 1+ PR |
| `firestore.indexes.json` | composite indexes — 현재 **empty** | query 확장 시 별도 PR |

### 5-2. GitHub Workflows

| Workflow | 트리거 | 동작 |
|----------|--------|------|
| `firebase-hosting-staging.yml` | push `main`, manual | `stam/` → staging live channel |
| `firebase-hosting-pr-preview.yml` | PR → main | PR preview channel `pr{N}` |
| `firebase-firestore-rules-staging.yml` | manual | rules deploy only |
| `firebase-firestore-rules-pr-preview.yml` | PR (rules/indexes 변경) | rules auto-deploy preview |

### 5-3. Auth JS (`stam/js/`)

| 파일 | 역할 | Firebase API | Write |
|------|------|--------------|-------|
| `stam.auth-bootstrap.js` | Google sign-in/out, auth-state route guard | `firebase.auth()`, `signInWithPopup`, `onAuthStateChanged` | 없음 |
| `stam.auth-membership-gate.js` | Login 후 membership routing resolver | `firebase.firestore()`, `collectionGroup('members')` | 없음 |
| `stam.auth-project-list.js` | Active project 카드 목록 + Overview 진입 | Firestore read (`projects`, `members`) | 없음 |
| `stam.project-context-guard.js` | `projectId` URL/session guard | **없음** (client-only) | 없음 |
| `stam.project-overview-context.js` | Overview auth + membership verify | Firestore read | 없음 |

### 5-4. Firestore / Domain JS (`stam/js/`)

| 파일 | 역할 | Read | Write (runtime) |
|------|------|------|-----------------|
| `stam.requirements-service.js` | Requirement domain service contract | via adapter | API 존재, **rules block** |
| `stam.requirements-firestore-adapter.js` | Firestore boundary `projects/{id}/requirements/**` | ✓ | **rules deny** |
| `stam.requirements-firestore-list.js` | Requirements list UI read binding | ✓ | 없음 |
| `stam.requirements.js` | Requirements screen (list helper delegate) | ✓ | 없음 |

**미존재 (1차 우선 구현 대상, `요구사항정의서 → 기능정의서 → WBS → 화면설계서` 순서):**

- `stam.functional-spec-service.js` / `stam.functional-spec-firestore-adapter.js`
- `stam.wbs-service.js` / `stam.wbs-firestore-adapter.js`
- `stam.screen-spec-service.js` / adapter
- `stam.artifact-links-*`

### 5-5. Auth 제품 화면 (`stam/pages/auth/`)

| 파일 | `data-stam-auth-screen` | Firebase SDK |
|------|-------------------------|--------------|
| `login.html` | `login` | ✓ (reserved URLs) |
| `projects.html` | `project-select` | ✓ |
| `access-pending.html` | `access-pending` | ✓ |
| `access-denied.html` | `access-denied` | ✓ |
| `no-project.html` | `no-project` | ✓ |

공통 CSS: `stam.auth.css` (PR #303–#304 승인 도메인 CSS)

### 5-6. Firebase SDK 로드 제품 화면 (전체 7건)

| 화면 | 경로 |
|------|------|
| Auth 5화면 | `stam/pages/auth/*.html` |
| Project Overview | `stam/pages/dashboard/project-overview.html` |
| Requirements | `stam/pages/boards/requirements.html` |

SDK 패턴 (전 화면 공통):

```html
<script src="/__/firebase/8.10.1/firebase-app.js"></script>
<script src="/__/firebase/8.10.1/firebase-auth.js"></script>
<script src="/__/firebase/8.10.1/firebase-firestore.js"></script>
<script src="/__/firebase/init.js"></script>
```

**제품 코드에 `initializeApp` / `firebaseConfig` / `apiKey` 객체: 0건** (seed scripts 제외)

### 5-7. Seed Scripts (`scripts/`)

| Script | 용도 | 실행 주체 |
|--------|------|-----------|
| `seed-stam-demo-membership.mjs` | users / projects / members demo seed | Maintainer QA (Admin SDK) |
| `seed-stam-demo-requirements.mjs` | requirements demo seed | Maintainer QA (Admin SDK) |

### 5-8. Contract / QA Test Scripts

| Script | 검증 대상 |
|--------|-----------|
| `test-auth-entry-flow-contract.mjs` | Auth 5화면, Google login, 금지 문구, inline style 금지 |
| `test-project-context-guard-contract.mjs` | projectId guard, nav-data 미변경 |
| `test-project-overview-context-copy-contract.mjs` | Overview context copy / routing |
| `test-requirements-firestore-list-contract.mjs` | Requirements read-only list |
| `test-requirements-service-contract.mjs` | Service contract (fake adapter) |
| `test-requirements-empty-state-contract.mjs` | Empty state UI |
| `test-nav-live-dimmed-contract.mjs` | Live/Preview/Planned/Admin/Hidden menu IDs |
| `test-beta-seed-data-doc-contract.mjs` | Beta seed matrix doc structure |

### 5-9. 관련 Docs / Guides

| 문서 | PR / 성격 |
|------|-----------|
| `stam/docs/STAM-Phase-1-Productization-Scope.html` | #294 — canonical 1차 scope |
| `stam/docs/STAM-Auth-Project-Member-Data-Structure-Guide.html` | #295 — users/projects/members schema |
| `stam/docs/STAM-Firebase-Auth-Firestore-Rules-Baseline-Guide.html` | #297 — deny-by-default baseline |
| `stam/docs/STAM-Firestore-Project-Membership-Gate-Guide.html` | #298 — membership read gate |
| `stam/docs/STAM-Auth-Login-Flow-Preview.html` | Design Preview (§10 상태표 일부 outdated) |
| `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` | Beta QA matrix |
| `docs/ops/STAM-Phase1-Implementation-Gate.md` | **본 PR 신규 Gate** |

## 6. 현재 구현 성숙도 요약

| 레이어 | 상태 |
|--------|------|
| Google Auth + 5 auth routes | **동작 중** |
| Membership gate (read) | **동작 중** |
| Project select → Overview | **동작 중** |
| Project context guard | **동작 중** |
| Requirements Firestore read | **동작 중** (PR #314, #326 smoke PASS) |
| Requirements Firestore write | **미개방** (adapter만 존재) |
| 기능정의서 / WBS / Screen Spec Firestore | **미연결** |
| artifactLinks | **rules read gate만** |
| Role-based write rules | **미개방** |
| users client bootstrap | **미구현** |

## 7. 좌측 메뉴 상태 인벤토리

SSOT: `stam/js/stam.shell.js` → `stam.nav-render.js`

| 상태 | 메뉴 ID |
|------|---------|
| Live | A1, B1, B2, B3, B4 |
| Preview | B5, B8, B9, B10, C8, E7 |
| Admin | F3, F4, F11 |
| Hidden | B6, B7 |
| Planned | 나머지 |

1차 실제 구현 완료 시 목표: B1/B5/B3/B4를 **실제 Firestore CRUD Live**로 승격 (`요구사항정의서 → 기능정의서 → WBS → 화면설계서`). B2는 Preview 전환 검토.

## 8. Gate 문서 핵심 결정 (요약)

상세는 `docs/ops/STAM-Phase1-Implementation-Gate.md` 참조.

1. **1차 실제 구현 범위** — 요구사항정의서 / 기능정의서 / WBS / 화면설계서 4산출물 CRUD + artifactLinks 최소 연결
2. **Google 로그인** — 단일 provider, `firebaseConfig` 제품 코드 금지 유지
3. **Workspace 진입** — login → gate → projects → overview → 산출물 (projectId 유지)
4. **Firestore layout** — `projects/{projectId}/**` subcollections 채택
5. **Rules** — 단계 0(read) 완료 → 단계 1(requirements write) 우선
6. **Left Nav** — Live/Preview/Planned 구분 유지, CRUD 완료 시에만 Live 승격
7. **다음 PR 순서** — Requirements write rules + CRUD → 기능정의서 → WBS → 화면설계서 → artifactLinks → Gate 최종 QA

## 9. 검증

```bash
# 변경 파일이 docs-only인지 확인
git diff --name-only main...HEAD

# 금지 경로 미변경
git diff --name-only main...HEAD | rg '^(stam/|firestore|firebase|\.github|package)' && echo FAIL || echo PASS

# MVP 표현 미사용 (문서)
rg -i '\bMVP\b' docs/ops/STAM-Phase1-Implementation-Gate.md docs/reports/STAM_PR351_Phase1_Implementation_Gate.md
```

## 10. Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS | **0건** |
| inline style/script | **없음** |
| `stam/pages/**` 변경 | **없음** |
| `stam/js/**` 변경 | **없음** |
| `firestore.rules` 변경 | **없음** |
| `firebase.json` 변경 | **없음** |
| MVP 표현 | **미사용** |
| 금지 경로 변경 | **없음** |

## 11. 후속 PR (예상)

| 순서 | 작업 |
|------|------|
| 1 | Requirements write rules + CRUD UI |
| 2 | 기능정의서 service/adapter + read/write |
| 3 | WBS service/adapter + read/write |
| 4 | Screen spec service/adapter + CRUD |
| 5 | screenFields / screenActions |
| 6 | artifactLinks + users bootstrap |
| 7 | 1차 실제 구현 Gate 최종 QA |

---

**PR 성격:** docs-only Gate 고정. 구현은 후속 PR에서 `STAM-Phase1-Implementation-Gate.md` 기준으로 진행한다.
