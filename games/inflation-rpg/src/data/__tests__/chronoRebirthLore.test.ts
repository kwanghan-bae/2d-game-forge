/**
 * chronoRebirthLore.test.ts — C1144: Unit tests for Chrono Rebirth Lore.
 */

import { describe, it, expect } from 'vitest';
import {
  CHRONO_REBIRTH_LORE,
  getChronoRebirthLore,
  formatRebirthSagaEntry,
} from '../chronoRebirthLore';
import type { ChronoRebirthTierId } from '../../systems/chronoRebirth';

describe('C1144: Chrono Rebirth Lore Tests', () => {
  it('contains valid lore entries for all 4 rebirth tiers', () => {
    const tiers: ChronoRebirthTierId[] = [
      'apprentice_warp',
      'astral_warp',
      'primordial_warp',
      'singularity_rebirth',
    ];

    for (const id of tiers) {
      const entry = getChronoRebirthLore(id);
      expect(entry).toBeDefined();
      expect(entry.tierId).toBe(id);
      expect(entry.nameKR.length).toBeGreaterThan(0);
      expect(entry.hanja.length).toBeGreaterThan(0);
      expect(entry.weaverIncantation.length).toBeGreaterThan(0);
      expect(entry.rebirthEpilogue.length).toBeGreaterThan(0);
      expect(entry.sagaChronicle.length).toBeGreaterThan(0);
    }
  });

  it('correctly formats saga chronicle entries for rebirth execution', () => {
    const saga = formatRebirthSagaEntry('singularity_rebirth', 3, '초신성 용사');
    expect(saga).toContain('[제3회 시공 환생]');
    expect(saga).toContain('초신성 용사');
    expect(saga).toContain('특이점 대환생 (特異點大轉生)');
    expect(saga).toContain('200레벨의 신격');
  });
});
