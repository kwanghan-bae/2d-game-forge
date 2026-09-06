/**
 * paradoxSpiral.ts — C1165: Paradox Spiral Procedural Engine & Modifier Generator.
 *
 * Simulates the endless, procedural deep-space dungeon beyond the event horizon:
 * 1. Infinite procedural floor scaling: Exponentially scaling HP, ATK, and DEF.
 * 2. 4 Paradox Anomalies: Temporal Dilation, Gravity Crush, Matter Inversion, Chronos Bleed.
 * 3. Turn-based combat simulation: Accounts for hero stats, loom perks, regalia effects, and anomalies.
 * 4. Milestone rewards and eligibility verification.
 */

import { HeroEntity } from '../hero/HeroEntity';
import { computeElementalMultiplier, type ElementType } from './elementalSystem';
import { evaluateChronoLoomPerks } from './chronoLoom';
import { evaluateForgedRegaliaPerks } from './omniverseRegalia';
import { applyRegaliaHpBonus, applyRegaliaDefPenetration } from './omniverseRegaliaIntegration';
import type { MetaState } from '../types';

export type ParadoxAnomalyId =
  | 'temporal_dilation'
  | 'gravity_crush'
  | 'matter_inversion'
  | 'chronos_bleed';

export interface ParadoxAnomalyDef {
  id: ParadoxAnomalyId;
  nameKR: string;
  hanja: string;
  icon: string;
  description: string;
}

export const PARADOX_ANOMALIES: Record<ParadoxAnomalyId, ParadoxAnomalyDef> = {
  temporal_dilation: {
    id: 'temporal_dilation',
    nameKR: '시간 지연',
    hanja: '時間遲延',
    icon: '⏳',
    description: '시공간의 왜곡으로 매 턴 적의 공격 속도가 20% 빨라집니다.',
  },
  gravity_crush: {
    id: 'gravity_crush',
    nameKR: '중력 압쇄',
    hanja: '重力壓碎',
    icon: '🪐',
    description: '초중력장이 형성되어 영웅의 피해 흡수 장벽 효율이 50% 감소합니다.',
  },
  matter_inversion: {
    id: 'matter_inversion',
    nameKR: '물질 반전',
    hanja: '物質反轉',
    icon: '🌀',
    description: '차원의 기본 물질이 역전되어 적에게 가하는 원소 피해가 30% 감소합니다.',
  },
  chronos_bleed: {
    id: 'chronos_bleed',
    nameKR: '시공 침식',
    hanja: '時空浸蝕',
    icon: '🩸',
    description: '시공간의 균열로 인해 매 턴 영웅 최대 생명력의 3%에 달하는 침식 피해를 입습니다.',
  },
};

export interface ParadoxGuardian {
  floor: number;
  nameKR: string;
  element: ElementType;
  maxHp: number;
  atk: number;
  def: number;
  anomalies: ParadoxAnomalyId[];
  isMilestoneFloor: boolean;
}

export interface ParadoxCombatTurnLog {
  turn: number;
  heroDamageDealt: number;
  guardianDamageDealt: number;
  bleedDamageTaken: number;
  heroRemainingHp: number;
  guardianRemainingHp: number;
}

export interface ParadoxCombatResult {
  floor: number;
  won: boolean;
  turns: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  guardian: ParadoxGuardian;
  rewards?: {
    goldReward: number;
    paradoxDust: number;
  };
  turnLogs: ParadoxCombatTurnLog[];
}

export interface ParadoxEligibility {
  eligible: boolean;
  reason?: string;
}

/**
 * Checks if the account is eligible to challenge the Paradox Spiral.
 * Requires at least 1 Chrono Rebirth OR at least 1 Pantheon Clear.
 */
export function checkParadoxEligibility(meta: MetaState): ParadoxEligibility {
  const rebirths = (meta as unknown as { totalRebirths?: number }).totalRebirths ?? 0;
  const pantheonClears = (meta as unknown as { pantheonClears?: number }).pantheonClears ?? 0;

  if (rebirths < 1 && pantheonClears < 1) {
    return {
      eligible: false,
      reason: '시공 환생 1회 이상 완료 또는 초월의 만신전 1회 이상 완파가 필요합니다.',
    };
  }

  return { eligible: true };
}

