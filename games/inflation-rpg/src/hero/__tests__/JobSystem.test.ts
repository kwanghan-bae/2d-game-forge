import { describe, it, expect } from 'vitest';
import { JobSystem } from '../JobSystem';
import { HeroEntity } from '../HeroEntity';
import { PersonalityState } from '../PersonalityState';

function makeHero(): HeroEntity {
  const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
  // Reset HeroSpawner's random priors to a known neutral baseline for tests.
  hero.personality = new PersonalityState();
  return hero;
}

describe('JobSystem', () => {
  it('picks a tier-1 job at age10 milestone', () => {
    const hero = makeHero();
    hero.personality.adjust('heroic', 5);
    const job = JobSystem.evaluate(hero, 'age10');
    expect(job).toBeTruthy();
    expect(job!.tier).toBe(1);
  });

  it('prefers heroic-aligned warrior over fallback apprentice', () => {
    const hero = makeHero();
    hero.personality.adjust('heroic', 8);
    const job = JobSystem.evaluate(hero, 'age10');
    expect(job!.id).toBe('warrior');
  });

  it('falls back to apprentice when no personality threshold met at age10', () => {
    const hero = makeHero();
    const job = JobSystem.evaluate(hero, 'age10');
    expect(job?.id).toBe('apprentice');
  });

  it('rogue requires moral <= -2 (negative direction)', () => {
    const hero = makeHero();
    hero.personality.adjust('moral', -4);
    const job = JobSystem.evaluate(hero, 'age10');
    expect(job?.id).toBe('rogue');
  });

  it('returns null at age30 if no personality qualifies and no fallback', () => {
    const hero = makeHero();
    const job = JobSystem.evaluate(hero, 'age30');
    expect(job).toBeNull();
  });

  it('tier-3 saint requires merciful >= 7', () => {
    const hero = makeHero();
    hero.personality.adjust('merciful', 8);
    const job = JobSystem.evaluate(hero, 'age50');
    expect(job?.id).toBe('saint');
  });
});
