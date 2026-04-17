/**
 * 보스 스킬 데이터 정의
 * 보스 몬스터의 특수 패턴과 기믹을 관리합니다.
 */

export interface BossSkill {
  /** 스킬 고유 ID */
  id: number;
  /** 스킬 영문명 */
  name: string;
  /** 스킬 한글명 */
  nameKR: string;
  /** 스킬 설명 */
  description: string;
  /** 스킬 발동 타입 */
  triggerType: 'turn_interval' | 'battle_start' | 'hp_threshold';
  /** 발동 조건값 (턴 간격 or HP % or 0) */
  triggerValue: number;
  /** 스킬 효과 타입 */
  effect: 'debuff_defense' | 'instant_kill';
  /** 효과 파워 (디버프 배수 or 0) */
  power: number;
  /** 효과 지속 턴 수 */
  duration: number;
}

/**
 * 보스 스킬 카탈로그
 * 모든 보스 스킬을 정의합니다.
 */
export const BOSS_SKILL_CATALOG: BossSkill[] = [
  {
    id: 101,
    name: 'Roar',
    nameKR: '포효',
    description: '산군의 포효로 5턴간 방어력이 50% 감소합니다.',
    triggerType: 'turn_interval',
    triggerValue: 3,
    effect: 'debuff_defense',
    power: 0.5, // 50% 감소 = 0.5배 (방어력 × 0.5)
    duration: 5
  },
  {
    id: 102,
    name: 'Judgment',
    nameKR: '심판',
    description: '업보가 100 이상이면 즉시 사망합니다.',
    triggerType: 'battle_start',
    triggerValue: 0,
    effect: 'instant_kill',
    power: 0,
    duration: 0
  }
];

/**
 * ID로 보스 스킬을 조회합니다.
 * @param id 스킬 ID
 * @returns 스킬 데이터 또는 undefined
 */
export function getBossSkillById(id: number): BossSkill | undefined {
  return BOSS_SKILL_CATALOG.find(skill => skill.id === id);
}
