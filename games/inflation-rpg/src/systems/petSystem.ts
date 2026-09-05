/**
 * petSystem.ts — C1051: Divine Beasts & Familiar Companions Growth Engine.
 *
 * Implements 4 legendary Eastern Guardian Beasts (백호, 청룡, 주작, 현무)
 * providing aura buffs, feeding & bonding progression, and trial synergies.
 */

import type { ElementType } from './elementalSystem';

export type PetType = 'white_tiger' | 'azure_dragon' | 'vermilion_bird' | 'black_tortoise';

export const MAX_PET_LEVEL = 10;

export interface PetDef {
  id: PetType;
  nameKR: string;
  emoji: string;
  element: ElementType;
  roleKR: string;
  description: string;
  unlockFloorRequired: number; // 0 = start unlocked
}

export const PET_DEFINITIONS: Record<PetType, PetDef> = {
  white_tiger: {
    id: 'white_tiger',
    nameKR: '백호',
    emoji: '🐯',
    element: 'neutral',
    roleKR: '물리 & 치명타 강화',
    description: '서방을 수호하는 신수. 용사의 공격력과 치명타 피해를 폭발적으로 증폭시킵니다.',
    unlockFloorRequired: 0,
  },
  azure_dragon: {
    id: 'azure_dragon',
    nameKR: '청룡',
    emoji: '🐉',
    element: 'lightning',
    roleKR: '뇌전 & 신속 기동',
    description: '동방을 수호하는 신수. 번개 같은 신속함과 벼락의 뇌전 피해를 부여합니다.',
    unlockFloorRequired: 3,
  },
  vermilion_bird: {
    id: 'vermilion_bird',
    nameKR: '주작',
    emoji: '🦅',
    element: 'fire',
    roleKR: '화염 & 생명력 재생',
    description: '남방을 수호하는 신수. 불사조의 생명력과 작열하는 화염 피해를 선사합니다.',
    unlockFloorRequired: 1,
  },
  black_tortoise: {
    id: 'black_tortoise',
    nameKR: '현무',
    emoji: '🐢',
    element: 'water',
    roleKR: '철벽 방어 & 피해 감소',
    description: '북방을 수호하는 신수. 난공불락의 껍질로 영웅의 방어력을 높이고 피해를 직접 경감합니다.',
    unlockFloorRequired: 5,
  },
};

export const ALL_PET_IDS: readonly PetType[] = [
  'white_tiger',
  'azure_dragon',
  'vermilion_bird',
  'black_tortoise',
];

export interface PetState {
  id: PetType;
  level: number;
  bondExp: number;
  bondExpToNext: number;
  unlocked: boolean;
}

export interface PetAuraBonus {
  atkPercent: number;
  defPercent: number;
  hpPercent: number;
  spdPercent: number;
  critDmgPercent: number;
  elementalDmgPercent: number;
  hpRegenPercent: number;
  damageReduction: number;
}

export const EMPTY_PET_AURA: PetAuraBonus = {
  atkPercent: 0,
  defPercent: 0,
  hpPercent: 0,
  spdPercent: 0,
  critDmgPercent: 0,
  elementalDmgPercent: 0,
  hpRegenPercent: 0,
  damageReduction: 0,
};

/**
 * Calculates EXP required to advance from current level to next.
 */
export function getPetExpToNext(level: number): number {
  if (level >= MAX_PET_LEVEL) return 0;
  return level * 50;
}

/**
 * Generates initial state for all 4 pets.
 */
export function createInitialPets(): Record<PetType, PetState> {
  return {
    white_tiger: {
      id: 'white_tiger',
      level: 1,
      bondExp: 0,
      bondExpToNext: getPetExpToNext(1),
      unlocked: true,
    },
    azure_dragon: {
      id: 'azure_dragon',
      level: 1,
      bondExp: 0,
      bondExpToNext: getPetExpToNext(1),
      unlocked: false,
    },
    vermilion_bird: {
      id: 'vermilion_bird',
      level: 1,
      bondExp: 0,
      bondExpToNext: getPetExpToNext(1),
      unlocked: false,
    },
    black_tortoise: {
      id: 'black_tortoise',
      level: 1,
      bondExp: 0,
      bondExpToNext: getPetExpToNext(1),
      unlocked: false,
    },
  };
}

export type FoodType = 'snack' | 'essence';

export interface FoodDef {
  type: FoodType;
  nameKR: string;
  emoji: string;
  costGold: number;
  costStones: number;
  bondExpGain: number;
}

export const FOOD_DEFINITIONS: Record<FoodType, FoodDef> = {
  snack: {
    type: 'snack',
    nameKR: '영수 영양식',
    emoji: '🥩',
    costGold: 500,
    costStones: 0,
    bondExpGain: 25,
  },
  essence: {
    type: 'essence',
    nameKR: '신수의 영약',
    emoji: '🧪',
    costGold: 2500,
    costStones: 2,
    bondExpGain: 100,
  },
};

/**
 * Checks if hero has enough resources to feed pet with chosen food.
 */
