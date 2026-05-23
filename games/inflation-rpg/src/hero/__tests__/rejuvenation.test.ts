import { describe, it, expect } from 'vitest';
import { rejuvenationCost } from '../rejuvenation';

describe('rejuvenationCost', () => {
  it('age 5 → 0 빛 (no cost at minimum age)', () => {
    expect(rejuvenationCost(5)).toBe(0);
  });

  it('age 15 → 100 빛 (linear)', () => {
    expect(rejuvenationCost(15)).toBe(100);
  });

  it('age 50 → 450 빛', () => {
    expect(rejuvenationCost(50)).toBe(450);
  });

  it('age 100 → 950 빛', () => {
    expect(rejuvenationCost(100)).toBe(950);
  });

  it('clamps non-positive ages to 0', () => {
    expect(rejuvenationCost(0)).toBe(0);
    expect(rejuvenationCost(-100)).toBe(0);
  });
});
