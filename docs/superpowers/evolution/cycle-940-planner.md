# Cycle 940 Planner — 6-Cycle Roadmap (C941–C946)

category: meta

> Planned after C939 (PermanentRewardTracker + Enemy Morph). Rotation: system → structure → balance.
> Collab cadence: every 3 cycles → next collab at **C943**, then **C946**.

---

## Current Baseline (post-C939)

| Metric | Value |
|--------|-------|
| EncounterEngine LOC | 2749 (target ≤ 2200, Δ −549) |
| Raw `*Remaining` fields | 279 occurrences / ~38 distinct fields |
| getCombatSummary shape | `{ activeBuffs: string[]; ... }` — no magnitude/remaining |
| Fight 501+ events | **NONE** — choice desert confirmed |
| Extracted submodules | 42 files in `encounter/` |
| Test files (encounter) | 4 (structure, unit, personality, integration) |

---

## Roadmap

### C941 — Late-Game Event Seeding (layer: system)

**Why now**: Fight 501+ choice desert is the #1 critic pain point (3+ cycle mentions → priority 1 per 3-rule). LateGameScheduler already exists but only boosts density for fights 200+; nothing generates *new* event types beyond 500.

**Scope**:
- Add `LateGameEventCatalog` — 3–5 post-500 event templates (ascension trial, echo memory, shard fusion choice)
- Wire into `EventOrchestrator` with gate: `totalFights >= 501`
- LateGameScheduler pity threshold extension: pity window 15 → 10 for fights > 500

**Expected test growth**: +4 unit tests (catalog shape, gate threshold, pity behavior, integration smoke)

**Acceptance (Δ-from-baseline)**:
- `lateGameEventRate (fight 501-600)`: baseline 0.0 (C939 seed 1024) 대비 Δ ≥ 0.12
- Measured across ≥ 3 seeds (1024, 2048, 4096) averaged

---

### C942 — getCombatSummary Structured Buffs (layer: structure)

**Why now**: Critic pain point #2 — buff names as raw strings block UI tooltip, analytics, and debug tooling. DurationBuffTracker (C930-C933) already normalized 40 fields internally; getCombatSummary is the last string[] bottleneck.

**Scope**:
- Change `activeBuffs: string[]` → `activeBuffs: BuffInfo[]` where `BuffInfo = { name: string; magnitude: number; remaining: number }`
- Populate from DurationBuffTracker's internal state (no new computation, just shape change)
- Deprecation alias: keep `.activeBuffNames` as `string[]` for 1 cycle

**Expected test growth**: +3 tests (shape invariant, magnitude correctness, remaining countdown)

**Acceptance (Δ-from-baseline)**:
- `getCombatSummary().activeBuffs[0]` has keys `name`, `magnitude`, `remaining` — type-level assertion
- No runtime regression: sim 50-cycle duration baseline ±2% (3-seed avg)

---

### C943 — Collab: Late-Game Balance Tuning (layer: balance · collab)

**Why now**: C941 introduces new events; C942 exposes magnitude. C943 tunes the late-game density curve using the newly visible data. Collab cadence lands here.

**Scope**:
- Sim-driven tuning of `LATE_PITY_THRESHOLD` and event weight distribution for fights 501-1000
- Add invariant: `lateGameEventRate(501-1000) ∈ [0.10, 0.25]` — prevents both desert and spam
- getCombatSummary structured buff invariant tests (lock C942 shape)

**Expected test growth**: +3 invariant tests (rate floor, rate ceiling, weight sum = 1.0)

**Acceptance (Δ-from-baseline)**:
- `lateGameEventRate (fight 501-1000)`: C941 baseline 대비 Δ within [−0.03, +0.05] (stability proof)
- Measured across ≥ 3 seeds (1024, 2048, 4096)

---

### C944 — EncounterEngine Extract: Combat Phase (layer: system)

**Why now**: EncounterEngine at 2749 LOC is 549 over target. Module extraction is critic priority #3, and now that C941-C943 stabilized late-game + buff shape, the combat phase (lines ~800-1400) is a clean extraction boundary.

