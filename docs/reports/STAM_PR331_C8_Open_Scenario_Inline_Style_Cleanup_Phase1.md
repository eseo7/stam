# STAM PR #331 — C8 Open Scenario Inline Style Cleanup Phase 1 (Zone A)

## 목적

`stam/pages/boards/open-scenario.html` **Zone A: Opening Readiness Summary** 영역의 inline `style=""`를 `stam/css/stam.open-scenario.css`로 이동한다. **표현만** 변경 — JS·데이터·CRUD·guard·Firestore 변경 없음.

## 수치 (PR #327 baseline 대비)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **132** | **131** | Phase 1 = Zone A만 |
| Zone A inline `style=""` | **1** | **0** | Opening Readiness Summary |
| inline `<style>` | 0 | 0 | |
| inline `<script>` | 0 | 0 | |
| 신규 CSS/JS 파일 | — | **0** | |

## Zone A 범위

`<!-- Zone A: Opening Readiness Summary -->` ~ `</div>` (`.os-readiness` 블록 전체: D-Day 카드, 준비율 바, KPI row)

## Class mapping

| 영역 | Before | After |
|------|--------|-------|
| 준비율 progress fill | `style="width:74%"` | `.os-readiness-bar-fill--74` |

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `stam/css/stam.open-scenario.css`
- `docs/reports/STAM_PR331_C8_Open_Scenario_Inline_Style_Cleanup_Phase1.md` (신규)

## 미변경

- `stam/js/**` — `stam.open-scenario.js` 포함 기능 로직 변경 없음
- `stam.project-context-guard.js` — guard 계약 유지
- Zone B~F 및 drawer/list inline style (131건 잔존)
- Firestore / localStorage / CRUD
- UI 문구·버튼 동작·화면 구조

## 검증

```bash
git diff --name-only main...HEAD
rg -n 'style=' stam/pages/boards/open-scenario.html | wc -l
rg 'style=' stam/pages/boards/open-scenario.html | head -5
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| `scripts/**` 신규 추가 | 0 |
| Zone A inline style | 0 |
| `stam/js/**` 변경 | 없음 |
| guard JS 변경 | 없음 |

## 후속 (Phase 2+)

- Zone B Timeline avatar `background` inline (다수)
- Zone C~F 및 drawer 패널 inline style
