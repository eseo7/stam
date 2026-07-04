# STAM PR #328 — WBS Inline Style Cleanup Phase 1

## 목적

`stam/pages/boards/wbs.html`의 inline `style=""` 15건을 제거하고 `stam/css/stam.wbs.css`로 이동한다. **표현만** 변경 — JS·데이터·동작 변경 없음.

## 수치 (PR #327 baseline 대비)

| 항목 | Before | After |
|------|--------|-------|
| `wbs.html` inline `style=""` | **15** | **0** |
| `wbs.html` inline `<style>` | 0 | 0 |
| `wbs.html` inline `<script>` | 0 | 0 |
| 신규 CSS/JS 파일 | — | **0** |

## Class mapping

| 영역 | 클래스 |
|------|--------|
| v2 section shell | `.wbs-v2-section` |
| section header | `.wbs-v2-section__head` |
| title / desc | `.wbs-v2-section__title`, `.wbs-v2-section__desc` |
| table scroll | `.wbs-v2-section__scroll` |
| table / thead / th | `.wbs-v2-table`, `thead tr`, `th` |
| type chip | `.wbs-type-chip` (기존, redundant inline 제거) |

## 수정 파일

- `stam/pages/boards/wbs.html`
- `stam/css/stam.wbs.css`
- `docs/reports/STAM_PR328_WBS_Inline_Style_Cleanup_Phase1.md` (신규)

## 미변경

- `stam/js/**` — 기능 로직 변경 없음
- `scripts/**` — **신규 test script 추가 없음**
- Firestore / localStorage / 데이터
- UI 문구·버튼 동작·화면 구조

## 검증

별도 신규 script 추가 없음. inline style 제거는 `rg`로 확인:

```bash
git diff --name-only main...HEAD
rg 'style=' stam/pages/boards/wbs.html
rg -n 'style=' stam/pages/boards/wbs.html
rg '<style|<script' stam/pages/boards/wbs.html
node scripts/test-requirements-no-inline-style.mjs
node scripts/test-project-context-guard-contract.mjs
node scripts/test-nav-live-dimmed-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| `scripts/**` 신규 추가 | 0 |
| inline style/script 추가 | 없음 |
| `stam/js/**` 변경 | 없음 |
