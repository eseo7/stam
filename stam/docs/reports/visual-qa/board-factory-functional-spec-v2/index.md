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

## 8-2. UI 밀도 보정 라운드 (사용자 1차 브라우저 QA 대응)

### 1차 브라우저 QA 결과 (사용자)
> "화면은 뜨지만" **간격 / 버튼 크기 / width / table 밀도 / summary·toolbar 균형**이
> 기존 STAM 게시판 톤과 맞지 않음 → **시각 QA FAIL.** (기능/DOM은 정상)

### 이번 보정 항목 (CSS 우선, HTML/JS 최소)
모든 값은 **기존 기능정의서 `stam.functional-specification.css`의 실제 수치에 정렬**했다.

| 영역 | 보정 내용 |
| --- | --- |
| layout density | `.bf-page`를 fn-page와 동일하게 `max-width: var(--content-max)` 중앙 정렬 + `padding 20px 24px 64px` → 1920px에서 과확장 방지, 본문 빈 느낌 해소. preview 배너를 `.bf-page` 안으로 이동(폭 정렬) + slim화(padding 8px 12px) |
| summary strip | flex→hairline grid(gap 1px·`--bd` 배경), cell `padding 11px 15px`, label `9.5px UPPERCASE`, num `20px`, dot `6px`, `.on` 하단 강조바(과강조 완화) |
| toolbar | 검색창 `width 280px`·`padding 6px 11px`·input 12px(과길이 해소), sep `height 22px`, 삭제버튼을 fn-btn-del 톤(서브틀+빨강 hover, 필터 트리거와 동일 높이) |
| header buttons | 공통 SSOT(`stam-board-action-btn` + `stam-btn` variant) 유지 — primary/outline 동일 사이즈·정렬 |
| table | `min-width 900px`, thead `9.5px UPPERCASE`, row `height 36px`·td `12.5px`, checkbox col `40px`, chip `height 20px`, relation chip `height 20px`, avatar `22px(둥근 사각)`, `상세` 버튼 compact화 |
| footer/pagination | 공통 `stam-board-footer/count/pagination/page-btn`(board-layout.css SSOT) 유지 |
| drawer | footer SSOT 유지, input/select/custom-select trigger **높이 38px 통일**, 필드 간격 fn 톤(`gap 12px 20px`, field `gap 5px`) |
| 반응형 | summary 7→4(≤1180)→2(≤820)→1(≤480)열, ≤820 toolbar wrap·search 100%·form 1열, `.po-main` overflow-x hidden |

### 추가 컴포넌트 보정 (사용자 2차 지적)
1. **select 중복 표시 FIX** — custom-select 적용 후 native `<select>`가 함께 보이던 문제.
   원인: 본 preview의 `nativeClass`(`bf-cs-native`)를 숨기는 CSS 규칙 부재(기존 화면은
   각자 `*-cs-native`로 숨김). 해결: `stam.board-factory.css`에 `.bf-cs-native{display:none}`
   추가. `stam.custom-select.js`는 미수정. (검증: native 수 == trigger 수, wrapper당 trigger 1개)
2. **validation 문구 자연화** — 필드 타입별 분기:
   - select → `{label}을/를 선택하세요.` (예: `기능유형을 선택하세요.`, `우선순위를 선택하세요.`)
   - input/textarea → `{label}을/를 입력하세요.` (예: `기능명을 입력하세요.`)
   - 한글 받침 유무로 목적격 조사(을/를) 자동 선택(`josEulReul`).
3. **validation spacing** — 오류 배너 `padding 8px 12px`/`margin-bottom 14px`, 필드 오류
   `margin-top 4px`/`11px`로 축소. 빨간 border·메시지는 유지하되 레이아웃을 과하게 밀지 않음.

### 보정 라운드 검증 결과
| 항목 | 결과 |
| --- | --- |
| `node --check` (factory/configs) | PASS |
| jsdom DOM 스모크(기존 45항목) | PASS / console.error 0 |
| select 중복 없음(native=trigger 1:1, bf-cs-native 부여) | PASS (7항목 보조 테스트) |
| validation 문구(select=선택/input=입력, 을/를) | PASS |
| required create/update 차단 유지 | PASS |
| CSS 중괄호 균형 / var() 토큰 전부 resolve | PASS (130/130, missing 0) |
| forbidden 파일 변경 | 없음 |
| 기존 boards/공통 CSS·JS 변경 | 없음 (`board-filter.js`·`custom-select.js` 미수정) |

