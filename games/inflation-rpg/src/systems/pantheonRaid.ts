/**
 * pantheonRaid.ts — C1153: Eternal Pantheon 4-Titan Gauntlet Engine.
 *
 * Implements the sequential apex boss rush of the 4 Cosmic Titans:
 * Phase 1: Ouroboros the Chrono Weaver (500M HP)
 * Phase 2: Ymir the Primordial Colossus (1B HP)
 * Phase 3: Nyx the Void Sovereign (1.5B HP)
 * Phase 4: Aion the Singularity Overlord (2.5B HP)
 * Total Gauntlet: 5.5B HP!
 */

import type { MetaState } from '../types';
import type { ElementType } from './elementalSystem';
import { computeElementalMultiplier } from './elementalSystem';
import type { HeroEntity } from '../hero/HeroEntity';
import { evaluateChronoLoomPerks } from './chronoLoom';
import { applyLoomStatsToHero, applyLoomDamageDampening, checkLoomFatalGuard } from './chronoLoomPerks';

export type PantheonPhase = 1 | 2 | 3 | 4;

export interface PantheonTitanDef {
  phase: PantheonPhase;
  bossId: string;
  nameKR: string;
  titleKR: string;
  icon: string;
  hp: number;
  atk: number;
  def: number;
  element: ElementType;
  phaseModifierDescription: string;
}

export const PANTHEON_TITANS: Record<PantheonPhase, PantheonTitanDef> = {
  1: {
    phase: 1,
    bossId: 'ouroboros_chrono_weaver',
    nameKR: '우로보로스',
    titleKR: '시공의 방직신',
    icon: '⌛',
    hp: 500_000_000,
    atk: 2_500_000,
    def: 1_200_000,
    element: 'water',
    phaseModifierDescription: '매 3턴마다 영웅의 턴 행동 속도를 15% 감속시킵니다.',
  },
  2: {
    phase: 2,
    bossId: 'ymir_primordial_colossus',
    nameKR: '이미르',
    titleKR: '원초의 거신',
    icon: '🗿',
    hp: 1_000_000_000,
    atk: 4_500_000,
    def: 2_800_000,
    element: 'fire',
    phaseModifierDescription: '단단한 대지의 장벽으로 영웅의 통상 피해를 15% 흡수합니다.',
  },
  3: {
    phase: 3,
    bossId: 'nyx_void_sovereign',
    nameKR: '닉스',
    titleKR: '허무의 지배자',
    icon: '🌑',
    hp: 1_500_000_000,
    atk: 7_500_000,
    def: 4_000_000,
    element: 'lightning',
    phaseModifierDescription: '칠흑의 심연 파동으로 영웅의 치명타 확률을 10% 억제합니다.',
  },
  4: {
    phase: 4,
    bossId: 'aion_singularity_overlord',
    nameKR: '아이온',
    titleKR: '특이점 대군주',
    icon: '🌌',
    hp: 2_500_000_000,
    atk: 12_000_000,
    def: 6_500_000,
    element: 'dark',
    phaseModifierDescription: '종말의 특이점 인과율로 모든 피해 흡수 및 반사 10%를 시전합니다.',
  },
};

export const TOTAL_PANTHEON_HP = 5_500_000_000;

export interface PantheonEligibility {
  eligible: boolean;
  reason?: string;
}

/**
 * Checks if player qualifies for Eternal Pantheon.
 * Requires at least 1 Chrono Rebirth OR clearing Abyssal Corridor Sector 5.
 */
export function checkPantheonEligibility(meta: MetaState): PantheonEligibility {
  const rebirths = (meta as unknown as { totalRebirths?: number }).totalRebirths ?? 0;
  const corridorCleared = (meta as unknown as { corridorSectorsCleared?: number[] }).corridorSectorsCleared ?? [];

  const qualified = rebirths >= 1 || corridorCleared.includes(5);

  if (!qualified) {
    return {
      eligible: false,
      reason: '만신전 도전 자격 미달: 시공 환생 1회 이상 완수 또는 심연 회랑 5구역 격파 필요',
    };
  }

  return { eligible: true };
}

export interface PantheonPhaseCombatResult {
  phase: PantheonPhase;
  titan: PantheonTitanDef;
  won: boolean;
  turns: number;
  heroEndHp: number;
  damageDealt: number;
  damageTaken: number;
  elementalMultiplier: number;
  fatalGuardTriggered: boolean;
}

/**
 * Resolves combat against a single Pantheon Titan phase.
 */