/**
 * Determines active paradox anomalies for a given floor.
 */
export function getAnomaliesForFloor(floor: number): ParadoxAnomalyId[] {
  if (floor <= 5) return [];
  if (floor <= 15) return ['temporal_dilation'];
  if (floor <= 30) return ['temporal_dilation', 'gravity_crush'];
  if (floor <= 50) return ['temporal_dilation', 'gravity_crush', 'matter_inversion'];
  return ['temporal_dilation', 'gravity_crush', 'matter_inversion', 'chronos_bleed'];
}

const GUARDIAN_ELEMENTS: ElementType[] = ['fire', 'water', 'lightning', 'dark', 'neutral'];

/**
 * Generates the Paradox Guardian for a specific floor.
 */
export function generateParadoxGuardian(floor: number): ParadoxGuardian {
  const isMilestoneFloor = floor % 10 === 0;
  const element = GUARDIAN_ELEMENTS[(floor - 1) % GUARDIAN_ELEMENTS.length];

  // Progressive base stats scaling
  // Base HP: 80M at Floor 1, scaling ~1.08x per floor plus linear buffer
  const maxHp = Math.round(
    80_000_000 * Math.pow(1.075, floor - 1) + (floor * 30_000_000)
  );
  const atk = Math.round(
    500_000 * Math.pow(1.06, floor - 1) + (floor * 50_000)
  );
  const def = Math.round(
    30_000 * Math.pow(1.04, floor - 1) + (floor * 5_000)
  );

  let nameKR: string;
  if (isMilestoneFloor) {
    const titles = [
      '초시공의 망령',
      '역설의 방직자',
      '특이점 파괴자',
      '허무의 집행관',
      '차원 왜곡의 군주',
      '크로노스의 환영',
      '영겁의 절대 심판관',
      '특이점의 대악마',
      '차원 붕괴의 태초룡',
      '시공 종언의 주재자',
    ];
    const idx = Math.min(titles.length - 1, Math.floor(floor / 10) - 1);
    nameKR = `[Floor ${floor}] ${titles[idx]}`;
  } else {
    const prefixes = ['왜곡된', '균열의', '역설의', '침식된', '특이점의'];
    const roots = ['망령', '수호수', '골렘', '감시자', '파편'];
    const p = prefixes[(floor * 3) % prefixes.length];
    const r = roots[(floor * 7) % roots.length];
    nameKR = `[Floor ${floor}] ${p} ${r}`;
  }

  return {
    floor,
    nameKR,
    element,
    maxHp,
    atk,
    def,
    anomalies: getAnomaliesForFloor(floor),
    isMilestoneFloor,
  };
}

/**
 * Resolves full turn-based combat for a specific Paradox Spiral floor.
 */
