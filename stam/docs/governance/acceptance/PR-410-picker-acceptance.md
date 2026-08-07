# PR #410 Acceptance Criteria — STAM Common Picker

> 본 문서는 공통 Picker 구현을 시작하기 전에 확정하는 Acceptance Criteria다.
> 구현 결과에 맞추기 위한 사후 기준 완화 또는 임의 변경은 금지한다.
> 객관적 사유에 의해 기준을 변경할 경우 변경 전/후, 사유, 승인 및 기존 판정 영향을 기록한다.

참조 기준:
- `stam/docs/governance/STAM-AI-Verification-Protocol-v1.md`
- `stam/docs/governance/STAM-Acceptance-Criteria-Template-v1.md`

---

## 1. 작업 정보

- 작업명: STAM Common Picker 선행 공통화
- 작업 등급: **L3 — 중요**
- Repo: `eseo7/stam`
- Base: `main`
- Branch: 구현 시작 시 기록
- PR: #410
- 작성일: 2026-08-07
- 기준 상태: 구현 전 확정

---

## 2. 작업 목적

현재 STAM 화면에서 사용 중인 Picker/Select 계열 UI를 조사하고, 화면별 복제 방식이 아니라 재사용 가능한 공통 Picker 구조로 정리한다.

이번 작업의 핵심은 단순히 Picker 디자인을 동일하게 만드는 것이 아니다.
다음을 만족해야 한다.

1. 공통 구조가 하나의 기준으로 관리된다.
2. 대상 화면이 해당 공통 구조를 실제로 사용한다.
3. 화면별 중복 Picker CSS/JS가 증가하지 않는다.
4. 기존 화면 기능 및 데이터 흐름을 깨뜨리지 않는다.
5. PC와 모바일 모두 동일한 컴포넌트 규칙을 따른다.
6. 향후 다른 문서/화면에서도 동일 Picker를 확장 적용할 수 있다.

---

## 3. 선행 Inventory

구현 전에 현재 Picker 구조를 먼저 조사하고 결과를 기록한다.

최소 조사 대상:

- Picker와 유사한 Select UI가 존재하는 화면
- Picker 관련 HTML 구조
- Picker 관련 CSS selector
- Picker 관련 JavaScript
- 화면별 중복 CSS
- 화면별 별도 상태 처리
- Native `<select>` 사용 여부
- Custom Picker 사용 여부
- 공통 컴포넌트 파일 존재 여부
- 다크모드 처리 방식
- 모바일 처리 방식

Inventory 결과 없이 구현을 시작하지 않는다.
Inventory 결과에서 실제 수정 대상 파일을 확정한 후 아래 `수정 허용` 목록에 기록한다.

---

## 4. 수정 허용

구현 전 Inventory 완료 후 실제 파일 경로를 확정한다.

예정 범위:

```text
공통 Picker component/style/script
Picker를 대표 적용할 화면
Picker 관련 기존 중복 CSS
Picker 관련 테스트
이번 PR의 acceptance/review/smoke 문서
```

실제 구현 전 아래 형식으로 파일을 명시한다.

```text
- <공통 Picker 파일>
- <공통 Picker CSS 파일>
- <대표 적용 화면>
- <중복 제거 대상 CSS>
- <관련 테스트 파일>
```

`stam/**` 전체와 같은 광범위한 허용 범위는 사용하지 않는다.

---

## 5. 수정 금지

이번 Picker 공통화와 직접 관계없는 영역은 수정하지 않는다.

기본 금지:

```text
- Firebase Auth
- firestore.rules
- storage.rules
- Firebase 데이터 모델
- 로그인 흐름
- 사용자/역할 권한 구조
- Left Navigation 구조
- Topbar 구조
- App Shell 구조
- Picker와 관계없는 제품 기능
- Picker와 관계없는 문서 화면
- Picker와 관계없는 공통 컴포넌트
```

추가 금지:

- Picker 작업을 이유로 unrelated CSS 리팩터링 금지
- Picker 작업을 이유로 화면 전체 DOM 재구성 금지
- Picker 작업을 이유로 제품 문구 임의 변경 금지
- Picker 작업을 이유로 기존 데이터 값/코드값 변경 금지

---

## 6. Acceptance Criteria

### 6.1 기능 — AC-FN

#### AC-FN-001

Picker Trigger를 선택하면 해당 Picker의 옵션 목록이 열린다.

