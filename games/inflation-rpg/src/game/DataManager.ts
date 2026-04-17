import { MONSTERS, MonsterData, getMonsterById } from './data/Monsters';

/**
 * 게임 내 정적 데이터(몬스터 등)를 관리하는 클래스입니다.
 * 외부 데이터 파일을 로드하고 메모리에 캐싱하여 조회 기능을 제공합니다.
 */
export class DataManager {
    /** 몬스터 ID를 키로 하는 몬스터 데이터 맵 */
    static monsters: Map<number, MonsterData> = new Map();

    /**
     * 몬스터 데이터 목록을 불러와 메모리에 로드합니다.
     */
    static async loadMonsterData() {
        // 정적 TypeScript 파일에서 데이터 로드
        MONSTERS.forEach(m => {
            this.monsters.set(m.id, m);
        });
        console.log(`[DataManager] Loaded ${this.monsters.size} monsters from TypeScript.`);
    }

    /**
     * 몬스터 ID로 특정 몬스터 데이터를 조회합니다.
     * @param id 조회할 몬스터 ID
     * @returns 몬스터 데이터 또는 undefined
     */
    static getMonster(id: number): MonsterData | undefined {
        return getMonsterById(id);
    }
}
