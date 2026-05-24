import type { LandmarkKind } from '../data/landmarks';
import type { PersonalityDim } from '../hero/PersonalityState';
import type { Chapter } from '../hero/HeroLifecycle';

export type OverworldEvent =
  | { type: 'tick';            t: number }
  | { type: 'arrived_at';      landmarkId: string; landmarkKind: LandmarkKind }
  | { type: 'battle_started';  enemyId: string }
  | { type: 'battle_won';      enemyId: string; expGain: number; dropId: string | null }
  | { type: 'level_up';        from: number; to: number }
  | { type: 'job_unlocked';    jobId: string; jobNameKR: string; tier: 1 | 2 | 3 }
  | { type: 'skill_learned';   skillId: string; skillNameKR: string; atkBefore: number; atkAfter: number }
  | { type: 'shrine_visited';  landmarkId: string; healed: number }
  | { type: 'moral_choice';    choice: string; dim: PersonalityDim; delta: number; nameKR: string }
  | { type: 'chapter_transition'; fromChapter: Chapter; toChapter: Chapter; atAge: number }
  | { type: 'hero_died';       cause: '전사' | '자연사'; enemyId?: string; oldLevel: number; newLevel: number }
  | { type: 'realm_unlocked'; realmId: import('../types').RealmId }
  | { type: 'realm_entered'; realmId: import('../types').RealmId }
  | { type: 'npc_encounter'; npcInstanceId: string; npcKind: import('../types').NpcEntity['kind'] }
  | { type: 'npc_died'; npcInstanceId: string }
  | { type: 'family_event'; eventKind: 'marriage' | 'child_birth' | 'parent_death' | 'child_grown'; npcInstanceId?: string }
  // Cycle-5 F3: optional cause discriminates pathfinder-exhausted (`'무위'`)
  // from natural cycle end. Falsy/undefined falls through to controller default
  // `'자연사'` so existing tests / abandon flows stay unchanged.
  | { type: 'cycle_ended'; cause?: import('../saga/SagaTypes').DeathCause }
  // V3-H F3: sightseeing landmark arrived
  | { type: 'sightseeing_arrived'; landmarkId: string; landmarkNameKR: string }
  // V3-H F4: meditation (shrine 20% 변형)
  | { type: 'meditation_done'; landmarkId: string }
  // V3-H F5: trial result
  | { type: 'trial_resolved'; trialLv: number; outcome: 'win' | 'lose'; oldLevel?: number; newLevel?: number }
  // V3-H F6: season change
  | { type: 'season_changed'; season: import('../types').SeasonId };
