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

describe('applyExpGain — bonusSpPerLevel (Phase G sp_per_lvl)', () => {
  it('default 0 = baseline SP_PER_LEVEL', () => {
    const baseline = applyExpGain(0, 1, expRequired(1) * 1, false);
    const same = applyExpGain(0, 1, expRequired(1) * 1, false, 0);
    expect(same.spGained).toBe(baseline.spGained);
  });

  it('bonus +2: each level-up grants SP_PER_LEVEL+2 = 6', () => {
    // 1 level worth of exp triggers 1 level-up
    const needed = expRequired(1);
    const r = applyExpGain(0, 1, needed, false, 2);
    expect(r.newLevel).toBe(2);
    expect(r.spGained).toBe(SP_PER_LEVEL + 2);   // 4 + 2 = 6
  });

  it('two-level jump grants 2*(SP_PER_LEVEL+bonus)', () => {
    const needed = expRequired(1) + expRequired(2);
    const r = applyExpGain(0, 1, needed, false, 1);
    expect(r.newLevel).toBe(3);
    expect(r.spGained).toBe(2 * (SP_PER_LEVEL + 1));   // 2 × 5 = 10
  });
});

describe('applyExpGain — 6th param metaXpMult (Phase E)', () => {
  it('defaults to 1.0 (backwards compat)', () => {
    const a = applyExpGain(0, 1, 100, false);
    const b = applyExpGain(0, 1, 100, false, 0, 1);
    expect(a).toEqual(b);
  });

  it('multiplies gained exp by metaXpMult', () => {
    // 40 * 2 = 80 < expRequired(1) = 100, so no level-up; newExp = gained * mult
    const small = applyExpGain(0, 1, 40, false, 0, 1);
    const doubled = applyExpGain(0, 1, 40, false, 0, 2);
    expect(small.newExp).toBe(40);
    expect(doubled.newExp).toBe(80);
    expect(doubled.newExp).toBe(small.newExp * 2);
  });

  it('stacks multiplicatively with hard mode (10x * 2x = 20x)', () => {
    // gainedExp = 4, hard = 10x → exp = 40 (no level up, expRequired(1) = 100)
    const baseline = applyExpGain(0, 1, 4, true, 0, 1);
    // gainedExp = 4, hard = 10x, metaXpMult = 2x → exp = 80 (still no level up)
    const stacked = applyExpGain(0, 1, 4, true, 0, 2);
    expect(baseline.newExp).toBe(40);
    expect(stacked.newExp).toBe(80);
    expect(stacked.newExp).toBe(baseline.newExp * 2);
  });
});
