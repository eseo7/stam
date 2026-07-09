# STAM PR #366 — Requirements Create Payload Rules QA Report

## 1. 목적

- PR #364 maintainer live QA에서 owner create submit 시 `Missing or insufficient permissions` 원인을 제거한다.
- `buildCreatePayload()`가 **`sortOrder: null`** 을 Firestore에 쓰지 않도록 보정한다.
- `firestore.rules` **미변경** — service payload를 rules optional-field 계약에 맞춘다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `ced08c2` |
| 선행 | PR #365 write access UI refresh |
| 진단 | create payload `sortOrder: null` → rules `data.sortOrder is int` 거부 |

## 3. 결함

| 항목 | 내용 |
|------|------|
| 증상 | owner `canWrite() === true`, 등록 버튼 활성, submit 시 permission denied |
| rules | `(!data.keys().hasAny(['sortOrder']) \|\| data.sortOrder is int)` |
| service (이전) | `sortOrder: normalizeSortOrder(...)` → 미입력 시 **`null` 키 포함** |
| 결과 | `null is int` → false → create reject |

## 4. 보정

| 파일 | 변경 |
|------|------|
| `stam/js/stam.requirements-service.js` | `buildCreatePayload()` / `buildUpdatePatch()` sortOrder omit; `normalizeSortOrder()` int 정합 |
| `scripts/test-requirements-service-contract.mjs` | omit assert (defaults / null / '') + int 포함 assert 유지 |
| `scripts/test-requirements-rules-contract.mjs` | rules sortOrder int + service omit cross-ref |
| `docs/reports/STAM_PR366_Requirements_Create_Payload_Rules_QA.md` | 본 리포트 |

### 계약 (변경 후)

| `sortOrder` 입력 | create payload | update patch |
|------------------|----------------|--------------|
| 미설정 / `null` / `''` | **키 없음** | **키 없음** |
| 정수 (`3`, `'3'`) | `sortOrder: 3` (int) | `sortOrder: 3` (int) |
| 소수 (`3.5`, `'3.5'`) | **키 없음** | **키 없음** |

## 5. 자동 검증

```bash
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
```

## 6. Live QA 후속 (PR #364)

| 시나리오 | 기대 |
|----------|------|
| owner create | permission denied **해소** |
| 새로고침 persistence | maintainer 재확인 |
| viewer create deny | 유지 |
| delete | 미개방 유지 |

## 7. 범위 외

| 항목 | 비고 |
|------|------|
| `firestore.rules` | 미변경 |
| `buildUpdatePatch` sortOrder null | **동일 omit** (create와 대칭) |
| delete / softDelete | 미개방 |
| pages / css / nav-data | 미변경 |

## 8. Governance

| 항목 | 결과 |
|------|------|
| 사용 JS | `stam.requirements-service.js` (기존 API) |
| 신규 CSS/JS 파일 | **0건** |
| inline style/script | **없음** |
| 금지 경로 변경 | **없음** |
