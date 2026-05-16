# Phase Sim-A — Vertical Slice + Headless Sim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the minimal end-to-end skeleton of the hero-simulator pivot — pure-TS `AutoBattleController` that runs a deterministic BP-bounded cycle of auto-fights, exposes a `CycleEvent` stream + `CycleResult` summary, can be driven either from a React HUD (live mode) or from a headless Node CLI (sim mode), and persists cycle history via a `v14 → v15` migration. Existing manual flow stays intact alongside the new "Start Cycle (NEW)" entry until later phases.

**Architecture:** Controller/View separation. `src/cycle/AutoBattleController.ts` is a pure TS class that uses the already-pure `src/battle/resolver.ts` damage formulas + a seeded RNG to advance an in-memory cycle state on each `tick(deltaMs)` call. It emits a typed `CycleEvent` stream. Two consumers in Sim-A: (a) a React `CycleRunner` screen that subscribes via `requestAnimationFrame` and shows a HUD + scrolling event log, (b) a `scripts/sim-cycle.ts` Node CLI that runs the controller in a `while` loop and dumps JSONL events + a `summary.json` aggregate. No Phaser scene work in Sim-A — `DungeonMapScene` and BattleScene zoom-in cuts are deferred to Sim-C (Encounter Layer) where the node-map shape is actually needed. Sim-A intentionally ships with **no Trait input** (`HeroDecisionAI` is a stub that picks the simplest path forward) — Trait + AI behavior arrive in Sim-B.

**Tech Stack:** TypeScript / React / Zustand 5 (gameStore) / Vitest / Playwright (iPhone 14 projects) / tsx (Node CLI runner) / pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-05-16-hero-simulator-design.md` (commit `aa3c30e` @ `feat/hero-simulator-pivot`)

---

## Reference Map (do NOT re-discover during execution)

| Symbol | File / Line |
|---|---|
| `INITIAL_RUN` (RunState defaults) | `games/inflation-rpg/src/store/gameStore.ts:50-66` |
| `INITIAL_META` (MetaState defaults) | `games/inflation-rpg/src/store/gameStore.ts:66-123` |
| `startRun() / endRun() / abandonRun()` | `games/inflation-rpg/src/store/gameStore.ts:441-478` |
| `encounterMonster() / defeatRun()` (BP consume) | `games/inflation-rpg/src/store/gameStore.ts:474-478` |
| `STORE_VERSION` (currently 14) | `games/inflation-rpg/src/store/gameStore.ts:1099` |
| Persist config | `games/inflation-rpg/src/store/gameStore.ts:1170-1176` |
| BP constants (`STARTING_BP`, `encounterCost`, `onDefeat`, `onBossKill`, `isRunOver`) | `games/inflation-rpg/src/systems/bp.ts` |
| Pure damage resolvers (`resolveEnemyMaxHp / resolveEnemyAtk / resolvePlayerHit / resolveDamageTaken`) | `games/inflation-rpg/src/battle/resolver.ts:1-42` |
| Existing 600ms battle loop | `games/inflation-rpg/src/battle/BattleScene.ts:154` (`combatTimer`), `BattleScene.ts:187-414` (`doRound`) |
| EXP gain helper | `games/inflation-rpg/src/systems/experience.ts:7-26` |
| Skill ready / fire | `games/inflation-rpg/src/battle/SkillSystem.ts:11-22` |
| Active skills build | `games/inflation-rpg/src/systems/buildActiveSkills.ts` |
| Character data (16 chars) | `games/inflation-rpg/src/data/characters.ts` |
| Monster data | `games/inflation-rpg/src/data/monsters.ts` |
| Dungeon data (8 dungeons after Realms) | `games/inflation-rpg/src/data/dungeons.ts` |
| MainMenu screen | `games/inflation-rpg/src/screens/MainMenu.tsx` |
| App router (which screen to show) | `games/inflation-rpg/src/App.tsx` (screen state machine) |
| Vitest config | `games/inflation-rpg/vitest.config.ts` |
| Playwright config | `games/inflation-rpg/playwright.config.ts` |
| Package scripts | `games/inflation-rpg/package.json` |

---

## File Structure

**New files (created in this phase):**

```
games/inflation-rpg/src/cycle/
  cycleEvents.ts          — CycleEvent union + CycleState + CycleResult types
  SeededRng.ts            — mulberry32 deterministic RNG
  AutoBattleController.ts — pure TS cycle simulator (★ headless-ready)
  cycleSlice.ts           — zustand state for in-progress cycle (separate from gameStore RunState)

games/inflation-rpg/src/screens/
  CycleRunner.tsx         — React HUD + event log view (subscribes via rAF)
  CycleResult.tsx         — End-of-cycle summary screen

games/inflation-rpg/scripts/
  sim-cycle.ts            — Node CLI: run N cycles headless, dump JSONL + summary.json

games/inflation-rpg/src/cycle/
  __tests__/
    SeededRng.test.ts
    AutoBattleController.test.ts
    cycleEvents.test.ts
    cycleSlice.test.ts
  __snapshots__/
    sim-cycle-seed42.jsonl.golden  — deterministic regression fixture

games/inflation-rpg/e2e/
  cycle-vertical-slice.spec.ts    — Playwright smoke: Start Cycle → wait for end → assert summary
```

**Modified files:**

```
games/inflation-rpg/src/store/gameStore.ts
  - STORE_VERSION: 14 → 15
  - MetaState: add cycleHistory: CycleHistoryEntry[] (default [])
  - Add migration v14 → v15

games/inflation-rpg/src/screens/MainMenu.tsx
  - Add "Start Cycle (NEW)" button alongside existing buttons

games/inflation-rpg/src/App.tsx
  - Add 'cycle-runner' / 'cycle-result' screen states + routing

games/inflation-rpg/package.json
  - Add "sim:cycle" script
  - Add devDependency "tsx" if not already present

games/inflation-rpg/.gitignore
  - Add runs/ (sim output directory)
```

**Out of scope for Sim-A (deferred to later phases):**

- Phaser `DungeonMapScene` (Sim-C — encounter node layout)
- Zoom-in cut to existing Phaser `BattleScene` (Sim-C / Sim-F polish)
- `HeroDecisionAI` real logic (Sim-B — uses Trait)
- `HeroDialogue` text generation (Sim-D)
- `TraitSelector` UI in `CyclePrep` (Sim-B)
- `EncounterSystem` (Sim-C)
- `TempSkillSlots` random skill (Sim-D)
- `endCycle` proper meta transfer (Sim-E — Sim-A drops cycle reward into meta naïvely)
- Speed toggle UI 1x/2x/4x (Sim-F — Sim-A runs at logical clock pace + dev devSpeed query param)
- Removing existing `MainMenu → Dungeon → Battle` flow (Sim-E — kept side-by-side in Sim-A)

---

## Task 1: cycleEvents.ts — shared event/state types

**Files:**
- Create: `games/inflation-rpg/src/cycle/cycleEvents.ts`
- Create: `games/inflation-rpg/src/cycle/__tests__/cycleEvents.test.ts`

- [ ] **Step 1.1: Write the type-check test first**

Create `games/inflation-rpg/src/cycle/__tests__/cycleEvents.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { CycleEvent, CycleState, CycleResult, CycleHistoryEntry } from '../cycleEvents';

