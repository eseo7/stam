# STAM Portability Baseline — Data Model / Backend API / React Transition v1

## Document Purpose

This document defines the portability baseline for STAM before save, edit, and delete features are implemented.

- STAM may use Firebase Auth, Firestore, Vanilla JavaScript, and Firebase Hosting for the first implementation.
- The product baseline must remain a database-independent Domain Model, not a Firestore-only shape.
- CRUD implementation PRs must reference this document before adding persistence behavior.
- The frontend must be structured so it can move from direct Firebase implementation to Backend API and PostgreSQL without rewriting every screen.
- Future React / TypeScript work must be able to map existing screens, common renderers, and service functions into React components and typed service modules.

## 1. Executive Summary

### Current implementation stack

- HTML / CSS / Vanilla JavaScript
- Firebase Auth
- Firestore
- Firebase Hosting

### Long-term target

- React / TypeScript
- Backend API
- PostgreSQL

### Baseline decision

- Build quickly with Firebase now.
- Keep Domain Model, service layer, identifiers, metadata, authorization concepts, and relationships portable.
- Treat Firestore as the current storage adapter, not the product data contract.
- Prevent screen code from depending on deep Firestore paths or Firestore-only nested document structures.
- Design CRUD so Backend API and PostgreSQL can replace Firestore with bounded adapter changes.

## 2. Current vs Target Architecture

| Layer | Current | Intermediate Baseline | Target |
| --- | --- | --- | --- |
| Page composition | HTML Page | HTML Page | React Page |
| UI composition | Common Renderer | Common Renderer | React Components |
| Frontend logic | Frontend JS | Screen Controller + Service Layer | React hooks/components + typed Service Layer |
| Data access | Firestore direct read/write | Service Layer | Backend API client |
| Storage adapter | Firestore direct path usage | Firestore Adapter | Backend persistence layer |
| Database | Firestore | Firestore | PostgreSQL |
| Authorization | Firestore Rules | Firestore Rules + portable permission action names | Server-side authorization |
| Audit | Ad hoc or future Firestore documents | ChangeLog / ActivityLog service contract | Server-side audit log |
| Validation | Frontend guards + Firestore constraints | Domain validation before adapter call | Backend validation + typed client validation |

### Architecture transition rule

The next CRUD PRs should move toward:

```text
Screen code -> service layer -> Firestore adapter
```

The long-term target is:

```text
React component -> typed service layer -> Backend API -> PostgreSQL
```

## 3. Non-Negotiable Design Principles

1. **Domain Model first** — entity names, field contracts, lifecycle states, permissions, and relationships must be defined independently from Firestore paths.
2. **Firestore path should not leak into screen code** — screens call services such as `requirementService.listByProject(projectId)`, not nested Firestore collection chains.
3. **Every major entity must have portable IDs** — use string IDs that can map to Firestore document IDs, UUIDs, or API resource IDs.
4. **Common metadata fields required** — ownership, creation/update audit fields, soft delete, review, approval, version, and visibility metadata must be consistent.
5. **Soft delete first** — destructive UI actions should mark `isDeleted`, `deletedAt`, and `deletedBy` before any hard delete policy exists.
6. **Audit log first-class** — changes to major artifacts should produce ChangeLog and/or ActivityLog records through a service contract.
7. **Permission check must be portable to Backend API** — use permission action names that can be evaluated by Firestore Rules now and backend authorization later.
8. **UI permission and server permission are separate** — hiding or disabling UI actions is not authorization; storage/API enforcement remains required.
9. **No Firestore-only nested array dependency for relational data** — arrays may be display caches only, not authoritative relationship storage.
10. **Backend API compatibility must be considered before CRUD implementation** — every new CRUD path should have an equivalent REST contract.
11. **React transition should be component/service compatible** — screen state, table data, drawer forms, and action handlers should map cleanly to React components, hooks, and service modules.

## 4. Domain Entity Baseline

