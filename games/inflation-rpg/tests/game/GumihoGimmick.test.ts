import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleCombatManager } from '../src/game/scenes/BattleCombatManager';
import { MonsterData } from '../src/game/data/MonsterData';
import { GameState } from '../src/game/GameState';

describe('Gumiho Gimmick (Defense Shield)', () => {
    let combatManager: BattleCombatManager;
    let gumiho: MonsterData;

    beforeEach(() => {
        GameState.resetInstance();
        combatManager = new BattleCombatManager();
        
        gumiho = {
            id: 9003,
            name: 'Boss_Gumiho',
            nameKR: '천 년의 구미호',
            rank: 15,
            element: 'Spirit',
            baseHP: 1000000,
            baseATK: 80000,
            baseDEF: 5000,
            baseAGI: 10000,
            baseLUK: 10000,
            zoneLv: 1, // 1로 설정 (getScaledMonsterStats는 Math.pow(growthRate, level)을 사용함)
            expReward: 50000,
            baseGold: 25000,
            dropItemID: 103,
            dropRate: 1.0,
            isBoss: true,
            bossSkills: [103]
        };
    });

    it('Gumiho should activate defense shield when HP is 50% or less, and it should trigger once', () => {
        combatManager.init(gumiho);
        
        // 보스전이므로 HP가 10배로 증가함 (BattleCombatManager.init 로직)
        const maxHP = 10000000;
        expect(combatManager.getEnemyMaxHP()).toBe(maxHP);
        
        // zoneLv 1에서의 방어력 계산: 5000 * 1.05^1 = 5250
        const baseDef = 5250;
        const shieldDef = baseDef * 5; // 26250
        
        // 플레이어 공격력을 100,000으로 설정
        GameState.getInstance().stats.attack = 100000;
        vi.spyOn(GameState.getInstance(), 'getDamage').mockReturnValue(100000);
        vi.spyOn(Math, 'random').mockReturnValue(0.5); // 치명타 방지
        
        // HP를 50.1%로 조정 (5,010,000)
        combatManager.subEnemyHP(4990000);
        expect(combatManager.getEnemyHP()).toBe(5010000);

        // 첫 번째 공격: 기믹 활성화 전 (방어력 5,250 적용)
        // damage = 100,000 - 5,250 = 94,750
        let result = combatManager.calculatePlayerAttack();
        expect(result.damage).toBe(94750);
        
        // 현재 HP: 5,010,000 - 94,750 = 4,915,250 (50% 이하)
        // 공격 후 기믹이 활성화됨 (isActive = true)
        expect(combatManager.getEnemyHP()).toBe(4915250);

        // 두 번째 공격: 기믹 활성화 상태 (방어력 26,250 적용)
        // damage = 100,000 - 26,250 = 73,750
        result = combatManager.calculatePlayerAttack();
        expect(result.damage).toBe(73750);
        
        // 몬스터 공격 (기믹 턴 감소: 3 -> 2)
        combatManager.calculateEnemyAttack();
        
        // 세 번째 공격: 기믹 활성화 상태 (2/3)
        result = combatManager.calculatePlayerAttack();
        expect(result.damage).toBe(73750);
        
        // 몬스터 공격 (기믹 턴 감소: 2 -> 1)
        combatManager.calculateEnemyAttack();
        
        // 네 번째 공격: 기믹 활성화 상태 (3/3)
        result = combatManager.calculatePlayerAttack();
        expect(result.damage).toBe(73750);
        
        // 몬스터 공격 (기믹 턴 감소: 1 -> 0, 기믹 종료)
        combatManager.calculateEnemyAttack();
        
        // 다섯 번째 공격: 기믹 종료 상태 (다시 방어력 5,250 적용)
        result = combatManager.calculatePlayerAttack();
        expect(result.damage).toBe(94750);
        
        // 다시 몬스터 공격해도 기믹이 재발동되지 않아야 함 (hasTriggered = true)
        combatManager.calculateEnemyAttack();
        result = combatManager.calculatePlayerAttack();
        expect(result.damage).toBe(94750);
        
        vi.restoreAllMocks();
    });

    it('Damage should be at least 1 even if defense is higher than attack', () => {
        combatManager.init(gumiho);
        GameState.getInstance().stats.attack = 1000; 
        vi.spyOn(GameState.getInstance(), 'getDamage').mockReturnValue(1000);
        
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const result = combatManager.calculatePlayerAttack();
        expect(result.damage).toBe(1);
        vi.restoreAllMocks();
    });
});
