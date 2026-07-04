# STAM PR #323 — Beta Seed Data & Access Matrix Baseline

## 목표

1차 베타 테스트 전 **계정 / 프로젝트 / 멤버십 / 역할 / 상태 / 기대 라우팅** 기준을 문서화한다. Firestore seed script·제품 코드·rules 변경 없음.

## 변경 요약

| 항목 | 내용 |
|------|------|
| SSOT | `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` |
| Access matrix | P1–P9 페르소나 + login/Overview routing |
| Firestore schema | users / projects / members 필드·enum |
| Google 계정 준비 | Console 수동 seed 절차 |
| Beta QA checklist | Auth, Overview, Live boards, responsive |

## 수정 파일

- `docs/beta/STAM_Beta_Seed_Data_Access_Matrix_v1.md` (신규)
- `docs/reports/STAM_PR323_Beta_Seed_Data_Access_Matrix.md` (신규)
- `scripts/test-beta-seed-data-doc-contract.mjs` (신규)

## 미변경 (의도적)

- `stam/js/**`, `stam/css/**`, `stam/pages/**`
- `firebase.json`, `.firebaserc`, `firestore.rules`
- GitHub Actions, Auth/membership/guard 로직
- seed script / Firestore write 로직

## STAM 거버넌스 보고

| 항목 | 결과 |
|------|------|
| 새 CSS/JS | **0건** |
| inline style/script | **없음** |
| 제품 화면 HTML 변경 | **없음** |
| 금지 경로 변경 | **없음** |

## 검증

```bash
node scripts/test-beta-seed-data-doc-contract.mjs
node scripts/test-auth-entry-flow-contract.mjs
node scripts/test-project-overview-context-copy-contract.mjs
node scripts/test-project-context-guard-contract.mjs
```
