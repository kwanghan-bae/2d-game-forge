/**
 * primordialAscensionLore.test.ts — C1131: Unit tests for Primordial Ascension Lore.
 */

import { describe, it, expect } from 'vitest';
import {
  PRIMORDIAL_LORE,
  getPrimordialLore,
  formatPrimordialAwakenSaga,
  formatPrimordialZenithMasterySaga,
} from '../primordialAscensionLore';
import type { PrimordialNodeId } from '../../systems/primordialAscension';

describe('C1131: Primordial Ascension Lore Tests', () => {
  it('contains valid lore entries for all 4 primordial nodes', () => {
    const nodes: PrimordialNodeId[] = [
      'primordial_genesis',
      'primordial_annihilation',
      'primordial_eternity',
      'primordial_singularity',
    ];

    for (const id of nodes) {
      const entry = getPrimordialLore(id);
      expect(entry).toBeDefined();
      expect(entry.id).toBe(id);
      expect(entry.nameKR.length).toBeGreaterThan(0);
      expect(entry.hanja.length).toBeGreaterThan(0);
      expect(entry.constellationTitle.length).toBeGreaterThan(0);
      expect(entry.scriptureHymn.length).toBeGreaterThan(0);
      expect(entry.awakeningQuote.length).toBeGreaterThan(0);
      expect(entry.sagaChronicle.length).toBeGreaterThan(0);
    }
  });

  it('correctly formats saga chronicle entries for node awakenings', () => {
    const saga = formatPrimordialAwakenSaga('primordial_genesis', 3, '초월용사');
    expect(saga).toContain('[태초 성좌 각성]');
    expect(saga).toContain('초월용사');
    expect(saga).toContain('태초의 창생');
    expect(saga).toContain('랭크 3');
  });

  it('correctly formats Grand Primordial Zenith coronation chronicle', () => {
    const zenith = formatPrimordialZenithMasterySaga('성좌의 군주');
    expect(zenith).toContain('[원초적 태초 극의 달성]');
    expect(zenith).toContain('성좌의 군주');
    expect(zenith).toContain('태초의 지배신 (Primordial Sovereign)');
  });
});
