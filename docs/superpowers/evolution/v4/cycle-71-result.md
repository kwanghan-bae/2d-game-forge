# Cycle 71 — Narrative: Boss Last Words

## 변경 요약
보스 처치 시 패배 대사("유언") 표시. 6개 렐름 보스 × 2개 대사 풀.
showBossVictoryText() 아래 이탤릭체로 fade-in/out.

## 파일
- `src/data/bossLastWords.ts` — 6 boss × 2 last words
- `src/data/bossLastWords.test.ts` — 3 tests
- `src/battle/BattleScene.ts` — import + showBossVictoryText 에 last words 추가

## 검증
- Vitest: 1723 passed
