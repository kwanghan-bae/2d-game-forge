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
import type { EquipmentInstance } from '../types';

const noEquip: EquipmentInstance[] = [];

// w-bluedragon (rare): baseStats.percent.atk = 80  → at enhanceLv=0, mult = 1 + 80/100 = 1.8
const pctWeapon: EquipmentInstance = { instanceId: 'i1', baseId: 'w-bluedragon', enhanceLv: 0, modifiers: [] };

// w-club (uncommon): baseStats.flat.atk = 50  → at enhanceLv=0, flat.atk = 50
const flatWeapon: EquipmentInstance = { instanceId: 'i2', baseId: 'w-club', enhanceLv: 0, modifiers: [] };

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
    // w-bluedragon at lv0: percent.atk=80 → mult = 1 + 80/100 = 1.8
    expect(calcEquipmentPercentMult('atk', [pctWeapon])).toBe(1.8);
  });

  it('calcEquipmentFlat: additive', () => {
    expect(calcEquipmentFlat('atk', noEquip)).toBe(0);
    // w-club at lv0: flat.atk=50
    expect(calcEquipmentFlat('atk', [flatWeapon])).toBe(50);
  });

  it('calcFinalStat: (raw + flat) * pct * baseAbility', () => {
    // atk: base=10, sp=0, charMult=1
    // flat = 50 (w-club), pct = 1.8 (w-bluedragon 80%), baseAbility=1
    // floor((10 + 50) * 1.8 * 1) = floor(108) = 108
    expect(calcFinalStat('atk', 0, 1.0, [flatWeapon, pctWeapon], 1)).toBe(108);
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

  it('calcFinalStat: ascTierMult scales the final result (Tier 1 = ×1.1)', () => {
    // base atk 10, sp 0, charMult 1, no equip, baseAbility 1, charLevelMult 1, ascTierMult 1.1
    // floor(10 * 1 * 1 * 1.1) = 11
    expect(calcFinalStat('atk', 0, 1.0, noEquip, 1, 1, 1.1)).toBe(11);
  });

  it('calcFinalStat: ascTierMult defaults to 1 (backward compat)', () => {
    expect(calcFinalStat('atk', 0, 1.0, noEquip, 1, 1)).toBe(10);
  });
});
