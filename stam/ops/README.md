# STAM Ops — PR Audit Log

운영 기준·PR 검증 기록 파일 모음.

## Files

| File | Purpose |
|------|---------|
| `pr-audit-log.jsonl` | PR별 audit 기록 (JSON Lines — 한 줄 = 한 PR) |
| `pr-audit-log.schema.json` | JSONL 레코드 필드 스키마 |

## Docs

| Document | Path |
|----------|------|
| 공통화 정의 v0.1 | `stam/docs/ops/STAM-Commonization-Definition-v0.1.html` |
| PR Audit Log Guide v0.1 | `stam/docs/ops/STAM-PR-Audit-Log-Guide-v0.1.html` |

## Usage

1. PR merge/close 전후에 `pr-audit-log.jsonl`에 한 줄 추가
2. 필드 구조는 `pr-audit-log.schema.json` 및 Guide 문서 참조
3. UI PR은 `screenshotQa` + `visualPass` 필수
4. 공통화 PR은 2개 이상 화면 실사용 여부를 `notes`에 명시

## Initial records

- PR #250 — `MERGED_NEEDS_CORRECTION` (correctionPr: 252)
- PR #251 — `CLOSED` (correctionPr: 252)
- PR #252 — `MERGED_PASS` (mergeSha: `f636ba11fec690556ed162071ec1471d18928a28`)
