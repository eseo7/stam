# STAM Common Picker Audit & Contract v1

## 1. 목적

화면설계서 Firestore UI 배선 전에 요구사항·기능정의·WBS·기타 연결 선택 UI를 전수 조사하고,
`STAM.referencePicker` 기반 공통 Picker 계약을 확정한다.

- **범위**: 조사 · 계약 확정 · WBS 중복 CSS 제거
- **비범위**: 화면설계서 Firestore 목록/등록 배선, 실제 조회·저장 구현, 스토리보드 디자인 임의 적용

**Base SHA**: `12ee089cf59963c8f4fb7ca2bb182593d2d8bdad`

---

## 2. Picker 사용처 전수 조사

| 화면/파일 | Picker 용도 | 렌더링 담당 JS | 스타일 담당 CSS | 데이터 공급 | 검색 | 단일/복수 | 저장 형식 | 키보드 | 모바일 | 공통 코드 | 화면 전용 복제 |
|-----------|------------|----------------|-----------------|------------|------|----------|----------|--------|--------|----------|---------------|
| `boards/wbs.html` — 연결 요구사항 | REQ artifact 연결 | `stam.requirement-picker.js` → `STAM.referencePicker.create()` | `stam.custom-select.css` (`.stam-cs-*`) | `requirementsService.listByProject` | O | 단일 | `{ requirementId, requirementCode, requirementTitle }` | O (↑↓ Home End Enter Esc) | O (`@media 640` min-width:0) | O | X |
| `boards/wbs.html` — 연결 기능정의 | FN artifact 연결 | `stam.functional-spec-picker.js` → `referencePicker` | `stam.custom-select.css` | `functionalSpecService.listByProject` | O | 단일 | `{ functionalSpecId, functionalSpecCode, functionalSpecTitle }` | O | O | O | X |
| `boards/wbs.html` — 담당자/검토자 | 프로젝트 멤버 | `stam.project-member-picker.js` → `referencePicker` | `stam.custom-select.css` | `projectMemberReadService.listActiveByProject` | O | 단일 | `{ ownerId, ownerName }` / `{ reviewerId, reviewerName }` | O | O | O | X |
| `boards/wbs.html` — 단계(phase) | 정적 enum | `stam.wbs.js` `initSelectBoxes()` (portal) | `stam.custom-select.css` + `wbs.css` z-index only | `data-sel-opts` attribute | X | 단일 | phase string | Esc only | O | O (`.stam-cs-*`) | legacy `.wbs-sel-*` 호환 class |
| `boards/functional-specification.html` — 연결 요구사항 | REQ artifact 연결 | `stam.requirement-picker.js` | `stam.custom-select.css` + `stam.form-controls.css` | `requirementsService.listByProject` | O | 단일 | triplet (위와 동일) | O | O | O | X |
| `boards/screen-specification.html` — 연결 필드 | (미배선) text input placeholder | `stam.screen-specification-crud.js` (plain input) | `stam.screen-specification.css` | 없음 (mock/local) | X | — | `requirementId` / `functionId` / `wbsId` (legacy 단일 id) | X | O | X | 임시 text input |
| `boards/requirements.html` | Picker 없음 | — | `stam.custom-select.js` (status filter 등) | — | — | — | — | — | — | O | X |
| `boards/menu-screen-list.html` | Picker 없음 | native `<select>` + `stam.custom-select.js` | `stam.form-controls.css` | static options | X | 단일 | field value | native | O | O | X |

### 화면설계서 후속 PR 대상 Picker (이번 PR에서 계약만 확정)

| Picker | JS 모듈 | CSS | Firestore triplet (CRUD 계층 변환) |
|--------|---------|-----|-----------------------------------|
| 요구사항 Picker | `stam.requirement-picker.js` | `stam.custom-select.css` | `requirementId / requirementCode / requirementTitle` |
| 기능정의서 Picker | `stam.functional-spec-picker.js` | `stam.custom-select.css` | `functionalSpecId / functionalSpecCode / functionalSpecTitle` |
| WBS Picker | `stam.wbs-picker.js` | `stam.custom-select.css` | `wbsItemId / wbsItemCode / wbsItemTitle` |

