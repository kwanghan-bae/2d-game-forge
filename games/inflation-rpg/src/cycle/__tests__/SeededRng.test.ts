import { describe, it, expect } from 'vitest';
import { SeededRng } from '../SeededRng';

describe('SeededRng', () => {
  it('same seed produces same sequence', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() returns values in [0, 1)', () => {
    const rng = new SeededRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(maxExclusive) returns integer in [0, max)', () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });

  it('chance(p) returns true with rough p frequency', () => {
    const rng = new SeededRng(99);
    let hits = 0;
    for (let i = 0; i < 10000; i++) {
      if (rng.chance(0.3)) hits++;
    }
    expect(hits).toBeGreaterThan(2700);
    expect(hits).toBeLessThan(3300);
  });
});
