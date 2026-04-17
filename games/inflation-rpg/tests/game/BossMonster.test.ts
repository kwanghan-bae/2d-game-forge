import { describe, it, expect, beforeEach } from 'vitest';
import { MonsterData, getBossList, isBossMonster, MONSTERS } from '../src/game/data/Monsters';

describe('Boss Monster Data', () => {
  describe('산군 (Tiger Lord) - ID 9001', () => {
    let tigerLord: MonsterData | undefined;

    beforeEach(() => {
      tigerLord = MONSTERS.find(m => m.id === 9001);
    });

    it('산군 데이터가 존재해야 함', () => {
      expect(tigerLord).toBeDefined();
    });

    it('산군의 nameKR이 "산군"이어야 함', () => {
      expect(tigerLord?.nameKR).toBe('산군');
    });

    it('산군의 이름이 "Boss_TigerLord"이어야 함', () => {
      expect(tigerLord?.name).toBe('Boss_TigerLord');
    });

    it('산군의 isBoss가 true이어야 함', () => {
      expect(tigerLord?.isBoss).toBe(true);
    });

    it('산군의 rank가 10이어야 함', () => {
      expect(tigerLord?.rank).toBe(10);
    });

    it('산군의 element가 "Wind"이어야 함', () => {
      expect(tigerLord?.element).toBe('Wind');
    });

    it('산군의 기본 스탯이 일반 몬스터보다 높아야 함', () => {
      expect(tigerLord?.baseHP).toBe(500000);
      expect(tigerLord?.baseATK).toBe(50000);
      expect(tigerLord?.baseDEF).toBe(2000);
    });

    it('산군의 ZoneLv가 1009이어야 함', () => {
      expect(tigerLord?.zoneLv).toBe(1009);
    });

    it('산군의 경험치 보상이 10000이어야 함', () => {
      expect(tigerLord?.expReward).toBe(10000);
    });

    it('산군의 금화 보상이 5000이어야 함', () => {
      expect(tigerLord?.baseGold).toBe(5000);
    });

    it('산군의 드롭 아이템 ID가 101이어야 함', () => {
      expect(tigerLord?.dropItemID).toBe(101);
    });

    it('산군의 드롭율이 1.0이어야 함', () => {
      expect(tigerLord?.dropRate).toBe(1.0);
    });

    it('산군의 bossSkills이 배열이어야 함', () => {
      expect(Array.isArray(tigerLord?.bossSkills)).toBe(true);
    });
  });

  describe('염라대왕 (King Yeomra) - ID 9002', () => {
    let kingYeomra: MonsterData | undefined;

    beforeEach(() => {
      kingYeomra = MONSTERS.find(m => m.id === 9002);
    });

    it('염라대왕 데이터가 존재해야 함', () => {
      expect(kingYeomra).toBeDefined();
    });

    it('염라대왕의 nameKR이 "염라대왕"이어야 함', () => {
      expect(kingYeomra?.nameKR).toBe('염라대왕');
    });

    it('염라대왕의 이름이 "Boss_KingYeomra"이어야 함', () => {
      expect(kingYeomra?.name).toBe('Boss_KingYeomra');
    });

    it('염라대왕의 isBoss가 true이어야 함', () => {
      expect(kingYeomra?.isBoss).toBe(true);
    });

    it('염라대왕의 rank가 20이어야 함', () => {
      expect(kingYeomra?.rank).toBe(20);
    });

    it('염라대왕의 element가 "Dark"이어야 함', () => {
      expect(kingYeomra?.element).toBe('Dark');
    });

    it('염라대왕의 기본 스탯이 산군보다 훨씬 높아야 함', () => {
      expect(kingYeomra?.baseHP).toBe(5000000);
      expect(kingYeomra?.baseATK).toBe(500000);
      expect(kingYeomra?.baseDEF).toBe(100000);
    });

    it('염라대왕의 ZoneLv가 2005이어야 함', () => {
      expect(kingYeomra?.zoneLv).toBe(2005);
    });

    it('염라대왕의 경험치 보상이 100000이어야 함', () => {
      expect(kingYeomra?.expReward).toBe(100000);
    });

    it('염라대왕의 금화 보상이 50000이어야 함', () => {
      expect(kingYeomra?.baseGold).toBe(50000);
    });

    it('염라대왕의 드롭 아이템 ID가 102이어야 함', () => {
      expect(kingYeomra?.dropItemID).toBe(102);
    });

    it('염라대왕의 드롭율이 1.0이어야 함', () => {
      expect(kingYeomra?.dropRate).toBe(1.0);
    });

    it('염라대왕의 bossSkills이 배열이어야 함', () => {
      expect(Array.isArray(kingYeomra?.bossSkills)).toBe(true);
    });
  });

  describe('getBossList() 헬퍼 함수', () => {
    it('getBossList()가 존재해야 함', () => {
      expect(typeof getBossList).toBe('function');
    });

    it('getBossList()는 배열을 반환해야 함', () => {
      const bosses = getBossList();
      expect(Array.isArray(bosses)).toBe(true);
    });

    it('getBossList()는 최소 2개의 보스를 반환해야 함', () => {
      const bosses = getBossList();
      expect(bosses.length).toBeGreaterThanOrEqual(2);
    });

    it('getBossList()의 모든 항목이 isBoss === true여야 함', () => {
      const bosses = getBossList();
      bosses.forEach(boss => {
        expect(boss.isBoss).toBe(true);
      });
    });

    it('getBossList()에 산군과 염라대왕이 포함되어야 함', () => {
      const bosses = getBossList();
      const bossIds = bosses.map(b => b.id);
      expect(bossIds).toContain(9001);
      expect(bossIds).toContain(9002);
    });
  });

  describe('isBossMonster() 헬퍼 함수', () => {
    it('isBossMonster()가 존재해야 함', () => {
      expect(typeof isBossMonster).toBe('function');
    });

    it('9001(산군)에 대해 true를 반환해야 함', () => {
      expect(isBossMonster(9001)).toBe(true);
    });

    it('9002(염라대왕)에 대해 true를 반환해야 함', () => {
      expect(isBossMonster(9002)).toBe(true);
    });

    it('일반 몬스터 ID에 대해 false를 반환해야 함', () => {
      expect(isBossMonster(1)).toBe(false);
      expect(isBossMonster(100)).toBe(false);
    });

    it('존재하지 않는 몬스터 ID에 대해 false를 반환해야 함', () => {
      expect(isBossMonster(99999)).toBe(false);
    });
  });

  describe('보스 몬스터 밸런스 검증', () => {
    it('산군의 HP가 일반 몬스터(rank 1-5)보다 훨씬 높아야 함', () => {
      const tigerLord = MONSTERS.find(m => m.id === 9001);
      const normalMonsters = MONSTERS.filter(m => !m.isBoss && m.rank <= 5);
      
      if (normalMonsters.length > 0 && tigerLord) {
        const maxNormalHP = Math.max(...normalMonsters.map(m => m.baseHP));
        expect(tigerLord.baseHP).toBeGreaterThan(maxNormalHP);
      }
    });

    it('염라대왕의 HP가 산군보다 훨씬 높아야 함', () => {
      const tigerLord = MONSTERS.find(m => m.id === 9001);
      const kingYeomra = MONSTERS.find(m => m.id === 9002);
      
      if (tigerLord && kingYeomra) {
        expect(kingYeomra.baseHP).toBeGreaterThan(tigerLord.baseHP);
      }
    });

    it('보스의 기본 ATK가 일반 몬스터보다 높아야 함', () => {
      const bosses = getBossList();
      const normalMonsters = MONSTERS.filter(m => !m.isBoss);
      
      if (normalMonsters.length > 0) {
        const maxNormalATK = Math.max(...normalMonsters.map(m => m.baseATK));
        bosses.forEach(boss => {
          expect(boss.baseATK).toBeGreaterThan(maxNormalATK);
        });
      }
    });
  });
});
