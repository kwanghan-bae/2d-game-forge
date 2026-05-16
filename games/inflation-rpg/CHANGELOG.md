## Phase V1a — Open World Vertical Slice Skeleton (2026-05-16)

- Legacy manual flow + Sim-A/B text-log views deleted (T1)
- `src/overworld/`: Phaser overworld scene + A* pathfinding + hero auto-movement
- `src/hero/`: HeroEntity + PersonalityState (5-dim) + lifecycle + spawner
- `src/decisionAI/`: HeroDecisionAI + DestinationResolver (trait+personality-weighted)
- `src/saga/`: SagaRecorder + NarrativeGenerator + SagaStorage
- `src/data/`: 5 zones + 11 landmark types
- New screens: CyclePrepV2 / OverworldRunner / CycleResultV2
- Persist v16 → v17 (`MetaState.sagaHistory: CycleSaga[]`)
- 4 Tier 1 events: 전투 / 레벨업 / 장비 drop / 죽음
- Sim-A/B `AutoBattleController` preserved as Sim-G balance simulator
- Trait selection / 가호 / 직업 / 스킬 / 사당 / 도덕 분기 → V1b
- 792 vitest / 6 e2e

## Phase Sim-B — Trait Foundation (2026-05-16)

- `src/cycle/loadoutTypes.ts` — `ControllerLoadout` extracted to break circular dep (traits ↔ controller)
- `src/cycle/traits.ts` — `Trait` / `TraitModifiers` / `ResolvedLoadout` types + `applyTraitMods` resolver
- `src/data/traits.ts` — `TRAIT_CATALOG` 16 entries (spec §16), `BASE_TRAIT_IDS`
- `src/cycle/HeroDecisionAI.ts` — stub (interface frozen, Sim-C wires bodies)
- `AutoBattleController` accepts `traits?: TraitId[]`, applies HP/ATK/EXP/gold/BP mods
- `CycleEvent.cycle_start` adds `traitIds: TraitId[]` (Sim-A T1 handoff fulfilled)
- `CyclePrep` screen + `TraitSelector` component (N=3 slots)
- MainMenu → CyclePrep → CycleRunner → CycleResult flow
- Persist v15 → v16 (`MetaState.traitsUnlocked: TraitId[]`)
- `scripts/sim-cycle.ts` CLI `--traits id1,id2` flag (Step 10.2 — added)
- `cycle-prep-traits.spec.ts` Playwright e2e + Sim-A spec updated
- **Fixup (T10):** `cycle/loadoutTypes.ts` introduced to break `traits.ts → AutoBattleController.ts` circular dep (madge reported 3 cycles; 0 after fix)
- 816 vitest / 66 e2e

## Phase Sim-A — Vertical Slice + Headless Sim (2026-05-16)

- `AutoBattleController` (pure TS, Phaser 독립) + `CycleEvent` stream
- `cycleSlice` zustand store + persist v14 → v15 migration (`MetaState.cycleHistory`)
- `CycleRunner` + `CycleResult` React screens (rAF-driven view)
- `scripts/sim-cycle.ts` CLI — N cycle headless sim → JSONL + summary.json
- MainMenu "사이클 시작 (NEW)" entry, existing manual flow untouched
- 4 vitest suites + 1 Playwright e2e
