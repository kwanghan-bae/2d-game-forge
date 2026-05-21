import { describe, it, expect } from 'vitest';
import { goldFromCycle, spend, costForNextAtk, costForNextHp } from '../MetaProgression';

describe('MetaProgression.goldFromCycle', () => {
  it('rewards more for higher maxLevel and kills', () => {
    const low = goldFromCycle({ maxLevel: 100, kills: 30, bossKills: 0, drops: 5 });
    const high = goldFromCycle({ maxLevel: 14000, kills: 95, bossKills: 3, drops: 30 });
    expect(high).toBeGreaterThan(low);
  });

  it('never returns less than 1', () => {
    expect(goldFromCycle({ maxLevel: 0, kills: 0, bossKills: 0, drops: 0 })).toBeGreaterThanOrEqual(1);
  });
});

describe('MetaProgression.spend', () => {
  it('atk-focus puts all gold into atk', () => {
    const r = spend({ gold: 1000, atkBaseBonus: 0, hpBaseBonus: 0, strategy: 'atk-focus' });
    expect(r.atkPurchases).toBeGreaterThan(0);
    expect(r.hpPurchases).toBe(0);
  });

  it('hp-focus puts all gold into hp', () => {
    const r = spend({ gold: 1000, atkBaseBonus: 0, hpBaseBonus: 0, strategy: 'hp-focus' });
    expect(r.hpPurchases).toBeGreaterThan(0);
    expect(r.atkPurchases).toBe(0);
  });

  it('balanced spreads roughly evenly', () => {
    const r = spend({ gold: 5000, atkBaseBonus: 0, hpBaseBonus: 0, strategy: 'balanced' });
    expect(Math.abs(r.atkPurchases - r.hpPurchases)).toBeLessThanOrEqual(1);
  });

  it('personality picks atk when heroic > prudent', () => {
    const r = spend({
      gold: 200, atkBaseBonus: 0, hpBaseBonus: 0,
      strategy: 'personality',
      personality: { heroic: 5, prudent: 0 },
    });
    expect(r.atkPurchases).toBeGreaterThan(r.hpPurchases);
  });

  it('exhausts gold completely when possible', () => {
    const cost0 = costForNextAtk(0);
    const r = spend({ gold: cost0, atkBaseBonus: 0, hpBaseBonus: 0, strategy: 'atk-focus' });
    expect(r.atkPurchases).toBe(1);
    expect(r.goldRemaining).toBe(0);
  });

  it('costs increase with each purchase', () => {
    expect(costForNextAtk(0)).toBeLessThan(costForNextAtk(5));
    expect(costForNextHp(0)).toBeLessThan(costForNextHp(5));
  });

  it('focus strategies do NOT fall back to the alt side', () => {
    // hp-focus with 50 gold and hp cost = 60 → leaves gold unspent.
    const r = spend({ gold: 50, atkBaseBonus: 0, hpBaseBonus: 5, strategy: 'hp-focus' });
    expect(r.atkPurchases).toBe(0);
    expect(r.hpPurchases).toBe(0);
    expect(r.goldRemaining).toBe(50);
  });

  it('balanced strategy spends leftover gold on alt side when primary too expensive', () => {
    // After balanced buys exhaust gold partly, leftover may be enough for cheaper side.
    const r = spend({ gold: 200, atkBaseBonus: 0, hpBaseBonus: 0, strategy: 'balanced' });
    // 50 atk → 30 hp → 60 atk → 36 hp = 176. 24 leftover; 70 atk too expensive, 42 hp too. stops.
    expect(r.goldRemaining).toBeLessThan(70);
  });
});
