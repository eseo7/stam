# STAM Common Picker Inventory

> 본 문서는 Common Picker 구현 전 전수 조사 결과를 기록한다.  
> 제품 코드를 변경하지 않는다.  
> 기준 문서: `../acceptance/PR-410-picker-acceptance.md`  
> 참고: `../STAM-AI-Verification-Protocol-v1.md`

---

## 1. 조사 정보

- Inventory PR: #411
- Acceptance 기준 PR: #410
- Repo: eseo7/stam
- Branch: docs/common-picker-inventory
- Base: main (b4164f5d758717cccc753e5bc2f0920b23c1483b)
- 조사일: 2026-08-07
- 조사자: Claude Code

---

## 2. 조사 목적

현재 STAM의 Picker / Select 계열 UI 구조를 전수 조사하여 다음을 확정한다.

1. 현재 공통 Picker 구현 존재 여부 및 SSOT 상태
2. 실제 사용 화면별 현황
3. Native `<select>` 사용 현황
4. Custom Picker 사용 현황
5. 공통 CSS / JS 위치
6. 화면별 중복 CSS 및 중복 JS
7. WBS Picker 관련 중복 CSS 상세
8. 모바일 / 다크모드 처리 방식
9. 향후 구현 PR에서 수정할 정확한 파일 범위

---

## 3. 조사 범위

### 탐색 디렉터리

```text
stam/css/*.css
stam/js/*.js
stam/pages/boards/*.html
stam/pages/boards-v2/*.html
```

### 검색 패턴

```text
<select, option, picker, Picker, dropdown, select-, stam-cs,
msl-cs, rq-cs, fn-cs, bf-cs, wbs-sel, referencePicker,
customSelect, aria-expanded, role="listbox", role="option",
data-stam-reference-picker, data-stam-requirement-picker,
data-stam-functional-spec-picker, data-stam-wbs-picker,
data-stam-wbs-member-picker, data-wbs-sel
```

---

## 4. 검색 방법

- `grep -rn` 으로 패턴 전수 검색
- HTML / CSS / JS 각각 독립 검색
- 검색 결과에서 실제 UI 선택 컴포넌트 여부 판별
- CSS 클래스명 기준으로 파일 단위 분류
- JS config 객체 기준으로 중복 여부 판별

---

## 5. Picker 전체 목록

### 5.1 공통 모듈 (SSOT)

| 모듈 | JS 파일 | CSS 파일 | 유형 | 비고 |
|------|---------|---------|------|------|
| `STAM.customSelect` | `stam.custom-select.js` | `stam.custom-select.css` | B. STAM 공통 Custom Picker | Native `<select>` 래퍼 |
| `STAM.referencePicker` | `stam.reference-picker.js` | `stam.custom-select.css` (공유) | B. STAM 공통 Custom Picker | 아티팩트 참조 선택기, 비동기 로딩 |

### 5.2 아티팩트별 Wrapper (referencePicker 기반)

| 모듈 | JS 파일 | 사용 화면 | 비고 |
|------|---------|-----------|------|
| `STAM.wbsPicker` | `stam.wbs-picker.js` | wbs.html, screen-specification.html | WBS 항목 선택 |
| `STAM.requirementPicker` | `stam.requirement-picker.js` | wbs.html, functional-specification.html, screen-specification.html | 요구사항 선택 |
| `STAM.functionalSpecPicker` | `stam.functional-spec-picker.js` | wbs.html, screen-specification.html | 기능정의 선택 |
| `STAM.projectMemberPicker` | `stam.project-member-picker.js` | wbs.html | 담당자/검토자 선택 |

### 5.3 화면 내 inline 구현

| 구현 | JS 파일 | 화면 | 유형 | 비고 |
|------|---------|------|------|------|
| `wbs-selectbox` (data-wbs-sel) | `stam.wbs.js` (내장) | wbs.html | C. 화면 전용 Custom Picker | 단계(phase) 선택 전용, stam-cs-* 시각 클래스 부분 사용 |

---

## 6. 공통 Picker SSOT

### 6.1 STAM.customSelect

```text
공통 API:    STAM.customSelect.init(rootEl, cfg), STAM.customSelect.closeAll(rootEl, cfg)
공통 JS:     stam/js/stam.custom-select.js
공통 CSS:    stam/css/stam.custom-select.css (.stam-cs-* 클래스)
공통 DOM:    <div class="stam-cs" data-stam-cs> ... </div> (JS가 native <select>를 래핑하여 생성)
공통 상태:   .is-open / .is-up / .is-disabled / .is-sel / .is-active / .is-placeholder
공통 키보드: ArrowUp/Down, Home, End, Enter, Space, Tab
```

