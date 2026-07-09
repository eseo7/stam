# STAM Agent Judgment Playbook

> 목적: 이 문서는 STAM 작업에서 지민이 실제로 판단할 때 쓰는 기준을 Claude Chat / Claude Code / Cursor / Claude Design과 공유하기 위한 전수본이다.  
> 범위: 기간·일정·완성도 추정은 제외한다. 오직 **판단 규칙, 반복 재작업 방지, 결정 이유, 검증 순서**만 다룬다.

---

## 0. 먼저 전제

STAM에서 가장 위험한 실패는 “코드가 동작하지 않는 것”보다 **같은 구조를 화면마다 새로 만들어서 제품 일관성이 무너지는 것**이다.

AI 에이전트는 보통 다음 패턴을 보인다.

- 요청을 빠르게 만족시키기 위해 기존 구조를 찾기보다 새 HTML/CSS/JS를 만든다.
- “공통화”를 “비슷한 모양으로 복붙”으로 오해한다.
- 문서형 Preview와 실제 제품 화면의 경계를 흐린다.
- UI 작업에서 레퍼런스 조사 없이 자기 감각으로 화면을 만든다.
- PR 본문에는 “공통코드 재사용”이라고 쓰지만 diff를 보면 새 구조가 들어가 있다.

그래서 STAM에서는 **작업 지시서보다 검증 게이트가 중요하다.**

---

# 1. 뺑뺑이 트리거 패턴

## 1-1. “화면 만들어줘”라고만 하면 거의 새로 만든다

### 터지는 조건

아래처럼 지시하면 에이전트는 기존 App Shell, Topbar, Left Menu, CSS 토큰, 공통 컴포넌트를 찾기보다 새 화면을 통째로 만든다.

```txt
로그인 화면 만들어줘.
화면설계서 등록 화면 만들어줘.
프로젝트 선택 화면 만들어줘.
관리자 화면처럼 만들어줘.
```

### 왜 터지나

에이전트는 “완성된 화면을 보여주는 것”을 우선 목표로 잡는다. 그래서 기존 STAM 구조를 재사용하는 것보다, 자기 안에 있는 일반 SaaS/관리자 템플릿을 꺼내서 빨리 만든다.

### 실제 사례형 판단

로그인 화면을 “Google 로그인 화면”이라고만 주면, 결과가 다음 둘 중 하나로 치우친다.

- Google 버튼 하나만 있는 빈약한 액션 박스
- 일반 B2C 서비스처럼 이메일/비밀번호/회원가입/비밀번호 찾기가 붙은 화면

STAM의 정답은 둘 다 아니다.

```txt
Google only는 유지한다.
하지만 화면은 정식 로그인 페이지처럼 브랜드 진입감, 초대 계정 안내, 접근 권한 흐름, 프로젝트 멤버 상태 설명을 가져야 한다.
```

즉, 기능 정책과 UI 밀도를 따로 지시해야 한다.

### 막는 지시 형태

```txt
이번 작업은 신규 레이아웃 생성이 아니라 기존 STAM 문서/제품 구조를 기준으로 한다.
작업 전 실제 repo에서 기존 shell/nav/topbar/theme/component CSS/JS를 확인하고, 재사용할 파일을 먼저 보고하라.
새 CSS/JS/inline style 생성은 금지한다.
```

---

## 1-2. “게시판”이라고 말하면 CMS 게시판으로 오해한다

### 터지는 조건

```txt
화면설계서 게시판 등록 부분 만들어줘.
공지사항/FAQ 등록 흐름 참고해서 만들어줘.
```

이렇게 주면 에이전트는 화면설계서를 “제목/내용/첨부파일/노출여부” 중심의 CMS 게시판으로 해석하기 쉽다.

### 왜 터지나

일반적인 관리자 스토리보드에서 게시판 등록은 다음 패턴이다.

- 제목
- 내용 에디터
- 첨부파일
- 노출 여부
- 상단 고정
- 등록일
- 조회수

하지만 STAM의 화면설계서는 게시물이 아니다. **구조화 산출물**이다.

### STAM 기준

화면설계서 등록은 “게시글 작성”이 아니라 다음 구조에 가깝다.

```txt
목록
→ 등록 Drawer에서 기본정보 생성
→ 템플릿 선택
→ 화면설계서 Editor 진입
→ 필드/액션/검증/권한/연결정보 작성
```

### 막는 지시 형태

```txt
화면설계서는 CMS 게시판이 아니다.
자유 에디터 중심 등록 금지.
제목/내용/첨부파일 중심 구조 금지.
등록 Drawer는 기본정보만 받고, 실제 작성은 화면설계서 Editor로 넘긴다.
```

---

## 1-3. “공통화해줘”라고만 하면 공통화가 아니라 복붙이 된다

### 터지는 조건

```txt
요구사항이랑 WBS랑 화면설계서 공통 스타일로 맞춰줘.
버튼/칩/상태를 공통화해줘.
Drawer 패턴을 통일해줘.
```

### 왜 터지나

에이전트는 “비슷해 보이는 CSS를 각 파일에 넣는 것”도 공통화라고 착각한다. 하지만 STAM에서 공통화는 그런 뜻이 아니다.

### STAM 기준 공통화 정의

공통화는 다음 조건을 만족해야 한다.

```txt
두 개 이상 화면이 같은 stam-* CSS와 같은 STAM.* JS renderer 또는 같은 공통 class/토큰을 실제로 공유해야 한다.
```

다음은 공통화가 아니다.

- 화면별 CSS에 같은 값을 복붙
- 비슷한 class명을 새로 생성
- docs 전용 class를 제품 화면에 끌어다 씀
- 기존 renderer가 있는데 새 renderer를 생성

### 막는 지시 형태

```txt
공통화라는 단어를 쓰기 전, 재사용할 실제 파일명과 class/function명을 먼저 적어라.
새 class/function을 만들 경우 기존 것으로 불가능한 이유를 작성하라.
```

---

## 1-4. 색상 토큰화는 “시각 동일”과 “토큰 통합”을 분리하지 않으면 뺑뺑이 돈다

### 터지는 조건

```txt
하드코딩 색상 제거하고 토큰화해줘.
```

이 한 줄만 주면 두 가지 해석이 충돌한다.

- 기존 색상을 픽셀 단위로 보존해야 한다.
- 기존 색상을 STAM 토큰 SSOT로 흡수해야 한다.

### 실제 사례형 판단

Board Factory 색상 토큰화에서 `#DC2626`을 기존 토큰 `var(--prio-high)`로 흡수하면 색상 delta가 생긴다. 여기서 “원색 보존”을 요구하면 신규 토큰이 필요하거나 하드코딩을 유지해야 한다. 하지만 “토큰 SSOT 통합”이 목적이면 delta를 승인해야 한다.

### 막는 지시 형태

```txt
이번 PR은 pixel-preserving migration이 아니라 token SSOT consolidation PR이다.
색상 delta가 발생하는 항목은 PR 본문에 명시하고 승인 대상으로 둔다.
신규 토큰은 이번 PR에서 만들지 않는다.
```

이렇게 목적을 먼저 고정해야 한다.

---

## 1-5. Left Menu / Topbar / App Shell이 언급되면 하드코딩 재생성 위험이 커진다

### 터지는 조건

```txt
좌측 메뉴도 같이 보이게 해줘.
Topbar 붙여줘.
App Shell 형태로 만들어줘.
```

### 왜 터지나

