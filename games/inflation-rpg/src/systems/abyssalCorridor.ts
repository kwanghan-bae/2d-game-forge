/**
 * abyssalCorridor.ts — C1123: Cosmic Abyssal Corridor 5-Sector Engine.
 *
 * Implements the ultimate endgame raid dungeon beyond the deepest Chaos Rift:
 * - 5 Sequential Sectors:
 *   1. nebula_debris: 성운의 잔해 (400M HP, 7M ATK, 350k DEF)
 *   2. dark_shard_zone: 암흑 조각 지대 (700M HP, 10M ATK, 450k DEF)
 *   3. quantum_distortion_sector: 양자 왜곡 구역 (1.1B HP, 13M ATK, 600k DEF)
 *   4. gravity_collapse_core: 중력 붕괴 중심부 (1.5B HP, 16M ATK, 750k DEF)
 *   5. doomsday_singularity_core: 종언의 특이점 코어 (2.0B HP, 20M ATK, 900k DEF)
 *
 * Fully incorporates Astral Resonance, Transmuted Relics, and Mythic Star bonuses.
 */

import type { ElementType } from './elementalSystem';
import { computeElementalMultiplier } from './elementalSystem';
import type { HeroEntity } from '../hero/HeroEntity';
import type { TransmutedRelicType } from './celestialRelicTransmutation';
import type { AstralResonanceState } from './astralResonanceMatrix';
import type { SeededRng } from '../cycle/SeededRng';

export type CorridorSectorId = 1 | 2 | 3 | 4 | 5;

export interface CorridorSectorDef {
  sector: CorridorSectorId;
  nameKR: string;
  hanja: string;
  title: string;
  element: ElementType;
  maxHp: number;
  atk: number;
  def: number;
  environmentalHazard: string;
  rewards: {
    starlightShards: number;
    crackStones: number;
    dimensionalEssence: number;
    gold: number;
    title?: string;
  };
}

export const CORRIDOR_SECTORS: Record<CorridorSectorId, CorridorSectorDef> = {
  1: {
    sector: 1,
    nameKR: '성운의 잔해',
    hanja: '星雲殘骸',
    title: '잔해의 파수거신',
    element: 'fire',
    maxHp: 400_000_000,
    atk: 7_000_000,
    def: 350_000,
    environmentalHazard: '성운의 미립자가 시야를 가려 영웅의 명중률이 10% 감소합니다.',
    rewards: {
      starlightShards: 200,
      crackStones: 40,
      dimensionalEssence: 0,
      gold: 2_000_000,
    },
  },
  2: {
    sector: 2,
    nameKR: '암흑 조각 지대',
    hanja: '暗黑碎片地帶',
    title: '암흑의 파편용',
    element: 'dark',
    maxHp: 700_000_000,
    atk: 10_000_000,
    def: 450_000,
    environmentalHazard: '공허의 침식이 매 2턴마다 최대 체력의 5%에 달하는 지속 피해를 입힙니다.',
    rewards: {
      starlightShards: 350,
      crackStones: 70,
      dimensionalEssence: 0,
      gold: 4_000_000,
    },
  },
  3: {
    sector: 3,
    nameKR: '양자 왜곡 구역',
    hanja: '量子歪曲區域',
    title: '양자의 환영사도',
    element: 'water',
    maxHp: 1_100_000_000,
    atk: 13_000_000,
    def: 600_000,
    environmentalHazard: '수호자가 양자 위상으로 진동하여 물리 공격의 15%를 무효화합니다.',
    rewards: {
      starlightShards: 500,
      crackStones: 100,
      dimensionalEssence: 1,
      gold: 7_000_000,
    },
  },
  4: {
    sector: 4,
    nameKR: '중력 붕괴 중심부',
    hanja: '重力崩壞中心部',
    title: '중력의 파멸군주',
    element: 'lightning',
    maxHp: 1_500_000_000,
    atk: 16_000_000,
    def: 750_000,
    environmentalHazard: '극대 중력장이 영웅의 물리 방어력을 50% 삭감합니다.',
    rewards: {
      starlightShards: 750,
      crackStones: 150,
      dimensionalEssence: 2,
      gold: 10_000_000,
    },
  },
  5: {
    sector: 5,
    nameKR: '종언의 특이점 코어',
    hanja: '終焉特異點核',
    title: '종언의 특이점 지배자',
    element: 'dark',
    maxHp: 2_000_000_000,
    atk: 20_000_000,
    def: 900_000,
    environmentalHazard: '1턴 특이점 붕괴(15% 고정 피해), 5턴 광폭화(+50% ATK), 10턴 절대 종말(+150% ATK).',
    rewards: {
      starlightShards: 1_500,
      crackStones: 300,
      dimensionalEssence: 5,
      gold: 25_000_000,
      title: '태초의 승천자 (Primordial Ascendant)',
    },
  },
};

