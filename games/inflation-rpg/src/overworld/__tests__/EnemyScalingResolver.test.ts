import { describe, it, expect } from 'vitest';
import { computeEnemyPrestigeScale } from '../encounter/EnemyScalingResolver';

describe('EnemyScalingResolver', () => {
  it('returns 1.0 at prestige 0 (no scaling)', () => {
    const result = computeEnemyPrestigeScale(0);
    expect(result.hpMul).toBe(1.0);
    expect(result.atkMul).toBe(1.0);
  });

  it('C684: compound HP scaling at prestige 5 (1.14^5 ≈ 1.93)', () => {
    const result = computeEnemyPrestigeScale(5);
    expect(result.hpMul).toBeCloseTo(Math.pow(1.14, 5), 1);
  });

  it('C684: compound HP scaling at prestige 10 (1.14^10 ≈ 3.71)', () => {
    const result = computeEnemyPrestigeScale(10);
    expect(result.hpMul).toBeCloseTo(Math.pow(1.14, 10), 1);
  });

  it('C684: HP scaling caps at prestige 20', () => {
    const result20 = computeEnemyPrestigeScale(20);
    const result25 = computeEnemyPrestigeScale(25);
    expect(result20.hpMul).toBeCloseTo(Math.pow(1.14, 20), 1);
    expect(result25.hpMul).toBeCloseTo(result20.hpMul, 2);
  });

  it('C684: compound ATK scaling at prestige 10 (1.06^10 ≈ 1.79)', () => {
    const result = computeEnemyPrestigeScale(10);
    expect(result.atkMul).toBeCloseTo(Math.pow(1.06, 10), 1);
  });

  it('C684: ATK scaling caps at prestige 20', () => {
    const result20 = computeEnemyPrestigeScale(20);
    const result25 = computeEnemyPrestigeScale(25);
    expect(result20.atkMul).toBeCloseTo(Math.pow(1.06, 20), 1);
    expect(result25.atkMul).toBeCloseTo(result20.atkMul, 2);
  });
});
