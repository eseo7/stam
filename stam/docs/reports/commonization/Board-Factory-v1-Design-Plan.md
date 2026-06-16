# Board Factory v1 Design Plan

**작성일:** 2026-06-16  
**목적:** 공통 Board Factory + board config로 5개 핵심 게시판을 재생성하기 위한 설계  
**원칙:** 기존 게시판을 직접 고치지 않음. 병렬 preview route로 검증 후 교체.

---

## 1. Board Factory 개요

### 핵심 개념

```
BoardFactory.create(containerEl, boardConfig)
    ↓
Board Engine이 생성하는 영역:
    Title Block
    Summary Strip
    Toolbar (Search + Filter + Actions)
    Table (columns + rows)
    Pagination
    Drawer (Shell + Tabs + Body + Footer)
    Empty State / Loading State / Error State
```

### Board Factory가 생성하지 않는 영역 (기존 공통 shell 사용)
- Left Navigation (`stam.nav-render.js`)
- Topbar (`stam.topbar-render.js`)
- Project Context / Top2 (`stam.project-context-render.js`)
- CSS Token 시스템 (`stam.tokens.css`)
- Theme 전환 (`stam.theme.js`)

---

## 2. Board Config Schema 초안

```typescript
interface BoardConfig {
  id: string;              // 게시판 고유 ID (예: 'requirements')
  title: string;           // 게시판 제목 (예: '요구사항정의서')
  description?: string;    // 게시판 설명
  
  // 데이터 소스
  data: {
    source: 'mock' | 'api';
    mockData?: RowData[];
    apiEndpoint?: string;
    pageSize?: number;     // 기본값: 20
  };
  
  // 영역별 활성화 여부
  regions: {
    summary?: boolean;     // Summary strip 표시 (기본값: false)
    toolbar?: boolean;     // Toolbar 표시 (기본값: true)
    pagination?: boolean;  // Pagination 표시 (기본값: true)
  };
  
  // 컬럼 정의
  columns: ColumnConfig[];
  
  // 필터 정의
  filters?: FilterGroupConfig[];
  
  // Summary strip 정의
  summary?: SummaryConfig;
  
  // Toolbar 버튼 정의
  toolbar?: ToolbarConfig;
  
  // Drawer 정의
  drawer?: DrawerConfig;
  
  // 권한
  permissions?: PermissionsConfig;
  
  // 뷰 모드 (WBS 등 특수 뷰)
  viewModes?: ViewModeConfig[];
  
  // 확장 플래그
  features?: {
    groupBy?: string;       // 그룹 컬럼 key
    enableGantt?: boolean;  // Gantt view (WBS 전용)
    enableEditor?: boolean; // 화면설계서 전용 split editor
    enableFocusView?: boolean; // WBS Focus View
  };
}
```

---

## 3. Columns Config Schema 초안

