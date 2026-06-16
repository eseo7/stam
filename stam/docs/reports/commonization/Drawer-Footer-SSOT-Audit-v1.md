# Drawer Footer SSOT Audit — v1

**작성일:** 2026-06-16  
**대상:** 요구사항정의서 / 메뉴구조·화면목록 / WBS / 화면설계서 / 기능정의서  
**범위:** Drawer 하단 버튼 영역 — 저장·닫기·삭제·승인·취소 버튼 영역

---

## 1. 공통 Drawer Footer CSS (SSOT)

**파일:** `css/stam.drawer.css`

```css
.stam-drawer-foot {
  flex-shrink: 0;
  padding: 12px var(--stam-drawer-foot-px);
  border-top: 1px solid var(--bd);
  background: var(--bg-sur2);
  display: flex;
  align-items: center;
  gap: 8px;
}
```

**변수:**
- `--stam-drawer-foot-px: 24px` — 좌우 패딩
- `--bd` — 상단 구분선
- `--bg-sur2` — 푸터 배경

**판정:** CSS 공통 클래스 존재. 그러나 각 게시판이 추가 CSS를 중복 정의.

---

## 2. 게시판별 Drawer Footer DOM 구조

### 2-1. 요구사항정의서 — Register Drawer Footer

```html
<div class="rq-dw-foot stam-drawer-foot">
  <button class="rq-btn rq-btn-ghost stam-btn stam-btn-ghost" type="button" data-rq-close>취소</button>
  <button class="rq-btn rq-btn-out stam-btn stam-btn-outline" type="button">임시저장</button>
  <button class="rq-btn rq-btn-out stam-btn stam-btn-outline" type="button">전체 보기</button>
  <div style="flex:1"></div>
  <button class="rq-btn rq-btn-pri stam-btn stam-btn-primary" type="button">등록</button>
</div>
```

### 2-2. 요구사항정의서 — Detail Drawer Footer

```html
<div class="rq-dw-foot stam-drawer-foot">
  <div class="rq-dw-foot-l">최종 변경 2026-06-10</div>
  <div class="rq-dw-foot-r">
    <button class="rq-btn rq-btn-out stam-btn stam-btn-outline" type="button">전체 보기</button>
    <button class="rq-btn rq-btn-pri stam-btn stam-btn-primary" type="button" data-rq-open="edit">수정</button>
  </div>
</div>
```

### 2-3. 요구사항정의서 — Edit Drawer Footer

(Detail과 유사, 저장 버튼 포함)

---

### 2-4. 메뉴구조/화면목록 — Register Drawer Footer

```html
<div class="msl-dw-foot stam-drawer-foot">
  <div class="msl-dw-foot-l">
    <button class="msl-btn stam-btn stam-btn-secondary" type="button" data-msl-close>취소</button>
    <button class="msl-btn stam-btn stam-btn-secondary" type="button">임시저장</button>
    <button class="msl-btn msl-btn-ghost stam-btn stam-btn-ghost" type="button">전체 보기</button>
  </div>
  <div class="msl-dw-foot-r">
    <button class="msl-btn msl-btn-pri stam-btn stam-btn-primary" type="button">등록</button>
  </div>
</div>
```

**주목:** 요구사항과 버튼 구조가 다름. 요구사항은 flat flex, 메뉴구조는 left/right 분리.

---

### 2-5. WBS — Drawer Footer (JS 렌더링)

WBS drawer footer는 JS(`stam.wbs.js`)로 동적 렌더링:
- `.wbs-drawer-footer` 클래스 (`.stam-drawer-foot` 없음)
- 인라인 `<style>`로 버튼 크기 override

**HTML 패턴 (JS 생성):**
```html
<div class="wbs-drawer-footer">
  <button class="stam-btn">취소</button>
  <button class="stam-btn wbs-btn-primary">저장</button>
</div>
```

