import { describe, it, expect } from 'vitest';
import { formatCompact, formatWithCommas, formatPercent, formatDuration } from './numberFormat';

describe('Number formatting', () => {
  it('formatCompact handles all tiers', () => {
    expect(formatCompact(500)).toBe('500');
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(15000)).toBe('15.0K');
    expect(formatCompact(1500000)).toBe('1.5M');
    expect(formatCompact(2500000000)).toBe('2.5B');
  });

  it('formatCompact handles edge cases defensively', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(-5)).toBe('0');
    expect(formatCompact(NaN)).toBe('0');
    expect(formatCompact(Infinity)).toBe('0');
    expect(formatCompact(-Infinity)).toBe('0');
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(1000)).toBe('1.0K');
  });

  it('formatWithCommas adds separators', () => {
    expect(formatWithCommas(1234567)).toBe('1,234,567');
    expect(formatWithCommas(999)).toBe('999');
  });

  it('formatPercent converts ratio', () => {
    expect(formatPercent(0.756)).toBe('76%');
    expect(formatPercent(0.756, 1)).toBe('75.6%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('formatDuration handles h/m/s', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3661)).toBe('1h 1m');
  });
});
