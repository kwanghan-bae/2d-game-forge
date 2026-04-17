import { describe, it, expect } from 'vitest';
import { calculateClassStats, applyPassiveEffect, Stats, PassiveEffectResult } from '../src/game/utils/StatCalculator';
import { ClassId } from '../src/game/data/ClassData';

describe('StatCalculator', () => {
  describe('calculateClassStats()', () => {
    describe('화랑 (Hwarang)', () => {
      it('Lv 1일 때 growthRates를 한 번 적용한 스탯을 반환해야 함', () => {
        const stats = calculateClassStats(ClassId.HWARANG, 1);
        
        // Lv 1: baseStats * (growthRates ^ 1)
        const expectedHp = Math.floor(100 * 1.08);
        const expectedAttack = Math.floor(80 * 1.10);
        const expectedDefense = Math.floor(60 * 1.08);
        const expectedAgi = Math.floor(90 * 1.12);
        const expectedLuk = Math.floor(70 * 1.08);
        
        expect(stats.hp).toBe(expectedHp);
        expect(stats.attack).toBe(expectedAttack);
        expect(stats.defense).toBe(expectedDefense);
        expect(stats.agi).toBe(expectedAgi);
        expect(stats.luk).toBe(expectedLuk);
      });

      it('Lv 10일 때 growthRates를 적용한 스탯을 반환해야 함', () => {
        const stats = calculateClassStats(ClassId.HWARANG, 10);
        
        // baseStats * (growthRates ^ level)
        const expectedHp = Math.floor(100 * Math.pow(1.08, 10));
        const expectedAgi = Math.floor(90 * Math.pow(1.12, 10));
        
        expect(stats.hp).toBe(expectedHp);
        expect(stats.agi).toBe(expectedAgi);
        expect(stats.hp).toBeGreaterThan(100);
        expect(stats.agi).toBeGreaterThan(90);
      });

      it('Lv 100일 때 높은 성장을 반영해야 함', () => {
        const stats = calculateClassStats(ClassId.HWARANG, 100);
        
        expect(stats.hp).toBeGreaterThan(300);
        expect(stats.agi).toBeGreaterThan(300);
      });

      it('Lv 50일 때 스탯을 정확히 계산해야 함', () => {
        const stats = calculateClassStats(ClassId.HWARANG, 50);
        
        const expectedHp = Math.floor(100 * Math.pow(1.08, 50));
        const expectedAttack = Math.floor(80 * Math.pow(1.10, 50));
        const expectedDefense = Math.floor(60 * Math.pow(1.08, 50));
        const expectedAgi = Math.floor(90 * Math.pow(1.12, 50));
        const expectedLuk = Math.floor(70 * Math.pow(1.08, 50));
        
        expect(stats.hp).toBe(expectedHp);
        expect(stats.attack).toBe(expectedAttack);
        expect(stats.defense).toBe(expectedDefense);
        expect(stats.agi).toBe(expectedAgi);
        expect(stats.luk).toBe(expectedLuk);
      });
    });

    describe('초의 (Choeui)', () => {
      it('Lv 50일 때 스탯을 정확히 계산해야 함', () => {
        const stats = calculateClassStats(ClassId.CHOEUI, 50);
        
        const expectedHp = Math.floor(120 * Math.pow(1.12, 50));
        const expectedAttack = Math.floor(70 * Math.pow(1.10, 50));
        const expectedDefense = Math.floor(85 * Math.pow(1.10, 50));
        const expectedAgi = Math.floor(65 * Math.pow(1.08, 50));
        const expectedLuk = Math.floor(60 * Math.pow(1.08, 50));
        
        expect(stats.hp).toBe(expectedHp);
        expect(stats.attack).toBe(expectedAttack);
        expect(stats.defense).toBe(expectedDefense);
        expect(stats.agi).toBe(expectedAgi);
        expect(stats.luk).toBe(expectedLuk);
      });
    });

    describe('착호갑사 (Tiger Hunter)', () => {
      it('Lv 50일 때 스탯을 정확히 계산해야 함', () => {
        const stats = calculateClassStats(ClassId.TIGER_HUNTER, 50);
        
        const expectedHp = Math.floor(90 * Math.pow(1.08, 50));
        const expectedAttack = Math.floor(110 * Math.pow(1.15, 50));
        const expectedDefense = Math.floor(55 * Math.pow(1.08, 50));
        const expectedAgi = Math.floor(70 * Math.pow(1.10, 50));
        const expectedLuk = Math.floor(65 * Math.pow(1.08, 50));
        
        expect(stats.hp).toBe(expectedHp);
        expect(stats.attack).toBe(expectedAttack);
        expect(stats.defense).toBe(expectedDefense);
        expect(stats.agi).toBe(expectedAgi);
        expect(stats.luk).toBe(expectedLuk);
      });
    });

    describe('무당 (Mudang)', () => {
      it('Lv 50일 때 스탯을 정확히 계산해야 함', () => {
        const stats = calculateClassStats(ClassId.MUDANG, 50);
        
        const expectedHp = Math.floor(85 * Math.pow(1.08, 50));
        const expectedAttack = Math.floor(75 * Math.pow(1.10, 50));
        const expectedDefense = Math.floor(58 * Math.pow(1.08, 50));
        const expectedAgi = Math.floor(80 * Math.pow(1.10, 50));
        const expectedLuk = Math.floor(105 * Math.pow(1.15, 50));
        
        expect(stats.hp).toBe(expectedHp);
        expect(stats.attack).toBe(expectedAttack);
        expect(stats.defense).toBe(expectedDefense);
        expect(stats.agi).toBe(expectedAgi);
        expect(stats.luk).toBe(expectedLuk);
      });
    });

    it('존재하지 않는 직업 ID로 호출하면 에러를 던져야 함', () => {
      expect(() => calculateClassStats('invalid' as any, 1)).toThrow();
    });
  });

  describe('applyPassiveEffect()', () => {
    const testStats: Stats = {
      hp: 100,
      attack: 50,
      defense: 30,
      agi: 35,
      luk: 25
    };

    it('화랑의 패시브: 모든 스탯에 1.10 배수를 적용해야 함', () => {
      const result = applyPassiveEffect(ClassId.HWARANG, testStats);
      
      expect(result.statMultipliers).toBeDefined();
      expect(result.statMultipliers?.hp).toBe(1.10);
      expect(result.statMultipliers?.attack).toBe(1.10);
      expect(result.statMultipliers?.defense).toBe(1.10);
      expect(result.statMultipliers?.agi).toBe(1.10);
      expect(result.statMultipliers?.luk).toBe(1.10);
    });

    it('초의의 패시브: HP의 5%만큼 공격력 보너스를 반환해야 함', () => {
      const result = applyPassiveEffect(ClassId.CHOEUI, testStats);
      
      expect(result.attackBonus).toBeDefined();
      expect(result.attackBonus).toBe(Math.floor(100 * 0.05));
      expect(result.attackBonus).toBe(5);
    });

    it('초의의 패시브: 더 높은 HP에서는 공격력 보너스가 커야 함', () => {
      const highHpStats: Stats = {
        hp: 500,
        attack: 50,
        defense: 30,
        agi: 35,
        luk: 25
      };
      
      const result = applyPassiveEffect(ClassId.CHOEUI, highHpStats);
      
      expect(result.attackBonus).toBe(Math.floor(500 * 0.05));
      expect(result.attackBonus).toBe(25);
    });

    it('착호갑사의 패시브: beastDamageMultiplier 1.50을 반환해야 함 (짐승 데미지 증가)', () => {
      const result = applyPassiveEffect(ClassId.TIGER_HUNTER, testStats);
      
      expect(result.beastDamageMultiplier).toBeDefined();
      expect(result.beastDamageMultiplier).toBe(1.50);
    });

    it('무당의 패시브: dropRateMultiplier 1.20을 반환해야 함', () => {
      const result = applyPassiveEffect(ClassId.MUDANG, testStats);
      
      expect(result.dropRateMultiplier).toBeDefined();
      expect(result.dropRateMultiplier).toBe(1.20);
    });

    it('존재하지 않는 직업은 빈 객체를 반환해야 함', () => {
      const result = applyPassiveEffect('invalid' as any, testStats);
      
      expect(result).toEqual({});
    });
  });

  describe('스탯 성장 곡선 검증', () => {
    it('Lv 1 → Lv 100 성장 시 화랑의 민첩이 높은 성장을 가져야 함', () => {
      const lv1 = calculateClassStats(ClassId.HWARANG, 1);
      const lv100 = calculateClassStats(ClassId.HWARANG, 100);
      
      const agiGrowth = lv100.agi - lv1.agi;
      const hpGrowth = lv100.hp - lv1.hp;
      
      // 민첩의 성장률(1.12)이 HP의 성장률(1.08)보다 높음
      expect(agiGrowth).toBeGreaterThan(hpGrowth);
    });

    it('Lv 1 → Lv 100 성장 시 초의의 HP가 가장 높아야 함', () => {
      const lv1 = calculateClassStats(ClassId.CHOEUI, 1);
      const lv100 = calculateClassStats(ClassId.CHOEUI, 100);
      
      const hpGrowth = lv100.hp - lv1.hp;
      const attackGrowth = lv100.attack - lv1.attack;
      const defenseGrowth = lv100.defense - lv1.defense;
      const agiGrowth = lv100.agi - lv1.agi;
      const lukGrowth = lv100.luk - lv1.luk;
      
      expect(hpGrowth).toBeGreaterThan(attackGrowth);
      expect(hpGrowth).toBeGreaterThan(defenseGrowth);
      expect(hpGrowth).toBeGreaterThan(agiGrowth);
      expect(hpGrowth).toBeGreaterThan(lukGrowth);
    });

    it('착호갑사는 높은 공격력 성장을 가져야 함', () => {
      const lv1 = calculateClassStats(ClassId.TIGER_HUNTER, 1);
      const lv100 = calculateClassStats(ClassId.TIGER_HUNTER, 100);
      
      const attackGrowth = lv100.attack - lv1.attack;
      
      expect(attackGrowth).toBeGreaterThan(100);
    });

    it('무당은 높은 행운 성장을 가져야 함', () => {
      const lv1 = calculateClassStats(ClassId.MUDANG, 1);
      const lv100 = calculateClassStats(ClassId.MUDANG, 100);
      
      const lukGrowth = lv100.luk - lv1.luk;
      
      expect(lukGrowth).toBeGreaterThan(100);
    });
  });

  describe('엣지 케이스', () => {
    it('Lv 0에서도 계산되어야 함 (baseStats만 반환)', () => {
      const stats = calculateClassStats(ClassId.HWARANG, 0);
      
      // Lv 0: baseStats * (growthRates ^ 0) = baseStats * 1
      expect(stats.hp).toBe(100);
      expect(stats.attack).toBe(80);
    });

    it('높은 레벨(Lv 500)에서도 계산되어야 함', () => {
      const stats = calculateClassStats(ClassId.HWARANG, 500);
      
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.attack).toBeGreaterThan(0);
      expect(typeof stats.hp).toBe('number');
      expect(typeof stats.attack).toBe('number');
    });

    it('계산된 스탯은 항상 정수여야 함', () => {
      const stats = calculateClassStats(ClassId.HWARANG, 37);
      
      expect(Number.isInteger(stats.hp)).toBe(true);
      expect(Number.isInteger(stats.attack)).toBe(true);
      expect(Number.isInteger(stats.defense)).toBe(true);
      expect(Number.isInteger(stats.agi)).toBe(true);
      expect(Number.isInteger(stats.luk)).toBe(true);
    });
  });
});
