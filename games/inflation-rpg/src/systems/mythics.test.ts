import { describe, it, expect } from 'vitest';
import type { MetaState, MythicId } from '../types';
import {
  getMythicFlatMult,
  getMythicCooldownMult,
  getMythicDropBonus,
  getMythicXpMult,
  getMythicReviveCount,
} from './mythics';

function makeMeta(
  equipped: (MythicId | null)[] = [],
  owned: MythicId[] = [],
): MetaState {
  return {
    mythicEquipped:
      equipped.length === 5
        ? equipped
        : [...equipped, ...Array(5 - equipped.length).fill(null)],
    mythicOwned: owned,
  } as MetaState;
}

describe('getMythicFlatMult', () => {
  it('returns 1.0 for empty equipped', () => {
    expect(getMythicFlatMult(makeMeta([]), 'atk')).toBe(1);
  });
  it('tier1_charm: ATK +50%', () => {
    expect(getMythicFlatMult(makeMeta(['tier1_charm']), 'atk')).toBeCloseTo(1.5);
    expect(getMythicFlatMult(makeMeta(['tier1_charm']), 'hp')).toBe(1);
  });
  it('stacks multiplicatively (tier1_charm + eternal_flame both ATK)', () => {
    expect(
      getMythicFlatMult(makeMeta(['tier1_charm', 'eternal_flame']), 'atk'),
    ).toBeCloseTo(1.5 * 1.75);
  });
  it('void_pact (all) applies to every stat', () => {
    expect(getMythicFlatMult(makeMeta(['void_pact']), 'hp')).toBeCloseTo(1.2);
    expect(getMythicFlatMult(makeMeta(['void_pact']), 'def')).toBeCloseTo(1.2);
  });
  it('only equipped (not owned) counts', () => {
    const meta = makeMeta([], ['tier1_charm']);
    expect(getMythicFlatMult(meta, 'atk')).toBe(1);
  });
});

describe('getMythicCooldownMult', () => {
  it('time_hourglass -30%', () => {
    expect(getMythicCooldownMult(makeMeta(['time_hourglass']), 'ult')).toBeCloseTo(0.7);
  });
  it('floor 0.4 even when stacked', () => {
    const meta = makeMeta(['time_hourglass', 'swift_winds']);
    const result = getMythicCooldownMult(meta, 'ult');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });
  it('returns 1.0 with no cooldown mythics', () => {
    expect(getMythicCooldownMult(makeMeta(['tier1_charm']), 'ult')).toBe(1);
  });
});

describe('getMythicDropBonus', () => {
  it('infinity_seal: ×2 for all kinds (returns +1.0 additive)', () => {
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'gold')).toBeCloseTo(1.0);
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'dr')).toBeCloseTo(1.0);
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'dungeon_currency')).toBeCloseTo(1.0);
  });
  it('dimension_navigator: dungeon_currency ×3 = +2.0', () => {
    expect(getMythicDropBonus(makeMeta(['dimension_navigator']), 'dungeon_currency')).toBeCloseTo(2.0);
    expect(getMythicDropBonus(makeMeta(['dimension_navigator']), 'gold')).toBe(0);
  });
  it('merchant_seal: gold +100% = +1.0', () => {
    expect(getMythicDropBonus(makeMeta(['merchant_seal']), 'gold')).toBeCloseTo(1.0);
  });
});

describe('getMythicXpMult', () => {
  it('soul_truth: ×3 (= +200% mult)', () => {
    expect(getMythicXpMult(makeMeta(['soul_truth']))).toBeCloseTo(3.0);
  });
  it('soul_truth × scholar_eye stacks multiplicatively', () => {
    expect(getMythicXpMult(makeMeta(['soul_truth', 'scholar_eye']))).toBeCloseTo(6.0);
  });
});

describe('passives', () => {
  it('phoenix_feather passive revive: 1 if equipped', () => {
    expect(getMythicReviveCount(makeMeta(['phoenix_feather']))).toBe(1);
    expect(getMythicReviveCount(makeMeta([]))).toBe(0);
  });
});
