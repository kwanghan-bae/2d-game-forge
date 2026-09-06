/**
 * omniverseRegalia.ts — C1159: Omniverse Regalia Catalog & Crest Forging Engine.
 *
 * Provides the apex Divine Regalia forged from Pantheon Crests (5 crests each):
 * 1. ouroboros_chrono_blade: Weapon — 30% DEF penetration.
 * 2. ymir_primordial_heart: Armor — +100M HP & 500k flat barrier.
 * 3. nyx_void_eye: Accessory — +25% Crit Rate & +100% Crit Damage.
 * 4. aion_singularity_aegis: Accessory — Debuff immunity & +20% all elemental resistance.
 */

import type { MetaState } from '../types';

export type OmniverseRegaliaId =
  | 'ouroboros_chrono_blade'
  | 'ymir_primordial_heart'
  | 'nyx_void_eye'
  | 'aion_singularity_aegis';

export interface OmniverseRegaliaDef {
  id: OmniverseRegaliaId;
  nameKR: string;
  hanja: string;
  slot: 'weapon' | 'armor' | 'accessory';
  icon: string;
  cost: number;
  description: string;
  perkSummaryKR: string;
}

export const OMNIVERSE_REGALIA_CATALOG: Record<OmniverseRegaliaId, OmniverseRegaliaDef> = {
  ouroboros_chrono_blade: {
    id: 'ouroboros_chrono_blade',
    nameKR: '시공 방직신의 세검',
    hanja: '時空織神細劍',
    slot: 'weapon',
    icon: '🗡️',
    cost: 5,
    description: '시간의 흐름을 베어내는 신검. 적의 방어력을 30% 무시하고 관통 피해를 입힙니다.',
    perkSummaryKR: '방어력 관통 +30%',
  },
  ymir_primordial_heart: {
    id: 'ymir_primordial_heart',
    nameKR: '원초 거신의 심장',
    hanja: '原初巨神之心',
    slot: 'armor',
    icon: '🫀',
    cost: 5,
    description: '우주를 지탱하는 태고의 맥박. 영웅의 최대 생명력을 1억 증가시키고 50만 고정 피해 장벽을 부여합니다.',
    perkSummaryKR: '최대 HP +1억, 고정 장벽 +50만',
  },
  nyx_void_eye: {
    id: 'nyx_void_eye',
    nameKR: '허무 주재자의 진안',
    hanja: '虛無主宰真眼',
    slot: 'accessory',
    icon: '👁️',
    cost: 5,
    description: '차원의 허무를 꿰뚫어보는 신안. 치명타 확률을 25%, 치명타 피해량을 100% 증폭합니다.',
    perkSummaryKR: '치명타 확률 +25%, 치명타 피해 +100%',
  },
  aion_singularity_aegis: {
    id: 'aion_singularity_aegis',
    nameKR: '특이점의 성방패',
    hanja: '特異點聖盾',
    slot: 'accessory',
    icon: '🛡️',
    cost: 5,
    description: '모든 인과율의 충격을 소멸시키는 성방패. 모든 환경 디버프를 무효화하고 전 속성 저항을 20% 증가시킵니다.',
    perkSummaryKR: '환경 디버프 면역, 전 속성 저항 +20%',
  },
};

export const ALL_OMNIVERSE_REGALIA_IDS: OmniverseRegaliaId[] = [
  'ouroboros_chrono_blade',
  'ymir_primordial_heart',
  'nyx_void_eye',
  'aion_singularity_aegis',
];

export interface OmniverseRegaliaPerks {
  defPenetration: number;
  bonusHp: number;
  flatBarrier: number;
  critRateBonus: number;
  critDamageBonus: number;
  debuffImmunity: boolean;
  allElementalResistance: number;
  totalRegaliaCount: number;
}

/**
 * Returns the definition of a specific Omniverse Regalia.
 */
export function getOmniverseRegalia(id: OmniverseRegaliaId): OmniverseRegaliaDef {
  return OMNIVERSE_REGALIA_CATALOG[id];
}

export interface RegaliaForgeCheck {
  canForge: boolean;
  reason?: string;
  cost: number;
}

/**
 * Validates if the player can forge a specific Omniverse Regalia.
 */
export function canForgeOmniverseRegalia(
  meta: MetaState,
  regaliaId: OmniverseRegaliaId
): RegaliaForgeCheck {
  const forged = meta.forgedRegalia ?? [];
  const def = getOmniverseRegalia(regaliaId);

  if (forged.includes(regaliaId)) {
    return {
      canForge: false,
      reason: '이미 주조가 완료된 신격 보구입니다.',
      cost: def.cost,
    };
  }

  const currentCrests = (meta as unknown as { pantheonCrests?: number }).pantheonCrests ?? 0;

  if (currentCrests < def.cost) {
    return {
      canForge: false,
      reason: `만신전 문장이 부족합니다 (필요: ${def.cost}개, 보유: ${currentCrests}개)`,
      cost: def.cost,
    };
  }

  return {
    canForge: true,
    cost: def.cost,
  };
}

/**
 * Forges an Omniverse Regalia, deducting Pantheon Crests and updating MetaState.
 */
export function forgeOmniverseRegalia(
  meta: MetaState,
  regaliaId: OmniverseRegaliaId
): {
  newMeta: MetaState;
  regalia: OmniverseRegaliaDef;
} {
  const check = canForgeOmniverseRegalia(meta, regaliaId);
  if (!check.canForge) {
    throw new Error(check.reason ?? '신격 보구를 주조할 수 없습니다.');
  }

  const def = getOmniverseRegalia(regaliaId);
  const currentCrests = (meta as unknown as { pantheonCrests?: number }).pantheonCrests ?? 0;
  const currentForged = meta.forgedRegalia ?? [];

  const newMeta: MetaState = {
    ...meta,
    pantheonCrests: currentCrests - def.cost,
    forgedRegalia: [...currentForged, regaliaId],
  } as any;

  return {
    newMeta,
    regalia: def,
  };
}

/**
 * Evaluates the cumulative perks provided by all forged Omniverse Regalia.
 */
export function evaluateForgedRegaliaPerks(meta: MetaState): OmniverseRegaliaPerks {
  const forged = new Set(meta.forgedRegalia ?? []);

  const hasBlade = forged.has('ouroboros_chrono_blade');
  const hasHeart = forged.has('ymir_primordial_heart');
  const hasEye = forged.has('nyx_void_eye');
  const hasAegis = forged.has('aion_singularity_aegis');

  return {
    defPenetration: hasBlade ? 0.30 : 0,
    bonusHp: hasHeart ? 100_000_000 : 0,
    flatBarrier: hasHeart ? 500_000 : 0,
    critRateBonus: hasEye ? 0.25 : 0,
    critDamageBonus: hasEye ? 1.00 : 0,
    debuffImmunity: hasAegis,
    allElementalResistance: hasAegis ? 0.20 : 0,
    totalRegaliaCount: forged.size,
  };
}
