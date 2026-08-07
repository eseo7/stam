# PR별 검증 산출물 저장 규칙

이 디렉터리(`acceptance/`)는 실제 PR별 검증 산출물을 저장한다.  
참고: `../STAM-AI-Verification-Protocol-v1.md`

---

## 저장 대상

| 등급 | 저장 여부 |
|------|-----------|
| L4 핵심 | 필수 저장 |
| L3 중요 | 필수 저장 |
| L2 일반 (공통 컴포넌트 포함) | 권장 저장 |
| L1 경미 | PR 체크리스트로 대체 가능 |

다음 영역의 작업은 등급과 무관하게 저장한다.

- 인증 (Firebase Auth)
- 권한 (프로젝트 멤버, 역할)
- Firestore 데이터
- Firebase Rules
- 전역 CSS 변경

---

## 파일 명명 규칙

```
PR-XXX-<work-name>-acceptance.md
PR-XXX-<work-name>-independent-review.md
PR-XXX-<work-name>-recheck.md
PR-XXX-<work-name>-smoke-qa.md
```

- `XXX`: PR 번호. PR 생성 전에는 `XXX`를 사용하고, 생성 후 실제 번호로 변경한다.
- `<work-name>`: 작업 내용을 나타내는 짧은 영문 식별자 (예: `picker`, `dialog`, `auth`)

---

## 예시

```
PR-401-picker-acceptance.md
PR-401-picker-independent-review.md
PR-401-picker-recheck.md
PR-401-picker-smoke-qa.md

PR-415-dialog-acceptance.md
PR-415-dialog-independent-review.md
PR-415-dialog-smoke-qa.md
```

---

## 파일별 사용 시점

| 파일 | 사용 시점 |
|------|-----------|
| `*-acceptance.md` | 구현 시작 전 작성하고 확정한다 |
| `*-independent-review.md` | 구현 완료 후 독립 검사 세션에서 작성한다 |
| `*-recheck.md` | 보정 후 재검사 시 작성한다 |
| `*-smoke-qa.md` | Preview/Staging 환경에서 Browser QA 후 작성한다 |

---

## 사용 템플릿

각 파일 작성 시 다음 템플릿을 복사해서 사용한다.

| 파일 | 템플릿 |
|------|--------|
| `*-acceptance.md` | `../STAM-Acceptance-Criteria-Template-v1.md` |
| `*-independent-review.md` | `../STAM-Independent-Review-Template-v1.md` |
| `*-recheck.md` | `../STAM-Independent-Review-Template-v1.md` (재검사임을 제목에 명시) |
| `*-smoke-qa.md` | `../STAM-Smoke-QA-Template-v1.md` |
