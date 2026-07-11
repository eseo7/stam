# STAM FS-7 Hotfix — Legacy Requirement Display (code 없는 연결)

## 1. 목적

기능정의서에서 code 없는 legacy 요구사항을 picker로 연결·변경했을 때 list/detail 연결 표시가 사라지는 회귀를 보정한다.

## 2. 현상

| 단계 | 결과 |
|------|------|
| `REQ_###` 요구사항 연결 | chip·detail 정상 표시 |
| code 없는 legacy 요구사항으로 **변경** | 연결은 저장되나 UI에서 **숨김** |
| 원래 `REQ_###` 요구사항으로 **되돌림** | 다시 표시 |

## 3. 원인

1. Picker는 legacy 요구사항(code 없음) 선택 가능
2. 저장: `requirementId` + `requirementTitle`, `requirementCode`는 빈 문자열
3. List/detail 렌더: `requirementCode` 있을 때만 표시
4. → Firestore 연결 존재, UI만 미표시

## 4. 수정 범위

| 허용 | 금지 |
|------|------|
| `stam/js/stam.functional-spec-firestore-list.js` | picker 저장 로직 |
| contract tests | functional-spec service/adapter |
| 본 QA · Decisions §4-28 | firestore.rules, counter, CRUD create/update, CSS |

## 5. 표시 계약

| 저장 상태 | list chip / detail 라벨 |
|-----------|-------------------------|
| code + title | `REQ_001 · 요구사항 제목` |
| code only | `REQ_###` |
| title only (legacy) | 요구사항 제목 |
| id only | `(제목 없음)` |
| **금지** | raw Firestore doc id, 임의 생성 `REQ_###` |

연결 판정: `requirementId` **OR** `requirementTitle` **OR** `requirementCode`.

## 6. Contract (automated)

```bash
node scripts/test-functional-spec-list-contract.mjs
node scripts/test-functional-spec-crud-ui-contract.mjs
node scripts/test-board-list-sort-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/qa-fs7-pr381-agent-verification.mjs
```

| script | 기대 | 결과 |
|--------|------|------|
| `test-functional-spec-list-contract.mjs` | legacy display + registration sort | [x] PASS |
| `test-functional-spec-crud-ui-contract.mjs` | `hasRequirementLink`, `requirementDisplayLabel` | [x] PASS |
| `test-board-list-sort-contract.mjs` | `createdAt` desc · code · id | [x] PASS |
| `test-requirements-firestore-list-contract.mjs` | registration sort applied | [x] PASS |
| `qa-fs7-pr381-agent-verification.mjs` | agent live items 3–5 | [x] PASS |

## 7. Live QA — 역할별 (PR #381 merge gate)

| # | 시나리오 | 담당 | 결과 | 비고 |
|---|----------|------|------|------|
| L-01 | `FN_001` 수정 후 refresh → `FN_002`가 위 유지 | **Maintainer (user)** | [ ] | 대표 수동 QA |
| L-02 | code 없는 legacy 요구사항 연결 → 저장/refresh 후 **제목** 유지 | **Maintainer (user)** | [ ] | 대표 수동 QA |
| L-03 | 요구사항 목록도 `STAMBoardList.sortByBoardRegistration` 사용 | **Agent** | [x] PASS | source + contract |
| L-04 | 검색/필터 해제 후 DOM 행 순서 유지 | **Agent** | [x] PASS | display-only filter/search |
| L-05 | console fatal error 없음 | **Agent** | [x] PASS | contract harness PASS |

### Agent evidence (L-03~L-05)

- `stam.requirements-firestore-list.js` · `stam.functional-spec-firestore-list.js` → `sortByBoardRegistration`
- 검색: `#fn-search-input` — `display` 토글만, `.sort()` 없음
- 필터: `stam.board-filter.js` — chip UI mock; `onReset`/`onApply`가 tbody 재정렬 없음
- `node scripts/qa-fs7-pr381-agent-verification.mjs` — **PASS**

## 8. 판정

| 계층 | 결과 |
|------|------|
| Contract (§6) | [x] PASS |
| Agent live (§7 L-03~L-05) | [x] PASS |
| Maintainer live (§7 L-01~L-02) | [ ] **merge gate** — user 수동 확인 대기 |

**Squash merge 조건:** L-01 · L-02 maintainer [x] 후 진행

## 9. 연계 — 목록 정렬 계약 (PR #381 확장)

legacy 요구사항 표시 보정과 함께 요구사항·기능정의서 목록 정렬을 `STAMBoardList.sortByBoardRegistration` 공통 계약으로 통일했다.

- 문서: `docs/reports/STAM_Board_List_Registration_Sort_QA.md`
- Decisions: §4-29
- `updatedAt` 우선 정렬 회귀 제거 — `createdAt` desc 기준
