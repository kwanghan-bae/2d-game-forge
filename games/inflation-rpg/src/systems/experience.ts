export const SP_PER_LEVEL = 4;

export function expRequired(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.8));
}

export function applyExpGain(
  currentExp: number,
  currentLevel: number,
  gainedExp: number,
  isHard: boolean
): { newLevel: number; newExp: number; spGained: number } {
  let exp = currentExp + gainedExp * (isHard ? 10 : 1);
  let level = currentLevel;
  let spGained = 0;

  while (exp >= expRequired(level)) {
    exp -= expRequired(level);
    level++;
    spGained += SP_PER_LEVEL;
  }

  return { newLevel: level, newExp: exp, spGained };
}
