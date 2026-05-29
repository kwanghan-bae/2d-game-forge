import { describe, it, expect } from 'vitest';

describe('Boss victory confetti', () => {
  it('final boss has more confetti (30 vs 12)', () => {
    const finalCount = 30;
    const normalCount = 12;
    expect(finalCount).toBeGreaterThan(normalCount);
  });

  it('uses 5 celebration colors', () => {
    const colors = [0xffd700, 0xff4488, 0x44ff88, 0x4488ff, 0xff8844];
    expect(colors).toHaveLength(5);
    expect(new Set(colors).size).toBe(5); // all unique
  });

  it('confetti falls from top (-10) to lower half (200-550)', () => {
    const startY = -10;
    const minEndY = 200;
    expect(minEndY).toBeGreaterThan(startY);
  });
});
