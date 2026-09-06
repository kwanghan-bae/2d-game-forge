/**
 * celestialGemCarving.test.ts — C1087: Four-Elemental Celestial Gem Carving Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  GEM_DEFINITIONS,
  GEM_TIER_DEFINITIONS,
  getEffectiveGemEffect,
  canCarveGem,
  canUpgradeGem,
  upgradeCarvedGem,
  evaluateGemOnHitTrigger,
  evaluateGemOnDamagedTrigger,
  type CarvedGem,
} from './celestialGemCarving';

describe('C1087 [system]: Celestial Gem Carving & Trigger Transcendence Engine', () => {
  describe('1. Gem and Tier Definitions', () => {
    it('defines 4 elemental gems with matching affinities and trigger types', () => {
      expect(GEM_DEFINITIONS.fire_ruby.element).toBe('fire');
      expect(GEM_DEFINITIONS.fire_ruby.triggerType).toBe('on_hit');

      expect(GEM_DEFINITIONS.water_sapphire.element).toBe('water');
      expect(GEM_DEFINITIONS.water_sapphire.triggerType).toBe('on_damaged');

      expect(GEM_DEFINITIONS.lightning_topaz.element).toBe('lightning');
      expect(GEM_DEFINITIONS.lightning_topaz.triggerType).toBe('on_hit');

      expect(GEM_DEFINITIONS.dark_amethyst.element).toBe('dark');
      expect(GEM_DEFINITIONS.dark_amethyst.triggerType).toBe('on_hit');
    });

    it('defines 4 tiers with increasing potency multipliers and resource costs', () => {
      expect(GEM_TIER_DEFINITIONS.normal.potencyMultiplier).toBe(1.0);
      expect(GEM_TIER_DEFINITIONS.rare.potencyMultiplier).toBe(1.3);
      expect(GEM_TIER_DEFINITIONS.legendary.potencyMultiplier).toBe(1.7);
      expect(GEM_TIER_DEFINITIONS.mythic.potencyMultiplier).toBe(2.2);

      expect(GEM_TIER_DEFINITIONS.mythic.costShards).toBeGreaterThan(
        GEM_TIER_DEFINITIONS.legendary.costShards,
      );
    });
  });

  describe('2. Crafting & Upgrading Logic', () => {
    it('evaluates carving and upgrade affordability properly', () => {
      expect(canCarveGem(20, 2, 40000)).toBe(false);
      expect(canCarveGem(30, 3, 50000)).toBe(true);

      const normalGem: CarvedGem = { type: 'fire_ruby', tier: 'normal' };
      expect(canUpgradeGem(normalGem, 40, 5, 50000)).toBe(false);
      expect(canUpgradeGem(normalGem, 50, 6, 100000)).toBe(true);

      const mythicGem: CarvedGem = { type: 'fire_ruby', tier: 'mythic' };
      expect(canUpgradeGem(mythicGem, 9999, 999, 99999999)).toBe(false);
    });

    it('upgrades gem tier sequentially from normal to mythic', () => {
      let gem: CarvedGem = { type: 'water_sapphire', tier: 'normal' };

      // Normal -> Rare
      const res1 = upgradeCarvedGem(gem, 50, 6, 100000);
      expect(res1.success).toBe(true);
      expect(res1.upgradedGem.tier).toBe('rare');
      gem = res1.upgradedGem;

      // Rare -> Legendary
      const res2 = upgradeCarvedGem(gem, 90, 12, 200000);
      expect(res2.success).toBe(true);
      expect(res2.upgradedGem.tier).toBe('legendary');
      gem = res2.upgradedGem;

      // Legendary -> Mythic
      const res3 = upgradeCarvedGem(gem, 150, 25, 500000);
      expect(res3.success).toBe(true);
      expect(res3.upgradedGem.tier).toBe('mythic');
      gem = res3.upgradedGem;

      // Mythic cannot be upgraded further
      const res4 = upgradeCarvedGem(gem, 999, 99, 999999);
      expect(res4.success).toBe(false);
      expect(res4.message).toContain('최고 등급');
    });
  });

  describe('3. Combat Trigger Evaluations', () => {
    it('triggers Fire Ruby on-hit inferno burst scaling with tier potency', () => {
      const normalRuby: CarvedGem = { type: 'fire_ruby', tier: 'normal' };
      const mythicRuby: CarvedGem = { type: 'fire_ruby', tier: 'mythic' };

      // Roll 0.05 guaranteed trigger
      const resNormal = evaluateGemOnHitTrigger(normalRuby, 1000000, 0.05);
      const resMythic = evaluateGemOnHitTrigger(mythicRuby, 1000000, 0.05);

      expect(resNormal.triggered).toBe(true);
      expect(resNormal.bonusDamage).toBe(1500000); // 1M * 1.5 * 1.0

      expect(resMythic.triggered).toBe(true);
      expect(resMythic.bonusDamage).toBe(3300000); // 1M * 1.5 * 2.2 = 3.3M!
    });

    it('triggers Water Sapphire on-damaged glacial barrier with absorption & heal', () => {
      const sapphire: CarvedGem = { type: 'water_sapphire', tier: 'legendary' };
      const res = evaluateGemOnDamagedTrigger(sapphire, 200000, 1000000, 0.05);

      expect(res.triggered).toBe(true);
      expect(res.absorbedDamage).toBeGreaterThan(50000);
      expect(res.healAmount).toBeGreaterThan(100000);
    });

    it('triggers Lightning Topaz on-hit damage amp', () => {
      const topaz: CarvedGem = { type: 'lightning_topaz', tier: 'mythic' };
      const res = evaluateGemOnHitTrigger(topaz, 500000, 0.10);

      expect(res.triggered).toBe(true);
      expect(res.damageAmpPercent).toBeCloseTo(44); // 20% * 2.2
    });

    it('triggers Dark Amethyst on-hit life leech', () => {
      const amethyst: CarvedGem = { type: 'dark_amethyst', tier: 'rare' };
      const res = evaluateGemOnHitTrigger(amethyst, 2000000, 0.05);

      expect(res.triggered).toBe(true);
      expect(res.lifeLeech).toBe(260000); // 2M * 0.10 * 1.3
    });
  });
});
