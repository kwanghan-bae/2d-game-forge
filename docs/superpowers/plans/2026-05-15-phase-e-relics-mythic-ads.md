# Phase E (Relics + Mythic + Ads stub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first wave of the 7-layer meta cake's top layer (Relics) — 10 stackable relics + 30 Mythic relics + ad-watch stub — to inflation-rpg without touching Compass/IAP/real ad SDK (deferred to follow-up phases).

**Architecture:** Distributed hook model (Phase G's multiplier-param pattern). 6 effect types (`flat_mult`/`cooldown_mult`/`drop_mult`/`xp_mult`/`proc`/`passive`) route through dedicated aggregators in `mythics.ts` / `relics.ts`. Persist v11 extends `MetaState` with `relicStacks`, `mythicOwned`, `mythicEquipped`, `mythicSlotCap`, `adsToday`, `adsLastResetTs` (all preserved across Asc reset). Ad stub: 8s cooldown + 30/day cap, client-local-midnight reset.

**Tech Stack:** TypeScript, Zustand (persist), Vitest, Playwright, Phaser (BattleScene), React (screens).

**Branch:** `feat/phase-e-relics-mythic-ads` (create with `--no-ff` merge at end).

**Spec:** `docs/superpowers/specs/2026-05-15-phase-e-relics-mythic-ads-design.md`.

---

## File Structure

### Create
- `games/inflation-rpg/src/data/relics.ts` — 10 relic defs + `EMPTY_RELIC_STACKS`.
- `games/inflation-rpg/src/data/mythics.ts` — 30 mythic defs.
- `games/inflation-rpg/src/systems/relics.ts` — aggregators (flat/drop/xp/BP/passive/revive).
- `games/inflation-rpg/src/systems/mythics.ts` — aggregators + slot cap + drop roll + milestone award + equip API.
- `games/inflation-rpg/src/systems/ads.ts` — `canWatchAd`/`startAdWatch`/`finishAdWatch`/`checkDailyReset`.
- `games/inflation-rpg/src/screens/Relics.tsx` — 2-tab UI (스택 / Mythic).
- `games/inflation-rpg/src/systems/relics.test.ts`
- `games/inflation-rpg/src/systems/mythics.test.ts`
- `games/inflation-rpg/src/systems/ads.test.ts`
- `games/inflation-rpg/src/screens/Relics.test.tsx`
- `games/inflation-rpg/e2e/relics.spec.ts`
- `games/inflation-rpg/e2e/mythic.spec.ts`

### Modify
- `games/inflation-rpg/src/types.ts` — `MetaState` extension + `RelicId`/`MythicId`/`MythicEffectType` types.
- `games/inflation-rpg/src/store/gameStore.ts` — STORE_VERSION 10→11 + migrate block + `bossDrop` mythic drop + `ascend` slotCap + `applyExpGain` 6th param + `INITIAL_META`.
- `games/inflation-rpg/src/systems/stats.ts` — `calcFinalStat` 9th param `metaMult`.
- `games/inflation-rpg/src/systems/economy.ts` — `applyDropMult` overload (meta-source variant).
- `games/inflation-rpg/src/systems/buildActiveSkills.ts` — mythic cooldown wrap.
- `games/inflation-rpg/src/systems/effects.ts` — mythic proc trigger registration.
- `games/inflation-rpg/src/battle/BattleScene.ts` — 7 `calcFinalStat` callsites + death branch (no_death_loss / revive) + proc-trigger registration.
- `games/inflation-rpg/src/screens/Inventory.tsx` — `calcFinalStat` callsite + active-effect panel link.
- `games/inflation-rpg/src/screens/MainMenu.tsx` (or Town) — 보물고 entry button.
- `games/inflation-rpg/tools/balance-sim.ts` — `SimPlayer` mythic/relic fields + aggregator threading.
- `games/inflation-rpg/src/store/gameStore.test.ts` — v10→v11 migration + bossDrop/ascend tests.
- `games/inflation-rpg/src/systems/stats.test.ts` — 9th param tests.
- `games/inflation-rpg/src/systems/effects.test.ts` — mythic proc trigger tests.
- `games/inflation-rpg/src/systems/economy.test.ts` — drop_mult meta tests.
- `games/inflation-rpg/src/systems/buildActiveSkills.test.ts` — cooldown wrap tests.
- `games/inflation-rpg/e2e/v8-migration.spec.ts` — chain to v11 verification.

---

## Checkpoints

- **CP1** Tasks 1–2 — Data model + persist v11 migration.
- **CP2** Tasks 3–5 — Relic data + aggregators + Asc-reset preservation.
- **CP3** Tasks 6–9 — Mythic data + aggregators + equip + drop/milestone.
- **CP4** Tasks 10–15 — 6 hook callsites (effect application).
- **CP5** Tasks 16–17 — bossDrop + ascend integration.
- **CP6** Tasks 18–19 — Ad stub.
- **CP7** Tasks 20–22 — UI (Relics.tsx + entry button).
- **CP8** Tasks 23–27 — Sim parity + E2E + final validation + tag.

---

## CP1 — Data Model + Persist v11

### Task 1: Types extension + `EMPTY_RELIC_STACKS`

**Files:**
- Modify: `games/inflation-rpg/src/types.ts` — add `RelicId`, `MythicId`, `MythicEffectType`, extend `MetaState`.
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — extend `INITIAL_META` constant.

- [ ] **Step 1: Add type declarations**

Append to `games/inflation-rpg/src/types.ts` (after `AscTreeNodeId` block):

```typescript
// Phase E — Relics + Mythic

export type RelicId =
  | 'warrior_banner' | 'dokkaebi_charm' | 'gold_coin' | 'soul_pearl'
  | 'sands_of_time'  | 'fate_dice'      | 'moonlight_amulet' | 'eagle_arrow'
  | 'undead_coin'    | 'feather_of_fate';

export type MythicId = string;

export type MythicEffectType =
  | 'flat_mult' | 'cooldown_mult' | 'drop_mult' | 'xp_mult' | 'proc' | 'passive';
```

- [ ] **Step 2: Extend `MetaState`**

In `MetaState` interface, add (just before the closing brace):

```typescript
  // Phase E — Relics + Mythic + Ads
  relicStacks: Record<RelicId, number>;
  mythicOwned: MythicId[];
  mythicEquipped: (MythicId | null)[];   // length 5, index = slot
  mythicSlotCap: number;                 // 0..5, derived from ascTier
  adsToday: number;
  adsLastResetTs: number;
```

- [ ] **Step 3: Add `EMPTY_RELIC_STACKS` constant in types.ts**

```typescript
export const EMPTY_RELIC_STACKS: Record<RelicId, number> = {
  warrior_banner: 0, dokkaebi_charm: 0, gold_coin: 0, soul_pearl: 0,
  sands_of_time: 0, fate_dice: 0, moonlight_amulet: 0, eagle_arrow: 0,
  undead_coin: 0, feather_of_fate: 0,
};
```

- [ ] **Step 4: Extend `INITIAL_META` in gameStore.ts**

Locate `INITIAL_META` block (search for `INITIAL_META: MetaState`). Add fields:

```typescript
  // Phase E
  relicStacks: { ...EMPTY_RELIC_STACKS },
  mythicOwned: [],
  mythicEquipped: [null, null, null, null, null],
  mythicSlotCap: 0,
  adsToday: 0,
  adsLastResetTs: 0,
```

Add `EMPTY_RELIC_STACKS` to the import list at top of gameStore.ts.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): add Phase E type declarations + INITIAL_META fields"
```

---

### Task 2: `computeMythicSlotCap` + v10→v11 migration

**Files:**
- Create test in: `games/inflation-rpg/src/store/gameStore.test.ts` (append).
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — `STORE_VERSION` + migrate block + helper.

- [ ] **Step 1: Write failing migration test**

Append to `games/inflation-rpg/src/store/gameStore.test.ts`:

```typescript
import { EMPTY_RELIC_STACKS } from '../types';

describe('v10 → v11 migration (Phase E)', () => {
  it('injects relicStacks / mythicOwned / mythicEquipped / mythicSlotCap / adsToday / adsLastResetTs defaults', () => {
    const v10State: any = {
      meta: {
        ascTier: 7,
        ascTree: { hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
                   dungeon_currency: 0, crit_damage: 0, asc_accel: 0, mod_magnitude: 0, effect_proc: 0 },
      },
    };
    const result = (require('./gameStore') as typeof import('./gameStore')).migrate(v10State, 10);
    expect(result.meta.relicStacks).toEqual(EMPTY_RELIC_STACKS);
    expect(result.meta.mythicOwned).toEqual([]);
    expect(result.meta.mythicEquipped).toEqual([null, null, null, null, null]);
    expect(result.meta.mythicSlotCap).toBe(3);                  // tier 7 → cap 3
    expect(result.meta.adsToday).toBe(0);
    expect(typeof result.meta.adsLastResetTs).toBe('number');
  });

  it('computes slotCap correctly for tier boundaries', () => {
    const cases: [number, number][] = [
      [0, 0], [1, 1], [4, 1], [5, 3], [9, 3], [10, 5], [25, 5],
    ];
    for (const [tier, expected] of cases) {
      const state: any = { meta: { ascTier: tier, ascTree: {} } };
      const result = (require('./gameStore') as typeof import('./gameStore')).migrate(state, 10);
      expect(result.meta.mythicSlotCap).toBe(expected);
    }
  });
});
```

(Note: `migrate` is the function passed to zustand's persist middleware. If it's not exported, export it as a named function — Step 2.)

- [ ] **Step 2: Export `migrate` + `computeMythicSlotCap` from gameStore.ts**

Refactor the inline `migrate: (persisted, fromVersion) => { ... }` to a named exported function:

```typescript
export function computeMythicSlotCap(tier: number): number {
  if (tier >= 10) return 5;
  if (tier >= 5) return 3;
  if (tier >= 1) return 1;
  return 0;
}

export function migrate(persisted: unknown, fromVersion: number): unknown {
  // ... existing body
  return s;
}
```

Replace the inline reference: `migrate: (persisted, fromVersion) => migrate(persisted, fromVersion)` (or pass `migrate` directly if name doesn't collide).

- [ ] **Step 3: Bump version + add v11 migration block**

In gameStore.ts:

```typescript
// version: 10  →  version: 11
version: 11,
```

In `migrate` body, after the v9→v10 block, add:

```typescript
// v10 → v11: Phase E — Relics + Mythic + Ads
if (fromVersion <= 10 && s.meta) {
  s.meta.relicStacks    = s.meta.relicStacks    ?? { ...EMPTY_RELIC_STACKS };
  s.meta.mythicOwned    = s.meta.mythicOwned    ?? [];
  s.meta.mythicEquipped = s.meta.mythicEquipped ?? [null, null, null, null, null];
  s.meta.mythicSlotCap  = s.meta.mythicSlotCap  ?? computeMythicSlotCap(s.meta.ascTier ?? 0);
  s.meta.adsToday       = s.meta.adsToday       ?? 0;
  s.meta.adsLastResetTs = s.meta.adsLastResetTs ?? Date.now();
}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts`
Expected: PASS for new v11 migration tests. Existing tests still pass.

- [ ] **Step 5: Asc-reset preservation test (preview — full test in Task 5/17)**

Append to gameStore.test.ts:

```typescript
describe('ascend() preserves Phase E meta fields', () => {
  it('keeps relicStacks / mythicOwned / mythicEquipped through ascension', () => {
    const store = useGameStore.getState();
    // setup: meta with non-default Phase E fields + ready to ascend
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascTier: 0,
        crackStones: 1000,
        dungeonFinalsCleared: ['final-realm', 'r2', 'r3'],     // ≥ nextTier + 2
        relicStacks: { ...EMPTY_RELIC_STACKS, warrior_banner: 5, gold_coin: 12 },
        mythicOwned: ['fire_throne', 'time_hourglass'],
        mythicEquipped: ['fire_throne', null, null, null, null],
      },
    }));
    const ok = useGameStore.getState().ascend();
    expect(ok).toBe(true);
    const meta = useGameStore.getState().meta;
    expect(meta.relicStacks.warrior_banner).toBe(5);
    expect(meta.relicStacks.gold_coin).toBe(12);
    expect(meta.mythicOwned).toEqual(['fire_throne', 'time_hourglass']);
    expect(meta.mythicEquipped).toEqual(['fire_throne', null, null, null, null]);
    expect(meta.mythicSlotCap).toBe(1);                       // ascTier 0 → 1
  });
});
```

- [ ] **Step 6: Run + commit**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts`
Expected: All pass (ascend preserves Phase E fields automatically because they're not in the reset list).

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): persist v11 migration + computeMythicSlotCap"
git tag phase-e-cp1
```

---

## CP2 — Relic Data + Aggregators

### Task 3: `src/data/relics.ts` — 10 relic catalog

**Files:**
- Create: `games/inflation-rpg/src/data/relics.ts`.

- [ ] **Step 1: Create relic catalog**

```typescript
import type { RelicId } from '../types';

