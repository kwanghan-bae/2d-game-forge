/**
 * petForaging.ts — C1055: Overworld Companion Foraging & Salvage Engine.
 *
 * Grants the hero bonus resources and healing through companion field foraging
 * triggered after overworld encounters or realm travel.
 */

import type { PetState, PetType } from './petSystem';
import { PET_DEFINITIONS } from './petSystem';

export interface ForageResult {
  petId: PetType;
  petNameKR: string;
  goldGain: number;
  stoneGain: number;
  healPercent: number; // 0..1 (e.g. 0.05 for 5% max HP heal)
  message: string;
}

/**
 * Calculates companion foraging chance based on bond level.
 * Base 15% + 1.5% per bond level above 0 (16.5% at Lv 1, up to 30% at Lv 10).
 */
export function getPetForageChance(level: number): number {
  const clampedLv = Math.max(1, Math.min(10, level));
  return 0.15 + clampedLv * 0.015;
}

/**
 * Evaluates whether the active companion finds foraging loot after an encounter.
 * Uses an optional injectable RNG function for deterministic testing.
 */
export function rollPetForaging(
  activePet: PetState | null,
  monsterLevel: number,
  rng: () => number = Math.random,
): ForageResult | null {
  if (!activePet || !activePet.unlocked) {
    return null;
  }

  const chance = getPetForageChance(activePet.level);
  if (rng() >= chance) {
    return null;
  }

  const def = PET_DEFINITIONS[activePet.id];
  const lv = activePet.level;
  const scaledLvFactor = Math.max(1, Math.floor(monsterLevel / 10));

  let goldGain = 0;
  let stoneGain = 0;
  let healPercent = 0;
  let detailMsg = '';

  switch (activePet.id) {
    case 'white_tiger':
      // White tiger hunts for enhance stone fragments: 1~3 stones
      stoneGain = Math.max(1, Math.floor(1 + (lv / 5)));
      detailMsg = `단단한 바위 틈에서 강화석 ${stoneGain}개를 발굴했습니다!`;
      break;

    case 'azure_dragon':
      // Azure dragon brings swift winds of fortune: extra gold
      goldGain = Math.floor((100 + lv * 50) * scaledLvFactor);
      detailMsg = `천둥의 숨결로 숨겨진 보물상자를 열어 💰 ${goldGain.toLocaleString()}G를 찾아냈습니다!`;
      break;

    case 'vermilion_bird':
      // Vermilion bird finds sacred fire herbs: heals 5% ~ 10% HP
      healPercent = Math.min(0.15, 0.05 + lv * 0.005);
      detailMsg = `성스러운 영초를 찾아내어 용사의 상처를 치유합니다 (HP ${(healPercent * 100).toFixed(1)}% 회복)!`;
      break;

    case 'black_tortoise':
      // Black tortoise digs up heavy ore & gold: 1 stone + modest gold
      stoneGain = 1;
      goldGain = Math.floor((50 + lv * 25) * scaledLvFactor);
      detailMsg = `대지 깊은 곳에서 강화석 1개와 💰 ${goldGain.toLocaleString()}G를 건져 올렸습니다.`;
      break;
  }

  return {
    petId: activePet.id,
    petNameKR: def.nameKR,
    goldGain,
    stoneGain,
    healPercent,
    message: `🐾 [${def.nameKR}]이(가) ${detailMsg}`,
  };
}

/**
 * Applies forage reward gains to existing gold and stone balances.
 */
export function applyForageReward(
  result: ForageResult,
  currentGold: number,
  currentStones: number,
): { newGold: number; newStones: number } {
  return {
    newGold: currentGold + result.goldGain,
    newStones: currentStones + result.stoneGain,
  };
}