| Domain Entity | Purpose | Firestore Collection Candidate | PostgreSQL Table Candidate | First CRUD Priority | Notes |
| --- | --- | --- | --- | --- | --- |
| Project | Top-level workspace for STAM artifacts | `projects` | `projects` | P0 | Parent scope for most entities; all child entities require `projectId`. |
| ProjectMember | User membership, role, and project-level access | `projects/{projectId}/members` | `project_members` | P0 | Keyed by user UID or portable member ID; maps to authorization. |
| Requirement | Business or functional requirement artifact | `projects/{projectId}/requirements` | `requirements` | P0 | First candidate for CRUD and traceability. |
| WbsItem | Work breakdown item and delivery task | `projects/{projectId}/wbsItems` | `wbs_items` | P0 | Links to Requirement and delivery progress. |
| ScreenSpec | Screen or page specification | `projects/{projectId}/screens` | `screen_specs` | P1 | May link to requirements, function specs, and API specs. |
| FunctionSpec | Functional behavior specification | `projects/{projectId}/functionSpecs` | `function_specs` | P1 | Keep separate from ScreenSpec for reuse and traceability. |
| Program | Implementation program/module reference | `projects/{projectId}/programs` | `programs` | P1 | Links frontend/backend implementation units to specs and APIs. |
| ApiSpec | API contract or endpoint specification | `projects/{projectId}/apiSpecs` | `api_specs` | P1 | Candidate for backend transition documentation. |
| TableDefinition | Logical or physical table definition | `projects/{projectId}/tableDefinitions` | `table_definitions` | P1 | PostgreSQL migration anchor. |
| DbInfo | Database environment and connection metadata | `projects/{projectId}/dbInfos` | `db_infos` | P2 | Store non-secret metadata only; secrets must not be stored in client documents. |
| ServerInfo | Server/runtime/deployment metadata | `projects/{projectId}/serverInfos` | `server_infos` | P2 | Environment inventory, not credential storage. |
| AccessSecurity | Access/security requirements and controls | `projects/{projectId}/accessSecurity` | `access_security` | P1 | Maps to permission and security review controls. |
| OpenScenario | Scenario/open flow specification | `projects/{projectId}/openScenarios` | `open_scenarios` | P2 | May link screens, APIs, and requirements. |
| Policy | Project or artifact policy | `projects/{projectId}/policies` | `policies` | P2 | Includes review, retention, visibility, and workflow rules. |
| Comment | User comment on a target artifact | `projects/{projectId}/comments` | `comments` | P1 | Targeted by `targetType` and `targetId`; not embedded in artifacts. |
| Attachment | File metadata linked to an artifact | `projects/{projectId}/attachments` | `attachments` | P1 | Stores metadata and storage reference, not binary payload. |
| Approval | Approval workflow instance or decision | `projects/{projectId}/approvals` | `approvals` | P1 | Targeted by `targetType` and `targetId`; workflow state is portable. |
| ChangeLog | Structured record of domain changes | `projects/{projectId}/changeLogs` | `change_logs` | P0 | Required for audit and migration traceability. |
| ActivityLog | User/system activity stream | `projects/{projectId}/activityLogs` | `activity_logs` | P1 | May be append-only; used for timeline and audit visibility. |
| PermissionRule | Project-level or entity-level permission rule | `projects/{projectId}/permissionRules` | `permission_rules` | P0 | Defines portable action names and scopes. |

## 5. Common Field Contract

These fields apply to major STAM artifacts unless explicitly documented otherwise.

