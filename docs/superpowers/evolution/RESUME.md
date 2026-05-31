# RESUME — v7

## 상태
- Cycle: 871
- Target: 600+ (연속 진화)
- Last commit: C871 BUFF_STACK_CAP 1.65 + density ramp 120 + proving win 70%
- Vitest: 2268 pass / 0 fail
- EncounterEngine: ~2500 lines
- Critic score: 20/40 (C871 collab, 플레이어 체감 기준 재보정)

## 레이어 카운터 (C854-C868 era)
- 시스템: 5 (C854, C857, C860, C863, C866)
- 구조: 5 (C855, C858, C861, C864, C867)
- 밸런스: 5 (C856, C859, C862, C865, C868)
- 콜라보: 5 (C856, C859, C862, C865, C868)

## 제약
- cycles_since_collab: 0 (C871 is collab)
- Next collab: C874
- EncounterEngine: ~2500 lines
- Layer rotation: system → structure → balance (C872=system, C873=structure, C874=balance+collab)

## 🔴 Critical: UI Consumer Gap
- 모든 mid-game events (proving/crossroads/storm/merchant) UI 표시 0px
- "시뮬레이터가 아닌 게임"으로 전환 필요
- C872에서 toast pipeline 추가 최우선

## 다음 3사이클 (C871 합의)
- C872 [system]: Mid-game event toast pipeline (EventChoiceToastLogic + OverworldRunner wire)
- C873 [structure]: Extract combat resolution loop OR constants domain split (−200 LOC)
- C874 [balance+collab]: PROVING_GROUNDS_CHANCE 6% + density slope 0.008 + late pool expansion

## 달성 사항 (C854-C868)
- C854 [system]: Crossroads Choice Event
- C855 [structure]: applyPostVictoryExpBonuses extraction
- C856 [balance]: Window overlap fix + gamble identity
- C857 [system]: Composable ATK Buff Stack
- C858 [structure]: Extract computeBuffedHeroAtk
- C859 [balance]: Stacking rebalance
- C860 [system]: Early-game Momentum
- C861 [structure]: Extract computePostVictoryExp
- C862 [balance]: Crossroads rebalance (3%, ×120)
- C863 [system]: Storm drain event emission
- C864 [structure]: Extract resolveGambleOutcome
- C865 [balance]: Gamble real loss (15%) + BUFF_STACK_CAP=2.00 + momentum ATK 6%
- C866 [system]: Proving Grounds mid-game challenge (fight 55-90)
- C867 [structure]: Extract MidGameEventResolver (14 tests)
- C868 [balance]: Crossroads pity 40 + BUFF_STACK_CAP 1.85 + momentum ATK 8%
- C869 [system]: Fix crossroads pity (30) + momentum extend (65) + proving buff (2.00×5)
- C870 [structure]: Wire MidGameEventResolver into EncounterEngine (−49 LOC)
- C871 [balance]: BUFF_STACK_CAP 1.65 + density ramp 120 + proving win 70%

## Backlog
- Storm drain / early momentum UI consumer (VFX/toast/saga)
- Constants phase-tag metadata system
- EXP cap 500→200
- computeBuffedHeroAtk atkCap bypass documentation
- Saga log integration for new events
- C856 [balance+collab]: Window overlap fix (ClearSky 95+, Mercenary 115-145, gamble free/55%)

## 달성 사항 (C848-C850)
- C848 [system]: Mercenary Offer choice event (90-120, 15% gold → 3-fight 30% DR)
- C849 [structure]: buildAtkContext extraction (−88 lines from hot path)
- C850 [balance+collab]: gamble consolation 50→35, pity gate 250→200, dead constant removed

## 달성 사항 (C842-C844)
- C842 [system]: RunStatisticsSummary — top-3 highlight computation (11 categories)
- C843 [structure]: tickTimeLockVault + tickPostCombatGoldBonuses (−51 lines)
- C844 [balance+collab]: Merchant gamble (35%×50/50 double-or-nothing ATK), Sparring 0.04/129, Merchant MIN 125

## 달성 사항 (C839-C841)
- C839 [system]: GambitFeedbackAccumulator (gambitGoldNet/gambitHpCost)
- C840 [structure]: tickWeatherHazards() extraction (Storm/Abyssal/Temporal/GoldCrucible)
- C841 [balance+collab]: Sparring Grounds (80-119, 3%) + Colosseum 0.03 + Echo 0.035

