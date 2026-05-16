# Phase Sim-B — Trait Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Trait system foundation — typed trait catalog (16 entries from spec §16), stat-modifier resolver, `TraitSelector` UI, dedicated `CyclePrep` screen replacing MainMenu's hardcoded loadout, and persist v15 → v16 migration with trait state. Traits influence cycle outcomes via stat multipliers (HP / ATK / EXP gain / BP cost). Behavior-influencing traits (target priority, encounter preference, "사냥터 자율 선택") get their stubs wired but the full `HeroDecisionAI` decision logic is deferred to Sim-C where there are encounter nodes to decide between.

**Architecture:** Trait pool lives in `src/data/traits.ts` as pure data. Modifiers compose via a single `applyTraitMods(loadout, traits)` resolver that returns an enriched `ControllerLoadout`. `AutoBattleController` consumes the post-resolution loadout — no trait awareness inside the controller's hot path. `HeroDecisionAI` ships as a pure-TS module with stub methods (`chooseTargetEnemyId`, `chooseSkillId`, `shouldRetreat`) that Sim-A's single-enemy-loop will ignore but which can be progressively wired in Sim-C. `CyclePrep` becomes the new pre-cycle hub between MainMenu and CycleRunner.

**Tech Stack:** TypeScript / React / Zustand 5 / Vitest / Playwright (iPhone 14 + chromium projects) / tsx.

**Spec:** `docs/superpowers/specs/2026-05-16-hero-simulator-design.md` (especially §4.2 Trait panel, §6.2 HeroDecisionAI architecture, §16 Trait Catalog 초안).

---

## Scope Note (read before starting)

The spec §7 Sim-B description couples four things — Trait pool, HeroDecisionAI logic, TraitSelector UI, AutoBattleController extension. This plan deliberately **narrows scope** to Trait pool + stat modifiers + UI + persist, and leaves the HeroDecisionAI **interface** in place but with stub decisions. Why:

- Sim-A's controller has one enemy at a time and no skill system. There is nothing to "decide between" for target priority / skill priority / retreat. Real decisions need real environments — encounter nodes (Sim-C) and skill system (Sim-D or its own phase).
- Stat modifiers (EXP gain ×1.5, HP ×0.7, etc.) are the trait effect that pays off immediately — without them traits would be cosmetic in Sim-B.
- Locking the `HeroDecisionAI` interface shape now means Sim-C can wire its bodies without re-touching cycle internals.

Tasks 10+ would be needed to wire actual decision-making — skipped here. Sim-C will pick them up alongside `EncounterSystem`.

---

## Reference Map (do NOT re-discover during execution)

| Symbol | File / Line |
|---|---|
| `ControllerLoadout`, `ControllerOptions` | `games/inflation-rpg/src/cycle/AutoBattleController.ts:11-30` |
| `CycleState` fields incl `heroHpMax / heroExp / bp` | `games/inflation-rpg/src/cycle/cycleEvents.ts:25-48` |
| `cycleSlice` start action | `games/inflation-rpg/src/cycle/cycleSlice.ts:18-22` |
| `STORE_VERSION = 15` | `games/inflation-rpg/src/store/gameStore.ts` (search for `version: 15`) |
| `INITIAL_META.cycleHistory` | `games/inflation-rpg/src/store/gameStore.ts` (look near `cycleHistory: []`) |
| `runStoreMigration` exported | `games/inflation-rpg/src/store/gameStore.ts` |
| `MetaState.cycleHistory` | `games/inflation-rpg/src/types.ts` (near other meta fields) |
| MainMenu start cycle button | `games/inflation-rpg/src/screens/MainMenu.tsx` (search for `btn-start-cycle`) |
| App.tsx screen routing | `games/inflation-rpg/src/App.tsx` |
| Screen union | `games/inflation-rpg/src/types.ts` (search for `Screen =`) |
| Existing cycle-vertical-slice e2e | `games/inflation-rpg/tests/e2e/cycle-vertical-slice.spec.ts` |
| Spec §16 Trait Catalog | `docs/superpowers/specs/2026-05-16-hero-simulator-design.md:524-562` |

---

## File Structure

**New files:**

```
games/inflation-rpg/src/cycle/
  traits.ts                — Trait type, TraitId union, applyTraitMods resolver
  HeroDecisionAI.ts        — Stub interface module (real bodies in Sim-C)
  __tests__/
    traits.test.ts
    HeroDecisionAI.test.ts

games/inflation-rpg/src/data/
  traits.ts                — TRAIT_CATALOG: 16 entries from spec §16
  __tests__/
    traits.test.ts         — catalog shape + id uniqueness

games/inflation-rpg/src/screens/
  CyclePrep.tsx            — pre-cycle: trait selector + start button
  __tests__/
    CyclePrep.test.tsx

games/inflation-rpg/src/components/
  TraitSelector.tsx        — N-slot picker UI
  __tests__/
    TraitSelector.test.tsx

games/inflation-rpg/tests/e2e/
  cycle-prep-traits.spec.ts — Playwright e2e for trait selection flow
```

**Modified files:**

```
games/inflation-rpg/src/cycle/AutoBattleController.ts
  - ControllerOptions: add traits?: TraitId[]
  - apply trait mods to heroHpMax / heroAtkBase / EXP multiplier in killEnemy
  - keep HeroDecisionAI optional injection (stub default)

games/inflation-rpg/src/cycle/cycleSlice.ts
  - start(opts) extended to accept traits[]
  - persist selected traits in CycleHistoryEntry (already optional via additive field)

games/inflation-rpg/src/cycle/cycleEvents.ts
  - cycle_start: add traitIds: TraitId[]   (was deferred from Sim-A T1; the comment there already plans this)
  - CycleHistoryEntry: add traitIds?: TraitId[] (optional, additive)

games/inflation-rpg/src/screens/MainMenu.tsx
  - btn-start-cycle no longer starts a cycle directly — navigates to 'cycle-prep' instead

games/inflation-rpg/src/App.tsx
  - add 'cycle-prep' screen routing branch

games/inflation-rpg/src/types.ts
  - Screen union: add 'cycle-prep'
  - MetaState: add traitsUnlocked: TraitId[] (default = all base-tier traits)

games/inflation-rpg/src/store/gameStore.ts
  - STORE_VERSION: 15 → 16
  - INITIAL_META: add traitsUnlocked default (base-tier subset)
  - runStoreMigration: add v15 → v16 branch
```

