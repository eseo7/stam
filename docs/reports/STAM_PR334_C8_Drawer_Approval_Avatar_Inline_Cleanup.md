# STAM PR #334 — C8 Drawer Approval Avatar Inline Cleanup

## 목적

`stam/pages/boards/open-scenario.html` Drawer **기본정보** 탭의 담당자/확인자 avatar `style="background:#..."` 2건을 PR #332 `.os-ava--bg-*` class로 이동한다. **표현만** 변경 — JS·CRUD·guard·Firestore 변경 없음.

## 수치 (PR #333 이후)

| 항목 | Before | After | 비고 |
|------|--------|-------|------|
| `open-scenario.html` 전체 inline `style=""` | **64** | **62** | −2 |
| Drawer `.os-info-val` avatar `background` inline | **2** | **0** | 담당자·확인자 |
| `os-ava.*style="background` 전체 | **2** | **0** | C8 avatar inline 완료 |
| 신규 CSS/JS 파일 | — | **0** | |
| 신규 `.os-ava--bg-*` class | — | **0** | #332 재사용 |

## 재사용 class (#332)

| 위치 | Class | background |
|------|-------|------------|
| 담당자 (line ~991) | `.os-ava--bg-5451e8` | `#5451E8` |
| 확인자 (line ~997) | `.os-ava--bg-10b981` | `#10B981` |

## 범위

Drawer `#os-dw-detail` → 기본정보 탭 → `.os-info-row` 담당자/확인자 2건

## 수정 파일

- `stam/pages/boards/open-scenario.html`
- `docs/reports/STAM_PR334_C8_Drawer_Approval_Avatar_Inline_Cleanup.md` (신규)

## 미변경

- `stam/css/stam.open-scenario.css` — 신규 rule 없음
- `stam/js/**` — `stam.open-scenario.js` drawer 동작
- `stam.project-context-guard.js`
- Zone C colgroup / text color / display / Toolbar inline (62건 잔존)
- Firestore / Auth / CRUD

## 검증

```bash
git diff --name-only main...HEAD
rg -c 'style=' stam/pages/boards/open-scenario.html
rg 'os-ava.*style="background' stam/pages/boards/open-scenario.html
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| 신규 avatar color class | 0 |
| Drawer avatar background inline | 0 |
| `stam/js/**` 변경 | 없음 |

## 후속 (Phase 5+)

- Zone C colgroup `width` inline
- text color / `display:none` / Toolbar inline
- `test-open-scenario-no-inline-style.mjs` 회귀 CI