**Scope**:
- Extract `CombatPhaseRunner` class (~500 LOC) from EncounterEngine
  - Owns: turn loop, damage calc dispatch, death check, victory trigger
  - Delegates to existing `HeroTurnCalc`, `EnemyTurnCalc`, `CombatCalculator`
- EncounterEngine calls `combatPhase.run(context)` instead of inline logic
- Zero behavior change — pure refactor

**Expected test growth**: +2 tests (CombatPhaseRunner unit, EncounterEngine integration parity)

**Acceptance (Δ-from-baseline)**:
- `EncounterEngine.ts` LOC: baseline 2749 (C939) 대비 Δ ≤ −450
- Sim 50-cycle hash parity: identical output for seed 1024 pre/post extraction

---

### C945 — Remaining Field Consolidation Phase 1 (layer: structure)

**Why now**: 279 `*Remaining` occurrences across 38 fields at different tick cadences is the #1 structural debt. C944's extraction reduced EncounterEngine enough to tackle remaining-field normalization without LOC bloat.

**Scope**:
- Introduce `TickCountdown` value type: `{ total: number; remaining: number; tick(): boolean }`
- Convert top-12 highest-frequency `*Remaining` fields to `TickCountdown` (targeting ~80 occurrence reduction)
- DurationBuffTracker internal fields first (already abstracted in C930-C933)

**Expected test growth**: +4 tests (TickCountdown unit, conversion parity × 3 field groups)

**Acceptance (Δ-from-baseline)**:
- Raw `*Remaining` grep count: baseline 279 (C939) 대비 Δ ≤ −70
- Sim 50-cycle hash parity: identical output for seed 1024

---

### C946 — Collab: Extraction + Desert Verification (layer: balance · collab)

**Why now**: Collab cadence. Verify the full C941-C945 arc: late-game desert is fixed, buffs are structured, EncounterEngine is ≤ 2200 LOC, remaining fields reduced. Lock invariants.

**Scope**:
- Sim verification battery: 3-seed 50-cycle full run, assert all Δ-from-baseline criteria hold
- Add architectural invariant test: `EncounterEngine LOC ≤ 2200`
- Add late-game event density invariant: `rate(501-1000) ∈ [0.10, 0.25]`
- STATUS milestone document

**Expected test growth**: +3 invariant tests (LOC cap, event rate range, remaining field count cap)

**Acceptance (Δ-from-baseline)**:
- All C941-C945 acceptance criteria still hold (regression gate)
- `EncounterEngine.ts` LOC ≤ 2200 (absolute cap, invariant-locked post-arc)

---

## Summary Table

| Cycle | Layer | Theme | EncounterEngine LOC (est.) | Test Δ |
|-------|-------|-------|---------------------------|--------|
| C941 | system | Late-game event seeding | 2749 (unchanged) | +4 |
| C942 | structure | Structured buff info | 2749 (+10 shape change) | +3 |
| C943 | balance/collab | Late-game tuning | ~2760 | +3 |
| C944 | system | Combat phase extraction | ~2250 | +2 |
| C945 | structure | Remaining field consolidation | ~2250 (internal) | +4 |
| C946 | balance/collab | Arc verification | ≤2200 | +3 |

**Total expected test growth**: +19 tests across 6 cycles

---

## Backlog (not this arc)

- Fight 1000+ prestige layer (wait for 501-1000 to settle)
- PvP / multiplayer (컨셉 외, reject)
- Full `*Remaining` elimination (Phase 2 after C945 proves TickCountdown pattern)
- EventNarration tone integration with Season system (wait for season UI completion)
- getCombatSummary → full observable pattern (wait for consumer count ≥ 2)

---

## Concept Guard Notes

- **Identity check**: "1 → 수십만 레벨 폭발, 자율 진화하는 idle hero sim" — late-game event seeding directly serves the "eternal progression" pillar by ensuring content exists at high fight counts.
- **YAGNI**: No new reward types introduced until C941 events prove engagement lift.
- **Collab rhythm**: C943 and C946 serve as verification/tuning checkpoints, not feature-add cycles.
- **승격 기준**: `TickCountdown` stays in-game until a second consumer (e.g., weather system in another game) appears.
