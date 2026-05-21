/**
 * Sim-G — V1a inflation curve parametric exponents.
 *
 * All level-dependent stat formulas live here so balance tuning touches one
 * file. See docs/superpowers/reports/2026-05-21-sim-g-v1a-report.md for
 * methodology, success bar, and tuning round history.
 */

export const CURVE = {
  k_atk:   1.0, // hero.atk = atkBase * lv^k_atk
  k_hp:    0.7, // hero.hpMax = hpBase * lv^k_hp
  k_eHp:   1.0, // enemy.hp = baseHp * lv^k_eHp
  k_eAtk:  0.8, // enemy.atk = baseAtk * lv^k_eAtk
  k_gain:  1.8, // expGain = baseGain * lv^k_gain
  k_req:   1.2, // expReq = baseReq * lv^k_req
} as const;

export function heroAtkAtLevel(atkBase: number, level: number): number {
  return Math.max(1, Math.floor(atkBase * Math.pow(level, CURVE.k_atk)));
}

export function heroHpMaxAtLevel(hpBase: number, level: number): number {
  return Math.max(1, Math.floor(hpBase * Math.pow(level, CURVE.k_hp)));
}

export function enemyHpAtLevel(baseHp: number, level: number, bossMul: number): number {
  return Math.max(1, Math.floor(baseHp * Math.pow(level, CURVE.k_eHp) * bossMul));
}

export function enemyAtkAtLevel(baseAtk: number, level: number, bossMul: number): number {
  return Math.max(1, Math.floor(baseAtk * Math.pow(level, CURVE.k_eAtk) * bossMul));
}

export function expGainForKill(baseGain: number, level: number): number {
  return Math.max(1, Math.floor(baseGain * Math.pow(level, CURVE.k_gain)));
}

export function expRequiredForLevel(baseReq: number, level: number): number {
  return Math.max(1, Math.floor(baseReq * Math.pow(level, CURVE.k_req)));
}
