import { describe, it, expect } from 'vitest';
import { expRequired, applyExpGain, SP_PER_LEVEL } from './experience';

describe('Experience System', () => {
  it('SP_PER_LEVEL is 4', () => {
    expect(SP_PER_LEVEL).toBe(4);
  });

  it('expRequired(1) = 100', () => {
    expect(expRequired(1)).toBe(100);
  });

  it('expRequired grows with level', () => {
    expect(expRequired(10)).toBeGreaterThan(expRequired(1));
    expect(expRequired(100)).toBeGreaterThan(expRequired(10));
  });

  it('applyExpGain: levels up when exp sufficient', () => {
    const needed = expRequired(1); // 100
    const result = applyExpGain(0, 1, needed, false);
    expect(result.newLevel).toBe(2);
    expect(result.spGained).toBe(4);
    expect(result.newExp).toBe(0);
  });

  it('applyExpGain: multiple levels at once', () => {
    const bigExp = expRequired(1) + expRequired(2) + expRequired(3);
    const result = applyExpGain(0, 1, bigExp, false);
    expect(result.newLevel).toBe(4);
    expect(result.spGained).toBe(12);
  });

  it('applyExpGain: hard mode multiplies exp by 10', () => {
    const result = applyExpGain(0, 1, expRequired(1) / 10, true);
    expect(result.newLevel).toBe(2);
  });

  it('applyExpGain: partial exp carries over', () => {
    const result = applyExpGain(0, 1, 50, false);
    expect(result.newLevel).toBe(1);
    expect(result.newExp).toBe(50);
    expect(result.spGained).toBe(0);
  });
});
