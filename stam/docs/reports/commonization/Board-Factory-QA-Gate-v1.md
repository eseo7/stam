# Board Factory QA Gate v1

> 후속 Board Factory v2 preview PR이 Ready → merge로 넘어가기 위한 최소 QA 기준 문서.
> 본 문서는 PR #136(기능정의서 v2 preview merge `2ea538f`) 진행에서 확정된 운영 기준을 정리한 것이다.
> 이 기준을 충족하지 못한 PR은 Draft를 유지해야 하며, jsdom PASS만으로 Ready 전환하지 않는다.

---

## 1. Board Factory PR Ready 전환 조건

Board Factory를 사용하는 신규 v2 preview PR은 아래 항목을 **전부** 충족해야 Ready 전환이 가능하다.

- [ ] **기존 route untouched** — `stam/pages/boards/<기준본>.html`, 해당 화면의 `stam/js/stam.<기준본>.js`, `stam/css/stam.<기준본>.css` 의 diff = 0
- [ ] **신규 route 위치 규칙 준수** — 신규 화면은 반드시 `stam/pages/boards-v2/...` 하위에 추가한다. 기존 `stam/pages/boards/...` 에 신규 화면을 만들거나 기존 화면을 치환하지 않는다.
- [ ] **static / in-memory 여부 명시** — PR body의 "Known limitations" 또는 "DataSource" 섹션에 "static / in-memory preview" 임을 명시한다. 새로고침 시 seed로 초기화됨도 명시한다.
- [ ] **API / Firestore / localStorage 미사용** — 신규 코드에 `fetch(`, `XMLHttpRequest`, `firebase.firestore`, `localStorage`, `sessionStorage`, `indexedDB` 추가 없음.
- [ ] **기존 보드 diff 0** — 기존 기능정의서 / 요구사항 / 메뉴구조 / WBS 등 기존 보드 산출물에 변경 없음.
- [ ] **금지 파일 변경 없음** — 본 문서 §4의 금지 영역 변경 없음.
- [ ] **node --check PASS** — 신규/수정 JS 전부 syntax 통과.
- [ ] **jsdom smoke PASS** — Board Factory 표준 스모크(rows·summary·idName·relation·user·status resolve / keyword·count·empty / filter / register·detail·edit drawer·탭·prefill / required validation 차단 / 선택 삭제 total -1) 전부 PASS.
- [ ] **`console.error` 0회** — jsdom 실행 중 0회, 실제 브라우저 실행 중 0회.
- [ ] **사용자 또는 실제 브라우저 QA PASS** — 본 문서 §2 / §3 항목 전부 PASS. PR body QA 섹션에 "사용자 브라우저 QA PASS" 라인을 명시한다.

---

## 2. 실제 브라우저 QA 필수 항목

jsdom은 픽셀·테마·반응형을 검증하지 못한다. 아래 항목은 **실제 브라우저** 에서 직접 확인해야 한다.

### 2-1. 뷰포트

- [ ] **1920px** — content max-width 안에서 좌우 여백 정상, summary strip 7열 정상, 빈 화면(과확장) 없음.
- [ ] **1366px** — toolbar wrap 없음, table 가로 스크롤 없음, drawer overlay 정상.
- [ ] **좁은 화면 / 모바일 폭(≤820, ≤480)** — summary 4→2→1열 응답, toolbar wrap, search 100%, form 1열, `.po-main` overflow-x hidden 유지.

### 2-2. 테마

- [ ] **light mode** — 텍스트/배경 대비, chip·badge·avatar 가독성, 표 hairline 정상.
- [ ] **dark mode** — 동일 항목 확인 + selected row active bar 가시성, drawer overlay opacity, footer stroke 유지.

### 2-3. 콘솔 / 로드

- [ ] **Console red error 0** — 페이지 로드 후, drawer open/close 후, filter 적용/초기화 후 모두 0.
- [ ] **신규 route load 성공** — `/stam/pages/boards-v2/<screen>.html` 200 + 화면 정상 mount.
- [ ] **기존 route 영향 없음** — `/stam/pages/boards/<screen>.html` 동일 동작 유지.

---

## 3. UI 기준 체크리스트

기존 STAM 게시판 톤과 시각적으로 동일해야 한다. "비슷해 보임" 은 PASS 아님.

### 3-1. Shell

- [ ] App Shell, Topbar, Left Nav — 변경 없음(높이·간격·아이콘·색상).

### 3-2. Summary strip

- [ ] hairline grid(gap 1px), label 9.5px UPPERCASE, num 20px, dot 6px.
- [ ] 첫 칸 과강조 없음.
- [ ] 반응형 열 수(7→4→2→1) 동작.

