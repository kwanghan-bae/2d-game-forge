import { describe, it, expect } from 'vitest';
import {
  APEX_RELIC_LORE,
  getTransmutedRelicLore,
  getTransmutationPrayer,
  formatApexRelicSagaEntry,
} from '../relicTransmutationLore';
import type { TransmutedRelicType } from '../../systems/celestialRelicTransmutation';

describe('relicTransmutationLore (C1102)', () => {
  const relicKeys: TransmutedRelicType[] = [
    'polaris_celestial_eye',
    'sirius_celestial_fang',
    'vega_celestial_veil',
    'antares_celestial_heart',
  ];

  it('contains valid lore entries for all 4 transmuted relics', () => {
    relicKeys.forEach((key) => {
      const lore = getTransmutedRelicLore(key);
      expect(lore).toBeDefined();
      expect(lore.type).toBe(key);
      expect(lore.deityNameKR.length).toBeGreaterThan(0);
      expect(lore.originMyth.length).toBeGreaterThan(10);
      expect(lore.transmutationPrayer.length).toBeGreaterThan(10);
    });
  });

  it('returns valid transmutation prayer directly via getTransmutationPrayer', () => {
    relicKeys.forEach((key) => {
      const prayer = getTransmutationPrayer(key);
      expect(prayer).toBe(APEX_RELIC_LORE[key].transmutationPrayer);
      expect(prayer).toContain('소서');
    });
  });

  it('formats epic saga inscriptions based on transmuted count', () => {
    expect(formatApexRelicSagaEntry(0)).toBe('고대 성유물 0개를 초월 진화시켜 천상의 성광을 각성시켰다.');
    expect(formatApexRelicSagaEntry(2)).toBe('고대 성유물 2개를 초월 진화시켜 천상의 성광을 각성시켰다.');
    expect(formatApexRelicSagaEntry(4)).toBe(
      '4대 천상 성유물의 완전초월 진화를 완수하여 고대 성좌 신들의 완전한 축복을 손에 넣었다.'
    );
    expect(formatApexRelicSagaEntry(5)).toBe(
      '4대 천상 성유물의 완전초월 진화를 완수하여 고대 성좌 신들의 완전한 축복을 손에 넣었다.'
    );
  });
});
