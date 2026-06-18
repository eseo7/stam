# Requirements ↔ Board Factory — Vocab Gate v1

> 요구사항정의서 v2 preview(예정 PR #140) 작성 전, Board Factory 에서 사용할 **상태 / 우선순위 / 유형 / 연결 산출물 vocab** 을 공통 기준으로 잠그는 문서.
> 본 PR(#139)은 **vocab 결정만** 다룬다. v2 route / config 구현은 PR #140 에서 별도 진행한다.

---

## 1. 목적

- 기존 요구사항 화면(`stam/pages/boards/requirements.html`) 에서 보이는 vocab 이 **filter / summary / table chip / drawer select** 마다 미세하게 다르다. v2 진입 전에 한 곳에 정리한다.
- 정리한 vocab 은 Board Factory **공통 chip 토큰 + filter options + drawer select options + summary metrics + required validation** 에 1:1 로 매핑되어야 한다.
- 후속 보드(기능정의서 v2 / 메뉴구조 v2 와 동일한 운용)에서도 동일 vocab 패턴으로 재사용 가능해야 한다.

## 2. 기존 요구사항 화면에서 추출한 vocab (raw inventory)

### 2-1. 상태 (status)

| 출처 | 값 |
| --- | --- |
| summary strip dot | `작성중`, `검토중`, `승인완료`, `보류` (4종) |
| filter group(`stam.requirements.js` L145) | `작성중`, `검토요청`, `검토완료`, `승인완료`, `보류` (5종) |
| table chip | `작성중`, `검토요청`, `검토완료`, `승인완료`, `보류` (chip 클래스 `rq-chip-draft / review / done / approved / hold`) |
| drawer select(`L411-415`) | `작성중`, `검토요청`, `승인완료`, `보류` |

⚠️ **불일치**: summary 의 `검토중` 1칸이 table/filter 의 `검토요청` + `검토완료` 2종을 합산한 표현. drawer select 는 `검토완료`가 빠져 있음.

### 2-2. 우선순위 (priority)

| 출처 | 값 |
| --- | --- |
| summary meta(`L109`) | `높음 우선순위 8건` |
| filter group(`L147`) | `높음`, `중간`, `낮음` |
| table chip | `높음`, `보통`, `낮음` (chip 클래스 `rq-chip-high / mid / low`) |
| drawer select(`L403-405`) | `높음`, `보통`, `낮음` |

⚠️ **vocab 결함**: filter 만 `중간`, 나머지(table·drawer) 는 `보통`. 같은 의미를 다른 라벨로 노출. **본 PR 의 핵심 정규화 대상**.

### 2-3. 유형 (type)

| 출처 | 값 |
| --- | --- |
| filter group(`L146`) | `기능`, `화면`, `데이터`, `정책` (4종) |
| table chip | `기능`, `화면`, `데이터`, `정책`, `권한`, `연동`, `비기능` (7종) |

⚠️ **불일치**: filter 는 4종만 노출, table 은 7종 실제 사용. 사용자가 `권한 / 연동 / 비기능` 으로 필터링 불가.

### 2-4. 연결 산출물 (relations)

| 출처 | 값 |
| --- | --- |
| table 컬럼 | `연결 화면설계서`, `연결 WBS` (2종) |
| summary meta | `연결 화면`, `연결 WBS`, `미연결 요구사항` |
| drawer 섹션 | 연결 화면설계서 / 연결 WBS / 연결 기능정의서 / 연결 메뉴/화면목록 / 연결 테스트케이스 / 연결 결함 / 연결 회의록 (가변) |

table 1차 노출은 2종, drawer 는 다양하나 v2 preview 1차는 표시 라인을 줄여야 한다.

## 3. 권장 vocab (PR #140 v2 preview 적용 기준)

### 3-1. status — 권장

기존 화면 5종을 모두 살리되, summary 는 4칸 + `검토` 합산 1칸으로 유지.

| key | label | tone | meaning |
| --- | --- | --- | --- |
| `draft` | 작성중 | `neutral` | 초안 / 작성중 |
| `requested` | 검토요청 | `warn` | 검토자에게 송부됨 |
| `reviewed` | 검토완료 | `info` | 검토 완료, 승인 대기 |
| `approved` | 승인완료 | `pass` | 최종 승인 |
| `hold` | 보류 | `fail` | 보류 처리 |

- summary 의 `검토중` 합산 칸은 metric 으로 유지(`requested + reviewed`).
- drawer select 는 5종 전부 노출(기존 누락 보완).
- filter 도 5종 전부 노출.

### 3-2. priority — 권장 ★

**권장안: `높음 / 보통 / 낮음`** (라벨), key 는 `high / medium / low`.

| key | label | tone | 사유 |
| --- | --- | --- | --- |
| `high` | 높음 | `high` | 기존 table·drawer 라벨과 동일, 사용자 학습 비용 0 |
| `medium` | 보통 | `mid` | filter 의 `중간`은 본 PR 에서 `보통` 으로 통합 (정규화) |
| `low` | 낮음 | `low` | |

**선택 사유**:
- 기존 요구사항 table chip / drawer select 가 이미 `보통` 으로 굳어 있음.
- 기능정의서 v2(`STAM.boardConfigs.functionalSpecificationV2.vocab.priority`) 도 `높음 / 중간 / 낮음` 이지만 의미는 동일 3단. v2 진입 시 **요구사항·기능정의서 둘 다 `보통` 으로 통일**할지, **기능정의서는 `중간` 유지하고 요구사항만 `보통`** 으로 둘지 선택해야 한다.
- 본 PR 권장: **요구사항 v2 는 `높음 / 보통 / 낮음`** 으로 진입하고, 기능정의서 v2 의 `중간` ↔ `보통` 통합은 별도 small PR 로 분리(v2 routes 안정화 이후).
- key 는 `high / medium / low` (영어, P 코드 미사용). Board Factory 표준 `priorityChip` renderer 의 vocab 패턴(`high/mid/low` 톤 키) 과 정렬되도록 `medium` ↔ `mid` 톤 매핑은 `tone: 'mid'` 로 유지.

**P1/P2/P3 미선택 사유**: 제품 전반에서 P 코드 표기 미사용. 사용자 라벨 `높음 / 보통 / 낮음` 이 자연어. 도입 시 학습 비용 증가.

### 3-3. type — 권장

기존 table 의 7종 전부를 vocab 으로 잠그고, filter 도 7종 전부 노출.

| key | label | tone | filter | drawer |
| --- | --- | --- | --- | --- |
| `feature` | 기능 | `brand` | ✓ | ✓ |
| `screen` | 화면 | `brand` | ✓ | ✓ |
| `data` | 데이터 | `brand` | ✓ | ✓ |
| `policy` | 정책 | `brand` | ✓ | ✓ |
| `permission` | 권한 | `brand` | ✓ | ✓ |
| `integration` | 연동 | `brand` | ✓ | ✓ |
| `nonfunctional` | 비기능 | `brand` | ✓ | ✓ |

`보안 / 운영` 은 기존 화면에서 chip 사용 사례 없음 → **이번 PR 비대상**. 후속 확장 후보(§4).

### 3-4. relation — 권장

table 1차 노출 / drawer 1차 / drawer 후속으로 명확히 분리.

| 그룹 | 노출 | refType (Board Factory) |
| --- | --- | --- |
| 연결 화면설계서 | table + drawer | `designs` |
| 연결 WBS | table + drawer | `wbs` |
| 연결 기능정의서 | drawer | `functions` |
| 연결 메뉴/화면목록 | drawer | `screens` |
| 연결 테스트케이스 | **미구현 slot** | `testcases` (slot 보강 후) |
| 연결 결함 | **미구현 slot** | `defects` (slot 보강 후) |
| 연결 회의록 | **미구현 slot** | `meetings` (slot 보강 후) |

- table 1차는 **화면설계서 / WBS** 2 컬럼만(기존 기준본과 정합).
- drawer 1차는 화면설계서 / WBS / 기능정의서 / 메뉴목록 4 그룹.
- 테스트케이스 / 결함 / 회의록은 후속 slot 으로 분리(§4).

## 4. 보류 / 후속 vocab 후보

본 PR 비대상으로 후속 검토.

### 4-1. status 확장 후보

- `requested` 와 별도로 `reviewing` (검토중 - 진행중) 분리 여부.
- `rejected` (반려): drawer footer 액션 추가 시 필요. 본 v2 비대상.
- `changed` (변경요청): 변경 이력 탭 본구현 PR 에서 도입.
- `archived` (보관): 아카이브 기능 도입 시.

### 4-2. priority 통합 후보

- 기능정의서 v2 의 `중간` ↔ 요구사항 v2 의 `보통` 통합 → 별도 small PR 로 분리(범위: `stam.board-configs.js` `functionalSpecificationV2.vocab.priority.mid.label` 1줄 변경).

### 4-3. type 확장 후보

- `보안` / `운영` 추가: 기존 화면 사용 사례 없음. 사용자 요청이 들어오면 본 vocab 표에 row 만 추가.

### 4-4. relation 확장 slot

- 테스트케이스 / 결함 / 회의록 → Board Factory `relationCards` slot 본구현 PR 에서 도입.
- `referenceSource` 의 `testcases / defects / meetings` 타입 신규.

## 5. chip / filter / drawer validation 적용 기준

### 5-1. chip

- `STAM.boardConfigs.requirementsV2.vocab.{status,priority,type}` 으로 노출.
- Board Factory `statusChip / priorityChip / typeChip` renderer 가 동일 token 으로 color/tone 매핑.
- **요구사항 전용 chip CSS 신설 금지** — `stam.board-factory.css` 의 `.bf-chip--{tone}` 만 사용.

### 5-2. filter

- `STAM.boardConfigs.requirementsV2.filters[*].options = vocabOptions(<key>)`.
- filter 라벨은 vocab 라벨과 동일.
- 옵션 누락(예: 기존 type filter 4종)은 v2 에서 **반드시 vocab 전체로 확장**.

### 5-3. drawer select / required validation

- drawer select options 도 `vocabOptions(<key>)` 동일 출처.
- required 항목: `유형`, `요구사항명`, `우선순위`, `상태`(기본값 `draft`).
- 빈값 차단 / `{label}을/를 선택하세요` / `{label}을/를 입력하세요` 문구는 Board Factory engine 기본 동작.

## 6. Board Factory 공통화 영향

- 기존 요구사항 화면의 `rq-chip-*` / `rq-link-chip*` / `rq-ss-*` / `rq-btn-*` / `rq-cs-*` CSS alias 는 v2 에서 **사용 금지**. Board Factory 공통 클래스(`bf-chip / bf-rel-chip / bf-summary / stam-btn / bf-cs`) 만 사용.
- **vocab 변경은 모두 `stam.board-configs.js` 내 config 만 수정**. CSS / engine 변경 없음.
- 기능정의서 v2 의 `중간` ↔ 요구사항 v2 의 `보통` 정합은 §4-2 별도 PR.
- 본 vocab 표는 후속 보드(테스트케이스 / 결함 등)의 status / priority / type 시작점으로도 재사용 가능.

## 7. PR #140 요구사항 v2 preview Acceptance Criteria

다음 PR 에서 구현할 요구사항 v2 preview 가 Ready 전환되려면 아래 조건을 **전부** 충족해야 한다.

### 7-1. 구조

- [ ] 신규 route: `stam/pages/boards-v2/requirements.html`
- [ ] 기존 route(`stam/pages/boards/requirements.html`) diff = 0
- [ ] nav link 미교체
- [ ] 자체 화면 CSS / JS 없음 (Board Factory 공통 CSS/JS/DOM 만 사용)
- [ ] config 명: `STAM.boardConfigs.requirementsV2`
- [ ] dataSource `mode: 'static'`, in-memory only
- [ ] referenceSource: `users / designs / wbs / functions / screens`
- [ ] `fetch / XMLHttpRequest / firebase.firestore / localStorage / sessionStorage / indexedDB` 미사용

### 7-2. vocab

- [ ] status 5종 (§3-1)
- [ ] priority 3종 — **권장안 `높음 / 보통 / 낮음`** (§3-2)
- [ ] type 7종 (§3-3)
- [ ] relation: table 2종 / drawer 4종 (§3-4)
- [ ] filter / drawer select / chip 이 vocab 단일 출처 공유

### 7-3. 회귀 / 공통 레이어

- [ ] 기능정의서 v2(`boards-v2/functional-specification.html`) 회귀 없음
- [ ] 메뉴구조 v2(`boards-v2/menu-screen-list.html`) 회귀 없음
- [ ] Board Factory 공통 footer stroke 기준(`.bf-drawer .stam-drawer-foot .stam-btn-{ghost,outline,secondary}`) 유지
- [ ] drawer 상세 / 등록 / 수정 정상
- [ ] custom select 중복 없음
- [ ] drawer title clipping 없음, header meta chip-only hidden 유지
- [ ] row selected active bar / chip / pagination / toolbar height·icon 회귀 없음

### 7-4. 브라우저 QA

- [ ] light mode PASS
- [ ] dark mode PASS
- [ ] 1920px PASS
- [ ] 1366px PASS
- [ ] console error 0
- [ ] narrow / mobile — **DEFERRED** (Board Factory responsive layout baseline PR 범위)

### 7-5. 정적

- [ ] `node --check stam/js/stam.board-configs.js` PASS
- [ ] `node --check stam/js/stam.board-factory.js` PASS (엔진 미변경)
- [ ] CSS brace 균형 유지(엔진 CSS 미변경 가정)
- [ ] forbidden file diff 0

### 7-6. 공통 레이어 미지원 항목 발견 시

- **개별 화면 patch 금지**. `stam.board-factory.css` / `.js` 공통 레이어 후보로 기록(별도 후속 PR).
- 발견 항목은 PR #140 의 QA 문서에 §"Common layer candidates" 섹션으로 기록.