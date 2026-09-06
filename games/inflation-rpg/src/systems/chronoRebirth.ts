/**
 * chronoRebirth.ts — C1141: Chrono-Rift Warp & Singularity Rebirth Engine.
 *
 * Provides prestige reincarnation mechanics for veteran heroes:
 * - Leaps starting level (Lv 50 ~ Lv 200) based on Archive Mastery.
 * - Endows instant starting gold vaults (5M ~ 100M G).
 * - Multiplies cycle drop rates (1.10x ~ 2.00x).
 * - Awards persistent Chrono Essence for trans-dimensional ascension.
 */

import type { MetaState, RunState } from '../types';
import { evaluateArchiveMastery } from './astralArchive';

export type ChronoRebirthTierId =
  | 'apprentice_warp'
  | 'astral_warp'
  | 'primordial_warp'
  | 'singularity_rebirth';

export interface ChronoRebirthTierDef {
  id: ChronoRebirthTierId;
  nameKR: string;
  hanja: string;
  icon: string;
  minMasteryRank: number;
  startingLevel: number;
  startingGold: number;
  dropRateMultiplier: number;
  chronoEssenceReward: number;
  description: string;
}

export const CHRONO_REBIRTH_TIERS: ChronoRebirthTierDef[] = [
  {
    id: 'singularity_rebirth',
    nameKR: '특이점 대환생',
    hanja: '特異點大轉生',
    icon: '👑',
    minMasteryRank: 16,
    startingLevel: 200,
    startingGold: 100_000_000,
    dropRateMultiplier: 2.0,
    chronoEssenceReward: 5,
    description: '아카이브 16대 위업을 모두 달성한 초월자. 200레벨, 1억 골드, 2배 드랍률로 환생합니다.',
  },
  {
    id: 'primordial_warp',
    nameKR: '원초의 시공 도약',
    hanja: '原初時空跳躍',
    icon: '🌌',
    minMasteryRank: 12,
    startingLevel: 150,
    startingGold: 40_000_000,
    dropRateMultiplier: 1.5,
    chronoEssenceReward: 3,
    description: '원초의 정점에 오른 영웅. 150레벨, 4천만 골드, 1.5배 드랍률로 환생합니다.',
  },
  {
    id: 'astral_warp',
    nameKR: '성간의 시공 도약',
    hanja: '星間時空跳躍',
    icon: '⚡',
    minMasteryRank: 8,
    startingLevel: 100,
    startingGold: 15_000_000,
    dropRateMultiplier: 1.25,
    chronoEssenceReward: 2,
    description: '성간의 법칙을 터득한 영웅. 100레벨, 1,500만 골드, 1.25배 드랍률로 환생합니다.',
  },
  {
    id: 'apprentice_warp',
    nameKR: '견습의 시공 도약',
    hanja: '見習時空跳躍',
    icon: '🌱',
    minMasteryRank: 4,
    startingLevel: 50,
    startingGold: 5_000_000,
    dropRateMultiplier: 1.1,
    chronoEssenceReward: 1,
    description: '시련의 문턱을 넘어선 도전자. 50레벨, 500만 골드, 1.1배 드랍률로 환생합니다.',
  },
];

export interface RebirthEligibility {
  eligible: boolean;
  reason?: string;
  tier?: ChronoRebirthTierDef;
}

/**
 * Checks if the player qualifies for Chrono Rebirth and determines the highest tier.
 */
export function checkChronoRebirthEligibility(meta: MetaState): RebirthEligibility {
  const { perks } = evaluateArchiveMastery(meta);
  const matchedTier = CHRONO_REBIRTH_TIERS.find(t => perks.masteryRank >= t.minMasteryRank);

  if (!matchedTier) {
    return {
      eligible: false,
      reason: `환생 자격 미달: 성간 아카이브 마스터리 4랭크 이상 필요 (현재: ${perks.masteryRank}랭크)`,
    };
  }

  return {
    eligible: true,
    tier: matchedTier,
  };
}

export interface ChronoRebirthSummary {
  tier: ChronoRebirthTierDef;
  previousRebirths: number;
  totalRebirths: number;
  startingLevel: number;
  startingGold: number;
  chronoEssenceGained: number;
  totalChronoEssence: number;
  dropRateMultiplier: number;
}

/**
 * Executes Chrono Rebirth, updating MetaState and returning re-initialized RunState.
 */
export function executeChronoRebirth(
  meta: MetaState,
  initialRunStub: RunState
): {
  newMeta: MetaState;
  newRun: RunState;
  summary: ChronoRebirthSummary;
} {
  const check = checkChronoRebirthEligibility(meta);
  if (!check.eligible || !check.tier) {
    throw new Error(check.reason ?? '환생 자격이 충족되지 않았습니다.');
  }

  const tier = check.tier;
  const prevRebirths = (meta as unknown as { totalRebirths?: number }).totalRebirths ?? 0;
  const currentChronoEssence = (meta as unknown as { chronoEssence?: number }).chronoEssence ?? 0;

  const nextRebirths = prevRebirths + 1;
  const nextChronoEssence = currentChronoEssence + tier.chronoEssenceReward;

  const newMeta: MetaState = {
    ...meta,
    totalRebirths: nextRebirths,
    chronoEssence: nextChronoEssence,
    activeRebirthTier: tier.id,
  } as any;

  const newRun: RunState = {
    ...initialRunStub,
    goldThisRun: tier.startingGold,
    level: tier.startingLevel,
  };

  const summary: ChronoRebirthSummary = {
    tier,
    previousRebirths: prevRebirths,
    totalRebirths: nextRebirths,
    startingLevel: tier.startingLevel,
    startingGold: tier.startingGold,
    chronoEssenceGained: tier.chronoEssenceReward,
    totalChronoEssence: nextChronoEssence,
    dropRateMultiplier: tier.dropRateMultiplier,
  };

  return {
    newMeta,
    newRun,
    summary,
  };
}
