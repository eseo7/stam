# Board Factory — Board Builder Admin Preview v1

> 브랜치 `feat/board-builder-admin-preview-v1` · PR `feat(board-factory): add board builder admin preview`
> base = main `e37bb0c` (PR #144 Board Field Schema v1 merge 후).
> 사용자가 입력값(카테고리/게시판명/코드/설명 + 필드)으로 **Board Factory config preview** 를 생성·확인하는 standalone 페이지.
> **Draft 전용** — 사용자 브라우저 QA 전 Ready / merge / deploy 금지. 실제 게시판 생성/DB 저장 아님.

---

## 1. 목적

- 사용자가 직접 **카테고리 · 게시판명 · 게시판 코드 · 설명** 을 입력하고 **필드(기본 + 커스텀)** 를 선택/추가해, Board Factory 형식의 **config 를 생성**하고 화면에서 즉시 **preview** 한다.
- "게시판 찍어내기" 흐름의 **관리자 입력 단계**를 시각화한다. (Field Schema v1 → **Builder Admin Preview** → Custom Board Runtime Preview)
- DB 없이 **localStorage / mock** 으로 동작하며, 생성 config 를 JSON 으로 확인/복사할 수 있다.

## 2. DB 없이 localStorage / mock preview 로 시작하는 이유

- 현재 단계 목표는 **입력 → config 생성 흐름과 결과 형태의 검증**이지, 영속 저장이 아니다.
- Firestore/API 스키마·권한을 먼저 확정하지 않고도 **config 구조(columns/filters/drawer)를 빠르게 반복**할 수 있다.
- localStorage 는 새로고침 복원만 담당(`formState` / `previewConfig`) → 사용자가 입력을 잃지 않고 QA 가능.
- 실제 저장/런타임 mount 는 후속 PR(§8)에서 안전하게 분리 진행 — 본 PR 은 화면/엔진/기존 config 를 건드리지 않는다.

## 3. 입력 항목

| 영역 | 항목 | 형태 |
| --- | --- | --- |
| 게시판 정보 | 카테고리 | select (산출물 관리 / 관리/설정 / 프로젝트 관리) |
| | 게시판명 | text (예: 테스트 시나리오) |
| | 게시판 코드 | text + `자동` slug 보조 (예: test-scenario) |
| | 설명 | textarea |
| | 기본 템플릿 | 고정 표기 (목록 + 필터 + 등록/상세/수정 Drawer) |
| 필드 구성 | 단일 ordered list (card UI, 추천 초기 필드 포함) | 각 card: ⋮⋮ 드래그 핸들 · 순서 · 필드명 · key · type · 옵션 · 목록/필터/드로워/필수 토글 · 위·아래/삽입/삭제 |

- **기본/커스텀 구분 없이 하나의 card 정렬 목록**이다. 추천 초기 필드도 수정/삭제/순서변경/중간삽입 가능하다(회차 2~3, §12~13).
- 순서 변경은 **Drag & Drop**(핸들 ⋮⋮)이 기본, 위/아래 버튼은 보조(회차 3, §13).
- 필드 타입은 **Field Schema v1**(`STAM.boardFieldSchema`)의 type 11종을 사용한다. 옵션은 comma-separated string → 배열.
- `목록표시 / 필터표시 / 드로워표시 / 필수`는 per-field 토글이며 **type 기본값보다 우선** 적용되어 생성 columns/filters/drawer 에 반영된다. `필수`는 checkbox 가 source of truth(§13-3).

## 4. 생성 config 구조

`Preview 생성` 클릭 → `STAM.boardBuilderPreview.buildConfig(form)` 가 Field Schema 로 정규화해 아래 구조를 만든다(`stam.boardBuilder.previewConfig` 에 저장).

```js
{
  id: "testScenarioV2",          // camelCase(slug) + 'V2'
  slug: "test-scenario",
  category: "산출물 관리",
  title: "테스트 시나리오",
  description: "...",
  idKey: "id",
  nameKey: "title",
  template: "목록 + 필터 + 등록 Drawer + 상세 Drawer + 수정 Drawer",
  fields: [ /* Field Schema v1 정규화 필드(visible*/sortable/align/tone…) */ ],
  columns: [ {type:'checkbox'}, {type:'idName',…}, …, {type:'actionButtons',…} ],
  filters: [ {key,label,options[]} … ],         // visibleInFilter 필드
  drawer: { create:[…], detail:[…], edit:[…] }, // visibleInDrawer 필드
  actions: ["create", "delete", "filter"],
  generatedAt: "<ISO string>"
}
```

- **columns**: `checkbox` + `idName`(id/제목) + visibleInTable 필드(type→engine renderer) + `actionButtons`(상세).
- **filters**: `visibleInFilter` 필드 → `{key,label,options}`.
- **drawer.create/edit**: 편집 가능 + 드로워 노출 필드, **detail**: 드로워 노출 필드. id 는 `readonly`.
- type→engine 매핑은 `STAM.boardFieldSchema.engineMapping(type)` 사용(엔진 변경 없음).

### 4-1. 생성 결과 Preview (화면 내)

요약(게시판명/코드/필드 수/컬럼 수/필터 수) · generated columns · generated filters · generated drawer fields · **sample rows 3개 자동 생성 table** · generated config JSON(textarea) · "이 config 는 아직 DB 에 저장되지 않았습니다." 안내. table chip 은 공통 `.bf-chip--*` tone 재사용.

## 5. 포함 범위 (이번 PR)

- 신규 standalone 페이지 `board-builder.html` (App Shell 미부착 / Left Menu 대체 아님).
- 입력 폼 + 기본/커스텀 필드 + `Preview 생성` / `Reset` / `Copy JSON`.
- config 생성(`buildConfig`) + 화면 내 table/filter/drawer preview + JSON.
- localStorage 저장/복원(`stam.boardBuilder.previewConfig` / `stam.boardBuilder.formState`).
- Preview Index(`index.html`)에 Board Builder 진입 카드 1개 추가.

## 6. 제외 범위 (이번 PR 아님)

- 생성 config 를 실제 Board Factory route 로 **동적 mount** (→ Custom Board Runtime Preview PR).
- Firestore/API **실제 저장**.
- 실제 **게시판 자동 생성 버튼** / 메뉴(nav-data) 연결.
- 권한/필드 편집 제어, range 필터, export 실연결.
- narrow/mobile 폭 최적화 — **DEFERRED**.

## 7. 변경 파일

| 파일 | 상태 | 내용 |
| --- | --- | --- |
| `stam/pages/boards-v2/board-builder.html` | 신규 | Board Builder Admin Preview 페이지(standalone, inline `bb-` 스타일, tokens + `.bf-chip` 재사용). |
| `stam/js/stam.board-builder-preview.js` | 신규 | `STAM.boardBuilderPreview` — `init`/`buildConfig`/`sampleRows`/`slugify`. localStorage preview, Firestore/API 0. |
| `stam/pages/boards-v2/index.html` | 수정 | Board Builder 진입 카드 1개 + `.bfx-builder` 스타일 추가. 기존 3카드 그리드/문구 유지. |
| `stam/docs/reports/commonization/Board-Builder-Admin-Preview-v1.md` | 신규 | 본 문서. |

## 8. 후속 작업

1. **Board Config Registry v1** — 생성 config 를 등록/조회/목록화(여전히 local/mock 가능).
2. **Custom Board Runtime Preview** — generated config 를 실제 `STAM.boardFactory.mount` 로 렌더.
3. **실제 DB 저장** — Firestore/API 스키마 + 저장/로드.
4. **nav-data 후보 등록** — 안정화된 board 를 메뉴에 연결(별도 PR, 신중히).
5. **권한 / 필드 제어** — role 별 필드 노출/편집(`permission` 속성 실연결), range 필터, export.

## 9. 검증

- `node --check` board-builder-preview.js / board-field-schema.js / board-factory.js / board-configs.js → PASS
- `buildConfig` 단위 동작: id=`testScenarioV2`, columns(checkbox→idName→필드→actionButtons), filters(visibleInFilter), drawer(id=readonly), sample rows 3 — 정적 확인.
- CSS 중괄호 balance: board-factory.css / icons.css — 변경 없음(BALANCED 유지).
- 기존 v1 / boards-v2 3화면 / nav-data / shell / topbar / board-configs / board-factory(js·css) / icons / assets diff 0.
- API / Firestore / fetch 호출 0 (localStorage 만).

## 10. 브라우저 QA 체크리스트 (사용자 — PENDING)

- [ ] `index.html` Board Builder 카드 표시 + 이동
- [ ] `board-builder.html` route load (console error 0)
- [ ] 카테고리/게시판명/코드/설명 입력 · `자동` slug
- [ ] 필드 구성 단일 목록 — 추천 필드 편집 / 추가 / 중간 삽입 / 위·아래 이동 / 삭제 / 목록표시·필수·옵션 토글
- [ ] 우측 Preview 영역 확대 — 1920 / 1366 레이아웃, JSON·table 가독성
- [ ] `Preview 생성` → 요약/컬럼/필터/드로워/sample table/JSON 표시
- [ ] localStorage 저장 → 새로고침 복원 (formState + previewConfig)
- [ ] `Reset` (입력/미리보기/localStorage 초기화)
- [ ] `Copy JSON` (성공 또는 textarea 선택 fallback)
- [ ] light/dark · 1920/1366
- [ ] 기존 v2 3화면 / v1 영향 없음
- [ ] narrow/mobile — DEFERRED

## 11. 비영향 / 미변경

- `board-factory.js` / `board-factory.css` / `board-configs.js` / `icons.css` / `assets/icons/**` diff 0.
- `boards/**`(v1) / `nav-data` / `nav-render` / `shell` / `topbar-render` diff 0.
- 기존 boards-v2 3화면(requirements/menu-screen-list/functional-specification) diff 0.
- App Shell / Left Menu / nav-data 미연결. Firestore/API/firebase/workflows/package/config/build 미변경.

## 12. 회차 2 — 사용자 QA 피드백 반영 (필드 구성 단일화 + 우측 Preview 확대)

PR #145 Draft 안에서 사용자 QA 피드백을 반영한 수정. **Board Builder 화면에만 적용**되며 기존 v2 3화면/엔진에는 영향 없음(`board-factory.js`/`.css`/`board-configs.js` diff 0 유지).

### 12-1. 필드 입력 단일화 — `필드 구성` ordered list

- 기존 "기본 필드 체크박스 + 커스텀 필드 추가" **2단 구조 제거** → **단일 정렬 목록**으로 통합.
- 추천 초기 필드(id·제목·상태·담당자·우선순위·최종수정일)도 일반 row 와 동일하게 **수정 / 삭제 / 위·아래 이동 / 중간 삽입** 가능.
- 각 row 는 2줄: **메인**(필드명 / key / type) + **보조**(목록표시 · 필수 · 옵션 · 이동/삽입/삭제 버튼). role(id/명/수정일) 배지 표시.
- 상태 모델은 단일 `fields[]` 배열(source of truth). 텍스트 입력은 focus 유지를 위해 re-render 없이 state 갱신, 구조 변경(이동/삽입/삭제)만 re-render.
- `목록표시`(visibleInTable) 토글은 `buildConfig` 에서 type 기본값보다 우선 적용 → 생성 컬럼에 반영.

### 12-2. 우측 생성 결과 Preview 확대

- `.bb-wrap` max-width `1160px → 1640px`.
- `.bb-cols`: `minmax(380px,440px) minmax(0,1fr)` + `gap 24px` + `align-items:start` → **좌측 입력 고정(380~440), 우측 Preview 확장**. stack 분기 `980px → 1180px`.
- JSON textarea `rows 14 → 20` + `min-height 360px`, table preview `min-width 560 → 640` + 가로 스크롤 유지. 좌측 입력 최소 사용성(≥380px) 유지.
- 권장 비율 충족: 1920 기준 좌측 440 / 우측 ~1176, 1366 기준 좌측 440 / 우측 ~854.

### 12-3. 검증 (회차 2)

- `node --check` 4개 JS PASS · board-builder.html inline CSS 중괄호 BALANCED · `buildConfig` 재검증(순서 보존 / `visibleInTable:false` 컬럼 제외) PASS.
- 변경 파일: `board-builder.html` / `stam.board-builder-preview.js` (+ 본 문서). 그 외 diff 0.
- 1920 / 1366 레이아웃 · 단일 필드 목록 조작 · localStorage 복원 · Reset · Copy JSON 은 **사용자 재QA(PENDING)**. narrow/mobile DEFERRED.

## 13. 회차 3 — UX 전면 정리 (Drag&Drop · 필수 동기화 수정 · Preview 탭화)

사용자가 회차 2 UI 를 "불편/불쾌"로 평가 → 핵심 UX 재정리. **Board Builder 화면 전용**, 기존 v2 3화면/엔진/`index.html` diff 0.

### 13-1. 필드 구성 row → card UI 재설계

- 좁은 2줄 row → **여유 있는 card**. 상단: ⋮⋮ 드래그 핸들 · 순서 · 필드명 · key · type · (시스템/이름 chip). 하단: 옵션(full width) · 목록/필터/드로워/필수 토글 · 위·아래/삽입/삭제.
- 입력칸 높이·간격 확대, 1366 좌측 패널(380~440px)에서도 조작 가능.

### 13-2. Drag & Drop 순서 변경 (vanilla, 외부 라이브러리 0)

- 드래그 핸들(`⋮⋮`, `draggable`)에서 `dragstart` → `els.fields` 위임으로 `dragover`(insert indicator: `.drop-before`/`.drop-after`) → `drop`(포인터 위치로 before/after 계산, `fields` splice 이동) → `dragend`(상태 정리). 드래그 중 row `.is-dragging`.
- 첫↔마지막, 마지막→중간, 신규 필드 중간 삽입 후 이동 모두 `fields` 배열 순서 변경 → **즉시 화면 + (생성 후) Preview + localStorage 반영**. 위/아래 버튼은 보조로 유지.

### 13-3. `필수` 동기화 오류 수정 (source of truth = checkbox)

- `required` checkbox 가 단일 출처. 체크 → `field.required=true` + drawer marker `*` + JSON `true`. 해제 → `false` + marker 제거 + JSON `false`.
- **시스템/필수 고정 필드**(예: `id`)는 checkbox `disabled` + `🔒 시스템 필드` 사유 표시, 사용자가 변경 불가.
- readonly 자동 필드(id)는 drawer 입력 필수가 아니므로 marker 미표시(`required && control!=='readonly'`).
- **생성 후 live 반영**: 필드 편집/토글/드래그/추가/삭제 시 우측 Preview 가 즉시 재생성되어 marker·순서·JSON 이 항상 현재 상태와 일치(과거 stale preview 로 인한 "필수처럼 보임" 문제 제거). 정적 단위테스트로 required true/false ↔ drawer/JSON 일치 확인.

### 13-4. 우측 Preview 정보 구조 (탭)

- 상단 summary card 유지 + **탭 4개**: `화면 Preview`(sample table + 안내) · `필드 / 컬럼` · `필터 / 드로워` · `JSON`.
- JSON 은 JSON 탭에 배치(+ Copy JSON 버튼 인접), 화면 전체를 압도하지 않음. 생성 전 친절한 empty state.

### 13-5. 버튼/행동 흐름

- `Preview 생성` primary 강조, `Reset` 우측 분리 + danger hover(실수 클릭 방지), `Copy JSON` 은 JSON 탭 내부.
- 필드 삭제는 `삭제` 텍스트 버튼(아이콘 군과 분리, danger hover) — 너무 쉽게 눌리지 않게. 시스템 필드는 삭제 disabled.

### 13-6. 검증 (회차 3)

- `node --check` 4개 JS PASS · board-builder.html inline CSS 중괄호 BALANCED.
- `buildConfig` 단위테스트: required 체크/해제 ↔ drawer.required·JSON 일치, 시스템 readonly 필드 marker 미표시, `visibleInTable/Filter/Drawer` 토글 반영, 필드 순서 보존 — **PASS**.
- 변경 파일: `board-builder.html` / `stam.board-builder-preview.js` (+ 본 문서). 기존 v2 3화면 / v1 / `index.html` / nav-data / 엔진·icons / API·Firestore·fetch **diff 0**.
- Drag&Drop · 탭 · live 반영 · 1920/1366 · light/dark 는 **사용자 재QA(PENDING)**. narrow/mobile DEFERRED.

## 14. 회차 4 — "게시판 만들기" 제품형 UX 보정 (Claude Design 시안 기준)

회차 3 까지의 Board Builder 는 기능은 갖췄으나 **개발자용 config/schema editor** 처럼 보였다. 첨부 시안 `STAM-Board-Builder-UX-Concept-v1.html` 을 기준으로, 비개발자(PM/기획)가 이해할 수 있는 **"게시판 만들기" 화면**으로 UX/레이아웃/문구/카드 구조를 보정한다. **Board Builder 화면 전용** — 엔진/기존 v1·v2 3화면/`index.html`/nav·shell·topbar **diff 0**, `buildConfig` 로직·localStorage 키 불변, API/Firestore/fetch 0.

### 14-1. 기존 문제 → 보정 방향

- **문제**: key/type/raw config 가 필드 카드 첫 화면에 노출, 제목이 `Board Builder Admin Preview`, 우측은 생성 전 빈 박스, 버튼 문구가 개발자스러움(`Preview 생성`/`Reset`/`Copy JSON`).
- **방향**: 단계형 입력(① 기본 정보 → ② 필드 구성 → ③ 초안 만들기) + 항상 살아있는 우측 미리보기 + 기술 용어는 "고급 설정"으로 접기.

### 14-2. 적용 범위

1. **페이지 제목/문구**: `게시판 만들기` + "필드와 화면 구성을 선택하면 게시판 초안을 생성할 수 있습니다." `Admin Preview / Local / No DB` 는 작은 보조 배지로만 유지.
2. **좌측 단계형**: ① 게시판 기본 정보(카테고리·게시판명·게시판 코드·설명·기본 템플릿) ② 필드 구성(카드 리스트·필드 추가·드래그 힌트) ③ 게시판 초안 만들기(초기화·JSON 복사·게시판 초안 보기). 단계 번호 헤더(`bb-step`).
3. **기본 정보**: 게시판 코드 = 자동 생성 느낌(낮은 위계 input) + `코드 자동 생성` 버튼(`white-space:nowrap` → 세로 깨짐 방지) + 안내 문구. 게시판명/카테고리/설명 넓게. **템플릿 카드형**(공지사항/자유 게시판/자료실/Q&A/요청·이슈/직접 구성) — 시작점 예시(presentational, 필드 reseed/저장 없음 → 기능 확장 0).
4. **필드 카드 재정리**: 기본 노출 = 순서/드래그 핸들 · 필드명 · 입력 방식(type, 한글 라벨) · 필수(badge형 checkbox) · 표시 위치(목록/필터/입력폼) · 옵션(옵션 타입만). **고급 설정 접기** = `필드 key` · `raw type` · `engine 매핑`(column/control/filter). 시스템 필드는 `🔒 시스템` chip + 필수/key/삭제 잠금(부드럽게). 액션(위·아래/삽입/삭제)은 카드 우측 rail 에 과하지 않게.
5. **우측 초기 상태**: 빈 박스 제거 → **항상 live**. 현재 구성 요약 stats(총 필드 / 목록 표시 / 필수 항목 / 필터 필드) + **현재 구성 기준 예상 게시판 화면**(board-mock: topbar·헤더·필터바·목록 table). 생성 전에도 "무엇이 만들어질지" 표시.
6. **우측 탭**: `화면 미리보기 / 필드 구성 / 필터·입력화면 / JSON`. JSON 탭은 `개발자 참고용` 작게 표기.
7. **버튼 문구**: `게시판 초안 보기`(primary 1개)·`초기화`·`JSON 복사`·`코드 자동 생성`·`고급 설정 보기`.
8. **스타일 톤**: 업무용 SaaS — 밝은 회색 배경 + 흰 카드 + STAM 보라 포인트 + 여백. **공통 token/전역 CSS 미변경** — bb- prefix inline `<style>` 한정, 일부 local 변수는 `.bb-wrap` scope. 시안 CSS 대량 복사 없음.

### 14-3. 유지한 기능 (회귀 금지)

Drag & Drop 순서 변경 · 위/아래 이동 · 중간 삽입 · 삭제 · required 체크/해제 · **required ↔ drawer marker ↔ JSON 동기화** · 목록/필터/입력폼(드로워) 표시 토글 · 우측 즉시 반영 · JSON 복사 · localStorage 저장/복원 · 초기화. **API/Firestore/fetch 0**, localStorage 키(`previewConfig`/`formState`) 불변.

> 우측 미리보기는 회차 3 의 "생성 후에만 표시" → **항상 live 렌더**로 변경(빈 박스 제거). `게시판 초안 보기`는 화면 미리보기 탭 포커스 + 현재 구성 저장 역할. `copyJson` 은 LS_CONFIG 부재 시 현재 입력으로 build 해 항상 복사 가능. 저장 구조(키)는 그대로.

### 14-4. 검증 (회차 4)

- `node --check` ×4 (board-builder-preview / field-schema / board-factory / board-configs) **PASS** · board-builder.html inline CSS 중괄호 BALANCED(163/163).
- `buildConfig` 재검증 + `init()` DOM 스모크 **PASS** (required true/false 동기화, 필드 reorder → columns 순서, 목록/필터/입력폼 토글 반영, 옵션 전파, init/render/addField/generate/reset throw 0).
- 변경 파일: `board-builder.html` / `stam.board-builder-preview.js` (+ 본 문서, + visual-qa evidence). 그 외 **diff 0**.
- evidence: `docs/reports/visual-qa/board-builder-admin-preview-v1/` (required-true/false·dnd-before/after·visibility-toggle·console_errors).

### 14-5. 남은 QA (PENDING)

스크린샷(1920/1366 light·dark) · 브라우저 DnD/토글/복원/콘솔 0 은 **사용자 브라우저 QA**(본 환경 헤드리스 브라우저 미가용). narrow/mobile DEFERRED.