| Field | Meaning | Firestore type | PostgreSQL type candidate | Required | Migration note |
| --- | --- | --- | --- | --- | --- |
| `id` | Portable entity identifier | `string` | `uuid` or `text` primary key | Yes | Prefer generated ID that can be reused as API resource ID. |
| `projectId` | Parent project scope | `string` | `uuid` or `text` foreign key | Yes for project-scoped entities | Must match parent path in Firestore and FK in PostgreSQL. |
| `code` | Human-readable artifact code | `string` | `varchar(80)` | Recommended | Use unique key with `projectId` when stable codes are required. |
| `title` | Primary display title | `string` | `varchar(255)` | Yes for artifacts | Required for list/search UI and migration readability. |
| `description` | Longer description or notes | `string` | `text` | No | Keep rich text format decisions explicit before migration. |
| `status` | Lifecycle status | `string` | `varchar(40)` or enum | Yes | Avoid Firestore-only arbitrary statuses; document allowed values per entity. |
| `ownerUid` | Firebase/user owner UID | `string` | `text` or FK to users | Recommended | May map to backend user ID; do not assume Firebase forever. |
| `ownerName` | Owner display name cache | `string` | `varchar(120)` | No | Display cache only; not authorization source. |
| `createdAt` | Creation timestamp | `timestamp` | `timestamptz` | Yes | Use server timestamp where possible. |
| `createdBy` | Creator user ID | `string` | `text` or FK to users | Yes | Must be set by trusted layer when backend exists. |
| `updatedAt` | Last update timestamp | `timestamp` | `timestamptz` | Yes | Use for ordering, optimistic UI, and sync. |
| `updatedBy` | Last updater user ID | `string` | `text` or FK to users | Yes | Required for audit and support. |
| `deletedAt` | Soft deletion timestamp | `timestamp` or `null` | `timestamptz null` | No | Set only when soft deleted. |
| `deletedBy` | Soft deletion actor | `string` or `null` | `text null` | No | Required when `isDeleted = true`. |
| `isDeleted` | Soft delete flag | `boolean` | `boolean default false` | Yes | Default false; list APIs filter out deleted by default. |
| `version` | Optimistic concurrency / revision number | `number` | `integer` | Yes | Increment on update; supports future API conflict checks. |
| `sortOrder` | Manual ordering value | `number` | `integer` or `numeric` | No | Avoid relying on array order inside parent documents. |
| `tags` | Search/filter tags | `array<string>` | `text[]` or join table | No | For relational queries, future `artifact_tags` join table may be needed. |
| `visibility` | Visibility level | `string` | `varchar(40)` or enum | Yes | Example values: `project`, `internal`, `customer`, `private`. |
| `reviewStatus` | Review workflow state | `string` | `varchar(40)` or enum | Recommended | Separate from approval status; supports review without formal approval. |
| `approvalStatus` | Approval workflow state | `string` | `varchar(40)` or enum | Recommended | Example values: `none`, `pending`, `approved`, `rejected`. |

### Common metadata rules

- All list queries should default to `isDeleted == false`.
- `createdAt`, `createdBy`, `updatedAt`, and `updatedBy` should be set through a service helper or adapter boundary, not repeatedly by each screen.
- `ownerName`, display labels, and denormalized counts are display caches only.
- `version` is required even if the first Firestore implementation does not enforce conflict detection.

## 6. Firestore Collection Baseline

| Domain area | Firestore path candidate | Notes |
| --- | --- | --- |
| Project | `projects/{projectId}` | Top-level project document. |
| Project member | `projects/{projectId}/members/{memberUid}` | UID may be Firebase UID now; keep member domain fields portable. |
| Requirement | `projects/{projectId}/requirements/{requirementId}` | First CRUD candidate. |
| WBS item | `projects/{projectId}/wbsItems/{wbsItemId}` | Use camel-case collection name only behind adapter. |
| Screen spec | `projects/{projectId}/screens/{screenId}` | Maps to `screen_specs` later. |
| Function spec | `projects/{projectId}/functionSpecs/{functionSpecId}` | Links to screen specs through relation documents. |
| Program | `projects/{projectId}/programs/{programId}` | Implementation unit reference. |
| API spec | `projects/{projectId}/apiSpecs/{apiSpecId}` | API contract reference. |
| Table definition | `projects/{projectId}/tableDefinitions/{tableDefinitionId}` | Database model reference. |
| DB info | `projects/{projectId}/dbInfos/{dbInfoId}` | Non-secret database metadata. |
| Server info | `projects/{projectId}/serverInfos/{serverInfoId}` | Non-secret server metadata. |
| Access security | `projects/{projectId}/accessSecurity/{accessSecurityId}` | Security controls and requirements. |
| Open scenario | `projects/{projectId}/openScenarios/{openScenarioId}` | Scenario and flow documents. |
| Policy | `projects/{projectId}/policies/{policyId}` | Project policy or workflow policy. |
| Comment | `projects/{projectId}/comments/{commentId}` | Target by `targetType` and `targetId`. |
| Attachment | `projects/{projectId}/attachments/{attachmentId}` | Target by `targetType` and `targetId`. |
| Approval | `projects/{projectId}/approvals/{approvalId}` | Target by `targetType` and `targetId`. |
| Change log | `projects/{projectId}/changeLogs/{changeLogId}` | Append-focused audit record. |
| Activity log | `projects/{projectId}/activityLogs/{activityLogId}` | Activity timeline record. |
| Permission rule | `projects/{projectId}/permissionRules/{permissionRuleId}` | Portable authorization rule. |
| Link relation | `projects/{projectId}/links/{linkId}` | Normalized relationship document. |

