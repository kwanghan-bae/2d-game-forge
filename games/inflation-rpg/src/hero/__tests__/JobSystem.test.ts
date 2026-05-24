import { describe, it, expect } from 'vitest';
import { JobSystem } from '../JobSystem';
import { HeroEntity } from '../HeroEntity';
import { PersonalityState } from '../PersonalityState';
import { JOBS } from '../../data/jobs';

function makeHero(): HeroEntity {
  const hero = HeroEntity.create({ seed: 1, heroHpMax: 100, heroAtkBase: 50 });
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

describe('Cycle 1 F1 — JobSystem tie-break 분리', () => {
  it('F1.5: JOBS mage.requiredPersonality.min === 6', () => {
    const mage = JOBS.find(j => j.id === 'mage')!;
    expect(mage.requiredPersonality!.min).toBe(6);
  });
  it('F1.6: JOBS monk.requiredPersonality.dim === "prudent"', () => {
    const monk = JOBS.find(j => j.id === 'monk')!;
    expect(monk.requiredPersonality!.dim).toBe('prudent');
  });
  it('F1.7: JOBS ranger.requiredPersonality.min === 6', () => {
    const ranger = JOBS.find(j => j.id === 'ranger')!;
    expect(ranger.requiredPersonality!.min).toBe(6);
  });

  it('F1.8: hero pious=4 → mage 후보 탈락 (min 6 미만)', () => {
    // pious=4 만으로는 어떤 age30 job 도 통과 못 함 → null
    // (이전 mage.min=3 시점에서는 mage 가 통과했음; cycle 1 에서 6 으로 추가 상향)
    const hero = makeHero();
    hero.personality.adjust('pious', 4);
    hero.personality.adjust('prudent', 2);
    const job = JobSystem.evaluate(hero, 'age30');
    expect(job?.id).not.toBe('mage');
  });
  it('F1.9: hero prudent=6 → ranger 로 진화 (min 6 통과)', () => {
    // age30 fallback 이 없으므로 evaluate 가 정확히 ranger 를 고름
    // (prudent=6 가 ranger.min=6 통과, monk.min=5 도 통과하지만 score=|6|=6 동률 → 정렬 first-match 로 ranger 가 먼저 등록되어 선택)
    const hero = makeHero();
    hero.personality.adjust('prudent', 6);
    hero.personality.adjust('pious', 2);
    const job = JobSystem.evaluate(hero, 'age30');
    expect(job?.id).toBe('ranger');
  });
  it('F1.10: hero pious=5 prudent=5 → monk 후보 포함 (dim=prudent 분리)', () => {
    // cycle 1 mage.min 6 으로 상향: pious=5 만으로는 mage(min6) 탈락,
    // prudent=5 로 monk(min5) 만 통과, ranger(min6) 탈락 → single-candidate monk.
    // (이전 mage.min=5 시점에서는 동률 first-match 가 mage 였으나, prudent 강화만 하면
    // pious=0 이라 mage 후보 자체에 들지 못해 결과는 mage.min 변경 전후로 monk 동일.)
    const hero = makeHero();
    hero.personality.adjust('prudent', 5);
    const job = JobSystem.evaluate(hero, 'age30');
    expect(job?.id).toBe('monk');
  });
});