## 달성 사항 (C833-C835)
- C833 [system]: RunStatistics accumulator (per-run metrics tracking, 17 fields)
- C834 [structure]: applyPendingEvents extraction (68-line event chain → method)
- C835 [balance+collab]: Fairy linear ramp (120-200, 2%→4%) + Merchant (ATK 0.15/12, MIN 120, HEAL 0.25) + Echo 275

## 달성 사항 (C830-C832)
- C830 [system]: Risk Gambit Policy Toggle (always/never/hp_above_half)
- C831 [structure]: resolveBossRewards extraction (−49 lines from hot path)
- C832 [balance+collab]: Wandering Merchant (3%, fight 100-250, heal/ATK) + Echo 0.04@250 + T3 cap constant

## 달성 사항 (C824-C829)
- C824 [system]: ChainFlavorToast — chain narrative visible to player
- C825 [structure]: tickTemporalSystems extraction (momentum, golden hour, season, aging)
- C826 [balance+collab]: Risk Gambit (40-90, 5%, HP/gold trade-off) + HEALER 25, collab (26/40)
- C827 [system]: RiskGambitToast — gambit outcome visible (red/blue themed)
- C828 [structure]: tickSacrificeSubsystem extraction (gold burn, combo reset, health tax)
- C829 [balance+collab]: Fairy 0.04 @150+, Momentum T3 cap 2.8

## 달성 사항 (C818-C823)
- C818 [system]: Awakening Hints (fight 1-5) + Mentor buff (0.05, 149)
- C819 [structure]: tickSimpleDurations — batch event duration decrement
- C820 [balance+collab]: time_rift pool exclusion 300+ + momentum 1.2, collab (24/40)
- C821 [system]: Chain Event Flavor — narrative feedback data layer
- C822 [structure]: tickCombatBuffs — extract combat prephase (11 hadXxx)
- C823 [balance+collab]: Fairy/Echo late-game scaling + hints 1-5 fix, collab (24/40)

## 달성 사항 (C807-C817)
- C807 [structure]: WeatherSubsystem extraction (stateful class)
- C808 [balance+collab]: Density ramp phase 2 + Titan narration sync
- C809 [system]: Weighted Event Priority Pool (eliminates first-match-wins bias)
- C810 [structure]: EventTriggerMap — data-driven event dispatch (−13 lines)
- C811 [balance+collab]: Overflow cap 5.0, gate adjustments, collab round (23/40)
- C812 [system]: Wandering Mentor event (fight 25-99, early-game variety)
- C813 [structure]: makeEffectCtx helper (deduplicate effect context creation)
- C814 [balance]: Anti-saturation tuning (density 2.5, momentum 1.3, healer 0.06)
- C815 [system]: Event Chain Links (5 narrative chains, 12-20% prob)
- C816 [structure]: findEffectDuration — data-driven duration lookup
- C817 [balance+collab]: Blacksmith inflation-scaling + momentum tier3 10, collab (24/40)

## 캐리오버 (미완료)
- [ ] Risk Gambit policy toggle (player-set accept condition)
- [ ] Mid-game event 100-250 (new variety beyond fairy uplift)
- [ ] CombatResolver further extraction (EE 2305→~2200 goal)
- [ ] densityMul hard cap 4.0→3.5 (저우선, T3 별도 capped)
- [ ] Storm/snow VFX overlay
- [x] ~~Chain event UI feedback~~ (C824)
- [x] ~~Early-game decision event~~ (C826 Risk Gambit)
- [x] ~~HEALER_MIN 30→25~~ (C826)
- [x] ~~Fairy weight 0.04 @150+~~ (C829)
- [x] ~~Momentum T3 cap 2.8~~ (C829)
- [x] ~~TIME_RIFT pool exclusion~~ (C820)
- [x] ~~Blacksmith inflation-scaling~~ (C817)
- [x] ~~Awakening hints~~ (C818/C823)
- [x] ~~Chain flavor data layer~~ (C821)

## 알려진 기술 부채
- EncounterEngine.ts: ~2305 lines (hot path shrinking via method extraction)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- forge-ui 미사용 (OverworldRunner 100% inline style)
- Smoke test (sim-cycle-v2) intermittent timeout under machine load
