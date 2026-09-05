/**
 * C1027 — Equipment Set Synergy System
 * Grants 2-piece and 3-piece bonuses when matching themed equipment items
 * are simultaneously equipped.
 */

export type EquipmentSetId = 'dragon' | 'celestial' | 'ascetic' | 'merchant';

export interface SetBonusEffect {
  atkMulBonus?: number;       // e.g. 0.15 = +15% ATK
  hpMulBonus?: number;        // e.g. 0.20 = +20% HP
  bossDamageBonus?: number;   // e.g. 0.20 = +20% damage against bosses
  expBonus?: number;          // e.g. 25 = +25% EXP
  goldBonus?: number;         // e.g. 25 = +25% Gold
  dropRateBonus?: number;     // e.g. 0.20 = +20% Drop rate
  combatHealPercent?: number; // e.g. 0.05 = heals 5% max HP upon combat victory
}

export interface SetBonusTier {
  pieces: number;
  name: string;
  description: string;
  effect: SetBonusEffect;
}

export interface EquipmentSetDef {
  id: EquipmentSetId;
  name: string;
  description: string;
  itemBaseIds: string[];
  bonuses: SetBonusTier[];
}

export const EQUIPMENT_SETS: EquipmentSetDef[] = [
  {
    id: 'dragon',
    name: '용의 위엄',
    description: '용의 비늘과 피로 벼려낸 장비 세트',
    itemBaseIds: ['w-bluedragon', 'a-dragon', 'w-yongcheon'],
    bonuses: [
      {
        pieces: 2,
        name: '용의 분노 (2P)',
        description: '공격력 +15%',
        effect: { atkMulBonus: 0.15 },
      },
      {
        pieces: 3,
        name: '용왕의 패기 (3P)',
        description: '보스에게 입히는 피해 +20%',
        effect: { bossDamageBonus: 0.20 },
      },
    ],
  },
  {
    id: 'celestial',
    name: '신비로운 선경',
    description: '천상의 신선들이 사용하는 성스러운 장비 세트',
    itemBaseIds: ['w-fairy', 'a-celestial', 'w-celestial-spear'],
    bonuses: [
      {
        pieces: 2,
        name: '선녀의 가호 (2P)',
        description: '최대 HP +20%',
        effect: { hpMulBonus: 0.20 },
      },
      {
        pieces: 3,
        name: '우화등선 (3P)',
        description: '경험치 획득량 +25%',
        effect: { expBonus: 25 },
      },
    ],
  },
  {
    id: 'ascetic',
    name: '수련자의 맹세',
    description: '끊임없이 자신을 단련하는 구도자의 기본 세트',
    itemBaseIds: ['w-exp-katana', 'a-cloth', 'acc-necklace'],
    bonuses: [
      {
        pieces: 2,
        name: '극기수련 (2P)',
        description: '전투 승리 시 최대 HP의 5% 즉시 회복',
        effect: { combatHealPercent: 0.05 },
      },
      {
        pieces: 3,
        name: '일도양단 (3P)',
        description: '경험치 획득량 +15%',
        effect: { expBonus: 15 },
      },
    ],
  },
  {
    id: 'merchant',
    name: '황금 상단',
    description: '막대한 부와 행운을 끌어모으는 보부상들의 세트',
    itemBaseIds: ['acc-gold-magnet', 'acc-charm', 'acc-ring-bp3'],
    bonuses: [
      {
        pieces: 2,
        name: '상인의 수완 (2P)',
        description: '골드 획득량 +25%',
        effect: { goldBonus: 25 },
      },
      {
        pieces: 3,
        name: '만사형통 (3P)',
        description: '장비 드롭률 +20%',
        effect: { dropRateBonus: 0.20 },
      },
    ],
  },
];

export function getEquipmentSet(id: EquipmentSetId): EquipmentSetDef | undefined {
  return EQUIPMENT_SETS.find(s => s.id === id);
}

export function getSetForEquipment(baseId: string): EquipmentSetDef | undefined {
  return EQUIPMENT_SETS.find(s => s.itemBaseIds.includes(baseId));
}

export interface ActiveSetResult {
  set: EquipmentSetDef;
  equippedCount: number;
  activeBonuses: SetBonusTier[];
  inactiveBonuses: SetBonusTier[];
}

/** Determines active set bonuses based on equipped item base IDs */
export function getActiveSetBonuses(equippedBaseIds: string[]): ActiveSetResult[] {
  const results: ActiveSetResult[] = [];

  for (const set of EQUIPMENT_SETS) {
    // Count unique set items equipped
    const matchedCount = set.itemBaseIds.filter(id => equippedBaseIds.includes(id)).length;
    if (matchedCount > 0) {
      const activeBonuses = set.bonuses.filter(b => matchedCount >= b.pieces);
      const inactiveBonuses = set.bonuses.filter(b => matchedCount < b.pieces);
      results.push({
        set,
        equippedCount: matchedCount,
        activeBonuses,
        inactiveBonuses,
      });
    }
  }

  return results;
}

/** Aggregates all active set bonus modifiers into a single unified summary object */
export function aggregateSetEffects(equippedBaseIds: string[]) {
  const activeSets = getActiveSetBonuses(equippedBaseIds);
  let atkMulBonus = 0;
  let hpMulBonus = 0;
  let bossDamageBonus = 0;
  let expBonus = 0;
  let goldBonus = 0;
  let dropRateBonus = 0;
  let combatHealPercent = 0;

  for (const active of activeSets) {
    for (const bonus of active.activeBonuses) {
      if (bonus.effect.atkMulBonus) atkMulBonus += bonus.effect.atkMulBonus;
      if (bonus.effect.hpMulBonus) hpMulBonus += bonus.effect.hpMulBonus;
      if (bonus.effect.bossDamageBonus) bossDamageBonus += bonus.effect.bossDamageBonus;
      if (bonus.effect.expBonus) expBonus += bonus.effect.expBonus;
      if (bonus.effect.goldBonus) goldBonus += bonus.effect.goldBonus;
      if (bonus.effect.dropRateBonus) dropRateBonus += bonus.effect.dropRateBonus;
      if (bonus.effect.combatHealPercent) combatHealPercent += bonus.effect.combatHealPercent;
    }
  }

  return {
    atkMulBonus,
    hpMulBonus,
    bossDamageBonus,
    expBonus,
    goldBonus,
    dropRateBonus,
    combatHealPercent,
  };
}
