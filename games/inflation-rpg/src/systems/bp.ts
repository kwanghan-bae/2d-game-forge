import type { IBattlePointSystem } from '@forge/core';

export const STARTING_BP = 30;

export function encounterCost(monsterLevel: number): number {
  if (monsterLevel <= 1) return 1;
  return Math.ceil(Math.log10(monsterLevel)) + 1;
}

export function defeatCost(monsterLevel: number): number {
  return 2 * encounterCost(monsterLevel);
}

export function onEncounter(current: number, monsterLevel: number): number {
  return current - encounterCost(monsterLevel);
}

export function onDefeat(current: number, monsterLevel: number, isHard: boolean): number {
  const base = defeatCost(monsterLevel);
  return current - (isHard ? base * 2 : base);
}

export function onBossKill(current: number, reward: number): number {
  return current + reward;
}

export function isRunOver(bp: number): boolean {
  return bp <= 0;
}

// IBattlePointSystem 계약은 @forge/core 가 제공. 현 구현은 단일-게임용이므로
// adapter 만 export 하여 추후 multi-game 시 필요한 경우 활용. monsterLevel 인자가
// 추가되어 인터페이스가 호환되지 않으므로 contract 호환을 위한 legacy fallback
// 만 유지. inflation-rpg 내부에서는 신규 시그니처를 직접 사용.
export const bpSystem: IBattlePointSystem = {
  onEncounter: (current: number) => current - 1,           // legacy fallback
  onDefeat: (current: number, isHard: boolean) =>
    current - (isHard ? 4 : 2),                             // legacy fallback
  onBossKill,
};