**Out of scope for Sim-B (deferred):**
- Actual `HeroDecisionAI` decision logic — Sim-C
- "사냥터 자율 선택" — needs encounter nodes (Sim-C)
- Random skill acquisition — Sim-D
- Dialogue / personality text — Sim-D
- BP-cost-doubling for 시한부 역대급 천재 — needs full Sim-G balance pass anyway; Sim-B applies the mod but Sim-G tunes
- Trait unlock progression cadence — Sim-E meta rework

---

## Task 1: Trait types + base catalog stub

**Files:**
- Create: `games/inflation-rpg/src/cycle/traits.ts`
- Create: `games/inflation-rpg/src/cycle/__tests__/traits.test.ts`

- [ ] **Step 1.1: Write failing test for trait types**

Create `games/inflation-rpg/src/cycle/__tests__/traits.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Trait, TraitId, TraitModifiers } from '../traits';
import { applyTraitMods } from '../traits';

describe('trait types', () => {
  it('Trait shape compiles with all modifier slots', () => {
    const t: Trait = {
      id: 't_genius',
      nameKR: '천재',
      descKR: 'EXP 획득량 증가.',
      unlockTier: 'base',
      mods: { expMul: 1.2 },
    };
    expect(t.id).toBe('t_genius');
  });

  it('TraitId is a literal union', () => {
    const ids: TraitId[] = ['t_genius', 't_fragile'];
    expect(ids.length).toBe(2);
  });

  it('TraitModifiers covers stat multipliers', () => {
    const m: TraitModifiers = {
      hpMul: 0.7,
      atkMul: 1.0,
      expMul: 1.5,
      bpCostMul: 2.0,
      goldMul: 1.2,
    };
    expect(m.bpCostMul).toBe(2);
  });
});

describe('applyTraitMods', () => {
  it('returns input unchanged when no traits provided', () => {
    const baseLoadout = { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 };
    const result = applyTraitMods(baseLoadout, []);
    expect(result).toEqual(baseLoadout);
  });

  it('multiplies HP and ATK and BP from trait mods', () => {
    const result = applyTraitMods(
      { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 },
      ['t_genius', 't_fragile'],
      // explicit catalog overrides for unit-testable determinism
      {
        t_genius: { mods: { expMul: 1.2 } },
        t_fragile: { mods: { hpMul: 0.7, atkMul: 0.85 } },
      },
    );
    expect(result.heroHpMax).toBe(70);  // 100 * 0.7
    expect(result.heroAtkBase).toBe(8); // 10 * 0.85 floored
    expect(result.bpMax).toBe(30);       // unchanged
  });

  it('stacks multiplicatively when multiple traits modify the same stat', () => {
    const result = applyTraitMods(
      { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 },
      ['t_a', 't_b'],
      {
        t_a: { mods: { hpMul: 0.7 } },
        t_b: { mods: { hpMul: 0.5 } },
      } as Record<string, { mods: TraitModifiers }>,
    );
    expect(result.heroHpMax).toBe(35); // 100 * 0.7 * 0.5
  });

  it('returns bpMul as a separate field (not pre-applied to bpMax) — controller multiplies per-encounter', () => {
    // bpCostMul should NOT modify bpMax at construction. It's a per-encounter cost multiplier
    // applied in AutoBattleController.consumeBp. applyTraitMods returns the resolved bpCostMul
    // on the loadout for the controller to consume.
    const result = applyTraitMods(
      { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 },
      ['t_terminal_genius'],
      {
        t_terminal_genius: { mods: { bpCostMul: 2.0, expMul: 1.5, atkMul: 1.3, hpMul: 1.3 } },
      } as Record<string, { mods: TraitModifiers }>,
    );
    expect(result.bpMax).toBe(30);
    expect(result.bpCostMul).toBe(2.0);
    expect(result.expMul).toBeCloseTo(1.5);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `pnpm --filter @forge/game-inflation-rpg test -- src/cycle/__tests__/traits`

Expected: FAIL — module not found.

- [ ] **Step 1.3: Implement traits.ts**

Create `games/inflation-rpg/src/cycle/traits.ts`:

```ts
import type { ControllerLoadout } from './AutoBattleController';

// Trait ID literal union — extended in src/data/traits.ts catalog (Task 2).
// New traits add their ID here as a string literal, then a TRAIT_CATALOG entry.
export type TraitId =
  | 't_challenge'
  | 't_timid'
  | 't_thrill'
  | 't_genius'
  | 't_fragile'
  | 't_terminal_genius'
  | 't_explorer'
  | 't_berserker'
  | 't_miser'
  | 't_boss_hunter'
  | 't_fortune'
  | 't_zealot'
  | 't_swift'
  | 't_iron'
  | 't_prodigy'
  | 't_lucky';

// Multiplicative modifiers applied at cycle construction or per-encounter.
// `undefined` field = no effect (treated as 1.0).
export interface TraitModifiers {
  hpMul?: number;
  atkMul?: number;
  expMul?: number;
  goldMul?: number;
  // Per-encounter BP cost multiplier. NOT applied to bpMax at construction —
  // the controller multiplies the per-encounter consumption amount instead.
  bpCostMul?: number;
}

export type TraitUnlockTier = 'base' | 'mid' | 'rare';

export interface Trait {
  id: TraitId;
  nameKR: string;
  descKR: string;
  unlockTier: TraitUnlockTier;
  mods: TraitModifiers;
}

// Loadout enriched with resolved trait multipliers. AutoBattleController consumes this.
export interface ResolvedLoadout extends ControllerLoadout {
  expMul: number;
  goldMul: number;
  bpCostMul: number;
}

type CatalogLike = Record<string, { mods: TraitModifiers }>;

