# STAM Mobile Product Usage Baseline v1

## Purpose

STAM currently has strong desktop-oriented artifact authoring and management screens, but no official product baseline for **what mobile work should support**.

Without a usage baseline, teams tend to apply **390px responsive shrink** screen by screen. That produces a **smaller desktop**, not a mobile product. Reviewers and approvers cannot complete real work on the move; authors still return to desktop for every decision.

This document defines STAM mobile as an **action-focused review, approval, access, and notification channel** — not a full desktop replacement.

**Scope of this baseline**

| In scope | Out of scope (follow-up PR) |
| --- | --- |
| Product usage principles | CSS layout implementation |
| Supported mobile job scenarios | Screen-by-screen responsive refactors |
| Desktop vs mobile responsibility split | New menus / routes / data models |
| Screen support classification | Firebase / Auth / CRUD wiring |
| Evaluation criteria for mobile readiness | Replacing desktop authoring flows |

---

## STAM Mobile Principle

```txt
STAM Mobile is not a full desktop replacement.
STAM Mobile is an action-focused review, approval, access, and notification channel.
```

### Interpretation

1. **Mobile answers “what needs my action now?”** before “show me the full board.”
2. **Mobile completes short, high-value actions** — approve, reject, comment, acknowledge, accept invite, confirm access.
3. **Mobile reads artifact detail for decision context**; it does not host full authoring or bulk editing.
4. **Desktop remains the SSOT for creation, structure, and heavy editing** — requirements tables, WBS trees, screen-spec editors, import flows, board factories.
5. **Responsive width alone is not mobile readiness.** A screen that fits 390px but still expects desktop interaction density fails this baseline.

---

## Problem Statement

### Anti-pattern: shrunk desktop

| Symptom | Why it fails |
| --- | --- |
| Full data tables with horizontal scroll on phone | Reviewers cannot scan or act quickly |
| Register / edit drawers with 5+ sections on mobile | Authoring friction; not a mobile job |
| Filter panels, bulk select, pagination as primary UX | Desktop board pattern, not mobile queue |
| “It renders at 390px” as acceptance criteria | Layout fit ≠ task completion |
| Same IA and same primary CTA on all breakpoints | Mobile users need action queue, not navigation depth |

### Target outcome

Mobile users should be able to **enter STAM, see prioritized work, open the minimum context, and complete the action** without feeling they are fighting a compressed admin console.

---

## Core Mobile Jobs (v1)

These are the **official supported mobile work types** for STAM v1.

| # | Mobile job | User intent | Typical outcome on mobile |
| --- | --- | --- | --- |
| 1 | 초대 수락 | Join project / accept membership | Accept invite, land in project context |
| 2 | 권한 확인 | Know what I can do in this project | Read role, scope, access state |
| 3 | 검토 요청 확인 | See what awaits my review | Open review item, read summary |
| 4 | 승인 / 반려 | Decide on a review item | Approve or reject with short reason |
| 5 | 댓글 / 피드백 | Respond to discussion | Read thread, add comment, resolve mention |
| 6 | 내 할 일 확인 | See today’s work queue | Prioritized list: due, overdue, review, approval |
| 7 | 변경 알림 확인 | Understand what changed | Open change / activity item, acknowledge |
| 8 | 산출물 상세 확인 | Read enough to decide | Summary + key fields + linked artifacts |
| 9 | 간단한 상태 변경 | Move item along lightweight workflow | Status chip / single-field update only |

### Explicitly not core mobile jobs (desktop-first)

- Full requirement / WBS / screen-spec **authoring**
- Bulk import, Excel mapping, board factory configuration
- Multi-section drawer **create / edit** with related artifact generation
- Wide table **bulk delete**, multi-select operations
- Presentation / beam mode setup
- Admin tenant / package / rules configuration

---

## Desktop vs Mobile Responsibility Matrix

| Capability | Desktop | Mobile |
| --- | --- | --- |
| Artifact creation (full form) | Primary | No |
| Artifact bulk edit / import | Primary | No |
| Artifact detail read (full) | Primary | Summary + decision fields |
| Review queue | Supported | **Primary** |
| Approval / rejection | Supported | **Primary** |
| Comments / mentions | Supported | **Primary** |
| Notifications / change feed | Supported | **Primary** |
| My tasks / due / overdue | Supported | **Primary** |
| Membership invite accept | Supported | **Primary** |
| Permission / role visibility | Supported | **Primary** |
| Simple status update (1 field) | Supported | Allowed when low risk |
| Deep linking to desktop for full edit | N/A | **Required escape hatch** |

