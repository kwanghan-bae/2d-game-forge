/**
 * riftGemDropIntegration.test.ts — C1091: Chaos Rift Celestial Gem Drop Integration Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  elementToGemType,
  evaluateRiftGemDrop,
  mergeDroppedGemIntoInventory,
} from './riftGemDropIntegration';
import type { CarvedGem } from './celestialGemCarving';

describe('C1091 [system]: Rift Gem Drop Integration Engine', () => {
  describe('elementToGemType mapping', () => {
    it('correctly maps 4 elemental types to their respective gems', () => {
      expect(elementToGemType('fire')).toBe('fire_ruby');
      expect(elementToGemType('water')).toBe('water_sapphire');
      expect(elementToGemType('lightning')).toBe('lightning_topaz');
      expect(elementToGemType('dark')).toBe('dark_amethyst');
    });
  });

  describe('evaluateRiftGemDrop', () => {
    it('never drops gems below Depth 10', () => {
      const res1 = evaluateRiftGemDrop(1, 'fire', 0.01);
      const res9 = evaluateRiftGemDrop(9, 'water', 0.01);

      expect(res1.dropped).toBe(false);
      expect(res9.dropped).toBe(false);
    });

    it('drops Normal tier gem on Depth 10~19 on successful roll', () => {
      const resSuccess = evaluateRiftGemDrop(15, 'fire', 0.10);
      expect(resSuccess.dropped).toBe(true);
      expect(resSuccess.gem?.type).toBe('fire_ruby');
      expect(resSuccess.gem?.tier).toBe('normal');
      expect(resSuccess.bonusCrackStones).toBe(1);

      const resFail = evaluateRiftGemDrop(15, 'fire', 0.50);
      expect(resFail.dropped).toBe(false);
    });

    it('drops Rare tier gem on Depth 20~29 on successful roll', () => {
      const res = evaluateRiftGemDrop(25, 'water', 0.15);
      expect(res.dropped).toBe(true);
      expect(res.gem?.type).toBe('water_sapphire');
      expect(res.gem?.tier).toBe('rare');
      expect(res.bonusCrackStones).toBe(3);
    });

    it('drops Legendary tier gem on Depth 30~49 on successful roll', () => {
      const res = evaluateRiftGemDrop(35, 'lightning', 0.20);
      expect(res.dropped).toBe(true);
      expect(res.gem?.type).toBe('lightning_topaz');
      expect(res.gem?.tier).toBe('legendary');
      expect(res.bonusCrackStones).toBe(5);
    });

    it('guarantees 100% Mythic tier gem drop on Depth 50+', () => {
      const res = evaluateRiftGemDrop(50, 'dark', 0.99); // Even high roll
      expect(res.dropped).toBe(true);
      expect(res.gem?.type).toBe('dark_amethyst');
      expect(res.gem?.tier).toBe('mythic');
      expect(res.bonusCrackStones).toBe(10);
    });
  });

  describe('mergeDroppedGemIntoInventory', () => {
    it('adds new gem type if not already owned', () => {
      const initial: CarvedGem[] = [];
      const newGem: CarvedGem = { type: 'fire_ruby', tier: 'normal' };

      const res = mergeDroppedGemIntoInventory(initial, newGem);
      expect(res.upgraded).toBe(true);
      expect(res.updatedList).toHaveLength(1);
      expect(res.updatedList[0].tier).toBe('normal');
    });

    it('upgrades existing gem tier if dropped gem is higher rank', () => {
      const initial: CarvedGem[] = [{ type: 'water_sapphire', tier: 'normal' }];
      const droppedHigher: CarvedGem = { type: 'water_sapphire', tier: 'legendary' };

      const res = mergeDroppedGemIntoInventory(initial, droppedHigher);
      expect(res.upgraded).toBe(true);
      expect(res.updatedList[0].tier).toBe('legendary');
    });

    it('does not downgrade existing gem if dropped gem is lower rank', () => {
      const initial: CarvedGem[] = [{ type: 'lightning_topaz', tier: 'mythic' }];
      const droppedLower: CarvedGem = { type: 'lightning_topaz', tier: 'rare' };

      const res = mergeDroppedGemIntoInventory(initial, droppedLower);
      expect(res.upgraded).toBe(false);
      expect(res.updatedList[0].tier).toBe('mythic');
    });
  });
});
