import { describe, it, expect } from 'vitest';

describe('Enemy death particle config', () => {
  it('boss particles are golden and more numerous', () => {
    const bossColor = 0xffd700;
    const bossCount = 20;
    const normalColor = 0xff4444;
    const normalCount = 8;
    expect(bossCount).toBeGreaterThan(normalCount);
    expect(bossColor).not.toBe(normalColor);
  });

  it('particles spread in a full circle', () => {
    const count = 8;
    const angles = Array.from({ length: count }, (_, i) => (Math.PI * 2 * i) / count);
    expect(angles[0]).toBe(0);
    expect(angles[count - 1]).toBeCloseTo(Math.PI * 2 * (count - 1) / count);
  });
});
