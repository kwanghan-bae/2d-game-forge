/**
 * alchemyFlavor.test.ts — C1066: Alchemy Lore & Ingestion Quotes Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  CAULDRON_NAME,
  CAULDRON_DESC,
  ELIXIR_FLAVOR_LORE,
  getElixirIngestionQuote,
  getCauldronProgressQuote,
} from '../alchemyFlavor';
import { ALL_ELIXIRS } from '../../systems/astralAlchemy';

describe('C1066 [narrative]: Alchemy Flavor & Lore Tests', () => {
  it('defines valid folklore lore for all 4 elixirs', () => {
    expect(CAULDRON_NAME).toContain('천화신정');
    expect(CAULDRON_DESC.length).toBeGreaterThan(10);

    for (const id of ALL_ELIXIRS) {
      const lore = ELIXIR_FLAVOR_LORE[id];
      expect(lore).toBeDefined();
      expect(lore.origin.length).toBeGreaterThan(10);
      expect(lore.ingestionReactionFirst.length).toBeGreaterThan(10);
      expect(lore.ingestionReactionMid.length).toBeGreaterThan(10);
      expect(lore.ingestionReactionMax.length).toBeGreaterThan(10);
    }
  });

  it('returns appropriate progression quotes based on dose stage', () => {
    // 1st dose -> first reaction
    const quote1 = getElixirIngestionQuote('solar_pill', 1);
    expect(quote1).toContain('온몸의 혈맥이 붉게 타오르며');

    // 5th dose -> mid reaction
    const quote5 = getElixirIngestionQuote('solar_pill', 5);
    expect(quote5).toContain('태양단의 양기가 심장에');

    // 10th dose -> max reaction
    const quote10 = getElixirIngestionQuote('solar_pill', 10);
    expect(quote10).toContain('온몸이 황금빛 태양의 화염과 하나 되어');
  });

  it('returns appropriate cauldron progress quotes from 0 to 40 doses', () => {
    expect(getCauldronProgressQuote(0)).toContain('단학 가마의 불꽃이');
    expect(getCauldronProgressQuote(5)).toContain('범인의 육신을 초월하기');
    expect(getCauldronProgressQuote(25)).toContain('반선(半仙)의 위엄');
    expect(getCauldronProgressQuote(35)).toContain('천지개벽의 기운');
    expect(getCauldronProgressQuote(40)).toContain('불멸의 신선(神仙) 경지');
  });
});