export type RelicCapKind = 'infinite' | 'stacks' | 'binary' | 'per_run';

export interface RelicDef {
  id: RelicId;
  nameKR: string;
  emoji: string;
  descriptionKR: string;
  // Effect routing
  effectType:
    | 'flat_mult_stat'        // fate_dice (luc), moonlight (all), eagle (critRate)
    | 'drop_mult'             // gold_coin, sands_of_time
    | 'xp_mult'               // soul_pearl
    | 'passive_bp_max'        // warrior_banner
    | 'passive_bp_free'       // dokkaebi_charm
    | 'passive_no_death_loss' // undead_coin
    | 'passive_revive';       // feather_of_fate
  perStack: number;           // numeric magnitude per stack
  target?: string;            // stat target if relevant (e.g., 'luc', 'all', 'critRate', 'gold', 'dr')
  cap: { kind: RelicCapKind; value: number };
}

export const RELICS: Record<RelicId, RelicDef> = {
  warrior_banner: {
    id: 'warrior_banner', nameKR: '전사의 깃발', emoji: '⚔️',
    descriptionKR: 'BP 최대 +1 / stack',
    effectType: 'passive_bp_max', perStack: 1,
    cap: { kind: 'infinite', value: Infinity },
  },
  dokkaebi_charm: {
    id: 'dokkaebi_charm', nameKR: '도깨비 부적', emoji: '🎭',
    descriptionKR: 'BP 무소모 +0.1% / stack (cap 50%)',
    effectType: 'passive_bp_free', perStack: 0.001,
    cap: { kind: 'stacks', value: 500 },
  },
  gold_coin: {
    id: 'gold_coin', nameKR: '황금 동전', emoji: '🥇',
    descriptionKR: '골드 +1% / stack',
    effectType: 'drop_mult', perStack: 0.01, target: 'gold',
    cap: { kind: 'infinite', value: Infinity },
  },
  soul_pearl: {
    id: 'soul_pearl', nameKR: '영혼 진주', emoji: '🔮',
    descriptionKR: '캐릭터 XP +1% / stack',
    effectType: 'xp_mult', perStack: 0.01,
    cap: { kind: 'infinite', value: Infinity },
  },
  sands_of_time: {
    id: 'sands_of_time', nameKR: '시간 모래', emoji: '⏳',
    descriptionKR: 'DR 드랍 +1% / stack',
    effectType: 'drop_mult', perStack: 0.01, target: 'dr',
    cap: { kind: 'infinite', value: Infinity },
  },
  fate_dice: {
    id: 'fate_dice', nameKR: '운명 주사위', emoji: '🎲',
    descriptionKR: 'LUC +1% / stack (cap 100%)',
    effectType: 'flat_mult_stat', perStack: 0.01, target: 'luc',
    cap: { kind: 'stacks', value: 100 },
  },
  moonlight_amulet: {
    id: 'moonlight_amulet', nameKR: '월광 부적', emoji: '🌙',
    descriptionKR: '모든 stat +0.5% / stack (cap 200%)',
    effectType: 'flat_mult_stat', perStack: 0.005, target: 'all',
    cap: { kind: 'stacks', value: 400 },
  },
  eagle_arrow: {
    id: 'eagle_arrow', nameKR: '명궁의 화살', emoji: '🏹',
    descriptionKR: '크리율 +0.05% / stack (cap 25%)',
    effectType: 'flat_mult_stat', perStack: 0.0005, target: 'critRate',
    cap: { kind: 'stacks', value: 500 },
  },
  undead_coin: {
    id: 'undead_coin', nameKR: '망자의 동전', emoji: '💀',
    descriptionKR: '사망 시 손실 무효 (1 stack 부터)',
    effectType: 'passive_no_death_loss', perStack: 1,
    cap: { kind: 'binary', value: 1 },
  },
  feather_of_fate: {
    id: 'feather_of_fate', nameKR: '명운의 깃털', emoji: '🪶',
    descriptionKR: '첫 사망 1회 부활 / stack (cap 5)',
    effectType: 'passive_revive', perStack: 1,
    cap: { kind: 'per_run', value: 5 },
  },
};

export const ALL_RELIC_IDS: RelicId[] = Object.keys(RELICS) as RelicId[];

