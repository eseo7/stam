# STAM — Claude Code 프로젝트 규칙

STAM 저장소에서 Claude Code / Claude Design / Cursor가 화면·기능을 작업할 때 반드시 따르는 거버넌스 규칙이다.

## 에이전트 필수 문장

1. 새 화면은 그리는 것이 아니라 기존 STAM 공통 컴포넌트를 조립한다.
2. 작업 전 사용할 기존 클래스/함수 목록을 먼저 보고한다.
3. diff에 새 CSS/JS 파일 또는 inline style/script가 있으면 작업 실패다.
4. 필요한 컴포넌트가 없으면 임의 생성하지 말고 멈춰서 보고한다.

---

## 1. STAM 작업 절대 원칙

1. 새 화면/기능 작업은 "그리기"가 아니라 **기존 공통 컴포넌트 조립**이다.
2. 작업 시작 전 반드시 기존 공통 CSS/JS/Guide를 먼저 확인한다.
3. **새 CSS/JS 파일 생성은 기본 실패 조건**이다.
4. **inline `style=""`, `<style>`, inline `<script>` 작성은 기본 실패 조건**이다.
5. **하드코딩 색상/간격/폰트는 금지**한다. `stam.tokens.css`의 CSS 변수만 사용한다.
6. 필요한 컴포넌트가 없으면 임의 생성하지 말고 멈춰서 보고한다.
7. **승인 없이 공통 CSS/JS를 확장하지 않는다.**
8. 화면 파일 안에 새 컴포넌트 정의(DOM 구조·클래스·스타일 블록)를 만들지 않는다.
9. diff에 새 CSS/JS 파일 또는 inline style/script가 있으면 작업 실패다.
10. 기본 폰트는 **에스코어드림(S-CoreDream)**. 시스템 폰트/꼬딕씨로 임의 변경 금지.

---

## 2. 작업 시작 전 필수 확인

STAM 화면·문서 작업을 시작하기 전 아래 파일을 **반드시** 읽고, 작업 전 사용할 기존 클래스/함수 목록을 먼저 보고한다.

| 구분 | 경로 |
|------|------|
| 토큰 | `stam/css/stam.tokens.css` |
| 셸 | `stam/css/stam.shell.css` |
| 컴포넌트 | `stam/css/stam.components.css` |
| 문서(docs) 전용 CSS — 제품 화면 사용 금지 | `stam/css/stam.docs.css` |
| 문서(docs) 전용 CSS — 제품 화면 사용 금지 | `stam/css/stam.ui-baseline-guide.css` |
| 테마 JS | `stam/js/stam.theme.js` |
| 셸 JS | `stam/js/stam.shell.js` |
| Left Nav 렌더 | `stam/js/stam.nav-render.js` |
| Topbar 렌더 | `stam/js/stam.topbar-render.js` |
| Project Context 렌더 | `stam/js/stam.project-context-render.js` |
| 컴포넌트 가이드 | `stam/docs/STAM-Component-Guide.html` |
| 버튼 가이드 | `stam/docs/components/STAM-Button-Guide.html` |
| 에이전트 인벤토리 | `stam/docs/STAM-Agent-Component-Inventory.html` |

---

## 3. 새 CSS/JS/DOM 생성 금지

- `stam/css/**`, `stam/js/**`에 **새 파일을 만들지 않는다** (승인·별도 PR 없이).
- 페이지 HTML에 `<style>` 블록, `style=""` 속성, inline `<script>` 본문을 **작성하지 않는다**.
- 외부 CDN(CSS/JS/폰트)을 **추가하지 않는다**.
- 기존에 없는 CSS 클래스명·JS 함수·DOM 패턴을 **임의로 발명하지 않는다**.
- 화면별 전용 CSS가 이미 존재하는 경우, 해당 파일을 **수정하지 않고** 기존 클래스만 조합한다 (전용 CSS 수정도 승인 필요).

---

## 4. 기존 공통 코드 사용 기준

### CSS (제품 화면)

- 색·간격·폰트·radius: `stam.tokens.css` 변수 (`--brand`, `--t1`, `--bd`, `--r-md`, `--font` 등).
- 앱 셸·Left Nav·Topbar: `stam.shell.css` (`.po-sidebar`, `.po-topbar`, `.doc-nav` 등).
- 버튼·배지·요약 스트립 등: `stam.components.css` (`.stam-btn--primary`, `.stam-btn--secondary`, `.stam-btn--ghost`, `.stam-btn--danger`, `.stam-btn--icon-only`, `.sbadge`, `.stam-summary-strip` 등).

### CSS (문서 docs 전용 — 제품 화면 사용 금지)

- `stam/css/stam.docs.css` — 문서(docs) 전용 스타일, 제품 화면 사용 금지
- `stam/css/stam.ui-baseline-guide.css` — 문서(docs) 전용 스타일, 제품 화면 사용 금지

