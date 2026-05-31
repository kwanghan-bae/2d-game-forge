# Cycle 943 Planner — Late-Game Balance Tuning + 6-Cycle Roadmap (C944–C949)

category: balance

> Post-C942 (getCombatSummary structured BuffInfo). C941 late-game events seeded, C942 buff shape exposed.
> This cycle: tune the 501+ density curve, lock invariants, then plan the next extraction arc.

---

## Current Baseline (post-C942)

| Metric | Value |
|--------|-------|
| EncounterEngine LOC | 2786 (target ≤ 2200, Δ −586) |
| Raw `*Remaining` fields | 287 occurrences |
| getCombatSummary shape | `BuffInfo[]` with name/magnitude/remaining ✓ |
| Fight 501+ events | 3 types seeded (C941) ✓ |
| LATE_PITY_THRESHOLD | 15 fights (unchanged from C845) |
| LATE_PITY_BOOST | 1.5× weight multiplier |
| Stat Shard system | Active — permanent ATK reward ✓ |
| Extracted submodules | ~43 files in `encounter/` |

---

## C943 Scope — Late-Game Balance Tuning (this cycle)

### Why Now

C941 introduced 3 event types for 501+; C942 exposed buff magnitudes. The pity system still uses the pre-seeding threshold (15), which was calibrated for fights 200-500. With new events available, the threshold can tighten and weight distribution needs tuning to avoid clumping or drought in the 501-1000 range.

### Deliverables

1. **LATE_PITY_THRESHOLD 조정**: 15 → 10 for fights > 500 (conditional)
2. **Event weight distribution invariant**: `sum(lateWeights) === 1.0`, no single event > 0.5
3. **Rate band invariant test**: `lateGameEventRate(501-1000) ∈ [0.10, 0.25]`
4. **getCombatSummary BuffInfo shape lock** — invariant test confirming C942 shape persists

### Acceptance (Δ-from-baseline)

- `lateGameEventRate (fight 501-1000)`: baseline ~0.12 (C941 3-seed avg, seeds 1024/2048/4096) 대비 Δ within [−0.03, +0.05]
- `LATE_PITY_THRESHOLD (fight > 500)`: baseline 15 (C845) 대비 Δ = −5
- Test growth: +3 invariant tests (rate floor, rate ceiling, weight sum)

---

## 6-Cycle Roadmap (C944–C949)

> Layer rotation: **system → structure → balance** repeating.
> Collab cadence: C946 (mid-arc), C949 (arc-close).

---

### C944 — CombatPhaseRunner Extraction (layer: system)

**Why now**: EncounterEngine 2786 LOC — 586 over target. C943 stabilized late-game balance; combat phase (turn loop, damage dispatch, death check) is the clearest ~500 LOC extraction boundary. No behavioral risk after C941-C943 arc locked invariants.

**Scope**:
- Extract `CombatPhaseRunner` class (~500 LOC) from EncounterEngine
  - Owns: turn loop, damage calc dispatch, death check, victory trigger
  - Delegates to: `HeroTurnCalc`, `EnemyTurnCalc`, `CombatCalculator`
- EncounterEngine calls `combatPhase.run(context)` — pure structural refactor
- Zero behavior change

**Acceptance (Δ-from-baseline)**:
- `EncounterEngine.ts` LOC: baseline 2786 (C942) 대비 Δ ≤ −450
- Sim 50-cycle hash parity: identical output for seed 1024 pre/post

---

### C945 — TickCountdown Value Type (layer: structure)

**Why now**: 287 `*Remaining` occurrences across ~38 distinct fields. C944 reduced EncounterEngine enough to tackle remaining-field normalization without bloating it back up. `TickCountdown` pattern proves itself on the top-12 most-used fields first.

**Scope**:
- Introduce `TickCountdown` value type: `{ total: number; remaining: number; tick(): boolean }`
- Convert top-12 highest-frequency `*Remaining` fields (DurationBuffTracker internals first)
- Target: ~80 raw occurrence reduction

**Acceptance (Δ-from-baseline)**:
- Raw `*Remaining` grep count: baseline 287 (C942) 대비 Δ ≤ −70
- Sim 50-cycle hash parity: identical output for seed 1024

---

### C946 — Arc Verification + Collab (layer: balance · collab)

**Why now**: Collab cadence. Full C941-C945 arc verification: late-game desert fixed, buffs structured, EncounterEngine shrunk, remaining fields reduced. Lock all invariants as regression gates.

**Scope**:
- 3-seed 50-cycle sim verification battery
- Architectural invariant test: `EncounterEngine LOC ≤ 2300` (tighter post-extraction)
- Late-game density invariant: `rate(501-1000) ∈ [0.10, 0.25]`
- `*Remaining` count cap invariant: `≤ 220`
- STATUS milestone document

**Acceptance (Δ-from-baseline)**:
- All C941-C945 acceptance criteria still hold (regression gate)
- `EncounterEngine.ts` LOC ≤ 2300 (invariant-locked)

