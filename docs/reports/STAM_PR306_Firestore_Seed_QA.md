# STAM PR #306 — Firestore Seed QA Guide

Local maintainer helper for membership gate QA on `stam-preview-hosting`.

**Not product runtime.** Script lives under `scripts/` only.

---

## Purpose

Seed or update demo Firestore documents for PR #306 membership gate browser QA:

| Path | Purpose |
|------|---------|
| `users/{uid}` | Identity doc (read by membership gate) |
| `projects/stam-demo` | Demo project workspace |
| `projects/stam-demo/members/{uid}` | Canonical membership doc (doc id = Firebase Auth uid) |

---

## Prerequisites

1. Firestore database exists on `stam-preview-hosting`
2. `firestore.rules` published (PR #306 rules — auth gate member read scope)
3. Firebase Auth Google login UID for the QA account
4. **Admin credentials** (service account or `gcloud auth application-default login`) with Firestore write access
5. `firebase-admin` installed in **QA environment only** (do not add to repo `package.json`):

```bash
npm install firebase-admin
```

---

## Usage

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

node scripts/seed-stam-demo-membership.mjs --uid <firebaseAuthUid>
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--uid` | *(required)* | Firebase Auth UID |
| `--email` | `airwav7@gmail.com` | User / member email |
| `--displayName` | `이서` | User display name |
| `--projectId` | `stam-demo` | Project id |
| `--projectName` | `STAM Demo Project` | Project display name |
| `--tenantId` | `stam` | Tenant id |
| `--status` | `active` | Member status: `active` \| `pending` \| `denied` \| `removed` |
| `--role` | `owner` | Member role |
| `--firebaseProject` | `stam-preview-hosting` | Firebase projectId |
| `--dry-run` | off | Print payloads without writing |

---

## Example payloads

### `users/{uid}`

```js
{
  email: "airwav7@gmail.com",
  emailNormalized: "airwav7@gmail.com",
  displayName: "이서",
  provider: "google",
  status: "active"
}
```

### `projects/stam-demo`

```js
{
  id: "stam-demo",
  tenantId: "stam",
  name: "STAM Demo Project",
  code: "stam-demo",
  description: "PR #306 membership gate QA demo project",
  status: "active",
  ownerUserId: "{uid}"
}
```

### `projects/stam-demo/members/{uid}`

```js
{
  uid: "{uid}",
  userId: "{uid}",
  email: "airwav7@gmail.com",
  emailNormalized: "airwav7@gmail.com",
  projectId: "stam-demo",
  projectName: "STAM Demo Project",
  tenantId: "stam",
  role: "owner",
  status: "active"
}
```

---

## QA scenarios

Run seed with different `--status` values, then test Preview URL login routing:

| `--status` | Expected route after login |
|------------|----------------------------|
| `active` | `projects.html` |
| `pending` | `access-pending.html` |
| `denied` | `access-denied.html` |
| `removed` | `access-denied.html` |

Delete member doc in Console (or set status) to test `no-project.html`.

---

## Safety

- Uses **Firebase Admin SDK** — bypasses client `firestore.rules` (no rules widening required)
- **No** changes to `stam/pages/**`, `stam/js/**` product auth code
- **No** client runtime Firestore writes
- Default project: `stam-preview-hosting` (staging preview — not production)

---

## Get Firebase Auth UID

1. Log in on Preview: `https://stam-design-staging--pr306-2nlgjq58.web.app/pages/auth/login.html`
2. Firebase Console → Authentication → Users → copy UID for the Google account

Or browser DevTools after login (maintainer tooling only).

---

## Dry run

```bash
node scripts/seed-stam-demo-membership.mjs \
  --uid YOUR_UID \
  --status active \
  --dry-run
```
