import { describe, it, expect } from 'vitest';
import { applyDropMult } from './economy';

describe('applyDropMult', () => {
  it('lv 0 = baseline', () => {
    expect(applyDropMult(1000, 0.10, 0)).toBe(1000);
  });

  it('lv 5 × 10% = +50% (1.5×)', () => {
    expect(applyDropMult(1000, 0.10, 5)).toBe(1500);
  });

  it('floor result', () => {
    expect(applyDropMult(100, 0.10, 3)).toBe(130);   // 100 × 1.3 = 130
    expect(applyDropMult(7, 0.10, 5)).toBe(10);      // 7 × 1.5 = 10.5 → floor 10
  });

  it('zero amount stays zero', () => {
    expect(applyDropMult(0, 0.10, 5)).toBe(0);
  });
});