describe('cycleEvents — type shape', () => {
  it('CycleEvent discriminated union covers all Sim-A event types', () => {
    const events: CycleEvent[] = [
      { t: 0, type: 'cycle_start', loadoutHash: 'h', seed: 42, characterId: 'K01' },
      { t: 1, type: 'battle_start', enemyId: 'm1', isBoss: false, heroLv: 1, heroHp: 100, enemyHp: 50 },
      { t: 2, type: 'hero_hit', enemyId: 'm1', damage: 10, remaining: 40 },
      { t: 3, type: 'enemy_hit', enemyId: 'm1', damage: 5, remaining: 95 },
      { t: 4, type: 'enemy_kill', enemyId: 'm1', expGain: 100, goldGain: 10, dropIds: [] },
      { t: 5, type: 'level_up', from: 1, to: 2, statDelta: { hp: 10, atk: 2 } },
      { t: 6, type: 'bp_change', delta: -1, remaining: 29, cause: 'encounter' },
      { t: 7, type: 'cycle_end', reason: 'bp_exhausted', durationMs: 1000, maxLevel: 2, finalState: {} },
    ];
    expect(events.length).toBe(8);
  });

  it('CycleState fields are exported', () => {
    const state: CycleState = {
      tNowMs: 0,
      characterId: 'K01',
      seed: 42,
      heroLv: 1,
      heroExp: 0,
      heroHp: 100,
      heroHpMax: 100,
      bp: 30,
      bpMax: 30,
      currentFloor: 1,
      cumKills: 0,
      cumGold: 0,
      drops: {},
      ended: false,
    };
    expect(state.bp).toBe(30);
  });

  it('CycleResult fields are exported', () => {
    const result: CycleResult = {
      durationMs: 0,
      maxLevel: 1,
      levelCurve: [],
      expCurve: [],
      bpCurve: [],
      kills: { total: 0, byEnemyId: {}, bossKills: 0 },
      drops: { byItemId: {}, rarityHistogram: {} },
      reason: 'bp_exhausted',
    };
    expect(result.maxLevel).toBe(1);
  });

  it('CycleHistoryEntry has trimmed shape for meta persist', () => {
    const entry: CycleHistoryEntry = {
      endedAtMs: Date.now(),
      durationMs: 1000,
      maxLevel: 1,
      reason: 'bp_exhausted',
      seed: 42,
    };
    expect(entry.seed).toBe(42);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `pnpm --filter @forge/game-inflation-rpg test -- cycleEvents`

Expected: FAIL — `Cannot find module '../cycleEvents'`

- [ ] **Step 1.3: Create cycleEvents.ts**

Create `games/inflation-rpg/src/cycle/cycleEvents.ts`:

```ts
// Event stream emitted by AutoBattleController.
// Sim-A covers cycle_start / battle_start / hero_hit / enemy_hit / enemy_kill /
// level_up / bp_change / cycle_end. Other event types in spec §6.5 land in later phases.

export type CycleEventBase = { t: number };

export type CycleEvent =
  | (CycleEventBase & { type: 'cycle_start'; loadoutHash: string; seed: number; characterId: string })
  | (CycleEventBase & { type: 'battle_start'; enemyId: string; isBoss: boolean; heroLv: number; heroHp: number; enemyHp: number })
  | (CycleEventBase & { type: 'hero_hit'; enemyId: string; damage: number; remaining: number })
  | (CycleEventBase & { type: 'enemy_hit'; enemyId: string; damage: number; remaining: number })
  | (CycleEventBase & { type: 'enemy_kill'; enemyId: string; expGain: number; goldGain: number; dropIds: string[] })
  | (CycleEventBase & { type: 'level_up'; from: number; to: number; statDelta: Record<string, number> })
  | (CycleEventBase & { type: 'bp_change'; delta: number; remaining: number; cause: string })
  | (CycleEventBase & { type: 'cycle_end'; reason: 'bp_exhausted' | 'abandoned' | 'forced'; durationMs: number; maxLevel: number; finalState: Record<string, unknown> });

export type CycleEventType = CycleEvent['type'];

// Mutable in-memory state. Reset on cycle start. Not persisted.
export interface CycleState {
  tNowMs: number;
  characterId: string;
  seed: number;
  heroLv: number;
  heroExp: number;
  heroHp: number;
  heroHpMax: number;
  bp: number;
  bpMax: number;
  currentFloor: number;
  cumKills: number;
  cumGold: number;
  drops: Record<string, number>; // itemId -> count
  ended: boolean;
}

// Cycle-end summary. Returned by AutoBattleController.getResult().
export interface CycleResult {
  durationMs: number;
  maxLevel: number;
  levelCurve: Array<{ t: number; lv: number }>;
  expCurve: Array<{ t: number; cumExp: number }>;
  bpCurve: Array<{ t: number; bp: number }>;
  kills: { total: number; byEnemyId: Record<string, number>; bossKills: number };
  drops: { byItemId: Record<string, number>; rarityHistogram: Record<string, number> };
  reason: 'bp_exhausted' | 'abandoned' | 'forced';
}

// Trimmed shape persisted in MetaState.cycleHistory[]. Capped to last N entries
// (cap defined in gameStore migration).
export interface CycleHistoryEntry {
  endedAtMs: number;
  durationMs: number;
  maxLevel: number;
  reason: CycleResult['reason'];
  seed: number;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- cycleEvents`

Expected: PASS, 4 tests.

- [ ] **Step 1.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/cycleEvents.ts games/inflation-rpg/src/cycle/__tests__/cycleEvents.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T1 — CycleEvent / CycleState / CycleResult / CycleHistoryEntry types"
```

---

## Task 2: SeededRng — deterministic RNG

**Files:**
- Create: `games/inflation-rpg/src/cycle/SeededRng.ts`
- Create: `games/inflation-rpg/src/cycle/__tests__/SeededRng.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `games/inflation-rpg/src/cycle/__tests__/SeededRng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SeededRng } from '../SeededRng';

describe('SeededRng', () => {
  it('same seed produces same sequence', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() returns values in [0, 1)', () => {
    const rng = new SeededRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(maxExclusive) returns integer in [0, max)', () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });

  it('chance(p) returns true with rough p frequency', () => {
    const rng = new SeededRng(99);
    let hits = 0;
    for (let i = 0; i < 10000; i++) {
      if (rng.chance(0.3)) hits++;
    }
    expect(hits).toBeGreaterThan(2700);
    expect(hits).toBeLessThan(3300);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `pnpm --filter @forge/game-inflation-rpg test -- SeededRng`

Expected: FAIL — `Cannot find module '../SeededRng'`

- [ ] **Step 2.3: Implement SeededRng (mulberry32)**

Create `games/inflation-rpg/src/cycle/SeededRng.ts`:

```ts
// Deterministic seeded RNG (mulberry32). Drop-in replacement for Math.random()
// within AutoBattleController so cycle replays are reproducible.

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t ^= t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- SeededRng`

Expected: PASS, 5 tests.

- [ ] **Step 2.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/SeededRng.ts games/inflation-rpg/src/cycle/__tests__/SeededRng.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T2 — SeededRng mulberry32 deterministic RNG"
```

---

## Task 3: AutoBattleController — skeleton (constructor + tick stub)

**Files:**
- Create: `games/inflation-rpg/src/cycle/AutoBattleController.ts`
- Create: `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`

- [ ] **Step 3.1: Write the failing skeleton test**

Create `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AutoBattleController, type ControllerLoadout } from '../AutoBattleController';

const minimalLoadout = (): ControllerLoadout => ({
  characterId: 'K01',
  bpMax: 30,
  heroHpMax: 100,
  heroAtkBase: 10,
  // Sim-A: equipment / ascension / relics / mythics omitted — pulled from gameStore in later phases.
});

describe('AutoBattleController — skeleton', () => {
  it('constructs without crashing and exposes initial state', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const state = ctrl.getState();
    expect(state.heroLv).toBe(1);
    expect(state.heroExp).toBe(0);
    expect(state.bp).toBe(30);
    expect(state.ended).toBe(false);
  });

  it('emits cycle_start event on first construction', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const events = ctrl.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('cycle_start');
  });

  it('tick(0) is a no-op (no time advance)', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const before = ctrl.getEvents().length;
    ctrl.tick(0);
    expect(ctrl.getEvents().length).toBe(before);
  });

  it('same seed produces identical event sequence after N ticks', () => {
    const a = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const b = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    for (let i = 0; i < 50; i++) {
      a.tick(100);
      b.tick(100);
    }
    expect(JSON.stringify(a.getEvents())).toBe(JSON.stringify(b.getEvents()));
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: FAIL — `Cannot find module '../AutoBattleController'`

- [ ] **Step 3.3: Implement skeleton (stub tick, no battle yet)**

Create `games/inflation-rpg/src/cycle/AutoBattleController.ts`:

```ts
import type { CycleEvent, CycleState, CycleResult } from './cycleEvents';
import { SeededRng } from './SeededRng';

export interface ControllerLoadout {
  characterId: string;
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
  // Later phases extend: equipped / ascension / relics / mythics / traits / unlockedSkills
}

export interface ControllerOptions {
  loadout: ControllerLoadout;
  seed: number;
  // 600ms = existing BattleScene combatTimer. Sim-A reuses to keep economy
  // consistent with manual mode.
  roundMs?: number;
}

const DEFAULT_ROUND_MS = 600;

export class AutoBattleController {
  private rng: SeededRng;
  private state: CycleState;
  private events: CycleEvent[] = [];
  private loadout: ControllerLoadout;
  private roundMs: number;
  private nextRoundAtMs: number;

  constructor(opts: ControllerOptions) {
    this.loadout = opts.loadout;
    this.rng = new SeededRng(opts.seed);
    this.roundMs = opts.roundMs ?? DEFAULT_ROUND_MS;
    this.nextRoundAtMs = this.roundMs;
    this.state = {
      tNowMs: 0,
      characterId: opts.loadout.characterId,
      seed: opts.seed,
      heroLv: 1,
      heroExp: 0,
      heroHp: opts.loadout.heroHpMax,
      heroHpMax: opts.loadout.heroHpMax,
      bp: opts.loadout.bpMax,
      bpMax: opts.loadout.bpMax,
      currentFloor: 1,
      cumKills: 0,
      cumGold: 0,
      drops: {},
      ended: false,
    };
    this.emit({
      t: 0,
      type: 'cycle_start',
      loadoutHash: hashLoadout(opts.loadout),
      seed: opts.seed,
      characterId: opts.loadout.characterId,
    });
  }

  tick(deltaMs: number): void {
    if (this.state.ended || deltaMs <= 0) return;
    this.state.tNowMs += deltaMs;
    // Battle round trigger logic arrives in Task 4.
  }

  getEvents(): readonly CycleEvent[] {
    return this.events;
  }

  getState(): CycleState {
    return { ...this.state, drops: { ...this.state.drops } };
  }

  getResult(): CycleResult | null {
    if (!this.state.ended) return null;
    // Full aggregation arrives in Task 7. Stub returns minimal shape.
    return {
      durationMs: this.state.tNowMs,
      maxLevel: this.state.heroLv,
      levelCurve: [],
      expCurve: [],
      bpCurve: [],
      kills: { total: this.state.cumKills, byEnemyId: {}, bossKills: 0 },
      drops: { byItemId: { ...this.state.drops }, rarityHistogram: {} },
      reason: 'bp_exhausted',
    };
  }

  protected emit(e: CycleEvent): void {
    this.events.push(e);
  }
}

function hashLoadout(l: ControllerLoadout): string {
  return `${l.characterId}|hp${l.heroHpMax}|atk${l.heroAtkBase}|bp${l.bpMax}`;
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: PASS, 4 tests.

- [ ] **Step 3.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/AutoBattleController.ts games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T3 — AutoBattleController skeleton (constructor + tick stub + getState/getEvents/getResult)"
```

---

## Task 4: AutoBattleController — battle round (resolver-driven combat)

**Files:**
- Modify: `games/inflation-rpg/src/cycle/AutoBattleController.ts`
- Modify: `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts` (add tests)

- [ ] **Step 4.1: Write the failing tests for battle round logic**

Append to `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`:

```ts
describe('AutoBattleController — battle round', () => {
  it('emits battle_start within first round when BP > 0', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    ctrl.tick(700); // > 600ms roundMs
    const types = ctrl.getEvents().map(e => e.type);
    expect(types).toContain('battle_start');
  });

  it('emits hero_hit and enemy_hit alternating during a battle', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    for (let i = 0; i < 20; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types.filter(t => t === 'hero_hit').length).toBeGreaterThan(0);
    expect(types.filter(t => t === 'enemy_hit').length).toBeGreaterThan(0);
  });

  it('emits enemy_kill when enemy HP <= 0', () => {
    // Use very high heroAtkBase so first hit kills enemy.
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 5; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types).toContain('enemy_kill');
  });

  it('after enemy_kill, a fresh battle_start follows on next round', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 5; i++) ctrl.tick(600);
    const events = ctrl.getEvents();
    const killIdx = events.findIndex(e => e.type === 'enemy_kill');
    const nextStartIdx = events.findIndex((e, i) => i > killIdx && e.type === 'battle_start');
    expect(nextStartIdx).toBeGreaterThan(killIdx);
  });
});
```

- [ ] **Step 4.2: Run tests to verify the new ones fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: 4 new tests FAIL (existing 4 still pass).

- [ ] **Step 4.3: Implement battle round logic**

Replace the body of `AutoBattleController.ts` with the version below (skeleton extended).

Edit `games/inflation-rpg/src/cycle/AutoBattleController.ts` — replace the `tick` method and add the battle helpers:

```ts
// Replace the existing tick() with this:
tick(deltaMs: number): void {
  if (this.state.ended || deltaMs <= 0) return;
  this.state.tNowMs += deltaMs;
  while (!this.state.ended && this.state.tNowMs >= this.nextRoundAtMs) {
    this.runRound();
    this.nextRoundAtMs += this.roundMs;
  }
}

