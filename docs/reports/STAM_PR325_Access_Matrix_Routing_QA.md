# STAM PR #325 — Access Matrix Routing QA Report

## 1. 목적

- PR #323의 Beta Seed Data & Access Matrix 기준에 따라 access control routing을 실제 staging에서 검증한 결과를 기록한다.
- PR #324에서 P1 happy path가 PASS된 이후, 이번 리포트는 **차단/대기 상태 시나리오** 중심이다.
- 이 문서는 **QA 증거 리포트**이며, 제품 코드 변경 PR이 아니다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| 기준 main | `2baf87f36ddc786fda7dbdfd3e546aa0a76a6360` |
| staging | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| projectId | `stam-demo` |
| 기준 문서 | `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` |
| 선행 증거 | `docs/reports/STAM_PR324_P1_Manual_Seed_Happy_Path_QA.md` |

## 3. QA 방식

- 동일 P1 maintainer 계정을 기준으로 Firestore 상태값을 **수동 변경**하며 라우팅 결과를 확인했다.
- 민감정보는 마스킹한다.
- Firebase Console에서 상태값만 변경했으며, **repo 코드 변경이나 seed script 실행은 없다**.
- 각 시나리오 확인 후 최종적으로 **P1 active 상태로 원복**했다.

### 테스트 계정 (마스킹)

| 항목 | 값 |
|------|-----|
| Google 계정 | `air***7@gmail.com` (마스킹) |
| UID | `xK9m…pQ2w` (앞·뒤 일부만 표기, 마스킹) |
| member role (원복 기준) | owner |
| member doc path | `projects/stam-demo/members/{uid}` |

## 4. 검증 대상

| 시나리오 | 변경 값 | 기대 결과 | 결과 |
|----------|---------|-----------|------|
| P4 pending | `projects/stam-demo/members/{uid}.status = pending` | `access-pending.html` | **PASS** |
| P5 denied | `projects/stam-demo/members/{uid}.status = denied` | `access-denied.html` | **PASS** |
| P6 removed | `projects/stam-demo/members/{uid}.status = removed` | `access-denied.html` | **PASS** |
| P8 disabled | `users/{uid}.status = disabled`, member는 active | `access-denied.html` | **PASS** |
| 원복 active | `users/{uid}.status = active`, `members/{uid}.status = active` | projects → Overview → Requirements 정상 진입 | **PASS** |

## 5. 시나리오별 결과

### P4 — pending member

- **변경:**
  - `members/{uid}.status = pending`
- **기대:**
  - 로그인 후 `access-pending.html`
- **결과:**
  - **PASS**
- **비고:**
  - `projects.html`에 카드 **미표시** (active-only 목록)
  - alert / confirm **미노출**
  - 콘솔 치명 오류 **없음**

### P5 — denied member

- **변경:**
  - `members/{uid}.status = denied`
- **기대:**
  - `access-denied.html`
- **결과:**
  - **PASS**
- **비고:**
  - 직접 `project-overview.html?projectId=stam-demo` 접근 시 `access-denied.html` redirect 확인

### P6 — removed member

- **변경:**
  - `members/{uid}.status = removed`
- **기대:**
  - `access-denied.html`
- **결과:**
  - **PASS**
- **비고:**
  - P5와 동일 routing 분기 (`denied` \| `removed` → access-denied)

### P8 — disabled user

- **변경:**
  - `users/{uid}.status = disabled`
  - `members/{uid}.status = active`
- **기대:**
  - `access-denied.html` (user disabled가 member active보다 **우선**)
- **결과:**
  - **PASS**
- **비고:**
  - membership gate `resolveTargetFromMembership` 우선순위와 일치

### Restore — active state

- **변경:**
  - `users/{uid}.status = active`
  - `members/{uid}.status = active`
- **기대:**
  - `projects.html` → `project-overview.html?projectId=stam-demo` → `requirements.html?projectId=stam-demo`
- **결과:**
  - **PASS**
- **비고:**
  - PR #324 P1 happy path **재현 확인** (원복 후 regression 없음)

## 6. 미검증 / 후속

| 시나리오 | 상태 | 이유 |
|----------|------|------|
| P7 no-project | **후속** | 주 maintainer 계정의 `members/{uid}` 삭제 테스트는 실수 위험이 있어 **별도 테스트 계정**으로 검증 권장 |
| P9 미로그인 | **선행 완료** | PR #322/324 및 unauth smoke에서 login redirect 확인 |
| P2 editor / P3 viewer | **후속** | role badge·접근 범위 별도 QA |

## 7. 확인된 제품 의미

- **active** member는 프로젝트 진입 가능하다.
- **pending** member는 대기 화면(`access-pending.html`)으로 분기된다.
- **denied** / **removed** member는 차단 화면(`access-denied.html`)으로 분기된다.
- **user disabled**는 member active보다 우선하여 차단된다.
- QA 후 **active 상태로 원복**했을 때 P1 happy path가 다시 정상 동작한다.

## 8. 범위 외

| 항목 | 상태 |
|------|------|
| 제품 코드 변경 | 없음 |
| Firebase rules 변경 | 없음 |
| Firebase config 변경 | 없음 |
| seed script 생성/수정 | 없음 |
| Firestore write 로직 추가 | 없음 |
| P7 no-project | 후속 |
| Requirements 실제 데이터 read/write QA | 후속 |

## 9. 후속 추천

1. **P7 no-project** — 별도 테스트 계정 QA (member doc 없음 → `no-project.html`)
2. **Requirements Firestore read smoke** — P1 active 상태에서 `stam-demo` 목록 read
3. **P2 editor / P3 viewer** — role badge 및 접근 범위 확인
4. **베타 테스터 onboarding runbook** — matrix §5 seed 절차 + P1/P4–P8 routing 요약

## 10. 수정 파일

- `docs/reports/STAM_PR325_Access_Matrix_Routing_QA.md` (신규)