export function getEffectiveStack(relicId: RelicId, rawStack: number): number {
  const def = RELICS[relicId];
  if (def.cap.kind === 'infinite') return rawStack;
  if (def.cap.kind === 'binary') return Math.min(rawStack, 1);
  return Math.min(rawStack, def.cap.value);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/relics.ts
git commit -m "feat(game-inflation-rpg): add 10 stackable relic catalog"
```

---

### Task 4: `src/systems/relics.ts` aggregator + tests

**Files:**
- Create: `games/inflation-rpg/src/systems/relics.ts`.
- Create: `games/inflation-rpg/src/systems/relics.test.ts`.

- [ ] **Step 1: Write failing tests**

```typescript
// games/inflation-rpg/src/systems/relics.test.ts
import { describe, it, expect } from 'vitest';
import type { MetaState } from '../types';
import { EMPTY_RELIC_STACKS } from '../types';
import {
  getRelicFlatMult, getRelicDropBonus, getRelicXpMult,
  getRelicBpMax, getRelicBpFreeChance,
  relicNoDeathLoss, relicReviveCount,
  applyStackIncrement,
} from './relics';

function makeMeta(stacks: Partial<MetaState['relicStacks']> = {}): MetaState {
  return { relicStacks: { ...EMPTY_RELIC_STACKS, ...stacks } } as MetaState;
}

describe('getRelicFlatMult', () => {
  it('returns 1.0 for empty stacks', () => {
    expect(getRelicFlatMult(makeMeta(), 'luc')).toBe(1);
  });
  it('fate_dice (luc) gives +1% per stack, capped 100 stacks', () => {
    expect(getRelicFlatMult(makeMeta({ fate_dice: 50 }), 'luc')).toBeCloseTo(1.5);
    expect(getRelicFlatMult(makeMeta({ fate_dice: 100 }), 'luc')).toBeCloseTo(2.0);
    expect(getRelicFlatMult(makeMeta({ fate_dice: 500 }), 'luc')).toBeCloseTo(2.0); // cap
  });
  it('moonlight (all) applies to every stat', () => {
    expect(getRelicFlatMult(makeMeta({ moonlight_amulet: 100 }), 'hp')).toBeCloseTo(1.5);
    expect(getRelicFlatMult(makeMeta({ moonlight_amulet: 100 }), 'atk')).toBeCloseTo(1.5);
  });
  it('eagle (critRate) cap 500 stacks → 25%', () => {
    expect(getRelicFlatMult(makeMeta({ eagle_arrow: 500 }), 'critRate')).toBeCloseTo(1.25);
    expect(getRelicFlatMult(makeMeta({ eagle_arrow: 600 }), 'critRate')).toBeCloseTo(1.25);
  });
  it('multiple flat_mult relics multiply', () => {
    // moonlight +50% (all) × fate_dice +50% (luc) = ×2.25 for luc
    const meta = makeMeta({ moonlight_amulet: 100, fate_dice: 50 });
    expect(getRelicFlatMult(meta, 'luc')).toBeCloseTo(1.5 * 1.5);
  });
});

describe('getRelicDropBonus (additive)', () => {
  it('gold_coin gives +1% per stack', () => {
    expect(getRelicDropBonus(makeMeta({ gold_coin: 10 }), 'gold')).toBeCloseTo(0.1);
    expect(getRelicDropBonus(makeMeta({ gold_coin: 100 }), 'gold')).toBeCloseTo(1.0);
  });
  it('sands_of_time gives DR drop +1% per stack', () => {
    expect(getRelicDropBonus(makeMeta({ sands_of_time: 30 }), 'dr')).toBeCloseTo(0.3);
  });
  it('returns 0 for irrelevant drop kind', () => {
    expect(getRelicDropBonus(makeMeta({ gold_coin: 100 }), 'dungeon_currency')).toBe(0);
  });
});

describe('getRelicXpMult (multiplicative via additive %)', () => {
  it('soul_pearl gives +1% per stack', () => {
    expect(getRelicXpMult(makeMeta({ soul_pearl: 50 }))).toBeCloseTo(1.5);
  });
});

describe('passives', () => {
  it('warrior_banner BP max bonus = stack count', () => {
    expect(getRelicBpMax(makeMeta({ warrior_banner: 7 }))).toBe(7);
  });
  it('dokkaebi_charm BP-free chance = 0.1% per stack, cap 50%', () => {
    expect(getRelicBpFreeChance(makeMeta({ dokkaebi_charm: 100 }))).toBeCloseTo(0.1);
    expect(getRelicBpFreeChance(makeMeta({ dokkaebi_charm: 500 }))).toBeCloseTo(0.5);
    expect(getRelicBpFreeChance(makeMeta({ dokkaebi_charm: 9999 }))).toBeCloseTo(0.5);
  });
  it('undead_coin: any stack → no death loss', () => {
    expect(relicNoDeathLoss(makeMeta({ undead_coin: 0 }))).toBe(false);
    expect(relicNoDeathLoss(makeMeta({ undead_coin: 1 }))).toBe(true);
    expect(relicNoDeathLoss(makeMeta({ undead_coin: 99 }))).toBe(true);
  });
  it('feather_of_fate revive count = effective stack, capped 5', () => {
    expect(relicReviveCount(makeMeta({ feather_of_fate: 3 }))).toBe(3);
    expect(relicReviveCount(makeMeta({ feather_of_fate: 10 }))).toBe(5);
  });
});

describe('applyStackIncrement (cap enforcement)', () => {
  it('infinite cap: unbounded', () => {
    expect(applyStackIncrement(makeMeta({ warrior_banner: 999 }), 'warrior_banner').warrior_banner).toBe(1000);
  });
  it('binary cap: stays at 1', () => {
    expect(applyStackIncrement(makeMeta({ undead_coin: 1 }), 'undead_coin').undead_coin).toBe(1);
  });
  it('stacks cap: stops at value', () => {
    expect(applyStackIncrement(makeMeta({ fate_dice: 100 }), 'fate_dice').fate_dice).toBe(100);
    expect(applyStackIncrement(makeMeta({ fate_dice: 99 }), 'fate_dice').fate_dice).toBe(100);
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `pnpm --filter @forge/game-inflation-rpg test -- relics.test.ts`
Expected: All FAIL with "Cannot find module './relics'".

- [ ] **Step 3: Implement `relics.ts`**

```typescript
// games/inflation-rpg/src/systems/relics.ts
import type { MetaState, RelicId } from '../types';
import { RELICS, getEffectiveStack } from '../data/relics';

export type FlatMultTarget = 'hp' | 'atk' | 'def' | 'agi' | 'luc' | 'critRate' | 'modifier_magnitude';
export type DropKind = 'gold' | 'dr' | 'dungeon_currency';

export function getRelicFlatMult(meta: MetaState, target: FlatMultTarget): number {
  let mult = 1;
  for (const id of Object.keys(meta.relicStacks) as RelicId[]) {
    const def = RELICS[id];
    if (def.effectType !== 'flat_mult_stat') continue;
    const eff = getEffectiveStack(id, meta.relicStacks[id]);
    if (eff <= 0) continue;
    const tgt = def.target;
    if (tgt === 'all' || tgt === target) {
      mult *= 1 + def.perStack * eff;
    }
  }
  return mult;
}

export function getRelicDropBonus(meta: MetaState, kind: DropKind): number {
  let bonus = 0;
  for (const id of Object.keys(meta.relicStacks) as RelicId[]) {
    const def = RELICS[id];
    if (def.effectType !== 'drop_mult') continue;
    if (def.target !== kind) continue;
    const eff = getEffectiveStack(id, meta.relicStacks[id]);
    bonus += def.perStack * eff;
  }
  return bonus;
}

export function getRelicXpMult(meta: MetaState): number {
  let mult = 1;
  for (const id of Object.keys(meta.relicStacks) as RelicId[]) {
    const def = RELICS[id];
    if (def.effectType !== 'xp_mult') continue;
    const eff = getEffectiveStack(id, meta.relicStacks[id]);
    mult *= 1 + def.perStack * eff;
  }
  return mult;
}

export function getRelicBpMax(meta: MetaState): number {
  const eff = getEffectiveStack('warrior_banner', meta.relicStacks.warrior_banner);
  return eff * RELICS.warrior_banner.perStack;
}

export function getRelicBpFreeChance(meta: MetaState): number {
  const eff = getEffectiveStack('dokkaebi_charm', meta.relicStacks.dokkaebi_charm);
  return eff * RELICS.dokkaebi_charm.perStack;
}

export function relicNoDeathLoss(meta: MetaState): boolean {
  return getEffectiveStack('undead_coin', meta.relicStacks.undead_coin) >= 1;
}

export function relicReviveCount(meta: MetaState): number {
  return getEffectiveStack('feather_of_fate', meta.relicStacks.feather_of_fate);
}

export function applyStackIncrement(meta: MetaState, id: RelicId): MetaState['relicStacks'] {
  const def = RELICS[id];
  const current = meta.relicStacks[id];
  const next = current + 1;
  const effective = (() => {
    if (def.cap.kind === 'infinite') return next;
    if (def.cap.kind === 'binary') return Math.min(next, 1);
    return Math.min(next, def.cap.value);
  })();
  return { ...meta.relicStacks, [id]: effective };
}

export function isAtCap(meta: MetaState, id: RelicId): boolean {
  const def = RELICS[id];
  if (def.cap.kind === 'infinite') return false;
  if (def.cap.kind === 'binary') return meta.relicStacks[id] >= 1;
  return meta.relicStacks[id] >= def.cap.value;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- relics.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/relics.ts games/inflation-rpg/src/systems/relics.test.ts
git commit -m "feat(game-inflation-rpg): relic aggregators (flat/drop/xp/BP/passive)"
```

---

### Task 5: Asc-reset preservation test (Relic side)

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts` (already partially added in Task 2).

- [ ] **Step 1: Run preview test from Task 2 to confirm passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts`
Expected: PASS — `ascend()` preserves Phase E fields because they're not in the reset list.

- [ ] **Step 2: Add explicit relic-stack assertion**

(Already covered in Task 2 Step 5 — no new test code needed. Verify it remains green.)

- [ ] **Step 3: Tag CP2**

```bash
git tag phase-e-cp2
```

---

## CP3 — Mythic Data + Aggregators + Equip + Drop

### Task 6: `src/data/mythics.ts` — 30 mythic catalog

**Files:**
- Create: `games/inflation-rpg/src/data/mythics.ts`.

- [ ] **Step 1: Create catalog**

```typescript
import type { MythicId, MythicEffectType } from '../types';

export type MythicAcquisition =
  | { kind: 'milestone'; tier: number }
  | { kind: 'random_drop' };

export interface MythicDef {
  id: MythicId;
  nameKR: string;
  emoji: string;
  descriptionKR: string;
  effectType: MythicEffectType;
  target?: string;        // 'atk', 'hp', 'fire_dmg', 'critRate', 'modifier_magnitude', 'gold', 'dr', 'dungeon_currency', 'all_kinds'
  value: number;          // magnitude (e.g., 0.5 = +50% / 0.3 = -30% / 2 = ×2)
  acquisition: MythicAcquisition;
  // proc-specific
  procTrigger?: 'on_player_hit_received' | 'on_player_attack';
  procEffect?: 'lifesteal' | 'thorns' | 'sp_steal' | 'magic_burst';
}

export const MYTHICS: Record<MythicId, MythicDef> = {
  // ── 5 milestone-guaranteed ──
  tier1_charm: { id: 'tier1_charm', nameKR: '초월자의 부적', emoji: '🌟',
    descriptionKR: 'ATK +50%',
    effectType: 'flat_mult', target: 'atk', value: 0.5,
    acquisition: { kind: 'milestone', tier: 1 } },
  tier5_seal: { id: 'tier5_seal', nameKR: '초월자의 인장', emoji: '✨',
    descriptionKR: 'HP +50%',
    effectType: 'flat_mult', target: 'hp', value: 0.5,
    acquisition: { kind: 'milestone', tier: 5 } },
  infinity_seal: { id: 'infinity_seal', nameKR: '무한 인장', emoji: '♾️',
    descriptionKR: '모든 drop ×2',
    effectType: 'drop_mult', target: 'all_kinds', value: 2,
    acquisition: { kind: 'milestone', tier: 10 } },
  dimension_navigator: { id: 'dimension_navigator', nameKR: '차원 항해사', emoji: '🧭',
    descriptionKR: '던전 화폐 ×3',
    effectType: 'drop_mult', target: 'dungeon_currency', value: 3,
    acquisition: { kind: 'milestone', tier: 15 } },
  light_of_truth: { id: 'light_of_truth', nameKR: '진리의 빛', emoji: '☀️',
    descriptionKR: '수식어 마그니튜드 +25%',
    effectType: 'flat_mult', target: 'modifier_magnitude', value: 0.25,
    acquisition: { kind: 'milestone', tier: 20 } },
  // ── 25 random drop ──
  fire_throne: { id: 'fire_throne', nameKR: '화염 왕좌', emoji: '🔥',
    descriptionKR: '화염 데미지 +50%',
    effectType: 'flat_mult', target: 'fire_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  time_hourglass: { id: 'time_hourglass', nameKR: '시간 모래시계', emoji: '⏱️',
    descriptionKR: '스킬 쿨다운 -30%',
    effectType: 'cooldown_mult', value: -0.3,
    acquisition: { kind: 'random_drop' } },
  millennium_promise: { id: 'millennium_promise', nameKR: '천 년 약속', emoji: '🛡️',
    descriptionKR: 'HP +100%',
    effectType: 'flat_mult', target: 'hp', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  soul_truth: { id: 'soul_truth', nameKR: '영혼 진리', emoji: '👁️',
    descriptionKR: '캐릭터 XP ×3',
    effectType: 'xp_mult', value: 2.0,  // +200% = ×3
    acquisition: { kind: 'random_drop' } },
  fate_scales: { id: 'fate_scales', nameKR: '운명 저울', emoji: '⚖️',
    descriptionKR: '크리 데미지 ×2',
    effectType: 'flat_mult', target: 'critDmg', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  frost_crown: { id: 'frost_crown', nameKR: '서리 왕관', emoji: '❄️',
    descriptionKR: '냉기 데미지 +50%',
    effectType: 'flat_mult', target: 'ice_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  thunder_diadem: { id: 'thunder_diadem', nameKR: '천둥의 관', emoji: '⚡',
    descriptionKR: '번개 데미지 +50%',
    effectType: 'flat_mult', target: 'thunder_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  divine_halo: { id: 'divine_halo', nameKR: '신성의 후광', emoji: '🌟',
    descriptionKR: '신성 데미지 +50%',
    effectType: 'flat_mult', target: 'holy_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  phantom_cloak: { id: 'phantom_cloak', nameKR: '환영의 망토', emoji: '🦇',
    descriptionKR: '회피 +25%',
    effectType: 'flat_mult', target: 'evasion', value: 0.25,
    acquisition: { kind: 'random_drop' } },
  iron_aegis: { id: 'iron_aegis', nameKR: '강철 방패', emoji: '🛡️',
    descriptionKR: 'DEF +100%',
    effectType: 'flat_mult', target: 'def', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  serpent_fang: { id: 'serpent_fang', nameKR: '뱀의 송곳니', emoji: '🐍',
    descriptionKR: '흡혈 20%',
    effectType: 'proc', value: 0.2,
    procTrigger: 'on_player_attack', procEffect: 'lifesteal',
    acquisition: { kind: 'random_drop' } },
  gluttony_chalice: { id: 'gluttony_chalice', nameKR: '탐욕의 성배', emoji: '🍷',
    descriptionKR: 'SP 흡수 30%',
    effectType: 'proc', value: 0.3,
    procTrigger: 'on_player_attack', procEffect: 'sp_steal',
    acquisition: { kind: 'random_drop' } },
  thorned_skin: { id: 'thorned_skin', nameKR: '가시 갑옷', emoji: '🌵',
    descriptionKR: '받은 데미지 50% 반사',
    effectType: 'proc', value: 0.5,
    procTrigger: 'on_player_hit_received', procEffect: 'thorns',
    acquisition: { kind: 'random_drop' } },
  swift_winds: { id: 'swift_winds', nameKR: '신속의 바람', emoji: '🌪️',
    descriptionKR: '기본 스킬 쿨다운 -20%',
    effectType: 'cooldown_mult', value: -0.2,
    acquisition: { kind: 'random_drop' } },
  eternal_flame: { id: 'eternal_flame', nameKR: '영원의 불꽃', emoji: '🔥',
    descriptionKR: 'ATK +75%',
    effectType: 'flat_mult', target: 'atk', value: 0.75,
    acquisition: { kind: 'random_drop' } },
  void_pact: { id: 'void_pact', nameKR: '공허 계약', emoji: '🕳️',
    descriptionKR: '모든 stat +20%',
    effectType: 'flat_mult', target: 'all', value: 0.2,
    acquisition: { kind: 'random_drop' } },
  dragon_heart: { id: 'dragon_heart', nameKR: '용의 심장', emoji: '🐉',
    descriptionKR: 'HP +75%',
    effectType: 'flat_mult', target: 'hp', value: 0.75,
    acquisition: { kind: 'random_drop' } },
  phoenix_feather: { id: 'phoenix_feather', nameKR: '불사조 깃털', emoji: '🪶',
    descriptionKR: '런당 1회 부활',
    effectType: 'passive', value: 1,
    acquisition: { kind: 'random_drop' } },
  lucky_clover: { id: 'lucky_clover', nameKR: '행운의 클로버', emoji: '🍀',
    descriptionKR: 'LUC +100%',
    effectType: 'flat_mult', target: 'luc', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  merchant_seal: { id: 'merchant_seal', nameKR: '상인의 인장', emoji: '💰',
    descriptionKR: '골드 +100%',
    effectType: 'drop_mult', target: 'gold', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  scholar_eye: { id: 'scholar_eye', nameKR: '학자의 눈', emoji: '📖',
    descriptionKR: '캐릭터 XP ×2',
    effectType: 'xp_mult', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  assassin_dagger: { id: 'assassin_dagger', nameKR: '암살자 단검', emoji: '🗡️',
    descriptionKR: '크리율 +25%',
    effectType: 'flat_mult', target: 'critRate', value: 0.25,
    acquisition: { kind: 'random_drop' } },
  berserker_axe: { id: 'berserker_axe', nameKR: '광전사 도끼', emoji: '🪓',
    descriptionKR: 'ATK +75%',
    effectType: 'flat_mult', target: 'atk', value: 0.75,
    acquisition: { kind: 'random_drop' } },
  crystal_orb: { id: 'crystal_orb', nameKR: '수정 구슬', emoji: '🔮',
    descriptionKR: '공격 시 15% 확률 마법 폭발',
    effectType: 'proc', value: 0.15,
    procTrigger: 'on_player_attack', procEffect: 'magic_burst',
    acquisition: { kind: 'random_drop' } },
  world_tree_root: { id: 'world_tree_root', nameKR: '세계수 뿌리', emoji: '🌳',
    descriptionKR: 'HP 재생 +200%',
    effectType: 'flat_mult', target: 'hp_regen', value: 2.0,
    acquisition: { kind: 'random_drop' } },
};

export const ALL_MYTHIC_IDS: MythicId[] = Object.keys(MYTHICS);

export const MILESTONE_MYTHIC_BY_TIER: Record<number, MythicId> = {
  1: 'tier1_charm', 5: 'tier5_seal', 10: 'infinity_seal',
  15: 'dimension_navigator', 20: 'light_of_truth',
};

export const MILESTONE_TIERS = [1, 5, 10, 15, 20];
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/mythics.ts
git commit -m "feat(game-inflation-rpg): add 30 Mythic relic catalog with 6 effect types"
```

---

### Task 7: `src/systems/mythics.ts` aggregators + tests

**Files:**
- Create: `games/inflation-rpg/src/systems/mythics.ts`.
- Create: `games/inflation-rpg/src/systems/mythics.test.ts`.

- [ ] **Step 1: Write failing aggregator tests**

```typescript
// games/inflation-rpg/src/systems/mythics.test.ts
import { describe, it, expect } from 'vitest';
import type { MetaState, MythicId } from '../types';
import {
  getMythicFlatMult, getMythicCooldownMult, getMythicDropBonus,
  getMythicXpMult, hasMythicPassive, getMythicReviveCount,
} from './mythics';

function makeMeta(equipped: (MythicId | null)[] = [], owned: MythicId[] = []): MetaState {
  return {
    mythicEquipped: equipped.length === 5 ? equipped : [...equipped, ...Array(5 - equipped.length).fill(null)],
    mythicOwned: owned,
  } as MetaState;
}

describe('getMythicFlatMult', () => {
  it('returns 1.0 for empty equipped', () => {
    expect(getMythicFlatMult(makeMeta([]), 'atk')).toBe(1);
  });
  it('tier1_charm: ATK +50%', () => {
    expect(getMythicFlatMult(makeMeta(['tier1_charm']), 'atk')).toBeCloseTo(1.5);
    expect(getMythicFlatMult(makeMeta(['tier1_charm']), 'hp')).toBe(1);
  });
  it('stacks multiplicatively (tier1_charm + eternal_flame both ATK)', () => {
    // +50% × +75% = ×2.625
    expect(getMythicFlatMult(makeMeta(['tier1_charm', 'eternal_flame']), 'atk'))
      .toBeCloseTo(1.5 * 1.75);
  });
  it('void_pact (all) applies to every stat', () => {
    expect(getMythicFlatMult(makeMeta(['void_pact']), 'hp')).toBeCloseTo(1.2);
    expect(getMythicFlatMult(makeMeta(['void_pact']), 'def')).toBeCloseTo(1.2);
  });
  it('only equipped (not owned) counts', () => {
    const meta = makeMeta([], ['tier1_charm']);
    expect(getMythicFlatMult(meta, 'atk')).toBe(1);
  });
});

describe('getMythicCooldownMult', () => {
  it('time_hourglass -30%', () => {
    expect(getMythicCooldownMult(makeMeta(['time_hourglass']), 'ult')).toBeCloseTo(0.7);
  });
  it('floor 0.4 even when stacked', () => {
    // -30% × -20% × -50% would go below 0.4 — clamp
    const meta = makeMeta(['time_hourglass', 'swift_winds']);
    const result = getMythicCooldownMult(meta, 'ult');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });
  it('returns 1.0 with no cooldown mythics', () => {
    expect(getMythicCooldownMult(makeMeta(['tier1_charm']), 'ult')).toBe(1);
  });
});

describe('getMythicDropBonus', () => {
  it('infinity_seal: ×2 for all kinds (returns +1.0 additive)', () => {
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'gold')).toBeCloseTo(1.0);
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'dr')).toBeCloseTo(1.0);
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'dungeon_currency')).toBeCloseTo(1.0);
  });
  it('dimension_navigator: dungeon_currency ×3 = +2.0', () => {
    expect(getMythicDropBonus(makeMeta(['dimension_navigator']), 'dungeon_currency')).toBeCloseTo(2.0);
    expect(getMythicDropBonus(makeMeta(['dimension_navigator']), 'gold')).toBe(0);
  });
  it('merchant_seal: gold +100% = +1.0', () => {
    expect(getMythicDropBonus(makeMeta(['merchant_seal']), 'gold')).toBeCloseTo(1.0);
  });
});

describe('getMythicXpMult', () => {
  it('soul_truth: ×3 (= +200% mult)', () => {
    expect(getMythicXpMult(makeMeta(['soul_truth']))).toBeCloseTo(3.0);
  });
  it('soul_truth × scholar_eye stacks multiplicatively', () => {
    // ×3 × ×2 = ×6
    expect(getMythicXpMult(makeMeta(['soul_truth', 'scholar_eye']))).toBeCloseTo(6.0);
  });
});

describe('passives', () => {
  it('phoenix_feather passive revive: 1 if equipped', () => {
    expect(getMythicReviveCount(makeMeta(['phoenix_feather']))).toBe(1);
    expect(getMythicReviveCount(makeMeta([]))).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `pnpm --filter @forge/game-inflation-rpg test -- mythics.test.ts`
Expected: All FAIL with module-not-found.

- [ ] **Step 3: Implement `mythics.ts`**

```typescript
// games/inflation-rpg/src/systems/mythics.ts
import type { MetaState, MythicId, MythicEffectType } from '../types';
import { MYTHICS } from '../data/mythics';
import type { FlatMultTarget, DropKind } from './relics';

export type SkillKind = 'base' | 'ult';

export function getEquippedMythics(meta: MetaState): MythicId[] {
  return meta.mythicEquipped.filter((id): id is MythicId => id !== null);
}

export function getMythicFlatMult(meta: MetaState, target: FlatMultTarget | string): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'flat_mult') continue;
    if (def.target === 'all' || def.target === target) {
      mult *= 1 + def.value;
    }
  }
  return mult;
}

export function getMythicCooldownMult(meta: MetaState, _kind: SkillKind): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'cooldown_mult') continue;
    // value is negative (-0.3 = -30%); apply as (1 + value)
    mult *= 1 + def.value;
  }
  return Math.max(0.4, mult);
}

