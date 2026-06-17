# Board Factory v1.2 — Architecture

> docs-only 설계 초안 · 구현 PR 아님
> 근거: `Board-Factory-v1.2-A-Class-Inventory.md` (r2 실사)
> 선행: PR #134 merge 기준

---

## 1. 목적

STAM의 산출물 게시판(기능정의서·메뉴구조/화면목록·요구사항정의서 등)은 동일 골격(상단 컨텍스트 → board header → summary strip → toolbar → select table → pagination → register/detail/edit drawer → drawer footer)을 화면마다 **복제**하고 있다. 실사 결과:

- 공통 인터랙션은 이미 SSOT 모듈로 추출됨: `STAMBoardList`(`stam/js/stam.board-list.js`), `boardFilter`(`stam/js/stam.board-filter.js`), `customSelect`(`stam/js/stam.custom-select.js`).
- 그러나 컬럼/필터/드로워/데이터는 화면별 HTML·JS에 하드코딩.

Board Factory v1.2는 **config + data adapter + reference resolver**로 이 골격을 한 번에 구성하는 선언적 레이어를 정의한다. 목표는 신규/리뉴얼 게시판을 HTML 복제 없이 config로 생성하는 것.

---

## 2. 기존 boards 유지 / boards-v2 병렬 구축 원칙

- `stam/pages/boards/**`는 **기준본(SSOT baseline)으로 동결 유지**. 본 단계에서 리팩터링·삭제·링크 변경 금지.
- `boards-v2`는 **이번 PR에서 생성하지 않는다.** 생성 범위는 PR #136 이후 별도 결정.
- v2는 별도 route에서만 preview. 기존 route 보존.
- 제품 저장/API/localStorage/Firestore/Firebase/GitHub Actions 로직 **동결**. Factory는 신규 data adapter layer로만 접근.

---

## 3. A/B/C 게시판 분류

| 클래스 | 정의 | 예 |
| --- | --- | --- |
| **A** | list-first 표준 골격. config로 1:1 표현, custom slot 최소 | 기능정의서, 메뉴구조/화면목록, 요구사항정의서 |
| **B** | 표준 골격이나 추가 slot/확장 필요(tree, custom cell 다수, view mode 등) | (후보) WBS 일부 view |
| **C** | list-first 부적합(split editor/canvas/Gantt/timeline/state machine) | 화면설계서(캔버스), WBS Gantt 등 Special App |

---

## 4. A-class 실사 결과 요약

| 화면 | 판정 | 핵심 근거 |
| --- | --- | --- |
| 기능정의서 | A 유지 | custom cell 0, 골격 동질. 연결화면 저장값이 label(`...functional-specification.html:L188`) → id 정규화 과제 |
| 메뉴구조/화면목록 | A 유지 | LV1/LV2 flat column(`...menu-screen-list.html:L189-190`), tree 아님. REQ/SCR id 참조 |
| 요구사항정의서 | A 유지(조건부) | review/acceptance/approval detail section built-in 흡수 전제. priority `보통`/`중간` vocab 결함 선결 |

공통 발견(상세 inventory §7·§9):
- relation: REQ/SCR/WBS는 id 기반(good). 기능정의서 연결화면만 label.
- user: 전 화면 이름 문자열, userId 없음.
- summary/filter: 정적. 실제 list 필터 미구현(UI Mock). summary는 행 집계 불가 → `summary(query)` 필요.
- detail: 단일 정적 drawer, row hydration 안 함 → `get(id)` 필요.

---

## 5. Config Schema 초안

