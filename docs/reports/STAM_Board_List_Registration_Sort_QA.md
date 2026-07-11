# STAM — Board List Registration Sort QA

## 1. 목적

일반 CRUD 게시판 목록의 기본 정렬을 **등록 순서 보존** 계약으로 고정한다.

수정(`updatedAt` 갱신)이 등록 시퀀스·업무 코드 순서를 뒤집지 않아야 한다.

## 2. 공통 계약 (SSOT)

**파일:** `stam/js/stam.board-list.js`  
**API:** `STAMBoardList.sortByBoardRegistration(list)`

| 순위 | 키 | 방향 |
|------|-----|------|
| 1 | `createdAt` | 내림차순 |
| 2 | 업무 코드 숫자 (`REQ_###`, `FN_###` trailing digits) | 내림차순 |
| 3 | document `id` | 문자열 내림차순 |

`updatedAt`은 정렬 키로 사용하지 않는다.

## 3. 적용 범위 (본 PR)

| 게시판 | list 모듈 |
|--------|-----------|
| 요구사항정의서 | `stam.requirements-firestore-list.js` |
| 기능정의서 | `stam.functional-spec-firestore-list.js` |

## 4. 회귀 시나리오

| # | 시나리오 | 기대 |
|---|----------|------|
| S-01 | `REQ_001` 등록 → `REQ_002` 등록 → `REQ_001` 수정 후 refresh | `REQ_002`가 `REQ_001` **위** |
| S-02 | `FN_001` 등록 → `FN_002` 등록 → `FN_001` 수정 후 refresh | `FN_002`가 `FN_001` **위** |
| S-03 | `createdAt` 동일 | 코드 숫자 큰 행이 위 |
| S-04 | `createdAt`·코드 동일 | `id` 문자열 큰 행이 위 |

## 5. Contract

```bash
node scripts/test-board-list-sort-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
```

| script | 기대 | 결과 |
|--------|------|------|
| `test-board-list-sort-contract.mjs` | PASS | [x] PASS |
| `test-requirements-firestore-list-contract.mjs` | PASS — newer `createdAt` wins over newer `updatedAt` | [x] PASS |
| `test-functional-spec-list-contract.mjs` | PASS — 동일 | [x] PASS |

## 6. PR #367 정렬 정책 대체

`STAM_PR367_Requirements_List_Latest_Sort_QA.md`의 `updatedAt desc` 우선 정렬은 **폐기**한다.  
등록 순서 보존이 STAM 일반 CRUD 게시판 기본 동작이다.

## 7. Maintainer live spot-check (merge 전 — maintainer 세션)

| # | 시나리오 | 결과 |
|---|----------|------|
| S-01 live | `REQ_001` 수정 후 refresh — `REQ_002`가 위 유지 | [ ] |
| S-02 live | `FN_001` 수정 후 refresh — `FN_002`가 위 유지 | [ ] |
| S-03 live | code 없는 legacy 요구사항 연결 — 제목 표시·새로고침 유지 | [ ] |
| S-04 live | 검색/필터 해제 후 순서 유지 | [ ] |
| S-05 live | console fatal error 없음 | [ ] |

## 8. 판정

| 계층 | 결과 |
|------|------|
| Contract (§5) | [x] PASS |
| Maintainer live (§7) | [ ] merge 전 maintainer 확인 대기 |
