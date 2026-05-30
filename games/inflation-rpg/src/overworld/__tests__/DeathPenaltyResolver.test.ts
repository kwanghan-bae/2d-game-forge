import { describe, it, expect } from 'vitest';
import { resolveDeathPenalty, DeathPenaltyContext } from '../encounter/DeathPenaltyResolver';

describe('DeathPenaltyResolver', () => {
  function makeCtx(overrides: Partial<DeathPenaltyContext> = {}): DeathPenaltyContext {
    return {
      comboStreak: 10,
      heroGold: 1000,
      heroHpMax: 100,
      heroLevel: 50,
      heroExp: 500,
      prestigeCount: 0,
      totalDeaths: 5,
      deathStreak: 0,
      consecutiveDeaths: 0,
      goldSaveRoll: false,
      ...overrides,
    };
  }

  it('reduces combo by COMBO_PERSIST_RATE (0.35)', () => {
    const result = resolveDeathPenalty(makeCtx({ comboStreak: 20 }));
    expect(result.newComboStreak).toBe(7); // floor(20 * 0.35)
  });

  it('applies gold loss (10% penalty) when goldSaveRoll is false', () => {
    const result = resolveDeathPenalty(makeCtx({ heroGold: 1000, goldSaveRoll: false }));
    // goldLost = floor(1000 * 0.10 * (1 - 0)) = 100, then insurance = floor(900 * rate)
    expect(result.goldLost).toBe(100);
  });

  it('saves gold when goldSaveRoll is true', () => {
    const result = resolveDeathPenalty(makeCtx({ heroGold: 1000, goldSaveRoll: true }));
    expect(result.goldLost).toBe(0);
    expect(result.goldSaved).toBe(true);
  });

  it('applies HP decay', () => {
    const result = resolveDeathPenalty(makeCtx({ heroHpMax: 100 }));
    // hpDecay = max(1, floor(100 * DEATH_HP_DECAY_RATE))
    expect(result.hpDecay).toBeGreaterThanOrEqual(1);
    expect(result.newHpMax).toBeLessThan(100);
  });

  it('prestige protects gold loss', () => {
    const noPrestige = resolveDeathPenalty(makeCtx({ prestigeCount: 0, goldSaveRoll: false }));
    const withPrestige = resolveDeathPenalty(makeCtx({ prestigeCount: 5, goldSaveRoll: false }));
    expect(withPrestige.goldLost).toBeLessThan(noPrestige.goldLost);
  });

  it('grants combo end exp when combo >= threshold', () => {
    const result = resolveDeathPenalty(makeCtx({ comboStreak: 20 }));
    expect(result.expGained).toBeGreaterThan(0);
  });
});
