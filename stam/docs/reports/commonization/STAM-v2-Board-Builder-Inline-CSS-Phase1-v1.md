# STAM v2 — Board Builder Inline CSS 분리 Phase 1 (PR-C-1)

> 브랜치 `refactor/board-builder-inline-css-phase1` · base `main` `2703f2b` (PR #147 merge 후).
> Audit(PR-A) 권장 순서의 **PR-C 1차** — Board Builder inline `<style>` 중 **비교적 안전한 컴포넌트 스타일**만 외부 CSS 로 분리.
> **시각/DOM/JS/class명 변화 없음.** DESIGN.md / Theme Preset 작업 아님. Board Builder 전체 공통화 아님.

---

## 1. 목적 (PR-C-1)

`board-builder.html` 의 대량 inline `<style>`(분리 전 171 rule)에서 **재사용·이식이 쉬운 컴포넌트 스타일**(버튼·입력폼·탭·템플릿 카드/칩)을 신규 `stam/css/stam.board-builder.css` 로 옮긴다. layout/shell/field-card/preview/table/scrollbar 같은 **복잡·구조적** 스타일은 이번에 건드리지 않는다(PR-C-2 후보).

## 2. 분리한 CSS 범위 (inline → `stam.board-builder.css`)

| 그룹 | 이동한 selector |
| --- | --- |
| ① 버튼 | `.bb-btn` · `--primary`(+`:hover`) · `--ghost`(+`:hover`) · `--sm` · `--reset`(+`:hover`) · `.bb-iconbtn`(+`:hover:not(:disabled)`·`:disabled`) · `.bb-iconbtn--del:hover:not(:disabled)` · `.bb-addfield`(+`:hover`) |
| ② 입력폼 | `.bb-form-grid` · `.bb-field`(+`.bb-full`) · `.bb-lbl`(+` .bb-opt`) · `.bb-input,.bb-select,.bb-textarea` · `.bb-select`(svg arrow) · `.bb-textarea` · `…:focus` · `.bb-input[readonly]` · `.bb-hint` · `.bb-slug-row`(+` .bb-input`·` .bb-autobtn`) |
| ③ 탭 | `.bb-tabs` · `.bb-tab`(+`:hover`·`.is-active`) · `.bb-tab-note` |
| ④ 템플릿 카드/상단 chip | `.bb-chips` · `.bb-sc`(+`--preview`) · `.bb-tpl-grid`(+`@media (max-width:1320px) and (min-width:1181px)`) · `.bb-tpl-card`(+`:hover`·`.is-sel`) · `.bb-tpl-ico` · `.bb-tpl-name` · `.bb-tpl-desc` · `.bb-tpl-note` |

- 이동량: **inline 46 rule-block** → `stam.board-builder.css`. inline `<style>` 171 → **125 rule**.
- **class명/DOM/JS/시각 변화 0.** rule 텍스트(선언/값) 그대로 이동.

### cascade 보존
`stam.board-builder.css` 는 `board-factory.css` **이후**, inline `<style>` **이전**에 link. 따라서 inline 에 남은 override 규칙(예: `.bb-fc-name`/`.bb-fc-type`/`.bb-fc-opts`/`.bb-adv-key` 가 base `.bb-input`/`.bb-select` 의 padding·font 를 덮어쓰는 부분)이 **여전히 외부 규칙보다 뒤(source order)** 라 동일하게 우선한다 → **시각 결과 불변**.

## 3. 분리하지 않은 범위 & 이유

- `*` · `html` · `body` · `.bb-wrap` · `.bb-head*`/`.bb-eyebrow`/`.bb-title`/`.bb-sub`/`.bb-theme` · `.bb-shell` · `.bb-panel*` · `.bb-form-scroll` · `.bb-form-foot` · narrow `@media` fallback → **layout/shell 구조**(viewport 고정·내부 스크롤). 회귀 위험이 커서 보류.
- `.bb-step*` · `.bb-fld*` · `.bb-fields` · `.bb-fcard`/`.bb-fc-*`/`.bb-drag`/`.bb-chk*`/`.bb-adv*` → **field-card 복합 컴포넌트**(DnD·고급설정 토글 등). 구조·상태 class 가 많아 별도 단계로.
- `.bb-preview`/`.bb-rp-head`/`.bb-stats`/`.bb-tabpanels`/`.bb-brd*`/`.bb-ptable*`/`.bb-json*`/`.bb-notice`/`.bb-tag*` → **preview/table/board-mock**. 엔진 미리보기 정합과 함께 다뤄야 함.
- `.bb-actions`/`.bb-actions-status` → action **bar 레이아웃**(버튼 변형 `.bb-btn*` 만 분리, 컨테이너는 유지).
- scrollbar 관련(`.stam-scrollbar` 적용 등) → 이미 PR-B/PR-C follow-up 에서 공통화 완료. 추가 변경 없음.

## 4. DESIGN.md / Theme Preset 아님

본 작업은 **위치만 옮기는 안전 리팩터링**이다. 디자인 토큰/색/규칙을 바꾸지 않으며(`stam.tokens.css` 미변경), Theme Preset/Design Import 도 구현하지 않는다.

## 5. 다음 단계 (PR-C-2 후보)

1. **layout/shell** — `.bb-wrap`/`.bb-shell`/`.bb-panel*`/`.bb-form-scroll`/`.bb-form-foot` + narrow fallback. 가능하면 공통 2-pane/스크롤 primitive 와 정합.
2. **field-card** — `.bb-fcard`/`.bb-fc-*`/`.bb-chk*`/`.bb-adv*`/`.bb-drag` (DnD·고급설정 상태 포함).
3. **preview/table** — `.bb-preview`/`.bb-rp-head`/`.bb-stats`/`.bb-tabpanels`/`.bb-brd*`/`.bb-ptable*`/`.bb-json*`/`.bb-tag*`.

각 단계는 본 PR 과 동일하게 **시각/DOM/JS 불변 + 3개 게시판 diff 0** 을 먼저 증명.

## 6. 검증 결과

- 변경 파일: `stam/css/stam.board-builder.css`(신규) · `stam/pages/boards-v2/board-builder.html`(link 추가 + inline 46 rule 제거) (+ 본 문서). 그 외 diff 0.
- CSS balance: inline `<style>` **125/125** · `stam.board-builder.css` **46/46** — BALANCED.
- 이동 selector 는 신규 파일에 존재 · inline 에 rule 정의 **0**(주석 참조만 잔존). 유지 selector 는 inline 그대로.
- `node --check` ×4 (board-builder-preview / field-schema / board-factory / board-configs) → **PASS**.
- `buildConfig` 회귀 **13/13** · `init()` DOM smoke **PASS**.
- `stam/js/**` diff **0**(JS 무변경) · 기존 3개 boards-v2 게시판 diff **0** · `stam.tokens.css`/`stam.scrollbar.css`/`stam.board-factory.css`/`stam.components.css`/`stam.board-layout.css` diff **0** · `nav-data`/firebase/workflows diff **0** · API/Firestore/fetch 추가 **0**.
- **브라우저 시각 동일성(버튼/입력/탭/템플릿 카드 · light·dark)은 사용자 QA(PENDING)** — 헤드리스 브라우저 미가용. cascade 분석상 동일.
