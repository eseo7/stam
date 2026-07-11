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

## 5. Contract (automated)

```bash
node scripts/test-board-list-sort-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
node scripts/qa-fs7-pr381-agent-verification.mjs
```

| script | 기대 | 결과 |
|--------|------|------|
| `test-board-list-sort-contract.mjs` | PASS | [x] PASS |
| `test-requirements-firestore-list-contract.mjs` | newer `createdAt` beats newer `updatedAt` | [x] PASS |
| `test-functional-spec-list-contract.mjs` | 동일 | [x] PASS |
| `qa-fs7-pr381-agent-verification.mjs` | agent items 3–5 | [x] PASS |

## 6. PR #367 정렬 정책 대체

`STAM_PR367_Requirements_List_Latest_Sort_QA.md`의 `updatedAt desc` 우선 정렬은 **폐기**한다.  
등록 순서 보존이 STAM 일반 CRUD 게시판 기본 동작이다.

## 7. Live QA — 역할별 (PR #381 merge gate)

상세 표는 `STAM_FS7_Legacy_Requirement_Display_Hotfix_QA.md` §7 SSOT.

| # | 시나리오 | 담당 | 결과 |
|---|----------|------|------|
| L-01 | `FN_001` 수정 후 refresh — `FN_002` 위 유지 | Maintainer (user) | [ ] |
| L-02 | legacy 요구사항 연결 제목·refresh 유지 | Maintainer (user) | [ ] |
| L-03 | requirements 동일 sort helper | Agent | [x] PASS |
| L-04 | 검색/필터 해제 후 순서 유지 | Agent | [x] PASS |
| L-05 | console fatal error 없음 | Agent | [x] PASS |

## 8. 판정

| 계층 | 결과 |
|------|------|
| Contract (§5) | [x] PASS |
| Agent live (§7 L-03~L-05) | [x] PASS |
| Maintainer live (§7 L-01~L-02) | [ ] user 수동 확인 대기 |

**Squash merge 조건:** L-01 · L-02 maintainer [x] 후 진행
