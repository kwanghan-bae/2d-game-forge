import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/game/GameState';
import { ITEM_CATALOG, Item } from '../src/game/data/ItemData';
import { NumberFormatter } from '../src/game/utils/NumberFormatter';

describe('ShopScene 로직', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();
    });

    describe('구매 로직', () => {
        function buyItem(item: Item): boolean {
            if (gameState.stats.gold < item.price) {
                return false;
            }
            gameState.stats.gold -= item.price;
            gameState.addItem(item);
            return true;
        }

        it('골드가 충분하면 아이템을 구매할 수 있어야 함', () => {
            gameState.stats.gold = 1000;
            
            const item = ITEM_CATALOG[0];
            const initialGold = gameState.stats.gold;
            const initialInventorySize = gameState.inventory.length;
            
            const result = buyItem(item);
            
            expect(result).toBe(true);
            expect(gameState.stats.gold).toBe(initialGold - item.price);
            expect(gameState.inventory.length).toBe(initialInventorySize + 1);
            expect(gameState.inventory[gameState.inventory.length - 1].id).toBe(item.id);
        });

        it('골드가 부족하면 구매할 수 없어야 함', () => {
            gameState.stats.gold = 50;
            
            const item = ITEM_CATALOG[0];
            const initialGold = gameState.stats.gold;
            const initialInventorySize = gameState.inventory.length;
            
            const result = buyItem(item);
            
            expect(result).toBe(false);
            expect(gameState.stats.gold).toBe(initialGold);
            expect(gameState.inventory.length).toBe(initialInventorySize);
        });

        it('정확한 골드로 구매 가능해야 함', () => {
            const item = ITEM_CATALOG[0];
            gameState.stats.gold = item.price;
            
            const result = buyItem(item);
            
            expect(result).toBe(true);
            expect(gameState.stats.gold).toBe(0);
            expect(gameState.inventory.length).toBe(1);
        });

        it('여러 아이템을 연속으로 구매할 수 있어야 함', () => {
            gameState.stats.gold = 10000;
            
            const item1 = ITEM_CATALOG[0];
            const item2 = ITEM_CATALOG[1];
            const item3 = ITEM_CATALOG[2];
            
            buyItem(item1);
            buyItem(item2);
            buyItem(item3);
            
            expect(gameState.stats.gold).toBe(10000 - item1.price - item2.price - item3.price);
            expect(gameState.inventory.length).toBe(3);
        });

        it('골드가 부족해지면 구매가 중단되어야 함', () => {
            gameState.stats.gold = 500;
            
            const item1 = ITEM_CATALOG[0];
            const item2 = ITEM_CATALOG[2];
            
            const result1 = buyItem(item1);
            const result2 = buyItem(item2);
            
            expect(result1).toBe(true);
            expect(result2).toBe(false);
            expect(gameState.inventory.length).toBe(1);
        });
    });

    describe('NumberFormatter 통합', () => {
        it('아이템 가격이 포맷팅되어야 함', () => {
            const sansam = ITEM_CATALOG.find(item => item.price === 5000);
            expect(sansam).toBeDefined();
            
            const formattedPrice = NumberFormatter.formatCompact(sansam!.price);
            expect(formattedPrice).toBe('5K');
        });

        it('플레이어 골드가 포맷팅되어야 함', () => {
            gameState.stats.gold = 123456;
            
            const formattedGold = NumberFormatter.formatCompact(gameState.stats.gold);
            expect(formattedGold).toBe('123.46K');
        });

        it('작은 금액은 포맷팅 없이 표시되어야 함', () => {
            const hwando = ITEM_CATALOG[0];
            expect(hwando.price).toBe(100);
            
            const formattedPrice = NumberFormatter.formatCompact(hwando.price);
            expect(formattedPrice).toBe('100');
        });
    });

    describe('아이템 카탈로그', () => {
        it('모든 아이템에 가격 정보가 있어야 함', () => {
            ITEM_CATALOG.forEach(item => {
                expect(item.price).toBeGreaterThan(0);
                expect(typeof item.price).toBe('number');
            });
        });

        it('아이템이 최소 10개 이상 있어야 함', () => {
            expect(ITEM_CATALOG.length).toBeGreaterThanOrEqual(10);
        });

        it('가장 비싼 아이템은 5000 골드여야 함', () => {
            const maxPrice = Math.max(...ITEM_CATALOG.map(item => item.price));
            expect(maxPrice).toBe(5000);
        });

        it('가장 저렴한 아이템은 50 골드여야 함', () => {
            const minPrice = Math.min(...ITEM_CATALOG.map(item => item.price));
            expect(minPrice).toBe(50);
        });
    });

    describe('구매 후 장비 착용', () => {
        function buyItem(item: Item): boolean {
            if (gameState.stats.gold < item.price) {
                return false;
            }
            gameState.stats.gold -= item.price;
            gameState.addItem(item);
            return true;
        }

        it('구매한 무기를 장착할 수 있어야 함', () => {
            gameState.stats.gold = 1000;
            
            const weapon = ITEM_CATALOG.find(item => item.name.includes('환도'));
            expect(weapon).toBeDefined();
            
            buyItem(weapon!);
            const initialAttack = gameState.stats.attack;
            
            gameState.equipItem(weapon!);
            
            expect(gameState.stats.attack).toBeGreaterThan(initialAttack);
            expect(gameState.inventory.length).toBe(0);
        });

        it('구매한 방어구를 장착할 수 있어야 함', () => {
            gameState.stats.gold = 1000;
            
            const armor = ITEM_CATALOG.find(item => item.name.includes('두정갑'));
            expect(armor).toBeDefined();
            
            buyItem(armor!);
            const initialDefense = gameState.stats.defense;
            
            gameState.equipItem(armor!);
            
            expect(gameState.stats.defense).toBeGreaterThan(initialDefense);
        });
    });
});
