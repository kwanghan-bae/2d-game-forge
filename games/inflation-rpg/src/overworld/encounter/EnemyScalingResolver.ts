import {
  ENEMY_PRESTIGE_HP_COMPOUND,
  ENEMY_PRESTIGE_HP_CAP,
  ENEMY_PRESTIGE_ATK_COMPOUND,
  ENEMY_PRESTIGE_ATK_CAP,
} from './constants-progression';

export interface EnemyPrestigeScale {
  hpMul: number;
  atkMul: number;
}

export function computeEnemyPrestigeScale(prestigeCount: number): EnemyPrestigeScale {
  const effectivePrestigeHp = Math.min(prestigeCount, ENEMY_PRESTIGE_HP_CAP);
  const effectivePrestigeAtk = Math.min(prestigeCount, ENEMY_PRESTIGE_ATK_CAP);
  return {
    hpMul: Math.pow(ENEMY_PRESTIGE_HP_COMPOUND, effectivePrestigeHp),
    atkMul: Math.pow(ENEMY_PRESTIGE_ATK_COMPOUND, effectivePrestigeAtk),
  };
}
