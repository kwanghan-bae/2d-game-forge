/**
 * riftRecordStorage.ts — C1084: Endless Chaos Rift Record Storage & Honor Rating Engine.
 *
 * Tracks persistent historical performance metrics across rift expeditions:
 * - Highest depth cleared & total guardians slain.
 * - Cumulative harvest of Starlight Shards, Crack Stones, and Gold.
 * - Global rift honor score calculation & ranking tier assignment.
 */

import type { RiftExpeditionResult, RiftCombatResult } from './endlessChaosRift';
import { getRiftDepthTitle } from '../data/chaosRiftLore';

export interface RiftHistoricalRecord {
  highestDepth: number;
  totalGuardiansDefeated: number;
  totalShardsHarvested: number;
  totalCrackStonesHarvested: number;
  totalGoldHarvested: number;
  expeditionsCount: number;
  lastExpeditionTimestamp?: number;
}

export interface RiftHonorRating {
  score: number;
  grade: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'ZENITH';
  title: string;
  badge: string;
}

/**
 * Creates default empty rift historical record.
 */
export function createInitialRiftRecord(): RiftHistoricalRecord {
  return {
    highestDepth: 0,
    totalGuardiansDefeated: 0,
    totalShardsHarvested: 0,
    totalCrackStonesHarvested: 0,
    totalGoldHarvested: 0,
    expeditionsCount: 0,
  };
}

/**
 * Updates historical record from a single depth clear.
 */
export function updateRiftRecordOnClear(
  current: RiftHistoricalRecord,
  combatResult: RiftCombatResult,
): RiftHistoricalRecord {
  if (!combatResult.cleared) return { ...current };

  const rewards = combatResult.rewards ?? { shards: 0, crackStones: 0, gold: 0 };
  return {
    highestDepth: Math.max(current.highestDepth, combatResult.depth),
    totalGuardiansDefeated: current.totalGuardiansDefeated + 1,
    totalShardsHarvested: current.totalShardsHarvested + rewards.shards,
    totalCrackStonesHarvested: current.totalCrackStonesHarvested + rewards.crackStones,
    totalGoldHarvested: current.totalGoldHarvested + rewards.gold,
    expeditionsCount: current.expeditionsCount,
    lastExpeditionTimestamp: Date.now(),
  };
}

/**
 * Updates historical record from an entire multi-depth expedition.
 */
export function updateRiftRecordOnExpedition(
  current: RiftHistoricalRecord,
  expeditionResult: RiftExpeditionResult,
): RiftHistoricalRecord {
  return {
    highestDepth: Math.max(current.highestDepth, expeditionResult.highestDepthCleared),
    totalGuardiansDefeated: current.totalGuardiansDefeated + expeditionResult.totalDepthsCleared,
    totalShardsHarvested: current.totalShardsHarvested + expeditionResult.totalRewards.shards,
    totalCrackStonesHarvested:
      current.totalCrackStonesHarvested + expeditionResult.totalRewards.crackStones,
    totalGoldHarvested: current.totalGoldHarvested + expeditionResult.totalRewards.gold,
    expeditionsCount: current.expeditionsCount + 1,
    lastExpeditionTimestamp: Date.now(),
  };
}

/**
 * Computes composite honor score, letter grade, and title for the Hall of Fame.
 */
export function computeRiftHonorRating(record: RiftHistoricalRecord): RiftHonorRating {
  // Score formula:
  // Depth * 100 + SlayCount * 15 + Stones * 5 + Shards * 1
  const score =
    record.highestDepth * 100 +
    record.totalGuardiansDefeated * 15 +
    record.totalCrackStonesHarvested * 5 +
    record.totalShardsHarvested * 1;

  const title = getRiftDepthTitle(record.highestDepth);

  if (record.highestDepth >= 50 || score >= 10000) {
    return { score, grade: 'ZENITH', title, badge: '👑🌌' };
  }
  if (record.highestDepth >= 30 || score >= 5000) {
    return { score, grade: 'SSS', title, badge: '🔱✨' };
  }
  if (record.highestDepth >= 20 || score >= 3000) {
    return { score, grade: 'SS', title, badge: '⚡⚔️' };
  }
  if (record.highestDepth >= 15 || score >= 1800) {
    return { score, grade: 'S', title, badge: '🌟🔥' };
  }
  if (record.highestDepth >= 10 || score >= 1000) {
    return { score, grade: 'A', title, badge: '🌀🛡️' };
  }
  if (record.highestDepth >= 5 || score >= 500) {
    return { score, grade: 'B', title, badge: '🗡️' };
  }
  if (record.highestDepth >= 1 || score >= 100) {
    return { score, grade: 'C', title, badge: '🌱' };
  }

  return { score, grade: 'D', title: '미답의 방랑자', badge: '🌫️' };
}
