# STAM PR #329 — Auth Theme Inline Handler Cleanup

## 목적

Auth 화면 5페이지의 inline `onclick="STAM.toggleTheme()"`를 제거하고, `data-theme-toggle` 속성 기반으로 `stam.theme.js`가 클릭 이벤트를 공통 바인딩하도록 정리한다. **표현·이벤트 바인딩만** 변경 — 로그인/권한/Firestore/project routing/auth membership 로직 변경 없음.

## 수치 (PR #327 C2 baseline 대비)

| 항목 | Before | After |
|------|--------|-------|
| Auth `onclick="STAM.toggleTheme()"` | **5** | **0** |
| Auth inline `<style>` | 0 | 0 |
| Auth inline `<script>` 본문 | 0 | 0 |
| 신규 CSS/JS 파일 | — | **0** |

## 대상 파일

| 파일 | 변경 |
|------|------|
| `stam/js/stam.theme.js` | `[data-theme-toggle]` 클릭 위임 (`bindThemeToggleClicks`) |
| `stam/pages/auth/login.html` | `onclick` 제거 |
| `stam/pages/auth/projects.html` | `onclick` 제거 |
| `stam/pages/auth/access-pending.html` | `onclick` 제거 |
| `stam/pages/auth/access-denied.html` | `onclick` 제거 |
| `stam/pages/auth/no-project.html` | `onclick` 제거 |

## 사용 기존 API·속성

| 구분 | 항목 |
|------|------|
| JS | `STAM.toggleTheme()`, `STAM.setTheme()`, `STAM.getTheme()`, `STAM.initTheme()` |
| DOM | `data-theme-toggle`, `document.documentElement[data-theme]` |
| CSS | `stam.tokens.css`, `stam.shell.css`, `stam.components.css`, `stam.auth.css` (변경 없음) |

## `stam.theme.js` 동작

- `document` 클릭 위임: `event.target.closest('[data-theme-toggle]')` → `toggleTheme()`
- **과도기 가드**: `onclick` 속성이 남아 있는 요소(다른 화면·docs)는 위임을 건너뛰어 이중 토글을 방지한다.
- 기존 `syncToggleButtons()` 라벨 동기화는 유지.

## 미변경

- Google login / sign-out / membership gate / project select 동작
- `stam.auth-bootstrap.js`, `stam.auth-project-list.js`, `stam.auth-membership-gate.js`
- Firebase / Firestore / localStorage (theme key `stam.theme` 제외)
- CSS (`stam/css/**`)
- docs / prototype / boards-v2 / `stam/index.html` (별도 PR 예정)
- `scripts/**` — **신규 test script 추가 없음**

## 검증

```bash
git diff --name-only main...HEAD
rg 'onclick="STAM\.toggleTheme\(\)"' stam/pages/auth/
rg 'data-theme-toggle' stam/pages/auth/
node scripts/test-auth-entry-flow-contract.mjs
```

## Governance

| 항목 | 결과 |
|------|------|
| 신규 CSS/JS 파일 | 0 |
| `scripts/**` 신규 추가 | 0 |
| Auth inline `onclick` (theme) | 0 |
| Auth inline style/script 추가 | 없음 |
| Auth/Firestore 로직 변경 | 없음 |
