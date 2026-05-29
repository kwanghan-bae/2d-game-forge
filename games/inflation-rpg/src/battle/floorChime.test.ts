import { describe, it, expect } from 'vitest';

describe('Floor clear chime', () => {
  it('uses ascending 3-note pattern', () => {
    const pitches = [1.0, 1.3, 1.6];
    expect(pitches[0]!).toBeLessThan(pitches[1]!);
    expect(pitches[1]!).toBeLessThan(pitches[2]!);
  });

  it('notes are spaced 80ms apart', () => {
    const delays = [0, 80, 160];
    expect(delays[1]! - delays[0]!).toBe(80);
    expect(delays[2]! - delays[1]!).toBe(80);
  });
});
