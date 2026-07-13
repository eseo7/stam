# STAM WBS-3 — Picker Hooks & Member Source Contract

## 1. 목적

WBS-4 Atomic Product Wiring 전에 다음 계약을 제품 화면 밖에서 준비한다.

- configurable reference picker core
- functional spec read-only picker (기능정의)
- project active member read SSOT
- owner / reviewer member picker
- `wbs.html` stable `id` / `data-*` hooks
- owner / reviewer 기본값 정책 확정

이번 PR은 **준비 단계**이며 WBS 화면 런타임 동작·Firestore I/O·Firebase script 로드는 포함하지 않는다.

## 2. base commit

```text
3bebd94d1ce219f8e31e8b7ccd6b0d546feff093
```

## 3. 변경 파일 (10)

| # | 파일 | 변경 |
|---|------|------|
| 1 | `stam/pages/boards/wbs.html` | hook-only (`id` / `data-*`) |
| 2 | `stam/js/stam.reference-picker.js` | 신규 |
| 3 | `stam/js/stam.functional-spec-picker.js` | 신규 |
| 4 | `stam/js/stam.project-member-read-service.js` | 신규 |
| 5 | `stam/js/stam.project-member-picker.js` | 신규 |
| 6 | `scripts/test-reference-picker-contract.mjs` | 신규 |
| 7 | `scripts/test-functional-spec-picker-contract.mjs` | 신규 |
| 8 | `scripts/test-project-member-picker-contract.mjs` | 신규 |
| 9 | `scripts/test-wbs-picker-hooks-contract.mjs` | 신규 |
| 10 | `docs/reports/STAM_WBS3_Picker_Hooks_Member_Source_Contract.md` | 신규 |

## 4. WBS-3 hook-only boundary

- `wbs.html` diff는 `id`, `data-*` attribute 추가만 수행
- visible text / class / tag 구조 / script 목록 / 버튼 disabled / 정적 17행 유지
- 신규 WBS-3 JS 모듈은 제품 HTML에 로드하지 않음
- contract test에서만 신규 모듈 로드

## 5. Reference picker core

Namespace: `window.STAM.referencePicker`

```javascript
STAM.referencePicker.create(config) → {
  mount, load, getValue, setValue, clear,
  setDisabled, refreshContext, close, destroy
}
```

- artifact별 service/key 문자열 미포함
- `mount()` 시에만 DOM/listener 구성
- load Promise dedupe, context refresh 시 stale response ignore
- **`cfg.normalizeItem()`은 load 시 정확히 1회만 호출** — `state.items`에 정규화 완료 item 저장, `renderOptions()`는 재-normalize 금지
- stale success·stale failure 모두 현재 context에 반영하지 않음 (destroyed / loadVersion mismatch → `return []`, reject 전파 없음)
- label/meta/attribute HTML escape (`& < > " '`)
- 기존 `.stam-cs-*` 클래스만 사용

## 6. Requirement picker reuse decision

- `stam/js/stam.requirement-picker.js` **미수정**
- 복사/변형 신규 파일 생성 없음
- WBS-4에서 기존 requirement picker 재사용

## 7. FunctionalSpec picker contract

Namespace: `window.STAM.functionalSpecPicker`

- `READ_SOURCE = 'functionalSpecService.listByProject'`
- `STAM.referencePicker.create()` 사용
- `functionalSpecServiceContract` → `listByProject(projectId, { includeDeleted: false })`
- direct Firestore query 없음
- 3-key contract:
  - linked: `{ functionalSpecId, functionalSpecCode, functionalSpecTitle }`
  - unlinked: 3-key empty string
  - partial key → error
- `FN_[0-9]{3,}` code regex
- read roles: owner/admin/editor/viewer

## 8. Project member read source

Path: `projects/{projectId}/members` + `status == "active"`

Namespace:

- `window.STAM.projectMemberReadService` (default deny-by-default runtime)
- `window.STAM.projectMemberReadServiceContract`

Adapter API: `{ listActiveByProject }` only (read-only)

## 9. Owner default policy

`resolveDefaultOwner(members, authUser)`:

1. **`authUser.uid`만** 사용 (`userId` / email / displayName fallback 금지)
2. `authUser.uid`와 `member.memberUid` exact match
3. active normalized member에만 적용
4. match 시 해당 member 반환
5. 불일치 시 `null` (첫 member fallback 금지)

## 10. Reviewer default policy

- 기본값 항상 연결 없음
- `{ reviewerId: '', reviewerName: '' }`
- owner 자동 복사 / 첫 member / 고정 샘플 / `null` 저장 금지

## 11. Member snapshot mapping

```javascript
toOwnerSnapshot(member)   → { ownerId, ownerName }
toReviewerSnapshot(null)  → { reviewerId: '', reviewerName: '' }
toReviewerSnapshot(member)→ { reviewerId, reviewerName }
```

role/email은 WBS snapshot에 포함하지 않음.

## 12. Stable HTML hook inventory

