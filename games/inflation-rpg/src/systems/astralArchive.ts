/**
 * astralArchive.ts — C1135: Astral Archive Milestone Index & Mastery Perk Engine.
 *
 * Centralizes endgame achievement tracking across:
 * - Ascension Trials (Floor 5, 10)
 * - Endless Chaos Rift (Depth 10, 25, 50)
 * - Apex Trials (Tiers 1, 2, 3)
 * - Cosmic Abyssal Corridor (Sectors 1, 3, 5)
 * - Primordial Constellations (Ranks 6, 12, 18)
 * - Transmuted Relics (2, 4 forged)
 *
 * Provides cumulative Archive Mastery perks (+Gold%, +Exp%, +Omni-Stat%, +Crit Dmg%).
 */

import type { MetaState } from '../types';
import { getPrimordialTotalRanks } from './primordialAscension';

export type ArchiveCategory =
  | 'trials'
  | 'chaos_rift'
  | 'apex_trials'
  | 'corridor'
  | 'primordial'
  | 'relics';

export interface ArchiveMilestoneDef {
  id: string;
  category: ArchiveCategory;
  categoryNameKR: string;
  title: string;
  hanja: string;
  description: string;
  icon: string;
  rewardShards: number;
  isUnlocked: (meta: MetaState) => boolean;
}

export const ARCHIVE_MILESTONES: ArchiveMilestoneDef[] = [
  // 1. Ascension Trials
  {
    id: 'trials_floor_5',
    category: 'trials',
    categoryNameKR: '승천의 시련',
    title: '시련의 도전자',
    hanja: '試煉挑戰者',
    description: '승천의 시련 제5층을 돌파하여 승천의 자격을 증명했습니다.',
    icon: '⚔️',
    rewardShards: 100,
    isUnlocked: meta => (meta.ascensionTrialClearedFloor ?? 0) >= 5,
  },
  {
    id: 'trials_floor_10',
    category: 'trials',
    categoryNameKR: '승천의 시련',
    title: '승천의 군주',
    hanja: '昇天君主',
    description: '승천의 시련 제10층을 완파하여 승천의 탑 최정상에 올랐습니다.',
    icon: '👑',
    rewardShards: 250,
    isUnlocked: meta => (meta.ascensionTrialClearedFloor ?? 0) >= 10,
  },

  // 2. Endless Chaos Rift
  {
    id: 'rift_depth_10',
    category: 'chaos_rift',
    categoryNameKR: '혼돈의 균열',
    title: '균열의 탐색자',
    hanja: '龜裂探索者',
    description: '혼돈의 균열 심도 10층에 도달하여 시공간 왜곡을 극복했습니다.',
    icon: '🌀',
    rewardShards: 120,
    isUnlocked: meta => (meta.highestRiftDepth ?? 0) >= 10,
  },
  {
    id: 'rift_depth_25',
    category: 'chaos_rift',
    categoryNameKR: '혼돈의 균열',
    title: '혼돈의 정복자',
    hanja: '混沌征服者',
    description: '혼돈의 균열 심도 25층에 도달하여 심연의 파동을 제어했습니다.',
    icon: '🔮',
    rewardShards: 250,
    isUnlocked: meta => (meta.highestRiftDepth ?? 0) >= 25,
  },
  {
    id: 'rift_depth_50',
    category: 'chaos_rift',
    categoryNameKR: '혼돈의 균열',
    title: '원초의 지배자',
    hanja: '原初支配者',
    description: '혼돈의 균열 심도 50층 원초적 혼돈의 패왕을 격파했습니다.',
    icon: '🌌',
    rewardShards: 500,
    isUnlocked: meta => (meta.highestRiftDepth ?? 0) >= 50,
  },

  // 3. Apex Trials
  {
    id: 'apex_tier_1',
    category: 'apex_trials',
    categoryNameKR: '초월 시련',
    title: '무극의 도전자',
    hanja: '無極挑戰者',
    description: '초월 시련 제1단계 공허의 파쇄자를 토벌했습니다.',
    icon: '⚡',
    rewardShards: 150,
    isUnlocked: meta => (meta.apexTrialsCleared ?? []).includes(1),
  },
  {
    id: 'apex_tier_2',
    category: 'apex_trials',
    categoryNameKR: '초월 시련',
    title: '황혼의 지배자',
    hanja: '黃昏支配者',
    description: '초월 시련 제2단계 황혼의 종말룡을 토벌했습니다.',
    icon: '🐉',
    rewardShards: 300,
    isUnlocked: meta => (meta.apexTrialsCleared ?? []).includes(2),
  },
  {
    id: 'apex_tier_3',
    category: 'apex_trials',
    categoryNameKR: '초월 시련',
    title: '무극의 극점',
    hanja: '無極極點',
    description: '초월 시련 제3단계 극점의 천신을 격파하여 정상에 등극했습니다.',
    icon: '✨',
    rewardShards: 600,
    isUnlocked: meta => (meta.apexTrialsCleared ?? []).includes(3),
  },

  // 4. Cosmic Abyssal Corridor
  {
    id: 'corridor_sector_1',
    category: 'corridor',
    categoryNameKR: '심연 회랑',
    title: '성운의 잔해 돌파',
    hanja: '星雲殘骸突破',
    description: '우주적 심연 회랑 제1섹터 파수거신을 격파했습니다.',
    icon: '🪐',
    rewardShards: 150,
    isUnlocked: meta => (meta.corridorSectorsCleared ?? []).includes(1),
  },
  {
    id: 'corridor_sector_3',
    category: 'corridor',
    categoryNameKR: '심연 회랑',
    title: '양자 왜곡 돌파',
    hanja: '量子歪曲突破',
    description: '우주적 심연 회랑 제3섹터 양자의 환영사도를 격파했습니다.',
    icon: '🌊',
    rewardShards: 300,
    isUnlocked: meta => (meta.corridorSectorsCleared ?? []).includes(3),
  },
  {
    id: 'corridor_sector_5',
    category: 'corridor',
    categoryNameKR: '심연 회랑',
    title: '태초의 승천자',
    hanja: '太初昇天者',
    description: '20억 HP 종언의 특이점 지배자를 완전 토벌했습니다.',
    icon: '☄️',
    rewardShards: 800,
    isUnlocked: meta => (meta.corridorSectorsCleared ?? []).includes(5),
  },

  // 5. Primordial Constellations
  {
    id: 'primordial_ranks_6',
    category: 'primordial',
    categoryNameKR: '태초 성좌',
    title: '우주적 정렬',
    hanja: '宇宙的整列',
    description: '태초의 4대 성좌 총 6랭크를 개방하여 우주적 정렬에 도달했습니다.',
    icon: '🌱',
    rewardShards: 200,
    isUnlocked: meta => getPrimordialTotalRanks(meta.primordialRanks ?? {}) >= 6,
  },
  {
    id: 'primordial_ranks_12',
    category: 'primordial',
    categoryNameKR: '태초 성좌',
    title: '원초의 정점',
    hanja: '原初頂點',
    description: '태초의 4대 성좌 총 12랭크를 개방하여 원초의 정점에 도달했습니다.',
    icon: '🌿',
    rewardShards: 450,
    isUnlocked: meta => getPrimordialTotalRanks(meta.primordialRanks ?? {}) >= 12,
  },
  {
    id: 'primordial_ranks_18',
    category: 'primordial',
    categoryNameKR: '태초 성좌',
    title: '태초의 지배신',
    hanja: '太初支配神',
    description: '태초의 4대 성좌 18랭크를 전원 완전 개화하여 신격에 올랐습니다.',
    icon: '🌟',
    rewardShards: 1000,
    isUnlocked: meta => getPrimordialTotalRanks(meta.primordialRanks ?? {}) >= 18,
  },

  // 6. Transmuted Relics
  {
    id: 'transmuted_relics_2',
    category: 'relics',
    categoryNameKR: '초월 성유물',
    title: '쌍둥이 성유물',
    hanja: '雙子聖遺物',
    description: '초월 진화 성유물 2종을 제작 완료했습니다.',
    icon: '💎',
    rewardShards: 200,
    isUnlocked: meta => (meta.transmutedRelics ?? []).length >= 2,
  },
  {
    id: 'transmuted_relics_4',
    category: 'relics',
    categoryNameKR: '초월 성유물',
    title: '사방신의 성유물',
    hanja: '四方神聖遺物',
    description: '4종의 초월 성유물을 모두 제작하여 성유물 전당을 완성했습니다.',
    icon: '🏆',
    rewardShards: 500,
    isUnlocked: meta => (meta.transmutedRelics ?? []).length >= 4,
  },
];