에이전트는 화면 안에 nav/topbar HTML을 직접 박아 넣으면 빠르게 완성된다. 하지만 STAM은 이미 shell/nav/topbar 렌더러와 nav-data SSOT가 있다.

### STAM 기준

- Left Menu는 SSOT 기준이어야 한다.
- Topbar는 기존 renderer 기준이어야 한다.
- 페이지마다 하드코딩하면 메뉴명/순서/카운트/상태 배지가 흔들린다.

### 막는 지시 형태

```txt
Left Menu / Topbar / App Shell 신규 HTML 하드코딩 금지.
기존 shell/nav/topbar renderer와 nav-data를 확인하라.
이번 PR에서 해당 파일을 수정하지 않는다면, 화면 내부에 임의 nav/topbar를 만들지 말라.
```

---

## 1-6. “문서 Preview” 작업은 docs CSS와 제품 CSS가 섞이는 순간 위험해진다

### 터지는 조건

```txt
Preview 문서 만들어줘.
실제 화면처럼 보이게 해줘.
```

### 왜 터지나

문서형 Preview를 예쁘게 만들려고 `<style>` 블록, inline style, docs 전용 class를 막 넣는다. 그 자체도 문제지만, 더 큰 문제는 나중에 이 구조가 제품 화면으로 오염되는 것이다.

### 막는 지시 형태

```txt
문서형 Preview는 docs 기준 class만 사용한다.
제품 화면 CSS/JS를 수정하지 않는다.
Preview용 CSS를 제품 화면에 적용하지 않는다.
<style>, style="", inline script body 금지.
```

---

## 1-7. “로그인 구현”이라고 말하면 SDK/config를 너무 빨리 붙인다

### 터지는 조건

```txt
로그인 화면 구현해줘.
Google 로그인 붙여줘.
Auth bootstrap 시작해줘.
```

### 왜 터지나

에이전트는 로그인이라는 단어를 보면 Firebase SDK, `initializeApp`, `getAuth`, `GoogleAuthProvider`, `signInWithPopup`, config object를 바로 추가하려고 한다.

### STAM 기준

로그인은 다음 순서로 나눠야 한다.

```txt
로그인 흐름 Preview
→ Auth 데이터 구조 기준
→ Firestore membership read gate
→ 실제 Auth bootstrap
→ write rules / role hardening
```

### 막는 지시 형태

```txt
이번 PR은 Design Preview only다.
Firebase SDK, firebaseConfig, apiKey, authDomain, initializeApp, GoogleAuthProvider 추가 금지.
실제 로그인 동작 금지.
```

---

## 1-8. “라우트 후보”를 주면 실제 파일을 임의 생성하려 한다

### 터지는 조건

```txt
/login, /projects, /access-pending, /access-denied 라우트 후보를 잡아줘.
```

### 왜 터지나

문서상 후보와 실제 제품 파일 생성의 경계를 헷갈린다.

### 막는 지시 형태

```txt
이번 문서의 route는 후보 문서화일 뿐이다.
실제 stam/pages/** 파일 생성 금지.
실제 라우팅 구현 금지.
제품 경로는 후속 PR에서 실제 repo 구조 확인 후 확정한다.
```

---

## 1-9. “조금만 고쳐줘”가 가장 위험할 때가 있다

### 터지는 조건

```txt
이거만 살짝 고쳐줘.
문구만 바꿔줘.
링크만 추가해줘.
색상만 맞춰줘.
```

### 왜 터지나

작아 보이는 작업일수록 allowed/forbidden file 범위를 생략하게 된다. 그러면 에이전트가 주변 구조까지 정리하거나 리팩터링한다.

### 막는 지시 형태

```txt
수정 허용 파일: A, B
수정 금지 파일: 그 외 전부
문구 외 구조 변경 금지
PR body 외 코드 변경 금지
```

---

# 2. 막은 방법 vs 못 막은 방법

## 2-1. 실제로 잘 먹힌 방법: allowed files / forbidden files 명시

### 왜 먹혔나

에이전트가 어디까지 손대야 하는지 명확해진다. 특히 `firestore.rules`, `firebase.json`, `.github/workflows/**`, `stam/js/**`, `stam/css/**`, `stam/pages/**` 같은 금지 경로를 직접 쓰면 방어 효과가 크다.

### 단, 조건이 있다

지시서에만 쓰면 부족하다. 완료 보고 때 반드시 `git diff --name-only`로 검증해야 한다.

```txt
allowed/forbidden files는 지시가 아니라 검증 대상이다.
```

---

## 2-2. 잘 먹힌 방법: “새 CSS/JS 파일 생성 0건” 같은 숫자형 FAIL 조건

### 왜 먹혔나

“가능하면 기존 코드 써라”는 약하다. 반면 아래처럼 쓰면 에이전트가 자기 행동을 제한한다.

```txt
새 CSS 파일 생성 시 FAIL
새 JS 파일 생성 시 FAIL
inline style 발견 시 FAIL
Firebase config 발견 시 FAIL
stam/pages/** 변경 시 FAIL
```

### 사례형 판단

Board Factory 토큰화처럼 공통 CSS/JS 안에서만 정리해야 하는 작업은 “새 파일 0건” 조건이 효과가 있었다. 기존 `stam.board-factory.css`, `stam.board-layout.css`, `stam.board-factory.js`, `stam.board-configs.js` 안에서 해결하게 만들 수 있었다.

---

## 2-3. 잘 먹힌 방법: 기존 사용 파일/클래스/함수 목록을 PR body에 쓰게 하기

### 왜 먹혔나

공통코드를 쓰라는 말보다, 실제로 무엇을 썼는지 적게 하면 허위 공통화가 줄어든다.

좋은 PR body는 이런 식이다.

```txt
사용한 기존 CSS/JS 파일:
- stam/css/stam.tokens.css
- stam/css/stam.board-factory.css
- stam/js/stam.board-factory.js

사용한 기존 class/function:
- .bf-chip--*
- renderSummaryStrip()
```

나쁜 PR body는 이런 식이다.

```txt
기존 스타일을 참고하여 일관되게 구성했습니다.
```

“참고”는 재사용이 아니다.

---

## 2-4. 부분적으로만 먹힌 방법: alwaysApply 룰

### 왜 완전히 못 막나

alwaysApply 룰은 방향을 기억시키는 데는 좋다. 하지만 에이전트는 구체 작업 압박이 생기면 룰보다 당장 작업을 완성하는 쪽으로 흐른다.

특히 다음 상황에서 무시된다.

- 사용자가 빨리 진행하자고 할 때
- 작업 범위가 UI + 코드 + 문서로 섞일 때
- “이번만” 예외처럼 보일 때
- 기존 파일 구조가 복잡해서 탐색 비용이 클 때

### 결론

alwaysApply는 안전벨트이지 브레이크가 아니다. 브레이크는 `allowed files`, `forbidden files`, `grep`, `diff`, `screenshot QA`다.

---

## 2-5. 부분적으로만 먹힌 방법: 인벤토리 SSOT

### 왜 유효했나

인벤토리/Docs Index/SSOT 문서는 기준을 찾게 해준다. 특히 메뉴, 문서, 가이드, 템플릿이 많아질수록 필요하다.

### 왜 무시되나

작업 지시서에 “먼저 이 문서를 읽어라”가 없으면 에이전트는 현재 요청만 보고 작업한다. 소스에 SSOT가 있어도 열어보지 않으면 없는 것과 같다.

### 막는 지시 형태