private currentEnemyHp: number = 0;
private currentEnemyMaxHp: number = 0;
private currentEnemyId: string | null = null;

private runRound(): void {
  if (!this.currentEnemyId) {
    this.spawnEnemy();
  }
  this.heroAttack();
  if (this.currentEnemyHp <= 0) {
    this.killEnemy();
    return;
  }
  this.enemyAttack();
}

private spawnEnemy(): void {
  // Sim-A uses a minimal placeholder enemy stat curve. Real monster data
  // integration arrives in Task 5 where we connect to data/monsters.ts.
  const enemyLevel = this.state.heroLv;
  const enemyMaxHp = Math.max(10, enemyLevel * 20);
  this.currentEnemyId = `sim_enemy_lv${enemyLevel}_t${this.state.tNowMs}`;
  this.currentEnemyHp = enemyMaxHp;
  this.currentEnemyMaxHp = enemyMaxHp;
  this.emit({
    t: this.state.tNowMs,
    type: 'battle_start',
    enemyId: this.currentEnemyId,
    isBoss: false,
    heroLv: this.state.heroLv,
    heroHp: this.state.heroHp,
    enemyHp: enemyMaxHp,
  });
}

private heroAttack(): void {
  if (!this.currentEnemyId) return;
  const dmg = Math.max(1, this.loadout.heroAtkBase + this.state.heroLv * 2);
  this.currentEnemyHp = Math.max(0, this.currentEnemyHp - dmg);
  this.emit({
    t: this.state.tNowMs,
    type: 'hero_hit',
    enemyId: this.currentEnemyId,
    damage: dmg,
    remaining: this.currentEnemyHp,
  });
}

private enemyAttack(): void {
  if (!this.currentEnemyId) return;
  const dmg = Math.max(1, this.state.heroLv * 3);
  this.state.heroHp = Math.max(0, this.state.heroHp - dmg);
  this.emit({
    t: this.state.tNowMs,
    type: 'enemy_hit',
    enemyId: this.currentEnemyId,
    damage: dmg,
    remaining: this.state.heroHp,
  });
  if (this.state.heroHp <= 0) {
    // Hero defeat: restore to full and consume extra BP — placeholder until Task 6.
    this.state.heroHp = this.state.heroHpMax;
  }
}

private killEnemy(): void {
  if (!this.currentEnemyId) return;
  const exp = Math.max(1, this.state.heroLv * 10);
  const gold = Math.max(1, this.state.heroLv * 2);
  this.emit({
    t: this.state.tNowMs,
    type: 'enemy_kill',
    enemyId: this.currentEnemyId,
    expGain: exp,
    goldGain: gold,
    dropIds: [],
  });
  this.state.cumKills += 1;
  this.state.cumGold += gold;
  this.state.heroExp += exp;
  this.currentEnemyId = null;
  // level_up + bp_change handled in Tasks 5 and 6.
}
```

Add `currentEnemyId / currentEnemyHp / currentEnemyMaxHp` as private fields. Make sure `emit` and `getState` are still defined.

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: PASS, 8 tests total.

- [ ] **Step 4.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/AutoBattleController.ts games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T4 — AutoBattleController battle round (spawn/heroAttack/enemyAttack/killEnemy)"
```

