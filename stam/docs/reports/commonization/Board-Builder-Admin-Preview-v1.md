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
| 기본 필드 | ID · 제목 · 상태 · 담당자 · 우선순위 · 유형 · 최종수정일 · 설명 | 체크박스 (기본 일부 선택) |
| 커스텀 필드 | 필드명 · 필드 key · 필드 타입 · 옵션(쉼표) | type: text/textarea/select/date/user/status/priority/relation/boolean/number/url |

- 필드 타입은 **Field Schema v1**(`STAM.boardFieldSchema`)의 type 을 사용한다.
- 옵션은 1차에서 comma-separated string 으로 입력받아 배열로 변환한다.

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
- [ ] 기본 필드 체크 / 커스텀 필드 추가·삭제
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