---

## 3. 공통 자산 확인 (소스 근거)

| 질문 | 결과 | 근거 |
|------|------|------|
| 공통 Picker 컴포넌트 존재? | **예** | `stam/js/stam.reference-picker.js` — `STAM.referencePicker.create(config)` |
| 공통 렌더러만 있고 CSS 화면별 복제? | **아니오 (정리 완료)** | 시각 스타일은 `stam/css/stam.custom-select.css` SSOT. WBS `wbs-sel-menu` padding/max-height 중복 제거 |
| CSS만 공통이고 JS 복제? | **아니오** | 도메인별 thin wrapper: `requirement-picker`, `functional-spec-picker`, `wbs-picker`, `project-member-picker` |
| 이름만 Picker이고 다른 구현? | **부분** | `stam.custom-select.js` = 정적 native select 향상 (별 계열). artifact Picker = `referencePicker` 계열 |
| 기존 공통 확장 안전? | **예** | `referencePicker`는 artifact/service 문자열 미포함. domain wrapper가 `normalizeItem`/`toPublicValue` 담당 |
| 새 공통 모듈 필요? | **아니오** | core + CSS section 9(search/meta) 확장으로 충분 |

### JS 계층

```
STAM.referencePicker.create()     ← UI core (stam.reference-picker.js)
  ├── STAM.requirementPicker      ← requirementsService (stam.requirement-picker.js)
  ├── STAM.functionalSpecPicker   ← functionalSpecService (stam.functional-spec-picker.js)
  ├── STAM.wbsPicker              ← wbsService (stam.wbs-picker.js)
  └── STAM.projectMemberPicker    ← projectMemberReadService (stam.project-member-picker.js)
```

### CSS 계층

```
stam.custom-select.css
  ├── .stam-cs-*           ← trigger/menu/option 시각 SSOT
  └── [data-stam-reference-picker-search], .stam-cs-meta  ← reference picker 확장

stam.wbs.css (layout only)
  ├── [data-stam-*-picker] { width:100% }   ← mount slot
  ├── .wbs-selectbox { position:relative }  ← phase portal root
  └── .wbs-sel-menu { z-index:200 }         ← phase portal only
```

---

## 4. 공통 Picker 계약

### A. 데이터 계약

**내부 항목 형식** (Picker 반환 — Firestore 필드명 미포함):

```javascript
{ id: string, code: string, title: string, meta?: string }
```

**도메인 triplet 변환** — Picker wrapper의 `toPublicValue()` 또는 화면설계서 CRUD `buildCreatePayload` / `buildUpdatePatch`에서 수행:

| 도메인 | 공개 값 |
|--------|---------|
| 요구사항 | `requirementId`, `requirementCode`, `requirementTitle` |
| 기능정의 | `functionalSpecId`, `functionalSpecCode`, `functionalSpecTitle` |
| WBS | `wbsItemId`, `wbsItemCode`, `wbsItemTitle` |

- partial triplet → **throw** (contract test 검증)
- unlink → 3-key empty string
- Picker core는 `requirementId` 등 도메인 키를 **하드코딩하지 않음** (`test-reference-picker-contract.mjs` FORBIDDEN 토큰)

### B. UI 계약

