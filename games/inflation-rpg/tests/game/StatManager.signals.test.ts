import { describe, it, expect } from 'vitest';
import { StatManager } from '../src/game/StatManager';
import { PlayerStats } from '../src/game/types/PlayerTypes';
import { effect } from '@preact/signals-react';

describe('StatManager (Signals Reactivity)', () => {
    it('StatManager.recalculate 호출 시 signal 값이 업데이트되고 반응해야 함', () => {
        const mockStats: PlayerStats = {
            hp: 100, maxHp: 100, gold: 0, level: 1, exp: 0, maxExp: 100,
            attack: 10, defense: 5, agi: 5, luk: 5, steps: 0, zone: '초보마을'
        };
        const equipment = {};
        
        // 1. 초기 반응성 확인 (기본적으로 effect가 한 번 실행됨)
        let attackValue = 0;
        const cleanup = effect(() => {
            // @ts-ignore: StatManager.attack may not exist yet
            attackValue = StatManager.attack;
        });

        // 2. recalculate 호출 (레벨 10으로 변경 후)
        mockStats.level = 10;
        StatManager.recalculate(mockStats, equipment);

        // 3. 기대값 확인 (레벨 10이면 공격력이 초기 10보다 커야 함)
        expect(attackValue).toBeGreaterThan(10);
        // @ts-ignore
        expect(StatManager.attack).toBe(attackValue);

        cleanup();
    });
});