export function applyTraitMods(
  loadout: ControllerLoadout,
  traitIds: readonly string[],
  // Catalog override for unit tests. Production code passes TRAIT_CATALOG.
  catalog?: CatalogLike,
): ResolvedLoadout {
  let hpMul = 1, atkMul = 1, expMul = 1, goldMul = 1, bpCostMul = 1;
  const cat = catalog ?? {};
  for (const id of traitIds) {
    const t = cat[id];
    if (!t) continue;
    hpMul *= t.mods.hpMul ?? 1;
    atkMul *= t.mods.atkMul ?? 1;
    expMul *= t.mods.expMul ?? 1;
    goldMul *= t.mods.goldMul ?? 1;
    bpCostMul *= t.mods.bpCostMul ?? 1;
  }
  return {
    ...loadout,
    heroHpMax: Math.floor(loadout.heroHpMax * hpMul),
    heroAtkBase: Math.floor(loadout.heroAtkBase * atkMul),
    expMul,
    goldMul,
    bpCostMul,
  };
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- src/cycle/__tests__/traits`

Expected: PASS, 7 tests.

- [ ] **Step 1.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/traits.ts games/inflation-rpg/src/cycle/__tests__/traits.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-B T1 — Trait / TraitModifiers / ResolvedLoadout types + applyTraitMods resolver"
```

---

## Task 2: Trait catalog data (16 entries from spec §16)

**Files:**
- Create: `games/inflation-rpg/src/data/traits.ts`
- Create: `games/inflation-rpg/src/data/__tests__/traits.test.ts`

- [ ] **Step 2.1: Write failing test**

Create `games/inflation-rpg/src/data/__tests__/traits.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TRAIT_CATALOG, TRAIT_IDS } from '../traits';

describe('TRAIT_CATALOG', () => {
  it('has 16 entries matching spec §16', () => {
    expect(TRAIT_IDS.length).toBe(16);
  });

  it('all entries have unique ids', () => {
    const ids = new Set(TRAIT_IDS);
    expect(ids.size).toBe(TRAIT_IDS.length);
  });

  it('every catalog entry has nameKR + descKR + unlockTier + mods', () => {
    for (const id of TRAIT_IDS) {
      const t = TRAIT_CATALOG[id];
      expect(t.nameKR.length).toBeGreaterThan(0);
      expect(t.descKR.length).toBeGreaterThan(0);
      expect(['base', 'mid', 'rare']).toContain(t.unlockTier);
      expect(typeof t.mods).toBe('object');
    }
  });

  it('contains the 6 user-cited examples (도전적/소극적/위험을즐김/천재/허약함/시한부역대급천재)', () => {
    expect(TRAIT_CATALOG.t_challenge.nameKR).toBe('도전적');
    expect(TRAIT_CATALOG.t_timid.nameKR).toBe('소극적');
    expect(TRAIT_CATALOG.t_thrill.nameKR).toBe('위험을 즐김');
    expect(TRAIT_CATALOG.t_genius.nameKR).toBe('천재');
    expect(TRAIT_CATALOG.t_fragile.nameKR).toBe('허약함');
    expect(TRAIT_CATALOG.t_terminal_genius.nameKR).toBe('시한부 역대급 천재');
  });

  it('t_terminal_genius has bpCostMul = 2 (per spec — strong cost)', () => {
    expect(TRAIT_CATALOG.t_terminal_genius.mods.bpCostMul).toBe(2);
  });

  it('base-tier traits are at least 7 (initial unlock pool)', () => {
    const base = TRAIT_IDS.filter(id => TRAIT_CATALOG[id].unlockTier === 'base');
    expect(base.length).toBeGreaterThanOrEqual(7);
  });
});
```

- [ ] **Step 2.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- src/data/__tests__/traits`

Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement TRAIT_CATALOG**

Create `games/inflation-rpg/src/data/traits.ts`:

```ts
import type { Trait, TraitId } from '../cycle/traits';

// 16 traits from spec §16. Magnitudes are PLACEHOLDER — Phase Sim-G balance pass tunes.
// Behavior-influencing traits (탐험가/보스사냥꾼 등) have minimal stat mods here;
// their behavior effects land in Sim-C HeroDecisionAI.
export const TRAIT_CATALOG: Record<TraitId, Trait> = {
  t_challenge: {
    id: 't_challenge',
    nameKR: '도전적',
    descKR: '강한 적 추구. EXP 가 늘고 위험 회피가 줄어든다.',
    unlockTier: 'base',
    mods: { expMul: 1.15, hpMul: 0.95 },
  },
  t_timid: {
    id: 't_timid',
    nameKR: '소극적',
    descKR: '안전한 적부터. 생존율이 높지만 EXP 가 적다.',
    unlockTier: 'base',
    mods: { hpMul: 1.15, expMul: 0.9 },
  },
  t_thrill: {
    id: 't_thrill',
    nameKR: '위험을 즐김',
    descKR: '위험한 노드를 우선. 공격력이 늘지만 방어가 약해진다.',
    unlockTier: 'base',
    mods: { atkMul: 1.2, hpMul: 0.85 },
  },
  t_genius: {
    id: 't_genius',
    nameKR: '천재',
    descKR: 'EXP 획득량이 늘어난다.',
    unlockTier: 'base',
    mods: { expMul: 1.2 },
  },
  t_fragile: {
    id: 't_fragile',
    nameKR: '허약함',
    descKR: 'HP 와 방어가 약해진다. 다른 trait 의 강점을 위한 cost.',
    unlockTier: 'base',
    mods: { hpMul: 0.7, atkMul: 0.85 },
  },
  t_terminal_genius: {
    id: 't_terminal_genius',
    nameKR: '시한부 역대급 천재',
    descKR: '모든 스탯과 EXP 가 폭발. 대신 BP 가 두 배로 소모된다.',
    unlockTier: 'rare',
    mods: { hpMul: 1.3, atkMul: 1.3, expMul: 1.5, bpCostMul: 2.0 },
  },
  t_explorer: {
    id: 't_explorer',
    nameKR: '탐험가',
    descKR: '보너스 챔버와 사당 노드를 선호한다. (Sim-C 에서 동작)',
    unlockTier: 'base',
    mods: { goldMul: 1.1 },
  },
  t_berserker: {
    id: 't_berserker',
    nameKR: '광전사',
    descKR: 'HP 가 낮을수록 공격력이 늘어난다. (Sim-G 에서 정식 동작)',
    unlockTier: 'base',
    mods: { atkMul: 1.1, hpMul: 0.9 },
  },
  t_miser: {
    id: 't_miser',
    nameKR: '수전노',
    descKR: '골드 획득이 늘지만 회복을 아낀다.',
    unlockTier: 'base',
    mods: { goldMul: 1.25, hpMul: 0.95 },
  },
  t_boss_hunter: {
    id: 't_boss_hunter',
    nameKR: '보스 사냥꾼',
    descKR: '보스를 정조준. 일반 적에 대한 EXP 가 줄지만 보스에서 큰 보상. (Sim-C 에서 정식 동작)',
    unlockTier: 'mid',
    mods: { expMul: 0.95 },
  },
  t_fortune: {
    id: 't_fortune',
    nameKR: '운명론자',
    descKR: '운에 맡긴다. 회복 능력이 약하지만 골드 행운이 강하다.',
    unlockTier: 'mid',
    mods: { goldMul: 1.2, hpMul: 0.9 },
  },
  t_zealot: {
    id: 't_zealot',
    nameKR: '광신도',
    descKR: '사당과 NPC 의 효과가 강해진다. (Sim-C 에서 정식 동작)',
    unlockTier: 'rare',
    mods: { expMul: 0.9 },
  },
  t_swift: {
    id: 't_swift',
    nameKR: '신속',
    descKR: '빠르게 진행되어 cycle 이 짧다. 데미지가 약간 낮다.',
    unlockTier: 'base',
    mods: { atkMul: 0.85, bpCostMul: 0.9 },
  },
  t_iron: {
    id: 't_iron',
    nameKR: '강철의지',
    descKR: '방어가 강해지지만 공격이 약하다.',
    unlockTier: 'base',
    mods: { hpMul: 1.3, atkMul: 0.85 },
  },
  t_prodigy: {
    id: 't_prodigy',
    nameKR: '후천적 영재',
    descKR: 'cycle 후반에 진가를 발휘. (Sim-G 가 BP 진행 가중치 적용)',
    unlockTier: 'mid',
    mods: { expMul: 1.1, hpMul: 0.95 },
  },
  t_lucky: {
    id: 't_lucky',
    nameKR: '행운아',
    descKR: '모든 RNG 굴림에 가벼운 양 buff.',
    unlockTier: 'base',
    mods: { goldMul: 1.15 },
  },
};

export const TRAIT_IDS: readonly TraitId[] = Object.keys(TRAIT_CATALOG) as TraitId[];

export const BASE_TRAIT_IDS: readonly TraitId[] = TRAIT_IDS.filter(
  id => TRAIT_CATALOG[id].unlockTier === 'base',
);
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- src/data/__tests__/traits`

Expected: PASS, 6 tests.

- [ ] **Step 2.5: Commit**

```bash
git add games/inflation-rpg/src/data/traits.ts games/inflation-rpg/src/data/__tests__/traits.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-B T2 — TRAIT_CATALOG 16 entries (spec §16) + BASE_TRAIT_IDS export"
```

---

## Task 3: HeroDecisionAI stub module

**Files:**
- Create: `games/inflation-rpg/src/cycle/HeroDecisionAI.ts`
- Create: `games/inflation-rpg/src/cycle/__tests__/HeroDecisionAI.test.ts`

- [ ] **Step 3.1: Write failing test**

Create `games/inflation-rpg/src/cycle/__tests__/HeroDecisionAI.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HeroDecisionAI } from '../HeroDecisionAI';

