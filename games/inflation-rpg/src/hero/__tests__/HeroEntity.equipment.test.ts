import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';

describe('HeroEntity equipment stat wiring (additive)', () => {
  it('rusty_sword adds +2 to atkBase', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    const before = hero.atkBase;
    hero.addEquipment('rusty_sword');
    expect(hero.atkBase).toBe(before + 2);
  });

  it('cloth_armor adds +4 to hpBase', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    const before = hero.hpBase;
    hero.addEquipment('cloth_armor');
    expect(hero.hpBase).toBe(before + 4);
  });

  it('enchanted_ring (epic) adds +20 atk +10 hp', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    const atkBefore = hero.atkBase;
    const hpBefore = hero.hpBase;
    hero.addEquipment('enchanted_ring');
    expect(hero.atkBase).toBe(atkBefore + 20);
    expect(hero.hpBase).toBe(hpBefore + 10);
  });

  it('unknown item id is a no-op (no crash)', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    const atkBefore = hero.atkBase;
    expect(() => hero.addEquipment('does_not_exist')).not.toThrow();
    expect(hero.atkBase).toBe(atkBefore);
  });

  it('stacking 10 items adds linear bonus (not multiplicative)', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    const atkBefore = hero.atkBase;
    for (let i = 0; i < 10; i++) hero.addEquipment('rusty_sword');
    expect(hero.atkBase).toBe(atkBefore + 20); // 10 * +2
  });
});
