# STAM PR #330 — Apply Project Context Guard to B5 and C8

## 목적

B5 기능정의서(`functional-specification.html`)와 C8 오픈 시나리오(`open-scenario.html`) Live 화면에 `stam.project-context-guard.js`를 적용한다. projectId 없이 직접 접근 시 기존 Live 화면과 동일하게 `/pages/auth/projects.html`로 유도한다.

**guard script include만** 변경 — CRUD, local DB, 화면 데이터, 스타일, inline style cleanup 없음.

## projectId 계약 (PR #321 유지)

1. URL query `?projectId=...`
2. sessionStorage `stam:selectedProjectId`
3. 둘 다 없으면 `/pages/auth/projects.html`로 이동

## 수정 파일

| 파일 | 변경 |
|------|------|
| `stam/pages/boards/functional-specification.html` | guard script include 추가 |
| `stam/pages/boards/open-scenario.html` | guard script include 추가 |
| `scripts/test-project-context-guard-contract.mjs` | B5/C8 livePages 계약 확장 |
| `docs/reports/STAM_PR330_Apply_Project_Context_Guard_B5_C8.md` | 본 문서 |

## script 삽입 위치

`stam.topbar-render.js` 직후, `stam.project-context-render.js` 직전 (requirements/wbs와 동일).

```html
<script src="../../js/stam.project-context-guard.js"></script>
```

## guard 적용 Live 화면 (7)

| 화면 | 파일 |
|------|------|
| Project Overview | `project-overview.html` |
| Requirements | `requirements.html` |
| Menu Screen List | `menu-screen-list.html` |
| WBS | `wbs.html` |
| Screen Specification | `screen-specification.html` |
| **B5 기능정의서** | `functional-specification.html` |
| **C8 오픈 시나리오** | `open-scenario.html` |

## 미변경

- `stam.project-context-guard.js` — 로직 수정 없음
- `stam.functional-specification.js`, `stam.open-scenario.js` — 기능 JS 수정 없음
- B5/C8 static project context 문구
- B5/C8 inline style (79건 / 132건)
- Firestore read/write, auth/membership gate
- localStorage/sessionStorage key 신규 추가 없음

## 검증

```bash
git diff --name-only main...HEAD
rg 'stam\.project-context-guard\.js' stam/pages/boards/functional-specification.html stam/pages/boards/open-scenario.html
node scripts/test-project-context-guard-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| guard JS 로직 변경 | 없음 |
| B5/C8 기능 JS 변경 | 없음 |
| inline style/script 추가 | 없음 |
| Firestore/Auth 로직 변경 | 없음 |
