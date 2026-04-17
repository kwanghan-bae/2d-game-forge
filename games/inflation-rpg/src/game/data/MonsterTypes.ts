/**
 * 몬스터와 관련된 데이터 타입을 정의하는 파일입니다.
 */

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
