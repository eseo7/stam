# STAM FS-2 — Functional Specification Service & Firestore Adapter QA

## 1. 목적

FS-1 `functionalSpecifications` write rules 이후, **domain service + Firestore adapter** 계층을 Requirements 패턴으로 추가한다. UI / pages / script tag 연결은 **하지 않는다**.

## 2. 기준

| 항목 | 값 |
|------|-----|
| base | `main` @ `5508b0c` (FS-1 #369 merge 후) |
| collection | `projects/{projectId}/functionalSpecifications/{functionalSpecId}` |
| 선행 | PR #368 inventory, PR #369 FS-1 rules |

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `stam/js/stam.functional-spec-service.js` | **신규** — domain service + role authorize |
| `stam/js/stam.functional-spec-firestore-adapter.js` | **신규** — Firestore adapter |
| `scripts/test-functional-spec-service-contract.mjs` | **신규** |
| `docs/reports/STAM_FS2_FunctionalSpec_Service_Adapter_QA.md` | 본 리포트 |

## 4. Service 계약

| 항목 | 내용 |
|------|------|
| Runtime API | `listByProject`, `getById`, `create`, `update` |
| Actions | `functionalSpec.read` / `.create` / `.update` (**delete action 없음**) |
| Default runtime | **deny-by-default** (`defaultAuthorize` → false) |
| Role wrapper | `createMemberRoleAuthorize` — owner/admin/editor write, viewer read |
| Create 필수 | `title`, `status`, `priority` (rules enum 정합) |
| Status enum | `draft` / `review` / `done` / `approved` / `hold` |
| Priority enum | `high` / `mid` / `low` |
| Function type enum | `view` / `create` / `update` / `delete` / `approve` / `notify` / `export` / `integrate` (optional) |
| Requirement link (optional) | `requirementId`, `requirementCode`, `requirementTitle` |
| Delete / softDelete | **API 미노출** |
| `FN_###` code counter | **미포함** (FS-6) — empty `code` omit |

## 5. Adapter 계약

| 항목 | 내용 |
|------|------|
| Collection | `functionalSpecifications` |
| Paths | `projects/{projectId}/functionalSpecifications/{functionalSpecId}` |
| Create | `set` + server timestamps; omit empty `code` |
| Update | `update` patch + `updatedAt` server timestamp |
| List sort | `updatedAt` desc → `code`/`id` |
| Counters | **미사용** |

## 6. 검증

```bash
node --check stam/js/stam.functional-spec-service.js
node --check stam/js/stam.functional-spec-firestore-adapter.js
node scripts/test-functional-spec-service-contract.mjs
node scripts/test-functional-spec-rules-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-rules-contract.mjs
```

## 7. Governance

| 항목 | 결과 |
|------|------|
| `firestore.rules` | **변경 없음** |
| `stam/pages/**` | **변경 없음** |
| Requirements JS | **변경 없음** |
| 기존 기능정의서 UI JS | **변경 없음** |
| nav-data / workflows / package | **변경 없음** |
| 신규 stam/js | service + adapter **2건** (FS-2 범위) |
| inline style/script | **없음** |

## 8. 후속 PR

| PR | 내용 |
|----|------|
| FS-3 | role matrix smoke QA |
| FS-4 | list read UI binding |
| FS-5 | CRUD UI wiring (delete visible+disabled) |
| FS-6 | `FN_###` code counter + requirement picker |