export function resolvePantheonPhaseCombat(
  hero: HeroEntity,
  phase: PantheonPhase,
  heroWeaponElement: ElementType,
  armorDrBonus: number,
  meta: MetaState,
  heroStartingHp?: number,
  fatalGuardUsed: boolean = false
): PantheonPhaseCombatResult {
  const titan = PANTHEON_TITANS[phase];
  const elemMult = computeElementalMultiplier(heroWeaponElement, titan.element);

  // Apply Chrono Loom stats
  const heroBaseHp = hero.hpMax;
  const heroBaseAtk = hero.atk;
  const heroBaseDef = Math.round(hero.hpMax * 0.1);

  const loomStats = applyLoomStatsToHero(heroBaseHp, heroBaseAtk, heroBaseDef, meta);
  let currentHeroHp = heroStartingHp !== undefined ? heroStartingHp : loomStats.hp;
  let currentBossHp = titan.hp;

  let turns = 0;
  let damageDealt = 0;
  let damageTaken = 0;
  let guardTriggered = false;

  const maxTurns = 100;

  while (turns < maxTurns && currentHeroHp > 0 && currentBossHp > 0) {
    turns++;

    // Hero Turn
    let rawHeroDmg = Math.max(1, loomStats.atk - Math.floor(titan.def * 0.5)) * elemMult;
    if (phase === 2) rawHeroDmg *= 0.85; // Ymir absorbs 15%
    const finalHeroDmg = Math.round(rawHeroDmg);

    currentBossHp -= finalHeroDmg;
    damageDealt += finalHeroDmg;

    if (currentBossHp <= 0) break;

    // Titan Turn
    let rawBossDmg = Math.max(1, titan.atk - Math.floor(loomStats.def * 0.5));
    // Apply armor DR + Loom damage dampening
    rawBossDmg = Math.round(rawBossDmg * (1 - Math.min(0.5, armorDrBonus)));
    const finalBossDmg = applyLoomDamageDampening(rawBossDmg, meta);

    damageTaken += finalBossDmg;

    // Fatal Guard check
    const guardCheck = checkLoomFatalGuard(
      finalBossDmg,
      currentHeroHp,
      meta,
      fatalGuardUsed || guardTriggered
    );

    currentHeroHp = guardCheck.finalHp;
    if (guardCheck.guardTriggered) {
      guardTriggered = true;
    }
  }

  return {
    phase,
    titan,
    won: currentBossHp <= 0,
    turns,
    heroEndHp: Math.max(0, currentHeroHp),
    damageDealt,
    damageTaken,
    elementalMultiplier: elemMult,
    fatalGuardTriggered: guardTriggered,
  };
}

export interface PantheonFullRaidResult {
  won: boolean;
  phasesCleared: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalTurns: number;
  phaseResults: PantheonPhaseCombatResult[];
  rewards?: {
    pantheonCrests: number;
    goldReward: number;
    titleKR: string;
  };
}

/**
 * Resolves the entire sequential 4-Titan Gauntlet.
 */
export function resolveFullPantheonRaid(
  hero: HeroEntity,
  heroWeaponElement: ElementType,
  armorDrBonus: number,
  meta: MetaState
): PantheonFullRaidResult {
  let heroHp = hero.hpMax;
  let fatalGuardUsed = false;
  let phasesCleared = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  let totalTurns = 0;
  const phaseResults: PantheonPhaseCombatResult[] = [];

  for (let p = 1; p <= 4; p++) {
    const phase = p as PantheonPhase;
    const res = resolvePantheonPhaseCombat(
      hero,
      phase,
      heroWeaponElement,
      armorDrBonus,
      meta,
      heroHp,
      fatalGuardUsed
    );

    phaseResults.push(res);
    totalDamageDealt += res.damageDealt;
    totalDamageTaken += res.damageTaken;
    totalTurns += res.turns;

    if (res.fatalGuardTriggered) {
      fatalGuardUsed = true;
    }

    if (!res.won) {
      return {
        won: false,
        phasesCleared,
        totalDamageDealt,
        totalDamageTaken,
        totalTurns,
        phaseResults,
      };
    }

    phasesCleared++;
    heroHp = res.heroEndHp; // Carry over remaining HP to next phase
  }

  return {
    won: true,
    phasesCleared: 4,
    totalDamageDealt,
    totalDamageTaken,
    totalTurns,
    phaseResults,
    rewards: {
      pantheonCrests: 5,
      goldReward: 500_000_000,
      titleKR: '진 우주 주재신 (True Omniverse Sovereign)',
    },
  };
}
