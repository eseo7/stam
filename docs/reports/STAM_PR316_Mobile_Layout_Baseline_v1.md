# STAM PR316 — Mobile Layout Baseline v1

## Purpose

PR #316 implements the **first CSS layout baseline** for STAM product App Shell, Project Overview (A1), and Requirements board — grounded in [STAM Mobile Product Usage Baseline v1](../stam/docs/reports/STAM_Mobile_Product_Usage_Baseline_v1.md) (PR #315).

Mobile is **action/review-first**, not shrunk desktop. This PR delivers minimum-usable layout at phone/tablet widths without changing pages, JS, or data logic.

## Scope

### Modified (CSS only)

| File | Role |
| --- | --- |
| `stam/css/stam.shell.css` | App shell — sidebar hide ≤767, topbar compaction |
| `stam/css/stam.project-overview.css` | Dashboard grid, KPI, context header, table scroll |
| `stam/css/stam.requirements.css` | Board header/toolbar/table/drawer tabs mobile |
| `stam/css/stam.components.css` | Summary strip + KPI strip shared mobile rules |

### Added

- `docs/reports/STAM_PR316_Mobile_Layout_Baseline_v1.md` (this document)

### Not modified

- `stam/pages/**`
- `stam/js/**`
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`
- `.github/workflows/**`
- `package.json`, `package-lock.json`
- Firebase / Auth / Firestore / CRUD / seed logic

## Breakpoints (QA)

```txt
390px   — small phone
430px   — phone
768px   — tablet
1024px  — desktop
1366px  — laptop
1920px  — wide desktop
```

| Range | Shell behavior |
| --- | --- |
| ≤767px | Sidebar hidden (content-first); topbar icon-first |
| 768–1023px | Sidebar persistent; topbar/search compact |
| ≥1024px | Desktop baseline unchanged |

## Target screens

| Screen | Path | Mobile class (PR #315) |
| --- | --- | --- |
| Project Overview | `stam/pages/dashboard/project-overview.html` | M-P (home / KPI / queue entry) |
| Requirements | `stam/pages/boards/requirements.html` | D-P (read/review; table scroll, no card rewrite) |

## Layout decisions

1. **Sidebar ≤767px:** Hidden — main content full width. Overlay hamburger nav deferred to follow-up JS PR (no `stam/js/**` in this PR).
2. **Topbar ≤767px:** Logo text hidden; breadcrumb shows current page only; center search pill hidden; user label collapsed to icon.
3. **Project Overview:** Context header stacks; KPI 2-column grid; dashboard cards single column; tables scroll inside cards.
4. **Requirements:** Header/actions stack; toolbar wraps; table horizontal scroll preserved (`min-width: 960px`); drawer tabs scroll horizontally.
5. **No new CSS files** — extensions only in allowed paths.

## Governance result

| Check | Result |
| --- | --- |
| Product pages changed | No |
| `stam/js/**` changed | No |
| New CSS files | 0 |
| inline style/script in pages | No |
| Firebase / CRUD changes | No |
| Conflicts with PR #314 Firestore read-only | None (CSS only) |

## Manual QA checklist

Open hosted staging or local static server under `stam/`:

1. **Project Overview** — resize to 390 / 430 / 768: no horizontal page scroll; KPI + cards readable; tables scroll inside cards.
2. **Requirements** — same widths: header/toolbar usable; table scrolls; summary strip visible; drawer opens full-width on narrow view.
3. **1024+** — layout matches pre-PR desktop behavior (regression).

## Follow-up (out of scope)

- Sidebar overlay + hamburger (`stam/js/**` + shell contract)
- Mobile action queue home wiring
- Board row card presentation (vs table scroll)
- `boards-v2/requirements.html` (Board Factory) mobile pass

## Version

| Field | Value |
| --- | --- |
| Version | v1 |
| PR | #316 |
| Base | `937c9a2` (main after PR #315) |
| Policy ref | STAM Mobile Product Usage Baseline v1 |
