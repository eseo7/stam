# Visual QA — Board Factory · 기능정의서 v2 Preview

> PR: feat(board-factory): add functional specification v2 preview
> 기반: PR #135 (Board Factory v1.2 A-Class Inventory & Architecture, merge `b305fcc`)
> 성격: static / in-memory **preview**. 실제 저장/연동 없음.

> **현재 판정: Ready 불가 / Browser QA pending.**
> 기능/DOM 동작은 jsdom 스모크(45항목 PASS, console 오류 0)로 검증했으나,
> 이 실행 환경에 **실제 브라우저 바이너리(chromium/puppeteer/playwright)가 없어
> 라이브 브라우저 시각 QA(테마·반응형·실제 콘솔)는 수행하지 못했다.**
> 지시에 따라 PR은 **Draft를 유지**하며, 라이브 브라우저 QA 완료 전까지 Ready로
> 전환하지 않는다.

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
- register/edit **required 필드 검증**(빈값 시 저장 차단·invalid 표시·오류 배너·첫 invalid focus)

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

### 6-2. DOM 동작 검증 (jsdom 스모크 — 실제 브라우저 아님)

실제 공통 모듈(`stam.board-filter.js`, `stam.custom-select.js`)과 엔진/config를
jsdom DOM에 로드하여 mount 후 실제 인터랙션을 시뮬레이션했다. **45항목 PASS,
`console.error` 0회.** (`stam.board-filter.js` / `stam.custom-select.js`는 사용만, 미수정)

| 항목 | 결과 |
| --- | --- |
| mount 후 table rows 7개 렌더 | PASS |
| summary strip 7셀 + total=7 | PASS |
| idName(FN-001/기능명) 렌더 | PASS |
| relation chip(REQ-001) + resolve title | PASS |
| user 라벨 resolve(김철수) | PASS |
| statusChip 라벨(검토완료) | PASS |
| keyword 검색 '이영희' → 2행 + count 반영 | PASS |
| empty state(검색 0건) 표시 | PASS |
| 검색 초기화 → 7행 복귀 | PASS |
| filter status=draft 적용 → 2행 | PASS |
| filter 초기화 → 7행 | PASS |
| register drawer 열림 + 필드 렌더 | PASS |
| **required 빈값 등록 차단 — create 미호출** | PASS |
| **required 빈값: total 불변** | PASS |
| **required 빈값: 오류 배너 표시** | PASS |
| **required 빈값: invalid 필드 ≥3개 표시(.is-invalid)** | PASS |
| **required 빈값: drawer 유지(닫히지 않음)** | PASS |
| required 충족 등록 → create 호출 + total +1 + drawer 닫힘 | PASS |
| 신규 행 목록 반영 | PASS |
| detail drawer 열림(infoGrid/relationCards/tabs/owner resolve) | PASS |
| detail 탭 전환 | PASS |
| edit drawer 열림 + 기존값 prefill | PASS |
| **edit required 빈값(기능명) 수정 차단 — update 미호출** | PASS |
| **edit 빈값: invalid 표시 + drawer 유지** | PASS |
| edit 충족 → update 호출 + drawer 닫힘 | PASS |
| 체크박스 선택 → 삭제 버튼 활성 → 삭제 후 total -1 | PASS |
| 실행 중 `console.error` 0회 | PASS |

### 6-3. 라이브 브라우저 시각 QA (PENDING — 환경상 미수행)

> 이 실행 환경에 **실제 브라우저 바이너리가 없다**(chromium / puppeteer /
> playwright 미설치, 확인 완료). 따라서 **테마(light/dark)·반응형 레이아웃·
> 실제 브라우저 콘솔** 등 시각/레이아웃 항목은 jsdom으로 대체 불가하며 **미수행**이다.
> 아래는 merge 전 실제 브라우저에서 1회 확인해야 하는 잔여 항목이다.

```bash
python -m http.server 5173
# http://localhost:5173/stam/pages/boards-v2/functional-specification.html
```

- [ ] 페이지 로드 / 실제 브라우저 콘솔 오류 0 *(jsdom상 0 확인, 브라우저 재확인 필요)*
- [ ] custom select 드롭다운 시각 동작(열림/플립/선택)
- [ ] drawer 슬라이드 인/스크림 시각
- [ ] light / dark 테마 전환 시 색 토큰 정상
- [ ] 1920px 레이아웃
- [ ] 1366px 레이아웃(summary 4열 折)
- [ ] 모바일/좁은 화면(summary 2열/1열, search 축소)
- [ ] required invalid 시각 강조(테두리/라벨/배너 색)
- [ ] 새로고침 시 seed 복원(브라우저 reload)

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
- 라이브 브라우저 시각 QA는 본 환경 제약으로 **미수행(PENDING, §6-3)** — Ready 전환 불가, merge 전 1회 확인 필요.
- required 검증은 "빈 문자열(필수 미입력)" 차단까지만 구현했다. 형식/길이/중복 등 고급 검증은 후속 과제다.

## 8-1. Implementation notes

- **`nextId()`는 pure-peek 계약이다.** `dataSource.nextId()`는 호출해도 시퀀스를
  **증가시키지 않고** 다음 후보 ID(`FN-00N`)만 반환한다. 실제 시퀀스 commit은
  `dataSource.create()`가 담당한다(생성된 레코드의 `FN-` 번호로 `seq`를 전진).
  이 계약 덕분에 register drawer가 미리 보여주는 ID와 실제 저장 ID가 **항상 일치**하고,
  drawer를 열기만 하고 닫아도 ID 번호가 소모되지 않는다.
  (관련 코드: `stam.board-configs.js`의 `dataSource.nextId` / `dataSource.create`,
  `stam.board-factory.js`의 `openRegister` / `handleSubmit`)
- **required 검증 흐름**: `handleSubmit(mode)` → `validateRequired(drawer)` 선실행 →
  invalid 1개 이상이면 `create/update`를 호출하지 않고 `return`. 화면에는 ① 필드 래퍼
  `.is-invalid`, ② 필드 하단 `.bf-field-err`, ③ drawer 상단 `.bf-form-err` 배너를 남기고
  첫 invalid 컨트롤(custom select면 trigger)에 focus한다. (`alert` 미사용 — 화면 표시 유지)

## 9. 다음 PR 후보 (PR #137~)

- 라이브 브라우저 시각 QA 결과 반영(스크린샷 첨부)
- 공통 `STAM.boardFilter` ↔ Factory query 통합 심화(facets/멀티값 표시)
- detail slot renderer(historyList 등) 본구현
- 메뉴구조/화면목록 v2, 요구사항 v2 preview (요구사항 vocab 정규화 동반)
- DataSource adapter 실연동(api/firestore) — 별도 동결 해제 PR