### JS (제품 화면)

- 테마: `STAM.toggleTheme()`, `STAM.setTheme()`, `STAM.getTheme()` — `stam.theme.js`
- Left Nav: `<nav class="po-sidebar" data-stam-left-nav>` + `STAM.navRender.init('메뉴코드')` — `stam.nav-render.js`
- Topbar: `<header class="po-topbar stam-topbar" data-stam-topbar data-tb-crumbs="...">` + `STAM.topbarRender.init()` — `stam.topbar-render.js`
- Sidebar/카드/메뉴 테이블: `STAM.shell.renderSidebar()`, `STAM.shell.renderRootCards()`, `STAM.shell.renderMenuTable()` — `stam.shell.js`
- Project Context: `<div class="po-ctx" data-stam-project-context ...>` + `STAM.projectContextRender.init()` — `stam.project-context-render.js`

### DOM

- 제품 페이지는 Baseline Guide·Component Guide에 정의된 **기존 마크업 패턴**을 복제·조합한다.
- `data-stam-left-nav`, `data-stam-topbar`, `data-theme-toggle` 등 **기존 data-attribute 계약**을 따른다.

---

## 5. 필요한 컴포넌트가 없을 때 처리

1. **작업을 즉시 중단**한다.
2. 임의 CSS/JS/DOM을 만들지 않는다.
3. 아래를 보고한다:
   - 필요한 UI/동작 설명
   - 기존 가이드·CSS·JS에서 찾은 유사 항목 (없으면 "없음")
   - 공통 CSS/JS 확장 또는 가이드 보완이 필요한지 여부
4. **승인·가이드·공통 코드 추가 PR**이 먼저 완료된 후 화면 작업을 재개한다.

---

## 6. 화면 작업 결과 FAIL 조건

다음 중 **하나라도** 해당하면 작업 실패(FAIL)이다.

- diff에 `stam/css/**` 또는 `stam/js/**` **신규 파일** 포함
- diff에 inline `style=""`, `<style>`, inline `<script>` 본문 포함
- 하드코딩 색상(`#5451E8` 등 직접 지정), px/rem 임의 간격, 시스템 폰트 지정
- 승인 없이 공통 CSS/JS 수정·확장
- 화면 HTML 안에 새 컴포넌트 정의(재사용 불가 일회성 구조) 포함
- Component Guide / Button Guide와 충돌하는 버튼·레이아웃·토큰 사용
- `stam.nav-data.js` 등 SSOT 데이터 **무단 변경**
- 금지 경로(아래 §8) 수정

---

## 7. PR 완료 보고 필수 항목

STAM 화면/기능 PR 완료 시 아래를 **반드시** 보고한다.

1. **사용한 기존 CSS 파일** 목록
2. **사용한 기존 JS 파일** 목록
3. **사용한 기존 클래스/함수** 목록
4. **수정 대상 파일** 목록
5. **새 CSS/JS 생성 여부: 0건** (0이 아니면 FAIL)
6. inline style/script **없음** 확인
7. Button 작업 시 **Button Guide 준수** 확인
8. 금지 경로 **변경 없음** 확인

---

## 8. STAM 금지 경로

에이전트가 **승인 없이 수정하면 안 되는** 경로:

- `stam/pages/**` — (화면 작업 PR에서만, 가이드 준수 후 수정)
- `stam/js/**`, `stam/css/**`, `stam/assets/**`, `stam/components/**`, `stam/templates/**` — 공통 코드 (별도 승인 PR)
- `stam/docs/components/**` — 컴포넌트 가이드 (별도 문서 PR)
- `package.json`, Firebase, GitHub Actions 등 인프라 설정
- 제품 **저장/삭제/조회/Firestore/localStorage/API** 로직

거버넌스·문서 작업 PR에서는 위 경로를 **건드리지 않는다**.

---

## 9. Button 작업 시 Button Guide 필수 확인

버튼 배치·유형·문구·우선순위 작업 시 **`stam/docs/components/STAM-Button-Guide.html`을 먼저 읽는다.**

- Primary / Secondary / Ghost / Danger / Icon Button 위계 준수
- 화면당 Primary 1개 원칙
- Danger는 Dialog 확인과 함께
- `.stam-btn--*` 변형·사이즈만 사용 (새 버튼 클래스 금지)
- `aria-label` (Icon Button 필수)

Button Guide와 충돌하는 diff는 **FAIL**이다.

---

## 관련 문서

- `stam/docs/STAM-Agent-Component-Inventory.html` — 공통 컴포넌트 인벤토리
- `.cursor/rules/stam-agent-governance.mdc` — Cursor Rules (동일 기준)
- `stam/docs/STAM-UI-Baseline-Guide.html` — UI Baseline
- `stam/docs/STAM-Docs-Index.html` — Docs Index
