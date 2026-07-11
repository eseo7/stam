# STAM FS-7 Hotfix — Legacy Requirement Display (code 없는 연결)

## 1. 목적

기능정의서에서 code 없는 legacy 요구사항을 picker로 연결·변경했을 때 list/detail 연결 표시가 사라지는 회귀를 보정한다.

## 2. 현상

| 단계 | 결과 |
|------|------|
| `REQ_###` 요구사항 연결 | chip·detail 정상 표시 |
| code 없는 legacy 요구사항으로 **변경** | 연결은 저장되나 UI에서 **숨김** |
| 원래 `REQ_###` 요구사항으로 **되돌림** | 다시 표시 |

## 3. 원인

1. Picker는 legacy 요구사항(code 없음) 선택 가능
2. 저장: `requirementId` + `requirementTitle`, `requirementCode`는 빈 문자열
3. List/detail 렌더: `requirementCode` 있을 때만 표시
4. → Firestore 연결 존재, UI만 미표시

## 4. 수정 범위

| 허용 | 금지 |
|------|------|
| `stam/js/stam.functional-spec-firestore-list.js` | picker 저장 로직 |
| contract tests | functional-spec service/adapter |
| 본 QA · Decisions §4-28 | firestore.rules, counter, CRUD create/update, CSS |

## 5. 표시 계약

| 저장 상태 | list chip / detail 라벨 |
|-----------|-------------------------|
| code + title | `REQ_001 · 요구사항 제목` |
| code only | `REQ_###` |
| title only (legacy) | 요구사항 제목 |
| id only | `(제목 없음)` |
| **금지** | raw Firestore doc id, 임의 생성 `REQ_###` |

연결 판정: `requirementId` **OR** `requirementTitle` **OR** `requirementCode`.

## 6. Automated verification

```bash
node scripts/test-functional-spec-list-contract.mjs
node scripts/test-functional-spec-crud-ui-contract.mjs
```

| script | 기대 |
|--------|------|
| `test-functional-spec-list-contract.mjs` | PASS — legacy title-only / code+title / code-only / id-only fallback |
| `test-functional-spec-crud-ui-contract.mjs` | PASS — `hasRequirementLink`, `requirementDisplayLabel` 존재 |

## 7. Maintainer live spot-check (FS-7 연계)

| # | 시나리오 | UI 기대 |
|---|----------|---------|
| H-01 | code 없는 legacy 요구사항 연결 후 저장 | list chip에 **제목** 표시 |
| H-02 | 새로고침 후 H-01 유지 | chip·detail 연결 유지 |
| H-03 | `REQ_###` 요구사항으로 변경 | `REQ_### · 제목` 또는 `REQ_###` |
| H-04 | Firestore doc id가 화면 HTML에 노출되지 않음 | PASS |

## 8. 판정

| 계층 | 결과 |
|------|------|
| Contract (§6) | [ ] PASS |
| Maintainer live (§7) | [ ] FS-7 checklist 연계 |
