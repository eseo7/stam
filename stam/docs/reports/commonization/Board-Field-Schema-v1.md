# Board Factory — Field Schema v1

> 브랜치 `feat/board-field-schema-v1` · PR `feat(board-factory): define field schema presets`
> base = main `244ef72` (PR #143 Board Factory Page Contract v1 merge 후).
> "게시판 찍어내기"(Board Builder)를 위한 **공통 field schema 기준 + 3개 v2 화면 inventory**.
> **Draft 전용** — 사용자 브라우저 QA 전 Ready / merge / deploy 금지. 본 PR 은 화면 동작을 바꾸지 않는다.

---

## 1. 목적

- Board Factory 에서 사용할 **공통 field schema** 를 정의한다 — 필드 타입 12종 + 필드 속성 18종 + 타입별 기본값.
- 게시판 생성기가 쓸 수 있도록 **필드 타입 / 목록 컬럼 / 필터 / 드로워 입력 / export / permission 기준**을 type 단위로 분리한다.
- 요구사항 v2 / 메뉴구조 v2 / 기능정의서 v2 의 기존 필드를 **field schema 관점으로 inventory** 화한다.
- **실제 화면 동작은 그대로 유지**한다(엔진 렌더 경로 무변경). 관리자 생성 UI / DB 저장 / 자동 생성 버튼은 만들지 않는다.

> 본 PR 은 **기반(foundation) 작업**이다. Field type 과 화면 배치 기준을 먼저 표준화하고, 실제 생성 UI 는 후속 *Board Builder Admin Preview* 에서 진행한다.

## 2. 게시판 생성기와의 관계

```
[Field Schema v1]  ← 본 PR: 필드 타입/속성/기본값 표준 + inventory
       │ defineField(spec) → 정규화된 field schema
       ▼
[Board Config Registry v1]  ← 후속: board = { fields:[...] } 등록/조회
       │ field schema → board-factory config(columns/filters/drawer) 파생
       ▼
[Board Builder Admin Preview]  ← 후속: 관리자가 field 추가/배치하는 UI
       ▼
[Custom Board Runtime Preview]  ← 후속: 생성된 board 를 boardFactory.mount
```

- 현재 `STAM.boardFactory.mount(root, config)` 는 `columns` / `filters` / `drawer.sections` 를 **각각 따로** 받는다.
- Field Schema 는 이 셋의 **단일 출처(SSOT)** 가 된다: 하나의 field 정의에서 table 컬럼 · 필터 · 드로워 입력을 파생.
- 본 PR 은 그 SSOT 의 **타입/속성 기준만** 확정하고, 파생 로직(Registry)은 후속으로 분리한다.

## 3. Field Schema 타입 목록 (12종)

`stam/js/stam.board-field-schema.js` 의 `STAM.boardFieldSchema.types`. 각 타입은 board-factory 엔진의 컬럼 renderer / 드로워 control / 필터 동작에 매핑된다(엔진 변경 없이 연결만).

| # | type | 설명 | engine 컬럼 | 드로워 control | 기본 필터 | 기본 table | 기본 filter | align |
| - | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `text` | 짧은 텍스트 | `text`(`idName`) | input | — | ✓ | — | left |
| 2 | `textarea` | 긴 설명 | (목록 비표시) | textarea | — | ✗ | — | left |
| 3 | `select` | 단일 선택 | `chip` | select | checkbox | ✓ | ✓ | left |
| 4 | `multiSelect` | 복수 선택 | `relationChip` | select(다중) | checkbox | ✓ | ✓ | left |
| 5 | `date` | 날짜 | `date` | input[date] | range\* | ✓ | — | left |
| 6 | `user` | 담당자/검토자 | `user` | select(users) | checkbox | ✓ | ✓ | left |
| 7 | `relation` | 산출물 연결 | `relationChip` | select(다중, ref) | checkbox | ✓ | ✓ | left |
| 8 | `status` | 상태 chip | `statusChip` | select | checkbox | ✓ | ✓ | left |
| 9 | `priority` | 우선순위 chip | `priorityChip` | select | checkbox | ✓ | ✓ | left |
| 10 | `boolean` | 예/아니오 | `chip` | select | checkbox | ✓ | ✓ | center |
| 11 | `number` | 숫자 | `text` | input[number] | range\* | ✓ | — | right |
| 12 | `url` | 링크 | `link` | input[url] | — | ✓ | — | left |

> `range`\* (date / number 범위 필터)는 후속. 현재 엔진 필터는 checkbox 그룹만 지원하므로 date/number 는 기본 `visibleInFilter:false`.

### 3-1. 필드 속성 (18종) — `STAM.boardFieldSchema.defaults`

| 속성 | 의미 | 기본값 |
| --- | --- | --- |
| `key` | 데이터 키 (row field) | `null` |
| `label` | 표시 라벨 | `''` |
| `type` | field type (위 12종) | `'text'` |
| `required` | 필수 입력 | `false` |
| `defaultValue` | 기본값 | `null` |
| `placeholder` | 입력 placeholder | `''` |
| `options` | 선택지(select/multiSelect) | `null` |
| `visibleInTable` | 목록 컬럼 노출 | type 기본값 |
| `visibleInDrawer` | 드로워 입력 노출 | `true` |
| `visibleInFilter` | 필터 노출 | type 기본값 |
| `editable` | 수정 가능 | `true` |
| `sortable` | 정렬 가능 | type 기본값 |
| `exportable` | export 포함 | `true` |
| `width` | 컬럼 폭 | `null` |
| `align` | 정렬 | type 기본값 |
| `tone` | chip tone mapping | `null` |
| `validation` | 검증 규칙 | `null` |
| `permission` | 노출/편집 권한 | `null` |

### 3-2. tone 토큰 — `STAM.boardFieldSchema.toneTokens`

엔진 canonical tone(`stam.board-factory.css .bf-chip--*` 정합): `neutral · brand · info · warn · pass · fail · high · mid · low`.
task 예시 표기는 **별칭**으로 받아 정규화한다(`resolveTone`):

| 별칭 | → canonical |
| --- | --- |
| `warning` | `warn` |
| `success` | `pass` |
| `danger` / `error` | `fail` |
| `primary` | `brand` |
| `muted` | `neutral` |

## 4. 각 타입별 사용 예시

```js
// status — 상태 chip (tone alias 는 defineField 가 canonical 로 정규화)
STAM.boardFieldSchema.defineField({
  key: 'status', label: '상태', type: 'status', required: true,
  options: ['작성중', '검토요청', '검토완료', '승인완료', '보류'],
  width: 120,
  tone: { '작성중':'neutral', '검토요청':'warning', '검토완료':'info', '승인완료':'success', '보류':'danger' }
});
// → tone: { 작성중:'neutral', 검토요청:'warn', 검토완료:'info', 승인완료:'pass', 보류:'fail' }
//   visibleInTable:true, visibleInFilter:true, sortable:true, align:'left'

STAM.boardFieldSchema.defineField({ key:'name', label:'제목', type:'text', required:true });        // 목록 ✓ / 필터 ✗
STAM.boardFieldSchema.defineField({ key:'desc', label:'상세 설명', type:'textarea' });               // 목록 ✗ / 드로워 ✓
STAM.boardFieldSchema.defineField({ key:'priority', label:'우선순위', type:'priority',
  options:['높음','보통','낮음'], tone:{'높음':'high','보통':'mid','낮음':'low'} });
STAM.boardFieldSchema.defineField({ key:'ownerId', label:'담당자', type:'user' });                   // ref: users
STAM.boardFieldSchema.defineField({ key:'designIds', label:'연결 화면설계서', type:'relation' });    // multi, ref
STAM.boardFieldSchema.defineField({ key:'updatedAt', label:'최종 수정일', type:'date' });
STAM.boardFieldSchema.defineField({ key:'sortOrder', label:'정렬순서', type:'number' });             // align:right
STAM.boardFieldSchema.defineField({ key:'isPublic', label:'공개 여부', type:'boolean' });
STAM.boardFieldSchema.defineField({ key:'docUrl', label:'문서 URL', type:'url' });
```

## 5. 요구사항 v2 필드 mapping (`requirementsV2`)

| key | label | schema type | table | filter | drawer | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | 요구사항 ID | `text` | ✓ (idName) | — | ✓ readonly | |
| `name` | 요구사항명 | `text` | ✓ (idName) | — | ✓ | |
| `type` | 유형 | `select` | ✓ chip | ✓ | ✓ | vocab 7종 |
| `priority` | 우선순위 | `priority` | ✓ | ✓ | ✓ | high/mid/low |
| `status` | 상태 | `status` | ✓ | ✓ | ✓ | 5종 |
| `ownerId` | 담당자 | `user` | ✓ | ✓ | ✓ | ref users |
| `source` | 출처 | `text` | — | — | ✓ | |
| `requester` | 요청 부서 | `text` | — | — | ✓ | |
| `desc` | 설명 | `textarea` | — | — | ✓ required | |
| `acceptance` | 수용 기준 | `textarea` | — | — | ✓ | |
| `note` | 비고 | `textarea` | — | — | ✓ | |
| `designIds` | 연결 화면설계서 | `relation` | ✓ | — | ✓ | ref designs |
| `wbsIds` | 연결 WBS | `relation` | ✓ | — | ✓ | ref wbs |
| `functionIds` | 연결 기능정의서 | `relation` | — | — | ✓ | ref functions |
| `screenIds` | 연결 메뉴/화면목록 | `relation` | — | — | ✓ | ref screens |
| `updatedAt` | 최종 수정일 | `date` | ✓ | — | — | auto |

## 6. 메뉴구조/화면목록 v2 필드 mapping (`menuScreenListV2`)

| key | label | schema type | table | filter | drawer | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | 화면 ID | `text` | ✓ (idName) | — | ✓ readonly | |
| `name` | 화면명 | `text` | ✓ (idName) | — | ✓ | |
| `lv1` | LV1 | `select` | ✓ **(text 렌더)** | ✓ | ✓ | table 은 text, drawer 는 select |
| `lv2` | LV2 | `text` | ✓ | — | ✓ | |
| `lv3` | LV3 | `text` | — | — | ✓ | |
| `screenType` | 화면유형 | `select` | ✓ chip | ✓ | ✓ | vocab 8종 |
| `fob` | FO/BO | `select` | ✓ chip | ✓ | ✓ | 2지선다(후속 `boolean` 후보) |
| `status` | 상태 | `status` | ✓ | ✓ | ✓ | 4종 |
| `ownerId` | 담당자 | `user` | ✓ | ✓ | ✓ | ref users |
| `reqIds` | 연결 요구사항 | `relation` | ✓ | — | ✓ | ref requirements |
| `designIds` | 연결 화면설계서 | `relation` | ✓ | — | ✓ | ref designs |
| `note` | 비고 | `textarea` | — | — | ✓ | |
| `updatedAt` | 최종 수정일 | `date` | ✓ | — | — | auto |

> **inventory 발견**: `lv1` 은 schema 상 `select`(LV1 vocab) 이지만 목록에서는 `text` 로 렌더된다 → field schema 의 `visibleInTable` + 별도 "table 렌더 override"가 필요한 케이스. Registry 단계에서 `tableRenderer` override 슬롯으로 처리 후보.

## 7. 기능정의서 v2 필드 mapping (`functionalSpecificationV2`)

| key | label | schema type | table | filter | drawer | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | 기능 ID | `text` | ✓ (idName) | — | ✓ readonly | |
| `name` | 기능명 | `text` | ✓ (idName) | — | ✓ | |
| `type` | 기능유형 | `select` | ✓ chip | ✓ | ✓ | vocab 8종 |
| `priority` | 우선순위 | `priority` | ✓ | ✓ | ✓ | high/mid/low |
| `status` | 상태 | `status` | ✓ | ✓ | ✓ | 5종 |
| `ownerId` | 담당자 | `user` | ✓ | ✓ | ✓ | ref users |
| `reqIds` | 연결 요구사항 | `relation` | ✓ | — | ✓ | ref requirements |
| `screenIds` | 연결 화면 | `relation` | ✓ | ✓ | ✓ | ref screens (filter key `screen`) |
| `desc` | 기능 설명 | `textarea` | — | — | ✓ | |
| `input` | 입력 조건 | `textarea` | — | — | ✓ | |
| `rule` | 처리 규칙 | `textarea` | — | — | ✓ | |
| `exception` | 예외/오류 처리 | `textarea` | — | — | ✓ | |
| `api` | 관련 API/연동 | `text` | — | — | ✓ | 문구(텍스트), URL 아님 |
| `note` | 비고 | `textarea` | — | — | ✓ | |
| `updatedAt` | 최종 수정일 | `date` | ✓ | — | — | auto |

### 7-1. 타입 사용 현황 (3개 화면 합산)

- **사용 중 (8종)**: `text · textarea · select · date · user · relation · status · priority`
- **정의했으나 미사용 (4종)**: `multiSelect · boolean · number · url` — 후속 보드(태그/개수/정렬순서/외부 URL 등)용 예약.
- 검증: 3개 config 의 모든 목록 컬럼 / 드로워 입력이 schema type 으로 **100% 매핑됨**(uncovered 0) — `STAM.boardFieldSchema` 로 정적 확인.

## 8. table / filter / drawer / export / permission 연결 기준

| 화면 영역 | field schema 속성 | 엔진 연결 |
| --- | --- | --- |
| **table** (목록 컬럼) | `visibleInTable` / `width` / `align` / `sortable` / `tone` + type→`column` | board-factory `columns[]` (RENDERERS) |
| **filter** (필터 popup) | `visibleInFilter` / `options` + type→`filter` | board-factory `filters[]` (`STAM.boardFilter`) |
| **drawer** (등록/수정 입력) | `visibleInDrawer` / `required` / `placeholder` / `defaultValue` / `editable` / `validation` + type→`control` | board-factory `drawer.sections[].fields[]` (`fieldHtml`) |
| **export** | `exportable` | (후속) export 시 포함 컬럼 결정 |
| **permission** | `permission` | (후속) role 별 노출/편집 gate |

- type → 엔진 매핑은 `STAM.boardFieldSchema.engineMapping(type)` 로 조회(엔진 코드 변경 없음).
- `status` / `priority` 는 전용 chip 렌더(`statusChip` / `priorityChip`) + tone mapping. `select` 는 일반 `chip`.
- `relation` / `user` 는 참조(refType) 기반 — id 저장, 라벨은 `referenceSource.resolve` 로 표시(요구사항 v2 / 메뉴 v2 / 기능정의서 v2 동일).

## 9. 공통화하면 안 되는 항목 (field schema 로 표준화 금지 / config 유지)

- **각 화면의 vocab 값(코드→라벨/tone)** — status/priority/type 의 코드 집합·라벨이 화면마다 다름. schema 는 *타입*만 표준화하고 *값*은 config(`vocab`)에 유지.
- **options / refType 실데이터** — 담당자·산출물 목록은 화면 도메인. `dataSource` / `referenceSource` 에 유지.
- **summary / dataSource 집계식** — field schema 범위 밖(Page Contract 의 Summary Strip). 끌어올리지 않는다.
- **lv1 처럼 type ↔ table 렌더가 다른 케이스** — schema 강제 통일 금지. Registry 의 렌더 override 슬롯으로 흡수.
- **기존 엔진 렌더 경로 / 기존 v1 화면** — 본 schema 로 인해 변경 금지. schema 는 정의/검증 전용.

## 10. 변경 파일

| 파일 | 상태 | 내용 |
| --- | --- | --- |
| `stam/js/stam.board-field-schema.js` | 신규 | Field Schema v1 정의 모듈 (12 type + 18 속성 + tone + `defineField`/`engineMapping`/`isKnownType`). 정의/검증 전용, 어떤 화면에도 로드되지 않음 → 화면 동작 무변경. |
| `stam/js/stam.board-configs.js` | 수정 | 상단에 Field Schema 참조 + 3개 config field→type 매핑 요약 **주석만** 추가 (값/구조 변경 0). |
| `stam/docs/reports/commonization/Board-Field-Schema-v1.md` | 신규 | 본 문서. |

## 11. 검증

- `node --check stam/js/stam.board-configs.js` → PASS
- `node --check stam/js/stam.board-field-schema.js` → PASS
- `STAM.boardFieldSchema.typeKeys.length === 12`
- 3개 v2 config 의 모든 컬럼/드로워 필드가 schema type 으로 매핑(uncovered 0) — 정적 확인.
- `boards-v2/index.html` route 유지(미변경) / 3개 v2 화면 표시·checkbox·filter·drawer 유지(엔진·config 값 무변경).
- 기존 v1 영향 0 / nav-data 변경 0 / API·Firestore·localStorage 변경 0.

## 12. 비영향 / 미변경

- `stam.board-factory.js` / `stam.board-factory.css` 변경 0 (대규모 변경 금지 준수).
- `stam/pages/boards/**` / v1 전용 JS·CSS / `nav-data` / `nav-render` / `shell` / `topbar-render` / `boards-v2/index.html` / `icons.css` / `assets/icons/**` diff 0.
- `stam.board-field-schema.js` 는 v2 페이지에 로드하지 않는다(화면 동작 유지). 후속 Registry/Builder 단계에서 소비.
- API / Firestore / localStorage / firebase / workflows / package / config / build 미변경.

## 13. 후속 작업

1. **Board Config Registry v1** — `board = { id, title, fields:[defineField(...)] }` 등록/조회 + field schema → board-factory `columns`/`filters`/`drawer` 파생 로직.
2. **Board Builder Admin Preview** — 관리자가 field 추가·배치하는 미리보기 UI (실제 생성 UI 첫 단계).
3. **Custom Board Runtime Preview** — Registry 로 만든 board 를 `boardFactory.mount` 로 렌더하는 런타임 preview.
4. (부수) `range` 필터(date/number) · `tableRenderer` override 슬롯(lv1 케이스) · export/permission 실연결.
