import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameState } from '../../src/game/GameState';
import { InflationManager } from '../../src/game/utils/InflationManager';
import { SaveManager } from '../../src/game/utils/SaveManager';

describe('SaveManager', () => {
    let saveManager: SaveManager;
    let gameState: GameState;
    let inflationManager: InflationManager;
    
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
        gameState = GameState.getInstance();
        gameState.reset();
        
        inflationManager = InflationManager.getInstance();
        inflationManager.reset();
        inflationManager.setInflationRate(0.02);
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
        localStorageMock.clear();
    });
    
    describe('싱글톤 패턴', () => {
        it('getInstance() 호출 시 동일한 인스턴스 반환', () => {
            const instance1 = SaveManager.getInstance();
            const instance2 = SaveManager.getInstance();
            
            expect(instance1).toBe(instance2);
        });
    });
    
    describe('hasSaveData()', () => {
        it('저장 데이터가 없을 때 false 반환', () => {
            expect(saveManager.hasSaveData()).toBe(false);
        });
        
        it('저장 데이터가 있을 때 true 반환', () => {
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify({
                version: '1.0.0',
                timestamp: Date.now(),
                gameState: {},
                inflationManager: {}
            }));
            
            expect(saveManager.hasSaveData()).toBe(true);
        });
        
        it('손상된 JSON 데이터가 있을 때 false 반환', () => {
            localStorageMock.setItem('korea_inflation_rpg_save', 'invalid-json');
            
            expect(saveManager.hasSaveData()).toBe(false);
        });
    });
    
    describe('saveGame()', () => {
        it('GameState를 localStorage에 저장', async () => {
            gameState.stats.level = 5;
            gameState.stats.gold = 1000;
            gameState.stats.exp = 250;
            
            const result = await saveManager.saveGame();
            
            expect(result).toBe(true);
            
            const savedData = localStorageMock.getItem('korea_inflation_rpg_save');
            expect(savedData).toBeDefined();
            
            const parsedData = JSON.parse(savedData!);
            expect(parsedData.gameState.level).toBe(5);
            expect(parsedData.gameState.gold).toBe(1000);
            expect(parsedData.gameState.exp).toBe(250);
        });
        
        it('InflationManager 시작 시간을 저장', async () => {
            const mockTime = 1000000000000;
            vi.spyOn(Date, 'now').mockReturnValue(mockTime);
            
            inflationManager.reset();
            
            const result = await saveManager.saveGame();
            
            expect(result).toBe(true);
            
            const savedData = localStorageMock.getItem('korea_inflation_rpg_save');
            const parsedData = JSON.parse(savedData!);
            
            expect(parsedData.inflationManager.startTime).toBe(mockTime);
            expect(parsedData.inflationManager.inflationRate).toBe(0.02);
        });
        
        it('저장 시 버전 정보 기록', async () => {
            await saveManager.saveGame();
            
            const savedData = localStorageMock.getItem('korea_inflation_rpg_save');
            const parsedData = JSON.parse(savedData!);
            
            expect(parsedData.version).toBe('2.0.0');
        });
        
        it('저장 시 타임스탬프 기록', async () => {
            const beforeSave = Date.now();
            
            await saveManager.saveGame();
            
            const afterSave = Date.now();
            
            const savedData = localStorageMock.getItem('korea_inflation_rpg_save');
            const parsedData = JSON.parse(savedData!);
            
            expect(parsedData.timestamp).toBeGreaterThanOrEqual(beforeSave);
            expect(parsedData.timestamp).toBeLessThanOrEqual(afterSave);
        });
        
        it('인벤토리와 장비 정보도 저장', async () => {
            const mockItem = {
                id: 1,
                name: '철검',
                type: 'weapon' as any,
                stats: { atk: 10 }
            };
            
            gameState.inventory = [mockItem as any];
            gameState.equipment = { weapon: mockItem as any };
            
            await saveManager.saveGame();
            
            const savedData = localStorageMock.getItem('korea_inflation_rpg_save');
            const parsedData = JSON.parse(savedData!);
            
            expect(parsedData.gameState.inventory).toHaveLength(1);
            expect(parsedData.gameState.equipment.weapon).toBeDefined();
        });
         
         it('localStorage 에러 발생 시 false 반환', async () => {
             // localStorage.setItem이 예외를 던지도록 모킹
             const mockSetItem = vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
                 throw new Error('Storage full');
             });
             
             const result = await saveManager.saveGame();
             
             expect(result).toBe(false);
             
             mockSetItem.mockRestore();
         });
    });
    
    describe('saveGame() - 예외 처리 및 재시도', () => {
        it('QuotaExceededError 발생 시 3회 재시도 후 실패', async () => {
            let attemptCount = 0;
            const mockSetItem = vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
                attemptCount++;
                const error = new Error('Storage full');
                (error as any).name = 'QuotaExceededError';
                throw error;
            });
            
            const result = await saveManager.saveGame();
            
            expect(result).toBe(false);
            expect(attemptCount).toBe(3);
            
            mockSetItem.mockRestore();
        });
        
        it('SecurityError 발생 시 재시도 없이 실패', async () => {
            const mockSetItem = vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
                const error = new Error('Access denied');
                (error as any).name = 'SecurityError';
                throw error;
            });
            
            const result = await saveManager.saveGame();
            
            expect(result).toBe(false);
            expect(mockSetItem).toHaveBeenCalledTimes(1);
            
            mockSetItem.mockRestore();
        });
        
        it('일반 에러 발생 시 즉시 실패', async () => {
            const mockSetItem = vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
                throw new Error('Unknown storage error');
            });
            
            const result = await saveManager.saveGame();
            
            expect(result).toBe(false);
            
            mockSetItem.mockRestore();
        });
        
        it('첫 시도 실패 후 두 번째 시도 성공', async () => {
            let attemptCount = 0;
            const originalSetItem = localStorageMock.setItem.bind(localStorageMock);
            
            const mockSetItem = vi.spyOn(localStorageMock, 'setItem').mockImplementation((key: string, value: string) => {
                attemptCount++;
                if (attemptCount === 1) {
                    const error = new Error('Storage full');
                    (error as any).name = 'QuotaExceededError';
                    throw error;
                }
                originalSetItem(key, value);
            });
            
            const result = await saveManager.saveGame();
            
            expect(result).toBe(true);
            expect(attemptCount).toBe(2);
            
            mockSetItem.mockRestore();
        });
    });
    
    describe('loadGame()', () => {
        it('localStorage에서 GameState 복원', () => {
            const savedData = {
                version: '1.0.0',
                timestamp: Date.now(),
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
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(savedData));
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).not.toBeNull();
            expect(loadedData?.gameState.level).toBe(10);
            expect(loadedData?.gameState.gold).toBe(5000);
            expect(loadedData?.gameState.zone).toBe('Zone2');
        });
        
        it('InflationManager 시작 시간 복원', () => {
            const mockStartTime = 1000000000000;
            
            const savedData = {
                version: '1.0.0',
                timestamp: Date.now(),
                gameState: {
                    level: 1,
                    exp: 0,
                    gold: 0,
                    hp: 100,
                    maxHp: 100,
                    attack: 10,
                    defense: 5,
                    agi: 5,
                    luk: 5,
                    steps: 0,
                    zone: 'Hanyang',
                    inventory: [],
                    equipment: {}
                },
                inflationManager: {
                    startTime: mockStartTime,
                    inflationRate: 0.02
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(savedData));
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).not.toBeNull();
            expect(loadedData?.inflationManager.startTime).toBe(mockStartTime);
            expect(loadedData?.inflationManager.inflationRate).toBe(0.02);
        });
        
        it('저장 데이터 없으면 null 반환', () => {
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).toBeNull();
        });
        
        it('손상된 JSON 데이터 처리', () => {
            localStorageMock.setItem('korea_inflation_rpg_save', 'invalid-json-{]');
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).toBeNull();
        });
        
        it('버전 불일치 처리 (향후 확장용)', () => {
            const savedData = {
                version: '0.9.0', // 이전 버전
                timestamp: Date.now(),
                gameState: {
                    level: 1,
                    exp: 0,
                    gold: 0,
                    hp: 100,
                    maxHp: 100,
                    attack: 10,
                    defense: 5,
                    agi: 5,
                    luk: 5,
                    steps: 0,
                    zone: 'Hanyang',
                    inventory: [],
                    equipment: {}
                },
                inflationManager: {
                    startTime: Date.now(),
                    inflationRate: 0.02
                }
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(savedData));
            
            const loadedData = saveManager.loadGame();
            
            // 현재는 버전 체크를 하지 않지만, 향후 추가 시 null 반환 예상
            // 일단은 로드 성공해야 함
            expect(loadedData).not.toBeNull();
        });
        
        it('필수 필드 누락 시 null 반환', () => {
            const incompleteData = {
                version: '1.0.0',
                timestamp: Date.now()
                // gameState와 inflationManager 누락
            };
            
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify(incompleteData));
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).toBeNull();
        });
    });
    
    describe('deleteSaveData()', () => {
        it('localStorage에서 저장 데이터 삭제', () => {
            localStorageMock.setItem('korea_inflation_rpg_save', JSON.stringify({
                version: '1.0.0',
                timestamp: Date.now(),
                gameState: {},
                inflationManager: {}
            }));
            
            expect(saveManager.hasSaveData()).toBe(true);
            
            saveManager.deleteSaveData();
            
            expect(saveManager.hasSaveData()).toBe(false);
        });
        
        it('저장 데이터가 없어도 에러 없이 실행', () => {
            expect(() => {
                saveManager.deleteSaveData();
            }).not.toThrow();
        });
    });
    
    describe('통합 테스트: Save → Load', () => {
        it('저장 후 불러오기 시 데이터 무결성 유지', async () => {
            // 게임 상태 설정
            gameState.stats.level = 20;
            gameState.stats.gold = 9999;
            gameState.stats.exp = 1500;
            gameState.stats.hp = 500;
            gameState.stats.zone = 'Zone3';
            
            // 인플레이션 시작 시간 설정
            const mockTime = 1000000000000;
            vi.spyOn(Date, 'now').mockReturnValue(mockTime);
            inflationManager.reset();
            inflationManager.setInflationRate(0.05);
            
            // 저장
            const saveResult = await saveManager.saveGame();
            expect(saveResult).toBe(true);
            
            // 게임 상태 초기화
            gameState.reset();
            inflationManager.reset();
            
            // 불러오기
            const loadedData = saveManager.loadGame();
            
            expect(loadedData).not.toBeNull();
            expect(loadedData?.gameState.level).toBe(20);
            expect(loadedData?.gameState.gold).toBe(9999);
            expect(loadedData?.gameState.exp).toBe(1500);
            expect(loadedData?.gameState.hp).toBe(500);
            expect(loadedData?.gameState.zone).toBe('Zone3');
            expect(loadedData?.inflationManager.startTime).toBe(mockTime);
            expect(loadedData?.inflationManager.inflationRate).toBe(0.05);
        });
        
        it('여러 번 저장해도 마지막 데이터만 유지', async () => {
            gameState.stats.gold = 100;
            await saveManager.saveGame();
            
            gameState.stats.gold = 200;
            await saveManager.saveGame();
            
            gameState.stats.gold = 300;
            await saveManager.saveGame();
            
            const loadedData = saveManager.loadGame();
            
            expect(loadedData?.gameState.gold).toBe(300);
        });
    });
});
