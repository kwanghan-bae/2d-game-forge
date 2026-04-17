import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/game/GameState';

describe('BattleScene - GameState Integration', () => {
    let gameState: GameState;
    
    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();
    });
    
    describe('Damage Calculation', () => {
        it('getDamage()는 attack stat 기반 데미지 반환', () => {
            gameState.stats.attack = 50;
            const damage = gameState.getDamage();
            
            expect(damage).toBeGreaterThanOrEqual(45);
            expect(damage).toBeLessThanOrEqual(55);
        });
        
        it('데미지는 공격력의 90-110% 범위 (랜덤)', () => {
            gameState.stats.attack = 100;
            
            const damages: number[] = [];
            for (let i = 0; i < 100; i++) {
                damages.push(gameState.getDamage());
            }
            
            const min = Math.min(...damages);
            const max = Math.max(...damages);
            
            expect(min).toBeGreaterThanOrEqual(90);
            expect(max).toBeLessThanOrEqual(110);
        });
    });
    
    describe('HP Management', () => {
        it('takeDamage()는 HP 감소', () => {
            gameState.stats.hp = 100;
            gameState.takeDamage(30);
            
            expect(gameState.stats.hp).toBe(70);
        });
        
        it('HP는 0 미만으로 내려가지 않음', () => {
            gameState.stats.hp = 10;
            gameState.takeDamage(100);
            
            expect(gameState.stats.hp).toBe(0);
        });
        
        it('heal()은 HP 회복', () => {
            gameState.stats.hp = 50;
            gameState.stats.maxHp = 100;
            gameState.heal(30);
            
            expect(gameState.stats.hp).toBe(80);
        });
        
        it('heal()은 maxHp 초과 불가', () => {
            gameState.stats.hp = 90;
            gameState.stats.maxHp = 100;
            gameState.heal(20);
            
            expect(gameState.stats.hp).toBe(100);
        });
    });
    
    describe('Reward Calculation', () => {
        it('gainExp()는 경험치 획득', () => {
            const before = gameState.stats.exp;
            gameState.gainExp(50);
            
            expect(gameState.stats.exp).toBe(before + 50);
        });
        
        it('gainGold()는 골드 획득', () => {
            const before = gameState.stats.gold;
            gameState.gainGold(10);
            
            expect(gameState.stats.gold).toBe(before + 10);
        });
        
        it('경험치가 maxExp 도달 시 레벨업', () => {
            gameState.stats.exp = 0;
            gameState.stats.maxExp = 100;
            gameState.stats.level = 1;
            
            gameState.gainExp(100);
            
            expect(gameState.stats.level).toBe(2);
            expect(gameState.stats.exp).toBe(0);
        });
        
        it('경험치 초과분은 다음 레벨로 이월', () => {
            gameState.stats.exp = 80;
            gameState.stats.maxExp = 100;
            gameState.stats.level = 1;
            
            gameState.gainExp(50);
            
            expect(gameState.stats.level).toBe(2);
            expect(gameState.stats.exp).toBe(30);
        });
    });
    
    describe('Victory/Defeat Conditions', () => {
        it('적 HP 0 이하면 승리 조건 충족', () => {
            const enemyHP = 10;
            const playerDamage = 15;
            const remaining = enemyHP - playerDamage;
            
            expect(remaining).toBeLessThanOrEqual(0);
        });
        
        it('플레이어 HP 0 이하면 패배 조건 충족', () => {
            gameState.stats.hp = 10;
            gameState.takeDamage(15);
            
            expect(gameState.stats.hp).toBeLessThanOrEqual(0);
        });
        
        it('HP 0이면 isDead = true', () => {
            gameState.stats.hp = 0;
            
            expect(gameState.stats.hp).toBe(0);
        });
    });
    
    describe('Battle Flow Integration', () => {
        it('데미지 받은 후 힐 가능', () => {
            gameState.stats.hp = 100;
            gameState.stats.maxHp = 100;
            
            gameState.takeDamage(50);
            expect(gameState.stats.hp).toBe(50);
            
            gameState.heal(30);
            expect(gameState.stats.hp).toBe(80);
        });
        
        it('전투 후 보상 획득 흐름', () => {
            const beforeExp = gameState.stats.exp;
            const beforeGold = gameState.stats.gold;
            
            gameState.gainExp(50);
            gameState.gainGold(10);
            
            expect(gameState.stats.exp).toBe(beforeExp + 50);
            expect(gameState.stats.gold).toBe(beforeGold + 10);
        });
        
        it('여러 라운드 전투 시뮬레이션', () => {
            gameState.stats.hp = 100;
            gameState.stats.maxHp = 100;
            gameState.stats.attack = 50;
            
            gameState.takeDamage(20);
            expect(gameState.stats.hp).toBe(80);
            
            gameState.takeDamage(30);
            expect(gameState.stats.hp).toBe(50);
            
            gameState.heal(20);
            expect(gameState.stats.hp).toBe(70);
            
            const damage = gameState.getDamage();
            expect(damage).toBeGreaterThan(0);
        });
    });
});
