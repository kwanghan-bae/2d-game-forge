import { describe, it, expect } from 'vitest';
import {
  SANCTUARY_TITLES,
  computeSanctuaryBlessings,
  getAvailableSanctuaryTitles,
  getHighestSanctuaryTitle,
  applySanctuaryBlessingsToHero,
} from './apexZenithSanctuary';
import { HeroEntity } from '../hero/HeroEntity';

describe('apexZenithSanctuary (C1108)', () => {
  it('computes blessings accurately across 0, 1, 2, and 3 cleared tiers', () => {
    // 0 cleared
    const b0 = computeSanctuaryBlessings([]);
    expect(b0.clearedTiersCount).toBe(0);
    expect(b0.omniStatMultiplier).toBe(1.0);
    expect(b0.damageReduction).toBe(0);
    expect(b0.finalDmgMultiplier).toBe(1.0);
    expect(b0.defPierceBonus).toBe(0);

    // 1 cleared
    const b1 = computeSanctuaryBlessings([1]);
    expect(b1.clearedTiersCount).toBe(1);
    expect(b1.omniStatMultiplier).toBe(1.05);
    expect(b1.damageReduction).toBe(0.03);
    expect(b1.critDmgBonus).toBe(0.05);
    expect(b1.finalDmgMultiplier).toBe(1.0);

    // 2 cleared (with duplicate safeguard)
    const b2 = computeSanctuaryBlessings([1, 2, 2]);
    expect(b2.clearedTiersCount).toBe(2);
    expect(b2.omniStatMultiplier).toBe(1.10);
    expect(b2.damageReduction).toBe(0.06);
    expect(b2.critDmgBonus).toBe(0.10);

    // 3 cleared (Full Zenith Ascension)
    const b3 = computeSanctuaryBlessings([1, 2, 3]);
    expect(b3.clearedTiersCount).toBe(3);
    expect(b3.omniStatMultiplier).toBe(1.15);
    expect(b3.damageReduction).toBe(0.09);
    expect(b3.critDmgBonus).toBe(0.15);
    expect(b3.finalDmgMultiplier).toBe(1.10);
    expect(b3.defPierceBonus).toBe(0.10);
  });

  it('retrieves available sanctuary titles and identifies the highest title', () => {
    expect(getAvailableSanctuaryTitles([])).toHaveLength(0);
    expect(getHighestSanctuaryTitle([])).toBeNull();

    const titles1 = getAvailableSanctuaryTitles([1]);
    expect(titles1).toHaveLength(1);
    expect(titles1[0].id).toBe('dawn_pioneer');
    expect(getHighestSanctuaryTitle([1])?.nameKR).toBe('여명의 개척자');

    const titles3 = getAvailableSanctuaryTitles([1, 2, 3]);
    expect(titles3).toHaveLength(3);
    expect(getHighestSanctuaryTitle([1, 2, 3])?.nameKR).toBe('무극의 초월자');
    expect(SANCTUARY_TITLES.zenith_transcendent.specialPerk).toBe('방어 관통 +10%');
  });

  it('applies sanctuary stat multipliers directly to hero entity', () => {
    const hero = new HeroEntity({
      seed: 99,
      heroHpMax: 10_000,
      heroAtkBase: 2_000,
    });
    hero.hp = 10_000;
    hero.hpMax = 10_000;
    hero.atk = 2_000;
    hero.def = 500;

    const blessings = computeSanctuaryBlessings([1, 2, 3]); // +15% stats
    applySanctuaryBlessingsToHero(hero, blessings);

    expect(hero.hp).toBe(11_500);
    expect(hero.hpMax).toBe(11_500);
    expect(hero.atk).toBe(2_300);
    expect(hero.def).toBe(575);
  });
});
