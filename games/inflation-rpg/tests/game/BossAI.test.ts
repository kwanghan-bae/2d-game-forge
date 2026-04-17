import { describe, it, expect, beforeEach } from 'vitest';
import { BossAI } from '../../src/game/core/BossAI';
import { MonsterData } from '../../src/game/data/Monsters';

describe('BossAI System', () => {
  let bossAI: BossAI;

  beforeEach(() => {
    bossAI = new BossAI();
  });

  describe('보스 기본 동작', () => {
    it('일반 몬스터는 기본 패턴을 실행해야 함', () => {
      const normalMonster: MonsterData = {
        id: 1001,
        name: 'Mob_1001',
        nameKR: '쥐',
        rank: 1,
        element: 'Neutral',
        baseHP: 100,
        baseATK: 10,
        baseDEF: 0,
        baseAGI: 10,
        baseLUK: 5,
        zoneLv: 1,
        expReward: 100,
        baseGold: 10,
        dropItemID: 0,
        dropRate: 0,
        isBoss: false,
        bossSkills: []
      };

      const result = bossAI.executePattern(normalMonster);
      expect(result.message).toBe('보스의 공격!');
    });
  });

  describe('산군 패턴 (ID: 9001)', () => {
    const sangun: MonsterData = { id: 9001, nameKR: '산군' } as any;

    it('3턴 주기로 패턴이 순환되어야 함', () => {
      // 1턴: 포효
      const res1 = bossAI.executePattern(sangun);
      expect(res1.message).toContain('포효');
      expect(res1.damage).toBe(50);

      // 2턴: 방어력 약화
      const res2 = bossAI.executePattern(sangun);
      expect(res2.message).toContain('방어력');
      expect(res2.defenseDebuff).toBe(true);

      // 3턴: 할퀴기 (일반)
      const res3 = bossAI.executePattern(sangun);
      expect(res3.message).toContain('할퀸다');
      expect(res3.damage).toBe(40);

      // 4턴: 다시 포효 (순환)
      const res4 = bossAI.executePattern(sangun);
      expect(res4.message).toContain('포효');
    });

    it('디버프 적용 시 processDebuffs 결과 확인', () => {
      bossAI.executePattern(sangun); // 1턴: 포효
      bossAI.executePattern(sangun); // 2턴: 디버프 발생
      
      const debuff = bossAI.processDebuffs();
      expect(debuff.defenseMultiplier).toBe(0.5);
      expect(debuff.duration).toBe(1); // 2턴 중 1턴 경과
    });
  });

  describe('염라대왕 패턴 (ID: 9002)', () => {
    const yama: MonsterData = { id: 9002, nameKR: '염라대왕' } as any;

    it('2턴 주기로 패턴이 순환되어야 함', () => {
      const res1 = bossAI.executePattern(yama);
      expect(res1.message).toContain('심판');

      const res2 = bossAI.executePattern(yama);
      expect(res2.message).toContain('업보');
    });

    it('업보 즉사 판정 확인', () => {
      expect(bossAI.checkInstantDeath(150)).toBe(true);
      expect(bossAI.checkInstantDeath(50)).toBe(false);
    });
  });

  describe('상태 관리', () => {
    it('resetTurns() 시 상태가 초기화되어야 함', () => {
      const sangun: MonsterData = { id: 9001 } as any;
      bossAI.executePattern(sangun); // 1턴
      bossAI.executePattern(sangun); // 2턴
      
      bossAI.resetTurns();
      
      const res = bossAI.executePattern(sangun);
      expect(res.message).toContain('포효'); // 다시 1턴 패턴부터 시작
    });
  });
});
