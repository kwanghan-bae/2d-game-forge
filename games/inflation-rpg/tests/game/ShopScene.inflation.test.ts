import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '../src/game/GameState';
import { InflationManager } from '../src/game/utils/InflationManager';
import { ITEM_CATALOG, Item } from '../src/game/data/ItemData';

describe('ShopScene Inflation Integration', () => {
  let gameState: GameState;
  let inflationManager: InflationManager;

  beforeEach(() => {
    gameState = GameState.getInstance();
    gameState.reset();
    gameState.stats.gold = 10000;

    inflationManager = InflationManager.getInstance();
    inflationManager.reset();
    inflationManager.setInflationRate(0.02);
  });

  function buyItemWithInflation(item: Item): boolean {
    const inflatedPrice = inflationManager.getInflatedPrice(item.price);
    
    if (gameState.stats.gold < inflatedPrice) {
      return false;
    }

    gameState.stats.gold -= inflatedPrice;
    gameState.addItem(item);
    return true;
  }

  describe('가격 인플레이션 (Price Inflation)', () => {
    it('0분 경과 시 원가로 아이템을 구매할 수 있어야 함', () => {
      const item = ITEM_CATALOG[0];
      const originalPrice = item.price;
      const startTime = Date.now();

      vi.spyOn(Date, 'now').mockReturnValue(startTime);
      inflationManager.reset();

      const initialGold = gameState.stats.gold;
      const success = buyItemWithInflation(item);

      expect(success).toBe(true);
      expect(gameState.stats.gold).toBe(initialGold - originalPrice);
    });

    it('1분 경과 시 2% 인플레이션이 적용된 가격으로 구매해야 함', () => {
      const item = ITEM_CATALOG[0];
      const originalPrice = item.price;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();

      const initialGold = gameState.stats.gold;
      const success = buyItemWithInflation(item);

      const expectedPrice = originalPrice * 1.02;
      expect(success).toBe(true);
      expect(gameState.stats.gold).toBeCloseTo(initialGold - expectedPrice, 0);
    });

    it('5분 경과 시 지수 성장한 가격으로 구매해야 함', () => {
      const item = ITEM_CATALOG[0];
      const originalPrice = item.price;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 300000)
        .mockReturnValueOnce(startTime + 300000);

      inflationManager.reset();

      const initialGold = gameState.stats.gold;
      const success = buyItemWithInflation(item);

      // originalPrice * (1.02)^5 = originalPrice * 1.10408...
      const expectedPrice = originalPrice * Math.pow(1.02, 5);
      expect(success).toBe(true);
      expect(gameState.stats.gold).toBeCloseTo(initialGold - expectedPrice, 0);
    });

    it('인플레이션으로 가격이 상승하면 골드 부족으로 구매 실패해야 함', () => {
      const item = ITEM_CATALOG[ITEM_CATALOG.length - 1];
      const startTime = 1000000000000;

      gameState.stats.gold = 5000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 300000)
        .mockReturnValueOnce(startTime + 300000);

      inflationManager.reset();

      const initialGold = gameState.stats.gold;
      const success = buyItemWithInflation(item);

      expect(success).toBe(false);
      expect(gameState.stats.gold).toBe(initialGold);
    });
  });

  describe('인플레이션율 변경 (Inflation Rate Change)', () => {
    it('커스텀 인플레이션율(5%)이 가격에 정확히 반영되어야 함', () => {
      const item = ITEM_CATALOG[0];
      const originalPrice = item.price;
      const startTime = 1000000000000;

      inflationManager.setInflationRate(0.05);

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();

      const initialGold = gameState.stats.gold;
      const success = buyItemWithInflation(item);

      const expectedPrice = originalPrice * 1.05;
      expect(success).toBe(true);
      expect(gameState.stats.gold).toBeCloseTo(initialGold - expectedPrice, 0);
    });

    it('0% 인플레이션율 시 시간이 지나도 가격이 변하지 않아야 함', () => {
      const item = ITEM_CATALOG[0];
      const originalPrice = item.price;
      const startTime = 1000000000000;

      inflationManager.setInflationRate(0);

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 600000)
        .mockReturnValueOnce(startTime + 600000);

      inflationManager.reset();

      const initialGold = gameState.stats.gold;
      const success = buyItemWithInflation(item);

      expect(success).toBe(true);
      expect(gameState.stats.gold).toBe(initialGold - originalPrice);
    });
  });

  describe('다중 구매 시나리오 (Multiple Purchase Scenario)', () => {
    it('시간 경과 후 여러 아이템을 구매하면 각각 인플레이션이 적용되어야 함', () => {
      const item1 = ITEM_CATALOG[0];
      const item2 = ITEM_CATALOG[1];
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 120000)
        .mockReturnValueOnce(startTime + 240000);

      inflationManager.reset();

      const initialGold = gameState.stats.gold;

      const success1 = buyItemWithInflation(item1);
      expect(success1).toBe(true);

      const success2 = buyItemWithInflation(item2);
      expect(success2).toBe(true);

      // item1: originalPrice * (1.02)^2, item2: originalPrice * (1.02)^4
      const expectedPrice1 = item1.price * Math.pow(1.02, 2);
      const expectedPrice2 = item2.price * Math.pow(1.02, 4);
      const totalExpected = expectedPrice1 + expectedPrice2;

      expect(gameState.stats.gold).toBeCloseTo(initialGold - totalExpected, 0);
    });
  });

  describe('아이템 추가 검증 (Item Addition Verification)', () => {
    it('인플레이션 적용 구매 후 인벤토리에 아이템이 추가되어야 함', () => {
      const item = ITEM_CATALOG[0];
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();

      const initialInventorySize = gameState.inventory.length;
      const success = buyItemWithInflation(item);

      expect(success).toBe(true);
      expect(gameState.inventory.length).toBe(initialInventorySize + 1);
      expect(gameState.inventory[initialInventorySize].id).toBe(item.id);
    });
  });
});
