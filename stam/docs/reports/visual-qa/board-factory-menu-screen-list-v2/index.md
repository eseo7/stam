# Board Factory — 메뉴구조/화면목록 v2 Preview QA

> PR #136 (기능정의서 v2 preview) / PR #137 (QA Gate / Adoption Checklist 문서) 후속.
> Board Factory(`STAM.boardFactory.mount`) 두 번째 적용 대상으로 **메뉴구조/화면목록**을 v2 preview 화면으로 추가한 작업의 QA 문서.

---

## 1. 작업 개요

- **목적**: Board Factory v1.2 엔진 변경 없이, 메뉴구조/화면목록을 Factory config로 재현 가능한지 검증.
- **기존 화면 유지**: 기존 `stam/pages/boards/menu-screen-list.html`은 diff 0. nav link 미변경.
- **신규 route**: `stam/pages/boards-v2/menu-screen-list.html` — static / in-memory preview.

## 2. 기존 기준 파일

- `stam/pages/boards/menu-screen-list.html`
- `stam/js/stam.menu-screen-list.js`
- `stam/css/stam.menu-screen-list.css`

본 PR에서 위 3개 파일의 diff는 **0** 이다.

## 3. 신규 / 수정 파일

| 파일 | 상태 | 비고 |
| --- | --- | --- |
| `stam/pages/boards-v2/menu-screen-list.html` | 신규 | v2 preview route. PR #136 `boards-v2/functional-specification.html` 구조 그대로, mount 대상 config만 `menuScreenListV2`로 교체. |
| `stam/js/stam.board-configs.js` | 수정(append) | `STAM.boardConfigs.menuScreenListV2` 추가. 기존 `functionalSpecificationV2` 블록 변경 없음. |
| `stam/css/stam.board-factory.css` | 수정(공통 레이어 보정) | drawer footer button variant 공통 stroke 기준 보정. `.bf-drawer .stam-drawer-foot` scope 내부에서만 ghost/outline/secondary 에 `border: 1px solid var(--btn-secondary-border)` 적용. 자세한 내용은 §12. |
| `stam/docs/reports/visual-qa/board-factory-menu-screen-list-v2/index.md` | 신규 | 본 QA 문서. |

**Engine(`stam.board-factory.js`) 변경 없음.** CSS 변경분은 **메뉴구조 v2 개별 화면 보정이 아니라 Board Factory 공통 레이어 보정**이며, 기능정의서 v2 / 메뉴구조 v2 / 후속 보드 전반에 동일하게 적용된다. 기능정의서 v2(`boards-v2/functional-specification.html`) 와 메뉴구조 v2(`boards-v2/menu-screen-list.html`) 는 동일한 `stam.board-factory.css` / `stam.board-factory.js` / `stam.board-configs.js` 를 공유하므로, 개별 화면 selector / class / patch CSS 는 추가하지 않는다.

## 4. static / in-memory 범위

- 모든 데이터는 `stam.board-configs.js` 내부 `MSL_SEED` 배열에 정의된 10개 시드 행.
- `create / update / remove`는 in-memory `mslRows` 배열을 직접 변경하며, **새로고침 시 시드로 초기화**.
- `fetch / XMLHttpRequest / firebase.firestore / localStorage / sessionStorage / indexedDB` 미사용.

## 5. 기존 route untouched 증거

- `pages/boards/menu-screen-list.html`, `js/stam.menu-screen-list.js`, `css/stam.menu-screen-list.css` diff 0.
- `stam.nav-data.js`의 `B2` 항목(`pages/boards/menu-screen-list.html`) 변경 없음.
- 기존 nav 링크는 그대로 `pages/boards/menu-screen-list.html` 로 향한다. v2 route는 nav에 노출되지 않는다(preview).

## 6. Config / Field / Column Inventory

### 6-1. 컬럼 (config `columns`)

| # | type | label | field / 비고 |
| --- | --- | --- | --- |
| 1 | checkbox | — | 선택 |
| 2 | idName | 화면 ID / 화면명 | `id` + `name` |
| 3 | text | LV1 | `lv1` |
| 4 | text | LV2 | `lv2` |
| 5 | chip | 화면유형 | `screenType` + vocab `screenType` |
| 6 | chip | FO/BO | `fob` + vocab `fob` |
| 7 | relationChip | 연결 요구사항 | `reqIds` → `referenceSource.requirements` |
| 8 | relationChip | 연결 화면설계서 | `designIds` → `referenceSource.designs` |
| 9 | statusChip | 상태 | `status` + vocab `status` |
| 10 | user | 담당자 | `ownerId` → `referenceSource.users` |
| 11 | date | 최종 수정일 | `updatedAt` |
| 12 | actionButtons | — | `detail` |

