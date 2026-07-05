# STAM 1차 실제 구현 Gate

> **문서 성격:** 운영 기준서 (docs-only)  
> **기준 main:** PR #350 merge 이후 (`69abcf6`)  
> **선행 완료:** PR #350 — B5 `functional-specification.html` 정적 HTML inline style 0건  
> **관련 canonical scope:** `stam/docs/STAM-Phase-1-Productization-Scope.html` (PR #294)

---

## 0. 문서 목적

STAM을 **정적 Preview / 문서 정리 단계**에서 **1차 실제 구현 단계**로 전환하기 위한 **Gate 기준서**이다.

이 문서는 구현 지시서가 아니다. 이후 Auth / Firestore / CRUD / Rules PR의 **범위·순서·완료 조건**을 고정한다.

### 이 PR(#351)에서 하지 않는 것

| 금지 항목 | 이유 |
|-----------|------|
| Auth / Firestore 실제 구현 | Gate 문서만 작성 |
| `firestore.rules` / `firebase.json` 수정 | Rules 변경은 별도 PR |
| `stam/pages/**`, `stam/css/**`, `stam/js/**` 수정 | 제품 코드 변경 금지 |
| seed script / workflow / package 수정 | 인프라 변경 금지 |

---

## 1. 1차 실제 구현 범위

### 1-1. 전환 원칙

```txt
폭은 줄이고, 깊이는 실제 제품 수준으로 구현한다.
```

- 전체 IA(정보 구조)는 **숨기지 않는다**.
- 1차 핵심 산출물 3종만 **실제 DB 저장형 CRUD**로 연다.
- Auth / Project / Permission / Rules는 **단계적으로** 열되, 각 단계의 완료 조건을 Gate로 검증한다.
- 기존 Preview·가이드·정적 화면은 **기준서로 재활용**하되, 제품 구현 우선순위보다 앞서지 않는다.

### 1-2. 1차 포함 (In Scope)

| 영역 | 1차 실제 구현 목표 |
|------|-------------------|
| **Auth** | Google 로그인 단일 provider, 로그인 후 membership gate, 5개 auth 화면 |
| **Project Context** | 프로젝트 선택 → `projectId` 컨텍스트 유지 → Workspace 진입 |
| **핵심 산출물 CRUD** | 요구사항(`requirements`) · WBS(`wbsItems`) · 화면설계서(`screenSpecs` + `screenFields` / `screenActions`) |
| **연결** | `artifactLinks` 최소 수동 연결 (`related` 중심) |
| **권한** | Owner / Admin / Editor / Viewer 4 role 기준 read / write gate |
| **Audit** | `createdAt` / `createdBy` / `updatedAt` / `updatedBy` / `status` 기본 필드 |
| **Left Nav** | Live / Preview / Planned / Admin / Hidden 상태 구분 유지 |
| **배포** | `stam-preview-hosting` staging에서 실제 동작 확인 |

### 1-3. 1차 제외 (Out of Scope)

| 영역 | 후속 |
|------|------|
| 이메일·비밀번호 로그인 / 공개 회원가입 | Google only 유지 |
| `changeLogs` 컬렉션 / 변경 이력 UI | 기본 audit 필드만 |
| `projectInvites` 자동 초대 흐름 | Admin 수동 멤버 등록 |
| Tenant 관리 / 조직 전환 UI | `tenantId` 필드만 유지 |
| Billing / 요금제 Locked | 후속 |
| 기능정의서 · 프로그램목록 · API 명세 등 비핵심 산출물 Live화 | Preview / Planned 유지 |
| collectionGroup 기반 전역 검색 | project-scoped query 우선 |
| PostgreSQL / API 서버 이전 | Firebase 단기 유지 (`STAM-Backend-Architecture-API-Boundary-Guide`) |

### 1-4. 현재 main 대비 구현 성숙도 (PR #350 기준)

| 항목 | 상태 | 비고 |
|------|------|------|
| Google 로그인 + auth 5화면 | **동작 중** | read-only Firestore gate 포함 |
| 프로젝트 선택 / Overview 진입 | **동작 중** | `sessionStorage` + `?projectId=` |
| `project-context-guard` | **동작 중** | Firebase 미사용, client-only |
| Requirements Firestore **read** | **동작 중** | PR #314 |
| Requirements Firestore **write** | **미개방** | adapter 존재, rules deny |
| WBS / 화면설계서 Firestore 연결 | **미연결** | 정적 Preview 화면 |
| `artifactLinks` CRUD | **미구현** | rules read gate만 존재 |
| Role-based write rules | **미개방** | PR #306+ 예정 |
| `users` doc client 생성 | **미구현** | self-read only |

**Gate 판정:** Auth 진입·read gate·요구사항 read는 **단계 0 완료**. 1차 실제 구현 Gate **통과 전** 단계이다.

---

## 2. Google 로그인 우선 적용 기준

### 2-1. Provider 정책

| 항목 | 기준 |
|------|------|
| 로그인 방식 | **Google 로그인만** (`signInWithPopup` + `GoogleAuthProvider`) |
| 이메일·비밀번호 | **제공하지 않음** |
| 공개 회원가입 | **없음** — Admin이 멤버 doc을 사전 등록 |
| Firebase 초기화 | Hosting reserved URL `/__/firebase/init.js` — **제품 코드에 `firebaseConfig` / `initializeApp` 금지** |
| SDK 버전 | Firebase compat **v8.10.1** (`firebase-app`, `firebase-auth`, `firebase-firestore`) |

### 2-2. 로그인 UI 기준

- 정식 로그인 페이지 밀도 유지 (브랜드 진입감, 초대 계정 안내, 접근 권한 흐름 설명).
- 사용자-facing 문구에 **Firebase / Firestore / SDK** 등 내부 구현 용어 **금지** (PR #320 기준).
- Primary 버튼 1개: Google 로그인 (`.stam-btn--google`).
- 참조: `stam/docs/STAM-Auth-Login-Flow-Preview.html`, `stam/pages/auth/login.html`

### 2-3. Auth 구현 Gate 체크리스트

후속 Auth PR은 아래를 모두 만족해야 **단계 1 Auth 완료**로 판정한다.

- [ ] Google 로그인 성공 / 실패 / 취소 분기 동작
- [ ] `onAuthStateChanged` 기반 route guard (5 auth 화면)
- [ ] membership gate → `project-select` / `access-pending` / `access-denied` / `no-project` 분기
- [ ] `users/{uid}` self-read (rules) — client write는 별도 PR
- [ ] `collectionGroup('members')` login-time discovery (uid / `emailNormalized`)
- [ ] `scripts/test-auth-entry-flow-contract.mjs` PASS
- [ ] 제품 HTML에 inline style / script / 수동 `firebaseConfig` **0건**

---

## 3. 프로젝트 선택 / Workspace 진입 흐름

### 3-1. Golden Path

```txt
login.html (Google 로그인)
  → membership gate (Firestore read-only)
  → projects.html (active 프로젝트 선택)
  → project-overview.html?projectId={id}
  → Live 산출물 화면 (projectId 컨텍스트 유지)
```

### 3-2. 분기 화면

| 화면 | 파일 | 진입 조건 |
|------|------|-----------|
| 로그인 | `stam/pages/auth/login.html` | 미인증 |
| 프로젝트 선택 | `stam/pages/auth/projects.html` | active membership ≥ 1 |
| 접근 승인 대기 | `stam/pages/auth/access-pending.html` | pending membership, active 없음 |
| 접근 거부 | `stam/pages/auth/access-denied.html` | denied / removed / user disabled |
| 프로젝트 없음 | `stam/pages/auth/no-project.html` | membership record 없음 |

### 3-3. Membership gate 우선순위

`stam.auth-membership-gate.js` — `resolveTargetFromMembership` 기준:

1. `users/{uid}.status == disabled` → **access-denied**
2. membership 중 **하나라도** `status == active` → **project-select**
3. active 없고 **pending** 존재 → **access-pending**
4. active/pending 없고 **denied** 또는 **removed** → **access-denied**
5. 해당 없음 → **no-project**

### 3-4. Project Context 계약

| 항목 | 기준 |
|------|------|
| Primary key | `projectId` (Firestore `projects/{projectId}`) |
| URL | `?projectId={id}` query param |
| Session | `sessionStorage['stam:selectedProjectId']`, `stam:selectedProjectName` |
| Guard | `STAM.projectContextGuard` — non-auth 제품 화면에서 `projectId` 없으면 `projects.html` redirect |
| Nav link | `STAM.projectContextGuard.withProjectId(href)` 로 projectId 전파 |
| 프로젝트 1개여도 | **선택 구조 유지** (자동 skip 금지) |

### 3-5. Workspace 진입 Gate

아래가 모두 PASS여야 **Workspace 진입 완료**로 판정한다.

- [ ] P1 active 계정 happy path (PR #324 기준) 재현 가능
- [ ] Overview → Requirements 이동 시 `projectId` URL 유지 (PR #326 smoke PASS)
- [ ] inactive / pending / denied 계정 routing matrix PASS (PR #325 기준)
- [ ] `scripts/test-project-context-guard-contract.mjs` PASS

---

## 4. Firestore 기본 데이터 구조 초안

### 4-1. Layout 결정 (채택)

**후보 2 — project subcollections** 채택 (`firestore.rules` / PR #298 기준).

```txt
users/{userId}
tenants/{tenantId}          ← rules fully closed (1차)
projects/{projectId}
projects/{projectId}/members/{uid}    ← canonical membership path; doc id == Firebase Auth uid
projects/{projectId}/requirements/{requirementId}
projects/{projectId}/wbsItems/{wbsItemId}
projects/{projectId}/screenSpecs/{screenSpecId}
projects/{projectId}/screenFields/{fieldId}
projects/{projectId}/screenActions/{actionId}
projects/{projectId}/artifactLinks/{linkId}
```

> 논리 모델의 `projectMembers`는 물리 경로 `projects/{projectId}/members/{uid}`에 매핑한다.  
> 참조: `stam/docs/STAM-Auth-Project-Member-Data-Structure-Guide.html`

### 4-2. 핵심 Collection 스키마 초안

#### `users/{userId}`

| 필드 | 타입 | 비고 |
|------|------|------|
| `userId` | string | == doc id == Auth uid |
| `email` | string | Google account |
| `emailNormalized` | string | lowercase |
| `displayName` | string | |
| `photoURL` | string | optional |
| `status` | string | `active` / `disabled` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `projects/{projectId}`

| 필드 | 타입 | 비고 |
|------|------|------|
| `projectId` | string | == doc id |
| `tenantId` | string | 기본 tenant |
| `name` | string | |
| `status` | string | `active` / `archived` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `projects/{projectId}/members/{uid}`

| 필드 | 타입 | 비고 |
|------|------|------|
| `userId` | string | == doc id |
| `projectId` | string | |
| `email` | string | invite / display |
| `emailNormalized` | string | login discovery |
| `role` | string | `owner` / `admin` / `editor` / `viewer` |
| `status` | string | `pending` / `active` / `denied` / `removed` |
| `joinedAt` | timestamp | |
| `removedAt` | timestamp | optional |

#### `projects/{projectId}/requirements/{requirementId}`

| 필드 | 타입 | 비고 |
|------|------|------|
| `requirementId` | string | == doc id |
| `projectId` | string | |
| `title` | string | |
| `description` | string | |
| `category` | string | enum — service contract 참조 |
| `priority` | string | enum |
| `status` | string | enum |
| `ownerId` | string | optional |
| `deleted` | boolean | soft delete |
| `createdAt` / `createdBy` / `updatedAt` / `updatedBy` | audit | 1차 포함 |

> Domain Model 상세: `stam/js/stam.requirements-service.js`, `docs/reports/STAM_PR313_Requirement_Service_Contract.md`

#### `projects/{projectId}/wbsItems/{wbsItemId}`

| 필드 | 타입 | 비고 |
|------|------|------|
| `wbsItemId` | string | |
| `projectId` | string | |
| `title` | string | |
| `parentId` | string | optional — 계층 |
| `status` | string | |
| `ownerId` | string | |
| `startDate` / `endDate` | date | |
| audit fields | | 1차 포함 |

#### `projects/{projectId}/screenSpecs/{screenSpecId}`

| 필드 | 타입 | 비고 |
|------|------|------|
| `screenSpecId` | string | |
| `projectId` | string | |
| `title` | string | |
| `screenCode` | string | |
| `status` | string | |
| `reviewStatus` / `approvalStatus` | string | |
| audit fields | | 1차 포함 |

#### `screenFields` / `screenActions`

- `screenSpecs` 하위가 아닌 **project subcollection**으로 분리 (rules 일관성).
- `screenSpecId` FK 필드로 master와 연결.
- 1차: 최소 CRUD + 목록/상세 표시. Editor 전체 기능은 후속.

#### `projects/{projectId}/artifactLinks/{linkId}`

| 필드 | 타입 | 비고 |
|------|------|------|
| `linkId` | string | |
| `projectId` | string | |
| `sourceType` / `sourceId` | string | `requirement` / `wbsItem` / `screenSpec` |
| `targetType` / `targetId` | string | |
| `relationType` | string | 1차: `related` only |
| audit fields | | |

### 4-3. Rules 단계 (현재 → 목표)

| 단계 | 상태 | 내용 |
|------|------|------|
| **단계 0** | **완료** | deny-by-default + active-member read gate + `collectionGroup('members')` discovery |
| **단계 1** | 예정 | role-scoped write open (`requirements` 우선) |
| **단계 2** | 예정 | `wbsItems` / `screenSpecs` / `screenFields` / `screenActions` write |
| **단계 3** | 예정 | `artifactLinks` write + `users` bootstrap |
| **단계 4** | 후속 | field validation, `changeLogs`, invites |

현재 rules: **모든 write deny**. read는 active member + own membership discovery만 허용.

### 4-4. Deferred Collections

| Collection | 사유 |
|------------|------|
| `projectInvites` | Admin 수동 등록으로 대체 |
| `changeLogs` | audit 필드로 대체 |
| `comments` / `attachments` | 1차 범위 외 |
| `billingPlans` | billing 후속 |

---

## 5. 좌측 메뉴 Live / Preview / Planned 노출 기준

### 5-1. 상태 정의 (SSOT: `stam/js/stam.shell.js`)

| 상태 | CSS | 클릭 | 정의 |
|------|-----|------|------|
| **live** | `.is-live` | 허용 | 실제 Auth / DB 연결된 제품 화면 |
| **preview** | `.is-preview` | 허용 | 정적 Preview 화면 또는 기준 문서 수준 UI |
| **planned** | `.is-planned` | **차단** | 후속 예정, 딤 처리 |
| **admin** | `.is-admin-only` | **차단** | 관리자 전용 (F3, F4, F11) |
| **hidden** | `.is-hidden` | **차단** | IA 유지용 숨김 (B6, B7) |

렌더: `stam.nav-render.js` — `planned` / `admin` / `hidden` 클릭 이동 차단.  
계약 테스트: `scripts/test-nav-live-dimmed-contract.mjs`

### 5-2. 현재 메뉴 ID 매핑 (PR #319 기준)

| 상태 | 메뉴 ID | 화면 |
|------|---------|------|
| **Live** | A1 | Project Overview |
| **Live** | B1 | 요구사항정의서 (`requirements.html`) — Firestore read 연결 |
| **Live** | B2 | 메뉴구조/화면목록 (`menu-screen-list.html`) — 정적 |
| **Live** | B3 | WBS (`wbs.html`) — 정적 |
| **Live** | B4 | 화면설계서 (`screen-specification.html`) — 정적 |
| **Preview** | B5, B8, B9, B10, C8, E7 | 기능정의서 등 Preview 화면 |
| **Admin** | F3, F4, F11 | 관리자 메뉴 |
| **Hidden** | B6, B7 | 숨김 |
| **Planned** | 나머지 전부 | 딤 + 클릭 차단 |

### 5-3. 1차 실제 구현 완료 시 목표 Live 메뉴

| 메뉴 | 1차 목표 |
|------|----------|
| A1 Project Overview | Firestore project context (현재 부분 동작) |
| B1 요구사항 | **read + write CRUD** |
| B3 WBS | **read + write CRUD** |
| B4 화면설계서 | **read + write CRUD** (screenFields/screenActions 포함) |
| F* 멤버/권한 | **read** (write는 후속 가능) |

B2(메뉴구조/화면목록)는 1차 핵심 산출물이 아니므로 **Preview 전환 검토** 대상이다.  
B5(기능정의서)는 PR #350 inline cleanup 완료 — **Preview 유지**.

### 5-4. Live 승격 Gate 조건

메뉴를 **Live**로 승격하려면 아래를 모두 충족한다.

1. 해당 화면이 `project-context-guard` 뒤에 위치
2. Auth + active membership verify 완료
3. Firestore read **또는** write CRUD가 실제 동작 (Preview-only 화면은 Preview 유지)
4. `stam.nav-data.js`의 `href`가 실제 제품 파일을 가리킴
5. `LIVE_MENU_IDS` 변경은 **별도 PR** + contract test PASS

### 5-5. 용어 구분 (혼동 방지)

| 용어 | 의미 |
|------|------|
| Nav **Live** | 좌측 메뉴 성숙도 — 실제 DB/Auth 연결 |
| Nav **Preview** | 정적 Preview 화면 연결 |
| Hosting **preview** | Firebase project `stam-preview-hosting` / PR channel |
| Design **Preview** doc | `stam/docs/*-Preview.html` 기준 문서 |

---

## 6. 다음 PR 실행 순서

> PR 번호는 **예상 순서**이며, 실제 번호는 main 기준 할당된다.  
> 각 PR은 **단일 책임** — rules + UI + service를 한 PR에 몰지 않는다.

### 단계 1 — Requirements Write 개방 (우선 구현)

| 순서 | 작업 | 성격 | Gate |
|------|------|------|------|
| 1-1 | `firestore.rules` — `requirements` role-scoped write | security | syntax check + emulator |
| 1-2 | Requirements create / update / softDelete UI wiring | dev | service contract 준수 |
| 1-3 | Requirements write smoke QA | QA doc | P1 active, staging |

**선행:** `stam.requirements-service.js` / `stam.requirements-firestore-adapter.js` (PR #313)  
**금지:** WBS / screen spec 동시 write 개방

### 단계 2 — WBS Firestore 연결

| 순서 | 작업 | 성격 |
|------|------|------|
| 2-1 | WBS domain service + Firestore adapter (Requirements 패턴 복제) | dev |
| 2-2 | `wbsItems` read UI binding | dev |
| 2-3 | `wbsItems` write rules + CRUD UI | security + dev |
| 2-4 | WBS smoke QA | QA doc |

### 단계 3 — 화면설계서 Firestore 연결

| 순서 | 작업 | 성격 |
|------|------|------|
| 3-1 | `screenSpecs` service + adapter + read binding | dev |
| 3-2 | `screenSpecs` write rules + master CRUD | security + dev |
| 3-3 | `screenFields` / `screenActions` 최소 CRUD (별도 PR 권장) | dev |
| 3-4 | Screen spec smoke QA | QA doc |

### 단계 4 — 연결 · Auth 보강

| 순서 | 작업 | 성격 |
|------|------|------|
| 4-1 | `artifactLinks` read/write + 상세 화면 연결정보 탭 | dev |
| 4-2 | `users/{uid}` bootstrap on first login (server or controlled client) | dev |
| 4-3 | Role-based UI action disable (Owner/Admin/Editor/Viewer) | dev + ui |

### 단계 5 — 1차 실제 구현 Gate 최종 검증

| 항목 | 완료 조건 |
|------|-----------|
| Golden Path | login → project select → Requirements/WBS/Screen Spec CRUD |
| Rules | role-scoped write, deny-by-default 유지, syntax check PASS |
| Left Nav | B1/B3/B4 Live, 핵심 3산출물 CRUD 동작 |
| QA | Beta access matrix 전 시나리오 PASS |
| Governance | 신규 CSS/JS 0건 원칙 유지 (기존 파일 확장은 별도 승인) |

### PR 분리 원칙 (재확인)

```txt
구조 확정 → read gate → write gate → UI wiring → smoke QA
```

- Rules PR과 UI PR을 **가능하면 분리**
- docs-only Gate / QA report PR은 **코드 변경 없음**
- 구조 변경 시 **본 문서 또는 `STAM-Phase-1-Productization-Scope.html` 먼저 갱신**

---

## 7. 관련 문서

| 문서 | 경로 |
|------|------|
| 1차 제품화 scope (canonical) | `stam/docs/STAM-Phase-1-Productization-Scope.html` |
| Auth / Member 데이터 구조 | `stam/docs/STAM-Auth-Project-Member-Data-Structure-Guide.html` |
| Firebase Rules baseline | `stam/docs/STAM-Firebase-Auth-Firestore-Rules-Baseline-Guide.html` |
| Membership gate | `stam/docs/STAM-Firestore-Project-Membership-Gate-Guide.html` |
| Beta seed / access matrix | `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` |
| Agent 판단 playbook | `docs/ops/STAM-Decisions-and-Heuristics.md` |
| PR #351 조사 리포트 | `docs/reports/STAM_PR351_Phase1_Implementation_Gate.md` |

---

## 8. Gate 통과 판정 요약

**1차 실제 구현 Gate 통과** = 아래 전부 YES.

- [ ] Google 로그인 → 프로젝트 선택 → Workspace 진입 Golden Path staging PASS
- [ ] 요구사항 / WBS / 화면설계서 **실제 Firestore CRUD** 동작
- [ ] `artifactLinks` 최소 수동 연결 동작
- [ ] role 기준 write rules 적용, deny-by-default 유지
- [ ] Left Nav Live 메뉴가 실제 DB 화면과 일치
- [ ] `changeLogs` / email-password auth / 공개 가입 **미포함** 확인
- [ ] Beta access matrix QA PASS

**현재 상태 (PR #350):** 위 항목 **미충족** — 본 문서는 후속 구현 PR의 기준 고정용이다.
