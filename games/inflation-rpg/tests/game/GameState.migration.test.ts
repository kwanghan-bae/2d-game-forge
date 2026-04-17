import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/game/GameState';

describe('GameState Migration', () => {
    let gameState: GameState;

    beforeEach(() => {
        // 각 테스트마다 새로운 인스턴스 생성을 위해 싱글톤 리셋
        (GameState as any).instance = undefined;
        gameState = GameState.getInstance();
    });

    describe('새로운 필드 초기화', () => {
        it('selectedClass는 null로 초기화되어야 함', () => {
            expect(gameState.selectedClass).toBe(null);
        });

        it('soulGrade는 0으로 초기화되어야 함', () => {
            expect(gameState.soulGrade).toBe(0);
        });

        it('karma는 0으로 초기화되어야 함', () => {
            expect(gameState.karma).toBe(0);
        });

        it('activeSkillCooldowns는 빈 객체로 초기화되어야 함', () => {
            expect(gameState.activeSkillCooldowns).toEqual({});
        });

        it('defeatedBosses는 빈 배열로 초기화되어야 함', () => {
            expect(gameState.defeatedBosses).toEqual([]);
        });

        it('unlockedClasses는 화랑(hwarang)을 기본으로 포함해야 함', () => {
            expect(gameState.unlockedClasses).toContain('hwarang');
            expect(gameState.unlockedClasses.length).toBe(1);
        });

        it('saveVersion은 1로 초기화되어야 함', () => {
            expect((gameState as any).saveVersion).toBe(1);
        });

        it('usedYaksuPoints는 빈 배열로 초기화되어야 함', () => {
            expect((gameState as any).usedYaksuPoints).toEqual([]);
        });
    });

    describe('직렬화/역직렬화', () => {
        it('toJSON()은 새 필드들을 포함해야 함', () => {
            gameState.selectedClass = 'hwarang';
            gameState.soulGrade = 3;
            gameState.karma = 50;
            gameState.activeSkillCooldowns = { 1: 1000, 2: 500 };
            gameState.defeatedBosses = [1, 2, 3];
            gameState.unlockedClasses = ['hwarang', 'knight'];
            (gameState as any).saveVersion = 2;
            (gameState as any).usedYaksuPoints = ['yaksu_1', 'yaksu_2'];

            const json = gameState.toJSON() as any;

            expect(json.selectedClass).toBe('hwarang');
            expect(json.soulGrade).toBe(3);
            expect(json.karma).toBe(50);
            expect(json.activeSkillCooldowns).toEqual({ 1: 1000, 2: 500 });
            expect(json.defeatedBosses).toEqual([1, 2, 3]);
            expect(json.unlockedClasses).toEqual(['hwarang', 'knight']);
            expect(json.saveVersion).toBe(2);
            expect(json.usedYaksuPoints).toEqual(['yaksu_1', 'yaksu_2']);
        });

        it('fromJSON()은 새 필드들을 복원해야 함', () => {
            const data = {
                stats: {
                    hp: 100,
                    maxHp: 100,
                    gold: 0,
                    level: 1,
                    exp: 0,
                    maxExp: 100,
                    attack: 10,
                    defense: 5,
                    agi: 5,
                    luk: 5,
                    steps: 0,
                    zone: 'Hanyang'
                },
                inventory: [],
                equipment: {},
                selectedClass: 'hwarang',
                soulGrade: 5,
                karma: 100,
                activeSkillCooldowns: { 1: 2000 },
                defeatedBosses: [1, 2],
                unlockedClasses: ['hwarang', 'knight', 'sage'],
                saveVersion: 3,
                usedYaksuPoints: ['yaksu_test']
            };

            gameState.fromJSON(data);

            expect(gameState.selectedClass).toBe('hwarang');
            expect(gameState.soulGrade).toBe(5);
            expect(gameState.karma).toBe(100);
            expect(gameState.activeSkillCooldowns).toEqual({ 1: 2000 });
            expect(gameState.defeatedBosses).toEqual([1, 2]);
            expect(gameState.unlockedClasses).toEqual(['hwarang', 'knight', 'sage']);
            expect((gameState as any).saveVersion).toBe(3);
            expect((gameState as any).usedYaksuPoints).toEqual(['yaksu_test']);
        });
    });

    describe('하위 호환성 (구버전 데이터)', () => {
        it('구버전 데이터(새 필드 없음)를 로드할 때 기본값으로 채워져야 함', () => {
            const oldData = {
                stats: {
                    hp: 100,
                    maxHp: 100,
                    gold: 0,
                    level: 1,
                    exp: 0,
                    maxExp: 100,
                    attack: 10,
                    defense: 5,
                    agi: 5,
                    luk: 5,
                    steps: 0,
                    zone: 'Hanyang'
                },
                inventory: [],
                equipment: {}
                // 새 필드가 없음
            };

            gameState.fromJSON(oldData);

            expect(gameState.selectedClass).toBe(null);
            expect(gameState.soulGrade).toBe(0);
            expect(gameState.karma).toBe(0);
            expect(gameState.activeSkillCooldowns).toEqual({});
            expect(gameState.defeatedBosses).toEqual([]);
            expect(gameState.unlockedClasses).toEqual(['hwarang']);
            expect((gameState as any).saveVersion).toBe(1);
            expect((gameState as any).usedYaksuPoints).toEqual([]);
        });

        it('부분 데이터 로드 시 기존 기본값과 새 필드 기본값을 유지해야 함', () => {
            const partialData = {
                stats: {
                    hp: 150,
                    maxHp: 150,
                    gold: 50,
                    level: 2,
                    exp: 10,
                    maxExp: 100,
                    attack: 15,
                    defense: 8,
                    agi: 6,
                    luk: 6,
                    steps: 100,
                    zone: 'Seoul'
                },
                inventory: [],
                equipment: {},
                selectedClass: 'knight'
                // 일부 필드만 있음
            };

            gameState.fromJSON(partialData);

            // 로드된 필드
            expect(gameState.stats.level).toBe(2);
            expect(gameState.selectedClass).toBe('knight');

            // 기본값으로 유지되어야 할 필드
            expect(gameState.soulGrade).toBe(0);
            expect(gameState.karma).toBe(0);
            expect(gameState.activeSkillCooldowns).toEqual({});
            expect(gameState.defeatedBosses).toEqual([]);
            expect(gameState.unlockedClasses).toEqual(['hwarang']);
        });
    });

    describe('헬퍼 메서드', () => {
        describe('setClass()', () => {
            it('클래스를 설정할 수 있어야 함', () => {
                gameState.setClass('knight');
                expect(gameState.selectedClass).toBe('knight');
            });

            it('null로 설정할 수 있어야 함', () => {
                gameState.setClass('knight');
                gameState.setClass(null);
                expect(gameState.selectedClass).toBeNull();
            });
        });

        describe('isClassUnlocked()', () => {
            it('해금된 클래스는 true를 반환해야 함', () => {
                expect(gameState.isClassUnlocked('hwarang')).toBe(true);
            });

            it('해금되지 않은 클래스는 false를 반환해야 함', () => {
                expect(gameState.isClassUnlocked('knight')).toBe(false);
            });

            it('여러 클래스 해금 후 정확하게 판단해야 함', () => {
                gameState.unlockedClasses = ['hwarang', 'knight', 'sage'];
                expect(gameState.isClassUnlocked('hwarang')).toBe(true);
                expect(gameState.isClassUnlocked('knight')).toBe(true);
                expect(gameState.isClassUnlocked('sage')).toBe(true);
                expect(gameState.isClassUnlocked('archer')).toBe(false);
            });
        });

        describe('addDefeatedBoss()', () => {
            it('격파한 보스를 추가할 수 있어야 함', () => {
                gameState.addDefeatedBoss(1);
                expect(gameState.defeatedBosses).toContain(1);
            });

            it('여러 보스를 추가할 수 있어야 함', () => {
                gameState.addDefeatedBoss(1);
                gameState.addDefeatedBoss(2);
                gameState.addDefeatedBoss(3);
                expect(gameState.defeatedBosses).toEqual([1, 2, 3]);
            });

            it('중복 보스를 추가할 수 있어야 함', () => {
                gameState.addDefeatedBoss(1);
                gameState.addDefeatedBoss(1);
                expect(gameState.defeatedBosses).toEqual([1, 1]);
            });
        });

        describe('isBossDefeated()', () => {
            it('격파된 보스는 true를 반환해야 함', () => {
                gameState.addDefeatedBoss(1);
                expect(gameState.isBossDefeated(1)).toBe(true);
            });

            it('격파되지 않은 보스는 false를 반환해야 함', () => {
                expect(gameState.isBossDefeated(999)).toBe(false);
            });

            it('여러 보스 중에서 정확하게 판단해야 함', () => {
                gameState.addDefeatedBoss(1);
                gameState.addDefeatedBoss(2);
                gameState.addDefeatedBoss(5);
                
                expect(gameState.isBossDefeated(1)).toBe(true);
                expect(gameState.isBossDefeated(2)).toBe(true);
                expect(gameState.isBossDefeated(3)).toBe(false);
                expect(gameState.isBossDefeated(5)).toBe(true);
            });
        });

        describe('usedYaksuPoints 헬퍼', () => {
            it('약수터 사용 정보를 추가할 수 있어야 함', () => {
                gameState.addUsedYaksuPoint('yaksu_1');
                expect(gameState.usedYaksuPoints).toContain('yaksu_1');
            });

            it('약수터 사용 여부를 확인할 수 있어야 함', () => {
                expect(gameState.isYaksuPointUsed('yaksu_1')).toBe(false);
                gameState.addUsedYaksuPoint('yaksu_1');
                expect(gameState.isYaksuPointUsed('yaksu_1')).toBe(true);
            });

            it('중복 추가 시에도 한 번만 포함되어야 함 (선택적 구현 사항이나 권장됨)', () => {
                gameState.addUsedYaksuPoint('yaksu_1');
                gameState.addUsedYaksuPoint('yaksu_1');
                const count = gameState.usedYaksuPoints.filter(p => p === 'yaksu_1').length;
                expect(count).toBe(1);
            });
        });
    });

    describe('reset() 메서드 호환성', () => {
        it('reset() 호출 후 새 필드들도 기본값으로 초기화되어야 함', () => {
            gameState.selectedClass = 'knight';
            gameState.soulGrade = 10;
            gameState.karma = 100;
            gameState.activeSkillCooldowns = { 1: 1000 };
            gameState.defeatedBosses = [1, 2, 3];
            gameState.unlockedClasses = ['hwarang', 'knight', 'sage'];

            gameState.reset();

            expect(gameState.selectedClass).toBe(null);
            expect(gameState.soulGrade).toBe(0);
            expect(gameState.karma).toBe(0);
            expect(gameState.activeSkillCooldowns).toEqual({});
            expect(gameState.defeatedBosses).toEqual([]);
            expect(gameState.unlockedClasses).toEqual(['hwarang']);
            expect((gameState as any).saveVersion).toBe(1);
            expect((gameState as any).usedYaksuPoints).toEqual([]);
        });
    });
});