**인라인 스타일 (`wbs.html`):**
```html
<style>
  .wbs-drawer-footer .stam-btn {
    box-sizing: border-box;
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    line-height: 1;
    border-radius: var(--r-md);
  }
  .wbs-drawer-footer .stam-btn.wbs-btn-primary {
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    border-color: var(--btn-primary-bg);
  }
</style>
```

---

### 2-6. 화면설계서 — Drawer Footer (JS 렌더링)

화면설계서 drawer footer는 `stam.screen-specification.js`로 완전 동적 렌더링:
- `#ss-dw-foot` — id 기반 컨테이너, JS가 innerHTML 교체
- 인라인 `<style>`로 버튼 크기 override

**인라인 스타일 (`screen-specification.html`):**
```html
<style>
  .screen-spec-page .ss-dw-foot .stam-btn {
    box-sizing: border-box;
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    line-height: 1;
    border-radius: var(--r-md);
  }
</style>
```

---

### 2-7. 기능정의서 — Drawer Footer

```html
<div class="fn-dw-foot stam-drawer-foot">
  <div class="fn-dw-foot-l">
    <!-- 메타 정보 영역 (경우에 따라 비어있음) -->
  </div>
  <div class="fn-dw-foot-r">
    <button class="fn-btn stam-btn stam-btn-ghost" type="button" data-fn-close>취소</button>
    <button class="fn-btn stam-btn stam-btn-outline" type="button">임시저장</button>
    <button class="fn-btn fn-btn-pri stam-btn stam-btn-primary" type="button">등록</button>
  </div>
</div>
```

---

## 3. 게시판별 비교표

| 항목 | 요구사항 | 메뉴구조 | WBS | 화면설계서 | 기능정의서 |
|------|----------|----------|-----|-----------|-----------|
| **컨테이너 클래스** | `rq-dw-foot stam-drawer-foot` | `msl-dw-foot stam-drawer-foot` | `wbs-drawer-footer` (STAM 없음) | `ss-dw-foot` (STAM 없음) | `fn-dw-foot stam-drawer-foot` |
| **레이아웃** | flat flex + `flex:1` spacer | left/right 분리 | 단순 flex | JS 동적 | left/right 분리 |
| **취소 버튼** | ghost | secondary | stam-btn | JS 동적 | ghost |
| **임시저장** | outline | secondary | 없음 | JS 동적 | outline |
| **전체 보기** | outline | ghost | 없음 | JS 동적 | 없음 |
| **등록/저장** | primary (오른쪽) | primary (오른쪽) | primary (오른쪽) | JS 동적 | primary (오른쪽) |
| **메타 정보** | 최종 변경일 (detail만) | 날짜 (있음) | 없음 | JS 동적 | 없음 |
| **인라인 `<style>`** | ❌ 없음 | ❌ 없음 | ✅ 있음 | ✅ 있음 | ❌ 없음 |
| **JS 렌더링** | 정적 HTML | 정적 HTML | 동적 | 동적 | 정적 HTML |
| **STAM 공통 클래스** | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 4. 버튼 Variant 비교

| 버튼 역할 | 요구사항 | 메뉴구조 | 기능정의서 | 권장 통일안 |
|-----------|----------|----------|-----------|------------|
| 취소/닫기 | `stam-btn-ghost` | `stam-btn-secondary` | `stam-btn-ghost` | `stam-btn-ghost` |
| 임시저장 | `stam-btn-outline` | `stam-btn-secondary` | `stam-btn-outline` | `stam-btn-outline` |
| 전체 보기 | `stam-btn-outline` | `stam-btn-ghost` | (없음) | `stam-btn-ghost` |
| 등록/저장 | `stam-btn-primary` | `stam-btn-primary` | `stam-btn-primary` | `stam-btn-primary` |
| 수정 | `stam-btn-primary` | (없음) | (없음) | `stam-btn-primary` |
| 삭제 | (없음) | (없음) | (없음) | `stam-btn-danger` |

**불일치 항목:**
- 취소 버튼: ghost vs secondary 혼재
- 임시저장: outline vs secondary 혼재
- 전체 보기: outline vs ghost 혼재

---

## 5. 버튼 순서 비교

