import type { PostCombatHealResult } from '../overworld/encounter/PostCombatHealCalc';

export interface HealBreakdownEntry {
  source: string;
  amount: number;
  icon: string;
}

const HEAL_SOURCES: Array<{ key: keyof Omit<PostCombatHealResult, 'totalHeal'>; source: string; icon: string }> = [
  { key: 'regenHeal', source: '재생', icon: '💚' },
  { key: 'lifestealHeal', source: '흡혈', icon: '🩸' },
  { key: 'overkillHeal', source: '과살', icon: '⚔️' },
  { key: 'survivalHeal', source: '생존', icon: '🛡️' },
];

export function getHealBreakdown(result: PostCombatHealResult): HealBreakdownEntry[] {
  if (result.totalHeal === 0) return [];

  return HEAL_SOURCES
    .filter(s => result[s.key] > 0)
    .map(s => ({ source: s.source, amount: result[s.key], icon: s.icon }))
    .sort((a, b) => b.amount - a.amount);
}
