# STAM PR #362 — Requirements List Service Binding & HTML Escape QA Report

## 1. 목적

- PR #361 deny-by-default 이후 **requirements list read**가 role-bound service로 정상 동작하도록 보정.
- `innerHTML` 렌더 경로의 **HTML escaping** 정상화.
- create 경로에서 **delete-like 필드 주입 차단**.
- Firestore rules / nav / pages / CSS **미변경** — JS·service contract만 보정.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `5959b1352a5b033c9f44d65bfd3d3f1cd59de021` |
| 선행 | PR #360 CRUD UI wiring, PR #361 deny-by-default + softDelete API 폐쇄 |
| 범위 | list service binding, esc(), buildCreatePayload hardening, contract tests |

## 3. 변경 요약

| 파일 | 변경 |
|------|------|
| `stam/js/stam.requirements-firestore-list.js` | `load()`에서 `bindAuthorizedService()` 이후 `service()` 재획득; `esc()` STAM 표준 escape 패턴 적용 |
| `stam/js/stam.requirements-service.js` | `buildCreatePayload()` create 시 `deletedAt`/`deletedBy`/`isDeleted` 항상 초기화 |
| `scripts/test-requirements-firestore-list-contract.mjs` | deny-by-default + rebind 후 list 성공, HTML escape assert |
| `scripts/test-requirements-service-contract.mjs` | create delete-field injection strip assert |
| `scripts/test-requirements-crud-ui-contract.mjs` | load() service capture 순서·esc 패턴 assert |
| `docs/reports/STAM_PR362_Requirements_List_Service_Escape_QA.md` | 본 리포트 |

## 4. 결함·보정

### 4-1. List service binding (PR #361 회귀)

| 항목 | 이전 | 이후 |
|------|------|------|
| `load()` | `var svc = service()`를 guard/bind **이전**에 캡처 | `bindAuthorizedService()` **이후** `service()` 재획득 |
| deny-by-default 영향 | stale deny service로 `listByProject` permission denied 가능 | role-bound service로 read 정상 |

### 4-2. HTML escaping

| 항목 | 이전 | 이후 |
|------|------|------|
| `esc()` | object lookup 기반 (`&`, `<`, `>`, `"`) | chained replace + `'` (`&#39;`) — `stam.board-factory.js` 패턴 정렬 |
| 렌더 경로 | `rowHtml`, `renderDetail`, `setHtml`, `linkChip` 등 | 동일 경로, escape 출력 보장 |

### 4-3. Create delete-field injection

| 필드 | create 입력 주입 시 | `buildCreatePayload()` 출력 |
|------|---------------------|----------------------------|
| `deletedAt` | 임의 값 | `null` |
| `deletedBy` | 임의 값 | `null` |
| `isDeleted` | `true` 등 | `false` |

delete/softDelete public API는 PR #361과 동일하게 **미개방**.

## 5. 자동 검증 (contract)

```bash
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
```

## 6. 범위 외

| 항목 | 비고 |
|------|------|
| `firestore.rules` | 미변경 |
| `stam/pages/**` | 미변경 |
| `stam/css/**`, `stam/js/stam.nav-data.js` | 미변경 |
| requirement delete / softDelete 개방 | 후속 policy PR |
| functionalSpecs / wbsItems / screenSpecs write | 미개방 |

## 7. PR 체크리스트

- [x] 사용 CSS: `stam.tokens.css`, `stam.shell.css`, `stam.components.css` (페이지 기존 로드, diff 없음)
- [x] 사용 JS: `stam.requirements-firestore-list.js`, `stam.requirements-service.js` (기존 contract API)
- [x] 새 CSS/JS 파일: **0건**
- [x] inline style/script: **없음**
- [x] 금지 경로 변경: **없음**
