# STAM v2 — Board Common Foundation Audit v1

> 진단 전용 리포트(코드 변경 없음). 기준 커밋: `main` `736b5db` (PR #145 squash merge 후).
> 대상: 기존 boards-v2 3개 게시판 preview + Board Builder Admin Preview 의 CSS/DOM/JS 공통화 상태 비교.
> 목적: 다음 공통화 PR 에서 "무엇을 어디로 승격할지" 결정하기 위한 사실 기반 베이스라인.
> **이 문서는 분석만 한다 — 제품 HTML/CSS/JS/nav-data/firebase/workflow 미변경.**

---

## 0. 분석 대상 & 파일명 정정

| 작업지시 표기 | 실제 저장소 파일 | 비고 |
| --- | --- | --- |
| `boards-v2/requirements.html` | `stam/pages/boards-v2/requirements.html` | 일치 |
| `boards-v2/menu-screens.html` | `stam/pages/boards-v2/menu-screen-list.html` | **파일명 상이** — 실제는 `menu-screen-list.html` |
| `boards-v2/functional-spec.html` | `stam/pages/boards-v2/functional-specification.html` | **파일명 상이** — 실제는 `functional-specification.html` |
| `boards-v2/board-builder.html` | `stam/pages/boards-v2/board-builder.html` | 일치 |

> 추가로 `boards-v2/index.html`(진입 인덱스)이 존재하나 본 audit 의 4개 분석 대상에는 미포함(진입 카드 화면).

---

## 1. Summary (결론)

- **기존 3개 게시판(요구사항 / 메뉴구조·화면목록 / 기능정의서 v2)은 이미 공통 CSS/DOM/JS 체계를 거의 100% 사용**한다. 세 화면은 사실상 **동일 템플릿의 config-swap**으로, 각자 다른 것은 `navRender.init(id)` 와 `boardConfigs.<config>` 단 2곳뿐이다. 전용 CSS/inline style **0**, 자체 화면 selector **0** — 게시판 본문은 전부 `STAM.boardFactory.mount(root, config)` 공통 엔진이 그린다.
- **Board Builder 는 "게시판 만들기" UX 기준 화면으로는 유효**하지만, **standalone preview** 성격이 강하다: App Shell(topbar/sidebar/project-context)에 붙지 않고, **inline `<style>` 1블록(177 rule)** 안에 **123개의 전용 `.bb-*` class** 로 shell·form·card·tab·table·scrollbar 를 자체 구현했다. 공통 자산 접점은 `stam.tokens.css`(디자인 토큰), `stam.board-factory.css` 중 `.bf-chip--*` tone, `stam.theme.js`(다크모드), `stam.board-field-schema.js`(필드 스키마) 정도다 → **공통화 전(前) 단계**.
- 따라서 **Theme Preset / Design Import 를 먼저 하기 전에, 공통 CSS/DOM/JS 기반을 정리(승격)하는 작업이 선행**되어야 한다. Board Builder 가 토큰(`var(--stam)`, `--bg-*`, `--t*`, `--bd*`, `--r-*`)은 이미 소비하므로 **토큰 레벨 테마는 부분 적용**되지만, 컴포넌트 레벨(버튼/입력/탭/테이블/스크롤바)은 `.bb-*` 가 사유화되어 있어 **공통 컴포넌트 테마가 닿지 않는다**. 이 격차를 좁히는 것이 다음 공통화의 핵심이다.
- 권장: **작은 단위 승격**(scrollbar 토큰 → 공통 → 컴포넌트 → 레이아웃/DOM 통일 → 테마 프리셋) 순서. 기존 3개 게시판 회귀를 최우선 보호하고, Board Builder 에서 검증된 UX 패턴만 공통 후보로 끌어올린다.

---

## 2. File Matrix

| 화면 | 파일 경로 | CSS link 수 | inline style 여부 | 주요 prefix | 공통 CSS 사용 수준 | 공통 DOM 수준 | JS 공통화 수준 | 리스크 |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 요구사항정의서 v2 | `boards-v2/requirements.html` | 15 (font 1 + 공통 14) | 없음 | `po-` `stam-` `bf-` | **높음** (공통 14/14) | **높음** (po-shell + bf-mount) | **높음** (공통 10 JS + `boardFactory.mount`) | 낮음 |
| 메뉴구조/화면목록 v2 | `boards-v2/menu-screen-list.html` | 15 (font 1 + 공통 14) | 없음 | `po-` `stam-` `bf-` | **높음** (공통 14/14) | **높음** (po-shell + bf-mount) | **높음** (공통 10 JS + `boardFactory.mount`) | 낮음 |
| 기능정의서 v2 | `boards-v2/functional-specification.html` | 15 (font 1 + 공통 14) | 없음 | `po-` `stam-` `bf-` | **높음** (공통 14/14) | **높음** (po-shell + bf-mount) | **높음** (공통 10 JS + `boardFactory.mount`) | 낮음 |
| Board Builder | `boards-v2/board-builder.html` | 3 (font 1 + 공통 2) | **있음** (inline `<style>` 1블록 · 177 rule · ~296줄) | **`bb-`** (123 class) + `bf-chip` 재사용 | **낮음** (tokens + board-factory의 `.bf-chip`만) | **낮음** (자체 `.bb-shell` 2-pane) | **낮음** (자체 `boardBuilderPreview` controller · `mount`/nav/shell 미사용) | **공통화 전 단계 / 중복 위험** |

세 게시판의 유일한 화면별 차이:

| 화면 | `navRender.init` | `boardConfigs.*` | data-screen-label |
| --- | --- | --- | --- |
| requirements | `B1` | `requirementsV2` | 요구사항정의서 v2 |
| menu-screen-list | `B2` | `menuScreenListV2` | 메뉴구조/화면목록 v2 |
| functional-specification | `B5` | `functionalSpecificationV2` | 기능정의서 v2 |

---

## 3. CSS Link Matrix

R = requirements / M = menu-screen-list / F = functional-specification / B = board-builder. (✓ = link, — = 미링크)

| CSS | R | M | F | B | 비고 |
| --- | :-: | :-: | :-: | :-: | --- |
| `stam.tokens.css` | ✓ | ✓ | ✓ | ✓ | **4개 화면 공통** — 색/간격/radius/폰트 토큰 |
| `stam.shell.css` | ✓ | ✓ | ✓ | — | App Shell |
| `stam.components.css` | ✓ | ✓ | ✓ | — | 공통 컴포넌트 |
| `stam.project-overview.css` | ✓ | ✓ | ✓ | — | `.po-*` 워크스페이스 셸(§5) |
| `stam.form-controls.css` | ✓ | ✓ | ✓ | — | 입력/셀렉트/텍스트영역 |
| `stam.drawer.css` | ✓ | ✓ | ✓ | — | 등록/상세/수정 drawer |
| `stam.table-selection.css` | ✓ | ✓ | ✓ | — | 테이블 체크박스 선택 |
| `stam.buttons.css` | ✓ | ✓ | ✓ | — | 버튼 |
| `stam.board-toolbar.css` | ✓ | ✓ | ✓ | — | 보드 툴바 |
| `stam.board-filter.css` | ✓ | ✓ | ✓ | — | 필터 |
| `stam.board-layout.css` | ✓ | ✓ | ✓ | — | 보드 레이아웃 |
| `stam.custom-select.css` | ✓ | ✓ | ✓ | — | 커스텀 셀렉트 |
| `stam.board-factory.css` | ✓ | ✓ | ✓ | ✓* | B 는 `.bf-chip--*` tone **만** 재사용(*부분) |
| `stam.icons.css` | ✓ | ✓ | ✓ | — | 공통 아이콘 asset |
| `s-core-dream.css` (font) | ✓ | ✓ | ✓ | ✓ | 자체서빙 폰트 |
| inline `<style>` | — | — | — | ✓ | **B 전용** — `.bb-*` 177 rule |

**요약:** R/M/F 는 14개 공통 CSS 전부 사용 · inline 0. B 는 공통 CSS 2개(tokens, board-factory의 chip만) + inline 1블록. **공통 CSS 12종(shell/components/project-overview/form-controls/drawer/table-selection/buttons/board-toolbar/board-filter/board-layout/custom-select/icons)을 B 가 전혀 사용하지 않음** = 격차의 정체.

---

## 4. Board Builder Gap Analysis

Board Builder 의 `.bb-*` 123 class 를 역할군으로 묶고 공통 승격 후보를 매핑한다. (현 시점엔 **승격 실행 아님 — 후보 기록**)

| 현재 `bb-*` (대표) | 역할 | 공통 승격 후보 | 대상 CSS 후보 | 우선순위 |
| --- | --- | --- | --- | --- |
| `.bb-scrollbar` `.bb-form-scroll` (+`--bb-scrollbar-*` token) | 스크롤바 톤/두께 | `.stam-scrollbar` + `--stam-scrollbar-*` | **신규 `stam.scrollbar.css`** (또는 tokens+components) | **P1** (이미 회차6에서 scope token화 + `TODO(v2 common)` 주석 표시) |
| `.bb-btn` `.bb-btn--primary/ghost/reset/sm` | 버튼 변형 | 기존 버튼 토큰과 통합 | `stam.buttons.css` | **P1** |
| `.bb-input` `.bb-select` `.bb-textarea` `.bb-lbl` `.bb-field` `.bb-hint` | 폼 컨트롤 | 공통 폼 컨트롤로 흡수 | `stam.form-controls.css` | **P1** |
| `.bb-tabs` `.bb-tab` `.bb-tab-note` `.bb-tabpanels` | 탭 | 공통 탭 컴포넌트 | `stam.components.css` | **P2** |
| `.bb-ptable` `.bb-th-chk` `.bb-td-chk` `.bb-id` `.bb-name` `.bb-user` `.bb-link` `.bb-rowbtn` | 미리보기 테이블 | 보드 테이블 렌더와 정합 | `stam.board-factory.css` / `stam.table-selection.css` | **P2** |
| `.bb-shell` `.bb-panel` `.bb-panel--form/--preview` `.bb-form-scroll` `.bb-form-foot` | 2-pane 고정 셸/스크롤 | `.stam-two-pane-shell` (신규) **또는** `board-layout` 확장 | `stam.board-layout.css` (확장) | **P2~P3** |
| `.bb-stats` `.bb-stat` `.bb-rp-head` | 요약 stat 카드 | 공통 stat/summary | `stam.components.css` | **P3** |
| `.bb-brd*` `.bb-mk-*` (board-mock topbar/header/fbar) | 예상 게시판 목업 | 실제 board-factory 미리보기로 대체 검토 | `stam.board-factory.css` (런타임 mount) | **P3** |
| `.bb-step*` `.bb-tpl-*` `.bb-fc-*` `.bb-adv-*` `.bb-chk` `.bb-iconbtn` | 단계형 입력 / 템플릿 카드 / 필드 카드 / 고급설정 | **Board Builder 고유 UX** → 당장 공통화 대상 아님(빌더 전용 컴포넌트로 유지하되 토큰/버튼/입력만 공통 흡수) | (보류) | **P4** |
| `.bb-tag` `.bb-taglist` `.bb-pgroup-h` `.bb-notice` `.bb-empty` `.bb-json*` `.bb-copy-status` | 미리보기 보조 | 일부 `components` 흡수 가능 | `stam.components.css` | **P4** |

**이미 부분 공통화된 접점:** `.bf-chip`/`.bf-chip--*`(board-factory.css tone) 은 Board Builder 미리보기 테이블에서 **그대로 재사용** 중 → tone chip 은 추가 승격 불필요(이미 공통).

**토큰 격차(승격 시 같이 정리할 것):** inline 에 하드코드된 값 — `--bb-muted:#94A3B8`, `rgba(15,23,42,.04~.06)` 그림자, board-mock 의 `--navy`/`rgba(84,81,232,…)` — 은 공통 token 후보(`--label-muted`, 그림자 토큰, brand tint). 색의 대부분은 이미 `var(--stam/--bg-*/--t*/--bd*/--r-*)` 토큰 사용 중.

---

## 5. Existing 3 Boards Commonization Review

"같은 CSS 를 link 하는가"를 넘어 **실제 class/DOM 구조**까지 비교한 결과:

### 5-1. DOM 구조 (3개 화면 동일)

```
.po-shell                              (project-overview 셸)
├─ header.po-topbar.stam-topbar        [data-stam-topbar]        → topbar-render
└─ .po-body
   ├─ nav.po-sidebar                   [data-stam-left-nav]      → nav-render(nav-data)
   └─ main.po-main
      ├─ section.po-ctx                [data-stam-project-context] → project-context-render
      └─ section.bf-page
         ├─ .bf-preview-note
         └─ #stam-board-factory-root   → STAM.boardFactory.mount(root, config)
                                          (toolbar/filter/summary/table/drawer 전부 엔진 렌더)
```

- **`po-` prefix 6종**(po-shell/po-topbar/po-body/po-sidebar/po-main/po-ctx) = **워크스페이스 App Shell 프레임**. 즉 `stam.project-overview.css` 는 "게시판 스타일"이 아니라 **게시판을 감싸는 프로젝트 워크스페이스 셸**(좌측 nav + 상단 topbar + project context 헤더)을 제공한다.
- 실제 게시판 본문(toolbar/filter/table/drawer)은 `#stam-board-factory-root` 안에 **board-factory 엔진**이 그리며, 스타일은 `board-factory/board-toolbar/board-filter/board-layout/table-selection/drawer/form-controls/custom-select/components` 가 담당. → 게시판 고유 스타일과 셸 스타일이 **이미 분리**되어 있다.

### 5-2. `stam.project-overview.css` 가 게시판에서 필요한 이유

- 세 화면은 **프로젝트 컨텍스트(좌측 nav, 상단 breadcrumb, project context 카드)** 안에서 게시판을 보여주기 위해 `.po-*` 셸을 그대로 채택한다. 즉 project-overview.css 는 **셸/페이지 프레임 용도로 정당하게 필요**하다 — "게시판 공통 스타일의 대용"으로 오용되고 있지 **않다**.
- 다만 **개념적 중복**이 존재한다: 3개 게시판의 `.po-shell/.po-body/.po-main` 2단 셸과 Board Builder 의 `.bb-wrap/.bb-shell` 2-pane 셸은 **서로 다른 구현으로 같은 "셸/레이아웃" 문제를 푼다**. → 후속 작업에서 **공통 셸/레이아웃 primitive** 후보로 기록(아래).
- **기록(후보):** 만약 향후 `.po-*` 의 일부 레이아웃 원시(2단/스크롤 컨테이너)를 게시판·빌더가 공유해야 한다면, 해당 부분을 `stam.board-layout.css`(또는 `stam.components.css`)로 **이동/추출**하는 것을 후보로 둔다. **단, 지금 `project-overview.css` 를 제거하거나 게시판에서 떼지 말 것**(3개 화면 회귀 위험). 현 단계는 "필요성 확인 + 이동 후보 기록"까지.

### 5-3. JS 공통화

- 3개 화면 모두 동일한 공통 JS 10종: `theme / nav-data / shell / nav-render / topbar-render / project-context-render / board-filter / custom-select / board-factory / board-configs`.
- 화면별 inline script 는 `navRender.init(id)` + `boardFactory.mount(root, config)` 2줄. **공통 renderer 100% 사용.**
- Board Builder 는 이 중 `theme` 만 공유하고, 나머지(shell/nav/topbar/project-context/filter/custom-select/board-factory/board-configs)를 **사용하지 않으며** 자체 `boardBuilderPreview` 컨트롤러로 동작(+ 공통 `board-field-schema`).

---

## 6. Recommended PR Sequence

| PR | 범위 | 회귀 보호 포인트 |
| --- | --- | --- |
| **PR-A** | **본 Audit 문서 생성**(현재) — 기반 진단/베이스라인 | 코드 변경 0 |
| **PR-B** | **scrollbar / 공통 token 승격**: `--bb-scrollbar-*` + `.bb-scrollbar` → `--stam-scrollbar-*` + `.stam-scrollbar`(신규 `stam.scrollbar.css` 또는 tokens). Board Builder 가 신규 공통 class 를 **opt-in** | 3개 게시판 무영향(신규 클래스 추가형) · Board Builder 시각 동일 |
| **PR-C** | **Board Builder inline CSS 일부 분리**: 버튼/입력/탭 등 **이미 공통이 있는 컴포넌트**부터 `.bb-*` → 공통 class 로 치환(또는 공통 CSS link 추가). inline `<style>` 축소 | Board Builder 단독 회귀 QA(회차 4~6 기능/레이아웃) |
| **PR-D** | **layout/toolbar/filter/table DOM 기준 통일**: 3개 게시판(po-shell+bf mount)과 Board Builder(bb-shell)의 셸/툴바/필터/테이블 DOM 계약을 정렬. 공통 2-pane/스크롤 primitive 추출 | 3개 게시판 DOM **대수정 금지** — 어댑터/추가형으로 점진 |
| **PR-E** | **Theme Preset / Design Import 준비**: 공통 token/component 가 정리된 뒤 테마 프리셋 레이어 | 토큰/컴포넌트 공통화 **완료 후** 착수 |

> 핵심 원칙: PR-B→C→D 로 **공통 기반을 먼저 쌓고**, 그 위에서만 PR-E(테마)를 올린다. 각 단계는 3개 게시판 회귀가 0임을 먼저 증명.

---

## 7. Do / Don't

**Do**

- 공통화는 **작은 단위로 승격**(scrollbar → 버튼/입력 → 탭/테이블 → 레이아웃/DOM → 테마).
- **기존 3개 게시판 회귀 테스트를 최우선**(route load / mount / toolbar·filter·table·drawer / light·dark / 1920·1366).
- Board Builder 에서 **검증된 UX(단계형 입력·고정 셸·내부 스크롤·scrollbar 톤)만 공통 후보**로 끌어올린다.
- Theme Preset 은 **공통 token/component 구조가 정리된 이후** 진행.
- 승격 시 **opt-in/추가형**(신규 공통 class 도입 후 화면이 선택 적용)으로 회귀 표면을 최소화.

**Don't**

- 한 번에 **모든 `.bb-*` 제거 금지**(123 class 일괄 치환 = 고위험).
- **기존 3개 게시판 DOM 대수정 금지**(config-swap 안정성 훼손 금지).
- **`project-overview.css` 를 바로 제거 금지**(3개 화면 셸 의존 — 이동은 추출/검증 후).
- **Theme Preset 먼저 구현 금지**(기반 없는 테마는 `.bb-*` 사유화 영역에 닿지 못함).
- **기능 JS 수정 금지**(board-factory 엔진 / board-builder controller 동작 변경 없이 스타일/구조 공통화부터).

---

## 8. Appendix — 측정값(기준 `736b5db`)

- CSS link 수: R/M/F = 각 15(공통 14 + font) · B = 3(공통 2 + font).
- inline `<style>`: R/M/F = 0 · B = 1 블록(177 rule, ~296줄).
- class prefix 사용량: R/M/F = `po-`6 / `stam-`1 / `bf-`2 / `bb-`0 · B = `bb-`123(+JS 렌더 `bf-chip` 재사용) / `po-`0 / `stam-`0.
- 공통 JS: R/M/F = 10종 + `boardFactory.mount` · B = 3종(theme + board-field-schema + board-builder-preview), `mount`/nav/shell **미사용**.
- 공통 renderer: R/M/F = `STAM.boardFactory.mount(root, config)` (config 만 상이) · B = `STAM.boardBuilderPreview.init(root)` (자체).
- Theme/token 대응: 4개 화면 모두 `stam.tokens.css` 소비 → **토큰 레벨 테마 대응 가능**. 단 B 는 컴포넌트가 `.bb-*` 사유화 → **컴포넌트 레벨 테마는 승격 후 가능**.