**Escape hatch rule:** Every mobile artifact view that is read-only or action-limited must offer a clear **“전체 보기 (데스크톱)”** path when full editing is needed.

---

## Usage Scenarios (v1)

### 1. 초대 수락 (Invite acceptance)

- **Trigger:** Email / link / in-app invite notification
- **Mobile flow:** Authenticate → see invite summary (project, role, inviter) → accept or decline
- **Success:** Active membership; project context stored; land on mobile home / project summary
- **Desktop-only:** Tenant-level invite policy configuration

### 2. 권한 확인 (Access & permission check)

- **Trigger:** User opens project or hits gated action
- **Mobile flow:** Show role, membership status, allowed actions (read / review / approve)
- **Success:** User understands why an action is available or blocked
- **Fail:** Silent disable with no explanation

### 3. 검토 요청 확인 (Review request intake)

- **Trigger:** “검토 요청 N건” in queue or push
- **Mobile flow:** Open queue item → see artifact type, ID, title, requester, due context
- **Success:** User can proceed to approve/reject or open detail
- **Not mobile:** Writing the full artifact under review

### 4. 승인 / 반려 (Approval decision)

- **Trigger:** Approval queue item
- **Mobile flow:** Read summary → Approve or Reject → optional short comment (required on reject)
- **Success:** Decision recorded; requester notified; item leaves queue
- **Guardrail:** Irreversible or high-impact actions may require desktop confirmation (document per entity later)

### 5. 댓글 / 피드백 (Comments & feedback)

- **Trigger:** Mention, reply, or review thread activity
- **Mobile flow:** Thread list → open thread → read context → reply
- **Success:** Comment posted; mention cleared from queue
- **Not mobile:** Long-form spec rewriting in comment box

### 6. 내 할 일 확인 (My action queue)

- **Trigger:** App open / “할 일” tab
- **Mobile flow:** Single prioritized queue ordered by urgency:
  1. 오늘 마감
  2. 지연 작업
  3. 검토 요청
  4. 승인 대기
  5. 댓글 멘션
  6. 변경 확인 필요
- **Success:** User taps one item and reaches action screen in ≤2 steps
- **Reference preview:** `stam/docs/STAM-Mobile-Core-Workflow-Baseline-v1.html` (My Action Queue section)

### 7. 변경 알림 확인 (Change & activity notifications)

- **Trigger:** Activity feed / notification center
- **Mobile flow:** Scan what changed (who, what, when) → open detail → acknowledge or comment
- **Success:** User is not surprised by desktop state later
- **Not mobile:** Full diff / history analytics

### 8. 산출물 상세 확인 (Artifact detail read)

- **Trigger:** From queue, notification, or search
- **Mobile flow:** Header (ID, title, status chips) → key fields → linked artifacts (chips) → CTA (review / approve / comment / desktop)
- **Success:** Enough context to decide without opening desktop
- **Not mobile:** Full tabbed editor with all sections editable

### 9. 간단한 상태 변경 (Lightweight status change)

- **Trigger:** Owner updates progress on assigned item
- **Mobile flow:** Single controlled field (e.g. status, review flag) with confirmation
- **Allowed:** One-field patches with audit trail
- **Not allowed:** Multi-section saves, related artifact side effects, bulk updates

---

## Screen & Surface Support Classification

Use this matrix when planning or reviewing any STAM surface.

| Class | Code | Meaning | Mobile expectation |
| --- | --- | --- | --- |
| Mobile Primary | `M-P` | Designed for mobile-first completion | Queue, notification, approval, invite |
| Mobile Action | `M-A` | Mobile read + limited action | Detail summary + approve / comment / status |
| Mobile Read | `M-R` | Read-only on mobile | Detail confirm; link to desktop for edit |
| Desktop Primary | `D-P` | Desktop-only authoring / admin | Full boards, factories, imports |
| Desktop with Mobile Escape | `D+M` | Desktop primary but must deep-link from mobile | “전체 보기” target |

### Initial STAM surface mapping (v1 policy)

| Surface | Class | Mobile v1 support |
| --- | --- | --- |
| Auth / login / project select | `M-P` | Invite, access, project entry |
| Project overview / mobile home | `M-P` | KPI + action queue entry |
| Notifications / activity | `M-P` | Feed + acknowledge |
| Review / approval queue | `M-P` | Full decision flow |
| Comments / mentions | `M-A` | Read + reply |
| Requirement / WBS / screen-spec **boards** | `D-P` | No full table authoring on mobile |
| Requirement / WBS / screen-spec **detail** | `M-A` | Summary read + review actions; desktop for edit |
| Register / edit drawers (multi-section) | `D-P` | Shell may exist; no mobile authoring target |
| Board factory / admin / import | `D-P` | Desktop only |
| Presentation / beam mode | `D-P` | Desktop / large display |

