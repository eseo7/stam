# STAM v2 — Common Scrollbar Foundation v1 (PR-B)

> 브랜치 `refactor/v2-common-scrollbar-foundation` · base `main` `1ae3188` (PR #146 merge 후).
> **PR-A Audit(`STAM-v2-Board-Common-Foundation-Audit-v1.md`)의 권장 순서 중 첫 번째 공통 승격** 작업.
> 범위: **scrollbar 토큰/헬퍼 공통화만**. Board Builder 전체 inline CSS 분리·3개 게시판 DOM 대수정·Theme Preset 은 **이번 PR 아님**.

---

## 1. 목적

Board Builder(회차 6)에 임시로 둔 scope 한정 scrollbar 구조(`--bb-scrollbar-*` + `.bb-scrollbar`)를 **STAM v2 공통 디자인 시스템으로 승격**한다. Audit 의 Gap Analysis P1 항목.

- `--bb-scrollbar-*` (Board Builder `.bb-wrap` scope) → **`--stam-scrollbar-*`** (`stam.tokens.css` `:root` 공통 token)
- `.bb-scrollbar` (Board Builder inline helper) → **`.stam-scrollbar`** (`stam.css/stam.scrollbar.css` 공통 helper)

## 2. 변경 파일

| 파일 | 상태 | 내용 |
| --- | --- | --- |
| `stam/css/stam.tokens.css` | 수정(append) | `:root` 끝에 `--stam-scrollbar-size/track/thumb/thumb-hover` 4종 추가. 기존 token 변경 0. |
| `stam/css/stam.scrollbar.css` | **신규** | 공통 `.stam-scrollbar` helper (Firefox `scrollbar-width/-color` + WebKit `::-webkit-scrollbar*` track/thumb/hover/corner). |
| `stam/pages/boards-v2/board-builder.html` | 수정 | `stam.scrollbar.css` link 추가 · `.bb-wrap` 의 `--bb-scrollbar-*` 제거 · 좌측 `.bb-form-scroll` 에 `.stam-scrollbar` class 적용 · JS 렌더 스크롤 영역은 공통 `--stam-scrollbar-*` token 으로 위임 · `.bb-scrollbar` inline helper 제거. |
| `stam/docs/reports/commonization/STAM-v2-Common-Scrollbar-Foundation-v1.md` | 신규 | 본 문서. |

**미변경(가능하면 수정 금지 준수):** `stam/js/**` diff 0 · 기존 3개 boards-v2 화면(requirements/menu-screen-list/functional-specification) diff 0 · `stam.board-factory.css` / `stam.components.css` / 기타 전역 CSS diff 0 · `nav-data` / shell·topbar·filter·custom-select / firebase / workflows diff 0 · API/Firestore/fetch 추가 0.

## 3. 공통 token (stam.tokens.css)

```css
:root {
  /* … 기존 token … */
  --stam-scrollbar-size:        8px;
  --stam-scrollbar-track:       var(--bg-sur2);
  --stam-scrollbar-thumb:       var(--bd-s);
  --stam-scrollbar-thumb-hover: var(--t3);
}
```

- **light/dark 자동 대응:** track/thumb/hover 가 모두 **theme token**(`--bg-sur2` / `--bd-s` / `--t3`)을 참조한다. 이들은 `[data-theme="dark"]` 에서 override 되고 `var()` 는 사용 시점에 lazy 해석되므로, `--stam-scrollbar-*` 를 `:root` 에만 정의해도 다크모드에서 자동으로 다크 값으로 풀린다. **별도 dark override 불필요.**
- 기존 token naming/구조 유지, 기존 값 변경 0.

## 4. 공통 helper (stam.scrollbar.css)

`.stam-scrollbar` 하나로 세로/가로 스크롤바를 동일 톤(thin · rounded 999px · 8px)으로 통일. token 만 참조하므로 어느 화면이든 element 에 class 만 추가하면 동일 적용(opt-in).

## 5. Board Builder 적용 & `.bb-scrollbar` 의존 축소

| 스크롤 영역 | 적용 방식 | JS 변경 |
| --- | --- | --- |
| 좌측 내부 스크롤 `.bb-form-scroll` (static HTML) | element 에 **`.stam-scrollbar` class 직접 적용** → 공통 helper 사용 | 없음 |
| 우측 Preview 탭 내용 `.bb-tabpanels` (JS 렌더) | inline 규칙을 공통 **`--stam-scrollbar-*` token** 으로 위임 | 없음 |
| 테이블 가로 `.bb-brd-tblwrap` (JS 렌더) | 동일(공통 token 위임) + corner | 없음 |
| JSON `.bb-json` · 고급 매핑 `.bb-adv-v` (JS 렌더) | 동일(공통 token 위임) | 없음 |

- **`--bb-scrollbar-*` 제거 완료** — Board Builder 는 더 이상 자체 scrollbar token 을 정의하지 않는다.
- **`.bb-scrollbar` inline helper 제거 완료** — 공통 `.stam-scrollbar` 로 대체.
- **JS 변경 0:** JS 렌더 element(`.bb-tabpanels`/`.bb-brd-tblwrap`/`.bb-json`/`.bb-adv-v`)에 class 를 붙이려면 `stam.board-builder-preview.js` 수정이 필요하므로, 이번 PR 은 **공통 token 으로 selector 위임**만 해 JS 를 건드리지 않았다. (후속 PR-C 에서 JS 렌더 문자열에 `.stam-scrollbar` class 채택 → inline 규칙 추가 제거 예정 — class 추가 수준의 변경.)
- 톤 차이: 기존 hover `--bb-muted(#94A3B8)` → 공통 `--stam-scrollbar-thumb-hover: var(--t3)`(light #64748B). 더 또렷한 hover, light/dark 모두 안전.

## 6. 기존 3개 게시판 영향

- 3개 게시판 HTML/DOM/class **이번 PR 미변경**(diff 0). `stam.scrollbar.css` 는 해당 화면들이 **link 하지 않으므로** 자동 영향 없음. `stam.tokens.css` 는 **token 추가만**(기존 값/규칙 변경 0)이라 회귀 표면 없음.
- 향후 PR-C/PR-D 에서 3개 게시판도 필요 시 `.stam-scrollbar` 를 **opt-in** 채택 가능(이번 PR 범위 아님).

## 7. Theme Preset

- **이번 PR 에서 구현하지 않음.** 공통 token/helper 기반만 마련. Theme Preset 은 Audit 권장 순서상 PR-E.

## 8. 다음 단계

- **PR-C** — Board Builder inline CSS 분리(버튼/입력/탭부터 공통 컴포넌트로). 이때 JS 렌더 스크롤 영역에 `.stam-scrollbar` class 채택 → 본 PR 의 inline 위임 규칙 제거.
- 이후 PR-D(layout/DOM 통일) → PR-E(Theme Preset).

## 9. 검증

- 변경 파일: `stam.tokens.css` / `stam.scrollbar.css`(신규) / `board-builder.html` (+ 본 문서). 그 외 diff 0.
- CSS 중괄호 balance: `stam.tokens.css` 22/22 · `stam.scrollbar.css` 6/6 · `board-builder.html` inline 177/177 — **BALANCED**.
- `node --check` ×4 (board-builder-preview / field-schema / board-factory / board-configs) → **PASS** (JS 미변경).
- `buildConfig` 회귀 13/13 · `init()` DOM smoke **PASS**.
- `--bb-scrollbar-*` / `.bb-scrollbar` 코드 잔존 0(주석의 "제거됨" 표기 제외).
- 기존 3개 게시판 diff 0 · `stam.js/**` diff 0 · nav-data/firebase/workflows diff 0 · API/Firestore/fetch 0.
- **실제 브라우저 시각(좌/우/테이블 scrollbar light·dark)은 사용자 QA(PENDING)** — 헤드리스 브라우저 미가용.

## 10. Follow-up — JS 렌더 영역에 `.stam-scrollbar` 직접 적용 (PR #147 추가 커밋)

> PR #147 동일 브랜치 추가 커밋. scrollbar class 적용 정리만 — 새 PR 없음, Ready/merge/deploy 없음.

- **초안 상태(§5):** 우측 JS 렌더 스크롤 영역(`.bb-tabpanels` / `.bb-brd-tblwrap` / `.bb-json` / `.bb-adv-v`)은 board-builder.html inline `<style>` 안에서 `.bb-*` selector 로 공통 `--stam-scrollbar-*` token 만 **위임**하고 있었다(JS 무변경 우선).
- **follow-up:** `stam/js/stam.board-builder-preview.js` 의 **렌더 문자열에 `.stam-scrollbar` class 를 직접 추가**했다 — `class="bb-tabpanels stam-scrollbar"`, `class="bb-brd-tblwrap stam-scrollbar"`, `class="bb-json stam-scrollbar"`, `class="bb-adv-v stam-scrollbar"`(2곳). **class 추가만 — 이벤트/ data attribute / localStorage key / buildConfig / 탭·Preview 구조 로직 변경 0.**
- **inline 위임 규칙 제거:** board-builder.html inline `<style>` 의 `.bb-tabpanels, .bb-brd-tblwrap, .bb-json, .bb-adv-v` scrollbar 전용 규칙(`scrollbar-width/-color` + `::-webkit-scrollbar*` track/thumb/hover/corner)을 **전부 삭제**. 이제 Board Builder 안에 scrollbar 전용 `.bb-*` 규칙/토큰이 **0**.
- **결과:** scrollbar 시각 제어가 **`stam.scrollbar.css`(`.stam-scrollbar`) + `--stam-scrollbar-*` token 으로 완전히 이동**. 좌측 `.bb-form-scroll`(static) + 우측 4개 JS 렌더 영역 모두 공통 helper class 사용으로 일원화.
- **남은 작업:** Board Builder **전체 inline CSS 분리는 여전히 PR-C 대상**(이번 작업은 scrollbar 한정).
- **검증(추가 커밋):** `--bb-scrollbar-*` / `.bb-scrollbar` / `.bb-*::-webkit-scrollbar` 잔존 0 · JS 렌더 문자열 `.stam-scrollbar` 5곳 존재 · inline CSS 171/171 BALANCED · `node --check` ×4 PASS · `buildConfig` 13/13 · DOM smoke PASS · JS diff = class 문자열 추가 5건뿐(로직 0) · 기존 3개 게시판 diff 0 · `stam.tokens.css`/`stam.scrollbar.css` 추가 변경 0 · API/Firestore/fetch 0 · nav/firebase/workflow 0.
