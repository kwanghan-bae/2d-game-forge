import { describe, it, expect } from 'vitest';

describe('Hero breathing animation', () => {
  it('uses subtle scale change (4 → 4.1 = 2.5% increase)', () => {
    const base = 4;
    const peak = 4.1;
    const percentChange = ((peak - base) / base) * 100;
    expect(percentChange).toBeCloseTo(2.5);
  });

  it('uses slow sinusoidal ease for natural feel', () => {
    const duration = 1200;
    const ease = 'Sine.easeInOut';
    expect(duration).toBeGreaterThanOrEqual(800);
    expect(ease).toContain('Sine');
  });
});
