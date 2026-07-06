# STAM PR #352 — Auth / Firestore / Workspace Technical Plan

## 1. 목적

PR #351(1차 실제 구현 Gate) 이후, **Auth / Firestore / Workspace** 구현을 시작하기 전에 기술 기준을 ops 문서로 고정한다.

이 PR은 **문서 전용**이다. Auth / Firestore / 제품 코드 / rules / config **변경 없음**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` |
| head 기준 | `a005a0d` (PR #351 merge) |
| 선행 완료 | PR #351 — `STAM-Phase1-Implementation-Gate.md` |
| 신규 Technical Plan | `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` |

## 3. 산출물

| 파일 | 성격 |
|------|------|
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` | **신규** — Auth/Firestore/Workspace 기술 기준서 |
| `docs/reports/STAM_PR352_Auth_Firestore_Workspace_Technical_Plan.md` | **신규** — 본 PR 조사 리포트 |
| `docs/ops/STAM-Phase1-Implementation-Gate.md` | 관련 문서 링크 추가 |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | 결정 로그 1건 추가 |

## 4. 변경 파일 (docs-only)

```txt
docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md          (신규)
docs/reports/STAM_PR352_Auth_Firestore_Workspace_Technical_Plan.md (신규)
docs/ops/STAM-Phase1-Implementation-Gate.md                        (관련 문서 링크)
docs/ops/STAM-Decisions-and-Heuristics.md                          (결정 로그)
```

**미변경 확인 대상:**

```txt
stam/pages/**
stam/css/**
stam/js/**
firestore.rules
firestore.indexes.json
firebase.json
.firebaserc
.github/workflows/**
package.json
package-lock.json
vite.config.*
```

## 5. Technical Plan 핵심 결정 (요약)

상세는 `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` 참조.

1. **Golden Path 고정** — Google 로그인 → `users/{uid}` upsert → 프로젝트 목록 → 생성/선택 → `projectId` Workspace → 산출물 격리
2. **1차 로그인** — Google only; 이메일·비밀번호·초대·세부 권한 UI 제외
3. **2차 확장** — invite, email/password, field-level ACL — 1차 layout이 막지 않도록 설계
4. **`users/{uid}`** — 로그인 직후 create/update; `status` client 변경 금지
5. **프로젝트 생성** — 생성자 `owner` + `active` member 동시 등록; 기존 Admin 수동 멤버 경로 병행
6. **Firestore layout** — `projects/{projectId}/**` subcollections 유지 (Gate §4-1 동일)
7. **Rules 롤아웃** — users bootstrap → project create → requirements write → … 순 분리
8. **산출물 순서** — `요구사항정의서 → 기능정의서 → WBS → 화면설계서`

## 6. 현재 구현 성숙도 (main @ a005a0d)

| 레이어 | 상태 |
|--------|------|
| Google Auth + 5 auth routes | **동작 중** |
| Membership gate (read) | **동작 중** |
| Project select → Overview | **동작 중** |
| `users/{uid}` client bootstrap | **미구현** (Console/seed 수동) |
| 프로젝트 생성 write | **미구현** |
| Requirements Firestore read | **동작 중** |
| Requirements Firestore write | **미개방** |
| 기능정의서 / WBS / Screen Spec Firestore | **미연결** |

## 7. 검증

```bash
# 변경 파일이 docs-only인지 확인
git diff --name-only main...HEAD

# 금지 경로 미변경
git diff --name-only main...HEAD | rg '^(stam/|firestore|firebase|\.github|package|vite\.config)' && echo FAIL || echo PASS

# MVP 표현 미사용
rg -i '\bMVP\b' docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md docs/reports/STAM_PR352_Auth_Firestore_Workspace_Technical_Plan.md
```

## 8. Governance

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

## 9. 후속 PR (예상)

| 순서 | 작업 |
|------|------|
| A1 | `users/{uid}` bootstrap rules + client upsert |
| A2 | 프로젝트 생성 + owner member write |
| 1 | Requirements write rules + CRUD UI |
| 2–4 | 기능정의서 → WBS → 화면설계서 Firestore 연결 |
| 5 | artifactLinks + role UI |
| 6 | 1차 실제 구현 Gate 최종 QA |

---

**PR 성격:** docs-only Technical Plan. 구현은 후속 PR에서 `STAM-Auth-Firestore-Workspace-Technical-Plan.md` 기준으로 진행한다.
