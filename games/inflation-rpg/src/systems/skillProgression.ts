import type { SkillKind } from '../types';

export function skillDmgMul(kind: SkillKind, lv: number): number {
  return 1 + (kind === 'ult' ? 0.15 : 0.05) * lv;
}

export function skillCooldownMul(kind: SkillKind, lv: number): number {
  if (kind === 'base') return 1.0;
  return Math.max(0.4, 1 - 0.005 * lv);
}

export function jpCostToLevel(kind: SkillKind, currentLv: number): number {
  const N = currentLv + 1;
  const base = Math.ceil((N * N) / 2);
  return kind === 'ult' ? base * 3 : base;
}

export function totalSkillLv(
  skillLevels: Record<string, Record<string, number>>,
  charId: string,
): number {
  const lvs = skillLevels[charId];
  if (!lvs) return 0;
  return Object.values(lvs).reduce((sum, n) => sum + n, 0);
}

export function ultSlotsUnlocked(totalLv: number): 0 | 1 | 2 | 3 | 4 {
  if (totalLv >= 1500) return 4;
  if (totalLv >= 500)  return 3;
  if (totalLv >= 200)  return 2;
  if (totalLv >= 50)   return 1;
  return 0;
}