> **⚠ Escape 미지원**: `STAM.customSelect`에는 현재 Escape key close 처리가 없다.  
> PR #410 Acceptance Criteria의 **AC-FN-004**를 충족하려면 후속 구현 PR에서 Escape close 지원 여부를 보강해야 한다.  
> (이번 Inventory PR에서는 제품 코드를 수정하지 않는다.)

**동작 방식**: 화면에 미리 선언된 native `<select>` 요소를 `STAM.customSelect.init(root, cfg)` 호출 시 감지하여, cfg에 명시된 클래스명으로 커스텀 dropdown DOM을 자동 생성한다. native `<select>`는 `.stam-cs-native` 처리하여 숨긴다.

**cfg 구조** (화면별로 전달):

```javascript
{
  selectSelector: 'select.rq-inp',   // 래핑 대상 native <select>
  nativeMarkerAttr: 'data-rq-cs',   // 중복 초기화 방지 마커
  uidPrefix: 'rqcs',                 // 접근성 ID prefix
  wrapClass: 'rq-cs',               // root div 클래스
  triggerClass: 'rq-cs-trigger',    // 트리거 버튼 클래스
  valClass: 'rq-cs-val',            // 선택 값 표시 span
  caretClass: 'rq-cs-caret',        // caret 아이콘 span
  panelClass: 'rq-cs-panel',        // 옵션 패널 div
  optClass: 'rq-cs-opt',            // 옵션 item div
  checkClass: 'rq-cs-check',        // 선택 표시 check span
  otextClass: 'rq-cs-otext',        // 옵션 텍스트 span
  nativeClass: 'rq-cs-native',      // native <select>에 추가
  flipContainer: '.rq-dw-body',     // 위/아래 flip 기준 컨테이너
  openClass: 'open',                // 열림 상태 클래스
  upClass: 'cs-up',                 // 위 방향 열림 클래스
  openSelector: '.rq-cs.open'       // closeAll용 선택자
}
```

> **중요**: cfg의 `wrapClass`/`triggerClass` 등이 화면별로 다른 namespace를 쓰면, 해당 클래스에 대한 CSS도 화면 CSS에 별도로 정의해야 한다. 이것이 현재 중복 CSS의 원인이다. `stam-cs-*` 공통 클래스를 cfg에 사용하면 화면 CSS가 불필요해진다.

### 6.2 STAM.referencePicker

```text
공통 API:    STAM.referencePicker.create(config) → { mount, getValue, setValue, clear, setDisabled, refreshContext, close, destroy }
공통 JS:     stam/js/stam.reference-picker.js
공통 CSS:    stam/css/stam.custom-select.css (.stam-cs-* 클래스 — customSelect와 CSS 공유)
공통 DOM:    <div class="stam-cs" data-stam-reference-picker-root> ... </div> (buildMarkup으로 자동 생성)
공통 상태:   .is-open / .is-disabled / .is-sel / .is-active / .is-placeholder
공통 키보드: ArrowUp/Down, Home, End, Enter, Escape (menu 내 keydown)
```

**동작 방식**: 
- `STAM.referencePicker.create(config)` — configurable picker 인스턴스 생성. 아티팩트 별로 1회 호출.
- `pickerInstance.mount(containerEl, options)` — 특정 container element에 마운트. DOM 생성 및 이벤트 바인딩.
- `loadItems` / `normalizeItem` / `formatLabel` 등 config 함수로 아티팩트 종속성 분리.
- 검색(filtering), open/close, keyboard navigation, selected state 모두 공통 모듈에서 처리.
- 아티팩트 고유 데이터(code, title, id)만 화면별 wrapper가 제공.

**현재 상태**: `STAM.referencePicker`는 완전한 SSOT다. 아티팩트별 wrapper(wbsPicker, requirementPicker 등)가 서비스 레이어만 연결하고, 모든 UI 로직은 공통 모듈에 있다.

---

## 7. 화면별 사용 현황

### 7.1 핵심 산출물 화면

#### 요구사항정의서 (boards/requirements.html)

| 항목 | 내용 |
|------|------|
| Picker 존재 | Y |
| Native / Custom | Native `<select class="stam-form-input rq-inp">` 8개 (드로어 2종 × 4개 필드) |
| 공통 Custom Picker | `STAM.customSelect` — `RQ_CS_CFG` (wrapClass: `rq-cs`) |
| 공통 CSS 사용 | **미사용** — `stam.requirements.css`에 `rq-cs-*` 전용 스타일 별도 존재 |
| 공통 API 사용 | `STAM.customSelect.init` / `closeAll` 사용 (공통 JS 사용, 공통 CSS 미사용) |
| 화면 전용 CSS | `stam.requirements.css` 내 `rq-cs-*` — 공통 `stam-cs-*`와 동일한 시각 규칙 |
| 화면 전용 JS | `stam.requirements.js` 내 `RQ_CS_CFG` 객체 (화면 namespace 설정) |
| 중복 CSS | **있음** — `rq-cs-*` 전체가 `stam-cs-*` 중복 (약 55줄) |
| 중복 JS | syncCustomSelect 함수 (rq-cs-val 업데이트) — stam.requirements-firestore-crud.js |
| 비고 | referencePicker 미사용. 전용 선택 필드 없음 |

