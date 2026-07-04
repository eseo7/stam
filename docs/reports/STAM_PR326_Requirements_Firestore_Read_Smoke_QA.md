# STAM PR #326 — Requirements Firestore Read Smoke QA Report

## 1. 목적

- PR #324 P1 happy path 및 PR #325 access matrix routing PASS 이후, **Requirements 보드**가 staging에서 **read-only smoke** 기준으로 정상 동작하는지 검증한 결과를 기록한다.
- 이 문서는 **QA 증거 리포트**이며, 제품 코드 변경 PR이 아니다.
- **Requirements CRUD(저장/등록/수정/삭제) 검증은 범위 외**이다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| 기준 main | `b907111fc8f649a62473b412a57ebf7fdf99faae` |
| staging | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| projectId | `stam-demo` |
| 페르소나 | **P1** (active user + active member @ stam-demo) |
| 선행 증거 | `docs/reports/STAM_PR324_P1_Manual_Seed_Happy_Path_QA.md` |
| 선행 증거 | `docs/reports/STAM_PR325_Access_Matrix_Routing_QA.md` |

## 3. QA 방식

- P1 maintainer 계정(`air***7@gmail.com`, UID `xK9m…pQ2w` — 마스킹)으로 staging에서 **수동 브라우저 QA** 수행.
- PR #325 원복 후 **active** 상태에서 진행.
- **repo 코드 변경 없음**, **seed script 실행 없음**, Firebase Console 데이터 변경 없음.
- Requirements 화면에서 **조회·표시·네비게이션**만 확인; 생성/수정/삭제 UI 동작은 **시도하지 않음**.

## 4. Smoke QA 결과

| 항목 | 결과 |
|------|------|
| P1 active 로그인 | **PASS** |
| `STAM Demo Project` 카드 표시 | **PASS** |
| Project Overview 진입 | **PASS** |
| Requirements 이동 (좌측 Live 메뉴) | **PASS** |
| URL `projectId=stam-demo` 유지 | **PASS** |
| Requirements 화면 정상 표시 | **PASS** |
| 콘솔 오류 | **없음 — PASS** |
| Firestore write (제품 코드) | **없음 — PASS** |
| 특이사항 | **없음** |

### 확인 경로

```txt
login.html
→ projects.html (STAM Demo Project)
→ project-overview.html?projectId=stam-demo
→ requirements.html?projectId=stam-demo
```

## 5. 범위 내 / 범위 외

### 범위 내 (이번 QA)

- P1 active 계정으로 Requirements 보드 **진입**
- `projectId=stam-demo` URL·context **유지**
- Requirements 화면 **정상 표시** (레이아웃·셸·보드 영역 렌더)
- 브라우저 콘솔 **치명 오류 없음**
- 세션 중 제품 코드에서 **Firestore write 미발생**

### 범위 외 (이번 QA에서 하지 않음)

| 항목 | 비고 |
|------|------|
| 요구사항 **저장** | 미검증 |
| 요구사항 **등록** | 미검증 |
| 요구사항 **수정** | 미검증 |
| 요구사항 **삭제** | 미검증 |
| Requirements **CRUD** 전반 | 후속 PR/QA |
| 목록 건수 vs empty state 세부 | 수동 QA 메모에 없음 — **단정하지 않음** |
| Firestore rules / config 변경 | 없음 |
| seed script | 없음 |

## 6. 확인된 제품 의미

- P1 active 멤버는 Requirements Live 보드까지 **read path**가 끊기지 않는다.
- `stam.project-context-guard` 계약에 따라 `projectId=stam-demo`가 Requirements URL에 **유지**된다.
- Requirements 화면은 staging에서 **정상 표시**된다 (read smoke 기준).
- 이번 smoke에서 **Firestore write는 발생하지 않았다**.

## 7. 미변경 (의도적)

| 경로 | 변경 |
|------|------|
| `stam/js/**`, `stam/css/**`, `stam/pages/**` | 없음 |
| `firestore.rules`, `firebase.json`, `.firebaserc` | 없음 |
| `.github/workflows/**`, `scripts/**` | 없음 |
| seed script / Firestore write 로직 | 없음 |

## 8. 수정 파일

- `docs/reports/STAM_PR326_Requirements_Firestore_Read_Smoke_QA.md` (신규)

## 9. 후속 추천

1. **P7 no-project** — 별도 테스트 계정 QA (PR #325 후속)
2. **P2 editor / P3 viewer** — Requirements read 접근 범위 확인
3. **Requirements CRUD** — 별도 범위·별도 QA (이번 smoke와 분리)
4. **베타 onboarding runbook** — P1 happy path + Requirements read smoke URL 정리
