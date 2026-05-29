import { describe, it, expect } from 'vitest';
import { goldFromCycle, costForNextAtk, costForNextHp, spend } from './MetaProgression';

describe('gold economy scaling', () => {
  it('gold payout increases with maxLevel', () => {
    const low = goldFromCycle({ maxLevel: 10, kills: 20, bossKills: 0, drops: 5 });
    const mid = goldFromCycle({ maxLevel: 50, kills: 20, bossKills: 0, drops: 5 });
    const high = goldFromCycle({ maxLevel: 200, kills: 20, bossKills: 0, drops: 5 });
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('boss kills provide significant bonus', () => {
    const noBoss = goldFromCycle({ maxLevel: 50, kills: 30, bossKills: 0, drops: 5 });
    const withBoss = goldFromCycle({ maxLevel: 50, kills: 30, bossKills: 3, drops: 5 });
    expect(withBoss - noBoss).toBe(75); // 3 * 25
  });

  it('minimum payout is always >= 1', () => {
    const minimal = goldFromCycle({ maxLevel: 0, kills: 0, bossKills: 0, drops: 0 });
    expect(minimal).toBeGreaterThanOrEqual(1);
  });

  it('atk cost curve is sub-quadratic but increasing', () => {
    const costs = Array.from({ length: 20 }, (_, i) => costForNextAtk(i));
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]! > costs[i - 1]!, `cost[${i}] > cost[${i - 1}]`).toBe(true);
    }
    // sub-quadratic: cost[19] < 19^2 * something unreasonable
    expect(costs[19]).toBeLessThan(500);
  });

  it('hp cost curve is cheaper than atk (hp is less impactful)', () => {
    for (let i = 0; i < 10; i++) {
      expect(costForNextHp(i)).toBeLessThan(costForNextAtk(i));
    }
  });

  it('spend balanced allocates roughly equal atk/hp', () => {
    const result = spend({
      gold: 1000,
      atkBaseBonus: 0,
      hpBaseBonus: 0,
      strategy: 'balanced',
    });
    expect(Math.abs(result.atkPurchases - result.hpPurchases)).toBeLessThanOrEqual(1);
    expect(result.atkPurchases + result.hpPurchases).toBeGreaterThan(5);
  });
});
