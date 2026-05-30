import { describe, it, expect } from 'vitest';
import { chooseGamblerBet } from '../encounter/HeroDecisionAI';

describe('HeroDecisionAI — chooseGamblerBet', () => {
  // C730: threshold raised from 5× to 12×
  it('returns BET_HIGH when heroGold > 12 × nextUpgradeCost', () => {
    expect(chooseGamblerBet(12001, 1000)).toBe('BET_HIGH');
  });

  it('returns BET_LOW when heroGold <= 12 × nextUpgradeCost', () => {
    expect(chooseGamblerBet(12000, 1000)).toBe('BET_LOW');
  });

  it('returns BET_LOW when heroGold is 0', () => {
    expect(chooseGamblerBet(0, 100)).toBe('BET_LOW');
  });

  it('returns BET_HIGH with large surplus', () => {
    expect(chooseGamblerBet(100000, 5000)).toBe('BET_HIGH');
  });

  it('returns BET_LOW at old 3× threshold (no longer triggers)', () => {
    expect(chooseGamblerBet(3001, 1000)).toBe('BET_LOW');
  });

  it('returns BET_HIGH when nextUpgradeCost is 0 (edge: no upgrade available)', () => {
    expect(chooseGamblerBet(1, 0)).toBe('BET_HIGH');
  });

  // C730: ratio raised to 12
  it('returns BET_HIGH when heroGold > 12 × nextUpgradeCost', () => {
    expect(chooseGamblerBet(12001, 1000)).toBe('BET_HIGH');
  });

  it('returns BET_LOW at old 5× threshold (no longer triggers)', () => {
    expect(chooseGamblerBet(5001, 1000)).toBe('BET_LOW');
  });
});
