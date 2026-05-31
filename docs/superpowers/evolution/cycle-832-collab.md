# Cycle 832 Collaboration Record

## Participants
- **Critic**: 4-axis scoring + priority recommendations
- **Level Designer**: Event fight-range map + density/overlap analysis
- **Planner**: C833-C835 cycle proposals with implementation sketches

## Critic Score: 28/40 (+1 from C829)

| Axis | Score | Justification |
|------|-------|---------------|
| 흥행성 | 7 | Gambit policy hook exists but UI surface insufficient for player awareness |
| 재미 | 7 | Merchant heal-vs-ATK adds one decision per ~4.5 triggers, but variance low |
| 몰입성 | 7 | Fight 100-250 dead zone reduced; refactoring neutral to narrative |
| 플레이타임 | 7 | ATK buff creates mini power spike; no follow-up stimulus after expiry |

## Key Findings

### Level Designer
1. **Fight 90-130 over-saturation**: 7+ events activating simultaneously (mentor, trial_grounds, weather-gates, colosseum, wandering_merchant)
2. **Merchant ATK buff undertuned**: ×1.10 for 15 fights EV=1.5×base, below perception threshold (~12-15%)
3. **Echo late + Abyssal collision at fight 250**: Both activate same threshold, pool competition reduces abyssal effective rate ~18%
4. **Fight 1-24 gap**: Only 4 event types, healer absent — early death spike here

### Critic
1. **Gambit policy lacks feedback**: No event/narrative confirms policy is working
2. **Fight 250+ event void**: Merchant ends, only Echo remains until Titan Arena at 300
3. **Merchant choice too obvious**: hp<70%=heal is always optimal, no real decision

## Consensus Plan: C833-C835

### C833 [system]: Run Statistics Accumulator
- New `RunStatistics.ts` tracking fights/deaths/events/gambits/peak stats
- Integration: 6-8 record() calls in EE at existing emit points
- Persist in save state for cross-session visibility
- ~110 LOC, Low risk
- **Critic add**: Include `autoResolved` flag on gambit events for policy feedback

### C834 [structure]: BuffTracker Extraction
- Extract 30+ `*Remaining` fields + tickSimpleDurations + tickCombatBuffs into BuffTracker class
- Net reduction: −100 lines from EE, +150 in new file
- Medium risk (many references to decrement fields in ATK calc)

### C835 [balance]: Fairy Linear Ramp + Merchant Tuning
- Fairy: step function → linear ramp (fight 120-200, 2%→4%)
- Merchant tuning from level-designer:
  - ATK_MUL: 0.10 → 0.15, DURATION: 15 → 12 (EV: 1.5→1.8)
  - MIN_FIGHTS: 100 → 120 (reduce 90-130 saturation)
  - HEAL_RATE: 0.30 → 0.25 (make ATK path more attractive)
- ECHO_LATE_THRESHOLD: 250 → 275 (separate from Abyssal activation)
- ~25 LOC, Low risk

## Carry-over to C836+
- Fight 300-500 new event ("Sealed Dungeon" / "Ancient Arena")
- Merchant 3rd choice (gold burst + debuff) for decision depth
- Mentor cap 149 → 130 (further decongest transition zone)
- Storm/snow VFX indicators (UI layer)
- Merchant dialogue variants (anti-repetition)
