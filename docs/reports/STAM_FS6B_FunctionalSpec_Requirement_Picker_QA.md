# STAM FS-6B — Functional Specification Requirement Picker QA

## 1. 목적

기능정의서 등록/수정 Drawer의 요구사항 free-text 입력을 **공통 requirement picker**로 교체하고, Firestore requirements read-only 목록에서 단일 요구사항을 연결한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `13783af` (FS-6A FN_### counter #377) |
| 화면 | `stam/pages/boards/functional-specification.html` |
| 연결 | 단일 optional FK (`requirementId` + denormalized snapshot) |

## 3. Requirements read API 조사 결과

| 우선순위 | API | 판정 |
|----------|-----|------|
| 1 | `STAM.requirementsService.listByProject(projectId, query, context)` | **사용** — picker read client |
| 2 | `STAM.requirementsFirestoreAdapter.create().listByProject` | service 내부 boundary (picker 직접 호출 없음) |
| 금지 | `STAM.requirementsFirestoreList` | **미사용** — list UI 전용 |

picker는 `requirementsServiceContract.createMemberRoleAuthorize`로 **read-only** service client를 생성하고, `includeDeleted: false` query로 목록을 로드한다.

## 4. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.requirement-picker.js` | **신규** — 공통 picker API |
| `stam/js/stam.functional-spec-firestore-crud.js` | picker wiring, create/update payload |
| `stam/js/stam.functional-spec-firestore-adapter.js` | unlink 시 requirement 3필드 `FieldValue.delete()` |
| `stam/js/stam.functional-spec-firestore-list.js` | requirement 표시 `requirementCode` only |
| `stam/pages/boards/functional-specification.html` | picker mount + requirements read scripts |
| `scripts/test-requirement-picker-contract.mjs` | **신규** |
| `scripts/test-functional-spec-crud-ui-contract.mjs` | picker integration + unlink delete assertions |
| `scripts/qa-fs6b-requirement-picker-browser-smoke.mjs` | **신규** — writer smoke |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-27 FS-6B 결정 로그 |

## 5. Picker 계약 (FS-6B)

| 항목 | 내용 |
|------|------|
| 표시 | `REQ_### · 요구사항 제목` |
| 저장 (연결) | `requirementId`, `requirementCode`, `requirementTitle` |
| 연결 해제 | update 시 adapter가 세 필드를 `FieldValue.delete()`로 **문서에서 제거** / create 시 omit |
| 표시 ID | `REQ_###` (`requirementCode`/`code` only) — raw Firestore doc id **미노출** |
| 데이터 소스 | `requirementsService.listByProject` (read only) |
| UI 클래스 | 기존 `stam-cs-*`, `stam-input`, `stam-btn` only |
| 복수 선택 | **미지원** |
| rules / FN counter / functional-spec service / css / nav | **미변경** (adapter unlink delete만 예외) |
| delete/softDelete | **미개방** |
| live persistence evidence | **FS-7 후속** (PASS 미선언) |

## 6. 공통 API

```js
window.STAM.requirementPicker = {
  READ_SOURCE: 'requirementsService.listByProject',
  formatRequirementCode(item),
  formatOptionLabel(item),          // REQ_### · title
  createReadService(memberRole),
  listRequirements(projectId, context, memberRole),
  mount(container, options),
  getValue(container),
  setValue(container, value),
  clear(container),
  setDisabled(container, disabled),
  refreshContext(container, options),
  initAll({ getProjectId, getContext, getMemberRole }),
  destroy(container),
  closeAll(exceptContainer),
};
```

## 7. 검증

```bash
node --check stam/js/stam.requirement-picker.js
node scripts/test-requirement-picker-contract.mjs
node scripts/test-functional-spec-crud-ui-contract.mjs
node scripts/test-functional-spec-counter-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
node scripts/test-functional-spec-service-contract.mjs
node scripts/test-functional-spec-role-matrix-contract.mjs
node scripts/qa-fs6b-requirement-picker-browser-smoke.mjs
```

## 8. Governance

| 항목 | 결과 |
|------|------|
| `firestore.rules` | **변경 없음** |
| `stam.functional-spec-firestore-adapter.js` | unlink 시 `FieldValue.delete()` (requirement 3필드) |
| `stam.functional-spec-service.js` | **변경 없음** |
| `stam/css/**` | **변경 없음** |
| `stam.nav-data.js` | **변경 없음** |
| Requirements create/update/delete | **미변경** |
| WBS/screenSpecs JS | **미변경** |

## 9. PR #378 Preview CI

| 항목 | 값 |
|------|-----|
| PR | #378 — `cursor/fs6b-requirement-picker-b31c` |
| Preview workflow | `PR Preview - Firebase Hosting` |
| Run | `29095862201` |
| 결론 | **SUCCESS** |
| Preview URL | `https://stam-design-staging--pr378-z0pftfji.web.app` |
| Channel | `pr378` |
| QA path | `/pages/boards/functional-specification?projectId=stam-demo` |

### Preview artifact check (2026-07-10 UTC)

| 항목 | 결과 |
|------|------|
| `stam.requirement-picker.js` | **PASS** |
| `stam.requirements-service.js` | **PASS** |
| `data-stam-requirement-picker` (×2 drawers) | **PASS** |
| `stam.functional-spec-firestore-adapter.js` | **PASS** |
| Drawer `FN-001` / `요구사항 목록 조회` mock | **PASS** — 없음 |
| 미인증 browser redirect | **PASS** → `/pages/auth/login` |

## 10. Browser writer smoke QA (제품 JS + Firebase shim)

로컬 정적 서버: `scripts/qa-fs6b-requirement-picker-browser-smoke.mjs` (`127.0.0.1:9877`)  
브라우저: Playwright Chromium headless  
Firebase: QA shim (requirements read, FN counter transaction, `FieldValue.delete` on unlink)

```bash
node scripts/qa-fs6b-requirement-picker-browser-smoke.mjs
```

### 10-1. 필수 live 확인 매트릭스

| # | Checklist | shim smoke | maintainer live Firestore |
|---|-----------|------------|---------------------------|
| 1 | 연결 등록 — requirementId/code/title 3필드 저장 | **PASS** | **미확인** |
| 2 | 다른 요구사항으로 변경 — 3필드 갱신 | **PASS** | **미확인** |
| 3 | 연결 해제 — 문서에서 3필드 실제 제거 (빈 문자열/null 잔존 없음) | **PASS** (shim) | **미확인 — PASS 금지** |
| 4 | picker/list/detail raw Firestore doc id 미노출 | **PASS** | **미확인** |
| 5 | 새로고침 후 선택/변경/해제 상태 유지 | **PASS** (shim localStorage) | **미확인** |
| 6 | FN_### code 생성 | **PASS** (`FN_001`) | **미확인** |
| 7 | delete/softDelete 미개방 | **PASS** | **PASS** (artifact + shim) |
| 8 | console fatal error 없음 | **PASS** | **미확인** |

> **Cloud Agent 한계:** Google OAuth maintainer 세션으로 Preview **실제 Firestore** persistence(특히 unlink 필드 제거)는 본 환경에서 대행 불가. §10 shim + §9 Preview artifact가 **Ready 전 primary automated evidence**이다. §3 maintainer live 확인 전까지 unlink live **PASS 선언 금지** (FS-7 후속).

### 10-2. Browser 실행 로그 (2026-07-10 UTC)

```txt
PASS  smoke-create-linked-fields: requirementId/code/title saved on create
PASS  smoke-fn-code-create: FN code allocated: FN_001
PASS  smoke-create-unlinked-omit: create without selection omits requirement fields
PASS  smoke-no-raw-req-id-visible: picker/list/detail text excludes raw Firestore doc ids
PASS  smoke-list-chip-code-only: list chip shows REQ_001 not raw doc id
PASS  smoke-update-change-req: all three fields updated to new requirement
PASS  smoke-unlink-delete-patch: update patch uses FieldValue.delete for all three fields
PASS  smoke-unlink-fields-removed-shim: stored document has no requirement link fields after unlink (shim)
PASS  smoke-link-bundle-atomic-unlink: unlink leaves all-or-nothing link state
PASS  smoke-refresh-persistence: reload keeps unlinked state; linked spec still has no requirement fields
PASS  smoke-delete-denied: delete/softDelete remains closed
PASS  smoke-console-clean: no pageerror/console.error
PASS  preview-http-200: ...pr378-z0pftfji.web.app/...
PASS  preview-artifact-fs6b: picker + requirements read stack present; mock absent
PASS  preview-unauth-redirect: .../pages/auth/login

--- summary ---
total=15 pass=15 fail=0
```

### 10-3. Contract 추가 확인

| 항목 | 결과 |
|------|------|
| 연결 상태 — 3필드 모두 존재 또는 모두 없음 | **PASS** (`isLinkedBundle` smoke + adapter atomic delete) |
| 부분 삭제/부분 잔존 금지 | **PASS** (`REQUIREMENT_UNLINK_FIELDS` 일괄 처리) |
| `applyRequirementUnlinkDeletes()` 3필드 원자 처리 | **PASS** (counter contract runtime) |
| create 미선택 3필드 omit | **PASS** (smoke + crud `buildCreateInput`) |

## 11. 종합 판정 (Ready)

| 영역 | 판정 |
|------|------|
| Preview CI deploy | **PASS** |
| Contract tests (§7) | **PASS** |
| Browser writer smoke (§10) | **PASS** |
| Delete 미개방 | **PASS** |
| Maintainer Preview **live Firestore** unlink 제거 | **미확인** — FS-7 / maintainer checklist |

**Ready 전환 권고:** §9–§10 automated smoke **PASS** 기준으로 PR #378 **Ready 전환 가능**. 다만 §10-1 #3 maintainer live Firestore unlink 확인 완료 전 merge 신뢰도는 FS-7 evidence에 의존한다.

## 12. 후속 PR

| PR | 범위 |
|----|------|
| FS-7 | maintainer Google 세션 live Firestore persistence evidence (unlink 필드 제거 포함) — `docs/reports/STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` |
