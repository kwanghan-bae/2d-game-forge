/**
 * petForaging.test.ts — C1055: Overworld Companion Foraging & Salvage Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  getPetForageChance,
  rollPetForaging,
  applyForageReward,
  type ForageResult,
} from './petForaging';
import type { PetState } from './petSystem';

describe('C1055 [system]: Pet Foraging & Field Salvage Engine', () => {
  describe('1. Forage Chance Scaling', () => {
    it('scales linearly with bond level from 16.5% up to 30%', () => {
      expect(getPetForageChance(1)).toBeCloseTo(0.165);
      expect(getPetForageChance(5)).toBeCloseTo(0.225);
      expect(getPetForageChance(10)).toBeCloseTo(0.30);
    });
  });

  describe('2. Forage Loot Rolling & Beast Specialties', () => {
    it('returns null for null or locked pets', () => {
      expect(rollPetForaging(null, 50)).toBeNull();

      const lockedPet: PetState = {
        id: 'azure_dragon',
        level: 5,
        bondExp: 0,
        bondExpToNext: 250,
        unlocked: false,
      };
      expect(rollPetForaging(lockedPet, 50, () => 0.01)).toBeNull();
    });

    it('returns null when RNG roll exceeds foraging chance', () => {
      const pet: PetState = {
        id: 'white_tiger',
        level: 1, // chance = 16.5% (0.165)
        bondExp: 0,
        bondExpToNext: 50,
        unlocked: true,
      };
      // Roll 0.50 >= 0.165 -> no forage
      expect(rollPetForaging(pet, 50, () => 0.50)).toBeNull();
    });

    it('White Tiger digs up enhance stones when triggered', () => {
      const pet: PetState = {
        id: 'white_tiger',
        level: 10,
        bondExp: 0,
        bondExpToNext: 0,
        unlocked: true,
      };
      // Roll 0.05 < 0.30 -> trigger!
      const res = rollPetForaging(pet, 50, () => 0.05);
      expect(res).not.toBeNull();
      expect(res?.petId).toBe('white_tiger');
      expect(res?.stoneGain).toBeGreaterThanOrEqual(2);
      expect(res?.message).toContain('강화석');
    });

    it('Azure Dragon gathers extra gold windfalls scaled by monster level', () => {
      const pet: PetState = {
        id: 'azure_dragon',
        level: 5,
        bondExp: 0,
        bondExpToNext: 250,
        unlocked: true,
      };
      const res = rollPetForaging(pet, 100, () => 0.05);
      expect(res).not.toBeNull();
      expect(res?.petId).toBe('azure_dragon');
      expect(res?.goldGain).toBeGreaterThan(0);
      expect(res?.message).toContain('보물상자');
    });

    it('Vermilion Bird gathers sacred fire herbs to restore HP', () => {
      const pet: PetState = {
        id: 'vermilion_bird',
        level: 5,
        bondExp: 0,
        bondExpToNext: 250,
        unlocked: true,
      };
      const res = rollPetForaging(pet, 50, () => 0.05);
      expect(res).not.toBeNull();
      expect(res?.petId).toBe('vermilion_bird');
      expect(res?.healPercent).toBeCloseTo(0.075); // 0.05 + 5 * 0.005
      expect(res?.message).toContain('치유');
    });

    it('Black Tortoise gathers both ore stones and gold', () => {
      const pet: PetState = {
        id: 'black_tortoise',
        level: 5,
        bondExp: 0,
        bondExpToNext: 250,
        unlocked: true,
      };
      const res = rollPetForaging(pet, 40, () => 0.05);
      expect(res).not.toBeNull();
      expect(res?.stoneGain).toBe(1);
      expect(res?.goldGain).toBeGreaterThan(0);
    });
  });

  describe('3. Applying Forage Rewards', () => {
    it('applies stone and gold additions cleanly', () => {
      const forage: ForageResult = {
        petId: 'white_tiger',
        petNameKR: '백호',
        goldGain: 500,
        stoneGain: 2,
        healPercent: 0,
        message: 'test',
      };
      const applied = applyForageReward(forage, 1000, 5);
      expect(applied.newGold).toBe(1500);
      expect(applied.newStones).toBe(7);
    });
  });
});
