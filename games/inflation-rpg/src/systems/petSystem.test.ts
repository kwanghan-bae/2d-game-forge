/**
 * petSystem.test.ts — C1051: Divine Beasts & Familiar Companions Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  PET_DEFINITIONS,
  ALL_PET_IDS,
  MAX_PET_LEVEL,
  createInitialPets,
  canFeedPet,
  feedPet,
  computePetAura,
  checkPetUnlocks,
  FOOD_DEFINITIONS,
  type PetState,
} from './petSystem';

describe('C1051 [system]: Pet / Divine Beasts System', () => {
  describe('1. Definitions & Initial States', () => {
    it('defines 4 eastern divine beasts with unique roles and affinities', () => {
      expect(ALL_PET_IDS).toHaveLength(4);
      expect(PET_DEFINITIONS.white_tiger.roleKR).toContain('물리');
      expect(PET_DEFINITIONS.azure_dragon.element).toBe('lightning');
      expect(PET_DEFINITIONS.vermilion_bird.element).toBe('fire');
      expect(PET_DEFINITIONS.black_tortoise.element).toBe('water');
    });

    it('createInitialPets unlocks white tiger initially, keeping others sealed', () => {
      const pets = createInitialPets();
      expect(pets.white_tiger.unlocked).toBe(true);
      expect(pets.azure_dragon.unlocked).toBe(false);
      expect(pets.vermilion_bird.unlocked).toBe(false);
      expect(pets.black_tortoise.unlocked).toBe(false);

      for (const id of ALL_PET_IDS) {
        expect(pets[id].level).toBe(1);
        expect(pets[id].bondExp).toBe(0);
        expect(pets[id].bondExpToNext).toBe(50);
      }
    });
  });

  describe('2. Feeding & Growth Engine', () => {
    it('canFeedPet checks resource requirements accurately', () => {
      expect(canFeedPet('snack', 500, 0)).toBe(true);
      expect(canFeedPet('snack', 499, 0)).toBe(false);

      expect(canFeedPet('essence', 2500, 2)).toBe(true);
      expect(canFeedPet('essence', 2499, 2)).toBe(false);
      expect(canFeedPet('essence', 2500, 1)).toBe(false);
    });

    it('feedPet fails if pet is locked', () => {
      const pets = createInitialPets();
      const res = feedPet(pets.black_tortoise, 'snack', 10000, 10);
      expect(res.success).toBe(false);
      expect(res.message).toContain('해금되지 않은');
    });

    it('feedPet adds bondExp and levels up when reaching threshold', () => {
      const pets = createInitialPets();
      // Snack gives 25 EXP. Lv 1 requires 50 EXP.
      const res1 = feedPet(pets.white_tiger, 'snack', 1000, 0);
      expect(res1.success).toBe(true);
      expect(res1.leveledUp).toBe(false);
      expect(res1.newPet.level).toBe(1);
      expect(res1.newPet.bondExp).toBe(25);

      // Second snack reaches 50 EXP -> level up to 2!
      const res2 = feedPet(res1.newPet, 'snack', 1000, 0);
      expect(res2.success).toBe(true);
      expect(res2.leveledUp).toBe(true);
      expect(res2.newPet.level).toBe(2);
      expect(res2.newPet.bondExp).toBe(0);
      expect(res2.newPet.bondExpToNext).toBe(100); // 2 * 50
    });

    it('feedPet handles multi-level jumps and caps at MAX_PET_LEVEL (10)', () => {
      let pet: PetState = {
        id: 'white_tiger',
        level: 9,
        bondExp: 400,
        bondExpToNext: 450, // needs 50 to reach lv 10
        unlocked: true,
      };

      // Feed essence (100 exp) -> levels to 10
      const res = feedPet(pet, 'essence', 5000, 5);
      expect(res.success).toBe(true);
      expect(res.newPet.level).toBe(MAX_PET_LEVEL);
      expect(res.newPet.bondExpToNext).toBe(0);

      // Feeding again at max level fails cleanly
      const resMax = feedPet(res.newPet, 'snack', 5000, 5);
      expect(resMax.success).toBe(false);
      expect(resMax.message).toContain('최고 친밀도');
    });
  });

  describe('3. Pet Combat Aura Calculations', () => {
    it('returns empty aura for null or locked pets', () => {
      const nullAura = computePetAura(null);
      expect(nullAura.atkPercent).toBe(0);

      const lockedPet: PetState = {
        id: 'azure_dragon',
        level: 5,
        bondExp: 0,
        bondExpToNext: 250,
        unlocked: false,
      };
      const lockedAura = computePetAura(lockedPet);
      expect(lockedAura.spdPercent).toBe(0);
    });

    it('computes accurate scaling auras for White Tiger (ATK & Crit)', () => {
      const lv1: PetState = { id: 'white_tiger', level: 1, bondExp: 0, bondExpToNext: 50, unlocked: true };
      const aura1 = computePetAura(lv1);
      expect(aura1.atkPercent).toBe(5);
      expect(aura1.critDmgPercent).toBe(5);

      const lv10: PetState = { id: 'white_tiger', level: 10, bondExp: 0, bondExpToNext: 0, unlocked: true };
      const aura10 = computePetAura(lv10);
      expect(aura10.atkPercent).toBe(14); // 5 + 9 * 1
      expect(aura10.critDmgPercent).toBe(14);
    });

    it('computes accurate scaling auras for Black Tortoise (DEF & DR)', () => {
      const lv1: PetState = { id: 'black_tortoise', level: 1, bondExp: 0, bondExpToNext: 50, unlocked: true };
      const aura1 = computePetAura(lv1);
      expect(aura1.defPercent).toBe(6);
      expect(aura1.damageReduction).toBeCloseTo(0.03);

      const lv10: PetState = { id: 'black_tortoise', level: 10, bondExp: 0, bondExpToNext: 0, unlocked: true };
      const aura10 = computePetAura(lv10);
      expect(aura10.defPercent).toBeCloseTo(19.5); // 6 + 9 * 1.5
      expect(aura10.damageReduction).toBeCloseTo(0.075); // 0.03 + 9 * 0.005
    });

    it('computes accurate scaling auras for Azure Dragon and Vermilion Bird', () => {
      const dragon: PetState = { id: 'azure_dragon', level: 5, bondExp: 0, bondExpToNext: 250, unlocked: true };
      const auraDragon = computePetAura(dragon);
      expect(auraDragon.spdPercent).toBe(9); // 5 + 4
      expect(auraDragon.elementalDmgPercent).toBe(9);

      const bird: PetState = { id: 'vermilion_bird', level: 5, bondExp: 0, bondExpToNext: 250, unlocked: true };
      const auraBird = computePetAura(bird);
      expect(auraBird.hpPercent).toBeCloseTo(12); // 6 + 4 * 1.5
      expect(auraBird.hpRegenPercent).toBeCloseTo(4); // 2 + 4 * 0.5
    });
  });

  describe('4. Ascension Trial Unlocks', () => {
    it('checkPetUnlocks unlocks beasts sequentially as trial floors are conquered', () => {
      const initial = createInitialPets();

      // Clear Floor 1 unlocks Vermilion Bird
      const f1 = checkPetUnlocks(initial, 1);
      expect(f1.newlyUnlocked).toContain('vermilion_bird');
      expect(f1.updatedPets.vermilion_bird.unlocked).toBe(true);
      expect(f1.updatedPets.azure_dragon.unlocked).toBe(false);

      // Clear Floor 3 unlocks Azure Dragon
      const f3 = checkPetUnlocks(f1.updatedPets, 3);
      expect(f3.newlyUnlocked).toContain('azure_dragon');
      expect(f3.updatedPets.azure_dragon.unlocked).toBe(true);
      expect(f3.updatedPets.black_tortoise.unlocked).toBe(false);

      // Clear Floor 5 unlocks Black Tortoise
      const f5 = checkPetUnlocks(f3.updatedPets, 5);
      expect(f5.newlyUnlocked).toContain('black_tortoise');
      expect(f5.updatedPets.black_tortoise.unlocked).toBe(true);
    });
  });
});
