# Visual QA — Board Factory · 기능정의서 v2 Preview

> PR: feat(board-factory): add functional specification v2 preview
> 기반: PR #135 (Board Factory v1.2 A-Class Inventory & Architecture, merge `b305fcc`)
> 성격: static / in-memory **preview**. 실제 저장/연동 없음.

---

## 1. 구현 범위

PR #135에서 확정한 Board Factory v1.2 설계/실사 결과를 바탕으로 한 **첫 번째 공통 게시판 엔진**과 그 첫 적용 화면(기능정의서 v2 preview).

- 공통 엔진 `STAM.boardFactory.mount(root, config)` 신규 구현
- config 기반 렌더링: header / summary / toolbar / table / drawer(register·detail·edit)
- DataSource 계약(`list / get / summary / create / update / remove`, mode=static)
- Query 상태(`keyword / filters / sort / page / pageSize`)
- ReferenceSource 계약(`listOptions / resolve`, type=users·screens·requirements)
- built-in column renderer 11종 + detail section renderer 3종(1차)
- 기능정의서 v2 config + in-memory seed 데이터

## 2. 변경 파일 (모두 신규)

| 파일 | 내용 |
| --- | --- |
| `stam/js/stam.board-factory.js` | Board Factory 엔진 |
| `stam/js/stam.board-configs.js` | 기능정의서 v2 config + static dataSource + referenceSource |
| `stam/css/stam.board-factory.css` | Factory 전용 스타일(기존 미커버 부분만) |
| `stam/pages/boards-v2/functional-specification.html` | v2 preview route (shell + root) |
| `stam/docs/reports/visual-qa/board-factory-functional-spec-v2/index.md` | 본 문서 |

## 3. 기존 기능정의서 untouched 여부

- `stam/pages/boards/functional-specification.html` — **변경 없음** (diff 0)
- `stam/js/stam.functional-specification.js` — **변경 없음**
- `stam/css/stam.functional-specification.css` — **변경 없음**
- 기존 route / 메뉴 링크 / nav 데이터 — **변경 없음**

신규 화면은 별도 route(`stam/pages/boards-v2/...`)에만 추가했고, 기존 게시판은 기준본으로 그대로 유지한다.

## 4. forbidden files 확인 결과

`git diff --name-only`를 다음 패턴으로 점검 → 해당 없음:

```
stam/pages/boards/ · stam.functional-specification.js · stam.functional-specification.css
stam.requirements.js · stam.menu-screen-list.js · stam.requirements.css · stam.menu-screen-list.css
stam.board-filter.js · stam.custom-select.js · firebase.json · .github/workflows · package.json
```

결과: **OK — allowed preview files only.**
`stam.board-filter.js` / `stam.custom-select.js`는 **사용만** 하고 수정하지 않았다.

## 5. URL

```
/stam/pages/boards-v2/functional-specification.html
```

로컬: `python -m http.server 5173` → `http://localhost:5173/stam/pages/boards-v2/functional-specification.html`

## 6. QA 체크리스트

### 6-1. 정적 검증 (이 환경에서 수행)

| 항목 | 방법 | 결과 |
| --- | --- | --- |
| `node --check stam.board-factory.js` | node | PASS |
| `node --check stam.board-configs.js` | node | PASS |
| dataSource.list 정렬(updatedAt desc) | node 단위 테스트 | PASS |
| keyword 검색(ID·기능명·담당자명) | node 단위 테스트 | PASS |
| filter 적용(status·type·priority·screen·owner, 배열 필드 포함) | node 단위 테스트 | PASS |
| summary 집계(total/draft/review/approved/hold/linkedReq/linkedScr) | node 단위 테스트 | PASS |
| create/update/remove in-memory | node 단위 테스트 | PASS |
| nextId pure-peek (preview id == 저장 id) | node 단위 테스트 | PASS |
| get() deep copy (원본 비변조) | node 단위 테스트 | PASS |
| referenceSource.resolve byId/missingIds | node 단위 테스트 | PASS |
| referenceSource.listOptions(keyword) | node 단위 테스트 | PASS |
| forbidden file diff | grep | PASS (해당 없음) |
| 기존 기능정의서 diff | git | PASS (0) |

