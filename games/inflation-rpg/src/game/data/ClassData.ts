/**
 * 직업의 고유 ID를 정의하는 열거형입니다.
 */
export enum ClassId {
    /** 화랑 */
    HWARANG = 'hwarang',
    /** 착호갑사 */
    TIGER_HUNTER = 'tiger_hunter',
    /** 무당 */
    MUDANG = 'mudang',
    /** 초의 */
    CHOEUI = 'choeui'
}

/**
 * 직업별 패시브 스킬 정보를 정의하는 인터페이스입니다.
 */
export interface PassiveSkill {
    /** 패시브 스킬 ID */
    id: string;
    /** 패시브 스킬 한글 이름 */
    nameKR: string;
    /** 패시브 스킬 설명 */
    description: string;
    /** 효과 유형 (스탯 증가, 짐승 데미지 증가 등) */
    effect: 'stat_boost' | 'beast_damage' | 'item_find' | 'life_conversion';
    /** 효과 수치 */
    value: number;
}

/**
 * 캐릭터 직업의 상세 데이터를 정의하는 인터페이스입니다.
 */
export interface CharacterClass {
    /** 직업 ID */
    id: ClassId;
    /** 한글 이름 */
    nameKR: string;
    /** 영문 이름 */
    nameEN: string;
    /** 직업 설명 */
    description: string;
    /** 해금에 필요한 영혼 등급 */
    requiredSoulGrade: number;
    /** 초기 기본 스탯 */
    baseStats: {
        hp: number;
        attack: number;
        defense: number;
        agi: number;
        luk: number;
    };
    /** 레벨업 시 스탯 성장률 */
    growthRates: {
        hp: number;
        attack: number;
        defense: number;
        agi: number;
        luk: number;
    };
    /** 직업 고유 패시브 스킬 */
    passiveSkill: PassiveSkill;
    /** 초기 보유 스킬 ID 목록 */
    startingSkills: number[];
}

/**
 * 게임 내에 존재하는 모든 직업의 데이터 목록입니다.
 */
export const CLASS_CATALOG: CharacterClass[] = [
    {
        id: ClassId.HWARANG,
        nameKR: '화랑',
        nameEN: 'Hwarang',
        description: '꽃의 기사. 민첩한 움직임과 높은 공격 속도로 지속적인 데미지를 입힌다.',
        requiredSoulGrade: 0,
        baseStats: {
            hp: 100,
            attack: 80,
            defense: 60,
            agi: 90,
            luk: 70
        },
        growthRates: {
            hp: 1.08,
            attack: 1.10,
            defense: 1.08,
            agi: 1.12,
            luk: 1.08
        },
        passiveSkill: {
            id: 'hwarang_spirit',
            nameKR: '화랑정신',
            description: '자신과 소환수의 모든 스탯을 10% 증가시킨다.',
            effect: 'stat_boost',
            value: 1.10
        },
        startingSkills: [1]
    },
    {
        id: ClassId.TIGER_HUNTER,
        nameKR: '착호갑사',
        nameEN: 'Tiger Hunter',
        description: '호랑이 사냥꾼. 보스 몬스터에게 엄청난 피해를 입히지만 다수의 적에게는 취약하다.',
        requiredSoulGrade: 3,
        baseStats: {
            hp: 90,
            attack: 110,
            defense: 55,
            agi: 70,
            luk: 65
        },
        growthRates: {
            hp: 1.08,
            attack: 1.15,
            defense: 1.08,
            agi: 1.10,
            luk: 1.08
        },
        passiveSkill: {
            id: 'beast_hunter',
            nameKR: '짐승 사냥꾼',
            description: '짐승과 요괴 타입의 몬스터에게 주는 데미지가 50% 증가한다.',
            effect: 'beast_damage',
            value: 1.50
        },
        startingSkills: [1]
    },
    {
        id: ClassId.MUDANG,
        nameKR: '무당',
        nameEN: 'Mudang',
        description: '샤먼. 운의 힘을 받으며 숨겨진 아이템을 찾아낸다.',
        requiredSoulGrade: 4,
        baseStats: {
            hp: 85,
            attack: 75,
            defense: 58,
            agi: 80,
            luk: 105
        },
        growthRates: {
            hp: 1.08,
            attack: 1.10,
            defense: 1.08,
            agi: 1.10,
            luk: 1.15
        },
        passiveSkill: {
            id: 'spiritual_eye',
            nameKR: '령안',
            description: '숨겨진 아이템과 드롭 아이템 발견 확률이 20% 증가한다.',
            effect: 'item_find',
            value: 1.20
        },
        startingSkills: [1]
    },
    {
        id: ClassId.CHOEUI,
        nameKR: '초의',
        nameEN: 'Choeui',
        description: '검은 승려. 강인한 체력과 방어력으로 모든 피해를 견뎌낸다.',
        requiredSoulGrade: 5,
        baseStats: {
            hp: 120,
            attack: 70,
            defense: 85,
            agi: 65,
            luk: 60
        },
        growthRates: {
            hp: 1.12,
            attack: 1.10,
            defense: 1.10,
            agi: 1.08,
            luk: 1.08
        },
        passiveSkill: {
            id: 'adamantine_body',
            nameKR: '금강불괴',
            description: '최대 체력의 5%를 공격력으로 전환한다.',
            effect: 'life_conversion',
            value: 0.05
        },
        startingSkills: [1]
    }
];

/**
 * 주어진 ClassId로 직업 정보를 조회합니다.
 * @param classId 조회할 직업 ID
 * @returns 해당 직업 정보, 없으면 undefined
 */
export function getClassById(classId: ClassId): CharacterClass | undefined {
    return CLASS_CATALOG.find(cls => cls.id === classId);
}

/**
 * 주어진 영혼 등급으로 해금 가능한 직업들을 조회합니다.
 * 결과는 requiredSoulGrade 순으로 정렬됩니다.
 * @param soulGrade 영혼 등급
 * @returns 해금 가능한 직업 배열 (정렬됨)
 */
export function getClassByRequirement(soulGrade: number): CharacterClass[] {
    return CLASS_CATALOG
        .filter(cls => cls.requiredSoulGrade <= soulGrade)
        .sort((a, b) => a.requiredSoulGrade - b.requiredSoulGrade);
}
