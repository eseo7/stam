# STAM PR #340 — B5 Toolbar Inline Cleanup Phase 2

## 목적

B5 `functional-specification.html` Toolbar (`.fn-toolbar`) 영역 inline `style=""` 2건을 CSS/class 기반으로 이동한다. B5 inline cleanup **Phase 2** — Toolbar만 핀셋 정리.

## 수치 (PR #339 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **70** | **68** | −2 |
| Toolbar inline | **2** | **0** | Phase 2 완료 |
| 신규 CSS/JS 파일 | — | **0** | |

## 변경 요약

| 대상 | Before | After |
|------|--------|-------|
| 검색 아이콘 | `style="color:var(--t3);flex-shrink:0"` | `data-stam-icon-class="is-sm stam-list-search-icon"` |
| `#fn-filter-count` | `style="display:none"` | 제거 + `.fn-filter-cnt`에서 `display:inline-flex` 제거 |

### filter count display 계약

- 초기 숨김: `.stam-board-filter-count { display: none }` (`stam.board-filter.css`)
- 활성 표시: `.stam-board-filter-count.visible { display: inline-flex }`
- `.fn-filter-cnt`의 `display:inline-flex`가 공통 규칙을 덮어쓰던 충돌 제거 (C8/open-scenario PR #337 패턴과 동일)

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.table-selection.css` (`.stam-list-search-icon`), `stam.board-filter.css` (`.stam-board-filter-count`), `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-toolbar`, `.fn-search`, `.stam-list-search-icon`, `.fn-filter-cnt`, `.stam-board-filter-count` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR340_B5_Toolbar_Inline_Cleanup_Phase2.md` (신규)

## 미변경 (Phase 2 범위 외)

- table colgroup width inline
- 담당자 avatar / cell inline
- Drawer 내부 inline
- `stam/js/stam.functional-specification.js`
- `stam/js/stam.board-filter.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg 'style=' stam/pages/boards/functional-specification.html | rg 'fn-toolbar|fn-search|fn-filter-count'  # 0
rg -c 'style=' stam/pages/boards/functional-specification.html  # 68
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| Toolbar inline | 0 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 3+)

- table colgroup width inline
- 담당자 avatar / cell inline
- Drawer tab panel / form inline
