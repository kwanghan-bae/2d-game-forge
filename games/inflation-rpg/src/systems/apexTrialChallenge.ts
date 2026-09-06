/**
 * apexTrialChallenge.ts — C1103: Apex Trial Challenge Summit Three-Tier Gauntlet Engine.
 *
 * Implements the highest tier endgame challenge gauntlet for ascended heroes:
 * - Tier 1: 태초의 여명 (Primordial Dawn) — Boss: 태초의 성흔룡
 * - Tier 2: 불멸의 황혼 (Immortal Dusk) — Boss: 불멸의 황혼성황
 * - Tier 3: 무극의 극점 (Apex of Zenith) — Boss: 무극의 창조주
 *
 * Seamlessly integrates Transmuted Celestial Relic powers and Mythic Resonance.
 */

import type { ElementType } from './elementalSystem';
import { computeElementalMultiplier } from './elementalSystem';
import type { HeroEntity } from '../hero/HeroEntity';
import type { TransmutedRelicType } from './celestialRelicTransmutation';
import type { SeededRng } from '../cycle/SeededRng';

export type ApexTrialTier = 1 | 2 | 3;

export interface ApexTrialBossDef {
  tier: ApexTrialTier;
  nameKR: string;
  hanja: string;
  title: string;
  element: ElementType;
  maxHp: number;
  atk: number;
  def: number;
  specialMechanic: string;
  rewards: {
    starlightShards: number;
    crackStones: number;
    gold: number;
    title: string;
  };
}

export const APEX_TRIAL_BOSSES: Record<ApexTrialTier, ApexTrialBossDef> = {
  1: {
    tier: 1,
    nameKR: '태초의 성흔룡',
    hanja: '太初黎明聖痕龍',
    title: '태초의 새벽을 여는 자',
    element: 'fire',
    maxHp: 120_000_000,
    atk: 2_800_000,
    def: 180_000,
    specialMechanic: '1턴에 최대 체력 10%의 여명 폭염을 방출하며, 3턴까지 받는 피해가 25% 경감됩니다.',
    rewards: {
      starlightShards: 150,
      crackStones: 30,
      gold: 1_000_000,
      title: '여명의 개척자',
    },
  },
  2: {
    tier: 2,
    nameKR: '불멸의 황혼성황',
    hanja: '不滅黃昏星皇',
    title: '영원한 일몰의 군주',
    element: 'dark',
    maxHp: 380_000_000,
    atk: 6_200_000,
    def: 350_000,
    specialMechanic: '3턴에 최대 체력 8%를 회복하고, 매 턴 보호막을 무시하는 황혼 침식 지속 피해를 가합니다.',
    rewards: {
      starlightShards: 300,
      crackStones: 60,
      gold: 2_500_000,
      title: '황혼의 정복자',
    },
  },
  3: {
    tier: 3,
    nameKR: '무극의 창조주',
    hanja: '無極天頂創造主',
    title: '차원 우주의 지존',
    element: 'lightning',
    maxHp: 1_000_000_000,
    atk: 12_500_000,
    def: 600_000,
    specialMechanic: '5턴에 무극의 특이점이 폭발하여 공격력이 70% 폭증하고 영웅의 방어율 50%를 관통합니다.',
    rewards: {
      starlightShards: 800,
      crackStones: 150,
      gold: 10_000_000,
      title: '무극의 초월자 (Zenith Transcendent)',
    },
  },
};

export interface ApexUnlockStatus {
  tier: ApexTrialTier;
  unlocked: boolean;
  requirementDescription: string;
}

/**
 * Checks unlock prerequisites for each Apex Trial tier.
 */
export function checkApexTrialUnlock(
  tier: ApexTrialTier,
  riftHighestDepth: number,
  clearedTiers: number[],
  transmutedRelicsCount: number,
  mythicStarsTotal: number
): ApexUnlockStatus {
  if (tier === 1) {
    const unlocked = riftHighestDepth >= 20;
    return {
      tier: 1,
      unlocked,
      requirementDescription: '혼돈의 균열 심도 20 돌파 필요',
    };
  }
  if (tier === 2) {
    const unlocked = clearedTiers.includes(1) && transmutedRelicsCount >= 1;
    return {
      tier: 2,
      unlocked,
      requirementDescription: '1단계 태초의 여명 격파 및 초월 성유물 1개 이상 보유 필요',
    };
  }
  if (tier === 3) {
    const unlocked = clearedTiers.includes(2) && (transmutedRelicsCount >= 4 || mythicStarsTotal >= 15);
    return {
      tier: 3,
      unlocked,
      requirementDescription: '2단계 불멸의 황혼 격파 및 4대 초월 성유물 또는 신화 15성 성운 각성 필요',
    };
  }
  return { tier, unlocked: false, requirementDescription: '알 수 없는 시련' };
}