### Firestore relationship rule

- Relational data must not depend on document-internal arrays as the source of truth.
- Use a link collection or normalized relation document for many-to-many relationships.
- Arrays inside documents are allowed only as display caches, for example `linkedRequirementCodes`, and must be rebuildable from relation documents.
- Screen code must not construct these paths directly. Firestore paths belong in an adapter.

## 7. PostgreSQL Table Mapping

| Firestore collection | PostgreSQL table candidate | Primary key | Foreign key candidate | Unique key candidate | Index candidate | Migration risk |
| --- | --- | --- | --- | --- | --- | --- |
| `projects` | `projects` | `id` | `created_by -> users.id` | `code` or tenant-scoped project code | `status`, `is_deleted`, `updated_at` | Low if project IDs remain portable. |
| `projects/{projectId}/members` | `project_members` | `id` or `(project_id, user_id)` | `project_id -> projects.id`, `user_id -> users.id` | `(project_id, user_id)` | `role`, `status` | Medium due Firebase UID to backend user mapping. |
| `requirements` | `requirements` | `id` | `project_id -> projects.id`, `owner_uid -> users.id` | `(project_id, code)` | `project_id`, `status`, `is_deleted`, `sort_order` | Low if no nested arrays become authoritative. |
| `wbsItems` | `wbs_items` | `id` | `project_id -> projects.id`, `owner_uid -> users.id` | `(project_id, code)` | `status`, `sort_order`, `parent_id` | Medium if hierarchy is encoded only as display text. |
| `screens` | `screen_specs` | `id` | `project_id -> projects.id` | `(project_id, code)` | `status`, `visibility` | Low if screen links are normalized. |
| `functionSpecs` | `function_specs` | `id` | `project_id -> projects.id` | `(project_id, code)` | `status`, `review_status` | Low. |
| `programs` | `programs` | `id` | `project_id -> projects.id` | `(project_id, code)` | `module_name`, `status` | Medium if program identity is file-path-only. |
| `apiSpecs` | `api_specs` | `id` | `project_id -> projects.id` | `(project_id, method, path)` | `status`, `method`, `path` | Medium if paths are not normalized. |
| `tableDefinitions` | `table_definitions` | `id` | `project_id -> projects.id` | `(project_id, schema_name, table_name)` | `table_name`, `status` | Medium if schema and table names are stored as one string. |
| `dbInfos` | `db_infos` | `id` | `project_id -> projects.id` | `(project_id, code)` | `environment`, `status` | Medium; must exclude secrets. |
| `serverInfos` | `server_infos` | `id` | `project_id -> projects.id` | `(project_id, code)` | `environment`, `status` | Medium; must exclude secrets. |
| `accessSecurity` | `access_security` | `id` | `project_id -> projects.id` | `(project_id, code)` | `control_type`, `status` | Medium due policy model evolution. |
| `openScenarios` | `open_scenarios` | `id` | `project_id -> projects.id` | `(project_id, code)` | `status`, `sort_order` | Low if scenario steps are normalized when needed. |
| `policies` | `policies` | `id` | `project_id -> projects.id` | `(project_id, code)` | `policy_type`, `status` | Medium due workflow scope. |
| `comments` | `comments` | `id` | `project_id -> projects.id`, `author_id -> users.id` | None by default | `(project_id, target_type, target_id)`, `created_at` | Low if target references are typed. |
| `attachments` | `attachments` | `id` | `project_id -> projects.id`, `uploaded_by -> users.id` | `(project_id, storage_key)` | `(target_type, target_id)`, `created_at` | Medium due storage provider references. |
| `approvals` | `approvals` | `id` | `project_id -> projects.id`, `requested_by -> users.id` | `(project_id, target_type, target_id, approval_round)` | `approval_status`, `target_type`, `target_id` | Medium due workflow changes. |
| `changeLogs` | `change_logs` | `id` | `project_id -> projects.id`, `actor_id -> users.id` | None by default | `(target_type, target_id)`, `created_at`, `actor_id` | Low if append-only records are structured. |
| `activityLogs` | `activity_logs` | `id` | `project_id -> projects.id`, `actor_id -> users.id` | None by default | `created_at`, `activity_type`, `actor_id` | Low; volume/index strategy needed later. |
| `permissionRules` | `permission_rules` | `id` | `project_id -> projects.id` | `(project_id, subject_type, subject_id, action, scope)` | `action`, `subject_type`, `target_type` | High if authorization model is not fixed before CRUD. |
| `links` | `artifact_links` | `id` | `project_id -> projects.id` | `(project_id, source_type, source_id, target_type, target_id, link_type)` | `(source_type, source_id)`, `(target_type, target_id)` | Low if all relationships use typed links. |

