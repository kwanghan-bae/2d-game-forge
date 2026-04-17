import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '../src/game/GameState';
import { InflationManager } from '../src/game/utils/InflationManager';
import { DataManager } from '../src/game/DataManager';

describe('BattleScene - Inflated Reward System', () => {
    let gameState: GameState;
    let inflationManager: InflationManager;
    
    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();
        
        inflationManager = InflationManager.getInstance();
        inflationManager.reset();
        inflationManager.setInflationRate(0.02); // 2% 인플레이션
    });
    
    describe('기본 보상 계산 (인플레이션 없음)', () => {
        it('0분 경과 시 baseGold 그대로 반환', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime) // reset() 호출
                .mockReturnValueOnce(startTime); // getInflatedPrice() 호출
            
            inflationManager.reset();
            
            const monster = DataManager.getMonster(1000); // 외다리 도깨비
            expect(monster).toBeDefined();
            
            const baseGold = monster!.baseGold;
            const inflatedGold = inflationManager.getInflatedPrice(baseGold);
            
            expect(inflatedGold).toBe(10); // baseGold = 10
            expect(Math.floor(inflatedGold)).toBe(10);
        });
        
        it('몬스터 데이터에 baseGold 필드 존재 확인', () => {
            const monster1 = DataManager.getMonster(1000); // HP=100, Rank=1
            const monster2 = DataManager.getMonster(1001); // HP=200, Rank=3
            const monster3 = DataManager.getMonster(1099); // HP=10000, Rank=2
            
            expect(monster1?.baseGold).toBeDefined();
            expect(monster1?.baseGold).toBe(10); // floor(100/10) * 1.0 = 10
            
            expect(monster2?.baseGold).toBeDefined();
            expect(monster2?.baseGold).toBe(40); // floor(200/10) * 2.0 = 40
            
            expect(monster3?.baseGold).toBeDefined();
            expect(monster3?.baseGold).toBe(1500); // floor(10000/10) * 1.5 = 1500
        });
    });
    
    describe('인플레이션이 적용된 보상 계산', () => {
        it('1분 경과 시 골드 보상 2% 증가', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)          // reset()
                .mockReturnValueOnce(startTime + 60000); // getInflatedPrice() - 1분 경과
            
            inflationManager.reset();
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold; // 10
            const inflatedGold = inflationManager.getInflatedPrice(baseGold);
            
            // 10 * (1.02)^1 = 10.2 → Math.floor() = 10
            expect(Math.floor(inflatedGold)).toBe(10);
            expect(inflatedGold).toBeCloseTo(10.2, 1);
        });
        
        it('5분 경과 시 골드 보상 10.41% 증가', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)           // reset()
                .mockReturnValueOnce(startTime + 300000); // 5분 경과
            
            inflationManager.reset();
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold; // 10
            const inflatedGold = inflationManager.getInflatedPrice(baseGold);
            
            // 10 * (1.02)^5 = 11.0408 → Math.floor() = 11
            expect(Math.floor(inflatedGold)).toBe(11);
            expect(inflatedGold).toBeCloseTo(11.04, 1);
        });
        
        it('10분 경과 시 골드 보상 21.90% 증가', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)           // reset()
                .mockReturnValueOnce(startTime + 600000); // 10분 경과
            
            inflationManager.reset();
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold; // 10
            const inflatedGold = inflationManager.getInflatedPrice(baseGold);
            
            // 10 * (1.02)^10 = 12.1899 → Math.floor() = 12
            expect(Math.floor(inflatedGold)).toBe(12);
            expect(inflatedGold).toBeCloseTo(12.19, 1);
        });
        
        it('100분 경과 시 골드 보상 624% 증가', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)            // reset()
                .mockReturnValueOnce(startTime + 6000000); // 100분 경과
            
            inflationManager.reset();
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold; // 10
            const inflatedGold = inflationManager.getInflatedPrice(baseGold);
            
            // 10 * (1.02)^100 = 72.446 → Math.floor() = 72
            expect(Math.floor(inflatedGold)).toBe(72);
            expect(inflatedGold).toBeCloseTo(72.45, 0);
        });
    });
    
    describe('GameState 골드 획득 통합', () => {
        it('인플레이션 적용된 골드가 GameState에 정확히 추가됨', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)           // reset()
                .mockReturnValueOnce(startTime + 300000); // 5분 경과
            
            inflationManager.reset();
            gameState.stats.gold = 100;
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));
            
            gameState.gainGold(inflatedGold);
            
            expect(gameState.stats.gold).toBe(100 + inflatedGold);
            expect(gameState.stats.gold).toBe(111); // 100 + 11
        });
        
        it('여러 전투 후 누적 골드 계산 정확성', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValue(startTime); // 모든 호출에 같은 시간 반환
            
            inflationManager.reset();
            gameState.stats.gold = 0;
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold;
            
            // 3번 전투
            for (let i = 0; i < 3; i++) {
                const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));
                gameState.gainGold(inflatedGold);
            }
            
            expect(gameState.stats.gold).toBe(30); // 10 * 3
        });
    });
    
    describe('다양한 몬스터 보상 테스트', () => {
        it('높은 레벨 몬스터는 더 많은 골드 보상', () => {
            const monster1 = DataManager.getMonster(1000); // HP=100, Rank=1
            const monster2 = DataManager.getMonster(1099); // HP=10000, Rank=2
            
            expect(monster1?.baseGold).toBe(10);  // floor(100/10) * 1.0 = 10
            expect(monster2?.baseGold).toBe(1500); // floor(10000/10) * 1.5 = 1500
            
            // HP가 높고 Rank가 높을수록 더 많은 골드
            expect(monster2!.baseGold).toBeGreaterThan(monster1!.baseGold);
        });
        
        it('인플레이션은 모든 몬스터 보상에 동일하게 적용', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)           // reset() 호출
                .mockReturnValue(startTime + 300000);     // 이후 모든 호출은 5분 경과
            
            inflationManager.reset();
            
            const monster1 = DataManager.getMonster(1000); // baseGold=10
            const monster2 = DataManager.getMonster(1001); // baseGold=40
            
            const gold1 = inflationManager.getInflatedPrice(monster1!.baseGold);
            const gold2 = inflationManager.getInflatedPrice(monster2!.baseGold);
            
            // baseGold는 다르지만 인플레이션 비율은 동일하게 적용
            // 10 * (1.02)^5 = 11.04
            // 40 * (1.02)^5 = 44.16
            expect(Math.floor(gold1)).toBe(11);
            expect(Math.floor(gold2)).toBe(44);
            
            // 비율 확인: gold2 / gold1 = 40 / 10 = 4배
            expect(Math.abs((gold2 / gold1) - 4.0)).toBeLessThan(0.01);
        });
    });
    
    describe('엣지 케이스', () => {
        it('baseGold가 0인 몬스터는 보상 0', () => {
            const inflatedGold = inflationManager.getInflatedPrice(0);
            expect(inflatedGold).toBe(0);
        });
        
        it('인플레이션 비율 0%면 보상 증가 없음', () => {
            inflationManager.setInflationRate(0);
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold;
            
            // 시간이 지나도 보상 변화 없음
            const inflatedGold = inflationManager.getInflatedPrice(baseGold);
            expect(inflatedGold).toBe(baseGold);
        });
        
        it('Math.floor() 적용 후 정수 반환 확인', () => {
            const startTime = 1000000000000;
            vi.spyOn(Date, 'now')
                .mockReturnValueOnce(startTime)
                .mockReturnValueOnce(startTime + 60000); // 1분
            
            inflationManager.reset();
            
            const monster = DataManager.getMonster(1000);
            const baseGold = monster!.baseGold;
            const inflatedGold = Math.floor(inflationManager.getInflatedPrice(baseGold));
            
            expect(Number.isInteger(inflatedGold)).toBe(true);
        });
    });
});
