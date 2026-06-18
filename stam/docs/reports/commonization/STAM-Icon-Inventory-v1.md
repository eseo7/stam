# STAM Icon Inventory v1

> STAM 전체에서 사용되고 있는 아이콘의 현재 위치 / 출처 / 적용 우선순위를 정리한 인벤토리.
> 본 PR(#141) 의 baseline 결정에 사용. 후속 전환 PR 의 작업 범위 책정 기준.

---

## 1. 현재 아이콘 사용 위치 (출처 별)

### 1-1. Board Factory v2 — toolbar (engine `stam/js/stam.board-factory.js`)

| 위치 | 현재 출처 | 본 PR 전환 | 후속 전환 |
| --- | --- | --- | --- |
| toolbar 검색창 돋보기 | inline SVG L271 | ✕ | search.svg |
| toolbar **필터** 버튼 | inline SVG L276 | ✓ **filter.svg 18px** | — |
| toolbar 삭제 버튼 | inline SVG L280 | ✕ | trash.svg |
| toolbar 등록 버튼 (action.icon `plus`) | `ICONS.plus` registry | ✕ | plus.svg |
| toolbar 내보내기 버튼 (action.icon `export`) | `ICONS.export` registry | ✕ | export.svg |

### 1-2. Board Factory v2 — drawer / footer (engine)

| 위치 | 현재 출처 | 본 PR 전환 | 후속 전환 |
| --- | --- | --- | --- |
| drawer 닫기 X | inline SVG (`buildDrawerHead`) | ✕ | close.svg |
| drawer footer 임시저장 (`save`) | `ICONS.save` | ✕ | save.svg |
| drawer footer 등록/저장 (`plus`) | `ICONS.plus` | ✕ | plus.svg |
| drawer footer 수정 (`edit`) | `ICONS.edit` | ✕ | edit.svg |

### 1-3. Board Factory v2 — table row action

| 위치 | 현재 출처 | 본 PR 전환 | 후속 전환 |
| --- | --- | --- | --- |
| 상세 버튼 | 텍스트 라벨만 | ✕ | actionButtons renderer 에 icon 옵션 도입 후 view.svg |

### 1-4. Topbar (`stam/js/stam.topbar-render.js`) — **전역 영향**

| 위치 | 현재 출처 | 본 PR 전환 | 후속 전환 |
| --- | --- | --- | --- |
| breadcrumb 구분자 | text glyph (`›` 등) | ✕ | chevron-down.svg (회전) 또는 별도 |
| client / 검색 / 알림 / 사용자 메뉴 | inline SVG | ✕ | 후속 Topbar 전환 PR (전역) |

### 1-5. Left Navigation (`stam.nav-render.js` / `stam.nav-data.js`) — **전역 영향**

| 위치 | 현재 출처 | 본 PR 전환 | 후속 전환 |
| --- | --- | --- | --- |
| 그룹/메뉴 아이콘 (B 그룹 산출물 등) | nav-data.js 의 icon 키 또는 inline | ✕ | navigation/*.svg 매핑 후속 PR |

### 1-6. 기존 v1 화면 (`stam/pages/boards/*.html`)

| 화면 | 현재 출처 | 본 PR 전환 | 후속 전환 |
| --- | --- | --- | --- |
| requirements.html | 자체 inline SVG | ✕ | v1 migration PR |
| functional-specification.html | 자체 inline SVG | ✕ | v1 migration PR |
| menu-screen-list.html | 자체 inline SVG | ✕ | v1 migration PR |
| wbs.html / screen-specification.html / open-scenario.html | 자체 inline SVG | ✕ | v1 migration PR |

### 1-7. status / chip 아이콘

현재 chip 은 텍스트(`확정`, `검토중`, `보류` 등) + tone 색만 사용. 별도 status 아이콘 미사용.

가능 확장: chip 안에 `check / warning / error / info / lock` SVG 추가 — **후속 시각 디자인 결정 필요**.

## 2. inline SVG 사용 위치 (전수 grep)

본 PR 시점에서 inline `<svg ...>` 사용 위치 — 후속 PR 의 전환 대상.

| 영역 | 파일 | 비고 |
| --- | --- | --- |
| Board Factory engine | `stam/js/stam.board-factory.js` | toolbar 검색/필터/삭제 + drawer 닫기 + `ICONS` registry(plus/export/save/edit) |
| Topbar / Left Nav 등 | `stam/js/stam.topbar-render.js`, `stam.nav-render.js`, `stam.shell.js` | 전역 영향 — 별도 후속 PR |
| 기존 v1 보드 | `stam/pages/boards/*.html`, `stam/js/stam.requirements.js` 등 | v1 migration |
| project context / project overview | `stam/js/stam.project-context-render.js`, `stam.project-overview.js` 등 | 후속 |

본 PR 은 **Board Factory engine 의 filter 버튼 inline SVG 1건** 만 제거 / asset 전환.

## 3. text glyph 사용 위치

- breadcrumb 구분자(`›`, `/`)
- 페이지네이션 화살표(`‹`, `›`)
- chip dot / 빈 상태 표기(`—`, `?`)

본 PR 비대상. 후속 결정.

## 4. Asset 전환 우선순위

1. **Board Factory v2 toolbar 의 filter 버튼** ★ — 본 PR 적용.
2. Board Factory v2 toolbar 의 search / 삭제 / 등록 / 내보내기.
3. Board Factory v2 drawer/footer/action icons.
4. Board Factory v2 table row action icons.
5. Topbar icons (전역 영향 — 별도 PR).
6. Left Navigation icons (전역 영향 — 별도 PR).
7. 기존 v1 화면 icon migration (별도 단계적 PR).

## 5. 이번 PR 적용 범위 (요약)

| 항목 | 본 PR | 후속 |
| --- | --- | --- |
| 폴더 구조 (`stam/assets/icons/{ui,actions,navigation,status}`) | ✓ | — |
| SVG 자산 28종 | ✓ | 추가 시 동일 규칙 |
| 공통 CSS (`stam/css/stam.icons.css`) | ✓ | 클래스 1줄씩 추가 |
| Board Factory v2 **filter button** 전환 | ✓ | — |
| v2 route 3개에 `stam.icons.css` link | △ — main 에 존재하는 2개(`functional-specification.html`, `menu-screen-list.html`) 만. **`requirements.html` 은 PR #140 머지 후 추가 필요** | PR #140 보강 |
| Board Factory toolbar 다른 버튼 / drawer / 닫기 X / 등록 / 내보내기 / 임시저장 | ✕ | 후속 PR |
| Topbar / Left Nav / 기존 v1 화면 | ✕ | 단계적 후속 PR |

## 6. 후속 PR 분리 기준

- **scope 한정**: 한 PR 당 한 표면(toolbar / drawer / topbar / nav / v1 boards) 만.
- **시각 회귀 QA 필수**: 각 표면 전환 PR 은 사용자 브라우저 QA 로 light/dark/1920/1366 확인.
- **inline SVG 미증가**: 신규 코드에 inline `<svg>` 추가 금지. asset + class 사용.
- **SVG 자산은 본 인벤토리에 추가**: 새 의미 등장 시 본 문서에 row 1개 + 규칙 §3/§4 따라 SVG 파일 1개 + `stam.icons.css` 클래스 1줄 추가.
