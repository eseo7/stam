# Board Factory v1.2 — Migration Gates

> docs-only · 게이트/판정 기준 문서 · 구현 PR 아님
> 근거: `Board-Factory-v1.2-A-Class-Inventory.md`, `Board-Factory-v1.2-Architecture.md`
> 선행: PR #134 merge 기준

---

## 1. A/B/C 판정 기준

| 클래스 | 진입 조건 | 결과 |
| --- | --- | --- |
| **A 유지** | list-first 표준 골격 + 아래 Stop-Criteria 무충돌 + custom slot ≤ 3 + non-built-in cell renderer 미과다 | Factory config로 v2 구축 |
| **B 격상** | Stop-Criteria 1개 이상 충돌하나 추가 slot으로 표현 가능(tree, custom cell 다수, view mode 등) | Factory + 확장 slot |
| **C 제외** | list-first 부적합(split editor/canvas/Gantt/timeline/state machine) | Special App 유지, Factory 미적용 |

실사 판정 결과(inventory §12):

| 화면 | 판정 |
| --- | --- |
| 기능정의서 | A 유지 |
| 메뉴구조/화면목록 | A 유지 |
| 요구사항정의서 | A 유지 (조건부: review/acceptance/approval built-in 흡수) |

---

## 2. Stop Criteria

아래 중 하나라도 발생하면 A 유지가 아니라 **B/C 재분류 후보**로 기록한다.

| Stop 기준 | 3개 A-class 충돌 여부 |
| --- | --- |
| slot 과다(>3) | 없음 |
| custom cell 과다(>3 또는 컬럼 50% 초과) | 없음 (custom cell 0) |
| drawer 예외 과다 | 없음 |
| relation/user 해석 불명확 | ⚠️ 기능정의서 연결화면 label / user 이름만 (선결 과제, A 유지 범위) |
| config 복잡도 과다 | 없음 |
| data contract 불일치 | ⚠️ 저장 미구현 → 신규 adapter layer (동결 원칙) |
| reference contract 불일치 | ⚠️ 연결화면 label (매핑 과제) |
| 동적 컬럼 | 없음 |
| split editor/canvas | 없음 |
| Gantt/timeline | 없음 |
| localStorage UI state 의존 | 없음 |
| 복수 view mode | 없음 |
| 비표준 저장 플로우 | 저장 미구현(동결) |
| custom state machine | 없음 (승인상태는 단순 enum) |
| 메뉴구조 expand/collapse tree 필수 | **없음 — LV는 flat column** (inventory §11-1) |
| 요구사항 review/approval/acceptance built-in 흡수 불가 | ⚠️ built-in 등재 전제 (미등재 시 B) |

→ **치명적 Stop 없음.** ⚠️ 항목은 PR #136 선결 과제로, 모두 A 유지 범위 내에서 해소.

---

## 3. Slot Governance

- slot은 field 개수가 아니라 **extension surface 기준**으로 센다.
- 허용 slot: `cellRenderer`, `detailSection`, `drawerFieldRenderer`
- 보류 slot: `toolbarExtra`, `beforeTable`, `rowExpansion`
- 제한/금지: `customFooter`는 금지에 가깝게 제한 (drawer footer는 SSOT 공통 유지)

격상 규칙:
- 한 화면에서 slot 3개 초과 → B/C 재분류
- non-built-in custom cellRenderer가 3개 초과 또는 전체 컬럼 50% 초과 → B 격상
- custom drawer field renderer 2개 초과 → B 격상

실사 적용 결과:

| 화면 | custom cell | custom drawerField | slot 합 | 판정 |
| --- | --- | --- | --- | --- |
| 기능정의서 | 0 | 0 (relation built-in) | 0 | A |
| 메뉴구조 | 0 | ≤1 (relation picker) | ≤1 | A |
| 요구사항 | 0 | ≤1 (relation picker) | ≤3 (review/acceptance/approval detailSection) | A (built-in 등재 시) |

---

## 4. PR #136 착수 Gate

| Gate 항목 | 상태 |
| --- | --- |
| 기능정의서 / 메뉴구조·화면목록 / 요구사항정의서 실사표 완료 | ✅ (본 inventory) |
| 각 화면 A/B/C 판정 완료 | ✅ (전부 A 유지) |
| relation/user 저장값과 resolver 계약 확정 | ✅ 계약 정의 + 매핑 과제 등재 |
| vocab 정규화 방침 확정 | ✅ (§6) |
| custom renderer/slot 수 Gate 통과 | ✅ (custom cell 0) |
| 기능정의서 v2 preview acceptance checklist 확정 | ✅ (§5) |
| 기존 boards 유지 원칙 확인 | ✅ (§7) |
| boards-v2 생성 범위 확정 | ✅ 본 PR 미생성, PR #136 기능정의서 v2 preview만 |

