# STAM PR #318 — Requirements Empty State Center Alignment & Visual Polish

## 목표

요구사항정의서 목록이 0건일 때 테이블 본문에 표시되는 empty state를 중앙 정렬된 아이콘·제목·설명 패턴으로 개선하고, Firestore 등 내부 구현 용어를 사용자 UI에서 제거한다.

## 변경 요약

| 영역 | 내용 |
|------|------|
| Empty state | `clipboard-check` 아이콘 + 제목 + 설명, 테이블 셀 내 가로·세로 중앙 |
| 문구 | 제목 `등록된 요구사항이 없습니다`, 설명은 등록/가져오기 안내 |
| Loading / Error | 동일한 중앙 정렬 레이아웃, 사용자 친화 문구만 표시 |
| 모바일 | `max-width: 768px`에서 패딩·최소 높이·설명 줄바꿈 조정 |

## 수정 파일

- `stam/js/stam.requirements-firestore-list.js`
- `stam/css/stam.requirements.css`
- `scripts/test-requirements-empty-state-contract.mjs` (신규)
- `docs/reports/STAM_PR318_Requirements_Empty_State_Polish.md` (본 문서)

## 사용 클래스

- `.rq-empty-row`, `.rq-empty-row--empty`, `.rq-empty-row--loading`, `.rq-empty-row--error`
- `.rq-empty-state`, `.rq-empty-state--status`
- `.rq-empty-state-icon`, `.rq-empty-state-title`, `.rq-empty-state-desc`
- `renderStamIcon('clipboard-check')` / `hydrateStamIcons` (기존 `stam.icons.js`)

## 검증

```bash
node scripts/test-requirements-empty-state-contract.mjs
node scripts/test-requirements-firestore-list-contract.mjs
node scripts/test-requirements-service-contract.mjs
node scripts/test-requirements-no-inline-style.mjs
```

## 비범위

- Firestore read/write 로직, `requirements.html`, service/adapter 변경 없음
- `#314` read-only 계약 유지 (create/update/softDelete 미호출)