```js
const boardConfig = {
  id: "functional-specification",
  route: "/boards-v2/functional-specification",   // v2는 별도 route preview
  title: "기능정의서",
  description: "화면별 기능을 정의하고 요구사항·화면설계서와 연결합니다.",
  navCode: "B5",

  // 상단 summary strip
  summary: {
    metrics: ["total", "draft", "inReview", "approved", "hold"],
    facets:  ["linkedReqCount", "linkedScreenCount"]
  },

  // 컬럼 (built-in renderer registry 키 사용)
  columns: [
    { key: "_select",      renderer: "checkbox",   width: 40 },
    { key: "idName",       label: "기능 ID / 기능명", renderer: "idName", valueType: "idText", width: "min:220", filterable: false, searchable: true },
    { key: "linkedReq",    label: "연결 요구사항", renderer: "relationChip", valueType: "relation", referenceType: "requirement", width: 100 },
    { key: "linkedScreen", label: "연결 화면",   renderer: "relationChip", valueType: "relation", referenceType: "screen", width: 130 },
    { key: "fnType",       label: "기능유형", renderer: "typeChip",     valueType: "enum", vocab: "fnType",   width: 80, filterable: true },
    { key: "priority",     label: "우선순위", renderer: "priorityChip", valueType: "enum", vocab: "priority", width: 76, filterable: true },
    { key: "status",       label: "상태",     renderer: "statusChip",   valueType: "enum", vocab: "status",   width: 88, filterable: true },
    { key: "assignee",     label: "담당자",   renderer: "user",         valueType: "user", referenceType: "user", width: 80, filterable: true },
    { key: "updatedAt",    label: "최종 수정일", renderer: "date",      valueType: "date", width: 100 }
  ],

  // 필터 (boardFilter groups와 호환; vocab semantic key로 정규화)
  filters: [
    { key: "status",   label: "상태",     type: "multi", vocab: "status" },
    { key: "fnType",   label: "기능유형", type: "multi", vocab: "fnType" },
    { key: "priority", label: "우선순위", type: "multi", vocab: "priority" },
    { key: "assignee", label: "담당자",   type: "multi", referenceType: "user" }
  ],
  search: { fields: ["id", "name", "assignee"] },  // 기존 fn 검색은 row 전체 → 필드 한정으로 교정

  // 드로워 필드
  drawer: {
    sections: [
      { title: "기본 정보", fields: [
        { key: "fnId",     label: "기능 ID", fieldType: "readonlyId", visibleIn: ["R","D","E"] },
        { key: "fnType",   label: "기능유형", fieldType: "select", vocab: "fnType", required: true, visibleIn: ["R","D","E"] },
        { key: "fnName",   label: "기능명", fieldType: "text", required: true, visibleIn: ["R","D","E"] },
        { key: "priority", label: "우선순위", fieldType: "select", vocab: "priority", required: true, visibleIn: ["R","D","E"] },
        { key: "status",   label: "상태", fieldType: "select", vocab: "status", default: "draft", visibleIn: ["R","D","E"] },
        { key: "assignee", label: "담당자", fieldType: "reference", referenceType: "user", visibleIn: ["R","D","E"] }
      ]},
      { title: "연결 정보", fields: [
        { key: "linkedReq",    label: "연결 요구사항", fieldType: "reference", referenceType: "requirement", cardinality: "one", visibleIn: ["R","D","E"] },
        { key: "linkedScreen", label: "연결 화면", fieldType: "reference", referenceType: "screen", cardinality: "one", visibleIn: ["R","D","E"] }
      ]},
      { title: "기능 내용", fields: [ /* desc/input/rule/exception/api/remark: textarea */ ] }
    ],
    detailSections: ["infoGrid", "relationCards", "textBlock", "historyList"]
  },

  dataSource: { /* §6 */ },
  referenceSource: { /* §8 */ },
  permissions: { mode: "allow-all" }   // 현 동작 보존(권한 미구현). 별도 과제.
};
```

---

## 6. Data Adapter Contract

기존 제품 저장 로직(미구현/정적)을 변경하지 않고, Factory는 adapter 인터페이스로만 데이터에 접근한다. `mode`로 백엔드 전환.

```js
dataSource: {
  mode: "static", // static | localStorage | api | firestore

  list: async (query) => ({
    rows: [],
    total: 0
  }),
  get: async (id) => null,                 // detail hydration (필수 — inventory §2-2)
  summary: async (query) => ({             // summary strip (필수 — inventory §2-1)
    metrics: {},
    facets: {}
  }),
  create: async (payload) => null,
  update: async (id, payload) => null,
  remove: async (id) => ({ ok: true })
}
```

원칙:
- `list`는 `query.keyword`/`query.filters`/`query.sort`/페이지를 실제 반영(기존 UI Mock 교정).
- `summary`는 list와 독립 — 전체 도메인 집계(현재 행 집계로는 산출 불가).
- `get(id)`는 detail/edit drawer hydration 전용. row가 보유하지 않는 필드(설명·이력·수용조건) 포함.
- v1.2 PR #136 preview는 `mode: "static"`(혹은 기존 정적 데이터 fixture)로 시작. localStorage/api/firestore는 후속.

---

## 7. Query Contract

```js
query: {
  keyword: "",
  filters: {},          // { [groupKey]: [semanticKey, ...] } — boardFilter getValues()와 호환
  sort: {
    key: "updatedAt",
    direction: "desc"
  },
  page: 1,
  pageSize: 20
}
```

- `filters` 형식은 `boardFilter.getValues()`(`stam/js/stam.board-filter.js:L145-153`) 출력과 정렬. 단 chip 값은 표시 라벨이 아니라 **semantic key**로 전달(vocab 정규화).
- `sort`는 신규(현재 정렬 미지원). 기본 `updatedAt desc`.

---

## 8. Reference Resolver Contract

relation/user 후보 목록과 id→표시 해석을 분리.

```js
referenceSource: {
  listOptions: async (referenceType, query) => ({
    options: [],   // [{ id, label, sub? }]
    total: 0,
    cursor: null
  }),
  resolve: async (referenceType, ids) => ({
    byId: {},       // { [id]: { label, ... } }
    missingIds: []
  })
}
```

reference option query:
```js
{
  search: "",
  projectId: "",
  cursor: null,
  limit: 20
}
```

referenceType: `requirement | screen | screenSpec | wbs | user`.

