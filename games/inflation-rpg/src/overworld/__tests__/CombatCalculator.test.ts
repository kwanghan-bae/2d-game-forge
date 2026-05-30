import { describe, it, expect } from 'vitest';
import { computeHeroAtk, type AtkComputeInput } from '../encounter/CombatCalculator';

function makeInput(overrides: Partial<AtkComputeInput> = {}): AtkComputeInput {
  return {
    flatAtk: 100,
    coreMuls: 1,
    conditionMuls: 1,
    goldMuls: 1,
    combatMuls: 1,
    progressMuls: 1,
    chainMuls: 1,
    tradeoffMuls: 1,
    systemMuls: 1,
    atkCap: 10,
    ...overrides,
  };
}

describe('CombatCalculator.computeHeroAtk', () => {
  it('all multipliers at 1 → baseAtk equals flatAtk', () => {
    const result = computeHeroAtk(makeInput({ flatAtk: 50 }));
    expect(result).toBe(50);
  });

  it('multipliers stack multiplicatively and are capped', () => {
    const result = computeHeroAtk(makeInput({
      flatAtk: 100,
      coreMuls: 3,
      conditionMuls: 2,
      goldMuls: 2,
      // 3*2*2 = 12 but cap is 10
      atkCap: 10,
    }));
    expect(result).toBe(1000); // 100 * min(10, 12) = 100 * 10
  });

  it('uncapped when product is below cap', () => {
    const result = computeHeroAtk(makeInput({
      flatAtk: 200,
      coreMuls: 2,
      combatMuls: 1.5,
      // product = 3, under cap 10
      atkCap: 10,
    }));
    expect(result).toBe(600); // 200 * 3
  });

  it('prestige-linked cap at 20 allows higher multipliers', () => {
    const result = computeHeroAtk(makeInput({
      flatAtk: 100,
      coreMuls: 5,
      conditionMuls: 3,
      // product = 15, cap = 20 → uncapped
      atkCap: 20,
    }));
    expect(result).toBe(1500); // 100 * 15
  });

  it('minimum ATK is 1 even with 0 flatAtk', () => {
    const result = computeHeroAtk(makeInput({ flatAtk: 0 }));
    expect(result).toBe(1);
  });

  it('fractional results are floored', () => {
    const result = computeHeroAtk(makeInput({
      flatAtk: 10,
      coreMuls: 1.3,
    }));
    expect(result).toBe(13); // floor(10 * 1.3)
  });
});