## 8. Relationship / Link Model

### Required relationship examples

| Relationship | Firestore representation | PostgreSQL representation | Notes |
| --- | --- | --- | --- |
| Requirement ↔ WbsItem | `links/{linkId}` with `sourceType=requirement`, `targetType=wbsItem` | `requirement_wbs_items` or `artifact_links` | Supports traceability from requirements to delivery. |
| Requirement ↔ ScreenSpec | `links/{linkId}` | `requirement_screen_specs` or `artifact_links` | Screen coverage should not be stored only as a requirement array. |
| ScreenSpec ↔ FunctionSpec | `links/{linkId}` | `screen_function_specs` or `artifact_links` | Allows one function to support multiple screens. |
| ScreenSpec ↔ ApiSpec | `links/{linkId}` | `screen_api_specs` or `artifact_links` | Supports API dependency tracing. |
| Program ↔ ApiSpec | `links/{linkId}` | `program_api_specs` or `artifact_links` | Connects implementation units to API specs. |
| TableDefinition ↔ Program | `links/{linkId}` | `table_programs` or `artifact_links` | Connects database tables to code modules. |
| Approval ↔ Target Entity | `approvals/{approvalId}` with `targetType`, `targetId` | `approvals.target_type`, `approvals.target_id` | Approval records are first-class entities, not embedded fields only. |
| Comment ↔ Target Entity | `comments/{commentId}` with `targetType`, `targetId` | `comments.target_type`, `comments.target_id` | Comments remain queryable by target. |
| Attachment ↔ Target Entity | `attachments/{attachmentId}` with `targetType`, `targetId` | `attachments.target_type`, `attachments.target_id` | File metadata remains independent from artifact document size. |
| ChangeLog ↔ Target Entity | `changeLogs/{changeLogId}` with `targetType`, `targetId` | `change_logs.target_type`, `change_logs.target_id` | Audit logs remain append-focused and queryable. |

### Link document baseline

| Field | Meaning |
| --- | --- |
| `id` | Link ID. |
| `projectId` | Project scope. |
| `sourceType` | Domain entity type of source. |
| `sourceId` | Source entity ID. |
| `targetType` | Domain entity type of target. |
| `targetId` | Target entity ID. |
| `linkType` | Relationship meaning, for example `implements`, `depends_on`, `covers`, `references`. |
| `sortOrder` | Optional display ordering. |
| `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted` | Common metadata. |

### Relationship principles

- The normalized relationship document is the source of truth.
- PostgreSQL join tables must be expressible from the Firestore link model.
- Display arrays may exist only as caches and must be rebuildable.
- Relationship writes should be implemented through a service method that can later become a transaction-backed API endpoint.

## 9. Backend API Contract Draft

### API conventions

- Authentication: Firebase Auth token now; backend bearer/session token later.
- Authorization: use portable permission actions such as `project.read`, `requirement.create`, `requirement.update`, `requirement.delete`.
- Delete means soft delete unless an endpoint explicitly says hard delete.
- Response shape should be stable:

```json
{
  "data": {},
  "meta": {
    "requestId": "string",
    "version": 1
  }
}
```

