# Board Factory — 요구사항정의서 v2 Preview QA

> PR #139 (Requirements Vocab Gate / Adoption Inventory, merge `37e3365`) 후속.
> Board Factory(`STAM.boardFactory.mount`) **세 번째 적용 대상**으로 요구사항정의서 v2 preview 화면을 추가한 작업의 QA 문서.

---

> **재정리 (2026-06-18, PR #141 merge 후 / base = main `7b81ebc`):** PR #141 *STAM Common Icon Asset System* 가 toolbar filter 버튼을 공통 asset(`<span class="stam-icon stam-icon-filter">` + `stam.icons.css` CSS mask, 단일 `filter.svg`)으로 표준화했다. 이에 따라 **본 PR 은 `stam.board-factory.js` / `stam.board-factory.css` 를 더 이상 수정하지 않는다** — §12-A 의 inline funnel SVG 보정(회차 1·2)은 **폐기(superseded)** 되었고 이력 기록용으로만 남긴다. 본 PR 은 신규 route `boards-v2/requirements.html` 에 `stam.icons.css` link 1줄을 추가해 동일한 공통 filter 아이콘을 자동 적용받으며, 요구사항 v2 route + `requirementsV2` config 추가만 담당한다.

## 1. 목적

- PR #139 vocab gate(`Requirements-BoardFactory-Vocab-Gate-v1.md`) 와 adoption inventory(`Requirements-BoardFactory-Adoption-Inventory-v1.md`) 기준에 정확히 정합하는 **요구사항 v2 preview** 를 Board Factory 위에서 재현.
- 기능정의서 v2 / 메뉴구조 v2 와 **동일한** `stam.board-factory.css` / `stam.board-factory.js` / `stam.board-configs.js` 만 사용. 요구사항 전용 CSS/JS/DOM/selector 추가 0.

## 2. 변경 파일

| 파일 | 상태 | 비고 |
| --- | --- | --- |
| `stam/pages/boards-v2/requirements.html` | 신규 | v2 preview route. PR #138 `boards-v2/menu-screen-list.html` 구조 그대로, mount 대상 config 만 `requirementsV2` 로 교체. nav id `B1`. **`stam.icons.css` link 포함** → 공통 filter 아이콘(PR #141) 자동 적용. |
| `stam/js/stam.board-configs.js` | 수정(append) | `STAM.boardConfigs.requirementsV2` 추가. 기존 `functionalSpecificationV2` / `menuScreenListV2` 블록 변경 없음. |
| `stam/js/stam.board-factory.js` | **변경 없음** | PR #141 asset 버전 유지. §12-A 의 inline funnel 보정은 폐기. |
| `stam/css/stam.board-factory.css` | **변경 없음** | PR #141 버전 유지. `.bf-filter-icon` 규칙 폐기. |
| `stam/docs/reports/visual-qa/board-factory-requirements-v2/index.md` | 신규 | 본 QA 문서. |

**자체 화면 CSS/JS 0** — requirements v2 전용 selector / class / patch 없음. toolbar filter 아이콘은 PR #141 공통 icon asset system(`stam-icon stam-icon-filter` + `stam.icons.css` mask, 단일 `filter.svg`)으로 표준화되어 fn-spec v2 / menu-screen-list v2 / requirements v2 가 **동일 asset 을 자동 적용**받는다(개별 patch 0). 기존 v1 화면은 `stam.icons.css` 미링크 + `.bf-filter-btn` scope 한정으로 비영향.

## 3. 기존 route 보호 결과

- `stam/pages/boards/requirements.html` / `stam/js/stam.requirements.js` / `stam/css/stam.requirements.css` — **diff 0**.
- 기존 nav 링크(`stam.nav-data.js` 의 `B1` 항목) 변경 없음. preview route 는 직접 URL 진입.

## 4. Board Factory 공통 CSS/JS/DOM 적용 결과

- HTML 은 다음 공통 자원만 로드 — 자체 화면 CSS/JS **0**:
  - `css/stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.project-overview.css`, `stam.form-controls.css`, `stam.drawer.css`, `stam.table-selection.css`, `stam.buttons.css`, `stam.board-toolbar.css`, `stam.board-filter.css`, `stam.board-layout.css`, `stam.custom-select.css`, `stam.board-factory.css`
  - `js/stam.theme.js`, `stam.nav-data.js`, `stam.shell.js`, `stam.nav-render.js`, `stam.topbar-render.js`, `stam.project-context-render.js`, `stam.board-filter.js`, `stam.custom-select.js`, `stam.board-factory.js`, `stam.board-configs.js`
  - 기능정의서 v2 / 메뉴구조 v2 와 **완전 동일** 자원 집합.
- inline script 는 `navRender.init('B1')` + `boardFactory.mount(root, config)` 두 줄만.
- `rq-*` alias / `stam.requirements.js` / `stam.requirements.css` **사용 0**.

## 5. PR #139 vocab 적용 결과

### 5-1. priority — `높음 / 보통 / 낮음` (`high / medium / low`)

- 기존 화면 filter 의 `중간` → `보통` 으로 **정규화 완료**. filter / drawer select / table chip 모두 `보통`. (`stam.board-configs.js` `RQ_VOCAB.priority`)
- 기능정의서 v2 `중간` ↔ 요구사항 v2 `보통` 통합은 별도 small PR 분리(PR #139 §4-2 참조).

### 5-2. status 5종

`draft / requested / reviewed / approved / hold`. filter / drawer select / table chip 모두 5종 노출. 기존 화면 drawer select 누락(`검토완료`) 보완. summary `검토중` cell 은 `requested + reviewed` 합산 metric(`dataSource.summary`).

### 5-3. type 7종

`feature / screen / data / policy / permission / integration / nonfunctional` (기능·화면·데이터·정책·권한·연동·비기능). filter 도 7종 전부 노출(기존 4종 누락 보완). `보안 / 운영` 미사용 — PR #139 §4-3 후속 확장 후보.

### 5-4. relation table 2 / drawer 4

- table 컬럼: `연결 화면설계서` (`designs`), `연결 WBS` (`wbs`) — 2종.
- drawer 연결 정보 섹션: `designs / wbs / functions / screens` — 4종.
- `testcases / defects / meetings` 는 slot 보강 후속 PR (PR #139 §4-4).

## 6. static / in-memory 범위

- 시드 10행(REQ-001 ~ REQ-010). status 5종 · priority 3종 · type 7종 전부 포함. 연결 유무 다양.
- `create / update / remove` 는 in-memory `rqRows` 배열만 변경. 새로고침 시 시드로 초기화.
- referenceSource: `users / designs / wbs / functions / screens` (5 타입).

## 7. API / Firestore / localStorage 미사용 확인

- `stam/pages/boards-v2/requirements.html` 내 `fetch / XMLHttpRequest / firebase.firestore / localStorage / sessionStorage / indexedDB` **0 hit**.
- `stam/js/stam.board-configs.js` 의 신규 `requirementsV2` 블록 동일 — 코드 사용 0. (헤더 주석 1줄에 "API/Firestore/localStorage 미사용" 문구만 존재)

## 8. 기능정의서 v2 / 메뉴구조 v2 회귀 확인

- 본 PR 은 `stam.board-factory.js` / `stam.board-factory.css` 를 변경하지 않는다(PR #141 asset 버전 유지). toolbar filter 아이콘은 PR #141 공통 asset 으로 두 v2 보드에 이미 적용되어 사용자 브라우저 QA PASS 됨. requirements v2 는 `stam.icons.css` link 추가로 동일 아이콘을 자동 적용. drawer / footer / chip / toolbar 다른 요소 미변경.
- `stam.board-configs.js` 신규 블록은 `functionalSpecificationV2` / `menuScreenListV2` 와 **독립** (별도 변수 / 별도 함수). 두 기존 config 의 byte diff 0.
- 사용자 브라우저 **재QA 필요** (engine + 공통 CSS 가 변경되었으므로 PR #138 시점 PASS 항목 재확인):
  - [ ] `/stam/pages/boards-v2/functional-specification.html` — 필터 아이콘 funnel 적용 / drawer footer stroke / chip / toolbar 회귀 없음
  - [ ] `/stam/pages/boards-v2/menu-screen-list.html` — 필터 아이콘 funnel 적용 / drawer footer stroke / chip / toolbar 회귀 없음

## 9. Common layer candidates

본 PR 초기 진행 시점: Board Factory 공통 레이어 누락 항목 = 0. config 슬롯은 모두 fn-spec v2 / menu-screen-list v2 에서 검증된 표준(`checkbox / idName / typeChip / priorityChip / statusChip / user / relationChip / date / actionButtons`, `infoGrid / textBlock / relationCards`) 으로 커버.

**회차 1 — 사용자 브라우저 QA 중 발견 (보정 완료)**:

- **toolbar 필터 버튼 아이콘** — Board Factory engine 의 filter 트리거 SVG 가 viewBox 24×24 좌상단 14×14 영역만 사용 + `stam.board-filter.css` 가 13px 강제 → 아이콘이 너무 작고 어색. **요구사항 v2 개별 화면 문제가 아니라 공통 toolbar 문제**.
- 보정: `stam.board-factory.js` (SVG 교체) + `stam.board-factory.css` (`.bf-filter-btn .bf-filter-icon` 16px 공통 규칙). 자세한 내용은 §12-A.
- 요구사항 전용 selector / class / patch 추가 0. fn-spec v2 / menu-screen-list v2 / 후속 v2 보드에 자동 적용. 기존 v1 화면 비영향.

향후 추가 발견 시 본 섹션에 후보로 기록하고, **요구사항 전용 selector 추가 금지** → 별도 commonization PR 로 분리.

## 10. 브라우저 QA 체크리스트

### 10-1. 로드 / 콘솔

- [ ] 신규 route `/stam/pages/boards-v2/requirements.html` 200 + 화면 정상 mount
- [ ] console error 0 (로드 / drawer open·close / filter / register / detail / edit / 삭제 전 과정)

### 10-2. 테이블 / 컬럼

- [ ] 컬럼 10개 정상 노출 (체크박스 / ID·명 / 유형 / 우선순위 / 상태 / 담당자 / 연결 화면설계서 / 연결 WBS / 최종 수정일 / 상세)
- [ ] idName 1줄 표시 (잘림 없음)
- [ ] chip(type 7종 / priority 3종 / status 5종) light/dark 양쪽 정상

### 10-3. summary strip

- [ ] 7칸 (전체 / 검토중 / 승인완료 / 보류 / 높음 우선순위 / 연결 화면설계서 / 연결 WBS) 정상
- [ ] `검토중` 값이 `requested + reviewed` 합산과 일치
- [ ] 1920 / 1366 응답형 정상

### 10-4. filter

- [ ] 필터 버튼 아이콘 — 공통 asset funnel(`stam-icon-filter`, PR #141) 표시 (fn-spec v2 / menu v2 와 동일)
- [ ] 상태 5종 / 유형 7종 / 우선순위 3종 (`높음 / 보통 / 낮음`) / 담당자 옵션 노출
- [ ] 필터 적용·초기화 정상

### 10-5. drawer

- [ ] 등록 — required(`유형 / 요구사항명 / 우선순위 / 상태 / 담당자 / 설명`) 빈값 차단 / 충족 시 in-memory 추가
- [ ] 상세 — 기본 정보 infoGrid / 요구사항 내용 textBlock / 연결 산출물 relationCards 4 그룹
- [ ] 수정 — prefill 정상 / update 반영
- [ ] drawer title clipping 없음
- [ ] header meta chip-only hidden 유지
- [ ] drawer padding 정상
- [ ] footer button stroke — `취소` / `임시저장` / `전체 보기` (ghost/outline) stroke 보임, `등록` / `저장` / `수정` (primary) filled 유지 — PR #138 공통 보정 자동 적용
- [ ] footer button icon 정상

### 10-6. 공통 UI 회귀 없음

- [ ] toolbar height / icon 정상
- [ ] row selected active bar 정상
- [ ] delete hover 정상
- [ ] custom select 중복 표시 없음 (`bf-cs-native` hidden)
- [ ] relation chip / pagination 정상

### 10-7. 테마 / 뷰포트

- [ ] light mode PASS
- [ ] dark mode PASS
- [ ] 1920px PASS
- [ ] 1366px PASS
- [ ] narrow / mobile (≤820, ≤480) — **DEFERRED — Board Factory mobile optimization is not part of PR #140.** 후속 *Board Factory responsive layout baseline* PR 로 분리.

### 10-8. 회귀 확인 (기존 v2 화면)

- [ ] `/stam/pages/boards-v2/functional-specification.html` 회귀 없음
- [ ] `/stam/pages/boards-v2/menu-screen-list.html` 회귀 없음

## 11. Ready 전환 조건

`Board-Factory-QA-Gate-v1.md` §1 / §2 / §3 전 항목 + 본 문서 §10 PASS 시 Ready 전환. 본 PR 은 **§10 사용자 브라우저 QA PENDING** → **Draft 유지**.

## 12. Known limitations

- **static / in-memory preview**. 새로고침 시 시드로 초기화.
- 변경 이력 탭 / 임시저장·전체 보기 보조 액션 / 승인 워크플로 chip·액션 / bulk action — **미구현** (PR #139 §6 / vocab gate §4 후속).
- 테스트케이스 / 결함 / 회의록 연결 — 미구현 (slot 보강 PR 분리).
- 기능정의서 v2 의 `중간` 라벨 ↔ 요구사항 v2 의 `보통` 라벨 통합 — 별도 small PR (PR #139 §4-2).
- nav link 미교체. preview 진입은 직접 URL.
- narrow / mobile 폭 최적화는 본 PR 범위 밖.

## 12-A. Board Factory toolbar filter icon — 공통 레이어 보정 (회차 1 — FAIL, 회차 2 — 재보정)

> **[SUPERSEDED — 2026-06-18]** 본 절의 inline funnel SVG 보정(회차 1 `15fee88` / 회차 2 `702d727`)은 PR #141 *Common Icon Asset System* (merge `7b81ebc`) 도입으로 **폐기**되었다. toolbar filter 아이콘은 이제 `stam.board-factory.js` 가 emit 하는 `<span class="stam-icon stam-icon-filter">` + `stam.icons.css` CSS mask(단일 `filter.svg`)로 렌더된다. **본 PR(rebase 후)은 board-factory.js / board-factory.css 를 수정하지 않는다.** 아래 내용은 결정 이력 기록용으로만 보존한다 — 현행 filter 아이콘 QA 는 §10-4 / §10-1 을 따른다.

### 회차 1 (`15fee88`) — 사용자 시각 QA FAIL

- 변경: SVG 16px funnel (`M4.5 5h15l-6 7.2v5.4l-3 1.4v-6.8L4.5 5z`) + CSS `.bf-filter-btn .bf-filter-icon { width:16px; height:16px }`.
- 결과: 사용자 브라우저에서 "기존처럼 작고 어색하게 보임 — 아예 안 바뀜" 으로 확인. **시각 변화 미체감으로 FAIL.**
- 추정 원인 (회차 2 보정 시 종합 대응):
  1. **path 가 viewBox 의 약 54% 만 사용** (y=5~18 → 13/24). 16px 표시 시 실제 콘텐츠는 ~9px 로 보임 → 작게 인식.
  2. stroke-width 1.8 — 작은 사이즈에서 라인이 얇게 보임.
  3. CSS specificity `.bf-filter-btn .bf-filter-icon` (0,2,0) 이 `.stam-board-filter-trigger svg` (0,1,1) 보다 우위이긴 하나, 일부 브라우저 캐시 / load order edge case 대비 부족.
  4. `min-width` / `flex` 명시 없음 → 부모 flex 컨테이너에서 0 으로 줄어들 가능성.

### 회차 2 — 재보정 ★

**목표**: 사용자 화면에서 명확히 funnel 18px 로 보이게 한다.

**변경 1** — `stam/js/stam.board-factory.js:276`
- size `16 → 18`
- viewBox 충전률 상승: path `M3 5h18l-7 8.5v5.5l-4 2v-7.5L3 5z` (x=3~21 → 75% / y=5~21 → 67%, 이전 대비 +37% 확장)
- stroke-width `1.8 → 2`
- `class="bf-filter-icon"` 유지, `aria-hidden="true" focusable="false"` 유지

```html
<svg class="bf-filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true" focusable="false">
  <path d="M3 5h18l-7 8.5v5.5l-4 2v-7.5L3 5z"/>
</svg>
```

**변경 2** — `stam/css/stam.board-factory.css`
- 두 selector 동시 매치(이중 안전망):
  - `.bf-filter-btn .bf-filter-icon` — 클래스 직접 매치 (0,2,0)
  - `.bf-filter-btn.stam-board-filter-trigger svg` — board-filter.css 의 `.stam-board-filter-trigger svg` (0,1,1) 을 specificity (0,2,1) 로 명시 override
- 사이즈 18px + `min-width: 18px` + `flex: 0 0 18px` 로 부모 flex 압축 차단
- 버튼 `gap: 6px` (이전 5px → 6px) — 아이콘과 텍스트 간격 사용자 기준 충족

```css
.bf-filter-btn .bf-filter-icon,
.bf-filter-btn.stam-board-filter-trigger svg {
  width: 18px;
  height: 18px;
  min-width: 18px;
  flex: 0 0 18px;
  display: inline-block;
  color: currentColor;
}
.bf-filter-btn { gap: 6px; }
```

### 12-A-1. 실제 렌더 위치 / 원인 (회차 2 정리)

- **실제 렌더 위치**: `stam/js/stam.board-factory.js:276` — Board Factory engine 의 toolbar render 코드(`buildShell` 내 `<button class="bf-filter-btn stam-board-filter-trigger" …>`).
- `stam.board-filter.js` 는 패널/그룹/카운트만 다룸(트리거 SVG markup 미생성). 따라서 SVG 교체는 engine 한 곳만 고치면 충분.
- 사이즈 강제는 `stam.board-filter.css:43-48` 의 `.stam-board-filter-trigger svg { width:13px; height:13px }` 가 원인.

### 12-A-2. 최종 적용 selector / 사이즈

- **selector**: `.bf-filter-btn .bf-filter-icon, .bf-filter-btn.stam-board-filter-trigger svg`
- **사이즈**: 18×18
- **stroke**: `currentColor` / `width: 2`
- **scope**: `.bf-filter-btn` (engine emit 클래스) 한정. 기존 v1 화면(`.rq-filter-btn`, `.fn-filter-btn`, `.msl-filter-btn` 등) 비영향.

### 12-A-3. 보정 성격

**Board Factory 공통 레이어 보정.** 요구사항 v2 전용 selector / patch / config 추가 0. fn-spec v2 / menu-screen-list v2 / requirements v2 모두 같은 engine 출력을 쓰므로 자동 적용.

### 12-A-4. 시각 재QA 항목 (PENDING — 사용자 브라우저 QA)

- [ ] **requirements v2** — `/stam/pages/boards-v2/requirements.html` 필터 버튼 아이콘이 funnel 18px 로 **명확히 보임** (이전 대비 시각 변화 체감)
- [ ] **fn-spec v2** — `/stam/pages/boards-v2/functional-specification.html` 동일 funnel 18px 자동 적용 확인
- [ ] **menu-screen-list v2** — `/stam/pages/boards-v2/menu-screen-list.html` 동일 funnel 18px 자동 적용 확인
- [ ] 기존 v1 화면(`/stam/pages/boards/requirements.html` 등) 필터 아이콘 영향 없음
- [ ] 필터 열림 / 닫힘 / 카운트 표시 / 초기화 / 적용 동작 정상
- [ ] light mode — PENDING
- [ ] dark mode — PENDING
- [ ] 1920px — PENDING
- [ ] 1366px — PENDING
- [ ] console error — PENDING (0 예상)
- [ ] narrow / mobile — **DEFERRED** (변경 없음)

### 12-A-5. 영향 범위 / 비변경 확인

- 영향: Board Factory 공통 toolbar(`.bf-filter-btn`) 사용 보드 전체.
- 비변경:
  - 기존 v1 화면 필터 트리거(`rq-/fn-/msl-filter-btn` 클래스) → `bf-filter-btn` 미보유 → 본 규칙 미매치.
  - 필터 동작 / 상태 / 데이터 로직 무변경 (markup 만 교체).
  - drawer / footer / chip / custom select / 다른 toolbar 버튼 무영향.

### 회차 1 잔존 기록

회차 1 의 `12-A-5` ~ `12-A-6` 항목은 본 §12-A-4 / §12-A-5 로 흡수 / 갱신되었다. 회차 1 의 PASS 마크 없음 → 회차 2 의 사용자 재QA 결과로만 PASS 판정.

---

## 13. 다음 후보

- **Board Factory responsive layout baseline** — narrow/mobile 폭 공통 레이어 정리.
- **priority vocab 통합 small PR** — 기능정의서 v2 `중간` ↔ 요구사항 v2 `보통` 통합.
- **historyList / approval workflow slot 본구현** — 변경 이력 / 승인 액션 본구현.
- **테스트케이스 / 결함 / 회의록 relation slot 확장**.
