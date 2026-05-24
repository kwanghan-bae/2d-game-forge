/**
 * Cycle-18 — sim/real parity helper.
 *
 * Pure transform applied at the end of every cycle. Both
 * `cycleSliceV2.endCycle` (the live store) and
 * `scripts/sim-cycle-v2.ts` (the chained headless driver) call this so that
 * any change to the cycle-end semantics propagates to both paths
 * automatically.
 *
 * Cycle 11's false-PASS (sim mismatching live store) + cycle 14's gate-
 * stuck pattern both rooted in the sim/live mirror drift. This helper is
 * the single source of truth for that mutation.
 *
 * Side effects (logs, SagaStorage.append, cycle-store status flip) stay
 * outside — only the gameStore `meta` + `run` transform lives here.
 */
import { spend } from '../meta/MetaProgression';
import type { MetaState, RunState } from '../types';

export interface EndCycleStats {
  /** Hero's final level — fed into goldFromCycle by the caller. */
  maxLevel: number;
  kills: number;
  bossKills: number;
  drops: number;
}

export interface ApplyEndCycleArgs {
  /** Gold already computed by `goldFromCycle(stats)` at the call site. */
  gold: number;
}

/**
 * Structural subset of the game store this helper reads from / writes to.
 * Decouples the helper from the full `GameStore` interface (which carries
 * 40+ action methods we never touch). The setState call in both call
 * sites passes the full store; we only need meta + run.
 */
export interface EndCycleStateSlice {
  meta: MetaState;
  run: RunState;
}

/**
 * Pure transform — does NOT mutate input. Returns a new state slice with:
 *   - meta.sponsorGold + gold spent via balanced strategy
 *   - meta.atkBaseBonus / hpBaseBonus updated from spend output
 *   - run.currentRealmId reset to 'base' (cycle-5 F1 stale-realm guard)
 *   - run.npcs cleared (carry-over leftovers belong to prior cycle)
 *
 * Other meta fields (sagaHistory, unlockedRealms, light, season, ...) are
 * preserved as-is. sagaHistory mutation is owned by `SagaStorage.append`
 * which the caller runs separately.
 */
export function applyEndCycleMeta<S extends EndCycleStateSlice>(state: S, args: ApplyEndCycleArgs): S {
  const { gold } = args;
  const totalGold = (state.meta.sponsorGold ?? 0) + gold;
  const out = spend({
    gold: totalGold,
    atkBaseBonus: state.meta.atkBaseBonus ?? 0,
    hpBaseBonus: state.meta.hpBaseBonus ?? 0,
    strategy: 'balanced',
  });
  return {
    ...state,
    meta: {
      ...state.meta,
      sponsorGold: out.goldRemaining,
      atkBaseBonus: out.atkBaseBonus,
      hpBaseBonus: out.hpBaseBonus,
    },
    run: {
      ...state.run,
      currentRealmId: 'base',
      npcs: [],
    },
  };
}
