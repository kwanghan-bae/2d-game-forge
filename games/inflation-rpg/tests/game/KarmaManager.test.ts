import { describe, it, expect, beforeEach } from 'vitest';
import { KarmaManager } from '../../src/game/utils/KarmaManager';

/**
 * KarmaManager 클래스의 비즈니스 로직 및 에지 케이스를 검증하는 테스트 스위트입니다.
 * 플레이어의 업보(Karma) 수치에 따른 레벨 판정, 임계값 확인, 저장/복원 기능을 테스트합니다.
 */
describe('KarmaManager', () => {
  let karmaManager: KarmaManager;

  beforeEach(() => {
    // 싱글톤을 초기화하기 위해 새로운 인스턴스 생성
    karmaManager = KarmaManager.getInstance();
    karmaManager.reset();
  });

  describe('getInstance()', () => {
    it('KarmaManager 싱글톤 인스턴스를 반환해야 함', () => {
      const instance1 = KarmaManager.getInstance();
      const instance2 = KarmaManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getKarma()', () => {
    it('초기 업보는 0이어야 함', () => {
      expect(karmaManager.getKarma()).toBe(0);
    });

    it('업보 값을 정확하게 반환해야 함', () => {
      karmaManager.increaseKarma(50);
      expect(karmaManager.getKarma()).toBe(50);
    });
  });

  describe('increaseKarma()', () => {
    it('업보를 기본값(1)으로 증가시켜야 함', () => {
      karmaManager.increaseKarma();
      expect(karmaManager.getKarma()).toBe(1);
    });

    it('지정된 만큼 업보를 증가시켜야 함', () => {
      karmaManager.increaseKarma(25);
      expect(karmaManager.getKarma()).toBe(25);
    });

    it('여러 번 호출하면 누적되어야 함', () => {
      karmaManager.increaseKarma(10);
      karmaManager.increaseKarma(20);
      karmaManager.increaseKarma(30);
      expect(karmaManager.getKarma()).toBe(60);
    });

    it('최대값 999를 초과할 수 없어야 함', () => {
      karmaManager.increaseKarma(500);
      karmaManager.increaseKarma(500);
      expect(karmaManager.getKarma()).toBe(999);
    });

    it('정확히 999까지 증가할 수 있어야 함', () => {
      karmaManager.increaseKarma(999);
      expect(karmaManager.getKarma()).toBe(999);
    });

    it('음수 값은 0으로 처리되어야 함 (또는 증가하지 않음)', () => {
      karmaManager.increaseKarma(-10);
      // 구현에 따라 0이거나 변경 없음
      expect(karmaManager.getKarma()).toBeLessThanOrEqual(0);
    });
  });

  describe('decreaseKarma()', () => {
    beforeEach(() => {
      karmaManager.increaseKarma(100);
    });

    it('업보를 감소시켜야 함 (면죄부 사용)', () => {
      karmaManager.decreaseKarma(25);
      expect(karmaManager.getKarma()).toBe(75);
    });

    it('지정된 만큼 정확하게 감소시켜야 함', () => {
      karmaManager.decreaseKarma(50);
      expect(karmaManager.getKarma()).toBe(50);
    });

    it('여러 번 호출하면 누적 감소되어야 함', () => {
      karmaManager.decreaseKarma(10);
      karmaManager.decreaseKarma(20);
      karmaManager.decreaseKarma(15);
      expect(karmaManager.getKarma()).toBe(55);
    });

    it('최소값 0 이하로 내려가면 안 됨', () => {
      karmaManager.decreaseKarma(200);
      expect(karmaManager.getKarma()).toBe(0);
    });

    it('정확히 0까지 감소할 수 있어야 함', () => {
      karmaManager.decreaseKarma(100);
      expect(karmaManager.getKarma()).toBe(0);
    });
  });

  describe('isHighKarma()', () => {
    it('업보가 100 미만이면 false를 반환', () => {
      karmaManager.increaseKarma(99);
      expect(karmaManager.isHighKarma()).toBe(false);
    });

    it('업보가 정확히 100이면 true를 반환', () => {
      karmaManager.increaseKarma(100);
      expect(karmaManager.isHighKarma()).toBe(true);
    });

    it('업보가 100 이상이면 true를 반환', () => {
      karmaManager.increaseKarma(150);
      expect(karmaManager.isHighKarma()).toBe(true);
    });

    it('초기 상태(0)에서는 false를 반환', () => {
      expect(karmaManager.isHighKarma()).toBe(false);
    });

    it('업보 감소 후 100 미만이면 false를 반환', () => {
      karmaManager.increaseKarma(150);
      karmaManager.decreaseKarma(50);
      expect(karmaManager.isHighKarma()).toBe(true); // 150 - 50 = 100
      karmaManager.decreaseKarma(1);
      expect(karmaManager.isHighKarma()).toBe(false); // 100 - 1 = 99
    });
  });

  describe('getKarmaLevel()', () => {
    it('업보가 30 미만이면 "saint" 레벨 반환', () => {
      karmaManager.increaseKarma(10);
      expect(karmaManager.getKarmaLevel()).toBe('saint');
    });

    it('업보가 정확히 30이면 "normal" 레벨 반환', () => {
      karmaManager.increaseKarma(30);
      expect(karmaManager.getKarmaLevel()).toBe('normal');
    });

    it('업보가 30과 100 사이면 "normal" 레벨 반환', () => {
      karmaManager.increaseKarma(50);
      expect(karmaManager.getKarmaLevel()).toBe('normal');
    });

    it('업보가 100 이상이면 "sinner" 레벨 반환', () => {
      karmaManager.increaseKarma(100);
      expect(karmaManager.getKarmaLevel()).toBe('sinner');
    });

    it('초기 상태(0)에서는 "saint" 레벨 반환', () => {
      expect(karmaManager.getKarmaLevel()).toBe('saint');
    });
  });

  describe('reset()', () => {
    it('업보를 0으로 초기화해야 함', () => {
      karmaManager.increaseKarma(250);
      karmaManager.reset();
      expect(karmaManager.getKarma()).toBe(0);
    });

    it('reset() 후 여러 상태 메서드가 초기 상태를 반영해야 함', () => {
      karmaManager.increaseKarma(250);
      karmaManager.reset();
      expect(karmaManager.getKarma()).toBe(0);
      expect(karmaManager.isHighKarma()).toBe(false);
      expect(karmaManager.getKarmaLevel()).toBe('saint');
    });
  });

  describe('toJSON() / fromJSON()', () => {
    it('toJSON()이 현재 업보를 객체로 반환해야 함', () => {
      karmaManager.increaseKarma(75);
      const json = karmaManager.toJSON();
      expect(json).toEqual({ karma: 75 });
    });

    it('toJSON()이 초기 상태를 반영해야 함', () => {
      const json = karmaManager.toJSON();
      expect(json).toEqual({ karma: 0 });
    });

    it('fromJSON()이 업보를 복원해야 함', () => {
      karmaManager.fromJSON({ karma: 150 });
      expect(karmaManager.getKarma()).toBe(150);
    });

    it('fromJSON() 후 다른 메서드들이 정확하게 작동해야 함', () => {
      karmaManager.fromJSON({ karma: 100 });
      expect(karmaManager.getKarma()).toBe(100);
      expect(karmaManager.isHighKarma()).toBe(true);
      expect(karmaManager.getKarmaLevel()).toBe('sinner');
    });

    it('fromJSON() with undefined data는 0으로 설정해야 함', () => {
      karmaManager.increaseKarma(50);
      karmaManager.fromJSON({ karma: undefined as any });
      expect(karmaManager.getKarma()).toBe(0);
    });

    it('저장과 복원이 정확하게 작동해야 함 (Save/Load 사이클)', () => {
      karmaManager.increaseKarma(200);
      const saved = karmaManager.toJSON();
      
      karmaManager.reset();
      expect(karmaManager.getKarma()).toBe(0);
      
      karmaManager.fromJSON(saved);
      expect(karmaManager.getKarma()).toBe(200);
      expect(karmaManager.isHighKarma()).toBe(true);
    });
  });

  describe('업보 시나리오 테스트', () => {
    it('몬스터 처치로 업보 누적 → 면죄부로 감소 시나리오', () => {
      // 몬스터 5회 처치 (각 1 업보)
      for (let i = 0; i < 5; i++) {
        karmaManager.increaseKarma(1);
      }
      expect(karmaManager.getKarma()).toBe(5);
      expect(karmaManager.getKarmaLevel()).toBe('saint');

      // 면죄부 사용 (3 업보 감소)
      karmaManager.decreaseKarma(3);
      expect(karmaManager.getKarma()).toBe(2);
    });

    it('고업보 달성 → 염라대왕 즉사 조건 확인', () => {
      // 100회 이상 몬스터 처치로 고업보 달성
      karmaManager.increaseKarma(100);
      expect(karmaManager.isHighKarma()).toBe(true);
      expect(karmaManager.getKarmaLevel()).toBe('sinner');
    });

    it('업보 최대값 도달 시나리오', () => {
      karmaManager.increaseKarma(9999); // 초과 시도
      expect(karmaManager.getKarma()).toBe(999);
      
      // 추가 증가 시도는 999를 유지해야 함
      karmaManager.increaseKarma(1);
      expect(karmaManager.getKarma()).toBe(999);
    });

    it('업보 0 이하 방지 시나리오', () => {
      karmaManager.increaseKarma(50);
      karmaManager.decreaseKarma(100); // 과도한 감소 시도
      expect(karmaManager.getKarma()).toBe(0);
      
      // 추가 감소 시도는 0을 유지해야 함
      karmaManager.decreaseKarma(1);
      expect(karmaManager.getKarma()).toBe(0);
    });

    it('subtractKarma()가 업보를 올바르게 감소시켜야 함', () => {
      karmaManager.fromJSON({ karma: 50 });
      karmaManager.subtractKarma(20);
      expect(karmaManager.getKarma()).toBe(30);
    });

    it('addKarma()가 업보를 올바르게 증가시켜야 함', () => {
      karmaManager.fromJSON({ karma: 10 });
      karmaManager.addKarma(5);
      expect(karmaManager.getKarma()).toBe(15);
    });

    it('isHighKarma()가 커스텀 임계값을 지원해야 함', () => {
      karmaManager.fromJSON({ karma: 50 });
      expect(karmaManager.isHighKarma(40)).toBe(true);
      expect(karmaManager.isHighKarma(60)).toBe(false);
    });

    it('increaseKarma()에서 음수 amount는 무시되어야 함', () => {
      karmaManager.fromJSON({ karma: 10 });
      karmaManager.increaseKarma(-5);
      expect(karmaManager.getKarma()).toBe(10);
    });
  });
});