### 요구사항 등록 drawer (register):
```
[취소] [임시저장] [전체 보기]    ←spacer→    [등록]
```

### 메뉴구조 등록 drawer:
```
left: [취소] [임시저장] [전체 보기]     right: [등록]
```

### 기능정의서 등록 drawer:
```
left: (meta)     right: [취소] [임시저장] [등록]
```

**문제:** 버튼 순서와 그룹핑이 게시판마다 다름. config 기반이 아닌 하드코딩.

---

## 6. 메타 정보 표시 비교

| 게시판 | 메타 표시 | 위치 | 내용 |
|--------|-----------|------|------|
| 요구사항 (detail) | ✅ | footer 왼쪽 | "최종 변경 YYYY-MM-DD" |
| 메뉴구조 | ✅ | footer 왼쪽 | 날짜 |
| WBS | ❌ | — | 없음 |
| 화면설계서 | JS 동적 | — | JS로 결정 |
| 기능정의서 | ❌ | — | 없음 |

---

## 7. 게시판별 전용 CSS (중복 목록)

### stam.requirements.css
```css
.rq-dw-foot { flex-shrink:0; padding:12px 24px; border-top:1px solid var(--bd); background:var(--bg-sur2); display:flex; align-items:center; gap:8px; }
.rq-dw-foot-l { flex:1; font-size:11px; color:var(--t3); }
.rq-dw-foot-r { display:flex; align-items:center; gap:8px; }
.rq-dw-foot .rq-btn { height:32px; padding:0 12px; font-size:13px; line-height:1; }
```

### stam.menu-screen-list.css
```css
.msl-dw-foot { flex-shrink:0; padding:12px 24px; border-top:1px solid var(--bd); background:var(--bg-sur2); display:flex; align-items:center; gap:8px; }
.msl-dw-foot-l { flex:1; display:flex; align-items:center; gap:6px; font-size:11px; }
.msl-dw-foot-date { font-size:11px; color:var(--t3); }
.msl-dw-foot-r { display:flex; align-items:center; gap:8px; }
.msl-dw-foot .msl-btn { height:32px; padding:0 12px; font-size:13px; }
```

### stam.functional-specification.css
```css
.fn-dw-foot { flex-shrink:0; padding:12px 24px; border-top:1px solid var(--bd); background:var(--bg-sur2); display:flex; align-items:center; gap:8px; }
.fn-dw-foot-l { flex:1; font-size:11px; color:var(--t3); }
.fn-dw-foot-r { display:flex; align-items:center; gap:8px; }
.fn-dw-foot .fn-btn { height:32px; padding:0 12px; font-size:13px; }
```

**결론:** 3개 게시판 CSS가 완전히 동일한 규칙을 prefix만 바꿔 복사. `.stam-drawer-foot`이 이미 동일 역할을 하는 CSS를 제공하고 있으므로 모두 제거 가능.

---

## 8. 공통 Renderer 설계 제안

### 8-1. Drawer Footer Config Schema

```javascript
// Board Factory에서 drawer footer config
drawerFooter: {
  // 메타 정보 슬롯
  meta: {
    show: true,                    // 표시 여부
    field: 'updatedAt',            // 데이터 소스 필드
    format: '최종 변경 {value}'   // 표시 형식
  },
  
  // 버튼 목록 (왼쪽 → 오른쪽 순서)
  actions: [
    {
      id: 'cancel',
      label: '취소',
      variant: 'ghost',           // ghost|outline|secondary|primary|danger
      position: 'left',           // left|right
      closeDrawer: true,          // 클릭 시 drawer 닫기
      showIn: ['register', 'edit'] // 표시할 drawer 모드
    },
    {
      id: 'temp-save',
      label: '임시저장',
      variant: 'outline',
      position: 'left',
      showIn: ['register', 'edit']
    },
    {
      id: 'full-view',
      label: '전체 보기',
      variant: 'ghost',
      position: 'left',
      showIn: ['detail', 'register', 'edit']
    },
    {
      id: 'spacer',
      type: 'spacer',             // flex:1 spacer
      position: 'left'
    },
    {
      id: 'submit',
      label: '등록',              // mode별로 다름: '등록' / '저장' / '수정'
      labels: { register: '등록', edit: '저장' },
      variant: 'primary',
      position: 'right',
      showIn: ['register', 'edit']
    },
    {
      id: 'edit',
      label: '수정',
      variant: 'primary',
      position: 'right',
      showIn: ['detail'],
      action: 'openMode:edit'     // 다른 모드로 전환
    }
  ]
}
```

