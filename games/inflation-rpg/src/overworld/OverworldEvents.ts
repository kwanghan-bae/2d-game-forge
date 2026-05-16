import type { LandmarkKind } from '../data/landmarks';

export type OverworldEvent =
  | { type: 'tick';           t: number }
  | { type: 'arrived_at';     landmarkId: string; landmarkKind: LandmarkKind }
  | { type: 'battle_started'; enemyId: string }
  | { type: 'battle_won';     enemyId: string; expGain: number; dropId: string | null }
  | { type: 'level_up';       from: number; to: number }
  | { type: 'hero_died';      cause: '전사' | '자연사'; enemyId?: string }
  | { type: 'cycle_ended' };