export interface ApexCombatOptions {
  weaponElement?: ElementType;
  playerDR?: number;
  playerElementalBonus?: number;
  finalDmgMultiplier?: number;
  defPierce?: number;
  transmutedRelics?: TransmutedRelicType[];
  mythicStarsTotal?: number;
  rng?: SeededRng;
}

export interface ApexCombatResult {
  won: boolean;
  tier: ApexTrialTier;
  bossName: string;
  turns: number;
  damageDealt: number;
  damageTaken: number;
  heroRemainingHp: number;
  bossRemainingHp: number;
  mechanicsTriggered: string[];
  relicsTriggered: string[];
  revivedByAntares?: boolean;
  rewards?: ApexTrialBossDef['rewards'];
}

/**
 * Resolves tactical combat for an Apex Trial challenge.
 */
export function resolveApexTrialCombat(
  hero: HeroEntity,
  tier: ApexTrialTier,
  options: ApexCombatOptions = {}
): ApexCombatResult {
  const boss = APEX_TRIAL_BOSSES[tier];
  if (!boss) {
    throw new Error(`Invalid Apex Trial Tier: ${tier}`);
  }

  const {
    weaponElement = 'neutral',
    playerDR = 0,
    playerElementalBonus = 0,
    finalDmgMultiplier = 1.0,
    defPierce = 0,
    transmutedRelics = [],
    mythicStarsTotal = 0,
    rng,
  } = options;

  let heroHp = hero.hpMax;
  let heroShield = 0;
  let bossHp = boss.maxHp;
  let turns = 0;
  let damageDealt = 0;
  let damageTaken = 0;

  const mechanicsTriggered: string[] = [];
  const relicsTriggered: string[] = [];
  let antaresUsed = false;
  let revivedByAntares = false;

  const hasPolaris = transmutedRelics.includes('polaris_celestial_eye');
  const hasSirius = transmutedRelics.includes('sirius_celestial_fang');
  const hasVega = transmutedRelics.includes('vega_celestial_veil');
  const hasAntares = transmutedRelics.includes('antares_celestial_heart');

  // Star Resonance bonuses if mythicStarsTotal >= 15
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
  } else if (mythicStarsTotal >= 5) {
    bonusAtkRatio = 0.10;
    bonusDR = 0.05;
  }

  const totalDR = Math.min(0.90, playerDR + bonusDR);
  const totalPierce = Math.min(0.90, defPierce + bonusPierce);
  const totalFinalMul = finalDmgMultiplier * bonusFinalMul;
  const effectiveHeroAtkBase = Math.floor(hero.atk * (1 + bonusAtkRatio));

  // Turn 1 Pre-combat relic triggers
  if (hasSirius) {
    // 10% Max HP True Damage
    const bleedDmg = Math.floor(boss.maxHp * 0.10);
    bossHp -= bleedDmg;
    damageDealt += bleedDmg;
    relicsTriggered.push('멸겁의 천랑아: 멸겁의 열상 (10% 즉사급 피해)');
  }

  if (hasVega) {
    // 15% Max HP Shield
    heroShield = Math.floor(hero.hpMax * 0.15);
    relicsTriggered.push('영원의 직녀라: 영원의 성막 전개');
  }

  const MAX_TURNS = 60;

  while (heroHp > 0 && bossHp > 0 && turns < MAX_TURNS) {
    turns++;

    // Boss Mechanics: Beginning of Turn
    let bossDmgReduction = 0;

    if (tier === 1) {
      if (turns === 1) {
        // Solar flare: 10% hero max HP
        const flareDmg = Math.floor(hero.hpMax * 0.10);
        heroHp -= flareDmg;
        damageTaken += flareDmg;
        mechanicsTriggered.push('태초의 성흔룡: 여명의 폭염');
      }
      if (turns <= 3) {
        bossDmgReduction = 0.25;
      }
    } else if (tier === 2) {
      if (turns === 3) {
        // Heals 8% max HP
        const healAmt = Math.floor(boss.maxHp * 0.08);
        bossHp = Math.min(boss.maxHp, bossHp + healAmt);
        mechanicsTriggered.push('불멸의 황혼성황: 황혼의 일식 회복');
      }
      if (turns >= 3) {
        // Dusk Erosion damage
        if (hasVega) {
          if (!mechanicsTriggered.includes('영원의 직녀라: 황혼 침식 면역')) {
            mechanicsTriggered.push('영원의 직녀라: 황혼 침식 면역');
          }
        } else {
          const erosionDmg = Math.floor(boss.atk * 0.15);
          heroHp -= erosionDmg;
          damageTaken += erosionDmg;
          mechanicsTriggered.push('불멸의 황혼성황: 황혼 침식 지속 피해');
        }
      }
    }

    if (heroHp <= 0) {
      // Check Antares revive
      if (hasAntares && !antaresUsed) {
        heroHp = Math.floor(hero.hpMax * 0.50);
        antaresUsed = true;
        revivedByAntares = true;
        relicsTriggered.push('불멸의 대화심: 불사조의 환생 발동');
      } else {
        break;
      }
    }

    // Hero Turn Attack
    const elementMul = computeElementalMultiplier(weaponElement, boss.element);
    const effectiveElementMul =
      elementMul > 1.0 ? elementMul * (1 + playerElementalBonus) : elementMul;

    let polarisTriggered = false;
    let polarisMultiplier = 1.0;

    if (hasPolaris && elementMul > 1.0) {
      const rolled = rng ? rng.random() < 0.30 : turns % 3 === 1;
      if (rolled) {
        polarisMultiplier = 3.0; // +200% burst
        polarisTriggered = true;
        if (!relicsTriggered.includes('태초의 북극성안: 태초의 직관 절대 극딜')) {
          relicsTriggered.push('태초의 북극성안: 태초의 직관 절대 극딜');
        }
      }
    }

    const effectiveBossDef = Math.floor(boss.def * (1 - totalPierce));
    const effectiveHeroAtk = Math.max(1, effectiveHeroAtkBase - effectiveBossDef);

    let heroTurnDmg = Math.floor(
      effectiveHeroAtk * effectiveElementMul * polarisMultiplier * totalFinalMul
    );

    if (bossDmgReduction > 0) {
      heroTurnDmg = Math.floor(heroTurnDmg * (1 - bossDmgReduction));
    }

    bossHp -= heroTurnDmg;
    damageDealt += heroTurnDmg;

    if (bossHp <= 0) break;

    // Boss Counter-Attack
    let bossAtk = boss.atk;
    let currentBossDRPenetration = 0;

    if (tier === 3 && turns >= 5) {
      bossAtk = Math.floor(bossAtk * 1.70);
      currentBossDRPenetration = 0.50; // ignores 50% DR
      if (!mechanicsTriggered.includes('무극의 창조주: 무극의 특이점 폭발')) {
        mechanicsTriggered.push('무극의 창조주: 무극의 특이점 폭발');
      }
    }

    const effectiveDR = Math.max(0, totalDR * (1 - currentBossDRPenetration));
    let bossDamage = Math.max(1, Math.floor(bossAtk * (1 - effectiveDR)));

    // Damage absorbed by shield first
    if (heroShield > 0) {
      if (heroShield >= bossDamage) {
        heroShield -= bossDamage;
        bossDamage = 0;
      } else {
        bossDamage -= heroShield;
        heroShield = 0;
      }
    }

    heroHp -= bossDamage;
    damageTaken += bossDamage;

    // Check Antares revive upon fatal strike
    if (heroHp <= 0) {
      if (hasAntares && !antaresUsed) {
        heroHp = Math.floor(hero.hpMax * 0.50);
        antaresUsed = true;
        revivedByAntares = true;
        relicsTriggered.push('불멸의 대화심: 불사조의 환생 발동');
      }
    }
  }

  const won = bossHp <= 0 && heroHp > 0;

  return {
    won,
    tier,
    bossName: boss.nameKR,
    turns,
    damageDealt,
    damageTaken,
    heroRemainingHp: Math.max(0, heroHp),
    bossRemainingHp: Math.max(0, bossHp),
    mechanicsTriggered,
    relicsTriggered,
    revivedByAntares,
    rewards: won ? boss.rewards : undefined,
  };
}