### 6-2. 브라우저 인터랙션 (코드 검증 완료 · 라이브 브라우저 QA 권장)

> 이 실행 환경에는 헤드리스 브라우저/jsdom이 없어 **라이브 렌더링 QA는 수행하지 못했다.**
> 아래 항목은 코드 경로상 동작하도록 구현·검토했으며, merge 전 브라우저에서 1회 확인을 권장한다.

- [ ] 페이지 로드 / 콘솔 오류 0
- [ ] table rows 표시 + summary strip 표시
- [ ] keyword 검색 동작(디바운스 180ms, 실제 rows 필터)
- [ ] filter 적용 동작(공통 `STAM.boardFilter` 연동, 실제 rows 필터)
- [ ] empty state 표시(검색/필터 결과 0건)
- [ ] register / detail / edit drawer 열림·전환
- [ ] custom select 정상(`STAM.customSelect` 사용)
- [ ] relation(screen·requirement) / user 라벨 resolve 표시
- [ ] in-memory 등록/수정 후 목록 반영
- [ ] 새로고침 시 초기화(seed 복원)
- [ ] light/dark, 1920 / 1366 / 모바일 좁은 화면

## 7. Board Factory API 요약

```js
STAM.boardFactory.mount(rootEl, config);
// config: { boardId, title, description, idKey, nameKey, vocab,
//           actions, summary, columns, filters, drawer, detail,
//           dataSource, referenceSource }
```

- DataSource: `list(query)→{rows,total}` · `get(id)` · `summary(query)→{metrics,facets}` · `create/update/remove` · `nextId()`
- ReferenceSource: `listOptions(type,query)→{options,total,cursor}` · `resolve(type,ids)→{byId,missingIds}`
- built-in renderer: `checkbox idName text date chip statusChip typeChip priorityChip user relationChip link actionButtons`
- built-in detail section(1차): `infoGrid textBlock relationCards`
- 공통 모듈 재사용(수정 없음): `STAM.boardFilter`, `STAM.customSelect`
- drawer footer는 SSOT(`stam-drawer-foot / stam-dw-foot-left·spacer·right`) 준수
- 버튼은 PR #134 token(`stam-btn` variant) 준수

## 8. known limitations

- 이번 PR은 **static / in-memory preview**다. (`dataSource.mode = "static"`)
- 기존 기능정의서 route와 메뉴 링크는 변경하지 않았다.
- 실제 저장/API/Firestore/localStorage 연동은 **없다**. 새로고침 시 초기화된다.
- 요구사항 게시판의 `보통/중간` priority vocab 결함은 이번 PR에서 **수정하지 않는다**(요구사항 v2 후속 과제). 기능정의서 자체는 `높음/중간/낮음`으로 일관.
- detail section 중 `historyList / reviewList / acceptanceList / approvalStatus / attachmentList`는 **slot 후보로 미구현**(1차는 infoGrid/textBlock/relationCards). 기능정의서 변경이력 탭은 본 preview에서 생략.
- drawer footer의 `임시저장 / 전체 보기`는 preview 무동작(no-op) 버튼이다.
- 메뉴구조/요구사항 v2 전환은 **후속 PR**이다.
- React/Next.js 전환은 제품화 단계 판단으로 **보류**한다.
- 라이브 브라우저 시각 QA는 본 환경 제약으로 미수행(§6-2) — merge 전 1회 확인 권장.

## 9. 다음 PR 후보 (PR #137~)

- 라이브 브라우저 시각 QA 결과 반영(스크린샷 첨부)
- 공통 `STAM.boardFilter` ↔ Factory query 통합 심화(facets/멀티값 표시)
- detail slot renderer(historyList 등) 본구현
- 메뉴구조/화면목록 v2, 요구사항 v2 preview (요구사항 vocab 정규화 동반)
- DataSource adapter 실연동(api/firestore) — 별도 동결 해제 PR