#### 기능정의서 (boards/functional-specification.html)

| 항목 | 내용 |
|------|------|
| Picker 존재 | Y |
| Native / Custom | Native `<select class="stam-select fn-sel">` 8개 + `data-stam-requirement-picker` |
| 공통 Custom Picker | `STAM.customSelect` — `FN_CS_CFG` (wrapClass: `fn-cs stam-cs`, dual class) |
| 공통 CSS 사용 | **사용** — `FN_CS_CFG`가 `stam-cs-*` 클래스를 포함하는 dual class 지정 |
| 공통 API 사용 | customSelect + requirementPicker 사용 |
| 화면 전용 CSS | `stam.functional-specification.css` — `.fn-cs-native { display:none }` 만 남음 (PR #98 마이그레이션 완료) |
| 화면 전용 JS | `stam.functional-specification.js` 내 `FN_CS_CFG` 객체 |
| 중복 CSS | **없음** (PR #98에서 제거됨) |
| 중복 JS | syncCustomSelect 함수 (fn-cs-val 업데이트) — stam.functional-spec-firestore-crud.js |
| 비고 | FN_CS_CFG: wrapClass에 `fn-cs stam-cs` dual class → stam-cs-* CSS 적용됨 |

#### 화면설계서 (boards/screen-specification.html)

| 항목 | 내용 |
|------|------|
| Picker 존재 | Y |
| Native / Custom | Native `<select>` 2개 (filter 전용) + data-stam-requirement/functional-spec/wbs-picker |
| 공통 Custom Picker | customSelect + requirementPicker + functionalSpecPicker + wbsPicker |
| 공통 CSS 사용 | **사용** — stam.custom-select.css 로드 |
| 화면 전용 CSS | `stam.screen-specification.css` — `.ss-cs-native {}` 만 남음 (PR #99 마이그레이션 완료) |
| 화면 전용 JS | stam.screen-specification-crud.js (picker mount/getValue/setValue 호출) |
| 중복 CSS | **없음** |
| 비고 | 3종 referencePicker 모두 사용. native select 2개는 filter 전용으로 customSelect 대상 아님 |

#### WBS (boards/wbs.html)

| 항목 | 내용 |
|------|------|
| Picker 존재 | Y |
| Native / Custom | data-wbs-sel (WBS 고유 custom picker) + data-stam-requirement/functional-spec/wbs-member-picker |
| 공통 Custom Picker | requirementPicker + functionalSpecPicker + projectMemberPicker |
| 공통 CSS 사용 | **사용** — stam.custom-select.css 로드 |
| 화면 전용 CSS | `stam.wbs.css` — `.wbs-drawer-form-select` (native select 스타일), `.wbs-filter-select` (native select), reference picker mount slot (`width:100%`), `.wbs-selectbox`/`.wbs-sel-menu` (구조 보정) |
| 화면 전용 JS | `stam.wbs.js` 내 `data-wbs-sel` 초기화 로직 (약 70줄) |
| 중복 CSS | 없음 (PR #100 제거됨). `.wbs-drawer-form-select` / `.wbs-filter-select`는 native select 전용, 공통 custom picker와 역할 다름 |
| 중복 JS | data-wbs-sel 초기화 로직 (wbs-selectbox) — STAM.customSelect 대신 화면 내 직접 구현 |
| 비고 | wbs-selectbox는 stam-cs-* 시각 클래스를 사용하나 JS는 독립 구현. projectMemberPicker는 WBS만 사용 |

#### 메뉴화면목록 (boards/menu-screen-list.html)

| 항목 | 내용 |
|------|------|
| Picker 존재 | Y |
| Native / Custom | Native `<select class="msl-inp stam-select">` 8개 (구형 드로어) + `<select class="stam-form-input">` 5개 (신형 v2 드로어) |
| 공통 Custom Picker | `STAM.customSelect` — `MSL_CS_CFG` (wrapClass: `msl-cs`) |
| 공통 CSS 사용 | **미사용** — `stam.menu-screen-list.css`에 `msl-cs-*` 전용 스타일 존재 |
| 화면 전용 CSS | `stam.menu-screen-list.css` 내 `msl-cs-*` — 공통 `stam-cs-*`와 동일한 시각 규칙 |
| 화면 전용 JS | `stam.menu-screen-list.js` 내 `MSL_CS_CFG` + `stam.menu-screen-crud.js` 내 `CS_CFG`(stam-cs 기준) |
| 중복 CSS | **있음** — `msl-cs-*` 전체가 `stam-cs-*` 중복 (약 30줄, 미니파이) |
| 비고 | menu-screen-crud.js는 이미 stam-cs-* 기준 CS_CFG 사용. list.js만 msl-cs-* 사용 |

---

## 8. WBS 상세 분석

### 8.1 wbs-selectbox (data-wbs-sel)

**대상 필드**: 단계(phase) 선택 (`착수|분석|설계|구현|검수|오픈|완료`)  
**사용 위치**: wbs.html — 수정 드로어, 등록 드로어 각 1개  
**구현 방식**: `stam.wbs.js` 내 `data-wbs-sel` 파싱 → DOM 직접 생성  

**시각 클래스 현황**:

| 역할 | 현재 클래스 | 공통 CSS 연결 |
|------|------------|---------------|
| trigger button | `wbs-sel stam-cs-trigger` | O (`stam-cs-trigger`) |
| value span | `wbs-sel-sp stam-cs-value` | O |
| caret icon | `wbs-sel-ck stam-cs-icon` | O |
| option div | `wbs-sel-opt stam-cs-opt` | O |
| check span | `wbs-sel-check stam-cs-check` | O |
| menu div | `wbs-sel-menu stam-cs-menu` | O (z-index: 200 override) |
| container div | `wbs-selectbox` | 구조 보정 (position:relative) |

**분류**: WBS-고유 필드(단계)에 대한 화면 전용 구현. `STAM.customSelect`와 유사하지만 native `<select>`가 없고, `data-sel-opts` 속성으로 옵션을 직접 파싱한다.

**CSS 중복 여부**: wbs-sel-* 시각 스타일은 PR #100에서 제거됨. 현재 구조 보정(`wbs-selectbox`, `wbs-sel-menu { z-index:200 }`) 만 남아 있음. 공통 stam-cs-* CSS로 시각 처리.

**정리 필요 여부**: HOLD — wbs-selectbox 구현을 STAM.customSelect로 통합 가능하나, `data-sel-opts` 기반의 동적 옵션 패턴이 다름. 후속 구현 PR에서 별도 판단 필요.

### 8.2 WBS CSS 중복 분류

| Selector | 역할 | 판정 |
|----------|------|------|
| `.wbs-drawer-form-select` | WBS 드로어 내 native `<select>` 스타일 | **WBS 고유** — native select 전용. stam.custom-select.css와 역할 다름 |
| `.wbs-filter-select` | WBS 필터 바 native `<select>` 스타일 | **WBS 고유** — native select 전용 (단, 현재 HTML에서 미사용 확인됨) |
| `[data-stam-requirement-picker], ...` | reference picker mount slot (width:100%) | **WBS 고유 레이아웃** — layout만, 시각은 stam.custom-select.css |
| `.wbs-selectbox` | wbs-sel portal 컨테이너 position | **WBS 구조 보정** — position:relative 단 1줄 |
| `.wbs-sel-menu { z-index: 200 }` | wbs-sel portal z-index | **WBS 구조 보정** — WBS 테이블 레이어 위에 표시 |

결론: WBS CSS에 있는 picker 관련 스타일은 모두 WBS 화면 고유 레이아웃/구조 보정이며, stam.custom-select.css와 시각 중복이 없다.

---

## 9. CSS 중복 목록

| 파일 | 중복 Selector 패턴 | 공통 대응 | 중복 규모 | 판정 |
|------|-------------------|----------|-----------|------|
| `stam/css/stam.requirements.css` | `.rq-cs`, `.rq-cs-trigger`, `.rq-cs-panel`, `.rq-cs-opt`, `.rq-cs-check`, `.rq-cs-otext`, `.rq-cs-val`, `.rq-cs-caret`, `.rq-cs-native` + `[data-theme="dark"]` 변형 | 전부 `.stam-cs-*`에 대응 | 약 55줄 (별도 PR에서 확인 필요) | **제거 가능** |
| `stam/css/stam.menu-screen-list.css` | `.msl-cs`, `.msl-cs-trigger`, `.msl-cs-panel`, `.msl-cs-opt`, `.msl-cs-check`, `.msl-cs-otext`, `.msl-cs-val`, `.msl-cs-caret`, `.msl-cs-native` + `[data-theme="dark"]` 변형 | 전부 `.stam-cs-*`에 대응 | 약 30줄 (미니파이) | **제거 가능** |

**제거 조건**: 화면 JS config를 `stam-cs-*` 기준으로 변경해야 제거 가능하다. CSS 단독 제거 시 화면 파손.

---

## 10. JS 중복 목록

### 10.1 customSelect config 객체 (화면별 namespace)

| 파일 | config 이름 | wrapClass | 공통 stam-cs 사용 여부 |
|------|------------|-----------|----------------------|
| `stam.requirements.js` | `RQ_CS_CFG` | `rq-cs` | 미사용 |
| `stam.functional-specification.js` | `FN_CS_CFG` | `fn-cs stam-cs` | **사용** (dual class) |
| `stam.menu-screen-list.js` | `MSL_CS_CFG` | `msl-cs` | 미사용 |
| `stam.menu-screen-crud.js` | `CS_CFG` | `stam-cs` | **사용** (완전 전환) |
| `stam.board-factory.js` | `CS_CFG` | `bf-cs stam-cs` | **사용** (dual class) |

**판단**: config 객체 자체는 화면별 설정(namespace, selector)이며 본질적으로 중복이 아니다. 단, wrapClass를 순수 `stam-cs`로 통일하면 화면 CSS의 전용 클래스가 불필요해진다.

### 10.2 syncCustomSelect 함수

| 파일 | 함수명 | 역할 | 중복 여부 |
|------|--------|------|----------|
| `stam.requirements-firestore-crud.js` | `syncCustomSelect(sel)` | rq-cs-val, rq-cs-opt 상태 수동 동기화 | 화면 전용 클래스(`rq-cs-val`) 때문에 필요 |
| `stam.functional-spec-firestore-crud.js` | `syncCustomSelect(sel)` | fn-cs-val, fn-cs-opt 상태 수동 동기화 | 화면 전용 클래스(`fn-cs-val`) 때문에 필요 |

**판단**: `rq-cs-*` / `fn-cs-*`를 `stam-cs-*`로 전환하면 이 함수들이 불필요해진다. `STAM.customSelect`의 `build()` 내부에서 valSpan을 자동 관리하기 때문이다.

---

## 11. Native Select 목록

| 화면 | 위치 | 클래스 | 개수 | 역할 | Custom 전환 여부 |
|------|------|--------|------|------|----------------|
| requirements.html | 등록/수정 드로어 | `stam-form-input rq-inp` | 8 | 카테고리, 우선순위, 상태, 중요도 등 | `STAM.customSelect`로 래핑 (RQ_CS_CFG) |
| functional-specification.html | 등록/수정 드로어 | `stam-select fn-sel` | 8 | 분류, 우선순위, 상태, 구현방법 등 | `STAM.customSelect`로 래핑 (FN_CS_CFG) |
| screen-specification.html | filter 영역 | id만 (stam-select 없음) | 2 | 화면유형, 작성상태 필터 | Custom 전환 없음 (filter 전용) |
| menu-screen-list.html | 구형 드로어 | `msl-inp stam-select` | 8 | 채널, 레벨, 유형, 상태 등 | `STAM.customSelect`로 래핑 (MSL_CS_CFG) |
| menu-screen-list.html | 신형 v2 드로어 | `stam-form-input` | 5 | 유형, 채널, 상태, 검토상태, 1단계 | `STAM.customSelect`로 래핑 (menu-screen-crud CS_CFG) |
| boards-v2/board-builder.html | board 설정 | `bb-select` | 1 | 카테고리 선택 | 별도 native select (board-builder 고유) |

**총 native select 수**: 32개 (board-builder 1개 포함)  
**Custom Picker로 래핑된 수**: 29개  
**Custom 전환 없는 native select**: 3개 (ss filter 2, bb-select 1)

---

## 12. Custom Picker 목록

| 구현 | 유형 | JS | CSS | 사용 화면 | 현황 |
|------|------|----|-----|-----------|------|
| `STAM.customSelect` (init) | B | stam.custom-select.js | stam.custom-select.css | requirements, functional-spec, menu-screen-list, screen-specification, board-factory | SSOT 존재. 일부 화면 CSS 전환 미완 |
| `STAM.referencePicker` (create) | B | stam.reference-picker.js | stam.custom-select.css | wbs, functional-specification, screen-specification (via wrappers) | SSOT 완전 구현 |
| `STAM.wbsPicker` | D. Wrapper | stam.wbs-picker.js | stam.custom-select.css | wbs, screen-specification | referencePicker 기반 |
| `STAM.requirementPicker` | D. Wrapper | stam.requirement-picker.js | stam.custom-select.css | wbs, functional-specification, screen-specification | referencePicker 기반 |
| `STAM.functionalSpecPicker` | D. Wrapper | stam.functional-spec-picker.js | stam.custom-select.css | wbs, screen-specification | referencePicker 기반 |
| `STAM.projectMemberPicker` | D. Wrapper | stam.project-member-picker.js | stam.custom-select.css | wbs | referencePicker 기반 |
| wbs-selectbox (data-wbs-sel) | C. 화면 전용 | stam.wbs.js (내장) | stam.custom-select.css (시각 클래스 사용) | wbs | 단계(phase) 전용. STAM.customSelect와 구조 다름 |

---

## 13. 모바일/반응형

### 13.1 stam.custom-select.css

- **미디어쿼리 없음** — 별도 모바일 override 없음
- `width: 100%`, `box-sizing: border-box` → 반응형 기본 준수
- `max-height: 220px`, `overflow-y: auto` → 옵션 목록 스크롤 처리

### 13.2 stam.reference-picker.js

- 별도 모바일 동작 없음
- JS 레이어에서 모바일 처리 미구현
- 검색 input, 옵션 클릭 모두 touch 동작 가능 (standard click 이벤트)

### 13.3 화면별 반응형

| 화면 | 픽커 관련 반응형 규칙 |
|------|----------------------|
| stam.wbs.css | `@media (max-width: 800px)` — `.wbs-form-row [data-stam-reference-picker-mounted] { min-width:0; max-width:100% }` |
| stam.requirements.css | 픽커 전용 반응형 없음 (드로어 자체가 모바일 대응) |
| stam.functional-specification.css | 동일 |
| stam.menu-screen-list.css | 동일 |

### 13.4 PC / 모바일 별도 구현 여부

**없음** — PC와 모바일이 서로 다른 Picker 구현을 사용하는 경우 발견되지 않음.

---

## 14. 다크모드

### 14.1 공통 CSS 처리

`stam.custom-select.css` — `[data-theme="dark"]` 블록으로 `.stam-cs-trigger`, `.stam-cs-menu`, `.stam-cs-opt` 상태 정의.

| 상태 | 라이트 | 다크 |
|------|--------|------|
| trigger 배경 | `var(--bg-sur)` | `var(--bg-sur2)` |
| trigger 텍스트 | `var(--t1)` | `var(--t1)` |
| trigger border | `var(--bd)` | `var(--bd)` |
| menu 배경 | `var(--bg-sur)` | `var(--bg-sur2)` |
| menu shadow | `rgba(15,23,42,.12)` | `rgba(0,0,0,.45)` |
| hover | `var(--bg-sur2)` | `rgba(255,255,255,.06)` |
| selected | `var(--stam-soft)` | `var(--stam-soft)` |
| focus | `var(--stam)` + `var(--stam-soft)` | 동일 |

### 14.2 중복 CSS의 다크모드 처리

- `stam.requirements.css` — `rq-cs-*`에 대해 동일 dark mode 규칙 중복 정의
- `stam.menu-screen-list.css` — `msl-cs-*`에 대해 동일 dark mode 규칙 중복 정의
- `stam.functional-specification.css` — PR #98에서 제거됨 (stam-cs-* 공통 사용)

**결론**: 다크모드는 공통 CSS(`stam.custom-select.css`)에서 토큰 기반으로 처리됨. 중복 CSS 제거 시 자동 해결.

---

## 15. 회귀 위험

| 영역 | 위험 내용 | 심각도 |
|------|-----------|--------|
| requirements.html | `rq-cs-*` → `stam-cs-*` 전환 시 `syncCustomSelect` 내 `.rq-cs-val` 참조 깨짐 | 높음 |
| requirements.html | `RQ_CS_CFG.wrapClass`를 `stam-cs`로 변경 시 `openSelector: '.rq-cs.open'`도 변경 필요 | 높음 |
| menu-screen-list.html | `msl-cs-*` → `stam-cs-*` 전환 시 `MSL_CS_CFG` 전체 수정 필요 | 높음 |
| menu-screen-list.html | 구형 드로어와 신형 v2 드로어가 다른 config를 사용하므로 개별 검증 필요 | 중간 |
| wbs.html | wbs-selectbox 시각 클래스는 이미 `stam-cs-*` 사용 중이나, JS 구현이 독립적 → 충돌 없음 | 낮음 |
| functional-specification.html | FN_CS_CFG에 `fn-cs stam-cs` dual class → `stam.functional-specification.css`의 `.fn-cs-native` 제거 가능 여부 확인 필요 | 낮음 |

---

## 16. 구현 후보 범위

### 16.1 후속 구현 PR 수정 후보 파일

| 파일 | 분류 | 수정 후보 여부 | 이유 |
|------|------|--------------|------|
| `stam/css/stam.requirements.css` | 화면 CSS | Y | `rq-cs-*` 중복 CSS 제거 (약 55줄) |
| `stam/css/stam.menu-screen-list.css` | 화면 CSS | Y | `msl-cs-*` 중복 CSS 제거 (약 30줄) |
| `stam/js/stam.requirements.js` | 화면 JS | Y | `RQ_CS_CFG` → `stam-cs-*` 기준으로 변경 |
| `stam/js/stam.requirements-firestore-crud.js` | 화면 JS | Y | `syncCustomSelect` 제거 (`rq-cs-val` 참조 불필요해짐) |
| `stam/js/stam.menu-screen-list.js` | 화면 JS | Y | `MSL_CS_CFG` → `stam-cs-*` 기준으로 변경 |
| `stam/js/stam.functional-spec-firestore-crud.js` | 화면 JS | Y | `syncCustomSelect` 제거 (fn-cs-val 참조 불필요해짐) |
| `stam/pages/boards/requirements.html` | 화면 HTML | HOLD | CSS/JS 전환 결과에 따라 변경 필요 여부 확인 |
| `stam/pages/boards/menu-screen-list.html` | 화면 HTML | HOLD | CSS/JS 전환 결과에 따라 변경 필요 여부 확인 |
| `stam/js/stam.wbs.js` | 화면 JS | HOLD | wbs-selectbox → STAM.customSelect 전환 여부 추가 검토 필요 |
| `stam/css/stam.functional-specification.css` | 화면 CSS | HOLD | `.fn-cs-native` 제거 가능 여부 확인 필요 |

### 16.2 수정 없음 (현황 유지) 확정

| 파일 | 이유 |
|------|------|
| `stam/js/stam.custom-select.js` | SSOT — 현행 유지. 단, **Escape key close 지원 검토** 필요 (AC-FN-004 충족 대상). 실제 수정 여부는 후속 구현 PR에서 확정. |
| `stam/css/stam.custom-select.css` | SSOT — 수정 불필요 |
| `stam/js/stam.reference-picker.js` | SSOT — 수정 불필요 |
| `stam/js/stam.wbs-picker.js` | 완전 공통화 상태 |
| `stam/js/stam.requirement-picker.js` | 완전 공통화 상태 |
| `stam/js/stam.functional-spec-picker.js` | 완전 공통화 상태 |
| `stam/js/stam.project-member-picker.js` | 완전 공통화 상태 |
| `stam/css/stam.wbs.css` | picker 관련 중복 없음 (레이아웃/구조 보정만) |
| `stam/css/stam.board-factory.css` | migrated 상태 |
| `stam/css/stam.screen-specification.css` | migrated 상태 |
| Firebase / Auth / Rules 파일 | picker 작업 범위 외 |
| App Shell / Left Nav / Topbar | picker 작업 범위 외 |

---

## 17. 수정 금지 범위

```text
- Firebase Auth
- firestore.rules / storage.rules
- Firebase 데이터 모델
- 로그인 흐름
- 사용자/역할 권한 구조
- Left Navigation 구조 (stam.nav-data.js 포함)
- Topbar 구조
- App Shell 구조
- Picker와 관계없는 제품 기능
- Picker와 관계없는 공통 컴포넌트
- board-builder.html / bb-select (별도 화면, Picker 공통화 범위 외)
- screen-specification.html filter native select 2개 (필터 전용, Picker 공통화 범위 외)
```

---

## 18. 후속 구현 PR 권장안

### 권장 작업 순서

**Phase 1**: requirements 전환 (단일 화면, 명확한 중복)
1. `stam.requirements.css`에서 `rq-cs-*` 전체 제거
2. `stam.requirements.js`의 `RQ_CS_CFG` → `stam-cs-*` 기준으로 변경
3. `stam.requirements-firestore-crud.js`의 `syncCustomSelect` 제거
4. requirements.html 동작 회귀 검증

**Phase 2**: menu-screen-list 전환
1. `stam.menu-screen-list.css`에서 `msl-cs-*` 전체 제거
2. `stam.menu-screen-list.js`의 `MSL_CS_CFG` → `stam-cs-*` 기준으로 변경
3. menu-screen-list.html 동작 회귀 검증 (구형 드로어, 신형 v2 드로어 모두)

**Phase 3 (선택)**: wbs-selectbox 판단
- wbs-selectbox를 STAM.customSelect로 교체할지 현행 유지할지 별도 결정
- 현행도 `stam-cs-*` 시각 클래스를 사용하므로 시각적 일관성은 이미 달성됨

### 구현 전 추가 확인 필요 사항

- `stam.requirements.js` `RQ_CS_CFG`의 `openSelector: '.rq-cs.open'`를 `.stam-cs.is-open`으로 변경해야 `closeAll`이 정상 동작하는지 검증
- `stam.menu-screen-list.js` `MSL_CS_CFG`와 `stam.menu-screen-crud.js` `CS_CFG`가 동일 화면에서 충돌 없이 동작하는지 확인

---

## 19. 미확정 사항

| 항목 | 내용 | 후속 처리 |
|------|------|----------|
| wbs-selectbox 통합 여부 | `STAM.customSelect`로 교체 가능하나 `data-sel-opts` 파싱 방식이 다름 | 구현 PR에서 별도 판단 |
| `.fn-cs-native` 제거 가능 여부 | `fn-cs-native` 클래스를 JS에서 부여하는지 확인 필요 | stam.functional-specification.js / stam.custom-select.js 추가 확인 |
| `stam-form-input` native select (신형 v2 드로어) | menu-screen-crud.js의 CS_CFG가 `stam-form-input`도 래핑하는지 확인 | menu-screen-crud.js 상세 분석 |
| screen-specification filter select | customSelect 미사용 — filter JS에서 직접 제어하는지 확인 | 구현 범위 외 판단 후 확정 |

---

## 20. 증거

### 20.1 조사 대상 파일 목록

```text
[공통 CSS]
stam/css/stam.custom-select.css                (공통 SSOT CSS)

[공통 JS]
stam/js/stam.custom-select.js                  (공통 SSOT JS)
stam/js/stam.reference-picker.js               (공통 Reference Picker 코어)
stam/js/stam.wbs-picker.js                     (WBS Wrapper)
stam/js/stam.requirement-picker.js             (Requirement Wrapper)
stam/js/stam.functional-spec-picker.js         (FN Spec Wrapper)
stam/js/stam.project-member-picker.js          (Member Wrapper)

[화면 CSS]
stam/css/stam.requirements.css                 (rq-cs-* 중복 포함)
stam/css/stam.functional-specification.css     (fn-cs-native만 남음)
stam/css/stam.screen-specification.css         (ss-cs-native만 남음)
stam/css/stam.wbs.css                          (레이아웃/구조만)
stam/css/stam.menu-screen-list.css             (msl-cs-* 중복 포함)
stam/css/stam.board-factory.css                (bf-cs-native만 남음)
stam/css/stam.form-controls.css                (stam-select 공통)

[화면 JS]
stam/js/stam.requirements.js                   (RQ_CS_CFG)
stam/js/stam.requirements-firestore-crud.js    (syncCustomSelect)
stam/js/stam.functional-specification.js       (FN_CS_CFG)
stam/js/stam.functional-spec-firestore-crud.js (syncCustomSelect)
stam/js/stam.menu-screen-list.js               (MSL_CS_CFG)
stam/js/stam.menu-screen-crud.js               (CS_CFG stam-cs 기준)
stam/js/stam.board-factory.js                  (CS_CFG dual class)
stam/js/stam.wbs.js                            (wbs-selectbox 내장)
stam/js/stam.screen-specification-crud.js      (picker mount/getValue)

[화면 HTML]
stam/pages/boards/requirements.html
stam/pages/boards/functional-specification.html
stam/pages/boards/screen-specification.html
stam/pages/boards/wbs.html
stam/pages/boards/menu-screen-list.html
stam/pages/boards-v2/menu-screen-list.html
stam/pages/boards-v2/requirements.html
stam/pages/boards-v2/functional-specification.html
stam/pages/boards-v2/board-builder.html
```

### 20.2 핵심 검색 결과 요약

```text
Picker 관련 JS 파일:   stam.custom-select.js, stam.reference-picker.js,
                       stam.wbs-picker.js, stam.requirement-picker.js,
                       stam.functional-spec-picker.js, stam.project-member-picker.js

stam.custom-select.css를 로드하는 화면:
  boards/requirements.html, boards/functional-specification.html,
  boards/screen-specification.html, boards/wbs.html,
  boards/menu-screen-list.html, boards-v2/menu-screen-list.html,
  boards-v2/requirements.html, boards-v2/functional-specification.html

customSelect 호출 JS:
  stam.requirements.js (RQ_CS_CFG)
  stam.functional-specification.js (FN_CS_CFG)
  stam.menu-screen-list.js (MSL_CS_CFG)
  stam.menu-screen-crud.js (CS_CFG)
  stam.board-factory.js (CS_CFG)

referencePicker 사용 화면 (HTML 기준):
  boards/wbs.html
  boards/functional-specification.html
  boards/screen-specification.html
```

---

## 21. 최종 구조 판정

### 판정: **B. 공통 Picker 존재하지만 보강 필요**

**근거**:

1. `STAM.customSelect`(JS)와 `stam.custom-select.css`(CSS)는 단일 SSOT로 확인됨.
2. `STAM.referencePicker`는 비동기 아티팩트 참조 선택을 위한 SSOT로 완전 구현됨.
3. 아티팩트별 wrapper(wbsPicker, requirementPicker 등) 4종이 referencePicker 기반으로 통합됨.
4. **보강 필요 이유**:
   - `stam.requirements.css`에 `rq-cs-*` 중복 CSS 존재 (약 55줄, 다크모드 포함)
   - `stam.menu-screen-list.css`에 `msl-cs-*` 중복 CSS 존재 (약 30줄)
   - 위 두 화면의 JS config도 `stam-cs-*` 기준으로 전환 미완
   - 전환 후 `syncCustomSelect` 함수 2개 제거 가능
   - `STAM.customSelect`에 **Escape key close 처리 없음** — `STAM.referencePicker`에는 존재하므로 두 공통 모듈 간 키보드 지원 수준 불일치. AC-FN-004 충족을 위해 후속 구현 PR에서 보강 검토 필요.
5. **신규 컴포넌트 생성 불필요**: 기존 공통 모듈 활용만으로 완전한 SSOT 달성 가능.
