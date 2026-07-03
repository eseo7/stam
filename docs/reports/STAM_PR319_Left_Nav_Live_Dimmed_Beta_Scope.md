# STAM PR #319 — Left Navigation 1차 Live / Dimmed 메뉴 상태 정리

## 목표

1차 베타 범위에서 실제 사용 가능한 좌측 메뉴(Live)와 향후 예정 메뉴(Planned)를 시각적으로 구분한다. 전체 메뉴 구조는 유지하되, Planned / Admin / Hidden 메뉴는 클릭 이동을 차단한다.

## 상태 기준

| 상태 | 메뉴 |
|------|------|
| **Live** | A1, B1, B2, B3, B4 |
| **Preview** | B5, B8, B9, B10, C8, E7 |
| **Admin Only** | F3, F4, F11 |
| **Hidden** | B6, B7 |
| **Planned** | 위를 제외한 나머지 |

## 변경 요약

| 파일 | 내용 |
|------|------|
| `stam/js/stam.shell.js` | `LIVE_MENU_IDS` 등 상태 SSOT, `.gitem`에 `is-*` 클래스 및 `data-status` 추가 |
| `stam/js/stam.nav-render.js` | `planned` / `admin` / `hidden` 클릭 이동 차단 |
| `stam/css/stam.shell.css` | Live 선명화, Preview 중간 대비, Planned 딤, Admin/Hidden 비클릭 스타일 |

## 비범위

- `stam.nav-data.js` 미변경 (메뉴명·순서·href·그룹 count 유지)
- 제품 페이지 HTML/기능 로직 미변경
- alert / toast 미추가

## 검증

```bash
node scripts/test-nav-live-dimmed-contract.mjs
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-no-inline-style.mjs
```