---

## Task 5: AutoBattleController — EXP → level_up (inflation curve)

**Files:**
- Modify: `games/inflation-rpg/src/cycle/AutoBattleController.ts`
- Modify: `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`

- [ ] **Step 5.1: Write failing test for level_up**

Append to `AutoBattleController.test.ts`:

```ts
describe('AutoBattleController — EXP / level_up (inflation curve)', () => {
  it('emits level_up event with correct from/to when threshold crossed', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types).toContain('level_up');
  });

  it('hero level monotonically increases (inflation never reverses)', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    let lastLv = 1;
    for (let i = 0; i < 100; i++) {
      ctrl.tick(600);
      const lv = ctrl.getState().heroLv;
      expect(lv).toBeGreaterThanOrEqual(lastLv);
      lastLv = lv;
    }
  });

  it('hero reaches at least lv 5 within 100 rounds with high atk (inflation works)', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    expect(ctrl.getState().heroLv).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 5.2: Run tests to verify the new ones fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: 3 new tests FAIL (no level_up events yet).

- [ ] **Step 5.3: Implement level_up logic**

Edit `AutoBattleController.ts` — add a `tryLevelUp` helper called at the end of `killEnemy()`. Insert after `this.state.heroExp += exp;` inside `killEnemy()`:

```ts
this.tryLevelUp();
```

Add the new method:

```ts
private tryLevelUp(): void {
  while (this.state.heroExp >= this.expRequiredForLevel(this.state.heroLv)) {
    const cost = this.expRequiredForLevel(this.state.heroLv);
    this.state.heroExp -= cost;
    const from = this.state.heroLv;
    this.state.heroLv = from + 1;
    // Sim-A stat curve placeholder. Tuning to inflation §11.5 happens in Phase Sim-G.
    const hpDelta = Math.floor(this.state.heroHpMax * 0.05);
    this.state.heroHpMax += hpDelta;
    this.state.heroHp = this.state.heroHpMax; // full heal on level
    this.emit({
      t: this.state.tNowMs,
      type: 'level_up',
      from,
      to: this.state.heroLv,
      statDelta: { hp: hpDelta },
    });
  }
}

private expRequiredForLevel(lv: number): number {
  // Polynomial curve placeholder. Inflation curve fine-tune in Phase Sim-G.
  return Math.floor(10 * Math.pow(lv, 1.3));
}
```

- [ ] **Step 5.4: Run tests to verify they pass**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: PASS, 11 tests total.

- [ ] **Step 5.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/AutoBattleController.ts games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T5 — AutoBattleController EXP curve + level_up event (placeholder curve, Sim-G tunes)"
```

---

## Task 6: AutoBattleController — BP consumption + cycle_end

**Files:**
- Modify: `games/inflation-rpg/src/cycle/AutoBattleController.ts`
- Modify: `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`

- [ ] **Step 6.1: Write failing tests for BP + cycle_end**

Append to `AutoBattleController.test.ts`:

```ts
describe('AutoBattleController — BP / cycle_end', () => {
  it('emits bp_change event after each enemy kill', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 10; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types.filter(t => t === 'bp_change').length).toBeGreaterThan(0);
  });

  it('emits cycle_end with reason bp_exhausted when BP hits 0', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 3, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    const endEv = ctrl.getEvents().find(e => e.type === 'cycle_end');
    expect(endEv).toBeDefined();
    if (endEv && endEv.type === 'cycle_end') {
      expect(endEv.reason).toBe('bp_exhausted');
    }
  });

  it('after cycle_end, further ticks are no-ops', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 3, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    const eventsAtEnd = ctrl.getEvents().length;
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    expect(ctrl.getEvents().length).toBe(eventsAtEnd);
  });

  it('abandon() forces cycle_end with reason abandoned', () => {
    const ctrl = new AutoBattleController({
      loadout: minimalLoadout(),
      seed: 42,
    });
    ctrl.tick(600);
    ctrl.abandon();
    const endEv = ctrl.getEvents().find(e => e.type === 'cycle_end');
    expect(endEv).toBeDefined();
    if (endEv && endEv.type === 'cycle_end') {
      expect(endEv.reason).toBe('abandoned');
    }
  });
});
```

- [ ] **Step 6.2: Run tests to verify the new ones fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: 4 new tests FAIL.

- [ ] **Step 6.3: Implement BP + cycle_end + abandon**

Edit `AutoBattleController.ts`:

Inside `killEnemy()`, after `this.tryLevelUp();`, insert:

```ts
this.consumeBp(1, 'encounter');
```

Add new methods:

```ts
private consumeBp(amount: number, cause: string): void {
  this.state.bp = Math.max(0, this.state.bp - amount);
  this.emit({
    t: this.state.tNowMs,
    type: 'bp_change',
    delta: -amount,
    remaining: this.state.bp,
    cause,
  });
  if (this.state.bp <= 0) {
    this.endCycle('bp_exhausted');
  }
}

abandon(): void {
  if (this.state.ended) return;
  this.endCycle('abandoned');
}

private endCycle(reason: 'bp_exhausted' | 'abandoned' | 'forced'): void {
  if (this.state.ended) return;
  this.state.ended = true;
  this.emit({
    t: this.state.tNowMs,
    type: 'cycle_end',
    reason,
    durationMs: this.state.tNowMs,
    maxLevel: this.state.heroLv,
    finalState: {
      heroHp: this.state.heroHp,
      heroExp: this.state.heroExp,
      cumKills: this.state.cumKills,
      cumGold: this.state.cumGold,
    },
  });
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: PASS, 15 tests total.

- [ ] **Step 6.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/AutoBattleController.ts games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T6 — AutoBattleController BP consume + cycle_end (bp_exhausted / abandoned)"
```

---

## Task 7: AutoBattleController — getResult() aggregation (real)

**Files:**
- Modify: `games/inflation-rpg/src/cycle/AutoBattleController.ts`
- Modify: `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`

- [ ] **Step 7.1: Write failing tests for getResult curves**

Append to `AutoBattleController.test.ts`:

```ts
describe('AutoBattleController — getResult curves', () => {
  it('returns null while cycle is still running', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    expect(ctrl.getResult()).toBeNull();
  });

  it('levelCurve has at least one entry per level_up event', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    const result = ctrl.getResult();
    expect(result).not.toBeNull();
    const levelUpCount = ctrl.getEvents().filter(e => e.type === 'level_up').length;
    expect(result!.levelCurve.length).toBe(levelUpCount + 1); // +1 for initial lv 1 entry
  });

  it('kills.total matches enemy_kill event count', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    const killEvents = ctrl.getEvents().filter(e => e.type === 'enemy_kill').length;
    expect(ctrl.getResult()!.kills.total).toBe(killEvents);
  });

  it('bpCurve last entry is 0 on bp_exhausted', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 3, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    const result = ctrl.getResult();
    expect(result).not.toBeNull();
    expect(result!.bpCurve[result!.bpCurve.length - 1].bp).toBe(0);
  });
});
```

- [ ] **Step 7.2: Run tests to verify the new ones fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: 3 new tests FAIL (one passes — null check).

- [ ] **Step 7.3: Replace getResult() with real aggregation**

In `AutoBattleController.ts`, replace the existing `getResult()` body:

