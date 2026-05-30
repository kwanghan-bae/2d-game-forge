import { describe, it, expect } from 'vitest';
import { chooseGamblerBet } from '../encounter/HeroDecisionAI';

describe('HeroDecisionAI — chooseGamblerBet', () => {
  // C726: threshold raised from 3× to 5×
  it('returns BET_HIGH when heroGold > 5 × nextUpgradeCost', () => {
    expect(chooseGamblerBet(5001, 1000)).toBe('BET_HIGH');
  });

  it('returns BET_LOW when heroGold <= 5 × nextUpgradeCost', () => {
    expect(chooseGamblerBet(5000, 1000)).toBe('BET_LOW');
  });

  it('returns BET_LOW when heroGold is 0', () => {
    expect(chooseGamblerBet(0, 100)).toBe('BET_LOW');
  });

  it('returns BET_HIGH with large surplus', () => {
    expect(chooseGamblerBet(50000, 5000)).toBe('BET_HIGH');
  });

  it('returns BET_LOW at old 3× threshold (no longer triggers)', () => {
    expect(chooseGamblerBet(3001, 1000)).toBe('BET_LOW');
  });

  it('returns BET_HIGH when nextUpgradeCost is 0 (edge: no upgrade available)', () => {
    expect(chooseGamblerBet(1, 0)).toBe('BET_HIGH');
  });
});
