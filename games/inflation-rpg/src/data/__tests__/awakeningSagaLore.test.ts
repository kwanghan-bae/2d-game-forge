/**
 * awakeningSagaLore.test.ts — C1078: Nine-Star Awakening Lore Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  AWAKENING_SAGA_LORE,
  getAwakeningTitleHymn,
  getSagaEpitaph,
  getBreakthroughAnnouncement,
} from '../awakeningSagaLore';

describe('C1078 [narrative]: Nine-Star Awakening Hymns & Saga Lore', () => {
  it('defines comprehensive saga lore for all 9 tiers', () => {
    for (let tier = 1; tier <= 9; tier++) {
      const lore = AWAKENING_SAGA_LORE[tier];
      expect(lore).toBeDefined();
      expect(lore.tier).toBe(tier);
      expect(lore.taoistTitle.length).toBeGreaterThan(2);
      expect(lore.hanjaTitle.length).toBeGreaterThan(1);
      expect(lore.hymn.length).toBeGreaterThan(15);
      expect(lore.sagaEpitaph.length).toBeGreaterThan(15);
      expect(lore.breakthroughQuote.length).toBeGreaterThan(15);
    }
  });

  it('returns valid hymns for each tier', () => {
    expect(getAwakeningTitleHymn(1)).toContain('우주의 첫 번째 새벽');
    expect(getAwakeningTitleHymn(5)).toContain('불멸의 황금 성핵');
    expect(getAwakeningTitleHymn(9)).toContain('하늘 위의 하늘');
  });

  it('returns valid saga epitaphs for chronicle recording', () => {
    expect(getSagaEpitaph(1)).toContain('개광의 문을 열었다');
    expect(getSagaEpitaph(5)).toContain('불멸의 금단을 맺음으로써');
    expect(getSagaEpitaph(9)).toContain('천외천의 무극신선으로');
  });

  it('returns valid breakthrough announcements', () => {
    expect(getBreakthroughAnnouncement(1)).toContain('성광이 단전에 스며들어');
    expect(getBreakthroughAnnouncement(9)).toContain('내가 곧 우주이자 법칙');
  });
});
