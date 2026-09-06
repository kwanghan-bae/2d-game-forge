/**
 * chaosRiftBossEncounter.ts — C1097: Chaos Rift Milestone Elite Boss Encounter Engine.
 *
 * Implements special boss encounter mechanics for 10-depth intervals (10, 20, 30, 40, 50):
 * - Depth 10: Rift Aegis Colossus (Generates 20% max HP shield at 50% HP).
 * - Depth 20: Dimensional Erosion Drake (Shifts element to counter player).
 * - Depth 30: Abyssal Doom Sovereign (Berserk phase at <30% HP: ATK +50%).
 * - Depth 40: Primordial Void Ruler (Heals 5% max HP per turn & absorbs 15% damage).
 * - Depth 50: Supreme Sovereign of Primordial Chaos (Turn 10 Doomsday Berserk: ATK +100%).
 */

import type { ElementType } from './elementalSystem';
import { computeElementalMultiplier } from './elementalSystem';
import type { HeroEntity } from '../hero/HeroEntity';
import { generateRiftGuardian } from './endlessChaosRift';

export interface EliteBossPatternDef {
  depth: number;
  nameKR: string;
  hanja: string;
  title: string;
  element: ElementType;
  specialMechanic: string;
}

export const ELITE_BOSS_PATTERNS: Record<number, EliteBossPatternDef> = {
  10: {
    depth: 10,
    nameKR: '혼돈의 균열 수호거신',
    hanja: '混沌裂隙守護巨神',
    title: '차원의 문지기',
    element: 'water',
    specialMechanic: '체력이 50% 이하로 떨어지면 최대 체력의 20%에 달하는 차원 방벽을 전개합니다.',
  },
  20: {
    depth: 20,
    nameKR: '차원의 침식마룡',
    hanja: '次元侵蝕魔龍',
    title: '시공의 포식자',
    element: 'dark',
    specialMechanic: '매 3턴마다 용사의 공격 속성에 유리한 상성으로 속성을 변환합니다.',
  },
  30: {
    depth: 30,
    nameKR: '심연의 파멸군주',
    hanja: '深淵破滅君主',
    title: '암흑의 심판관',
    element: 'fire',
    specialMechanic: '체력 30% 이하 시 피의 광폭화에 돌입하여 공격력이 50% 폭증합니다.',
  },
  40: {
    depth: 40,
    nameKR: '태초의 허무지배자',
    hanja: '太初虛無支配者',
    title: '공허의 섭정',
    element: 'lightning',
    specialMechanic: '매 턴 최대 체력의 5%를 재생하고 용사의 가한 피해 15%를 흡수합니다.',
  },
  50: {
    depth: 50,
    nameKR: '무극의 혼돈패왕',
    hanja: '無極混沌覇王',
    title: '종말의 창조주',
    element: 'dark',
    specialMechanic: '10턴 도달 시 무극의 종말 발동: 공격력 100% 폭증 및 모든 방어를 관통합니다.',
  },
};

/**
 * Checks if given depth has an elite patterned boss.
 */
export function isMilestoneEliteDepth(depth: number): boolean {
  return depth % 10 === 0 && ELITE_BOSS_PATTERNS[depth] != null;
}

/**
 * Returns elite boss pattern for given depth.
 */
export function getEliteBossPattern(depth: number): EliteBossPatternDef | undefined {
  return ELITE_BOSS_PATTERNS[depth];
}

export interface EliteCombatResult {
  won: boolean;
  depth: number;
  bossName: string;
  turns: number;
  damageDealt: number;
  damageTaken: number;
  heroRemainingHp: number;
  bossRemainingHp: number;
  shieldTriggered: boolean;
  berserkTriggered: boolean;
  elementShifts: number;
}

/**
 * Simulates tactical combat with special elite boss patterns.
 */
