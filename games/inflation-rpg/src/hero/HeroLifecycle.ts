// Chapters map to age ranges. BP consumption progress drives age advance —
// at BP 0% remaining used, hero is 5 (start). At 100% used, hero is 70+ (death/old age).
// Trait modifiers (bpCostMul) effectively shorten or lengthen the cycle but the
// 5-stage chapter structure stays.

export const CHAPTERS = ['어린시절', '청년기', '장년기', '노년기', '마지막'] as const;
export type Chapter = (typeof CHAPTERS)[number];

const CHAPTER_RANGES: Array<[Chapter, number, number]> = [
  ['어린시절', 5, 14],
  ['청년기', 15, 29],
  ['장년기', 30, 49],
  ['노년기', 50, 69],
  ['마지막', 70, 999],
];

const START_AGE = 5;
const END_AGE = 70;

export class HeroLifecycle {
  static chapterForAge(age: number): Chapter {
    for (const [chapter, lo, hi] of CHAPTER_RANGES) {
      if (age >= lo && age <= hi) return chapter;
    }
    return '마지막';
  }

  /** Linear mapping: bpProgress 0 → START_AGE (5), 1 → END_AGE (70). */
  static ageFromBpProgress(bpProgress: number): number {
    const clamped = Math.max(0, Math.min(1, bpProgress));
    return Math.floor(START_AGE + (END_AGE - START_AGE) * clamped);
  }
}
