/**
 * Cycle 282 — Sub-phase σ T2: trait auto-roll pure function.
 *
 * 호출 = HeroLifecycle level-up path. milestone level 도달 시 chance roll.
 *
 * Rules:
 *  - milestone level set = { 5, 15, 30, 50, 80 } (5 milestone)
 *  - chance per milestone = 0.30 (30%)
 *  - 중복 방지 — existingTraits 와 disjoint
 *  - 균등 random pool (personality 비례 미적용, 미래 cycle carry-over)
 *  - level 외 trigger 도 미적용 (예: kill count, age tier)
 *
 * Return = TraitId 또는 null (roll fail / 풀 소진 / milestone 외).
 */
import type { SeededRng } from '../cycle/SeededRng';
import type { TraitId } from '../cycle/traits';

export const TRAIT_ROLL_MILESTONES = [5, 15, 30, 50, 80] as const;
export const TRAIT_ROLL_CHANCE = 0.30;

/** 전체 TraitId 풀 — cycle/traits.ts 의 16 union 과 정합. */
const TRAIT_POOL: readonly TraitId[] = [
  't_challenge', 't_timid', 't_thrill', 't_genius', 't_fragile',
  't_terminal_genius', 't_explorer', 't_berserker', 't_miser', 't_boss_hunter',
  't_fortune', 't_zealot', 't_swift', 't_iron', 't_prodigy', 't_lucky',
];

/**
 * level 도달 시 trait roll. milestone 이 아니거나 chance fail 시 null.
 * 중복 방지 — existingTraits 풀 제외 후 균등 random.
 */
export function rollTrait(
  rng: SeededRng,
  existingTraits: readonly TraitId[],
  level: number,
): TraitId | null {
  if (!TRAIT_ROLL_MILESTONES.includes(level as 5 | 15 | 30 | 50 | 80)) return null;
  if (!rng.chance(TRAIT_ROLL_CHANCE)) return null;
  const existing = new Set(existingTraits);
  const available = TRAIT_POOL.filter(t => !existing.has(t));
  if (available.length === 0) return null;
  return available[rng.int(available.length)] ?? null;
}
