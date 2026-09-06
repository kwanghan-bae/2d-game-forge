/**
 * pantheonRaidLore.test.ts — C1156: Unit tests for Eternal Pantheon Lore & Decrees.
 */

import { describe, it, expect } from 'vitest';
import {
  PANTHEON_TITAN_LORE,
  getPantheonTitanLore,
  formatPantheonSagaEntry,
  PANTHEON_VICTORY_EPILOGUE,
} from '../pantheonRaidLore';
import type { PantheonPhase } from '../../systems/pantheonRaid';

describe('C1156: Eternal Pantheon Lore & Sagas Tests', () => {
  it('contains apocalyptic decrees and defeat laments for all 4 Titans', () => {
    const phases: PantheonPhase[] = [1, 2, 3, 4];
    for (const p of phases) {
      const lore = getPantheonTitanLore(p);
      expect(lore).toBeDefined();
      expect(lore.phase).toBe(p);
      expect(lore.nameKR.length).toBeGreaterThan(0);
      expect(lore.titleKR.length).toBeGreaterThan(0);
      expect(lore.entryDecree.length).toBeGreaterThan(0);
      expect(lore.defeatLament.length).toBeGreaterThan(0);
    }
  });

  it('provides grandiose victory epilogue upon conquering the 4 Titans', () => {
    expect(PANTHEON_VICTORY_EPILOGUE).toContain('4대 우주 거신');
    expect(PANTHEON_VICTORY_EPILOGUE).toContain('진 우주 주재신');
  });

  it('correctly formats saga chronicle entry for Pantheon conqueror', () => {
    const saga = formatPantheonSagaEntry(1, '성간 용사', 38);
    expect(saga).toContain('[제1회 초월의 만신전 완파]');
    expect(saga).toContain('성간 용사');
    expect(saga).toContain('총 38턴 만에 격파');
    expect(saga).toContain('진 우주 주재신');
  });
});