export interface CorridorUnlockStatus {
  sector: CorridorSectorId;
  unlocked: boolean;
  requirementDescription: string;
}

/**
 * Checks whether a given sector in the Abyssal Corridor is unlocked.
 */
export function checkCorridorUnlock(
  sector: CorridorSectorId,
  clearedApexTiers: number[],
  clearedSectors: number[]
): CorridorUnlockStatus {
  // Sector 1 requires Apex Trial Tier 3 cleared
  if (sector === 1) {
    const unlocked = clearedApexTiers.includes(3);
    return {
      sector: 1,
      unlocked,
      requirementDescription: '초월 시련 3단계(무극의 극점) 격파 필요',
    };
  }

  // Sectors 2~5 require previous sector cleared
  const prev = (sector - 1) as CorridorSectorId;
  const unlocked = clearedSectors.includes(prev);
  return {
    sector,
    unlocked,
    requirementDescription: `${prev}섹터(${CORRIDOR_SECTORS[prev].nameKR}) 돌파 필요`,
  };
}

export interface CorridorCombatOptions {
  weaponElement?: ElementType;
  playerDR?: number;
  playerElementalBonus?: number;
  finalDmgMultiplier?: number;
  defPierce?: number;
  transmutedRelics?: TransmutedRelicType[];
  mythicStarsTotal?: number;
  astralResonance?: AstralResonanceState;
  rng?: SeededRng;
}

export interface CorridorCombatResult {
  won: boolean;
  sector: CorridorSectorId;
  sectorName: string;
  guardianName: string;
  turns: number;
  damageDealt: number;
  damageTaken: number;
  heroRemainingHp: number;
  guardianRemainingHp: number;
  hazardsTriggered: string[];
  relicsTriggered: string[];
  evadedHits: number;
  rewards?: CorridorSectorDef['rewards'];
}

/**
 * Resolves tactical combat for an Abyssal Corridor sector raid.
 */
