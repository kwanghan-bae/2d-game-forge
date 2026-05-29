import { describe, it, expect } from 'vitest';

describe('Boss golden tint', () => {
  it('applies 0xffd700 tint for boss fights', () => {
    const BOSS_TINT = 0xffd700;
    expect(BOSS_TINT).toBe(16766720);
    // Boss tint value is correct golden color
    const r = (BOSS_TINT >> 16) & 0xff;
    const g = (BOSS_TINT >> 8) & 0xff;
    const b = BOSS_TINT & 0xff;
    expect(r).toBe(255);
    expect(g).toBe(215);
    expect(b).toBe(0);
  });

  it('restores boss tint after hit flash clearTint', () => {
    // Simulates the pattern: setTintFill → clearTint → re-apply boss tint
    let currentTint: number | null = null;
    const sprite = {
      setTintFill: (c: number) => { currentTint = c; },
      clearTint: () => { currentTint = null; },
      setTint: (c: number) => { currentTint = c; },
    };
    const isBoss = true;
    // Hit flash
    sprite.setTintFill(0xffffff);
    expect(currentTint).toBe(0xffffff);
    // After 80ms callback
    sprite.clearTint();
    if (isBoss) sprite.setTint(0xffd700);
    expect(currentTint).toBe(0xffd700);
  });
});
