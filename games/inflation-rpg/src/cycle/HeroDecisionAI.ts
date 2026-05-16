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
