# STAM PR #358 — Requirements Write Rules by Role

## 1. 목적

PR #357 project create 이후, `projects/{projectId}/requirements/{requirementId}` write rules를 **role-scoped**로 제한적으로 연다.

- active member 중 `owner` / `admin` / `editor` → create·update 허용
- `viewer` → read only (write deny)
- delete → **이번 PR 미개방**
- UI CRUD wiring → **후속 PR**
- functionalSpecs / wbsItems / screenSpecs write → **계속 금지**

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `b37665f` |
| 선행 | PR #354–#357 Auth + membership + project create |
| SDK | Firebase compat v8.10.1 |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `firestore.rules` | requirements role-scoped create/update helpers + match block |
| `stam/js/stam.requirements-service.js` | role authorize skeleton (`WRITE_ROLES`, `createMemberRoleAuthorize`) |
| `scripts/test-requirements-rules-contract.mjs` | **신규** |
| `scripts/test-project-create-contract.mjs` | requirements rules assertion 갱신 |
| `scripts/test-requirements-service-contract.mjs` | role authorize contract 추가 |
| `docs/reports/STAM_PR358_Requirements_Write_Rules_By_Role.md` | 본 리포트 |
| `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md` | rules 롤아웃 단계 3 완료 |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-13 PR #358 결정 기록 |

## 4. Firestore write 범위

| 경로 | read | create | update | delete |
|------|------|--------|--------|--------|
| `projects/{projectId}/requirements/{requirementId}` | active member | owner/admin/editor | owner/admin/editor | **deny** |
| `wbsItems` / `screenSpecs` / `screenFields` / `screenActions` / `artifactLinks` | active member | **deny** | **deny** | **deny** |
| `projects/{projectId}` | active member | creator (PR #357) | **deny** | **deny** |
| `members/{uid}` | scoped read | owner create (PR #357) | **deny** | **deny** |
| `users/{uid}` | self | bootstrap (PR #355) | bootstrap | **deny** |

### Role matrix (requirements)

| role | read | create/update | delete |
|------|------|---------------|--------|
| owner | yes | yes | no |
| admin | yes | yes | no |
| editor | yes | yes | no |
| viewer | yes | no | no |

## 5. Rules helper 계약

| helper | 역할 |
|--------|------|
| `memberRole(projectId)` | active member doc의 `role` |
| `isRequirementWriter(projectId)` | active + role ∈ {owner, admin, editor} |
| `isValidRequirementTitle(title)` | string, 1–200자 |
| `isValidRequirementCreate(projectId)` | writer + `projectId` 일치 + `createdBy`/`updatedBy` == uid + timestamps |
| `isValidRequirementUpdate(projectId)` | writer + immutable fields 보존 (`createdBy`, `createdAt`, soft-delete fields) |

## 6. Service skeleton

`stam.requirements-service.js`에 role authorize 헬퍼만 추가. **런타임 기본 `window.STAM.requirementsService`는 기존 allow-all `defaultAuthorize()` 유지** — UI wiring 전까지 Firestore adapter 직접 호출 경로 변경 없음.

| export | 용도 |
|--------|------|
| `WRITE_ROLES` / `READ_ROLES` | role 상수 |
| `canWriteRequirements(role)` | client-side pre-check skeleton |
| `canReadRequirements(role)` | client-side pre-check skeleton |
| `createMemberRoleAuthorize(getMemberRole)` | service `authorize` 주입용 factory — DELETE 항상 false |

## 7. 검증

```bash
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-project-create-contract.mjs
node scripts/test-membership-gate-contract.mjs
npx -y firebase-tools@13.35.1 emulators:exec --only firestore --project demo-rules-compile "echo RULES_OK"
```

## 8. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS | **변경 없음** (UI 미포함) |
| 사용 JS | `stam.requirements-service.js` (기존 파일 확장) |
| 신규 CSS/JS 파일 | **0건** (`stam.requirements-service.js`는 PR #313 기존 파일) |
| inline style/script | **없음** |
| 금지 경로 | **미변경** (auth/boards/dashboard pages, nav-data, workflows 등) |

## 9. 미포함 (후속 PR)

- Requirements CRUD UI wiring
- requirement delete (soft/hard)
- functionalSpecs / wbsItems / screenSpecs write rules
- 멤버 초대/수정/삭제
- project update/delete

## 10. Rules 배포

`firestore.rules` 로직 변경 포함. merge 후 staging rules deploy 필요.
