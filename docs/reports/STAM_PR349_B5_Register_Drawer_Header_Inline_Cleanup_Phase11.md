# STAM PR #349 — B5 Register Drawer Header Inline Cleanup Phase 11

## 목적

B5 `functional-specification.html` 등록 Drawer header/label 보조문구 inline style 3건을 기존 공통 drawer CSS class로 이동한다. B5 inline cleanup **Phase 11** — 등록 Drawer header 관련 inline만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #348 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **5** | **2** | −3 |
| 등록 Drawer header/label inline | **3** | **0** | Phase 11 완료 |
| 기타 inline (content layout / history) | 2 | 2 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

### 등록 Drawer header inline breakdown (Before)

| # | 위치 | inline | After |
|---|------|--------|-------|
| 1 | header row subtitle | `font-size:12px;color:var(--t3);margin-left:2px` | `.stam-drawer-head-subtitle` |
| 2 | header meta hint | `font-size:11px;color:var(--t3)` | `.stam-drawer-meta-source` |
| 3 | 기능 ID label hint | `font-size:10.5px;color:var(--t3)` | `.stam-drawer-meta-source` |

요구사항정의서(`requirements.html`) 등록 Drawer와 동일 공통 class 계약 정렬 (`stam.drawer.css` SSOT).

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.drawer.css` (기존), `stam.functional-specification.css` (변경 없음) |
| JS | 변경 없음 |
| 클래스 | `.stam-drawer-head-subtitle`, `.stam-drawer-meta-source` |

```css
/* stam.drawer.css — 기존 */
.stam-drawer-head-subtitle { font-size:12px;color:var(--t3);margin-left:2px }
.stam-drawer-meta-source { font-size:11px;color:var(--t3) }
```

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `docs/reports/STAM_PR349_B5_Register_Drawer_Header_Inline_Cleanup_Phase11.md` (신규)

## 미변경 (Phase 11 범위 외)

- content layout `display:flex` inline
- history `strong` color inline
- fn-ik / textarea / tab panel / linked card 등 이전 Phase 결과
- `stam/js/stam.functional-specification.js`
- `stam/css/stam.functional-specification.css`
- Firestore / Auth / CRUD / guard / routing / filter

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 2
rg -n 'fn-dw-register|stam-drawer-head-subtitle|stam-drawer-meta-source' stam/pages/boards/functional-specification.html
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| 등록 Drawer header inline | 0 |
| inline style/script 신규 | 없음 |
| 금지 경로 변경 | 없음 |
| JS/CRUD/필터/tab 로직 | 미변경 |

## 후속 (Phase 12+)

- content layout `display:flex` inline (1)
- history `strong` color inline (1)