### 6-2. 필터 (config `filters`)

- 상태 (`status`)
- 화면유형 (`screenType`)
- FO/BO (`fob`)
- LV1 (`lv1`)
- 담당자 (`owner` → `ownerId`)

### 6-3. Summary (config `summary.cells`)

전체 / 작성중 / 검토중 / 확정 / 보류 / 연결 요구사항 / 연결 화면설계서 — 7칸.

### 6-4. Drawer 섹션 (register/edit 공통)

1. 기본 정보 — 화면 ID(readonly) / FO/BO / 화면명 / 화면유형 / 상태 / 담당자
2. 메뉴 계층 — LV1 / LV2 / LV3
3. 연결 정보 — 연결 요구사항 / 연결 화면설계서
4. 비고 — 비고

required: FO/BO, 화면명, 화면유형.

### 6-5. Detail 탭

- **기본 정보** — `infoGrid` + `relationCards`
- **비고** — `textBlock`

## 7. Board Factory 적용 가능 / 제외 항목

### 적용 가능 (v1.2 표준 column / section 으로 커버)

- 화면 ID / 화면명 한 줄 표시 (`idName`)
- LV1 / LV2 텍스트 컬럼
- 화면유형 / FO/BO / 상태 chip
- 연결 요구사항 / 연결 화면설계서 relation chip
- 담당자 user 컬럼
- 최종 수정일 date 컬럼
- 검색 / 필터 / 정렬 / pagination / row 선택 / drawer 상세·등록·수정 / required validation / in-memory create·update·remove

### 이번 preview 제외 (별도 후속 PR 필요)

- **변경 이력 탭** (`historyList` slot 미구현). 기존 화면의 3번 탭은 v2 preview 에서 노출하지 않는다.
- **LV3 컬럼 표시** — 기존 화면이 LV3을 list 컬럼에 두지 않음. drawer 에서만 입력 가능.
- **임시저장 / 전체 보기 버튼** — drawer footer 의 보조 액션. Board Factory 표준 footer 가 cancel / submit 만 노출.
- **트리 LV1/LV2/LV3 토글** — 표시 형식 변경(별도 UI). Factory 표 형식 유지.

## 8. 검증 결과

### 8-1. 정적 / 단위

- `git diff --name-only origin/main` — 변경 파일 4개:
  - `stam/docs/reports/visual-qa/board-factory-menu-screen-list-v2/index.md`
  - `stam/js/stam.board-configs.js`
  - `stam/css/stam.board-factory.css` *(공통 레이어 보정 — §12)*
  - `stam/pages/boards-v2/menu-screen-list.html`