```txt
작업 전 반드시 아래 파일을 읽고, 재사용할 기준을 보고하라.
- nav-data SSOT
- Docs Index
- Common Code Reuse Map
- UI Research Protocol
```

---

## 2-6. 잘 안 먹힌 방법: “일관성 있게 해줘”

### 왜 안 먹히나

일관성은 사람이 보기에는 명확하지만, 에이전트에게는 기준 파일이 없다면 매우 추상적이다.

나쁜 지시:

```txt
기존 디자인과 일관성 있게 해줘.
```

좋은 지시:

```txt
기존 `stam.components.css`의 card/button/badge class를 우선 사용한다.
새 class 생성 전 기존 class로 불가능한 이유를 보고한다.
```

---

## 2-7. 잘 먹힌 방법: Draft PR 유지 / Ready·merge 별도 승인

### 왜 먹혔나

AI는 작업을 끝내면 자연스럽게 Ready/merge까지 밀고 가려 한다. 하지만 STAM에서는 UI 육안 QA, 금지 경로 검증, Rules syntax check가 끝나기 전에는 merge하면 안 된다.

```txt
Draft PR 생성까지만.
Ready 전환 금지.
merge 금지.
staging deploy 수동 트리거 금지.
```

이 문구는 실제로 위험한 조기 병합을 줄였다.

---

# 3. 모듈별 함정

## 3-1. Auth / Login

### 함정

로그인을 “버튼 하나”로 보면 너무 빈약해지고, “일반 로그인 페이지”로 보면 이메일/비밀번호/회원가입까지 붙는다.

### 구조적 이유

STAM 로그인은 단순 인증이 아니라 **프로젝트 접근 판정의 시작점**이다.

필수 상태는 최소 다음과 같다.

```txt
미로그인
프로젝트 선택
접근 승인 대기
접근 거부
```

### 판단 기준

- Google only는 유지한다.
- 이메일/비밀번호 입력폼은 넣지 않는다.
- 하지만 페이지는 정식 로그인 화면이어야 한다.
- 초대받은 Google 계정 안내가 있어야 한다.
- 로그인 후 membership gate 흐름이 설명되어야 한다.

---

## 3-2. Project Select

### 함정

프로젝트가 하나뿐이면 선택 화면을 생략하고 바로 Overview로 보내고 싶어진다.

### 구조적 이유

STAM은 프로젝트/테넌트/멤버십 기반 제품이다. 1차에 프로젝트가 하나라도 구조는 다중 프로젝트를 견딜 수 있어야 한다.

### 판단 기준

- active 프로젝트만 표시한다.
- 프로젝트가 하나여도 선택 구조는 유지한다.
- pending/no project는 별도 화면으로 분기한다.
- Project Overview는 선택 이후의 landing이지 로그인 대체 화면이 아니다.

---

## 3-3. Requirements

### 함정

요구사항은 단순 목록 CRUD로 보이기 쉽다.

### 구조적 이유

요구사항은 WBS와 화면설계서의 상위 연결점이다. 요구사항 ID, 상태, 담당, 우선순위, 연결 산출물, 검토 상태가 후속 모듈에 영향을 준다.

### 판단 기준

- 요구사항 CRUD는 작게 시작해도 된다.
- 단, `artifactLinks`와 연결될 식별자 구조는 처음부터 흔들리면 안 된다.
- 상태값/우선순위/담당자는 나중에 권한과 필터에 연결된다.

---

## 3-4. WBS

### 함정

WBS를 일반 테이블로 보면 부족하다.

### 구조적 이유

WBS는 컬럼이 많고, 일정/상태/담당/그룹/진척/연결 산출물이 함께 움직인다. 좁은 화면, 전체 보기, 간트 영역, 그룹 접힘/펼침 같은 UI 압박이 크다.

### 판단 기준

- Focus View 또는 전체 보기 구조가 필요하다.
- 모바일에서 모든 컬럼을 억지로 보여주면 안 된다.
- 날짜/상태/진척 로직은 저장 구조와 연결된다.
- WBS는 화면설계서/요구사항 연결의 중심 중 하나다.

---

## 3-5. Screen Specification

### 함정

화면설계서를 게시판으로 보면 반드시 망가진다.

### 구조적 이유

화면설계서는 하나의 문서처럼 보이지만 실제로는 여러 하위 구조의 집합이다.

```txt
screenSpecs: 화면 기본정보
screenFields: 필드/컬럼 정의
screenActions: 버튼/액션 정의
artifactLinks: 요구사항/WBS 연결
권한/검증/상태/변경이력
템플릿 선택/편집
```

### 왜 무거운가

화면설계서는 요구사항과 WBS를 받아서 실제 화면 구조로 변환하는 산출물이다. 단순 CRUD가 아니라 “설계 데이터 모델”에 가깝다.

### 판단 기준

- 등록 Drawer는 기본정보만 받는다.
- 실제 작성은 Editor로 분리한다.
- 필드/액션은 별도 데이터로 분리한다.
- 자유 에디터 중심 등록은 금지한다.
- 화면설계서 기능은 한 PR에 몰아넣지 않는다.

---

## 3-6. Left Navigation

### 함정

1차에 Live가 적다고 메뉴를 숨기면 제품이 빈약해 보인다. 반대로 모두 활성화하면 미구현 기능처럼 보인다.

### 구조적 이유

STAM은 전체 제품 구조를 유지하면서 단계적으로 구현해야 한다. 좌측 메뉴는 제품의 로드맵이자 정보 구조다.

### 판단 기준

- 전체 메뉴 구조는 보여준다.
- Live / Preview / Planned / Locked 상태를 구분한다.
- Live 메뉴만 시각적으로 활성화한다.
- 메뉴 구조는 nav-data SSOT 기준이어야 한다.
- 화면마다 Left Menu를 새로 만들면 FAIL이다.

---

## 3-7. Docs vs Product

### 함정

문서 Preview가 예쁘면 그대로 제품에 가져가고 싶어진다.

### 구조적 이유

문서 Preview는 설명과 기준 확정이 목적이고, 제품 화면은 실제 데이터/권한/저장/오류/모바일을 감당해야 한다.

### 판단 기준

- Preview는 구현 기준서다.
- Preview가 곧 제품 파일이 아니다.
- docs CSS를 제품 화면에 섞지 않는다.
- 제품 구현 전에는 반드시 실제 repo 경로와 공통코드를 다시 확인한다.

---

# 4. 결정 로그

## 4-1. 1차 범위는 “폭 축소, 깊이 실제화”로 정했다

### 왜 그렇게 정했나

전체 메뉴와 전체 산출물을 한 번에 풀스택으로 구현하면 Auth, DB, 권한, 저장, 화면, 연결, 내보내기, 변경이력까지 모두 동시에 열린다. 그러면 화면은 많아져도 실제 시스템은 얕아진다.

그래서 1차는 핵심 산출물 중심으로 줄였다. DB 연결 순서는 **`요구사항정의서 → 기능정의서 → WBS → 화면설계서`** 로 고정한다.

```txt
요구사항정의서
기능정의서
WBS
화면설계서
```

### 포기한 것

- 전체 메뉴 Live화
- 모든 산출물 CRUD
- 전체 권한 매트릭스 완성
- 모든 변경이력/알림/내보내기

### 다시 열 조건

- 4개 핵심 산출물의 Auth/DB/CRUD/권한/연결이 안정화될 것
- 공통 CRUD 패턴이 잡힐 것
- 화면설계서 데이터 분리가 흔들리지 않을 것

---

## 4-2. `artifactLinks`는 최소 스코프로 둔다

