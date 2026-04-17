import BigNumber from 'bignumber.js';

/**
 * 몬스터의 기본 정보를 정의하는 인터페이스입니다.
 */
export interface MonsterData {
    /** 몬스터 고유 ID */
    id: number;
    /** 몬스터 영문 명칭 */
    name: string;
    /** 몬스터 한글 명칭 */
    nameKR: string;
    /** 몬스터 등급 */
    rank: number;
    /** 몬스터 속성 */
    element: string;
    /** 기본 체력 */
    baseHP: number;
    /** 기본 공격력 */
    baseATK: number;
    /** 기본 방어력 */
    baseDEF: number;
    /** 기본 민첩성 */
    baseAGI: number;
    /** 기본 행운 */
    baseLUK: number;
    /** 등장 지역 레벨 */
    zoneLv: number;
    /** 처치 시 획득 경험치 */
    expReward: number;
    /** 처치 시 획득 기본 골드 */
    baseGold: number;
    /** 드랍 아이템 ID (0은 없음) */
    dropItemID: number;
    /** 아이템 드랍 확률 (0~1) */
    dropRate: number;
    /** 하위 호환성을 위한 경험치 필드 */
    exp?: number;
    /** 하위 호환성을 위한 골드 필드 */
    gold?: number;
    /** 보스 몬스터 여부 */
    isBoss?: boolean;
    /** 보스 사용 스킬 ID 목록 */
    bossSkills?: number[];
}

/**
 * 지역 레벨(Zone Level)에 따른 몬스터 능력치 지수 스케일링 함수입니다.
 * @param baseHP 기본 체력
 * @param baseATK 기본 공격력
 * @param baseDEF 기본 방어력
 * @param zoneLevel 지역 레벨
 * @returns 스케일링된 체력, 공격력, 방어력 정보
 */
export function getScaledMonsterStats(
    baseHP: number,
    baseATK: number,
    baseDEF: number,
    zoneLevel: number
): { hp: number; atk: number; def: number } {
    const level = Math.max(1, zoneLevel);
    const growthRate = getGrowthRate(level);
    
    const hp = new BigNumber(baseHP).times(new BigNumber(growthRate).pow(level));
    const atk = new BigNumber(baseATK).times(new BigNumber(growthRate).pow(level));
    const def = new BigNumber(baseDEF).times(new BigNumber(growthRate).pow(level));
    
    return {
        hp: Math.floor(hp.toNumber()),
        atk: Math.floor(atk.toNumber()),
        def: Math.floor(def.toNumber())
    };
}

/**
 * 레벨 구간별 능력치 성장률을 반환합니다.
 * @param level 지역 레벨
 * @returns 해당 구간의 성장률 수치
 */
function getGrowthRate(level: number): number {
    if (level <= 100) return 1.05;
    if (level <= 500) return 1.08;
    if (level <= 1000) return 1.12;
    return 1.15;
}
