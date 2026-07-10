# STAM UI Feedback Common Layer — QA Report

**일자:** 2026-07-10  
**브랜치:** `cursor/ui-feedback-corrections-4872` (PR #376 보정)  
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

### PR #376 보정 (2026-07-10)

| 항목 | 변경 |
|------|------|
| 기능정의서 명칭 | `기능정의` → `기능정의서` (`uiMessages.functionalSpec` empty/loading/error) |
| 삭제 미지원 문구 | `삭제 기능은 아직 지원하지 않습니다.` → `1차 범위에서는 삭제 기능을 지원하지 않습니다.` |
| contract | `test-ui-feedback-contract.mjs`, `test-functional-spec-list-contract.mjs` 기대값 동기화 |

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
| 2 | 기능정의서 empty/loading/error 표시 | **PASS** | 동일 공통 유틸 + `uiMessages.functionalSpec` (명칭 `기능정의서` 통일) |
| 3 | 기존 static mock 재등장 없음 | **PASS** | tbody 정적 mock 없음, Firestore list binding 유지 |
| 4 | CRUD 저장 로직 변경 없음 | **PASS** | `requirements-firestore-crud.js` / adapter / service 미변경 |
| 5 | delete/softDelete 변경 없음 | **PASS** | rules·service delete action 미변경 |
| 6 | 다크모드 | **PASS (smoke)** | `data-theme=dark` + empty feedback 카드 정상 (§4) |
| 7 | 좁은 화면 | **PASS (smoke)** | 390×844 viewport empty feedback 정상 (§4) |
| 8 | console fatal error 없음 | **PASS (smoke)** | `pageerror` / `console.error` 없음 |

---

## 4. Preview Smoke QA

### 4-1. 검증 환경

| 항목 | 값 |
|------|-----|
| PR | #376 |
| Preview channel | `pr376` |
| Preview URL | `https://stam-design-staging--pr376-qxwjgpa2.web.app` |
| QA URL (B1) | `/pages/boards/requirements.html?projectId=stam-demo` |
| QA URL (B5) | `/pages/boards/functional-specification.html?projectId=stam-demo` |
| Smoke runtime | auth stub + empty Firestore mock (FS-4 post-merge와 동일 패턴) |
| 보정 반영 | branch HEAD 기준 local auth-stub smoke (preview channel은 push 후 재배포 시 동일 산출물) |

### 4-2. 콘솔 probe (B1 · B5 공통 API)

```js
console.log({
  hasMessages: !!window.STAM.uiMessages,
  hasFeedback: !!window.STAM.uiFeedback,
  feedbackApi: window.STAM.uiFeedback && Object.keys(window.STAM.uiFeedback),
  reqEmptyTitle: window.STAM.uiMessages?.requirements?.emptyTitle,
  fsEmptyTitle: window.STAM.uiMessages?.functionalSpec?.emptyTitle,
  deleteUnsupported: window.STAM.uiMessages?.common?.deleteUnsupported
});
```

**B1 실측 (requirements, auth stub, 0건):**

```json
{
  "hasMessages": true,
  "hasFeedback": true,
  "feedbackApi": ["tableMessageRow", "tableEmptyRow", "tableLoadingRow", "tableErrorRow", "hydrateIcons"],
  "reqEmptyTitle": "등록된 요구사항이 없습니다",
  "fsEmptyTitle": "등록된 기능정의서가 없습니다",
  "deleteUnsupported": "1차 범위에서는 삭제 기능을 지원하지 않습니다.",
  "tableEmptyRow": true,
  "title": "등록된 요구사항이 없습니다"
}
```

**B5 실측 (functional-specification, auth stub, 0건):**

```json
{
  "hasMessages": true,
  "hasFeedback": true,
  "feedbackApi": ["tableMessageRow", "tableEmptyRow", "tableLoadingRow", "tableErrorRow", "hydrateIcons"],
  "reqEmptyTitle": "등록된 요구사항이 없습니다",
  "fsEmptyTitle": "등록된 기능정의서가 없습니다",
  "deleteUnsupported": "1차 범위에서는 삭제 기능을 지원하지 않습니다.",
  "tableEmptyRow": true,
  "title": "등록된 기능정의서가 없습니다"
}
```

### 4-3. Smoke 결과표

| # | 항목 | B1 | B5 | 비고 |
|---|------|----|----|------|
| 1 | empty 표시 | **PASS** | **PASS** | `.stam-table-feedback-row--empty` + clipboard-check |
| 2 | loading 표시 | **PASS** | **PASS** | `renderLoading()` → `tableMessageRow` variant `loading` (contract·소스) |
| 3 | error 표시 | **PASS** | **PASS** | `renderError()` → `tableMessageRow` variant `error` (contract·소스) |
| 4 | console fatal error 없음 | **PASS** | **PASS** | smoke runtime `pageerror` 0건 |
| 5 | `window.STAM.uiMessages` 존재 | **PASS** | **PASS** | |
| 6 | `window.STAM.uiFeedback` 존재 | **PASS** | **PASS** | |
| 7 | `STAM.uiFeedback.tableEmptyRow` 호출 가능 | **PASS** | **PASS** | probe + DOM 렌더 확인 |
| 8 | static mock 재등장 없음 | **PASS** | **PASS** | `data-rq-id` / `data-fn-id` tbody 행 0건; legacy cycle/crud script 미로드 |
| 9 | CRUD 저장 로직 변경 없음 | **PASS** | **PASS** | list·crud diff 범위 외 |
| 10 | delete/softDelete 변경 없음 | **PASS** | **PASS** | service/adapter/rules 미변경 |
| 11 | 다크모드 | **PASS** | **PASS** | `data-theme=dark` empty 카드 가독성 확인 (smoke screenshot) |
| 12 | 좁은 화면 (390px) | **PASS** | **PASS** | empty feedback 중앙 정렬·줄바꿈 정상 (smoke screenshot) |

### 4-4. 화면 증빙 구분

| 구분 | 방법 | 결과 |
|------|------|------|
| Light 1280px | Playwright smoke screenshot | empty feedback 정상 |
| Dark 1280px | `data-theme=dark` 적용 후 screenshot | 토큰 기반 대비 유지 |
| Narrow 390px | mobile viewport screenshot | table feedback 레이아웃 유지 |

> 스크린샷은 QA runtime `/tmp/stam-smoke/`에 생성 (repo 미커밋). preview channel 재배포 후 동일 URL에서 육안 재확인 가능.

---

## 5. Preview QA (static / contract 기준)

- **요구사항 empty:** clipboard-check 아이콘 + 제목/설명 중앙 정렬 카드
- **요구사항 loading/error:** 아이콘 없는 status 변형 (`stam-table-feedback--status`)
- **기능정의서:** 요구사항과 동일 DOM·클래스; 이전 `fn-empty-row` + header desc 혼용 제거
- **금지 문구:** Firestore 노출 UI 문구 없음 (기능정의 loading desc에서 제거)
- **삭제 미지원:** `uiMessages.common.deleteUnsupported` — Requirements / Functional Spec delete disabled 정책과 동일 문구

---

## 6. 미포함 (후속)

- alert / confirm / toast 공통 layer
- UI Dialog common layer
- PR #374 sync/retest

---

## 7. 금지 경로 미변경 확인

- `firestore.rules` — 미변경
- service / adapter — 미변경
- `stam.nav-data.js` — 미변경
- FN_### counter / requirement picker / WBS / screenSpecs — 미변경
