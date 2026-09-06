/**
 * ascendantBossRush.ts — C1072: Ascendant Boss Rush 5-Wave Trial Engine.
 *
 * Implements a continuous 5-wave gauntlet against Ascendant Realm Overlords:
 * Wave 1: Ascendant Valkyrie (Neutral)
 * Wave 2: Ascendant Azure Drake (Lightning)
 * Wave 3: Ascendant Vermilion Phoenix (Fire)
 * Wave 4: Ascendant Black Leviathan (Water)
 * Wave 5: Primordial Chaos Sovereign (Dark)
 *
 * Provides progressive Starlight Shards, Dimensional Crack Stones, and Gold payouts.
 */

import type { ElementType } from './elementalSystem';
import { computeElementalMultiplier } from './elementalSystem';
import type { HeroEntity } from '../hero/HeroEntity';

export interface BossRushWaveDef {
  wave: number;
  id: string;
  nameKR: string;
  hanja: string;
  emoji: string;
  element: ElementType;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  rewards: {
    shards: number;
    crackStones: number;
    gold: number;
  };
  introText: string;
}

export const BOSS_RUSH_WAVES: readonly BossRushWaveDef[] = [
  {
    wave: 1,
    id: 'asc_valkyrie',
    nameKR: '승천의 발키리',
    hanja: '昇天戰姬',
    emoji: '⚔️🧝‍♀️',
    element: 'neutral',
    maxHp: 500000,
    atk: 30000,
    def: 5000,
    spd: 90,
    rewards: { shards: 15, crackStones: 2, gold: 20000 },
    introText: '천상의 빛으로 벼려진 창을 든 발키리가 연전의 시작을 알립니다.',
  },
  {
    wave: 2,
    id: 'asc_dragon',
    nameKR: '승천의 청룡',
    hanja: '昇天靑龍',
    emoji: '🐉⚡',
    element: 'lightning',
    maxHp: 1000000,
    atk: 45000,
    def: 8000,
    spd: 95,
    rewards: { shards: 25, crackStones: 3, gold: 35000 },
    introText: '푸른 벼락을 휘감은 청룡이 구름을 가르고 강림합니다.',
  },
  {
    wave: 3,
    id: 'asc_phoenix',
    nameKR: '승천의 주작',
    hanja: '昇天朱雀',
    emoji: '🦅🔥',
    element: 'fire',
    maxHp: 1800000,
    atk: 60000,
    def: 12000,
    spd: 100,
    rewards: { shards: 40, crackStones: 5, gold: 50000 },
    introText: '불멸의 업화로 전장을 뒤덮는 주작의 날갯짓이 작열합니다.',
  },
  {
    wave: 4,
    id: 'asc_leviathan',
    nameKR: '승천의 현무수',
    hanja: '昇天玄武',
    emoji: '🐢💧',
    element: 'water',
    maxHp: 2800000,
    atk: 75000,
    def: 18000,
    spd: 85,
    rewards: { shards: 60, crackStones: 8, gold: 75000 },
    introText: '심연의 혹한과 철벽의 방패를 두른 북방의 지배자가 솟구칩니다.',
  },
  {
    wave: 5,
    id: 'asc_chaos_primordial',
    nameKR: '원초적 혼돈의 패왕',
    hanja: '混元霸王',
    emoji: '👑🌑',
    element: 'dark',
    maxHp: 4500000,
    atk: 95000,
    def: 25000,
    spd: 110,
    rewards: { shards: 100, crackStones: 15, gold: 150000 },
    introText: '삼라만상을 무로 되돌리는 궁극의 혼돈군주가 모습을 드러냅니다!',
  },
];

export const TOTAL_RUSH_WAVES = BOSS_RUSH_WAVES.length;

export const TOTAL_RUSH_REWARDS = BOSS_RUSH_WAVES.reduce(
  (acc, w) => ({
    shards: acc.shards + w.rewards.shards,
    crackStones: acc.crackStones + w.rewards.crackStones,
    gold: acc.gold + w.rewards.gold,
  }),
  { shards: 0, crackStones: 0, gold: 0 },
);

export interface WaveCombatResult {
  wave: number;
  bossName: string;
  cleared: boolean;
  turns: number;
  damageDealt: number;
  damageTaken: number;
  heroRemainingHp: number;
  rewardsGained?: {
    shards: number;
    crackStones: number;
    gold: number;
  };
}

export interface FullRushResult {
  allCleared: boolean;
  wavesCleared: number;
  totalTurns: number;
  totalDamageTaken: number;
  heroFinalHp: number;
  waveResults: WaveCombatResult[];
  totalRewards: {
    shards: number;
    crackStones: number;
    gold: number;
  };
}

