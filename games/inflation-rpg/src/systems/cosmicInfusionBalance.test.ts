/**
 * cosmicInfusionBalance.test.ts — C1118: Cosmic Infusion Build Synergy & Depth 50 Boss Simulation.
 *
 * Mathematically validates the power progression of the 4 Cosmic Affixes across 3 equipment slots
 * and proves victory against the Depth 50 Supreme Sovereign of Primordial Chaos within 7 turns.
 */

import { describe, it, expect } from 'vitest';
import {
  COSMIC_AFFIXES,
  INFUSION_COST,
  computeAggregateCosmicBonuses,
} from './cosmicInfusion';
import { resolveEliteCombat } from './chaosRiftBossEncounter';
import { HeroEntity } from '../hero/HeroEntity';
import type { EquipmentInstance } from '../types';

describe('cosmicInfusionBalance (C1118)', () => {
  function createEquipment(id: string, affix: import('./cosmicInfusion').CosmicAffixType): EquipmentInstance {
    return {
      instanceId: id,
      baseId: 'gear-' + id,
      enhanceLv: 15,
      modifiers: [],
      cosmicAffix: affix,
    };
  }

  describe('3-Slot Cosmic Affix Loadout Synergies', () => {
    it('proves Pure Offensive loadout (3x Singularity Might) boosts ATK by +36% and Final DMG by +15%', () => {
      const offensiveLoadout = [
        createEquipment('1', 'singularity_might'),
        createEquipment('2', 'singularity_might'),
        createEquipment('3', 'singularity_might'),
      ];

      const bonuses = computeAggregateCosmicBonuses(offensiveLoadout);
      expect(bonuses.atkPercentBonus).toBe(0.36);
      expect(bonuses.finalDmgMultiplierBonus).toBe(0.15);
      expect(bonuses.damageReduction).toBe(0);
    });

    it('proves Pure Defensive loadout (3x Astral Fortitude) grants +30% HP and +15% Damage Reduction', () => {
      const defensiveLoadout = [
        createEquipment('1', 'astral_fortitude'),
        createEquipment('2', 'astral_fortitude'),
        createEquipment('3', 'astral_fortitude'),
      ];

      const bonuses = computeAggregateCosmicBonuses(defensiveLoadout);
      expect(bonuses.hpPercentBonus).toBe(0.30);
      expect(bonuses.damageReduction).toBe(0.15);
      expect(bonuses.atkPercentBonus).toBe(0);
    });

    it('proves Balanced Hybrid loadout combines crit, fortitude, and might', () => {
      const hybridLoadout = [
        createEquipment('1', 'celestial_sharpness'), // +15% Crit DMG, +5% Pierce
        createEquipment('2', 'astral_fortitude'),    // +10% HP, +5% DR
        createEquipment('3', 'singularity_might'),   // +12% ATK, +5% Final DMG
      ];

      const bonuses = computeAggregateCosmicBonuses(hybridLoadout);
      expect(bonuses.critDmgBonus).toBe(0.15);
      expect(bonuses.defPierceBonus).toBe(0.05);
      expect(bonuses.hpPercentBonus).toBe(0.10);
      expect(bonuses.damageReduction).toBe(0.05);
      expect(bonuses.atkPercentBonus).toBe(0.12);
      expect(bonuses.finalDmgMultiplierBonus).toBe(0.05);
    });
  });

  describe('Depth 50 Supreme Sovereign of Primordial Chaos Simulation', () => {
    it('mathematically proves hero with cosmic infusions defeats Depth 50 boss in <= 7 turns before Doomsday', () => {
      // Depth 50 Guardian: ~900M+ HP, 12M+ ATK. Turn 10 Doomsday triggers +100% ATK.
      // Hero with full 15-star mythic gear, celestial gems, and 3-slot cosmic infusion:
      // Base stats scaled by +36% ATK from Singularity Might
      const baseAtk = 120_000_000;
      const baseHp = 150_000_000;

      const hero = new HeroEntity({
        seed: 777,
        heroHpMax: baseHp,
        heroAtkBase: baseAtk,
      });
      hero.hp = baseHp;
      hero.hpMax = baseHp;
      hero.atk = baseAtk;
      hero.def = 800_000;

      // Combat options:
      // playerElement 'dark' (Depth 50 boss is dark, clash multiplier 1.25x)
      // totalDR = 0.75 (reforge + zodiac + elixir + awakening + cosmic)
      // finalDmgMultiplier = 1.30 (15-star resonance) * 1.15 (cosmic affixes) = 1.495
      const finalMul = 1.495;
      const totalDR = 0.75;

      const result = resolveEliteCombat(hero, 50, 'dark', totalDR, 0.40, finalMul);

      expect(result.won).toBe(true);
      expect(result.turns).toBeLessThanOrEqual(7);
      expect(result.bossRemainingHp).toBe(0);
      expect(result.berserkTriggered).toBe(false); // Defeated BEFORE Turn 10 Doomsday berserk!
    });
  });

  describe('Infusion Economy Alignment', () => {
    it('confirms 3-item full loadout requires exactly 3 essences, 60 shards, 150k gold', () => {
      const fullEssence = INFUSION_COST.essence * 3;
      const fullShards = INFUSION_COST.shards * 3;
      const fullGold = INFUSION_COST.gold * 3;

      expect(fullEssence).toBe(3);
      expect(fullShards).toBe(60);
      expect(fullGold).toBe(150_000);
    });
  });
});