---

## Mobile Information Architecture (v1)

Recommended top-level mobile mental model (aligns with Mobile Core Workflow preview):

```text
[ 할 일 ]  [ 검토 ]  [ 알림 ]  [ 프로젝트 ]
```

| Tab | Primary content |
| --- | --- |
| 할 일 | My Action Queue (due, overdue, assigned) |
| 검토 | Review + approval items awaiting decision |
| 알림 | Changes, mentions, system events |
| 프로젝트 | Project context, role, members, switch project |

**Note:** This is a **product IA baseline**, not a mandate to change `nav-data` or shell in this PR.

---

## Action Allowlist (Mobile v1)

| Action | Allowed on mobile | Notes |
| --- | --- | --- |
| Accept / decline invite | Yes | |
| View membership & role | Yes | |
| List review / approval queue | Yes | |
| Approve / reject | Yes | Short reason on reject |
| Add comment / reply | Yes | |
| Acknowledge notification | Yes | |
| Read artifact summary | Yes | |
| Single-field status update | Yes | Audited, entity-specific rules later |
| Create full artifact | No | Desktop |
| Multi-field edit / save | No | Desktop |
| Bulk select / delete | No | Desktop |
| Import / export | No | Desktop |
| Board factory / admin | No | Desktop |

---

## Evaluation Criteria (Mobile Readiness)

A feature is **mobile-ready per this baseline** only if all apply:

1. **Job fit:** Maps to at least one core mobile job (§ Core Mobile Jobs).
2. **Action path:** Primary user completes the job in ≤3 taps from mobile home or notification.
3. **Context sufficiency:** Summary shows ID, title, status, owner, and last change without horizontal table scan.
4. **Decision support:** Approve / reject / comment available where applicable.
5. **Desktop escape:** Full edit defers to desktop with explicit CTA.
6. **Not width-only:** Passing 390px layout QA alone is insufficient.

### Anti-checklist (automatic fail)

- [ ] Primary CTA is “등록” on a multi-section authoring drawer
- [ ] Main content is an unbounded desktop table
- [ ] User must complete bulk selection to act
- [ ] No permission explanation when action is blocked
- [ ] No path to desktop for blocked edit intent

---

## Relationship to Existing STAM Documents

| Document | Role relative to this baseline |
| --- | --- |
| `stam/docs/STAM-Mobile-Core-Workflow-Baseline-v1.html` | Visual / flow preview for queue, KPI, bottom tabs (PR #211) |
| `stam/docs/STAM-Mobile-Shell-Top-Navigation-Guide-v1.html` | Shell, topbar, nav responsive patterns |
| `stam/docs/STAM-Data-Table-Full-Table-Responsive-Guide-v1.html` | Table → card / full-table responsive presentation |
| `stam/docs/STAM-UI-Baseline-Guide.html` | Global UI baseline (desktop-first product) |
| **This document** | **Product usage policy — what mobile is for** |

**Layering:**

```text
STAM Mobile Product Usage Baseline v1   ← what work mobile supports (this doc)
        ↓
Mobile Core Workflow Baseline v1        ← how priority queue looks (preview)
        ↓
Mobile Shell / Table responsive guides  ← how layout adapts (implementation)
        ↓
Follow-up screen PRs                    ← per-screen CSS / behavior
```

---

## Follow-up PR Guidance

This PR is **documentation / policy only**. Do not implement layout in the same PR.

| Follow-up | Description |
| --- | --- |
| Mobile layout PRs | Per-surface CSS / component assembly against this baseline |
| Mobile home / queue | Wire real data to action queue surfaces |
| Notification center | Activity feed read path |
| Review / approval actions | Service-backed approve / reject on mobile |
| Desktop deep links | Consistent `전체 보기` contract from mobile detail |

When implementing follow-ups:

- Reuse existing STAM tokens, shell, and components — no new one-off mobile CSS files without approval.
- Classify each screen using § Screen & Surface Support Classification before coding.
- Prefer **card + queue + CTA** over **shrunk table**.

---

## Governance

| Check | This PR |
| --- | --- |
| Product pages changed | No |
| `stam/css/**` changed | No |
| `stam/js/**` changed | No |
| Firebase / Firestore / CRUD | No |
| New product runtime behavior | No |
| Official mobile usage baseline | Yes |

---

## Version

| Field | Value |
| --- | --- |
| Version | v1 |
| PR | #315 |
| Status | Baseline (policy) |
| Supersedes | Ad-hoc “390px fit” assumptions |
| Next review | When first mobile layout implementation PR ships |