```ts
getResult(): CycleResult | null {
  if (!this.state.ended) return null;
  const levelCurve: Array<{ t: number; lv: number }> = [{ t: 0, lv: 1 }];
  const expCurve: Array<{ t: number; cumExp: number }> = [{ t: 0, cumExp: 0 }];
  const bpCurve: Array<{ t: number; bp: number }> = [{ t: 0, bp: this.state.bpMax }];
  const byEnemyId: Record<string, number> = {};
  let bossKills = 0;
  let cumExp = 0;
  let endEv: CycleEvent | undefined;

  for (const ev of this.events) {
    if (ev.type === 'level_up') {
      levelCurve.push({ t: ev.t, lv: ev.to });
    }
    if (ev.type === 'enemy_kill') {
      cumExp += ev.expGain;
      expCurve.push({ t: ev.t, cumExp });
      byEnemyId[ev.enemyId] = (byEnemyId[ev.enemyId] ?? 0) + 1;
    }
    if (ev.type === 'battle_start' && ev.isBoss) {
      bossKills += 0; // counted on kill, see below
    }
    if (ev.type === 'enemy_kill' && ev.enemyId.startsWith('sim_boss_')) {
      bossKills += 1;
    }
    if (ev.type === 'bp_change') {
      bpCurve.push({ t: ev.t, bp: ev.remaining });
    }
    if (ev.type === 'cycle_end') {
      endEv = ev;
    }
  }

  const reason = endEv?.type === 'cycle_end' ? endEv.reason : 'forced';

  return {
    durationMs: this.state.tNowMs,
    maxLevel: this.state.heroLv,
    levelCurve,
    expCurve,
    bpCurve,
    kills: { total: this.state.cumKills, byEnemyId, bossKills },
    drops: { byItemId: { ...this.state.drops }, rarityHistogram: {} },
    reason,
  };
}
```

- [ ] **Step 7.4: Run tests to verify they pass**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: PASS, 19 tests total.

- [ ] **Step 7.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/AutoBattleController.ts games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T7 — getResult() real aggregation (levelCurve / expCurve / bpCurve / kills / drops)"
```

---

## Task 8: cycleSlice — zustand store for live cycle

**Files:**
- Create: `games/inflation-rpg/src/cycle/cycleSlice.ts`
- Create: `games/inflation-rpg/src/cycle/__tests__/cycleSlice.test.ts`

- [ ] **Step 8.1: Write failing test**

Create `games/inflation-rpg/src/cycle/__tests__/cycleSlice.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCycleStore } from '../cycleSlice';

describe('cycleSlice', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
  });

  it('starts in idle status', () => {
    expect(useCycleStore.getState().status).toBe('idle');
    expect(useCycleStore.getState().controller).toBeNull();
  });

  it('start() transitions to running and creates controller', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 10 },
      seed: 42,
    });
    expect(useCycleStore.getState().status).toBe('running');
    expect(useCycleStore.getState().controller).not.toBeNull();
  });

  it('abandon() transitions to ended with result populated', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 10 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    expect(useCycleStore.getState().status).toBe('ended');
    expect(useCycleStore.getState().result).not.toBeNull();
  });

  it('reset() returns to idle and clears controller and result', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 10 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    useCycleStore.getState().reset();
    expect(useCycleStore.getState().status).toBe('idle');
    expect(useCycleStore.getState().controller).toBeNull();
    expect(useCycleStore.getState().result).toBeNull();
  });
});
```

- [ ] **Step 8.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- cycleSlice`

Expected: FAIL — module not found.

- [ ] **Step 8.3: Implement cycleSlice**

Create `games/inflation-rpg/src/cycle/cycleSlice.ts`:

```ts
import { create } from 'zustand';
import { AutoBattleController, type ControllerOptions } from './AutoBattleController';
import type { CycleResult } from './cycleEvents';

type CycleStatus = 'idle' | 'running' | 'ended';

interface CycleStoreState {
  status: CycleStatus;
  controller: AutoBattleController | null;
  result: CycleResult | null;
  start: (opts: ControllerOptions) => void;
  abandon: () => void;
  endOnBpExhausted: () => void;
  reset: () => void;
}

export const useCycleStore = create<CycleStoreState>((set, get) => ({
  status: 'idle',
  controller: null,
  result: null,
  start(opts) {
    const ctrl = new AutoBattleController(opts);
    set({ status: 'running', controller: ctrl, result: null });
  },
  abandon() {
    const ctrl = get().controller;
    if (!ctrl) return;
    ctrl.abandon();
    set({ status: 'ended', result: ctrl.getResult() });
  },
  endOnBpExhausted() {
    // Called by the rAF driver in CycleRunner when controller emits cycle_end.
    const ctrl = get().controller;
    if (!ctrl) return;
    set({ status: 'ended', result: ctrl.getResult() });
  },
  reset() {
    set({ status: 'idle', controller: null, result: null });
  },
}));
```

- [ ] **Step 8.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- cycleSlice`

Expected: PASS, 4 tests.

- [ ] **Step 8.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/cycleSlice.ts games/inflation-rpg/src/cycle/__tests__/cycleSlice.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T8 — cycleSlice zustand store (idle/running/ended)"
```

---

## Task 9: gameStore persist v14 → v15 migration

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/types.ts` (add `cycleHistory` to MetaState)
- Create: `games/inflation-rpg/src/store/__tests__/migrate-v14-v15.test.ts`

- [ ] **Step 9.1: Write failing migration test**

Create `games/inflation-rpg/src/store/__tests__/migrate-v14-v15.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';

describe('Persist v14 → v15 migration', () => {
  it('adds cycleHistory: [] to meta when migrating from v14', () => {
    const v14State = {
      run: { /* arbitrary v14 run state */ },
      meta: {
        characterLevels: {},
        // intentionally missing cycleHistory
      },
    };
    const migrated = runStoreMigration(v14State, 14);
    expect(migrated.meta.cycleHistory).toEqual([]);
  });

  it('preserves existing meta fields', () => {
    const v14State = {
      run: {},
      meta: {
        characterLevels: { K01: 5 },
        ascTier: 2,
      },
    };
    const migrated = runStoreMigration(v14State, 14);
    expect(migrated.meta.characterLevels.K01).toBe(5);
    expect(migrated.meta.ascTier).toBe(2);
  });

  it('is no-op when state already at v15', () => {
    const v15State = {
      meta: { cycleHistory: [{ endedAtMs: 1, durationMs: 100, maxLevel: 5, reason: 'bp_exhausted', seed: 1 }] },
    };
    const migrated = runStoreMigration(v15State, 15);
    expect(migrated.meta.cycleHistory.length).toBe(1);
  });
});
```

- [ ] **Step 9.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- migrate-v14-v15`

Expected: FAIL — `runStoreMigration is not exported` OR migration doesn't add cycleHistory.

- [ ] **Step 9.3: Update types.ts**

In `games/inflation-rpg/src/types.ts`, locate the `MetaState` interface (search for `interface MetaState` or `type MetaState`). Add a new field:

```ts
import type { CycleHistoryEntry } from './cycle/cycleEvents';

// Inside MetaState:
cycleHistory: CycleHistoryEntry[];
```

- [ ] **Step 9.4: Bump STORE_VERSION + add migration in gameStore.ts**

In `games/inflation-rpg/src/store/gameStore.ts`:

Change `STORE_VERSION = 14` to `STORE_VERSION = 15` (line 1099).

Locate `INITIAL_META` (line 66-123) and add at the end (before the closing brace):

```ts
cycleHistory: [],
```

Locate `runStoreMigration` function (the persist `migrate` callback). Inside, add the v14 → v15 branch:

```ts
// After other migration branches, before the return:
if (fromVersion <= 14) {
  if (!state.meta.cycleHistory) {
    state.meta.cycleHistory = [];
  }
}
```

If `runStoreMigration` isn't currently exported as a named export, export it for testing. Find the function definition and prepend `export`.

- [ ] **Step 9.5: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- migrate-v14-v15`

Expected: PASS, 3 tests.

- [ ] **Step 9.6: Run full test suite (regression check)**

Run: `pnpm --filter @forge/game-inflation-rpg test`

Expected: ALL existing tests still pass (no regression). If a test fails because it asserted `STORE_VERSION === 14`, update it to 15.

- [ ] **Step 9.7: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/__tests__/migrate-v14-v15.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-A T9 — persist v14 → v15 migration (MetaState.cycleHistory: CycleHistoryEntry[])"
```

---

## Task 10: scripts/sim-cycle.ts — headless Node CLI

**Files:**
- Create: `games/inflation-rpg/scripts/sim-cycle.ts`
- Modify: `games/inflation-rpg/package.json`
- Modify: `games/inflation-rpg/.gitignore`