```typescript
interface ColumnConfig {
  key: string;               // 데이터 필드 키
  label: string;             // 컬럼 헤더 표시명
  width?: string;            // CSS width (예: '80px', 'min-width:240px')
  type?: ColumnType;         // 렌더러 타입
  sortable?: boolean;
  hideable?: boolean;
  visibleInModes?: string[]; // 표시할 viewMode 목록
  
  // 렌더러별 옵션
  chipMap?: Record<string, ChipStyle>;  // type: 'chip'일 때
  avatarField?: string;                 // type: 'avatar'일 때 이름 필드
  linkField?: string;                   // type: 'link-chip'일 때
}

type ColumnType = 
  | 'text'         // 단순 텍스트
  | 'id-name'      // ID + 이름 복합 셀
  | 'chip'         // 상태/유형 chip
  | 'avatar'       // 사용자 아바타 + 이름
  | 'link-chip'    // 연결 항목 chip 목록
  | 'date'         // 날짜 (YYYY-MM-DD)
  | 'progress'     // 진행률 바
  | 'checkbox';    // 체크박스 (선택 컬럼)

interface ChipStyle {
  label: string;
  color: string;    // CSS token 또는 hex
  bg: string;       // CSS token 또는 hex
}

// 예시: 요구사항 컬럼 정의
const requirementsColumns: ColumnConfig[] = [
  { key: '_select', type: 'checkbox', width: '40px', label: '' },
  {
    key: 'idName',
    type: 'id-name',
    label: '요구사항 ID / 요구사항명',
    width: 'min-width:240px'
  },
  {
    key: 'type',
    type: 'chip',
    label: '유형',
    width: '80px',
    chipMap: {
      '기능': { label: '기능', color: '#1D4ED8', bg: '#DBEAFE' },
      '화면': { label: '화면', color: '#7C3AED', bg: '#EDE9FE' },
      '데이터': { label: '데이터', color: '#047857', bg: '#D1FAE5' },
      '정책': { label: '정책', color: '#92400E', bg: '#FEF3C7' }
    }
  },
  {
    key: 'priority',
    type: 'chip',
    label: '우선순위',
    width: '76px',
    chipMap: {
      '높음': { label: '높음', color: '#991B1B', bg: '#FEE2E2' },
      '중간': { label: '중간', color: '#92400E', bg: '#FEF3C7' },
      '낮음': { label: '낮음', color: '#475569', bg: '#F1F5F9' }
    }
  },
  {
    key: 'assignee',
    type: 'avatar',
    label: '담당자',
    width: '80px'
  },
  {
    key: 'linkedScreen',
    type: 'link-chip',
    label: '연결 화면설계서',
    width: '130px'
  },
  {
    key: 'updatedAt',
    type: 'date',
    label: '최종 수정일',
    width: '100px'
  }
];
```

---

## 4. Filters Config Schema 초안

```typescript
interface FilterGroupConfig {
  key: string;               // 필터 그룹 키
  label: string;             // 섹션 헤더 표시명
  type?: 'radio' | 'multi'; // 기본값: 'multi'
  options: FilterOption[];
}

type FilterOption =
  | string                   // 단순 텍스트 (value = label)
  | {
      label: string;
      value: string;
      dot?: string;          // 상태 dot CSS class
      avatar?: string;       // 아바타 이니셜
    };

// 예시: 요구사항 필터 config
const requirementsFilters: FilterGroupConfig[] = [
  {
    key: 'status',
    label: '상태',
    options: ['작성중', '검토요청', '검토완료', '승인완료', '보류']
  },
  {
    key: 'type',
    label: '유형',
    options: ['기능', '화면', '데이터', '정책']
  },
  {
    key: 'priority',
    label: '우선순위',
    type: 'radio',
    options: ['', '높음', '중간', '낮음']  // '' = 전체 (radio 기본값)
  },
  {
    key: 'assignee',
    label: '담당자',
    options: ['김철수', '이영희', '박지수']
  }
];
```

---

## 5. Drawer Field Config Schema 초안

```typescript
interface DrawerConfig {
  width?: 'narrow' | 'default' | 'wide';  // 720px / 860px / 1040px
  
  // 탭 정의
  tabs?: DrawerTabConfig[];
  
  // 모드별 섹션 정의
  sections: Record<DrawerMode, DrawerSectionConfig[]>;
  
  // Footer 정의
  footer: DrawerFooterConfig;
}

type DrawerMode = 'detail' | 'register' | 'edit';

interface DrawerTabConfig {
  id: string;
  label: string;
  showIn?: DrawerMode[];  // 표시할 모드
}

interface DrawerSectionConfig {
  title: string;
  number?: number;       // 섹션 번호 (등록 폼에서 표시)
  fields: DrawerFieldConfig[];
  showIn?: DrawerMode[];
}

interface DrawerFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  readonly?: boolean;
  readonlyIn?: DrawerMode[];  // 특정 모드에서만 읽기 전용
  span?: number;             // 그리드 colspan (1 or 2)
  options?: string[];        // select, radio용
}

type FieldType = 
  | 'text'        // 텍스트 input
  | 'textarea'    // 텍스트 영역
  | 'select'      // 드롭다운
  | 'radio'       // 라디오 그룹
  | 'date'        // 날짜 picker
  | 'tag'         // 태그 입력
  | 'link'        // 연결 항목
  | 'readonly';   // 읽기 전용 표시

interface DrawerFooterConfig {
  meta?: {
    show: boolean;
    field?: string;
    format?: string;
    showIn?: DrawerMode[];
  };
  actions: DrawerActionConfig[];
}

interface DrawerActionConfig {
  id: string;
  label: string | Record<DrawerMode, string>;  // 모드별 다른 label
  variant: 'ghost' | 'outline' | 'secondary' | 'primary' | 'danger';
  position: 'left' | 'right';
  showIn?: DrawerMode[];
  type?: 'spacer';
  closeDrawer?: boolean;
  openMode?: DrawerMode;
  action?: string;  // custom action key
}
```

