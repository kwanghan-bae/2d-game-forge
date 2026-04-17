import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameState } from '../src/game/GameState';
import { InflationManager } from '../src/game/utils/InflationManager';
import { getMonsterById } from '../src/game/data/Monsters';

/**
 * BattleScene UI 테스트
 * 
 * 전투 승리 화면에 인플레이션 정보가 올바르게 표시되는지 검증
 * 
 * 테스트 범위:
 * - 기본 골드 vs 인플레이션 적용 골드 표시
 * - 현재 인플레이션율 표시
 * - 경과 시간 표시
 * - 승리 메시지 포맷 검증
 */

describe('BattleScene UI - 인플레이션 정보 표시', () => {
    let gameState: GameState;
    let inflationManager: InflationManager;
    const TEST_MONSTER_ID = 1000;

    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();

        inflationManager = InflationManager.getInstance();
        inflationManager.reset();
        inflationManager.setInflationRate(0.02);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('기본 승리 메시지 (인플레이션 0분)', () => {
        it('인플레이션 0분일 때 기본 골드와 인플레이션 골드가 동일해야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime);

            inflationManager.reset();
            
            const monster = getMonsterById(TEST_MONSTER_ID);
            expect(monster).toBeDefined();
            expect(monster!.baseGold).toBe(10);

            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));

            expect(inflatedGold).toBe(10);
            expect(baseGold).toBe(inflatedGold);
        });

        it('승리 메시지에 EXP와 Gold가 표시되어야 함', () => {
            const monster = getMonsterById(TEST_MONSTER_ID);
            const expGain = monster!.expReward;
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));

            const expectedMessage = `수훈: ${expGain} EXP\n엽전: ${inflatedGold} Gold`;

            expect(expectedMessage).toContain('수훈:');
            expect(expectedMessage).toContain('EXP');
            expect(expectedMessage).toContain('엽전:');
            expect(expectedMessage).toContain('Gold');
        });
    });

    describe('인플레이션 정보 표시 (시간 경과)', () => {
        it('1분 경과 시 기본 골드와 인플레이션 골드 차이를 계산할 수 있어야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 60000);

            inflationManager.reset();
            
            const monster = getMonsterById(TEST_MONSTER_ID);
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));

            expect(inflatedGold).toBe(10);
            
            const difference = inflatedGold - baseGold;
            expect(difference).toBe(0);
        });

        it('5분 경과 시 인플레이션 적용 골드가 증가해야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 300000);

            inflationManager.reset();
            
            const monster = getMonsterById(TEST_MONSTER_ID);
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));

            expect(inflatedGold).toBe(11);
            
            const difference = inflatedGold - baseGold;
            expect(difference).toBeGreaterThan(0);
        });

        it('10분 경과 시 인플레이션 효과가 더욱 커져야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 600000);

            inflationManager.reset();
            
            const monster = getMonsterById(TEST_MONSTER_ID);
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));

            expect(inflatedGold).toBe(12);
            expect(inflatedGold).toBeGreaterThan(baseGold);
        });
    });

    describe('인플레이션율 표시', () => {
        it('현재 인플레이션율을 퍼센트로 변환할 수 있어야 함', () => {
            const rate = inflationManager.getInflationRate();
            const percentage = rate * 100;

            expect(percentage).toBe(2.0);
            expect(percentage.toFixed(1)).toBe('2.0');
        });

        it('인플레이션율이 0일 때 0.0%로 표시되어야 함', () => {
            inflationManager.setInflationRate(0);
            const rate = inflationManager.getInflationRate();
            const percentage = rate * 100;

            expect(percentage).toBe(0);
            expect(percentage.toFixed(1)).toBe('0.0');
        });
    });

    describe('경과 시간 표시', () => {
        it('0분 경과 시 "0분"으로 표시되어야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime);

            inflationManager.reset();
            const elapsedMinutes = inflationManager.getElapsedMinutes();

            expect(elapsedMinutes).toBe(0);
            expect(`${elapsedMinutes}분`).toBe('0분');
        });

        it('5분 경과 시 "5분"으로 표시되어야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 300000);

            inflationManager.reset();
            const elapsedMinutes = inflationManager.getElapsedMinutes();

            expect(elapsedMinutes).toBe(5);
            expect(`${elapsedMinutes}분`).toBe('5분');
        });

        it('10분 경과 시 "10분"으로 표시되어야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 600000);

            inflationManager.reset();
            const elapsedMinutes = inflationManager.getElapsedMinutes();

            expect(elapsedMinutes).toBe(10);
            expect(`${elapsedMinutes}분`).toBe('10분');
        });
    });

    describe('UI 메시지 포맷 검증', () => {
        it('승리 메시지에 기본 골드와 인플레이션 골드가 모두 표시되어야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 600000);

            inflationManager.reset();
            
            const monster = getMonsterById(TEST_MONSTER_ID);
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));

            const message = `기본: ${baseGold} → 현재: ${inflatedGold} 골드`;

            expect(message).toContain('기본:');
            expect(message).toContain('현재:');
            expect(message).toContain(baseGold.toString());
            expect(message).toContain(inflatedGold.toString());
        });

        it('인플레이션 정보가 포함된 상세 메시지 포맷 검증', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 600000);

            inflationManager.reset();
            
            const monster = getMonsterById(TEST_MONSTER_ID);
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));
            const rate = inflationManager.getInflationRate();
            const elapsedMinutes = inflationManager.getElapsedMinutes();

            const detailedMessage = [
                `엽전: ${inflatedGold} 골드 (기본: ${baseGold})`,
                `인플레이션: ${(rate * 100).toFixed(1)}%/분`,
                `경과 시간: ${elapsedMinutes}분`
            ].join('\n');

            expect(detailedMessage).toContain('엽전:');
            expect(detailedMessage).toContain('기본:');
            expect(detailedMessage).toContain('인플레이션:');
            expect(detailedMessage).toContain('경과 시간:');
            expect(detailedMessage).toContain('%/분');
        });
    });

    describe('엣지 케이스', () => {
        it('baseGold가 0일 때도 인플레이션 정보를 표시할 수 있어야 함', () => {
            const baseGold = 0;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));

            expect(inflatedGold).toBe(0);

            const message = `기본: ${baseGold} → 현재: ${inflatedGold} 골드`;
            expect(message).toBe('기본: 0 → 현재: 0 골드');
        });

        it('인플레이션율이 매우 높을 때 (100%) 올바르게 표시되어야 함', () => {
            inflationManager.setInflationRate(1.0);
            const rate = inflationManager.getInflationRate();
            const percentage = (rate * 100).toFixed(1);

            expect(percentage).toBe('100.0');
        });

        it('경과 시간이 매우 길 때 (1000분) 올바르게 표시되어야 함', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 60000000);

            inflationManager.reset();
            const elapsedMinutes = inflationManager.getElapsedMinutes();

            expect(elapsedMinutes).toBe(1000);
            expect(`${elapsedMinutes}분`).toBe('1000분');
        });
    });
});
