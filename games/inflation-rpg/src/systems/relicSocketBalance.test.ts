/**
 * relicSocketBalance.test.ts — C1070: Celestial Relic Socket Loadout Economy & Sub-11 Turn Floor 10 Victory Simulation.
 *
 * Verifies:
 * 1. Socket Loadout Economy: Full 3-gear socketing requires 90 Starlight Shards + 75,000 Gold.
 * 2. Loadout Archetypes: Computes balanced vs aggressive vs elemental relic configurations.
 * 3. Pinnacle TTK Simulation: Zodiac + Alchemy + 3 Relics slashes Floor 10 Boss TTK to 11 turns, preserving >80% HP.
 */

import { describe, it, expect } from 'vitest';
import {
  SOCKET_COST_SHARDS,
  SOCKET_COST_GOLD,
  UNSOCKET_COST_SHARDS,
  computeEquippedRelicBonuses,
  getRelicBonusesForSlot,
  type RelicSlotType,
} from './celestialRelics';
import { ALL_ZODIAC_SIGNS, computeZodiacResonance } from './zodiacSystem';
import { computeElixirStatBonuses } from './astralAlchemy';
import { resolveTrialCombat } from './ascensionTrials';
import type { EquipmentInstance } from '../types';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1070 [balance]: Celestial Relic Socket Economy & Combat Simulation', () => {
  describe('1. Relic Socket Economy', () => {
    it('full 3-slot loadout (weapon, armor, accessory) costs 90 shards and 75,000G', () => {
      const slotCount = 3;
      const totalShards = SOCKET_COST_SHARDS * slotCount;
      const totalGold = SOCKET_COST_GOLD * slotCount;

      expect(totalShards).toBe(90);
      expect(totalGold).toBe(75000);
      expect(UNSOCKET_COST_SHARDS).toBe(10);
    });
  });

  describe('2. Loadout Archetypes & Stat Aggregations', () => {
    it('Aggressive Ferocity build (3x Sirius Fang) grants massive offensive burst', () => {
      const weapon: EquipmentInstance = {
        instanceId: 'w1', baseId: 'w-sword', enhanceLv: 10, modifiers: [],
        celestialRelic: 'sirius_fang',
      };
      const armor: EquipmentInstance = {
        instanceId: 'a1', baseId: 'a-plate', enhanceLv: 10, modifiers: [],
        celestialRelic: 'sirius_fang',
      };
      const accessory: EquipmentInstance = {
        instanceId: 'acc1', baseId: 'acc-ring', enhanceLv: 10, modifiers: [],
        celestialRelic: 'sirius_fang',
      };

      const total = computeEquippedRelicBonuses([
        { instance: weapon, slotType: 'weapon' },
        { instance: armor, slotType: 'armor' },
        { instance: accessory, slotType: 'accessory' },
      ]);

      expect(total.atkPercent).toBe(10);
      expect(total.critDmg).toBe(0.20);
      expect(total.hpPercent).toBe(10);
      expect(total.damageReduction).toBe(0.01);
      expect(total.spdFlat).toBe(6);
      expect(total.critRate).toBe(0.04);
    });

    it('Elemental Archon build (Antares Heart + Vega Veil) grants explosive elemental synergy', () => {
      const weapon: EquipmentInstance = {
        instanceId: 'w1', baseId: 'w-staff', enhanceLv: 10, modifiers: [],
        celestialRelic: 'antares_heart', // Elemental DMG +15%, ATK +6%
      };
      const armor: EquipmentInstance = {
        instanceId: 'a1', baseId: 'a-robe', enhanceLv: 10, modifiers: [],
        celestialRelic: 'antares_heart', // DR +3%, DEF +10%
      };
      const accessory: EquipmentInstance = {
        instanceId: 'acc1', baseId: 'acc-pendant', enhanceLv: 10, modifiers: [],
        celestialRelic: 'vega_veil', // Elemental DMG +10%, HP +8%
      };

      const total = computeEquippedRelicBonuses([
        { instance: weapon, slotType: 'weapon' },
        { instance: armor, slotType: 'armor' },
        { instance: accessory, slotType: 'accessory' },
      ]);

      expect(total.elementalDmgPercent).toBe(25);
      expect(total.atkPercent).toBe(6);
      expect(total.damageReduction).toBe(0.03);
      expect(total.defPercent).toBe(10);
      expect(total.hpPercent).toBe(8);
    });
  });

  describe('3. Trial Floor 10 Combat Simulation with Zodiac + Alchemy + Relic Sockets', () => {
    // Endgame hero baseline (Level 150)
    const createEndgameHero = (
      bonusAtkMul: number = 1.0,
      bonusHpMul: number = 1.0,
    ): HeroEntity => ({
      id: 'endgame-hero',
      name: '용사',
      jobId: 'swordsman',
      level: 150,
      hp: Math.floor(500000 * bonusHpMul),
      hpMax: Math.floor(500000 * bonusHpMul),
      atk: Math.floor(90000 * bonusAtkMul),
      def: 15000,
      spd: 100,
      critRate: 0.05,
      critDmg: 1.5,
      exp: 0,
      expToNext: 100000,
      gold: 50000,
      cycleCount: 5,
    } as unknown as HeroEntity);

    it('benchmarks progression from baseline (24t) -> Zodiac (20t) -> Alchemy (14t) -> Relics (11t)', () => {
      // 1. Baseline
      const h0 = createEndgameHero(1.15, 1.0);
      const res0 = resolveTrialCombat(h0, 10, 'fire', 0.15);
      expect(res0.turns).toBe(24);

      // 2. Zodiac (12/12)
      const zodiac = computeZodiacResonance([...ALL_ZODIAC_SIGNS]);
      const h1 = createEndgameHero(1.15 * 1.11 * 1.08, 1.18);
      const res1 = resolveTrialCombat(h1, 10, 'fire', 0.15 + zodiac.damageReduction);
      expect(res1.turns).toBe(20);

      // 3. Zodiac + Alchemy
      const alchemy = computeElixirStatBonuses({
        solar_pill: 10, lunar_elixir: 10, lightning_crystal: 10, abyssal_essence: 10,
      });
      const alcAtkMul = 1.15 * 1.11 * 1.08 * 1.20 * 1.20;
      const alcHpMul = 1.18 * 1.20;
      const alcDR = 0.15 + zodiac.damageReduction + alchemy.damageReduction;
      const h2 = createEndgameHero(alcAtkMul, alcHpMul);
      const res2 = resolveTrialCombat(h2, 10, 'fire', alcDR);
      expect(res2.turns).toBe(14);

      // 4. Pinnacle: Zodiac + Alchemy + 3 Relic Sockets (Antares Weapon + Antares Armor + Vega Accessory)
      // Additional: ATK +6%, Elemental DMG +25%, HP +8%, DR +3%
      const relicAtkMul = alcAtkMul * (1 + 0.06) * (1 + 0.25);
      const relicHpMul = alcHpMul * (1 + 0.08); // 1.18 * 1.20 * 1.08 = 1.529x -> 764,640 HP
      const relicDR = alcDR + 0.03; // 15% + 3% + 5% + 3% = 26% DR

      const h3 = createEndgameHero(relicAtkMul, relicHpMul);
      const res3 = resolveTrialCombat(h3, 10, 'fire', relicDR);

      expect(res3.won).toBe(true);
      expect(res3.turns).toBe(11); // Slashed to 11 turns!
      expect(res3.turns).toBeLessThan(14);

      // Damage taken: 10 hits * (18000 * 0.74) = 133,200
      expect(res3.damageTakenTotal).toBe(10 * Math.floor(18000 * (1 - relicDR)));
      // HP remaining: 764,640 - 133,200 = 631,440 HP
      expect(res3.heroRemainingHp).toBeGreaterThan(600000);
      expect(res3.heroRemainingHp / h3.hpMax).toBeGreaterThan(0.80); // Over 80% HP preserved!
    });
  });
});
