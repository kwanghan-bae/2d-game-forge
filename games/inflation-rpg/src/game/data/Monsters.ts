/**
 * 게임 내 모든 몬스터의 데이터와 관련 유틸리티 함수를 정의하는 파일입니다.
 * 
 * [주요 구성 요소]
 * 1. MonsterData: 몬스터의 스탯, 보상, 속성 등을 정의하는 인터페이스 (MonsterTypes.ts에서 임포트)
 * 2. getScaledMonsterStats: 지역 레벨에 따른 몬스터 능력치 스케일링 로직
 * 3. MONSTERS: 1,000종 이상의 몬스터 데이터 (MonsterTable.ts에서 임포트)
 * 4. 유틸리티 함수: ID별 조회, 보스 목록 필터링 등
 * 
 * 주의: MONSTERS 배열은 외부 데이터 시트에서 자동 생성되므로, 수동 수정 시 데이터 구조를 준수해야 합니다.
 */
import BigNumber from 'bignumber.js';
import { MONSTERS } from './MonsterTable';
import { MonsterData } from './MonsterTypes';

// MonsterTable과 MonsterTypes에서 데이터 재보내기
export { MONSTERS };
export type { MonsterData };

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
    // Zone Level을 최소 1로 보정
    const level = Math.max(1, zoneLevel);
    
    // 성장률 구간별 계산
    const growthRate = getGrowthRate(level);
    
    // 지수 스케일링 적용: base * growthRate^level
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

/**
 * 주어진 ID에 해당하는 몬스터 정보를 반환합니다.
 * @param id 조회할 몬스터 ID
 * @returns 몬스터 데이터 또는 undefined
 */
export const getMonsterById = (id: number): MonsterData | undefined => {
    return MONSTERS.find(m => m.id === id);
};

/**
 * 게임 내 모든 보스 몬스터 목록을 반환합니다.
 * @returns 보스 몬스터 데이터 배열
 */
export function getBossList(): MonsterData[] {
    return MONSTERS.filter(m => m.isBoss === true);
}

/**
 * 주어진 몬스터 ID가 보스 몬스터인지 여부를 확인합니다.
 * @param monsterId 확인할 몬스터 ID
 * @returns 보스 여부
 */
export function isBossMonster(monsterId: number): boolean {
    const monster = getMonsterById(monsterId);
    return monster ? monster.isBoss === true : false;
}
