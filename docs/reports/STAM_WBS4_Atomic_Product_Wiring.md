# STAM WBS-4 Atomic Product Wiring

## 1. 목적

WBS 제품 화면(`wbs.html`)을 정적·Local DB 혼합 상태에서 프로젝트별 Firestore Live 화면으로 전환한다. 목록·상세·등록·수정은 `STAM.wbsService` / `STAM.wbsFirestoreAdapter` 경유만 허용하며, WBS-3 picker·member source를 제품 화면에 연결한다.

## 2. base commit

`b0db1d764787a15f5d21122ecb97699ca17ad251`

## 3. 변경 파일 (15)

| # | 파일 |
|---|------|
| 1 | `stam/pages/boards/wbs.html` |
| 2 | `stam/js/stam.wbs.js` |
| 3 | `stam/js/stam.board-filter.js` |
| 4 | `stam/js/stam.ui-messages.js` |
| 5 | `stam/css/stam.wbs.css` |
| 6 | `stam/js/stam.wbs-firestore-list.js` (신규) |
| 7 | `stam/js/stam.wbs-firestore-crud.js` (신규) |
| 8 | `scripts/test-wbs-service-contract.mjs` |
| 9 | `scripts/test-wbs-picker-hooks-contract.mjs` |
| 10 | `scripts/test-wbs-list-contract.mjs` (신규) |
| 11 | `scripts/test-wbs-crud-ui-contract.mjs` (신규) |
| 12 | `scripts/test-wbs-derived-contract.mjs` (신규) |
| 13 | `scripts/test-wbs-live-html-contract.mjs` (신규) |
| 14 | `scripts/test-board-filter-dynamic-options-contract.mjs` (신규) |
| 15 | `docs/reports/STAM_WBS4_Atomic_Product_Wiring.md` (신규) |

## 4. Script loading order

`wbs.html` 하단:

1. `stam.icons.js`
2. `stam.ui-messages.js`
3. `stam.ui-feedback.js`
4. `stam.theme.js`
5. `stam.nav-data.js`
6. `stam.shell.js`
7. `stam.nav-render.js`
8. `stam.topbar-render.js`
9. `stam.project-context-guard.js`
10. `stam.project-context-render.js`
11. `stam.board-filter.js`
12. `stam.wbs.js`
13. Firebase reserved (`firebase-app`, `firebase-auth`, `firebase-firestore`, `init.js`)
14. `stam.wbs-firestore-adapter.js`
15. `stam.wbs-service.js`
16. requirements / functional-spec adapters & services
17. reference / requirement / functional-spec / member pickers
18. `stam.wbs-firestore-list.js`
19. `stam.wbs-firestore-crud.js`

제거: `stam.auth-bootstrap.js`, `stam.core-db-schema.js`, `stam.local-core-db.js`, `stam.wbs-cycle.js`, `stam.wbs-crud.js`

## 5. Auth / membership gate

`stam.wbs-firestore-list.js` `load()`:

1. Firebase Auth current user → 없으면 login
2. `projects/{projectId}/members/{uid}` active 확인 → 없으면 access-denied
3. `projects/{projectId}` 존재 확인 → 없으면 projects
4. 통과 후 role-bound service로 목록 로드

허용 직접 Firestore query: project doc, member doc만.

## 6. Authorized WBS service

```text
membership 확인 → bindAuthorizedService(role) → svc = service() → svc.listByProject / getById
```

`STAM.wbsServiceContract.createMemberRoleAuthorize` 사용. deny-by-default 전역 service 미사용.

## 7. Static → Live 전환

- `data-stam-wbs-live="true"`
- 정적 WBS-001~017 행 제거
- `<tbody id="wbs-live-feedback-host" data-stam-wbs-runtime>` 초기 host
- KPI 초기값 0 / `—`
- Detail drawer `data-wbs-detail="*"` hook + `—` 초기값

## 8. Local DB 제거

- `.wbs-v2-section`, Local script 로드 제거
- Local 모듈 파일 자체는 삭제하지 않음 (제품 load만 제거)

## 9. List renderer

`STAM.wbsFirestoreList`: 그룹별 tbody pair, 22열 row, XSS escape, loading/empty/error via `uiMessages.wbs` + `uiFeedback`.

## 10. Detail renderer

row click → `getById` → `renderDetail` → `wbsUi.openDrawer('detail')`. 목록 객체 직접 사용 금지.

## 11. Create flow

`STAM.wbsFirestoreCrud.openRegister` / `submitCreate` → `svc.create(projectId, input, context)`. atomic `WBS-###` code는 service/adapter.

## 12. Update flow

`openEdit` / `prefillEdit` / `submitUpdate` → `svc.update(projectId, item.id, patch, context)`.

