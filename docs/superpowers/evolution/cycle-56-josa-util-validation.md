# Cycle 56 — Josa Util Validation (cycle 4 A2 follow-up)

## 한 줄
Cycle 4 의 josa util 의 누적 사용 검증. 23 calls in narrationVariants + NarrativeGenerator.

## Coverage
- `obj()` wrapper (을/를): battle/drop/skillLearned 등
- `josa(x, '이가')`: jobUnlock / battle survivor
- `josa(x, '으로로')`: jobUnlock 거듭났다
- `josa(x, '과와')`: NpcInteraction (cycle 4 A2)
- `josa(x, '은는')`: future

## Validation
- 17 unit test (cycle 4)
- 6 NPC interaction unit test (cycle 4)
- 1233 vitest baseline 회귀 0