- `node --check stam/js/stam.board-configs.js` — **PASS**.
- `node --check stam/js/stam.board-factory.js` — **PASS** (PR #136 이후 엔진 변경 없음).
- CSS 중괄호 균형 — **134/134**.
- 기존 메뉴구조/화면목록 3종(html/js/css) diff = **0**.
- 기존 기능정의서 3종 diff = **0**.
- `stam.board-factory.js` 변경 없음(엔진 untouched).
- 공통 모듈(`stam.board-filter.js`, `stam.custom-select.js`, `stam.nav-data.js`, `stam.shell.js`, `stam.topbar-render.js`) 변경 없음.
- `firebase.json` / `.github/workflows/*` / package/config/build 파일 변경 없음.

### 8-2. jsdom smoke

본 PR 범위는 **신규 config 추가**이며 엔진 변경 없음. PR #136 의 jsdom 스모크는 엔진 + functionalSpecificationV2 config 기준으로 통과한 바 있으며, 본 config 는 동일 엔진의 표준 column/section 만 사용한다. 신규 jsdom 시나리오 실행은 본 PR 범위에서 **미실행**(static config 검증). 실제 동작 검증은 §8-3 브라우저 QA 로 대체.

### 8-3. 실제 브라우저 QA — **PENDING**

이 실행 환경에서는 실제 브라우저 바이너리를 받을 수 없다(PR #136 에서 확인). 따라서 아래 항목은 **사용자 로컬 브라우저 확인 필요**:

- [ ] 1920px — content max-width 안에서 summary 7열, 컬럼 12개 가로 깨짐 없음
- [ ] 1366px — toolbar wrap 없음, table 가로 스크롤 없음
- [ ] narrow / mobile (≤820, ≤480) — summary 응답형, toolbar wrap, form 1열
- [ ] light mode — 회귀 없음
- [ ] dark mode — 회귀 없음, selected row active bar 가시성
- [ ] 신규 route 로드 — `/stam/pages/boards-v2/menu-screen-list.html` 200, Factory mount 정상
- [ ] drawer 상세 — `infoGrid` + `relationCards` 정상
- [ ] drawer 등록 — required(`FO/BO / 화면명 / 화면유형`) 빈값 차단, 충족 시 in-memory 추가
- [ ] drawer 수정 — prefill 정상, update 반영
- [ ] custom select 중복 표시 없음(native `<select>` 숨김)
- [ ] toolbar 검색/필터/삭제/등록/내보내기 버튼 높이 일치
- [ ] row selected active bar / checkbox / chip / relation chip / avatar 회귀 없음
- [ ] drawer title clipping 없음 / header meta chip-only hidden 유지
- [ ] footer button stroke / icon 회귀 없음

## 9. Ready 전환 조건

`Board-Factory-QA-Gate-v1.md` §1 / §2 / §3 전 항목 PASS 시 Ready 전환 가능. 본 PR 은 **§8-3 실제 브라우저 QA PENDING** 상태이므로 **Draft 유지**.

## 10. Known limitations

- **static / in-memory preview**. 새로고침 시 시드로 초기화.
- 변경 이력 탭 / 임시저장 / 전체 보기 / 트리 토글 미구현 (§7 참조).
- nav link 미교체. preview route 는 직접 URL 진입으로만 접근.
- API / Firestore / localStorage 미사용.

## 11. 다음 후보

- **요구사항정의서 v2 preview** — 컬럼 / 필터 / 드로워가 기능정의서와 유사하나, `priority` vocab(`보통/중간`) 정규화 선결 필요.
- 변경 이력 / 임시저장 / 전체 보기 slot 본구현은 별도 후속 PR.

---

## 12. Drawer footer button stroke — Board Factory 공통 레이어 보정 (회차 1)

### 12-1. 문제 성격

사용자 브라우저 QA 에서 PR #138 메뉴구조/화면목록 v2 의 drawer footer 버튼 stroke 가 누락/약함으로 확인. 이는 **메뉴구조 v2 개별 화면 문제가 아니라**, PR #136 기능정의서 v2 에서 확정된 UI 기준이 Board Factory **공통 레이어에 불완전하게 승격**된 결과로 판단한다. (ghost variant 만 보정되어 있고 outline / secondary 가 누락 + border shorthand 가 아닌 `border-color` 만 지정되어 일부 케이스에서 stroke 가 약하게 보이거나 hover/focus 시 사라지는 가능성.)

### 12-2. 원인 (공통 레이어 관점)

- `.stam-btn` 기본은 `border: 1px solid transparent`. 따라서 variant 별로 `border-color` 만 지정해도 width/style 은 살아 있다.
- **문제 1**: 이전 공통 규칙이 `.stam-btn-ghost` 만 다뤘다. `.stam-btn-outline` / `.stam-btn-secondary` 는 `stam.buttons.css` 의 전역 규칙에 의존했고, footer scope 에서 강조되지 않았다.
- **문제 2**: `border-color` 만 지정한 케이스는 다른 selector 가 `border` shorthand 로 덮을 때 width/style 이 0/none 으로 떨어질 위험이 있다(우선순위 충돌 케이스).
- **문제 3**: hover/focus 상태에서 stroke 가 사라지지 않도록 명시 보정이 필요했다(PR #136 에서는 ghost hover 만 처리됨).

### 12-3. 보정 위치 / selector

**위치**: `stam/css/stam.board-factory.css` 내 공통 footer 블록.
**scope**: `.bf-drawer .stam-drawer-foot` 내부만. 전역 `.stam-btn*` / toolbar / 다른 컴포넌트에는 영향 없음.

```css
.bf-drawer .stam-drawer-foot .stam-btn-ghost,
.bf-drawer .stam-drawer-foot .stam-btn-outline,
.bf-drawer .stam-drawer-foot .stam-btn-secondary {
  border: 1px solid var(--btn-secondary-border);
}
.bf-drawer .stam-drawer-foot .stam-btn-ghost:hover,
.bf-drawer .stam-drawer-foot .stam-btn-outline:hover,
.bf-drawer .stam-drawer-foot .stam-btn-secondary:hover,
.bf-drawer .stam-drawer-foot .stam-btn-ghost:focus-visible,
.bf-drawer .stam-drawer-foot .stam-btn-outline:focus-visible,
.bf-drawer .stam-drawer-foot .stam-btn-secondary:focus-visible {
  border-color: var(--btn-secondary-border);
}
```

- `border` shorthand 로 width(1px) / style(solid) / color(token) 동시 고정 → 다른 규칙이 `border` 로 덮어도 자체 specificity 가 보장.
- ghost / outline / secondary 3종 동시 커버.
- `.stam-btn-primary` 는 이 블록에서 다루지 않는다 → filled purple 유지, secondary 처럼 보이지 않는다.
- 후속 보드(요구사항 v2 등)는 별도 보정 없이 동일 stroke 가 자동 적용된다.

### 12-4. 보정 성격

**개별 화면 보정 아님. Board Factory 공통 레이어 보정.** 변경 파일은 `stam.board-factory.css` 만. menu-screen-list 전용 selector / class / config 추가 없음. `stam.board-factory.js`, `stam.board-configs.js`, 신규 route HTML 모두 미변경.

### 12-5. 메뉴구조 v2 drawer 확인

사용자 로컬 브라우저 QA 결과:

- [x] 등록 drawer footer — **stroke 정상 표시 확인 완료**
  - [x] `취소` (ghost) — stroke 보임
  - [x] `임시저장` (outline + icon) — stroke 보임
  - [x] `전체 보기` (ghost) — stroke 보임
  - [x] `등록` (primary) — filled purple 유지
- [ ] 상세 drawer footer — PENDING (사용자 브라우저 QA)
  - ghost / primary 공통 기준 동일 selector 적용
- [ ] 수정 drawer footer — PENDING (사용자 브라우저 QA)
  - ghost / outline / primary 공통 기준 동일 selector 적용

### 12-6. 기능정의서 v2 회귀 확인

- 기능정의서 v2(`boards-v2/functional-specification.html`) 와 메뉴구조 v2(`boards-v2/menu-screen-list.html`) 는 **동일한** `stam.board-factory.css` / `stam.board-factory.js` 를 공유. 본 보정은 공통 selector(`.bf-drawer .stam-drawer-foot .stam-btn-*`) 에 적용되므로, 기능정의서 v2 footer 에도 동일 기준이 자동 적용된다.
- PR #136 ghost-only 규칙은 본 회차에서 outline/secondary 추가 + `border` shorthand 강화로 **동등 또는 더 강한 stroke** 가 되며, 기존 fn-spec 시각 기준은 동일하거나 향상.
- [ ] `/stam/pages/boards-v2/functional-specification.html` 등록/상세/수정 drawer footer stroke 회귀 확인 — PENDING (사용자 브라우저 QA)
- [ ] primary filled 유지 — 본 블록은 primary 미관여, 회귀 가능성 없음
- [ ] toolbar 버튼 height / icon — 본 블록 scope 가 `.bf-drawer .stam-drawer-foot` 한정, toolbar 영향 없음

### 12-7. 공통화 재발 방지 체크리스트 (Adoption Checklist 보강)

- drawer footer 에 신규 variant(`secondary` 등) 가 사용되면 위 공통 블록에 selector 만 추가하면 끝.
- 신규 보드는 `boardFactory.mount` 만으로 동일 stroke 기준이 적용된다 → 개별 화면 patch CSS 금지.
- 다음 보드(요구사항 v2) 에서는 footer stroke QA 가 회귀로 보고되어선 안 된다.

### 12-8. 동시 회귀 확인 항목 (메뉴구조 v2, PENDING)

ghost/outline/secondary stroke 외에 PR #136 에서 확정된 아래 기준이 메뉴구조 v2 에서도 깨지지 않는지 사용자 브라우저 확인 필요.

- [ ] drawer title clipping 없음
- [ ] header meta chip-only hidden 동작 유지
- [ ] drawer padding / drawer footer layout 정상
- [ ] footer button icon 정상
- [ ] toolbar 검색/필터/삭제/등록/내보내기 height / icon 정상
- [ ] row selected active bar 정상
- [ ] delete hover 정상
- [ ] custom select 중복 없음 (`bf-cs-native` hidden)
- [ ] status / type / FO/BO / relation chip 정상
- [ ] light / dark 회귀 없음
- [ ] 1366 / 1920 가로 깨짐 없음

### 12-9. light / dark / 1366 / 1920 검증

- light mode — PENDING (사용자 브라우저 QA)
- dark mode — PENDING (사용자 브라우저 QA)
- 1366 / 1920 — PENDING (사용자 브라우저 QA)
