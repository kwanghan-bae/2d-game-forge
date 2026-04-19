import type { IBattlePointSystem } from '@forge/core';

export const STARTING_BP = 30;

export function onEncounter(current: number): number {
  return current - 1;
}

export function onDefeat(current: number, isHard: boolean): number {
  return current - (isHard ? 4 : 2);
}

export function onBossKill(current: number, reward: number): number {
  return current + reward;
}

export function isRunOver(bp: number): boolean {
  return bp <= 0;
}

export const bpSystem: IBattlePointSystem = {
  onEncounter,
  onDefeat,
  onBossKill,
};
