# STAM Beta Seed Data & Access Matrix v1

> **버전:** v1  
> **기준 main:** PR #322 merge 이후 (`01cf677183a0ec9dcd353602e1caedbceafcc17c`)  
> **대상 환경:** `stam-preview-hosting` / staging preview  
> **성격:** 운영·QA 기준 문서 (제품 runtime 아님)

---

## 1. 문서 목적

이 문서는 **1차 베타 테스트 전**에 아래 기준을 고정하기 위한 **운영·QA 기준표**이다.

- 어떤 **Google 계정**으로 테스트할지
- Firestore에 어떤 **프로젝트 / 사용자 / 멤버십 / 역할 / 상태** 조합이 있어야 하는지
- 각 조합에서 **기대 라우팅·화면·접근 결과**가 무엇인지
- 베타 QA 담당자가 **수동으로 확인**할 체크리스트

### 이 문서가 아닌 것

| 구분 | 설명 |
|------|------|
| Firestore write 작업서 | 실제 데이터 생성·수정 절차는 Firebase Console 또는 별도 maintainer 도구에서 수행 |
| seed script 명세 | 본 PR에서 seed script를 추가하지 않음. 후속 Admin/seed PR의 입력 기준으로만 사용 |
| Auth / rules 변경서 | `stam.auth-*`, `firestore.rules`, Firebase config는 **변경하지 않음** |

베타 테스트자가 들어오기 전, **담당자가 Firestore Console에서 수동으로 문서·멤버십을 맞춘 뒤** 아래 matrix대로 QA한다.

---

## 2. 현재 코드 기준 요약

아래는 **현재 main 코드**가 기대하는 동작이다. (소스: `stam.auth-bootstrap.js`, `stam.auth-membership-gate.js`, `stam.auth-project-list.js`, `stam.project-overview-context.js`, `stam.project-context-guard.js`)

### 인증

| 항목 | 기준 |
|------|------|
| 로그인 방식 | **Google 로그인만** (`signInWithPopup` + `GoogleAuthProvider`) |
| 이메일·비밀번호 가입 | **없음** (login 화면에 미지원 안내) |
| 로그아웃 | 모든 auth 화면에서 sign-out → `login.html` |

### 멤버십 게이트 (로그인 직후)

Firestore **read-only** 조회:

- `users/{uid}`
- `collectionGroup('members')` where `userId == uid`
- `collectionGroup('members')` where `emailNormalized == auth email`

**우선순위** (`resolveTargetFromMembership`):

1. `users/{uid}.status == disabled` → **access-denied**
2. 멤버 doc 중 **하나라도** `status == active` → **project-select** (`projects.html`)
3. active 없고 **pending** 존재 → **access-pending**
4. active/pending 없고 **denied** 또는 **removed** 존재 → **access-denied**
5. 위 해당 없음 → **no-project**

### 프로젝트 목록 (`projects.html`)

- **active 멤버십만** 카드로 표시 (`readActiveMemberDocs` filter)
- pending / denied / removed 프로젝트는 **목록에 나타나지 않음**
- active 멤버가 0개면 화면 내 안내: *접근 가능한 프로젝트가 없습니다. 초대 상태를 확인해 주세요.*

### Project Overview 진입 (`project-overview.html?projectId=…`)

| 상황 | 기대 라우팅 |
|------|-------------|
| `projectId` 쿼리 없음 | `/pages/auth/projects.html` |
| 로그인 안 됨 | `/pages/auth/login.html` |
| `projects/{projectId}/members/{uid}` 없음 | `/pages/auth/access-denied.html` |
| member `status != active` (pending/denied/removed 등) | `/pages/auth/access-denied.html` |
| member active, project doc 없음 | `/pages/auth/projects.html` |
| member active + project doc 존재 | **검증 성공** → `document.body.hidden = false`, context bar 갱신 |
| Firestore read 실패 | `stam:entryNotice` 저장 후 `/pages/auth/projects.html` (alert 없음) |

### Live 보드 projectId 유지

- `stam.project-context-guard.js`: URL `projectId` > `sessionStorage` (`stam:selectedProjectId`)
- projectId 없이 Live 보드 직접 접근 → `/pages/auth/projects.html`

### 역할(role) 표시

프로젝트 카드 badge: `owner` | `admin` | `editor` | `viewer` (소문자 저장, UI 라벨 capitalize)

---

## 3. Firestore 기준 구조

