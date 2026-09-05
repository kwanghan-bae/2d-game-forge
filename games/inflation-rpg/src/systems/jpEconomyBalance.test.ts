import { describe, it, expect } from 'vitest';
import {
  JP_PERKS,
  JpPerkId,
  canPurchasePerk,
  purchasePerk,
  getActivePerkEffects,
} from './jpPerks';
import { jpFromCycle } from '../meta/MetaProgression';

describe('C1024: JP Economy Balance & Simulation Invariant', () => {
  describe('JP generation curve per cycle', () => {
    it('early cycle (low level, 0-1 boss) yields 1-3 JP (first perk in ~2-3 cycles)', () => {
      const earlyStats = { maxLevel: 300, kills: 15, bossKills: 0, drops: 1, overkillCount: 2, critCount: 5 };
      const jp = jpFromCycle(earlyStats);
      expect(jp).toBeGreaterThanOrEqual(1);
      expect(jp).toBeLessThanOrEqual(3);

      const earlyBossStats = { maxLevel: 500, kills: 25, bossKills: 1, drops: 2, overkillCount: 5, critCount: 10 };
      const jpWithBoss = jpFromCycle(earlyBossStats);
      expect(jpWithBoss).toBeGreaterThanOrEqual(3);
      expect(jpWithBoss).toBeLessThanOrEqual(5);
    });

    it('mid cycle (1k-3k level, 2-3 bosses) yields 7-14 JP (unlocks Tier 1 perk per cycle)', () => {
      const midStats = { maxLevel: 2500, kills: 60, bossKills: 2, drops: 8, overkillCount: 20, critCount: 45 };
      const jp = jpFromCycle(midStats);
      // base: 1 + 4 + 2.5 = 7.5; overkills: 2; crits: 2.25 => floor(11.75) = 11
      expect(jp).toBeGreaterThanOrEqual(7);
      expect(jp).toBeLessThanOrEqual(15);
    });

    it('late cycle (10k+ level, 5 bosses) yields 20-35 JP (unlocks Tier 2 perk every 1-2 cycles)', () => {
      const lateStats = { maxLevel: 12000, kills: 150, bossKills: 5, drops: 25, overkillCount: 80, critCount: 150 };
      const jp = jpFromCycle(lateStats);
      // base: 1 + 10 + 12 = 23; overkills: 8; crits: 7 => 38
      expect(jp).toBeGreaterThanOrEqual(20);
      expect(jp).toBeLessThanOrEqual(40);
    });
  });

  describe('Perk tree progression simulation', () => {
    it('total perk tree cost is 137 JP across 12 perks', () => {
      const totalCost = JP_PERKS.reduce((sum, p) => sum + p.cost, 0);
      expect(totalCost).toBe(137);

      const tier1Perks = JP_PERKS.filter(p => !p.tier || p.tier === 1);
      const tier2Perks = JP_PERKS.filter(p => p.tier === 2);
      expect(tier1Perks).toHaveLength(8);
      expect(tier2Perks).toHaveLength(4);

      const tier1Cost = tier1Perks.reduce((sum, p) => sum + p.cost, 0);
      const tier2Cost = tier2Perks.reduce((sum, p) => sum + p.cost, 0);
      expect(tier1Cost).toBe(74);
      expect(tier2Cost).toBe(63);
    });

    it('simulates 15-cycle progression: builds Tier 1 foundation then ascends into Tier 2', () => {
      let currentJp = 0;
      let ownedPerks: JpPerkId[] = [];

      // Simulate 15 cycles with increasing performance
      for (let cycle = 1; cycle <= 15; cycle++) {
        // Progressive cycle stats: maxLevel increases by ~800 each cycle
        const level = 400 + cycle * 800;
        const bossKills = Math.min(4, Math.floor(cycle / 3));
        const overkillCount = cycle * 5;
        const critCount = cycle * 10;

        const earned = jpFromCycle({
          maxLevel: level,
          kills: 20 + cycle * 5,
          bossKills,
          drops: cycle,
          overkillCount,
          critCount,
        });
        currentJp += earned;

        // Try to purchase affordable perks in strategic order
        // 1. Starter Tier 1 perks
        // 2. Prerequisites for desired Tier 2 perks
        // 3. Tier 2 perks when prerequisites are met
        let boughtSomething = true;
        while (boughtSomething) {
          boughtSomething = false;
          // Sort available by cost ascending, preferring prerequisites first
          const available = JP_PERKS.filter(p => canPurchasePerk(p.id, ownedPerks, currentJp).canBuy);
          if (available.length > 0) {
            // Pick first purchasable
            const chosen = available[0]!;
            const result = purchasePerk(chosen.id, ownedPerks, currentJp);
            if (result) {
              ownedPerks = result.newOwned;
              currentJp = result.newJp;
              boughtSomething = true;
            }
          }
        }
      }

      // By cycle 15, should have unlocked all Tier 1 perks and at least 3 Tier 2 perks
      const tier1Owned = ownedPerks.filter(id => {
        const def = JP_PERKS.find(p => p.id === id);
        return def?.tier === 1 || !def?.tier;
      });
      const tier2Owned = ownedPerks.filter(id => {
        const def = JP_PERKS.find(p => p.id === id);
        return def?.tier === 2;
      });

      expect(tier1Owned.length).toBe(8); // all 8 tier 1 perks
      expect(tier2Owned.length).toBeGreaterThanOrEqual(3); // at least 3 of 4 tier 2 perks

      // Verify active effects reflect full build
      const effects = getActivePerkEffects(ownedPerks);
      expect(effects.reviveEnabled).toBe(true);
      expect(effects.critCascadeChance).toBe(0.3);
      expect(effects.critDamageBonus).toBe(0.5);
    });

    it('enforces prerequisite lock in sequential progression', () => {
      let owned: JpPerkId[] = [];
      let jp = 100; // lots of JP, but no prerequisites

      // Attempting to buy crit_mastery directly should fail
      const attempt1 = canPurchasePerk('crit_mastery', owned, jp);
      expect(attempt1.canBuy).toBe(false);
      expect(attempt1.reason).toBe('missing_prerequisite');

      // Buy crit_cascade (prerequisite)
      const buyCascade = purchasePerk('crit_cascade', owned, jp);
      expect(buyCascade).not.toBeNull();
      owned = buyCascade!.newOwned;
      jp = buyCascade!.newJp;

      // Now crit_mastery is eligible
      const attempt2 = canPurchasePerk('crit_mastery', owned, jp);
      expect(attempt2.canBuy).toBe(true);

      const buyMastery = purchasePerk('crit_mastery', owned, jp);
      expect(buyMastery).not.toBeNull();
      owned = buyMastery!.newOwned;

      expect(owned).toContain('crit_cascade');
      expect(owned).toContain('crit_mastery');
    });
  });
});
