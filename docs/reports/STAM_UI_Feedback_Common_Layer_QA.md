# STAM UI Feedback Common Layer — QA Report

**일자:** 2026-07-09  
**브랜치:** `cursor/ui-feedback-common-layer-38a3`  
**범위:** 요구사항정의서(B1) · 기능정의서(B5) table empty/loading/error 공통화

---

## 1. 변경 요약

| 구분 | 내용 |
|------|------|
| 신규 JS | `stam/js/stam.ui-messages.js`, `stam/js/stam.ui-feedback.js` |
| 신규 contract | `scripts/test-ui-feedback-contract.mjs` |
| CSS | `stam/css/stam.components.css` — `.stam-table-feedback-*` 공통 클래스 |
| 화면 | `requirements.html`, `functional-specification.html` — 공통 스크립트 로드 |
| list JS | `stam.requirements-firestore-list.js`, `stam.functional-spec-firestore-list.js` — 공통 유틸 위임 |

---

## 2. Contract 결과

```bash
node scripts/test-ui-feedback-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
```

| Contract | 결과 |
|----------|------|
| `test-ui-feedback-contract.mjs` | **PASS** |
| `test-requirements-empty-state-contract.mjs` | **PASS** |
| `test-requirements-firestore-list-contract.mjs` | **PASS** |
| `test-functional-spec-list-contract.mjs` | **PASS** |

---

## 3. QA 체크리스트

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | 요구사항정의서 empty/loading/error 표시 | **PASS** | 공통 `.stam-table-feedback-*` + `uiMessages.requirements` |
| 2 | 기능정의서 empty/loading/error 표시 | **PASS** | 동일 공통 유틸 + `uiMessages.functionalSpec` |
| 3 | 기존 static mock 재등장 없음 | **PASS** | tbody 정적 mock 없음, Firestore list binding 유지 |
| 4 | CRUD 저장 로직 변경 없음 | **PASS** | `requirements-firestore-crud.js` / adapter / service 미변경 |
| 5 | delete/softDelete 변경 없음 | **PASS** | rules·service delete action 미변경 |
| 6 | 다크모드 | **PASS (static)** | `--t1`, `--t3`, `--bg-sur2` 토큰 사용 |
| 7 | 좁은 화면 | **PASS (static)** | `@media (max-width: 768px)` in `stam.components.css` |
| 8 | console error 없음 | **PASS (contract)** | vm 기반 렌더·escape 검증 |

---

## 4. Preview QA (static / contract 기준)

- **요구사항 empty:** clipboard-check 아이콘 + 제목/설명 중앙 정렬 카드
- **요구사항 loading/error:** 아이콘 없는 status 변형 (`stam-table-feedback--status`)
- **기능정의서:** 요구사항과 동일 DOM·클래스; 이전 `fn-empty-row` + header desc 혼용 제거
- **금지 문구:** Firestore 노출 UI 문구 없음 (기능정의 loading desc에서 제거)

---

## 5. 미포함 (후속)

- alert / confirm / toast 공통 layer
- UI Dialog common layer
- PR #374 sync/retest

---

## 6. 금지 경로 미변경 확인

- `firestore.rules` — 미변경
- service / adapter — 미변경
- `stam.nav-data.js` — 미변경
- FN_### counter / requirement picker / WBS / screenSpecs — 미변경
