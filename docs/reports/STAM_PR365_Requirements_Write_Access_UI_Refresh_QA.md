# STAM PR #365 — Requirements Write Access UI Refresh QA Report

## 1. 목적

- PR #364 live browser QA에서 발견된 **등록 버튼 disabled 미해제** 결함을 수정한다.
- `list.load()` 성공 후 member role이 바인딩되면 CRUD write access UI를 **다시 갱신**한다.
- owner/admin/editor — 등록·수정 활성화; viewer — 등록·수정 disabled 유지; delete — 계속 disabled.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `5616295c3de95814bf46b7b8f2f1e892e32876e7` |
| 선행 | PR #360–#362 CRUD wiring, PR #364 live QA (결함 발견) |
| 대상 | `stam/js/stam.requirements-firestore-list.js`, `stam.requirements-firestore-crud.js` |

## 3. 결함

| 항목 | 내용 |
|------|------|
| 증상 | owner 세션에서 `canWrite()` → `true`인데 `#rq-reg-btn`.disabled → `true` |
| 원인 | CRUD `init()` 시점에 `state.member` 미준비 → `applyWriteAccessUI()`가 등록 버튼 disabled |
| 후속 | `list.load()` 성공 후 `member.role = owner` 세팅되나 UI **미재갱신** |
| 레이스 | `list.js` `ready(load)`가 `crud.js` `hookListLoad()`보다 먼저 최초 `load()` 실행 가능 |

## 4. 보정

| 파일 | 변경 |
|------|------|
| `stam.requirements-firestore-list.js` | `refreshCrudAccessUI()` helper 추가; `load()` 성공·실패 후 호출 |
| `stam.requirements-firestore-crud.js` | 변경 없음 — `applyWriteAccessUI` public API 유지 (`hookListLoad` 보조 경로 유지) |
| `scripts/test-requirements-firestore-list-contract.mjs` | load 후 `applyWriteAccessUI` 호출 assert |
| `scripts/test-requirements-crud-ui-contract.mjs` | `refreshCrudAccessUI` cross-ref assert |

### `refreshCrudAccessUI()` 계약

```js
function refreshCrudAccessUI() {
  var crud = window.STAM && window.STAM.requirementsFirestoreCrud;
  if (crud && typeof crud.applyWriteAccessUI === 'function') {
    crud.applyWriteAccessUI();
  }
}
```

호출 시점: `load()` → `renderRows` / `setSummary` (또는 `renderError`) **이후**.

## 5. 기대 UI (변경 없음)

| role | `#rq-reg-btn` | edit open | delete buttons |
|------|---------------|-----------|----------------|
| owner/admin/editor | **enabled** (load 후) | **enabled** | disabled + alert |
| viewer | disabled | disabled | disabled + alert |

## 6. 자동 검증 (contract)

```bash
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
```

## 7. Live browser QA (PR #364 재현 시나리오)

| 항목 | 수정 전 | 수정 후 (기대) |
|------|---------|----------------|
| `getState().member.role` | `owner` | `owner` |
| `canWrite()` | `true` | `true` |
| `#rq-reg-btn`.disabled | `true` (**결함**) | **`false`** |
| viewer `#rq-reg-btn`.disabled | `true` | `true` (유지) |
| delete buttons | disabled | disabled (유지) |

## 8. 범위 외

| 항목 | 비고 |
|------|------|
| `firestore.rules` | 미변경 |
| `stam/pages/**`, `stam/css/**`, `stam.nav-data.js` | 미변경 |
| requirement delete / softDelete | 미개방 |
| functionalSpecs / wbsItems / screenSpecs write | 미개방 |

## 9. Governance

| 항목 | 결과 |
|------|------|
| 사용 JS | `stam.requirements-firestore-list.js` (기존 API 확장), `stam.requirements-firestore-crud.js` (public `applyWriteAccessUI` 재사용) |
| 신규 CSS/JS 파일 | **0건** |
| inline style/script | **없음** |
| 금지 경로 변경 | **없음** |