---

## 6. Actions Config Schema 초안

```typescript
interface ToolbarConfig {
  search?: {
    placeholder: string;
    field?: string | string[];  // 검색 대상 필드
  };
  
  // 상단 우측 헤더 버튼
  headerActions?: ActionConfig[];
  
  // 툴바 추가 버튼
  toolbarActions?: ActionConfig[];
}

interface ActionConfig {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  icon?: string;     // SVG icon key
  action: string;    // action handler key
  disabled?: boolean | string;  // 조건식 (예: 'selectedCount === 0')
}

// 예시: 요구사항 toolbar config
const requirementsToolbar: ToolbarConfig = {
  search: { placeholder: '요구사항 ID · 요구사항명 · 담당자 검색' },
  headerActions: [
    { id: 'export', label: '내보내기', variant: 'outline', action: 'export' },
    { id: 'register', label: '요구사항 등록', variant: 'primary', action: 'openRegisterDrawer' }
  ],
  toolbarActions: [
    { id: 'delete', label: '삭제', variant: 'danger', action: 'deleteSelected', disabled: 'selectedCount === 0' }
  ]
};
```

---

## 7. Permissions Config Schema 초안

```typescript
interface PermissionsConfig {
  // 역할별 허용 작업
  roles: Record<string, RolePermissions>;
  
  // 기본 권한 (역할 미매칭 시)
  defaults: RolePermissions;
}

interface RolePermissions {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canExport?: boolean;
  canViewAll?: boolean;  // 전체 보기 버튼
}

// 예시
const requirementsPermissions: PermissionsConfig = {
  roles: {
    PM:      { canCreate: true, canEdit: true, canDelete: true, canApprove: true, canExport: true },
    디자이너: { canCreate: false, canEdit: false, canDelete: false, canApprove: false, canExport: true },
    개발자:   { canCreate: false, canEdit: false, canDelete: false, canApprove: false, canExport: true }
  },
  defaults: { canCreate: false, canEdit: false, canDelete: false, canApprove: false, canExport: false }
};
```

---

## 8. Summary Strip Config Schema 초안

```typescript
interface SummaryConfig {
  cells: SummaryCellConfig[];
  meta?: SummaryMetaConfig[];
}

interface SummaryCellConfig {
  key: string;       // 데이터 집계 키 또는 함수
  label: string;     // 셀 레이블 (small uppercase)
  sub?: string;      // 셀 하단 설명 텍스트
  color?: string;    // 숫자 색상 (CSS token)
  dot?: string;      // 레이블 앞 dot 색상
  isDefault?: boolean; // 초기 활성화 상태
}

interface SummaryMetaConfig {
  label: string;
  valueKey: string;  // 데이터 키
  color?: string;    // 값 색상
}

// 예시: 요구사항 summary config
const requirementsSummary: SummaryConfig = {
  cells: [
    { key: 'all', label: '전체', sub: '전체 요구사항', color: 'var(--stam)', dot: 'var(--stam)', isDefault: true },
    { key: 'approved', label: '승인완료', sub: '승인된 요구사항', color: '#047857' },
    { key: 'review', label: '검토중', sub: '검토 요청된 항목', color: '#1D4ED8' },
    { key: 'draft', label: '작성중', sub: '초안 단계', color: '#92400E' },
    { key: 'hold', label: '보류', sub: '보류 상태', color: '#475569' }
  ],
  meta: [
    { label: '높음 우선순위', valueKey: 'highPriorityCount', color: 'var(--stam)' },
    { label: '이번 주 마감', valueKey: 'weeklyDueCount' }
  ]
};
```

