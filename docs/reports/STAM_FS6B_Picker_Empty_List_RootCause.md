# STAM FS-6B — Requirement Picker Empty List Root Cause

## 1. 현상 (FS-7 maintainer live QA)

| 항목 | 값 |
|------|-----|
| URL | `/pages/boards/functional-specification.html?projectId=stam-demo` |
| 기대 | picker open → `REQ_### · 제목` 목록 + `연결 없음` |
| 실제 | `연결 없음` **만** 표시 |
| 판정 | FS-7 **FAIL** (live) |

## 2. 확인 항목별 결과

| # | 확인 항목 | 결과 |
|---|-----------|------|
| 1 | picker `projectId` = `stam-demo` | **FAIL** — mount 시점 `''` 로 고정되는 race |
| 2 | `requirementsService.listByProject` 결과 | **호출 실패/미호출** — `projectId` 없으면 reject |
| 3 | auth/member context | **FAIL** — list `load()` 완료 전 `memberRole` 미주입 |
| 4 | 조회 오류 → 빈 목록 | **YES** — `openPicker().catch()` 가 error 를 삼킴 |
| 5 | `isDeleted`/code/title 정규화 | **해당 없음** — list API 호출 자체가 실패 |
| 6 | Drawer open race | **YES** — 핵심 원인 |
| 7 | `refreshContext()` / `load()` hook | **PARTIAL** — `hookListLoad` 가 첫 `load()` **이후** 등록 |

## 3. 근본 원인 (타임라인)

스크립트 순서: `functional-spec-firestore-list.js` → `functional-spec-firestore-crud.js`

`DOMContentLoaded` 시:

1. **list** `ready(load)` — `guardProjectAccess` 비동기 시작 (`state.projectId` 아직 `''`)
2. **crud** `init()` — `initAll()` 이 `getProjectId()` → `''` 로 picker mount
3. **crud** `refreshRequirementPickerContext()` — 동일하게 `projectId: ''`
4. list `load()` 완료 → `state.projectId = 'stam-demo'` 설정
5. **그러나** `hookListLoad()` 는 `init()` 안에서만 호출되어 **이미 시작된 첫 load** 에 hook 미적용
6. → `refreshRequirementPickerContext()` **재호출 없음**
7. picker open → `listRequirements('')` → `projectId is required` reject
8. `openPicker` catch → `renderOptions([], '')` → **`연결 없음`만 표시**

부가 요인:

- `memberRole` 도 동일 race 로 비어 있으면 `permission denied` → 동일 증상
- shim smoke(15/15)는 `waitFor(projectId)` 후 테스트하여 **live에서만 재현**

## 4. 보정 방향 (PR)

| 파일 | 변경 |
|------|------|
| `stam.requirement-picker.js` | `applyLiveContext()` — open/load 시 `initAll` provider 재조회; `loadError` UI 표시 |
| `stam.functional-spec-firestore-crud.js` | `hookListLoad()` **모듈 parse 시점** 즉시 호출; register/edit drawer open 시 `refreshRequirementPickerContext()` |

금지 준수: free-text fallback 없음, raw id 표시 없음, rules/delete 변경 없음.

## 5. FS-7 재검증

보정 merge 후 maintainer가 동일 URL에서 W-02(요구사항 선택 등록) 재실행.
