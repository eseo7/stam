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
| `stam/pages/boards/functional-specification.html` | picker mount + requirements read scripts |
| `scripts/test-requirement-picker-contract.mjs` | **신규** |
| `scripts/test-functional-spec-crud-ui-contract.mjs` | picker integration assertions |
| `docs/ops/STAM-Decisions-and-Heuristics.md` | §4-27 FS-6B 결정 로그 |

## 5. Picker 계약 (FS-6B)

| 항목 | 내용 |
|------|------|
| 표시 | `REQ_### · 요구사항 제목` |
| 저장 (연결) | `requirementId`, `requirementCode`, `requirementTitle` |
| 연결 해제 | 세 필드 모두 empty string (update patch) / create 시 omit |
| 데이터 소스 | `requirementsService.listByProject` (read only) |
| UI 클래스 | 기존 `stam-cs-*`, `stam-input`, `stam-btn` only |
| 복수 선택 | **미지원** |
| rules / counter / adapter | **미변경** |
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
```

## 8. Governance

| 항목 | 결과 |
|------|------|
| `firestore.rules` | **변경 없음** |
| `stam.functional-spec-firestore-adapter.js` | **변경 없음** |
| `stam.functional-spec-service.js` | **변경 없음** |
| `stam/css/**` | **변경 없음** |
| `stam.nav-data.js` | **변경 없음** |
| Requirements create/update/delete | **미변경** |
| WBS/screenSpecs JS | **미변경** |

## 9. 후속 PR

| PR | 범위 |
|----|------|
| FS-7 | maintainer Google 세션 live Firestore persistence evidence |
