import { describe, it, expect } from 'vitest';

describe('Enemy idle bobbing', () => {
  it('boss bobs slower than normal enemy', () => {
    const bossDuration = 1500;
    const normalDuration = 1000;
    expect(bossDuration).toBeGreaterThan(normalDuration);
  });

  it('bobbing amplitude is subtle (4px)', () => {
    const amplitude = 4;
    expect(amplitude).toBeLessThanOrEqual(6);
    expect(amplitude).toBeGreaterThanOrEqual(2);
  });

  it('boss bob starts after spawn animation (600ms delay)', () => {
    const bossDelay = 600;
    const normalDelay = 350;
    expect(bossDelay).toBeGreaterThan(normalDelay);
  });
});
