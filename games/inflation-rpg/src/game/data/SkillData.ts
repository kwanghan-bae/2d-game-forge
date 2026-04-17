/**
 * 스킬의 종류를 정의하는 열거형입니다.
 */
export enum SkillType {
    /** 물리 공격 스킬 */
    PHYSICAL = 'physical',
    /** 마법 공격 스킬 */
    MAGIC = 'magic',
    /** 체력 회복 스킬 */
    HEAL = 'heal',
    /** 강화 버프 스킬 */
    BUFF = 'buff'
}

/**
 * 스킬에 의한 상태 이상 또는 버프 효과 종류를 정의하는 열거형입니다.
 */
export enum StatusEffectType {
    /** 출혈 (지속 피해) */
    BLEED = 'bleed',
    /** 무적 (데미지 면제) */
    INVINCIBLE = 'invincible',
    /** 공격력 증가 버프 */
    BUFF_ATTACK = 'buff_attack',
    /** 방어력 증가 버프 */
    BUFF_DEFENSE = 'buff_defense',
    /** 공격력 감소 디버프 */
    DEBUFF_ATTACK = 'debuff_attack'
}

/**
 * 스킬에 부수되는 상태 효과 정보를 정의하는 인터페이스입니다.
 */
export interface StatusEffect {
    /** 효과 종류 */
    type: StatusEffectType;
    /** 효과 지속 시간 (턴 단위) */
    duration: number;
    /** 효과 강도 (예: 0.1은 10% 피해, 1.5는 1.5배 강화) */
    power: number;
    /** 효과 설명 한글 텍스트 */
    description: string;
}

/**
 * 개별 스킬의 상세 데이터를 정의하는 인터페이스입니다.
 */
export interface Skill {
    /** 스킬 고유 ID */
    id: number;
    /** 스킬 이름 */
    name: string;
    /** 스킬 종류 */
    type: SkillType;
    /** 스킬 위력 (데미지 배율 또는 회복량) */
    power: number;
    /** 스킬 재사용 대기시간 (턴 수) */
    cooldown: number;
    /** 스킬 설명 */
    description: string;
    /** 아이콘 리소스 아틀라스 키 */
    atlasKey: string;
    /** 아이콘 프레임 인덱스 */
    frame: number;
    /** 시각 효과(VFX) 프레임 인덱스 */
    vfxFrame: number;
    /** 사용 가능한 직업 제한 (undefined는 공통) */
    classRequirement?: string;
    /** 대상 종류 (단일, 광역, 자신) */
    targetType: 'single' | 'aoe' | 'self';
    /** 부수적인 상태 효과 (선택 사항) */
    statusEffect?: StatusEffect;
}

/**
 * 게임 내에 존재하는 모든 스킬의 데이터 카탈로그입니다.
 */
