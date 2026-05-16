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
