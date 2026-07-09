# STAM Auth / Firestore / Workspace Technical Plan

> **문서 성격:** 운영 기술 기준서 (docs-only)  
> **기준 main:** PR #351 merge 이후 (`a005a0d`)  
> **선행 Gate:** `docs/ops/STAM-Phase1-Implementation-Gate.md` (PR #351)  
> **관련 canonical scope:** `stam/docs/STAM-Phase-1-Productization-Scope.html`

---

## 1. 목적

본 문서는 PR #351에서 확정한 **1차 실제 구현 Gate**를 실제 **Auth / Firestore / Workspace** 구현으로 연결하기 위한 **기술 기준 문서**이다.

| 항목 | 내용 |
|------|------|
| 문서 역할 | 구현 전 기준 고정 — 데이터 계약, 진입 흐름, Rules 단계, 후속 PR 순서 |
| 선행 문서 | `STAM-Phase1-Implementation-Gate.md` — 범위·순서·완료 조건 |
| 본 문서가 다루는 것 | Auth bootstrap, `users/{uid}`, 프로젝트·멤버십, `projectId` Workspace 격리, Firestore layout, Rules 롤아웃 |
| 본 문서가 다루지 않는 것 | 제품 HTML/CSS/JS 수정, `firestore.rules` 배포, Firebase Console 설정 변경 |

**이 문서는 구현 전 기준 문서이며, 실제 코드·Rules·Firebase 설정 변경은 후속 PR에서 진행한다.**

---

## 2. 1차 로그인 범위

### 2-1. 포함 (In Scope)

| 영역 | 1차 기술 기준 |
|------|---------------|
| **Provider** | Firebase Auth **Google Provider** 단일 (`signInWithPopup` + `GoogleAuthProvider`) |
| **로그인** | Google 로그인 성공 / 실패 / 취소 분기 |
| **로그아웃** | sign-out → `login.html` |
| **사용자 정보 표시** | 로그인 계정 이메일·표시명 (auth 5화면 공통) |
| **`users/{uid}`** | Google 로그인 직후 **생성 또는 갱신** (`email`, `emailNormalized`, `displayName`, `photoURL`, `status`, audit) |
| **프로젝트 목록** | active membership 기준 **내 프로젝트 목록** 진입 (`projects.html`) |
| **프로젝트 생성** | 로그인 사용자가 신규 프로젝트 생성 시 **생성자를 `owner` + `active` member**로 등록 |
| **프로젝트 선택** | 선택한 `projectId`를 URL·session에 유지 후 Workspace 진입 |
| **SDK 초기화** | Hosting reserved URL `/__/firebase/init.js` — 제품 코드에 `firebaseConfig` / `initializeApp` **금지** |
| **SDK 버전** | Firebase compat **v8.10.1** (`firebase-app`, `firebase-auth`, `firebase-firestore`) |

### 2-2. 제외 (Out of Scope)

| 영역 | 후속 |
|------|------|
| 이메일/비밀번호 로그인 | 2차 이후 |
| 회원가입 폼 | Google only — 공개 가입 없음 |
| 비밀번호 찾기 | 2차 이후 |
| 초대 메일 / 초대 링크 | 2차 이후 — 1차는 Admin 수동 멤버 등록 또는 프로젝트 생성자 owner |
| 조직/팀 멤버 초대 UI | 2차 이후 |
| 세부 역할/권한 관리 UI | 2차 이후 — 1차는 4 role read/write gate만 |
| 문서/버튼/필드 단위 권한 구현 | 2차 이후 |
| 카카오/네이버 등 추가 OAuth | 미계획 (Gate 유지) |

---

## 3. 2차 이후 확장 범위

아래는 1차에서 **구현하지 않으나**, 1차 Firestore 구조가 막지 않도록 설계한다.

| 영역 | 2차 이후 목표 |
|------|---------------|
| 이메일/비밀번호 로그인 | Firebase Email/Password Provider |
| 비밀번호 찾기 | Auth reset flow + 안내 화면 |
| 프로젝트 초대 | `projectInvites` collection, 초대 메일/링크 |
| 초대 수락 | invite token → member doc `pending` → `active` |
| 팀/조직 Workspace | `tenants/{tenantId}` 관리 UI, 조직 전환 |
| member/role 기반 권한 | Owner / Admin / Editor / Viewer 세부 action matrix |
| 산출물 접근권한 | role + status 조합별 collection/action gate |
| 문서/버튼/필드 단위 권한 | `screenFields` / `screenActions` 권한 엔진 |

**1차 Firestore layout(`projects/{projectId}/**` subcollections, `members/{uid}` canonical path, `tenantId` 필드 유지)은 2차 확장을 막지 않도록 설계한다.** 구조 변경이 필요하면 본 문서 또는 Gate 문서를 먼저 갱신한 뒤 구현한다.

---

## 4. 로그인 후 진입 흐름

### 4-1. Golden Path (고정)

```txt
Google 로그인
→ users/{uid} 생성 또는 갱신
→ 내 프로젝트 목록
→ 프로젝트 생성 또는 선택
→ 선택된 projectId 기준 제품 화면 진입
→ 산출물 데이터는 projectId 기준으로 격리
```

### 4-2. 상세 단계

| 단계 | 동작 | Firestore / Client |
|------|------|-------------------|
| 1 | `login.html` — Google 로그인 | `signInWithPopup` |
| 2 | Auth state 확정 | `onAuthStateChanged` |
| 3 | `users/{uid}` upsert | create 또는 profile/`updatedAt`/`lastLoginAt` 갱신 (**PR #355** 완료) |
| 4 | Membership gate | `users/{uid}` read + `collectionGroup('members')` discovery (**PR #356** 완료) |
| 5 | 라우팅 분기 | active ≥ 1 → `projects.html`; pending → `access-pending.html`; denied/removed/disabled → `access-denied.html`; 없음 → `no-project.html` (**PR #356** 완료) |
| 6 | 프로젝트 목록 | active member 프로젝트만 카드 표시 (**PR #356** read 완료) |
| 7 | 프로젝트 생성 **또는** 선택 | 생성 시 `projects/{projectId}` + `members/{uid}` owner/active 동시 생성 (생성은 후속) |
| 8 | Workspace 진입 | `project-overview.html?projectId={id}` |
| 9 | 산출물 화면 | URL `?projectId=` + `sessionStorage` 유지, 모든 query는 `projects/{projectId}/**` scoped |

### 4-3. 분기 화면 (auth 5화면)

| 화면 | 파일 | `data-stam-auth-screen` | 진입 조건 |
|------|------|-------------------------|-----------|
| 로그인 | `stam/pages/auth/login.html` | `login` | 미인증 |
| 프로젝트 선택 | `stam/pages/auth/projects.html` | `project-select` | active membership ≥ 1 |
| 접근 승인 대기 | `stam/pages/auth/access-pending.html` | `access-pending` | pending only, active 없음 |
| 접근 거부 | `stam/pages/auth/access-denied.html` | `access-denied` | denied / removed / user disabled |
| 프로젝트 없음 | `stam/pages/auth/no-project.html` | `no-project` | membership record 없음 |

### 4-4. Membership gate 우선순위

`stam.auth-membership-gate.js` — `resolveTargetFromMembership` 기준 (변경 없음):

1. `users/{uid}.status == disabled` → **access-denied**
2. membership 중 **하나라도** `status == active` → **project-select**
3. active 없고 **pending** 존재 → **access-pending**
4. active/pending 없고 **denied** 또는 **removed** → **access-denied**
5. 해당 없음 → **no-project**

### 4-5. 프로젝트 1개여도 선택 구조 유지

active 프로젝트가 1개뿐이어도 **자동 skip 금지**. 다중 프로젝트·다중 멤버십을 전제로 URL·session·guard 계약을 유지한다.

---

## 5. `users/{uid}` 기술 계약

### 5-1. 문서 경로

```txt
users/{userId}    ← doc id == Firebase Auth uid
```

### 5-2. 필수 필드

| 필드 | 타입 | 비고 |
|------|------|------|
| `userId` | string | == doc id == Auth uid |
| `email` | string | Google account |
| `emailNormalized` | string | lowercase trim — membership discovery 보조 |
| `displayName` | string | Google profile |
| `photoURL` | string | optional |
| `provider` | string | 1차: `"google"` |
| `status` | string | `active` / `disabled` |
| `createdAt` | timestamp | 최초 생성 시 |
| `updatedAt` | timestamp | 재로그인 갱신 시 |

### 5-3. Upsert 규칙

| 상황 | 동작 |
|------|------|
| 최초 Google 로그인 | `users/{uid}` **create** — Google profile + `status: active` |
| 재로그인 | `displayName`, `photoURL`, `email`, `emailNormalized`, `updatedAt` **갱신** |
| `status: disabled` | membership이 active여도 **access-denied** (gate 우선) |

### 5-4. Rules (현재 → 목표)

| 단계 | read | write |
|------|------|-------|
| **완료** (PR #355) | 본인 `users/{uid}` only | 본인 doc create/update — field whitelist, `status` client 변경 금지 |

---

## 6. 프로젝트 생성 · Owner 처리

### 6-1. 프로젝트 문서

```txt
projects/{projectId}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| `projectId` | string | == doc id |
| `tenantId` | string | 기본 tenant (`stam` 등) — 2차 조직 확장 대비 |
| `name` | string | 표시명 |
| `projectName` | string | `name` mirror (기존 UI fallback) |
| `status` | string | `active` / `archived` |
| `ownerUserId` | string | 생성자 Auth uid |
| `createdAt` / `updatedAt` | timestamp | |
| `createdBy` | string | 생성자 uid |

### 6-2. 생성자 Owner 멤버십 (동시 생성)

프로젝트 생성 시 **반드시** 아래를 한 트랜잭션(또는 동등한 원자성)으로 처리한다.

```txt
projects/{projectId}/members/{uid}
```

| 필드 | 값 |
|------|-----|
| doc id | == Firebase Auth `uid` |
| `userId` | == uid |
| `projectId` | == parent project id |
| `email` / `emailNormalized` | 로그인 Google 계정 |
| `displayName` | users doc 또는 Google profile |
| `role` | **`owner`** |
| `status` | **`active`** |
| `joinedAt` | timestamp |

### 6-3. Owner 판정 기준

| 기준 | 설명 |
|------|------|
| **Canonical** | `projects/{projectId}/members/{uid}.role == "owner"` |
| **보조** | `projects/{projectId}.ownerUserId == uid` (조회·표시용) |
| **다중 owner** | 1차에서는 **생성자 1인 owner**만 자동 부여. 추가 owner는 Admin 수동 또는 2차 초대 |

### 6-4. 기존 멤버 초대 없이 접근하는 사용자

Admin이 `members/{uid}`를 수동 등록한 사용자는 **프로젝트 생성 없이** 목록·선택만으로 진입한다 (현재 beta 동작 유지). 1차에서 두 경로를 모두 지원한다.

```txt
경로 A: 신규 사용자 → 프로젝트 생성 → owner/active member 자동 등록
경로 B: 초대·등록된 사용자 → active member → 프로젝트 선택만
```

---

## 7. Firestore Layout (Canonical)

PR #351 Gate 및 `firestore.rules` / PR #298 기준 — **변경 없이 채택**.

```txt
users/{userId}
tenants/{tenantId}                              ← rules fully closed (1차)
projects/{projectId}
projects/{projectId}/members/{uid}              ← doc id == Auth uid
projects/{projectId}/requirements/{requirementId}
projects/{projectId}/functionalSpecifications/{functionalSpecId}
projects/{projectId}/wbsItems/{wbsItemId}
projects/{projectId}/screenSpecs/{screenSpecId}
projects/{projectId}/screenFields/{fieldId}
projects/{projectId}/screenActions/{actionId}
projects/{projectId}/artifactLinks/{linkId}
```

| 원칙 | 내용 |
|------|------|
| Membership path | 논리 `projectMembers` → 물리 `projects/{projectId}/members/{uid}` |
| Authorization | project data read/write는 **uid 기반** active member — email alone 금지 |
| Discovery | login routing만 `collectionGroup('members')` + `userId` / `emailNormalized` |
| Tenant | `tenantId` 필드 유지, `tenants/**` rules closed |
| Deferred | `projectInvites`, `changeLogs` — 2차 |

산출물 스키마 상세: `docs/ops/STAM-Phase1-Implementation-Gate.md` §4-2, `stam/docs/STAM-Auth-Project-Member-Data-Structure-Guide.html`

---

## 8. Workspace · `projectId` 격리

### 8-1. Primary Key

| 항목 | 기준 |
|------|------|
| Workspace 식별자 | `projectId` (Firestore `projects/{projectId}`) |
| 산출물 격리 | 모든 CRUD query는 `projects/{projectId}/<collection>/...` scoped |
| cross-project | 1차 **금지** — collectionGroup 전역 검색 deferred |

### 8-2. Client Context 계약

| 항목 | 기준 |
|------|------|
| URL | `?projectId={id}` query param |
| Session | `sessionStorage['stam:selectedProjectId']`, `stam:selectedProjectName` |
| Guard | `STAM.projectContextGuard` — non-auth 제품 화면에서 `projectId` 없으면 `projects.html` redirect |
| Nav link | `STAM.projectContextGuard.withProjectId(href)` 로 projectId 전파 |
| Overview 검증 | `stam.project-overview-context.js` — active member + project doc 존재 |

### 8-3. DB 연결 순서 (산출물)

Gate 고정 순서 — Technical Plan에서 **재확인**:

```txt
요구사항정의서 (requirements)
→ 기능정의서 (functionalSpecifications)
→ WBS (wbsItems)
→ 화면설계서 (screenSpecs + screenFields + screenActions)
```

각 단계는 **동일 `projectId`** 아래 subcollection에만 read/write 한다.

---

## 9. Role · Permission (1차)

### 9-1. Role 정의

| role | 1차 write (목표) |
|------|------------------|
| `owner` | 전체 산출물 write + member read |
| `admin` | 전체 산출물 write |
| `editor` | 산출물 write |
| `viewer` | **read only** |

### 9-2. 1차 Permission 범위

- **포함:** collection 단위 read/write gate (active member + role)
- **제외:** 문서/버튼/필드 단위 ACL, UI action matrix 완성, invite role 변경 UI

Rules helper는 `projects/{projectId}/members/{uid}`의 `role` + `status == active`를 기준으로 한다.

---

## 10. Firebase Auth · SDK 계약

| 항목 | 기준 |
|------|------|
| 초기화 | Hosting `/__/firebase/init.js` only |
| 제품 코드 금지 | `initializeApp`, `firebaseConfig`, `apiKey`, `authDomain` 객체 |
| Auth API | `firebase.auth()`, `GoogleAuthProvider`, `signInWithPopup`, `onAuthStateChanged`, `signOut` |
| Firestore API | `firebase.firestore()`, project-scoped paths |
| 사용자 문구 | Firebase / Firestore / SDK 내부 용어 **화면 노출 금지** (PR #320) |
| Contract test | `scripts/test-auth-entry-flow-contract.mjs` PASS 유지 |

기존 JS (수정은 후속 PR):

| 파일 | 역할 |
|------|------|
| `stam.auth-bootstrap.js` | Google sign-in/out, route guard |
| `stam.auth-membership-gate.js` | membership read routing |
| `stam.auth-project-list.js` | active project list |
| `stam.project-context-guard.js` | projectId guard (client-only) |
| `stam.project-overview-context.js` | Overview membership verify |

---

## 11. Firestore Rules 롤아웃 단계

Gate §4-3과 동일 — Auth/Workspace PR과 산출물 write PR을 **분리**한다.

| 단계 | 상태 | 내용 |
|------|------|------|
| **0** | **완료** | deny-by-default + active-member read + `collectionGroup('members')` discovery |
| **1** | **완료** | `users/{uid}` self bootstrap write (PR #355) |
| **2** | **완료** | `projects` create + creator `members/{uid}` owner/active (PR #357) |
| **3** | **완료** | `requirements` role-scoped write (PR #358) — owner/admin/editor create·update; viewer read-only; delete closed |
| **4** | 예정 | `functionalSpecifications` write |
| **5** | 예정 | `wbsItems` / `screenSpecs` / `screenFields` / `screenActions` write |
| **6** | 예정 | `artifactLinks` write |
| **7** | 후속 | field validation, `changeLogs`, `projectInvites` |

현재: **requirements create·update**는 active member role `owner`/`admin`/`editor`만 허용. `viewer`는 read only. delete 및 functionalSpecs/wbs/screenSpecs write는 **미개방**.

---

## 12. 후속 구현 PR 순서 (권장)

단일 책임 — rules + UI + service를 한 PR에 몰지 않는다.

```txt
구조 확정 → read gate → write gate → UI wiring → smoke QA
```

| 순서 | PR 성격 | Gate |
|------|---------|------|
| **A1** | `users/{uid}` bootstrap rules + client upsert | auth contract PASS |
| **A1b** | membership gate read routing + project list (PR #356) | membership contract PASS |
| **A2** | 프로젝트 생성 + owner member write rules + UI (PR #357) | project create contract PASS |
| **A3** | Requirements write rules (PR #358) | requirements rules contract PASS |
| **A3a** | Requirements role matrix smoke QA (PR #359) | `test-requirements-role-matrix-contract.mjs` PASS |
| **A3b** | Requirements CRUD UI wiring (PR #360) | `test-requirements-crud-ui-contract.mjs` + service contract PASS |
| **A3c** | Requirements CRUD live/browser QA evidence (PR #363) | contract 7종 PASS + Chromium browser QA (list/create/update/viewer/delete/escape) — `docs/reports/STAM_PR363_Requirements_CRUD_Live_QA.md` |
| **2** | 기능정의서 service/adapter + read/write | Gate §6 단계 2 |
| **3** | WBS service/adapter + read/write | Gate §6 단계 3 |
| **4** | 화면설계서 service/adapter + CRUD | Gate §6 단계 4 |
| **5** | `artifactLinks` + role UI disable | Gate §6 단계 5 |
| **6** | 1차 실제 구현 Gate 최종 QA | Gate §8 전항 YES |

Auth(A1·A2)는 Requirements write(1)와 **병렬 가능**하나, Golden Path QA는 A1·A2 완료 후 Console 수동 seed 없이 재현 가능해야 한다.

---

## 13. 검증 · 완료 조건

### 13-1. Auth / Workspace Technical 완료 (본 문서 기준)

후속 Auth PR 묶음이 아래를 만족하면 **Auth/Workspace 기술 기준 구현 완료**로 판정한다.

- [x] Google 로그인 → `users/{uid}` upsert (PR #355)
- [x] membership gate client routing 5분기 (PR #356)
- [x] 프로젝트 생성 → owner/active member 자동 등록 (PR #357)
- [x] 프로젝트 선택 → Overview → 산출물 화면 `projectId` 유지 (read path)
- [ ] membership gate 5분기 staging QA (P1–P8 beta matrix) PASS
- [x] `test-auth-entry-flow-contract.mjs` PASS
- [x] `test-membership-gate-contract.mjs` PASS
- [x] `test-project-context-guard-contract.mjs` PASS
- [ ] 제품 HTML inline style/script / `firebaseConfig` **0건**

### 13-2. 1차 실제 구현 Gate (PR #351)

전체 Gate 통과는 `STAM-Phase1-Implementation-Gate.md` §8 — Auth/Workspace 완료 **+** 4산출물 Firestore CRUD **+** artifactLinks **+** role write rules.

---

## 14. 관련 문서

| 문서 | 경로 |
|------|------|
| 1차 실제 구현 Gate | `docs/ops/STAM-Phase1-Implementation-Gate.md` |
| Agent 판단 playbook | `docs/ops/STAM-Decisions-and-Heuristics.md` |
| 1차 제품화 scope | `stam/docs/STAM-Phase-1-Productization-Scope.html` |
| Auth / Member 데이터 구조 | `stam/docs/STAM-Auth-Project-Member-Data-Structure-Guide.html` |
| Firebase Rules baseline | `stam/docs/STAM-Firebase-Auth-Firestore-Rules-Baseline-Guide.html` |
| Membership gate | `stam/docs/STAM-Firestore-Project-Membership-Gate-Guide.html` |
| Beta seed / access matrix | `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` |
| PR #351 조사 리포트 | `docs/reports/STAM_PR351_Phase1_Implementation_Gate.md` |
| PR #352 조사 리포트 | `docs/reports/STAM_PR352_Auth_Firestore_Workspace_Technical_Plan.md` |

---

## 15. 본 PR(#352) 범위

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS | **0건** |
| inline style/script | **없음** |
| `stam/pages/**` | **미변경** |
| `stam/js/**`, `stam/css/**` | **미변경** |
| `firestore.rules`, `firebase.json`, `.firebaserc` | **미변경** |
| 실제 Auth/Firestore 구현 | **없음** — 후속 PR |

**현재 상태 (main @ `5ca33dd` + PR #358):** Google Auth + users bootstrap + membership gate + project list read + 프로젝트 생성 write + **requirements role-scoped create/update**. members update/delete · requirement delete · 기타 산출물 write는 **미개방**. PR #359에서 role matrix contract smoke QA helper 추가.