export function canFeedPet(
  foodType: FoodType,
  availableGold: number,
  availableStones: number,
): boolean {
  const food = FOOD_DEFINITIONS[foodType];
  return availableGold >= food.costGold && availableStones >= food.costStones;
}

export interface FeedResult {
  success: boolean;
  newPet: PetState;
  goldSpent: number;
  stonesSpent: number;
  leveledUp: boolean;
  message: string;
}

/**
 * Feeds pet to increase bond EXP and levels up when threshold is met.
 */
export function feedPet(
  pet: PetState,
  foodType: FoodType,
  availableGold: number,
  availableStones: number,
): FeedResult {
  if (!pet.unlocked) {
    return {
      success: false,
      newPet: pet,
      goldSpent: 0,
      stonesSpent: 0,
      leveledUp: false,
      message: '아직 해금되지 않은 영수입니다.',
    };
  }

  if (pet.level >= MAX_PET_LEVEL) {
    return {
      success: false,
      newPet: pet,
      goldSpent: 0,
      stonesSpent: 0,
      leveledUp: false,
      message: '이미 최고 친밀도(Lv 10)에 도달했습니다.',
    };
  }

  const food = FOOD_DEFINITIONS[foodType];
  if (availableGold < food.costGold || availableStones < food.costStones) {
    return {
      success: false,
      newPet: pet,
      goldSpent: 0,
      stonesSpent: 0,
      leveledUp: false,
      message: '먹이를 주기 위한 재화(골드/강화석)가 부족합니다.',
    };
  }

  let level = pet.level;
  let exp = pet.bondExp + food.bondExpGain;
  let expToNext = pet.bondExpToNext;
  let leveledUp = false;

  while (level < MAX_PET_LEVEL && exp >= expToNext) {
    exp -= expToNext;
    level++;
    leveledUp = true;
    expToNext = getPetExpToNext(level);
  }

  // Cap at max level
  if (level >= MAX_PET_LEVEL) {
    exp = 0;
    expToNext = 0;
  }

  const newPet: PetState = {
    ...pet,
    level,
    bondExp: exp,
    bondExpToNext: expToNext,
  };

  const def = PET_DEFINITIONS[pet.id];
  const message = leveledUp
    ? `✨ [${def.nameKR}]의 친밀도가 상승하여 Lv.${level}에 도달했습니다!`
    : `🍖 [${def.nameKR}]에게 [${food.nameKR}]을(를) 주어 친밀도 EXP +${food.bondExpGain}을 획득했습니다.`;

  return {
    success: true,
    newPet,
    goldSpent: food.costGold,
    stonesSpent: food.costStones,
    leveledUp,
    message,
  };
}

/**
 * Computes the passive combat aura granted by the active companion pet.
 */
export function computePetAura(pet: PetState | null): PetAuraBonus {
  if (!pet || !pet.unlocked) {
    return { ...EMPTY_PET_AURA };
  }

  const lv = Math.max(1, Math.min(MAX_PET_LEVEL, pet.level));
  const aura: PetAuraBonus = { ...EMPTY_PET_AURA };

  switch (pet.id) {
    case 'white_tiger':
      // Base: 5% ATK, 5% Crit DMG. +1% each per level above 1.
      aura.atkPercent = 5 + (lv - 1) * 1.0;
      aura.critDmgPercent = 5 + (lv - 1) * 1.0;
      break;

    case 'azure_dragon':
      // Base: 5% SPD, 5% Elemental DMG. +1% each per level above 1.
      aura.spdPercent = 5 + (lv - 1) * 1.0;
      aura.elementalDmgPercent = 5 + (lv - 1) * 1.0;
      break;

    case 'vermilion_bird':
      // Base: 6% HP, 2% Regen. +1.5% HP, +0.5% Regen per level above 1.
      aura.hpPercent = 6 + (lv - 1) * 1.5;
      aura.hpRegenPercent = 2 + (lv - 1) * 0.5;
      break;

    case 'black_tortoise':
      // Base: 6% DEF, 3% DR. +1.5% DEF, +0.5% DR per level above 1 (max 7.5% DR).
      aura.defPercent = 6 + (lv - 1) * 1.5;
      aura.damageReduction = 0.03 + (lv - 1) * 0.005;
      break;
  }

  return aura;
}

/**
 * Unlocks pets based on highest cleared Ascension Trial floor.
 */
export function checkPetUnlocks(
  currentPets: Record<PetType, PetState>,
  clearedFloor: number,
): { updatedPets: Record<PetType, PetState>; newlyUnlocked: PetType[] } {
  let changed = false;
  const newlyUnlocked: PetType[] = [];
  const updatedPets = { ...currentPets };

  for (const petId of ALL_PET_IDS) {
    const def = PET_DEFINITIONS[petId];
    const pet = updatedPets[petId];
    if (!pet.unlocked && clearedFloor >= def.unlockFloorRequired) {
      updatedPets[petId] = { ...pet, unlocked: true };
      newlyUnlocked.push(petId);
      changed = true;
    }
  }

  return { updatedPets, newlyUnlocked };
}
