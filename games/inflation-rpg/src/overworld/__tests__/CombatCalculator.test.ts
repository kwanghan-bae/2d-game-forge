import { describe, it, expect } from 'vitest';
import { computeHeroAtk, computeBuffedHeroAtk, type AtkComputeInput } from '../encounter/CombatCalculator';

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

describe('CombatCalculator.computeBuffedHeroAtk', () => {
  const muls = { stormNexusMul: 1.40, clearSkyMul: 1.15, crossroadsMul: 1.20 };
  const off = { stormNexus: false, clearSky: false, crossroads: false };

  it('no buffs → base unchanged', () => {
    expect(computeBuffedHeroAtk(100, { ...off, ...muls })).toBe(100);
  });

  it('storm only → ×1.40', () => {
    expect(computeBuffedHeroAtk(100, { ...off, stormNexus: true, ...muls })).toBe(140);
  });

  it('clearSky only → ×1.15', () => {
    expect(computeBuffedHeroAtk(100, { ...off, clearSky: true, ...muls })).toBe(114);
  });

  it('crossroads only → ×1.20', () => {
    expect(computeBuffedHeroAtk(100, { ...off, crossroads: true, ...muls })).toBe(120);
  });

  it('storm + clearSky → ×1.61 (weather exclusive in practice)', () => {
    expect(computeBuffedHeroAtk(100, { ...off, stormNexus: true, clearSky: true, ...muls })).toBe(161);
  });

  it('storm + crossroads → ×1.68', () => {
    expect(computeBuffedHeroAtk(100, { ...off, stormNexus: true, crossroads: true, ...muls })).toBe(168);
  });

  it('clearSky + crossroads → ×1.38', () => {
    expect(computeBuffedHeroAtk(100, { ...off, clearSky: true, crossroads: true, ...muls })).toBe(137);
  });

  it('all three → ×1.932', () => {
    expect(computeBuffedHeroAtk(100, { stormNexus: true, clearSky: true, crossroads: true, ...muls })).toBe(193);
  });
});
