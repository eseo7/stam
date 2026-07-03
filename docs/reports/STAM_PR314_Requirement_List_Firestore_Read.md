# STAM PR314 — Requirement List Firestore Read

## Purpose

PR #314 connects the Requirements board list to Firestore read data through the PR #313 Requirement Service Contract.

Reference:

- `stam/js/stam.requirements-service.js`
- `stam/js/stam.requirements-firestore-adapter.js`
- `docs/reports/STAM_PR313_Requirement_Service_Contract.md`

## Scope

Modified:

- `stam/pages/boards/requirements.html`

Added:

- `stam/js/stam.requirements-firestore-list.js`
- `scripts/test-requirements-firestore-list-contract.mjs`
- `docs/reports/STAM_PR314_Requirement_List_Firestore_Read.md`

## Read-only Runtime Contract

The Requirements list reads data only through:

```js
STAM.requirementsService.listByProject(projectId, query, context)
```

The list script does not call:

- `STAM.requirementsService.create()`
- `STAM.requirementsService.update()`
- `STAM.requirementsService.softDelete()`
- Firestore `.set()`
- Firestore `.update()`
- Firestore `.add()`
- Firestore `.delete()`

## HTML Script Source Change

`stam/pages/boards/requirements.html` now loads Firebase Hosting reserved SDK URLs:

```html
<script src="/__/firebase/8.10.1/firebase-app.js"></script>
<script src="/__/firebase/8.10.1/firebase-auth.js"></script>
<script src="/__/firebase/8.10.1/firebase-firestore.js"></script>
<script src="/__/firebase/init.js"></script>
```

Then it loads the PR #313 service/adapter and PR #314 read-only list binding:

```html
<script src="../../js/stam.requirements-firestore-adapter.js"></script>
<script src="../../js/stam.requirements-service.js"></script>
<script src="../../js/stam.requirements-firestore-list.js"></script>
```

The Local Core DB v2 list/CRUD scripts are no longer loaded as the Requirements list source.

## Rendering Behavior

`stam.requirements-firestore-list.js`:

- resolves `projectId` from `?projectId=` or `sessionStorage['stam:selectedProjectId']`
- waits for Firebase Auth state when available
- calls `STAM.requirementsService.listByProject(projectId, { includeDeleted: false }, context)`
- filters soft-deleted items defensively
- renders rows into `#rq-tbody`
- updates the existing summary strip and footer count
- refreshes `STAMBoardList` selection state after row replacement

## No UI Write Wiring

- Register drawer UI remains a shell only.
- Edit drawer UI remains a shell only.
- Delete buttons remain UI controls only.
- No Firestore write path is exposed by this PR.
- No product runtime seed helper is added or auto-executed.

## Governance Result

- Product page changed: `stam/pages/boards/requirements.html` only
- Existing screen JS changed: none
- New JS: `stam/js/stam.requirements-firestore-list.js`
- CSS changes: none
- Firestore rules changes: none
- Firestore indexes changes: none
- Firebase config changes: none
- Workflow changes: none
- Package manifest / lockfile changes: none
- Requirement service/adapter files from PR #313: unchanged

## Verification

Command:

```bash
node scripts/test-requirements-firestore-list-contract.mjs
```

Verified:

- `stam.requirements-firestore-list.js` calls only `listByProject()`.
- It does not construct `projects/{projectId}/requirements` Firestore paths directly.
- It does not call create/update/softDelete.
- It does not call Firestore write methods.
- It renders non-deleted service results into `#rq-tbody`.
- It updates summary counts from service results.
