# Requirements ↔ Board Factory — Adoption Inventory v1

> 요구사항정의서 v2 preview(예정 PR #140) 진입 전, 기존 요구사항 화면을 실측해서 정리한 inventory.
> 본 문서는 vocab 외의 **DOM / CSS / JS / 컬럼 / 필터 / drawer / summary / pagination / 기능** 관점을 다룬다.
> 짝 문서: `Requirements-BoardFactory-Vocab-Gate-v1.md`.

---

## 1. 기존 route / 파일

| 항목 | 경로 | 비고 |
| --- | --- | --- |
| HTML | `stam/pages/boards/requirements.html` | 930 라인. 정적 mock + drawer. |
| JS | `stam/js/stam.requirements.js` | 156 라인. drawer open/close, custom select 초기화, boardFilter init. |
| CSS | `stam/css/stam.requirements.css` | 288 라인. `rq-*` alias / chip / link-chip / drawer 전용 스타일. |
| nav id | `stam.nav-data.js` 의 요구사항 항목 | 변경 없음 |

기존 화면은 자체 alias(`rq-*`) 가 깊게 박혀 있으므로 **v2 에서 재사용 금지**. v2 는 Board Factory 공통 클래스만 사용한다.

## 2. 기존 화면 inventory

### 2-1. table columns

| # | label | source | 비고 |
| --- | --- | --- | --- |
| 1 | checkbox | `rq-ch` | 선택 |
| 2 | 요구사항 ID / 요구사항명 | `rq-req-id` / `rq-req-name` | idName 1행 |
| 3 | 유형 | `rq-chip rq-chip-type` | 7종 (기능/화면/데이터/정책/권한/연동/비기능) |
| 4 | 우선순위 | `rq-chip rq-chip-{high,mid,low}` | 라벨 `높음 / 보통 / 낮음` |
| 5 | 상태 | `rq-chip rq-chip-{draft,review,done,approved,hold}` | 5종 |
| 6 | 담당자 | (avatar+name 추정) | userId resolve |
| 7 | 연결 화면설계서 | `rq-link-chip-scr` / `rq-link-chip-none` | screenId 또는 미연결 |
| 8 | 연결 WBS | `rq-link-chip` / `rq-link-chip-none` | wbsId 또는 미연결 |
| 9 | 최종 수정일 | `rq-date` | YYYY-MM-DD |

### 2-2. summary strip

- 4 dot: `작성중` / `검토중` / `승인완료` / `보류` (`#64748B / #B45309 / #047857 / #991B1B`)
- 2 추가 dot: `연결 화면(#3B82F6)` / `연결 WBS(#8B5CF6)`
- meta: `미연결 요구사항 N건`, `높음 우선순위 N건`

### 2-3. toolbar

- 검색창 (placeholder: `요구사항 ID · 요구사항명 · 담당자 검색`)
- filter trigger (`#rq-filter-open-btn`)
- 삭제 버튼 (`#rq-del-btn` / `stam-btn-danger`)
- 등록 버튼 (`#rq-reg-btn` / `stam-btn-primary`)
- 내보내기 (`stam-btn-outline`)

### 2-4. filter groups (`stam.requirements.js` L144-148)

| key | label | options |
| --- | --- | --- |
| `status` | 상태 | `작성중`, `검토요청`, `검토완료`, `승인완료`, `보류` |
| `type` | 유형 | `기능`, `화면`, `데이터`, `정책` ⚠️ (vocab 7종 중 4종만) |
| `priority` | 우선순위 | `높음`, `중간`, `낮음` ⚠️ (`중간` vs table·drawer `보통` 불일치) |
| `assignee` | 담당자 | `김철수`, `이영희`, `박지수` |

### 2-5. drawer 종류 / 구조

- `rq-dw-detail` — 상세 (탭: 기본 정보 / 연결 정보 / 변경 이력)
- `rq-dw-register` — 등록
- `rq-dw-edit` — 수정 (있다고 가정, 실측 확인 필요)
- header row: `rq-scr-badge` (NEW / REQ-001) + 닫기 X
- title: `rq-dw-htitle`
- header meta: chip-only(상태 / 유형 / 우선순위) — chip-only 시 숨겨지는 패턴

### 2-6. drawer field (등록)

기존 등록 drawer 의 필드 (HTML 추정 기반 / 후속 실측 보완 가능):
- 기본 정보: ID(자동) · 유형(select required) · 요구사항명(input required, full) · 우선순위(select required) · 상태(select default `작성중`) · 담당자(select)
- 상세 / 배경 / 수용조건 (textarea)
- 연결 정보: 연결 화면설계서 / 연결 WBS / 연결 기능정의서 / 연결 메뉴목록
- 승인 상태(`미승인 / 승인완료 / 반려`) — 본 v2 비대상(별도 승인 워크플로)

### 2-7. pagination / footer

- 공통 `stam-board-footer / count / pagination / page-btn` 사용 추정. 기존 화면 footer 영역 확인 후 그대로 유지.

## 3. 기존 자체 CSS / JS — v2 재사용 금지 목록

다음 alias 및 모듈은 v2 에서 **사용 금지**.

### 3-1. CSS alias 금지

- `rq-page-hdr*` / `rq-page-hdr-desc` / `rq-btn*` / `rq-ss-*` / `rq-ss-meta-*` / `rq-tbl-*` / `rq-ch` / `rq-chip*` / `rq-chip-type` / `rq-chip-high/mid/low` / `rq-chip-draft/review/done/approved/hold` / `rq-link-chip*` / `rq-fob*` / `rq-cs-*` / `rq-dw-*` / `rq-drawer*` / `rq-tab*` / `rq-fs*` / `rq-fgrid*` / `rq-flbl*` / `rq-inp*` / `rq-fob*`
- 위 alias 는 기존 화면 전용. v2 는 Board Factory 공통 클래스 만 사용한다.

### 3-2. JS 모듈 금지

- 기존 `stam.requirements.js` (전용 drawer / custom-select / row controller) — 재사용 금지.
- v2 는 `stam.board-factory.js` 의 mount + `stam.board-configs.js` 의 config 만 사용.
- `STAMBoardList`(`stam.board-list.js`) 의 별도 wiring 금지 — Board Factory 가 내부에서 처리.

### 3-3. DOM 변형 금지

- `rq-dw-htitle / rq-dw-hmeta / rq-dw-hrow1` 등 drawer header 자체 DOM 패턴 v2 에서 재현 금지. Board Factory 가 emit 하는 `bf-dw-head / bf-dw-title / bf-dw-meta / bf-dw-close` 만 사용.

## 4. Board Factory 로 표현 가능한 항목

이미 fn-spec v2 / menu-screen-list v2 에서 검증된 표준 슬롯으로 커버:

- `idName` (요구사항 ID / 요구사항명)
- `statusChip` / `priorityChip` / `typeChip`
- `relationChip` (화면설계서 / WBS table 노출)
- `user` (담당자)
- `date` (최종 수정일)
- `checkbox` / `actionButtons` (상세)
- filter 5종 (status / type / priority / owner + relation 필요 시)
- summary 7칸까지 가능 (전체 / 작성중 / 검토중(=requested+reviewed) / 승인완료 / 보류 / 연결 화면 / 연결 WBS)
- drawer `infoGrid` + `relationCards` + `textBlock`
- required validation (`유형 / 요구사항명 / 우선순위`)
- in-memory create / update / remove

## 5. 공통 레이어 후보로 올릴 항목

v2 진입 중 발견되더라도 **요구사항 전용 patch 금지**. 발견 시 `stam.board-factory.css` / `.js` 후보로 기록.

후보 (예상 / PR #140 진행 중 추가될 수 있음):

- **승인 상태 워크플로 chip / 액션** — 본 v2 비대상. 별도 후속 PR.
- **변경 이력 탭(`historyList` slot)** — 미구현 slot. 도입 시 Board Factory `SECTIONS.historyList` 로 공통화.
- **textarea minHeight 정책** — 요구사항/배경/수용조건 등 긴 textarea 필드의 default minHeight 가 화면별로 달라지면 Board Factory `bf-dw-body textarea` 토큰화 후보.
- **summary 합산 metric** — `검토중 = requested + reviewed` 같은 합산은 dataSource.summary 에서 계산하되, vocab 합산 메타데이터로 표현 가능한지 후속 검토.
- **relation slot 확장** — `testcases / defects / meetings` referenceSource 타입 신규 도입 시 engine `RENDERERS.relationChip` 의 token 확장 가능성.

## 6. v2 에서 제외할 항목 (이번 v2 preview 미구현)

- 승인 상태 별도 워크플로 (`미승인 / 승인완료 / 반려`) — drawer footer 액션 / 변경 이력 / 알림 연동 필요.
- 변경 이력 탭 — `historyList` slot 미구현.
- 임시저장 / 전체 보기 - drawer footer 보조 액션 (Board Factory 표준 footer 동등 처리).
- 트리 LV1/LV2/LV3 토글 (메뉴구조 v2 와 동일 미구현).
- 테스트케이스 / 결함 / 회의록 연결 (slot 확장 PR 분리).
- 다중 상태 일괄 변경 / 일괄 승인 / bulk action.

## 7. 구현 전 리스크

| # | 리스크 | 대응 |
| --- | --- | --- |
| R1 | priority `중간` ↔ `보통` 불일치로 기능정의서 v2(`중간`) 와 요구사항 v2(`보통`) 가 다르게 노출 | 본 PR vocab gate §3-2 권장: 요구사항은 `보통` 진입. 기능정의서 `중간` ↔ `보통` 통합은 별도 small PR. |
| R2 | type 7종 중 4종만 filter 노출되어 사용자가 권한/연동/비기능 필터링 불가 | v2 에서 filter 7종 전부 노출. vocab gate §3-3 적용. |
| R3 | drawer select status 옵션 누락(`검토완료` 빠짐) | v2 에서 5종 전부 select 옵션 노출. |
| R4 | 기존 자체 alias 가 v2 에 섞이면 회귀 발생 | v2 HTML 은 Board Factory 표준 3 파일만 로드. `rq-*` 클래스 / 모듈 0 참조. |
| R5 | 변경 이력 탭 누락이 사용자 인식 불일치를 유발 | preview 안내 배너 + Known limitations 에 명시. 본 PR 의 §6 와 §10(QA 문서) 에 기록. |
| R6 | 공통 footer stroke 회귀 | 공통 selector `.bf-drawer .stam-drawer-foot .stam-btn-*` 가 이미 적용. v2 에서 추가 패치 불필요. |

## 8. PR #140 작업 범위 초안

본 PR(#139) 이 vocab + adoption 기준을 잠그면, **PR #140** 은 아래 범위로 진행.

### 8-1. 신규 / 수정 파일 (예상)

| 파일 | 상태 | 내용 |
| --- | --- | --- |
| `stam/pages/boards-v2/requirements.html` | 신규 | v2 preview route. 메뉴구조 v2 구조 그대로, mount config 만 `requirementsV2` 로 교체. |
| `stam/js/stam.board-configs.js` | 수정(append) | `STAM.boardConfigs.requirementsV2` 추가. 기존 `functionalSpecificationV2 / menuScreenListV2` 변경 없음. |
| `stam/docs/reports/visual-qa/board-factory-requirements-v2/index.md` | 신규 | QA 문서. |

CSS(`stam.board-factory.css`) / Engine(`stam.board-factory.js`) 은 **미변경 가정**. 만약 변경 필요 항목이 발견되면 본 문서 §5 의 공통 레이어 후보로 분리.

### 8-2. config 골격 (참고)

```
{
  boardId: 'requirements-v2',
  title: '요구사항정의서 v2',
  idKey: 'id', nameKey: 'name',
  pageSize: 20,
  defaultSort: { key: 'updatedAt', direction: 'desc' },
  vocab: { status, priority, type },     // §3
  summary: { cells: [전체, 작성중, 검토중, 승인완료, 보류, 연결화면, 연결WBS] },
  columns: [checkbox, idName, typeChip, priorityChip, statusChip, user, relationChip(designs), relationChip(wbs), date, actionButtons],
  filters: [status, type, priority, owner],
  drawer: { sections: [기본정보, 상세/배경/수용조건, 연결정보(designs/wbs/functions/screens), 비고] },
  detail: { tabs: [기본정보(infoGrid+relationCards), 본문(textBlock)] },
  dataSource: static seed (8~12 rows),
  referenceSource: { users, designs, wbs, functions, screens }
}
```

### 8-3. Ready 조건

`Requirements-BoardFactory-Vocab-Gate-v1.md` §7 인용. 사용자 브라우저 QA narrow/mobile 제외 전 항목 PASS 시 Ready 전환.

### 8-4. 비대상 (PR #140 범위 밖)

- 승인 워크플로 / 변경 이력 탭 / bulk action / 테스트케이스·결함·회의록 연결
- 기능정의서 v2 `중간` ↔ `보통` priority 라벨 통합 (별도 small PR)
- narrow / mobile 최적화 (별도 Board Factory responsive layout baseline PR)

## 9. 다음 단계 체크리스트

- [ ] 본 PR(#139) Draft 생성 / merge
- [ ] PR #140 브랜치 `feat/board-factory-requirements-v2-preview` 생성
- [ ] §8-2 config 구현 + static seed 8~12행
- [ ] v2 route 추가
- [ ] node --check / CSS brace / forbidden diff 0 검증
- [ ] 사용자 브라우저 QA (§7-4) PASS 후 Ready
- [ ] squash merge + staging deploy