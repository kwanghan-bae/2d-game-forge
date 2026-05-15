import { describe, it, expect } from 'vitest';
import type { MetaState } from '../types';
import { EMPTY_RELIC_STACKS } from '../data/relics';
import {
  getRelicFlatMult, getRelicDropBonus, getRelicXpMult,
  getRelicBpMax, getRelicBpFreeChance,
  relicNoDeathLoss, relicReviveCount,
  applyStackIncrement,
} from './relics';

function makeMeta(stacks: Partial<MetaState['relicStacks']> = {}): MetaState {
  return { relicStacks: { ...EMPTY_RELIC_STACKS, ...stacks } } as MetaState;
}

describe('getRelicFlatMult', () => {
  it('returns 1.0 for empty stacks', () => {
    expect(getRelicFlatMult(makeMeta(), 'luc')).toBe(1);
  });
  it('fate_dice (luc) gives +1% per stack, capped 100 stacks', () => {
    expect(getRelicFlatMult(makeMeta({ fate_dice: 50 }), 'luc')).toBeCloseTo(1.5);
    expect(getRelicFlatMult(makeMeta({ fate_dice: 100 }), 'luc')).toBeCloseTo(2.0);
    expect(getRelicFlatMult(makeMeta({ fate_dice: 500 }), 'luc')).toBeCloseTo(2.0); // cap
  });
  it('moonlight (all) applies to every stat', () => {
    expect(getRelicFlatMult(makeMeta({ moonlight_amulet: 100 }), 'hp')).toBeCloseTo(1.5);
    expect(getRelicFlatMult(makeMeta({ moonlight_amulet: 100 }), 'atk')).toBeCloseTo(1.5);
  });
  it('eagle (critRate) cap 500 stacks → 25%', () => {
    expect(getRelicFlatMult(makeMeta({ eagle_arrow: 500 }), 'critRate')).toBeCloseTo(1.25);
    expect(getRelicFlatMult(makeMeta({ eagle_arrow: 600 }), 'critRate')).toBeCloseTo(1.25);
  });
  it('multiple flat_mult relics multiply', () => {
    // moonlight +50% (all) × fate_dice +50% (luc) = ×2.25 for luc
    const meta = makeMeta({ moonlight_amulet: 100, fate_dice: 50 });
    expect(getRelicFlatMult(meta, 'luc')).toBeCloseTo(1.5 * 1.5);
  });
});

describe('getRelicDropBonus (additive)', () => {
  it('gold_coin gives +1% per stack', () => {
    expect(getRelicDropBonus(makeMeta({ gold_coin: 10 }), 'gold')).toBeCloseTo(0.1);
    expect(getRelicDropBonus(makeMeta({ gold_coin: 100 }), 'gold')).toBeCloseTo(1.0);
  });
  it('sands_of_time gives DR drop +1% per stack', () => {
    expect(getRelicDropBonus(makeMeta({ sands_of_time: 30 }), 'dr')).toBeCloseTo(0.3);
  });
  it('returns 0 for irrelevant drop kind', () => {
    expect(getRelicDropBonus(makeMeta({ gold_coin: 100 }), 'dungeon_currency')).toBe(0);
  });
});

describe('getRelicXpMult (multiplicative via additive %)', () => {
  it('soul_pearl gives +1% per stack', () => {
    expect(getRelicXpMult(makeMeta({ soul_pearl: 50 }))).toBeCloseTo(1.5);
  });
});

describe('passives', () => {
  it('warrior_banner BP max bonus = stack count', () => {
    expect(getRelicBpMax(makeMeta({ warrior_banner: 7 }))).toBe(7);
  });
  it('dokkaebi_charm BP-free chance = 0.1% per stack, cap 50%', () => {
    expect(getRelicBpFreeChance(makeMeta({ dokkaebi_charm: 100 }))).toBeCloseTo(0.1);
    expect(getRelicBpFreeChance(makeMeta({ dokkaebi_charm: 500 }))).toBeCloseTo(0.5);
    expect(getRelicBpFreeChance(makeMeta({ dokkaebi_charm: 9999 }))).toBeCloseTo(0.5);
  });
  it('undead_coin: any stack → no death loss', () => {
    expect(relicNoDeathLoss(makeMeta({ undead_coin: 0 }))).toBe(false);
    expect(relicNoDeathLoss(makeMeta({ undead_coin: 1 }))).toBe(true);
    expect(relicNoDeathLoss(makeMeta({ undead_coin: 99 }))).toBe(true);
  });
  it('feather_of_fate revive count = effective stack, capped 5', () => {
    expect(relicReviveCount(makeMeta({ feather_of_fate: 3 }))).toBe(3);
    expect(relicReviveCount(makeMeta({ feather_of_fate: 10 }))).toBe(5);
  });
});

describe('applyStackIncrement (cap enforcement)', () => {
  it('infinite cap: unbounded', () => {
    expect(applyStackIncrement(makeMeta({ warrior_banner: 999 }), 'warrior_banner').warrior_banner).toBe(1000);
  });
  it('binary cap: stays at 1', () => {
    expect(applyStackIncrement(makeMeta({ undead_coin: 1 }), 'undead_coin').undead_coin).toBe(1);
  });
  it('stacks cap: stops at value', () => {
    expect(applyStackIncrement(makeMeta({ fate_dice: 100 }), 'fate_dice').fate_dice).toBe(100);
    expect(applyStackIncrement(makeMeta({ fate_dice: 99 }), 'fate_dice').fate_dice).toBe(100);
  });
});
