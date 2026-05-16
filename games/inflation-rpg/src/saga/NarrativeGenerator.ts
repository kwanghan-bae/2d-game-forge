import type { DeathCause } from './SagaTypes';

export class NarrativeGenerator {
  static forBattle(opts: { age: number; enemyNameKR: string }): string {
    return `${opts.age}세에 ${opts.enemyNameKR}을(를) 처치했다.`;
  }

  static forLevelUp(opts: { age: number; newLevel: number }): string {
    return `${opts.age}세에 한 단계 더 강해졌다. (LV ${opts.newLevel})`;
  }

  static forDrop(opts: { age: number; itemNameKR: string }): string {
    return `${opts.age}세에 ${opts.itemNameKR}을(를) 손에 넣었다.`;
  }

  static forDeath(opts: { age: number; cause: DeathCause; enemyNameKR?: string }): string {
    switch (opts.cause) {
      case '전사':
        return `${opts.age}세에 ${opts.enemyNameKR ?? '강적'}에게 쓰러져 생을 마감했다.`;
      case '자연사':
        return `${opts.age}세에 안식을 맞아 잠들었다.`;
      case '영광스러운죽음':
        return `${opts.age}세에 영웅으로서 생을 마감했다.`;
      case '비극':
        return `${opts.age}세에 비극적인 최후를 맞았다.`;
    }
  }
}
