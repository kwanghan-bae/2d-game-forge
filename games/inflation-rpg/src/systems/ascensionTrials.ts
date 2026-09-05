/**
 * ascensionTrials.ts — C1043: Ascension Trials (승천의 시련) Boss Rush Engine.
 *
 * Provides a 10-floor endgame gauntlet where heroes test their reforged gear
 * and elemental mastery against sequentially scaling elemental bosses.
 */

import type { ElementType } from './elementalSystem';
import { computeElementalMultiplier, getAffinityRelation } from './elementalSystem';
import type { HeroEntity } from '../hero/HeroEntity';

export interface TrialFloorDef {
  floor: number;
  name: string;
  enemyId: string;
  element: ElementType;
  baseHp: number;
  baseAtk: number;
  rewards: {
    enhanceStones: number;
    gold: number;
    jpBonus: number;
  };
}

export const TRIAL_FLOORS: TrialFloorDef[] = [
  {
    floor: 1,
    name: '화염의 비룡',
    enemyId: 'volcano_drake',
    element: 'fire',
    baseHp: 5000,
    baseAtk: 120,
    rewards: { enhanceStones: 5, gold: 3000, jpBonus: 2 },
  },
  {
    floor: 2,
    name: '심해의 지배자',
    enemyId: 'sea_serpent',
    element: 'water',
    baseHp: 12000,
    baseAtk: 250,
    rewards: { enhanceStones: 8, gold: 6000, jpBonus: 2 },
  },
  {
    floor: 3,
    name: '천둥의 용제',
    enemyId: 'dragon_lord',
    element: 'lightning',
    baseHp: 25000,
    baseAtk: 500,
    rewards: { enhanceStones: 12, gold: 12000, jpBonus: 5 },
  },
  {
    floor: 4,
    name: '심연의 망령',
    enemyId: 'dark_lord',
    element: 'dark',
    baseHp: 50000,
    baseAtk: 900,
    rewards: { enhanceStones: 18, gold: 25000, jpBonus: 5 },
  },
  {
    floor: 5,
    name: '작열의 거신',
    enemyId: 'fire_titan',
    element: 'fire',
    baseHp: 100000,
    baseAtk: 1600,
    rewards: { enhanceStones: 25, gold: 50000, jpBonus: 8 },
  },
  {
    floor: 6,
    name: '빙결의 서리거인',
    enemyId: 'frost_giant',
    element: 'water',
    baseHp: 220000,
    baseAtk: 2800,
    rewards: { enhanceStones: 35, gold: 100000, jpBonus: 10 },
  },
  {
    floor: 7,
    name: '천벌의 뇌조',
    enemyId: 'thunder_bird',
    element: 'lightning',
    baseHp: 450000,
    baseAtk: 4500,
    rewards: { enhanceStones: 50, gold: 200000, jpBonus: 12 },
  },
  {
    floor: 8,
    name: '공허의 추적자',
    enemyId: 'void_horror',
    element: 'dark',
    baseHp: 800000,
    baseAtk: 7000,
    rewards: { enhanceStones: 70, gold: 400000, jpBonus: 15 },
  },
  {
    floor: 9,
    name: '삼원소 융합체',
    enemyId: 'elemental_chimera',
    element: 'fire',
    baseHp: 1500000,
    baseAtk: 11000,
    rewards: { enhanceStones: 100, gold: 800000, jpBonus: 20 },
  },
  {
    floor: 10,
    name: '종언의 패왕',
    enemyId: 'chaos_overlord',
    element: 'dark',
    baseHp: 3000000,
    baseAtk: 18000,
    rewards: { enhanceStones: 150, gold: 1500000, jpBonus: 30 },
  },
];

export const MAX_TRIAL_FLOOR = 10;

export interface TrialCombatResult {
  won: boolean;
  floor: number;
  turns: number;
  heroRemainingHp: number;
  enemyRemainingHp: number;
  damageDealtTotal: number;
  damageTakenTotal: number;
  elementalMultiplier: number;
  affinityRelation: string;
  rewards?: TrialFloorDef['rewards'];
}

/**
 * Returns definition of a trial floor.
 */
export function getTrialFloor(floor: number): TrialFloorDef | null {
  return TRIAL_FLOORS.find(f => f.floor === floor) ?? null;
}

/**
 * Simulates combat on a trial floor between hero and trial boss.
 * Applies elemental multiplier and heroic defense reduction.
 */
export function resolveTrialCombat(
  hero: HeroEntity,
  floor: number,
  weaponElement: ElementType = 'neutral',
  armorDrBonus: number = 0,
): TrialCombatResult {
  const trial = getTrialFloor(floor);
  if (!trial) {
    throw new Error(`Invalid trial floor: ${floor}`);
  }

  const elementalMul = computeElementalMultiplier(weaponElement, trial.element);
  const affinityRelation = getAffinityRelation(weaponElement, trial.element);

  // Effective hero ATK considering element
  const heroAtkPerTurn = Math.max(1, Math.floor(hero.atk * elementalMul));
  // Effective enemy ATK considering armor DR
  const enemyAtkPerTurn = Math.max(1, Math.floor(trial.baseAtk * (1 - Math.min(0.50, armorDrBonus))));

  let heroHp = hero.hp;
  let enemyHp = trial.baseHp;
  let turns = 0;
  let damageDealtTotal = 0;
  let damageTakenTotal = 0;
  const maxTurns = 50;

  while (heroHp > 0 && enemyHp > 0 && turns < maxTurns) {
    turns++;
    // Hero attacks first
    const dmgToEnemy = Math.min(enemyHp, heroAtkPerTurn);
    enemyHp -= dmgToEnemy;
    damageDealtTotal += dmgToEnemy;

    if (enemyHp <= 0) break;

    // Boss counters
    const dmgToHero = Math.min(heroHp, enemyAtkPerTurn);
    heroHp -= dmgToHero;
    damageTakenTotal += dmgToHero;
  }

  const won = enemyHp <= 0 && heroHp > 0;

  return {
    won,
    floor,
    turns,
    heroRemainingHp: heroHp,
    enemyRemainingHp: Math.max(0, enemyHp),
    damageDealtTotal,
    damageTakenTotal,
    elementalMultiplier: elementalMul,
    affinityRelation,
    rewards: won ? trial.rewards : undefined,
  };
}
