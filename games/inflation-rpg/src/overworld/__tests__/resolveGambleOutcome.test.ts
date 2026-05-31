import { describe, it, expect } from 'vitest';
import { resolveGambleOutcome } from '../encounter/resolveGambleOutcome';

describe('resolveGambleOutcome (C864)', () => {
  it('win high bet → gold × (rewardMul - 1)', () => {
    const r = resolveGambleOutcome({ winRate: 0.5, heroGold: 1000, rng: 0.1, isHighBet: true, betHighRewardMul: 3.0, betHighLossRate: 0.6, betLowLossRate: 0.25 });
    expect(r.won).toBe(true);
    expect(r.goldDelta).toBe(2000); // floor(1000 * 2.0)
  });

  it('win low bet → gold × 0.5', () => {
    const r = resolveGambleOutcome({ winRate: 0.7, heroGold: 1000, rng: 0.3, isHighBet: false, betLowRewardMul: 1.5, betHighLossRate: 0.6, betLowLossRate: 0.25 });
    expect(r.won).toBe(true);
    expect(r.goldDelta).toBe(500);
  });

  it('lose high bet → -gold × highLossRate', () => {
    const r = resolveGambleOutcome({ winRate: 0.5, heroGold: 1000, rng: 0.9, isHighBet: true, betHighRewardMul: 3.0, betHighLossRate: 0.6, betLowLossRate: 0.25 });
    expect(r.won).toBe(false);
    expect(r.goldDelta).toBe(-600);
  });

  it('lose low bet → -gold × lowLossRate', () => {
    const r = resolveGambleOutcome({ winRate: 0.7, heroGold: 1000, rng: 0.9, isHighBet: false, betLowRewardMul: 1.5, betHighLossRate: 0.6, betLowLossRate: 0.25 });
    expect(r.won).toBe(false);
    expect(r.goldDelta).toBe(-250);
  });

  it('merchant gamble win → gold × (rewardMul - 1)', () => {
    const r = resolveGambleOutcome({ winRate: 0.55, heroGold: 500, rng: 0.2, isHighBet: false, betLowRewardMul: 1.5 });
    expect(r.won).toBe(true);
    expect(r.goldDelta).toBe(250);
  });

  it('merchant gamble lose with flat loss → merchantLossGold', () => {
    const r = resolveGambleOutcome({ winRate: 0.55, heroGold: 500, rng: 0.8, merchantLossGold: 0 });
    expect(r.won).toBe(false);
    expect(r.goldDelta).toBe(0);
  });

  it('edge: gold = 0 → no crash, goldDelta = 0', () => {
    const r = resolveGambleOutcome({ winRate: 0.5, heroGold: 0, rng: 0.1, isHighBet: true, betHighRewardMul: 3.0, betHighLossRate: 0.6, betLowLossRate: 0.25 });
    expect(r.won).toBe(true);
    expect(r.goldDelta).toBe(0);
  });

  it('rng exactly at winRate → lose', () => {
    const r = resolveGambleOutcome({ winRate: 0.5, heroGold: 1000, rng: 0.5, isHighBet: true, betHighRewardMul: 3.0, betHighLossRate: 0.6, betLowLossRate: 0.25 });
    expect(r.won).toBe(false);
  });
});
