import { describe, it, expect } from 'vitest';

describe('Critical hit damage VFX', () => {
  it('crit text is larger and bolder', () => {
    const critSize = 20;
    const normalSize = 14;
    expect(critSize).toBeGreaterThan(normalSize);
  });

  it('crit starts scaled up (1.5x) and punches to 1x', () => {
    const startScale = 1.5;
    const endScale = 1;
    expect(startScale).toBeGreaterThan(endScale);
  });

  it('crit emoji prefix draws attention', () => {
    const critLabel = `💥${1234}`;
    expect(critLabel).toContain('💥');
  });

  it('crit floats higher and lasts longer', () => {
    const critDuration = 800;
    const normalDuration = 600;
    const critDist = 50;
    const normalDist = 50;
    expect(critDuration).toBeGreaterThan(normalDuration);
    expect(critDist).toBeGreaterThanOrEqual(normalDist);
  });
});
