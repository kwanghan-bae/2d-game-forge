import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';
import { PERSONALITY_DIMS } from '../PersonalityState';

describe('HeroEntity', () => {
  function makeHero() {
    return HeroEntity.create({
      seed: 42,
      heroHpMax: 100,
      heroAtkBase: 50,
    });
  }

  it('initial state', () => {
    const h = makeHero();
    expect(h.name.length).toBeGreaterThan(0);
    expect(h.age).toBe(5);
    expect(h.chapter).toBe('어린시절');
    expect(h.job).toBe('평민');
    expect(h.level).toBe(1);
    expect(h.exp).toBe(0);
    expect(h.hp).toBe(100);
    expect(h.hpMax).toBe(100);
    expect(h.atk).toBe(50);
    expect(h.equipment).toEqual([]);
    expect(h.staggered).toBe(false);
  });

  it('gainExp adds and triggers level up at threshold', () => {
    const h = makeHero();
    h.gainExp(100); // threshold = 10 at lv1
    expect(h.level).toBeGreaterThan(1);
  });

  it('takeDamage reduces hp, clamps to 0', () => {
    const h = makeHero();
    h.takeDamage(30);
    expect(h.hp).toBe(70);
    h.takeDamage(999);
    expect(h.hp).toBe(0);
  });

  it('addEquipment appends', () => {
    const h = makeHero();
    h.addEquipment('rusty_sword');
    h.addEquipment('leather_armor');
    expect(h.equipment).toEqual(['rusty_sword', 'leather_armor']);
  });

  it('personality has at least 2 non-zero dims after spawn', () => {
    const h = makeHero();
    const nonZero = PERSONALITY_DIMS.filter(d => h.personality.get(d) !== 0);
    expect(nonZero.length).toBeGreaterThanOrEqual(2);
  });
});

describe('HeroEntity action-time aging', () => {
  it('starts at age 5 with actionCount 0 and rejuvenationCount 0, staggered false', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    expect(h.age).toBe(5);
    expect(h.actionCount).toBe(0);
    expect(h.rejuvenationCount).toBe(0);
    expect(h.staggered).toBe(false);
  });

  it('tickAge() increments actionCount and updates age via ageFromActions', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    for (let i = 0; i < 200; i++) h.tickAge();
    expect(h.actionCount).toBe(200);
    expect(h.age).toBeGreaterThan(5);
  });

  it('staggered=true after takeDamage drops hp to 0 (no dead flag)', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    h.takeDamage(99999);
    expect(h.hp).toBe(0);
    expect(h.staggered).toBe(true);
  });

  it('recoverFromStagger restores hp to hpMax and clears staggered', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    h.takeDamage(99999);
    h.recoverFromStagger();
    expect(h.staggered).toBe(false);
    expect(h.hp).toBe(h.hpMax);
  });

  it('rejuvenate(years) reduces actionCount and increments rejuvenationCount', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    for (let i = 0; i < 500; i++) h.tickAge();
    const ageBefore = h.age;
    h.rejuvenate(5);
    expect(h.age).toBeLessThan(ageBefore);
    expect(h.rejuvenationCount).toBe(1);
  });

  it('rejuvenate clamps age at 5 (cannot push below)', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    h.rejuvenate(100);
    expect(h.age).toBe(5);
    expect(h.actionCount).toBe(0);
  });
});

describe('tickAge with agingMul (V3-C aging_slow buff)', () => {
  it('agingMul 1.0 (default) advances actionCount by 1 per tick', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    const start = h.actionCount;
    h.tickAge();
    expect(h.actionCount).toBe(start + 1);
  });

  it('agingMul 0.5 accumulates fractional, advances actionCount on every 2nd tick', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    const start = h.actionCount;
    h.tickAge(0.5);
    expect(h.actionCount).toBe(start);
    h.tickAge(0.5);
    expect(h.actionCount).toBe(start + 1);
  });

  it('agingMul 0.5 over 10 ticks advances by 5', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    const start = h.actionCount;
    for (let i = 0; i < 10; i++) h.tickAge(0.5);
    expect(h.actionCount).toBe(start + 5);
  });

  it('agingMul 2.0 advances actionCount by 2 in a single tick', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    const start = h.actionCount;
    h.tickAge(2.0);
    expect(h.actionCount).toBe(start + 2);
  });

});

describe('HeroEntity staggered serialization (cycle 20)', () => {
  function mk() {
    return HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 50 });
  }

  it('serialize/restore preserves staggered=true', () => {
    const h = mk();
    h.takeDamage(999);
    expect(h.staggered).toBe(true);
    const snap = h.serialize(7);
    expect(snap.staggered).toBe(true);
    const restored = HeroEntity.restore(snap);
    expect(restored.staggered).toBe(true);
  });

  it('serialize/restore preserves staggered=false default', () => {
    const h = mk();
    expect(h.staggered).toBe(false);
    const snap = h.serialize(7);
    expect(snap.staggered).toBe(false);
    const restored = HeroEntity.restore(snap);
    expect(restored.staggered).toBe(false);
  });

  it('restore handles legacy snapshot without staggered field', () => {
    const h = mk();
    const snap = h.serialize(7);
    const { staggered: _, ...legacy } = snap;
    void _;
    const restored = HeroEntity.restore(legacy as typeof snap);
    expect(restored.staggered).toBe(false);
  });
});
