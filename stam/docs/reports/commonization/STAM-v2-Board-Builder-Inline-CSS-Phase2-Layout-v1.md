# STAM v2 — Board Builder Inline CSS 분리 Phase 2: Layout/Shell (PR-C-2)

> 브랜치 `refactor/board-builder-inline-css-phase2-layout` · base `main` `550b067` (PR #148 merge 후).
> Audit(PR-A) 권장 PR-C **2차** — `board-builder.html` inline `<style>` 의 **layout/shell/header/actionbar/page-base** 를 기존 `stam/css/stam.board-builder.css` 로 추가 이동.
> **시각/DOM/JS/class명 변화 없음.** DESIGN.md / Theme Preset 아님.

---

## 1. 목적 (PR-C-2)

PR-C-1(버튼·입력폼·탭·템플릿 카드) 에 이어, inline 에 남아 있던 **페이지 기본/레이아웃 골격**을 `stam.board-builder.css` 로 옮긴다. field-card / preview / table / JSON / advanced 는 **이번에 건드리지 않는다**(PR-C-3 후보).

## 2. 이동한 CSS (inline → `stam.board-builder.css`)

| 그룹 | 이동한 selector |
| --- | --- |
| page/base | `* { box-sizing }` · `html, body { margin/padding }` · `html, body { height:100% }` · `body { … overflow:hidden }` |
| wrapper | `.bb-wrap`(+ `--bb-muted`·`--bb-shell-gap` local 변수 정의) |
| header | `.bb-head` · `.bb-head-r` · `.bb-back`(+`:hover`) · `.bb-eyebrow`(+` .bb-dot`) · `.bb-title` · `.bb-sub` · `.bb-theme`(+`:hover`) |
| shell/panel | `.bb-shell` · `.bb-panel` · `.bb-panel--form` · `.bb-form-scroll` · `.bb-form-foot` |
| action bar | `.bb-actions` · `.bb-actions-status` |
| narrow fallback | `@media (max-width: 1180px) { … }` 전체 |

- inline `<style>` **125 → 95 rule(-30)**, `stam.board-builder.css` **46 → 76 rule(+30)**.
- rule 텍스트(선언/값) 그대로 이동. **class명/DOM/JS/시각 변화 0.**

### cascade / 순서 보존
- `stam.board-builder.css` 는 `board-factory.css` 이후·inline `<style>` 이전 link(PR-C-1 와 동일). 이동한 layout group 과 PR-C-1 component group 은 **selector 가 겹치지 않아** 파일 내 순서 무관(시각 동일).
- **narrow `@media` 는 본 PR 섹션의 맨 끝**에 둔다 → `.bb-wrap`/`.bb-shell`/`.bb-panel`/`.bb-form-scroll`/`html,body`/`body` 의 base 정의 **뒤**에서 override(원본과 동일 순서).
- `.bb-wrap` 의 `--bb-muted`/`--bb-shell-gap` 은 element 에 정의되어 **상속**되므로, 파일이 바뀌어도 잔여 inline 의 `var(--bb-muted)` 사용처(예: `.bb-step-sub`/`.bb-fld-hint`/`.bb-drag`/`.bb-fc-uselbl`/`.bb-tag em` 등)가 정상 해석된다.

## 3. 이동하지 않은 CSS & 이유 (PR-C-3 후보)

- `.bb-step*` · `.bb-fld*` · `.bb-fields` · `.bb-fcard`/`.bb-fc-*`/`.bb-drag`/`.bb-chk*`/`.bb-adv*` → **field-card 복합 컴포넌트**(DnD·고급설정 토글). 상태 class 가 많아 별도 단계.
- `.bb-preview`/`.bb-rp-head`/`.bb-stats`/`.bb-tabpanels`/`.bb-tabpanel` · `.bb-brd*`/`.bb-mk-*` · `.bb-ptable*`/`.bb-th-chk`/`.bb-td-chk`/`.bb-id`/`.bb-name`/`.bb-user`/`.bb-link`/`.bb-rowbtn` · `.bb-notice` · `.bb-pgroup-h`/`.bb-taglist`/`.bb-tag*`/`.bb-empty` · `.bb-json*`/`.bb-copy-status` → **preview / table / JSON / board-mock**.
- scrollbar 관련(`.stam-scrollbar` 적용 주석 등) → 이미 공통화 완료(PR-B). 미변경.

## 4. PR-C-1 과의 관계

- PR-C-1: 버튼/입력폼/탭/템플릿 카드(컴포넌트) 분리 → `stam.board-builder.css` 생성.
- PR-C-2(본 PR): 같은 파일에 **layout/shell/header/actionbar/page-base** 추가 이동. 두 단계로 inline 171 → **95 rule**(누적 -76).
- 두 PR 모두 **이동만(리프트)**: 토큰/색/규칙/DOM/JS 불변.

## 5. DESIGN.md / Theme Preset 아님

위치 이동 안전 리팩터링. `stam.tokens.css` 미변경, Theme Preset/Design Import 미구현.

## 6. 다음 단계 (PR-C-3 후보)

1. **field-card** — `.bb-fcard`/`.bb-fc-*`/`.bb-chk*`/`.bb-adv*`/`.bb-drag`/`.bb-step*`/`.bb-fld*`.
2. **preview/table** — `.bb-preview`/`.bb-rp-head`/`.bb-stats`/`.bb-tabpanels`/`.bb-brd*`/`.bb-ptable*`.
3. **JSON/advanced** — `.bb-json*`/`.bb-tag*`/`.bb-notice` 등 잔여.

→ 완료 시 `board-builder.html` inline `<style>` 0(또는 최소)로 수렴. 각 단계 시각/DOM/JS 불변 + 3개 게시판 diff 0 증명.

## 7. 검증 결과

- 변경 파일: `stam/css/stam.board-builder.css`(append) · `stam/pages/boards-v2/board-builder.html`(inline 30 rule 제거 + 주석 보정) (+ 본 문서). 그 외 diff 0.
- CSS balance: inline `<style>` **95/95** · `stam.board-builder.css` **76/76** — BALANCED.
- 이동 selector 는 신규 파일에 존재 · inline 에 base-rule head(`*`/`html`/`body`)·layout rule **0**(잔여 `body` 토큰은 `.bb-step-body`/`.bb-fc-body`/`tbody` 등 다른 class). 유지 selector(field-card/preview/table/json) inline 그대로.
- `node --check` ×4 → **PASS** · `buildConfig` 13/13 · `init()` DOM smoke **PASS**.
- `stam/js/**` diff **0** · 기존 3개 boards-v2 게시판 diff **0** · `stam.tokens.css`/`stam.scrollbar.css`/`stam.board-factory.css`/`stam.components.css`/`stam.board-layout.css` diff **0** · `nav-data`/firebase/workflows diff **0** · API/Firestore/fetch 추가 **0**.
- **브라우저 시각 동일성(레이아웃·헤더·셸·액션바·narrow · light·dark · 1920·1366)은 사용자 QA(PENDING)** — 헤드리스 미가용. cascade 분석상 동일.
