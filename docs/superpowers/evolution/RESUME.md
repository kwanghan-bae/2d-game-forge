# RESUME — v7

## 상태
- Cycle: 862
- Target: 600+ (연속 진화)
- Last commit: C862 crossroads rebalance
- Vitest: 2242 pass / 0 fail
- EncounterEngine: ~2230 lines
- Critic score: 32/40 (C862 collab, +0.5)

## 레이어 카운터 (C854-C862 era)
- 시스템: 3 (C854, C857, C860)
- 구조: 3 (C855, C858, C861)
- 밸런스: 3 (C856, C859, C862)
- 콜라보: 3 (C856, C859, C862)

## 제약
- cycles_since_collab: 0 (C862 is collab)
- Next collab: C865
- EncounterEngine: ~2230 lines
- Layer rotation: system → structure → balance (C863=system, C864=structure, C865=balance+collab)

## 다음 3사이클 (C862 합의)
- C863 [system]: Storm drain event emit (시각 피드백, storm_drain/storm_drain_critical)
- C864 [structure]: resolveGambleOutcome 순수함수 추출 (gambler+merchant gamble 통합)
- C865 [balance+collab]: Gamble real loss (gold 15%) + BUFF_STACK_CAP=2.00 + EARLY_MOMENTUM_ATK_MUL 0.03→0.06

## 달성 사항 (C854-C862)
- C854 [system]: Crossroads Choice Event — once-per-run 3-path (ATK/EXP/Gold, 95-130)
- C855 [structure]: applyPostVictoryExpBonuses extraction (−50 lines)
- C856 [balance]: Window overlap fix + gamble identity
- C857 [system]: Composable ATK Buff Stack — multiplicative (storm×clearSky×crossroads)
- C858 [structure]: Extract computeBuffedHeroAtk + 8-case unit test
- C859 [balance]: Stacking rebalance (storm 1.35, clearSky 1.12, crossroads 0.18)
- C860 [system]: Early-game Momentum — fight 1-50 combo milestone rewards
- C861 [structure]: Extract computePostVictoryExp — 14-line EXP chain → pure fn + 8 tests
- C862 [balance]: Crossroads rebalance — chance 5%→3%, gold burst ×50→×120

## Backlog
- Early momentum narrative feedback (UI layer)
- Crossroads chance 0.04 + pity system
- EXP cap 500→200
- computeBuffedHeroAtk atkCap 외부 적용 문서화
- Fight 51-94 void zone (mid-game hook)
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