describe('HeroDecisionAI — Sim-B stub', () => {
  it('chooseTargetEnemyId picks the only enemy when one is alive', () => {
    const ai = new HeroDecisionAI([]);
    const choice = ai.chooseTargetEnemyId(['m1']);
    expect(choice).toBe('m1');
  });

  it('chooseTargetEnemyId returns null when no targets', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseTargetEnemyId([])).toBeNull();
  });

  it('shouldRetreat returns false in Sim-B (placeholder)', () => {
    const ai = new HeroDecisionAI(['t_timid']);
    expect(ai.shouldRetreat({ heroHp: 10, heroHpMax: 100 })).toBe(false);
  });

  it('chooseSkillId returns null in Sim-B (no skill system wired yet)', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseSkillId([])).toBeNull();
  });

  it('traits are stored and readable for future Sim-C wiring', () => {
    const ai = new HeroDecisionAI(['t_challenge', 't_genius']);
    expect(ai.getTraits()).toEqual(['t_challenge', 't_genius']);
  });
});
```

- [ ] **Step 3.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- HeroDecisionAI`

Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement HeroDecisionAI stub**

Create `games/inflation-rpg/src/cycle/HeroDecisionAI.ts`:

```ts
import type { TraitId } from './traits';

// Sim-B placeholder. The interface shape is final — Sim-C onward will fill in
// trait-driven decisions for encounter routing, target priority, retreat thresholds,
// and skill priority. Sim-A's single-enemy / no-skill controller calls these but
// the stubs always pick the trivially-correct option (only target, never retreat,
// no skill).

export interface RetreatCheckState {
  heroHp: number;
  heroHpMax: number;
  // Future: bp, encounters seen, etc.
}

export class HeroDecisionAI {
  constructor(private readonly traits: readonly TraitId[]) {}

  getTraits(): readonly TraitId[] {
    return this.traits;
  }

  chooseTargetEnemyId(aliveEnemyIds: readonly string[]): string | null {
    if (aliveEnemyIds.length === 0) return null;
    return aliveEnemyIds[0]; // trivial: only target in Sim-B's single-enemy loop
  }

  shouldRetreat(_state: RetreatCheckState): boolean {
    return false; // Sim-C wires HP threshold + trait modifiers (신중 / 소극적)
  }

  chooseSkillId(_readySkillIds: readonly string[]): string | null {
    return null; // Sim-D wires skill priority once SkillSystem is integrated
  }
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- HeroDecisionAI`

Expected: PASS, 5 tests.

