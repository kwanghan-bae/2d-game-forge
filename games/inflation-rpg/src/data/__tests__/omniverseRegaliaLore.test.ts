/**
 * omniverseRegaliaLore.test.ts — C1162: Tests for Omniverse Regalia narrative lore.
 */

import { describe, it, expect } from 'vitest';
import {
  OMNIVERSE_REGALIA_LORE,
  getBlacksmithDialogue,
  getRegaliaLore,
} from '../omniverseRegaliaLore';
import { ALL_OMNIVERSE_REGALIA_IDS } from '../../systems/omniverseRegalia';

describe('C1162: Omniverse Regalia Lore Tests', () => {
  it('contains complete lore scriptures for all 4 divine regalia', () => {
    for (const id of ALL_OMNIVERSE_REGALIA_IDS) {
      const lore = OMNIVERSE_REGALIA_LORE[id];
      expect(lore).toBeDefined();
      expect(lore.id).toBe(id);
      expect(lore.nameKR.length).toBeGreaterThan(0);
      expect(lore.hanja.length).toBeGreaterThan(0);
      expect(lore.forgingHymn.length).toBeGreaterThan(20);
      expect(lore.awakenedInscription.length).toBeGreaterThan(20);
    }
  });

  it('provides progressive blacksmith dialogues from 0 to 4 forged regalia', () => {
    const d0 = getBlacksmithDialogue(0);
    const d1 = getBlacksmithDialogue(1);
    const d2 = getBlacksmithDialogue(2);
    const d3 = getBlacksmithDialogue(3);
    const d4 = getBlacksmithDialogue(4);
    const d5 = getBlacksmithDialogue(5);

    expect(d0.title).toContain('신성 모루의 대장장이');
    expect(d0.quote).toContain('어둠의 대장간');

    expect(d1.title).toContain('초월의 불씨 수호자');
    expect(d1.quote).toContain('첫 번째 보구');

    expect(d2.title).toContain('성운의 모루지기');
    expect(d2.quote).toContain('두 개의 보구');

    expect(d3.title).toContain('영겁의 주조 장인');
    expect(d3.quote).toContain('마지막 단 하나의 보구');

    expect(d4.title).toContain('우주 대장간의 창조주');
    expect(d4.quote).toContain('완성되었도다');

    // Dialogue for count > 4 equals count 4
    expect(d5.title).toBe(d4.title);
  });

  it('correctly retrieves lore via getRegaliaLore helper', () => {
    const bladeLore = getRegaliaLore('ouroboros_chrono_blade');
    expect(bladeLore.nameKR).toBe('시공 방직신의 세검');
    expect(bladeLore.hanja).toBe('時空織神細劍');

    const aegisLore = getRegaliaLore('aion_singularity_aegis');
    expect(aegisLore.nameKR).toBe('특이점 대군주의 성벽');
    expect(aegisLore.forgingHymn).toContain('아이온');
  });
});