---

### C947 — EventOrchestrator Split (layer: system)

**Why now**: With CombatPhaseRunner extracted (C944), EventOrchestrator is the next ~400 LOC blob inside EncounterEngine. It handles event scheduling, pity timing, and gate evaluation — all separable concerns.

**Scope**:
- Extract `EventOrchestrator` → standalone module (~400 LOC)
  - Owns: event scheduling loop, pity timer, gate evaluation dispatch
  - Delegates to: `LateGameScheduler`, `EventGateConfig`, `PostCombatEventResolver`
- EncounterEngine LOC target: ≤ 1900

**Acceptance (Δ-from-baseline)**:
- `EncounterEngine.ts` LOC: baseline (C946 actual) 대비 Δ ≤ −350
- Sim 50-cycle hash parity: identical output for seed 1024

---

### C948 — TickCountdown Phase 2 + Buff Duration Audit (layer: structure)

**Why now**: C945 proved TickCountdown on top-12 fields. Phase 2 targets the remaining mid-frequency fields (13-25) and audits buff durations for consistency with the new value type.

**Scope**:
- Convert fields 13-25 to `TickCountdown` (~50 more occurrence reduction)
- Audit all buff durations: assert `total >= remaining` invariant at construction
- Remove deprecated raw-number patterns where TickCountdown replaces them

**Acceptance (Δ-from-baseline)**:
- Raw `*Remaining` grep count: C945 baseline 대비 Δ ≤ −45
- Total `*Remaining` from original 287: cumulative Δ ≤ −115
- Zero new lint warnings from unused raw fields

---

### C949 — Full Arc Close + Collab (layer: balance · collab)

**Why now**: Collab cadence. Close the full C941-C949 mega-arc. EncounterEngine should be ≤ 1900 LOC, Remaining fields ≤ 170, late-game event system stable. Next arc pivots to new content or UI.

**Scope**:
- 3-seed 50-cycle sim full regression battery
- Lock invariants at new tighter caps:
  - EncounterEngine LOC ≤ 1900
  - `*Remaining` count ≤ 175
  - Late-game event rate ∈ [0.10, 0.25]
- STATUS milestone: "EncounterEngine < 2000 LOC arc complete"
- Next-arc planning: pivot recommendation (content/UI/narrative — per 룰 9)

**Acceptance (Δ-from-baseline)**:
- All accumulated invariants hold
- `EncounterEngine.ts` LOC ≤ 1900 (final cap)
- Next-arc category ≠ system/structure (룰 9: 3-cycle same category limit)

---

## Summary Table

| Cycle | Layer | Theme | EE LOC (est.) | *Remaining (est.) | Test Δ |
|-------|-------|-------|--------------|-------------------|--------|
| C943 | balance | Late-game tuning | 2786 (unchanged) | 287 | +3 |
| C944 | system | Combat phase extraction | ~2300 | 287 | +2 |
| C945 | structure | TickCountdown Phase 1 | ~2300 (internal) | ~210 | +4 |
| C946 | balance/collab | Arc verification | ≤2300 | ≤220 | +3 |
| C947 | system | EventOrchestrator split | ~1900 | ~210 | +2 |
| C948 | structure | TickCountdown Phase 2 | ~1900 (internal) | ~170 | +3 |
| C949 | balance/collab | Full arc close | ≤1900 | ≤175 | +3 |

**Total expected test growth (C943-C949)**: +20 tests

---

## Category Rotation Compliance (룰 9)

| Cycle | Category |
|-------|----------|
| C940 | meta (planner) |
| C941 | system |
| C942 | structure |
| **C943** | **balance** ← current |
| C944 | system |
| C945 | structure |
| C946 | balance |
| C947 | system |
| C948 | structure |
| C949 | balance |

3-cycle rotation: system → structure → balance. No 3+ consecutive same-category violation.

---

## Backlog (not this arc)

- Fight 1000+ prestige layer (wait for 501-1000 stability proof at C949)
- Full `*Remaining` elimination Phase 3 (fields 26-38, post-C949)
- EventNarration tone × Season system wire (wait for season UI)
- PvP / multiplayer (컨셉 외, permanent reject)
- getCombatSummary → full observable/reactive pattern (consumer count still 1)
- Stat Shard tier progression (wait for engagement data)

---

## Concept Guard Notes

- **Identity check**: "1 → 수십만 레벨 폭발, 자율 진화하는 idle hero sim" — density tuning ensures the 501-1000 range stays engaging, directly serving the "eternal progression" pillar.
- **YAGNI**: No new reward types or event types this cycle. Pure tuning of existing seeded content.
- **승격 기준**: `TickCountdown` (C945) stays in-game until a second game uses it.
- **Collab rhythm**: C946 and C949 are verification checkpoints. No feature-add on collab cycles.
- **Sim-real parity**: C943 invariants measurable via existing sim driver (LateGameScheduler.isPityActive path confirmed in sim-cycle-v2).
