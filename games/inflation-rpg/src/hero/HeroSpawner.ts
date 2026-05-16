import type { SeededRng } from '../cycle/SeededRng';
import { PERSONALITY_DIMS, type PersonalitySnapshot } from './PersonalityState';

// Korean-flavored name pool. Family name + given name combined.
const FAMILY_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송'];
const GIVEN_NAMES = ['민준', '서연', '도윤', '하은', '준서', '지유', '시우', '서아', '지호', '하윤', '예준', '수아', '유준', '지안', '도현', '아윤', '시현', '하린'];

export interface SpawnedHero {
  name: string;
  age: number;
  job: string;
  level: number;
  emoji: string;
  personalityPriors: Partial<PersonalitySnapshot>;
}

export class HeroSpawner {
  static spawn(rng: SeededRng): SpawnedHero {
    // Name picks come first so seed-to-name mapping is unchanged.
    const family = FAMILY_NAMES[rng.int(FAMILY_NAMES.length)];
    const given = GIVEN_NAMES[rng.int(GIVEN_NAMES.length)];

    // Pick 2 random distinct personality dims and assign each a non-zero value in [-5, +5].
    const shuffledDims = [...PERSONALITY_DIMS].sort(() => rng.int(1000) - 500);
    const pickedDims = shuffledDims.slice(0, 2);
    const personalityPriors: Partial<PersonalitySnapshot> = {};
    for (const dim of pickedDims) {
      // rng.int(10) gives 0-9; map to [-5,-4,...,-1,1,...,5] avoiding 0.
      const raw = rng.int(10); // 0..9
      personalityPriors[dim] = raw < 5 ? raw - 5 : raw - 4; // -5..-1 or 1..5
    }

    return {
      name: `${family}${given}`,
      age: 5,
      job: '평민',
      level: 1,
      emoji: '🧒',
      personalityPriors,
    };
  }
}
