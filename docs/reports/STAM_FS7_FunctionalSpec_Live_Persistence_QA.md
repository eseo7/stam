# STAM FS-7 — Functional Specification Live Firestore Persistence QA

## 1. 목적

FS-5~FS-6B merge 이후 기능정의서 **실제 Firestore persistence**를 maintainer Google 세션으로 증빙한다.

- create / update (요구사항 picker 연결·변경·해제 포함)
- FN_### counter 할당
- unlink 시 `requirementId` / `requirementCode` / `requirementTitle` **필드 제거** (빈 문자열·null 잔존 없음)
- viewer write 차단, delete 미개방

본 PR은 **live QA evidence PR**이며, 제품 `stam/js/**` · `firestore.rules` · pages/css **변경을 포함하지 않는다** (docs-only).

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `3cb4704` (FS-6B requirement picker #378) |
| 선행 merge | FS-5 #374, FS-6A #377, FS-6B #378 |
| staging live | `https://stam-design-staging.web.app` |
| Firebase project | `stam-preview-hosting` |
| projectId | `stam-demo` |
| collection | `projects/{projectId}/functionalSpecifications/{functionalSpecId}` |
| counter | `projects/{projectId}/counters/functionalSpecifications` |
| 화면 | `stam/pages/boards/functional-specification.html` |

## 3. 사전 확인 (contract — maintainer 실행 전)

```bash
node scripts/test-functional-spec-service-contract.mjs
node scripts/test-functional-spec-crud-ui-contract.mjs
node scripts/test-functional-spec-list-contract.mjs
node scripts/test-functional-spec-counter-contract.mjs
node scripts/test-functional-spec-role-matrix-contract.mjs
node scripts/test-requirement-picker-contract.mjs
node scripts/qa-fs6b-requirement-picker-browser-smoke.mjs
```

| script | 기대 |
|--------|------|
| `test-functional-spec-service-contract.mjs` | PASS |
| `test-functional-spec-crud-ui-contract.mjs` | PASS |
| `test-functional-spec-list-contract.mjs` | PASS |
| `test-functional-spec-counter-contract.mjs` | PASS |
| `test-functional-spec-role-matrix-contract.mjs` | PASS |
| `test-requirement-picker-contract.mjs` | PASS |
| `qa-fs6b-requirement-picker-browser-smoke.mjs` | 15/15 PASS |

> Automated shim smoke는 **live PASS 대체 불가**. 본 FS-7은 maintainer 세션 결과만 live 판정에 사용한다.

## 4. QA 방식

| 계층 | 방법 | live 판정 |
|------|------|-----------|
| A. Contract smoke | §3 Node scripts | 선행 조건 |
| B. Browser shim | `qa-fs6b-requirement-picker-browser-smoke.mjs` | **live 대체 불가** |
| C. Staging live Firestore | Maintainer Google OAuth (owner/editor writer) | **본 PR 목표** |

## 5. Maintainer live persistence — 실행 절차

### 사전 조건

- Firebase Console: `stam-preview-hosting` 프로젝트 접근
- writer: `stam-demo` 프로젝트 **owner** 또는 **editor** 멤버
- viewer: `stam-demo` **viewer** 멤버 (write 차단 확인용)
- URL: `https://stam-design-staging.web.app/pages/boards/functional-specification?projectId=stam-demo`
- Firestore Console 경로: `projects/stam-demo/functionalSpecifications/{docId}`

### Writer checklist (owner/editor)

| # | 시나리오 | UI 확인 | Firestore 확인 | 결과 |
|---|----------|---------|----------------|------|
| W-01 | maintainer 로그인 후 기능정의서 화면 진입 | 목록 로드 | — | [ ] |
| W-02 | 요구사항 **선택** 후 기능 등록 | picker `REQ_### · title` 표시 | doc에 `requirementId`, `requirementCode`, `requirementTitle` **3필드 존재** | [ ] |
| W-03 | 새로고침 후 W-02 등록 유지 | list/detail chip `REQ_###` | 동일 doc 필드 유지 | [ ] |
| W-04 | FN_### code 자동 부여 | 목록/상세 `FN_###` | `code` 필드 + counter `lastNumber` 증가 | [ ] |
| W-05 | 다른 요구사항으로 **변경** (update) | picker·chip 갱신 | 3필드 **동시** 새 값 | [ ] |
| W-06 | 새로고침 후 W-05 유지 | UI 일치 | Firestore 일치 | [ ] |
| W-07 | 요구사항 **연결 해제** (update) | chip `연결 필요` / detail 미표시 | doc에서 3필드 **키 자체 없음** (빈 문자열·null **아님**) | [ ] |
| W-08 | 새로고침 후 W-07 유지 | unlink 상태 유지 | 3필드 여전히 없음 | [ ] |
| W-09 | 미연결 등록 (picker 미선택) | 연결 chip 없음 | 3필드 **omit** (키 없음) | [ ] |
| W-10 | raw Firestore doc id UI 미노출 | picker/list/detail에 doc id 문자열 없음 | `requirementId`는 저장만 (UI 미노출) | [ ] |
| W-11 | delete 미개방 | toolbar/detail delete disabled + alert | `allow delete: false` (rules) | [ ] |
| W-12 | console fatal error 없음 | DevTools | — | [ ] |

### Viewer checklist

| # | 시나리오 | 기대 | 결과 |
|---|----------|------|------|
| V-01 | 목록 조회 | read OK | [ ] |
| V-02 | 등록/수정 버튼 | **disabled** | [ ] |
| V-03 | delete 버튼 | disabled + alert | [ ] |

### Firestore unlink 검증 (W-07 필수)

Console에서 대상 `functionalSpecifications` 문서를 열고 아래를 확인한다.

1. `requirementId` 키 **없음**
2. `requirementCode` 키 **없음**
3. `requirementTitle` 키 **없음**
4. 빈 문자열 `""` 또는 `null` 값으로 남아 있지 **않음**
5. 다른 필드(`title`, `code`, `version` 등)는 정상 유지

```txt
# 기대 (unlink 후) — 연결 관련 키 자체가 absent
{
  "id": "...",
  "code": "FN_###",
  "title": "...",
  ...
  // requirementId / requirementCode / requirementTitle 없음
}
```

## 6. 기능 계약 (live 판정 기준)

| 계약 | live PASS 조건 |
|------|----------------|
| 연결 저장 | 3필드 모두 존재 |
| 연결 변경 | 3필드 동시 갱신 |
| 연결 해제 | 3필드 모두 **delete** (키 absent) |
| 부분 잔존 | **FAIL** — 일부만 있거나 빈 문자열 잔존 |
| 표시 | `REQ_###` only — raw doc id UI 미노출 |
| FN counter | `FN_###` 할당, counter 증가 |
| delete | UI·rules 미개방 |

## 7. Maintainer live QA 결과

> **현재 상태: 미확인** — Cloud Agent는 Google OAuth maintainer 세션으로 본 절을 대행할 수 없다. maintainer가 §5 실행 후 아래 표를 채운다.

| 항목 | 값 |
|------|-----|
| 수행 주체 | _(maintainer)_ |
| 수행 일시 (UTC) | _(미기입)_ |
| QA URL | _(staging live URL)_ |
| writer role | _(owner/editor)_ |
| viewer live | _(미확인)_ |

### Writer 결과 요약

| ID | 결과 |
|----|------|
| W-01 ~ W-12 | **미확인** |

### Viewer 결과 요약

| ID | 결과 |
|----|------|
| V-01 ~ V-03 | **미확인** |

## 8. 종합 판정

| 영역 | 판정 |
|------|------|
| Contract + shim smoke (§3) | **PASS** (main @ `3cb4704` 기준) |
| Maintainer live Firestore persistence | **미확인** |
| Unlink 필드 실제 제거 (live) | **미확인 — PASS 금지** |

**FS-7 PR Ready 조건:** §5 maintainer checklist 완료 + §7 결과 기입 + W-07 Firestore Console 스크린샷 또는 콘솔 필드 목록 증빙 (repo 미커밋 artifact 허용).

## 9. Governance

| 항목 | 결과 |
|------|------|
| `stam/js/**` | **변경 없음** |
| `stam/css/**` | **변경 없음** |
| `firestore.rules` | **변경 없음** |
| `stam/pages/**` | **변경 없음** |
| 신규 파일 | `docs/reports/STAM_FS7_FunctionalSpec_Live_Persistence_QA.md` only |

## 10. 관련 문서

- `docs/reports/STAM_FS5_FunctionalSpec_CRUD_UI_QA.md` — CRUD wiring
- `docs/reports/STAM_FS6A_FunctionalSpec_FN_Code_Counter_QA.md` — FN counter
- `docs/reports/STAM_FS6B_FunctionalSpec_Requirement_Picker_QA.md` — picker + shim smoke
- `docs/reports/STAM_PR363_Requirements_CRUD_Live_QA.md` — Requirements live QA analog
