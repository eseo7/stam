# STAM PR #339 — B5 Summary Strip Inline Cleanup Phase 1

## 목적

B5 `functional-specification.html` Summary Strip (`.fn-sstrip`) 영역 잔여 inline `style=""` 9건을 CSS/class 기반으로 이동한다. B5 전체 inline 0 달성이 아닌 Summary Strip 핀셋 정리 Phase 1.

## 수치

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `functional-specification.html` 전체 inline `style=""` | **79** | **70** | −9 |
| Summary Strip inline | **9** | **0** | Phase 1 완료 |
| 신규 CSS/JS 파일 | — | **0** | |

## 변경 요약

| 대상 | Before | After |
|------|--------|-------|
| `.fn-ss-dot` (7) | `style="background:…"` | `.fn-ss-dot.is-brand\|slate\|warn\|pass\|fail\|info\|violet` |
| `.fn-ss-num` (1) | `style="color:var(--stam)"` | `.fn-ss-num.is-brand` |
| `.fn-ss-cell` (1) | `style="border-right:0"` | 제거 (기존 `.fn-ss-cell:last-child` 규칙) |

### Tone modifier 매핑

| 셀 | dot class | num class |
|----|-----------|-----------|
| 전체 | `is-brand` | `is-brand` |
| 작성중 | `is-slate` | — |
| 검토중 | `is-warn` | — |
| 승인완료 | `is-pass` | — |
| 보류 | `is-fail` | — |
| 연결 요구사항 | `is-info` | — |
| 연결 화면 | `is-violet` | — |

요구사항정의서 `.stam-summary-dot.is-*` / `.stam-summary-num.is-*` (PR #268 SSOT)와 동일 tone naming.

## 사용 CSS/JS/클래스

| 구분 | 항목 |
|------|------|
| CSS | `stam.functional-specification.css` |
| JS | 변경 없음 |
| 클래스 | `.fn-sstrip`, `.fn-ss-cell`, `.fn-ss-dot.is-*`, `.fn-ss-num.is-brand`, `.fn-ss-lbl`, `.fn-ss-sub` |

## 수정 파일

- `stam/pages/boards/functional-specification.html`
- `stam/css/stam.functional-specification.css`
- `docs/reports/STAM_PR339_B5_Summary_Strip_Inline_Cleanup_Phase1.md` (신규)

## 미변경 (Phase 1 범위 외)

- 검색 아이콘 inline
- filter count `display:none`
- table colgroup width inline
- 담당자 avatar / cell inline
- Drawer 내부 inline
- 버튼 / filter footer class 정리
- `stam/js/stam.functional-specification.js`
- Firestore / Auth / CRUD / guard / routing

## 검증

```bash
git diff --name-only main...HEAD
rg 'style=' stam/pages/boards/functional-specification.html | rg 'fn-sstrip|fn-ss-'  # 0
rg -c 'style=' stam/pages/boards/functional-specification.html  # 70
node --check stam/js/stam.functional-specification.js
node scripts/test-project-context-guard-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| Summary Strip inline | 0 |
| 금지 경로 변경 | 없음 |
| 기능/데이터/필터/Drawer 로직 | 미변경 |

## 후속 (Phase 2+)

- Toolbar 검색 아이콘 inline
- Filter count badge
- Table colgroup / avatar / cell inline
- Drawer tab panel / form inline
