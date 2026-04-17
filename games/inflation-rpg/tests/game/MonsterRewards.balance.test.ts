import { describe, it, expect } from 'vitest';
import { DataManager } from '../src/game/DataManager';

describe('Monster Gold Balance - 밸런스 검증', () => {
    describe('Rank 기반 배율 검증', () => {
        it('Rank 1 몬스터는 1.0x 배율 적용', () => {
            const monster = DataManager.getMonster(1000);
            expect(monster).toBeDefined();
            expect(monster!.rank).toBe(1);
            expect(monster!.baseHP).toBe(100);
            expect(monster!.baseGold).toBe(10); // floor(100/10) * 1.0 = 10
        });
        
        it('Rank 2 몬스터는 1.5x 배율 적용', () => {
            const monster = DataManager.getMonster(1099);
            expect(monster).toBeDefined();
            expect(monster!.rank).toBe(2);
            expect(monster!.baseHP).toBe(10000);
            expect(monster!.baseGold).toBe(1500); // floor(10000/10) * 1.5 = 1500
        });
        
        it('Rank 3 몬스터는 2.0x 배율 적용', () => {
            const monster = DataManager.getMonster(1001);
            expect(monster).toBeDefined();
            expect(monster!.rank).toBe(3);
            expect(monster!.baseHP).toBe(200);
            expect(monster!.baseGold).toBe(40); // floor(200/10) * 2.0 = 40
        });
    });
    
    describe('HP 기반 스케일링 검증', () => {
        it('같은 Rank에서 HP가 높으면 더 많은 골드', () => {
            const monsterLow = DataManager.getMonster(1000);  // HP=100, Rank=1
            const monsterHigh = DataManager.getMonster(1002); // HP=300, Rank=1
            
            expect(monsterLow!.rank).toBe(monsterHigh!.rank);
            expect(monsterHigh!.baseGold).toBeGreaterThan(monsterLow!.baseGold);
            
            expect(monsterLow!.baseGold).toBe(10);  // floor(100/10) * 1.0
            expect(monsterHigh!.baseGold).toBe(30); // floor(300/10) * 1.0
        });
        
        it('HP가 10배 증가하면 골드도 10배 증가 (같은 Rank)', () => {
            const monster1 = DataManager.getMonster(1000); // HP=100, Rank=1
            const monster2 = DataManager.getMonster(1002); // HP=300, Rank=1
            
            const hpRatio = monster2!.baseHP / monster1!.baseHP;
            const goldRatio = monster2!.baseGold / monster1!.baseGold;
            
            expect(goldRatio).toBe(hpRatio); // 3배 : 3배
        });
    });
    
    describe('복합 밸런스 검증', () => {
        it('낮은 Rank + 높은 HP vs 높은 Rank + 낮은 HP', () => {
            const lowRankHighHP = DataManager.getMonster(1002); // HP=300, Rank=1, gold=30
            const highRankLowHP = DataManager.getMonster(1001); // HP=200, Rank=3, gold=40
            
            expect(lowRankHighHP!.baseGold).toBe(30);
            expect(highRankLowHP!.baseGold).toBe(40);
            
            expect(highRankLowHP!.baseGold).toBeGreaterThan(lowRankHighHP!.baseGold);
        });
        
        it('baseGold는 항상 양수', () => {
            const monsters = [1000, 1001, 1002, 1099];
            
            monsters.forEach(id => {
                const monster = DataManager.getMonster(id);
                expect(monster).toBeDefined();
                expect(monster!.baseGold).toBeGreaterThan(0);
            });
        });
        
        it('baseGold 공식 준수 확인: floor(HP/10) * rankMultiplier', () => {
            const rankMultipliers: Record<number, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };
            const testCases = [
                { id: 1000, hp: 100, rank: 1 },
                { id: 1001, hp: 200, rank: 3 },
                { id: 1002, hp: 300, rank: 1 },
                { id: 1099, hp: 10000, rank: 2 },
            ];
            
            testCases.forEach(({ id, hp, rank }) => {
                const monster = DataManager.getMonster(id);
                const expectedGold = Math.floor(hp / 10) * rankMultipliers[rank];
                
                expect(monster!.baseHP).toBe(hp);
                expect(monster!.rank).toBe(rank);
                expect(monster!.baseGold).toBe(expectedGold);
            });
        });
    });
    
    describe('경제 시스템 영향 검증', () => {
        it('Rank가 높을수록 인플레이션 후 보상 격차가 유지됨', () => {
            const rank1Monster = DataManager.getMonster(1000); // baseGold=10
            const rank3Monster = DataManager.getMonster(1001); // baseGold=40
            
            const ratio = rank3Monster!.baseGold / rank1Monster!.baseGold;
            
            expect(ratio).toBe(4);
            expect(rank3Monster!.baseGold).toBeGreaterThan(rank1Monster!.baseGold);
        });
    });
});
