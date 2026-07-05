# STAM PR #345 — B5 Linked Card Inline Cleanup Phase 7

## 목적

B5 `functional-specification.html` 상세 Drawer 연결 정보 영역 linked card inline `style=""` 6건을 CSS/class 기반으로 이동한다. B5 inline cleanup **Phase 7** — linked card 표시용 inline만 핀셋 정리.

## 수치 (작업 전 `rg` 측정, PR #344 merge 후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **28** | **22** | −6 |
| linked card 영역 inline | **6** | **0** | Phase 7 완료 |
| tab/textarea/form inline | 22 | 22 | **미변경** |
| 신규 CSS/JS 파일 | — | **0** | |

### linked card inline breakdown (Before)

| # | 대상 | inline | After |
|---|------|--------|-------|
| 1 | card list wrapper | `display:flex;flex-direction:column;gap:8px` | `.fn-linked-list` |
| 2 | 요구사항 icon | `color:var(--stam);flex-shrink:0` | `.fn-linked-card-icon` |
| 3 | 요구사항 tag | `margin-left:auto;font-size:10.5px;color:var(--t3)` | `.fn-linked-card-tag` |
| 4 | 화면 icon | `color:#8B5CF6;flex-shrink:0` | `.fn-linked-card-icon.is-screen` |
| 5 | 화면 card id | `color:#8B5CF6` | `.fn-linked-card-id.is-screen` |
| 6 | 화면 tag | `margin-left:auto;font-size:10.5px;color:var(--t3)` | `.fn-linked-card-tag` |

화면 violet `#8B5CF6` → `var(--g-b)` (토큰 동일값). 요구사항 `.rq-linked-card-icon` / `.is-wbs` 패턴 정렬.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-linked-list`, `.fn-linked-card`, `.fn-linked-card-icon`, `.fn-linked-card-icon.is-screen`, `.fn-linked-card-id`, `.fn-linked-card-id.is-screen`, `.fn-linked-card-tag` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR345_B5_Linked_Card_Inline_Cleanup_Phase7.md` (신규)

## 미변경 (Phase 7 범위 외)

- tab panel `display:none`
- fn-ik `margin-bottom` inline
- textarea `min-height` inline
- 등록 Drawer header inline
- history `strong` color inline
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/functional-specification.html  # 22
rg -n 'style=' stam/pages/boards/functional-specification.html | rg 'linked|fn-linked'  # 0
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| linked card inline | 0 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 8+)

- tab panel `display:none`
- fn-ik `margin-bottom` inline
- textarea `min-height` inline
- 등록 Drawer header inline
