# Board Factory — Next Board Adoption Checklist v1

> Board Factory(`STAM.boardFactory.mount`) 를 다음 보드로 확장하기 전에 반드시 확인할 사전 점검 / 적용 절차 문서.
> 본 문서는 PR #136(기능정의서 v2 preview) 적용 경험에서 도출된 절차이며, 후속 v2 preview PR 의 기준이 된다.

---

## 1. 다음 보드 후보 우선순위

1. **메뉴구조 / 화면목록 v2 preview** — 구조가 단순(평면 리스트 + 트리 LV1/LV2/LV3 메타), 기존 기준본이 안정적이라 Factory 적용 난이도 낮음. **권장 다음 PR.**
2. **요구사항정의서 v2 preview** — 컬럼/필터/드로워가 기능정의서와 유사. 단, 우선순위 vocab(보통/중간) 정규화 선결.
3. **WBS** — 트리/간트/의존성 등 별도 고난도 검토 필요. **본 라운드 범위 밖.**

---

## 2. 새 보드 v2 적용 전 확인 사항 (공통)

각 후보 보드에 대해 아래 인벤토리를 먼저 수행한다.

- [ ] **필드 / 컬럼 inventory** — 기존 보드의 list 컬럼, sort/filter 컬럼, drawer 입력 필드, badge/chip 표시 필드 전수 목록화.
- [ ] **드로워 mode 확인** — detail / create / edit 3종 전부 필요한지, prefill 규칙은 무엇인지.
- [ ] **필터 inventory** — 사용 중인 filter key, vocab, 다중 선택 여부.
- [ ] **상태 / 우선순위 / 유형 vocab** — 라벨·색·정렬 순서. 기준본과 동일하게 유지하거나 정규화 필요 여부 표시.
- [ ] **액션 inventory** — toolbar 액션, row inline 액션, drawer footer 액션 전수.
- [ ] **Board Factory config 로 표현 가능한가** — 표준 column renderer(`checkbox idName text date chip statusChip typeChip priorityChip user relationChip link actionButtons`) 와 표준 detail section(`infoGrid textBlock relationCards`) 로 커버되는지.
- [ ] **누락 slot 여부** — historyList / reviewList / acceptanceList / approvalStatus / attachmentList 등 미구현 slot 이 필수인지(필수면 별도 PR 로 slot 구현 선결).
- [ ] **별도 JS 필요 기능** — tree, gantt, drag&drop, inline-edit 등 Factory 외 로직이 필요한지(필요하면 v2 preview 대신 후속 PR 로 분리).
- [ ] **referenceSource 필요 여부** — users / screens / requirements / functions / wbs 중 어떤 타입이 필요한지, ID ↔ 라벨 resolve 가 필수인지.
- [ ] **dataSource static seed 가능 여부** — preview seed 가 mock 으로 만들 수 있는 데이터인지(개인정보·민감정보 없는지).
- [ ] **custom select 필요 여부** — 사용 시 native `<select>` 중복 노출 처리 포함.
- [ ] **required validation 대상 필드** — register/edit 시 빈값 차단 대상 식별.

---

## 3. 메뉴구조 / 화면목록 v2 적용 시 사전 체크

- [ ] **화면 ID / 화면명 한 줄 표시** — idName 컬럼(ID 고정폭 + name ellipsis), 잘리지 않는지.
- [ ] **LV1 / LV2 / LV3** — 표 표시 형식(별도 컬럼 vs 묶음 chip), 필터·정렬 가능 여부.
- [ ] **FO / BO** — chip / badge 표기, 필터 동작.
- [ ] **화면유형** — vocab 정의(목록 / 상세 / 등록 / 수정 / 팝업 등), 색상 매핑.
- [ ] **상태** — 기준본과 동일 vocab / 색.
- [ ] **담당자** — `userId` 저장 + `referenceSource.resolve("users", ids)` 라벨.
- [ ] **연결 요구사항** — `requirementId` 저장 + relationChip + resolve.
- [ ] **연결 화면설계서** — 외부 링크 또는 첨부 표시 방식 결정.
- [ ] **drawer mode** — detail / create / edit 3종, prefill / required validation 포함.
- [ ] **기존 화면 기준 UI 톤 비교** — 동일 톤(밀도·간격·icon·chip) 으로 보이는지 실제 브라우저 비교.

---

## 4. 요구사항정의서 v2 적용 시 사전 체크

- [ ] **요구사항 ID / 요구사항명** — idName 한 줄.
- [ ] **유형** — vocab / 색 / 정렬 순서 정의.
- [ ] **우선순위** — **vocab 정규화 선결**. 기능정의서는 `높음/중간/낮음` 으로 일관. 요구사항 기준본의 `보통/중간` 결함은 v2 진입 전에 표기 규칙을 결정해야 한다.
- [ ] **상태** — 기준본과 동일 vocab / 색.
- [ ] **담당자** — `userId` 저장 + resolve.
- [ ] **배경 / 상세 / 수용조건** — drawer detail textBlock slot 으로 커버 가능한지, 줄바꿈/마크다운 허용 여부.
- [ ] **연결 화면 / 기능 / WBS** — relationCards / relationChip, referenceSource 타입(`screens`, `functions`, `wbs`) 필요 여부.
- [ ] **priority vocabulary 정규화 필요 여부** — 정규화 결정·적용 결과를 PR body 에 명시.
- [ ] **기존 요구사항 기준 UI 톤 비교** — drawer / table / chip 톤 동일 확인.

---

## 5. 다음 PR 작성 원칙

- [ ] **한 PR 에 하나의 v2 preview 만 추가.** 메뉴구조와 요구사항을 같은 PR 에 섞지 않는다.
- [ ] **기존 route 변경 금지.** 기준본 html/js/css diff = 0.
- [ ] **nav link 교체 금지.** `stam.nav-data.js`, `stam.shell.js`, `stam.topbar-render.js` 미수정.
- [ ] **신규 route 추가만 허용.** `stam/pages/boards-v2/<screen>.html` 외 경로 금지.
- [ ] **storage / API / Firestore / localStorage 금지.** static / in-memory only.
- [ ] **공통 모듈(`stam.board-filter.js`, `stam.custom-select.js`) 미수정.** 사용만 한다.
- [ ] **Ready 전환 전 사용자 브라우저 QA 필수** — `Board-Factory-QA-Gate-v1.md` §2 / §3 항목 전부 PASS.
- [ ] **PR body 는 `Board-Factory-QA-Gate-v1.md` §5 형식 준수.**

---

## 6. 후속 작업 흐름 요약

1. 다음 후보 보드 inventory 수행(§2).
2. Board Factory config 작성 + static seed.
3. 신규 route(`stam/pages/boards-v2/<screen>.html`) 추가.
4. 정적 검증(node --check, CSS brace, forbidden diff 0) + jsdom smoke.
5. Draft PR 생성, PR body 는 QA Gate §5 형식.
6. 사용자 브라우저 QA(§2 / §3) → PASS 확인 후 Ready.
7. squash merge → staging deploy.
8. 다음 보드로 진행.