### 왜 그렇게 정했나

요구사항정의서, 기능정의서, WBS, 화면설계서는 서로 연결되어야 한다. 하지만 각 문서 안에 서로의 ID 배열을 중복 저장하면 동기화 문제가 생긴다.

그래서 연결을 별도 collection/layer로 두는 방향이 맞다.

```txt
artifactLinks = 산출물 간 연결을 표현하는 최소 링크 레이어
```

### 포기한 것

- 자동 역방향 링크 완전 동기화
- 복잡한 그래프 탐색
- 링크 변경 이력 세분화
- 연결 강제 검증 룰
- 전체 산출물 간 범용 링크 엔진

### 왜 최소 스코프인가

처음부터 링크 엔진을 크게 만들면 CRUD보다 링크 정책이 더 커진다. 1차에서는 “수동 연결을 저장하고 조회할 수 있는 기준”이면 충분하다.

### 다시 열 조건

- 요구사항정의서 / 기능정의서 / WBS / 화면설계서 CRUD가 안정화될 것
- 연결 생성/삭제 UX가 실제로 검증될 것
- 역방향 표시, 영향도 분석, 연결 누락 경고가 필요해질 것

---

## 4-3. `changeLogs`는 deferred로 둔다

### 왜 그렇게 정했나

변경이력은 단순히 로그 collection 하나 만든다고 끝나지 않는다. 모든 write action에 이벤트를 남겨야 하고, 변경 전/후 값, 사용자, 권한, 롤백/복구 정책까지 연결된다.

1차부터 `changeLogs`를 강하게 열면 모든 CRUD 구현이 느려지고 복잡해진다.

### 1차 기준

```txt
createdAt
createdBy
updatedAt
updatedBy
status
```

기본 audit 필드 중심으로 간다.

### 포기한 것

- 필드 단위 변경 이력
- 변경 전/후 diff
- 복구/되돌리기 UX
- 전체 활동 로그
- 승인/검토 이벤트 히스토리

### 다시 열 조건

- 핵심 CRUD가 안정화될 것
- 저장/수정/삭제 패턴이 공통화될 것
- 변경이력 조회 UX를 실제로 보여줄 화면이 생길 것
- 권한과 감사 요구가 구체화될 것

---

## 4-4. Rules는 3단계로 나눈다: 구조 → read gate → write hardening

### 왜 그렇게 정했나

Firestore Rules는 한 번에 Auth, membership, read, write, role, status, field validation까지 넣으면 실패 원인을 분리하기 어렵다. 문법 오류인지, 권한 조건 오류인지, 데이터 모델 오류인지, UI query 오류인지 섞인다.

그래서 단계 분리가 맞다.

```txt
#296 계열: Auth / Project / Member 데이터 구조 기준 확정
#298 계열: project membership read gate 확정
#306 계열: write rules / role scope / hardening
```

### #298에서 일부러 제한한 것

- project subcollections read 기준만 연다.
- active member 기준 read gate만 확정한다.
- write는 열지 않는다.
- collectionGroup query는 열지 않는다.
- members read/list scope는 후속 재검토로 넘긴다.

### 포기한 것

- 즉시 CRUD write 가능 상태
- owner/admin/editor/viewer 세부 권한 완성
- field-level validation
- collectionGroup 기반 전역 조회
- 멤버 목록 노출 정책 완성

### 왜 좋은 결정이었나

Rules syntax check, membership path, active member 조건, project subcollection 구조를 먼저 안정화했다. 이후 write를 열 때 실패 원인을 좁힐 수 있다.

### 다시 열 조건

- 실제 Auth bootstrap이 붙을 것
- active project list 조회가 구현될 것
- 요구사항정의서 / 기능정의서 / WBS / 화면설계서 CRUD가 write rules를 필요로 할 것
- role별 action 정책이 UI와 함께 확정될 것

---

## 4-5. `screenFields` / `screenActions`는 PR을 분리한다

### 왜 그렇게 정했나

화면설계서 master와 하위 필드/액션을 한 PR에 넣으면 범위가 너무 커진다. 특히 UI Editor, 저장 구조, validation, 권한, 연결정보가 한꺼번에 열린다.

### 분리 기준

```txt
screenSpecs: 화면 기본정보, 상태, 템플릿, 메뉴 위치, 담당, 연결 요약
screenFields: 필드/컬럼 정의
screenActions: 버튼/액션 정의
```

### 포기한 것

- 화면설계서 완성형 Editor를 한 번에 구현
- 필드/액션/검증/권한을 한 화면에서 모두 저장
- 템플릿 선택 후 자동 필드 생성까지 즉시 구현

### 다시 열 조건

- screenSpecs master CRUD가 안정화될 것
- field/action schema가 문서로 확정될 것
- Editor UI가 리서치 기반으로 고정될 것
- 저장/수정/삭제 패턴이 공통화될 것

---

## 4-6. collectionGroup은 일부러 deferred로 둔다

### 왜 그렇게 정했나

project subcollections 구조에서는 collectionGroup query가 편해 보인다. 하지만 Rules와 query discipline이 같이 맞아야 안전하다. 단순히 `where projectId == ...`를 붙인다고 충분한지, index와 Rules가 어떻게 맞물리는지 후속 검증이 필요하다.

### 포기한 것

- 전역 검색
- 프로젝트 전체 산출물 통합 조회
- cross-project admin dashboard
- collectionGroup 기반 빠른 aggregate

### 다시 열 조건

- project-scoped CRUD가 안정화될 것
- 필요한 전역 조회 화면이 실제로 생길 것
- Rules 패턴과 index 정의가 함께 설계될 것

---

## 4-7. 로그인 UI는 구현 전에 Preview와 리서치가 먼저다

### 왜 그렇게 정했나

로그인은 기술 구현보다 사용자 첫인상과 접근 정책 설명이 중요하다. 리서치 없이 만들면 Google 버튼 하나짜리 빈 화면이 되거나, 반대로 이메일/비밀번호를 붙인 일반 회원 서비스가 된다.

### 포기한 것

- 바로 Firebase SDK 붙이기
- 바로 `/login` 제품 파일 생성
- 이메일/비밀번호/회원가입
- 임의 라우트 구현

### 다시 열 조건

- 로그인 UI 레퍼런스 조사 완료
- STAM 적용/제외 패턴 정리
- Login / Project Select / Pending / Denied 화면 구조 확정
- Auth bootstrap PR 범위 분리

---

# 5. 검증 시 봐야 할 것

## 5-1. 자기보고는 믿지 말고 diff부터 본다

### 이유

PR 본문에는 “금지 파일 미수정”, “공통코드 재사용”, “SDK 없음”이라고 적혀 있어도 실제 diff가 다를 수 있다.

### 첫 순서

```txt
1. PR 상태: open/draft/merged
2. base/head sha
3. changed files
4. additions/deletions
5. diff에서 금지 경로 존재 여부
```

자기보고는 그 다음에 본다.

---

## 5-2. changed files가 예상과 다르면 일단 의심한다

### FAIL 예시

문서 PR인데 아래가 보이면 의심한다.

```txt
stam/js/**
stam/css/**
stam/pages/**
firestore.rules
firebase.json
package.json
.github/workflows/**
```

UI Preview PR인데 새 CSS 파일이 생기면 의심한다.

```txt
stam/css/stam-login.css
stam/css/auth-preview.css
```

Auth 구현 PR이 아닌데 아래가 보이면 FAIL에 가깝다.

