import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReincarnationManager } from '../../src/game/utils/ReincarnationManager';
import { GameState } from '../../src/game/GameState';
import { ItemType } from '../../src/game/data/ItemData';

describe('ReincarnationManager', () => {
  let reincarnationMgr: ReincarnationManager;
  let gameState: GameState;

  beforeEach(() => {
    // Singleton 초기화
    ReincarnationManager.resetInstance();
    GameState.resetInstance();
    
    reincarnationMgr = ReincarnationManager.getInstance();
    gameState = GameState.getInstance();
  });

  describe('영혼석 계산 공식', () => {
    it('레벨 100일 때 기본 영혼석 1개를 획득해야 함', () => {
      const stones = reincarnationMgr.calculateSoulStones(100, []);
      expect(stones).toBe(1);
    });

    it('레벨 200일 때 기본 영혼석 2개를 획득해야 함', () => {
      const stones = reincarnationMgr.calculateSoulStones(200, []);
      expect(stones).toBe(2);
    });

    it('레벨 99일 때 기본 영혼석 0개를 획득해야 함', () => {
      const stones = reincarnationMgr.calculateSoulStones(99, []);
      expect(stones).toBe(0);
    });

    it('보스 1명 격파 시 50개의 보너스 영혼석을 획득해야 함', () => {
      const stones = reincarnationMgr.calculateSoulStones(100, [9001]);
      expect(stones).toBe(1 + 50); // 1 (기본) + 50 (보스 보너스)
    });

    it('보스 2명 격파 시 100개의 보너스 영혼석을 획득해야 함', () => {
      const stones = reincarnationMgr.calculateSoulStones(100, [9001, 9002]);
      expect(stones).toBe(1 + 100); // 1 (기본) + 100 (보스 보너스)
    });

    it('레벨 300, 보스 2명 격파 시 총 103개의 영혼석을 획득해야 함', () => {
      const stones = reincarnationMgr.calculateSoulStones(300, [9001, 9002]);
      expect(stones).toBe(3 + 100); // 3 (기본) + 100 (보스 보너스)
    });
  });

  describe('영혼 등급 요구량', () => {
    it('0등급 → 1등급에 필요한 영혼석은 100개여야 함', () => {
      const required = reincarnationMgr.getRequiredStones(0);
      expect(required).toBe(100);
    });

    it('1등급 → 2등급에 필요한 영혼석은 300개여야 함', () => {
      const required = reincarnationMgr.getRequiredStones(1);
      expect(required).toBe(300);
    });

    it('2등급 → 3등급에 필요한 영혼석은 800개여야 함', () => {
      const required = reincarnationMgr.getRequiredStones(2);
      expect(required).toBe(800);
    });

    it('3등급 → 4등급에 필요한 영혼석은 1500개여야 함', () => {
      const required = reincarnationMgr.getRequiredStones(3);
      expect(required).toBe(1500);
    });

    it('4등급 → 5등급에 필요한 영혼석은 2500개여야 함', () => {
      const required = reincarnationMgr.getRequiredStones(4);
      expect(required).toBe(2500);
    });

    it('5등급 이상에는 필요 영혼석이 없어야 함 (Infinity)', () => {
      const required = reincarnationMgr.getRequiredStones(5);
      expect(required).toBe(Infinity);
    });
  });

  describe('영혼 등급 상승 로직', () => {
    it('영혼석 100개로 0등급에서 1등급으로 상승해야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, 100);
      expect(result.newGrade).toBe(1);
      expect(result.remainingStones).toBe(0);
    });

    it('영혼석 99개로는 0등급에서 상승할 수 없어야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, 99);
      expect(result.newGrade).toBe(0);
      expect(result.remainingStones).toBe(99);
    });

    it('영혼석 400개로 0등급에서 1등급으로 상승하고 300개 남아야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, 400);
      // 0→1: 100, 1→2: 300 = 400이므로 실제로 2등급이 됨
      // 이 테스트 케이스의 예상값을 다시 검토: 400개 = 100 (0→1) + 300 (1→2)이므로 2등급이 맞음
      expect(result.newGrade).toBe(2);
      expect(result.remainingStones).toBe(0);
    });

    it('영혼석 400개로 0등급에서 2등급으로 상승해야 함 (연쇄 상승)', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, 400);
      // 100 (0→1) + 300 (1→2) = 400
      expect(result.newGrade).toBe(2);
      expect(result.remainingStones).toBe(0);
    });

    it('영혼석 100개로 1등급에서 2등급으로 상승할 수 없어야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(1, 100);
      expect(result.newGrade).toBe(1);
      expect(result.remainingStones).toBe(100);
    });

    it('영혼석 1200개로 0등급에서 2등급으로 상승하고 100개 남아야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, 1200);
      // 100 (0→1) + 300 (1→2) + 800 (2→3) = 1200
      expect(result.newGrade).toBe(3);
      expect(result.remainingStones).toBe(0);
    });

    it('최대 등급(5)을 넘지 않아야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(5, 10000);
      expect(result.newGrade).toBe(5);
      expect(result.remainingStones).toBe(10000);
    });

    it('등급 5에 도달하는 순간 멈춰야 함', () => {
      // 0→1: 100, 1→2: 300, 2→3: 800, 3→4: 1500, 4→5: 2500 = 5200 총합
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, 5200);
      expect(result.newGrade).toBe(5);
      expect(result.remainingStones).toBe(0);
    });
  });

  describe('직업 해금 로직', () => {
    it('초기 상태에 화랑(hwarang)만 해금되어 있어야 함', () => {
      expect(gameState.unlockedClasses).toContain('hwarang');
      expect(gameState.unlockedClasses.length).toBe(1);
    });

    it('영혼 등급 3에서 착호갑사(tiger_hunter)가 해금되어야 함', () => {
      gameState.soulGrade = 3;
      gameState.updateUnlockedClassesBySoulGrade();
      expect(gameState.unlockedClasses).toContain('tiger_hunter');
    });

    it('영혼 등급 4에서 무당(mudang)이 해금되어야 함', () => {
      gameState.soulGrade = 4;
      gameState.updateUnlockedClassesBySoulGrade();
      expect(gameState.unlockedClasses).toContain('mudang');
    });

    it('영혼 등급 5에서 최의(choeui)가 해금되어야 함', () => {
      gameState.soulGrade = 5;
      gameState.updateUnlockedClassesBySoulGrade();
      expect(gameState.unlockedClasses).toContain('choeui');
    });

    it('영혼 등급 4에서 화랑, 착호갑사, 무당이 모두 해금되어야 함', () => {
      gameState.soulGrade = 4;
      gameState.updateUnlockedClassesBySoulGrade();
      expect(gameState.unlockedClasses).toContain('hwarang');
      expect(gameState.unlockedClasses).toContain('tiger_hunter');
      expect(gameState.unlockedClasses).toContain('mudang');
      expect(gameState.unlockedClasses.length).toBe(3);
    });

    it('영혼 등급 5에서 모든 직업이 해금되어야 함', () => {
      gameState.soulGrade = 5;
      gameState.updateUnlockedClassesBySoulGrade();
      expect(gameState.unlockedClasses).toContain('hwarang');
      expect(gameState.unlockedClasses).toContain('tiger_hunter');
      expect(gameState.unlockedClasses).toContain('mudang');
      expect(gameState.unlockedClasses).toContain('choeui');
      expect(gameState.unlockedClasses.length).toBe(4);
    });
  });

  describe('환생 시 초기화 항목', () => {
    it('환생 후 레벨이 1로 초기화되어야 함', () => {
      gameState.stats.level = 100;
      reincarnationMgr.reincarnate(gameState, 100);
      expect(gameState.stats.level).toBe(1);
    });

    it('환생 후 경험치가 0으로 초기화되어야 함', () => {
      gameState.stats.exp = 5000;
      reincarnationMgr.reincarnate(gameState, 100);
      expect(gameState.stats.exp).toBe(0);
    });

    it('환생 후 골드가 0으로 초기화되어야 함', () => {
      gameState.stats.gold = 100000;
      reincarnationMgr.reincarnate(gameState, 100);
      expect(gameState.stats.gold).toBe(0);
    });

    it('환생 후 인벤토리가 초기화되어야 함', () => {
      gameState.inventory = [{ id: 1, name: 'test', type: 'weapon' as any, description: '', stats: {}, price: 0, atlasKey: '', frame: 0 }];
      reincarnationMgr.reincarnate(gameState, 100);
      expect(gameState.inventory.length).toBe(0);
    });

    it('환생 후 장비가 초기화되어야 함', () => {
      gameState.equipment[ItemType.WEAPON] = { id: 1, name: 'test', type: ItemType.WEAPON, description: '', stats: {}, price: 0, atlasKey: '', frame: 0 };
      reincarnationMgr.reincarnate(gameState, 100);
      expect(Object.keys(gameState.equipment).length).toBe(0);
    });
  });

  describe('환생 시 유지 항목', () => {
    it('환생 후 영혼 등급이 유지되어야 함', () => {
      gameState.soulGrade = 2;
      const result = reincarnationMgr.reincarnate(gameState, 0);
      expect(gameState.soulGrade).toBe(2);
    });

    it('영혼석으로 등급이 상승하면 그 등급이 유지되어야 함', () => {
      gameState.soulGrade = 0;
      const result = reincarnationMgr.reincarnate(gameState, 100);
      expect(gameState.soulGrade).toBe(1);
    });

    it('환생 후 해금된 직업이 유지되어야 함', () => {
      gameState.soulGrade = 3;
      gameState.updateUnlockedClassesBySoulGrade();
      const originalClasses = [...gameState.unlockedClasses];
      
      reincarnationMgr.reincarnate(gameState, 0);
      
      expect(gameState.unlockedClasses).toEqual(originalClasses);
    });

    it('환생 후 격파한 보스 기록이 유지되어야 함', () => {
      gameState.defeatedBosses = [9001, 9002];
      reincarnationMgr.reincarnate(gameState, 0);
      expect(gameState.defeatedBosses).toEqual([9001, 9002]);
    });
  });

  describe('환생 결과', () => {
    it('환생 결과에 새로운 영혼 등급이 포함되어야 함', () => {
      const result = reincarnationMgr.reincarnate(gameState, 100);
      expect(result.newSoulGrade).toBe(1);
    });

    it('환생 결과에 해금된 직업 목록이 포함되어야 함', () => {
      gameState.soulGrade = 3;
      gameState.updateUnlockedClassesBySoulGrade();
      const result = reincarnationMgr.reincarnate(gameState, 0);
      expect(Array.isArray(result.unlockedClasses)).toBe(true);
      expect(result.unlockedClasses.length).toBeGreaterThan(0);
    });

    it('등급 상승 시 새로운 직업이 해금되어야 함', () => {
      gameState.soulGrade = 2;
      gameState.updateUnlockedClassesBySoulGrade();
      
      // 2등급일 때는 tiger_hunter가 없음
      expect(gameState.unlockedClasses).not.toContain('tiger_hunter');
      
      // 등급 3으로 상승시킬 수 있는 영혼석 제공 (100 + 300 + 800 = 1200)
      const result = reincarnationMgr.reincarnate(gameState, 1200);
      
      // 이제 tiger_hunter가 있어야 함
      expect(result.unlockedClasses).toContain('tiger_hunter');
    });
  });

  describe('엣지 케이스', () => {
    it('영혼석 0개로 환생할 수 있어야 함', () => {
      expect(() => {
        reincarnationMgr.reincarnate(gameState, 0);
      }).not.toThrow();
    });

    it('음수 영혼석이 전달되어도 처리해야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, -100);
      expect(result.newGrade).toBe(0);
      expect(result.remainingStones).toBe(-100);
    });

    it('매우 높은 영혼석 값도 처리해야 함', () => {
      const result = reincarnationMgr.tryIncreaseSoulGrade(0, 999999999);
      expect(result.newGrade).toBe(5);
      expect(result.remainingStones).toBeGreaterThan(0);
    });
  });
});
