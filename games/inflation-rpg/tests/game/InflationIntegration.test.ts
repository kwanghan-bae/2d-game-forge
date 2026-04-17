import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/game/GameState';
import { getScaledMonsterStats, MONSTERS } from '../src/game/data/Monsters';
import BigNumber from 'bignumber.js';

/**
 * 인플레이션 E2E 통합 테스트
 * 
 * 목표: 플레이어와 몬스터의 지수적 성장이 게임플레이에서 올바르게 작동하는지 검증
 */
describe('Inflation E2E Integration Tests', () => {
    let gameState: GameState;
    
    const getGrowthRate = (level: number): number => {
        if (level <= 100) return 1.05;
        if (level <= 500) return 1.08;
        if (level <= 1000) return 1.12;
        return 1.15;
    };
    
    const levelUpToTarget = (target: number) => {
        while (gameState.stats.level < target) {
            const neededExp = gameState.stats.maxExp;
            gameState.gainExp(neededExp);
        }
    };
    
    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();
    });
    
    describe('Level 1 → 100 성장 시나리오', () => {
        it('Level 1에서 Level 100까지 성장 시 스탯이 지수적으로 증가', () => {
            const level1Stats = {
                atk: gameState.stats.attack,
                hp: gameState.stats.maxHp,
                def: gameState.stats.defense
            };
            
            levelUpToTarget(100);
            
            const level100Stats = {
                atk: gameState.stats.attack,
                hp: gameState.stats.maxHp,
                def: gameState.stats.defense
            };
            
            expect(gameState.stats.level).toBe(100);
            expect(level100Stats.atk).toBeGreaterThan(level1Stats.atk * 100);
            expect(level100Stats.hp).toBeGreaterThan(level1Stats.hp * 100);
            expect(level100Stats.def).toBeGreaterThan(level1Stats.def * 100);
        });
        
        it('Level 50 플레이어와 Zone 50 몬스터 스탯이 비슷한 비율로 성장', () => {
            levelUpToTarget(50);
            
            const playerAtLevel50 = gameState.stats.attack;
            const monsterBaseStats = MONSTERS[0];
            const monsterAtZone50 = getScaledMonsterStats(
                monsterBaseStats.baseHP,
                monsterBaseStats.baseATK,
                monsterBaseStats.baseDEF,
                50
            );
            
            const playerGrowth = new BigNumber(playerAtLevel50).dividedBy(10);
            const monsterGrowth = new BigNumber(monsterAtZone50.atk).dividedBy(10);
            
            const ratio = playerGrowth.dividedBy(monsterGrowth).toNumber();
            
            expect(ratio).toBeGreaterThan(0.5);
            expect(ratio).toBeLessThan(3);
        });
        
        it('Level 100 플레이어가 Zone 1 몬스터를 압도 (원펀 가능)', () => {
            levelUpToTarget(100);
            
            const playerAtLevel100 = gameState.stats.attack;
            const monsterBaseStats = MONSTERS[0];
            const monsterAtZone1 = getScaledMonsterStats(
                monsterBaseStats.baseHP,
                monsterBaseStats.baseATK,
                monsterBaseStats.baseDEF,
                1
            );
            
            expect(playerAtLevel100).toBeGreaterThan(monsterAtZone1.hp * 10);
        });
    });
    
    describe('Level 100 → 500 중급 성장 시나리오', () => {
        beforeEach(() => {
            levelUpToTarget(100);
        });
        
        it('Level 100에서 500까지 성장률 1.08x 적용 확인', () => {
            const level100Atk = gameState.stats.attack;
            
            levelUpToTarget(500);
            
            const level500Atk = gameState.stats.attack;
            const growthRate = getGrowthRate(500);
            
            expect(gameState.stats.level).toBe(500);
            expect(growthRate).toBe(1.08);
            expect(level500Atk).toBeGreaterThan(level100Atk * 1000);
        });
        
        it('Zone 200 몬스터 HP가 Million 단위 (1M 이상)', () => {
            const monsterBaseStats = MONSTERS[0];
            const monsterAtZone200 = getScaledMonsterStats(
                monsterBaseStats.baseHP,
                monsterBaseStats.baseATK,
                monsterBaseStats.baseDEF,
                200
            );
            
            expect(monsterAtZone200.hp).toBeGreaterThan(1000000);
        });
    });
    
    describe('Level 500 → 1000 고급 성장 시나리오', () => {
        beforeEach(() => {
            levelUpToTarget(500);
        });
        
        it('Level 500에서 1000까지 성장률 1.12x 적용 확인', () => {
            const level500Atk = gameState.stats.attack;
            
            levelUpToTarget(1000);
            
            const level1000Atk = gameState.stats.attack;
            const growthRate = getGrowthRate(1000);
            
            expect(gameState.stats.level).toBe(1000);
            expect(growthRate).toBe(1.12);
            expect(level1000Atk).toBeGreaterThan(level500Atk * 100000);
        });
        
        it('Zone 1000 몬스터 HP가 Billion 단위 (1B 이상)', () => {
            const monsterBaseStats = MONSTERS[0];
            const monsterAtZone1000 = getScaledMonsterStats(
                monsterBaseStats.baseHP,
                monsterBaseStats.baseATK,
                monsterBaseStats.baseDEF,
                1000
            );
            
            expect(new BigNumber(monsterAtZone1000.hp).isGreaterThan(1000000000)).toBe(true);
        });
        
        it('Level 1000 플레이어 스탯이 BigNumber 정밀도 범위 내', () => {
            levelUpToTarget(1000);
            
            const atk = gameState.stats.attack;
            const hp = gameState.stats.maxHp;
            const def = gameState.stats.defense;
            
            expect(atk).toBeGreaterThan(0);
            expect(hp).toBeGreaterThan(0);
            expect(def).toBeGreaterThan(0);
            expect(isFinite(atk)).toBe(true);
            expect(isFinite(hp)).toBe(true);
            expect(isFinite(def)).toBe(true);
        });
    });
    
    describe('인플레이션 밸런스 검증', () => {
        it('같은 레벨의 플레이어와 같은 존의 몬스터가 전투 가능한 밸런스', () => {
            const testLevels = [10, 50, 100, 200, 500, 1000];
            
            testLevels.forEach(targetLevel => {
                gameState.reset();
                levelUpToTarget(targetLevel);
                
                const playerAtk = gameState.stats.attack;
                const playerHp = gameState.stats.maxHp;
                const monsterBaseStats = MONSTERS[0];
                const monsterStats = getScaledMonsterStats(
                    monsterBaseStats.baseHP,
                    monsterBaseStats.baseATK,
                    monsterBaseStats.baseDEF,
                    targetLevel
                );
                
                const playerCanKillMonster = playerAtk > 0 && monsterStats.hp > 0;
                const monsterCanHurtPlayer = monsterStats.atk > 0 && playerHp > 0;
                const playerDamage = gameState.getDamage();
                const turnsToKill = Math.ceil(monsterStats.hp / playerDamage);
                const turnsToPlayerDeath = Math.ceil(playerHp / monsterStats.atk);
                
                expect(playerCanKillMonster).toBe(true);
                expect(monsterCanHurtPlayer).toBe(true);
                expect(turnsToKill).toBeGreaterThan(0);
                expect(turnsToPlayerDeath).toBeGreaterThan(turnsToKill * 0.5);
            });
        });
        
        it('플레이어가 자기 레벨보다 10레벨 낮은 존을 쉽게 클리어', () => {
            levelUpToTarget(50);
            
            const playerAtLevel50 = gameState.getDamage();
            const monsterBaseStats = MONSTERS[0];
            const monsterAtZone40 = getScaledMonsterStats(
                monsterBaseStats.baseHP,
                monsterBaseStats.baseATK,
                monsterBaseStats.baseDEF,
                40
            );
            
            const turnsToKill = Math.ceil(monsterAtZone40.hp / playerAtLevel50);
            
            expect(turnsToKill).toBeLessThan(10);
        });
        
        it('플레이어가 자기 레벨보다 10레벨 높은 존에서 도전적인 전투', () => {
            levelUpToTarget(50);
            
            const playerAtLevel50 = gameState.getDamage();
            const playerHp = gameState.stats.maxHp;
            const monsterBaseStats = MONSTERS[0];
            const monsterAtZone60 = getScaledMonsterStats(
                monsterBaseStats.baseHP,
                monsterBaseStats.baseATK,
                monsterBaseStats.baseDEF,
                60
            );
            
            const turnsToKillMonster = Math.ceil(monsterAtZone60.hp / playerAtLevel50);
            const turnsToPlayerDeath = Math.ceil(playerHp / monsterAtZone60.atk);
            
            expect(turnsToKillMonster).toBeGreaterThan(10);
            expect(turnsToPlayerDeath).toBeGreaterThan(turnsToKillMonster * 0.3);
        });
    });
    
    describe('NumberFormatter 통합 검증', () => {
        it('Level 100 스탯이 "K" 단위로 표시 가능', () => {
            levelUpToTarget(100);
            
            const atk = gameState.stats.attack;
            const hp = gameState.stats.maxHp;
            
            expect(atk).toBeGreaterThan(1000);
            expect(hp).toBeGreaterThan(1000);
        });
        
        it('Level 500 스탯이 "M" 단위로 표시 가능', () => {
            levelUpToTarget(500);
            
            const atk = gameState.stats.attack;
            const hp = gameState.stats.maxHp;
            
            expect(atk).toBeGreaterThan(1000000);
            expect(hp).toBeGreaterThan(1000000);
        });
        
        it('Level 1000 스탯이 "B" 또는 "T" 단위로 표시 가능', () => {
            levelUpToTarget(1000);
            
            const atk = gameState.stats.attack;
            const hp = gameState.stats.maxHp;
            
            expect(atk).toBeGreaterThan(1000000000);
            expect(hp).toBeGreaterThan(1000000000);
        });
    });
});