## 13. Member picker

`data-stam-wbs-member-picker` + `data-stam-wbs-member-mode`. `projectMemberPicker.mount`, `applyDefaultOwner`(auth uid).

## 14. Requirement picker

`data-stam-requirement-picker` ×2, `requirementPicker.initAll`.

## 15. FunctionalSpec picker

`data-stam-functional-spec-picker` ×2, edit 시 `fnApi.load` → `setValue`.

## 16. Role UI

`canWriteWbs`: owner/admin/editor write, viewer read-only UI (등록·수정·picker disabled).

## 17. KPI

`computeKpis(items, todayIso)`: total, inProgress, done, delayed, dueWeek, groupCount.

## 18. Timeline/group summary

`computeTimelineSummary`: min/max date, inclusive days, average progress, functionGroup summary.

## 19. Filter/search

- 검색: code/title/owner/reviewer/businessArea/functionGroup/screenPath/requirement/functionalSpec
- board filter: status, priority, phase, group, owner (`setGroupOptions` 동적)
- 내 담당: `ownerId === user.uid`
- 리스크: `status=delayed` 또는 `deriveScheduleState().risk`

## 20. Excluded feature policy

삭제/import/export/temp-save/meeting/전체 Gantt/댓글/변경이력: visible + disabled, `title="1차 범위 외"`.

## 21. No fake live data

정적 샘플 이름·WBS-007·mock 댓글/이력 HTML 제거. `stam.wbs.js` shell만 유지.

## 21b. WBS-4 보정 (차단 결함)

초기 구현 검증에서 확인된 결함과 보정 내용:

| 결함 | 보정 |
|------|------|
| member API mismatch (`projectMemberReadService.listActiveMembers`) | `projectMemberPicker.listActiveMembers(projectId, context, memberRole)` + `applyDefaultOwner(auth uid)` |
| functionalSpec picker unmounted | `mountPickers()`에서 create/edit `[data-stam-functional-spec-picker]` 각 1회 `functionalSpecPicker.mount` |
| duplicate edit binding | Live 모드 Drawer 위임 `openEdit` 제거 — CRUD `bindEvents` 단독 소유 |
| fake Full View data (고정 timestamp·가짜 저장/등록·`style=`) | Live Full View read-only mirror + 실제 `updatedAt` hook + footer `[목록으로]` / 권한 시 `[수정]` |
| KST due-week drift (`toISOString().slice(0,10)`) | `formatLocalDate` / `weekBoundsLocal` 로컬 날짜 formatter |
| arbitrary progress width (`wbs-pct-N`) | native `<progress class="wbs-live-progress">` + `value` property |

## 22. Contract tests

| 테스트 | 결과 |
|--------|------|
| test-wbs-live-html-contract.mjs | PASS |
| test-wbs-list-contract.mjs | PASS |
| test-wbs-crud-ui-contract.mjs | PASS (행동 기반 VM: member API·picker mount·edit 단일 바인딩·viewer disabled) |
| test-wbs-derived-contract.mjs | PASS (KST due-week·progress value 1/37/82/99) |
| test-board-filter-dynamic-options-contract.mjs | PASS |
| test-wbs-service-contract.mjs | PASS |
| test-wbs-picker-hooks-contract.mjs | PASS |
| WBS/Req/FS 회귀 (§16) | PASS |

## 23. Preview CI

- 초기 Preview CI SUCCESS — Run `29255939017`
- 보정 commit Preview CI 별도 기록 (push 후 workflow run ID 갱신)

## 24. Browser QA

미수행 — Cloud Agent 환경에서 실제 Firebase 계정·Preview URL 수동 검증 불가.

## 25. Mobile QA

미수행 — 1920/1366/767/390 viewport 수동 검증 불가.

## 26. 미수행 항목

Manual QA 체크리스트 §20 전 항목: **미수행** (실제 계정/프로젝트 데이터 없음).

## 27. WBS-5 후속

- WBS 삭제/soft delete
- 댓글·변경이력 저장
- 회의록·화면설계 연결
- Excel import/export
- Task-level 전체 Gantt 동작
- Gantt drag/edit

---

### Gate 요약

| 항목 | 값 |
|------|-----|
| Firestore Rules 변경 | 0 |
| index 변경 | 0 |
| Local seed | 0 |
| delete API (제품) | 0 |
| direct WBS Firestore query (list/crud) | 0 |
| product Local DB script | 0 |
| static WBS row | 0 |
| fake live sample | 0 |
| Firebase config hardcoding | 0 |
| 새 CSS/JS (허용 목록 외) | 0 |
| inline style/script (HTML) | 0 |