export function resolveCorridorCombat(
  hero: HeroEntity,
  sector: CorridorSectorId,
  options: CorridorCombatOptions = {}
): CorridorCombatResult {
  const def = CORRIDOR_SECTORS[sector];
  if (!def) {
    throw new Error(`Invalid Corridor Sector: ${sector}`);
  }

  const {
    weaponElement = 'neutral',
    playerDR = 0,
    playerElementalBonus = 0,
    finalDmgMultiplier = 1.0,
    defPierce = 0,
    transmutedRelics = [],
    mythicStarsTotal = 0,
    astralResonance,
    rng,
  } = options;

  let heroHp = hero.hpMax;
  let heroShield = 0;
  let guardianHp = def.maxHp;
  let turns = 0;
  let damageDealt = 0;
  let damageTaken = 0;
  let evadedHits = 0;

  const hazardsTriggered: string[] = [];
  const relicsTriggered: string[] = [];
  let antaresUsed = false;

  const hasPolaris = transmutedRelics.includes('polaris_celestial_eye');
  const hasSirius = transmutedRelics.includes('sirius_celestial_fang');
  const hasVega = transmutedRelics.includes('vega_celestial_veil');
  const hasAntares = transmutedRelics.includes('antares_celestial_heart');

  // Star Resonance bonuses
  let bonusAtkRatio = 0;
  let bonusDR = 0;
  let bonusPierce = 0;
  let bonusFinalMul = 1.0;

  if (mythicStarsTotal >= 15) {
    bonusAtkRatio = 0.25;
    bonusDR = 0.15;
    bonusPierce = 0.30;
    bonusFinalMul = 1.30;
  } else if (mythicStarsTotal >= 10) {
    bonusAtkRatio = 0.15;
    bonusDR = 0.10;
    bonusPierce = 0.15;
  }

  // Astral Resonance additions
  const resOmni = astralResonance ? astralResonance.omniStatMultiplier - 1.0 : 0;
  const resPierce = astralResonance ? astralResonance.defPierceBonus : 0;
  const resFinal = astralResonance ? astralResonance.finalDmgMultiplier : 1.0;
  const resElem = astralResonance ? astralResonance.elementalBonus : 0;
  const resEvasion = astralResonance ? astralResonance.dimensionalEvasionChance : 0;

  const totalDR = Math.min(0.90, playerDR + bonusDR);
  const totalPierce = Math.min(0.90, defPierce + bonusPierce + resPierce);
  const totalFinalMul = finalDmgMultiplier * bonusFinalMul * resFinal;
  const effectiveHeroAtkBase = Math.floor(hero.atk * (1 + bonusAtkRatio + resOmni));

  // Turn 1 pre-combat relic triggers
  if (hasSirius) {
    const bleedDmg = Math.floor(def.maxHp * 0.10);
    guardianHp -= bleedDmg;
    damageDealt += bleedDmg;
    relicsTriggered.push('멸겁의 천랑아: 10% 즉사급 피해');
  }

  if (hasVega) {
    heroShield = Math.floor(hero.hpMax * 0.15);
    relicsTriggered.push('영원의 직녀라: 15% 성막 전개');
  }

  const MAX_TURNS = 70;

  while (heroHp > 0 && guardianHp > 0 && turns < MAX_TURNS) {
    turns++;

    // Sector 5: Turn 1 Singularity Collapse strike
    if (sector === 5 && turns === 1) {
      const collapseDmg = Math.floor(hero.hpMax * 0.15);
      heroHp -= collapseDmg;
      damageTaken += collapseDmg;
      hazardsTriggered.push('종언의 특이점 붕괴 타격');
    }

    // Sector 2: Void Erosion every 2 turns
    if (sector === 2 && turns % 2 === 0) {
      if (hasVega) {
        if (!hazardsTriggered.includes('영원의 직녀라: 공허 침식 면역')) {
          hazardsTriggered.push('영원의 직녀라: 공허 침식 면역');
        }
      } else {
        const erosion = Math.floor(hero.hpMax * 0.05);
        heroHp -= erosion;
        damageTaken += erosion;
        hazardsTriggered.push('공허 침식 지속 피해');
      }
    }

    if (heroHp <= 0) {
      if (hasAntares && !antaresUsed) {
        heroHp = Math.floor(hero.hpMax * 0.50);
        antaresUsed = true;
        relicsTriggered.push('불멸의 대화심: 부활 발동');
      } else {
        break;
      }
    }

    // Hero attack phase
    const elementMul = computeElementalMultiplier(weaponElement, def.element);
    const effectiveElementMul =
      elementMul > 1.0 ? elementMul * (1 + playerElementalBonus + resElem) : elementMul;

    let polarisMultiplier = 1.0;
    if (hasPolaris && elementMul > 1.0) {
      const rolled = rng ? rng.random() < 0.30 : turns % 3 === 1;
      if (rolled) {
        polarisMultiplier = 3.0;
        if (!relicsTriggered.includes('태초의 북극성안: 절대 극딜')) {
          relicsTriggered.push('태초의 북극성안: 절대 극딜');
        }
      }
    }

    const effectiveGuardianDef = Math.floor(def.def * (1 - totalPierce));
    const effectiveHeroAtk = Math.max(1, effectiveHeroAtkBase - effectiveGuardianDef);

    let heroTurnDmg = Math.floor(
      effectiveHeroAtk * effectiveElementMul * polarisMultiplier * totalFinalMul
    );

    // Sector 1 Hazard: 10% miss
    if (sector === 1 && turns % 10 === 0) {
      heroTurnDmg = 0;
      hazardsTriggered.push('성운 먼지 시야 차단 (빗맞음)');
    }

    // Sector 3 Hazard: 15% quantum dodge
    if (sector === 3 && turns % 7 === 0) {
      heroTurnDmg = 0;
      hazardsTriggered.push('양자 위상 무효화 (적 회피)');
    }

    guardianHp -= heroTurnDmg;
    damageDealt += heroTurnDmg;

    if (guardianHp <= 0) break;

    // Guardian attack phase
    let guardianAtk = def.atk;
    let drPenetration = 0;

    // Sector 5 Berserk Mechanics
    if (sector === 5) {
      if (turns >= 10) {
        guardianAtk = Math.floor(guardianAtk * 2.5);
        drPenetration = 0.60;
        if (!hazardsTriggered.includes('종언의 특이점: 절대 종말 모드')) {
          hazardsTriggered.push('종언의 특이점: 절대 종말 모드');
        }
      } else if (turns >= 5) {
        guardianAtk = Math.floor(guardianAtk * 1.5);
        drPenetration = 0.30;
        if (!hazardsTriggered.includes('종언의 특이점: 특이점 광폭화')) {
          hazardsTriggered.push('종언의 특이점: 특이점 광폭화');
        }
      }
    }

    // Check Dimensional Evasion from Astral Resonance
    const rolledEvasion = rng ? rng.random() < resEvasion : resEvasion > 0 && turns % 10 === 5;
    if (rolledEvasion) {
      evadedHits++;
      hazardsTriggered.push('삼위일체 차원 회피 발동 (피해 무효화)');
      continue;
    }

    let effectiveHeroDef = hero.def ?? 0;
    if (sector === 4) {
      // Gravity crush halves hero DEF
      effectiveHeroDef = Math.floor(effectiveHeroDef * 0.50);
      if (!hazardsTriggered.includes('중력 압착 (방어력 50% 삭감)')) {
        hazardsTriggered.push('중력 압착 (방어력 50% 삭감)');
      }
    }

    const effectiveDR = Math.max(0, totalDR * (1 - drPenetration));
    let guardianDmg = Math.max(1, Math.floor((guardianAtk - effectiveHeroDef * 0.1) * (1 - effectiveDR)));

    // Shield absorption
    if (heroShield > 0) {
      if (heroShield >= guardianDmg) {
        heroShield -= guardianDmg;
        guardianDmg = 0;
      } else {
        guardianDmg -= heroShield;
        heroShield = 0;
      }
    }

    heroHp -= guardianDmg;
    damageTaken += guardianDmg;

    if (heroHp <= 0) {
      if (hasAntares && !antaresUsed) {
        heroHp = Math.floor(hero.hpMax * 0.50);
        antaresUsed = true;
        relicsTriggered.push('불멸의 대화심: 부활 발동');
      }
    }
  }

  const won = guardianHp <= 0 && heroHp > 0;

  return {
    won,
    sector,
    sectorName: def.nameKR,
    guardianName: def.title,
    turns,
    damageDealt,
    damageTaken,
    heroRemainingHp: Math.max(0, heroHp),
    guardianRemainingHp: Math.max(0, guardianHp),
    hazardsTriggered,
    relicsTriggered,
    evadedHits,
    rewards: won ? def.rewards : undefined,
  };
}
