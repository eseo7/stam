# Board Builder Admin Preview — 회차 4 UX 보정 QA

> PR #145 (`feat/board-builder-admin-preview-v1`, Draft) · 회차 4 — "게시판 만들기" 제품형 UX 보정.
> 참고 시안: `STAM-Board-Builder-UX-Concept-v1.html` (Claude Design). 적용 범위는 **Board Builder 화면 한정**.
> 본 회차는 개발자용 config/schema editor 느낌을 제거하고 비개발자(PM/기획)가 이해 가능한 단계형 게시판 생성 화면으로 보정한다. 기능은 PR #145 그대로 유지.

---

## 1. 변경 파일

| 파일 | 변경 |
| --- | --- |
| `stam/pages/boards-v2/board-builder.html` | 제목/문구, 단계형(①기본정보 ②필드구성 ③초안만들기) 레이아웃, 템플릿 카드, 필드 카드 재설계, 우측 stats/탭/board-mock, 버튼 문구. bb- scoped inline `<style>` 한정. |
| `stam/js/stam.board-builder-preview.js` | 필드 카드 렌더 재구성(고급 설정 접기), 우측 항상 live 미리보기(stats+board mock), 탭/버튼 문구, copyJson live fallback. `buildConfig`/엔진 로직·저장 키 불변. |
| `stam/docs/reports/commonization/Board-Builder-Admin-Preview-v1.md` | §14 회차 4 추가. |
| `stam/docs/reports/visual-qa/board-builder-admin-preview-v1/**` | 본 QA evidence. |

수정 금지 파일(`board-factory.js`/`board-configs.js`/`board-field-schema.js`/`nav-data.js`/기존 v1·boards-v2 3화면/`index.html`/shell·topbar) **diff 0**. API/Firestore/fetch/localStorage 키 **추가 0**.

## 2. UX 보정 요약 (시안 대비)

| 항목 | 기존(회차 3) | 회차 4 보정 |
| --- | --- | --- |
| 제목 | `Board Builder Admin Preview` | **게시판 만들기** + 설명 문구. `Admin Preview/Local/No DB` 는 작은 보조 배지 |
| 좌측 구조 | 패널 2개(게시판 정보/필드 구성) | **단계형 ① 기본 정보 → ② 필드 구성 → ③ 초안 만들기** |
| 게시판 코드 | 일반 input + `자동` | 자동 생성 느낌(낮은 위계) + `코드 자동 생성`(nowrap) + 안내 |
| 템플릿 | readonly 텍스트 | **카드형**(공지사항/자유/자료실/Q&A/요청·이슈/직접 구성) — 시작점 예시 |
| 필드 카드 첫 화면 | key·type·raw 노출 | **필드명·입력 방식·필수·표시 위치(목록/필터/입력폼)·옵션**. key·raw type·engine 매핑은 **고급 설정** 접기 |
| 시스템 필드 | `🔒 시스템 필드` | 카드 `🔒 시스템` chip + 필수/key/삭제 잠금(부드럽게) |
| 우측 초기 상태 | 빈 empty state | **항상 live**: 현재 구성 요약(총 필드/목록 표시/필수/필터) + 예상 게시판 화면 |
| 우측 탭 | 화면 Preview/필드·컬럼/필터·드로워/JSON | **화면 미리보기 / 필드 구성 / 필터·입력화면 / JSON(개발자 참고용)** |
| 버튼 | `Preview 생성`·`Reset`·`Copy JSON` | **게시판 초안 보기**(primary 1개)·**초기화**·**JSON 복사** |

## 3. 기능 회귀 검증 (정적/스모크)

`node` vm 샌드박스(헤드리스 브라우저 미가용)로 `buildConfig`(pure) + `init()` 스모크 검증.

| 검증 | 방법 | 결과 |
| --- | --- | --- |
| `node --check` ×4 | board-builder-preview / field-schema / board-factory / board-configs | **PASS** |
| required true→false 동기화 | `required-true.json` / `required-false.json` | **PASS** (fields.required ↔ drawer marker ↔ JSON 일치) |
| DnD/이동 후 순서 반영 | `dnd-before.json` / `dnd-after.json` | **PASS** (fields 순서 → columns 순서 반영) |
| 표시 토글 반영 | `visibility-toggle.json` | **PASS** (목록/필터/입력폼 → columns/filters/drawer) |
| init + render + addField + generate + reset | DOM stub smoke | **PASS** (throw 0, 우측 "현재 구성 요약" 렌더, 카드 "고급 설정 보기"·`key` 입력은 고급 설정 내부) |
| 옵션 → 필터/드로워 옵션 전파 | smoke | **PASS** |
| console error | 모듈 로드 + init 범위 | `console_errors.json` → **0** |
| API/Firestore/fetch | grep | **0** |

### 재현
```
node --check stam/js/stam.board-builder-preview.js
# evidence 재생성 로직은 buildConfig 출력 그대로 직렬화(아래 json 파일)
```

## 4. Evidence 파일