---

## 9. WBS에서 Board Engine에 흡수할 장점 TOP 5

### 1. Group Row Collapse 패턴

WBS의 `data-grp` attribute + `wbs-grp-rows` tbody 방식은 Board Engine의 `groupBy` config로 추상화 가능.

```javascript
// WBS 현재
<tbody class="wbs-grp-rows" data-grp="ia">

// Board Engine config
features: {
  groupBy: 'area',           // 데이터 필드
  groupCollapsible: true,
  groupShowCount: true,
  groupShowProgress: true
}
```

### 2. Column Visibility per ViewMode

WBS의 `is-focus-col`, `is-shared-col`, `col-d` 컬럼 가시성 시스템을 `columns[].visibleInModes`로 추상화.

```javascript
{ key: 'reviewer', label: '검토자', visibleInModes: ['focus'] }
{ key: 'period', label: '기간', visibleInModes: ['default', 'focus'] }
```

### 3. Drawer Mode Attribute 패턴

WBS의 `data-mode="detail|edit|create"` 방식은 Board Engine drawer state 관리의 참조 구현.

### 4. Linked Items Renderer

WBS의 `renderLinkedRequirements(row)`, `renderLinkedScreens(row)` 패턴을 `drawer.sections[].fields[].type: 'link'` config로 추상화.

### 5. Progress Bar per Group

WBS의 `initGroupProgress()` — 그룹별 진행률 자동 계산·표시를 `features.groupShowProgress: true` config로 추상화.

---

## 10. 오픈 시나리오 — 공통화 전 개별 구현 재분류 기준

### 오픈 시나리오 현황
- `pages/boards/open-scenario.html` (72,147 bytes)
- `js/stam.open-scenario.js` (9,135 bytes)
- `css/stam.open-scenario.css` (26,852 bytes)

### 재분류 기준

아래 기준을 모두 충족하는 화면을 "Board Factory 재생성 가능" 대상으로 분류:

| 기준 | 판정 방법 |
|------|----------|
| 목록 + 상세 drawer 패턴인가? | 주요 UX flow가 list → drawer인지 확인 |
| 필터 config로 표현 가능한가? | filter options가 고정 목록인지 확인 |
| 컬럼이 고정인가? | 런타임 동적 컬럼 추가 여부 확인 |
| Drawer가 표준 register/detail/edit 3모드인가? | 특수 모달/뷰 없는지 확인 |
| 데이터가 API 또는 정적 mock인가? | 실시간 streaming 등 비표준 방식 여부 확인 |

### 오픈 시나리오 판정

오픈 시나리오가 위 기준을 충족하는지는 별도 분석 필요. 현재는:
- **분류:** 공통화 전 개별 구현 화면
- **처리:** Board Factory v1 완성 후 재생성 대상으로 재분류 검토

### 재생성 불가 기준 (개별 유지)
- 완전 커스텀 레이아웃 (split view, map, 캔버스 등)
- 화면설계서 editor처럼 Board Factory 범위를 벗어나는 기능
- 실시간 협업, WebSocket 등 특수 기능

---

## 11. 병렬 Preview Route 생성 방식

### 원칙
- 기존 route (`/pages/boards/requirements.html`) 건드리지 않음
- 새 Board Factory 기반 route를 `/pages/boards-v2/requirements.html`로 병렬 생성
- 기능 동등 검증 완료 후 기존 route 교체 (별도 PR)

### Preview Route 명명 규칙

```
기존: /stam/pages/boards/requirements.html
신규: /stam/pages/boards-v2/requirements.html

기존: /stam/pages/boards/menu-screen-list.html
신규: /stam/pages/boards-v2/menu-screen-list.html
```

### Preview Route 파일 구조

