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

/** Returns true when the hero just crossed a level milestone (5, 10, 25, 50, then every 100). */
export function isSkillMilestoneLevel(level: number): boolean {
  if (level === 5 || level === 10 || level === 25 || level === 50) return true;
  if (level >= 100 && level % 100 === 0) return true;
  return false;
}
