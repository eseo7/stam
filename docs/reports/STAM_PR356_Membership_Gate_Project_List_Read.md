# STAM PR #356 — Membership Gate + Project List Firestore Read

## 1. 목적

PR #355 `users/{uid}` bootstrap 이후, 로그인한 사용자의 **프로젝트 멤버십을 Firestore에서 읽고** auth 5화면으로 라우팅하며, **active membership 프로젝트만** `projects.html`에 표시한다.

프로젝트 생성, `members/{uid}` write, 산출물 CRUD는 **후속 PR**로 분리한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `5aa8381` |
| 선행 | PR #354 Auth Skeleton, PR #355 users bootstrap |
| SDK | Firebase compat v8.10.1 |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.auth.js` | membership gate routing 연동 (`applyMembershipRouteGuard`) |
| `stam/js/stam.auth-membership-gate.js` | `resolveTargetFromMembership` 테스트 export |
| `stam/js/stam.auth-project-list.js` | 변경 없음 (기존 read-only 목록·선택 로직 사용) |
| `stam/pages/auth/*.html` (5) | `stam.auth-membership-gate.js` 연결; `projects.html`에 `stam.auth-project-list.js` |
| `firestore.rules` | PR #356 주석 (rules 동작 변경 없음) |
| `scripts/test-membership-gate-contract.mjs` | **신규** |
| `scripts/test-auth-entry-flow-contract.mjs` | `stam.auth.js` 기준으로 갱신 |
| `docs/reports/STAM_PR356_Membership_Gate_Project_List_Read.md` | 본 리포트 |

## 4. Firestore read 범위

| 경로 | 용도 |
|------|------|
| `users/{uid}` | 본인 문서 read (disabled 분기) |
| `collectionGroup('members')` | `userId` / `emailNormalized`로 membership discovery |
| `projects/{projectId}` | active membership에 해당하는 프로젝트 메타 read |

**금지 (이번 PR):** `projects/**` write, `members/**` write, 산출물 전체 write

## 5. Membership gate 우선순위

`stam.auth-membership-gate.js` — `resolveTargetFromMembership`:

1. `users/{uid}.status == disabled` → `access-denied.html`
2. membership 중 **하나라도** `status == active` → `projects.html`
3. active 없고 **pending** 존재 → `access-pending.html`
4. active/pending 없고 **denied** 또는 **removed** → `access-denied.html`
5. 해당 없음 → `no-project.html`

## 6. 프로젝트 선택 흐름

```txt
projects.html (active membership 카드)
→ 카드 클릭 / "프로젝트 열기"
→ sessionStorage: stam:selectedProjectId, stam:selectedProjectName
→ /pages/dashboard/project-overview.html?projectId={id}
```

## 7. 클라이언트 흐름

```txt
onAuthStateChanged(user)
→ bootstrapUserDoc(user)          // users/{uid} upsert (PR #355)
→ authMembershipGate.resolveTargetScreen(user)
→ applyMembershipRouteGuard(screen, target)
→ (project-select 화면) authProjectList.loadActiveProjects → 카드 렌더
```

## 8. 검증

```bash
node scripts/test-membership-gate-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
node scripts/test-project-context-guard-contract.mjs
node scripts/test-project-overview-context-copy-contract.mjs
```

## 9. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS | `stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.auth.css` |
| 사용 JS | `stam.auth-membership-gate.js`, `stam.auth.js`, `stam.auth-project-list.js`, `stam.theme.js` |
| 신규 CSS/JS 파일 | **0건** |
| inline style/script | **없음** |
| Firestore write (client) | `users/{uid}` bootstrap only (PR #355) |
| 금지 경로 (`boards/`, `dashboard/`, `nav-data.js`, package) | **미변경** |

## 10. 미포함 (후속 PR)

- 프로젝트 생성 write (`projects/{projectId}` + `members/{uid}`)
- `members/{uid}` create/update
- 산출물 CRUD
- 초대 기능
- 이메일/비밀번호 로그인

## 11. Rules 배포

`firestore.rules` 로직 변경 없음. merge 후 별도 deploy 불필요 (PR #355 rules와 동일).
