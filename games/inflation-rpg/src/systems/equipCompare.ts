/**
 * Equipment comparison — generates delta display between current and candidate gear.
 */

export interface StatDiff {
  stat: string;
  current: number;
  candidate: number;
  delta: number;
}

export interface EquipComparison {
  diffs: StatDiff[];
  isUpgrade: boolean;
}

export function compareEquipment(
  currentStats: Record<string, number>,
  candidateStats: Record<string, number>,
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

  return { diffs, isUpgrade: totalDelta > 0 };
}

export function formatDiff(diff: StatDiff): string {
  const sign = diff.delta > 0 ? '+' : '';
  return `${diff.stat}: ${sign}${diff.delta}`;
}
