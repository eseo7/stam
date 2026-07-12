# STAM FS-7 — Functional Spec Update Link Root Cause (run 29188331795)

## Artifact evidence

| Check | Result |
|-------|--------|
| W-02 linked create | PASS — `REQ_002` persisted |
| W-05 change A→B | **FAIL** — before/after identical (`REQ_002`) |
| W-07 unlink | **FAIL** — 3 keys still present |
| W-08 refresh unlink | **FAIL** — same residual |
| W-09 unlinked create | PASS — create path OK |

**판정:** 제품 결함 (단일 update 저장 경로). QA 조작 결함 아님 — create/unlink-create/legacy는 PASS이나 edit 저장만 미반영.

## Root cause

`stam.functional-spec-firestore-crud.js` edit 버튼 핸들러가 `setTimeout(..., 0)`으로 `prefillEdit(item)`을 **지연 실행**했다.

Playwright live QA 순서:

1. `[data-fn-open="edit"]` click
2. `#fn-dw-edit.open` wait
3. requirement picker에서 B 선택 / unlink
4. 저장 클릭

지연된 `prefillEdit`가 **3번 이후** 실행되면 picker 선택값을 `currentItem`(A)으로 **덮어쓴다**.  
`buildUpdatePatch` → `getRequirementSelection`이 A를 읽어 Firestore에 변경 없음 → W-05~W-08 연쇄 FAIL.

## Fix (PR)

| File | Change |
|------|--------|
| `stam.functional-spec-firestore-crud.js` | sync `prefillEdit`; `applyRequirementLinkFields` 공통 매핑 (create/update) |
| `stam.functional-spec-firestore-list.js` | `renderDetail` 시 edit drawer prefill |
| `scripts/test-functional-spec-update-link-contract.mjs` | regression contract |

Unlink: update patch에 `''` 3필드 → adapter `FieldValue.delete()` (기존 FS-6B 경로 유지).