For list endpoints:

```json
{
  "data": [],
  "page": {
    "cursor": "string",
    "nextCursor": "string",
    "limit": 50
  }
}
```

### Project endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects` | List accessible projects | Signed-in user | `project.list` | None | `{ data: Project[] }` | Query projects by membership or access rule. | Join `projects` and `project_members`. |
| `GET /api/projects/:projectId` | Read one project | Project member | `project.read` | None | `{ data: Project }` | Read `projects/{projectId}` after permission check. | Select project by ID with membership/role authorization. |
| `PATCH /api/projects/:projectId` | Update project metadata | Project admin/editor | `project.update` | Partial Project fields | `{ data: Project }` | Update project document through project service. | Transactional update with version check. |

### Requirement endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/requirements` | List requirements | Project member | `requirement.list` | Query params for status, cursor, search | `{ data: Requirement[], page }` | Query `projects/{projectId}/requirements` with `isDeleted == false`. | Select from `requirements` by `project_id`, indexed by status/search. |
| `POST /api/projects/:projectId/requirements` | Create requirement | Project editor | `requirement.create` | Common fields plus requirement-specific fields | `{ data: Requirement }` | Create document and ChangeLog in service boundary. | Insert requirement and audit log in transaction. |
| `GET /api/projects/:projectId/requirements/:requirementId` | Read requirement | Project member | `requirement.read` | None | `{ data: Requirement }` | Read child document; reject deleted by default. | Select by project and ID. |
| `PATCH /api/projects/:projectId/requirements/:requirementId` | Update requirement | Project editor | `requirement.update` | Partial Requirement with `version` | `{ data: Requirement }` | Update document, increment version, write ChangeLog. | Optimistic concurrency with `version`. |
| `DELETE /api/projects/:projectId/requirements/:requirementId` | Soft delete requirement | Project editor/admin | `requirement.delete` | Optional delete reason | `{ data: Requirement }` | Set `isDeleted`, `deletedAt`, `deletedBy`, write ChangeLog. | Soft delete update in transaction. |

### WBS endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/wbs-items` | List WBS items | Project member | `wbsItem.list` | Query params for parent/status/cursor | `{ data: WbsItem[], page }` | Query `wbsItems` and filter deleted. | Select from `wbs_items`; index parent/status. |
| `POST /api/projects/:projectId/wbs-items` | Create WBS item | Project editor | `wbsItem.create` | WbsItem fields | `{ data: WbsItem }` | Create document and ChangeLog. | Insert with project FK and audit transaction. |
| `PATCH /api/projects/:projectId/wbs-items/:wbsItemId` | Update WBS item | Project editor | `wbsItem.update` | Partial WbsItem with `version` | `{ data: WbsItem }` | Increment version and update metadata. | Versioned update. |
| `DELETE /api/projects/:projectId/wbs-items/:wbsItemId` | Soft delete WBS item | Project editor/admin | `wbsItem.delete` | Optional delete reason | `{ data: WbsItem }` | Soft delete document. | Soft delete update. |

### ScreenSpec endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/screen-specs` | List screen specs | Project member | `screenSpec.list` | Query params for status/search/cursor | `{ data: ScreenSpec[], page }` | Query `screens` via adapter. | Select from `screen_specs`. |
| `POST /api/projects/:projectId/screen-specs` | Create screen spec | Project editor | `screenSpec.create` | ScreenSpec fields | `{ data: ScreenSpec }` | Create `screens/{screenId}` document. | Insert `screen_specs` row. |
| `GET /api/projects/:projectId/screen-specs/:screenId` | Read screen spec | Project member | `screenSpec.read` | None | `{ data: ScreenSpec }` | Read via adapter; hide deleted. | Select by project and ID. |
| `PATCH /api/projects/:projectId/screen-specs/:screenId` | Update screen spec | Project editor | `screenSpec.update` | Partial ScreenSpec with `version` | `{ data: ScreenSpec }` | Update document and ChangeLog. | Versioned update and audit transaction. |
| `DELETE /api/projects/:projectId/screen-specs/:screenId` | Soft delete screen spec | Project editor/admin | `screenSpec.delete` | Optional delete reason | `{ data: ScreenSpec }` | Soft delete document. | Soft delete update. |

