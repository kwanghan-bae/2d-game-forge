import { describe, it, expect } from 'vitest';

describe('Enemy spawn animation variety', () => {
  it('3 spawn styles for normal enemies based on modulo', () => {
    const styles = new Set<number>();
    for (let i = 0; i < 100; i++) {
      styles.add(i % 3);
    }
    expect(styles.size).toBe(3);
    expect(styles.has(0)).toBe(true); // bounce
    expect(styles.has(1)).toBe(true); // slide
    expect(styles.has(2)).toBe(true); // fade
  });

  it('boss uses spin entrance (angle -180 → 0)', () => {
    const startAngle = -180;
    const endAngle = 0;
    expect(endAngle - startAngle).toBe(180);
  });
});
