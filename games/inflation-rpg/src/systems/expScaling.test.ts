import { describe, it, expect } from 'vitest';
import { expRequired, applyExpGain, SP_PER_LEVEL } from './experience';

/**
 * Cycle 42 — Balance: 경험치 스케일링 검증
 */
describe('experience scaling balance', () => {
  it('expRequired increases monotonically with level', () => {
    for (let lv = 1; lv < 200; lv++) {
      expect(expRequired(lv + 1)).toBeGreaterThan(expRequired(lv));
    }
  });

  it('exp curve is sub-quadratic (power 1.8)', () => {
    const ratio50to10 = expRequired(50) / expRequired(10);
    // 50^1.8 / 10^1.8 = 5^1.8 ≈ 16.7
    expect(ratio50to10).toBeGreaterThan(14);
    expect(ratio50to10).toBeLessThan(20);
  });

  it('hard mode provides 10x exp multiplier', () => {
    const normal = applyExpGain(0, 1, 1000, false);
    const hard = applyExpGain(0, 1, 1000, true);
    // hard mode gets 10x the exp → significantly more levels
    expect(hard.newLevel).toBeGreaterThan(normal.newLevel);
  });

  it('SP gained is consistent per level', () => {
    const result = applyExpGain(0, 1, 100000, false);
    const expectedSp = (result.newLevel - 1) * SP_PER_LEVEL;
    expect(result.spGained).toBe(expectedSp);
  });

  it('level 100 requires reasonable exp (not astronomic)', () => {
    const req = expRequired(100);
    // 100 * 100^1.8 = 100 * 3981 ≈ 398,107
    expect(req).toBeGreaterThan(300000);
    expect(req).toBeLessThan(500000);
  });
});