export const SKILL_CATALOG: Skill[] = [
    {
        id: 1,
        name: "먹물 베기 (Ink Slash)",
        type: SkillType.PHYSICAL,
        power: 1.2,
        cooldown: 0,
        description: "기본적인 검술. 먹물이 튈 정도로 강력하게 벤다.",
        atlasKey: 'skill_joseon',
        frame: 0, // Icon
        vfxFrame: 0, // Slash VFX
        targetType: 'single'
    },
    {
        id: 2,
        name: "부적 폭발 (Talisman)",
        type: SkillType.MAGIC,
        power: 2.5,
        cooldown: 3,
        description: "폭발하는 부적을 던져 큰 피해를 입힌다.",
        atlasKey: 'skill_joseon',
        frame: 4, // Talisman icon
        vfxFrame: 4, // Explosion VFX
        targetType: 'single',
        statusEffect: {
            type: StatusEffectType.BLEED,
            power: 0.1,
            duration: 3,
            description: "매 턴 마다 최대 체력의 10% 피해"
        }
    },
    {
        id: 3,
        name: "치유의 연꽃 (Healing Lotus)",
        type: SkillType.HEAL,
        power: 0.5, // Heals 50% of Magic/Attack? Or fixed? Let's say 50% Max HP for now or separate logic
        cooldown: 5,
        description: "신비한 연꽃의 힘으로 체력을 회복한다.",
        atlasKey: 'skill_joseon',
        frame: 7, // Lotus icon
        vfxFrame: 7, // Heal VFX
        targetType: 'single'
    },
    {
        id: 4,
        name: "호랑이의 기운 (Tiger Buff)",
        type: SkillType.BUFF,
        power: 1.5, // 1.5x Attack for N turns
        cooldown: 4,
        description: "호랑이의 영혼을 불러내어 공격력을 강화한다.",
        atlasKey: 'skill_joseon',
        frame: 12, // Golden aura icon
        vfxFrame: 12, // Buff VFX
        targetType: 'self',
        statusEffect: {
            type: StatusEffectType.BUFF_ATTACK,
            power: 1.5,
            duration: 3,
            description: "공격력 1.5배 증가"
        }
    },
    {
        id: 5,
        name: "반월참 (Moon Slash)",
        type: SkillType.PHYSICAL,
        power: 1.8,
        cooldown: 4,
        description: "범위 공격으로 적에게 출혈을 부여한다. 3턴간 최대HP의 10% 지속 피해.",
        atlasKey: 'skill_joseon',
        frame: 1,
        vfxFrame: 1,
        classRequirement: 'hwarang',
        targetType: 'aoe',
        statusEffect: {
            type: StatusEffectType.BLEED,
            duration: 3,
            power: 0.10, // 10% HP per turn
            description: "매 턴 마다 최대 체력의 10% 피해"
        }
    },
    {
        id: 6,
        name: "금강자세 (Diamond Stance)",
        type: SkillType.BUFF,
        power: 0,
        cooldown: 8,
        description: "3턴간 무적 상태가 된다. 이동 및 공격 불가.",
        atlasKey: 'skill_joseon',
        frame: 13,
        vfxFrame: 13,
        classRequirement: 'choeui',
        targetType: 'self',
        statusEffect: {
            type: StatusEffectType.INVINCIBLE,
            duration: 3,
            power: 1,
            description: "무적 상태"
        }
    },
    {
        id: 7,
        name: "헤드샷 (Headshot)",
        type: SkillType.PHYSICAL,
        power: 5.0, // 500% 데미지
        cooldown: 6,
        description: "단일 대상에게 확정 크리티컬 500% 데미지.",
        atlasKey: 'skill_joseon',
        frame: 2,
        vfxFrame: 2,
        classRequirement: 'tiger_hunter',
        targetType: 'single'
    },
    {
        id: 8,
        name: "장군 소환 (Summon General)",
        type: SkillType.BUFF,
        power: 1.5, // 랜덤 버프 배수
        cooldown: 5,
        description: "랜덤한 장군신을 소환하여 공격력 또는 방어력을 강화한다.",
        atlasKey: 'skill_joseon',
        frame: 8,
        vfxFrame: 8,
        classRequirement: 'mudang',
        targetType: 'self',
        statusEffect: {
            type: StatusEffectType.BUFF_ATTACK,
            duration: 4,
            power: 1.5,
            description: "공격력 1.5배 증가"
        }
    }
];

/**
 * 스킬 ID로 스킬 데이터 조회
 */
export function getSkillById(skillId: number): Skill | undefined {
    return SKILL_CATALOG.find(skill => skill.id === skillId);
}

/**
 * 직업별로 사용 가능한 스킬 조회
 * 공통 스킬(classRequirement 없음) + 직업 전용 스킬
 */
export function getSkillsByClass(classId: string): Skill[] {
    return SKILL_CATALOG.filter(skill => 
        !skill.classRequirement || skill.classRequirement === classId
    );
}
