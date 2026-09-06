/**
 * zodiacFlavor.test.ts — C1060: 12 Zodiac Constellations Lore & Awakening Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  ZODIAC_FOLKLORE_LORE,
  getZodiacLore,
  getZodiacAwakeningQuote,
} from '../zodiacFlavor';
import { ALL_ZODIAC_SIGNS } from '../../systems/zodiacSystem';

describe('C1060 [narrative]: 12 Zodiac Constellations Lore & Flavor', () => {
  describe('1. Cheonsang Yeolcha Bunya Jido & Folklore Lore', () => {
    it('defines complete folklore metadata for all 12 celestial constellations', () => {
      expect(ALL_ZODIAC_SIGNS).toHaveLength(12);
      for (const sign of ALL_ZODIAC_SIGNS) {
        const lore = getZodiacLore(sign);
        expect(lore).toBeDefined();
        expect(lore.celestialDomain).toBeTruthy();
        expect(lore.mythicalOrigin).toBeTruthy();
        expect(lore.awakeningQuote).toBeTruthy();
      }
    });

    it('contains evocative Korean traditional celestial terminology', () => {
      expect(getZodiacLore('rat').celestialDomain).toContain('감(坎)');
      expect(getZodiacLore('tiger').mythicalOrigin).toContain('산군');
      expect(getZodiacLore('dragon').awakeningQuote).toContain('천둥');
      expect(getZodiacLore('dog').awakeningQuote).toContain('충심');
    });
  });

  describe('2. Awakening Quotes', () => {
    it('getZodiacAwakeningQuote returns valid quotes for all signs', () => {
      for (const sign of ALL_ZODIAC_SIGNS) {
        const quote = getZodiacAwakeningQuote(sign);
        expect(typeof quote).toBe('string');
        expect(quote.length).toBeGreaterThan(15);
      }
    });
  });
});
