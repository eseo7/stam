# STAM PR317 — Requirements Inline Style Cleanup

## Purpose

Remove all inline `style=""` attributes from `stam/pages/boards/requirements.html` and move visual rules into `stam/css/stam.requirements.css` before PR #318 (Requirements Create Firestore Save).

This PR is **presentation-only** — no Firestore write, no CRUD behavior change, no JS changes.

## Scope

### Modified

| File | Change |
| --- | --- |
| `stam/pages/boards/requirements.html` | 24 inline `style` attributes removed |
| `stam/css/stam.requirements.css` | Page-scoped classes for moved rules |
| `scripts/test-requirements-no-inline-style.mjs` | CI/local guard: zero inline styles |

### Not modified

- `stam/js/**`
- Firestore rules / firebase.json / workflows / package files
- Other board pages (wbs, screen-specification, menu-screen-list, functional-specification)

## Class mapping

| Former inline | New class / contract |
| --- | --- |
| Search icon color | `stam-icon-muted` (+ `.rq-search` scope in requirements.css) |
| Filter count hidden | `.stam-board-filter-count` (board-filter.css SSOT) |
| Table `<col>` widths | `.rq-col-ch` … `.rq-col-updated` |
| Chip offset | `.rq-chip-ml` |
| Detail owner row | `.rq-dw-owner`, `.rq-dw-owner-name`, `.rq-ava.is-brand` |
| Hidden tab panels | `.is-hidden` (board-layout.css) |
| Linked card spacing | `.rq-linked-card.is-spaced` |
| Linked icons / WBS tone | `.rq-linked-card-icon`, `.is-wbs`, `.rq-linked-card-id.is-wbs` (`var(--g-b)`) |

## Verification

```bash
node scripts/test-requirements-no-inline-style.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-service-contract.mjs
git diff --check
```

Manual: open Requirements on staging — toolbar, table columns, detail/edit drawer static samples unchanged visually.

## Governance

| Check | Result |
| --- | --- |
| New CSS files | 0 |
| `stam/js/**` changed | No |
| Firestore create/write | No |
| PR #314 read-only list/detail | Unchanged |

## Version

| Field | Value |
| --- | --- |
| PR | #317 |
| Base | `8c55784` |
| Follow-up | PR #318 Requirements Create Firestore Save |
