# Cycle 853 Collab — Planner Output (C854–C856)

category: balance (C853 current) → system / structure / balance (C854-856)

## Summary

C853 delivers high-gold death penalty ramp + mercenary/gamble tuning.
Below: planned next 3 cycles.

---

## C854 [system] — Crossroads Choice Event (level 80-130)

**Title:** Crossroads Choice Event  
**Description:** A non-weather-gated event that fires in the 80-130 level range (the "agency desert"). When hero reaches a qualifying level milestone AND has visited ≥3 areas, a Crossroads event triggers offering 3 mutually exclusive paths: (A) EXP burst at HP cost, (B) gold cache with temporary ATK debuff, (C) permanent minor stat buff. Fires at most once per run. Addresses the core 80-130 engagement gap without depending on weather RNG (~8% fire rate each).  
**Target files:**
- `games/inflation-rpg/src/overworld/encounter/EventTriggerMap.ts` (new trigger)
- `games/inflation-rpg/src/overworld/encounter/EventChoiceEngine.ts` (choice resolution)
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` (integration, ~15 lines)

---

## C855 [structure] — Extract DurationBuffManager

**Title:** DurationBuffManager extraction  
**Description:** EncounterEngine currently has 15+ `*Remaining` counter fields (colosseumRemaining, trialGroundsRemaining, stormNexusRemaining, clearSkyPathRemaining, etc.) plus `tickSimpleDurations()` at line 2205. Extract all duration-tracked buff state into a dedicated `DurationBuffManager` class in `encounter/DurationBuffManager.ts`. The manager exposes `tick()`, `isActive(buffId)`, `activate(buffId, duration)`, `getRemaining(buffId)`. EncounterEngine delegates instead of owning 15 fields directly. Target: reduce EncounterEngine by ~120-150 lines and eliminate the growing field list.  
**Target files:**
- `games/inflation-rpg/src/overworld/encounter/DurationBuffManager.ts` (new file)
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` (replace fields + tickSimpleDurations)
- `games/inflation-rpg/src/overworld/__tests__/DurationBuffManager.test.ts` (new unit tests)

---

## C856 [balance] — Late-game Event Overlap Window Tuning

**Title:** Late-game event overlap cooldown + EXP multiplier caps  
**Description:** Critic feedback notes late-game events overlap windows, creating unintended multiplicative EXP spikes when Astral Paradox (×2.5) + Soul Forge stacks (+40%) + Colosseum (×2) can co-fire. Tune: (1) Add mutual exclusion cooldown — after any Tier-3 event (Astral Paradox, Titan Arena, Crimson Tithe) ends, 8-tick cooldown before another Tier-3 can trigger. (2) Cap combined EXP multiplier at ×4.5 (currently unbounded). (3) Reduce Soul Forge max stacks from 5→4 (max +32% instead of +40%). Pure number changes, no new mechanics.  
**Target files:**
- `games/inflation-rpg/src/overworld/encounter/constants-events.ts` (cooldown + cap constants)
- `games/inflation-rpg/src/overworld/encounter/LateGameScheduler.ts` (mutual exclusion logic)
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` (cap enforcement, ~5 lines)

---

## Rationale

| Cycle | Gap Addressed | Critic Signal |
|-------|--------------|---------------|
| C854 | 80-130 agency desert (3+ cycles flagged) | "mid-game feels autopilot" |
| C855 | EncounterEngine ~2443 lines, field bloat | structural debt, readability |
| C856 | Late-game EXP spike overlap | "late game trivializes via stacking" |

## Risks

- C854: Must not overlap with existing Clear Sky Path (normal weather only). Gate explicitly to level 80-130 AND non-weather-event-active.
- C855: Pure refactor — zero behavior change. All 2224 tests must pass unchanged.
- C856: Cap at ×4.5 needs sim validation to confirm it doesn't nerf intended late-game progression rate by >10%.