### 3-3. Toolbar

- [ ] 검색창 280px / 패딩·input 12px.
- [ ] 필터 트리거 / 삭제 / 등록 / 내보내기 버튼 **동일 height**.
- [ ] 버튼 icon — 기준본과 동일 아이콘·사이즈, 좌측 정렬.
- [ ] 삭제 버튼 톤 — `fn-btn-del` 등 기준본과 동일.

### 3-4. Table

- [ ] row height — 기준본과 동일(36px).
- [ ] thead 9.5px UPPERCASE.
- [ ] td 12.5px.
- [ ] checkbox column 40px.
- [ ] **row selected active bar** — 좌측 active bar / 배경 톤, light·dark 모두.
- [ ] checkbox · chip · relation chip · avatar 사이즈(chip 20px, relation chip 20px, avatar 22px) 일치.
- [ ] idName 한 줄 표시(ID 고정폭 + name ellipsis).

### 3-5. Pagination / Footer

- [ ] 공통 `stam-board-footer / count / pagination / page-btn` 사용.
- [ ] count 표기 톤, page button hover/disabled 상태 일치.

### 3-6. Empty state

- [ ] 검색 결과 없음 / 초기 빈 상태 — 기준본과 동일 톤(아이콘·문구·간격).

### 3-7. Drawer

- [ ] header / title top spacing — 기준본과 동일, **제목 잘림 없음**.
- [ ] header meta — chip-only 상태에서 ID/상태 chip이 제목 위에 노출되지 않음(숨김).
- [ ] 닫기 X 유지.
- [ ] tabs — 활성 indicator, hover, focus 톤 일치.
- [ ] body padding — 기준본 fn 톤(gap 12/20, field 5) 일치.
- [ ] footer button — stroke / icon / height 일치, drawer footer SSOT(`stam-drawer-foot / stam-dw-foot-*`) 준수.

### 3-8. Custom Select

- [ ] **중복 표시 없음** — custom-select trigger 적용 후 native `<select>` 동시 노출 없음(`bf-cs-native { display:none }` 또는 동등 처리).
- [ ] 드롭다운 열림/닫힘, 선택, 키보드 조작 정상.

### 3-9. Required validation

- [ ] 빈값 등록/수정 시 — `create/update` 호출 차단, invalid 표시, 오류 배너, 첫 invalid focus.
- [ ] 문구 자연화 — select=`{label}을/를 선택하세요.`, input=`{label}을/를 입력하세요.` (받침 자동).
- [ ] 충족 시 — `create/update` 호출 + 목록 반영 + drawer close.

---

## 4. 금지되는 PASS 기준

아래는 **PASS 로 간주하지 않는다**.

- ❌ "비슷해 보임" / "대체로 OK" 만으로 PASS.
- ❌ jsdom smoke 만 PASS → Ready 전환.
- ❌ 화면 캡처 또는 사용자 브라우저 확인 없이 merge.
- ❌ 기존 route(`stam/pages/boards/...`)를 v2로 교체 / 치환 / 리디렉트.
- ❌ 기존 nav link 를 v2 route 로 변경.
- ❌ 실저장 / API / Firestore / localStorage 를 preview PR에 섞기.
- ❌ 공통 모듈(`stam.board-filter.js`, `stam.custom-select.js`, `stam.nav-data.js`, `stam.shell.js`, `stam.topbar-render.js`) 을 신규 보드 PR 에서 수정.
- ❌ `firebase.json` / `.github/workflows/*` 수정.

---

## 5. PR body 필수 기재 항목

Board Factory v2 preview PR body 는 아래 섹션을 반드시 포함한다.

- [ ] **신규 route** — 절대경로 명시(`/stam/pages/boards-v2/<screen>.html`).
- [ ] **기존 route untouched** — 기준본 파일 3종(html/js/css) diff 0 명시.
- [ ] **변경 파일** — 신규/수정 파일 표.
- [ ] **금지 파일 변경 없음** — §4 금지 목록과 forbidden file 영역 변경 없음 명시.
- [ ] **QA 결과** — node --check / jsdom smoke / console.error / CSS brace balance / 기존 보드 diff 0.
- [ ] **사용자 브라우저 QA 여부** — Chrome 또는 Edge 기준 §2 / §3 항목 PASS 여부.
- [ ] **Known limitations** — static/in-memory, 새로고침 시 초기화, 미구현 slot, 향후 후속 PR 분리 대상.
- [ ] **다음 PR 후보** — 다음 적용 보드 / 미구현 slot / DataSource 실연동 등.
