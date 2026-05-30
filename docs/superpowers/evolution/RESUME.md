# RESUME — v7

## 상태
- Cycle: 720
- Target: 600+ (연속 진화)
- Last commit: C720 drop diminish per 100 levels
- Vitest: 2082 pass / 0 fail
- E2E: 60 passed
- EncounterEngine: ~1830 lines

## 레이어 카운터 (C705-C720 era)
- 시스템: 2 (C710 PostCombatHealCalc, C718 pity-trap fix + heal floor)
- 구조: 2 (C711 DropResolver, C719 HeroTurnCalc)
- UI/UX: 3 (C707 ExpBadge+Toast wire, C712 HealBreakdownBadge, C716 conditional+dominant)
- 밸런스: 4 (C708 gambler+altar, C714 BET_HIGH rework+pity, C715 heal rebalance, C720 drop diminish)
- 콜라보: 4 (C705, C709, C713, C717)

## 제약
- cycles_since_collab: 3 (C718, C719, C720 since C717)
- Next collab: C721 (NOW)
- EncounterEngine: ~1830 lines
- Layer lock: collab (current)

## 다음 3사이클 (C721 협의에서 확정 예정)
1. [collab] C721: critic + planner + level-designer
2. C722 TBD
3. C723 TBD

## 달성 사항 (C705-C716)
- C705 [collab]: critic(6/5/4/5) + planner + level-designer
- C706 [balance]: NPC tuning (C705 feedback)
- C707 [UI/UX]: ExpBreakdownBadge + EventChoiceToast wired to OverworldRunner
- C708 [balance]: BET_HIGH 100% gold loss + altar duration 30
- C709 [collab]: BET_HIGH→80% floor, altar 30→20, toast label split consensus
- C710 [system]: PostCombatHealCalc pure module + balance hotfix
- C711 [structure]: DropResolver pure module extraction
- C712 [UI/UX]: HealBreakdownBadge (재생/흡혈/과살/생존 pill badges)
- C713 [collab]: BET_HIGH 3x rework + pity timer + heal rebalance consensus
- C714 [balance]: BET_HIGH 3x/0.40/0.60 + EVENT_PITY_THRESHOLD=20
- C715 [balance]: Heal rebalance (regen +50% early, -40% late ceiling)
- C716 [UI/UX]: HealBreakdownBadge conditional (5% threshold) + dominant highlight
- C717 [collab]: pity-trap 버그 전원 발견, heal floor 3 합의, AI BET_HIGH backlog
- C718 [system]: pity-trap 수정 (trap은 pity 제외) + heal flat floor 1→3
- C719 [structure]: HeroTurnCalc 순수 함수 추출 (crit 판정 + ATK 연산, 10 테스트)
- C720 [balance]: Drop diminish -3%/100lv (cap -25%), 고레벨 gear inflation 억제

## 캐리오버 (미완료)
- [x] EXP breakdown badge wire into OverworldRunner — DONE C707
- [x] EventChoiceToast wire into OverworldRunner — DONE C707
- [x] PostCombatHealCalc extraction — DONE C710
- [x] DropResolver extraction — DONE C711
- [x] HealBreakdownBadge — DONE C712
- [x] Event pity timer — DONE C714
- [x] BET_HIGH additional reward — DONE C714 (3x rework)
- [x] Pity-trap 버그 — DONE C718
- [x] Heal flat floor — DONE C718
- [x] HeroTurnCalc extraction — DONE C719
- [x] Drop diminish — DONE C720
- [ ] WeatherSystem 추가 효과 (rain=dodge+, storm=crit-, snow=slow)
- [ ] BattleOutcomeBadge + StatDelta gold display
- [ ] RelicEffectResolver extraction
- [ ] AI BET_HIGH 조건부 로직
- [ ] Constants phase profile 분류 (740개)
- [ ] CombatLoop enemy turn 추출
- [ ] FeedbackDispatcher (crit sound/haptic) — backlog

## 알려진 기술 부채
- EncounterEngine.ts: 16KB 단일 import line (barrel 경유)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- forge-ui 미사용 (OverworldRunner 100% inline style)
