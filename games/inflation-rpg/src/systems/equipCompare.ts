/**
 * Equipment comparison — generates delta display between current and candidate gear.
 */

import type { EquipmentSpecialEffect } from '../types';

export interface StatDiff {
  stat: string;
  current: number;
  candidate: number;
  delta: number;
}

export interface EquipComparison {
  diffs: StatDiff[];
  isUpgrade: boolean;
  effectSummary?: string;
}

export function compareEquipment(
  currentStats: Record<string, number>,
  candidateStats: Record<string, number>,
  candidateEffect?: EquipmentSpecialEffect,
): EquipComparison {
  const allKeys = new Set([...Object.keys(currentStats), ...Object.keys(candidateStats)]);
  const diffs: StatDiff[] = [];
  let totalDelta = 0;

  for (const stat of allKeys) {
    const current = currentStats[stat] ?? 0;
    const candidate = candidateStats[stat] ?? 0;
    const delta = candidate - current;
    if (delta !== 0) {
      diffs.push({ stat, current, candidate, delta });
      totalDelta += delta;
    }
  }

  return {
    diffs,
    isUpgrade: totalDelta > 0,
    effectSummary: candidateEffect ? formatEffectSummary(candidateEffect) : undefined,
  };
}

export function formatDiff(diff: StatDiff): string {
  const sign = diff.delta > 0 ? '+' : '';
  return `${diff.stat}: ${sign}${diff.delta}`;
}

export function formatEffectSummary(effect: EquipmentSpecialEffect): string {
  switch (effect.type) {
    case 'burst_chance': return `폭발확률+${effect.bonus}%`;
    case 'gold_bonus': return `골드+${effect.percent}%`;
    case 'exp_bonus': return `경험치+${effect.percent}%`;
    case 'combo_shield': return `콤보방어 ${effect.threshold}연속`;
  }
}
