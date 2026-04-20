import { describe, it, expect } from 'vitest';
import {
  BASE_STATS,
  SP_INCREASE,
  calcRawStat,
  calcEquipmentPercentMult,
  calcEquipmentFlat,
  calcFinalStat,
  calcDamageReduction,
  calcCritChance,
} from './stats';
import type { Equipment } from '../types';

const noEquip: Equipment[] = [];
const pctWeapon: Equipment = {
  id: 'w1', name: '검', slot: 'weapon', rarity: 'common',
  stats: { percent: { atk: 100 } }, dropAreaIds: [], price: 0,
};
const flatWeapon: Equipment = {
  id: 'w2', name: '도', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 50 } }, dropAreaIds: [], price: 0,
};

describe('Stats System', () => {
  it('BASE_STATS has correct initial values', () => {
    expect(BASE_STATS.hp).toBe(100);
    expect(BASE_STATS.atk).toBe(10);
    expect(BASE_STATS.def).toBe(10);
    expect(BASE_STATS.agi).toBe(5);
    expect(BASE_STATS.luc).toBe(5);
  });

  it('SP_INCREASE has correct increments', () => {
    expect(SP_INCREASE.hp).toBe(5);
    expect(SP_INCREASE.atk).toBe(3);
    expect(SP_INCREASE.def).toBe(3);
    expect(SP_INCREASE.agi).toBe(2);
    expect(SP_INCREASE.luc).toBe(2);
  });

  it('calcRawStat: base + allocated * spIncrease * charMult', () => {
    // 10 base atk + 10 SP * 3 = 40, * 1.0 charMult = 40
    expect(calcRawStat('atk', 10, 1.0)).toBe(40);
    // 10 + 10*3 = 40, * 1.1 = 44
    expect(calcRawStat('atk', 10, 1.1)).toBe(44);
  });

  it('calcEquipmentPercentMult: multiplicative stacking', () => {
    expect(calcEquipmentPercentMult('atk', noEquip)).toBe(1);
    expect(calcEquipmentPercentMult('atk', [pctWeapon])).toBe(2); // +100%
  });

  it('calcEquipmentFlat: additive', () => {
    expect(calcEquipmentFlat('atk', noEquip)).toBe(0);
    expect(calcEquipmentFlat('atk', [flatWeapon])).toBe(50);
  });

  it('calcFinalStat: (raw + flat) * pct * baseAbility', () => {
    // atk: base=10, sp=0, charMult=1, flat=50, pct=2 (100%), baseAbility=1
    // (10 + 50) * 2 * 1 = 120
    expect(calcFinalStat('atk', 0, 1.0, [flatWeapon, pctWeapon], 1)).toBe(120);
  });

  it('calcDamageReduction: DEF/(DEF+500)', () => {
    expect(calcDamageReduction(0)).toBe(0);
    expect(calcDamageReduction(500)).toBeCloseTo(0.5);
    expect(calcDamageReduction(1000)).toBeCloseTo(0.667, 2);
  });

  it('calcCritChance: floor at 0.95', () => {
    expect(calcCritChance(0, 0)).toBeCloseTo(0.05);
    // agi=1000: 0.05 + 1.0 = 1.05 → clamped to 0.95
    expect(calcCritChance(1000, 0)).toBe(0.95);
  });

  it('calcFinalStat: charLevelMult scales the final result', () => {
    // atk: base=10, sp=0, charClassMult=1, noEquip, baseAbility=1, charLevelMult=1.3
    // raw = (10 + 0) * 1 = 10; flat=0; pct=1; floor(10 * 1 * 1 * 1.3) = 13
    expect(calcFinalStat('atk', 0, 1.0, noEquip, 1, 1.3)).toBe(13);
  });

  it('calcFinalStat: charLevelMult defaults to 1 (backward compat)', () => {
    expect(calcFinalStat('atk', 0, 1.0, noEquip, 1)).toBe(10);
  });
});