- [ ] **Step 3.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/HeroDecisionAI.ts games/inflation-rpg/src/cycle/__tests__/HeroDecisionAI.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-B T3 — HeroDecisionAI stub (interface frozen, decisions deferred to Sim-C)"
```

---

## Task 4: AutoBattleController accepts traits + applies mods

**Files:**
- Modify: `games/inflation-rpg/src/cycle/AutoBattleController.ts`
- Modify: `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`
- Modify: `games/inflation-rpg/src/cycle/cycleEvents.ts` (cycle_start adds traitIds)

- [ ] **Step 4.1: Write failing tests**

Append to `games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts`:

```ts
describe('AutoBattleController — trait modifiers', () => {
  it('cycle_start event carries traitIds (was deferred from Sim-A)', () => {
    const ctrl = new AutoBattleController({
      loadout: minimalLoadout(),
      seed: 42,
      traits: ['t_genius', 't_fragile'],
    });
    const ev = ctrl.getEvents()[0];
    expect(ev.type).toBe('cycle_start');
    if (ev.type === 'cycle_start') {
      expect(ev.traitIds).toEqual(['t_genius', 't_fragile']);
    }
  });

  it('empty traits yields legacy behavior (cycle_start has traitIds: [])', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const ev = ctrl.getEvents()[0];
    if (ev.type === 'cycle_start') {
      expect(ev.traitIds).toEqual([]);
    }
  });

  it('t_fragile (hpMul 0.7) reduces starting heroHpMax', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroHpMax: 100 },
      seed: 42,
      traits: ['t_fragile'],
    });
    expect(ctrl.getState().heroHpMax).toBe(70);
    expect(ctrl.getState().heroHp).toBe(70);
  });

  it('t_genius (expMul 1.2) accelerates level-ups', () => {
    const aNo = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
    });
    const aGenius = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_genius'],
    });
    for (let i = 0; i < 100; i++) { aNo.tick(600); aGenius.tick(600); }
    expect(aGenius.getState().heroLv).toBeGreaterThanOrEqual(aNo.getState().heroLv);
  });

  it('t_terminal_genius (bpCostMul 2) consumes BP twice as fast', () => {
    const aNo = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 8, heroAtkBase: 100000 },
      seed: 42,
    });
    const aBoom = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 8, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_terminal_genius'],
    });
    for (let i = 0; i < 50; i++) { aNo.tick(600); aBoom.tick(600); }
    // 시한부 천재 should end in roughly half the kills (per encounter BP cost doubled).
    const noKills = aNo.getEvents().filter(e => e.type === 'enemy_kill').length;
    const boomKills = aBoom.getEvents().filter(e => e.type === 'enemy_kill').length;
    expect(boomKills).toBeLessThan(noKills);
  });
});
```

- [ ] **Step 4.2: Run tests to verify the new ones fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: 5 new tests FAIL.

- [ ] **Step 4.3: Wire traits into ControllerOptions + apply mods**

Edit `games/inflation-rpg/src/cycle/cycleEvents.ts` — extend `cycle_start`:

```ts
// In the CycleEvent union, replace the cycle_start variant:
| (CycleEventBase & { type: 'cycle_start'; loadoutHash: string; seed: number; characterId: string; traitIds: TraitId[] })
```

Add the import at top:

```ts
import type { TraitId } from './traits';
```

Edit `games/inflation-rpg/src/cycle/AutoBattleController.ts`:

1. Import:
   ```ts
   import { applyTraitMods, type TraitId, type ResolvedLoadout } from './traits';
   import { TRAIT_CATALOG } from '../data/traits';
   ```

2. Extend `ControllerOptions`:
   ```ts
   export interface ControllerOptions {
     loadout: ControllerLoadout;
     seed: number;
     traits?: TraitId[];
     roundMs?: number;
   }
   ```

3. In the constructor, resolve loadout before initializing state:
   ```ts
   const traitIds = opts.traits ?? [];
   const resolved: ResolvedLoadout = applyTraitMods(opts.loadout, traitIds, TRAIT_CATALOG);
   this.loadout = resolved;
   // store traitIds + multipliers on `this` for later use
   this.expMul = resolved.expMul;
   this.goldMul = resolved.goldMul;
   this.bpCostMul = resolved.bpCostMul;
   this.traitIds = traitIds;
   // build state from resolved.heroHpMax / heroAtkBase
   ```

   Add private fields:
   ```ts
   private expMul: number;
   private goldMul: number;
   private bpCostMul: number;
   private traitIds: TraitId[];
   ```

   Update the `cycle_start` emit:
   ```ts
   this.emit({
     t: 0,
     type: 'cycle_start',
     loadoutHash: hashLoadout(opts.loadout),
     seed: opts.seed,
     characterId: opts.loadout.characterId,
     traitIds,
   });
   ```

4. In `killEnemy()`, apply expMul / goldMul:
   ```ts
   const exp = Math.max(1, Math.floor(this.state.heroLv * 10 * this.expMul));
   const gold = Math.max(1,
     Math.floor((this.state.heroLv * 2) * this.goldMul) + this.rng.int(this.state.heroLv)
   );
   ```

5. In `consumeBp()`, apply bpCostMul:
   ```ts
   private consumeBp(amount: number, cause: string): void {
     const cost = Math.max(1, Math.floor(amount * this.bpCostMul));
     this.state.bp = Math.max(0, this.state.bp - cost);
     this.emit({
       t: this.state.tNowMs,
       type: 'bp_change',
       delta: -cost,
       remaining: this.state.bp,
       cause,
     });
     if (this.state.bp <= 0) {
       this.endCycle('bp_exhausted');
     }
   }
   ```

Note: the `ControllerLoadout` type itself isn't extended — `applyTraitMods` returns the enriched object and the controller stores the multipliers separately. This keeps `ControllerLoadout` as the public input shape callers construct.

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AutoBattleController`

Expected: PASS, 24 tests total (was 19, +5 new).

Note: the existing Sim-A test "emits cycle_start event on first construction" may also need updating since cycle_start now requires `traitIds`. Verify it still passes — TypeScript should narrow it correctly because the field is required.

- [ ] **Step 4.5: Commit**

```bash
git add games/inflation-rpg/src/cycle/AutoBattleController.ts games/inflation-rpg/src/cycle/cycleEvents.ts games/inflation-rpg/src/cycle/__tests__/AutoBattleController.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-B T4 — controller accepts traits, applies hp/atk/exp/gold/bp mods, emits traitIds in cycle_start"
```

---

## Task 5: TraitSelector React component

**Files:**
- Create: `games/inflation-rpg/src/components/TraitSelector.tsx`
- Create: `games/inflation-rpg/src/components/__tests__/TraitSelector.test.tsx`

- [ ] **Step 5.1: Write failing test**

Create `games/inflation-rpg/src/components/__tests__/TraitSelector.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraitSelector } from '../TraitSelector';
import type { TraitId } from '../../cycle/traits';

const availableIds: TraitId[] = ['t_genius', 't_fragile', 't_challenge', 't_timid'];

describe('TraitSelector', () => {
  it('renders all available trait names', () => {
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={[]}
        maxSlots={3}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('천재')).toBeInTheDocument();
    expect(screen.getByText('허약함')).toBeInTheDocument();
    expect(screen.getByText('도전적')).toBeInTheDocument();
    expect(screen.getByText('소극적')).toBeInTheDocument();
  });

  it('shows slot count "선택: 0 / 3" by default', () => {
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={[]}
        maxSlots={3}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('trait-slot-count')).toHaveTextContent('0 / 3');
  });

  it('clicking an unselected trait adds it', () => {
    const onChange = vi.fn();
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={[]}
        maxSlots={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('trait-card-t_genius'));
    expect(onChange).toHaveBeenCalledWith(['t_genius']);
  });

  it('clicking a selected trait removes it', () => {
    const onChange = vi.fn();
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={['t_genius']}
        maxSlots={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('trait-card-t_genius'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('clicking an unselected trait when slots are full does NOT call onChange', () => {
    const onChange = vi.fn();
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={['t_genius', 't_fragile', 't_challenge']}
        maxSlots={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('trait-card-t_timid'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selected traits get a visual selected state (data-selected="true")', () => {
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={['t_genius']}
        maxSlots={3}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('trait-card-t_genius')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('trait-card-t_fragile')).toHaveAttribute('data-selected', 'false');
  });
});
```

