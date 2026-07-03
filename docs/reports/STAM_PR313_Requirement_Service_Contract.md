# STAM PR313 — Requirement Service Contract + Firestore Adapter

## Purpose

PR #313 introduces the Requirement Domain Service contract and Firestore Adapter boundary required by the STAM Portability Baseline.

Reference:

- `docs/reports/STAM_Portability_Baseline_Data_API_React_v1.md`

## Scope

Added files:

- `stam/js/stam.requirements-service.js`
- `stam/js/stam.requirements-firestore-adapter.js`
- `scripts/test-requirements-service-contract.mjs`
- `docs/reports/STAM_PR313_Requirement_Service_Contract.md`

No existing page, screen script, CSS, Firestore rules, Firebase config, workflow, package manifest, or lockfile is changed.

## No UI Wiring / No Runtime Write Path Exposed

- No screen HTML imports were added.
- No existing screen JS was modified to call the new service.
- Loading the service file does not create, update, or delete Requirement data.
- Firestore write functions exist only behind the adapter/service contract.
- Users cannot save, edit, or delete Requirements from the UI because of this PR.

## Architecture

```text
Future screen code
  -> STAM.requirementsService
  -> STAM.requirementsFirestoreAdapter
  -> Firestore projects/{projectId}/requirements/{requirementId}
```

The Firestore path is encapsulated in:

- `stam/js/stam.requirements-firestore-adapter.js`

The Domain Service owns:

- Permission action names
- Common metadata defaults
- Domain Model normalization
- Soft delete patch shape
- Adapter method contract

## Service Contract

Global namespace:

- `window.STAM.requirementsService`
- `window.STAM.requirementsServiceContract`

Methods:

| Method | Purpose | Permission action |
| --- | --- | --- |
| `listByProject(projectId, query, context)` | List project requirements | `requirement.read` |
| `getById(projectId, requirementId, context)` | Read one requirement | `requirement.read` |
| `create(projectId, input, context)` | Create requirement domain object | `requirement.create` |
| `update(projectId, requirementId, patch, context)` | Update requirement fields | `requirement.update` |
| `softDelete(projectId, requirementId, reason, context)` | Mark requirement deleted | `requirement.delete` |
| `buildAuditEvent(action, before, after, context)` | Build portable audit event shape | N/A helper |

Public contract helpers are exposed on both `STAM.requirementsService` and `STAM.requirementsServiceContract`:

| Helper | Purpose |
| --- | --- |
| `normalizeRequirement(raw)` | Convert adapter/raw data into the portable Requirement Domain Model. |
| `validateRequirementInput(input, mode)` | Validate create/update input and return `{ valid, mode, errors }`. |
| `buildCreatePayload(input, context)` | Build a create payload with common metadata defaults. |
| `buildUpdatePatch(patch, context)` | Build a sanitized update patch with update metadata. |

The service normalizes enum values before returning Domain Model objects or adapter payloads. Each enum has a fixed value set and a default. Any value outside the set (or an empty value) is normalized to the default instead of raising a validation error:

| Field | Allowed values | Default | Out-of-set example |
| --- | --- | --- | --- |
| `status` | `draft`, `active`, `review`, `approved`, `archived` | `draft` | `reviewing -> draft` |
| `priority` | `low`, `normal`, `high`, `critical` | `normal` | `urgent -> normal` |
| `visibility` | `project`, `internal`, `customer`, `private` | `project` | `external -> project` |

`reviewStatus` (default `Review Needed`) and `approvalStatus` (default `none`) are metadata strings that fall back to their default only when empty.

## Firestore Adapter Contract

Global namespace:

- `window.STAM.requirementsFirestoreAdapter`

Methods:

| Method | Firestore boundary |
| --- | --- |
| `listByProject(projectId, query)` | Reads `projects/{projectId}/requirements` and filters deleted items by default. |
| `getById(projectId, requirementId)` | Reads one requirement document. |
| `create(projectId, requirement)` | Writes a new requirement document. |
| `update(projectId, requirementId, patch)` | Updates a requirement document. |
| `softDelete(projectId, requirementId, patch)` | Applies service-built soft delete patch. |

## Requirement Domain Fields

The service normalizes the common metadata baseline:

- `id`
- `projectId`
- `code`
- `title`
- `description`
- `status`
- `priority`
- `ownerUid`
- `ownerName`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `deletedAt`
- `deletedBy`
- `isDeleted`
- `version`
- `sortOrder`
- `tags`
- `visibility`
- `reviewStatus`
- `approvalStatus`

## Soft Delete Baseline

`softDelete()` does not hard delete.

It sets:

- `isDeleted: true`
- `deletedAt`
- `deletedBy`
- `updatedAt`
- `updatedBy`
- incremented `version`
- optional `deleteReason`

## Permission Portability

The service accepts an `authorize(action, request)` hook through `createService()`.

This keeps permission action names visible at the service boundary and portable to a future Backend API:

- `requirement.read`
- `requirement.create`
- `requirement.update`
- `requirement.delete`

The default authorization hook is a no-op allow hook for contract-only use. Future UI/API integration should provide a real permission implementation.

## Backend API / PostgreSQL / React Compatibility

The service returns Domain Model objects, not Firestore snapshots.

Future mapping:

| Current PR313 object | Future target |
| --- | --- |
| `STAM.requirementsService` | TypeScript service module / API client |
| `STAM.requirementsFirestoreAdapter` | Backend API adapter or repository implementation |
| Requirement Domain Model | TypeScript `Requirement` interface |
| Service permission action names | Backend authorization actions |
| Soft delete patch | PostgreSQL update with audit transaction |

## Verification

Command:

```bash
node scripts/test-requirements-service-contract.mjs
```

Verified:

- Service loads without DOM or UI wiring.
- Firestore adapter loads without touching Firebase until method call.
- `listByProject()` uses `requirement.read`.
- `create()` fills common metadata and default status fields.
- `priority` is included in the Requirement Domain Model with default `normal`.
- `status`, `priority`, and `visibility` are normalized against fixed value sets in create payloads, update patches, and raw Domain Model conversion.
- Out-of-set enum values are normalized to the field default rather than rejected by `validateRequirementInput()`.
- `update()` prevents ID/project reassignment and increments version.
- `softDelete()` sets soft delete fields and increments version.
- `normalizeRequirement()`, `validateRequirementInput()`, `buildCreatePayload()`, and `buildUpdatePatch()` are exposed on both public service contract objects.
- `buildCreatePayload()` fills common metadata while `buildUpdatePatch()` strips immutable fields.
- `buildAuditEvent()` returns portable audit field shape.
- Firestore adapter encapsulates `projects/{projectId}/requirements`.

## Governance Result

- Product screen changes: none
- Existing screen JS behavior changes: none
- Existing HTML imports: none
- CSS changes: none
- Firestore rules changes: none
- Firebase config changes: none
- Workflow changes: none
- Runtime dependency changes: none
- No UI wiring / no runtime write path exposed: confirmed