```txt
initializeApp
firebaseConfig
apiKey
authDomain
GoogleAuthProvider
signInWithPopup
getAuth
```

---

## 5-3. “공통코드 재사용” 검증은 실제 파일명/class/function으로 한다

### 믿으면 안 되는 문구

```txt
기존 스타일을 참고했습니다.
STAM 톤에 맞췄습니다.
공통 패턴을 적용했습니다.
```

### 믿을 수 있는 문구

```txt
사용한 기존 파일:
- stam/css/stam.tokens.css
- stam/css/stam.components.css
- stam/js/stam.board-factory.js

사용한 기존 class/function:
- .bf-chip--*
- .doc-card
- renderSummaryStrip()
```

### 검증 질문

```txt
새로 만든 class가 기존 class로 불가능했나?
같은 UI가 다른 파일에 이미 있나?
이 CSS는 두 개 이상 화면에서 공유되나?
renderer가 이미 있는데 새로 만들었나?
```

---

## 5-4. UI PR은 소스 PASS만으로 승인하지 않는다

### 이유

소스가 깨끗해도 화면이 빈약하거나 사용자가 기대한 UI가 아닐 수 있다. 로그인 Preview가 “Google 버튼 하나”로 보이는 문제가 대표적이다.

### UI 검증 순서

```txt
1. 실제 Preview URL 또는 캡처 확인
2. desktop 전체 화면 확인
3. mobile/narrow 확인
4. light/dark 확인
5. 가로 스크롤 확인
6. 빈 상태/오류 상태/권한 상태 확인
7. 문구 톤 확인
```

### 판단 기준

- UI는 기능 조건만 맞으면 끝이 아니다.
- 사용자가 기대한 화면 밀도와 제품 맥락이 맞아야 한다.
- 특히 로그인/프로젝트 선택/권한 화면은 리서치 기반이어야 한다.

---

## 5-5. 문서/Preview PR에서 inline style과 `<style>`은 우선 검색한다

### 이유

inline style과 `<style>`은 빨리 예쁘게 만들 때 가장 자주 들어간다. 하지만 STAM에서는 공통 CSS/토큰/문서 class를 우선해야 한다.

### 검색

```bash
grep -R "<style\|style=" stam/docs/<target>.html || true
```

### 판단

- `<style>` 블록이 있으면 기본적으로 FAIL 후보
- `style=""`가 있으면 기본적으로 FAIL 후보
- 예외가 필요하면 사유가 있어야 한다

---

## 5-6. Firebase/Auth/Rules는 키워드 grep을 믿는다

### 이유

PR body에 “No SDK”라고 써 있어도 실수로 SDK import가 들어갈 수 있다.

### 검색

```bash
grep -R "initializeApp\|GoogleAuthProvider\|signInWithPopup\|getAuth\|firebaseConfig\|apiKey:\|authDomain:" stam || true
```

### 판단

- 문서에서 “apiKey를 추가하지 않는다”는 안내 문구로 등장하는 것은 OK
- 실제 config object나 import가 있으면 FAIL
- Auth 구현 PR이 아닌데 SDK가 들어오면 범위 위반

---

## 5-7. Firestore Rules는 “보기에 맞다”가 아니라 syntax check가 필요하다

### 이유

Rules는 문법이 맞아야 하고, helper path가 실제로 파싱되어야 한다. 눈으로만 보면 안 된다.

### 검증 기준

- emulator 또는 Firebase CLI 기반 syntax check
- `firestore.rules`가 실제 rules 파일로 로드되었는지 로그 확인
- syntax/compile/parse 오류 검색

### 주의

Hosting Preview 실패 코드는 반드시 429와 400을 구분한다.
- 429 RESOURCE_EXHAUSTED: 5-8 기준으로 비차단 가능.
- 400 FAILED_PRECONDITION: 5-8 기준으로 차단.
이와 별개로, Rules syntax check 미실행은 코드값과 무관하게 항상 차단 조건이다.

---

## 5-8. Preview 실패는 429와 400을 분리한다

### 이유

Firebase Hosting Preview 실패는 코드에 따라 대응이 정반대다.
429 RESOURCE_EXHAUSTED와 400 FAILED_PRECONDITION은 같은 문제가 아니다.

### 429 RESOURCE_EXHAUSTED

- Firebase Hosting Preview channel quota 초과
- hosting:channel:deploy 단계에서 channel quota reached로 확인되면 비차단 가능
- 단, 로그에서 원인을 반드시 확인한다

### 400 FAILED_PRECONDITION

- Firebase Hosting 설정, target, site, public path, rewrites, firebase.json 전제조건 문제일 수 있음
- 429 quota와 다르게 자동 비차단 처리 금지
- 원인 분리 전까지 merge 차단
- 특히 firebase.json의 public / include / exclude, stam/docs 배포 포함 여부, hosting target / site 설정을 확인한다

### 판단 요약

- 429 → quota 확인 시 비차단 가능
- 400 → 원인 분리 전 차단
- Preview 실패를 코드 구분 없이 "비차단"으로 뭉개지 않는다

---

## 5-9. Docs Index 링크는 작지만 자주 깨진다

### 볼 것

- 카드가 추가됐는가
- href가 실제 파일과 맞는가
- clean URL 정책과 맞는가
- 기존 카드 href를 대량 수정하지 않았는가
- 존재하지 않는 파일을 링크하지 않았는가

### 판단

문서 PR은 본문 파일만 보면 안 된다. Index 링크가 깨지면 사용자 입장에서는 문서가 없는 것과 같다.

---

## 5-10. “금지 경로 변경 없음”은 매번 다시 본다

### 기본 금지 경로

```txt
firestore.rules
firestore.indexes.json
firebase.json
.firebaserc
.github/workflows/**
stam/pages/**
stam/js/**
stam/css/**
stam/assets/**
stam/data/**
package.json
package-lock.json
```

단, 해당 PR의 목적이 이 경로 수정일 때만 예외다. 예외는 지시서에 명시되어야 한다.

---

## 5-11. merge 전에는 Ready 상태와 head를 다시 본다

### 이유

검수 후 head가 움직일 수 있다. 이전에 본 diff 기준으로 merge하면 위험하다.

### merge 전 확인

```txt
head sha 일치
base main 최신
draft false
mergeable 확인
changed files 유지
최근 workflow 실패 원인 확인
사용자 승인 여부 확인
```

### 원칙

사용자 승인 전 merge하지 않는다. 특히 Rules/Auth/DB/제품 JS가 들어간 PR은 더 엄격하게 본다.

---

# 6. 클채가 이 문서를 쓸 때의 운영 원칙

클채는 이 문서를 일정 추정용 자료로 쓰지 말고, 다음 판단에 써야 한다.

```txt
이 작업은 재생성 위험이 있는가?
공통코드를 무시할 조건인가?
UI 리서치가 필요한가?
Preview와 제품 구현이 섞였는가?
Rules/Auth/Firestore 범위가 너무 빨리 열렸는가?
PR 본문보다 diff를 먼저 봤는가?
```

최종 원칙은 하나다.

```txt
STAM에서는 빨리 만든 화면보다, 다시 안 갈아엎어도 되는 구조가 우선이다.
```

---

## 4-8. PR #351 — 1차 실제 구현 Gate 문서 고정

**일자:** 2026-07-05  
**문서:** `docs/ops/STAM-Phase1-Implementation-Gate.md`

### 왜 지금 고정했나

