# STAM Icon Asset System v1

> 사용자 결정 (2026-06-18): 드로워 / Topbar / Left Navigation / 버튼 / row action 아이콘을 장기적으로 모두 공통 asset 폴더에서 관리한다. JS/HTML 에 inline SVG path 를 박는 방식을 중단한다. SVG 파일 하나만 바꾸면 해당 아이콘을 사용하는 모든 화면이 자동 반영되어야 한다.
>
> 본 PR(#141) 은 **icon asset system baseline**. 폴더 구조 / SVG 자산 28종 / 공통 CSS 를 추가하고, **첫 적용 지점으로 Board Factory v2 filter button 만 전환**한다. Topbar / Left Nav / 기존 v1 화면 전환은 후속 PR.

---

## 1. 목적

- **단일 소스화**: SVG 자산을 한 곳(`stam/assets/icons/`) 에서 관리. inline SVG path 중단.
- **자동 반영**: SVG 파일 교체 시 해당 아이콘을 사용하는 모든 화면이 자동으로 갱신.
- **currentColor 추적**: 색상은 호출 컨텍스트의 `currentColor` 를 따름 → light/dark / variant 모두 자연스러움.
- **호환성**: chromium / safari / firefox 최신 stable 모두 `mask-image` 지원.

## 2. Icon asset folder 구조

```
stam/assets/icons/
├─ ui/          공통 인터랙션 아이콘 (filter, search, close, chevron-down, refresh, more, view)
├─ actions/     실행 액션 아이콘 (plus, edit, trash, save, download, upload, copy, export)
├─ navigation/  메뉴/네비게이션 아이콘 (dashboard, requirements, screens, wbs, function-spec, table, server, settings)
└─ status/      상태/표시 아이콘 (check, warning, error, info, lock)
```

본 PR 에서 28개 SVG 추가. 폴더는 후속 PR 에서도 그대로 사용한다.

## 3. Naming rule

- 파일명: **kebab-case**.svg (`chevron-down.svg`, `function-spec.svg`)
- CSS 클래스: `.stam-icon-<filename>` — 예) `stam-icon-filter`, `stam-icon-chevron-down`
- 의미와 이름이 일치해야 한다(파일명만 보고 용도가 추정 가능).
- 동일한 의미의 아이콘 중복 금지 (예: `delete.svg` ↔ `trash.svg` 동시 보유 금지). 본 PR 은 `trash.svg` 만 채택.

## 4. SVG authoring rule

- `viewBox="0 0 24 24"` 고정. 다른 viewBox 금지.
- 외부 라이브러리 / CDN 참조 금지. 모든 path 는 직접 작성.
- path 는 viewBox 전 영역을 의미있게 사용 (좌상단 14×14 만 그리는 등 미달 금지).
- light/dark 양쪽에서 자연스러운 stroke / fill 사용. 색상은 호출측 `currentColor`.
- 16px / 18px 표시 시에도 의미가 명확히 읽혀야 함.
- 둥근 끝(`stroke-linecap="round"`) / 둥근 모서리(`stroke-linejoin="round"`) 권장.
- `xmlns="http://www.w3.org/2000/svg"` 포함.

## 5. CSS mask 방식 (`stam/css/stam.icons.css`)

```css
.stam-icon {
  display: inline-block;
  width:  var(--stam-icon-size, 16px);
  height: var(--stam-icon-size, 16px);
  min-width: var(--stam-icon-size, 16px);
  flex: 0 0 var(--stam-icon-size, 16px);
  background-color: currentColor;
  -webkit-mask-position: center; mask-position: center;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-size: contain; mask-size: contain;
}
.stam-icon-filter {
  -webkit-mask-image: url("../assets/icons/ui/filter.svg");
  mask-image: url("../assets/icons/ui/filter.svg");
}
```

사용:

```html
<span class="stam-icon stam-icon-filter" aria-hidden="true"></span>
```

사이즈 오버라이드 (스코프 별):

```css
.bf-filter-btn .stam-icon-filter { --stam-icon-size: 18px; }
```

`background-color: currentColor` 이므로 호출 컨텍스트의 텍스트색을 그대로 따른다 → variant / hover / focus / theme 자동 추적.

## 6. Board Factory 적용 기준 (본 PR 적용 범위)

- `stam/js/stam.board-factory.js` toolbar 의 filter 버튼 inline SVG 제거 → `<span class="stam-icon stam-icon-filter">` 로 교체.
- 클래스 `bf-filter-btn` 유지. label 텍스트 유지. 필터 열림/닫힘 동작 / 카운트 / 초기화 / 적용 로직 무변경.
- `stam.icons.css` 에서 `.bf-filter-btn .stam-icon-filter { --stam-icon-size: 18px }` + `.bf-filter-btn { gap: 6px }` 적용.
- 3 v2 route(`functional-specification.html`, `menu-screen-list.html`, `requirements.html`) HTML 에 `stam.icons.css` link 추가.
  - 주의: `boards-v2/requirements.html` 은 PR #140 브랜치에서만 존재(아직 main 미머지). 본 PR 은 main 기준이므로 fn-spec v2 / menu v2 두 파일만 추가. PR #140 머지 후 requirements.html 에 동일 link 를 추가하는 것은 후속 작업(주: PR #140 의 사용자 브라우저 QA 미완료 상태이므로 PR #140 자체 보강으로 처리).

