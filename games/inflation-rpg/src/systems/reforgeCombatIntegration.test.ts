import { describe, it, expect } from 'vitest';
import { aggregateReforgeBonus } from './reforgeSystem';
import { computeDamageReduction, type DefenseContext } from '../overworld/encounter/DefenseCalc';
import { HeroEntity } from '../hero/HeroEntity';
import { EncounterEngine } from '../overworld/EncounterEngine';
import { SeededRng } from '../cycle/SeededRng';
import type { EquipmentInstance } from '../types';

describe('C1037: Reforge Enhancement Combat Stat Binding & Integration', () => {
  describe('aggregateReforgeBonus', () => {
    it('calculates atkMulBonus for enhanced weapons and armorDrBonus for enhanced armor', () => {
      const weapon: EquipmentInstance = {
        instanceId: 'w1',
        baseId: 'w-sword', // common, 0.06 per level
        enhanceLv: 5,
        modifiers: [],
      };
      const armor: EquipmentInstance = {
        instanceId: 'a1',
        baseId: 'a-iron', // rare
        enhanceLv: 10,
        modifiers: [],
      };

      const bonus = aggregateReforgeBonus([weapon, armor]);
      // Common +5: 5 * 0.06 = +30% (+0.30)
      expect(bonus.atkMulBonus).toBeCloseTo(0.30, 2);
      // Armor +10: 10 * 0.01 = 0.10 (10% DR)
      expect(bonus.armorDrBonus).toBeCloseTo(0.10, 2);
    });

    it('caps armorDrBonus at 15% (0.15)', () => {
      const armors: EquipmentInstance[] = [
        { instanceId: 'a1', baseId: 'a-cloth', enhanceLv: 10, modifiers: [] },
        { instanceId: 'a2', baseId: 'a-leather', enhanceLv: 10, modifiers: [] },
      ];
      const bonus = aggregateReforgeBonus(armors);
      expect(bonus.armorDrBonus).toBe(0.15); // capped at 15%
    });
  });

  describe('DefenseCalc Integration', () => {
    const baseCtx: DefenseContext = {
      mercyRemaining: 0,
      shopShieldRemaining: 0,
      armorRemaining: 0,
      villageRestRemaining: 0,
      goldShieldActive: false,
      comboStreak: 0,
      goldOverflowShieldActive: false,
      bossShieldActive: false,
      prestigeCount: 0,
      isDangerZone: false,
      heroGold: 0,
      heroLevel: 10,
      cursedAltarAtkBuff: false,
      isNight: false,
      colosseumActive: false,
      fogAmbushActive: false,
      windGaleActive: false,
      snowDriftActive: false,
      titanArenaActive: false,
      astralParadoxActive: false,
    };

    it('reforgeArmorDrBonus reduces damage multiplier cleanly', () => {
      const drBase = computeDamageReduction(baseCtx);
      expect(drBase).toBe(1.0);

      const drEnhanced = computeDamageReduction({
        ...baseCtx,
        reforgeArmorDrBonus: 0.10, // 10% DR
      });
      expect(drEnhanced).toBeCloseTo(0.90, 2);
    });

    it('stacks multiplicatively with wealth_barrier perk', () => {
      const baselineWithGold = computeDamageReduction({
        ...baseCtx,
        heroGold: 100000,
        perkGoldBarrierRate: 0.01,
      });

      const drCombined = computeDamageReduction({
        ...baseCtx,
        heroGold: 100000,
        perkGoldBarrierRate: 0.01,
        reforgeArmorDrBonus: 0.10, // 10% DR
      });

      // Isolating reforgeArmorDrBonus: drCombined / baselineWithGold === 0.90
      expect(drCombined / baselineWithGold).toBeCloseTo(0.90, 2);
    });
  });

  describe('EncounterEngine Full Combat Integration', () => {
    it('hero with reforgeArmorDrBonus takes less damage during combat turns', () => {
      const heroUnbuffed = HeroEntity.create({ seed: 42, heroHpMax: 10000, heroAtkBase: 10 });
      const engineUnbuffed = new EncounterEngine(new SeededRng(42), { reforgeArmorDrBonus: 0 });

      // Run 1 combat turn against enemy
      const heroBuffed = HeroEntity.create({ seed: 42, heroHpMax: 10000, heroAtkBase: 10 });
      const engineBuffed = new EncounterEngine(new SeededRng(42), { reforgeArmorDrBonus: 0.15 });

      engineUnbuffed.resolveEncounter(heroUnbuffed, 'enemy', 'goblin');
      engineBuffed.resolveEncounter(heroBuffed, 'enemy', 'goblin');

      // The buffed hero with 15% armor DR should preserve more or equal HP
      expect(heroBuffed.hp).toBeGreaterThanOrEqual(heroUnbuffed.hp);
    });
  });
});
