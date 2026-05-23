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
const ACTIONS_FOR_END_AGE = 1000;

export class HeroLifecycle {
  static chapterForAge(age: number): Chapter {
    for (const [chapter, lo, hi] of CHAPTER_RANGES) {
      if (age >= lo && age <= hi) return chapter;
    }
    return '마지막';
  }

  /** Linear mapping: 0 actions → age 5, 1000 actions → age 70.
   *  Beyond 1000 continues linearly (age keeps increasing). */
  static ageFromActions(actions: number): number {
    const ratio = actions / ACTIONS_FOR_END_AGE;
    return Math.floor(START_AGE + (END_AGE - START_AGE) * ratio);
  }

  /** Inverse of ageFromActions: returns the action count that yields the given age.
   *  Clamps to 0 for age <= START_AGE. */
  static actionsForAge(age: number): number {
    if (age <= START_AGE) return 0;
    const ratio = (age - START_AGE) / (END_AGE - START_AGE);
    return Math.ceil(ratio * ACTIONS_FOR_END_AGE);
  }
}
