import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';
import { PersonalityState } from '../PersonalityState';
import { SkillLearningSystem, isSkillMilestoneLevel } from '../SkillLearningSystem';
import { findSkillsForJob } from '../../data/heroSkills';

function makeHero(jobId: string | null = null) {
  const h = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
  h.personality = new PersonalityState();
  h.unlockedJobId = jobId;
  return h;
}

describe('SkillLearningSystem', () => {
  it('grants a matching skill on first call', () => {
    const hero = makeHero('warrior');
    const result = SkillLearningSystem.tryLearn(hero, 42);
    expect(result).toBeTruthy();
    expect(hero.learnedSkillIds.size).toBe(1);
    const warriorSkills = findSkillsForJob('warrior').map(s => s.id);
    expect(warriorSkills).toContain(result!.skillId);
  });

  it('uses universal pool when no job is unlocked', () => {
    const hero = makeHero(null);
    const result = SkillLearningSystem.tryLearn(hero, 42);
    expect(result).toBeTruthy();
  });

  it('does not grant the same skill twice', () => {
    const hero = makeHero('warrior');
    const learned = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const r = SkillLearningSystem.tryLearn(hero, 42 + i);
      if (r) learned.add(r.skillId);
    }
    expect(learned.size).toBeLessThanOrEqual(findSkillsForJob('warrior').length);
    expect(hero.learnedSkillIds.size).toBe(learned.size);
  });

  it('returns null when all matching skills exhausted', () => {
    const hero = makeHero('warrior');
    const warriorSkills = findSkillsForJob('warrior');
    for (const s of warriorSkills) hero.learnedSkillIds.add(s.id);
    const result = SkillLearningSystem.tryLearn(hero, 100);
    expect(result).toBeNull();
  });

  it('increases atk via the skill multiplier', () => {
    const hero = makeHero('warrior');
    const atkBefore = hero.atk;
    const result = SkillLearningSystem.tryLearn(hero, 42);
    expect(result!.atkAfter).toBeGreaterThanOrEqual(atkBefore);
  });
});

describe('isSkillMilestoneLevel', () => {
  it('returns true for 5/10/25/50 and every 100 from 100', () => {
    expect(isSkillMilestoneLevel(5)).toBe(true);
    expect(isSkillMilestoneLevel(10)).toBe(true);
    expect(isSkillMilestoneLevel(25)).toBe(true);
    expect(isSkillMilestoneLevel(50)).toBe(true);
    expect(isSkillMilestoneLevel(100)).toBe(true);
    expect(isSkillMilestoneLevel(500)).toBe(true);
    expect(isSkillMilestoneLevel(1000)).toBe(true);
  });
  it('returns false for non-milestone levels', () => {
    expect(isSkillMilestoneLevel(1)).toBe(false);
    expect(isSkillMilestoneLevel(7)).toBe(false);
    expect(isSkillMilestoneLevel(150)).toBe(false);
  });
});