### Approval endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/approvals` | List approvals | Project member | `approval.list` | Query params for target/status/cursor | `{ data: Approval[], page }` | Query approvals by project and target fields. | Select indexed by target/status. |
| `POST /api/projects/:projectId/approvals` | Request approval | Project editor | `approval.create` | `targetType`, `targetId`, approver list, message | `{ data: Approval }` | Create approval document and ActivityLog. | Transactional insert and notification hook. |
| `PATCH /api/projects/:projectId/approvals/:approvalId` | Update approval decision/state | Approver or admin | `approval.update` | Decision, comment, `version` | `{ data: Approval }` | Update approval and target `approvalStatus` if needed via service. | Transactional workflow update. |

### Comment endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/comments` | List comments for target | Project member | `comment.list` | Query params `targetType`, `targetId`, cursor | `{ data: Comment[], page }` | Query comments by target fields. | Select indexed by target. |
| `POST /api/projects/:projectId/comments` | Create comment | Project member | `comment.create` | `targetType`, `targetId`, `body` | `{ data: Comment }` | Create comment document and ActivityLog. | Insert comment row. |
| `PATCH /api/projects/:projectId/comments/:commentId` | Update comment | Author/admin | `comment.update` | `body`, `version` | `{ data: Comment }` | Update own comment through service. | Author authorization and versioned update. |
| `DELETE /api/projects/:projectId/comments/:commentId` | Soft delete comment | Author/admin | `comment.delete` | Optional delete reason | `{ data: Comment }` | Soft delete comment. | Soft delete update. |

### Attachment endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/attachments` | List attachments for target | Project member | `attachment.list` | Query params `targetType`, `targetId`, cursor | `{ data: Attachment[], page }` | Query metadata documents only. | Select attachment metadata by target. |
| `POST /api/projects/:projectId/attachments` | Register/upload attachment metadata | Project member/editor | `attachment.create` | `targetType`, `targetId`, file metadata, storage reference | `{ data: Attachment, upload?: object }` | Create metadata after storage upload flow is defined. | Backend should issue upload URL and persist metadata. |
| `DELETE /api/projects/:projectId/attachments/:attachmentId` | Soft delete attachment metadata | Uploader/admin | `attachment.delete` | Optional delete reason | `{ data: Attachment }` | Soft delete metadata; storage deletion policy separate. | Soft delete metadata; storage cleanup async. |

### ChangeLog endpoints

| Endpoint | Purpose | Required auth | Permission action | Expected request body | Expected response shape | Firestore implementation note | PostgreSQL/API future note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/change-logs` | List change logs | Project member/auditor | `changeLog.list` | Query params `targetType`, `targetId`, cursor | `{ data: ChangeLog[], page }` | Query append-focused change log documents. | Select from `change_logs` by target/date. |
| `GET /api/projects/:projectId/change-logs/:changeLogId` | Read change log detail | Project member/auditor | `changeLog.read` | None | `{ data: ChangeLog }` | Read log document. | Select by ID with project authorization. |

## 10. Frontend Service Layer Rule

### Direction

Future CRUD implementation should move Firestore calls out of screen code and into service or adapter modules. The service layer owns domain names, validation, metadata preparation, permission action names, and adapter calls.

### Forbidden pattern in screen code

```js
firebase.firestore()
  .collection('projects')
  .doc(projectId)
  .collection('requirements')
