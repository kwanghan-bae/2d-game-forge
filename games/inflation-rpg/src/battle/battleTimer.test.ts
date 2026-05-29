import { describe, it, expect } from 'vitest';

describe('Battle elapsed timer', () => {
  it('formats elapsed seconds correctly', () => {
    const format = (startMs: number, nowMs: number) => {
      const elapsed = Math.floor((nowMs - startMs) / 1000);
      return `⏱ ${elapsed}s`;
    };
    expect(format(1000, 1000)).toBe('⏱ 0s');
    expect(format(1000, 6500)).toBe('⏱ 5s');
    expect(format(0, 61000)).toBe('⏱ 61s');
  });
});
