/**
 * endlessChaosRift.ts — C1079: Endless Procedural Chaos Rift Dungeon Engine.
 *
 * Implements an infinite procedural dungeon scaling exponentially with depth (1 ~ ∞):
 * - Procedural guardian generator with dynamic elemental affinities.
 * - Exponential HP/ATK/DEF stat inflation.
 * - Progressive Starlight Shards, Dimensional Crack Stones, and Gold drops.
 * - Seamless integration with Tier 9 Celestial Awakening final damage multipliers.
 */

import type { ElementType } from './elementalSystem';
import { computeElementalMultiplier } from './elementalSystem';
import type { HeroEntity } from '../hero/HeroEntity';

export interface RiftGuardianDef {
  depth: number;
  name: string;
  element: ElementType;
  maxHp: number;
  atk: number;
  def: number;
  rewards: {
    shards: number;
    crackStones: number;
    gold: number;
  };
}

export interface RiftCombatResult {
  cleared: boolean;
  depth: number;
  monsterName: string;
  element: ElementType;
  turns: number;
  damageDealt: number;
  damageTaken: number;
  heroRemainingHp: number;
  rewards?: {
    shards: number;
    crackStones: number;
    gold: number;
  };
}

export interface RiftExpeditionResult {
  startDepth: number;
  highestDepthCleared: number;
  totalDepthsCleared: number;
  totalTurns: number;
  totalDamageTaken: number;
  heroFinalHp: number;
  totalRewards: {
    shards: number;
    crackStones: number;
    gold: number;
  };
  battleLog: RiftCombatResult[];
}

const RIFT_NAME_PREFIXES = [
  '혼돈의',
  '차원의',
  '심연의',
  '겁화의',
  '뇌전의',
  '혹한의',
  '태초의',
  '무극의',
];

const RIFT_NAME_SUFFIXES = [
  '침식마수',
  '수호거신',
  '파멸사도',
  '환영군주',
  '심판괴수',
  '혼원지배자',
  '멸망패왕',
];

const RIFT_ELEMENTS: readonly ElementType[] = ['fire', 'water', 'lightning', 'dark'];

/**
 * Procedurally generates a rift guardian for a specific depth.
 */
export function generateRiftGuardian(depth: number): RiftGuardianDef {
  const safeDepth = Math.max(1, depth);

  // Deterministic procedural name & element based on depth
  const prefixIdx = (safeDepth * 7) % RIFT_NAME_PREFIXES.length;
  const suffixIdx = (safeDepth * 13) % RIFT_NAME_SUFFIXES.length;
  const element = RIFT_ELEMENTS[(safeDepth - 1) % RIFT_ELEMENTS.length];
  const name = `[심도 ${safeDepth}층] ${RIFT_NAME_PREFIXES[prefixIdx]} ${RIFT_NAME_SUFFIXES[suffixIdx]}`;

  // Exponential inflation formulas
  const maxHp = Math.floor(1000000 * Math.pow(1.15, safeDepth - 1));
  const atk = Math.floor(50000 * Math.pow(1.12, safeDepth - 1));
  const def = Math.floor(10000 * Math.pow(1.10, safeDepth - 1));

  // Progressive rewards
  const shards = 10 + Math.floor(safeDepth * 3);
  const crackStones = 1 + Math.floor(safeDepth / 2);
  const gold = 50000 * safeDepth;

  return {
    depth: safeDepth,
    name,
    element,
    maxHp,
    atk,
    def,
    rewards: { shards, crackStones, gold },
  };
}

/**
 * Resolves turn-based combat for a single rift depth.
 */
