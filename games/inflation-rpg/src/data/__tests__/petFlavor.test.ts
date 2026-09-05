/**
 * petFlavor.test.ts — C1054: Pet Lore & Companion Dialogue Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  PET_MYTHOLOGY_LORE,
  PET_COMBAT_BARKS,
  getPetLore,
  getPetBark,
} from '../petFlavor';
import { ALL_PET_IDS } from '../../systems/petSystem';

describe('C1054 [narrative]: Pet Mythology Lore & Dialogue Flavor', () => {
  describe('1. Eastern Mythology Lore Definitions', () => {
    it('defines rich mythology lore for all 4 divine beasts', () => {
      for (const id of ALL_PET_IDS) {
        const lore = getPetLore(id);
        expect(lore).toBeDefined();
        expect(lore.title).toBeTruthy();
        expect(lore.origin).toBeTruthy();
        expect(lore.temperament).toBeTruthy();
        expect(lore.sacredDomain).toBeTruthy();
      }
    });

    it('matches corresponding elements and cultural roles in lore', () => {
      expect(getPetLore('white_tiger').title).toContain('백호');
      expect(getPetLore('azure_dragon').title).toContain('청룡');
      expect(getPetLore('vermilion_bird').title).toContain('주작');
      expect(getPetLore('black_tortoise').title).toContain('현무');
    });
  });

  describe('2. Context-Sensitive Dialogue Barks', () => {
    it('has dialogue pools for all beasts across all 3 triggers', () => {
      for (const id of ALL_PET_IDS) {
        const set = PET_COMBAT_BARKS[id];
        expect(set.victory.length).toBeGreaterThanOrEqual(2);
        expect(set.lowHp.length).toBeGreaterThanOrEqual(2);
        expect(set.levelUp.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('getPetBark returns valid non-empty string across all triggers', () => {
      const triggers = ['victory', 'lowHp', 'levelUp'] as const;
      for (const id of ALL_PET_IDS) {
        for (const trigger of triggers) {
          const bark = getPetBark(id, trigger);
          expect(typeof bark).toBe('string');
          expect(bark.length).toBeGreaterThan(10);
        }
      }
    });
  });
});