PR #350으로 B5 inline cleanup이 끝났고, Auth read gate·Requirements read는 이미 동작 중이다. 이 시점에서 구현 PR을 더 열기 전에 **1차 실제 구현 범위·순서·완료 조건**을 ops 문서로 고정하지 않으면, Rules write / CRUD UI / Left Nav Live 승격이 다시 섞인다.

### 결정

- 1차 실제 구현 Gate 통과 조건을 문서로 고정한다 (`요구사항정의서 → 기능정의서 → WBS → 화면설계서` CRUD + artifactLinks + role write).
- Google only Auth·`firebaseConfig` 제품 코드 금지·project subcollection layout은 **유지**한다.
- 다음 우선 구현은 **Requirements write rules + CRUD** 한 축만 연다. 이후 **기능정의서 → WBS → 화면설계서** 순으로 DB 연결한다.
- 본 결정은 구현 PR이 아니라 **docs-only Gate PR**에서만 기록한다.

### 다시 열 조건

- Gate 문서의 8항 체크리스트 전부 PASS 시 1차 실제 구현 단계 완료로 판정.
- 범위 변경은 본 Gate 문서 또는 `STAM-Phase-1-Productization-Scope.html` 선행 갱신 후에만 허용.

---

## 4-9. PR #352 — Auth / Firestore / Workspace Technical Plan 고정

**일자:** 2026-07-06  
**문서:** `docs/ops/STAM-Auth-Firestore-Workspace-Technical-Plan.md`

### 왜 지금 고정했나

PR #351으로 1차 Gate(범위·순서·완료 조건)는 고정됐지만, Auth bootstrap·`users/{uid}` upsert·프로젝트 생성 owner·`projectId` Workspace 격리·Rules 롤아웃 순서는 **구현 PR마다 다시 해석될 위험**이 있다. Requirements write를 열기 전에 Auth/DB 기술 SSOT를 분리해 둔다.

### 결정

- Golden Path를 **Google 로그인 → users upsert → 프로젝트 목록 → 생성/선택 → projectId Workspace → 산출물 격리**로 고정한다.
- 1차 로그인은 **Google only**; 이메일·비밀번호·초대·field-level ACL은 2차로 미룬다. 1차 Firestore layout은 2차를 막지 않는다.
- 프로젝트 생성 시 **생성자 owner/active member 동시 등록**; Admin 수동 멤버 경로는 beta와 동일하게 병행한다.
- Rules 롤아웃: users bootstrap → project create → requirements write → … **단계 분리** (Gate §4-3 확장).
- 본 결정은 **docs-only Technical Plan PR**에서만 기록한다.

### 다시 열 조건

- Auth A1·A2 PR 완료 후 Console 수동 seed 없이 Golden Path 재현.
- 구조 변경 시 본 Technical Plan 또는 Gate 문서 선행 갱신.

---

## 4-10. PR #355 — users/{uid} bootstrap 구현

**일자:** 2026-07-06  
**문서:** `stam/js/stam.auth.js`, `firestore.rules`

### 왜 지금 구현했나

PR #354 Skeleton은 Firestore 없이 Auth만 연결했다. Technical Plan Golden Path 2단계(`users/{uid}` upsert)를 열지 않으면 membership gate·프로젝트 목록 PR이 Console 수동 seed에 의존한다.

### 결정

- Google 로그인 `onAuthStateChanged` 직후 `users/{uid}` **create/update** (client write + rules whitelist).
- create: `status: active`, `provider: google`, `createdAt`/`updatedAt`/`lastLoginAt`.
- update: profile + `updatedAt`/`lastLoginAt`만 — **`status` client 변경 금지**.
- Firestore 범위는 **`users/{uid}` only** — projects/members/산출물 write 없음.
- membership gate routing 재연결은 **후속 PR**.

### 다시 열 조건

- membership gate PR에서 `collectionGroup('members')` read routing 복원.
- rules 배포 후 staging에서 신규 Google 계정 login → `users/{uid}` doc 생성 QA.

---

## 4-11. PR #356 — membership gate + project list Firestore read

**일자:** 2026-07-07  
**문서:** `stam/js/stam.auth.js`, `stam/js/stam.auth-membership-gate.js`, `stam/js/stam.auth-project-list.js`, auth 5 HTML

### 왜 지금 구현했나

PR #355까지 `users/{uid}` bootstrap만 완료되어 로그인 후 skeleton으로 `projects.html`에 고정 redirect됐다. Golden Path 4–6단계(membership gate → 프로젝트 목록 → 선택 → Overview)를 열지 않으면 beta access matrix QA와 Workspace 진입이 불가능하다.

### 결정

- `stam.auth.js`에서 bootstrap 후 `STAM.authMembershipGate.resolveTargetScreen` 호출 → auth 5화면 분기.
- `stam.auth-project-list.js`로 active membership 프로젝트 카드만 Firestore read 후 렌더.
- 프로젝트 선택 시 `sessionStorage` (`stam:selectedProjectId`) + `project-overview.html?projectId=` 이동.
- Firestore write 범위는 PR #355와 동일 (`users/{uid}` only).
- 프로젝트/members create·update는 **후속 PR (A2)**.

### 다시 열 조건

- 프로젝트 생성 PR에서 `projects/{projectId}` + `members/{uid}` owner write rules + UI.
- staging에서 P1–P8 access matrix browser QA.

---

## 4-12. PR #357 — project create + owner member write

**일자:** 2026-07-07  
**문서:** `stam/js/stam.auth-project-list.js`, `firestore.rules`, auth projects/no-project HTML

### 왜 지금 구현했나

PR #356까지 read-only membership gate만 완료되어 신규 사용자는 no-project 화면에서 멈춘다. Golden Path 7단계(프로젝트 생성)를 열어 Console seed 없이 owner 진입 경로를 완성한다.

### 결정

- `batch.set`으로 `projects/{projectId}` + `members/{uid}` 원자 생성.
- 생성자 `role: owner`, `status: active`.
- 성공 후 `sessionStorage` + Project Overview 이동.
- rules: project/member **create only** — update/delete·산출물 write 금지 유지.
- UI: `projects.html` + `no-project.html`, 기존 `stam.form-controls.css` `.stam-input` 재사용.

### 다시 열 조건

- Requirements write rules PR.
- 멤버 초대/관리 UI PR.

---

## 4-13. PR #358 — requirements write rules by role

**일자:** 2026-07-07  
**문서:** `firestore.rules`, `stam/js/stam.requirements-service.js`

### 왜 지금 구현했나

PR #357까지 프로젝트 생성·owner member 등록까지 Golden Path가 완성됐지만 산출물 write는 전부 deny 상태다. Phase 1 Gate §6 단계 1(요구사항정의서)을 열기 위해 **requirements subcollection만** role-scoped write를 먼저 개방한다. UI CRUD와 delete는 후속 PR로 분리해 rules·service contract만 검증 가능하게 한다.

### 결정

- Firestore: `isRequirementWriter` — active member + role ∈ {owner, admin, editor}.
- create/update validation: `data.id == requirementId`, keys `hasOnly(requirementWriteKeys())`, title **2–120자**, `status`/`priority` enum 필수, audit fields 보존·갱신.
- delete: **deny 유지** (soft delete rules 후속).
- `viewer`: read only — write rules + service `createMemberRoleAuthorize` 모두 deny.
- Service: role authorize skeleton만 추가; default runtime service는 allow-all 유지 (UI wiring 전).
- functionalSpecs / wbsItems / screenSpecs / screenFields / screenActions / artifactLinks write: **계속 deny**.

