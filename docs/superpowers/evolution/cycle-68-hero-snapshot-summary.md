# Cycle 68 — Hero Snapshot Summary (cycle 6+20 follow-up)

## 한 줄
HeroSnapshot serialize/restore + saveHeroSnapshot trigger (cycle 6 P0) + staggered field (cycle 20) 가 3-fold idle 보장.

## Fields persisted
- name, emoji, age, chapter, job, level, exp, hp, hpMax, atk, atkBase, hpBase, actionCount, rejuvenationCount, gridX, gridY, equipment, personality, unlockedJobId, unlockedMilestones, learnedSkillIds, staggered (optional, cycle 20), seed

## Trigger
- OverworldRunner `arrived_at` handler: 매 landmark 도착 시 save (cycle 6 P0)
- MainMenu selector: runActive flag 기반 "이어하기" 분기

## Validation
- Cycle 6 Playwright: LV 70k+ reload 정상 복귀
- Cycle 20: staggered round-trip + legacy default (3 unit test)
