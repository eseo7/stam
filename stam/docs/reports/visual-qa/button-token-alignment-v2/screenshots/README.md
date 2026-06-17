# Screenshots — Button Token Alignment v2

본 PR 환경에는 headless 브라우저(chromium/chrome/firefox)가 설치되어 있지 않아
실제 캡처는 수행하지 못했습니다. 로컬에서 아래 파일명으로 캡처가 필요합니다.

## 권장 캡처 (1366×768, light mode)

- `rq-list-1366-light.png` — 요구사항정의서 목록 + 등록(Primary)/필터(Outline)/삭제(Del) 버튼
- `msl-list-1366-light.png` — 메뉴구조/화면목록 동일 영역
- `fn-list-1366-light.png` — 기능정의서 동일 영역
- `rq-register-footer-1366-light.png` — 등록 드로어 footer (Primary 등록 / Ghost 취소)
- `rq-detail-footer-1366-light.png` — 상세 드로어 footer
- `rq-edit-footer-1366-light.png` — 수정 드로어 footer

## 권장 캡처 (1920×1080, light mode)

- `rq-list-1920-light.png`
- `msl-list-1920-light.png`
- `fn-list-1920-light.png`

## 권장 캡처 (1366×768, dark mode)

- `rq-list-1366-dark.png` — **Primary 버튼이 brand purple (#8B7FF8) 로 보이는지 확인**
- `msl-list-1366-dark.png`
- `fn-list-1366-dark.png`

## 검증 포인트

1. Light: Primary 버튼 색상 = #5451E8 (변경 전과 동일)
2. Dark: Primary 버튼 색상 = #8B7FF8 (변경 후 — alias 와 common 양쪽 일치)
3. Light/Dark 공통: Ghost/Outline/Del 시각은 변경 없음 (alias 의도된 차이 유지)
4. Console: 신규 에러 없음