판정:
- Trigger 동작 확인
- open 상태 확인
- 콘솔 오류 없음

---

#### AC-FN-002

Picker가 열린 상태에서 동일 Trigger를 다시 선택하거나 정의된 close action을 수행하면 닫힌다.

---

#### AC-FN-003

Picker 외부 영역을 선택하면 열린 Picker가 닫힌다.

단, 기존 STAM Picker에 다른 확정 동작이 존재하면 Inventory에서 확인 후 구현 전에 기준 변경 이력에 기록한다.

---

#### AC-FN-004

Escape 키 입력 시 열려 있는 Picker가 닫힌다.

---

#### AC-FN-005

옵션을 선택하면 선택된 값이 Trigger 영역에 반영된다.

---

#### AC-FN-006

옵션 선택 후 Picker가 정의된 상태로 종료된다.

기본 기대값:
- selected 값 반영
- Picker close
- 화면의 기존 후속 로직 정상 실행

---

#### AC-FN-007

기존 Picker가 연결하고 있던 필터, 검색, 폼 값, 상태 변경 등의 기능이 공통화 후에도 동일하게 작동한다.

Picker 공통화로 기존 비즈니스 로직의 입력값 또는 반환값이 변경되어서는 안 된다.

---

#### AC-FN-008

Picker가 여러 개 존재하는 화면에서 Picker A가 열린 상태로 Picker B를 열었을 때 중복 open 상태가 발생하지 않는다.

기본 기대:
- 동시에 하나의 Picker만 활성화

다른 정책이 필요한 경우 구현 전에 기준을 변경한다.

---

### 6.2 UI — AC-UI

#### AC-UI-001

모든 공통 Picker 적용 대상은 동일한 기본 구조와 상태 표현을 사용한다.

최소 상태:
- default
- hover
- focus
- open
- selected
- disabled

---

#### AC-UI-002

Picker의 높이, padding, border, radius, typography 및 icon 정렬은 공통 기준에서 관리한다.

화면별 임의 보정값을 새로 추가하지 않는다.

---

#### AC-UI-003

선택된 항목은 공통 selected 상태 표현을 사용한다.

화면마다 서로 다른 selected 표현을 신규 생성하지 않는다.

---

#### AC-UI-004

Disabled Picker는 사용 가능한 Picker와 시각적으로 구분되고 사용자 입력에 반응하지 않는다.

---

#### AC-UI-005

Picker open 시 dropdown/list가 Trigger와 위치상 연결되어 보이며 화면 레이아웃을 비정상적으로 밀어내지 않는다.

---

#### AC-UI-006

기존 STAM 라이트/다크 테마에서 Picker 텍스트, 배경, border, hover, selected 상태를 식별할 수 있다.

---

### 6.3 공통화 — AC-CM

#### AC-CM-001

공통 Picker의 기준 구현이 **단일 SSOT**로 확인된다.

독립 검사 시 다음을 확인한다.
- 공통 스타일 위치
- 공통 동작 위치
- 공통 DOM/API 규칙

---

#### AC-CM-002

대표 적용 화면은 실제 공통 Picker를 사용한다.

단순히 화면별 기존 코드를 동일하게 복사하여 모양만 맞춘 경우 FAIL이다.

---

#### AC-CM-003

Picker 공통화 이후 화면별 Picker 전용 중복 CSS가 새로 생성되지 않는다.

---

#### AC-CM-004

Inventory에서 공통 Picker와 중복된 것으로 확정된 기존 CSS는 안전하게 제거하거나 공통 기준으로 통합한다.

단, 다른 화면에서 아직 사용하는 selector는 근거 없이 삭제하지 않는다.

---

#### AC-CM-005

동일한 목적의 Picker event handler가 화면별로 반복 구현되지 않는다.

화면별 코드에는 다음만 남기는 것을 원칙으로 한다.
- 데이터 전달
- 해당 화면 고유 후속 동작
- 공통 Picker로 전달할 설정

---

#### AC-CM-006

화면 고유 데이터와 공통 UI 동작을 분리한다.

공통 Picker 내부에 특정 화면의 문서명, 필터명, 업무 코드 등을 하드코딩하지 않는다.

---

#### AC-CM-007

향후 다른 STAM 화면에서 기존 Picker 소스를 복사하지 않고 동일 공통 Picker 구조를 재사용할 수 있어야 한다.

---

#### AC-CM-008

