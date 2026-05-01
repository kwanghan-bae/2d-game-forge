import { describe, it, expect } from 'vitest';
import { formatNumber } from './format';

describe('formatNumber', () => {
  it('returns plain digits below 1000', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('uses K for 1e3..1e6', () => {
    expect(formatNumber(1_000)).toBe('1.00K');
    expect(formatNumber(1_500)).toBe('1.50K');
    expect(formatNumber(999_999)).toBe('999K');
  });

  it('uses M for 1e6..1e9', () => {
    expect(formatNumber(1_000_000)).toBe('1.00M');
    expect(formatNumber(50_000_000)).toBe('50.0M');
  });

  it('uses B for 1e9..1e12', () => {
    expect(formatNumber(1_000_000_000)).toBe('1.00B');
    expect(formatNumber(8_900_000_000)).toBe('8.90B');
  });

  it('uses T for 1e12..1e15', () => {
    expect(formatNumber(1_500_000_000_000)).toBe('1.50T');
  });

  it('uses aa..az for 1e15..1e90', () => {
    expect(formatNumber(1.23e15)).toBe('1.23aa');
    expect(formatNumber(7.8e18)).toBe('7.80ab');
    expect(formatNumber(1e90)).toBe('1.00az');
  });

  it('uses ba..bz, ca..cz for higher orders', () => {
    expect(formatNumber(9.99e93)).toBe('9.99ba');
    expect(formatNumber(1e171)).toBe('1.00ca');
  });

  it('handles negative numbers (rare but defensive)', () => {
    expect(formatNumber(-1500)).toBe('-1.50K');
  });

  it('returns "0" for non-finite values', () => {
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(NaN)).toBe('0');
  });

  it('precision: 3-digit total when prefix used', () => {
    expect(formatNumber(12_345)).toBe('12.3K');
    expect(formatNumber(123_456)).toBe('123K');
  });
});
