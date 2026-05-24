import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';
import { PersonalityState } from '../PersonalityState';
import { SkillLearningSystem, isSkillMilestoneLevel } from '../SkillLearningSystem';
import { findSkillsForJob } from '../../data/heroSkills';

function makeHero(jobId: string | null = null) {
  const h = HeroEntity.create({ seed: 1, heroHpMax: 100, heroAtkBase: 50 });
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
  it('returns true for 5/10/25/50 anchors', () => {
    expect(isSkillMilestoneLevel(5)).toBe(true);
    expect(isSkillMilestoneLevel(10)).toBe(true);
    expect(isSkillMilestoneLevel(25)).toBe(true);
    expect(isSkillMilestoneLevel(50)).toBe(true);
  });
  it('returns true every 100 in 100..900', () => {
    expect(isSkillMilestoneLevel(100)).toBe(true);
    expect(isSkillMilestoneLevel(500)).toBe(true);
    expect(isSkillMilestoneLevel(900)).toBe(true);
  });
  it('returns true every 1000 in 1000..9000 (sparsened)', () => {
    expect(isSkillMilestoneLevel(1000)).toBe(true);
    expect(isSkillMilestoneLevel(5000)).toBe(true);
    expect(isSkillMilestoneLevel(9000)).toBe(true);
  });
  it('returns false at every-100 grain above 1000 (sparsened)', () => {
    // cycle 1 F1: 1100/1200/.../9900 no longer milestone; only multiples of 1000.
    expect(isSkillMilestoneLevel(1100)).toBe(false);
    expect(isSkillMilestoneLevel(1500)).toBe(false);
    expect(isSkillMilestoneLevel(9900)).toBe(false);
  });
  it('returns true every 10000 in 10000+ (deep sparsen)', () => {
    expect(isSkillMilestoneLevel(10_000)).toBe(true);
    expect(isSkillMilestoneLevel(50_000)).toBe(true);
    expect(isSkillMilestoneLevel(820_000)).toBe(true);
  });
  it('returns false at every-1000 grain above 10000 (deep sparsen)', () => {
    expect(isSkillMilestoneLevel(11_000)).toBe(false);
    expect(isSkillMilestoneLevel(15_000)).toBe(false);
    expect(isSkillMilestoneLevel(99_000)).toBe(false);
  });
  it('returns false for non-milestone levels', () => {
    expect(isSkillMilestoneLevel(1)).toBe(false);
    expect(isSkillMilestoneLevel(7)).toBe(false);
    expect(isSkillMilestoneLevel(150)).toBe(false);
  });
});