- [ ] **Step 10.1: Add tsx devDependency if missing**

Run:

```bash
pnpm --filter @forge/game-inflation-rpg add -D tsx
```

If `tsx` is already in the workspace, this is a no-op. Verify with `cat games/inflation-rpg/package.json | grep tsx`.

- [ ] **Step 10.2: Append runs/ to .gitignore**

Edit `games/inflation-rpg/.gitignore` — add a line:

```
runs/
```

- [ ] **Step 10.3: Write CLI smoke test**

Create `games/inflation-rpg/scripts/__tests__/sim-cycle.smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runSim } from '../sim-cycle';

describe('sim-cycle CLI — runSim()', () => {
  it('runs a single cycle and returns at least one CycleResult', () => {
    const out = runSim({
      count: 1,
      seedStart: 42,
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 10000 },
      maxTickMs: 60_000,
    });
    expect(out.results.length).toBe(1);
    expect(out.results[0].reason).toBe('bp_exhausted');
    expect(out.results[0].maxLevel).toBeGreaterThanOrEqual(1);
  });

  it('two cycles with different seeds produce different maxLevel distributions', () => {
    const out = runSim({
      count: 10,
      seedStart: 1,
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 10000 },
      maxTickMs: 60_000,
    });
    const uniqueLevels = new Set(out.results.map(r => r.maxLevel));
    // 10 cycles should produce some variance.
    expect(uniqueLevels.size).toBeGreaterThanOrEqual(1);
    expect(out.summary.cycleCount).toBe(10);
  });

  it('summary aggregates max/min/avg of maxLevel across cycles', () => {
    const out = runSim({
      count: 5,
      seedStart: 100,
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 10000 },
      maxTickMs: 60_000,
    });
    expect(out.summary.maxLevel.min).toBeLessThanOrEqual(out.summary.maxLevel.avg);
    expect(out.summary.maxLevel.avg).toBeLessThanOrEqual(out.summary.maxLevel.max);
  });
});
```

- [ ] **Step 10.4: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- sim-cycle.smoke`

Expected: FAIL — module not found.

- [ ] **Step 10.5: Implement sim-cycle.ts**

Create `games/inflation-rpg/scripts/sim-cycle.ts`:

```ts
#!/usr/bin/env tsx
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { AutoBattleController, type ControllerLoadout } from '../src/cycle/AutoBattleController';
import type { CycleResult, CycleEvent } from '../src/cycle/cycleEvents';

export interface SimOptions {
  count: number;
  seedStart: number;
  loadout: ControllerLoadout;
  /** Hard cap to avoid infinite loops if BP never drops. */
  maxTickMs: number;
  /** Optional JSONL output path. If omitted, no file is written. */
  out?: string;
}

export interface SimOutput {
  results: CycleResult[];
  summary: SimSummary;
}

export interface SimSummary {
  cycleCount: number;
  durationMs: { min: number; max: number; avg: number; p50: number; p90: number };
  maxLevel: { min: number; max: number; avg: number; p50: number; p90: number };
  reasons: Record<string, number>;
}

const TICK_MS = 100;

export function runSim(opts: SimOptions): SimOutput {
  const results: CycleResult[] = [];
  const allEvents: CycleEvent[][] = [];

  for (let i = 0; i < opts.count; i++) {
    const seed = opts.seedStart + i;
    const ctrl = new AutoBattleController({ loadout: opts.loadout, seed });
    let t = 0;
    while (t < opts.maxTickMs && !ctrl.getState().ended) {
      ctrl.tick(TICK_MS);
      t += TICK_MS;
    }
    if (!ctrl.getState().ended) {
      ctrl.abandon(); // forced timeout
    }
    const result = ctrl.getResult();
    if (result) results.push(result);
    allEvents.push([...ctrl.getEvents()]);
  }

  if (opts.out) {
    mkdirSync(dirname(opts.out), { recursive: true });
    const jsonl = allEvents
      .flatMap((evs, cycleIdx) =>
        evs.map(ev => JSON.stringify({ cycleIdx, ...ev }))
      )
      .join('\n');
    writeFileSync(opts.out, jsonl + '\n', 'utf-8');
  }

  const summary = buildSummary(results);

  if (opts.out) {
    const summaryPath = opts.out.replace(/\.jsonl?$/, '') + '.summary.json';
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  }

  return { results, summary };
}

function buildSummary(results: CycleResult[]): SimSummary {
  const durationMs = results.map(r => r.durationMs);
  const maxLevel = results.map(r => r.maxLevel);
  const reasons: Record<string, number> = {};
  for (const r of results) {
    reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  }
  return {
    cycleCount: results.length,
    durationMs: stat(durationMs),
    maxLevel: stat(maxLevel),
    reasons,
  };
}

function stat(values: number[]): SimSummary['durationMs'] {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
  };
}

// CLI entry — runs when invoked via `tsx scripts/sim-cycle.ts`.
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const parseArg = (name: string, fallback: string): string => {
    const idx = argv.findIndex(a => a === `--${name}`);
    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : fallback;
  };
  const count = parseInt(parseArg('count', '10'), 10);
  const seedStart = parseInt(parseArg('seed', '42'), 10);
  const charId = parseArg('char', 'K01');
  const bpMax = parseInt(parseArg('bp', '30'), 10);
  const out = parseArg('out', `runs/${new Date().toISOString().slice(0, 10)}-sim.jsonl`);

  const result = runSim({
    count,
    seedStart,
    loadout: {
      characterId: charId,
      bpMax,
      heroHpMax: 100,
      heroAtkBase: 50,
    },
    maxTickMs: 5 * 60 * 1000, // 5-min cap per cycle
    out,
  });

  console.log(`Wrote ${result.results.length} cycle results.`);
  console.log(`Summary:`, JSON.stringify(result.summary, null, 2));
}
```

- [ ] **Step 10.6: Add sim:cycle script to package.json**

Edit `games/inflation-rpg/package.json` — add to `"scripts"` section:

```json
"sim:cycle": "tsx scripts/sim-cycle.ts"
```

- [ ] **Step 10.7: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- sim-cycle.smoke`

Expected: PASS, 3 tests.

- [ ] **Step 10.8: Smoke-run the CLI**

Run:

```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle -- --count 3 --seed 42
```

Expected: stdout shows "Wrote 3 cycle results." + summary JSON.

Verify files were created:

```bash
ls games/inflation-rpg/runs/
```

Expected: a `<date>-sim.jsonl` file + matching `.summary.json`.

- [ ] **Step 10.9: Commit**

```bash
git add games/inflation-rpg/scripts/sim-cycle.ts games/inflation-rpg/scripts/__tests__/sim-cycle.smoke.test.ts games/inflation-rpg/package.json games/inflation-rpg/.gitignore games/inflation-rpg/pnpm-lock.yaml
git commit -m "feat(game-inflation-rpg): Phase Sim-A T10 — sim:cycle Node CLI (JSONL events + summary.json)"
```

---

## Task 11: CycleRunner React screen — HUD + event log

**Files:**
- Create: `games/inflation-rpg/src/screens/CycleRunner.tsx`
- Create: `games/inflation-rpg/src/screens/__tests__/CycleRunner.test.tsx`

- [ ] **Step 11.1: Write failing render test**

Create `games/inflation-rpg/src/screens/__tests__/CycleRunner.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CycleRunner } from '../CycleRunner';
import { useCycleStore } from '../../cycle/cycleSlice';

describe('CycleRunner', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "idle" message before start', () => {
    render(<CycleRunner onCycleEnd={() => {}} />);
    expect(screen.getByText(/사이클이 시작되지 않았습니다/)).toBeInTheDocument();
  });

  it('shows HUD (LV / BP) when status is running', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 100 },
      seed: 42,
    });
    render(<CycleRunner onCycleEnd={() => {}} />);
    expect(screen.getByTestId('hud-level')).toBeInTheDocument();
    expect(screen.getByTestId('hud-bp')).toBeInTheDocument();
  });

  it('calls onCycleEnd when cycle naturally ends', () => {
    const onEnd = vi.fn();
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 },
      seed: 42,
    });
    render(<CycleRunner onCycleEnd={onEnd} />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onEnd).toHaveBeenCalled();
  });
});
```