- root: `data-stam-wbs-root`
- KPI: `data-stam-wbs-kpi-strip`, `data-wbs-kpi=*`
- list: `#wbs-tbl-inner`, `data-stam-wbs-list-host`, `#wbs-static-table`, `data-stam-wbs-static-list`
- actions: `#wbs-import-btn`, `#wbs-export-btn`, `#wbs-reg-btn`
- drawer: `data-stam-wbs-detail-host`, `data-stam-wbs-form=edit|create`
- fields: `data-wbs-field=*`, `data-stam-wbs-basic-fields-host`, `data-stam-wbs-progress-field-host`
- member: `data-stam-wbs-member-picker` (**owner/reviewer mode SSOT**), `data-stam-wbs-member-mode` (**create/edit form mode only**)
- links: `data-stam-wbs-link-slot`, `data-stam-wbs-link-trigger`
- footer: `#wbs-edit-save-btn`, `#wbs-edit-temp-save-btn`, `#wbs-create-save-btn`, `#wbs-create-temp-save-btn`
- excluded: `data-stam-wbs-excluded-section=comments|history`, `data-stam-wbs-excluded-control=meeting`

## 13. Deferred prefill contract (WBS-4)

```javascript
await functionalSpecPicker.load(container);
functionalSpecPicker.setValue(container, currentSnapshot);
```

picker 내부 `setTimeout` prefill 금지.

## 14. Security / escape contract

reference picker core는 label/meta/data-attribute를 escape helper로 처리.
`<script>`, executable `<img onerror=...>` 패턴은 innerHTML에 그대로 삽입되지 않음.

## 15. Product runtime non-activation evidence

| 항목 | 결과 |
|------|------|
| WBS 화면 실제 동작 변경 | 0 |
| Firestore read/write (product) | 0 |
| Firebase/Auth script 추가 | 0 |
| 신규 모듈 제품 HTML load | 0 |
| existing requirement picker 수정 | 0 |
| CSS 변경 | 0 |
| Rules 변경 | 0 |
| Local DB 제거 | 0 |
| 정적 17행 제거 | 0 |
| WBS-4 전 picker 사용자 노출 | 0 |

유지 문구: `검토중`, `관련 화면설계`, `+ 화면설계 연결`

## 16. 테스트 결과

```text
reference picker contract: PASS
functional spec picker contract: PASS
project member picker contract: PASS
wbs picker hooks contract: PASS
requirement picker contract: PASS
wbs service contract: PASS
wbs counter contract: PASS
wbs role matrix contract: PASS
wbs rules contract: PASS
functional spec service contract: PASS
functional spec role matrix contract: PASS
functional spec counter contract: PASS
```

## 17. Governance

- STAM Agent Governance 준수
- 신규 CSS/JS 파일: 허용 목록 4개 JS만 (공통 CSS 미변경)
- `wbs.html` inline style/script 없음
- 금지 경로 (`firestore.rules`, `stam/css/**`, `stam.requirement-picker.js` 등) 미변경

## 18. WBS-4 loading order (예상)

```text
Firebase SDK
→ Firebase init
→ Auth/bootstrap
→ project context
→ UI messages/feedback
→ requirements service/adapter
→ functionalSpec service/adapter
→ WBS service/adapter
→ reference picker
→ requirement picker
→ functionalSpec picker
→ project member read service
→ project member picker
→ WBS list/crud atomic wiring
```

## 19. 후속 WBS-4 / WBS-5

- WBS-4: 위 script 로드 + picker mount + list/crud atomic wiring + 문구/정적 데이터 일괄 정합화
- WBS-5: 후속 QA / hardening (별도 스펙)

## 20. PR #392 보정 (Member Picker render & hook contract)

### Reference picker normalize-once

- `load`: `rawItems.map(cfg.normalizeItem).filter(Boolean)` — item당 1회
- `renderOptions`: 정규화된 `state.items`를 그대로 사용 (재-normalize 없음)
- contract test: load 후 open 시 `normalizeItem` 호출 횟수 증가 없음

### Member picker actual rendered-option evidence

- DOM contract test: `mountOwner` / `mountReviewer` → `load` → open → option 검사
- active member 3건 렌더 (Alice×2, Bob), pending/invalid 미표시
- duplicate-name meta: `admin · dup@x.com`
- owner: `연결 없음` 없음 / reviewer: `연결 없음` 있음
- `service members.length > 0 && rendered options == 0` → FAIL 가드

### WBS hook mode source

`modeOf(container)` 우선순위:

1. `options.mode`
2. `data-stam-project-member-mode`
3. `data-stam-wbs-member-picker`
4. default `owner`

`data-stam-wbs-member-mode`는 create/edit 구분이며 owner/reviewer 판별에 사용하지 않음.

### Stale async ignore (success + failure)

- version mismatch 또는 destroyed container: success·failure 모두 `[]` (unhandled rejection 없음)
- 현재 context load 실패만 `loadError` + Promise reject

### FunctionalSpec DOM regression

- FN_001, FN_010 option 표시 / BAD·deleted·empty title 제외 / code ASC / 3-key set-get-clear / partial reject / load 후 prefill