- [ ] **Step 5.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- TraitSelector`

Expected: FAIL — module not found.

- [ ] **Step 5.3: Implement TraitSelector**

Create `games/inflation-rpg/src/components/TraitSelector.tsx`:

```tsx
import type { TraitId } from '../cycle/traits';
import { TRAIT_CATALOG } from '../data/traits';

interface Props {
  availableIds: readonly TraitId[];
  selectedIds: readonly TraitId[];
  maxSlots: number;
  onChange: (next: TraitId[]) => void;
}

export function TraitSelector({ availableIds, selectedIds, maxSlots, onChange }: Props) {
  const selectedSet = new Set(selectedIds);
  const handleClick = (id: TraitId) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else if (selectedIds.length < maxSlots) {
      onChange([...selectedIds, id]);
    }
    // else: full and clicking new → ignore
  };

  return (
    <div data-testid="trait-selector">
      <div data-testid="trait-slot-count" style={{ marginBottom: 8 }}>
        선택: {selectedIds.length} / {maxSlots}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {availableIds.map(id => {
          const t = TRAIT_CATALOG[id];
          const selected = selectedSet.has(id);
          return (
            <button
              key={id}
              type="button"
              data-testid={`trait-card-${id}`}
              data-selected={selected}
              onClick={() => handleClick(id)}
              style={{
                padding: 8,
                border: selected ? '2px solid #f5c542' : '1px solid #555',
                background: selected ? '#3a3520' : '#1a1a1a',
                color: '#eee',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{t.nameKR}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{t.descKR}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- TraitSelector`

Expected: PASS, 6 tests.

- [ ] **Step 5.5: Commit**

```bash
git add games/inflation-rpg/src/components/TraitSelector.tsx games/inflation-rpg/src/components/__tests__/TraitSelector.test.tsx
git commit -m "feat(game-inflation-rpg): Phase Sim-B T5 — TraitSelector React component (N-slot picker with slot cap)"
```

---

## Task 6: CyclePrep screen

**Files:**
- Create: `games/inflation-rpg/src/screens/CyclePrep.tsx`
- Create: `games/inflation-rpg/src/screens/__tests__/CyclePrep.test.tsx`

- [ ] **Step 6.1: Write failing test**

Create `games/inflation-rpg/src/screens/__tests__/CyclePrep.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CyclePrep } from '../CyclePrep';
import { useGameStore } from '../../store/gameStore';
import { useCycleStore } from '../../cycle/cycleSlice';

describe('CyclePrep', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
  });

  it('renders TraitSelector + Start button', () => {
    render(<CyclePrep onStart={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('trait-selector')).toBeInTheDocument();
    expect(screen.getByTestId('btn-prep-start')).toBeInTheDocument();
  });

  it('Start button calls onStart and seeds cycleStore with selected traits', () => {
    const onStart = vi.fn();
    render(<CyclePrep onStart={onStart} onCancel={() => {}} />);
    fireEvent.click(screen.getByTestId('trait-card-t_genius'));
    fireEvent.click(screen.getByTestId('btn-prep-start'));
    expect(onStart).toHaveBeenCalled();
    expect(useCycleStore.getState().status).toBe('running');
    const ctrl = useCycleStore.getState().controller!;
    expect(ctrl.getEvents()[0].type).toBe('cycle_start');
    if (ctrl.getEvents()[0].type === 'cycle_start') {
      expect((ctrl.getEvents()[0] as { traitIds: string[] }).traitIds).toContain('t_genius');
    }
  });

  it('only base-tier traits are available initially (filtered by meta.traitsUnlocked)', () => {
    // gameStore.meta.traitsUnlocked starts as BASE_TRAIT_IDS (Task 7 ensures this).
    render(<CyclePrep onStart={() => {}} onCancel={() => {}} />);
    // mid-tier trait should not be selectable as a card
    expect(screen.queryByTestId('trait-card-t_boss_hunter')).toBeNull();
    // base-tier trait should be selectable
    expect(screen.getByTestId('trait-card-t_genius')).toBeInTheDocument();
  });

  it('Cancel button returns to menu', () => {
    const onCancel = vi.fn();
    render(<CyclePrep onStart={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('btn-prep-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- CyclePrep`

Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement CyclePrep**

Create `games/inflation-rpg/src/screens/CyclePrep.tsx`:

```tsx
import { useState } from 'react';
import { TraitSelector } from '../components/TraitSelector';
import { useCycleStore } from '../cycle/cycleSlice';
import { useGameStore } from '../store/gameStore';
import type { TraitId } from '../cycle/traits';

interface Props {
  onStart: () => void;
  onCancel: () => void;
}

const DEFAULT_SLOTS = 3;

export function CyclePrep({ onStart, onCancel }: Props) {
  const [selected, setSelected] = useState<TraitId[]>([]);
  const startCycle = useCycleStore(s => s.start);
  const characterId = useGameStore(s => s.meta.lastPlayedCharId ?? 'K01');
  const available = useGameStore(s => s.meta.traitsUnlocked) as readonly TraitId[];

  const handleStart = () => {
    startCycle({
      loadout: {
        characterId,
        bpMax: 30,
        heroHpMax: 100,
        heroAtkBase: 50,
      },
      seed: Date.now() & 0xffffffff,
      traits: selected,
    });
    onStart();
  };

  return (
    <div data-testid="cycle-prep" style={{ padding: 16 }}>
      <h2>사이클 준비</h2>
      <p style={{ opacity: 0.8, fontSize: 13 }}>
        성격 · 성향을 정하면 hero 가 그대로 사이클을 살아낸다.
      </p>
      <TraitSelector
        availableIds={available}
        selectedIds={selected}
        maxSlots={DEFAULT_SLOTS}
        onChange={setSelected}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" data-testid="btn-prep-start" onClick={handleStart}>
          출발
        </button>
        <button type="button" data-testid="btn-prep-cancel" onClick={onCancel}>
          돌아가기
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- CyclePrep`

Expected: PASS, 4 tests.

(The "only base-tier traits available" test depends on Task 7's persist migration adding `traitsUnlocked: BASE_TRAIT_IDS` to `INITIAL_META`. If Task 7 hasn't run yet, this test may fail because `traitsUnlocked` is undefined. To unblock T6 before T7: temporarily seed `useGameStore.setState({ meta: { ...meta, traitsUnlocked: BASE_TRAIT_IDS }})` in the test's `beforeEach`. Remove this workaround after T7. Or simply run T6 + T7 together.)

- [ ] **Step 6.5: Commit**

```bash
git add games/inflation-rpg/src/screens/CyclePrep.tsx games/inflation-rpg/src/screens/__tests__/CyclePrep.test.tsx
git commit -m "feat(game-inflation-rpg): Phase Sim-B T6 — CyclePrep screen (trait selector → cycle start)"
```

---

## Task 7: Persist v15 → v16 (traitsUnlocked)

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Create: `games/inflation-rpg/src/store/__tests__/migrate-v15-v16.test.ts`

- [ ] **Step 7.1: Write failing migration test**

Create `games/inflation-rpg/src/store/__tests__/migrate-v15-v16.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';
import { BASE_TRAIT_IDS } from '../../data/traits';

describe('Persist v15 → v16 migration', () => {
  it('adds traitsUnlocked: BASE_TRAIT_IDS to meta when migrating from v15', () => {
    const v15State = {
      run: {},
      meta: {
        characterLevels: {},
        cycleHistory: [],
      },
    };
    const migrated = runStoreMigration(v15State, 15);
    expect(migrated.meta.traitsUnlocked).toEqual([...BASE_TRAIT_IDS]);
  });

  it('preserves existing meta fields', () => {
    const v15State = {
      run: {},
      meta: {
        characterLevels: { K01: 5 },
        cycleHistory: [{ endedAtMs: 1, durationMs: 100, maxLevel: 17, reason: 'bp_exhausted', seed: 42 }],
      },
    };
    const migrated = runStoreMigration(v15State, 15);
    expect(migrated.meta.cycleHistory.length).toBe(1);
    expect(migrated.meta.characterLevels.K01).toBe(5);
  });

  it('is no-op when state already at v16 (has traitsUnlocked)', () => {
    const v16State = {
      meta: { traitsUnlocked: ['t_genius'] },
    };
    const migrated = runStoreMigration(v16State, 16);
    expect(migrated.meta.traitsUnlocked).toEqual(['t_genius']);
  });
});
```

- [ ] **Step 7.2: Run test to verify failure**

Run: `pnpm --filter @forge/game-inflation-rpg test -- migrate-v15-v16`

Expected: FAIL.

- [ ] **Step 7.3: Update types.ts**

In `games/inflation-rpg/src/types.ts`:

Import:
```ts
import type { TraitId } from './cycle/traits';
```

Add to `MetaState`:
```ts
traitsUnlocked: TraitId[];
```

- [ ] **Step 7.4: Bump STORE_VERSION + migration**

In `games/inflation-rpg/src/store/gameStore.ts`:

1. Add import:
   ```ts
   import { BASE_TRAIT_IDS } from '../data/traits';
   ```

2. Change `version: 15` to `version: 16` in the persist config.

3. In `INITIAL_META`, add:
   ```ts
   traitsUnlocked: [...BASE_TRAIT_IDS],
   ```

4. In `runStoreMigration`, add the v15 → v16 branch (after the v14 → v15 branch):
   ```ts
   if (fromVersion <= 15 && s.meta) {
     if (!s.meta.traitsUnlocked) {
       s.meta.traitsUnlocked = [...BASE_TRAIT_IDS];
     }
   }
   ```

- [ ] **Step 7.5: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- migrate-v15-v16`

Expected: PASS, 3 tests.

- [ ] **Step 7.6: Run full test suite (regression check)**

Run: `pnpm --filter @forge/game-inflation-rpg test`

Expected: all pass. If `v9-migration.spec.ts` (e2e) asserts STORE_VERSION === 15, bump to 16 in a fixup commit.

- [ ] **Step 7.7: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/__tests__/migrate-v15-v16.test.ts
git commit -m "feat(game-inflation-rpg): Phase Sim-B T7 — persist v15 → v16 migration (MetaState.traitsUnlocked: TraitId[])"
```

---

## Task 8: MainMenu → CyclePrep + App routing

**Files:**
- Modify: `games/inflation-rpg/src/types.ts` (Screen union)
- Modify: `games/inflation-rpg/src/App.tsx`
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`

- [ ] **Step 8.1: Add 'cycle-prep' to Screen union**

In `games/inflation-rpg/src/types.ts`, find the `Screen` type and add `'cycle-prep'`.

- [ ] **Step 8.2: Add App routing branch**

In `games/inflation-rpg/src/App.tsx`:

Import `CyclePrep`:
```tsx
import { CyclePrep } from './screens/CyclePrep';
```

Add the render branch (use the same pattern as the existing cycle-runner / cycle-result branches — likely `useGameStore.getState().setScreen('cycle-runner')`):
```tsx
{screen === 'cycle-prep' && (
  <CyclePrep
    onStart={() => setScreen('cycle-runner')}
    onCancel={() => setScreen('main-menu')}
  />
)}
```

Adjust the navigation pattern to match the existing code (whether it's `setScreen` from store, or whatever).

- [ ] **Step 8.3: Change MainMenu's Start Cycle button**

In `games/inflation-rpg/src/screens/MainMenu.tsx`:

Remove the inline `startCycle(...)` call from `handleStartCycle`. The new handler just navigates to cycle-prep:

```tsx
const handleStartCycle = () => {
  setScreen('cycle-prep');
};
```

Drop the unused `startCycle` selector if no longer needed in this file.

- [ ] **Step 8.4: Manually verify the flow**

Run typecheck + test:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
```

Both must pass.

- [ ] **Step 8.5: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/App.tsx games/inflation-rpg/src/screens/MainMenu.tsx
git commit -m "feat(game-inflation-rpg): Phase Sim-B T8 — MainMenu → CyclePrep → CycleRunner flow (replaces direct start)"
```

---

## Task 9: Update Sim-A e2e + add trait e2e

**Files:**
- Modify: `games/inflation-rpg/tests/e2e/cycle-vertical-slice.spec.ts`
- Create: `games/inflation-rpg/tests/e2e/cycle-prep-traits.spec.ts`

- [ ] **Step 9.1: Update existing cycle-vertical-slice.spec.ts**

The existing spec clicks `btn-start-cycle` and expects to land on `cycle-runner`. Now it lands on `cycle-prep`. Update the spec to either:
- (a) Click through cycle-prep with no traits → "출발" button → cycle-runner, OR
- (b) Skip prep — Sim-B doesn't gate cycle on at-least-one-trait.

Use (a):

After `await page.getByTestId('btn-start-cycle').click();`, add:

```ts
await expect(page.getByTestId('cycle-prep')).toBeVisible({ timeout: 5_000 });
// Start with zero traits selected
await page.getByTestId('btn-prep-start').click();
// Now cycle-runner mounts
await expect(page.getByTestId('cycle-runner')).toBeVisible({ timeout: 5_000 });
```

Rest of the spec is unchanged.

- [ ] **Step 9.2: Create new trait-selection e2e**

Create `games/inflation-rpg/tests/e2e/cycle-prep-traits.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Phase Sim-B trait selection', () => {
  test('select 2 traits → start cycle → result shows non-empty levelCurve', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/games/inflation-rpg');
    await page.evaluate(() => localStorage.removeItem('korea_inflation_rpg_save'));
    await page.reload();

    // Dismiss tutorial if visible
    const tutorial = page.getByTestId('tutorial-overlay');
    if (await tutorial.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '건너뛰기' }).click();
    }

    await page.getByTestId('btn-start-cycle').click();
    await expect(page.getByTestId('cycle-prep')).toBeVisible();

    // Select 천재 + 광전사 (both base-tier per TRAIT_CATALOG)
    await page.getByTestId('trait-card-t_genius').click();
    await page.getByTestId('trait-card-t_berserker').click();
    await expect(page.getByTestId('trait-slot-count')).toHaveText('선택: 2 / 3');

    await page.getByTestId('btn-prep-start').click();
    await expect(page.getByTestId('cycle-runner')).toBeVisible();
    await expect(page.getByTestId('cycle-result')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('result-max-level')).toBeVisible();
  });

  test('cancel button returns to main menu', async ({ page }) => {
    await page.goto('/games/inflation-rpg');
    await page.evaluate(() => localStorage.removeItem('korea_inflation_rpg_save'));
    await page.reload();
    const tutorial = page.getByTestId('tutorial-overlay');
    if (await tutorial.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '건너뛰기' }).click();
    }
    await page.getByTestId('btn-start-cycle').click();
    await expect(page.getByTestId('cycle-prep')).toBeVisible();
    await page.getByTestId('btn-prep-cancel').click();
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
  });
});
```

- [ ] **Step 9.3: Run e2e**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg e2e -- cycle-prep-traits
pnpm --filter @forge/game-inflation-rpg e2e -- cycle-vertical-slice
```

Expected: both PASS.

- [ ] **Step 9.4: Commit**

```bash
git add games/inflation-rpg/tests/e2e/cycle-prep-traits.spec.ts games/inflation-rpg/tests/e2e/cycle-vertical-slice.spec.ts
git commit -m "test(game-inflation-rpg): Phase Sim-B T9 — e2e for trait selection + Sim-A spec updated for new prep flow"
```

---

## Task 10: Final verification + tag

**Files:** None new.

- [ ] **Step 10.1: Run full workspace verification**

From repo root:
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm circular
pnpm --filter @forge/game-inflation-rpg e2e
pnpm --filter @forge/game-inflation-rpg build:web
```

All must pass.

- [ ] **Step 10.2: Smoke-run sim:cycle with trait flag**

The CLI doesn't currently accept --traits. Optional sub-task: add a `--traits 'id1,id2'` flag to `scripts/sim-cycle.ts` to pass traits through to the controller. If you skip it, document the limitation in the CHANGELOG entry.

If you add it:
```ts
const traits = parseArg('traits', '').split(',').filter(Boolean) as TraitId[];
runSim({ ..., loadout: { ... }, traits, ... });
```

And extend `SimOptions` + `runSim` to accept `traits`.

Smoke:
```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle -- --count 5 --traits t_genius,t_fragile --seed 42
```

- [ ] **Step 10.3: CHANGELOG entry**

Append to `games/inflation-rpg/CHANGELOG.md`:

```markdown
## Phase Sim-B — Trait Foundation (2026-MM-DD)

- `src/cycle/traits.ts` — Trait / TraitModifiers / ResolvedLoadout types + applyTraitMods resolver
- `src/data/traits.ts` — TRAIT_CATALOG 16 entries (spec §16), BASE_TRAIT_IDS
- `src/cycle/HeroDecisionAI.ts` — stub (interface frozen, Sim-C wires bodies)
- `AutoBattleController` accepts `traits?: TraitId[]`, applies HP/ATK/EXP/gold/BP mods
- `CycleEvent.cycle_start` adds `traitIds: TraitId[]` (Sim-A T1 handoff fulfilled)
- `CyclePrep` screen + `TraitSelector` component (N=3 slots)
- MainMenu → CyclePrep → CycleRunner → CycleResult flow
- Persist v15 → v16 (`MetaState.traitsUnlocked: TraitId[]`)
- `cycle-prep-traits.spec.ts` Playwright e2e + Sim-A spec updated
```

Commit:
```bash
git add games/inflation-rpg/CHANGELOG.md
git commit -m "docs(game-inflation-rpg): Phase Sim-B — CHANGELOG entry"
```

- [ ] **Step 10.4: Tag**

```bash
git tag phase-sim-b-complete
```

Done — hand off to `finishing-a-development-branch` for merge.

---

## Out-of-band notes

- **HeroDecisionAI is a stub.** Tests assert stub behavior; Sim-C will replace the bodies. Don't add real decisions in this phase.
- **trait magnitudes are placeholders.** `t_genius = expMul 1.2`, `t_fragile = hpMul 0.7`, etc. Phase Sim-G runs balance sweeps to tune. Resist the urge to "make them feel right" via vibes.
- **BASE_TRAIT_IDS** determines what shows up in CyclePrep on a fresh save. Currently 11 out of 16 (per catalog `unlockTier: 'base'`). Mid/rare unlock progression is Sim-E's job.
- **`traitsUnlocked` is per-save persistent state** — players accumulate unlocks via meta progression. Sim-B seeds it with the base set; Sim-E adds the unlock cadence.
- **e2e timing:** new trait selector adds ~2s to each Sim-A-equivalent flow run. Total e2e wall-clock for inflation-rpg suite is now ~5–6 min (up from ~4 min). Worth budgeting.
