/**
 * omniverseRegalia.test.ts — C1159: Unit tests for Omniverse Regalia Catalog & Crest Forging.
 */

import { describe, it, expect } from 'vitest';
import {
  OMNIVERSE_REGALIA_CATALOG,
  ALL_OMNIVERSE_REGALIA_IDS,
  getOmniverseRegalia,
  canForgeOmniverseRegalia,
  forgeOmniverseRegalia,
  evaluateForgedRegaliaPerks,
} from './omniverseRegalia';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1159: Omniverse Regalia Catalog & Forging Tests', () => {
  it('defines 4 unique divine regalia each costing 5 Pantheon Crests', () => {
    expect(ALL_OMNIVERSE_REGALIA_IDS.length).toBe(4);

    for (const id of ALL_OMNIVERSE_REGALIA_IDS) {
      const regalia = getOmniverseRegalia(id);
      expect(regalia).toBeDefined();
      expect(regalia.id).toBe(id);
      expect(regalia.cost).toBe(5);
      expect(regalia.nameKR.length).toBeGreaterThan(0);
      expect(regalia.hanja.length).toBeGreaterThan(0);
      expect(regalia.icon.length).toBeGreaterThan(0);
    }
  });

  it('rejects forging when Pantheon Crests are insufficient', () => {
    const metaZero: MetaState = { ...INITIAL_META, pantheonCrests: 2 };
    const check = canForgeOmniverseRegalia(metaZero, 'ouroboros_chrono_blade');

    expect(check.canForge).toBe(false);
    expect(check.reason).toContain('만신전 문장이 부족합니다');
  });

  it('rejects forging when regalia is already forged', () => {
    const metaForged: MetaState = {
      ...INITIAL_META,
      pantheonCrests: 10,
      forgedRegalia: ['ouroboros_chrono_blade'],
    };
    const check = canForgeOmniverseRegalia(metaForged, 'ouroboros_chrono_blade');

    expect(check.canForge).toBe(false);
    expect(check.reason).toContain('이미 주조가 완료');
  });

  it('permits forging and successfully transforms MetaState', () => {
    const metaReady: MetaState = {
      ...INITIAL_META,
      pantheonCrests: 5,
      forgedRegalia: [],
    };

    const check = canForgeOmniverseRegalia(metaReady, 'ymir_primordial_heart');
    expect(check.canForge).toBe(true);

    const { newMeta, regalia } = forgeOmniverseRegalia(metaReady, 'ymir_primordial_heart');
    expect(regalia.id).toBe('ymir_primordial_heart');
    expect((newMeta as any).pantheonCrests).toBe(0);
    expect(newMeta.forgedRegalia).toContain('ymir_primordial_heart');
  });

  it('evaluates cumulative perks accurately from empty to all 4 forged', () => {
    // 1. Empty
    const emptyPerks = evaluateForgedRegaliaPerks(INITIAL_META);
    expect(emptyPerks.totalRegaliaCount).toBe(0);
    expect(emptyPerks.defPenetration).toBe(0);
    expect(emptyPerks.bonusHp).toBe(0);
    expect(emptyPerks.flatBarrier).toBe(0);
    expect(emptyPerks.critRateBonus).toBe(0);
    expect(emptyPerks.critDamageBonus).toBe(0);
    expect(emptyPerks.debuffImmunity).toBe(false);
    expect(emptyPerks.allElementalResistance).toBe(0);

    // 2. All 4 Regalia forged
    const metaAll: MetaState = {
      ...INITIAL_META,
      forgedRegalia: [
        'ouroboros_chrono_blade',
        'ymir_primordial_heart',
        'nyx_void_eye',
        'aion_singularity_aegis',
      ],
    };

    const allPerks = evaluateForgedRegaliaPerks(metaAll);
    expect(allPerks.totalRegaliaCount).toBe(4);
    expect(allPerks.defPenetration).toBe(0.30);
    expect(allPerks.bonusHp).toBe(100_000_000);
    expect(allPerks.flatBarrier).toBe(500_000);
    expect(allPerks.critRateBonus).toBe(0.25);
    expect(allPerks.critDamageBonus).toBe(1.00);
    expect(allPerks.debuffImmunity).toBe(true);
    expect(allPerks.allElementalResistance).toBe(0.20);
  });
});
