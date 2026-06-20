# STAM v2 — Board Builder Inline CSS 분리 Phase 3 + 완료 (PR-C-3A ~ 3D)

> base `main` `e0ecdbbf` (PR #159 merge 후). Audit(PR-A) 권장 PR-C **3차(최종)** — `board-builder.html` inline `<style>` 의 **field-card / preview·board-mock / table·JSON·notice·tag·meta / steps** 를 `stam/css/stam.board-builder.css` 로 순차 이동하고, 마지막으로 **inline `<style>` 블록을 완전히 제거**.
> **시각/DOM/JS/class명/선언값 변화 없음.** 위치만 옮긴 리팩터링. DESIGN.md / Theme Preset 아님.

---

## 1. 요약 (Completion)

- **Board Builder inline CSS 분리 완료.** `board-builder.html` 의 inline `<style>` **블록 자체가 제거**되어 페이지에 inline CSS 가 0 이다.
- Board Builder 전용 `bb-` 스타일은 **`stam/css/stam.board-builder.css` 한 파일로 일원화**되었다.
- 기능/DOM/JS 변경 없이 **CSS 위치만** 정리한 안전 리팩터링이다. 각 단계에서 이동 CSS 의 **선언 단위 동일성**을 검증했다.
- 누적 경위: **PR-C-1**(컴포넌트, #148) → **PR-C-2**(layout/shell, #149) → **PR-C-3A~3D**(field-card·preview·table·JSON·steps + `<style>` 제거).

## 2. 완료 PR 목록 (Phase 3)

| 단계 | PR | merge commit | 이동/작업 범위 |
| --- | --- | --- | --- |
| PR-C-3A | **#152** | `416dcb00` | **field-card** — `.bb-fld-*` · `.bb-fields` · `.bb-fcard`(`:hover`/`.is-system`/`.is-dragging`/`.drop-before`/`.drop-after`/`--new`) · `@keyframes bb-fcard-flash` · `@media (prefers-reduced-motion) .bb-fcard--new` · `.bb-fc-main`/`-rail`/`-no`/`-body`/`-row1`/`-row2`/`-name`/`-type`/`-lock`/`-uselbl`/`-sep`/`-opts`/`-actions`/`-adv-*` · `.bb-drag`(`:active`) · `.bb-fchip` · `.bb-chk`(`input`/`--req`/`.is-on`/`.is-locked`) · `.bb-adv-row`/`-k`/`-v`/`-key` |
| PR-C-3B | **#157** | `cf307b9d` | **right preview / board mock** — `.bb-preview` · `.bb-rp-head`/`-ttl` · `.bb-stats`(+ `@media (max-width:560px)`) · `.bb-stat`/`-n`/`-l` · `.bb-tabpanels` · `.bb-tabpanel`/`[hidden]` · `.bb-brd`/`-top`/`-top-ttl`/`-top-badge`/`-hdr`/`-hdr-ttl`/`-hdr-acts` · `.bb-mk-pri`/`-sec`/`-search`/`-chip` · `.bb-brd-fbar` · `.bb-brd-tblwrap` |
| PR-C-3C | **#158** | `e53af84d` | **table / JSON / notice / tag / meta** — `.bb-ptable`/`th`/`td`/`tbody tr:last-child td` · `.bb-th-chk, .bb-td-chk` · `.bb-id` · `.bb-name` · `.bb-user` · `.bb-link` · `.bb-rowbtn` · `.bb-json-bar` · `.bb-copy-status` · `.bb-json` · `.bb-notice`/`code` · `.bb-pgroup-h` · `.bb-taglist` · `.bb-tag`/`em`/`.bb-req` · `.bb-empty` |
| PR-C-3D | **#159** | `e0ecdbbf` | **steps 이동 + inline `<style>` 완전 제거** — `.bb-step` · `.bb-step + .bb-step` · `.bb-step-hdr` · `.bb-step-n` · `.bb-step-lbl` · `.bb-step-sub` · `.bb-step-body`. 이동 후 `board-builder.html` 의 `<style>…</style>` 블록 삭제(마감). |

각 단계는 `stam.board-builder.css` **파일 끝에 `PR-C-3A/3B/3C/3D` 섹션으로 append** — 이동 selector 가 기존 규칙과 겹치지 않아 **cascade 중립**.

## 3. 최종 파일 기준 (Source of Truth)

### `stam/pages/boards-v2/board-builder.html`
- **구조/markup 만 보유.** inline `<style>` **없음**(태그 0).
- `<head>` 의 스타일 출처는 link 뿐:
  - `../../css/stam.tokens.css` (token)
  - `../../css/stam.scrollbar.css` (공통 `.stam-scrollbar` helper)
  - `../../css/stam.board-factory.css` (chip tone 재사용)
  - **`../../css/stam.board-builder.css`** (Board Builder 전용 `bb-` 스타일 전체)
- 확인: main `e0ecdbbf` blob `5ccbaae` 기준 `<style>`/`</style>` 토큰 0, `.bb-step`/`.bb-preview`/`.bb-ptable`/`.bb-json`/`.bb-notice` CSS 규칙 0.

### `stam/css/stam.board-builder.css`
- Board Builder 전용 `bb-` 스타일 **전체** 보유. 섹션 구성:
  - **PR-C-1** — 버튼(`.bb-btn*`/`.bb-iconbtn*`/`.bb-addfield`) · 입력폼(`.bb-form-grid`/`.bb-field`/`.bb-input·select·textarea`/`.bb-slug-row*`) · 탭(`.bb-tabs`/`.bb-tab*`) · 템플릿 카드·상단 chip(`.bb-chips`/`.bb-sc*`/`.bb-tpl-*`)
  - **PR-C-2** — page base · `.bb-wrap`(+ `--bb-muted`/`--bb-shell-gap` local 변수) · header · shell/panel · action bar · narrow `@media(max-width:1180px)`
  - **PR-C-3A** — field section · field-card (+ `@keyframes bb-fcard-flash` · reduced-motion)
  - **PR-C-3B** — right preview panel · board mock
  - **PR-C-3C** — preview table · JSON · notice/tag/meta
  - **PR-C-3D** — steps
- scrollbar 톤은 본 파일에 규칙 없음 — 공통 `stam.scrollbar.css` 의 `.stam-scrollbar` helper 가 담당(`.bb-form-scroll`/`.bb-tabpanels`/`.bb-brd-tblwrap`/`.bb-json`/`.bb-adv-v` 에 markup·JS 가 직접 class 적용).

## 4. 유지된 기능 (리팩터링으로 영향 없음)

PR #150 ~ #156 에서 확정된 Board Builder UX 는 본 분리 작업으로 변경되지 않았다.

- **템플릿 선택 시 실제 필드 세트 적용** (`TEMPLATE_FIELD_PRESETS`, PR #156) — 편집 상태면 confirm, 적용 후 상태 메시지(2.6s 자동 제거).
- **ID/제목 고정 필드** (`isPinned`/`pinnedCount`/`normalizeOrder`, PR #154) — 드래그 불가, 항상 1·2번, 일반 필드는 위/사이 이동 불가.
- **일반 필드 드래그앤드롭** 순서 변경 (`moveFieldTo`).
- **카드별 `＋` 는 누른 카드 바로 아래 삽입** (고정 블록 아래로 clamp, PR #151).
- **신규 필드 stroke 2회 깜빡임 + name input focus** (`.bb-fcard--new`, PR #151).
- **미리보기 샘플 row 9개** (`SAMPLE_ROW_COUNT`, PR #155).
- **preview / JSON / 생성 결과** 정상 (`buildConfig` 무변경, idKey `id`/nameKey `title` 고정).
- **localStorage preview 기준 유지** — 실제 DB 저장 아님.
- **Firestore / API / fetch 없음.**
- (그 외: `↑/↓` 이동 버튼 제거(#150), 드래그 핸들 hit area 확대(#153).)

## 5. 금지 기준 (후속 작업자용)

1. **앞으로 `board-builder.html` 에 새 inline `<style>` 추가 금지.** 페이지는 markup 만 유지한다.
2. **Board Builder 전용 스타일은 `stam/css/stam.board-builder.css` 에 추가**한다(해당 섹션 또는 신규 섹션).
3. **공통 스타일**(여러 화면 공유)은 공통 CSS/`stam.tokens.css` 기준을 먼저 검토 후 추가한다 — board-builder 전용 파일에 공통 스타일을 넣지 않는다.
4. **기능 변경 PR 과 CSS 리팩터링 PR 을 섞지 않는다.** 위치 이동은 "선언 단위 동일성 + cascade 중립"만, 기능은 별도 PR.
5. **`stam/js/stam.nav-data.js` / App Shell / Left Navigation / Topbar / Firebase 설정 / GitHub Actions workflow 는 별도 승인 없이 변경 금지.**
6. CSS 이동 시 **파일 끝 append(cascade 중립)** 와 **선언 단위 정규화 동일성 검증**을 유지한다.

## 6. QA 결과 요약

각 PR 공통 검증:

- **선언 단위 동일성** — 이동 전(원본 inline) ↔ 이동 후(css append) 정규화 비교 `EQUAL: True`(공백/들여쓰기만 차이, selector·선언·순서 동일).
- **JS diff 없음** · `node --check` PASS.
- **guarded path diff 없음** — `stam/js/**` · `stam.nav-data.js` · 기존 boards-v2 제품 페이지(requirements/functional-specification/menu-screen-list/index) · Firebase · Actions workflow · App Shell/Left Nav/Topbar.
- **jsdom 실 DOM 회귀 50/50 PASS** — 템플릿 적용 · 드래그앤드롭 · 카드별 `＋` 아래 삽입 · 신규 stroke 강조+focus · ID/제목 고정 · 삭제 · 시스템 삭제 잠금 · 고급 설정 · 9 row · preview/JSON · 콘솔 error 0.
- **board config JSON 구조 / Firestore·API·fetch 무변경.**

배포(staging, `firebase-hosting-staging.yml` `workflow_dispatch`, target `staging` / channel `live` / site `stam-design-staging`):

| 단계 | merge commit | deploy run | 결과 |
| --- | --- | --- | --- |
| PR-C-3A #152 | `416dcb00` | `27859745680` | success |
| PR-C-3B #157 | `cf307b9d` | `27861667685` | success |
| PR-C-3C #158 | `e53af84d` | `27861894752` | success |
| PR-C-3D #159 | `e0ecdbbf` | `27862080226` | success |

- **PR preview check 의 Firebase `429 channel quota`** 는 PR 별 preview 채널 생성 한도(`stam-design-staging`) 초과 = **인프라 이슈**로, 코드와 무관하며 비차단 처리. staging `live` 채널 배포(위 표)는 동일 이슈 없이 success.
- **브라우저 시각 동일성**(steps/단계 카드 · 우측 preview · 통계 카드 · table · JSON · light/dark · 1920/1366/좁은 화면)은 선언값 무변경(token 동일)으로 보존되며, 최종 확인은 staging 사용자 QA 기준.

## 7. 분리 시리즈 lineage

| Phase | PR | 분리 범위 | 문서 |
| --- | --- | --- | --- |
| Phase 1 | #148 | 버튼/입력폼/탭/템플릿 카드(컴포넌트) → `stam.board-builder.css` 생성 | `STAM-v2-Board-Builder-Inline-CSS-Phase1-v1.md` |
| Phase 2 | #149 | page base / layout / shell / header / action bar / narrow fallback | `STAM-v2-Board-Builder-Inline-CSS-Phase2-Layout-v1.md` |
| **Phase 3** | **#152 · #157 · #158 · #159** | **field-card / preview·board-mock / table·JSON·notice / steps + `<style>` 제거(마감)** | **본 문서** |

→ inline `<style>` **171 rule → 0**(블록 제거). Board Builder 의 모든 `bb-` 스타일이 `stam.board-builder.css` 로 수렴, `board-builder.html` 는 markup 전용으로 마감.
