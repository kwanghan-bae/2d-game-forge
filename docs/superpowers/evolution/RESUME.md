# RESUME — v7

## 상태
- Cycle: 712
- Target: 600+ (연속 진화)
- Last commit: C712 HealBreakdownBadge
- Vitest: 2063 pass / 0 fail
- E2E: 60 passed
- EncounterEngine: ~1810 lines

## 레이어 카운터 (C705-C712 era)
- 시스템: 1 (C710 PostCombatHealCalc)
- 구조: 1 (C711 DropResolver)
- UI/UX: 2 (C707 ExpBadge+Toast wire, C712 HealBreakdownBadge)
- 밸런스: 1 (C708 gambler+altar)
- 콜라보: 2 (C705, C709)

## 제약
- cycles_since_collab: 3 (C710, C711, C712 since C709)
- Next collab: C713 (NOW IN PROGRESS — agents launched)
- EncounterEngine: ~1810 lines
- Layer lock: collab (current)

## 다음 3사이클 (C713 협의에서 확정 예정)
1. [collab] C713: critic + planner + level-designer
2. C714 [balance]: TBD
3. C715 [system]: TBD

## 달성 사항 (C705-C712)
- C705 [collab]: critic(6/5/4/5) + planner + level-designer
- C706 [balance]: NPC tuning (C705 feedback)
- C707 [UI/UX]: ExpBreakdownBadge + EventChoiceToast wired to OverworldRunner
- C708 [balance]: BET_HIGH 100% gold loss + altar duration 30
- C709 [collab]: BET_HIGH→80% floor, altar 30→20, toast label split consensus
- C710 [system]: PostCombatHealCalc pure module + balance hotfix
- C711 [structure]: DropResolver pure module extraction
- C712 [UI/UX]: HealBreakdownBadge (재생/흡혈/과살/생존 pill badges)

## 캐리오버 (미완료)
- [x] EXP breakdown badge wire into OverworldRunner — DONE C707
- [x] EventChoiceToast wire into OverworldRunner — DONE C707
- [x] PostCombatHealCalc extraction — DONE C710
- [x] DropResolver extraction — DONE C711
- [x] HealBreakdownBadge — DONE C712
- [ ] WeatherSystem expMul 실사용 (현재 compute만 하고 미반영)
- [ ] BattleOutcomeBadge + StatDelta gold display
- [ ] Event pity timer (guarantee event within N encounters)
- [ ] BET_HIGH additional reward to offset risk
- [ ] In-combat heal system (mid-fight)
- [ ] FeedbackDispatcher (crit sound/haptic) — backlog

## 알려진 기술 부채
- EncounterEngine.ts: 16KB 단일 import line (barrel 경유)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- forge-ui 미사용 (OverworldRunner 100% inline style)