### 다시 열 조건

- ~~Requirements CRUD UI wiring PR (service + boards UI).~~ → PR #360
- ~~default runtime service deny-by-default.~~ → PR #361
- requirement delete rules PR.
- staging emulator/browser QA with live Firestore (선택 — contract smoke는 PR #359).

---

## 4-14. PR #359 — requirements role matrix smoke QA helper

**일자:** 2026-07-08  
**문서:** `scripts/test-requirements-role-matrix-contract.mjs`, `docs/reports/STAM_PR359_Requirements_Role_Matrix_Smoke_QA.md`

### 왜 지금 구현했나

PR #358에서 requirements write rules와 service role authorize skeleton을 열었지만, UI CRUD wiring 전에는 **role × action 매트릭스**를 한 번에 검증할 자동 smoke helper가 없었다. CRUD UI PR과 분리해 contract-only QA 증빙을 먼저 남긴다.

### 결정

- `scripts/test-requirements-role-matrix-contract.mjs` **신규** — owner/admin/editor/viewer × read/create/update/delete + 기타 산출물 write deny 정합성.
- `stam/pages/dev/**` QA page는 repo에 기존 패턴이 없어 **추가하지 않음**.
- 제품 UI, `firestore.rules`, boards/requirements pages, nav-data **미변경**.
- default runtime `requirementsService` allow-all 유지 — role-bound service는 contract 테스트에서만 사용.

### 다시 열 조건

- ~~Requirements CRUD UI wiring PR.~~ → PR #360
- ~~default runtime allow-all hardening.~~ → PR #361
- ~~staging emulator/browser live write QA (maintainer 선택).~~ → PR #363 browser QA evidence

---

## 4-16. PR #361 — requirements service hardening (deny-by-default & delete API closure)

**일자:** 2026-07-08  
**문서:** `stam/js/stam.requirements-service.js`, `docs/reports/STAM_PR361_Requirements_Service_Hardening_QA.md`

### 왜 지금 구현했나

PR #360에서 CRUD UI가 `createMemberRoleAuthorize` runtime rebind에 의존하게 됐지만, script load 직후 `window.STAM.requirementsService`는 `defaultAuthorize()` allow-all 상태였다. 또 service public API에 `softDelete()`가 남아 adapter.update로 delete 필드를 쓸 수 있는 구조였다. delete 미개방 원칙과 정합되도록 service 기본 authorize와 delete surface를 닫는다.

### 결정

- `defaultAuthorize()` → `Promise.resolve(false)` (deny-by-default).
- `requirementsService.softDelete` public API **제거** — 후속 soft delete/archive policy PR로 분리.
- PR #360 list `bindAuthorizedService` rebind + CRUD create/update **유지**.
- `firestore.rules`, nav-data, boards UI, adapter **미변경**.

### 다시 열 조건

- requirement soft delete/archive policy PR (rules + service + UI).
- ~~staging emulator/browser live create/update QA (maintainer 선택).~~ → PR #363 browser QA evidence

---

## 4-15. PR #360 — requirements CRUD UI wiring (Firestore)

**일자:** 2026-07-08  
**문서:** `stam/js/stam.requirements-firestore-crud.js`, `docs/reports/STAM_PR360_Requirements_CRUD_UI_Wiring_QA.md`

### 왜 지금 구현했나

PR #358–#359에서 rules·service authorize·role matrix smoke가 완료됐다. 제품 Requirements 화면은 list read만 Firestore-backed였고, register/edit drawer는 static mock 상태였다. A3b에서 read/create/update만 service에 연결한다.

### 결정

- `stam.requirements-firestore-crud.js` **신규** — register/edit → `requirementsService.create/update`.
- `stam.requirements-firestore-list.js` — guard 후 `createMemberRoleAuthorize` runtime rebind, `memberRole` context 전달.
- `stam.requirements-firestore-adapter.js` — write payload에 `serverTimestamp()` (rules `request.time` 정합).
- viewer: 등록·수정 버튼 disabled; delete 버튼은 모든 role에서 disabled 유지.
- related artifact persistence, delete, 기타 산출물 write **미연결**.
- `stam.requirements-crud.js` (Local Core DB)는 제품 HTML에 로드하지 않음.

### 다시 열 조건

- ~~staging emulator/browser live create/update QA (maintainer 선택).~~ → PR #363 browser QA evidence
- requirement delete rules + UI PR.

---

## 4-17. PR #363 — requirements CRUD live/browser QA evidence

**일자:** 2026-07-09  
**문서:** `docs/reports/STAM_PR363_Requirements_CRUD_Live_QA.md`

### 왜 지금 구현했나

PR #360–#362에서 Requirements CRUD UI·service·list escape가 contract로 검증됐지만, **실제 브라우저**에서 list/create/update/viewer block/delete closed/escape 표시에 대한 live QA 증빙이 없었다. 기능 PR과 분리해 evidence-only PR로 Chromium browser QA를 남긴다.

### 결정

- **기능 코드·rules·nav·pages/css/js diff 없음** — docs/reports + ops gate만 갱신.
- 사전 contract 7종 **전부 PASS** (main @ `5616295`).
- Staging Preview: 미인증 `requirements?projectId=stam-demo` → `login.html` redirect **PASS**.
- Chromium + 제품 JS 로드 browser QA: list read, create/update submit, viewer UI disabled, delete alert guard, HTML escape **PASS**.
- Staging maintainer Google 세션 Firestore persistence QA (writer): **PASS** (PR #366/#367 보정 후; 리포트 §10-3). Viewer live §9 #8–9 **미확인**.
- Playwright는 repo `package.json` **미추가** (임시 QA 런타임 only).

### 다시 열 조건

- maintainer viewer live §9 #8–9 확인 (선택) 후 **Ready** 전환.
- requirement delete rules + UI PR.

---

## 4-18. PR #365 — requirements write access UI refresh after list load

**일자:** 2026-07-09  
**문서:** `stam/js/stam.requirements-firestore-list.js`, `docs/reports/STAM_PR365_Requirements_Write_Access_UI_Refresh_QA.md`

### 왜 지금 구현했나

PR #364 maintainer live QA에서 owner 세션 `canWrite() === true`인데 `#rq-reg-btn`이 disabled로 남는 결함이 확인됐다. CRUD init 시점 member role 미준비 + list load 후 UI 미재갱신이 원인이다.

### 결정

- `stam.requirements-firestore-list.js` — `refreshCrudAccessUI()` 추가, `load()` 성공·실패 후 `requirementsFirestoreCrud.applyWriteAccessUI()` 호출.
- `stam.requirements-firestore-crud.js` — public `applyWriteAccessUI` 재사용; `hookListLoad` 보조 경로 유지.
- viewer disabled / delete disabled 동작 **유지**.
- rules / nav / pages / css **미변경**.

### 다시 열 조건

- PR #364 maintainer live persistence 재확인 (등록 버튼 활성화 포함).
- requirement delete rules + UI PR.

---

## 4-19. PR #366 — requirements create payload omit nullable sortOrder

**일자:** 2026-07-09  
**문서:** `stam/js/stam.requirements-service.js`, `docs/reports/STAM_PR366_Requirements_Create_Payload_Rules_QA.md`

### 왜 지금 구현했나

PR #364 maintainer live QA에서 owner create가 `Missing or insufficient permissions`로 실패했다. member/role은 정상이며, 진단 결과 `buildCreatePayload()`가 `sortOrder: null`을 포함해 rules `data.sortOrder is int` 조건을 위반한 것이 유력하다.

### 결정

- `buildCreatePayload()` / `buildUpdatePatch()` — `sortOrder`가 null/empty/비정수일 때 **키 omit**; 정수일 때만 포함.
- `normalizeSortOrder()` — `Number.isInteger`로 rules `sortOrder is int` 정합.
- `firestore.rules` **미변경**.
- delete / viewer deny / 기타 산출물 write **미개방**.

### 다시 열 조건

- PR #364 maintainer create/update persistence QA 재실행.
- requirement delete rules + UI PR.

---

## 4-20. FS-1 / FS-2 — functionalSpecifications rules + service/adapter

**일자:** 2026-07-09  
**문서:** `firestore.rules`, `stam/js/stam.functional-spec-service.js`, `stam/js/stam.functional-spec-firestore-adapter.js`, `docs/reports/STAM_FS1_FunctionalSpec_Write_Rules_By_Role.md`, `docs/reports/STAM_FS2_FunctionalSpec_Service_Adapter_QA.md`, `docs/reports/STAM_FunctionalSpec_DB_Connection_Inventory.md`

### 왜 지금 구현했나

PR #368 inventory와 Requirements CRUD 라인(#364–#367) 완료 후, Gate §6 단계 2(기능정의서)를 열기 위해 **functionalSpecifications** subcollection write rules(FS-1)와 domain service/adapter(FS-2)를 Requirements 패턴으로 분리 구현한다.

### 결정

- Firestore collection 명: **`functionalSpecifications`** (`functionalDefinitions`는 local/prototype only).
- FS-1: `isFunctionalSpecWriter` — active member + role ∈ {owner, admin, editor}; delete **deny**.
- FS-2: `STAM.functionalSpecService` + `STAM.functionalSpecFirestoreAdapter` — create/update/read service API; **default runtime deny-by-default**; Actions는 read/create/update만 (`functionalSpec.delete` action **없음**); delete/softDelete/remove **미노출**.
- 요구사항 연결 1차: `requirementId` / `requirementCode` / `requirementTitle` — **optional** snapshot fields.
- `FN_###` code counter / requirement picker — **FS-6 후속**.
- Local IndexedDB `stam.functional-definition-crud.js` softDelete — Firestore 1차 정책과 **불일치** (inventory §9); UI 정렬은 FS-5.
- UI/pages/script tag/nav **미연결** (FS-4~).

### 다시 열 조건

- ~~FS-3 role matrix smoke QA.~~ → FS-3
- FS-4 list read binding + FS-5 CRUD UI wiring.
- maintainer live Firestore persistence QA (후속 evidence PR).

---

## 4-21. FS-3 — functionalSpecifications role matrix smoke QA helper

**일자:** 2026-07-09  
**문서:** `scripts/test-functional-spec-role-matrix-contract.mjs`, `docs/reports/STAM_FS3_FunctionalSpec_Role_Matrix_Smoke_QA.md`

### 왜 지금 구현했나

FS-1 rules와 FS-2 service/adapter merge 후, list/CRUD UI wiring(FS-4~) 전에 **functionalSpecifications role × action 매트릭스**를 자동 smoke helper로 검증한다. Requirements PR #359 analog이며, FS-2 계약(delete action 없음)을 반영한다.

### 결정

- `scripts/test-functional-spec-role-matrix-contract.mjs` **신규** — owner/admin/editor/viewer/guest/empty/unknown × read/create/update + rules delete deny + service delete action 없음.
- 제품 UI, `firestore.rules`, `stam/js/**`, pages/css/nav **미변경**.
- QA HTML page **미추가** (repo dev/qa page 패턴 없음).

### 다시 열 조건

- FS-4 list read binding.
- FS-5 CRUD UI wiring.
- maintainer live Firestore persistence QA (FS-7 evidence PR).

---

## 4-22. FS-4 — functionalSpecifications Firestore list read UI binding

**일자:** 2026-07-09  
**문서:** `stam/js/stam.functional-spec-firestore-list.js`, `stam/pages/boards/functional-specification.html`, `docs/reports/STAM_FS4_FunctionalSpec_List_Read_QA.md`

### 왜 지금 구현했나

FS-2 service/adapter와 FS-3 role matrix 완료 후, B5 기능정의서 화면의 Local IndexedDB/mock 목록을 **Firestore read-only list**로 전환한다. CRUD 저장 연결은 FS-5로 분리한다.

### 결정

- `stam.functional-spec-firestore-list.js` **신규** — `listByProject` read-only binding, loading/empty/error, `state.items` sync.
- `functional-specification.html` — Firebase Hosting init + service/adapter/list scripts; static tbody 제거; local cycle/crud scripts 제거.
- create/update/delete/softDelete UI 저장 **미연결** (FS-5).
- service/adapter/rules/nav-data/css **미변경**.

### 다시 열 조건

- ~~FS-5 CRUD UI wiring.~~ → FS-5
- FS-6 `FN_###` counter + requirement picker.
- maintainer live Firestore persistence QA (FS-7).
- staging Hosting 재배포 후 FS-4 post-merge smoke 재실행.

---

## 4-23. FS-4 post-merge — list read smoke evidence

**일자:** 2026-07-09  
**문서:** `docs/reports/STAM_FS4_FunctionalSpec_List_Read_Post_Merge_Smoke_QA.md`

### 왜 지금 했나

PR #372 merge 시 preview smoke evidence가 별도 리포트로 남지 않았고, staging live는 Hosting 재배포 전이라 FS-4 이전 산출물이 잔존. main `46d2af3` 기준 post-merge smoke를 **docs-only**로 보강한다.

### 결정

- primary evidence: PR #372 preview channel (`pr372`) = merge 산출물과 동일.
- list read binding / empty state / mock tbody 제거 — **PASS**.
- Drawer `FN-001` 등 정적 mock — **잔존**, FS-5 cleanup (코드 미수정).
- staging `stam-design-staging.web.app` — FS-4 **미반영** (재배포 대기).

### 다시 열 조건

- staging Hosting 재배포 후 smoke 재실행.
- FS-5 CRUD UI + Drawer binding.

---

## 4-24. UI Feedback Common Layer — table empty/loading/error

**일자:** 2026-07-09  
**문서:** `docs/reports/STAM_UI_Feedback_Common_Layer_QA.md`

### 왜 지금 구현했나

요구사항정의서·기능정의서 list JS에 empty/loading/error table row DOM이 각각 복제되어 있었다. 산출물/게시판 화면이 늘어날수록 동일 UI가 화면마다 반복될 위험이 있어, **table feedback만** 공통 layer로 분리한다. alert/confirm/toast·Dialog는 후속 PR로 남긴다.

### 결정

- `stam.ui-messages.js` **신규** — `STAM.uiMessages.common|requirements|functionalSpec` copy SSOT.
- `stam.ui-feedback.js` **신규** — `tableEmptyRow|tableLoadingRow|tableErrorRow|tableMessageRow` (HTML string, escape only).
- `stam.components.css` — `.stam-table-feedback-*` 최소 추가 (다크모드·narrow viewport 토큰 기반).
- `requirements-firestore-list.js` / `functional-spec-firestore-list.js` — local DOM builder 제거, 공통 유틸 wrapper만 유지 (`emptyStateRow` export 호환).
- CRUD 저장·delete/softDelete·rules·adapter·service **미변경**.

### 다시 열 조건

- UI Dialog common layer.
- alert/confirm/toast 공통 layer.
- PR #374 sync/retest.
