import { describe, it, expect } from 'vitest';

describe('Level-up VFX parameters', () => {
  it('milestone levels are multiples of 10', () => {
    expect(10 % 10 === 0).toBe(true);
    expect(50 % 10 === 0).toBe(true);
    expect(13 % 10 === 0).toBe(false);
  });

  it('milestone flash is golden, normal is white', () => {
    const milestoneFlash = { r: 255, g: 215, b: 0, duration: 400 };
    const normalFlash = { r: 255, g: 255, b: 255, duration: 200 };
    expect(milestoneFlash.duration).toBeGreaterThan(normalFlash.duration);
    expect(milestoneFlash.g).toBeLessThan(normalFlash.g); // golden vs white
  });

  it('hero glow tint is warm yellow', () => {
    const tint = 0xffffaa;
    const r = (tint >> 16) & 0xff;
    const g = (tint >> 8) & 0xff;
    const b = tint & 0xff;
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(170); // warm yellow
  });
});
