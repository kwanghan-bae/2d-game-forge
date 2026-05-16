import type { SeededRng } from '../cycle/SeededRng';

// Korean-flavored name pool. Family name + given name combined.
const FAMILY_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송'];
const GIVEN_NAMES = ['민준', '서연', '도윤', '하은', '준서', '지유', '시우', '서아', '지호', '하윤', '예준', '수아', '유준', '지안', '도현', '아윤', '시현', '하린'];

export interface SpawnedHero {
  name: string;
  age: number;
  job: string;
  level: number;
  emoji: string;
}

export class HeroSpawner {
  static spawn(rng: SeededRng): SpawnedHero {
    const family = FAMILY_NAMES[rng.int(FAMILY_NAMES.length)];
    const given = GIVEN_NAMES[rng.int(GIVEN_NAMES.length)];
    return {
      name: `${family}${given}`,
      age: 5,
      job: '평민',
      level: 1,
      emoji: '🧒',
    };
  }
}