export function resolveEliteCombat(
  hero: HeroEntity,
  depth: number,
  playerElement: ElementType = 'neutral',
  playerDR: number = 0,
  playerElementalBonus: number = 0,
  finalDmgMultiplier: number = 1.0,
): EliteCombatResult {
  const baseGuardian = generateRiftGuardian(depth);
  const pattern = getEliteBossPattern(depth) ?? {
    depth,
    nameKR: baseGuardian.name,
    hanja: '精銳',
    title: '심연의 정예',
    element: baseGuardian.element,
    specialMechanic: '기본 정예 수호자',
  };

  let heroHp = hero.hpMax;
  let bossHp = baseGuardian.maxHp;
  let bossShield = 0;
  let currentBossElement = pattern.element;
  let turns = 0;
  let damageDealt = 0;
  let damageTaken = 0;

  let shieldTriggered = false;
  let berserkTriggered = false;
  let elementShifts = 0;

  const MAX_TURNS = 100;

  while (heroHp > 0 && bossHp > 0 && turns < MAX_TURNS) {
    turns++;

    // Depth 20 Mechanic: Element shift every 3 turns
    if (depth === 20 && turns % 3 === 0) {
      // Counter player's element
      if (playerElement === 'fire') currentBossElement = 'water';
      else if (playerElement === 'water') currentBossElement = 'lightning';
      else if (playerElement === 'lightning') currentBossElement = 'fire';
      else currentBossElement = 'dark';
      elementShifts++;
    }

    // Depth 40 Mechanic: 5% Max HP Regeneration
    if (depth === 40 && bossHp > 0) {
      bossHp = Math.min(baseGuardian.maxHp, bossHp + Math.floor(baseGuardian.maxHp * 0.05));
    }

    // Hero attacks
    const elementMul = computeElementalMultiplier(playerElement, currentBossElement);
    const effectiveElementMul =
      elementMul > 1.0 ? elementMul * (1 + playerElementalBonus) : elementMul;

    const effectiveHeroAtk = Math.max(1, hero.atk - baseGuardian.def);
    let heroTurnDamage = Math.floor(effectiveHeroAtk * effectiveElementMul * finalDmgMultiplier);

    // Depth 40 Mechanic: 15% Damage absorbed
    if (depth === 40) {
      heroTurnDamage = Math.floor(heroTurnDamage * 0.85);
    }

    // Apply hero damage to shield first, then HP
    if (bossShield > 0) {
      if (bossShield >= heroTurnDamage) {
        bossShield -= heroTurnDamage;
        heroTurnDamage = 0;
      } else {
        heroTurnDamage -= bossShield;
        bossShield = 0;
      }
    }
    bossHp -= heroTurnDamage;
    damageDealt += heroTurnDamage;

    // Check Depth 10 Shield generation at <50% HP
    if (depth === 10 && !shieldTriggered && bossHp <= baseGuardian.maxHp * 0.50 && bossHp > 0) {
      bossShield = Math.floor(baseGuardian.maxHp * 0.20);
      shieldTriggered = true;
    }

    if (bossHp <= 0) break;

    // Boss counters
    let bossAtk = baseGuardian.atk;

    // Depth 30 Mechanic: Berserk at <30% HP (+50% ATK)
    if (depth === 30 && bossHp <= baseGuardian.maxHp * 0.30) {
      bossAtk = Math.floor(bossAtk * 1.50);
      berserkTriggered = true;
    }

    // Depth 50 Mechanic: Turn 10 Doomsday Berserk (+100% ATK)
    if (depth === 50 && turns >= 10) {
      bossAtk = Math.floor(bossAtk * 2.0);
      berserkTriggered = true;
    }

    const effectiveBossAtk = Math.max(100, bossAtk - (hero.def ?? 0));
    const effectiveBossDamage = Math.max(1, Math.floor(effectiveBossAtk * (1 - Math.min(0.90, playerDR))));

    heroHp -= effectiveBossDamage;
    damageTaken += effectiveBossDamage;
  }

  return {
    won: bossHp <= 0 && heroHp > 0,
    depth,
    bossName: pattern.nameKR,
    turns,
    damageDealt,
    damageTaken,
    heroRemainingHp: Math.max(0, heroHp),
    bossRemainingHp: Math.max(0, bossHp),
    shieldTriggered,
    berserkTriggered,
    elementShifts,
  };
}
