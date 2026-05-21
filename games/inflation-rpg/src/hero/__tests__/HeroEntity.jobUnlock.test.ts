import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';
import { PersonalityState } from '../PersonalityState';

function makeHero() {
  const h = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
  h.personality = new PersonalityState();
  return h;
}

describe('HeroEntity job unlock at age milestone', () => {
  it('emits job unlock when crossing age 10 with heroic personality', () => {
    const hero = makeHero();
    hero.personality.adjust('heroic', 5);
    const unlocks = hero.maybeUnlockJobForAge(10);
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0]!.jobId).toBe('warrior');
    expect(hero.unlockedJobId).toBe('warrior');
    expect(hero.job).toBe('전사');
  });

  it('applies atkMul + hpMul on unlock and recomputes atk/hp', () => {
    const hero = makeHero();
    hero.personality.adjust('heroic', 5);
    const baseAtk = hero.atkBase;
    const baseHp = hero.hpBase;
    hero.maybeUnlockJobForAge(10);
    expect(hero.atkBase).toBe(Math.floor(baseAtk * 1.3));
    expect(hero.hpBase).toBe(Math.floor(baseHp * 1.2));
    expect(hero.atk).toBe(hero.atkBase); // Lv 1, lv^1.0 = 1
  });

  it('does not re-unlock same milestone on repeated calls', () => {
    const hero = makeHero();
    hero.personality.adjust('heroic', 5);
    hero.maybeUnlockJobForAge(10);
    const second = hero.maybeUnlockJobForAge(10);
    expect(second).toHaveLength(0);
  });

  it('skips milestones not yet reached', () => {
    const hero = makeHero();
    hero.personality.adjust('heroic', 5);
    const unlocks = hero.maybeUnlockJobForAge(8);
    expect(unlocks).toHaveLength(0);
    expect(hero.unlockedJobId).toBeNull();
  });

  it('unlocks multiple tiers if age jumps over both', () => {
    const hero = makeHero();
    hero.personality.adjust('heroic', 9); // qualifies tier-1 warrior and tier-3 hero
    const unlocks = hero.maybeUnlockJobForAge(55);
    // age10 + age30 + age50 all crossed; tier-1, tier-2 (no match for warrior+/heroic at tier2 — wait paladin needs heroic>=5 ok), tier-3 hero
    expect(unlocks.length).toBeGreaterThanOrEqual(2);
    const ids = unlocks.map(u => u.jobId);
    expect(ids).toContain('warrior');
    expect(ids).toContain('paladin');
    expect(ids).toContain('hero');
  });

  it('falls back to apprentice at age10 when personality is neutral', () => {
    const hero = makeHero();
    const unlocks = hero.maybeUnlockJobForAge(10);
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0]!.jobId).toBe('apprentice');
  });
});
