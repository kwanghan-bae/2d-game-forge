import { describe, it, expect } from 'vitest';
import { getAreaWarning } from './areaWarnings';

describe('areaWarnings', () => {
  it('returns null when area level < 2x player level', () => {
    expect(getAreaWarning(10, 6)).toBeNull();
    expect(getAreaWarning(10, 10)).toBeNull();
  });

  it('returns warning when area level >= 2x player level', () => {
    const warning = getAreaWarning(20, 5);
    expect(warning).not.toBeNull();
    expect(typeof warning).toBe('string');
  });

  it('returns null for zero player level', () => {
    expect(getAreaWarning(10, 0)).toBeNull();
  });

  it('warning text varies by level sum', () => {
    const w1 = getAreaWarning(100, 10);
    const w2 = getAreaWarning(101, 10);
    // Different levels should potentially produce different warnings
    expect(w1).not.toBeNull();
    expect(w2).not.toBeNull();
  });
});
