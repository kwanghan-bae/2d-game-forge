/**
 * omniverseRegaliaIntegration.test.ts — C1163: Unit tests for Omniverse Regalia Combat Integration.
 */

import { describe, it, expect } from 'vitest';
import {
  applyRegaliaHpBonus,
  applyRegaliaDefPenetration,
  applyRegaliaIncomingDamage,
  applyRegaliaCriticalHit,
  isImmuneToDebuff,
  getRegaliaCombatProfile,
} from '../omniverseRegaliaIntegration';
import { INITIAL_META, type MetaState } from '../../store/gameStore';

describe('C1163: Omniverse Regalia Combat Integration Tests', () => {
  it('applies Ymir HP bonus correctly to hero max HP', () => {
    const baseMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: [],
    };

    const withoutPerk = applyRegaliaHpBonus(500_000, baseMeta);
    expect(withoutPerk.maxHp).toBe(500_000);
    expect(withoutPerk.bonusHp).toBe(0);

    const withPerkMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['ymir_primordial_heart'],
    };

    const withPerk = applyRegaliaHpBonus(500_000, withPerkMeta);
    expect(withPerk.maxHp).toBe(100_500_000);
    expect(withPerk.bonusHp).toBe(100_000_000);
  });

  it('bypasses 30% enemy DEF when Ouroboros Chrono Blade is forged', () => {
    const baseMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: [],
    };

    expect(applyRegaliaDefPenetration(100_000, baseMeta)).toBe(100_000);

    const forgedMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['ouroboros_chrono_blade'],
    };

    // 100,000 * 0.70 = 70,000
    expect(applyRegaliaDefPenetration(100_000, forgedMeta)).toBe(70_000);
    // 50,000 * 0.70 = 35,000
    expect(applyRegaliaDefPenetration(50_000, forgedMeta)).toBe(35_000);
  });

  it('mitigates incoming damage with flat barrier and elemental resistance', () => {
    const fullPerksMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['ymir_primordial_heart', 'aion_singularity_aegis'],
    };

    // Physical damage: 2,000,000 - 500,000 flat barrier = 1,500,000
    const physicalRes = applyRegaliaIncomingDamage(2_000_000, fullPerksMeta, false);
    expect(physicalRes.finalDamage).toBe(1_500_000);
    expect(physicalRes.absorbedByBarrier).toBe(500_000);
    expect(physicalRes.elementalMitigation).toBe(0);

    // Elemental damage: 2,000,000 * 0.80 = 1,600,000 - 500,000 flat barrier = 1,100,000
    const elementalRes = applyRegaliaIncomingDamage(2_000_000, fullPerksMeta, true);
    expect(elementalRes.finalDamage).toBe(1_100_000);
    expect(elementalRes.absorbedByBarrier).toBe(500_000);
    expect(elementalRes.elementalMitigation).toBe(400_000);

    // Damage below flat barrier floors at 1
    const lowDmgRes = applyRegaliaIncomingDamage(200_000, fullPerksMeta, false);
    expect(lowDmgRes.finalDamage).toBe(1);
    expect(lowDmgRes.absorbedByBarrier).toBe(199_999);
  });

  it('amplifies critical hits with Nyx Void Eye (+100% crit damage bonus)', () => {
    const baseMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: [],
    };

    const nonCrit = applyRegaliaCriticalHit(10_000, false, baseMeta);
    expect(nonCrit.damage).toBe(10_000);
    expect(nonCrit.multiplier).toBe(1.0);

    const baseCrit = applyRegaliaCriticalHit(10_000, true, baseMeta);
    expect(baseCrit.damage).toBe(15_000); // 1.5x
    expect(baseCrit.multiplier).toBe(1.5);

    const nyxMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['nyx_void_eye'],
    };

    const nyxCrit = applyRegaliaCriticalHit(10_000, true, nyxMeta);
    expect(nyxCrit.damage).toBe(25_000); // 2.5x
    expect(nyxCrit.multiplier).toBe(2.5);
  });

  it('confers debuff immunity when Aion Singularity Aegis is forged', () => {
    const baseMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: [],
    };
    expect(isImmuneToDebuff(baseMeta)).toBe(false);

    const aionMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['aion_singularity_aegis'],
    };
    expect(isImmuneToDebuff(aionMeta)).toBe(true);
  });

  it('produces a consolidated combat profile for meta states', () => {
    const emptyProfile = getRegaliaCombatProfile({ ...INITIAL_META, forgedRegalia: [] });
    expect(emptyProfile.forgedCount).toBe(0);
    expect(emptyProfile.hasAllRegalia).toBe(false);

    const fullProfile = getRegaliaCombatProfile({
      ...INITIAL_META,
      forgedRegalia: [
        'ouroboros_chrono_blade',
        'ymir_primordial_heart',
        'nyx_void_eye',
        'aion_singularity_aegis',
      ],
    });
    expect(fullProfile.forgedCount).toBe(4);
    expect(fullProfile.hasAllRegalia).toBe(true);
    expect(fullProfile.perks.defPenetration).toBe(0.30);
    expect(fullProfile.perks.bonusHp).toBe(100_000_000);
  });
});