### 8-2. Renderer 출력 HTML

```html
<!-- register mode -->
<div class="stam-drawer-foot">
  <button class="stam-btn stam-btn-ghost" data-drawer-action="cancel">취소</button>
  <button class="stam-btn stam-btn-outline" data-drawer-action="temp-save">임시저장</button>
  <button class="stam-btn stam-btn-ghost" data-drawer-action="full-view">전체 보기</button>
  <div style="flex:1"></div>
  <button class="stam-btn stam-btn-primary" data-drawer-action="submit">등록</button>
</div>

<!-- detail mode -->
<div class="stam-drawer-foot">
  <div class="stam-dw-foot-meta">최종 변경 2026-06-10</div>
  <div style="flex:1"></div>
  <button class="stam-btn stam-btn-ghost" data-drawer-action="full-view">전체 보기</button>
  <button class="stam-btn stam-btn-primary" data-drawer-action="edit">수정</button>
</div>
```

---

## 9. Config로 달라져야 할 항목

| Config 항목 | 이유 |
|-------------|------|
| `actions[]` | 게시판마다 버튼 종류 다름 |
| `actions[].showIn` | 등록/수정/상세 모드별 버튼 다름 |
| `actions[].labels` | 같은 submit 버튼도 모드별 label 다름 |
| `meta.show` | 메타 정보 표시 여부 게시판마다 다름 |
| `meta.field` | 메타 정보 소스 필드 다름 |

**CSS는 config 없음:** `.stam-drawer-foot` 단일 SSOT로 커버.

---

## 10. 다음 PR 범위 제안

### 범위: Drawer Footer SSOT PR

**우선 적용 대상 (3개 게시판 — 정적 HTML):**
1. 요구사항정의서
2. 메뉴구조/화면목록
3. 기능정의서

**포함 작업:**
1. 각 게시판 CSS에서 `.[prefix]-dw-foot*` 규칙 제거
2. 각 게시판 HTML에서 `[prefix]-dw-foot` → `stam-drawer-foot` 단일 클래스로 교체
3. 버튼 variant 통일 (취소: ghost, 임시저장: outline, 등록: primary)
4. `data-drawer-action` attribute 통일 (현재: `data-rq-close`, `data-msl-close`, `data-fn-close`)

**제외:**
- WBS, 화면설계서 — JS 동적 렌더링 방식. Board Factory 전환 시 함께 처리
- 인라인 `<style>` 제거 — CSS SSOT가 `.stam-drawer-foot .stam-btn` 크기 규칙을 포함하면 자동 해결

**예상 PR 크기:** 소규모  
**위험도:** 낮음 (CSS + HTML 클래스 변경만. JS 로직 변경 없음)

---

## 11. WBS / 화면설계서 — 별도 처리 필요

WBS와 화면설계서는 drawer footer가 JS로 동적 생성되므로 일반 PR로 수정 불가.

**권장 처리 방법:**
- Board Factory 전환 시 drawer footer config를 통해 자동 생성
- 인라인 `<style>` → `stam.drawer.css`에 `.stam-drawer-foot .stam-btn` 크기 규칙 추가하면 인라인 override 불필요

**stam.drawer.css에 추가 제안:**
```css
/* Drawer footer 내부 버튼 기본 크기 */
.stam-drawer-foot .stam-btn {
  box-sizing: border-box;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1;
}
```

이 규칙 추가로 WBS·화면설계서의 인라인 `<style>` override가 불필요해짐.
