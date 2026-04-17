import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataManager } from '../src/game/DataManager';

describe('DataManager', () => {
    beforeEach(async () => {
        // 테스트 전 데이터 로드
        await DataManager.loadMonsterData();
    });

    it('loadMonsterData()가 성공적으로 데이터를 로드해야 함', async () => {
        expect(DataManager.monsters.size).toBeGreaterThan(0);
    });

    it('getMonster()가 유효한 ID에 대해 몬스터 데이터를 반환해야 함', () => {
        // ID 1001은 보통 첫 번째 몬스터 (쥐)
        const monster = DataManager.getMonster(1001);
        expect(monster).toBeDefined();
        expect(monster?.id).toBe(1001);
    });

    it('getMonster()가 존재하지 않는 ID에 대해 undefined를 반환해야 함', () => {
        const monster = DataManager.getMonster(999999);
        expect(monster).toBeUndefined();
    });

    it('loadMonsterData()를 여러 번 호출해도 일관성을 유지해야 함', async () => {
        const initialSize = DataManager.monsters.size;
        await DataManager.loadMonsterData();
        expect(DataManager.monsters.size).toBe(initialSize);
    });

    it('콘솔 로그가 올바르게 출력되어야 함', async () => {
        const logSpy = vi.spyOn(console, 'log');
        await DataManager.loadMonsterData();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded'));
        logSpy.mockRestore();
    });
});
