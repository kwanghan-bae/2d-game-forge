import { describe, it, expect } from 'vitest';
import { HeroLifecycle, type Chapter } from '../HeroLifecycle';

describe('HeroLifecycle chapterForAge', () => {
  it('age 5–14 = 어린시절', () => {
    expect(HeroLifecycle.chapterForAge(5)).toBe('어린시절');
    expect(HeroLifecycle.chapterForAge(14)).toBe('어린시절');
  });

  it('age 15–29 = 청년기', () => {
    expect(HeroLifecycle.chapterForAge(15)).toBe('청년기');
    expect(HeroLifecycle.chapterForAge(29)).toBe('청년기');
  });

  it('age 30–49 = 장년기', () => {
    expect(HeroLifecycle.chapterForAge(30)).toBe('장년기');
    expect(HeroLifecycle.chapterForAge(49)).toBe('장년기');
  });

  it('age 50–69 = 노년기', () => {
    expect(HeroLifecycle.chapterForAge(50)).toBe('노년기');
    expect(HeroLifecycle.chapterForAge(69)).toBe('노년기');
  });

  it('age 70+ = 마지막', () => {
    expect(HeroLifecycle.chapterForAge(70)).toBe('마지막');
    expect(HeroLifecycle.chapterForAge(120)).toBe('마지막');
  });

  it('all 5 chapters exported', () => {
    const chapters: Chapter[] = ['어린시절', '청년기', '장년기', '노년기', '마지막'];
    expect(chapters.length).toBe(5);
  });
});

describe('HeroLifecycle ageFromActions', () => {
  it('0 actions → age 5', () => {
    expect(HeroLifecycle.ageFromActions(0)).toBe(5);
  });

  it('1000 actions → age 70', () => {
    expect(HeroLifecycle.ageFromActions(1000)).toBeGreaterThanOrEqual(70);
  });

  it('500 actions → age in 장년기 range (30-49)', () => {
    const age = HeroLifecycle.ageFromActions(500);
    expect(age).toBeGreaterThanOrEqual(30);
    expect(age).toBeLessThanOrEqual(50);
  });

  it('beyond 1000 actions → age keeps increasing', () => {
    expect(HeroLifecycle.ageFromActions(2000)).toBeGreaterThan(HeroLifecycle.ageFromActions(1000));
  });

  it('actionsForAge is inverse of ageFromActions at canonical anchor ages', () => {
    for (const age of [5, 15, 30, 50, 70]) {
      const actions = HeroLifecycle.actionsForAge(age);
      expect(HeroLifecycle.ageFromActions(actions)).toBe(age);
    }
  });
});
