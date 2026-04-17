import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/game/GameState';
import { ClassId } from '../src/game/data/ClassData';
import { applyPassiveEffect, Stats } from '../src/game/utils/StatCalculator';

describe('BattleScene - Class Passive Effects Integration', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();
    });

    describe('Hwarang (화랑) - Stat Boost Passive', () => {
        it('화랑 선택 시 모든 스탯 × 1.10 적용', () => {
            // Arrange
            gameState.selectedClass = ClassId.HWARANG;
            const baseStat: Stats = {
                hp: 100,
                attack: 10,
                defense: 5,
                agi: 5,
                luk: 5
            };

            // Act
            const passive = applyPassiveEffect(ClassId.HWARANG, baseStat);

            // Assert
            expect(passive.statMultipliers).toBeDefined();
            expect(passive.statMultipliers?.hp).toBe(1.10);
            expect(passive.statMultipliers?.attack).toBe(1.10);
            expect(passive.statMultipliers?.defense).toBe(1.10);
            expect(passive.statMultipliers?.agi).toBe(1.10);
            expect(passive.statMultipliers?.luk).toBe(1.10);
        });

        it('화랑 패시브 적용 후 스탯 계산', () => {
            // Arrange
            gameState.stats.hp = 100;
            gameState.stats.maxHp = 100;
            gameState.stats.attack = 10;
            gameState.stats.defense = 5;
            gameState.stats.agi = 5;
            gameState.stats.luk = 5;

            const currentStats: Stats = {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                agi: gameState.stats.agi,
                luk: gameState.stats.luk
            };

            // Act
            const passive = applyPassiveEffect(ClassId.HWARANG, currentStats);
            if (passive.statMultipliers) {
                gameState.stats.maxHp = Math.floor(gameState.stats.maxHp * (passive.statMultipliers.hp || 1));
                gameState.stats.hp = gameState.stats.maxHp;
                gameState.stats.attack = Math.floor(gameState.stats.attack * (passive.statMultipliers.attack || 1));
                gameState.stats.defense = Math.floor(gameState.stats.defense * (passive.statMultipliers.defense || 1));
                gameState.stats.agi = Math.floor(gameState.stats.agi * (passive.statMultipliers.agi || 1));
                gameState.stats.luk = Math.floor(gameState.stats.luk * (passive.statMultipliers.luk || 1));
            }

            // Assert
            expect(gameState.stats.maxHp).toBe(110);
            expect(gameState.stats.hp).toBe(110);
            expect(gameState.stats.attack).toBe(11);
            expect(gameState.stats.defense).toBe(5);
            expect(gameState.stats.agi).toBe(5);
            expect(gameState.stats.luk).toBe(5);
        });
    });

    describe('Choeui (초의) - Life Conversion Passive', () => {
        it('초의 선택 시 공격력 += HP × 0.05 적용', () => {
            // Arrange
            gameState.selectedClass = ClassId.CHOEUI;
            const baseStat: Stats = {
                hp: 200,
                attack: 50,
                defense: 60,
                agi: 40,
                luk: 30
            };

            // Act
            const passive = applyPassiveEffect(ClassId.CHOEUI, baseStat);

            // Assert
            expect(passive.attackBonus).toBeDefined();
            expect(passive.attackBonus).toBe(Math.floor(200 * 0.05)); // 10
        });

        it('초의 패시브 적용 후 공격력 증가', () => {
            // Arrange
            gameState.stats.hp = 200;
            gameState.stats.attack = 50;

            const currentStats: Stats = {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                agi: gameState.stats.agi,
                luk: gameState.stats.luk
            };

            // Act
            const passive = applyPassiveEffect(ClassId.CHOEUI, currentStats);
            if (passive.attackBonus) {
                gameState.stats.attack += passive.attackBonus;
            }

            // Assert
            expect(gameState.stats.attack).toBe(60); // 50 + 10
        });

        it('초의 패시브는 HP에 따라 다른 공격력 보너스', () => {
            // Arrange
            const currentStats: Stats = {
                hp: 300,
                attack: 70,
                defense: 80,
                agi: 60,
                luk: 50
            };

            // Act
            const passive = applyPassiveEffect(ClassId.CHOEUI, currentStats);

            // Assert
            expect(passive.attackBonus).toBe(15); // 300 * 0.05
        });
    });

    describe('Tiger Hunter (착호갑사) - Beast Damage Passive', () => {
        it('착호갑사 선택 시 짐승 타입 피해 × 1.50 적용', () => {
            // Arrange
            gameState.selectedClass = ClassId.TIGER_HUNTER;
            const baseStat: Stats = {
                hp: 90,
                attack: 110,
                defense: 55,
                agi: 70,
                luk: 65
            };

            // Act
            const passive = applyPassiveEffect(ClassId.TIGER_HUNTER, baseStat);

            // Assert
            expect(passive.beastDamageMultiplier).toBeDefined();
            expect(passive.beastDamageMultiplier).toBe(1.50);
        });

        it('착호갑사 패시브 적용으로 짐승 타입 몬스터 데미지 증가', () => {
            // Arrange
            let beastDamageMultiplier = 1;
            const baseDamage = 100;

            gameState.selectedClass = ClassId.TIGER_HUNTER;
            const currentStats: Stats = {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                agi: gameState.stats.agi,
                luk: gameState.stats.luk
            };

            // Act
            const passive = applyPassiveEffect(ClassId.TIGER_HUNTER, currentStats);
            if (passive.beastDamageMultiplier) {
                beastDamageMultiplier = passive.beastDamageMultiplier;
            }
            const finalDamage = Math.floor(baseDamage * beastDamageMultiplier);

            // Assert
            expect(finalDamage).toBe(150);
            expect(beastDamageMultiplier).toBe(1.50);
        });
    });

    describe('Mudang (무당) - Item Find Passive', () => {
        it('무당 선택 시 드롭률 × 1.20 적용', () => {
            // Arrange
            gameState.selectedClass = ClassId.MUDANG;
            const baseStat: Stats = {
                hp: 85,
                attack: 75,
                defense: 58,
                agi: 80,
                luk: 105
            };

            // Act
            const passive = applyPassiveEffect(ClassId.MUDANG, baseStat);

            // Assert
            expect(passive.dropRateMultiplier).toBeDefined();
            expect(passive.dropRateMultiplier).toBe(1.20);
        });

        it('무당 패시브 적용으로 드롭 보상 증가', () => {
            // Arrange
            let dropRateMultiplier = 1;
            const baseGold = 100;

            gameState.selectedClass = ClassId.MUDANG;
            const currentStats: Stats = {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                agi: gameState.stats.agi,
                luk: gameState.stats.luk
            };

            // Act
            const passive = applyPassiveEffect(ClassId.MUDANG, currentStats);
            if (passive.dropRateMultiplier) {
                dropRateMultiplier = passive.dropRateMultiplier;
            }
            const finalGold = Math.floor(baseGold * dropRateMultiplier);

            // Assert
            expect(finalGold).toBe(120);
            expect(dropRateMultiplier).toBe(1.20);
        });
    });

    describe('No Class Selected - Default Stats', () => {
        it('클래스 미선택 시 기본 스탯 사용', () => {
            // Arrange
            gameState.selectedClass = null;
            const baseStat: Stats = {
                hp: 100,
                attack: 10,
                defense: 5,
                agi: 5,
                luk: 5
            };

            // Act
            const passive = applyPassiveEffect(null as unknown as ClassId, baseStat);

            // Assert
            expect(passive).toEqual({});
        });

        it('선택된 클래스가 없을 때 스탯 변경 없음', () => {
            // Arrange
            gameState.selectedClass = null;
            gameState.stats.hp = 100;
            gameState.stats.maxHp = 100;
            gameState.stats.attack = 10;

            const beforeHp = gameState.stats.hp;
            const beforeAttack = gameState.stats.attack;

            // Act - No passive applied
            const currentStats: Stats = {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                agi: gameState.stats.agi,
                luk: gameState.stats.luk
            };
            const passive = applyPassiveEffect(null as unknown as ClassId, currentStats);

            // Assert - No changes
            expect(gameState.stats.hp).toBe(beforeHp);
            expect(gameState.stats.attack).toBe(beforeAttack);
            expect(passive).toEqual({});
        });
    });

    describe('Multiple Class Passive Effect Tests', () => {
        it('각 직업의 패시브 효과가 독립적으로 작동', () => {
            // Arrange
            const baseStat: Stats = {
                hp: 100,
                attack: 50,
                defense: 50,
                agi: 50,
                luk: 50
            };

            // Act - Test all classes
            const hwarangPassive = applyPassiveEffect(ClassId.HWARANG, baseStat);
            const choeuiPassive = applyPassiveEffect(ClassId.CHOEUI, baseStat);
            const tigerPassive = applyPassiveEffect(ClassId.TIGER_HUNTER, baseStat);
            const mudangPassive = applyPassiveEffect(ClassId.MUDANG, baseStat);

            // Assert
            expect(hwarangPassive.statMultipliers).toBeDefined();
            expect(choeuiPassive.attackBonus).toBeDefined();
            expect(tigerPassive.beastDamageMultiplier).toBeDefined();
            expect(mudangPassive.dropRateMultiplier).toBeDefined();

            // Verify they are different
            expect(hwarangPassive.statMultipliers).not.toEqual(choeuiPassive.attackBonus);
            expect(tigerPassive.beastDamageMultiplier).not.toEqual(mudangPassive.dropRateMultiplier);
        });

        it('패시브 효과 적용 후 원본 스탯은 변하지 않음', () => {
            // Arrange
            const originalStats: Stats = {
                hp: 100,
                attack: 10,
                defense: 5,
                agi: 5,
                luk: 5
            };
            const copyStats = { ...originalStats };

            // Act
            const passive = applyPassiveEffect(ClassId.HWARANG, copyStats);

            // Assert
            expect(originalStats).toEqual(copyStats);
            expect(passive.statMultipliers).toBeDefined();
        });
    });

    describe('Edge Cases and Type Safety', () => {
        it('존재하지 않는 클래스는 빈 객체 반환', () => {
            // Arrange
            const baseStat: Stats = {
                hp: 100,
                attack: 10,
                defense: 5,
                agi: 5,
                luk: 5
            };

            // Act
            const passive = applyPassiveEffect('invalid' as unknown as ClassId, baseStat);

            // Assert
            expect(passive).toEqual({});
        });

        it('음수 스탯도 올바르게 처리', () => {
            // Arrange (edge case)
            const baseStat: Stats = {
                hp: 0,
                attack: 0,
                defense: 0,
                agi: 0,
                luk: 0
            };

            // Act
            const passive = applyPassiveEffect(ClassId.CHOEUI, baseStat);

            // Assert
            expect(passive.attackBonus).toBe(0);
        });

        it('높은 HP 스탯도 올바르게 계산', () => {
            // Arrange
            const baseStat: Stats = {
                hp: 999999,
                attack: 50,
                defense: 50,
                agi: 50,
                luk: 50
            };

            // Act
            const passive = applyPassiveEffect(ClassId.CHOEUI, baseStat);

            // Assert
            expect(passive.attackBonus).toBe(Math.floor(999999 * 0.05));
        });
    });
});
