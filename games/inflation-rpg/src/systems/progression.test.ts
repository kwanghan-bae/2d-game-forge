import { describe, it, expect } from 'vitest';
import {
  HARD_MODE_UNLOCK_LEVEL,
  MAX_BASE_ABILITY_LEVEL,
  isHardModeUnlocked,
  calcBaseAbilityMult,
  onBossKill,
  getBaseAbilityLevel,
} from './progression';

describe('Progression System', () => {
  it('HARD_MODE_UNLOCK_LEVEL is 100000', () => {
    expect(HARD_MODE_UNLOCK_LEVEL).toBe(100_000);
  });

  it('MAX_BASE_ABILITY_LEVEL is 18', () => {
    expect(MAX_BASE_ABILITY_LEVEL).toBe(18);
  });

  it('isHardModeUnlocked: false below threshold', () => {
    expect(isHardModeUnlocked(99_999)).toBe(false);
  });

  it('isHardModeUnlocked: true at or above threshold', () => {
    expect(isHardModeUnlocked(100_000)).toBe(true);
    expect(isHardModeUnlocked(200_000)).toBe(true);
  });

  it('calcBaseAbilityMult: 1 at level 0', () => {
    expect(calcBaseAbilityMult(0)).toBe(1);
  });

  it('calcBaseAbilityMult: 1.9 at level 18', () => {
    expect(calcBaseAbilityMult(18)).toBeCloseTo(1.9);
  });

  it('onBossKill: adds new boss to list', () => {
    const result = onBossKill('goblin-chief', [], 9);
    expect(result).toContain('goblin-chief');
    expect(result).toHaveLength(1);
  });

  it('onBossKill: does not add duplicate', () => {
    const result = onBossKill('goblin-chief', ['goblin-chief'], 9);
    expect(result).toHaveLength(1);
  });

  it('onBossKill: does not exceed maxLevel', () => {
    const full = Array.from({ length: 9 }, (_, i) => `boss-${i}`);
    const result = onBossKill('new-boss', full, 9);
    expect(result).toHaveLength(9);
  });

  it('getBaseAbilityLevel: sum of killed bosses, capped at 18', () => {
    const normal = ['a', 'b', 'c'];
    const hard = ['d', 'e'];
    expect(getBaseAbilityLevel(normal, hard)).toBe(5);
  });
});
