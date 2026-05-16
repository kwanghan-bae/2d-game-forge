// Event stream emitted by AutoBattleController.
// Sim-A covers cycle_start / battle_start / hero_hit / enemy_hit / enemy_kill /
// level_up / bp_change / cycle_end. Other event types in spec §6.5 land in later phases.

import type { TraitId } from './traits';

export type CycleEventBase = { t: number };

export type CycleEndReason = 'bp_exhausted' | 'abandoned' | 'forced';

// `cycle_start` includes `traitIds: TraitId[]` (added in Sim-B T4; empty array when
// no traits are selected, preserving backward compatibility with Sim-A callers).
export type CycleEvent =
  | (CycleEventBase & { type: 'cycle_start'; loadoutHash: string; seed: number; characterId: string; traitIds: TraitId[] })
  | (CycleEventBase & { type: 'battle_start'; enemyId: string; isBoss: boolean; heroLv: number; heroHp: number; enemyHp: number })
  | (CycleEventBase & { type: 'hero_hit'; enemyId: string; damage: number; remaining: number })
  | (CycleEventBase & { type: 'enemy_hit'; enemyId: string; damage: number; remaining: number })
  | (CycleEventBase & { type: 'enemy_kill'; enemyId: string; expGain: number; goldGain: number; dropIds: string[] })
  | (CycleEventBase & { type: 'level_up'; from: number; to: number; statDelta: Record<string, number> })
  | (CycleEventBase & { type: 'bp_change'; delta: number; remaining: number; cause: string })
  | (CycleEventBase & { type: 'cycle_end'; reason: CycleEndReason; durationMs: number; maxLevel: number; finalState: Record<string, unknown> });

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
  reason: CycleEndReason;
}

// Trimmed shape persisted in MetaState.cycleHistory[]. Capped to last N entries
// (cap defined in gameStore migration).
export interface CycleHistoryEntry {
  endedAtMs: number;
  durationMs: number;
  maxLevel: number;
  reason: CycleEndReason;
  seed: number;
}