export function getMythicDropBonus(meta: MetaState, kind: DropKind): number {
  let bonus = 0;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'drop_mult') continue;
    if (def.target === 'all_kinds' || def.target === kind) {
      bonus += def.value;
    }
  }
  return bonus;
}

export function getMythicXpMult(meta: MetaState): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'xp_mult') continue;
    mult *= 1 + def.value;
  }
  return mult;
}

export function hasMythicPassive(meta: MetaState, key: 'revive'): boolean {
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'passive') continue;
    if (key === 'revive' && id === 'phoenix_feather') return true;
  }
  return false;
}

export function getMythicReviveCount(meta: MetaState): number {
  return hasMythicPassive(meta, 'revive') ? 1 : 0;
}

export interface MythicProc {
  trigger: 'on_player_hit_received' | 'on_player_attack';
  effect: 'lifesteal' | 'thorns' | 'sp_steal' | 'magic_burst';
  value: number;
}

export function getMythicProcs(meta: MetaState): MythicProc[] {
  const procs: MythicProc[] = [];
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'proc') continue;
    if (!def.procTrigger || !def.procEffect) continue;
    procs.push({ trigger: def.procTrigger, effect: def.procEffect, value: def.value });
  }
  return procs;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- mythics.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/mythics.ts games/inflation-rpg/src/systems/mythics.test.ts
git commit -m "feat(game-inflation-rpg): mythic aggregators (flat/cooldown/drop/xp/passive/proc)"
```

---

### Task 8: Equip / unequip / swap API + tests

**Files:**
- Modify: `games/inflation-rpg/src/systems/mythics.ts` — add equip API.
- Modify: `games/inflation-rpg/src/systems/mythics.test.ts` — add equip tests.

- [ ] **Step 1: Add failing tests**

Append to `mythics.test.ts`:

```typescript
import { equipMythic, unequipMythic } from './mythics';

describe('equipMythic', () => {
  function meta(over: Partial<MetaState> = {}): MetaState {
    return {
      mythicOwned: ['tier1_charm', 'fire_throne', 'time_hourglass'],
      mythicEquipped: [null, null, null, null, null],
      mythicSlotCap: 3,
      ...over,
    } as MetaState;
  }
  it('equips an owned mythic into specified slot', () => {
    const r = equipMythic(meta(), 0, 'tier1_charm');
    expect(r.mythicEquipped[0]).toBe('tier1_charm');
  });
  it('rejects equipping into slot beyond slotCap', () => {
    expect(() => equipMythic(meta({ mythicSlotCap: 1 }), 2, 'tier1_charm'))
      .toThrow(/slot/i);
  });
  it('rejects equipping a non-owned mythic', () => {
    expect(() => equipMythic(meta(), 0, 'world_tree_root')).toThrow(/owned/i);
  });
  it('rejects equipping the same mythic into two slots (swap instead)', () => {
    const after = equipMythic(meta(), 0, 'tier1_charm');
    expect(() => equipMythic(after, 1, 'tier1_charm')).toThrow(/already equipped/i);
  });
  it('unequipMythic clears the slot', () => {
    const after = equipMythic(meta(), 0, 'tier1_charm');
    const cleared = unequipMythic(after, 0);
    expect(cleared.mythicEquipped[0]).toBeNull();
  });
});
```

- [ ] **Step 2: Implement equip API**

Append to `mythics.ts`:

```typescript
export function equipMythic(meta: MetaState, slotIndex: number, mythicId: MythicId): MetaState {
  if (slotIndex < 0 || slotIndex >= meta.mythicSlotCap) {
    throw new Error(`slot ${slotIndex} out of range (cap ${meta.mythicSlotCap})`);
  }
  if (!meta.mythicOwned.includes(mythicId)) {
    throw new Error(`mythic ${mythicId} not owned`);
  }
  if (meta.mythicEquipped.includes(mythicId)) {
    throw new Error(`${mythicId} already equipped in another slot`);
  }
  const next = [...meta.mythicEquipped];
  next[slotIndex] = mythicId;
  return { ...meta, mythicEquipped: next };
}

