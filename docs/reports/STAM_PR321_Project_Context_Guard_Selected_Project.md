# STAM PR #321 — Project Context Guard & selectedProjectId Contract

## 목표

선택한 프로젝트(`projectId`)가 Live 제품 화면 간 이동에서 일관되게 유지되도록 URL query와 sessionStorage 계약을 정리한다.

## projectId 우선순위

1. URL query `?projectId=...`
2. sessionStorage `stam:selectedProjectId`
3. 둘 다 없으면 `/pages/auth/projects.html`로 이동

## 동작

| 상황 | 처리 |
|------|------|
| URL에 projectId 있음 | sessionStorage에 저장 |
| URL 없음 + storage 있음 | `history.replaceState`로 URL에 projectId 보정 |
| 둘 다 없음 | 프로젝트 선택 화면으로 이동 |
| `/pages/auth/**` | guard redirect 비활성 (loop 방지) |

## 신규 API (`stam.project-context-guard.js`)

- `STAM.projectContextGuard.getSelectedProjectId()`
- `STAM.projectContextGuard.getSelectedProjectName()`
- `STAM.projectContextGuard.requireProjectContext()`
- `STAM.projectContextGuard.withProjectId(href)`

## 수정 파일

- `stam/js/stam.project-context-guard.js` (신규)
- `stam/js/stam.nav-render.js` — `withProjectId()`로 Live/Preview 이동 시 projectId 유지
- `stam/js/stam.project-context-render.js` — 선택 프로젝트명 title 보정
- `stam/pages/dashboard/project-overview.html`
- `stam/pages/boards/requirements.html`
- `stam/pages/boards/menu-screen-list.html`
- `stam/pages/boards/wbs.html`
- `stam/pages/boards/screen-specification.html`
- `scripts/test-project-context-guard-contract.mjs`
- `docs/reports/STAM_PR321_Project_Context_Guard_Selected_Project.md`

## 미변경

- `stam.auth-membership-gate.js`, `stam.nav-data.js`, `stam.shell.js`
- Firestore read/write 로직 (guard는 storage/URL만)
- `stam.auth-project-list.js` sessionStorage key / 이동 URL

## 검증

```bash
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
node scripts/test-nav-live-dimmed-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-no-inline-style.mjs
```
