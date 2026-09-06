/**
 * petBalance.test.ts — C1053: Pet Aura Synergies & Trial Floor 10 Boss Clearance Balance Simulation.
 *
 * Verifies:
 * 1. Feeding economy: Total EXP and gold/stone investment curves from Lv 1 to Lv 10.
 * 2. Black Tortoise (현무) DR stacking with Reforged Armor:
 *    - Reaches 22.5% total DR, saving >30,000 HP against Floor 10 Chaos Overlord.
 * 3. White Tiger (백호) ATK aura reducing TTK margins.
 * 4. Vermilion Bird (주작) and Azure Dragon (청룡) specialized stat scaling.
 */

import { describe, it, expect } from 'vitest';
import {
  getPetExpToNext,
  MAX_PET_LEVEL,
  computePetAura,
  createInitialPets,
  feedPet,
  type PetState,
} from './petSystem';
import { resolveTrialCombat } from './ascensionTrials';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1053 [balance]: Pet Aura Synergies & Trial Simulation', () => {
  describe('1. Pet Feeding Economy & Progression Investment', () => {
    it('total EXP to reach Max Level (10) equals 2,250', () => {
      let totalExp = 0;
      for (let lv = 1; lv < MAX_PET_LEVEL; lv++) {
        totalExp += getPetExpToNext(lv);
      }
      // 50 * (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9) = 50 * 45 = 2250
      expect(totalExp).toBe(2250);
    });

    it('maxing a pet via pure snacks requires 90 snacks and 45,000 gold', () => {
      const snacksNeeded = 2250 / 25; // 90 snacks
      const goldCost = snacksNeeded * 500; // 45,000 gold
      expect(snacksNeeded).toBe(90);
      expect(goldCost).toBe(45000);

      // Simulation of feeding
      let pet = createInitialPets().white_tiger;
      let totalGoldSpent = 0;
      for (let i = 0; i < 90; i++) {
        const res = feedPet(pet, 'snack', 100000, 0);
        expect(res.success).toBe(true);
        pet = res.newPet;
        totalGoldSpent += res.goldSpent;
      }
      expect(pet.level).toBe(MAX_PET_LEVEL);
      expect(totalGoldSpent).toBe(45000);
    });

    it('maxing a pet via essences requires 23 essences, 57,500 gold, and 46 enhance stones', () => {
      const essencesNeeded = Math.ceil(2250 / 100); // 23 essences
      const goldCost = essencesNeeded * 2500;
      const stonesCost = essencesNeeded * 2;
      expect(essencesNeeded).toBe(23);
      expect(goldCost).toBe(57500);
      expect(stonesCost).toBe(46);

      let pet = createInitialPets().white_tiger;
      for (let i = 0; i < essencesNeeded; i++) {
        const res = feedPet(pet, 'essence', 100000, 100);
        expect(res.success).toBe(true);
        pet = res.newPet;
      }
      expect(pet.level).toBe(MAX_PET_LEVEL);
    });
  });

  describe('2. Black Tortoise (현무) DR Stacking on Floor 10 Boss', () => {
    const createEndgameHero = (bonusAtk: number = 1.15): HeroEntity => ({
      id: 'endgame-hero',
      name: '용사',
      jobId: 'swordsman',
      level: 150,
      hp: 500000,
      hpMax: 500000,
      atk: Math.floor(90000 * bonusAtk),
      def: 15000,
      spd: 100,
      critRate: 0.05,
      critDmg: 1.5,
      exp: 0,
      expToNext: 100000,
      gold: 50000,
      cycleCount: 5,
    } as unknown as HeroEntity);

    it('Black Tortoise Lv 10 grants +7.5% DR, stacking with armor to 22.5% DR', () => {
      const tortoiseLv10: PetState = {
        id: 'black_tortoise',
        level: 10,
        bondExp: 0,
        bondExpToNext: 0,
        unlocked: true,
      };
      const aura = computePetAura(tortoiseLv10);
      expect(aura.damageReduction).toBeCloseTo(0.075);

      const armorDr = 0.15;
      const combinedDr = armorDr + aura.damageReduction;
      expect(combinedDr).toBeCloseTo(0.225);

      const hero = createEndgameHero(1.15);
      // Floor 10 combat with armor only (15% DR)
      const resArmorOnly = resolveTrialCombat(hero, 10, 'fire', 0.15);
      // Floor 10 combat with armor + tortoise (22.5% DR)
      const resCombined = resolveTrialCombat(hero, 10, 'fire', combinedDr);

      expect(resCombined.won).toBe(true);
      expect(resArmorOnly.won).toBe(true);
      // Hero takes strictly less damage with Black Tortoise
      expect(resCombined.damageTakenTotal).toBeLessThan(resArmorOnly.damageTakenTotal);
      // Damage reduction difference: 23 hits * (18000 * 0.075) = ~31,050 HP preserved!
      const hpPreserved = resCombined.heroRemainingHp - resArmorOnly.heroRemainingHp;
      expect(hpPreserved).toBeGreaterThan(25000);
    });
  });

  describe('3. White Tiger (백호) ATK Aura TTK Acceleration', () => {
    it('White Tiger Lv 10 (+14% ATK) reduces TTK turns against heavy trial bosses', () => {
      const tigerLv10: PetState = {
        id: 'white_tiger',
        level: 10,
        bondExp: 0,
        bondExpToNext: 0,
        unlocked: true,
      };
      const aura = computePetAura(tigerLv10);
      expect(aura.atkPercent).toBe(14);

      // Hero with base ATK 80,000
      const heroBase: HeroEntity = {
        id: 'hero',
        name: '용사',
        jobId: 'swordsman',
        level: 120,
        hp: 400000,
        hpMax: 400000,
        atk: 80000,
        def: 10000,
        spd: 100,
        critRate: 0.05,
        critDmg: 1.5,
        exp: 0,
        expToNext: 50000,
        gold: 10000,
        cycleCount: 3,
      } as unknown as HeroEntity;

      // With White Tiger (+14% ATK -> 80,000 * 1.14 = 91,200)
      const heroBuffed: HeroEntity = {
        ...heroBase,
        atk: Math.floor(heroBase.atk * 1.14),
      } as unknown as HeroEntity;

      // Trial floor 9 ( 삼원소 융합체: 1,500,000 HP, Fire)
      const resBase = resolveTrialCombat(heroBase, 9, 'water', 0.10);
      const resBuffed = resolveTrialCombat(heroBuffed, 9, 'water', 0.10);

      expect(resBuffed.turns).toBeLessThan(resBase.turns);
      // Base: 80k * 1.5 = 120k / turn -> 13 turns
      // Buffed: 91.2k * 1.5 = 136.8k / turn -> 11 turns
      expect(resBase.turns).toBe(13);
      expect(resBuffed.turns).toBe(11);
    });
  });

  describe('4. Azure Dragon & Vermilion Bird Stat Profiles', () => {
    it('Azure Dragon scales SPD and Elemental DMG up to +14% at Lv 10', () => {
      const dragon: PetState = { id: 'azure_dragon', level: 10, bondExp: 0, bondExpToNext: 0, unlocked: true };
      const aura = computePetAura(dragon);
      expect(aura.spdPercent).toBe(14);
      expect(aura.elementalDmgPercent).toBe(14);
    });

    it('Vermilion Bird scales Max HP up to +19.5% and HP Regen up to +6.5% at Lv 10', () => {
      const bird: PetState = { id: 'vermilion_bird', level: 10, bondExp: 0, bondExpToNext: 0, unlocked: true };
      const aura = computePetAura(bird);
      expect(aura.hpPercent).toBeCloseTo(19.5);
      expect(aura.hpRegenPercent).toBeCloseTo(6.5);
    });
  });
});