### 1920 / 1366 / 모바일 — ⚠️ 라이브 픽셀 확인 PENDING
- 보정 수치는 **기존 fn 화면의 실제 값에 정렬**했고 반응형 분기를 코드로 명시했으나,
  이 환경은 **실제 브라우저 바이너리를 받을 수 없어**(chromium 다운로드가 네트워크 정책으로
  실패, 재확인 완료) **픽셀 단위 시각/반응형 확인은 여전히 미수행**이다.
- 따라서 본 PR은 **Draft 유지**, 라이브 브라우저 시각 QA 완료 전 Ready로 전환하지 않는다.
- merge 전 실제 Chrome/Edge에서 §6-3 + 위 보정 항목(1920/1366/모바일·light/dark·콘솔 0)을
  1회 확인 권장.

## 8-3. idName 컬럼 한 줄 표시 보정 (사용자 3차 지적)

- **증상**: `기능 ID / 기능명` 컬럼이 2줄로 표시(`FN-007` / `요구사항 삭제`). 기능명에
  공백(`요구사항 삭제`)이 있어 `white-space` 미지정 시 공백에서 줄바꿈된 것이 원인.
- **해결(CSS 단독, renderer 구조 유지)**:
  - `.bf-id-cell` → `display:flex; align-items:center; gap:8px; min-width:0; white-space:nowrap`
  - `.bf-id` → `flex:0 0 auto` (고정폭·nowrap)
  - `.bf-name` → `flex:1 1 auto; min-width:0; max-width:260px; overflow:hidden;
    text-overflow:ellipsis; white-space:nowrap` (한 줄 + 긴 이름 말줄임)
  - row height는 단일 라인 유지(과증가 없음).
- **검증(jsdom)**: 7개 행 모두 `.bf-id-cell` 안에 `.bf-id`×1 + `.bf-name`×1, 두 span이
  동일 셀(부모)에 위치(세로 분리 아님). `FN-007` = `요구사항 삭제` 동일 셀 확인.
  select 중복·validation 문구 **회귀 없음**(보조 테스트 11항목 PASS).
- 라이브 픽셀(ellipsis 실제 표시·1366/1920/좁은 폭)은 §8-2와 동일하게 **PENDING**.

## 8-4. UI 보정 라운드 2 (삭제 hover · active bar · 버튼 아이콘 · 드로워 padding)

사용자 로컬 브라우저 QA 추가 지적(1~6) 대응. UI 보정만 수행, 저장/route 미변경.

| # | 항목 | 보정 내용 | DOM/CSS 검증 | 라이브 픽셀 |
| --- | --- | --- | --- | --- |
| 1 | 삭제 버튼 hover | 하드코딩 `#DC2626` → **토큰** `var(--btn-danger-bg)` border·color + `var(--fail-bg)` 배경(라이트/다크 자동) | CSS 토큰 resolve | PENDING |
| 2 | 행 클릭 active bar | 행 클릭→상세 시 해당 row `.is-active` 부여(좌측 bar는 `table-selection.css` 공통). 다른 행 클릭 시 이동, **drawer 전환(detail→edit) 시 유지**, 사용자 닫기(스크림/ESC/닫기·취소) 시 해제. refresh 후에도 `syncSelectionUi`가 재적용 | jsdom: 설정/이동/유지/해제 PASS | PENDING |
| 3 | 상단 버튼 아이콘 | Board Factory **action config에 `icon`** 추가(`내보내기`=export, `기능 등록`=plus). factory가 `action.icon`을 icon registry로 렌더(하드코딩 X) | jsdom: svg 존재·currentColor PASS | PENDING |
| 4 | 상세 드로워 padding/아이콘 | `.bf-dw-head 16/24/14`·`.bf-dw-body 20/24/16` 명시, 탭 음수마진 제거(overflow 방지). footer `수정`=edit(pencil) 아이콘 | jsdom: bf-dw-body·아이콘 PASS | PENDING |
| 5 | 등록/수정 드로워 padding/아이콘 | 동일 padding, input/select/cs-trigger 38px 유지. footer `임시저장`=save·`등록`=plus·`저장`=save, `취소`/`전체 보기` 텍스트 전용 | jsdom: 아이콘·body PASS | PENDING |
| 6 | dark mode | 아이콘 `currentColor`(variant 색 상속), 삭제 hover·active bar·padding 모두 토큰/공통 클래스 기반 → 다크 자동 | CSS 토큰 기반 확인 | PENDING |