코드·rules가 기대하는 **최소 필드** 기준이다. doc id 규칙을 반드시 지킨다.

```txt
users/{uid}
  - email
  - emailNormalized
  - displayName
  - status: active | disabled

projects/{projectId}
  - name
  - projectName          (name fallback)
  - description
  - client               (또는 clientName — Overview context)
  - stage                (없으면 description fallback)
  - status: active | archived
  - updatedAt            (Timestamp, Overview “업데이트” 표시용)

projects/{projectId}/members/{uid}
  - userId               (= Firebase Auth uid, rules 검증 필수)
  - email
  - emailNormalized
  - displayName
  - role: owner | admin | editor | viewer
  - status: active | pending | denied | removed
  - projectId
  - projectName
```

### 식별자·규칙 메모

| 규칙 | 설명 |
|------|------|
| member doc id | **반드시** Firebase Auth `uid` (`projects/{projectId}/members/{uid}`) |
| project data read | rules: active member + `userId`/`projectId` 일치 시에만 허용 |
| membership discovery | login routing용 collectionGroup — `userId` 또는 `emailNormalized`로 **본인** record만 |
| writes | **rules상 전면 deny** — Console/admin credentials로만 수동 seed |

---

## 4. 1차 베타 Seed Data 기준 (권장)

실제 Firestore에 **수동으로** 맞출 권장 baseline이다. projectId `stam-demo`를 1차 베타 대표 프로젝트로 사용한다.

### 4.1 대표 프로젝트

| projectId | name / projectName | status | 용도 |
|-----------|-------------------|--------|------|
| `stam-demo` | STAM Demo Project | active | 기본 happy path, Overview·Requirements Live QA |

**권장 project doc 예시 (Console 입력 참고):**

```json
{
  "name": "STAM Demo Project",
  "projectName": "STAM Demo Project",
  "description": "1차 베타 QA 대표 프로젝트",
  "client": "STAM",
  "stage": "Beta v1",
  "status": "active"
}
```

### 4.2 베타 테스트 페르소나 (Access Matrix)

각 행은 **별도 Google 계정** 또는 **동일 uid에 member status만 변경**하여 순차 QA한다.

| ID | Google 계정 (예시) | users.status | member @ stam-demo | role | 기대: 로그인 후 | 기대: Overview `?projectId=stam-demo` |
|----|-------------------|--------------|-------------------|------|----------------|--------------------------------------|
| P1 | beta-owner@… | active | active | owner | projects.html (카드 1+) | Overview 표시, body reveal |
| P2 | beta-editor@… | active | active | editor | projects.html | Overview 표시 |
| P3 | beta-viewer@… | active | active | viewer | projects.html | Overview 표시 (read-only UX) |
| P4 | beta-pending@… | active | pending | viewer | access-pending.html | (로그인 전 routing) access-pending; 직접 URL 시 access-denied |
| P5 | beta-denied@… | active | denied | — | access-denied.html | access-denied |
| P6 | beta-removed@… | active | removed | — | access-denied.html | access-denied |
| P7 | beta-noproject@… | active | *(member doc 없음)* | — | no-project.html | login 후 project list empty; 직접 URL → access-denied |
| P8 | beta-disabled@… | disabled | active *(있어도)* | owner | access-denied.html | access-denied |
| P9 | *(미로그인)* | — | — | — | login.html | login.html |

### 4.3 복합 멤버십 우선순위 (게이트)

한 uid가 **여러 프로젝트**에 속할 때 login routing:

| 보유 member status 조합 (전체 프로젝트) | 기대 화면 |
|----------------------------------------|-----------|
| active ≥ 1 | projects.html |
| active 0, pending ≥ 1 | access-pending.html |
| active 0, pending 0, denied/removed ≥ 1 | access-denied.html |
| member doc 없음 | no-project.html |

projects.html 목록에는 **active인 프로젝트만** 노출된다.

### 4.4 archived 프로젝트

`projects/{id}.status == archived` 인 경우:

- member active이면 **목록·Overview 진입은 코드상 허용** (status label “보관”)
- 베타 QA: archived + active member 1건 수동 seed 후 Overview status 표시 확인

---

## 5. Google 로그인 계정 준비 절차 (수동)

제품 코드는 **user auto-create / member auto-create 없음**. 아래는 운영 담당자 checklist.

### 5.1 사전 준비

