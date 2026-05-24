import type { HeroEntity } from './HeroEntity';
import { findSkillsForJob, HERO_SKILLS } from '../data/heroSkills';
import { SeededRng } from '../cycle/SeededRng';

export interface SkillLearnResult {
  skillId: string;
  skillNameKR: string;
  atkBefore: number;
  atkAfter: number;
}

export const SkillLearningSystem = {
  /** Grants one matching skill the hero hasn't learned yet. */
  tryLearn(hero: HeroEntity, seed: number): SkillLearnResult | null {
    const jobPool = hero.unlockedJobId ? findSkillsForJob(hero.unlockedJobId) : HERO_SKILLS.slice();
    const pool = jobPool.filter(s => !hero.learnedSkillIds.has(s.id));
    if (pool.length === 0) return null;
    const idx = new SeededRng(seed).int(pool.length);
    const skill = pool[idx]!;
    const atkBefore = hero.atk;
    hero.learnedSkillIds.add(skill.id);
    hero.atkBase = Math.max(1, Math.floor(hero.atkBase * skill.atkMul));
    hero.hpBase = Math.max(1, Math.floor(hero.hpBase * skill.hpMul));
    hero.recomputeStats();
    return { skillId: skill.id, skillNameKR: skill.nameKR, atkBefore, atkAfter: hero.atk };
  },
};

/**
 * Returns true when the hero just crossed a level milestone.
 *
 * Schedule (cycle 1 F1 sparsening):
 *   - Early: 5, 10, 25, 50, 100, 200, ..., 900 (every 100, dense for early teaching)
 *   - High: 1000, 2000, ..., 9000 (every 1000)
 *   - Deep: 10000, 20000, 30000, ... (every 10000)
 *
 * Rationale: at 826k maxLevel the old "every 100" schedule fires ~8200
 * milestones per cycle, far exceeding the 21-skill catalog. Even with a 0.20
 * grant rate the milestone channel alone saturates the catalog (p50 ≈ 18).
 * Sparsening to every 10000 above lv 10k reduces fires to ~80, bringing the
 * expected unique-skill count back into the [≤14] target band without
 * touching the shrine channel.
 */
export function isSkillMilestoneLevel(level: number): boolean {
  if (level === 5 || level === 10 || level === 25 || level === 50) return true;
  if (level >= 10_000) return level % 10_000 === 0;
  if (level >= 1_000) return level % 1_000 === 0;
  if (level >= 100) return level % 100 === 0;
  return false;
}
