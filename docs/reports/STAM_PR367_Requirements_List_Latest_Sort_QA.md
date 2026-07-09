# STAM PR #367 — Requirements List Latest-Sort QA

## 1. 목적

Maintainer QA에서 확인된 목록 정렬 이슈를 보정한다.

- **기대:** 최신 등록/수정 요구사항이 목록 최상단
- **기준:** `updatedAt desc` → `createdAt desc` → `code`/`id` fallback

## 2. 구현

| 항목 | 내용 |
|------|------|
| 파일 | `stam/js/stam.requirements-firestore-list.js` |
| 함수 | `getTimestampMs()`, `sortRequirementsByLatest()` |
| 적용 시점 | `load()` 성공 후 `renderRows()` / `state.items` 갱신 전 |

## 3. Contract

```bash
node scripts/test-requirements-firestore-list-contract.mjs
```

| 결과 | 비고 |
|------|------|
| **PASS** | `REQ-003` (newer `updatedAt`)가 `REQ-001`보다 먼저 렌더 |

## 4. Maintainer re-QA

| # | 시나리오 | 기대 |
|---|----------|------|
| L-01 | 신규 등록 직후 목록 | 방금 등록한 항목이 **최상단** |
| L-02 | 기존 문서 수정 후 목록 refresh | 수정한 항목이 **최상단** |
| L-03 | `updatedAt` 동일 시 | `code`/`id` fallback 정렬 (안정적 표시) |

## 5. 범위 외

- `firestore.rules` 미변경
- adapter `sortOrder` 정렬은 유지 (list 화면에서 재정렬)
- delete / softDelete 미개방 유지