1. Firebase project: `stam-preview-hosting` (staging/preview Hosting 연결 확인)
2. Firebase Console → Authentication → **Google** provider 활성화
3. `firestore.rules` 배포 상태 확인 (active member read gate)
4. 베타 테스터 Google 계정 목록 확정 (회사/개인 @gmail 등)

### 5.2 UID 확보

1. 테스터에게 staging/preview URL에서 **Google로 계속하기** 1회 시도
2. Firebase Console → Authentication → Users 에서 해당 **UID** 복사  
   *(member doc 없으면 no-project로 landing — 정상)*

### 5.3 Firestore 수동 seed (Console)

**순서:**

1. `users/{uid}` 생성  
   - `email`, `emailNormalized` (lowercase), `displayName`, `status: active|disabled`
2. `projects/stam-demo` 존재 확인 (없으면 §4.1 참고 생성)
3. `projects/stam-demo/members/{uid}` 생성  
   - §3 필드 전부, **`userId` = uid**, **`status` / `role`** = matrix 행에 맞게
4. (선택) P7 no-project QA: member doc **생성하지 않음**

### 5.4 검증

1. 시크릿 창에서 해당 Google 계정으로 로그인
2. §4.2 matrix **기대 화면**과 일치하는지 확인
3. P1 계정으로 `project-overview.html?projectId=stam-demo` happy path 확인
4. Live 보드(Requirements 등) 이동 시 URL에 `projectId` 유지 확인

### 5.5 주의

- member doc id를 email 등으로 만들지 **않는다** (반드시 uid)
- `emailNormalized` 누락 시 email 기반 collectionGroup lookup 실패 가능
- seed script(`scripts/seed-stam-demo-membership.mjs` 등)는 **maintainer 로컬 도구** — 본 베타 baseline PR 범위 아님

---

## 6. 베타 QA 체크리스트

### 6.1 Auth 진입

- [ ] login: Google 로그인만 노출, 이메일·비밀번호 가입 문구 없음
- [ ] 로그아웃 → login.html
- [ ] P1 active → projects.html, `stam-demo` 카드 표시
- [ ] P4 pending → access-pending.html
- [ ] P5 denied / P6 removed → access-denied.html
- [ ] P7 no member → no-project.html
- [ ] P8 user disabled → access-denied.html
- [ ] contact-admin: alert 없이 화면 내 안내

### 6.2 Project Overview

- [ ] P1: `?projectId=stam-demo` → Overview 본문 표시, `body hidden` 해제
- [ ] 미로그인: login redirect
- [ ] projectId 없음: projects redirect
- [ ] P5/P6/P4: access-denied redirect
- [ ] 실패 시 alert/confirm 없음
- [ ] 사용자 화면에 Firebase/Firestore/Hosting 내부 용어 없음

### 6.3 Live 보드 (projectId 계약)

- [ ] Requirements / Menu Screen List / WBS / Screen Spec: projectId 없이 접근 → projects
- [ ] projects에서 진입 후 nav 링크에 `projectId` 유지

### 6.4 역할·목록

- [ ] projects 카드 role badge: Owner / Admin / Editor / Viewer
- [ ] pending 프로젝트가 목록에 **미표시**

### 6.5 반응형·테마 (smoke)

- [ ] 390 / 768 / 1366 / 1920px — auth + Overview 레이아웃 깨짐 없음
- [ ] 라이트/다크 토글 동작

---

## 7. 후속 작업 입력 기준

본 문서 v1을 다음 PR의 **SSOT 입력**으로 사용한다.

| 후속 PR | 입력 |
|---------|------|
| Firestore seed script | §3 schema + §4.2 matrix 행별 payload |
| Admin invite UI | role/status enum, member doc id = uid 규칙 |
| Automated QA | §6 checklist → contract/Playwright 시나리오 |
| Production seed | 동일 matrix, prod Firebase project 분리 |

**변경 시:** matrix version bump (`v1.1`) + `scripts/test-beta-seed-data-doc-contract.mjs` required section 동기화.

---

## 8. 관련 문서·코드

| 구분 | 경로 |
|------|------|
| Membership gate | `stam/js/stam.auth-membership-gate.js` |
| Auth bootstrap | `stam/js/stam.auth-bootstrap.js` |
| Project list | `stam/js/stam.auth-project-list.js` |
| Overview guard | `stam/js/stam.project-overview-context.js` |
| ProjectId guard | `stam/js/stam.project-context-guard.js` |
| Rules | `firestore.rules` |
| Maintainer seed QA (별도) | `docs/reports/STAM_PR306_Firestore_Seed_QA.md` |