기존 WBS 및 다른 화면에 존재하는 Picker 중복 CSS를 Inventory에서 식별하고 다음 중 하나로 명확히 분류한다.

- 이번 PR에서 제거
- 아직 다른 화면 의존성이 있어 유지
- 후속 PR에서 제거

판단 근거 없이 그대로 남기지 않는다.

---

### 6.4 반응형 — AC-RS

#### AC-RS-001

STAM이 지정한 PC QA viewport에서 Picker와 dropdown이 정상 표시된다.

---

#### AC-RS-002

모바일/좁은 화면 QA viewport에서 Picker 때문에 가로 스크롤이 발생하지 않는다.

---

#### AC-RS-003

화면 가장자리 근처 Picker의 dropdown이 viewport 밖으로 불필요하게 잘리지 않는다.

---

#### AC-RS-004

모바일에서 옵션 선택 영역이 지나치게 작아 조작이 어려운 상태가 발생하지 않는다.

---

#### AC-RS-005

PC와 모바일이 서로 다른 복제 Picker 구현을 사용하지 않는다.

필요한 차이는 공통 Picker의 responsive rule로 처리한다.

---

### 6.5 접근성 — AC-AC

#### AC-AC-001

키보드만으로 Picker Trigger에 접근할 수 있다.

---

#### AC-AC-002

Picker open/close 상태에서 focus가 비정상적으로 유실되지 않는다.

---

#### AC-AC-003

Escape 동작이 지원된다.

---

#### AC-AC-004

선택 가능 항목과 disabled 항목이 의미상 구분된다.

---

#### AC-AC-005

Custom Picker를 사용하는 경우 Trigger와 option 관계를 브라우저/보조기술이 이해할 수 있는 구조로 구현한다.

실제 구현 방식은 기존 STAM 구조와 HTML 패턴을 조사한 뒤 결정한다.

---

### 6.6 인증/권한 — AC-AU

`N/A — 이번 작업은 Picker 공통 UI 구조 정리가 목적이며 인증 및 권한 정책 자체는 변경하지 않는다.`

단, 기존 Picker 옵션이 권한에 따라 달라지는 화면이 Inventory에서 발견되는 경우:
- 기존 권한 필터링 결과가 그대로 유지되는지 회귀 기준으로 추가한다.
- Picker 공통 컴포넌트가 권한 판정 자체를 임의로 수행하지 않는다.

---

### 6.7 데이터 — AC-DT

#### AC-DT-001

Picker 공통화 전후 선택 값의 실제 데이터 value가 동일하다.

표시 Label만 같고 실제 value가 달라지는 회귀를 허용하지 않는다.

---

#### AC-DT-002

공통 Picker 적용으로 저장 데이터 구조, Firestore field, 코드값을 변경하지 않는다.

---

#### AC-DT-003

Picker 초기값을 기존 데이터에서 불러오는 화면은 공통화 후에도 동일한 값이 선택 상태로 복원된다.

---

#### AC-DT-004

`N/A — 이번 Picker 작업에서 신규 Firestore collection, document, field 또는 Rules 변경은 없다.`

---

### 6.8 회귀 — AC-RG

#### AC-RG-001

Picker 적용 전 정상 동작하던 대표 화면의 조회/필터/폼 동작이 적용 후에도 정상 동작한다.

---

#### AC-RG-002

Picker 외 기존 Button, Dialog, Drawer, Table 동작에 변화가 없다.

---

#### AC-RG-003

새로고침 후 기존 화면의 Picker 초기 상태가 이전 기준과 동일하다.

---

#### AC-RG-004

다크모드가 존재하는 대상 화면에서는 Picker 적용 후 기존 다크모드 기능이 깨지지 않는다.

---

#### AC-RG-005

Picker 공통화를 위해 전역 selector의 의미를 변경하여 다른 화면 UI가 달라지는 회귀가 발생하지 않는다.

---

#### AC-RG-006

브라우저 콘솔에 Picker 관련 신규 error 또는 uncaught exception이 발생하지 않는다.

---

### 6.9 범위 — AC-SC

#### AC-SC-001

실제 변경 파일이 구현 전에 확정한 수정 허용 범위와 일치한다.

---

#### AC-SC-002

Picker와 관계없는 CSS/JS/HTML 리팩터링을 포함하지 않는다.

---

#### AC-SC-003

Firebase 관련 파일을 변경하지 않는다.

---

#### AC-SC-004

신규 dependency를 추가하지 않는다.

