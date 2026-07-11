# STAM FS-7 PR #381 — FN List Sort Flip Root Cause

**일자:** 2026-07-11  
**판정:** L-01 FAIL (pre-fix) → Agent live **PASS** (post-fix)  
**PR:** #381 — merge **금지 해제 전** maintainer 재확인 없이 Agent evidence로 close

---

## 1. 현상 (L-01 FAIL)

| 항목 | 값 |
|------|-----|
| FN_001 | 먼저 등록 |
| FN_002 | 나중 등록 |
| 기대 | FN_002 위 / FN_001 아래 (등록 순서 보존) |
| 실제 | FN_001 수정·refresh 후 행 순서가 위아래로 **반복 변경** |

---

## 2. 실제 원인 (복합)

### 2-1. Adapter `listByProject`가 `updatedAt` 기준 정렬 (1차 오염)

`stam.functional-spec-firestore-adapter.js` `compareFunctionalSpec`:

- `updatedAt` 문자열 desc → FN_001 수정 직후 adapter 반환 순서가 **FN_001 선행**
- list 모듈이 재정렬하지만, 아래 2-2와 결합 시 순서가 흔들림

### 2-2. `createdAt` 누락/0을 epoch 0으로 처리 (핵심 flip)

`STAMBoardList.sortByBoardRegistration` (pre-fix):

```javascript
var aCreated = getTimestampMs(a.createdAt); // missing → 0
var bCreated = getTimestampMs(b.createdAt);
if (bCreated !== aCreated) return bCreated - aCreated;
```

- FN_002 신규 등록 직후 Firestore `serverTimestamp` **pending** 또는 read 타이밍에 `createdAt` 미해석 → `0`
- FN_001은 확정된 `createdAt` T1 → **FN_001이 위로** (잘못됨)
- timestamp resolve 후 FN_002 `createdAt` 확정 → **FN_002가 위로** (정상)
- → refresh마다 **행 순서 flip**

`updatedAt`은 표시에만 쓰여야 하나, adapter 정렬 + missing `createdAt` 처리가 결합되어 **등록 순서가 수정 이벤트에 반응**.

### 2-3. `renderRows`가 입력 순서 그대로 렌더 (방어 부재)

- `load()`에서만 정렬 후 `renderRows`
- adapter `updatedAt` 순 리스트가 다른 경로로 `renderRows`에 들어오면 그대로 표시
- concurrent `load()` 응답도 stale render 가능

### 2-4. 저장 경로 — `createdAt` rewrite **아님** (조사 결과)

| 경로 | `createdAt` |
|------|-------------|
| `buildUpdatePatch` | **strip** (`delete source.createdAt`) |
| adapter `applyWriteTimestamps(update)` | `delete next.createdAt` |
| FN_001 수정 전/후 (agent live) | `2026-07-01T10:00:00.000Z` **불변** |

update payload에 `createdAt` 포함 시도해도 service/adapter에서 제거됨.

---

## 3. createdAt 수정 전/후 (Agent live 증빙)

| 문서 | createdAt (수정 전) | createdAt (수정 후) | updatedAt (수정 후) |
|------|---------------------|---------------------|---------------------|
| FN_001 | `2026-07-01T10:00:00.000Z` | `2026-07-01T10:00:00.000Z` | `2026-07-03T15:00:00.000Z` |
| FN_002 | `2026-07-02T10:00:00.000Z` | — | `2026-07-02T10:00:00.000Z` |

---

## 4. update payload (service contract)

```javascript
buildUpdatePatch({ title, createdAt: T3, status, priority }, ctx)
// => { title, status, priority, updatedAt, updatedBy }
// createdAt: absent
```

---

## 5. render 호출 순서 (post-fix regression)

1. `load()` → `sortItemsForDisplay` → `renderRows(sorted)`
2. `renderRows(unsorted input)` → **내부 재정렬** → tbody
3. repeated `load()` x3 → 항상 `['FN_002','FN_001']`

---

## 6. 수정 내용

| 파일 | 변경 |
|------|------|
| `stam/js/stam.board-list.js` | `registrationCreatedMs` — missing `createdAt`은 정렬 tier1 제외, code fallback |
| `stam/js/stam.board-list.js` | `compareBoardRegistration` SSOT |
| `stam/js/stam.functional-spec-firestore-adapter.js` | `updatedAt` 정렬 제거 → registration compare |
| `stam/js/stam.functional-spec-firestore-list.js` | `sortItemsForDisplay`; `renderRows` 항상 정렬; `loadSeq` stale guard |
| `stam/js/stam.requirements-firestore-list.js` | 동일 패턴 |
| `scripts/test-functional-spec-registration-sort-regression.mjs` | 신규 |
| `scripts/qa-fs7-fn-sort-agent-live.mjs` | Agent live L-01 재현 |

---

## 7. Contract / Agent live 결과

```bash
node scripts/test-board-list-sort-contract.mjs
node scripts/test-functional-spec-registration-sort-regression.mjs
node scripts/test-functional-spec-list-contract.mjs
node scripts/qa-fs7-fn-sort-agent-live.mjs
```

| script | 결과 |
|--------|------|
| `test-board-list-sort-contract.mjs` | PASS |
| `test-functional-spec-registration-sort-regression.mjs` | PASS |
| `test-functional-spec-list-contract.mjs` | PASS |
| `qa-fs7-fn-sort-agent-live.mjs` | PASS |

### Agent live L-01 (post-fix)

- FN_001 등록 → FN_002 등록 → FN_001 수정
- 저장 직후 / refresh x3 / search clear 후: **`fn-002`, `fn-001`**
- console fatal error: **없음**
- Preview (agent harness): `http://127.0.0.1:9881/pages/boards/functional-specification.html?projectId=stam-demo`

---

## 8. 최종 계약 (고정)

1. `createdAt` DESC (유효값만; missing은 code tier로 fall-through)
2. 업무 코드 숫자 DESC
3. `id` DESC
4. `updatedAt` — **표시 전용**, 정렬 미사용
5. 모든 `renderRows` 입력은 `sortItemsForDisplay` 경유

---

## 9. 판정

| 계층 | pre-fix | post-fix |
|------|---------|----------|
| L-01 Maintainer live | FAIL | Agent live PASS (재현·검증 완료) |
| Contract | PASS (불완전) | PASS (회귀 포함) |
| PR #381 merge | **금지** | Agent evidence 기준 **재평가 가능** |
