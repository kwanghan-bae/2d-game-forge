/**
 * josa.ts unit tests — Cycle 4 A2.
 *
 * PRD 명시 6 케이스 + edge: 빈 문자열, ㄹ 받침 예외, 숫자/한자 fallback.
 */
import { describe, it, expect } from 'vitest';
import { josa } from '../josa';

describe('josa()', () => {
  describe('과/와 (PRD 명시)', () => {
    it("폭풍 → 폭풍과 (받침 없음)", () => {
      expect(josa('폭풍', '과와')).toBe('폭풍과');
    });
    it('바람 → 바람과 (ㅁ 받침)', () => {
      expect(josa('바람', '과와')).toBe('바람과');
    });
    it("나비 → 나비와 (받침 없음 모음)", () => {
      expect(josa('나비', '과와')).toBe('나비와');
    });
  });

  describe('이/가 (PRD 명시)', () => {
    it('영웅 → 영웅이 (ㅇ 받침)', () => {
      expect(josa('영웅', '이가')).toBe('영웅이');
    });
    it("나비 → 나비가 (받침 없음)", () => {
      expect(josa('나비', '이가')).toBe('나비가');
    });
  });

  describe('을/를', () => {
    it('칼 → 칼을 (ㄹ 받침)', () => {
      expect(josa('칼', '을를')).toBe('칼을');
    });
    it('나비 → 나비를 (받침 없음)', () => {
      expect(josa('나비', '을를')).toBe('나비를');
    });
  });

  describe('은/는', () => {
    it('영웅 → 영웅은 (받침 있음)', () => {
      expect(josa('영웅', '은는')).toBe('영웅은');
    });
    it('나비 → 나비는 (받침 없음)', () => {
      expect(josa('나비', '은는')).toBe('나비는');
    });
  });

  describe('으로/로 (ㄹ 받침 예외)', () => {
    it('서울 → 서울로 (ㄹ 받침 예외)', () => {
      expect(josa('서울', '으로로')).toBe('서울로');
    });
    it('한국 → 한국으로 (ㅁ/ㄱ 등 일반 받침)', () => {
      expect(josa('한국', '으로로')).toBe('한국으로');
    });
    it('나비 → 나비로 (받침 없음)', () => {
      expect(josa('나비', '으로로')).toBe('나비로');
    });
  });

  describe('영문 fallback', () => {
    it("Bob → Bob이 (자음 b 끝 받침 있음 처리)", () => {
      expect(josa('Bob', '이가')).toBe('Bob이');
    });
    it("Aria → Aria가 (모음 a 끝 받침 없음 처리)", () => {
      expect(josa('Aria', '이가')).toBe('Aria가');
    });
  });

  describe('edge cases', () => {
    it('빈 문자열 → 받침 없음 fallback', () => {
      expect(josa('', '과와')).toBe('와');
    });
    it('숫자 끝 → 받침 없음 fallback', () => {
      expect(josa('레벨5', '이가')).toBe('레벨5가');
    });
    it('이중 패치움 (한국어 받침 ㄺ ㄻ etc) → 받침 있음', () => {
      // '닭' (ㄺ 받침, jongseong index = 9) → '닭이'
      expect(josa('닭', '이가')).toBe('닭이');
    });
  });
});
