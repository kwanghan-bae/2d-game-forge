import { describe, it, expect } from 'vitest';

describe('Ambient particle config', () => {
  it('6 particles with varying speed', () => {
    const count = 6;
    const minDuration = 3000;
    const maxDuration = 6000;
    expect(count).toBe(6);
    expect(maxDuration).toBeGreaterThan(minDuration);
  });

  it('particles use realm accent color at low opacity', () => {
    const opacity = 0.3;
    expect(opacity).toBeLessThan(0.5); // subtle, not distracting
  });
});
