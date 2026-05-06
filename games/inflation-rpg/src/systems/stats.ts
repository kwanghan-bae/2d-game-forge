import type { StatKey, EquipmentInstance, AllocatedStats } from '../types';
import type { IStatSystem } from '@forge/core';
import { getInstanceStats } from './enhance';

export const BASE_STATS: AllocatedStats = { hp: 100, atk: 10, def: 10, agi: 5, luc: 5 };
export const SP_INCREASE: AllocatedStats = { hp: 5, atk: 3, def: 3, agi: 2, luc: 2 };

export function calcRawStat(key: StatKey, allocated: number, charMult: number): number {
  return (BASE_STATS[key] + allocated * SP_INCREASE[key]) * charMult;
}

export function calcEquipmentPercentMult(key: StatKey, equipped: EquipmentInstance[]): number {
  return equipped.reduce((mult, inst) => {
    const stats = getInstanceStats(inst);
    const pct = stats.percent?.[key] ?? 0;
    return mult * (1 + pct / 100);
  }, 1);
}

export function calcEquipmentFlat(key: StatKey, equipped: EquipmentInstance[]): number {
  return equipped.reduce((sum, inst) => {
    const stats = getInstanceStats(inst);
    return sum + (stats.flat?.[key] ?? 0);
  }, 0);
}

export function calcFinalStat(
  key: StatKey,
  allocated: number,
  charMult: number,
  equipped: EquipmentInstance[],
  baseAbilityMult: number,
  charLevelMult = 1,
  ascTierMult = 1,
): number {
  const raw = calcRawStat(key, allocated, charMult);
  const flat = calcEquipmentFlat(key, equipped);
  const pct = calcEquipmentPercentMult(key, equipped);
  return Math.floor((raw + flat) * pct * baseAbilityMult * charLevelMult * ascTierMult);
}

export function calcDamageReduction(def: number): number {
  return def / (def + 500);
}

export function calcCritChance(agi: number, luc: number): number {
  return Math.min(0.95, 0.05 + agi * 0.001 + luc * 0.0005);
}

export const statSystem: IStatSystem = {
  calcFinalStat: (base, spPoints, percentMult, charMult, baseAbilityMult) =>
    Math.floor((base + spPoints) * percentMult * charMult * baseAbilityMult),
  calcDamageReduction,
  calcCritChance,
};
