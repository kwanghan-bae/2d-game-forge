import {
  ENEMY_PRESTIGE_HP_SCALE,
  ENEMY_PRESTIGE_HP_CAP,
  ENEMY_PRESTIGE_ATK_SCALE,
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
    hpMul: 1 + effectivePrestigeHp * ENEMY_PRESTIGE_HP_SCALE,
    atkMul: 1 + effectivePrestigeAtk * ENEMY_PRESTIGE_ATK_SCALE,
  };
}
