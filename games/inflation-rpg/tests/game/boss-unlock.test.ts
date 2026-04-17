import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameState } from '../../src/game/GameState';

describe('Boss Unlock System (WorldMap Logic)', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();
    });

    describe('getMonsterForZone Logic', () => {
        const getMonsterForZone = (x: number, y: number): number => {
            // Zone 1009 (좌상단): 산군 (항상 등장)
            if (x < 35 && y < 35) {
                return 9001;
            }

            // Zone 2005 (우하단): 염라대왕 (산군 처치 필수)
            if (x > 65 && y > 65) {
                if (!gameState.isBossDefeated(9001)) {
                    // 경고 메시지를 표시하고 일반 몬스터 반환
                    return 1000;
                }
                return 9002;
            }

            // Zone 1001 (좌하단): 일반 몬스터
            if (x < 35 && y > 65) {
                return 1001;
            }

            // 기본 몬스터
            return 1000;
        };

        it('Zone 1009 (좌상단)에서는 항상 산군(9001)을 배치', () => {
            const x = 30; // x < 35
            const y = 30; // y < 35
            const monsterId = getMonsterForZone(x, y);
            expect(monsterId).toBe(9001);
        });

        it('Zone 2005 (우하단)에서 산군 미처치 시 일반 몬스터(1000) 배치', () => {
            expect(gameState.isBossDefeated(9001)).toBe(false);
            
            const x = 70; // x > 65
            const y = 70; // y > 65
            const monsterId = getMonsterForZone(x, y);
            expect(monsterId).toBe(1000);
        });

        it('Zone 2005 (우하단)에서 산군 처치 후 염라대왕(9002) 배치', () => {
            gameState.addDefeatedBoss(9001);
            expect(gameState.isBossDefeated(9001)).toBe(true);
            
            const x = 70; // x > 65
            const y = 70; // y > 65
            const monsterId = getMonsterForZone(x, y);
            expect(monsterId).toBe(9002);
        });

        it('Zone 1001 (좌하단)에서는 일반 몬스터(1001) 배치', () => {
            const x = 30; // x < 35
            const y = 70; // y > 65
            const monsterId = getMonsterForZone(x, y);
            expect(monsterId).toBe(1001);
        });

        it('기타 zone에서는 일반 몬스터(1000) 배치', () => {
            const x = 50; // 중간 영역
            const y = 50; // 중간 영역
            const monsterId = getMonsterForZone(x, y);
            expect(monsterId).toBe(1000);
        });

        it('Zone 경계값 테스트: x=35, y=35는 Zone 1009 범위 제외', () => {
            const x = 35; // x < 35가 아님
            const y = 35; // y < 35가 아님
            const monsterId = getMonsterForZone(x, y);
            expect(monsterId).not.toBe(9001);
        });

        it('Zone 경계값 테스트: x=65, y=65는 Zone 2005 범위 제외', () => {
            gameState.addDefeatedBoss(9001);
            const x = 65; // x > 65가 아님
            const y = 65; // y > 65가 아님
            const monsterId = getMonsterForZone(x, y);
            expect(monsterId).not.toBe(9002);
        });
    });

    describe('Boss Defeat Records', () => {
        it('보스 처치 기록이 저장되어야 함', () => {
            expect(gameState.defeatedBosses.length).toBe(0);
            
            gameState.addDefeatedBoss(9001);
            expect(gameState.defeatedBosses).toContain(9001);
            expect(gameState.defeatedBosses.length).toBe(1);
        });

        it('산군 처치 후 isBossDefeated(9001)는 true 반환', () => {
            expect(gameState.isBossDefeated(9001)).toBe(false);
            
            gameState.addDefeatedBoss(9001);
            expect(gameState.isBossDefeated(9001)).toBe(true);
        });

        it('여러 보스 처치 기록이 유지되어야 함', () => {
            gameState.addDefeatedBoss(9001);
            gameState.addDefeatedBoss(9002);
            
            expect(gameState.defeatedBosses).toContain(9001);
            expect(gameState.defeatedBosses).toContain(9002);
            expect(gameState.defeatedBosses.length).toBe(2);
        });

        it('처치하지 않은 보스는 isBossDefeated에서 false 반환', () => {
            gameState.addDefeatedBoss(9001);
            
            expect(gameState.isBossDefeated(9001)).toBe(true);
            expect(gameState.isBossDefeated(9002)).toBe(false);
        });
    });

    describe('Boss Unlock Chain', () => {
        it('산군 미처치 상태: Zone 2005 접근 불가', () => {
            expect(gameState.isBossDefeated(9001)).toBe(false);
            // Zone 2005에서 일반 몬스터 배치
            const getMonsterForZone = (x: number, y: number): number => {
                if (x > 65 && y > 65) {
                    if (!gameState.isBossDefeated(9001)) {
                        return 1000;
                    }
                    return 9002;
                }
                return 1000;
            };
            
            const monsterId = getMonsterForZone(70, 70);
            expect(monsterId).toBe(1000);
        });

        it('산군 처치 후: Zone 2005 접근 가능', () => {
            gameState.addDefeatedBoss(9001);
            expect(gameState.isBossDefeated(9001)).toBe(true);
            
            const getMonsterForZone = (x: number, y: number): number => {
                if (x > 65 && y > 65) {
                    if (!gameState.isBossDefeated(9001)) {
                        return 1000;
                    }
                    return 9002;
                }
                return 1000;
            };
            
            const monsterId = getMonsterForZone(70, 70);
            expect(monsterId).toBe(9002);
        });
    });

    describe('Serialization with Boss Records', () => {
        it('보스 기록이 저장/로드 시 유지되어야 함', () => {
            gameState.addDefeatedBoss(9001);
            gameState.addDefeatedBoss(9002);
            
            const saved = gameState.toJSON();
            expect(saved.defeatedBosses).toContain(9001);
            expect(saved.defeatedBosses).toContain(9002);
            
            const newGameState = GameState.getInstance();
            newGameState.reset();
            newGameState.fromJSON(saved);
            
            expect(newGameState.isBossDefeated(9001)).toBe(true);
            expect(newGameState.isBossDefeated(9002)).toBe(true);
        });

        it('빈 defeatedBosses 배열도 정상 처리', () => {
            const saved = gameState.toJSON();
            expect(Array.isArray(saved.defeatedBosses)).toBe(true);
            expect(saved.defeatedBosses.length).toBe(0);
            
            const newGameState = GameState.getInstance();
            newGameState.reset();
            newGameState.fromJSON(saved);
            
            expect(newGameState.defeatedBosses.length).toBe(0);
        });
    });
});
