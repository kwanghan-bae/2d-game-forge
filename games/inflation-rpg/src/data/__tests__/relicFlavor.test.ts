/**
 * relicFlavor.test.ts — C1071: Celestial Relics Lore & Chants Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  CELESTIAL_RELIC_LORE,
  getRelicSocketChant,
  getRelicUnsocketQuote,
} from '../relicFlavor';
import { ALL_CELESTIAL_RELICS } from '../../systems/celestialRelics';

describe('C1071 [narrative]: Celestial Relics Lore & Chants', () => {
  it('defines comprehensive mythology lore for all 4 celestial star relics', () => {
    for (const id of ALL_CELESTIAL_RELICS) {
      const lore = CELESTIAL_RELIC_LORE[id];
      expect(lore).toBeDefined();
      expect(lore.koreanName.length).toBeGreaterThan(2);
      expect(lore.hanja.length).toBeGreaterThan(1);
      expect(lore.constellation.length).toBeGreaterThan(3);
      expect(lore.mythologicalOrigin.length).toBeGreaterThan(15);
      expect(lore.socketChant.length).toBeGreaterThan(10);
      expect(lore.unsocketQuote.length).toBeGreaterThan(10);
    }
  });

  it('returns valid blacksmith socket chants for each relic', () => {
    expect(getRelicSocketChant('polaris_eye')).toContain('북천의 영원한 중심이여');
    expect(getRelicSocketChant('sirius_fang')).toContain('하늘 늑대의 푸른 송곳니여');
    expect(getRelicSocketChant('vega_veil')).toContain('은하수를 수놓은 성운의 실타래여');
    expect(getRelicSocketChant('antares_heart')).toContain('대화(大火)의 붉은 심장이여');
  });

  it('returns valid unsocket quotes for each relic', () => {
    expect(getRelicUnsocketQuote('polaris_eye')).toContain('북극의 영기가 부드럽게');
    expect(getRelicUnsocketQuote('sirius_fang')).toContain('천랑성의 푸른 섬광이');
    expect(getRelicUnsocketQuote('vega_veil')).toContain('은하수의 장막이');
    expect(getRelicUnsocketQuote('antares_heart')).toContain('대화의 붉은 불씨가');
  });
});
