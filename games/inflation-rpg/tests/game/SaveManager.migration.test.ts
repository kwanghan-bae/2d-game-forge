import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SaveManager } from '../../src/game/utils/SaveManager';

describe('SaveManager - 데이터 마이그레이션', () => {
    let saveManager: SaveManager;
    
    // localStorage mock
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        
        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => {
                store[key] = value;
            },
            removeItem: (key: string) => {
                delete store[key];
            },
            clear: () => {
                store = {};
            }
        };
    })();
    
    beforeEach(() => {
        // localStorage mock 설정
        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            writable: true
        });
        
        localStorageMock.clear();
        saveManager = SaveManager.getInstance();
    });
    
    afterEach(() => {
        localStorageMock.clear();
    });
    
    describe('버전 1.0.0 → 2.0.0 마이그레이션', () => {
        it('버전 1.0.0 데이터를 로드할 때 새 필드가 기본값으로 채워진다', () => {
            // 구버전 데이터 (1.0.0)
            const v1Data = {
                version: '1.0.0',
                timestamp: 1000000000000,
                gameState: {
                    level: 10,
                    exp: 500,
                    gold: 5000,
                    hp: 200,
                    maxHp: 250,
                    attack: 50,
                    defense: 30,
                    agi: 10,
                    luk: 15,
                    steps: 100,
                    zone: 'Zone2',
                    inventory: [],
                    equipment: {}
                },
                inflationManager: {
                    startTime: 1000000000000,
                    inflationRate: 0.03
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(v1Data));
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).not.toBeNull();
            expect(loadedData?.version).toBe('2.0.0');
            expect(loadedData?.gameState.selectedClass).toBe(null);
            expect(loadedData?.gameState.soulGrade).toBe(0);
            expect(loadedData?.gameState.karma).toBe(0);
            expect(loadedData?.gameState.activeSkillCooldowns).toEqual({});
            expect(loadedData?.gameState.defeatedBosses).toEqual([]);
            expect(loadedData?.gameState.unlockedClasses).toEqual([]);
            
            // 기존 필드들은 유지
            expect(loadedData?.gameState.level).toBe(10);
            expect(loadedData?.gameState.gold).toBe(5000);
            expect(loadedData?.gameState.zone).toBe('Zone2');
        });
        
        it('버전 정보가 없는 레거시 데이터를 로드할 때 마이그레이션 수행', () => {
            // 아주 오래된 데이터 (버전 정보 없음)
            const legacyData = {
                timestamp: 900000000000,
                gameState: {
                    level: 5,
                    exp: 100,
                    gold: 1000,
                    hp: 100,
                    maxHp: 100,
                    attack: 10,
                    defense: 5,
                    agi: 5,
                    luk: 5,
                    steps: 50,
                    zone: 'Hanyang',
                    inventory: [],
                    equipment: {}
                },
                inflationManager: {
                    startTime: 900000000000,
                    inflationRate: 0.02
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(legacyData));
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).not.toBeNull();
            expect(loadedData?.version).toBe('2.0.0');
            expect(loadedData?.gameState.selectedClass).toBe(null);
            expect(loadedData?.gameState.soulGrade).toBe(0);
            expect(loadedData?.gameState.karma).toBe(0);
            
            // 기존 필드들은 유지
            expect(loadedData?.gameState.level).toBe(5);
            expect(loadedData?.gameState.gold).toBe(1000);
        });
    });
    
    describe('버전 2.0.0 데이터 로드', () => {
        it('버전 2.0.0 데이터를 로드할 때 모든 필드가 정상적으로 복원된다', () => {
            // 최신 버전 데이터 (2.0.0)
            const v2Data = {
                version: '2.0.0',
                timestamp: 1100000000000,
                gameState: {
                    level: 20,
                    exp: 2000,
                    gold: 50000,
                    hp: 500,
                    maxHp: 500,
                    attack: 100,
                    defense: 50,
                    agi: 25,
                    luk: 30,
                    steps: 5000,
                    zone: 'Zone5',
                    inventory: [],
                    equipment: {},
                    selectedClass: 'Warrior',
                    soulGrade: 3,
                    karma: 100,
                    activeSkillCooldowns: { 1: 1000, 2: 2000 },
                    defeatedBosses: [1, 2, 3],
                    unlockedClasses: ['Warrior', 'Mage', 'Rogue']
                },
                inflationManager: {
                    startTime: 1100000000000,
                    inflationRate: 0.05
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(v2Data));
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).not.toBeNull();
            expect(loadedData?.version).toBe('2.0.0');
            expect(loadedData?.gameState.selectedClass).toBe('Warrior');
            expect(loadedData?.gameState.soulGrade).toBe(3);
            expect(loadedData?.gameState.karma).toBe(100);
            expect(loadedData?.gameState.activeSkillCooldowns).toEqual({ 1: 1000, 2: 2000 });
            expect(loadedData?.gameState.defeatedBosses).toEqual([1, 2, 3]);
            expect(loadedData?.gameState.unlockedClasses).toEqual(['Warrior', 'Mage', 'Rogue']);
            
            // 기존 필드들도 유지
            expect(loadedData?.gameState.level).toBe(20);
            expect(loadedData?.gameState.gold).toBe(50000);
        });
        
        it('버전 2.0.0 데이터의 선택적 필드가 undefined이어도 정상 로드', () => {
            // 부분적인 v2 데이터
            const partialV2Data = {
                version: '2.0.0',
                timestamp: 1100000000000,
                gameState: {
                    level: 15,
                    exp: 1000,
                    gold: 25000,
                    hp: 300,
                    maxHp: 300,
                    attack: 60,
                    defense: 30,
                    agi: 15,
                    luk: 20,
                    steps: 2000,
                    zone: 'Zone3',
                    inventory: [],
                    equipment: {}
                    // 새 필드들이 없음
                },
                inflationManager: {
                    startTime: 1100000000000,
                    inflationRate: 0.04
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(partialV2Data));
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).not.toBeNull();
            expect(loadedData?.gameState.level).toBe(15);
            expect(loadedData?.gameState.gold).toBe(25000);
        });
    });
    
    describe('마이그레이션 데이터 무결성', () => {
        it('마이그레이션 후 기존 필드가 손상되지 않는다', () => {
            const v1Data = {
                version: '1.0.0',
                timestamp: 1000000000000,
                gameState: {
                    level: 15,
                    exp: 1500,
                    gold: 15000,
                    hp: 350,
                    maxHp: 400,
                    attack: 80,
                    defense: 40,
                    agi: 20,
                    luk: 25,
                    steps: 2000,
                    zone: 'Zone4',
                    inventory: [],
                    equipment: {}
                },
                inflationManager: {
                    startTime: 1000000000000,
                    inflationRate: 0.03
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(v1Data));
            
            const loadedData = saveManager.loadGame();
            
            // 원본 v1 데이터의 모든 필드 검증
            expect(loadedData?.gameState.level).toBe(15);
            expect(loadedData?.gameState.exp).toBe(1500);
            expect(loadedData?.gameState.gold).toBe(15000);
            expect(loadedData?.gameState.hp).toBe(350);
            expect(loadedData?.gameState.maxHp).toBe(400);
            expect(loadedData?.gameState.attack).toBe(80);
            expect(loadedData?.gameState.defense).toBe(40);
            expect(loadedData?.gameState.agi).toBe(20);
            expect(loadedData?.gameState.luk).toBe(25);
            expect(loadedData?.gameState.steps).toBe(2000);
            expect(loadedData?.gameState.zone).toBe('Zone4');
            expect(loadedData?.inflationManager.startTime).toBe(1000000000000);
            expect(loadedData?.inflationManager.inflationRate).toBe(0.03);
        });
        
        it('마이그레이션된 데이터를 다시 저장해도 안전하다', () => {
            const v1Data = {
                version: '1.0.0',
                timestamp: 1000000000000,
                gameState: {
                    level: 10,
                    exp: 500,
                    gold: 5000,
                    hp: 200,
                    maxHp: 250,
                    attack: 50,
                    defense: 30,
                    agi: 10,
                    luk: 15,
                    steps: 100,
                    zone: 'Zone2',
                    inventory: [],
                    equipment: {}
                },
                inflationManager: {
                    startTime: 1000000000000,
                    inflationRate: 0.03
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(v1Data));
            
            const loadedData = saveManager.loadGame();
            expect(loadedData).not.toBeNull();
            expect(loadedData?.version).toBe('2.0.0');
            
            // 로드된 데이터를 다시 저장
            const resavedJson = JSON.stringify(loadedData);
            const reparsedData = JSON.parse(resavedJson);
            
            // 버전이 2.0.0으로 유지되고 필수 필드가 모두 존재
            expect(reparsedData.version).toBe('2.0.0');
            expect(reparsedData.gameState.selectedClass).toBe(null);
            expect(reparsedData.gameState.soulGrade).toBe(0);
        });
    });
    
    describe('마이그레이션 롤백 안전성', () => {
        it('마이그레이션 중 에러가 발생하면 원본 데이터를 로드하지 않는다', () => {
            // 손상된 데이터
            const corruptedData = {
                version: '1.0.0',
                timestamp: 1000000000000,
                gameState: null, // 이는 검증에서 실패해야 함
                inflationManager: {
                    startTime: 1000000000000,
                    inflationRate: 0.03
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(corruptedData));
            
            const loadedData = saveManager.loadGame();
            
            // 손상된 데이터는 로드되지 않아야 함
            expect(loadedData).toBeNull();
        });
    });
});
