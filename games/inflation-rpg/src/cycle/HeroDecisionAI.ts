import type { TraitId } from './traits';

// Spec §6.2 defines 4 AI responsibilities:
//   1. 사냥터 선택 (encounter routing / dungeon selection) — stubs below
//   2. 깊이·후퇴 (depth / retreat thresholds)              — shouldRetreat
//   3. 타겟팅 (target priority)                             — chooseTargetEnemyId
//   4. skill (skill priority)                               — chooseSkillId
//
// The interface is complete for §6.2. Sim-C wires real trait-driven bodies.
// Sim-B stubs return the trivially-correct option (first-item-or-null).

export interface RetreatCheckState {
  heroHp: number;
  heroHpMax: number;
  // Future: bp, encounters seen, etc.
}

// Sim-C will extend with type ('enemy'|'merchant'|'trap'|'shrine'|...), tier, etc.
export interface EncounterNode {
  id: string;
}

// Sim-C will extend with tier, theme, etc.
export interface DungeonChoice {
  id: string;
}

export class HeroDecisionAI {
  constructor(private readonly traits: readonly TraitId[]) {}

  getTraits(): readonly TraitId[] {
    return this.traits;
  }

  // §6.2 responsibility 3: 타겟팅
  chooseTargetEnemyId(aliveEnemyIds: readonly string[]): string | null {
    if (aliveEnemyIds.length === 0) return null;
    return aliveEnemyIds[0]; // trivial: only target in Sim-B's single-enemy loop
  }

  // §6.2 responsibility 2: 깊이·후퇴
  shouldRetreat(_state: RetreatCheckState): boolean {
    return false; // Sim-C wires HP threshold + trait modifiers (신중 / 소극적)
  }

  // §6.2 responsibility 4: skill
  chooseSkillId(_readySkillIds: readonly string[]): string | null {
    return null; // Sim-D wires skill priority once SkillSystem is integrated
  }

  // §6.2 responsibility 1: 사냥터 선택 — encounter node routing
  // Sim-C: trait-influenced routing (탐험가 prefers shrines, 보스사냥꾼 prefers
  // boss nodes, etc.)
  chooseEncounterNode(_nodes: readonly EncounterNode[]): EncounterNode | null {
    if (_nodes.length === 0) return null;
    return _nodes[0]; // Sim-B stub: always first node
  }

  // §6.2 responsibility 1: 사냥터 선택 — dungeon selection
  // Sim-C: trait-influenced dungeon selection (도전적/시한부 천재 → deepest,
  // 소극적 → shallowest)
  chooseDungeon(_available: readonly DungeonChoice[]): DungeonChoice | null {
    if (_available.length === 0) return null;
    return _available[0]; // Sim-B stub: always first dungeon
  }
}
