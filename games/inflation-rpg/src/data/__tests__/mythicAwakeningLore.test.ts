/**
 * mythicAwakeningLore.test.ts — C1096: Mythic Awakening Lore & Set Hymns Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  MYTHIC_STAR_MANTRAS,
  MYTHIC_SET_HYMNS,
  getMythicStarMantra,
  getMythicSetHymn,
  formatMythicSagaInscription,
} from '../mythicAwakeningLore';

describe('C1096 [narrative]: Mythic Awakening Lore & Set Hymns', () => {
  it('defines evocative star awakening mantras from 1 to 5 stars', () => {
    expect(getMythicStarMantra(1)).toContain('은은한 푸른 성운');
    expect(getMythicStarMantra(2)).toContain('원소의 상성을 꿰뚫는');
    expect(getMythicStarMantra(3)).toContain('천둥이 고동친다');
    expect(getMythicStarMantra(4)).toContain('신성한 우주 신금');
    expect(getMythicStarMantra(5)).toContain('거대한 은하계');
  });

  it('provides epic set resonance hymns at star thresholds', () => {
    expect(getMythicSetHymn(1)).toBe('아직 성운의 공명이 잠들어 있습니다.');
    expect(getMythicSetHymn(2)).toContain('원소 관통의 빛');
    expect(getMythicSetHymn(5)).toContain('치명적인 일격');
    expect(getMythicSetHymn(10)).toContain('열 개의 성운이 은하수를');
    expect(getMythicSetHymn(15)).toContain('혼돈을 잠재우고');
  });

  it('formats inspiring chronicle inscriptions for the Hall of Sagas', () => {
    expect(formatMythicSagaInscription(6)).toBe('신화 장비 성운 6성을 각성하여 우주의 공명을 이끌어냈다.');
    expect(formatMythicSagaInscription(15)).toContain('15성 완전무결 성운 초월');
  });
});
