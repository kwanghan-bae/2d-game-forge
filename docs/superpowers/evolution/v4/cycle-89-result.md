# Cycle 89 — Balance: Quest Reward Scaling Verification

## 변경 요약
28개 퀘스트 보상 밸런스 검증 테스트 4개.
- 모든 퀘스트 골드 > 0
- early/mid/late 난이도 티어 분포 확인
- BP 보상 1~10 범위
- 장비 보상 ID 패턴 검증 (w-/a-/acc-)

## 파일
- `src/data/questBalance.test.ts` — 4 tests

## 검증
- Vitest: 1779 passed
