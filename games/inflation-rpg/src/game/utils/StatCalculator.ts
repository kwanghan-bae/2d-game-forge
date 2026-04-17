import { ClassId, getClassById } from '../data/ClassData';

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  agi: number;
  luk: number;
}

export interface PassiveEffectResult {
  statMultipliers?: Partial<Stats>;
  attackBonus?: number; // 초의 전용
  beastDamageMultiplier?: number; // 착호갑사 전용
  dropRateMultiplier?: number; // 무당 전용
}

/**
 * 직업과 레벨에 따른 스탯 계산
 * 공식: baseStats * (growthRates ^ level)
 * 
 * @param classId 직업 ID (ClassId.HWARANG 등)
 * @param level 레벨 (0 이상)
 * @returns 계산된 스탯
 */
export function calculateClassStats(classId: ClassId, level: number): Stats {
  const characterClass = getClassById(classId);
  if (!characterClass) {
    throw new Error(`Unknown class: ${classId}`);
  }

  const { baseStats, growthRates } = characterClass;

  return {
    hp: Math.floor(baseStats.hp * Math.pow(growthRates.hp, level)),
    attack: Math.floor(baseStats.attack * Math.pow(growthRates.attack, level)),
    defense: Math.floor(baseStats.defense * Math.pow(growthRates.defense, level)),
    agi: Math.floor(baseStats.agi * Math.pow(growthRates.agi, level)),
    luk: Math.floor(baseStats.luk * Math.pow(growthRates.luk, level))
  };
}

/**
 * 직업의 패시브 효과 계산
 * 각 직업마다 고유한 패시브 효과를 반환합니다.
 * 
 * @param classId 직업 ID
 * @param currentStats 현재 스탯 (일부 계산에 필요)
 * @returns 패시브 효과 결과
 */
export function applyPassiveEffect(
  classId: ClassId,
  currentStats: Stats
): PassiveEffectResult {
  const characterClass = getClassById(classId);
  if (!characterClass) {
    return {};
  }

  const { passiveSkill } = characterClass;

  switch (passiveSkill.effect) {
    case 'stat_boost': // 화랑: 모든 스탯 × 1.10
      return {
        statMultipliers: {
          hp: passiveSkill.value,
          attack: passiveSkill.value,
          defense: passiveSkill.value,
          agi: passiveSkill.value,
          luk: passiveSkill.value
        }
      };

    case 'life_conversion': // 초의: attack += maxHP × 0.05
      return {
        attackBonus: Math.floor(currentStats.hp * passiveSkill.value)
      };

    case 'beast_damage': // 착호갑사: 짐승 데미지 증가
      return {
        beastDamageMultiplier: passiveSkill.value
      };

    case 'item_find': // 무당: 드롭률 증가
      return {
        dropRateMultiplier: passiveSkill.value
      };

    default:
      return {};
  }
}