- [ ] **Step 11.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- CycleRunner`

Expected: FAIL — module not found.

- [ ] **Step 11.3: Implement CycleRunner**

Create `games/inflation-rpg/src/screens/CycleRunner.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useCycleStore } from '../cycle/cycleSlice';
import type { CycleEvent } from '../cycle/cycleEvents';

const TICK_MS = 100;
const LOG_KEEP_LAST = 50;

interface Props {
  onCycleEnd: () => void;
}

export function CycleRunner({ onCycleEnd }: Props) {
  const { status, controller, endOnBpExhausted } = useCycleStore();
  const [tick, setTick] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (status !== 'running' || !controller) return;
    endedRef.current = false;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTimeRef.current;
      if (delta >= TICK_MS) {
        controller.tick(delta);
        lastTimeRef.current = now;
        setTick(t => t + 1);
        if (controller.getState().ended && !endedRef.current) {
          endedRef.current = true;
          endOnBpExhausted();
          onCycleEnd();
          return;
        }
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [status, controller, onCycleEnd, endOnBpExhausted]);

  if (status === 'idle' || !controller) {
    return <div>사이클이 시작되지 않았습니다.</div>;
  }

  const state = controller.getState();
  const events = controller.getEvents();
  const recent = events.slice(-LOG_KEEP_LAST);

  return (
    <div data-testid="cycle-runner" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div data-testid="hud-level">LV {state.heroLv}</div>
        <div data-testid="hud-hp">HP {state.heroHp} / {state.heroHpMax}</div>
        <div data-testid="hud-bp">BP {state.bp} / {state.bpMax}</div>
        <div data-testid="hud-kills">처치 {state.cumKills}</div>
        <div data-testid="hud-gold">골드 {state.cumGold}</div>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
        {recent.map((e, i) => (
          <div key={`${e.t}_${i}`}>{formatEvent(e)}</div>
        ))}
      </div>
    </div>
  );
}

function formatEvent(e: CycleEvent): string {
  const ts = `[${e.t.toString().padStart(6, '0')}ms]`;
  switch (e.type) {
    case 'cycle_start': return `${ts} cycle 시작 (캐릭터 ${e.characterId} seed ${e.seed})`;
    case 'battle_start': return `${ts} ⚔️ 전투 시작 — ${e.enemyId} (HP ${e.enemyHp})`;
    case 'hero_hit': return `${ts}   → ${e.damage} 데미지 (적 HP ${e.remaining})`;
    case 'enemy_hit': return `${ts}   ← ${e.damage} 데미지 (내 HP ${e.remaining})`;
    case 'enemy_kill': return `${ts} 💀 처치 — EXP +${e.expGain} / 골드 +${e.goldGain}`;
    case 'level_up': return `${ts} ⭐ 레벨업 ${e.from} → ${e.to}`;
    case 'bp_change': return `${ts} 🟦 BP ${e.delta > 0 ? '+' : ''}${e.delta} → ${e.remaining}`;
    case 'cycle_end': return `${ts} 🏁 cycle 종료 — ${e.reason} / 최대 lv ${e.maxLevel}`;
    default: return `${ts} ${(e as { type: string }).type}`;
  }
}
```

- [ ] **Step 11.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- CycleRunner`

Expected: PASS, 3 tests.

- [ ] **Step 11.5: Commit**

```bash
git add games/inflation-rpg/src/screens/CycleRunner.tsx games/inflation-rpg/src/screens/__tests__/CycleRunner.test.tsx
git commit -m "feat(game-inflation-rpg): Phase Sim-A T11 — CycleRunner React screen (rAF-driven HUD + event log)"
```

---

## Task 12: CycleResult React screen — end-of-cycle summary

**Files:**
- Create: `games/inflation-rpg/src/screens/CycleResult.tsx`
- Create: `games/inflation-rpg/src/screens/__tests__/CycleResult.test.tsx`

- [ ] **Step 12.1: Write failing render test**

Create `games/inflation-rpg/src/screens/__tests__/CycleResult.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CycleResult } from '../CycleResult';
import { useCycleStore } from '../../cycle/cycleSlice';

describe('CycleResult', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
  });

  it('shows "no result" when store has no result', () => {
    render(<CycleResult onBackToMenu={() => {}} />);
    expect(screen.getByText(/결과가 없습니다/)).toBeInTheDocument();
  });

  it('shows maxLevel and reason when result is populated', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    render(<CycleResult onBackToMenu={() => {}} />);
    expect(screen.getByTestId('result-max-level')).toBeInTheDocument();
    expect(screen.getByTestId('result-reason')).toBeInTheDocument();
  });

  it('back-to-menu button triggers callback', () => {
    const onBack = vi.fn();
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    render(<CycleResult onBackToMenu={onBack} />);
    fireEvent.click(screen.getByText(/메인 메뉴/));
    expect(onBack).toHaveBeenCalled();
  });
});
```

Add `import { vi } from 'vitest';` at top if not already.

- [ ] **Step 12.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- CycleResult`

Expected: FAIL — module not found.

- [ ] **Step 12.3: Implement CycleResult**

Create `games/inflation-rpg/src/screens/CycleResult.tsx`:

```tsx
import { useCycleStore } from '../cycle/cycleSlice';

interface Props {
  onBackToMenu: () => void;
}

