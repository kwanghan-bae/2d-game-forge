## Phase Sim-A — Vertical Slice + Headless Sim (2026-05-16)

- `AutoBattleController` (pure TS, Phaser 독립) + `CycleEvent` stream
- `cycleSlice` zustand store + persist v14 → v15 migration (`MetaState.cycleHistory`)
- `CycleRunner` + `CycleResult` React screens (rAF-driven view)
- `scripts/sim-cycle.ts` CLI — N cycle headless sim → JSONL + summary.json
- MainMenu "사이클 시작 (NEW)" entry, existing manual flow untouched
- 4 vitest suites + 1 Playwright e2e