- **icon registry**: 최소 set만(`plus / export / save / edit`), `currentColor` 기반. 후속 공통화 재사용 구조.
- **검증 합계**: `node --check` PASS, jsdom 메인 45 + 본 라운드 16 + 회귀 6 PASS, `console.error` 0,
  CSS 131/131 균형·토큰 전부 resolve. 기존 기능정의서 diff **0**, 금지 파일 변경 **없음**
  (`board-filter.js`·`custom-select.js`·`nav-data.js`·`shell.js`·`topbar-render.js` 미수정).
- **브라우저 픽셀 QA는 사용자 로컬 확인 필요**: 실제 hover 색·active bar 표시·아이콘 정렬·드로워 여백·
  다크 모드 시각은 환경상 chromium 미가용으로 **PENDING**. merge 전 Chrome/Edge 1회 확인 권장.

## 8-5. Drawer title top spacing 보정

사용자 로컬 브라우저 QA: 등록/상세/수정 drawer에서 **제목이 상단에 너무 붙어 보임**.

- **보정(CSS 단독)**: `.bf-dw-head` top padding `16px → 22px` (left/right/bottom·body/footer
  padding·필드 38px·active bar·footer 아이콘 등 기존 보정값 전부 유지). 등록/상세/수정 모두
  동일 `.bf-dw-head` 사용 → 한 번에 적용. JS/저장/route 변경 없음.
- dark mode: padding은 테마 무관 동일 적용.

| 항목 | DOM/CSS 검증 | 라이브 픽셀 |
| --- | --- | --- |
| 등록 drawer 제목 상단 간격 | CSS padding-top 22px 적용 | PENDING |
| 상세 drawer 제목 상단 간격 | 동일 클래스 적용 | PENDING |
| 수정 drawer 제목 상단 간격 | 동일 클래스 적용 | PENDING |
| light/dark 동일 | 테마 무관 padding | PENDING |
| 필드 38px / footer 아이콘 / active bar 회귀 | jsdom 45 PASS·`console.error` 0 | — |
| 기존 기능정의서 diff | 0 | — |

- 브라우저 픽셀(실제 여백 시각)은 환경상 chromium 미가용으로 **PENDING** — merge 전 Chrome/Edge 1회 확인 권장.

## 8-6. Drawer footer 버튼 stroke 통일 + Toolbar 삭제 버튼 height 보정

사용자 로컬 브라우저 QA: ① footer의 `취소`·`전체 보기`(ghost)가 외곽선이 없어 텍스트처럼
보임, ② toolbar `삭제` 버튼이 `필터` 버튼보다 높이가 커 보임. **CSS 단독** 보정.

### 1) footer 버튼 stroke 통일
- `.bf-drawer .stam-drawer-foot .stam-btn-ghost { border-color: var(--btn-secondary-border) }`
  (hover 포함) → ghost(취소/전체 보기)도 outline(임시저장)과 **동일 토큰의 외곽선**.
- primary(등록/저장/수정)·outline(임시저장)은 기존 variant/색/아이콘 **그대로 유지**.
- 토큰 기반(`--btn-secondary-border`) → 라이트/다크 자동, footer height/density 불변.

### 2) toolbar 삭제 버튼 height = 필터 버튼
- **원인**: 삭제 버튼 마크업이 `.stam-btn`도 포함 → `.stam-btn { height:32px }`가 상속되어
  콘텐츠 높이(~28px)인 `필터` 트리거보다 커 보였음.
- **보정**: `.bf-del-btn { height:auto; min-height:0; box-sizing:border-box }`로 32px 무효화 →
  `필터` 트리거와 동일하게 padding 기반 콘텐츠 높이. svg 12→13px(필터와 아이콘 크기 일치).
  align-items center·삭제 hover 토큰·서브틀 톤은 유지.

| 항목 | DOM/CSS 검증 | 라이브 픽셀 |
| --- | --- | --- |
| 등록 drawer footer stroke | ghost 규칙 적용 | PENDING |
| 상세 drawer footer stroke | 동일 규칙(공통 selector) | PENDING |
| 수정 drawer footer stroke | 동일 규칙(공통 selector) | PENDING |
| 삭제 = 필터 height 일치 | height:auto 적용 | PENDING |
| dark mode(stroke·height) | 토큰/공통 클래스 기반 | PENDING |

