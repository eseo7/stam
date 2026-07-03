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
- `stam/js/stam.requirements.js`

Added:

- `stam/js/stam.requirements-firestore-list.js`
- `scripts/test-requirements-firestore-list-contract.mjs`
- `scripts/seed-stam-demo-requirements.mjs` (QA helper only; not product runtime)
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

## Auth / Project Guard

`stam.requirements-firestore-list.js` now gates the screen before reading requirements:

```js
var ROUTES = {
  login: '/pages/auth/login.html',
  projects: '/pages/auth/projects.html',
  accessDenied: '/pages/auth/access-denied.html'
};
```

Guard behavior:

- missing `projectId` redirects to `/pages/auth/projects.html`
- signed-out user redirects to `/pages/auth/login.html`
- missing or inactive `projects/{projectId}/members/{uid}` redirects to `/pages/auth/access-denied.html`
- missing project document redirects to `/pages/auth/projects.html`

The guard performs only read operations:

- `projects/{projectId}/members/{uid}.get()`
- `projects/{projectId}.get()`

## Project / Member Context

After guard success, the screen updates existing context surfaces from the project/member read result:

- `[data-stam-project-context]`
- `[data-stam-topbar]`
- `[data-stam-left-nav]`
- `window.STAM.currentProjectContext`
- `document.title`

The existing renderers are reused:

- `STAM.projectContextRender.init()`
- `STAM.topbarRender.init()`
- `STAM.navRender.init('B1')`

## Rendering Behavior

`stam.requirements-firestore-list.js`:

- resolves `projectId` from `?projectId=` or `sessionStorage['stam:selectedProjectId']`
- waits for Firebase Auth state and verifies active project membership
- calls `STAM.requirementsService.listByProject(projectId, { includeDeleted: false }, context)`
- filters soft-deleted items defensively
- renders rows into `#rq-tbody`
- updates the existing summary strip and footer count
- refreshes `STAMBoardList` selection state after row replacement

## Detail Read-only Binding

`stam.requirements.js` delegates row activation to the read-only list helper when available:

```js
STAM.requirementsFirestoreList.openDetailFromRow(row)
```

The helper reads detail data only through:

```js
STAM.requirementsService.getById(projectId, requirementId, context)
```

It updates the existing detail drawer shell and does not call create/update/delete methods.

## No UI Write Wiring

- Register drawer UI remains a shell only.
- Edit drawer UI remains a shell only.
- Delete buttons remain UI controls only.
- No Firestore write path is exposed by this PR.
- No product runtime seed helper is added or auto-executed.
- Optional maintainer-only QA seed helper: `scripts/seed-stam-demo-requirements.mjs`

## Governance Result

- Product page changed: `stam/pages/boards/requirements.html` only
- Existing screen JS changed: `stam/js/stam.requirements.js` row activation delegates to read-only detail helper
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
- Auth/project guard reads project and member documents before list loading.
- Project/member read result updates topbar, project context, left nav context, and document title.
- Row activation reads detail through `getById()` and updates the existing detail drawer shell.
- It does not construct `projects/{projectId}/requirements` Firestore paths directly.
- It does not call create/update/softDelete.
- It does not call Firestore write methods.
- It renders non-deleted service results into `#rq-tbody`.
- It updates summary counts from service results.