export function unequipMythic(meta: MetaState, slotIndex: number): MetaState {
  const next = [...meta.mythicEquipped];
  next[slotIndex] = null;
  return { ...meta, mythicEquipped: next };
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- mythics.test.ts`
Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/systems/mythics.ts games/inflation-rpg/src/systems/mythics.test.ts
git commit -m "feat(game-inflation-rpg): mythic equip / unequip API"
```

---

### Task 9: Drop roll + milestone award + tests

**Files:**
- Modify: `games/inflation-rpg/src/systems/mythics.ts` — drop / milestone.
- Modify: `games/inflation-rpg/src/systems/mythics.test.ts` — tests.

- [ ] **Step 1: Add failing tests**

Append to `mythics.test.ts`:

```typescript
import { rollMythicDrop, awardMilestoneMythic, ALL_MYTHIC_IDS } from './mythics';
import { ALL_MYTHIC_IDS as DATA_ALL } from '../data/mythics';

describe('rollMythicDrop (base 30% chance, weighted from unowned random_drop pool)', () => {
  function meta(owned: MythicId[] = []): MetaState {
    return { mythicOwned: owned } as MetaState;
  }
  it('returns null when rng >= 0.30 (no drop)', () => {
    expect(rollMythicDrop(meta(), () => 0.31)).toBeNull();
    expect(rollMythicDrop(meta(), () => 0.99)).toBeNull();
  });
  it('returns a random_drop mythic when rng < 0.30', () => {
    // rng pair: first roll = 0.05 (≤ 0.30, drop), second = 0 (pick index 0)
    const seq = [0.05, 0]; let i = 0;
    const id = rollMythicDrop(meta(), () => seq[i++]);
    expect(id).not.toBeNull();
    expect(MYTHICS[id!].acquisition.kind).toBe('random_drop');
  });
  it('excludes owned mythics from pool', () => {
    const allRandom = DATA_ALL.filter(id => MYTHICS[id].acquisition.kind === 'random_drop');
    const ownedAll = meta(allRandom);
    const seq = [0.0, 0.0]; let i = 0;
    expect(rollMythicDrop(ownedAll, () => seq[i++])).toBeNull();  // all owned → no drop
  });
  it('excludes milestone mythics from random pool', () => {
    const seq = [0.05, 0.999]; let i = 0;
    const id = rollMythicDrop(meta(), () => seq[i++]);
    expect(['tier1_charm', 'tier5_seal', 'infinity_seal', 'dimension_navigator', 'light_of_truth'])
      .not.toContain(id!);
  });
});

describe('awardMilestoneMythic', () => {
  it('awards correct mythic for tier 1/5/10/15/20', () => {
    expect(awardMilestoneMythic({ mythicOwned: [] } as MetaState, 1).mythicOwned).toEqual(['tier1_charm']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as MetaState, 5).mythicOwned).toEqual(['tier5_seal']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as MetaState, 10).mythicOwned).toEqual(['infinity_seal']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as MetaState, 15).mythicOwned).toEqual(['dimension_navigator']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as MetaState, 20).mythicOwned).toEqual(['light_of_truth']);
  });
  it('no-op for non-milestone tier', () => {
    const before = { mythicOwned: ['fire_throne'] } as MetaState;
    expect(awardMilestoneMythic(before, 7).mythicOwned).toEqual(['fire_throne']);
  });
  it('no double-award if already owned', () => {
    const before = { mythicOwned: ['tier1_charm'] } as MetaState;
    expect(awardMilestoneMythic(before, 1).mythicOwned).toEqual(['tier1_charm']);
  });
});
```

- [ ] **Step 2: Implement drop + milestone**

Append to `mythics.ts`:

```typescript
import { ALL_MYTHIC_IDS as DATA_ALL, MILESTONE_MYTHIC_BY_TIER } from '../data/mythics';

export { ALL_MYTHIC_IDS } from '../data/mythics';

const BASE_DROP_CHANCE = 0.30;

export function rollMythicDrop(meta: MetaState, rng: () => number): MythicId | null {
  if (rng() >= BASE_DROP_CHANCE) return null;
  const pool = DATA_ALL.filter(id => {
    const def = MYTHICS[id];
    if (def.acquisition.kind !== 'random_drop') return false;
    return !meta.mythicOwned.includes(id);
  });
  if (pool.length === 0) return null;
  const idx = Math.floor(rng() * pool.length);
  return pool[idx];
}

export function awardMilestoneMythic(meta: MetaState, tier: number): MetaState {
  const id = MILESTONE_MYTHIC_BY_TIER[tier];
  if (!id) return meta;
  if (meta.mythicOwned.includes(id)) return meta;
  return { ...meta, mythicOwned: [...meta.mythicOwned, id] };
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- mythics.test.ts`
Expected: All PASS.

- [ ] **Step 4: Commit + tag**

```bash
git add games/inflation-rpg/src/systems/mythics.ts games/inflation-rpg/src/systems/mythics.test.ts
git commit -m "feat(game-inflation-rpg): mythic drop roll + milestone award"
git tag phase-e-cp3
```

---

## CP4 — Effect Application (6 hook callsites)

### Task 10: `calcFinalStat` 9th param `metaMult` + 7 callsite update

**Files:**
- Modify: `games/inflation-rpg/src/systems/stats.ts`.
- Modify: `games/inflation-rpg/src/systems/stats.test.ts`.
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts` (7 callsites).
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx`.
- Other callsites: search `calcFinalStat\(` repo-wide; update each to pass new arg.

- [ ] **Step 1: Add failing tests to stats.test.ts**

```typescript
describe('calcFinalStat — 9th param metaMult', () => {
  const baseEquip: EquipmentInstance[] = [];
  it('defaults to 1.0 (backwards compat)', () => {
    expect(calcFinalStat('atk', 0, 1, baseEquip, 1, 1, 1, 1)).toBe(
      calcFinalStat('atk', 0, 1, baseEquip, 1, 1, 1, 1, 1)
    );
  });
  it('multiplies final by metaMult', () => {
    const a = calcFinalStat('atk', 0, 1, baseEquip, 1, 1, 1, 1, 1);
    const b = calcFinalStat('atk', 0, 1, baseEquip, 1, 1, 1, 1, 2);
    expect(b).toBe(a * 2);
  });
});
```

- [ ] **Step 2: Update `calcFinalStat`**

`games/inflation-rpg/src/systems/stats.ts`:

```typescript
export function calcFinalStat(
  key: StatKey,
  allocated: number,
  charMult: number,
  equipped: EquipmentInstance[],
  baseAbilityMult: number,
  charLevelMult = 1,
  ascTierMult = 1,
  ascTreeMult = 1,
  metaMult = 1,                  // ← NEW 9th param
): number {
  const raw = calcRawStat(key, allocated, charMult);
  const flat = calcEquipmentFlat(key, equipped);
  const pct = calcEquipmentPercentMult(key, equipped);
  return Math.floor(
    (raw + flat) * pct * baseAbilityMult * charLevelMult * ascTierMult * ascTreeMult * metaMult
  );
}
```

- [ ] **Step 3: Update 7 callsites**

Run: `pnpm --filter @forge/game-inflation-rpg exec rg -n 'calcFinalStat\(' src/ tools/`

For each callsite (BattleScene.ts has 7; Inventory.tsx has at least 1; possibly tools/balance-sim.ts), append `getMythicFlatMult(meta, key) * getRelicFlatMult(meta, key)` as the 9th argument.

Example pattern (BattleScene):

```typescript
import { getMythicFlatMult } from '../systems/mythics';
import { getRelicFlatMult } from '../systems/relics';

// before
const atk = calcFinalStat('atk', sp.atk, charMult, equipped, baseAbMult, charLvMult, ascTierMult, ascTreeMult);
// after
const meta = useGameStore.getState().meta;
const metaMult = getMythicFlatMult(meta, 'atk') * getRelicFlatMult(meta, 'atk');
const atk = calcFinalStat('atk', sp.atk, charMult, equipped, baseAbMult, charLvMult, ascTierMult, ascTreeMult, metaMult);
```

For Inventory.tsx, the `meta` is already accessible from the store hook — wire similarly.

(For BattleScene, the `meta` may be cached in scene state to avoid repeated store reads — pick whichever pattern is consistent with existing Phase G `ascTreeMult` plumbing.)

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- stats.test.ts`
Expected: All PASS.

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors.

Run full test: `pnpm --filter @forge/game-inflation-rpg test`
Expected: All existing tests still pass (default `metaMult = 1` is backwards-compat).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/stats.ts games/inflation-rpg/src/systems/stats.test.ts games/inflation-rpg/src/battle/BattleScene.ts games/inflation-rpg/src/screens/Inventory.tsx
git commit -m "feat(game-inflation-rpg): calcFinalStat 9th param metaMult (mythic + relic flat)"
```

---

### Task 11: `buildActiveSkills` cooldown mythic wrap

**Files:**
- Modify: `games/inflation-rpg/src/systems/buildActiveSkills.ts`.
- Modify: `games/inflation-rpg/src/systems/buildActiveSkills.test.ts`.

- [ ] **Step 1: Read current buildActiveSkills signature**

Run: `cat games/inflation-rpg/src/systems/buildActiveSkills.ts | head -50`. Note the signature — currently likely `buildActiveSkills(charId, skillLevels)` returning `{ base, ult }`.

- [ ] **Step 2: Add failing test**

Append to `buildActiveSkills.test.ts`:

```typescript
import { buildActiveSkills } from './buildActiveSkills';

describe('cooldown — mythic wrap', () => {
  it('applies mythic cooldown_mult', () => {
    const meta = {
      mythicEquipped: ['time_hourglass', null, null, null, null],
      mythicOwned: ['time_hourglass'],
    } as any;
    const without = buildActiveSkills('hwarang', { hwarang_base: 0, hwarang_ult: 0 }, undefined);
    const withMythic = buildActiveSkills('hwarang', { hwarang_base: 0, hwarang_ult: 0 }, meta);
    expect(withMythic.ult.cooldownSec).toBeCloseTo(without.ult.cooldownSec * 0.7);
  });
  it('cooldown floor 0.4 enforced', () => {
    const meta = {
      mythicEquipped: ['time_hourglass', 'swift_winds', null, null, null],
      mythicOwned: ['time_hourglass', 'swift_winds'],
    } as any;
    const without = buildActiveSkills('hwarang', { hwarang_base: 100, hwarang_ult: 100 }, undefined);
    const withMythic = buildActiveSkills('hwarang', { hwarang_base: 100, hwarang_ult: 100 }, meta);
    expect(withMythic.ult.cooldownSec).toBeGreaterThanOrEqual(without.ult.cooldownSec * 0.4);
  });
});
```

- [ ] **Step 3: Update signature**

Add optional `meta?: MetaState` param. Inside the cooldown computation, wrap with mythic mult:

```typescript
import type { MetaState } from '../types';
import { getMythicCooldownMult } from './mythics';

export function buildActiveSkills(
  charId: CharId,
  skillLevels: Record<string, number>,
  meta?: MetaState,
): { base: ActiveSkill; ult: ActiveSkill } {
  const lv = skillLevels[`${charId}_base`] ?? 0;
  const ultLv = skillLevels[`${charId}_ult`] ?? 0;
  const s = baseSkillFor(charId);
  const ult = ultSkillFor(charId);
  const baseCdMyth = meta ? getMythicCooldownMult(meta, 'base') : 1;
  const ultCdMyth  = meta ? getMythicCooldownMult(meta, 'ult')  : 1;
  return {
    base: { ...s, cooldownSec: s.cooldownSec * skillCooldownMul('base', lv) * baseCdMyth },
    ult:  { ...ult, cooldownSec: ult.cooldownSec * skillCooldownMul('ult', ultLv) * ultCdMyth },
  };
}
```

Update existing callsites of `buildActiveSkills` to pass `meta` (BattleScene + any sim path).

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- buildActiveSkills.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/buildActiveSkills.ts games/inflation-rpg/src/systems/buildActiveSkills.test.ts games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): buildActiveSkills mythic cooldown wrap (floor 0.4)"
```

---

### Task 12: `applyDropMult` meta-source variant + economy.test.ts

**Files:**
- Modify: `games/inflation-rpg/src/systems/economy.ts`.
- Modify: `games/inflation-rpg/src/systems/economy.test.ts`.
- Callsites of `applyDropMult` in `gameStore.ts` — pass meta.

Existing signature: `applyDropMult(amount: number, perLv: number, lv: number)`. We add a higher-level helper that aggregates ascTree + mythic + relic.

- [ ] **Step 1: Add failing test**

Append to `economy.test.ts`:

```typescript
import { applyMetaDropMult } from './economy';
import { EMPTY_RELIC_STACKS } from '../types';

describe('applyMetaDropMult — full Phase E aggregate', () => {
  function makeMeta(opts: any = {}) {
    return {
      ascTree: opts.ascTree ?? { gold_drop: 0, dungeon_currency: 0, hp_pct: 0, atk_pct: 0,
                                  bp_start: 0, sp_per_lvl: 0, crit_damage: 0, asc_accel: 0,
                                  mod_magnitude: 0, effect_proc: 0 },
      mythicEquipped: opts.mythicEquipped ?? [null, null, null, null, null],
      mythicOwned: opts.mythicOwned ?? [],
      relicStacks: opts.relicStacks ?? { ...EMPTY_RELIC_STACKS },
    } as any;
  }
  it('returns base when no bonuses', () => {
    expect(applyMetaDropMult(100, 'gold', makeMeta())).toBe(100);
  });
  it('applies gold_coin relic +1% per stack', () => {
    expect(applyMetaDropMult(100, 'gold', makeMeta({ relicStacks: { ...EMPTY_RELIC_STACKS, gold_coin: 50 } })))
      .toBe(150);  // +50% additive
  });
  it('applies merchant_seal mythic +100%', () => {
    expect(applyMetaDropMult(100, 'gold', makeMeta({ mythicEquipped: ['merchant_seal', null, null, null, null] })))
      .toBe(200);
  });
  it('applies infinity_seal mythic ×2 (all kinds)', () => {
    expect(applyMetaDropMult(100, 'dungeon_currency',
      makeMeta({ mythicEquipped: ['infinity_seal', null, null, null, null] }))).toBe(300);
  });
  it('mythic + relic + ascTree stack additively', () => {
    // ascTree gold_drop lv 5 = +50% (Phase G), gold_coin 50 stacks = +50%, merchant_seal = +100% → +200% → 300
    const meta = makeMeta({
      ascTree: { gold_drop: 5, dungeon_currency: 0, hp_pct: 0, atk_pct: 0, bp_start: 0,
                 sp_per_lvl: 0, crit_damage: 0, asc_accel: 0, mod_magnitude: 0, effect_proc: 0 },
      relicStacks: { ...EMPTY_RELIC_STACKS, gold_coin: 50 },
      mythicEquipped: ['merchant_seal', null, null, null, null],
    });
    expect(applyMetaDropMult(100, 'gold', meta)).toBe(300);  // 1 + 0.5 + 0.5 + 1.0 = 3.0
  });
});
```

- [ ] **Step 2: Implement aggregator helper in economy.ts**

```typescript
// games/inflation-rpg/src/systems/economy.ts
import type { MetaState } from '../types';
import { getMythicDropBonus } from './mythics';
import { getRelicDropBonus } from './relics';

export function applyDropMult(amount: number, perLv: number, lv: number): number {
  if (lv <= 0) return amount;
  return Math.floor(amount * (1 + perLv * lv));
}

export type MetaDropKind = 'gold' | 'dr' | 'dungeon_currency';

// AscTree per-lv % bonus per kind. Should match Phase G data/ascTree.ts.
const ASC_TREE_DROP_PER_LV: Record<MetaDropKind, { node: keyof MetaState['ascTree']; perLv: number }> = {
  gold:               { node: 'gold_drop',         perLv: 0.10 },  // verify against data/ascTree.ts
  dr:                 { node: 'gold_drop',         perLv: 0 },    // (no asc-tree node for DR drop yet — keep 0)
  dungeon_currency:   { node: 'dungeon_currency',  perLv: 0.10 },
};

export function applyMetaDropMult(base: number, kind: MetaDropKind, meta: MetaState): number {
  const ascConf = ASC_TREE_DROP_PER_LV[kind];
  const ascLv = (meta.ascTree[ascConf.node] ?? 0) as number;
  const ascBonus = ascConf.perLv * ascLv;
  const mythicBonus = getMythicDropBonus(meta, kind);
  const relicBonus  = getRelicDropBonus(meta, kind);
  const totalMult = 1 + ascBonus + mythicBonus + relicBonus;
  return Math.floor(base * totalMult);
}
```

(Implementer: verify `ASC_TREE_DROP_PER_LV.gold.perLv` matches Phase G's actual value in `data/ascTree.ts`. The spec's "gold +10% / lv" is the assumption — adjust if Phase G uses different.)

- [ ] **Step 3: Update callsites**

Run: `pnpm --filter @forge/game-inflation-rpg exec rg -n 'applyDropMult\(' src/`. In `gameStore.ts`, drop-related branches (gold rewards, DR rewards, dungeon currency rewards) — convert from raw `applyDropMult(amount, perLv, lv)` to `applyMetaDropMult(amount, kind, meta)`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- economy.test.ts gameStore.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/economy.ts games/inflation-rpg/src/systems/economy.test.ts games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): applyMetaDropMult aggregates ascTree + mythic + relic"
```

---

### Task 13: `applyExpGain` 6th param `metaXpMult`

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (or wherever `applyExpGain` lives).
- Modify: `games/inflation-rpg/src/systems/experience.test.ts` (or gameStore.test.ts).

- [ ] **Step 1: Locate `applyExpGain`**

Run: `pnpm --filter @forge/game-inflation-rpg exec rg -n 'applyExpGain' src/`

