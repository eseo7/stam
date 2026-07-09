# STAM PR #367 — Requirements List State, Background, Code & Sort QA Report

## 1. 목적

PR #364 maintainer live QA 후속 제품 보정:

- list `state.items` 동기화
- `background` create/update persistence
- 사용자 표시용 `REQ_###` code (raw Firestore id 미노출)
- 목록 최신순 정렬 (`updatedAt` / `createdAt` desc)
- 삭제 버튼 visible + disabled (delete 미개방 유지)

## 2. 기준

| 항목 | 값 |
|------|-----|
| PR | #367 |
| branch | `cursor/requirements-list-state-background-code-d057` |
| head | `955e2fa` |
| Preview | `https://stam-design-staging--pr367-upa3k10d.web.app` |
| projectId | `stam-demo` |
| 선행 merge | PR #366 (`sortOrder` omit), PR #365 (`refreshCrudAccessUI`) |

## 3. 사전 contract (자동)

```bash
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-no-inline-style.mjs
```

| script | 결과 |
|--------|------|
| `test-requirements-service-contract.mjs` | **PASS** |
| `test-requirements-crud-ui-contract.mjs` | **PASS** |
| `test-requirements-firestore-list-contract.mjs` | **PASS** |
| `test-requirements-role-matrix-contract.mjs` | **PASS** |
| `test-requirements-rules-contract.mjs` | **PASS** |
| `test-requirements-empty-state-contract.mjs` | **PASS** |
| `test-requirements-no-inline-style.mjs` | **PASS** |

## 4. Maintainer live QA (2026-07-09)

| 항목 | 값 |
|------|-----|
| 수행 주체 | Maintainer |
| QA URL | `https://stam-design-staging--pr367-upa3k10d.web.app/pages/boards/requirements?projectId=stam-demo` |
| 프로젝트 | `stam-demo` |
| 세션 | owner (writer) |

### 시나리오별 결과

| # | 시나리오 | 결과 | 비고 |
|---|----------|------|------|
| M-01 | 신규 등록 `REQ_###` 순번 ID 표시 | **PASS** | `REQ_001` 형식 |
| M-02 | raw Firestore document id 사용자 화면 미노출 | **PASS** | 목록·상세·수정 |
| M-03 | 배경 입력 → create 후 상세/수정 유지 | **PASS** | |
| M-04 | 배경 비워도 등록 가능 | **PASS** | optional field |
| M-05 | 배경 update 후 새로고침 유지 | **PASS** | |
| M-06 | 삭제 버튼 노출 + disabled | **PASS** | toolbar + detail |
| M-07 | delete / softDelete 미개방 | **PASS** | alert guard 유지 |
| M-08 | `requirementsFirestoreList.getState().items.length > 0` | **PASS** | load 후 state 동기화 |
| M-09 | 신규 등록 row 목록 최상단 | **PASS** | latest sort |
| M-10 | 기존 row 수정 후 refresh → 최상단 | **PASS** | latest sort |
| M-11 | 콘솔 오류 없음 | **PASS** | |

### 미확인 (이번 maintainer 세션 범위 외)

| # | 시나리오 | 결과 | 비고 |
|---|----------|------|------|
| — | `updatedAt` 동일 시 code/id fallback 정렬 | **미확인** | contract only |

## 5. Ready gate 판정

| 구분 | 상태 |
|------|------|
| Contract smoke (§3) | **PASS** |
| Maintainer live QA (§4) | **PASS** |
| CI `preview` | **PASS** |
| CI `deploy_firestore_rules` | **PASS** |
| `mergeStateStatus` | **CLEAN** |
| **PR #367 최종** | **Ready 가능** |

## 6. 변경 파일 (PR #367)

| 파일 | 변경 요약 |
|------|-----------|
| `stam/js/stam.requirements-firestore-list.js` | `state.items` sync, `formatRequirementCode`, latest sort |
| `stam/js/stam.requirements-firestore-crud.js` | `background` create/update, visible disabled delete |
| `stam/js/stam.requirements-firestore-adapter.js` | `REQ_###` counter transaction |
| `stam/js/stam.requirements-service.js` | `background` payload, omit empty code/background |
| `stam/js/stam.requirements.js` | delete selection guard |
| `stam/pages/boards/requirements.html` | optional 배경, danger-outline delete |
| `firestore.rules` | `background`, `counters/requirements` |
| `scripts/test-requirements-*-contract.mjs` | contract coverage |
| `docs/reports/STAM_PR367_*.md` | QA evidence |

## 7. 범위 외 (유지)

| 항목 | 비고 |
|------|------|
| requirement delete / softDelete 개방 | 후속 PR |
| `stam/js/stam.nav-data.js` | 미변경 |
| workflows / `package.json` | 미변경 |

## 8. Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 (`stam/css`, `stam/js` 신규) | **0건** |
| inline style/script (diff) | **없음** |
| delete/softDelete | **미개방** |

## 9. 관련 리포트

- `docs/reports/STAM_PR367_Requirements_List_Latest_Sort_QA.md` — latest-sort 부분 상세
