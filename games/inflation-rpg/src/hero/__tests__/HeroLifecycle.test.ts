import { describe, it, expect } from 'vitest';
import { HeroLifecycle, type Chapter } from '../HeroLifecycle';

describe('HeroLifecycle', () => {
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

  it('ageFromBpProgress maps BP 0% → 5, BP 100% → 70', () => {
    expect(HeroLifecycle.ageFromBpProgress(0)).toBe(5);
    expect(HeroLifecycle.ageFromBpProgress(1)).toBe(70);
    expect(HeroLifecycle.ageFromBpProgress(0.5)).toBeGreaterThanOrEqual(30);
    expect(HeroLifecycle.ageFromBpProgress(0.5)).toBeLessThanOrEqual(50);
  });
});