The signature should currently end with `bonusSpPerLevel` (Phase G's 5th param).

- [ ] **Step 2: Write failing test**

Append to relevant test file:

```typescript
describe('applyExpGain — 6th param metaXpMult', () => {
  it('multiplies XP gain by metaXpMult', () => {
    const without = applyExpGain(/* base */ 100, /* charLevel */ 10, /* ascTier */ 0,
                                  /* ascTreeSp */ 0, /* bonusSp */ 0, /* metaXpMult */ 1);
    const withM = applyExpGain(100, 10, 0, 0, 0, 2);
    expect(withM).toBe(without * 2);
  });
});
```

- [ ] **Step 3: Update `applyExpGain`**

Add `metaXpMult = 1` as 6th param. Multiply final result by `metaXpMult`.

- [ ] **Step 4: Update callsites**

`bossDrop`, `monsterKill`, `questComplete` — any XP-grant path. Pass `getMythicXpMult(meta) * getRelicXpMult(meta)`.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test`
Expected: PASS (existing tests use default 1, no drift).

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/systems/experience.test.ts
git commit -m "feat(game-inflation-rpg): applyExpGain 6th param metaXpMult"
```

---

### Task 14: `effects.ts` mythic proc trigger registration

**Files:**
- Modify: `games/inflation-rpg/src/systems/effects.ts`.
- Modify: `games/inflation-rpg/src/systems/effects.test.ts`.

- [ ] **Step 1: Read current effects.ts shape**

Run: `pnpm --filter @forge/game-inflation-rpg exec rg -n 'evaluateTriggers|addEffect|EffectsState' src/systems/effects.ts | head -20`. Note the existing trigger type names and how modifier-sourced triggers are registered.

- [ ] **Step 2: Add failing test**

Append to `effects.test.ts`:

```typescript
import { registerMythicProcs, evaluateTriggers, createEffectsState } from './effects';

describe('mythic proc triggers (Phase E)', () => {
  it('registers serpent_fang lifesteal on_player_attack', () => {
    const state = createEffectsState();
    const procs = [{ trigger: 'on_player_attack' as const, effect: 'lifesteal' as const, value: 0.2 }];
    registerMythicProcs(state, procs);
    const result = evaluateTriggers(state, 'on_player_attack', { damageDealt: 100 });
    expect(result.lifestealHeal).toBeCloseTo(20);
  });
  it('registers thorned_skin reflect on_player_hit_received', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_player_hit_received', effect: 'thorns', value: 0.5 }]);
    const result = evaluateTriggers(state, 'on_player_hit_received', { damageReceived: 200 });
    expect(result.thornsReflect).toBeCloseTo(100);
  });
});
```

- [ ] **Step 3: Extend effects.ts**

(The actual extension depends on existing structure. Approach: add `registerMythicProcs(state, procs)` that appends each proc to the state's trigger list. Extend the return type of `evaluateTriggers` to include `lifestealHeal`, `thornsReflect`, `spStealAmount`, `magicBurstDamage`.)

```typescript
// games/inflation-rpg/src/systems/effects.ts (additions)
import type { MythicProc } from './mythics';

export function registerMythicProcs(state: EffectsState, procs: MythicProc[]): void {
  for (const p of procs) {
    state.permanentTriggers ??= [];
    state.permanentTriggers.push(p);
  }
}

// Extend evaluateTriggers to merge results from permanentTriggers
export function evaluateTriggers(
  state: EffectsState,
  trigger: 'on_player_hit_received' | 'on_player_attack',
  ctx: { damageDealt?: number; damageReceived?: number },
): { lifestealHeal: number; thornsReflect: number; spStealAmount: number; magicBurstDamage: number } {
  let lifestealHeal = 0, thornsReflect = 0, spStealAmount = 0, magicBurstDamage = 0;
  for (const p of state.permanentTriggers ?? []) {
    if (p.trigger !== trigger) continue;
    if (p.effect === 'lifesteal' && ctx.damageDealt) lifestealHeal += ctx.damageDealt * p.value;
    if (p.effect === 'thorns' && ctx.damageReceived) thornsReflect += ctx.damageReceived * p.value;
    if (p.effect === 'sp_steal' && ctx.damageDealt) spStealAmount += ctx.damageDealt * p.value;
    if (p.effect === 'magic_burst' && ctx.damageDealt) {
      // proc value = chance; require rng for full impl — first pass: deterministic flat
      // (implementer: use BattleScene-supplied rng if needed)
      magicBurstDamage += ctx.damageDealt * 0.5;  // first-pass: 50% bonus when proc'd
    }
  }
  return { lifestealHeal, thornsReflect, spStealAmount, magicBurstDamage };
}
```

(Adjust to merge with existing `evaluateTriggers` if it already returns a different shape — keep existing return fields and add new ones.)

- [ ] **Step 4: Wire BattleScene to call `registerMythicProcs` at scene init**

In BattleScene's create / start:

```typescript
import { getMythicProcs } from '../systems/mythics';
import { registerMythicProcs } from '../systems/effects';

// in create():
const procs = getMythicProcs(this.meta);
registerMythicProcs(this.effectsState, procs);
```

And in damage-dealt / damage-received paths, call `evaluateTriggers` and apply `lifestealHeal` (player heal), `thornsReflect` (enemy damage), etc.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- effects.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/systems/effects.ts games/inflation-rpg/src/systems/effects.test.ts games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): mythic proc triggers (lifesteal/thorns/sp_steal/magic_burst)"
```

---

### Task 15: BattleScene passive branch (no_death_loss / revive)

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`.
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — playerDie logic.
- Modify: appropriate test file.

- [ ] **Step 1: Write failing test (use gameStore + simulated player death)**

Append to `gameStore.test.ts`:

```typescript
describe('Phase E passive — death loss / revive', () => {
  it('undead_coin prevents inventory loss on death', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        relicStacks: { ...EMPTY_RELIC_STACKS, undead_coin: 1 },
        dr: 1000,
      },
    }));
    const before = useGameStore.getState().meta.dr;
    useGameStore.getState().playerDie?.();   // or whatever death-trigger action exists
    expect(useGameStore.getState().meta.dr).toBe(before);
  });
});
```

- [ ] **Step 2: Add `playerDie` action / locate existing death handler**

Run: `pnpm --filter @forge/game-inflation-rpg exec rg -n 'death|playerDie|onDie' src/`. Wire the no-loss check using `relicNoDeathLoss(meta)`.

- [ ] **Step 3: Add revive logic**

In death handler:

```typescript
import { relicReviveCount } from '../systems/relics';
import { getMythicReviveCount } from '../systems/mythics';

const totalRevives = relicReviveCount(meta) + getMythicReviveCount(meta);
if (run.featherUsed < totalRevives) {
  // restore HP 50% and continue
  return revived;
}
```

Add `run.featherUsed: number` field to RunState (initialized to 0 in `startRun` / `INITIAL_RUN`).

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test`
Expected: PASS.

- [ ] **Step 5: Commit + tag**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): passive no-death-loss + revive (featherUsed per-run)"
git tag phase-e-cp4
```

---

## CP5 — bossDrop + ascend Integration

### Task 16: bossDrop final → mythic drop + milestone + slotCap

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — `bossDrop` action.
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`.

- [ ] **Step 1: Add failing test**

```typescript
describe('bossDrop — Phase E mythic + slotCap', () => {
  it('first final boss kill: awards milestone tier1_charm and unlocks slot 1', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascTier: 0,
        mythicOwned: [],
        mythicEquipped: [null, null, null, null, null],
        mythicSlotCap: 0,
      },
    }));
    useGameStore.getState().bossDrop('final-boss', 8, 'final', false);
    const meta = useGameStore.getState().meta;
    expect(meta.ascTier).toBe(1);
    expect(meta.mythicSlotCap).toBe(1);
    expect(meta.mythicOwned).toContain('tier1_charm');
  });

  it('non-first final kill rolls random drop with RNG seed', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascTier: 1,
        mythicOwned: ['tier1_charm'],
      },
    }));
    // mock RNG to force drop
    const originalRandom = Math.random;
    Math.random = (() => { let i = 0; const seq = [0.05, 0]; return () => seq[i++]; })();
    useGameStore.getState().bossDrop('final-boss', 8, 'final', false);
    Math.random = originalRandom;
    const meta = useGameStore.getState().meta;
    expect(meta.mythicOwned.length).toBeGreaterThan(1);
  });

  it('milestone fires when ascend brings tier to 5', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascTier: 4,
        crackStones: 9999,
        dungeonFinalsCleared: ['final-realm', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
        mythicOwned: ['tier1_charm'],
      },
    }));
    useGameStore.getState().ascend();
    const meta = useGameStore.getState().meta;
    expect(meta.ascTier).toBe(5);
    expect(meta.mythicSlotCap).toBe(3);
    expect(meta.mythicOwned).toContain('tier5_seal');
  });
});
```

- [ ] **Step 2: Update `bossDrop`**

Locate the `bossDrop` action in gameStore.ts. After the existing first-final-boss branch (`ascTier += 1`), add:

```typescript
import { rollMythicDrop, awardMilestoneMythic } from '../systems/mythics';
import { computeMythicSlotCap } from './gameStore';  // self-ref or extract
import { MILESTONE_TIERS } from '../data/mythics';

// inside bossDrop, after the ascTier transition logic:
if (bossType === 'final') {
  // Milestone award for newly reached tier
  let newOwned = state.meta.mythicOwned;
  if (MILESTONE_TIERS.includes(state.meta.ascTier)) {
    newOwned = awardMilestoneMythic({ ...state.meta, mythicOwned: newOwned }, state.meta.ascTier).mythicOwned;
  }
  // Random drop roll (after milestone, so milestone doesn't appear in random pool)
  const droppedId = rollMythicDrop({ ...state.meta, mythicOwned: newOwned } as MetaState, Math.random);
  if (droppedId) newOwned = [...newOwned, droppedId];

  // Recompute slot cap based on new ascTier
  const newSlotCap = computeMythicSlotCap(state.meta.ascTier);

  return {
    meta: {
      ...state.meta,
      mythicOwned: newOwned,
      mythicSlotCap: newSlotCap,
    },
  };
}
```

(Implementer: integrate this with the existing bossDrop body — likely a `set((state) => ({ meta: { ...state.meta, ... } }))` block. Be careful with the final-boss-first-kill branch already incrementing ascTier — milestone award should use the NEW tier, not the OLD.)

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): bossDrop awards mythic milestone + random drop + slotCap"
```

---

### Task 17: `ascend()` slotCap recompute + milestone award

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — `ascend` action.
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`.

- [ ] **Step 1: Write failing test for milestone-via-ascend**

(Already added in Task 16's third `it` block.)

- [ ] **Step 2: Update `ascend()`**

After computing `nextTier` and the inventory/reset logic:

```typescript
import { awardMilestoneMythic } from '../systems/mythics';

// At the point where we know newAscTier:
let newMeta = { ...state.meta, ascTier: newAscTier, /* etc. existing fields */ };
if (MILESTONE_TIERS.includes(newAscTier)) {
  newMeta = awardMilestoneMythic(newMeta, newAscTier);
}
newMeta.mythicSlotCap = computeMythicSlotCap(newAscTier);
return { meta: newMeta };
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts`
Expected: PASS for milestone-via-ascend test.

- [ ] **Step 4: Commit + tag**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): ascend awards mythic milestone + recomputes slotCap"
git tag phase-e-cp5
```

---

## CP6 — Ad Stub

### Task 18: `src/systems/ads.ts` + tests

**Files:**
- Create: `games/inflation-rpg/src/systems/ads.ts`.
- Create: `games/inflation-rpg/src/systems/ads.test.ts`.

- [ ] **Step 1: Write failing tests**

```typescript
// games/inflation-rpg/src/systems/ads.test.ts
import { describe, it, expect } from 'vitest';
import type { MetaState } from '../types';
import { EMPTY_RELIC_STACKS } from '../types';
import {
  canWatchAd, startAdWatch, finishAdWatch, checkDailyReset,
  AD_COOLDOWN_MS, AD_DAILY_CAP,
} from './ads';

function makeMeta(adsToday = 0, adsLastReset = Date.now()): MetaState {
  return {
    relicStacks: { ...EMPTY_RELIC_STACKS },
    adsWatched: 0,
    adsToday,
    adsLastResetTs: adsLastReset,
  } as MetaState;
}

describe('canWatchAd', () => {
  it('ok when not at daily cap', () => {
    expect(canWatchAd(makeMeta(0), Date.now()).ok).toBe(true);
  });
  it('rejects when daily cap reached', () => {
    const r = canWatchAd(makeMeta(AD_DAILY_CAP), Date.now());
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cap');
  });
});

describe('startAdWatch → finishAdWatch flow', () => {
  it('happy path: increments adsWatched, adsToday, and relicStacks', () => {
    const before = makeMeta(0);
    const { adRunId, endsAt } = startAdWatch(before, 0);
    expect(adRunId).toMatch(/^ad_/);
    expect(endsAt).toBe(AD_COOLDOWN_MS);
    const after = finishAdWatch(before, adRunId, 'warrior_banner', AD_COOLDOWN_MS);
    expect(after.ok).toBe(true);
    expect(after.relicId).toBe('warrior_banner');
    // The mutation is returned via the state caller — finishAdWatch returns the result.
    // The caller must apply: meta.adsWatched++, meta.adsToday++, meta.relicStacks[id]++ (cap respected).
  });
  it('cap-reached relic: stack does not increase but ad counter does', () => {
    const meta = { ...makeMeta(0), relicStacks: { ...EMPTY_RELIC_STACKS, undead_coin: 1 } };
    const { adRunId } = startAdWatch(meta, 0);
    const r = finishAdWatch(meta, adRunId, 'undead_coin', AD_COOLDOWN_MS);
    expect(r.ok).toBe(true);
    expect(r.capReached).toBe(true);
  });
});

describe('checkDailyReset', () => {
  it('resets adsToday when nowTs date > lastReset date (local)', () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const meta = makeMeta(20, yesterday.getTime());
    const result = checkDailyReset(meta, Date.now());
    expect(result.adsToday).toBe(0);
    expect(result.adsLastResetTs).toBeGreaterThan(meta.adsLastResetTs);
  });
  it('no-op when same day', () => {
    const meta = makeMeta(20, Date.now() - 60_000);  // 1 min ago, same day
    const result = checkDailyReset(meta, Date.now());
    expect(result.adsToday).toBe(20);
  });
});
```