export interface ArchiveMasteryPerks {
  totalMilestonesCount: number;
  unlockedCount: number;
  claimedCount: number;
  masteryRank: number;
  goldBonusPercent: number;
  expBonusPercent: number;
  omniStatMultiplier: number;
  critDmgBonusPercent: number;
}

/**
 * Evaluates all archive milestones and computes account-wide mastery perks.
 */
export function evaluateArchiveMastery(meta: MetaState): {
  perks: ArchiveMasteryPerks;
  milestoneStates: Array<{
    def: ArchiveMilestoneDef;
    unlocked: boolean;
    claimed: boolean;
  }>;
} {
  const claimedList = (meta as unknown as { claimedArchiveMilestones?: string[] }).claimedArchiveMilestones ?? [];

  let unlockedCount = 0;
  let claimedCount = 0;

  const milestoneStates = ARCHIVE_MILESTONES.map(def => {
    const unlocked = def.isUnlocked(meta);
    const claimed = claimedList.includes(def.id);
    if (unlocked) unlockedCount++;
    if (claimed) claimedCount++;
    return { def, unlocked, claimed };
  });

  const masteryRank = unlockedCount;
  const goldBonusPercent = masteryRank * 2; // +2% per milestone
  const expBonusPercent = masteryRank * 2; // +2% per milestone
  const omniStatMultiplier = 1.0 + masteryRank * 0.01; // +1% omni-stat per milestone
  const critDmgBonusPercent = masteryRank * 3; // +3% crit dmg per milestone

  return {
    perks: {
      totalMilestonesCount: ARCHIVE_MILESTONES.length,
      unlockedCount,
      claimedCount,
      masteryRank,
      goldBonusPercent,
      expBonusPercent,
      omniStatMultiplier: Math.round(omniStatMultiplier * 100) / 100,
      critDmgBonusPercent,
    },
    milestoneStates,
  };
}
