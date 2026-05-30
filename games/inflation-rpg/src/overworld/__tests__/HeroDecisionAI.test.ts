import { describe, it, expect } from 'vitest';
import { chooseGamblerBet } from '../encounter/HeroDecisionAI';

describe('HeroDecisionAI — chooseGamblerBet', () => {
  it('returns BET_HIGH when heroGold > 3 × nextUpgradeCost', () => {
    expect(chooseGamblerBet(3001, 1000)).toBe('BET_HIGH');
  });

  it('returns BET_LOW when heroGold <= 3 × nextUpgradeCost', () => {
    expect(chooseGamblerBet(3000, 1000)).toBe('BET_LOW');
  });

  it('returns BET_LOW when heroGold is 0', () => {
    expect(chooseGamblerBet(0, 100)).toBe('BET_LOW');
  });

  it('returns BET_HIGH with large surplus', () => {
    expect(chooseGamblerBet(50000, 5000)).toBe('BET_HIGH');
  });

  it('returns BET_LOW when nextUpgradeCost is 0 (edge: no upgrade available)', () => {
    // 0 * 3 = 0, heroGold > 0 → BET_HIGH
    expect(chooseGamblerBet(1, 0)).toBe('BET_HIGH');
  });
});