export function resolveParadoxFloorCombat(
  hero: HeroEntity,
  heroWeaponElement: ElementType,
  reforgeDrBonus: number,
  meta: MetaState,
  floor: number
): ParadoxCombatResult {
  const guardian = generateParadoxGuardian(floor);

  // 1. Compute Hero baseline & perks
  const loomPerks = evaluateChronoLoomPerks(meta);
  const regaliaPerks = evaluateForgedRegaliaPerks(meta);

  // Hero HP with Ymir Heart
  const { maxHp: heroMaxHp } = applyRegaliaHpBonus(hero.hpMax, meta);
  let heroCurrentHp = heroMaxHp;

  // Hero ATK with Loom Omni-stat
  const heroAtk = Math.round(hero.atk * (1 + loomPerks.omniStatMultiplierBonus));

  // Guardian effective DEF with Ouroboros Blade
  const guardianDef = applyRegaliaDefPenetration(guardian.def, meta);

  // Elemental multiplier
  let elementalMultiplier = computeElementalMultiplier(heroWeaponElement, guardian.element);
  if (guardian.anomalies.includes('matter_inversion') && heroWeaponElement !== 'neutral') {
    elementalMultiplier *= 0.70; // 30% reduction from Matter Inversion
  }

  // Active Anomalies
  const hasTemporalDilation = guardian.anomalies.includes('temporal_dilation');
  const hasGravityCrush = guardian.anomalies.includes('gravity_crush');
  const hasChronosBleed = guardian.anomalies.includes('chronos_bleed');

  // Flat Barrier with Gravity Crush check
  let effectiveBarrier = regaliaPerks.flatBarrier;
  if (hasGravityCrush) {
    effectiveBarrier = Math.round(effectiveBarrier * 0.50);
  }

  let guardianCurrentHp = guardian.maxHp;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  let turn = 0;
  const MAX_TURNS = 50;

  const turnLogs: ParadoxCombatTurnLog[] = [];

  while (heroCurrentHp > 0 && guardianCurrentHp > 0 && turn < MAX_TURNS) {
    turn++;

    // Hero attacks guardian
    // Base damage mitigation: Dmg = Atk * (1 - Def / (Def + 100,000))
    const defMitigation = guardianDef / (guardianDef + 100_000);
    let heroDmg = Math.round(heroAtk * (1 - defMitigation) * elementalMultiplier);

    // Apply crit (with Nyx Void Eye perk)
    const critBonus = regaliaPerks.critDamageBonus;
    // Simple deterministic crit check based on turn + floor
    const isCrit = ((turn * 17 + floor * 31) % 100) < ((hero.critRateBase + regaliaPerks.critRateBonus) * 100);
    if (isCrit) {
      heroDmg = Math.round(heroDmg * (1.5 + critBonus));
    }

    guardianCurrentHp = Math.max(0, guardianCurrentHp - heroDmg);
    totalDamageDealt += heroDmg;

    let guardianDmg = 0;
    let bleedDmg = 0;

    if (guardianCurrentHp > 0) {
      // Guardian attacks hero
      let rawGuardianDmg = guardian.atk;
      if (hasTemporalDilation) {
        rawGuardianDmg = Math.round(rawGuardianDmg * 1.20);
      }

      // Regalia elemental resistance
      if (regaliaPerks.allElementalResistance > 0 && guardian.element !== 'neutral') {
        rawGuardianDmg = Math.round(rawGuardianDmg * (1 - regaliaPerks.allElementalResistance));
      }

      // Reforge DR & Loom DR
      const totalDr = Math.min(0.85, reforgeDrBonus + loomPerks.damageReduction);
      let mitigatedDmg = Math.round(rawGuardianDmg * (1 - totalDr));

      // Subtract flat barrier
      mitigatedDmg = Math.max(1, mitigatedDmg - effectiveBarrier);
      guardianDmg = mitigatedDmg;

      // Chronos bleed
      if (hasChronosBleed && !regaliaPerks.debuffImmunity) {
        bleedDmg = Math.round(heroMaxHp * 0.03);
      }

      const totalTurnDamage = guardianDmg + bleedDmg;
      heroCurrentHp = Math.max(0, heroCurrentHp - totalTurnDamage);
      totalDamageTaken += totalTurnDamage;
    }

    turnLogs.push({
      turn,
      heroDamageDealt: heroDmg,
      guardianDamageDealt: guardianDmg,
      bleedDamageTaken: bleedDmg,
      heroRemainingHp: heroCurrentHp,
      guardianRemainingHp: guardianCurrentHp,
    });
  }

  const won = guardianCurrentHp <= 0;

  let rewards: { goldReward: number; paradoxDust: number } | undefined;
  if (won) {
    rewards = {
      goldReward: floor * 10_000_000,
      paradoxDust: floor * 10,
    };
  }

  return {
    floor,
    won,
    turns: turn,
    totalDamageDealt,
    totalDamageTaken,
    guardian,
    rewards,
    turnLogs,
  };
}
