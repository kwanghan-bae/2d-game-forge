/**
 * ascensionTitles.test.ts — C1049: Ascension Titles & Rune Enchanting Narrative Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  ASCENSION_TITLES,
  getUnlockedTitles,
  getAscensionTitle,
  BLACKSMITH_RUNE_DIALOGUES,
  HERO_RUNE_REACTIONS,
  getRuneEnchantBlacksmithQuote,
  getRuneEnchantHeroReaction,
} from '../ascensionTitles';
import type { RuneType } from '../../systems/enchantSystem';

describe('C1049 [narrative]: Ascension Titles & Rune Enchanting Flavor', () => {
  describe('1. Ascension Titles Definitions & Progression', () => {
    it('defines 4 milestone titles matching trial progression', () => {
      expect(ASCENSION_TITLES).toHaveLength(4);
      const floors = ASCENSION_TITLES.map(t => t.floorRequired);
      expect(floors).toEqual([3, 5, 7, 10]);

      for (const title of ASCENSION_TITLES) {
        expect(title.nameKR).toBeTruthy();
        expect(title.badge).toBeTruthy();
        expect(title.description).toBeTruthy();
        expect(title.flavor).toBeTruthy();
        expect(title.bonuses).toBeDefined();
      }
    });

    it('getUnlockedTitles filters titles accurately by cleared floor', () => {
      expect(getUnlockedTitles(0)).toHaveLength(0);
      expect(getUnlockedTitles(2)).toHaveLength(0);

      const f3Titles = getUnlockedTitles(3);
      expect(f3Titles).toHaveLength(1);
      expect(f3Titles[0].id).toBe('trial_challenger');

      const f5Titles = getUnlockedTitles(5);
      expect(f5Titles).toHaveLength(2);
      expect(f5Titles.map(t => t.id)).toContain('seeker_of_elements');

      const f7Titles = getUnlockedTitles(7);
      expect(f7Titles).toHaveLength(3);
      expect(f7Titles.map(t => t.id)).toContain('conqueror_of_wrath');

      const f10Titles = getUnlockedTitles(10);
      expect(f10Titles).toHaveLength(4);
      expect(f10Titles.map(t => t.id)).toContain('slayer_of_chaos');
    });

    it('getAscensionTitle returns correct title or null', () => {
      const chaos = getAscensionTitle('slayer_of_chaos');
      expect(chaos).not.toBeNull();
      expect(chaos?.nameKR).toBe('종언을 꺾은 패왕');
      expect(chaos?.bonuses.allElementalDmgPercent).toBe(10);

      expect(getAscensionTitle('non_existent' as any)).toBeNull();
    });
  });

  describe('2. Blacksmith Rune Infusion Dialogue', () => {
    const RUNES: RuneType[] = ['rune_fire', 'rune_water', 'rune_lightning', 'rune_dark'];

    it('has dialogue pools for all 4 runes', () => {
      for (const r of RUNES) {
        const pool = BLACKSMITH_RUNE_DIALOGUES[r];
        expect(pool).toBeDefined();
        expect(pool.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('getRuneEnchantBlacksmithQuote returns a valid quote for every rune', () => {
      for (const r of RUNES) {
        const quote = getRuneEnchantBlacksmithQuote(r);
        expect(typeof quote).toBe('string');
        expect(quote.length).toBeGreaterThan(5);
      }
    });
  });

  describe('3. Hero Rune Reaction Flavor', () => {
    it('returns archetype-specific reaction when class matches', () => {
      const warriorFire = getRuneEnchantHeroReaction('rune_fire', 'warrior');
      expect(warriorFire).toContain('열기');

      const rogueWater = getRuneEnchantHeroReaction('rune_water', 'rogue');
      expect(rogueWater).toContain('서릿발');
    });

    it('falls back to default reaction when class does not have dedicated line', () => {
      const unknownReaction = getRuneEnchantHeroReaction('rune_dark', 'unknown_class');
      expect(unknownReaction).toBe(HERO_RUNE_REACTIONS.rune_dark.default);
    });
  });
});