→ PR #136 착수 가능(기능정의서 v2 preview를 별도 route에서).

---

## 5. 기능정의서 v2 acceptance checklist

PR #136 기능정의서 v2 preview가 충족해야 하는 기준:

- [ ] 기존 기능정의서의 주요 컬럼 유지 (ID/기능명·연결요구사항·연결화면·기능유형·우선순위·상태·담당자·최종수정일)
- [ ] 검색/필터 구조 유지 (status·기능유형·우선순위·연결화면·담당자) — 단 검색 대상은 지정 필드(ID/이름/담당자)로 한정 (기존 row 전체 검색 교정)
- [ ] 등록/상세/수정 drawer 정보 유지 (기본정보·연결정보·기능내용 3섹션)
- [ ] 연결 화면은 **id 기반 reference**로 설계 (기존 label 저장값 → id 매핑)
- [ ] 담당자는 **userId 기반 reference**로 설계 (기존 이름 문자열 → userId 매핑)
- [ ] drawer footer는 기존 SSOT(`stam-drawer-foot`) 기준 준수
- [ ] custom select는 기존 공통 모듈(`stam.custom-select.js`) 기준 준수
- [ ] button token은 PR #134 기준 준수 (`stam-btn` variant 토큰)
- [ ] 제품 저장/API/localStorage/Firestore 변경 없음
- [ ] 기존 기능정의서 route 유지
- [ ] v2는 별도 route에서만 preview
- [ ] detail drawer는 `dataSource.get(id)`로 hydration (기존 정적 단일 인스턴스 → row 바인딩)
- [ ] summary strip은 `dataSource.summary(query)` 기반

---

## 6. WBS Special App 제외 근거

- WBS는 산출물 추적 ID(`WBS-*`)로 요구사항/화면과 연결되나(inventory §7), WBS 자체 화면은 Gantt/타임라인·그룹화·프레젠테이션 모드 등 list-first를 넘는 view를 요구하는 정황(기존 docs: `STAM-WBS-Presentation-Mode-*`, `STAM-WBS-Group-By-Owner-Stage-*`).
- 복수 view mode / timeline은 Stop-Criteria 충돌 → **C(Special App)로 분리**. Factory config 강제 미적용.
- 단, WBS를 reference target(`wbs`)으로는 사용 (요구사항 연결 WBS).

---

## 7. 화면설계서 Special App 제외 근거

- 화면설계서는 캔버스/레이아웃 편집(split editor·canvas) 성격 → list-first 부적합.
- Stop-Criteria(split editor/canvas) 충돌 → **C(Special App)로 분리**.
- 단, screenSpec를 reference target(`screenSpec`)으로 사용 (메뉴구조·요구사항 연결 화면설계서).

> 비고: 두 Special App의 실제 코드 실사는 본 PR 범위(A-class 3종) 밖이며, 위 근거는 기존 docs 정황 기반. 정식 C 판정은 별도 실사 PR에서 확정.

---

## 8. 동결 / 금지 원칙 (이번 단계)

| 항목 | 원칙 |
| --- | --- |
| 기존 boards 즉시 삭제 | **금지** (`stam/pages/boards/**` 기준본 유지) |
| 링크 전환 | **별도 PR** (메뉴 링크 변경 금지) |
| 저장 / API | **동결** |
| localStorage | **동결** |
| Firestore / Firebase | **동결** |
| GitHub Actions / `firebase.json` | **변경 금지** |
| boards-v2 생성 | 본 PR **미생성**, PR #136부터 |
| 제품 HTML/CSS/JS | 본 PR **변경 금지** (docs-only) |

---

## 9. 게이트 통과 요약

| 게이트 | 결과 |
| --- | --- |
| A-class 실사표 | 완료 |
| A/B/C 판정 | 기능정의서 A / 메뉴구조 A / 요구사항 A(조건부) |
| Stop-Criteria 치명 충돌 | 없음 |
| Slot Governance 통과 | 통과 (custom cell 0) |
| vocab 정규화 방침 | 확정 (priority.normal 보통/중간) |
| reference 계약 | 확정 + 매핑 과제 등재 |
| PR #136 착수 Gate | 통과 (기능정의서 v2 preview) |

→ **Ready for review 가능** (docs-only, 구현 금지 준수).