```
stam/pages/boards-v2/
├── requirements.html          (Board Factory 기반)
├── menu-screen-list.html
├── wbs.html
├── screen-specification.html
└── functional-specification.html

stam/js/
├── stam.board-factory.js      (Board Engine core)
├── stam.board-configs/
│   ├── config.requirements.js
│   ├── config.menu-screen-list.js
│   ├── config.wbs.js
│   ├── config.screen-specification.js
│   └── config.functional-specification.js
└── stam.pagination.js         (Pagination SSOT)
```

---

## 12. 기존 Route 교체 전 검증 방식

### 검증 체크리스트 (각 게시판)

```
[ ] 기본 목록 표시 정상
[ ] 컬럼 너비·정렬 기존과 동일
[ ] 체크박스 선택 / 전체 선택 동작
[ ] 행 클릭 → drawer 열림
[ ] Drawer register 모드 정상
[ ] Drawer detail 모드 정상
[ ] Drawer edit 모드 정상
[ ] Drawer tab 전환 정상
[ ] Drawer footer 버튼 동작
[ ] Filter panel 열기/닫기
[ ] Filter chip 선택 → count badge 업데이트
[ ] Filter reset / apply
[ ] Search 입력 → 행 필터링
[ ] Pagination 페이지 이동
[ ] 삭제 버튼 활성화/비활성화
[ ] Dark mode 전환
[ ] 반응형 레이아웃 (1280px, 1440px, 1920px)
[ ] keyboard navigation (ESC, Tab)
[ ] Summary strip 클릭 → 필터 적용
[ ] Empty state 표시
[ ] Loading state 표시
```

---

## 13. 권장 PR 순서

| PR | 내용 | 사전 조건 | 위험도 |
|----|------|----------|--------|
| **PR A** | `stam.drawer.css`에 `.stam-drawer-foot .stam-btn` 크기 규칙 추가 | 없음 | 낮음 |
| **PR B** | Drawer Footer SSOT — 3개 게시판 CSS/HTML 클래스 통일 | PR A | 낮음 |
| **PR C** | Filter footer 문구 통일 ("전체 해제" → "초기화") | 없음 | 최소 |
| **PR D** | `stam.pagination.js` 신규 + 3개 게시판 pagination 적용 | 없음 | 낮음 |
| **PR E** | `stam.custom-select.js` 공통화 (JS 3회 복사 제거) | 없음 | 중간 |
| **PR F** | `stam.board-factory.js` 신규 + boards-v2/ preview route (요구사항정의서만) | PR D, PR E | 중간 |
| **PR G** | boards-v2/ 나머지 4개 게시판 추가 | PR F | 중간 |
| **PR H** | 기존 boards/ → boards-v2/ route 교체 (요구사항정의서) | PR F 검증 완료 | 높음 |
| **PR I** | 나머지 4개 게시판 route 교체 | PR G 검증 완료 | 높음 |

---

## 14. 위험도와 대응책

| 위험 항목 | 위험도 | 대응책 |
|-----------|--------|--------|
| WBS 22컬럼 복잡도 | 🔴 높음 | WBS는 마지막에 Board Factory 적용. 먼저 단순 3개 게시판으로 Board Factory 안정화 |
| 화면설계서 Editor/Template 특수 뷰 | 🔴 높음 | List + Drawer만 Board Factory로. Editor/Template은 별도 유지 |
| 기존 route 교체 시 사용자 영향 | 🔴 높음 | 병렬 preview route로 충분한 검증 후 교체. PR H, I는 팀 검토 필수 |
| Custom Select JS 공통화 시 동작 차이 | 🟡 중간 | 각 게시판 drawer에서 실제 테스트 필수. 자동화 테스트 추가 권장 |
| Config Schema 변경 | 🟡 중간 | Board Factory v1은 schema를 고정. v2에서 개선. 하위 호환성 유지 |
| 오픈 시나리오 분류 오류 | 🟡 중간 | Board Factory 적용 전 별도 분석 PR 필요 |
| Empty/Loading state 공통화 | 🟢 낮음 | 현재 미구현이므로 Board Factory에서 새로 도입. 기존 코드 충돌 없음 |
