import { SKILL_CATALOG, Skill, StatusEffect, StatusEffectType } from '../data/SkillData';

/**
 * 스킬 사용 결과 정보를 담는 인터페이스입니다.
 */
export interface SkillUseResult {
    /** 사용 성공 여부 */
    success: boolean;
    /** 발생한 데미지 수치 */
    damage: number;
    /** 결과 메시지 */
    message?: string;
    /** 동반되는 상태 효과 */
    statusEffect?: StatusEffect;
}

/**
 * 활성화된 상태 효과들의 종합 계산 결과를 담는 인터페이스입니다.
 */
export interface StatusEffectResult {
    /** 상태 효과로 인한 누적 데미지 */
    damage: number;
    /** 무적 상태 여부 */
    isInvincible: boolean;
    /** 공격력 배율 합계 */
    attackMultiplier: number;
    /** 방어력 배율 합계 */
    defenseMultiplier: number;
}

/**
 * 플레이어의 기본 스탯 정보를 담는 인터페이스입니다.
 */
export interface PlayerStats {
    /** 현재 체력 */
    hp: number;
    /** 최대 체력 */
    maxHp: number;
    /** 공격력 */
    attack: number;
    /** 방어력 */
    defense: number;
}

/**
 * 게임 내 스킬 사용, 쿨타임 관리 및 상태 효과(버프/디버프)를 총괄하는 관리자 클래스입니다.
 */
export class SkillManager {
    /** 스킬 ID별 남은 쿨타임 (턴 단위) 맵 */
    private skillCooldowns: Map<number, number> = new Map();
    /** 현재 활성화된 상태 효과 목록 */
    private activeStatusEffects: StatusEffect[] = [];

    /**
     * SkillManager의 생성자입니다. 모든 스킬의 쿨타임을 초기화합니다.
     */
    constructor() {
        // 모든 스킬의 쿨타임 초기화
        SKILL_CATALOG.forEach(skill => {
            this.skillCooldowns.set(skill.id, 0);
        });
    }

    /**
     * 특정 스킬을 사용합니다. 쿨타임을 확인하고 데미지 및 상태 효과를 계산합니다.
     * @param skillId 사용할 스킬 ID
     * @param playerStats 사용자의 현재 스탯
     * @returns 스킬 사용 결과 객체
     */
    useSkill(skillId: number, playerStats: PlayerStats): SkillUseResult {
        const skill = SKILL_CATALOG.find(s => s.id === skillId);
        
        const validation = this.validateSkillUsage(skillId, skill);
        if (!validation.success) {
            return validation;
        }

        // 데미지 계산
        const damage = this.calculateSkillDamage(skill!, playerStats);

        // 스킬 쿨타임 설정
        this.skillCooldowns.set(skillId, skill!.cooldown);

        // 상태 이상 추가
        let statusEffect: StatusEffect | undefined;
        if (skill!.statusEffect) {
            this.activeStatusEffects.push({ ...skill!.statusEffect });
            statusEffect = skill!.statusEffect;
        }

        return {
            success: true,
            damage,
            statusEffect
        };
    }

    /**
     * 스킬 사용 가능 여부(존재 여부 및 쿨타임)를 검증합니다.
     * @param skillId 스킬 ID
     * @param skill 찾은 스킬 데이터
     * @returns 검증 결과 객체
     */
    private validateSkillUsage(skillId: number, skill?: Skill): SkillUseResult | { success: true } {
        if (!skill) {
            return { success: false, damage: 0, message: '존재하지 않는 스킬입니다.' };
        }

        const cooldown = this.skillCooldowns.get(skillId) || 0;
        if (cooldown > 0) {
            return { success: false, damage: 0, message: `쿨타임 중입니다. (${cooldown}턴 남음)` };
        }

        return { success: true };
    }

    /**
     * 스킬의 최종 데미지를 계산합니다. 사용자의 공격력과 스킬 위력, 현재 버프 상태를 반영합니다.
     * @param skill 계산할 스킬 데이터
     * @param playerStats 사용자의 현재 스탯
     * @returns 계산된 데미지 수치
     */
    private calculateSkillDamage(skill: Skill, playerStats: PlayerStats): number {
        let baseDamage = playerStats.attack * skill.power;
        
        // 상태 이상에 따른 데미지 조정 (공격력 증가/감소 버프 반영)
        const statusResult = this.processStatusEffects(playerStats);
        baseDamage *= statusResult.attackMultiplier;

        return Math.floor(baseDamage);
    }

    /**
     * 현재 활성화된 모든 상태 효과를 처리하고 지속 시간을 감소시킵니다.
     * @param playerStats 플레이어의 현재 스탯
     * @returns 상태 효과 처리 결과 (누적 데미지, 버프 배율 등)
     */
    processStatusEffects(playerStats: PlayerStats): StatusEffectResult {
        let totalDamage = 0;
        let isInvincible = false;
        let attackMultiplier = 1;
        let defenseMultiplier = 1;

        this.activeStatusEffects.forEach(effect => {
            switch (effect.type) {
                case StatusEffectType.BLEED:
                    // 출혈: 최대 체력의 일정 비율만큼 피해
                    totalDamage += Math.floor(playerStats.maxHp * effect.power);
                    break;

                case StatusEffectType.INVINCIBLE:
                    isInvincible = true;
                    break;

                case StatusEffectType.BUFF_ATTACK:
                    attackMultiplier *= effect.power;
                    break;

                case StatusEffectType.BUFF_DEFENSE:
                    defenseMultiplier *= effect.power;
                    break;

                case StatusEffectType.DEBUFF_ATTACK:
                    attackMultiplier *= effect.power;
                    break;
            }
        });

        // 상태 이상 지속 시간 감소 및 만료된 효과 제거
        this.activeStatusEffects = this.activeStatusEffects.filter(effect => {
            effect.duration--;
            return effect.duration > 0;
        });

        return {
            damage: totalDamage,
            isInvincible,
            attackMultiplier,
            defenseMultiplier
        };
    }

    /**
     * 상태 효과를 수동으로 추가합니다. (주로 테스트용)
     * @param effect 추가할 상태 효과 객체
     * @returns 성공 여부
     */
    addStatusEffect(effect: StatusEffect): boolean {
        this.activeStatusEffects.push({ ...effect });
        return true;
    }

    /**
     * 모든 스킬의 쿨타임을 1턴 감소시킵니다.
     */
    tickCooldowns(): void {
        this.skillCooldowns.forEach((cooldown, skillId) => {
            if (cooldown > 0) {
                this.skillCooldowns.set(skillId, cooldown - 1);
            }
        });
    }

    /**
     * 특정 스킬의 현재 남은 쿨타임을 조회합니다.
     * @param skillId 조회할 스킬 ID
     * @returns 남은 턴 수
     */
    getCooldown(skillId: number): number {
        return this.skillCooldowns.get(skillId) || 0;
    }

    /**
     * 모든 스킬의 쿨타임을 즉시 초기화합니다.
     */
    resetAllCooldowns(): void {
        this.skillCooldowns.forEach((_, skillId) => {
            this.skillCooldowns.set(skillId, 0);
        });
    }

    /**
     * 현재 활성화된 모든 상태 효과를 즉시 제거합니다.
     */
    clearStatusEffects(): void {
        this.activeStatusEffects = [];
    }

    /**
     * 현재 활성화된 상태 효과 목록을 반환합니다.
     * @returns 상태 효과 배열의 복사본
     */
    getActiveStatusEffects(): StatusEffect[] {
        return [...this.activeStatusEffects];
    }
}