export function resolveRiftCombat(
  hero: HeroEntity,
  currentHp: number,
  depth: number,
  playerElement: ElementType = 'neutral',
  playerDR: number = 0,
  playerElementalBonus: number = 0,
  finalDmgMultiplier: number = 1.0,
): RiftCombatResult {
  const guardian = generateRiftGuardian(depth);

  let heroHp = currentHp;
  let bossHp = guardian.maxHp;
  let turns = 0;
  let damageDealt = 0;
  let damageTaken = 0;

  const elementMul = computeElementalMultiplier(playerElement, guardian.element);
  const effectiveElementMul =
    elementMul > 1.0 ? elementMul * (1 + playerElementalBonus) : elementMul;

  const effectiveHeroAtk = Math.max(1, hero.atk - guardian.def);
  const heroTurnDamage = Math.floor(effectiveHeroAtk * effectiveElementMul * finalDmgMultiplier);

  const effectiveBossAtk = Math.max(100, guardian.atk - (hero.def ?? 0));
  const effectiveBossDamage = Math.max(1, Math.floor(effectiveBossAtk * (1 - Math.min(0.90, playerDR))));

  const MAX_TURNS = 100;

  while (heroHp > 0 && bossHp > 0 && turns < MAX_TURNS) {
    turns++;

    // Hero attacks first
    bossHp -= heroTurnDamage;
    damageDealt += heroTurnDamage;

    if (bossHp <= 0) break;

    // Guardian counters
    heroHp -= effectiveBossDamage;
    damageTaken += effectiveBossDamage;
  }

  const cleared = bossHp <= 0 && heroHp > 0;

  return {
    cleared,
    depth,
    monsterName: guardian.name,
    element: guardian.element,
    turns,
    damageDealt,
    damageTaken,
    heroRemainingHp: Math.max(0, heroHp),
    rewards: cleared ? { ...guardian.rewards } : undefined,
  };
}

/**
 * Simulates a continuous multi-depth expedition into the Chaos Rift.
 */
export function exploreChaosRift(
  hero: HeroEntity,
  startDepth: number = 1,
  maxDepthsToClimb: number = 10,
  playerElement: ElementType = 'neutral',
  playerDR: number = 0,
  playerElementalBonus: number = 0,
  finalDmgMultiplier: number = 1.0,
  healPercentBetweenDepths: number = 0.10,
): RiftExpeditionResult {
  let currentHp = hero.hpMax;
  let currentDepth = startDepth;
  let totalTurns = 0;
  let totalDamageTaken = 0;
  let totalDepthsCleared = 0;
  let highestDepthCleared = startDepth - 1;
  const battleLog: RiftCombatResult[] = [];
  const totalRewards = { shards: 0, crackStones: 0, gold: 0 };

  for (let i = 0; i < maxDepthsToClimb; i++) {
    const res = resolveRiftCombat(
      hero,
      currentHp,
      currentDepth,
      playerElement,
      playerDR,
      playerElementalBonus,
      finalDmgMultiplier,
    );

    battleLog.push(res);
    totalTurns += res.turns;
    totalDamageTaken += res.damageTaken;

    if (!res.cleared) {
      return {
        startDepth,
        highestDepthCleared,
        totalDepthsCleared,
        totalTurns,
        totalDamageTaken,
        heroFinalHp: res.heroRemainingHp,
        totalRewards,
        battleLog,
      };
    }

    // Success
    totalDepthsCleared++;
    highestDepthCleared = currentDepth;

    if (res.rewards) {
      totalRewards.shards += res.rewards.shards;
      totalRewards.crackStones += res.rewards.crackStones;
      totalRewards.gold += res.rewards.gold;
    }

    // Recover small HP between depths
    currentHp = Math.min(
      hero.hpMax,
      res.heroRemainingHp + Math.floor(hero.hpMax * healPercentBetweenDepths),
    );
    currentDepth++;
  }

  return {
    startDepth,
    highestDepthCleared,
    totalDepthsCleared,
    totalTurns,
    totalDamageTaken,
    heroFinalHp: battleLog[battleLog.length - 1].heroRemainingHp,
    totalRewards,
    battleLog,
  };
}
