/**
 * 플레이어의 기본 능력치 및 상태 정보를 정의하는 인터페이스입니다.
 */
export interface PlayerStats {
    /** 현재 체력 */
    hp: number;
    /** 최대 체력 */
    maxHp: number;
    /** 보유 골드 */
    gold: number;
    /** 현재 레벨 */
    level: number;
    /** 현재 경험치 */
    exp: number;
    /** 레벨업에 필요한 최대 경험치 */
    maxExp: number;
    /** 공격력 */
    attack: number;
    /** 방어력 */
    defense: number;
    /** 민첩성 (회피, 속도 등에 영향) */
    agi: number;
    /** 행운 (드랍률, 크리티컬 등에 영향) */
    luk: number;
    /** 총 이동 걸음 수 */
    steps: number;
    /** 현재 위치한 지역 명칭 */
    zone: string;
}
