import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';

describe('HeroEntity', () => {
  function makeHero() {
    return HeroEntity.create({
      seed: 42,
      bpMax: 30,
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
    expect(h.bp).toBe(30);
    expect(h.bpMax).toBe(30);
    expect(h.equipment).toEqual([]);
    expect(h.dead).toBe(false);
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
    expect(h.dead).toBe(true);
  });

  it('consumeBp reduces bp + advances age', () => {
    const h = makeHero();
    const startAge = h.age;
    for (let i = 0; i < 10; i++) h.consumeBp(1);
    expect(h.bp).toBe(20);
    expect(h.age).toBeGreaterThanOrEqual(startAge);
  });

  it('bp exhausted → dead', () => {
    const h = makeHero();
    for (let i = 0; i < 30; i++) h.consumeBp(1);
    expect(h.bp).toBe(0);
    expect(h.dead).toBe(true);
  });

  it('addEquipment appends', () => {
    const h = makeHero();
    h.addEquipment('rusty_sword');
    h.addEquipment('leather_armor');
    expect(h.equipment).toEqual(['rusty_sword', 'leather_armor']);
  });

  it('personality is exposed', () => {
    const h = makeHero();
    expect(h.personality.get('moral')).toBe(0);
  });
});
