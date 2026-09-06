/**
 * abyssalCorridorLore.test.ts — C1126: Narrative unit tests for Abyssal Corridor Lore.
 */

import { describe, it, expect } from 'vitest';
import {
  CORRIDOR_SECTOR_LORE,
  getCorridorSectorLore,
  formatCorridorSectorSagaEntry,
  formatSingularityTitleChronicle,
} from '../abyssalCorridorLore';
import type { CorridorSectorId } from '../../systems/abyssalCorridor';

describe('C1126: Abyssal Corridor Lore Tests', () => {
  it('contains valid lore entries for all 5 sectors', () => {
    const sectors: CorridorSectorId[] = [1, 2, 3, 4, 5];

    for (const s of sectors) {
      const entry = getCorridorSectorLore(s);
      expect(entry).toBeDefined();
      expect(entry.sector).toBe(s);
      expect(entry.nameKR.length).toBeGreaterThan(0);
      expect(entry.hanja.length).toBeGreaterThan(0);
      expect(entry.guardianTitle.length).toBeGreaterThan(0);
      expect(entry.loreInscript.length).toBeGreaterThan(0);
      expect(entry.guardianEncounterDialogue.length).toBeGreaterThan(0);
      expect(entry.guardianDefeatDialogue.length).toBeGreaterThan(0);
      expect(entry.sagaChronicle.length).toBeGreaterThan(0);
    }
  });

  it('correctly formats saga chronicle entries for sector conquests', () => {
    const chronicle = formatCorridorSectorSagaEntry(1, '아스트랄 용사', 8);
    expect(chronicle).toContain('[심연 회랑 제1섹터]');
    expect(chronicle).toContain('아스트랄 용사');
    expect(chronicle).toContain('8턴');
    expect(chronicle).toContain('잔해의 파수거신');
  });

  it('correctly formats the Primordial Ascendant coronation chronicle', () => {
    const titleChronicle = formatSingularityTitleChronicle('성좌의 지배자');
    expect(titleChronicle).toContain('[태초의 승천자 등극]');
    expect(titleChronicle).toContain('성좌의 지배자');
    expect(titleChronicle).toContain('태초의 승천자 (Primordial Ascendant)');
  });
});
