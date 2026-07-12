# STAM FS-7 — Auth Custom Token BLOCKED-PERMISSION Diagnostic

**Run:** [29186705198](https://github.com/eseo7/stam/actions/runs/29186705198)  
**Date:** 2026-07-12  
**Git SHA:** `c2684c06cb320e74ebeb4b1f3d526cbdfe7b1639` (PR #385 merged)

---

## 1. Symptom (run #29186705198 artifact)

| Precheck | Result |
|----------|--------|
| `firestore-read-project` | PASS |
| `firestore-read-functional-specs` | PASS |
| `auth-custom-token` | **FAIL** |
| `firestore-write-delete-probe` | PASS |

Overall: `PRECHECK-permission` → **BLOCKED-PERMISSION** (exit code 3).

**Gap in run #29186705198:** artifact recorded only a coarse category (`firebase-auth-admin (custom token / user management)`) and **did not persist** `error.code`, sanitized message, or service-account fingerprint. Root-cause triage was therefore blocked.

---

## 2. `permissionCategory()` behavior (pre-fix)

`permissionCategory()` did **not** return `BLOCKED-PERMISSION` directly. It mapped any auth/custom-token/identitytoolkit substring to a single bucket:

> `firebase-auth-admin (custom token / user management)`

That lumped distinct failures together:

| Actual failure | Old category |
|----------------|--------------|
| `iam.serviceAccounts.signBlob` denied | same bucket |
| `identitytoolkit.googleapis.com` denied | same bucket |
| invalid / wrong SA key | same bucket (if message contained "auth") |

`classifyError()` separately maps permission-like text → `BLOCKED-PERMISSION`.  
`runPermissionPrecheck()` then sets overall status `BLOCKED-PERMISSION` when **any** check fails, with a generic detail string even when only `auth-custom-token` failed.

**Fix (this PR):** `inferRequiredPermission()` differentiates signBlob vs identitytoolkit vs credential; `sanitizeAuthError()` records `code`, redacted `message`, `failedOperation`, and `requiredPermission` in artifact evidence.

---

## 3. Service account identity comparison

### IAM reference (console-visible account)

| Field | Value |
|-------|-------|
| Masked email | `firebase-adminsdk-fbsvc@stam-preview-hosting.iam.gserviceaccount.com` |
| SHA-256 prefix (12) | `1650a0ff327d` |

### GitHub Secret (`FS7_QA_SERVICE_ACCOUNT_JSON` or fallback)

**Not readable in Cloud Agent / CI logs** (by design). After this PR merges, the next workflow run artifact will include:

```json
{
  "serviceAccountIdentity": {
    "emailHashPrefix": "<12-char sha256 of secret client_email>",
    "emailMasked": "firebase-adm...@stam-preview-hosting.iam.gserviceaccount.com"
  },
  "iamReference": {
    "emailHashPrefix": "1650a0ff327d",
    "emailMasked": "firebase-adminsdk-fbsvc@stam-preview-hosting.iam.gserviceaccount.com",
    "match": true|false|null
  },
  "secretMatchesIamReference": true|false|null
}
```

### Run #29186705198 determination

| Question | Answer |
|----------|--------|
| Secret hash recorded? | **No** (pre-diagnostic artifact) |
| Secret vs IAM same account? | **Unknown — re-run required** |
| Firestore PASS implies valid SA key? | **Yes** — credential parses and Firestore Admin API accepts the principal |
| Auth-only FAIL pattern | Consistent with **missing `signBlob` self-binding** *or* **secret ≠ firebase-adminsdk-fbsvc** |

---

## 4. Sanitized error code (run #29186705198)

| Field | Value |
|-------|-------|
| Recorded `error.code` | **Not captured** (script gap) |
| Inferred from symptom | Permission-class failure on `auth.createCustomToken()` only |
| Most likely codes (pending re-run) | `auth/insufficient-permission` and/or Google API `PERMISSION_DENIED` on `iam.serviceAccounts.signBlob` |

---

## 5. Required permission (hypothesis, pending sanitized code)

Firestore read/write/delete PASS + `createCustomToken` FAIL narrows to:

| Priority | Permission / role | Condition |
|----------|-------------------|-----------|
| **1** | `roles/iam.serviceAccountTokenCreator` on **executing SA → itself** (`iam.serviceAccounts.signBlob`) | `secretMatchesIamReference === true` and error mentions `signBlob` |
| **2** | Secret points to **different SA** than IAM console target | `secretMatchesIamReference === false` → fix Secret or apply roles to actual Secret SA |
| **3** | `roles/firebaseauth.admin` (`identitytoolkit.googleapis.com`) | Sanitized message mentions `identitytoolkit` (less common for `createCustomToken` alone) |

**IAM console note:** Project-level display of *Firebase Authentication Admin* and *Service Account Token Creator* on `firebase-adminsdk-fbsvc` does **not** guarantee **self-binding** Token Creator on that SA resource. `signBlob` must be granted **on the service account that signs the token** (the Secret's `client_email`).

---

## 6. IAM additional change needed?

| Constraint | Policy |
|------------|--------|
| No broad Owner/Editor | **Do not add** |
| No blind IAM expansion | **Do not add** roles until re-run provides `error.code` + `secretMatchesIamReference` |

| Scenario | Action |
|----------|--------|
| `secretMatchesIamReference: false` | Update GitHub Secret to `firebase-adminsdk-fbsvc` key **or** grant QA roles to the Secret SA (not console SA) |
| `secretMatchesIamReference: true` + `signBlob` error | Verify Token Creator **on SA resource** `firebase-adminsdk-fbsvc@stam-preview-hosting.iam.gserviceaccount.com` (self-binding), not only project-level |
| `secretMatchesIamReference: true` + `identitytoolkit` error | Confirm Firebase Authentication Admin on the **same** Secret SA |
| Other sanitized code | Triage from artifact `requiredPermission` field |

---

## 7. Next step

```bash
gh workflow run fs7-live-firestore-qa.yml --ref main
```

Download `fs7-live-qa-report-<run_id>` and read `items[0].evidence` for:

- `secretMatchesIamReference`
- `checks[].error.code` / `requiredPermission` on `auth-custom-token`

---

## 8. Files changed (diagnostic PR)

| File | Change |
|------|--------|
| `scripts/qa-fs7-live-persistence-agent.mjs` | SA hash/mask, sanitized auth errors, IAM reference compare |
| `scripts/test-fs7-live-qa-workflow-contract.mjs` | Contract for diagnostic fields |
| `docs/reports/STAM_FS7_Auth_Permission_Diagnostic.md` | This report |
