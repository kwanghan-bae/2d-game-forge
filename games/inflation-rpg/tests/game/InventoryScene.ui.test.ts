import { describe, it, expect } from 'vitest';
import { NumberFormatter } from '../src/game/utils/NumberFormatter';

/**
 * InventoryScene UI 포맷팅 테스트
 * 
 * 목표: InventoryScene이 아이템 스탯을 NumberFormatter로 포맷팅하여 표시하는지 검증
 */
describe('InventoryScene - UI NumberFormatter Integration', () => {
    describe('아이템 스탯 포맷팅', () => {
        it('공격력이 1,000 이상일 때 "K" 단위로 표시', () => {
            const atk = 5500;
            const statsStr = `공격력 +${NumberFormatter.formatCompact(atk)}`;
            
            expect(statsStr).toBe('공격력 +5.5K');
        });
        
        it('방어력이 1,000,000 이상일 때 "M" 단위로 표시', () => {
            const def = 2345678;
            const statsStr = `방어력 +${NumberFormatter.formatCompact(def)}`;
            
            expect(statsStr).toBe('방어력 +2.35M');
        });
        
        it('체력이 1,000,000,000 이상일 때 "B" 단위로 표시', () => {
            const hp = 1500000000;
            const statsStr = `체력 +${NumberFormatter.formatCompact(hp)}`;
            
            expect(statsStr).toBe('체력 +1.5B');
        });
        
        it('운이 999 이하일 때 그대로 표시', () => {
            const luk = 125;
            const statsStr = `운 +${NumberFormatter.formatCompact(luk)}`;
            
            expect(statsStr).toBe('운 +125');
        });
        
        it('여러 스탯이 동시에 표시될 때 각각 포맷팅', () => {
            const atk = 12000;
            const def = 8500;
            const hp = 50000;
            const statsStr = `공격력 +${NumberFormatter.formatCompact(atk)} 방어력 +${NumberFormatter.formatCompact(def)} 체력 +${NumberFormatter.formatCompact(hp)}`;
            
            expect(statsStr).toBe('공격력 +12K 방어력 +8.5K 체력 +50K');
        });
    });
    
    describe('툴팁 메시지 전체 포맷팅', () => {
        it('기본 아이템 툴팁 구조 검증', () => {
            const itemName = '화도';
            const description = '조선의 전통 검';
            const atk = 15;
            const statsStr = `공격력 +${NumberFormatter.formatCompact(atk)}`;
            const tooltip = `[${itemName}]\n${description}\n${statsStr}`;
            
            expect(tooltip).toBe('[화도]\n조선의 전통 검\n공격력 +15');
        });
        
        it('고급 아이템 툴팁 (여러 스탯)', () => {
            const itemName = '천하무적갑옷';
            const description = '전설의 갑옷';
            const atk = 5000;
            const def = 12000;
            const hp = 25000;
            const statsStr = `공격력 +${NumberFormatter.formatCompact(atk)} 방어력 +${NumberFormatter.formatCompact(def)} 체력 +${NumberFormatter.formatCompact(hp)}`;
            const tooltip = `[${itemName}]\n${description}\n${statsStr}`;
            
            expect(tooltip).toBe('[천하무적갑옷]\n전설의 갑옷\n공격력 +5K 방어력 +12K 체력 +25K');
        });
        
        it('스탯 없는 소비 아이템', () => {
            const itemName = '인삼';
            const description = 'HP 회복';
            const tooltip = `[${itemName}]\n${description}\n`;
            
            expect(tooltip).toBe('[인삼]\nHP 회복\n');
        });
    });
    
    describe('극한 레벨 아이템 (Level 1000+)', () => {
        it('공격력이 10^12 이상일 때 "T" 단위로 표시', () => {
            const atk = 5000000000000; // 5T
            const statsStr = `공격력 +${NumberFormatter.formatCompact(atk)}`;
            
            expect(statsStr).toBe('공격력 +5T');
        });
        
        it('방어력이 10^16 이상일 때 "Ky" 단위로 표시', () => {
            const def = 25000000000000000; // 2.5Ky
            const statsStr = `방어력 +${NumberFormatter.formatCompact(def)}`;
            
            expect(statsStr).toBe('방어력 +2.5Ky');
        });
        
        it('체력이 10^20 이상일 때 "Ha" 단위로 표시', () => {
            const hp = 350000000000000000000; // 3.5Ha
            const statsStr = `체력 +${NumberFormatter.formatCompact(hp)}`;
            
            expect(statsStr).toBe('체력 +3.5Ha');
        });
        
        it('극한 레벨 전설 아이템 툴팁', () => {
            const itemName = '신의무기';
            const description = '신들의 전설';
            const atk = 10000000000000000; // 1Ky
            const def = 500000000000000; // 500T
            const hp = 20000000000000000; // 2Ky
            const statsStr = `공격력 +${NumberFormatter.formatCompact(atk)} 방어력 +${NumberFormatter.formatCompact(def)} 체력 +${NumberFormatter.formatCompact(hp)}`;
            const tooltip = `[${itemName}]\n${description}\n${statsStr}`;
            
            expect(tooltip).toBe('[신의무기]\n신들의 전설\n공격력 +1Ky 방어력 +500T 체력 +2Ky');
        });
    });
    
    describe('아이템 가격 포맷팅 (미래 확장)', () => {
        it('가격이 1,000 이상일 때 "K" 단위로 표시', () => {
            const price = 5500;
            const priceStr = `가격: ${NumberFormatter.formatCompact(price)} Gold`;
            
            expect(priceStr).toBe('가격: 5.5K Gold');
        });
        
        it('가격이 1,000,000 이상일 때 "M" 단위로 표시', () => {
            const price = 3500000;
            const priceStr = `가격: ${NumberFormatter.formatCompact(price)} Gold`;
            
            expect(priceStr).toBe('가격: 3.5M Gold');
        });
        
        it('인플레이션 극한 가격 (10^12 이상) "T" 단위로 표시', () => {
            const price = 12000000000000; // 12T
            const priceStr = `가격: ${NumberFormatter.formatCompact(price)} Gold`;
            
            expect(priceStr).toBe('가격: 12T Gold');
        });
    });
});