## 7. Topbar / Left Nav / Drawer / Button 후속 전환 기준

본 PR 미대상. 각 후속 PR 에서 단계적으로 전환:

- **Board Factory toolbar icons 전체** — search / 삭제 / 등록 / 내보내기 inline SVG → asset 전환.
- **Board Factory drawer/footer/action icons** — 임시저장 / 전체보기 / 등록 / 저장 / 수정 / 닫기 X.
- **table row action icons** — `actionButtons` renderer 의 텍스트 라벨 + 아이콘 옵션 도입 시.
- **Topbar icons** — notification / search / settings 등.
- **Left Navigation icons** — `stam.nav-data.js` / `stam.nav-render.js` 의 icon 출처 전환.
- **기존 v1 화면 icon migration** — fn-spec / requirements / menu-screen-list / wbs / screen-spec / open-scenario.

각 전환 PR 은 **scope 한정 + 시각 회귀 사용자 QA 필수**.

## 8. 기존 v1 화면 영향 방지 기준

- 본 PR 은 기존 v1 HTML / JS / CSS 를 **수정하지 않는다** (`stam/pages/boards/*.html` 등). 영향 0.
- `stam.icons.css` 는 v2 route 3개에만 link 됨 → v1 화면 미로드.
- Board Factory engine 변경(`stam.board-factory.js`) 은 `.bf-filter-btn` scope 한정 → v1 화면(`rq-filter-btn` 등) 비매치.

## 9. QA 체크리스트

### 9-1. 정적

- [x] `node --check stam/js/stam.board-factory.js` PASS
- [x] CSS brace 균형 (icons.css / board-factory.css)
- [x] 28개 SVG 파일 존재
- [x] 모든 SVG `viewBox="0 0 24 24"` + `xmlns` 포함
- [x] 기존 v1 / boards-v2 기존 route 외 파일 diff 0 (금지 파일 변경 없음)

### 9-2. 사용자 브라우저 QA (PASS — 2026-06-18)

사용자 브라우저 QA 결과 **PASS**. 사용자 코멘트: "좋아 같은 아이콘 보여".

- [x] `/stam/pages/boards-v2/functional-specification.html` filter 버튼 — asset 기반 funnel 표시 **PASS**
- [x] `/stam/pages/boards-v2/menu-screen-list.html` filter 버튼 — 동일 표시 **PASS**
- [x] 두 v2 화면에서 **동일한 공통 `filter.svg` 기반 funnel 아이콘** 표시 확인 **PASS**
- [x] 공통 icon asset 적용 구조(`stam-icon` + `stam-icon-filter` CSS mask, 단일 `filter.svg` 참조) 동작 확인 **PASS** — 두 화면이 동일 asset 을 참조하므로 `filter.svg` 1개 교체 시 자동 반영 구조 확인
- [ ] (PR #140 머지 후) `/stam/pages/boards-v2/requirements.html` filter 버튼 — 동일 표시 (PR #140 정리 시 `stam.icons.css` link 추가 예정)
- [x] 기존 v1 화면 영향 없음 — v1 route diff 0 + `stam.icons.css` v1 미링크 + engine 변경 `.bf-filter-btn` scope 한정으로 정적 보장
- [ ] light / dark mode — 본 QA 라운드 미보고 (funnel 은 `currentColor` 추적이라 테마 회귀 위험 낮음)
- [ ] 1920 / 1366 — 본 QA 라운드 미보고
- [ ] console error 0 — staging 배포 후 재확인
- [ ] narrow / mobile — DEFERRED (별도 PR)

## 10. 후속 작업 후보

1. **Board Factory toolbar icons 전체 전환** (search / 삭제 / 등록 / 내보내기).
2. **Board Factory drawer/footer/action icons 전환** (임시저장 / 전체보기 / 등록 / 저장 / 수정 / 닫기 X).
3. **table row action icons 전환** — actionButtons renderer 옵션 확장.
4. **Topbar icons 전환** — `stam.topbar-render.js`.
5. **Left Navigation icons 전환** — `stam.nav-render.js` / `stam.nav-data.js`.
6. **기존 v1 화면 icon migration** — 큰 영향 PR. 단계적 분리.
7. **icon asset 확장** — 새 의미가 필요할 때 §3 / §4 규칙 따라 SVG 1개 추가 + `stam.icons.css` 클래스 1줄 추가.
