# STAM PR #360 — Requirements CRUD UI Wiring QA Report

## 1. 목적

- Requirements 화면(`stam/pages/boards/requirements.html`)의 **read / create / update**를 `STAM.requirementsService` + Firestore adapter 경로로 연결한다.
- PR #358 role-scoped write rules + PR #359 role matrix smoke QA 이후 **제품 UI wiring** 단계(A3b)를 완료한다.
- **delete 미개방**, **기타 산출물 write 미개방**, **nav/rules/infra 변경 없음**을 유지한다.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `b4e4a57` |
| 선행 | PR #358 write rules, PR #359 role matrix smoke |
| 대상 화면 | `stam/pages/boards/requirements.html` |

## 3. repo 구조 확인 (작업 전)

| 확인 항목 | 결과 |
|-----------|------|
| `stam/pages/requirements/**` | **없음** — 실제 제품 화면은 `stam/pages/boards/requirements.html` |
| Requirements JS | `stam.requirements-service.js`, `stam.requirements-firestore-adapter.js`, `stam.requirements-firestore-list.js`, `stam.requirements-crud.js`(Local Core DB, **미로드**) |
| Requirements CSS | `stam/css/stam.requirements.css` |
| Contract scripts | `test-requirements-*-contract.mjs` 7종 + role matrix smoke |

## 4. Role matrix (유지)

| role | read | create | update | delete |
|------|------|--------|--------|--------|
| owner | allow | allow | allow | **deny** |
| admin | allow | allow | allow | **deny** |
| editor | allow | allow | allow | **deny** |
| viewer | allow | **deny** | **deny** | **deny** |

### UI 동작

| role | 목록 read | 등록 drawer | 수정 drawer | 삭제 버튼 |
|------|-----------|-------------|-------------|-----------|
| owner/admin/editor | O | O | O | disabled + 안내 |
| viewer | O | disabled | disabled | disabled + 안내 |

## 5. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.requirements-firestore-crud.js` | **신규** — create/update UI wiring, viewer read-only guard |
| `stam/js/stam.requirements-firestore-list.js` | role-bound service rebind, `memberRole` context, `getState` |
| `stam/js/stam.requirements-firestore-adapter.js` | write 시 `serverTimestamp()` 적용 (rules `request.time` 정합) |
| `stam/pages/boards/requirements.html` | crud script 로드 |
| `scripts/test-requirements-crud-ui-contract.mjs` | **신규** — wiring boundary contract |
| `scripts/test-requirements-firestore-list-contract.mjs` | `memberRole` context assertion |
| `docs/reports/STAM_PR360_Requirements_CRUD_UI_Wiring_QA.md` | 본 리포트 |

## 6. 자동 검증 (contract)

```bash
node scripts/test-requirements-crud-ui-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-role-matrix-contract.mjs
node scripts/test-requirements-rules-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-no-inline-style.mjs
```

## 7. Wiring 계약

| 계층 | 계약 |
|------|------|
| UI | register/edit drawer → `STAM.requirementsFirestoreCrud` |
| Service | `create` / `update` / `listByProject` / `getById` only |
| Authorize | `createMemberRoleAuthorize` — list guard 후 runtime rebind |
| Context | `actorUid`, `actorName`, `memberRole`, `projectId`, `source` |
| Adapter | `projects/{projectId}/requirements/{id}` — service 경유만 |
| Delete | UI disabled + `softDelete` 미호출 |
| Related artifacts | `persistRelatedArtifactsFromRequirement` **미연결** |

## 8. 범위 외

| 항목 | 비고 |
|------|------|
| requirement delete 개방 | 후속 PR |
| functionalSpecs / wbsItems / screenSpecs write | 금지 유지 |
| `stam.requirements-crud.js` (Local Core DB) | prototype 경로, 제품 화면 미로드 |
| `firestore.rules` 확대 | 금지 |
| nav / App Shell 구조 변경 | 금지 |
| staging browser 수동 QA | contract smoke; emulator QA는 maintainer 선택 |

## 9. Governance

| 항목 | 결과 |
|------|------|
| 사용 CSS | `stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.requirements.css` 등 **기존** |
| 사용 JS | `stam.requirements.js`, `stam.requirements-service.js`, `stam.requirements-firestore-adapter.js`, `stam.requirements-firestore-list.js`, `stam.requirements-firestore-crud.js` |
| 신규 CSS | **0건** |
| 신규 JS (공통 외) | `stam.requirements-firestore-crud.js` 1건 (requirements wiring 전용) |
| inline style/script (HTML diff) | **없음** |
| 금지 경로 | nav-data, firestore.rules, workflows, package.json **미변경** |

## 10. 후속 PR

1. requirement delete (soft delete rules + UI)
2. staging emulator/browser role matrix QA (선택)
3. functionalSpecs / WBS / screenSpecs write 단계별 개방