신규 dependency가 불가피할 경우 구현 전에 Acceptance Criteria 변경 절차를 거친다.

---

#### AC-SC-005

공통 Picker를 만들기 위해 화면 전체를 새로 그리거나 기존 App Shell 구조를 변경하지 않는다.

---

### 6.10 검증 증거 — AC-EV

#### AC-EV-001

Picker Inventory 결과를 제출한다.

최소:
- 대상 화면
- 관련 파일
- 기존 selector
- 기존 JS
- 중복 여부
- 공통화 여부

---

#### AC-EV-002

`git diff --name-only` 결과를 제출한다.

---

#### AC-EV-003

자동 테스트 또는 실행 가능한 검증 명령어와 결과를 제출한다.

---

#### AC-EV-004

PR Preview URL과 Head SHA를 제출한다.

---

#### AC-EV-005

Preview CI Run ID와 결과를 제출한다.

---

#### AC-EV-006

독립 검사 결과를 저장한다.

권장 파일: `PR-XXX-picker-independent-review.md`

---

#### AC-EV-007

독립 검사에서 FAIL이 발생하여 수정한 경우 최신 Head SHA 기준 재검사 결과를 저장한다.

권장 파일: `PR-XXX-picker-recheck.md`

---

#### AC-EV-008

Browser Smoke QA 결과를 저장한다.

권장 파일: `PR-XXX-picker-smoke-qa.md`

---

## 7. 필수 Smoke QA 시나리오

최소 다음을 실제 Preview에서 검사한다.

| 시나리오 | 기대 결과 |
|----------|-----------|
| Picker 기본 표시 | 기준 UI 정상 |
| Picker open | 옵션 목록 정상 표시 |
| 옵션 선택 | 값 및 selected 상태 반영 |
| 외부 클릭 | Picker close |
| Escape | Picker close |
| Disabled | 입력 차단 |
| Picker 2개 이상 | open 상태 충돌 없음 |
| 기존 필터/폼 | 기존 기능 정상 |
| 새로고침 | 초기값/상태 정상 |
| 다크모드 | 상태 식별 가능 |
| PC | 레이아웃 이상 없음 |
| 모바일 | 가로 스크롤/잘림 없음 |
| Console | 신규 오류 없음 |

Inventory 결과에 따라 추가 시나리오를 작성한다.

---

## 8. 독립 검사 필수 항목

독립 검사자는 구현 세션과 분리된 세션에서 다음을 확인한다.

1. 정말 하나의 공통 Picker인가
2. 화면별 복제 구현은 없는가
3. CSS만 비슷하게 만든 것을 공통화라고 보고하지 않았는가
4. 화면별 중복 selector가 남았는가
5. 화면 고유 로직이 공통 Picker 내부에 들어갔는가
6. Picker value가 기존과 동일한가
7. 모바일/다크모드 회귀가 없는가
8. 범위 외 수정이 없는가
9. 최신 Head SHA를 검사했는가
10. Acceptance Criteria별 근거가 있는가

독립 검사자는 대상 소스를 직접 수정하지 않는다.

---

## 9. Ready Gate

다음 조건을 모두 충족해야 PR을 Ready로 전환할 수 있다.

- [ ] Inventory 완료
- [ ] 수정 허용 파일 확정
- [ ] 모든 필수 Acceptance Criteria PASS
- [ ] N/A 항목 사유 검증 완료
- [ ] 독립 검사 완료
- [ ] FAIL 발생 시 독립 재검사 완료
- [ ] Browser Smoke QA PASS
- [ ] Preview CI PASS
- [ ] 최신 Head SHA 확인
- [ ] 범위 외 변경 없음
- [ ] Firebase 변경 없음
- [ ] 신규 콘솔 오류 없음

---

## 10. Merge Gate

Ready 이후 Merge 직전에 다시 확인한다.

- PR Head SHA가 최종 독립 검사 SHA와 동일하다.
- PR Head SHA가 Smoke QA SHA와 동일하다.
- 필수 CI가 PASS다.
- Mergeable 상태가 정상이다.
- 차단 이슈가 없다.
- 미완료 비차단 사항은 별도 후속 작업으로 분리되어 있다.

조건을 충족할 경우 squash merge한다.

---

## 11. 기준 변경 이력

| 일시 | 기준 ID | 변경 전 | 변경 후 | 사유 | 승인 | 기존 판정 영향 |
|------|---------|---------|---------|------|------|----------------|
| | | | | | | |
