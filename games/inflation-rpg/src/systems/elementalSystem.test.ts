import { describe, it, expect } from 'vitest';
import {
  computeElementalMultiplier,
  getAffinityRelation,
  getEquipmentElement,
  getEnemyElement,
  ELEMENT_METAS,
  WEAKNESS_MULTIPLIER,
  RESISTANCE_MULTIPLIER,
  DARK_CLASH_MULTIPLIER,
  NEUTRAL_MULTIPLIER,
} from './elementalSystem';

describe('C1039: elementalSystem (Elemental Affinities Matrix)', () => {
  describe('Elemental Advantage Cycle (3원소 환상)', () => {
    it('Fire deals 1.5x damage to Lightning and 0.7x to Water', () => {
      expect(computeElementalMultiplier('fire', 'lightning')).toBe(WEAKNESS_MULTIPLIER);
      expect(getAffinityRelation('fire', 'lightning')).toBe('weakness');

      expect(computeElementalMultiplier('fire', 'water')).toBe(RESISTANCE_MULTIPLIER);
      expect(getAffinityRelation('fire', 'water')).toBe('resistance');
    });

    it('Lightning deals 1.5x damage to Water and 0.7x to Fire', () => {
      expect(computeElementalMultiplier('lightning', 'water')).toBe(WEAKNESS_MULTIPLIER);
      expect(getAffinityRelation('lightning', 'water')).toBe('weakness');

      expect(computeElementalMultiplier('lightning', 'fire')).toBe(RESISTANCE_MULTIPLIER);
      expect(getAffinityRelation('lightning', 'fire')).toBe('resistance');
    });

    it('Water deals 1.5x damage to Fire and 0.7x to Lightning', () => {
      expect(computeElementalMultiplier('water', 'fire')).toBe(WEAKNESS_MULTIPLIER);
      expect(getAffinityRelation('water', 'fire')).toBe('weakness');

      expect(computeElementalMultiplier('water', 'lightning')).toBe(RESISTANCE_MULTIPLIER);
      expect(getAffinityRelation('water', 'lightning')).toBe('resistance');
    });
  });

  describe('Dark & Neutral Element Rules', () => {
    it('Dark element has mutual 1.25x clash with 3 basic elements', () => {
      expect(computeElementalMultiplier('dark', 'fire')).toBe(DARK_CLASH_MULTIPLIER);
      expect(computeElementalMultiplier('fire', 'dark')).toBe(DARK_CLASH_MULTIPLIER);
      expect(getAffinityRelation('dark', 'water')).toBe('dark_clash');
      expect(getAffinityRelation('lightning', 'dark')).toBe('dark_clash');
    });

    it('Same elements and neutral deal 1.0x neutral damage', () => {
      expect(computeElementalMultiplier('fire', 'fire')).toBe(NEUTRAL_MULTIPLIER);
      expect(computeElementalMultiplier('dark', 'dark')).toBe(NEUTRAL_MULTIPLIER);
      expect(computeElementalMultiplier('neutral', 'fire')).toBe(NEUTRAL_MULTIPLIER);
      expect(computeElementalMultiplier('lightning', 'neutral')).toBe(NEUTRAL_MULTIPLIER);
      expect(getAffinityRelation('neutral', 'neutral')).toBe('neutral');
    });
  });

  describe('Equipment & Monster Element Resolution', () => {
    it('correctly maps known weapons to their respective elements', () => {
      expect(getEquipmentElement('w-bluedragon')).toBe('fire');
      expect(getEquipmentElement('w-fairy')).toBe('water');
      expect(getEquipmentElement('w-yongcheon')).toBe('lightning');
      expect(getEquipmentElement('w-soulreaper')).toBe('dark');
      expect(getEquipmentElement('w-knife')).toBe('neutral'); // untagged defaults to neutral
    });

    it('correctly maps known bosses and monsters to their elements', () => {
      expect(getEnemyElement('fire_titan')).toBe('fire');
      expect(getEnemyElement('sea_serpent')).toBe('water');
      expect(getEnemyElement('dragon_lord')).toBe('lightning');
      expect(getEnemyElement('dark_lord')).toBe('dark');
      expect(getEnemyElement('goblin')).toBe('neutral');
    });

    it('contains valid display metadata for all elements', () => {
      for (const [key, meta] of Object.entries(ELEMENT_METAS)) {
        expect(meta.type).toBe(key);
        expect(meta.nameKR.length).toBeGreaterThan(0);
        expect(meta.emoji.length).toBeGreaterThan(0);
        expect(meta.color.startsWith('#')).toBe(true);
      }
    });
  });
});
