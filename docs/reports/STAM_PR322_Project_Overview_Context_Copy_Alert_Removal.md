# STAM PR #322 — Project Overview Context Copy & Alert Removal

## 목표

Project Overview 진입 시 `window.alert`를 제거하고, Firebase 등 내부 구현 용어가 사용자에게 노출되지 않도록 실패 문구를 정리한다.

## 변경 요약

| Before | After |
|--------|-------|
| `window.alert()` + redirect | `sessionStorage` 안내(`stam:entryNotice`) + redirect |
| Firebase/Hosting 오류 문구 | 사용자 친화 문구 |

## 실패/redirect 기준 (유지)

| 상황 | 이동 |
|------|------|
| projectId 없음 | `/pages/auth/projects.html` |
| 로그인 안 됨 | `/pages/auth/login.html` |
| no-member / inactive | `/pages/auth/access-denied.html` |
| 기타 접근 불가 | `/pages/auth/projects.html` |
| 검증 성공 | `document.body.hidden = false` |

## 수정 파일

- `stam/js/stam.project-overview-context.js`
- `scripts/test-project-overview-context-copy-contract.mjs`
- `docs/reports/STAM_PR322_Project_Overview_Context_Copy_Alert_Removal.md`

## 미변경

- `verifyProjectAccess()` Firestore read-only 구조
- Firestore write, Auth/membership 로직
- `stam.project-context-guard.js`, auth 페이지, boards 페이지

## 검증

```bash
node scripts/test-project-overview-context-copy-contract.mjs
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
node scripts/test-nav-live-dimmed-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-no-inline-style.mjs
```
