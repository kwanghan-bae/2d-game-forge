import { describe, it, expect } from 'vitest';

describe('Low HP heartbeat trigger', () => {
  const shouldHeartbeat = (currentHp: number, maxHp: number) =>
    currentHp > 0 && maxHp > 0 && currentHp / maxHp < 0.25;

  it('triggers at <25% HP', () => {
    expect(shouldHeartbeat(24, 100)).toBe(true);
    expect(shouldHeartbeat(1, 100)).toBe(true);
  });

  it('does not trigger at >=25% HP', () => {
    expect(shouldHeartbeat(25, 100)).toBe(false);
    expect(shouldHeartbeat(100, 100)).toBe(false);
  });

  it('does not trigger at 0 HP (dead)', () => {
    expect(shouldHeartbeat(0, 100)).toBe(false);
  });

  it('does not trigger with 0 maxHp', () => {
    expect(shouldHeartbeat(10, 0)).toBe(false);
  });
});
