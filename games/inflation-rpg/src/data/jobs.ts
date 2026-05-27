import type { PersonalityDim } from '../hero/PersonalityState';

export type JobMilestone = 'age10' | 'age30' | 'age50';
export type JobTier = 1 | 2 | 3;

export interface Job {
  id: string;
  nameKR: string;
  emoji: string;
  tier: JobTier;
  milestone: JobMilestone;
  /** Personality requirement. `min > 0` = need >= min on that dim. `min < 0` = need <= min. null = unconditional fallback. */
  requiredPersonality: { dim: PersonalityDim; min: number } | null;
  /** Multiplicative bonus to atkBase on unlock. */
  atkMul: number;
  /** Multiplicative bonus to hpBase on unlock. */
  hpMul: number;
}

export const JOBS: readonly Job[] = [
  // Tier 1 — age 10 (어린시절 → 청년기)
  { id: 'warrior',     nameKR: '전사',     emoji: '⚔️', tier: 1, milestone: 'age10', requiredPersonality: { dim: 'heroic',  min:  2 }, atkMul: 1.3, hpMul: 1.2 },
  { id: 'archer',      nameKR: '궁수',     emoji: '🏹', tier: 1, milestone: 'age10', requiredPersonality: { dim: 'prudent', min:  2 }, atkMul: 1.4, hpMul: 1.0 },
  { id: 'rogue',       nameKR: '도적',     emoji: '🗡️', tier: 1, milestone: 'age10', requiredPersonality: { dim: 'moral',   min: -2 }, atkMul: 1.5, hpMul: 0.9 },
  { id: 'apprentice',  nameKR: '견습',     emoji: '📖', tier: 1, milestone: 'age10', requiredPersonality: null,                              atkMul: 1.1, hpMul: 1.1 },

  // Tier 2 — age 30 (청년기 → 장년기)
  { id: 'paladin',     nameKR: '성기사',   emoji: '🛡️', tier: 2, milestone: 'age30', requiredPersonality: { dim: 'heroic',   min:  5 }, atkMul: 1.8, hpMul: 1.6 },
  { id: 'mage',        nameKR: '마법사',   emoji: '🔮', tier: 2, milestone: 'age30', requiredPersonality: { dim: 'pious',    min:  6 }, atkMul: 2.0, hpMul: 1.2 },
  { id: 'assassin',    nameKR: '암살자',   emoji: '🥷', tier: 2, milestone: 'age30', requiredPersonality: { dim: 'moral',    min: -5 }, atkMul: 2.2, hpMul: 1.1 },
  { id: 'priest',      nameKR: '사제',     emoji: '🙏', tier: 2, milestone: 'age30', requiredPersonality: { dim: 'merciful', min:  5 }, atkMul: 1.5, hpMul: 1.7 },
  { id: 'ranger',      nameKR: '레인저',   emoji: '🌲', tier: 2, milestone: 'age30', requiredPersonality: { dim: 'prudent',  min:  6 }, atkMul: 1.9, hpMul: 1.4 },
  { id: 'monk',        nameKR: '수도승',   emoji: '☯️', tier: 2, milestone: 'age30', requiredPersonality: { dim: 'prudent',  min:  5 }, atkMul: 1.7, hpMul: 1.5 },

  // Tier 3 — age 50 (장년기 → 노년기)
  { id: 'hero',        nameKR: '영웅',     emoji: '🌟', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'heroic',   min:  7 }, atkMul: 3.0, hpMul: 2.5 },
  { id: 'archmage',    nameKR: '대마법사', emoji: '🌌', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'pious',    min:  5 }, atkMul: 3.5, hpMul: 2.0 },
  { id: 'dark_lord',   nameKR: '암흑군주', emoji: '💀', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'moral',    min: -8 }, atkMul: 3.8, hpMul: 2.2 },
  { id: 'saint',       nameKR: '성자',     emoji: '👼', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'merciful', min:  7 }, atkMul: 2.5, hpMul: 3.0 },
  { id: 'grandmaster', nameKR: '대종사',   emoji: '🥋', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'prudent',  min:  5 }, atkMul: 3.2, hpMul: 2.5 },
  { id: 'sage',        nameKR: '현자',     emoji: '🧙', tier: 3, milestone: 'age50', requiredPersonality: null,                              atkMul: 2.8, hpMul: 2.8 },
];

export function findJobsForMilestone(milestone: JobMilestone): readonly Job[] {
  return JOBS.filter(j => j.milestone === milestone);
}

export function findJobById(id: string): Job | undefined {
  return JOBS.find(j => j.id === id);
}