- **회귀 검증(jsdom 45 PASS·`console.error` 0)**: title top 22px, 삭제 hover, active bar,
  내보내기/기능등록 icon, drawer padding, footer/action icon, select 중복 해소, validation 문구,
  idName 한 줄, required 차단 **모두 유지**. CSS 133/133 균형, 토큰 전부 resolve.
- 브라우저 픽셀(실제 외곽선·높이 정렬)은 chromium 미가용으로 **PENDING** — merge 전 1회 확인 권장.

## 8-7. Drawer title top spacing final (+10px)

사용자 로컬 브라우저 최종 지적: 제목이 아직 상단에 약간 붙어 보임 → top만 +10px.

- **보정(CSS 단독)**: `.bf-dw-head` padding-top `22px → 32px` (left/right/bottom·body/form/
  footer padding·필드 38px·footer stroke·삭제 height·active bar·아이콘 전부 유지). 등록/상세/
  수정 모두 동일 `.bf-dw-head` → 한 번에 적용. JS/config/HTML 변경 없음.

| 항목 | DOM/CSS 검증 | 라이브 픽셀 |
| --- | --- | --- |
| 등록/상세/수정 제목 top 32px | padding-top 32px 적용 | PENDING |
| 기존 보정(footer stroke·삭제 height·active bar·아이콘·validation·idName) 회귀 | jsdom 45 PASS·`console.error` 0 | — |
| 기존 기능정의서 diff | 0 | — |

- 브라우저 픽셀(실제 여백)은 chromium 미가용으로 **PENDING** — merge 전 Chrome/Edge 1회 확인 권장.

## 8-8. Drawer header meta row 숨김 (제목 위 chip 미노출)

사용자 DevTools 확인 결과, "유령 버튼 2개"는 버튼이 아니라 drawer header 최상단의
**meta row**(`.bf-dw-head > .bf-dw-hrow1`)였다. 이 row는 배지(`.bf-dw-badge`,
예 `FN-002`/`NEW`) + 상태 chip(`.bf-chip`, 예 `작성중`) + 닫기(`.bf-dw-close`)를 담고
있고, 제목 위에 떠서 light/dark 모두에서 빈 버튼/chip처럼 보였다.

- **보정(CSS 단독)**: `.bf-dw-head > .bf-dw-hrow1 { display: none; }`
  - 등록/상세/수정 drawer 모두 동일 구조 → 한 번에 적용. 제목 위에 chip이 보이지 않음.
  - **blanket 숨김 아님**: `.bf-chip`/`.bf-dw-badge` 전역 숨김이 아니라 **header 첫 row만**
    한정. 본문 infoGrid/relation card/table의 status·type·priority·relation chip은 정상 유지.
  - 닫기(X)는 row와 함께 숨겨지지만, **footer `취소` · 스크림 클릭 · ESC**로 닫기 유지.
  - title top spacing 32px·body/footer padding·기타 보정 전부 그대로.

| 항목 | DOM/CSS 검증 | 라이브 픽셀 |
| --- | --- | --- |
| 등록 drawer 제목 위 chip 숨김 | 규칙 적용(공통 selector) | PENDING |
| 상세 drawer 제목 위 chip 숨김 | 동일 | PENDING |
| 수정 drawer 제목 위 chip 숨김 | 동일 | PENDING |
| 본문/table/relation/detail 정상 chip 유지 | selector가 header 첫 row만 한정 | PENDING |
| light/dark 동일 | display:none, 테마 무관 | PENDING |

- **회귀(jsdom 45 PASS·`console.error` 0)**: title 32px, footer stroke, 필터/삭제 height,
  삭제 hover, active bar, 내보내기/기능등록 icon, drawer padding, footer/action icon,
  select 중복 해소, validation 문구, idName 한 줄, required 차단 **모두 유지**. CSS 134/134 균형.
- 브라우저 픽셀(실제 숨김·정상 chip 유지)은 chromium 미가용으로 **PENDING** — merge 전 1회 확인 권장.

## 9. 다음 PR 후보 (PR #137~)

- 라이브 브라우저 시각 QA 결과 반영(스크린샷 첨부)
- 공통 `STAM.boardFilter` ↔ Factory query 통합 심화(facets/멀티값 표시)
- detail slot renderer(historyList 등) 본구현
- 메뉴구조/화면목록 v2, 요구사항 v2 preview (요구사항 vocab 정규화 동반)
- DataSource adapter 실연동(api/firestore) — 별도 동결 해제 PR
