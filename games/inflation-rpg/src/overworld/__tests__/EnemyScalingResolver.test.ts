import { describe, it, expect } from 'vitest';
import { computeEnemyPrestigeScale } from '../encounter/EnemyScalingResolver';

describe('EnemyScalingResolver', () => {
  it('returns 1.0 at prestige 0 (no scaling)', () => {
    const result = computeEnemyPrestigeScale(0);
    expect(result.hpMul).toBe(1.0);
    expect(result.atkMul).toBe(1.0);
  });

  it('scales HP by 0.15/P at prestige 5 (×1.75)', () => {
    const result = computeEnemyPrestigeScale(5);
    expect(result.hpMul).toBeCloseTo(1.75);
  });

  it('scales HP by 0.15/P at prestige 10 (×2.5)', () => {
    const result = computeEnemyPrestigeScale(10);
    expect(result.hpMul).toBeCloseTo(2.5);
  });

  it('caps HP scaling at prestige 15 (×3.25)', () => {
    const result = computeEnemyPrestigeScale(15);
    expect(result.hpMul).toBeCloseTo(3.25);
    // Beyond cap
    const result20 = computeEnemyPrestigeScale(20);
    expect(result20.hpMul).toBeCloseTo(3.25);
  });

  it('scales ATK by 0.06/P at prestige 10 (×1.6)', () => {
    const result = computeEnemyPrestigeScale(10);
    expect(result.atkMul).toBeCloseTo(1.6);
  });

  it('caps ATK scaling at prestige 15 (×1.9)', () => {
    const result = computeEnemyPrestigeScale(15);
    expect(result.atkMul).toBeCloseTo(1.9);
    const result20 = computeEnemyPrestigeScale(20);
    expect(result20.atkMul).toBeCloseTo(1.9);
  });
});