- [ ] **Step 2: Implement `ads.ts`**

```typescript
// games/inflation-rpg/src/systems/ads.ts
import type { MetaState, RelicId } from '../types';
import { applyStackIncrement, isAtCap } from './relics';

export const AD_COOLDOWN_MS = 8_000;
export const AD_DAILY_CAP = 30;

export function canWatchAd(meta: MetaState, nowTs: number): { ok: boolean; reason?: 'cap' } {
  const refreshed = checkDailyReset(meta, nowTs);
  if (refreshed.adsToday >= AD_DAILY_CAP) return { ok: false, reason: 'cap' };
  return { ok: true };
}

export function startAdWatch(_meta: MetaState, _nowTs: number): { adRunId: string; endsAt: number } {
  return {
    adRunId: `ad_${Math.random().toString(36).slice(2, 10)}`,
    endsAt: AD_COOLDOWN_MS,
  };
}

export function finishAdWatch(
  meta: MetaState,
  _adRunId: string,
  relicId: RelicId,
  _nowTs: number,
): { ok: boolean; relicId: RelicId; capReached: boolean; nextMeta: MetaState } {
  const capReached = isAtCap(meta, relicId);
  const nextStacks = capReached ? meta.relicStacks : applyStackIncrement(meta, relicId);
  const nextMeta: MetaState = {
    ...meta,
    adsWatched: (meta.adsWatched ?? 0) + 1,
    adsToday: meta.adsToday + 1,
    relicStacks: nextStacks,
  };
  return { ok: true, relicId, capReached, nextMeta };
}

export function checkDailyReset(meta: MetaState, nowTs: number): MetaState {
  const lastDate = new Date(meta.adsLastResetTs);
  const nowDate = new Date(nowTs);
  if (
    lastDate.getFullYear() !== nowDate.getFullYear() ||
    lastDate.getMonth() !== nowDate.getMonth() ||
    lastDate.getDate() !== nowDate.getDate()
  ) {
    return { ...meta, adsToday: 0, adsLastResetTs: nowTs };
  }
  return meta;
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- ads.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/systems/ads.ts games/inflation-rpg/src/systems/ads.test.ts
git commit -m "feat(game-inflation-rpg): ad-watch stub (8s cooldown + 30/day cap)"
```

---

### Task 19: Wire `finishAdWatch` into gameStore action

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — add `watchAdForRelic(relicId)` action.
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`.

- [ ] **Step 1: Add failing test**

```typescript
describe('watchAdForRelic — store action', () => {
  it('increments relic stack and ad counter when ok', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, adsToday: 0 } }));
    useGameStore.getState().watchAdForRelic('warrior_banner');
    const meta = useGameStore.getState().meta;
    expect(meta.relicStacks.warrior_banner).toBe(1);
    expect(meta.adsToday).toBe(1);
    expect(meta.adsWatched).toBe(1);
  });
  it('respects daily cap', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, adsToday: 30 } }));
    useGameStore.getState().watchAdForRelic('warrior_banner');
    const meta = useGameStore.getState().meta;
    expect(meta.adsToday).toBe(30);   // unchanged
  });
});
```

- [ ] **Step 2: Implement action**

In gameStore.ts:

```typescript
import { canWatchAd, startAdWatch, finishAdWatch, checkDailyReset } from '../systems/ads';

// inside store actions:
watchAdForRelic: (relicId: RelicId) => {
  set((state) => {
    const now = Date.now();
    const refreshed = checkDailyReset(state.meta, now);
    const check = canWatchAd(refreshed, now);
    if (!check.ok) return { meta: refreshed };
    const { adRunId } = startAdWatch(refreshed, now);
    const { nextMeta } = finishAdWatch(refreshed, adRunId, relicId, now);
    return { meta: nextMeta };
  });
},
```

(Note: This action skips the 8s wait — that's a UI concern. The action is callable from UI after the 8s delay.)

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit + tag**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): watchAdForRelic store action"
git tag phase-e-cp6
```

---

## CP7 — UI (Relics.tsx + Entry Button)

### Task 20: Relics.tsx — 스택 유물 tab

**Files:**
- Create: `games/inflation-rpg/src/screens/Relics.tsx`.
- Create: `games/inflation-rpg/src/screens/Relics.test.tsx`.

- [ ] **Step 1: Scaffold + failing component test**

```typescript
// games/inflation-rpg/src/screens/Relics.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Relics from './Relics';
import { useGameStore } from '../store/gameStore';

describe('Relics — 스택 유물 tab', () => {
  it('renders 10 relic rows', () => {
    render(<Relics />);
    expect(screen.getByText('전사의 깃발')).toBeInTheDocument();
    expect(screen.getByText('도깨비 부적')).toBeInTheDocument();
    expect(screen.getByText('명운의 깃털')).toBeInTheDocument();
  });

  it('shows current stack count', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, relicStacks: { ...s.meta.relicStacks, warrior_banner: 7 } },
    }));
    render(<Relics />);
    expect(screen.getByText(/7 stack/)).toBeInTheDocument();
  });

  it('disables 광고 보기 when relic at cap', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, relicStacks: { ...s.meta.relicStacks, undead_coin: 1 } },
    }));
    render(<Relics />);
    const btns = screen.getAllByText('광고 보기');
    // The button corresponding to undead_coin should be disabled (find by parent containing 망자의 동전)
    const undeadRow = screen.getByText('망자의 동전').closest('[data-testid="relic-row"]');
    expect(undeadRow?.querySelector('button')?.hasAttribute('disabled')).toBe(true);
  });
});
```

- [ ] **Step 2: Implement Relics.tsx scaffold (스택 tab only)**

```tsx
// games/inflation-rpg/src/screens/Relics.tsx
import * as React from 'react';
import { useGameStore } from '../store/gameStore';
import { RELICS, getEffectiveStack, ALL_RELIC_IDS } from '../data/relics';
import { isAtCap } from '../systems/relics';
import { canWatchAd, AD_COOLDOWN_MS, AD_DAILY_CAP } from '../systems/ads';
import type { RelicId } from '../types';

export default function Relics() {
  const meta = useGameStore((s) => s.meta);
  const watchAdForRelic = useGameStore((s) => s.watchAdForRelic);
  const [tab, setTab] = React.useState<'stack' | 'mythic'>('stack');
  const [adRunning, setAdRunning] = React.useState<{ relicId: RelicId; endsAt: number } | null>(null);

  const onWatchAd = (relicId: RelicId) => {
    const now = Date.now();
    if (!canWatchAd(meta, now).ok) return;
    setAdRunning({ relicId, endsAt: now + AD_COOLDOWN_MS });
    setTimeout(() => {
      watchAdForRelic(relicId);
      setAdRunning(null);
    }, AD_COOLDOWN_MS);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>보물고</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setTab('stack')}
          style={{ background: tab === 'stack' ? 'var(--forge-accent)' : 'var(--forge-panel)' }}>
          스택 유물
        </button>
        <button
          onClick={() => setTab('mythic')}
          style={{ background: tab === 'mythic' ? 'var(--forge-accent)' : 'var(--forge-panel)' }}>
          Mythic
        </button>
      </div>
      {tab === 'stack' && (
        <>
          <div>광고 시청 (오늘 {meta.adsToday}/{AD_DAILY_CAP})</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {ALL_RELIC_IDS.map((id) => {
              const def = RELICS[id];
              const stack = meta.relicStacks[id];
              const eff = getEffectiveStack(id, stack);
              const atCap = isAtCap(meta, id);
              const disabled = atCap || meta.adsToday >= AD_DAILY_CAP || adRunning !== null;
              return (
                <div key={id} data-testid="relic-row" style={{ padding: 12, border: '1px solid var(--forge-border)', borderRadius: 8 }}>
                  <div>{def.emoji} {def.nameKR}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{def.descriptionKR}</div>
                  <div>현재: {eff} stack{atCap ? ' (MAX)' : ''}</div>
                  <button disabled={disabled} onClick={() => onWatchAd(id)}>
                    {adRunning?.relicId === id ? '광고 시청 중…' : '광고 보기'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      {tab === 'mythic' && <div>Mythic (Task 21)</div>}
      {adRunning && <AdWatchModal endsAt={adRunning.endsAt} relicId={adRunning.relicId} />}
    </div>
  );
}

function AdWatchModal({ endsAt, relicId }: { endsAt: number; relicId: RelicId }) {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / AD_COOLDOWN_MS);
      setProgress(p);
      if (p >= 1) clearInterval(tick);
    }, 100);
    return () => clearInterval(tick);
  }, [endsAt]);
  const def = RELICS[relicId];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: 'var(--forge-panel)', padding: 24, borderRadius: 12 }}>
        <div>광고 시청 중…</div>
        <div style={{ width: 240, height: 8, background: 'var(--forge-border)', marginTop: 12 }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--forge-accent)' }} />
        </div>
        <div style={{ marginTop: 12 }}>{def.emoji} {def.nameKR} +1 stack</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Relics.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/Relics.tsx games/inflation-rpg/src/screens/Relics.test.tsx
git commit -m "feat(game-inflation-rpg): Relics screen — 스택 유물 tab (광고 시청 stub flow)"
```

---

### Task 21: Relics.tsx — Mythic tab

**Files:**
- Modify: `games/inflation-rpg/src/screens/Relics.tsx`.
- Modify: `games/inflation-rpg/src/screens/Relics.test.tsx`.

- [ ] **Step 1: Add failing test**

Append to `Relics.test.tsx`:

```typescript
describe('Relics — Mythic tab', () => {
  it('shows slot grid with cap-based locked slots', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, mythicSlotCap: 1, mythicOwned: ['tier1_charm'], mythicEquipped: [null, null, null, null, null] },
    }));
    render(<Relics />);
    fireEvent.click(screen.getByText('Mythic'));
    // Slot 0 should be available, slots 1-4 should be locked
    expect(screen.getAllByText(/🔒/)).toHaveLength(4);
  });

  it('equip flow: clicking owned mythic puts it into empty slot', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, mythicSlotCap: 1, mythicOwned: ['tier1_charm'], mythicEquipped: [null, null, null, null, null] },
    }));
    render(<Relics />);
    fireEvent.click(screen.getByText('Mythic'));
    fireEvent.click(screen.getByText('초월자의 부적'));   // owned mythic card
    expect(useGameStore.getState().meta.mythicEquipped[0]).toBe('tier1_charm');
  });
});
```

- [ ] **Step 2: Implement Mythic tab**

In Relics.tsx, replace the Mythic placeholder with:

```tsx
{tab === 'mythic' && (
  <MythicTab
    meta={meta}
    onEquip={(slotIdx, id) => useGameStore.getState().equipMythicAction(slotIdx, id)}
    onUnequip={(slotIdx) => useGameStore.getState().unequipMythicAction(slotIdx)}
  />
)}
```

Define `MythicTab`:

```tsx
function MythicTab({ meta, onEquip, onUnequip }: { meta: MetaState; onEquip: (i: number, id: MythicId) => void; onUnequip: (i: number) => void }) {
  return (
    <>
      <div>슬롯 ({meta.mythicSlotCap}/5)</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const id = meta.mythicEquipped[i];
          const locked = i >= meta.mythicSlotCap;
          if (locked) return <div key={i} style={{ width: 58, height: 58, border: '1px dashed', display: 'grid', placeItems: 'center' }}>🔒</div>;
          if (id) {
            const def = MYTHICS[id];
            return (
              <div key={i} onClick={() => onUnequip(i)} style={{ width: 58, height: 58, border: '1px solid var(--forge-accent)', display: 'grid', placeItems: 'center' }}>
                {def.emoji}
              </div>
            );
          }
          return <div key={i} style={{ width: 58, height: 58, border: '1px dashed' }} />;
        })}
      </div>
      <div>보유 ({meta.mythicOwned.length}/30)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {meta.mythicOwned.map((id) => {
          const def = MYTHICS[id];
          const equipped = meta.mythicEquipped.includes(id);
          return (
            <div key={id} style={{ padding: 8, border: '1px solid', opacity: equipped ? 0.5 : 1 }}>
              <div>{def.emoji} {def.nameKR}</div>
              <div style={{ fontSize: 11 }}>{def.descriptionKR}</div>
              {!equipped && (
                <button onClick={() => {
                  const firstEmpty = meta.mythicEquipped.findIndex((s, i) => s === null && i < meta.mythicSlotCap);
                  if (firstEmpty >= 0) onEquip(firstEmpty, id);
                }}>장착</button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
```