| 항목 | 구현 |
|------|------|
| 라벨 | 화면 form label (`.wbs-form-label` 등) |
| placeholder | `config.placeholder` → `.stam-cs-value.is-placeholder` |
| 현재 선택값 | `config.formatLabel(item)` → trigger text |
| 선택 해제 | `config.allowClear` + `unlinkLabel` 옵션 |
| 목록 열기·닫기 | `.is-open` on `.stam-cs` root |
| 검색 | `[data-stam-reference-picker-search]` in menu |
| 로딩 상태 | load Promise dedupe (`loadingPromise` / `loadVersion`) |
| 검색 결과 없음 | `config.emptyLabel` disabled option |
| 조회 실패 | `config.errorLabel` (raw error는 console only) |
| disabled/read-only | `setDisabled(true)` → root `.is-disabled` |
| 필수값 오류 | 화면 form validation 계층 (Picker 외부) |
| 긴 code/title 말줄임 | `.stam-cs-value`, `.stam-cs-otext` ellipsis |
| 외부 클릭 / ESC 닫기 | document click + keydown Escape |
| 단일 선택 | `selectOptionElement` — multiselect 미지원 |

### C. 동작 / 마운트 계약

```javascript
STAM.referencePicker.create(config) → {
  mount, load, getValue, setValue, clear,
  setDisabled, refreshContext, close, destroy
}
```

| 규칙 | 내용 |
|------|------|
| 마운트 | `data-stam-reference-picker-mounted="1"` — duplicate mount throw |
| 자동 마운트 금지 | core/wrapper 모두 `DOMContentLoaded` auto-init 없음 |
| HTML hook | `[data-stam-requirement-picker]`, `[data-stam-functional-spec-picker]`, `[data-stam-wbs-picker]` (후속) |
| 키보드 | Trigger: Enter/Space/ArrowDown. Menu: ↑↓ Home End Enter Esc |
| a11y | `aria-haspopup`, `aria-expanded`, `aria-selected`, `aria-activedescendant` on search |
| context refresh | `refreshContext()` — projectId/memberRole 변경 시 stale ignore |
| normalize 1회 | `normalizeItem`은 load 시 1회만 — render 재호출 금지 |

### D. CSS 계약

| 허용 (화면별) | 금지 (화면별) |
|--------------|--------------|
| mount slot `width:100%` | trigger border/background/hover 재정의 |
| portal z-index | option selected/hover 색상 재정의 |
| `min-width:0` (mobile grid) | padding/max-height menu 중복 (공통 사용) |
| `position:relative` (portal root) | `.wbs-sel` / `.fn-cs-*` / `.ss-cs-*` 시각 재정의 |

---

## 5. 이번 PR 변경 요약

| 파일 | 변경 |
|------|------|
| `stam/css/stam.custom-select.css` | reference picker search input + `.stam-cs-meta` 공통 스타일 추가 |
| `stam/css/stam.wbs.css` | picker trigger height 중복 없음 확인 · `wbs-sel-menu` padding/max-height 제거 · mount slot 통합 |
| `scripts/test-wbs-live-html-contract.mjs` | picker height를 custom-select.css에서 검증 |
| `scripts/test-picker-css-contract.mjs` | 신규 — WBS picker 시각 중복 금지 gate |
| `docs/reports/STAM_Common_Picker_Audit_and_Contract_v1.md` | 본 문서 |

---

## 6. 후속 PR (화면설계서 Firestore 배선) 체크리스트

- [ ] `screen-specification.html`에 `stam.custom-select.css` + `reference-picker.js` + 3 domain picker JS 로드
- [ ] text input placeholder → `[data-stam-requirement-picker]` 등 mount slot 교체
- [ ] `stam.screen-specification-crud.js`에서 picker `getValue()` → `screenSpecService.buildCreatePayload` triplet 전달
- [ ] Firestore 저장은 service/adapter 계층만 — Picker는 id/code/title 반환만
- [ ] `node scripts/test-screen-spec-picker-compat-contract.mjs` PASS 유지

---

## 7. 검증 명령

```bash
node scripts/test-reference-picker-contract.mjs
node scripts/test-requirement-picker-contract.mjs
node scripts/test-functional-spec-picker-contract.mjs
node scripts/test-wbs-picker-hooks-contract.mjs
node scripts/test-screen-spec-picker-compat-contract.mjs
node scripts/test-picker-css-contract.mjs
node scripts/test-wbs-live-html-contract.mjs
```