/**
 * Resolves combat for a single wave of the Ascendant Boss Rush.
 *
 * @param hero Current hero entity
 * @param startHp Starting HP for this wave
 * @param waveIndex 0-indexed wave number (0 to 4)
 * @param playerElement Hero attack element
 * @param playerDR Damage reduction percentage (e.g. 0.25 for 25% DR)
 * @param playerElementalBonus Elemental damage bonus (e.g. 0.20 for +20%)
 */
export function resolveBossRushWave(
  hero: HeroEntity,
  startHp: number,
  waveIndex: number,
  playerElement: ElementType = 'neutral',
  playerDR: number = 0,
  playerElementalBonus: number = 0,
): WaveCombatResult {
  const boss = BOSS_RUSH_WAVES[waveIndex];
  if (!boss) {
    throw new Error(`Invalid boss rush wave index: ${waveIndex}`);
  }

  let heroHp = startHp;
  let bossHp = boss.maxHp;
  let turns = 0;
  let damageDealt = 0;
  let damageTaken = 0;

  // Hero damage calculation
  const elementMultiplier = computeElementalMultiplier(playerElement, boss.element);
  const effectiveElementMultiplier =
    elementMultiplier > 1.0 ? elementMultiplier * (1 + playerElementalBonus) : elementMultiplier;

  const effectiveHeroAtk = Math.max(1, hero.atk - boss.def);
  const heroTurnDamage = Math.floor(effectiveHeroAtk * effectiveElementMultiplier);

  // Boss damage calculation against hero
  const effectiveBossAtk = Math.max(100, boss.atk - (hero.def ?? 0));
  const effectiveBossDamage = Math.max(1, Math.floor(effectiveBossAtk * (1 - Math.min(0.90, playerDR))));

  const MAX_TURNS = 100;

  while (heroHp > 0 && bossHp > 0 && turns < MAX_TURNS) {
    turns++;

    // Hero attacks boss first (player initiative)
    bossHp -= heroTurnDamage;
    damageDealt += heroTurnDamage;

    if (bossHp <= 0) {
      break;
    }

    // Boss counterattacks
    heroHp -= effectiveBossDamage;
    damageTaken += effectiveBossDamage;
  }

  const cleared = bossHp <= 0 && heroHp > 0;

  return {
    wave: boss.wave,
    bossName: boss.nameKR,
    cleared,
    turns,
    damageDealt,
    damageTaken,
    heroRemainingHp: Math.max(0, heroHp),
    rewardsGained: cleared ? { ...boss.rewards } : undefined,
  };
}

/**
 * Runs the complete 5-wave gauntlet, healing 15% max HP between waves as an Ascendant Spring fountain.
 */
export function runFullBossRush(
  hero: HeroEntity,
  playerElement: ElementType = 'neutral',
  playerDR: number = 0,
  playerElementalBonus: number = 0,
  healPercentBetweenWaves: number = 0.15,
): FullRushResult {
  let currentHp = hero.hpMax;
  const waveResults: WaveCombatResult[] = [];
  let totalTurns = 0;
  let totalDamageTaken = 0;
  const totalRewards = { shards: 0, crackStones: 0, gold: 0 };

  for (let i = 0; i < TOTAL_RUSH_WAVES; i++) {
    const waveRes = resolveBossRushWave(
      hero,
      currentHp,
      i,
      playerElement,
      playerDR,
      playerElementalBonus,
    );

    waveResults.push(waveRes);
    totalTurns += waveRes.turns;
    totalDamageTaken += waveRes.damageTaken;

    if (!waveRes.cleared) {
      return {
        allCleared: false,
        wavesCleared: i,
        totalTurns,
        totalDamageTaken,
        heroFinalHp: waveRes.heroRemainingHp,
        waveResults,
        totalRewards,
      };
    }

    // Accumulate rewards
    if (waveRes.rewardsGained) {
      totalRewards.shards += waveRes.rewardsGained.shards;
      totalRewards.crackStones += waveRes.rewardsGained.crackStones;
      totalRewards.gold += waveRes.rewardsGained.gold;
    }

    // Ascendant Spring recovery between waves
    currentHp = Math.min(
      hero.hpMax,
      waveRes.heroRemainingHp + Math.floor(hero.hpMax * healPercentBetweenWaves),
    );
  }

  return {
    allCleared: true,
    wavesCleared: TOTAL_RUSH_WAVES,
    totalTurns,
    totalDamageTaken,
    heroFinalHp: waveResults[waveResults.length - 1].heroRemainingHp,
    waveResults,
    totalRewards,
  };
}
