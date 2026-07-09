# STAM FS-4 — Functional Specification List Read Post-Merge Smoke QA

## 1. 목적

PR #372(FS-4) merge 후, **main 기준** B5 기능정의서 Firestore list read binding에 대한 **post-merge smoke evidence**를 문서화한다. 제품 코드는 변경하지 않는다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| main | `46d2af3` — `feat(fs-4): bind functional spec Firestore list read to B5 UI (#372)` |
| 선행 | FS-1~FS-3, FS-4 (#372) |
| 화면 | `stam/pages/boards/functional-specification.html` (B5) |
| QA URL | `/pages/boards/functional-specification.html?projectId=stam-demo` |

## 3. 검증 환경

| 환경 | URL | FS-4 반영 | 비고 |
|------|-----|-----------|------|
| **PR #372 Preview** (primary evidence) | `https://stam-design-staging--pr372-nqen43as.web.app` | **예** | merge 커밋 `27b0245` / main `46d2af3` 동일 산출물 |
| staging live | `https://stam-design-staging.web.app` | **아니오** (2026-07-09 시점) | static tbody 5건 + `functional-definition-cycle.js` 잔존 — **staging 재배포 전** |

> post-merge smoke **primary evidence**는 PR #372 preview channel(`pr372`)에서 수행. staging live는 FS-4 merge 이후 Hosting 재배포 전 상태로, 본 QA 범위의 FS-4 동작 증빙 대상이 아님.

### 인증

| 시나리오 | 결과 |
|----------|------|
| 미인증 headless | `/pages/auth/login` redirect — **정상 guard** |
| smoke runtime (auth stub + empty Firestore mock) | B5 화면 로드 — list binding 검증용 |

## 4. 자동 contract (main @ `46d2af3`)

```bash
node scripts/test-functional-spec-list-contract.mjs      # PASS
node scripts/test-functional-spec-service-contract.mjs   # PASS
node scripts/test-functional-spec-role-matrix-contract.mjs # PASS
node scripts/test-functional-spec-rules-contract.mjs     # PASS
```

## 5. Smoke QA 결과

### 5-1. 화면 진입

| 항목 | 결과 |
|------|------|
| B5 접근 (preview + auth stub) | **PASS** — HTTP 200 |
| shell / topbar / sidebar | **PASS** — `.po-shell`, `.po-topbar`, `.po-sidebar` |
| blank page | **PASS** — 없음 |
| JS fatal error | **PASS** — `pageerror` / `console.error` 없음 |
| document.title | `기능정의서 — STAM Demo — STAM` |

### 5-2. Firestore list binding

**콘솔 probe (preview, auth stub, empty Firestore):**

```js
console.log({
  hasList: !!window.STAM.functionalSpecFirestoreList,
  api: window.STAM.functionalSpecFirestoreList && Object.keys(window.STAM.functionalSpecFirestoreList),
  state: window.STAM.functionalSpecFirestoreList && window.STAM.functionalSpecFirestoreList.getState()
});
```

**실측 출력:**

```json
{
  "hasList": true,
  "api": [
    "load",
    "guardProjectAccess",
    "applyProjectContext",
    "renderRows",
    "emptyStateRow",
    "setSummary",
    "resolveProjectId",
    "statusInfo",
    "priorityInfo",
    "formatFunctionalSpecCode",
    "getTimestampMs",
    "sortFunctionalSpecsByLatest",
    "bindAuthorizedService",
    "serviceContext",
    "getState"
  ],
  "state": {
    "projectId": "stam-demo",
    "project": { "name": "STAM Demo", "client": "STAM", "status": "active" },
    "member": { "status": "active", "role": "viewer" },
    "user": { "uid": "smoke-user" },
    "items": []
  }
}
```

| 항목 | 결과 | 비고 |
|------|------|------|
| `STAM.functionalSpecFirestoreList` 존재 | **PASS** | |
| `load` API | **PASS** | public entrypoint |
| `refresh` API | **N/A** | list 모듈 public API에 **없음** — 내부 `STAMBoardList.refresh()`만 사용 |
| `getState` API | **PASS** | |
| `renderRows` API | **PASS** | |
| `getState().items` 배열 | **PASS** | `[]` (0건) |
| mock/local fallback 없음 | **PASS** | `STAM.fnBoard` 없음; `functional-definition-cycle.js` 미로드 |
| read 실패 시 조용한 mock fallback | **PASS** | `load().catch` → `renderError()` + `state.items = []` (소스·contract 확인) |
| 0건 empty state | **PASS** | "등록된 기능정의가 없습니다" |
| `#fsl-srcbadge` Firestore | **PASS** | |

**로드된 scripts (FS-4):**

- `stam.functional-specification.js`
- `/__/firebase/8.10.1/firebase-{app,auth,firestore}.js`, `/__/firebase/init.js`
- `stam.functional-spec-firestore-adapter.js`
- `stam.functional-spec-service.js`
- `stam.functional-spec-firestore-list.js`

**제거 확인:** `stam.functional-definition-cycle.js`, `stam.functional-definition-crud.js` — **미로드**

### 5-3. 목록 표시

| 항목 | 결과 |
|------|------|
| static tbody 샘플 5건 (`FN-001`~`FN-005` list rows) | **PASS** — tbody `data-fn-id` 행 **0건** |
| raw Firestore doc id 화면 노출 | **PASS** — code 없을 때 `formatFunctionalSpecCode` → `-` (contract) |
| code 없으면 `-` | **PASS** — `formatFunctionalSpecCode({ id })` → `'-'` |
| requirement 없으면 | **chip `연결 필요`** | `-` 문자열이 아닌 기존 B5 chip 패턴 유지 (FS-4 list renderer) |
| summary strip | **PASS** — `0,0,0,0,0,0,0` (0건 기준) |
| footer count | **PASS** — `총 0건 중 0건 표시` |

### 5-4. CRUD 미연결

| 항목 | 결과 |
|------|------|
| list 모듈 Firestore `create` 호출 | **PASS** — 없음 (소스·contract) |
| list 모듈 Firestore `update` 호출 | **PASS** — 없음 |
| delete / softDelete UI·list 연결 | **PASS** — 없음 |
| `functionalSpecService` `delete` / `softDelete` / `remove` | **PASS** — public API 없음 (FS-2 contract) |
| `functionalSpecFirestoreAdapter` `delete` / `softDelete` / `remove` | **PASS** — public API 없음 |
| service `create` / `update` 메서드 존재 | **예 (FS-2)** | domain service 계약 — **UI 저장 wiring 없음** (FS-5) |

### 5-5. Legacy / mock 잔존 (수정 없음 — 후속)

Drawer 정적 마크업에 **기존 샘플 ID/문구가 잔존** (list read와 무관, FS-5 cleanup 대상):

| 위치 | 잔존 샘플 | 후속 |
|------|-----------|------|
| `#fn-dw-detail` badge | `FN-001` | FS-5 detail binding |
| `#fn-dw-detail` 연결 정보 | `FN-001` (`.fn-iv-id`) | FS-5 |
| `#fn-dw-edit` badge / input | `FN-001` | FS-5 edit binding |
| `#fn-dw-register` ID input | `FN-006` (placeholder) | FS-5 / FS-6 counter |
| 등록 drawer 메타 | "등록 후 ID가 자동 부여됩니다" | FS-6 `FN_###` |

> **판정:** list tbody mock 5건은 FS-4에서 **제거 완료**. Drawer 내부 mock은 **의도적 미수정** — FS-5 CRUD UI wiring 시 Firestore row 선택 기반으로 교체.

## 6. staging live 상태 (참고)

`https://stam-design-staging.web.app` (2026-07-09):

- tbody에 `FN-001`~`FN-005` static rows **잔존**
- `stam.functional-definition-cycle.js` **로드**
- `stam.functional-spec-firestore-list.js` **미포함**

→ main merge 후 **staging Hosting 재배포 필요** (maintainer). 재배포 후 본 smoke를 staging URL에서 재실행 권장.

## 7. Governance (본 PR)

| 항목 | 결과 |
|------|------|
| 수정 파일 | `docs/reports/STAM_FS4_FunctionalSpec_List_Read_Post_Merge_Smoke_QA.md` (+ Decisions §4-23) |
| `stam/pages/**` / `stam/js/**` / `stam/css/**` | **변경 없음** |
| 신규 CSS/JS | **0건** |
| inline style/script | **없음** |

## 8. 종합 판정

| 영역 | 판정 |
|------|------|
| FS-4 list read binding (preview = main 산출물) | **PASS** |
| CRUD 미연결 | **PASS** |
| Drawer legacy mock | **잔존** — FS-5 cleanup (수정 없음) |
| staging live FS-4 반영 | **대기** — Hosting 재배포 후 재검증 |

## 9. 후속

| PR | 내용 |
|----|------|
| FS-5 | CRUD UI wiring + Drawer mock 제거/바인딩 |
| FS-6 | `FN_###` code counter |
| FS-7 | maintainer live Firestore persistence QA |
| infra | staging Hosting 재배포 (main `46d2af3`) |