```

### Required direction

```js
requirementService.listByProject(projectId, {
  status: 'active',
  includeDeleted: false
});
```

### Suggested module boundaries for Vanilla JS phase

| Module type | Responsibility | Example |
| --- | --- | --- |
| Screen controller | Reads DOM events and renders state | `requirementsPageController` |
| Domain service | Exposes CRUD by domain language | `requirementService.create(projectId, input)` |
| Adapter | Talks to Firestore now or API later | `firestoreRequirementAdapter` |
| Mapper | Converts adapter document shape to Domain Model | `mapRequirementDoc()` |
| Permission helper | Uses portable action names | `can('requirement.update', context)` |
| Audit helper | Builds ChangeLog/ActivityLog records | `changeLogService.recordUpdate()` |

### Service method naming baseline

| Entity | List | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- | --- |
| Requirement | `listByProject(projectId, query)` | `getById(projectId, requirementId)` | `create(projectId, input)` | `update(projectId, requirementId, patch)` | `softDelete(projectId, requirementId, reason)` |
| WbsItem | `listByProject(projectId, query)` | `getById(projectId, wbsItemId)` | `create(projectId, input)` | `update(projectId, wbsItemId, patch)` | `softDelete(projectId, wbsItemId, reason)` |
| ScreenSpec | `listByProject(projectId, query)` | `getById(projectId, screenId)` | `create(projectId, input)` | `update(projectId, screenId, patch)` | `softDelete(projectId, screenId, reason)` |
| Comment | `listByTarget(projectId, target)` | `getById(projectId, commentId)` | `create(projectId, input)` | `update(projectId, commentId, patch)` | `softDelete(projectId, commentId, reason)` |

### Service layer acceptance criteria for CRUD PRs

- Screen code must not build Firestore collection paths.
- Domain service must return Domain Model objects, not raw Firestore snapshots.
- Create/update/delete must update common metadata consistently.
- Delete must be soft delete by default.
- Major changes must have a ChangeLog or ActivityLog strategy.
- Permission action names must be visible at the service boundary.

## 11. React / TypeScript Transition Baseline

### Mapping from current structure to React target

| Current concept | Intermediate abstraction | React / TypeScript target |
| --- | --- | --- |
| HTML Page | Page controller + static layout contract | Route/page component |
| Common Renderer | Renderer function with data contract | Shared component |
| DOM event binding | Controller action handlers | Component props and hooks |
| Plain object state | View model | Typed state/interface |
| Firestore call | Domain service | Typed service client |
| Firestore document data | Domain Model mapper | TypeScript interface and API DTO mapper |
| Manual render refresh | State update function | React state/query invalidation |

### TypeScript interface direction

Future TypeScript interfaces should follow the Domain Model, not Firestore document nesting.

```ts
interface Requirement {
  id: string;
  projectId: string;
  code: string;
  title: string;
  description?: string;
  status: string;
  ownerUid?: string;
  ownerName?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  isDeleted: boolean;
  version: number;
  sortOrder?: number;
  tags?: string[];
  visibility: string;
  reviewStatus?: string;
  approvalStatus?: string;
}
```

### React transition principles

- Preserve service method names where possible.
- Move table/list/drawer form state into typed view models.
- Keep permission checks expressed as action names, not component-specific booleans only.
- Keep adapter-specific timestamp conversion at the service/mapper boundary.
- Treat React components as consumers of Domain Model objects and service responses.

## 12. CRUD Implementation Gate

Before a save/edit/delete PR is implemented, verify:

| Gate | Required answer |
| --- | --- |
| Domain entity | Which Domain Entity does this CRUD modify? |
| Common fields | Are all required common fields set or preserved? |
| Firestore path | Is the path hidden behind a service/adapter? |
| API future | What REST endpoint would this CRUD map to? |
| PostgreSQL future | What table and key constraints would this map to? |
| Relationships | Are links normalized instead of authoritative arrays? |
| Soft delete | Does delete set soft delete fields? |
| Audit | Does create/update/delete produce ChangeLog or ActivityLog? |
| Permission | What portable permission action is checked? |
| React transition | Can this screen action become a component prop/hook calling the same service? |

## 13. Out of Scope for This Baseline

- Implementing CRUD behavior.
- Modifying Firestore Rules or indexes.
- Adding Backend API code.
- Adding PostgreSQL schema migrations.
- Converting pages to React.
- Changing product screens, common CSS, common JS, Firebase config, scripts, CI, or deployment configuration.

## 14. Summary for Future PRs

Firestore is the first storage implementation, but it is not the STAM data architecture. Future CRUD PRs should introduce or follow a service boundary that speaks in Domain Entities, common metadata, portable permission actions, normalized relationships, soft delete, and audit records. That service boundary is the bridge from today's HTML / Vanilla JS / Firestore implementation to the target React / TypeScript / Backend API / PostgreSQL architecture.
