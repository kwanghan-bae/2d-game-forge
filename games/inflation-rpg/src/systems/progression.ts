import type { IProgressionSystem } from '@forge/core';

export const HARD_MODE_UNLOCK_LEVEL = 100_000;
export const MAX_BASE_ABILITY_LEVEL = 18;

export function isHardModeUnlocked(bestRunLevel: number): boolean {
  return bestRunLevel >= HARD_MODE_UNLOCK_LEVEL;
}

export function calcBaseAbilityMult(level: number): number {
  return 1 + level * 0.05;
}

export function onBossKill(
  bossId: string,
  killed: string[],
  maxLevel: number
): string[] {
  if (killed.includes(bossId) || killed.length >= maxLevel) return killed;
  return [...killed, bossId];
}

export function getBaseAbilityLevel(
  normalKilled: string[],
  hardKilled: string[]
): number {
  return Math.min(MAX_BASE_ABILITY_LEVEL, normalKilled.length + hardKilled.length);
}

export const progressionSystem: IProgressionSystem = {
  isHardModeUnlocked,
  calcBaseAbilityMult,
  onBossKill,
};
