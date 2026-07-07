# STAM PR #357 — Project Create + Owner Member Write

## 1. 목적

PR #356 membership gate + project list read 이후, 로그인 사용자가 **직접 프로젝트를 생성**하고 생성자를 **`owner / active` member**로 등록한다.

초대, 멤버 관리 UI, 산출물 CRUD는 **후속 PR**로 분리한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `b23024f` |
| 선행 | PR #354–#356 Auth + membership gate |
| SDK | Firebase compat v8.10.1 |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.auth-project-list.js` | `createProjectWithOwner` batch write + create UI handlers |
| `stam/pages/auth/projects.html` | 새 프로젝트 만들기 form |
| `stam/pages/auth/no-project.html` | 프로젝트 생성 form + project-list script |
| `firestore.rules` | project/member create rules (PR #357) |
| `scripts/test-project-create-contract.mjs` | **신규** |
| `scripts/test-membership-gate-contract.mjs` | no-project project-list 로드 허용 |
| `scripts/test-auth-entry-flow-contract.mjs` | create UI 계약 갱신 |
| `docs/reports/STAM_PR357_Project_Create_Owner_Member_Write.md` | 본 리포트 |

## 4. Firestore write 범위

| 경로 | 동작 |
|------|------|
| `projects/{projectId}` | **create only** — creator `ownerUid` 검증 |
| `projects/{projectId}/members/{uid}` | **create only** — doc id == Auth uid, `role: owner`, `status: active` |
| `users/{uid}` | PR #355 bootstrap 유지 |
| `requirements/**` 등 산출물 | **deny** |
| project/member update·delete | **deny** |

## 5. 생성 문서 계약

### `projects/{projectId}`

| 필드 | 값 |
|------|-----|
| `projectId` | == doc id (auto) |
| `projectName` / `name` | 사용자 입력 (trim, 2–60자) |
| `status` | `active` |
| `tenantId` | `personal-{uidPrefix8}` |
| `ownerUid` / `ownerEmail` / `createdBy` | Auth uid / email |
| `createdAt` / `updatedAt` / `lastOpenedAt` | serverTimestamp |

### `projects/{projectId}/members/{uid}`

| 필드 | 값 |
|------|-----|
| `userId` | == Auth uid |
| `role` | `owner` |
| `status` | `active` |
| `email` / `emailNormalized` / `displayName` | Google profile |
| `projectId` / `projectName` / `tenantId` | project doc mirror |
| `joinedAt` / `createdAt` / `updatedAt` | serverTimestamp |

## 6. 클라이언트 흐름

```txt
projects.html 또는 no-project.html
→ 프로젝트 이름 입력 (2–60자)
→ batch.set(projects/{id}) + batch.set(members/{uid})
→ sessionStorage selectedProjectId/Name
→ /pages/dashboard/project-overview.html?projectId={id}
```

## 7. 검증

```bash
node scripts/test-project-create-contract.mjs
node scripts/test-membership-gate-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
node scripts/test-project-context-guard-contract.mjs
npx -y firebase-tools@13.35.1 emulators:exec --only firestore --project demo-rules-compile "echo RULES_OK"
```

## 8. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS | `stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.form-controls.css`, `stam.auth.css` |
| 사용 JS | `stam.auth-membership-gate.js`, `stam.auth.js`, `stam.auth-project-list.js`, `stam.theme.js` |
| 신규 CSS/JS 파일 | **0건** |
| inline style/script | **없음** |
| 금지 경로 | **미변경** |

## 9. 미포함 (후속 PR)

- 멤버 초대 / 추가 / 수정 / 삭제
- 산출물 CRUD write rules
- 프로젝트 update/delete UI
- 이메일/비밀번호 로그인

## 10. Rules 배포

`firestore.rules` 로직 변경 포함. merge 후 staging rules deploy 필요.