| 파일 | 내용 |
| --- | --- |
| `required-true.json` | 제목 필수 체크 시 fields.required·drawer marker·JSON = true |
| `required-false.json` | 제목 필수 해제 시 모두 false (동기화) |
| `dnd-before.json` / `dnd-after.json` | 필드 순서 변경(`d` 맨 앞 이동) → 생성 columns 순서 반영 |
| `visibility-toggle.json` | 목록 OFF / 입력폼 ON 필드가 columns 제외·drawer 포함 |
| `console_errors.json` | 정적/스모크 범위 console error 0 |
| `layout-scroll-structure.json` | (회차 5) Shell/스크롤 구조 CSS 정적 검증 — body overflow hidden · 고정 Shell · 좌측 내부 스크롤 · 우측 비-sticky 내부 스크롤 · position:sticky 미사용 **all PASS** |
| `scrollbar-tone.json` | (회차 6) scrollbar 톤 통일 CSS 정적 검증 — `--bb-scrollbar-*` token `.bb-wrap` scope 한정 · 좌/우/테이블/json/adv 동일 token · 테이블 가로 height=token(8px, 얇게) · overflow-x:auto 유지 · 두꺼운 구 규칙 제거 · TODO 주석 **all PASS** |

## 4-1. 회차 5 — 레이아웃 스크롤 구조 보정

> 회차 4 UX 유지, 스크롤/레이아웃 구조만 정리. 상세: 본문 문서 §15.

- body/page 전체 스크롤 제거(페이지 scope `body { overflow:hidden }`) · `.bb-wrap` 100dvh flex column.
- Topbar(헤더) 고정 · 고정 Shell(`.bb-shell` grid + `grid-template-rows: minmax(0,1fr)`).
- 좌측 내부 스크롤(`.bb-form-scroll`) + 하단 액션바 고정(`.bb-form-foot`) · 스크롤바는 divider 쪽.
- 우측 `position: sticky` 제거 → Shell 안 고정 패널, 탭 내용(`.bb-tabpanels`)만 내부 스크롤.
- JS 로직 변경 0(데이터 hook·이벤트 위임 유지) → 기능 회귀 없음. 검증: `layout-scroll-structure.json` all PASS.
- 1366/1920 실제 픽셀·스크롤 감각·가로 스크롤 0 은 사용자 브라우저 QA(PENDING).

## 4-2. 회차 6 — Preview/테이블 scrollbar 톤 통일

> CSS 시각 보정만(JS 변경 0). 상세: 본문 문서 §16.

- scrollbar token 을 `.bb-wrap` scope 에만 추가(전역 `:root` 미오염): `--bb-scrollbar-size/track/thumb/thumb-hover`.
- `.bb-scrollbar` helper 정의(Board Builder scope 한정) + 좌(`.bb-form-scroll`)/우(`.bb-tabpanels`)/테이블(`.bb-brd-tblwrap`)/`.bb-json`/`.bb-adv-v` 동일 token 적용.
- 테이블 가로 스크롤 얇게(`height: 8px`) + 좌측과 동일 thumb 색 + 연한 track + rounded. `overflow-x:auto` 유지(넓을 때만 표시).
- 두꺼운 구 규칙(11px/3px inset) 제거. `TODO(v2 common)` 주석으로 `.stam-scrollbar` 승격 예약(이번 PR 미확장).
- 검증: `scrollbar-tone.json` all PASS. 실제 픽셀 두께/색 대비·dark mode 는 사용자 브라우저 QA(PENDING).

## 5. 남은 QA 항목 (사용자 브라우저 QA — PENDING)

> 본 환경에 헤드리스 브라우저가 없어 스크린샷은 첨부하지 못함. 아래는 사용자 브라우저 QA 권장 항목.

- [ ] 1920 light / 1366 light 레이아웃 (좌측 단계형·우측 미리보기 동시 가독)
- [ ] dark mode (`☾ 다크모드` 토글) 대비/가독성
- [ ] 필드 카드: 드래그 핸들 DnD(첫↔마지막·중간 삽입 후 이동), 위/아래, 삽입, 삭제
- [ ] required 체크/해제 → drawer marker(`*`)·JSON·우측 요약 즉시 반영
- [ ] 목록/필터/입력폼 토글 → 우측 board-mock 컬럼·필터 chip·입력폼 탭 반영
- [ ] 고급 설정 보기 접기/펼치기, key·raw type·engine 매핑 표시
- [ ] `게시판 초안 보기` / `초기화` / `JSON 복사`(좌측 + JSON 탭) 동작
- [ ] 새로고침 시 localStorage 복원 (입력·필드), `초기화` 후 기본 상태
- [ ] console error 0
- [ ] 기존 v1 / boards-v2 3화면 비영향 (별도 라우트)

### 스크린샷 슬롯 (사용자 캡처 시 추가)
- `screenshot-1920-light.png` — PENDING
- `screenshot-1366-light.png` — PENDING
- `screenshot-dark.png` — PENDING
