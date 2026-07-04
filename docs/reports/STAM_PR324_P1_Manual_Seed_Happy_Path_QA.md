# STAM PR #324 — P1 Manual Seed Happy Path QA Report

## 1. 목적

- PR #323의 Beta Seed Data & Access Matrix 기준에 따라 P1 happy path를 실제 staging에서 검증한 결과를 기록한다.
- 이 문서는 **QA 증거 리포트**이며, 제품 코드 변경 PR이 아니다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| 기준 main | `87dd3fabd397652fedf241c7af765725c5f0af5c` |
| staging | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| projectId | `stam-demo` |
| 기준 문서 | `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` |
| 페르소나 | **P1** (active user + active member @ stam-demo) |

## 3. 수동 seed 상태

민감정보는 마스킹한다.

| 항목 | 결과 |
|------|------|
| Google 계정 | `air***7@gmail.com` (마스킹) |
| UID | `xK9m…pQ2w` (앞·뒤 일부만 표기, 마스킹) |
| `users/{uid}` | **존재 확인** |
| `projects/stam-demo` | **존재 확인** |
| `projects/stam-demo/members/{uid}` | **존재 확인** |
| member role | **owner** |
| member status | **active** |
| project status | **active** |

### seed 방식

- **신규 seed script 사용 없음**
- Firebase Console 또는 기존 QA maintainer seed 데이터로 **수동 확인**
- P1 happy path 기준: `users.status == active` + `members.status == active` + `role: owner` → **허용**

### seed 필드 요약 (확인됨)

**`users/{uid}`**

- `email`, `emailNormalized` (소문자), `displayName`, `status: active`

**`projects/stam-demo`**

- `name` / `projectName`: STAM Demo Project
- `description`: 1차 베타 QA 대표 프로젝트
- `client`: STAM
- `stage`: 1차 베타
- `status`: active
- `updatedAt`: Timestamp 존재

**`projects/stam-demo/members/{uid}`**

- `userId` = Firebase Auth UID
- `email`, `emailNormalized`, `displayName`
- `role`: owner
- `status`: active
- `projectId`: stam-demo
- `projectName`: STAM Demo Project

## 4. Happy Path QA 결과

| 항목 | 결과 |
|------|------|
| `login.html` 접속 | **PASS** |
| Google 로그인 | **PASS** |
| 사용자 화면 내부 용어 (Firebase/Firestore/SDK/Hosting) | **미노출 — PASS** |
| alert / confirm | **미노출 — PASS** |
| `projects.html` 이동 | **PASS** |
| `STAM Demo Project` 카드 표시 | **PASS** |
| role badge (Owner) 표시 | **PASS** |
| 프로젝트 열기 버튼 표시 | **PASS** |
| Project Overview 진입 | **PASS** |
| Overview 본문 표시 (`body hidden` 해제) | **PASS** |
| Project Context에 STAM Demo Project 표시 | **PASS** |
| URL `projectId=stam-demo` 유지 | **PASS** |
| Requirements 이동 (좌측 Live 메뉴) | **PASS** |
| `requirements.html?projectId=stam-demo` 유지 | **PASS** |
| 다른 Live 메뉴 이동 시 `projectId` 유지 | **PASS** |
| 콘솔 오류 | **없음 — PASS** |
| 제품 코드 Firestore write | **발생 없음 — PASS** |

### sessionStorage (Overview 진입 후)

| key | 값 |
|-----|-----|
| `stam:selectedProjectId` | `stam-demo` |
| `stam:selectedProjectName` | `STAM Demo Project` |

## 5. 확인된 제품 흐름

```txt
Google login
→ Firebase Auth UID 인식
→ users/{uid} 확인
→ projects/stam-demo/members/{uid} active 확인
→ projects.html 카드 표시
→ project-overview.html?projectId=stam-demo
→ requirements.html?projectId=stam-demo
```

## 6. Smoke (staging)

| 항목 | 결과 |
|------|------|
| 라이트 / 다크 전환 | **PASS** |
| 390px | **PASS** |
| 768px | **PASS** |
| 1366px | **PASS** |
| 1920px | **PASS** |

## 7. 미변경 (의도적)

| 경로 | 변경 |
|------|------|
| `stam/js/**`, `stam/css/**`, `stam/pages/**` | 없음 |
| `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` | 없음 |
| `firestore.rules`, `firebase.json`, `.firebaserc` | 없음 |
| `.github/workflows/**`, `scripts/**` | 없음 |
| seed script / Firestore write 로직 | 없음 |

## 8. 수정 파일

- `docs/reports/STAM_PR324_P1_Manual_Seed_Happy_Path_QA.md` (신규)

## 9. 후속 추천

1. **P4–P8 matrix QA** — pending / denied / removed / no-project / disabled 시나리오 순차 검증
2. **Requirements Firestore read QA** — `stam-demo` 요구사항 목록 read-only smoke (데이터 있을 경우)
3. **추가 베타 테스터** — §5 Console 수동 seed 절차로 P2(editor), P3(viewer) 계정 확장
4. **베타 kickoff** — P1 happy path 기준으로 staging URL·계정 안내 배포
