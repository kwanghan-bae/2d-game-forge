/**
 * apexZenithSanctuary.ts — C1108: Apex Zenith Sanctuary Permanent Blessings Engine.
 *
 * Implements the permanent cosmic blessings and prestigious titles awarded to heroes
 * who have conquered the summit tiers of the Apex Trial Challenge:
 * - Each conquered tier grants +5% omni-stat boost, +3% damage reduction, and +5% crit damage.
 * - Conquering Tier 3 grants an additional +10% final damage multiplier and +10% defense penetration.
 * - Manages prestigious sanctuary titles with dedicated elemental affinities.
 */

import type { HeroEntity } from '../hero/HeroEntity';

export type SanctuaryTitleId =
  | 'dawn_pioneer'
  | 'dusk_conqueror'
  | 'zenith_transcendent';

export interface SanctuaryTitleDef {
  id: SanctuaryTitleId;
  tierRequired: number;
  nameKR: string;
  badge: string;
  description: string;
  elementalBonus: {
    fire?: number;
    water?: number;
    lightning?: number;
    dark?: number;
    all?: number;
  };
  specialPerk?: string;
}

export const SANCTUARY_TITLES: Record<SanctuaryTitleId, SanctuaryTitleDef> = {
  dawn_pioneer: {
    id: 'dawn_pioneer',
    tierRequired: 1,
    nameKR: '여명의 개척자',
    badge: '🌅',
    description: '태초의 여명을 뚫고 나온 개척자의 증표. 화염과 번개 속성 피해가 5% 증가합니다.',
    elementalBonus: { fire: 5, lightning: 5 },
  },
  dusk_conqueror: {
    id: 'dusk_conqueror',
    tierRequired: 2,
    nameKR: '황혼의 정복자',
    badge: '🌘',
    description: '불멸의 황혼을 정복한 지배자의 증표. 암흑과 빙결(물) 속성 피해가 5% 증가합니다.',
    elementalBonus: { dark: 5, water: 5 },
  },
  zenith_transcendent: {
    id: 'zenith_transcendent',
    tierRequired: 3,
    nameKR: '무극의 초월자',
    badge: '👑✨',
    description: '차원 우주의 모든 시공간을 초월한 자. 모든 속성 피해가 15% 폭증하고 방어 관통 10%를 획득합니다.',
    elementalBonus: { all: 15 },
    specialPerk: '방어 관통 +10%',
  },
};

export interface SanctuaryBlessingStats {
  clearedTiersCount: number;
  omniStatMultiplier: number;
  damageReduction: number;
  critDmgBonus: number;
  finalDmgMultiplier: number;
  defPierceBonus: number;
}

/**
 * Computes aggregate permanent blessings from cleared Apex Trial tiers.
 */
export function computeSanctuaryBlessings(clearedTiers: number[]): SanctuaryBlessingStats {
  const uniqueTiers = Array.from(new Set(clearedTiers.filter(t => t >= 1 && t <= 3)));
  const count = uniqueTiers.length;

  return {
    clearedTiersCount: count,
    omniStatMultiplier: Math.round((1.0 + count * 0.05) * 100) / 100,
    damageReduction: Math.round(Math.min(0.15, count * 0.03) * 100) / 100,
    critDmgBonus: Math.round(count * 0.05 * 100) / 100,
    finalDmgMultiplier: count >= 3 ? 1.10 : 1.0,
    defPierceBonus: count >= 3 ? 0.10 : 0.0,
  };
}

/**
 * Returns available titles based on conquered Apex Trial tiers.
 */
export function getAvailableSanctuaryTitles(clearedTiers: number[]): SanctuaryTitleDef[] {
  return Object.values(SANCTUARY_TITLES).filter(t => clearedTiers.includes(t.tierRequired));
}

/**
 * Returns the highest sanctuary title unlocked.
 */
export function getHighestSanctuaryTitle(clearedTiers: number[]): SanctuaryTitleDef | null {
  const available = getAvailableSanctuaryTitles(clearedTiers);
  if (available.length === 0) return null;
  return available[available.length - 1];
}

/**
 * Applies permanent sanctuary blessings to a HeroEntity instance.
 */
export function applySanctuaryBlessingsToHero(
  hero: HeroEntity,
  blessings: SanctuaryBlessingStats
): void {
  if (blessings.clearedTiersCount <= 0) return;
  const mul = blessings.omniStatMultiplier;
  hero.hp = Math.floor(hero.hp * mul);
  hero.hpMax = Math.floor(hero.hpMax * mul);
  hero.atk = Math.floor(hero.atk * mul);
  if (hero.def != null) {
    hero.def = Math.floor(hero.def * mul);
  }
}