원칙:
- relation 저장값은 label보다 **id 또는 `{ type, ids: [] }`** 권장.
- user 저장값은 이름 문자열보다 **`userId`** 권장.
- 현재 user는 이름 문자열만 존재 → **이름 → userId 매핑 후속 과제**로 등재.
- 기능정의서 연결 화면은 label만 존재 → **라벨 → id 매핑 후속 과제**로 등재.
- 후보 목록 출처: 현재 static 하드코딩. v2에서 `external board` / `project members`로 전환(예: user = project members, requirement = 요구사항 board).

---

## 9. Built-in Renderer Registry

column cell renderer (inventory §6-1 실측 기반):

```txt
checkbox       — 선택 체크박스
idName         — id(강조) + name 2-line
text           — 단순 텍스트
date           — 날짜
chip           — 색상 variant 기반 base chip
priorityChip   — 높음/보통/낮음
statusChip     — 상태 (vocab 화면별)
typeChip       — 기능유형/화면유형/FO·BO/요구유형
user           — avatar(이니셜) + 이름  (== user/avatar)
relationChip   — REQ/SCR/WBS chip (단일·multi)
link           — 외부 라우팅 (예약, 현재 미사용)
actionButtons  — 행 단위 액션 (예약, 현재 toolbar/footer만)
```

→ 실사 결과 세 화면의 **모든 컬럼이 위 registry로 흡수**됨 (non-built-in custom renderer 0).

---

## 10. Built-in Detail Section Registry

```txt
infoGrid        — key/value 그리드 (전 화면)
textBlock       — 단락 본문 (기능내용/배경/상세요구사항)
relationCards   — 연결 카드 목록 (REQ/SCR/WBS)
historyList     — 변경 이력
reviewList      — 검토 이력 (요구사항)
acceptanceList  — 수용 조건 (요구사항)
approvalStatus  — 승인 상태 (요구사항)
attachmentList  — 첨부 (예약, 현재 미사용)
```

→ 요구사항 A 유지의 전제: `reviewList`/`acceptanceList`/`approvalStatus`가 built-in으로 등재되어야 함(미등재 시 custom detailSection slot 필요 → B 격상).

---

## 11. Slot Governance

확장은 slot으로만 허용하며 개수를 게이트한다(상세 Migration-Gates 문서).

| slot | 상태 | 비고 |
| --- | --- | --- |
| `cellRenderer` | 허용 | non-built-in이 컬럼 50% 초과 또는 3개 초과 시 B 격상 |
| `detailSection` | 허용 | built-in 우선, 부족 시 custom |
| `drawerFieldRenderer` | 허용 | 2개 초과 시 B 격상 |
| `toolbarExtra` | 보류 | 도입 신중 |
| `beforeTable` | 보류 | |
| `rowExpansion` | 보류 | 사용 시 사실상 tree → 재분류 검토 |
| `customFooter` | 금지에 가깝게 제한 | drawer footer는 SSOT 공통 유지 |

한 화면에서 slot 3개 초과 시 B/C 재분류.

---

## 12. vocab 정규화 전략

- 저장/필터/표시를 동일 **semantic key**로 묶는다. 저장값=key, 표시=label, 과거 어휘=alias.

```js
priority: {
  high:   { label: "높음" },
  normal: { label: "보통", aliases: ["중간"] },
  low:    { label: "낮음" }
}
status: {
  draft:    { label: "작성중" },
  inReview: { label: "검토요청", aliases: ["검토중"] },
  reviewed: { label: "검토완료" },
  approved: { label: "승인완료", aliases: ["확정"] },
  hold:     { label: "보류" }
}
```

- 확정 결함: 요구사항 표시·저장 `보통` vs 필터 `중간`(inventory §9-1) → `priority.normal`로 정규화, 저장값 `normal`, 표시 `보통`, `중간`은 legacy alias/제거 후보.
- 요구사항 type 필터 누락(권한/연동/비기능) 보정.
- 메뉴구조 status(`검토중/확정`) 통합 여부는 도메인 결정사항으로 PR #136에서 확정.

---

## 13. Special App 분리 원칙

- list-first 모델이 부적합한 화면(split editor/canvas/Gantt/timeline/custom state machine, 복수 view mode 강제)은 Factory 대상에서 제외(C).
- 예: 화면설계서(캔버스 편집), WBS Gantt/타임라인. 이들은 별도 Special App으로 유지하고 Factory config 강제 적용하지 않는다(Migration-Gates 문서 근거 항목).

---

## 14. PR #136 구현 착수 전 조건

1. A-class 3개 실사표 완료(본 inventory).
2. 각 화면 A/B/C 판정 완료(전부 A 유지).
3. relation/user 저장값과 resolver 계약 확정(§8) + label/이름 매핑 과제 등재.
4. vocab 정규화 방침 확정(§12).
5. custom renderer/slot 수 게이트 통과(전 화면 custom cell 0).
6. 기능정의서 v2 preview acceptance checklist 확정(Migration-Gates 문서).
7. 기존 boards 유지 원칙 확인.
8. boards-v2 생성 범위 확정(본 PR에서는 미생성).

> 구현 1차 대상: **기능정의서 v2 preview** (PR #136). 별도 route, static dataSource, 기존 route/저장 로직 동결.
