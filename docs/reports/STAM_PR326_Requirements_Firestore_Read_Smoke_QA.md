# STAM PR #326 — Requirements Firestore Read Smoke QA Report

## 1. 목적

- P1 active 계정으로 `stam-demo` 프로젝트에 진입한 뒤, **Requirements** 화면이 `projectId` 컨텍스트를 유지하며 정상 표시되는지 **read-only smoke** QA 결과를 기록한다.
- PR #324 P1 happy path 및 PR #325 access matrix routing PASS 이후의 후속 검증이다.
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

- **P1 active maintainer** 계정(`air***7@gmail.com`, UID `xK9m…pQ2w` — 마스킹)으로 staging에서 수동 브라우저 QA 수행.
- PR #325 원복 후 **active** 상태에서 진행.
- **저장 / 등록 / 수정 / 삭제 동작은 수행하지 않음** — read-only smoke만 확인.
- **repo 코드 변경 없음**, **seed script 실행 없음**, Firebase Console 데이터 변경 없음.
- 세션 중 제품 코드에서 **Firestore write 발생 여부**를 확인 — **없음**.

## 4. Read Smoke QA 결과

| 항목 | 결과 |
|------|------|
| P1 active 로그인 | **PASS** |
| STAM Demo Project 카드 표시 | **PASS** |
| Overview 진입 | **PASS** |
| Requirements 이동 | **PASS** |
| URL `projectId=stam-demo` 유지 | **PASS** |
| Requirements 화면 표시 | **PASS** |
| 콘솔 오류 | **없음** |
| Firestore write | **없음** |
| 특이사항 | **없음** |

## 5. 확인된 제품 흐름

```txt
Google login (P1 active)
→ projects.html (STAM Demo Project 카드)
→ project-overview.html?projectId=stam-demo
→ requirements.html?projectId=stam-demo
```

- 로그인 후 membership gate → active member → 프로젝트 선택 화면.
- 프로젝트 열기 → Project Overview 진입, `sessionStorage`에 `stam:selectedProjectId` / `stam:selectedProjectName` 설정.
- 좌측 Live 메뉴 **요구사항정의서** → Requirements 보드, URL에 `projectId=stam-demo` **유지**.

## 6. 표시 상태

| 항목 | 결과 |
|------|------|
| Requirements 화면 정상 표시 | **PASS** |
| 목록 / empty state 세부 구분 | **단정하지 않음** (수동 QA 메모에 세부 상태 없음) |

- 이번 smoke는 **화면 진입·렌더·projectId 유지**까지만 확인했다.
- Firestore 목록 건수, empty state 문구·레이아웃 등 **세부 표시 상태는 별도 기록하지 않았다**.

## 7. 범위 외

| 항목 | 비고 |
|------|------|
| Requirements **CRUD** | 미검증 |
| **저장** 검증 | 미검증 |
| **등록 / 수정 / 삭제** 검증 | 미검증 |
| **seed data** 생성 | 없음 |
| **Firebase rules** 변경 | 없음 |
| **Firebase config** 변경 | 없음 |
| **제품 코드** 변경 | 없음 |
| **seed script** 생성/수정 | 없음 |
| **Firestore write** 로직 추가 | 없음 |

## 8. 미변경 확인

| 경로 | 변경 |
|------|------|
| `stam/js/**`, `stam/css/**`, `stam/pages/**`, `stam/assets/**` | 없음 |
| `docs/beta/**` | 없음 |
| `docs/reports/STAM_PR324_*`, `docs/reports/STAM_PR325_*` | 없음 |
| `firestore.rules`, `firebase.json`, `.firebaserc` | 없음 |
| `.github/workflows/**`, `scripts/**` | 없음 |

## 9. 후속 추천

1. **P7 no-project** — 별도 테스트 계정 QA (PR #325 후속)
2. **P2 editor / P3 viewer** — Requirements read 접근 범위 확인
3. **Requirements CRUD** — 별도 범위·별도 QA (이번 read smoke와 분리)
4. **Requirements 목록/empty state** — 데이터 유무에 따른 표시 세부 QA (선택)
5. **베타 onboarding runbook** — P1 happy path + Requirements read smoke URL 정리

## 10. 수정 파일

- `docs/reports/STAM_PR326_Requirements_Firestore_Read_Smoke_QA.md` (신규)
