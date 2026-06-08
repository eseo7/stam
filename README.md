# STAM

SI/SM 프로젝트 산출물, 검토, 승인, 내보내기, 운영 전환을 관리하기 위한 SaaS 제품 기준본

**Repository:** [github.com/eseo7/stam](https://github.com/eseo7/stam.git)

---

## Current Baseline

| 항목 | 값 |
|------|-----|
| Clean baseline commit | [`c4ae92d`](https://github.com/eseo7/stam/commit/c4ae92d) |
| 현재 단계 | Docs / Component Guide / Backend Architecture baseline |
| 상태 | 제품 구현 전 — 문서·가이드·IA 기준 정리 단계 |

---

## Repository Structure

```txt
.
├─ README.md
├─ .gitignore
└─ stam/
   ├─ docs/
   ├─ docs/components/
   ├─ css/
   ├─ js/
   ├─ pages/
   └─ assets/
```

- **기준 루트:** `stam/` — 제품·문서·에셋은 모두 이 하위에 둔다.
- **repo 루트:** `.gitignore`, `README.md`, `stam/`만 유지한다.

---

## Documentation Entry Points

| 용도 | 경로 |
|------|------|
| 문서 전체 인덱스 | [`stam/docs/STAM-Docs-Index.html`](stam/docs/STAM-Docs-Index.html) |
| UI 기준 (신규 화면 전 필독) | [`stam/docs/STAM-UI-Baseline-Guide.html`](stam/docs/STAM-UI-Baseline-Guide.html) |
| 컴포넌트 가이드 인덱스 | [`stam/docs/STAM-Component-Guide.html`](stam/docs/STAM-Component-Guide.html) |
| 백엔드·API 경계 (기능 설계 전 필독) | [`stam/docs/STAM-Backend-Architecture-API-Boundary-Guide.html`](stam/docs/STAM-Backend-Architecture-API-Boundary-Guide.html) |
| IA 기준 보고서 | [`stam/docs/STAM-IA-Current-Baseline-Report.html`](stam/docs/STAM-IA-Current-Baseline-Report.html) |
| 제품 홈 (Static Preview) | [`stam/index.html`](stam/index.html) |

**읽기 순서**

1. `STAM UI Baseline Guide` — 폰트·토큰·레이아웃·Left Nav·Focus View·Forbidden Rules
2. `STAM Component Guide` — 개별 컴포넌트 가이드 (`stam/docs/components/`)
3. `STAM Backend Architecture & API Boundary Guide` — 레이어 경계·API 규칙

Preview / Reports 문서(`STAM-IA-Current-Baseline-Report`, `STAM-Full-Menu-Structure-Preview` 등)는 **참고·보존 전용**이다.

---

## Work Principles

1. **단일 기준 루트** — 실제 기준 파일은 `stam/` 하위에만 둔다. repo 루트에 임시 프롬프트·구버전 Preview·Claude 산출물을 두지 않는다.
2. **문서 우선** — 신규 화면·기능 작업 전 해당 가이드를 먼저 확인하고, 기준 문서와 충돌하는 임의 변경을 하지 않는다.
3. **Baseline 고정** — `기준 고정` 표시 문서(`UI Baseline Guide` 등)는 승인 없이 구조·규칙을 변경하지 않는다.
4. **최소 변경** — 요청 범위 밖 파일·설정은 수정하지 않는다.
5. **UI 일관성** — 기본 폰트는 **에스코어드림(S-CoreDream)**. 디자인 토큰·컴포넌트 가이드 기준을 따른다.

---

## Files Not Tracked

아래 경로·파일은 `.gitignore`로 제외하며, **커밋 대상이 아니다.**

| 제외 대상 | 이유 |
|-----------|------|
| `_ds/`, `uploads/` | Claude·임시 export 폴더 |
| `.env`, `.env.*` | 환경 변수·시크릿 |
| `.firebase/` | Firebase 로컬 설정 |
| `node_modules/`, `dist/`, `build/`, `.cache/` | 빌드·의존성 산출물 |
| `*.zip`, `*.7z`, `*.rar` | 아카이브 |
| `*.log` | 로그 |

루트에 `.gitignore`, `README.md`, `stam/` 외 파일을 추가하기 전에는 baseline 기준과의 정합성을 먼저 확인한다.
