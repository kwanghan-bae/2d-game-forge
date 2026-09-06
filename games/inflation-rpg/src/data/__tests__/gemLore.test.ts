/**
 * gemLore.test.ts — C1090: Celestial Gem Origin Myths & Artisan Mantras Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  CELESTIAL_GEM_MYTHS,
  ARTISAN_CARVING_MANTRAS,
  getGemMyth,
  getArtisanMantra,
  getGemTriggerShout,
} from '../gemLore';

describe('C1090 [narrative]: Celestial Gem Myths & Artisan Mantras', () => {
  it('defines evocative origin myths and elemental poems for all 4 gems', () => {
    for (const type of ['fire_ruby', 'water_sapphire', 'lightning_topaz', 'dark_amethyst'] as const) {
      const myth = getGemMyth(type);
      expect(myth).toBeDefined();
      expect(myth.originMyth.length).toBeGreaterThan(20);
      expect(myth.elementalPoem.length).toBeGreaterThan(15);
    }
  });

  it('provides master artisan carving mantras across all 4 tiers', () => {
    expect(getArtisanMantra('normal')).toContain('원석의 탁한 불순물');
    expect(getArtisanMantra('rare')).toContain('투명한 영광');
    expect(getArtisanMantra('legendary')).toContain('원소의 정령');
    expect(getArtisanMantra('mythic')).toContain('완전무결한 초월의 보석');
  });

  it('delivers visceral battle chants for all 4 gem trigger types', () => {
    expect(getGemTriggerShout('fire_ruby')).toContain('겁화의 불꽃이여');
    expect(getGemTriggerShout('water_sapphire')).toContain('창해의 빙벽이여');
    expect(getGemTriggerShout('lightning_topaz')).toContain('구천의 번개여');
    expect(getGemTriggerShout('dark_amethyst')).toContain('심연의 명혼이여');
  });
});
