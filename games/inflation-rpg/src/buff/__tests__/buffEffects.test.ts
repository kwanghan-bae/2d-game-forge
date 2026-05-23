import { describe, expect, it } from 'vitest';
import type { MetaState } from '../../types';
import {
  getMoveSpeedMul,
  getDropChanceBonus,
  getLightRateMul,
  getRejuvDiscount,
  getAgingSpeedMul,
  getFieldDiffThreshold,
} from '../buffEffects';

function meta(buffLevels: Partial<Record<string, number>>): MetaState {
  return { buffLevels } as unknown as MetaState;
}

describe('selector baselines (Lv 0)', () => {
  const empty = meta({});
  it('move = 1.0', () => expect(getMoveSpeedMul(empty)).toBe(1.0));
  it('drop = 0', () => expect(getDropChanceBonus(empty)).toBe(0));
  it('light_rate = 1.0', () => expect(getLightRateMul(empty)).toBe(1.0));
  it('rejuv_discount = 0', () => expect(getRejuvDiscount(empty)).toBe(0));
  it('aging = 1.0', () => expect(getAgingSpeedMul(empty)).toBe(1.0));
  it('field_diff = 0', () => expect(getFieldDiffThreshold(empty)).toBe(0));
});

describe('selector Lv 5', () => {
  const m = meta({
    move_speed: 5, drop_chance: 5, light_rate: 5,
    rejuv_discount: 5, aging_slow: 5, field_diff: 5,
  });
  it('move = 1.025', () => expect(getMoveSpeedMul(m)).toBeCloseTo(1.025));
  it('drop = 0.015', () => expect(getDropChanceBonus(m)).toBeCloseTo(0.015));
  it('light_rate = 1.05', () => expect(getLightRateMul(m)).toBeCloseTo(1.05));
  it('rejuv_discount = 0.25', () => expect(getRejuvDiscount(m)).toBeCloseTo(0.25));
  it('aging = 0.95', () => expect(getAgingSpeedMul(m)).toBeCloseTo(0.95));
  it('field_diff = 5', () => expect(getFieldDiffThreshold(m)).toBe(5));
});

describe('cap enforcement', () => {
  it('rejuv_discount Lv 20 → 0.80 cap (would be 1.0 without cap)', () => {
    expect(getRejuvDiscount(meta({ rejuv_discount: 20 }))).toBe(0.80);
  });
  it('rejuv_discount Lv 16 → 0.80 cap (would be 0.80 — boundary)', () => {
    expect(getRejuvDiscount(meta({ rejuv_discount: 16 }))).toBe(0.80);
  });
  it('aging_slow Lv 60 → 0.50 floor (would be 0.40 without floor)', () => {
    expect(getAgingSpeedMul(meta({ aging_slow: 60 }))).toBe(0.50);
  });
  it('aging_slow Lv 100 → 0.50 floor', () => {
    expect(getAgingSpeedMul(meta({ aging_slow: 100 }))).toBe(0.50);
  });
});

describe('undefined buffLevels safety', () => {
  it('meta with no buffLevels → all baselines', () => {
    const m = {} as MetaState;
    expect(getMoveSpeedMul(m)).toBe(1.0);
    expect(getRejuvDiscount(m)).toBe(0);
  });
});