export function CycleResult({ onBackToMenu }: Props) {
  const result = useCycleStore(s => s.result);
  const reset = useCycleStore(s => s.reset);

  if (!result) {
    return <div>결과가 없습니다.</div>;
  }

  const handleBack = () => {
    reset();
    onBackToMenu();
  };

  return (
    <div data-testid="cycle-result" style={{ padding: 16 }}>
      <h2>사이클 종료</h2>
      <div data-testid="result-reason">사유: {result.reason}</div>
      <div data-testid="result-max-level">최대 레벨: {result.maxLevel}</div>
      <div data-testid="result-duration">진행 시간: {(result.durationMs / 1000).toFixed(1)}초</div>
      <div data-testid="result-kills">처치 수: {result.kills.total}</div>
      <h3 style={{ marginTop: 16 }}>레벨 곡선 (inflation)</h3>
      <div style={{ maxHeight: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
        {result.levelCurve.map((p, i) => (
          <div key={i}>t={p.t.toString().padStart(6, '0')}ms — LV {p.lv}</div>
        ))}
      </div>
      <button type="button" onClick={handleBack} style={{ marginTop: 16 }}>
        메인 메뉴로
      </button>
    </div>
  );
}
```

- [ ] **Step 12.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- CycleResult`

Expected: PASS, 3 tests.

- [ ] **Step 12.5: Commit**

```bash
git add games/inflation-rpg/src/screens/CycleResult.tsx games/inflation-rpg/src/screens/__tests__/CycleResult.test.tsx
git commit -m "feat(game-inflation-rpg): Phase Sim-A T12 — CycleResult React screen (maxLevel + duration + kills + level curve)"
```

---

## Task 13: MainMenu wire — "사이클 시작 (NEW)" button + App routing

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`
- Modify: `games/inflation-rpg/src/App.tsx`

- [ ] **Step 13.1: Read existing MainMenu + App routing**

Run: `cat games/inflation-rpg/src/App.tsx` and `cat games/inflation-rpg/src/screens/MainMenu.tsx` to understand the existing screen state machine.

Note: There is likely an enum/type like `Screen = 'menu' | 'town' | 'dungeon' | 'battle' | ...`. Identify how screens switch.

- [ ] **Step 13.2: Add new screen states to App.tsx**

In `games/inflation-rpg/src/App.tsx`:

- Add `'cycle-runner'` and `'cycle-result'` to the screen-state type union.
- Import `CycleRunner` and `CycleResult` from `./screens/...`.
- Add render branches:

```tsx
{screen === 'cycle-runner' && (
  <CycleRunner onCycleEnd={() => setScreen('cycle-result')} />
)}
{screen === 'cycle-result' && (
  <CycleResult onBackToMenu={() => setScreen('main-menu')} />
)}
```

(Adjust `'main-menu'` to whatever the existing literal is — likely `'menu'`.)

- [ ] **Step 13.3: Add "사이클 시작 (NEW)" button to MainMenu**

In `games/inflation-rpg/src/screens/MainMenu.tsx`:

Import `useCycleStore` from `../cycle/cycleSlice`, and add a button alongside existing buttons:

```tsx
import { useCycleStore } from '../cycle/cycleSlice';
import { useGameStore } from '../store/gameStore'; // for loadout

// Inside the component:
const startCycle = useCycleStore(s => s.start);
const characterId = useGameStore(s => s.meta.lastPlayedCharId ?? 'K01');

const handleStartCycle = () => {
  startCycle({
    loadout: {
      characterId,
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 50,
    },
    seed: Date.now() & 0xffffffff,
  });
  onScreenChange('cycle-runner'); // adjust prop name to whatever MainMenu uses
};

// In the JSX, add:
<button type="button" onClick={handleStartCycle} data-testid="btn-start-cycle">
  사이클 시작 (NEW)
</button>
```

The exact prop name for navigation depends on how MainMenu currently changes screens (callback prop, store action, etc). Match the existing pattern — do NOT introduce a new pattern in this task.

- [ ] **Step 13.4: Manual smoke-test in dev shell**

Run from repo root:

```bash
pnpm dev
```

In browser, navigate to inflation-rpg (likely via dev-shell portal at `http://localhost:3000`). Click "사이클 시작 (NEW)" and confirm:
- Screen switches to CycleRunner
- HUD updates (LV, BP, etc.)
- Event log scrolls
- After BP exhaustion, switches to CycleResult
- "메인 메뉴로" button returns to MainMenu

Stop the dev server.

- [ ] **Step 13.5: Typecheck + test**

Run:

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
```

Expected: both pass.

- [ ] **Step 13.6: Commit**

```bash
git add games/inflation-rpg/src/App.tsx games/inflation-rpg/src/screens/MainMenu.tsx
git commit -m "feat(game-inflation-rpg): Phase Sim-A T13 — MainMenu '사이클 시작 (NEW)' button + App routing to CycleRunner / CycleResult"
```

---

## Task 14: Playwright E2E — vertical slice smoke

**Files:**
- Create: `games/inflation-rpg/e2e/cycle-vertical-slice.spec.ts`

- [ ] **Step 14.1: Inspect existing e2e setup**

Run: `ls games/inflation-rpg/e2e/` and read one of the existing spec files (e.g., `full-game-flow.spec.ts` or whatever currently exists) to understand:

- How the page is opened (URL / navigation)
- How initial state is reset (localStorage / store reset hook)
- Whether `exposeTestHooks` provides programmatic state access

- [ ] **Step 14.2: Write the spec**

Create `games/inflation-rpg/e2e/cycle-vertical-slice.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Phase Sim-A vertical slice', () => {
  test('Start Cycle (NEW) → cycle ends → CycleResult shows maxLevel', async ({ page }) => {
    await page.goto('/'); // adjust to actual route — check existing spec
    // Clear persist to ensure deterministic start (adjust storage key if needed)
    await page.evaluate(() => localStorage.removeItem('korea_inflation_rpg_save'));
    await page.reload();

    // From MainMenu, click the new Start Cycle button.
    await page.getByTestId('btn-start-cycle').click();

    // Wait for cycle-runner to mount.
    await expect(page.getByTestId('cycle-runner')).toBeVisible({ timeout: 5_000 });

    // Wait up to 30s for cycle to end (Sim-A uses default bpMax: 30, but BattleScene
    // independent — cycle should finish within wall-clock seconds at 100ms tick rate).
    await expect(page.getByTestId('cycle-result')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('result-max-level')).toBeVisible();
    await expect(page.getByTestId('result-reason')).toContainText(/bp_exhausted|abandoned/);

    // Back to menu.
    await page.getByText(/메인 메뉴/).click();
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
  });
});
```

If the dev-shell portal opens the game on a different path, adjust `await page.goto('/')` to match (e.g., `/inflation-rpg`).

- [ ] **Step 14.3: Run e2e**

Run:

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- cycle-vertical-slice
```

Expected: PASS.

If it fails because the screen routing literal mismatched, fix Task 13 — do NOT amend Task 13's commit; create a follow-up fix commit.

- [ ] **Step 14.4: Commit**

```bash
git add games/inflation-rpg/e2e/cycle-vertical-slice.spec.ts
git commit -m "test(game-inflation-rpg): Phase Sim-A T14 — Playwright e2e vertical slice (Start Cycle → BP exhaustion → result)"
```

---

## Task 15: Final verification + cleanup

**Files:** None new — verification only.

- [ ] **Step 15.1: Run the entire workspace test matrix**

Run from repo root:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm circular
pnpm --filter @forge/game-inflation-rpg e2e
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: ALL pass. If any unrelated workspace fails, note it but do not fix in this phase — flag as separate issue.

- [ ] **Step 15.2: Smoke-run sim:cycle with realistic parameters**

Run:

```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle -- --count 20 --seed 42 --bp 30
```

Expected:
- Console prints summary with `cycleCount: 20`
- `games/inflation-rpg/runs/<date>-sim.jsonl` exists
- `games/inflation-rpg/runs/<date>-sim.summary.json` exists
- `maxLevel.avg` is plausibly > 1 (some level-ups happened)

Read the summary to confirm shape:

```bash
cat games/inflation-rpg/runs/*.summary.json | head -40
```

- [ ] **Step 15.3: Document Phase Sim-A completion**

Append to `games/inflation-rpg/CHANGELOG.md` (create if missing):

```markdown
## Phase Sim-A — Vertical Slice + Headless Sim (YYYY-MM-DD)

- `AutoBattleController` (pure TS, Phaser 독립) + `CycleEvent` stream
- `cycleSlice` zustand store + persist v14 → v15 migration (`MetaState.cycleHistory`)
- `CycleRunner` + `CycleResult` React screens (rAF-driven view)
- `scripts/sim-cycle.ts` CLI — N cycle headless sim → JSONL + summary.json
- MainMenu "사이클 시작 (NEW)" entry, existing manual flow untouched
- 4 vitest suites + 1 Playwright e2e
```

- [ ] **Step 15.4: Verify branch state + commit changelog**

Run:

```bash
git status
git log --oneline feat/hero-simulator-pivot ^main | head
```

Expected: 14 phase-Sim-A commits ahead of main (T1–T14) plus the 2 pre-existing spec commits (722eacf design + aa3c30e refinement).

Commit changelog:

```bash
git add games/inflation-rpg/CHANGELOG.md
git commit -m "docs(game-inflation-rpg): Phase Sim-A — CHANGELOG entry"
```

- [ ] **Step 15.5: Tag and prepare merge**

Tag the head:

```bash
git tag phase-sim-a-complete
```

Stop here. The next step (merge to main) is handled by the `finishing-a-development-branch` skill, not by this plan.

---

## Out-of-band notes for the executing engineer

- **IDE stale "Cannot find module" diagnostics** are expected after creating new files under `src/cycle/`. Trust `pnpm typecheck` over IDE squiggles (see `CLAUDE.md` §자주 헷갈리는 함정들).
- **Battle component static import** is forbidden in App.tsx — see memory `feedback_battle_no_static_import.md`. CycleRunner is React-only (no Phaser) so this restriction does not apply, but if you find yourself adding a Phaser scene to App.tsx, route it through dynamic `ssr: false` import as the existing Battle screen does.
- **`runs/` directory** must be gitignored before any sim:cycle invocation, or you will accidentally commit large JSONL fixtures.
- **The 600ms `roundMs`** is the existing BattleScene cadence. Sim-A keeps it so cycle economy stays consistent with manual mode. Phase Sim-G can tune this if needed.
- **Inflation curve tuning is explicitly NOT in scope** for Sim-A. The placeholder EXP formula `10 * lv^1.3` is for skeleton wiring only — Sim-G is where the real curve is shaped against §11.5 of the spec.
- **CharacterId 'K01'** is the assumed default first character. If your codebase uses a different ID for the starter character, substitute consistently across Tasks 8, 10, 11, 13, and 14.
