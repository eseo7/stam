# Screenshots — Button / Chip Alias SSOT v1

본 PR 의 작업 환경에는 headless 브라우저(chromium / google-chrome / firefox) 가 설치되어 있지 않아 실제 캡처를 수행하지 못했습니다.
본 PR 자체가 audit-first 로 product CSS / HTML 을 변경하지 않으므로 시각 회귀는 발생하지 않지만,
리뷰어가 로컬에서 다음 캡처를 추가해 주시기 바랍니다.

## 권장 파일명 (1366px / Light)

- `rq-list-buttons-chips-1366.png` — 요구사항정의서 목록 (등록/필터/내보내기 + chip)
- `msl-list-buttons-chips-1366.png` — 메뉴구조/화면목록 목록
- `fn-list-buttons-chips-1366.png` — 기능정의서 목록
- `rq-register-drawer-buttons-1366.png` — 요구사항 등록 drawer footer
- `msl-register-drawer-buttons-1366.png` — 메뉴구조 등록 drawer footer
- `fn-register-drawer-buttons-1366.png` — 기능정의서 등록 drawer footer
- `rq-detail-drawer-buttons-1366.png` — 요구사항 상세 drawer footer
- `msl-detail-drawer-buttons-1366.png` — 메뉴구조 상세 drawer footer
- `fn-detail-drawer-buttons-1366.png` — 기능정의서 상세 drawer footer

## 1920px / Light

- `rq-list-buttons-chips-1920.png`
- `msl-list-buttons-chips-1920.png`
- `fn-list-buttons-chips-1920.png`

## Dark mode (1366)

- `rq-list-buttons-chips-1366-dark.png`
- `msl-list-buttons-chips-1366-dark.png`
- `fn-list-buttons-chips-1366-dark.png`

## 캡처 방법 (로컬)

```sh
cd stam
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/pages/boards/requirements.html 등 접속 후 캡처
```

또는 Playwright / Chromium headless 로 자동화 가능.
