import { describe, it, expect } from 'vitest';
import { compareEquipment, formatDiff, formatEffectSummary } from './equipCompare';

describe('Equipment comparison', () => {
  it('detects upgrade when candidate has higher stats', () => {
    const result = compareEquipment({ atk: 10, def: 5 }, { atk: 15, def: 5 });
    expect(result.isUpgrade).toBe(true);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.delta).toBe(5);
  });

  it('detects downgrade', () => {
    const result = compareEquipment({ atk: 20 }, { atk: 10 });
    expect(result.isUpgrade).toBe(false);
  });

  it('handles new stats on candidate', () => {
    const result = compareEquipment({ atk: 10 }, { atk: 10, luc: 5 });
    expect(result.isUpgrade).toBe(true);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.stat).toBe('luc');
  });

  it('formats positive diff with +', () => {
    expect(formatDiff({ stat: 'atk', current: 10, candidate: 15, delta: 5 })).toBe('atk: +5');
  });

  it('formats negative diff without +', () => {
    expect(formatDiff({ stat: 'def', current: 10, candidate: 7, delta: -3 })).toBe('def: -3');
  });

  it('includes effectSummary when candidate has special effect', () => {
    const result = compareEquipment({ atk: 10 }, { atk: 15 }, { type: 'burst_chance', bonus: 20 });
    expect(result.effectSummary).toBe('폭발확률+20%');
  });

  it('effectSummary undefined when no special effect', () => {
    const result = compareEquipment({ atk: 10 }, { atk: 15 });
    expect(result.effectSummary).toBeUndefined();
  });
});

describe('formatEffectSummary', () => {
  it('formats burst_chance', () => {
    expect(formatEffectSummary({ type: 'burst_chance', bonus: 20 })).toBe('폭발확률+20%');
  });
  it('formats gold_bonus', () => {
    expect(formatEffectSummary({ type: 'gold_bonus', percent: 15 })).toBe('골드+15%');
  });
  it('formats exp_bonus', () => {
    expect(formatEffectSummary({ type: 'exp_bonus', percent: 10 })).toBe('경험치+10%');
  });
  it('formats combo_shield', () => {
    expect(formatEffectSummary({ type: 'combo_shield', threshold: 3 })).toBe('콤보방어 3연속');
  });
});
