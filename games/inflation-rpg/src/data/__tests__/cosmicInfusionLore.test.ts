import { describe, it, expect } from 'vitest';
import {
  COSMIC_INFUSION_LORE,
  getCosmicInfusionLore,
  formatCosmicInfusionSagaEntry,
} from '../cosmicInfusionLore';
import type { CosmicAffixType } from '../../systems/cosmicInfusion';

describe('cosmicInfusionLore (C1119)', () => {
  const affixes: CosmicAffixType[] = [
    'celestial_sharpness',
    'astral_fortitude',
    'singularity_might',
    'cosmic_celerity',
  ];

  it('contains comprehensive lore entries for all 4 cosmic affixes', () => {
    affixes.forEach((affix) => {
      const lore = getCosmicInfusionLore(affix);
      expect(lore).toBeDefined();
      expect(lore.type).toBe(affix);
      expect(lore.artisanTitle.length).toBeGreaterThan(0);
      expect(lore.infusionChant.length).toBeGreaterThan(15);
      expect(lore.appraisalQuote.length).toBeGreaterThan(15);
      expect(lore.sagaChronicle.length).toBeGreaterThan(15);
    });
  });

  it('formats epic saga chronicle inscriptions', () => {
    const saga = formatCosmicInfusionSagaEntry(
      'singularity_might',
      '신화의 성운도',
      '천외천'
    );
    expect(saga).toContain('[천상 주입]');
    expect(saga).toContain('용사 천외천이(가)');
    expect(saga).toContain('[신화의 성운도]에');
    expect(saga).toContain('특이점의 위력을 융합하여');
  });
});
