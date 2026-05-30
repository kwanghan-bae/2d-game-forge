# RESUME — v7

## 상태
- Cycle: 716
- Target: 600+ (연속 진화)
- Last commit: C716 HealBreakdownBadge conditional
- Vitest: 2067 pass / 0 fail
- E2E: 60 passed
- EncounterEngine: ~1815 lines

## 레이어 카운터 (C705-C716 era)
- 시스템: 1 (C710 PostCombatHealCalc)
- 구조: 1 (C711 DropResolver)
- UI/UX: 3 (C707 ExpBadge+Toast wire, C712 HealBreakdownBadge, C716 conditional+dominant)
- 밸런스: 3 (C708 gambler+altar, C714 BET_HIGH rework+pity, C715 heal rebalance)
- 콜라보: 3 (C705, C709, C713)

## 제약
- cycles_since_collab: 3 (C714, C715, C716 since C713)
- Next collab: C717 (NOW)
- EncounterEngine: ~1815 lines
- Layer lock: collab (current)

## 다음 3사이클 (C713 협의에서 확정 예정)
1. [collab] C717: critic + planner + level-designer
2. C718 TBD
3. C719 TBD

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

## 캐리오버 (미완료)
- [x] EXP breakdown badge wire into OverworldRunner — DONE C707
- [x] EventChoiceToast wire into OverworldRunner — DONE C707
- [x] PostCombatHealCalc extraction — DONE C710
- [x] DropResolver extraction — DONE C711
- [x] HealBreakdownBadge — DONE C712
- [x] Event pity timer — DONE C714
- [x] BET_HIGH additional reward — DONE C714 (3x rework)
- [ ] WeatherSystem expMul 실사용 (현재 compute만 하고 미반영)
- [ ] BattleOutcomeBadge + StatDelta gold display
- [ ] RelicEffectResolver extraction
- [ ] In-combat heal system (mid-fight)
- [ ] FeedbackDispatcher (crit sound/haptic) — backlog

## 알려진 기술 부채
- EncounterEngine.ts: 16KB 단일 import line (barrel 경유)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- forge-ui 미사용 (OverworldRunner 100% inline style)
