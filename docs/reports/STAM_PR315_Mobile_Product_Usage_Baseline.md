# STAM PR315 — Mobile Product Usage Baseline v1

## Purpose

PR #315 establishes the official STAM **mobile product usage baseline** — defining what mobile is for, independent of viewport width or per-screen responsive tweaks.

Reference:

- `stam/docs/reports/STAM_Mobile_Product_Usage_Baseline_v1.md`
- `stam/docs/STAM-Mobile-Core-Workflow-Baseline-v1.html` (visual preview, PR #211)

## Scope

### Added

- `stam/docs/reports/STAM_Mobile_Product_Usage_Baseline_v1.md`
- `docs/reports/STAM_PR315_Mobile_Product_Usage_Baseline.md`

### Updated (index link only)

- `stam/docs/STAM-Docs-Index.html` — link to Mobile Product Usage Baseline v1 in §01 기준 문서

### Not modified

- `stam/pages/**`
- `stam/css/**`
- `stam/js/**`
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`
- `.github/workflows/**`
- `package.json`, `package-lock.json`
- Firebase / Auth / Firestore / CRUD logic
- Product screen behavior

## Key policy

```txt
STAM Mobile is not a full desktop replacement.
STAM Mobile is an action-focused review, approval, access, and notification channel.
```

## Core mobile jobs (v1)

1. 초대 수락
2. 권한 확인
3. 검토 요청 확인
4. 승인 / 반려
5. 댓글 / 피드백
6. 내 할 일 확인
7. 변경 알림 확인
8. 산출물 상세 확인
9. 간단한 상태 변경

## Document layers

| Layer | Artifact | PR |
| --- | --- | --- |
| Product usage policy | `STAM_Mobile_Product_Usage_Baseline_v1.md` | #315 (this PR) |
| Workflow preview | `STAM-Mobile-Core-Workflow-Baseline-v1.html` | #211 |
| Shell / table responsive guides | `stam/docs/STAM-Mobile-Shell-*`, `STAM-Data-Table-*` | prior |
| Screen layout implementation | Follow-up PRs | TBD |

## Governance result

| Check | Result |
| --- | --- |
| Product screen changes | None |
| CSS / JS changes | None |
| New inline style/script | None |
| Firebase / CRUD changes | None |
| Official mobile usage baseline | Added |
| Docs index link | Added |

## Follow-up (out of scope)

- Per-screen mobile CSS layout PRs
- Mobile home / action queue data wiring
- Notification and approval service integration on mobile surfaces

## Verification

Manual:

- Open `stam/docs/reports/STAM_Mobile_Product_Usage_Baseline_v1.md` and confirm § Core Mobile Jobs, § Desktop vs Mobile matrix, § Evaluation Criteria.
- Open `stam/docs/STAM-Docs-Index.html` and confirm link under §01 기준 문서.

No automated test required (documentation-only PR).
