import { GameState } from '../GameState';

/**
 * 월드 맵에서의 플레이어 상태 제어 및 시스템 상호작용(인카운터, 구역 체크 등)을 관리하는 클래스입니다.
 */
export class WorldMapManager {
    /** 산군 보스 몬스터 ID */
    private readonly ZONE_1009_MONSTER = 9001;
    /** 염라대왕 보스 몬스터 ID */
    private readonly ZONE_2005_MONSTER = 9002;
    /** 염라대왕을 만나기 위해 처치해야 하는 보스 ID */
    private readonly ZONE_2005_BOSS_REQ = 9001;
    /** 일반 구역에서 등장하는 기본 몬스터 ID */
    private readonly DEFAULT_MONSTER = 1000;

    /**
     * 플레이어의 현재 위치(타일 좌표)를 기반으로 조우할 몬스터 ID를 결정합니다.
     * @param tx 플레이어의 현재 타일 X 좌표
     * @param ty 플레이어의 현재 타일 Y 좌표
     * @returns 해당 구역에서 등장할 몬스터 ID
     */
    public getMonsterForLocation(tx: number, ty: number): number {
        const gameState = GameState.getInstance();

        // 산군 구역 (좌상단 영역)
        if (tx < 35 && ty < 35) return this.ZONE_1009_MONSTER;

        // 염라대왕 구역 (우하단 영역) - 특정 보스 처치 조건 필요
        if (tx > 65 && ty > 65) {
            if (!gameState.isBossDefeated(this.ZONE_2005_BOSS_REQ)) {
                return this.DEFAULT_MONSTER;
            }
            return this.ZONE_2005_MONSTER;
        }

        return this.DEFAULT_MONSTER;
    }

    /**
     * 플레이어가 밟고 있는 타일의 종류에 따른 발소리 유형을 반환합니다.
     * @param tileIndex 밟고 있는 타일의 인덱스 번호
     * @param biomeStarts 각 바이옴별 타일 시작 번호 맵
     * @returns 발소리 유형 문자열 ('snow', 'stone', 'grass')
     */
    public getStepType(tileIndex: number, biomeStarts: { b1: number, b2: number }): string {
        if (tileIndex >= biomeStarts.b1 && tileIndex < biomeStarts.b1 + 1000) return 'snow';
        if (tileIndex >= biomeStarts.b2 && tileIndex < biomeStarts.b2 + 2000) return 'stone';
        return 'grass';
    }
}
