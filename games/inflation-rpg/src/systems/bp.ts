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