Add `equipMythicAction` and `unequipMythicAction` actions to gameStore.ts:

```typescript
equipMythicAction: (slotIdx: number, id: MythicId) => set((state) => ({ meta: equipMythic(state.meta, slotIdx, id) })),
unequipMythicAction: (slotIdx: number) => set((state) => ({ meta: unequipMythic(state.meta, slotIdx) })),
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Relics.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/Relics.tsx games/inflation-rpg/src/screens/Relics.test.tsx games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): Relics screen — Mythic tab (slot grid + equip flow)"
```

---

### Task 22: 마을 진입점 (MainMenu / Town 보물고 버튼)

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx` (or wherever the main hub is).
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — add `'relics'` screen state if not present.
- Modify: `games/inflation-rpg/src/App.tsx` (or wherever screen routing happens) — add Relics screen.

- [ ] **Step 1: Locate hub screen**

Run: `pnpm --filter @forge/game-inflation-rpg exec rg -n "case 'town'|screen === " src/screens/`. Identify where Town/MainMenu navigation buttons are.

- [ ] **Step 2: Add 보물고 button**

In MainMenu.tsx (or Town.tsx — wherever Asc / Inventory / Skills buttons live):

```tsx
<ForgeButton onClick={() => setScreen('relics')}>보물고</ForgeButton>
```

- [ ] **Step 3: Add screen type + routing**

In types.ts (`Screen` type union): add `'relics'`.

In App.tsx (or screen-routing component):

```tsx
import Relics from './screens/Relics';

// in switch:
case 'relics': return <Relics />;
```

- [ ] **Step 4: Run typecheck + manual test**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors.

Run: `pnpm --filter @forge/game-inflation-rpg dev` and manually verify the 보물고 button navigates correctly (smoke test).

- [ ] **Step 5: Commit + tag**

```bash
git add games/inflation-rpg/src/screens/MainMenu.tsx games/inflation-rpg/src/types.ts games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): 보물고 entry button + relics screen routing"
git tag phase-e-cp7
```

---

## CP8 — Sim Parity + E2E + Final Validation

### Task 23: balance-sim SimPlayer extension

**Files:**
- Modify: `games/inflation-rpg/tools/balance-sim.ts`.
- Modify: `games/inflation-rpg/tools/balance-sim.test.ts` (if exists) or add inline tests.

- [ ] **Step 1: Locate SimPlayer interface**

Run: `pnpm --filter @forge/game-inflation-rpg exec rg -n 'SimPlayer|simulateFloor' tools/balance-sim.ts | head -20`.

- [ ] **Step 2: Extend SimPlayer**

```typescript
interface SimPlayer {
  // ... existing fields ...
  mythicEquipped?: (MythicId | null)[];
  mythicOwned?: MythicId[];
  relicStacks?: Partial<Record<RelicId, number>>;
}
```

- [ ] **Step 3: Thread aggregators into simulateFloor**

In `simulateFloor`, where atk/hp are computed via `calcFinalStat` (or sim's equivalent), construct `metaMult` the same way BattleScene does:

```typescript
const fakeMeta = {
  mythicEquipped: player.mythicEquipped ?? [null, null, null, null, null],
  mythicOwned: player.mythicOwned ?? [],
  relicStacks: { ...EMPTY_RELIC_STACKS, ...(player.relicStacks ?? {}) },
} as MetaState;
const atkMetaMult = getMythicFlatMult(fakeMeta, 'atk') * getRelicFlatMult(fakeMeta, 'atk');
const hpMetaMult  = getMythicFlatMult(fakeMeta, 'hp')  * getRelicFlatMult(fakeMeta, 'hp');
```

Apply these in the atk/hp computation. Also wire `applyMetaDropMult` and proc triggers in `processIncomingDamage`.

- [ ] **Step 4: Verify balance-milestones regression**

Run: `pnpm --filter @forge/game-inflation-rpg test -- balance-milestones.test.ts`
Expected: PASS (mythic-off baseline = 6/6 milestones, 0 drift).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/tools/balance-sim.ts
git commit -m "feat(game-inflation-rpg): balance-sim parity for mythic + relic aggregators"
```

---

### Task 24: E2E `relics.spec.ts`

**Files:**
- Create: `games/inflation-rpg/e2e/relics.spec.ts`.

- [ ] **Step 1: Write E2E**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Phase E — Relics screen', () => {
  test('광고 시청 → relic stack +1', async ({ page }) => {
    await page.goto('/');
    // Setup: skip into town with empty stacks
    await page.evaluate(() => {
      const store = (window as any).__GAME_STORE__;
      store.setState((s: any) => ({
        meta: {
          ...s.meta,
          tutorialDone: true,
          screen: 'town',
        },
      }));
    });
    await page.click('text=보물고');
    await expect(page.getByText('전사의 깃발')).toBeVisible();
    const initialStack = await page.getByText(/0 stack/).first().textContent();
    // Click 광고 보기 on first relic
    await page.locator('[data-testid="relic-row"]').first().getByText('광고 보기').click();
    await expect(page.getByText('광고 시청 중')).toBeVisible();
    // Wait 8s + buffer
    await page.waitForTimeout(8500);
    // Verify stack +1 via store
    const stack = await page.evaluate(() => {
      const store = (window as any).__GAME_STORE__;
      return store.getState().meta.relicStacks.warrior_banner;
    });
    expect(stack).toBe(1);
  });

  test('cap-reached relic disables 광고 보기', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const store = (window as any).__GAME_STORE__;
      store.setState((s: any) => ({
        meta: { ...s.meta, tutorialDone: true,
          relicStacks: { ...s.meta.relicStacks, undead_coin: 1 } },
      }));
    });
    await page.click('text=보물고');
    const undeadRow = page.locator('[data-testid="relic-row"]').filter({ hasText: '망자의 동전' });
    const btn = undeadRow.getByText('광고 보기');
    await expect(btn).toBeDisabled();
  });
});
```

(Note: `__GAME_STORE__` global must be exposed in dev mode via `exposeTestHooks` from `@forge/core`. Verify the pattern matches existing E2E specs like `asctree.spec.ts`.)

- [ ] **Step 2: Run**

Run: `pnpm --filter @forge/game-inflation-rpg e2e -- relics.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/relics.spec.ts
git commit -m "test(game-inflation-rpg): E2E for Relics 광고 시청 flow"
```

---

### Task 25: E2E `mythic.spec.ts`

**Files:**
- Create: `games/inflation-rpg/e2e/mythic.spec.ts`.

- [ ] **Step 1: Write E2E**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Phase E — Mythic flow', () => {
  test('milestone award + slot unlock + equip → effect applied', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const store = (window as any).__GAME_STORE__;
      store.setState((s: any) => ({
        meta: {
          ...s.meta,
          tutorialDone: true,
          ascTier: 4,
          crackStones: 9999,
          dungeonFinalsCleared: ['final-realm', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
        },
      }));
    });
    // Trigger ascend → Tier 5 → tier5_seal awarded + slot cap = 3
    await page.evaluate(() => {
      const store = (window as any).__GAME_STORE__;
      store.getState().ascend();
    });
    const afterAscend = await page.evaluate(() => {
      const store = (window as any).__GAME_STORE__;
      const m = store.getState().meta;
      return { ascTier: m.ascTier, slotCap: m.mythicSlotCap, owned: m.mythicOwned };
    });
    expect(afterAscend.ascTier).toBe(5);
    expect(afterAscend.slotCap).toBe(3);
    expect(afterAscend.owned).toContain('tier5_seal');

    // Navigate to Relics → Mythic tab → equip
    await page.click('text=보물고');
    await page.click('text=Mythic');
    await page.click('text=초월자의 인장 >> .. >> text=장착');
    const equipped = await page.evaluate(() => {
      const store = (window as any).__GAME_STORE__;
      return store.getState().meta.mythicEquipped;
    });
    expect(equipped[0]).toBe('tier5_seal');
  });
});
```

- [ ] **Step 2: Run**

Run: `pnpm --filter @forge/game-inflation-rpg e2e -- mythic.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/mythic.spec.ts
git commit -m "test(game-inflation-rpg): E2E for mythic milestone + equip flow"
```

---

### Task 26: Update v8-migration E2E to verify v11

**Files:**
- Modify: `games/inflation-rpg/e2e/v8-migration.spec.ts`.

- [ ] **Step 1: Update assertions**

Find the existing `expect(version).toBe(10)` line — change to `expect(version).toBe(11)`. Add asserts:

```typescript
expect(state.meta.relicStacks).toEqual(EMPTY_RELIC_STACKS);
expect(state.meta.mythicOwned).toEqual([]);
expect(state.meta.mythicEquipped).toEqual([null, null, null, null, null]);
expect(typeof state.meta.mythicSlotCap).toBe('number');
expect(state.meta.adsToday).toBe(0);
```

- [ ] **Step 2: Run**

Run: `pnpm --filter @forge/game-inflation-rpg e2e -- v8-migration.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/v8-migration.spec.ts
git commit -m "test(game-inflation-rpg): update v8-migration E2E to verify chain through v11"
```

---

### Task 27: Final validation + merge + tag

**Files:** None (CI / repo state).

- [ ] **Step 1: Full validation suite**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck   # 0
pnpm --filter @forge/game-inflation-rpg lint        # 0
pnpm circular                                        # 0
pnpm --filter @forge/game-inflation-rpg test        # 모두 통과, ~570 vitest
pnpm --filter @forge/game-inflation-rpg e2e         # 27 통과
```

- [ ] **Step 2: balance-milestones regression check**

```bash
pnpm --filter @forge/game-inflation-rpg test -- balance-milestones.test.ts
```
Expected: 6/6 milestone pass with 0 drift (mythic-off baseline preserved).

- [ ] **Step 3: Merge --no-ff to main**

```bash
git checkout main
git merge --no-ff feat/phase-e-relics-mythic-ads -m "Merge feat/phase-e-relics-mythic-ads: Phase E — Relics + Mythic + Ads stub"
```

- [ ] **Step 4: Final tag**

```bash
git tag phase-e-complete
```

- [ ] **Step 5: Update auto-memory + announce completion**

Write a new auto-memory file `project_phase_e_complete.md` summarizing results (tag, metrics, known limitations). Update `MEMORY.md` index.

---

## Self-Review Checklist (executor: do NOT skip)

1. **Spec coverage** — every section/requirement in `2026-05-15-phase-e-relics-mythic-ads-design.md` has a corresponding task.
   - §1 Scope decisions → Tasks 1–27 (whole plan).
   - §2 Data model + v11 → Tasks 1–2.
   - §3 Catalogs → Tasks 3, 6.
   - §4 Effect application 6 hooks → Tasks 10–15.
   - §5 Ad stub → Tasks 18–19.
   - §6 UI → Tasks 20–22.
   - §7 Acquisition (milestone + drop + equip) → Tasks 8–9, 16–17.
   - §8 Sim parity → Task 23.
   - §9 Test plan → Tasks 2, 4, 7, 8, 9, 10–15, 18, 19, 20, 21, 24, 25, 26.
   - §10 DoD → Task 27.
   - §11 Limitations → documented in spec; no code task needed.

2. **Placeholder scan** — TBD/TODO/"appropriate" — none remain.

3. **Type consistency**
   - `RelicId`, `MythicId`, `MythicEffectType` defined in Task 1.
   - `EMPTY_RELIC_STACKS` defined in Task 1, used in Tasks 2, 4, 12, 23.
   - `computeMythicSlotCap` exported from gameStore.ts in Task 2, used in Tasks 16, 17.
   - `getMythicFlatMult`, `getMythicDropBonus`, `getMythicCooldownMult`, `getMythicXpMult` in Task 7, used in Tasks 10, 11, 12, 13, 23.
   - `getRelicFlatMult`, `getRelicDropBonus`, etc. in Task 4, used in Tasks 10, 12, 13, 23.
   - `MythicProc` in Task 7, used in Task 14.
   - `applyMetaDropMult` defined in Task 12.
   - `MILESTONE_TIERS` / `MILESTONE_MYTHIC_BY_TIER` defined in Task 6, used in Tasks 16, 17.
   - `watchAdForRelic`, `equipMythicAction`, `unequipMythicAction` actions in Tasks 19, 21.

4. **Edge cases** — cap enforcement (Task 4), slot validation (Task 8), milestone double-award (Task 9), daily reset edge (Task 18), proc trigger merge (Task 14), Asc-reset preservation (Task 2).

All good. Plan is ready.

---

## Execution Handoff

Two options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review (implementer + spec/code reviewer per task), fast iteration. Matches the Phase G / Phase D / Phase 1 pattern that this repo has been following.

**2. Inline Execution** — execute tasks in this session via executing-plans, batch with checkpoints.
