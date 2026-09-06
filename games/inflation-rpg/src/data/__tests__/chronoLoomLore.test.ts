/**
 * chronoLoomLore.test.ts — C1150: Unit tests for Chrono Loom Lore & Verdandi Dialogues.
 */

import { describe, it, expect } from 'vitest';
import {
  CHRONO_LOOM_NODE_LORE,
  getVerdandiDialogue,
  getChronoLoomNodeLore,
} from '../chronoLoomLore';
import { ALL_CHRONO_LOOM_NODE_IDS } from '../../systems/chronoLoom';

describe('C1150: Chrono Loom Lore & Dialogue Tests', () => {
  it('contains valid scriptures and mastery epilogues for all 4 loom nodes', () => {
    for (const nodeId of ALL_CHRONO_LOOM_NODE_IDS) {
      const lore = getChronoLoomNodeLore(nodeId);
      expect(lore).toBeDefined();
      expect(lore.nodeId).toBe(nodeId);
      expect(lore.nameKR.length).toBeGreaterThan(0);
      expect(lore.hanja.length).toBeGreaterThan(0);
      expect(lore.weavingScripture.length).toBeGreaterThan(0);
      expect(lore.masteryEpilogue.length).toBeGreaterThan(0);
    }
  });

  it('provides progressive Verdandi dialogue across 4 rank tiers', () => {
    const d0 = getVerdandiDialogue(0);
    expect(d0.title).toContain('직조의 입문자');
    expect(d0.quote).toContain('그대의 운명을 새로이');

    const d5 = getVerdandiDialogue(5);
    expect(d5.title).toContain('인과율의 조율자');
    expect(d5.quote).toContain('실타래가 점차 굵직한 인과');

    const d10 = getVerdandiDialogue(12);
    expect(d10.title).toContain('시공의 마에스트로');
    expect(d10.quote).toContain('베틀 위에서 춤추는');

    const d20 = getVerdandiDialogue(20);
    expect(d20.title).toContain('무한 윤회의 직조신');
    expect(d20.quote).toContain('영원한 직조신');
  });
});
